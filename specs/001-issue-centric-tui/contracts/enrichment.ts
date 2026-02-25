/**
 * Issue enrichment contract.
 *
 * Cross-references integration data to produce issue-centric views.
 * Enrichment is a pure computation at the application layer —
 * no stored FKs (Constitution Principle III: services own their data).
 *
 * Linking rules:
 *   - Session -> Issue: session `cwd` matches worktree path, worktree branch matches issue branch.
 *   - PR -> Issue: PR `headRef` matches issue branch, or branch/title contains identifier (`/^([A-Z]+-\d+)/i`).
 *   - Spec -> Issue: spec `issueId` matches the issue's Linear identifier.
 *   - Worktree -> Issue: worktree branch matches issue branch or contains identifier.
 *
 * @version 1.0.0
 */

import type { LinearIssue } from "./linear.js";
import type { GithubPR, Worktree } from "./github.js";
import type { NotionSpec } from "./notion.js";
import type { WorkerSession } from "./session-pool.js";

// ---------------------------------------------------------------------------
// Section grouping
// ---------------------------------------------------------------------------

/**
 * Sections in the issue list, rendered top-to-bottom.
 * Sections with zero items are hidden entirely.
 */
export type IssueSection = "attention" | "active" | "backlog" | "unlinked";

// ---------------------------------------------------------------------------
// Status badges
// ---------------------------------------------------------------------------

/**
 * Status badge tokens displayed in the issue list.
 * Ordered by priority (first = highest).
 */
export type StatusBadge =
  | "apprvl"
  | "error"
  | "done"
  | "wrkng"
  | "idle"
  | "review"
  | "draft"
  | "ci:fail"
  | "ci:pass"
  | "merged"
  | "spec"
  | "--";

// ---------------------------------------------------------------------------
// Enriched types
// ---------------------------------------------------------------------------

/** An issue enriched with locally linked artifacts. */
export interface EnrichedIssue {
  readonly issue: LinearIssue;
  readonly sessions: readonly WorkerSession[];
  readonly pr: GithubPR | undefined;
  readonly spec: NotionSpec | undefined;
  readonly worktree: Worktree | undefined;
  readonly section: IssueSection;
  readonly badge: StatusBadge;
}

/**
 * An item (session or PR) that could not be linked to any tracked issue.
 * Displayed in the "Unlinked" section.
 */
export type UnlinkedItem =
  | { readonly type: "pr"; readonly pr: GithubPR }
  | { readonly type: "session"; readonly session: WorkerSession };

/** Result of a full enrichment pass. */
export interface EnrichmentResult {
  readonly issues: readonly EnrichedIssue[];
  readonly unlinked: readonly UnlinkedItem[];
}

// ---------------------------------------------------------------------------
// Pure functions
// ---------------------------------------------------------------------------

/**
 * Assign an issue to a section based on its enrichment state.
 *
 * Rules (evaluated in order, first match wins):
 *   - Attention: any linked session has status `approval`, `error`, or `idle` after completion.
 *   - Active: has a running session or open PR; Linear state type = "started".
 *   - Backlog: Linear state type in ["triage", "backlog", "unstarted"]; no active session.
 *   - (Issues not matching any section are placed in Backlog.)
 */
export type AssignSectionFn = (
  issue: LinearIssue,
  sessions: readonly WorkerSession[],
  pr: GithubPR | undefined,
  spec: NotionSpec | undefined,
) => IssueSection;

/**
 * Resolve the most urgent status badge for an enriched issue.
 *
 * Priority order:
 *   apprvl > error > done > wrkng > review > ci:fail > spec > idle > draft > ci:pass > merged > --
 *
 * When multiple statuses apply (e.g., session working + PR open),
 * the highest-priority badge wins.
 */
export type ResolveBadgeFn = (
  sessions: readonly WorkerSession[],
  pr: GithubPR | undefined,
  spec: NotionSpec | undefined,
) => StatusBadge;

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export interface EnrichmentError {
  readonly type: "enrichment";
  readonly message: string;
  readonly cause: unknown;
}

// ---------------------------------------------------------------------------
// Service interface
// ---------------------------------------------------------------------------

/**
 * Issue enrichment service.
 *
 * Runs a cross-referencing pass over all integration data
 * to produce `EnrichedIssue` objects and identify unlinked items.
 */
export interface EnrichmentService {
  /**
   * Enrich a set of issues with linked sessions, PRs, specs, and worktrees.
   * Unlinked items (sessions/PRs not matching any issue) are returned separately.
   */
  enrichIssues(
    issues: readonly LinearIssue[],
    sessions: readonly WorkerSession[],
    prs: readonly GithubPR[],
    specs: readonly NotionSpec[],
    worktrees: readonly Worktree[],
  ): EnrichmentResult;
}
