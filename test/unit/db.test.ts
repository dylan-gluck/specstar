import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

import { initDatabase, createCache } from "../../src/db.js";

function makeTmpDir(): string {
	const dir = join(tmpdir(), `specstar-db-test-${randomUUID()}`);
	mkdirSync(dir, { recursive: true });
	return dir;
}

interface SpecRow {
	id: string;
	issueId: string;
	title: string;
	status: string;
	url: string;
	updatedAt: string;
}

function makeSpecRow(overrides?: Partial<SpecRow>): SpecRow {
	return {
		id: "spec-1",
		issueId: "AUTH-142",
		title: "OAuth integration spec",
		status: "draft",
		url: "https://notion.so/spec-1",
		updatedAt: "2026-01-01T00:00:00Z",
		...overrides,
	};
}

const EXPECTED_TABLES = [
	"issues",
	"pull_requests",
	"worktrees",
	"sessions",
	"specs",
	"memory_entries",
];

describe("initDatabase", () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = makeTmpDir();
	});

	afterEach(() => {
		rmSync(tmpDir, { recursive: true, force: true });
	});

	test("creates DB file and all expected tables", () => {
		const dbPath = join(tmpDir, "test.db");
		const db = initDatabase(dbPath);

		const rows = db
			.query("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
			.all() as Array<{ name: string }>;
		const tableNames = rows.map((r) => r.name).sort();

		for (const table of EXPECTED_TABLES) {
			expect(tableNames).toContain(table);
		}

		db.close();
	});

	test("enables WAL journal mode", () => {
		const dbPath = join(tmpDir, "wal.db");
		const db = initDatabase(dbPath);

		const result = db.query("PRAGMA journal_mode").get() as { journal_mode: string };
		expect(result.journal_mode).toBe("wal");

		db.close();
	});

	test("is idempotent when called twice on same path", () => {
		const dbPath = join(tmpDir, "idem.db");
		const db1 = initDatabase(dbPath);
		db1.close();

		const db2 = initDatabase(dbPath);
		const rows = db2
			.query("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
			.all() as Array<{ name: string }>;
		const tableNames = rows.map((r) => r.name).sort();

		for (const table of EXPECTED_TABLES) {
			expect(tableNames).toContain(table);
		}

		db2.close();
	});

	test("recreates a corrupted database", () => {
		const dbPath = join(tmpDir, "corrupt.db");
		writeFileSync(dbPath, Buffer.from([0xde, 0xad, 0xbe, 0xef, 0x00, 0xff, 0x01, 0x02]));

		const db = initDatabase(dbPath);

		const rows = db
			.query("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
			.all() as Array<{ name: string }>;
		const tableNames = rows.map((r) => r.name).sort();

		for (const table of EXPECTED_TABLES) {
			expect(tableNames).toContain(table);
		}

		const result = db.query("PRAGMA journal_mode").get() as { journal_mode: string };
		expect(result.journal_mode).toBe("wal");

		db.close();
	});
});

describe("createCache", () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = makeTmpDir();
	});

	afterEach(() => {
		rmSync(tmpDir, { recursive: true, force: true });
	});

	test("throws on unknown table name", () => {
		const db = initDatabase(join(tmpDir, "unknown.db"));
		expect(() => createCache(db, "nonexistent", () => "")).toThrow("Unknown table");
		db.close();
	});
});

describe("IntegrationCache", () => {
	let tmpDir: string;
	let dbPath: string;

	beforeEach(() => {
		tmpDir = makeTmpDir();
		dbPath = join(tmpDir, "cache.db");
	});

	afterEach(() => {
		rmSync(tmpDir, { recursive: true, force: true });
	});

	function openCache() {
		const db = initDatabase(dbPath);
		const cache = createCache<SpecRow>(db, "specs", (s) => s.id);
		return { db, cache };
	}

	test("update returns true on first insert", () => {
		const { db, cache } = openCache();
		const item = makeSpecRow();

		expect(cache.update([item])).toBe(true);

		db.close();
	});

	test("update returns false when data unchanged", () => {
		const { db, cache } = openCache();
		const item = makeSpecRow();

		cache.update([item]);
		expect(cache.update([item])).toBe(false);

		db.close();
	});

	test("getAll returns all cached items", () => {
		const { db, cache } = openCache();
		const items = [
			makeSpecRow({ id: "s1", title: "Spec 1" }),
			makeSpecRow({ id: "s2", title: "Spec 2" }),
		];

		cache.update(items);
		const all = cache.getAll();

		expect(all).toHaveLength(2);
		expect(all).toContainEqual(items[0]);
		expect(all).toContainEqual(items[1]);

		db.close();
	});

	test("get returns item by key", () => {
		const { db, cache } = openCache();
		const item = makeSpecRow({ id: "lookup-key" });

		cache.update([item]);
		expect(cache.get("lookup-key")).toEqual(item);

		db.close();
	});

	test("get returns undefined for missing key", () => {
		const { db, cache } = openCache();
		cache.update([makeSpecRow()]);

		expect(cache.get("does-not-exist")).toBeUndefined();

		db.close();
	});

	test("load restores items from disk into a new cache instance", () => {
		const { db, cache } = openCache();
		const items = [
			makeSpecRow({ id: "p1", title: "Persisted 1" }),
			makeSpecRow({ id: "p2", title: "Persisted 2" }),
		];
		cache.update(items);
		db.close();

		// Open a fresh cache on the same db file
		const { db: db2, cache: cache2 } = openCache();

		// Before load, in-memory state is empty
		expect(cache2.getAll()).toHaveLength(0);

		const loaded = cache2.load();
		expect(loaded).toHaveLength(2);
		expect(cache2.get("p1")).toEqual(items[0]);
		expect(cache2.get("p2")).toEqual(items[1]);

		db2.close();
	});

	test("update returns true when a field is modified", () => {
		const { db, cache } = openCache();
		const item = makeSpecRow({ id: "mut" });

		cache.update([item]);
		const modified = { ...item, status: "approved" };
		expect(cache.update([modified])).toBe(true);

		// Verify the update persisted in memory
		expect(cache.get("mut")!.status).toBe("approved");

		db.close();
	});

	test("update returns true when item count changes", () => {
		const { db, cache } = openCache();
		const item1 = makeSpecRow({ id: "a1" });
		const item2 = makeSpecRow({ id: "a2" });

		cache.update([item1]);

		// Adding an item
		expect(cache.update([item1, item2])).toBe(true);
		expect(cache.getAll()).toHaveLength(2);

		// Removing an item
		expect(cache.update([item1])).toBe(true);
		expect(cache.getAll()).toHaveLength(1);

		db.close();
	});
});
