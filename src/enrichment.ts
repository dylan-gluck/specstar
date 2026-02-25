/**
 * Issue enrichment service.
 *
 * Cross-references integration data to produce issue-centric views.
 * Enrichment is a pure computation at the application layer --
 * no stored FKs (Constitution Principle III: services own their data).
 *
 * @module enrichment
 */

import type { LinearIssue } from "../specs/001-issue-centric-tui/contracts/linear.js";
import type { GithubPR, Worktree } from "../specs/001-issue-centric-tui/contracts/github.js";
import type { NotionSpec } from "../specs/001-issue-centric-tui/contracts/notion.js";
import type { WorkerSession } from "../specs/001-issue-centric-tui/contracts/session-pool.js";
import type {
  IssueSection,
  StatusBadge,
  EnrichedIssue,
  UnlinkedItem,
  EnrichmentResult,
  EnrichmentService,
} from "../specs/001-issue-centric-tui/contracts/enrichment.js";
import { BADGE_PRIORITY } from "./types.js";

// ---------------------------------------------------------------------------
// Identifier extraction
// ---------------------------------------------------------------------------

const IDENTIFIER_PATTERN = /^([A-Z]+-\d+)/i;

/**
 * Extract an issue identifier from a branch name or PR title.
 * Handles common prefixes like "feature/AUTH-142-fix-flow".
 */
export function extractIdentifier(text: string): string | undefined {
  const match = text.match(IDENTIFIER_PATTERN);
  if (match) return match[1]!.toUpperCase();

  // Try with common prefixes stripped (e.g. "feature/auth-142")
  const slashIdx = text.lastIndexOf("/");
  if (slashIdx !== -1) {
    const suffix = text.slice(slashIdx + 1);
    const suffixMatch = suffix.match(IDENTIFIER_PATTERN);
    if (suffixMatch) return suffixMatch[1]!.toUpperCase();
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Section classifier (data-model.md Section 5.4 decision table)
// ---------------------------------------------------------------------------

/**
 * Assign an issue to a section based on its enrichment state.
 *
 * Decision table (evaluated top-to-bottom, first match wins):
 *   1. Any linked session has status "approval"           -> attention
 *   2. Any linked session has status "error"              -> attention
 *   3. Any linked session has status "shutdown" AND issue
 *      state is not completed/canceled                    -> attention
 *   4. Linked spec has status "pending"                   -> attention
 *   5. Any linked session has status "working"            -> active
 *   6. Any linked session has status "idle" or "starting" -> active
 *   7. Linked PR has state "open" or "draft"              -> active
 *   8. Issue state type is "started"                      -> active
 *   9. fallback                                           -> backlog
 */
export function assignSection(
  issue: LinearIssue,
  sessions: readonly WorkerSession[],
  pr: GithubPR | undefined,
  spec: NotionSpec | undefined,
): IssueSection {
  // Rules 1-3: Attention from sessions
  for (const s of sessions) {
    if (s.status === "approval") return "attention";
    if (s.status === "error") return "attention";
    if (
      s.status === "shutdown" &&
      issue.state.type !== "completed" &&
      issue.state.type !== "canceled"
    ) {
      return "attention";
    }
  }

  // Rule 4: Attention from spec
  if (spec?.status === "pending") return "attention";

  // Rules 5-6: Active from sessions
  for (const s of sessions) {
    if (s.status === "working") return "active";
    if (s.status === "idle" || s.status === "starting") return "active";
  }

  // Rule 7: Active from PR
  if (pr?.state === "open" || pr?.state === "draft") return "active";

  // Rule 8: Active from issue state
  if (issue.state.type === "started") return "active";

  // Rule 9: fallback
  return "backlog";
}

// ---------------------------------------------------------------------------
// Badge resolution (data-model.md Section 6)
// ---------------------------------------------------------------------------

/** Resolve the most urgent status badge for a set of linked artifacts. */
export function resolveBadge(
  sessions: readonly WorkerSession[],
  pr: GithubPR | undefined,
  spec: NotionSpec | undefined,
): StatusBadge {
  const candidates: StatusBadge[] = [];

  // Session-derived badges
  for (const session of sessions) {
    switch (session.status) {
      case "approval":
        candidates.push("apprvl");
        break;
      case "error":
        candidates.push("error");
        break;
      case "shutdown":
        candidates.push("done");
        break;
      case "working":
        candidates.push("wrkng");
        break;
      case "idle":
      case "starting":
        candidates.push("idle");
        break;
    }
  }

  // PR-derived badges
  if (pr) {
    if (pr.ciStatus === "fail") candidates.push("ci:fail");
    if (pr.state === "merged") candidates.push("merged");
    if (pr.state === "open") candidates.push("review");
    if (pr.state === "draft") candidates.push("draft");
    if (pr.ciStatus === "pass" && pr.state !== "merged") {
      candidates.push("ci:pass");
    }
  }

  // Spec-derived badges
  if (spec?.status === "pending") {
    candidates.push("spec");
  }

  if (candidates.length === 0) return "--";

  // Return highest priority (lowest number)
  return candidates.reduce((best, c) => (BADGE_PRIORITY[c] < BADGE_PRIORITY[best] ? c : best));
}

/** Resolve badge for an unlinked session. */
export function resolveSessionBadge(session: WorkerSession): StatusBadge {
  switch (session.status) {
    case "approval":
      return "apprvl";
    case "error":
      return "error";
    case "working":
      return "wrkng";
    case "idle":
    case "starting":
      return "idle";
    case "shutdown":
      return "--";
    default:
      return "--";
  }
}

/** Resolve badge for an unlinked PR. */
export function resolvePRBadge(pr: GithubPR): StatusBadge {
  if (pr.ciStatus === "fail") return "ci:fail";
  if (pr.state === "merged") return "merged";
  if (pr.state === "closed") return "--";
  if (pr.state === "draft") return "draft";
  if (pr.ciStatus === "pass") return "ci:pass";
  if (pr.state === "open") return "review";
  return "--";
}

// ---------------------------------------------------------------------------
// Enrichment algorithm (data-model.md Section 2)
// ---------------------------------------------------------------------------

/**
 * Build lookup indexes, link all artifacts to issues, produce enriched list.
 * Pure function -- no side effects.
 */
export function enrichIssues(
  issues: readonly LinearIssue[],
  sessions: readonly WorkerSession[],
  prs: readonly GithubPR[],
  specs: readonly NotionSpec[],
  worktrees: readonly Worktree[],
): EnrichmentResult {
  // Step 1: Build lookup indexes
  const branchToIssue = new Map<string, LinearIssue>();
  const identifierToIssue = new Map<string, LinearIssue>();
  const idToIssue = new Map<string, LinearIssue>();

  for (const issue of issues) {
    idToIssue.set(issue.id, issue);
    identifierToIssue.set(issue.identifier.toUpperCase(), issue);
    if (issue.branch) {
      branchToIssue.set(issue.branch, issue);
    }
  }

  // Step 2: Link sessions to issues
  const issueSessionsMap = new Map<string, WorkerSession[]>();
  const linkedSessionIds = new Set<string>();

  for (const session of sessions) {
    const matchedIssue = matchSessionToIssue(session, branchToIssue, identifierToIssue, worktrees);

    if (matchedIssue) {
      let list = issueSessionsMap.get(matchedIssue.id);
      if (!list) {
        list = [];
        issueSessionsMap.set(matchedIssue.id, list);
      }
      list.push(session);
      linkedSessionIds.add(session.id);
    }
  }

  // Step 3: Link PRs to issues
  const issuePRMap = new Map<string, GithubPR>();
  const linkedPRNumbers = new Set<number>();

  for (const pr of prs) {
    const matchedIssue = matchPRToIssue(pr, branchToIssue, identifierToIssue);

    if (matchedIssue) {
      const existing = issuePRMap.get(matchedIssue.id);
      if (!existing || pr.updatedAt > existing.updatedAt) {
        issuePRMap.set(matchedIssue.id, pr);
      }
      linkedPRNumbers.add(pr.number);
    }
  }

  // Step 4: Link specs to issues
  const issueSpecMap = new Map<string, NotionSpec>();
  for (const spec of specs) {
    if (spec.issueId) issueSpecMap.set(spec.issueId.toUpperCase(), spec);
  }

  // Step 5: Link worktrees to issues
  const issueWorktreeMap = new Map<string, Worktree>();
  for (const wt of worktrees) {
    let matchedIssue = branchToIssue.get(wt.branch);
    if (!matchedIssue) {
      const id = extractIdentifier(wt.branch);
      if (id) matchedIssue = identifierToIssue.get(id);
    }
    if (matchedIssue) {
      issueWorktreeMap.set(matchedIssue.id, wt);
    }
  }

  // Step 6: Assemble enriched issues
  const enriched: EnrichedIssue[] = issues.map((issue) => {
    const linkedSessions = issueSessionsMap.get(issue.id) ?? [];
    const pr = issuePRMap.get(issue.id);
    const spec = issueSpecMap.get(issue.identifier.toUpperCase());
    const worktree = issueWorktreeMap.get(issue.id);

    return {
      issue,
      sessions: linkedSessions,
      pr,
      spec,
      worktree,
      section: assignSection(issue, linkedSessions, pr, spec),
      badge: resolveBadge(linkedSessions, pr, spec),
    };
  });

  // Step 7: Collect unlinked items
  const unlinked: UnlinkedItem[] = [
    ...prs
      .filter((pr) => !linkedPRNumbers.has(pr.number))
      .map((pr): UnlinkedItem => ({ type: "pr", pr })),
    ...sessions
      .filter((s) => !linkedSessionIds.has(s.id))
      .map((s): UnlinkedItem => ({ type: "session", session: s })),
  ];

  return { issues: enriched, unlinked };
}

// ---------------------------------------------------------------------------
// Sorting helpers
// ---------------------------------------------------------------------------

/**
 * Sort enriched issues within their sections per data-model.md Section 5.4.
 *
 * - attention: badge urgency descending, then updatedAt descending
 * - active: lastActivityAt descending (from session/PR), then updatedAt descending
 * - backlog: priority ascending (1=Urgent first), then updatedAt descending
 */
export function sortEnrichedIssues(issues: readonly EnrichedIssue[]): EnrichedIssue[] {
  return [...issues].sort((a, b) => {
    // Section order: attention < active < backlog
    const sectionOrder: Record<IssueSection, number> = {
      attention: 0,
      active: 1,
      backlog: 2,
      unlinked: 3,
    };
    const sectionDiff = sectionOrder[a.section] - sectionOrder[b.section];
    if (sectionDiff !== 0) return sectionDiff;

    // Within same section, apply section-specific sorting
    switch (a.section) {
      case "attention":
        // Badge urgency descending (lower priority number = more urgent = first)
        const badgeDiff = BADGE_PRIORITY[a.badge] - BADGE_PRIORITY[b.badge];
        if (badgeDiff !== 0) return badgeDiff;
        return b.issue.updatedAt.localeCompare(a.issue.updatedAt);

      case "active": {
        // lastActivityAt descending
        const aActivity = getLastActivityAt(a);
        const bActivity = getLastActivityAt(b);
        const activityDiff = bActivity.localeCompare(aActivity);
        if (activityDiff !== 0) return activityDiff;
        return b.issue.updatedAt.localeCompare(a.issue.updatedAt);
      }

      case "backlog":
        // Priority ascending (1=Urgent first, 0=None last)
        const aPrio = a.issue.priority === 0 ? 5 : a.issue.priority;
        const bPrio = b.issue.priority === 0 ? 5 : b.issue.priority;
        const prioDiff = aPrio - bPrio;
        if (prioDiff !== 0) return prioDiff;
        return b.issue.updatedAt.localeCompare(a.issue.updatedAt);

      default:
        return b.issue.updatedAt.localeCompare(a.issue.updatedAt);
    }
  });
}

/** Get the most recent activity timestamp from linked artifacts. */
function getLastActivityAt(enriched: EnrichedIssue): string {
  let latest = enriched.issue.updatedAt;

  for (const s of enriched.sessions) {
    if (s.lastActivityAt > latest) latest = s.lastActivityAt;
  }
  if (enriched.pr && enriched.pr.updatedAt > latest) {
    latest = enriched.pr.updatedAt;
  }

  return latest;
}

// ---------------------------------------------------------------------------
// IssueListModel builder
// ---------------------------------------------------------------------------

/** The complete model driving the left pane. */
export interface IssueListModel {
  readonly attention: readonly EnrichedIssue[];
  readonly active: readonly EnrichedIssue[];
  readonly backlog: readonly EnrichedIssue[];
  readonly unlinked: readonly UnlinkedItem[];
}

/** Build the issue list model from enrichment result. */
export function buildIssueListModel(result: EnrichmentResult): IssueListModel {
  const sorted = sortEnrichedIssues(result.issues);

  return {
    attention: sorted.filter((i) => i.section === "attention"),
    active: sorted.filter((i) => i.section === "active"),
    backlog: sorted.filter((i) => i.section === "backlog"),
    unlinked: result.unlinked,
  };
}

// ---------------------------------------------------------------------------
// Internal: session-to-issue matching
// ---------------------------------------------------------------------------

/**
 * Match a session to an issue using the 4-priority matching algorithm
 * from data-model.md Section 2.1.
 */
function matchSessionToIssue(
  session: WorkerSession,
  branchToIssue: Map<string, LinearIssue>,
  identifierToIssue: Map<string, LinearIssue>,
  worktrees: readonly Worktree[],
): LinearIssue | undefined {
  // WorkerSession from the contract doesn't have branch/issueIdentifier/worktreePath.
  // Those fields are on the data-model entity, not the contract.
  // The contract WorkerSession only has: id, name, status, cwd, startedAt, lastActivityAt, tokenCount.
  // We match by CWD -> worktree path -> worktree branch -> issue.

  // Try matching via cwd to a worktree
  const wt = worktrees.find((w) => session.cwd === w.path || session.cwd.startsWith(w.path + "/"));
  if (wt) {
    const matched = branchToIssue.get(wt.branch);
    if (matched) return matched;

    const id = extractIdentifier(wt.branch);
    if (id) {
      const matched2 = identifierToIssue.get(id);
      if (matched2) return matched2;
    }
  }

  return undefined;
}

/**
 * Match a PR to an issue using branch/identifier matching
 * from data-model.md Section 2.1.
 */
function matchPRToIssue(
  pr: GithubPR,
  branchToIssue: Map<string, LinearIssue>,
  identifierToIssue: Map<string, LinearIssue>,
): LinearIssue | undefined {
  // Priority 1: headRef matches issue branch exactly
  const branchMatch = branchToIssue.get(pr.headRef);
  if (branchMatch) return branchMatch;

  // Priority 2: ticketId matches issue identifier
  if (pr.ticketId) {
    const ticketMatch = identifierToIssue.get(pr.ticketId.toUpperCase());
    if (ticketMatch) return ticketMatch;
  }

  // Priority 3: Extract identifier from headRef
  const id = extractIdentifier(pr.headRef);
  if (id) {
    const idMatch = identifierToIssue.get(id);
    if (idMatch) return idMatch;
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Service implementation
// ---------------------------------------------------------------------------

/** Create the enrichment service. */
export function createEnrichmentService(): EnrichmentService {
  return { enrichIssues };
}
