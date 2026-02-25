import { Database } from "bun:sqlite";

import type { MemoryCategory, MemoryEntry } from "./types.js";

export type { MemoryCategory, MemoryEntry } from "./types.js";

export interface MemoryStore {
  read(category?: MemoryCategory): readonly MemoryEntry[];
  write(entry: Omit<MemoryEntry, "id" | "updatedAt">): MemoryEntry;
  search(query: string, category?: MemoryCategory): readonly MemoryEntry[];
}

interface MemoryRow {
  id: number;
  category: MemoryCategory;
  key: string;
  value: string;
  updated_at: string;
}

function rowToEntry(row: MemoryRow): MemoryEntry {
  return {
    id: row.id,
    category: row.category,
    key: row.key,
    value: row.value,
    updatedAt: row.updated_at,
  };
}

export function createMemoryStore(db: Database): MemoryStore {
  const readAll = db.query<MemoryRow, []>(
    "SELECT id, category, key, value, updated_at FROM memory_entries ORDER BY updated_at DESC",
  );

  const readByCategory = db.query<MemoryRow, [MemoryCategory]>(
    "SELECT id, category, key, value, updated_at FROM memory_entries WHERE category = ? ORDER BY updated_at DESC",
  );

  const upsert = db.query<MemoryRow, [MemoryCategory, string, string, string]>(
    `INSERT INTO memory_entries (category, key, value, updated_at)
		 VALUES (?, ?, ?, ?)
		 ON CONFLICT(category, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
		 RETURNING id, category, key, value, updated_at`,
  );

  const searchAll = db.query<MemoryRow, [string, string]>(
    `SELECT id, category, key, value, updated_at FROM memory_entries
		 WHERE (key LIKE ? OR value LIKE ?)
		 ORDER BY updated_at DESC`,
  );

  const searchByCategory = db.query<MemoryRow, [string, string, MemoryCategory]>(
    `SELECT id, category, key, value, updated_at FROM memory_entries
		 WHERE (key LIKE ? OR value LIKE ?) AND category = ?
		 ORDER BY updated_at DESC`,
  );

  return {
    read(category?: MemoryCategory): readonly MemoryEntry[] {
      const rows = category != null ? readByCategory.all(category) : readAll.all();
      return rows.map(rowToEntry);
    },

    write(entry: Omit<MemoryEntry, "id" | "updatedAt">): MemoryEntry {
      const now = new Date().toISOString();
      const row = upsert.get(entry.category, entry.key, entry.value, now);
      if (!row) {
        throw new Error("Upsert RETURNING produced no row");
      }
      return rowToEntry(row);
    },

    search(query: string, category?: MemoryCategory): readonly MemoryEntry[] {
      const pattern = `%${query}%`;
      const rows =
        category != null
          ? searchByCategory.all(pattern, pattern, category)
          : searchAll.all(pattern, pattern);
      return rows.map(rowToEntry);
    },
  };
}
