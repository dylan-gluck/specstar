/**
 * Test data factories for specstar unit tests.
 *
 * Each factory returns a realistic default that can be partially overridden.
 */

import type { LinearIssue, LinearState } from "../src/contracts/linear.js";
import type { GithubPR, Worktree } from "../src/contracts/github.js";
import type { NotionSpec } from "../src/contracts/notion.js";
import type { WorkerSession, SessionNotification } from "../src/contracts/session-pool.js";
import type { WorkflowDefinition, WorkflowStep } from "../src/contracts/workflow.js";
import { linearIssueId, prNumber, worktreePath, sessionId, workflowId } from "../src/types.js";

// ---------------------------------------------------------------------------
// LinearIssue
// ---------------------------------------------------------------------------

export function makeState(overrides?: Partial<LinearState>): LinearState {
  return {
    id: "state-1",
    name: "In Progress",
    type: "started",
    ...overrides,
  };
}

export function makeIssue(overrides?: Partial<LinearIssue>): LinearIssue {
  return {
    id: linearIssueId("issue-uuid-1"),
    identifier: "AUTH-142",
    title: "Implement authentication flow",
    description: "Add OAuth2 login support",
    state: makeState(),
    priority: 2,
    assignee: { name: "Dylan" },
    branch: "feature/auth-142-oauth",
    url: "https://linear.app/team/AUTH-142",
    updatedAt: "2026-02-25T10:00:00.000Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// GithubPR
// ---------------------------------------------------------------------------

export function makePR(overrides?: Partial<GithubPR>): GithubPR {
  return {
    number: prNumber(42),
    title: "AUTH-142: Implement OAuth2 flow",
    author: "dylan",
    state: "open",
    ciStatus: "pass",
    reviewDecision: "approved",
    headRef: "feature/auth-142-oauth",
    url: "https://github.com/org/repo/pull/42",
    updatedAt: "2026-02-25T12:00:00.000Z",
    ticketId: "AUTH-142",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Worktree
// ---------------------------------------------------------------------------

export function makeWorktree(overrides?: Partial<Worktree>): Worktree {
  return {
    path: worktreePath("/Users/dylan/worktrees/auth-142"),
    branch: "feature/auth-142-oauth",
    commit: "abc1234",
    dirty: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// WorkerSession
// ---------------------------------------------------------------------------

export function makeSession(overrides?: Partial<WorkerSession>): WorkerSession {
  return {
    id: sessionId("s-abcd1234"),
    name: "auth-142",
    status: "working",
    cwd: "/Users/dylan/worktrees/auth-142",
    startedAt: "2026-02-25T09:00:00.000Z",
    lastActivityAt: "2026-02-25T11:00:00.000Z",
    tokenCount: 5000,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// NotionSpec
// ---------------------------------------------------------------------------

export function makeSpec(overrides?: Partial<NotionSpec>): NotionSpec {
  return {
    id: "notion-page-1" as NotionSpec["id"],
    issueId: "AUTH-142",
    title: "Auth Flow Spec",
    status: "draft",
    url: "https://notion.so/auth-flow-spec",
    updatedAt: "2026-02-25T08:00:00.000Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// SessionNotification
// ---------------------------------------------------------------------------

export function makeNotification(
  overrides?: Partial<SessionNotification>,
): SessionNotification {
  return {
    sessionId: sessionId("s-abcd1234"),
    sessionName: "auth-142",
    kind: "approval_needed",
    message: "Tool call requires approval: bash",
    timestamp: "2026-02-25T11:00:00.000Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// WorkflowDefinition / WorkflowStep
// ---------------------------------------------------------------------------

export function makeWorkflowStep(overrides?: Partial<WorkflowStep>): WorkflowStep {
  return {
    id: "step-1",
    name: "First Step",
    dependsOn: [],
    prompt: "Do the thing",
    ...overrides,
  };
}

export function makeWorkflowDef(
  overrides?: Partial<WorkflowDefinition>,
): WorkflowDefinition {
  return {
    id: workflowId("wf-test"),
    name: "Test Workflow",
    description: "A test workflow",
    sourcePath: "/tmp/test-workflow.ts",
    steps: [makeWorkflowStep()],
    ...overrides,
  };
}
