/**
 * SQLite-backed cache for integration data.
 *
 * Provides database initialization with schema migration and a generic
 * IntegrationCache<T> for delta detection across refresh cycles.
 *
 * @module db
 */

import { Database } from "bun:sqlite";
import { mkdirSync, existsSync, unlinkSync } from "node:fs";
import { dirname } from "node:path";

import type { IntegrationCache as IIntegrationCache, KeyExtractor } from "./types.js";

// ---------------------------------------------------------------------------
// Schema DDL
// ---------------------------------------------------------------------------

const CREATE_TABLES = `
CREATE TABLE IF NOT EXISTS issues (
  id            TEXT PRIMARY KEY,
  identifier    TEXT NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  state         TEXT NOT NULL,
  priority      INTEGER NOT NULL,
  assignee      TEXT,
  branch        TEXT,
  spec_doc_id   TEXT,
  url           TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  raw_json      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pull_requests (
  number          INTEGER PRIMARY KEY,
  title           TEXT NOT NULL,
  author          TEXT NOT NULL,
  state           TEXT NOT NULL,
  ci_status       TEXT,
  review_decision TEXT,
  head_ref        TEXT NOT NULL,
  url             TEXT NOT NULL,
  ticket_id       TEXT,
  updated_at      TEXT NOT NULL,
  raw_json        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS worktrees (
  path          TEXT PRIMARY KEY,
  branch        TEXT NOT NULL,
  commit_hash   TEXT NOT NULL,
  session_id    TEXT,
  ticket_id     TEXT,
  pr_number     INTEGER,
  is_dirty      INTEGER NOT NULL DEFAULT 0,
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  status            TEXT NOT NULL,
  cwd               TEXT NOT NULL,
  worktree_path     TEXT,
  workflow_id       TEXT,
  branch            TEXT,
  issue_identifier  TEXT,
  model             TEXT,
  started_at        TEXT NOT NULL,
  last_activity_at  TEXT NOT NULL,
  token_count       INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS specs (
  id          TEXT PRIMARY KEY,
  issue_id    TEXT NOT NULL,
  title       TEXT NOT NULL,
  status      TEXT NOT NULL,
  url         TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS memory_entries (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  category    TEXT NOT NULL,
  key         TEXT NOT NULL,
  value       TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  UNIQUE(category, key)
);
`;

const CREATE_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_issues_branch ON issues(branch) WHERE branch IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_issues_identifier ON issues(identifier);
CREATE INDEX IF NOT EXISTS idx_pull_requests_head_ref ON pull_requests(head_ref);
CREATE INDEX IF NOT EXISTS idx_pull_requests_ticket_id ON pull_requests(ticket_id) WHERE ticket_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_worktrees_branch ON worktrees(branch);
CREATE INDEX IF NOT EXISTS idx_sessions_branch ON sessions(branch) WHERE branch IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_issue_identifier ON sessions(issue_identifier) WHERE issue_identifier IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_worktree_path ON sessions(worktree_path) WHERE worktree_path IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_specs_issue_id ON specs(issue_id);
CREATE INDEX IF NOT EXISTS idx_issues_state ON issues(state);
CREATE INDEX IF NOT EXISTS idx_issues_priority ON issues(priority);
CREATE INDEX IF NOT EXISTS idx_pull_requests_state ON pull_requests(state);
`;

// ---------------------------------------------------------------------------
// Database initialization
// ---------------------------------------------------------------------------

function runMigrations(db: Database): void {
  db.exec(CREATE_TABLES);
  db.exec(CREATE_INDEXES);
}

/**
 * Open (or create) the SQLite database, run schema migrations, and return
 * the handle. Enables WAL mode for safer concurrent reads.
 *
 * @param dbPath - Absolute or relative path. Defaults to `.specstar/cache.db`.
 */
export function initDatabase(dbPath: string = ".specstar/cache.db"): Database {
  const dir = dirname(dbPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  let db: Database;
  try {
    db = new Database(dbPath, { create: true });
    db.exec("PRAGMA journal_mode = WAL");
    runMigrations(db);
  } catch (err) {
    // Corrupted DB: log, remove, recreate
    console.warn(`[specstar] Database at ${dbPath} appears corrupt, recreating: ${err}`);
    try {
      if (existsSync(dbPath)) unlinkSync(dbPath);
      if (existsSync(dbPath + "-wal")) unlinkSync(dbPath + "-wal");
      if (existsSync(dbPath + "-shm")) unlinkSync(dbPath + "-shm");
    } catch {
      // best-effort cleanup
    }
    db = new Database(dbPath, { create: true });
    db.exec("PRAGMA journal_mode = WAL");
    runMigrations(db);
  }

  return db;
}

// ---------------------------------------------------------------------------
// IntegrationCache<T>
// ---------------------------------------------------------------------------

/**
 * Convert a camelCase key to snake_case.
 * Handles common patterns like `specDocId` -> `spec_doc_id`.
 */
function camelToSnake(s: string): string {
  return s.replace(/[A-Z]/g, (ch) => "_" + ch.toLowerCase());
}

/**
 * Generic SQLite-backed integration cache with in-memory index and delta
 * detection.
 *
 * Each item is serialized to JSON for storage and delta comparison.
 * The `columns` array specifies which object properties map to real
 * SQL columns (camelCase property names are converted to snake_case).
 *
 * Tables with a `raw_json` column get the full JSON serialization stored
 * there; `load()` deserializes from `raw_json` if available, otherwise
 * reconstructs from individual columns.
 */
class IntegrationCache<T> implements IIntegrationCache<T> {
  private items: Map<string, T> = new Map();
  private readonly snakeColumns: string[];
  private readonly hasRawJson: boolean;

  constructor(
    private readonly db: Database,
    private readonly tableName: string,
    private readonly keyExtractor: KeyExtractor<T>,
    private readonly columns: string[],
  ) {
    this.snakeColumns = columns.map(camelToSnake);
    this.hasRawJson = this.snakeColumns.includes("raw_json");
  }

  load(): readonly T[] {
    try {
      if (this.hasRawJson) {
        const rows = this.db.query(`SELECT raw_json FROM ${this.tableName}`).all() as Array<{
          raw_json: string;
        }>;

        this.items.clear();
        for (const row of rows) {
          const item = JSON.parse(row.raw_json) as T;
          this.items.set(this.keyExtractor(item), item);
        }
      } else {
        const colList = this.snakeColumns.join(", ");
        const rows = this.db.query(`SELECT ${colList} FROM ${this.tableName}`).all() as Array<
          Record<string, unknown>
        >;

        this.items.clear();
        for (const row of rows) {
          const obj: Record<string, unknown> = {};
          for (let i = 0; i < this.columns.length; i++) {
            obj[this.columns[i]!] = row[this.snakeColumns[i]!];
          }
          const item = obj as T;
          this.items.set(this.keyExtractor(item), item);
        }
      }
      return [...this.items.values()];
    } catch {
      return [];
    }
  }

  update(items: readonly T[]): boolean {
    const incoming = new Map<string, T>();
    for (const item of items) {
      incoming.set(this.keyExtractor(item), item);
    }

    // Delta detection via JSON comparison
    let changed = false;
    if (incoming.size !== this.items.size) {
      changed = true;
    } else {
      for (const [key, item] of incoming) {
        const existing = this.items.get(key);
        if (existing === undefined || JSON.stringify(existing) !== JSON.stringify(item)) {
          changed = true;
          break;
        }
      }
    }

    if (!changed) return false;

    // Build parameterized INSERT
    const placeholders = this.snakeColumns.map(() => "?").join(", ");
    const colList = this.snakeColumns.join(", ");
    const insertSql = `INSERT OR REPLACE INTO ${this.tableName} (${colList}) VALUES (${placeholders})`;

    const txn = this.db.transaction(() => {
      this.db.exec(`DELETE FROM ${this.tableName}`);
      const stmt = this.db.prepare(insertSql);
      for (const item of items) {
        const record = item as Record<string, unknown>;
        const values: (string | number | null)[] = this.columns.map((col) => {
          const val = record[col];
          if (col === "rawJson") return JSON.stringify(record);
          if (typeof val === "boolean") return val ? 1 : 0;
          if (typeof val === "number") return val;
          if (typeof val === "string") return val;
          if (val === null || val === undefined) return null;
          return String(val);
        });
        stmt.run(...values);
      }
    });
    txn();

    this.items = incoming;
    return true;
  }

  getAll(): readonly T[] {
    return [...this.items.values()];
  }

  get(key: string): T | undefined {
    return this.items.get(key);
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/** Column mappings for known tables (camelCase property names). */
const TABLE_COLUMNS: Record<string, string[]> = {
  issues: [
    "id",
    "identifier",
    "title",
    "description",
    "state",
    "priority",
    "assignee",
    "branch",
    "specDocId",
    "url",
    "updatedAt",
    "rawJson",
  ],
  pull_requests: [
    "number",
    "title",
    "author",
    "state",
    "ciStatus",
    "reviewDecision",
    "headRef",
    "url",
    "ticketId",
    "updatedAt",
    "rawJson",
  ],
  worktrees: [
    "path",
    "branch",
    "commitHash",
    "sessionId",
    "ticketId",
    "prNumber",
    "isDirty",
    "updatedAt",
  ],
  sessions: [
    "id",
    "name",
    "status",
    "cwd",
    "worktreePath",
    "workflowId",
    "branch",
    "issueIdentifier",
    "model",
    "startedAt",
    "lastActivityAt",
    "tokenCount",
  ],
  specs: ["id", "issueId", "title", "status", "url", "updatedAt"],
  memory_entries: ["id", "category", "key", "value", "updatedAt"],
};

/**
 * Create an IntegrationCache for the given table.
 *
 * The table must already exist (created by `initDatabase`). The `keyExtractor`
 * determines the logical primary key used for delta detection and `get()` lookups.
 */
export function createCache<T>(
  db: Database,
  tableName: string,
  keyExtractor: KeyExtractor<T>,
): IIntegrationCache<T> {
  const columns = TABLE_COLUMNS[tableName];
  if (!columns) {
    throw new Error(`[specstar] Unknown table: ${tableName}`);
  }
  return new IntegrationCache<T>(db, tableName, keyExtractor, columns);
}
