/**
 * Linear integration contract.
 *
 * Provides typed access to Linear's GraphQL API for issue management.
 * Implementation uses direct `fetch()` against the Linear GraphQL endpoint.
 * Authentication via `SPECSTAR_LINEAR_API_KEY` env var or `config.linear.apiKey`.
 *
 * @version 1.0.0
 */

// ---------------------------------------------------------------------------
// Branded types
// ---------------------------------------------------------------------------

/** Opaque Linear issue ID (Linear's internal UUID). */
export type LinearIssueId = string & { readonly __brand: "LinearIssueId" };

/** Opaque Linear team ID. */
export type LinearTeamId = string & { readonly __brand: "LinearTeamId" };

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

/** Linear workflow state attached to an issue. */
export interface LinearState {
  readonly id: string;
  readonly name: string;
  /** Linear's built-in state type classification. */
  readonly type: "triage" | "backlog" | "unstarted" | "started" | "completed" | "canceled";
}

/** A Linear issue as returned by the API, mapped to specstar's needs. */
export interface LinearIssue {
  readonly id: LinearIssueId;
  /** Human-readable identifier, e.g. "AUTH-142". */
  readonly identifier: string;
  readonly title: string;
  readonly description: string | undefined;
  readonly state: LinearState;
  /** 0 = none, 1 = urgent, 2 = high, 3 = medium, 4 = low. */
  readonly priority: 0 | 1 | 2 | 3 | 4;
  readonly assignee: { readonly name: string } | undefined;
  /** Branch name suggested by Linear, if any. */
  readonly branch: string | undefined;
  readonly url: string;
  /** ISO-8601 timestamp. */
  readonly updatedAt: string;
}

/** Filter criteria for listing issues. */
export interface LinearFilter {
  /** Restrict to a specific team. */
  readonly teamId?: LinearTeamId;
  /** Restrict to issues assigned to this user ID. */
  readonly assigneeId?: string;
  /** Restrict to these state types. */
  readonly stateTypes?: ReadonlyArray<LinearState["type"]>;
}

/** Mutable fields accepted by `updateIssue`. */
export interface LinearIssueUpdate {
  readonly stateId?: string;
  readonly description?: string;
  readonly assigneeId?: string;
  readonly priority?: LinearIssue["priority"];
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** Discriminated error union for Linear operations. */
export type LinearError =
  | LinearAuthError
  | LinearNotFoundError
  | LinearRateLimitError
  | LinearNetworkError;

export interface LinearAuthError {
  readonly type: "linear_auth";
  readonly message: string;
}

export interface LinearNotFoundError {
  readonly type: "linear_not_found";
  readonly resourceId: string;
  readonly message: string;
}

export interface LinearRateLimitError {
  readonly type: "linear_rate_limit";
  /** Seconds until the limit resets. */
  readonly retryAfterSeconds: number;
  readonly message: string;
}

export interface LinearNetworkError {
  readonly type: "linear_network";
  readonly cause: unknown;
  readonly message: string;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/** Events emitted by the Linear integration on data changes. */
export type LinearEvent =
  | { readonly type: "linear_issues_refreshed"; readonly issues: readonly LinearIssue[] }
  | { readonly type: "linear_issue_updated"; readonly issue: LinearIssue }
  | { readonly type: "linear_error"; readonly error: LinearError };

// ---------------------------------------------------------------------------
// Service interface
// ---------------------------------------------------------------------------

/** Linear API client contract. */
export interface LinearClient {
  /**
   * Fetch issues matching the given filter.
   * Returns cached results on network failure if a cache is available.
   */
  getIssues(filter?: LinearFilter): Promise<readonly LinearIssue[]>;

  /** Fetch a single issue by its Linear UUID. */
  getIssue(id: LinearIssueId): Promise<LinearIssue>;

  /** Fetch workflow states for a team (typically cached). */
  getStates(teamId: LinearTeamId): Promise<readonly LinearState[]>;

  /** Apply a partial update to an issue. */
  updateIssue(id: LinearIssueId, input: LinearIssueUpdate): Promise<void>;

  /** Post a comment on an issue. */
  addComment(issueId: LinearIssueId, body: string): Promise<void>;
}
