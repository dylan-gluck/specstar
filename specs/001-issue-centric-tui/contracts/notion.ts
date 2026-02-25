/**
 * Notion integration contract.
 *
 * Provides spec document management backed by Notion's API.
 * Specs link to Linear issues via a Notion relation property.
 * Markdown is converted to/from Notion blocks by the implementation.
 *
 * @version 1.0.0
 */

// ---------------------------------------------------------------------------
// Branded types
// ---------------------------------------------------------------------------

/** Opaque Notion page ID. */
export type NotionPageId = string & { readonly __brand: "NotionPageId" };

/** Opaque Notion database ID. */
export type NotionDatabaseId = string & { readonly __brand: "NotionDatabaseId" };

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

/** Review lifecycle status of a spec document. */
export type SpecStatus = "draft" | "pending" | "approved" | "denied";

/** A spec document stored in Notion, linked to a Linear issue. */
export interface NotionSpec {
  readonly id: NotionPageId;
  /** Linked Linear issue identifier (e.g. "AUTH-142"). */
  readonly issueId: string;
  readonly title: string;
  readonly status: SpecStatus;
  readonly url: string;
  /** ISO-8601 timestamp. */
  readonly updatedAt: string;
  /** Markdown content of the spec (fetched on demand via `getSpec`). */
  readonly content?: string;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type NotionError =
  | NotionAuthError
  | NotionNotFoundError
  | NotionRateLimitError
  | NotionNetworkError;

export interface NotionAuthError {
  readonly type: "notion_auth";
  readonly message: string;
}

export interface NotionNotFoundError {
  readonly type: "notion_not_found";
  readonly pageId: string;
  readonly message: string;
}

export interface NotionRateLimitError {
  readonly type: "notion_rate_limit";
  readonly retryAfterSeconds: number;
  readonly message: string;
}

export interface NotionNetworkError {
  readonly type: "notion_network";
  readonly cause: unknown;
  readonly message: string;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export type NotionEvent =
  | { readonly type: "notion_specs_refreshed"; readonly specs: readonly NotionSpec[] }
  | { readonly type: "notion_spec_updated"; readonly spec: NotionSpec }
  | { readonly type: "notion_error"; readonly error: NotionError };

// ---------------------------------------------------------------------------
// Service interface
// ---------------------------------------------------------------------------

/** Notion spec document operations. */
export interface NotionClient {
  /** Fetch all spec documents from the configured database. */
  listSpecs(databaseId: NotionDatabaseId): Promise<readonly NotionSpec[]>;

  /** Fetch full page content for a spec, including markdown body. */
  getSpec(pageId: NotionPageId): Promise<NotionSpec>;

  /** Create a new spec document linked to a Linear issue. */
  createSpec(issueId: string, title: string, content: string): Promise<NotionSpec>;

  /** Update the markdown content of an existing spec. */
  updateSpec(pageId: NotionPageId, content: string): Promise<void>;

  /** Update the review status of a spec. */
  setSpecStatus(pageId: NotionPageId, status: SpecStatus): Promise<void>;
}
