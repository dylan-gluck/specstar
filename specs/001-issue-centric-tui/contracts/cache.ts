/**
 * Integration cache contract.
 *
 * SQLite-backed cache providing instant display on startup
 * and delta detection to avoid unnecessary re-renders.
 * Per-project, stored at `.specstar/cache.db`.
 *
 * Delta detection: compares JSON-serialized items by key.
 * `update()` returns `true` only when additions, removals,
 * or mutations are detected. Writes are asynchronous.
 * Read failures on cold start return empty arrays.
 *
 * @version 1.0.0
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Key extractor function: given an item, returns its unique cache key.
 * Used for delta detection and individual lookups.
 */
export type KeyExtractor<T> = (item: T) => string;

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type CacheError =
  | CacheCorruptionError
  | CacheWriteError;

export interface CacheCorruptionError {
  readonly type: "cache_corruption";
  readonly table: string;
  readonly message: string;
}

export interface CacheWriteError {
  readonly type: "cache_write";
  readonly table: string;
  readonly cause: unknown;
  readonly message: string;
}

// ---------------------------------------------------------------------------
// Service interface
// ---------------------------------------------------------------------------

/**
 * Generic integration cache.
 *
 * @typeParam T - The cached item type. Must be JSON-serializable.
 */
export interface IntegrationCache<T> {
  /**
   * Load all cached items from SQLite.
   * Returns an empty array on cold start or read failure.
   */
  load(): readonly T[];

  /**
   * Replace the cache with fresh data.
   * @returns `true` if any additions, removals, or mutations were detected.
   */
  update(items: readonly T[]): boolean;

  /** Get all cached items. */
  getAll(): readonly T[];

  /** Get a single item by its cache key. Returns `undefined` if not found. */
  get(key: string): T | undefined;
}
