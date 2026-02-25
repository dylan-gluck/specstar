/**
 * Shared types, branded type helpers, and state machine types.
 *
 * This file re-exports contract types and provides runtime helpers
 * for branded type creation and state machine validation.
 *
 * @module types
 */

// ---------------------------------------------------------------------------
// Re-exports from contracts (canonical types live in contracts/)
// ---------------------------------------------------------------------------

export type {
  LinearIssueId,
  LinearTeamId,
  LinearState,
  LinearIssue,
  LinearFilter,
  LinearIssueUpdate,
  LinearError,
  LinearAuthError,
  LinearNotFoundError,
  LinearRateLimitError,
  LinearNetworkError,
  LinearEvent,
  LinearClient,
} from "./contracts/linear.js";

export type {
  PrNumber,
  WorktreePath,
  GithubPR,
  CreatePROptions,
  Worktree,
  GithubError,
  GithubCliMissingError,
  GithubAuthError,
  GithubNotFoundError,
  GithubNetworkError,
  WorktreeError,
  WorktreeBranchExistsError,
  WorktreeNotFoundError,
  WorktreeGitError,
  GithubEvent,
  WorktreeEvent,
  GithubClient,
  WorktreeManager,
} from "./contracts/github.js";

export type {
  NotionPageId,
  NotionDatabaseId,
  SpecStatus,
  NotionSpec,
  NotionError,
  NotionAuthError,
  NotionNotFoundError,
  NotionRateLimitError,
  NotionNetworkError,
  NotionEvent,
  NotionClient,
} from "./contracts/notion.js";

export type {
  SessionId,
  WorkerStatus,
  WorkerSessionOptions,
  WorkerSession,
  SessionNotification,
  WorkerEvent,
  MainToWorkerMessage,
  SessionPoolListener,
  SessionPoolError,
  SessionPoolAtCapacityError,
  SessionNotFoundError,
  SessionSpawnError,
  SessionPool,
} from "./contracts/session-pool.js";

export type {
  IssueSection,
  StatusBadge,
  EnrichedIssue,
  UnlinkedItem,
  EnrichmentResult,
  AssignSectionFn,
  ResolveBadgeFn,
  EnrichmentError,
  EnrichmentService,
} from "./contracts/enrichment.js";

export type {
  KeyExtractor,
  CacheError,
  CacheCorruptionError,
  CacheWriteError,
  IntegrationCache,
} from "./contracts/cache.js";

export type {
  ThemeConfig,
  LinearConfig,
  GithubConfig,
  NotionConfig,
  SessionsConfig,
  SpecstarKeybindings,
  SpecstarConfig,
} from "./contracts/config.js";

export type {
  WorkflowId,
  WorkflowHandleId,
  WorkflowStatus,
  WorkflowDefinition,
  WorkflowStep,
  WorkflowContext,
  WorkflowHandle,
  WorkflowStepStatus,
  WorkflowProgressEvent,
  WorkflowError,
  WorkflowNotFoundError,
  WorkflowValidationError,
  WorkflowExecutionError,
  WorkflowEngine,
} from "./contracts/workflow.js";

// ---------------------------------------------------------------------------
// Branded type constructors
// ---------------------------------------------------------------------------

/**
 * Create a branded type value. Unsafe - caller is responsible for validity.
 * Use the specific constructors below for type safety.
 */
function brand<T>(value: unknown): T {
  return value as T;
}

import type {
  LinearIssueId,
  LinearTeamId,
} from "./contracts/linear.js";
import type { PrNumber, WorktreePath } from "./contracts/github.js";
import type {
  NotionPageId,
  NotionDatabaseId,
} from "./contracts/notion.js";
import type {
  SessionId,
  WorkerStatus,
} from "./contracts/session-pool.js";
import type {
  WorkflowId,
  WorkflowHandleId,
} from "./contracts/workflow.js";
import type { StatusBadge } from "./contracts/enrichment.js";

export function linearIssueId(id: string): LinearIssueId {
  return brand<LinearIssueId>(id);
}

export function linearTeamId(id: string): LinearTeamId {
  return brand<LinearTeamId>(id);
}

export function prNumber(n: number): PrNumber {
  return brand<PrNumber>(n);
}

export function worktreePath(p: string): WorktreePath {
  return brand<WorktreePath>(p);
}

export function notionPageId(id: string): NotionPageId {
  return brand<NotionPageId>(id);
}

export function notionDatabaseId(id: string): NotionDatabaseId {
  return brand<NotionDatabaseId>(id);
}

export function sessionId(id: string): SessionId {
  return brand<SessionId>(id);
}

export function workflowId(id: string): WorkflowId {
  return brand<WorkflowId>(id);
}

export function workflowHandleId(id: string): WorkflowHandleId {
  return brand<WorkflowHandleId>(id);
}

/** Generate a new random session ID in the format `s-<random8>`. */
export function generateSessionId(): SessionId {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "s-";
  for (let i = 0; i < 8; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return brand<SessionId>(result);
}

// ---------------------------------------------------------------------------
// State machine: WorkerStatus transitions
// ---------------------------------------------------------------------------

/** Valid transitions for the WorkerStatus state machine. */
const WORKER_STATUS_TRANSITIONS: Record<WorkerStatus, readonly WorkerStatus[]> = {
  starting: ["idle", "error", "shutdown"],
  idle: ["working", "shutdown"],
  working: ["idle", "approval", "error", "shutdown"],
  approval: ["working", "error", "shutdown"],
  error: ["idle", "shutdown"],
  shutdown: [],
} as const;

export class InvalidTransitionError extends Error {
  constructor(
    public readonly from: string,
    public readonly to: string,
    public readonly machine: string,
  ) {
    super(`Invalid ${machine} transition: ${from} -> ${to}`);
    this.name = "InvalidTransitionError";
  }
}

/**
 * Validate a WorkerStatus transition.
 * @throws InvalidTransitionError if the transition is not allowed.
 */
export function validateWorkerTransition(from: WorkerStatus, to: WorkerStatus): void {
  const allowed = WORKER_STATUS_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new InvalidTransitionError(from, to, "WorkerStatus");
  }
}

/**
 * Check if a WorkerStatus transition is valid without throwing.
 */
export function isValidWorkerTransition(from: WorkerStatus, to: WorkerStatus): boolean {
  return WORKER_STATUS_TRANSITIONS[from].includes(to);
}

// ---------------------------------------------------------------------------
// State machine: SpecStatus transitions
// ---------------------------------------------------------------------------

import type { SpecStatus } from "./contracts/notion.js";

const SPEC_STATUS_TRANSITIONS: Record<SpecStatus, readonly SpecStatus[]> = {
  draft: ["pending"],
  pending: ["approved", "denied"],
  approved: ["draft"],
  denied: ["draft"],
} as const;

/**
 * Validate a SpecStatus transition.
 * @throws InvalidTransitionError if the transition is not allowed.
 */
export function validateSpecTransition(from: SpecStatus, to: SpecStatus): void {
  const allowed = SPEC_STATUS_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new InvalidTransitionError(from, to, "SpecStatus");
  }
}

/**
 * Check if a SpecStatus transition is valid without throwing.
 */
export function isValidSpecTransition(from: SpecStatus, to: SpecStatus): boolean {
  return SPEC_STATUS_TRANSITIONS[from].includes(to);
}

// ---------------------------------------------------------------------------
// Badge priority
// ---------------------------------------------------------------------------

/** Numeric priority for status badges. Lower = more urgent. */
export const BADGE_PRIORITY: Record<StatusBadge, number> = {
  apprvl: 0,
  error: 1,
  done: 2,
  wrkng: 3,
  review: 4,
  "ci:fail": 5,
  spec: 6,
  idle: 7,
  draft: 8,
  "ci:pass": 9,
  merged: 10,
  "--": 11,
} as const;

/** All status badges in priority order (most urgent first). */
export const BADGES_BY_PRIORITY: readonly StatusBadge[] = [
  "apprvl",
  "error",
  "done",
  "wrkng",
  "review",
  "ci:fail",
  "spec",
  "idle",
  "draft",
  "ci:pass",
  "merged",
  "--",
] as const;
