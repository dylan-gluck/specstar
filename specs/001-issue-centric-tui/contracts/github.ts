/**
 * GitHub integration contract.
 *
 * Wraps the `gh` CLI for authentication and API access.
 * Auto-detects repository from `git remote origin`.
 *
 * @version 1.0.0
 */

// ---------------------------------------------------------------------------
// Branded types
// ---------------------------------------------------------------------------

/** GitHub PR number scoped to the detected repo. */
export type PrNumber = number & { readonly __brand: "PrNumber" };

/** Absolute filesystem path to a git worktree. */
export type WorktreePath = string & { readonly __brand: "WorktreePath" };

// ---------------------------------------------------------------------------
// Domain types — Pull Requests
// ---------------------------------------------------------------------------

export interface GithubPR {
  readonly number: PrNumber;
  readonly title: string;
  readonly author: string;
  readonly state: "open" | "closed" | "merged" | "draft";
  readonly ciStatus: "pass" | "fail" | "pending" | "none";
  readonly reviewDecision: "approved" | "changes_requested" | "review_required" | null;
  /** Branch name the PR is opened from. */
  readonly headRef: string;
  readonly url: string;
  /** ISO-8601 timestamp. */
  readonly updatedAt: string;
  /** Ticket identifier extracted from branch/title, if parseable. */
  readonly ticketId: string | undefined;
}

/** Options for creating a new pull request. */
export interface CreatePROptions {
  readonly title: string;
  readonly body: string;
  readonly headBranch: string;
  readonly baseBranch?: string;
  readonly draft?: boolean;
}

// ---------------------------------------------------------------------------
// Domain types — Worktrees
// ---------------------------------------------------------------------------

export interface Worktree {
  readonly path: WorktreePath;
  readonly branch: string;
  readonly commit: string;
  readonly dirty: boolean;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type GithubError =
  | GithubCliMissingError
  | GithubAuthError
  | GithubNotFoundError
  | GithubNetworkError;

export interface GithubCliMissingError {
  readonly type: "github_cli_missing";
  readonly message: string;
}

export interface GithubAuthError {
  readonly type: "github_auth";
  readonly message: string;
}

export interface GithubNotFoundError {
  readonly type: "github_not_found";
  readonly resourceId: string;
  readonly message: string;
}

export interface GithubNetworkError {
  readonly type: "github_network";
  readonly cause: unknown;
  readonly message: string;
}

export type WorktreeError =
  | WorktreeBranchExistsError
  | WorktreeNotFoundError
  | WorktreeGitError;

export interface WorktreeBranchExistsError {
  readonly type: "worktree_branch_exists";
  readonly branch: string;
  readonly message: string;
}

export interface WorktreeNotFoundError {
  readonly type: "worktree_not_found";
  readonly path: string;
  readonly message: string;
}

export interface WorktreeGitError {
  readonly type: "worktree_git";
  readonly cause: unknown;
  readonly message: string;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export type GithubEvent =
  | { readonly type: "github_prs_refreshed"; readonly prs: readonly GithubPR[] }
  | { readonly type: "github_pr_updated"; readonly pr: GithubPR }
  | { readonly type: "github_error"; readonly error: GithubError };

export type WorktreeEvent =
  | { readonly type: "worktrees_refreshed"; readonly worktrees: readonly Worktree[] }
  | { readonly type: "worktree_created"; readonly worktree: Worktree }
  | { readonly type: "worktree_removed"; readonly path: WorktreePath }
  | { readonly type: "worktree_error"; readonly error: WorktreeError };

// ---------------------------------------------------------------------------
// Service interfaces
// ---------------------------------------------------------------------------

/** GitHub pull request operations. */
export interface GithubClient {
  /** List open PRs for the detected repository. */
  listPRs(): Promise<readonly GithubPR[]>;

  /** Fetch full PR detail by number. */
  getPR(number: PrNumber): Promise<GithubPR>;

  /** Create a new pull request. Returns the created PR. */
  createPR(opts: CreatePROptions): Promise<GithubPR>;

  /** Post a comment on a PR. */
  comment(number: PrNumber, body: string): Promise<void>;

  /** Approve a PR via `gh pr review --approve`. */
  approvePR(number: PrNumber): Promise<void>;
}

/** Git worktree management. */
export interface WorktreeManager {
  /** List all git worktrees with branch, commit, and dirty status. */
  list(): Promise<readonly Worktree[]>;

  /**
   * Create a new worktree under `config.sessions.worktreeBase`.
   * @param branch - Branch to check out in the worktree.
   * @param baseBranch - Base branch to create from (defaults to HEAD).
   */
  create(branch: string, baseBranch?: string): Promise<Worktree>;

  /**
   * Remove a worktree. Associated sessions should be shut down first.
   * @param path - Absolute path to the worktree.
   */
  remove(path: WorktreePath): Promise<void>;

  /**
   * Pull and rebase in the given worktree.
   * @param path - Absolute path to the worktree.
   */
  sync(path: WorktreePath): Promise<void>;
}
