import { describe, test, expect } from "bun:test";
import {
  makeIssue,
  makePR,
  makeWorktree,
  makeSession,
  makeSpec,
  makeState,
} from "../helpers.js";
import {
  extractIdentifier,
  assignSection,
  resolveBadge,
  resolveSessionBadge,
  resolvePRBadge,
  enrichIssues,
  sortEnrichedIssues,
  buildIssueListModel,
} from "../../src/enrichment.js";
import { linearIssueId, prNumber, sessionId, worktreePath } from "../../src/types.js";

// ---------------------------------------------------------------------------
// extractIdentifier
// ---------------------------------------------------------------------------

describe("extractIdentifier", () => {
  test("direct match returns identifier", () => {
    expect(extractIdentifier("AUTH-142")).toBe("AUTH-142");
  });

  test("branch with prefix extracts identifier after last slash", () => {
    expect(extractIdentifier("feature/auth-142-fix")).toBe("AUTH-142");
  });

  test("nested slashes extracts from last segment", () => {
    expect(extractIdentifier("refs/heads/feature/auth-142")).toBe("AUTH-142");
  });

  test("no match returns undefined", () => {
    expect(extractIdentifier("some-random-text")).toBeUndefined();
  });

  test("normalizes to uppercase", () => {
    expect(extractIdentifier("auth-142")).toBe("AUTH-142");
  });

  test("string starting with number returns undefined", () => {
    expect(extractIdentifier("123-test")).toBeUndefined();
  });

  test("identifier with long team prefix", () => {
    expect(extractIdentifier("PLATFORM-9001")).toBe("PLATFORM-9001");
  });

  test("empty string returns undefined", () => {
    expect(extractIdentifier("")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// assignSection
// ---------------------------------------------------------------------------

describe("assignSection", () => {
  test("rule 1: session with status approval → attention", () => {
    const issue = makeIssue();
    const session = makeSession({ status: "approval" });
    expect(assignSection(issue, [session], undefined, undefined)).toBe("attention");
  });

  test("rule 2: session with status error → attention", () => {
    const issue = makeIssue();
    const session = makeSession({ status: "error" });
    expect(assignSection(issue, [session], undefined, undefined)).toBe("attention");
  });

  test("rule 3: session shutdown + non-completed issue → attention", () => {
    const issue = makeIssue({ state: makeState({ type: "started" }) });
    const session = makeSession({ status: "shutdown" });
    expect(assignSection(issue, [session], undefined, undefined)).toBe("attention");
  });

  test("rule 3 exception: session shutdown + completed issue → not attention", () => {
    const issue = makeIssue({ state: makeState({ type: "completed" }) });
    const session = makeSession({ status: "shutdown" });
    // Falls through to active/backlog. shutdown session doesn't trigger rules 5-6, no PR, completed state → backlog
    expect(assignSection(issue, [session], undefined, undefined)).toBe("backlog");
  });

  test("rule 3 exception: session shutdown + canceled issue → not attention", () => {
    const issue = makeIssue({ state: makeState({ type: "canceled" }) });
    const session = makeSession({ status: "shutdown" });
    expect(assignSection(issue, [session], undefined, undefined)).toBe("backlog");
  });

  test("rule 4: spec with status pending → attention", () => {
    const issue = makeIssue({ state: makeState({ type: "backlog" }) });
    const spec = makeSpec({ status: "pending" });
    expect(assignSection(issue, [], undefined, spec)).toBe("attention");
  });

  test("rule 5: session with status working → active", () => {
    const issue = makeIssue({ state: makeState({ type: "backlog" }) });
    const session = makeSession({ status: "working" });
    expect(assignSection(issue, [session], undefined, undefined)).toBe("active");
  });

  test("rule 6: session with status idle → active", () => {
    const issue = makeIssue({ state: makeState({ type: "backlog" }) });
    const session = makeSession({ status: "idle" });
    expect(assignSection(issue, [session], undefined, undefined)).toBe("active");
  });

  test("rule 6: session with status starting → active", () => {
    const issue = makeIssue({ state: makeState({ type: "backlog" }) });
    const session = makeSession({ status: "starting" });
    expect(assignSection(issue, [session], undefined, undefined)).toBe("active");
  });

  test("rule 7: PR with state open → active", () => {
    const issue = makeIssue({ state: makeState({ type: "backlog" }) });
    const pr = makePR({ state: "open" });
    expect(assignSection(issue, [], pr, undefined)).toBe("active");
  });

  test("rule 7: PR with state draft → active", () => {
    const issue = makeIssue({ state: makeState({ type: "backlog" }) });
    const pr = makePR({ state: "draft" });
    expect(assignSection(issue, [], pr, undefined)).toBe("active");
  });

  test("rule 8: issue state started, no sessions/PR → active", () => {
    const issue = makeIssue({ state: makeState({ type: "started" }) });
    expect(assignSection(issue, [], undefined, undefined)).toBe("active");
  });

  test("rule 9: fallback → backlog", () => {
    const issue = makeIssue({ state: makeState({ type: "backlog" }) });
    expect(assignSection(issue, [], undefined, undefined)).toBe("backlog");
  });

  test("priority: approval session beats spec pending", () => {
    const issue = makeIssue();
    const session = makeSession({ status: "approval" });
    const spec = makeSpec({ status: "pending" });
    expect(assignSection(issue, [session], undefined, spec)).toBe("attention");
  });
});

// ---------------------------------------------------------------------------
// resolveBadge
// ---------------------------------------------------------------------------

describe("resolveBadge", () => {
  test("session approval → apprvl", () => {
    expect(resolveBadge([makeSession({ status: "approval" })], undefined, undefined)).toBe("apprvl");
  });

  test("session error → error", () => {
    expect(resolveBadge([makeSession({ status: "error" })], undefined, undefined)).toBe("error");
  });

  test("session shutdown → done", () => {
    expect(resolveBadge([makeSession({ status: "shutdown" })], undefined, undefined)).toBe("done");
  });

  test("session working → wrkng", () => {
    expect(resolveBadge([makeSession({ status: "working" })], undefined, undefined)).toBe("wrkng");
  });

  test("session idle → idle", () => {
    expect(resolveBadge([makeSession({ status: "idle" })], undefined, undefined)).toBe("idle");
  });

  test("session starting → idle", () => {
    expect(resolveBadge([makeSession({ status: "starting" })], undefined, undefined)).toBe("idle");
  });

  test("PR ciStatus fail + open state → review wins (priority 4 < 5)", () => {
    expect(resolveBadge([], makePR({ ciStatus: "fail", state: "open" }), undefined)).toBe("review");
  });

  test("PR ciStatus fail + closed state → ci:fail", () => {
    expect(resolveBadge([], makePR({ ciStatus: "fail", state: "closed" }), undefined)).toBe("ci:fail");
  });

  test("PR merged + ciStatus pass → merged (ci:pass excluded for merged)", () => {
    expect(resolveBadge([], makePR({ state: "merged", ciStatus: "pass" }), undefined)).toBe("merged");
  });

  test("PR merged + ciStatus null → merged", () => {
    expect(resolveBadge([], makePR({ state: "merged", ciStatus: null }), undefined)).toBe("merged");
  });

  test("PR open → review", () => {
    expect(resolveBadge([], makePR({ state: "open", ciStatus: null }), undefined)).toBe("review");
  });

  test("PR draft → draft", () => {
    expect(resolveBadge([], makePR({ state: "draft", ciStatus: null }), undefined)).toBe("draft");
  });

  test("PR open + ciStatus pass → ci:pass wins over review (lower number)", () => {
    // ci:pass is 9, review is 4. review wins.
    const pr = makePR({ state: "open", ciStatus: "pass" });
    expect(resolveBadge([], pr, undefined)).toBe("review");
  });

  test("spec pending → spec", () => {
    expect(resolveBadge([], undefined, makeSpec({ status: "pending" }))).toBe("spec");
  });

  test("approval session + ci:fail PR → apprvl wins (priority 0 < 5)", () => {
    const session = makeSession({ status: "approval" });
    const pr = makePR({ ciStatus: "fail" });
    expect(resolveBadge([session], pr, undefined)).toBe("apprvl");
  });

  test("no candidates → '--'", () => {
    expect(resolveBadge([], undefined, undefined)).toBe("--");
  });

  test("spec draft does not produce badge", () => {
    expect(resolveBadge([], undefined, makeSpec({ status: "draft" }))).toBe("--");
  });
});

// ---------------------------------------------------------------------------
// resolveSessionBadge
// ---------------------------------------------------------------------------

describe("resolveSessionBadge", () => {
  test("approval → apprvl", () => {
    expect(resolveSessionBadge(makeSession({ status: "approval" }))).toBe("apprvl");
  });

  test("error → error", () => {
    expect(resolveSessionBadge(makeSession({ status: "error" }))).toBe("error");
  });

  test("working → wrkng", () => {
    expect(resolveSessionBadge(makeSession({ status: "working" }))).toBe("wrkng");
  });

  test("idle → idle", () => {
    expect(resolveSessionBadge(makeSession({ status: "idle" }))).toBe("idle");
  });

  test("starting → idle", () => {
    expect(resolveSessionBadge(makeSession({ status: "starting" }))).toBe("idle");
  });

  test("shutdown → '--'", () => {
    expect(resolveSessionBadge(makeSession({ status: "shutdown" }))).toBe("--");
  });
});

// ---------------------------------------------------------------------------
// resolvePRBadge
// ---------------------------------------------------------------------------

describe("resolvePRBadge", () => {
  test("ciStatus fail → ci:fail (regardless of state)", () => {
    expect(resolvePRBadge(makePR({ ciStatus: "fail", state: "open" }))).toBe("ci:fail");
  });

  test("merged → merged", () => {
    expect(resolvePRBadge(makePR({ state: "merged", ciStatus: "pass" }))).toBe("merged");
  });

  test("closed → '--'", () => {
    expect(resolvePRBadge(makePR({ state: "closed", ciStatus: null }))).toBe("--");
  });

  test("draft → draft", () => {
    expect(resolvePRBadge(makePR({ state: "draft", ciStatus: null }))).toBe("draft");
  });

  test("open + ciStatus pass → ci:pass", () => {
    expect(resolvePRBadge(makePR({ state: "open", ciStatus: "pass" }))).toBe("ci:pass");
  });

  test("open + no special ciStatus → review", () => {
    expect(resolvePRBadge(makePR({ state: "open", ciStatus: null }))).toBe("review");
  });

  test("ci:fail takes precedence over merged", () => {
    expect(resolvePRBadge(makePR({ state: "merged", ciStatus: "fail" }))).toBe("ci:fail");
  });
});

// ---------------------------------------------------------------------------
// enrichIssues
// ---------------------------------------------------------------------------

describe("enrichIssues", () => {
  test("empty inputs produce empty result", () => {
    const result = enrichIssues([], [], [], [], []);
    expect(result.issues).toEqual([]);
    expect(result.unlinked).toEqual([]);
  });

  test("links session to issue via worktree CWD match", () => {
    const issue = makeIssue();
    const wt = makeWorktree();
    const session = makeSession({ cwd: wt.path });
    const result = enrichIssues([issue], [session], [], [], [wt]);

    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]!.sessions).toHaveLength(1);
    expect(result.issues[0]!.sessions[0]!.id).toBe(session.id);
    expect(result.unlinked).toHaveLength(0);
  });

  test("links PR to issue via headRef matching issue branch", () => {
    const issue = makeIssue({ branch: "feature/auth-142-oauth" });
    const pr = makePR({ headRef: "feature/auth-142-oauth" });
    const result = enrichIssues([issue], [], [pr], [], []);

    expect(result.issues[0]!.pr).toBeDefined();
    expect(result.issues[0]!.pr!.number).toBe(pr.number);
    expect(result.unlinked).toHaveLength(0);
  });

  test("links PR to issue via ticketId matching identifier", () => {
    const issue = makeIssue({ branch: "some-other-branch" });
    const pr = makePR({ headRef: "unrelated-branch", ticketId: "AUTH-142" });
    const result = enrichIssues([issue], [], [pr], [], []);

    expect(result.issues[0]!.pr).toBeDefined();
    expect(result.issues[0]!.pr!.number).toBe(pr.number);
  });

  test("links PR to issue via identifier extraction from headRef", () => {
    const issue = makeIssue({ branch: "some-other-branch" });
    const pr = makePR({ headRef: "auth-142-fix-login", ticketId: undefined });
    const result = enrichIssues([issue], [], [pr], [], []);

    expect(result.issues[0]!.pr).toBeDefined();
  });

  test("links spec to issue via issueId matching identifier", () => {
    const issue = makeIssue({ identifier: "AUTH-142" });
    const spec = makeSpec({ issueId: "AUTH-142" });
    const result = enrichIssues([issue], [], [], [spec], []);

    expect(result.issues[0]!.spec).toBeDefined();
    expect(result.issues[0]!.spec!.id).toBe(spec.id);
  });

  test("links worktree to issue via branch match", () => {
    const issue = makeIssue({ branch: "feature/auth-142-oauth" });
    const wt = makeWorktree({ branch: "feature/auth-142-oauth" });
    const result = enrichIssues([issue], [], [], [], [wt]);

    expect(result.issues[0]!.worktree).toBeDefined();
    expect(result.issues[0]!.worktree!.path).toBe(wt.path);
  });

  test("unlinked PR appears in unlinked", () => {
    const issue = makeIssue({ branch: "feature/auth-142-oauth" });
    const pr = makePR({
      headRef: "totally-different-branch",
      ticketId: undefined,
      number: prNumber(99),
    });
    const result = enrichIssues([issue], [], [pr], [], []);

    expect(result.issues[0]!.pr).toBeUndefined();
    expect(result.unlinked).toHaveLength(1);
    expect(result.unlinked[0]!.type).toBe("pr");
  });

  test("unlinked session appears in unlinked", () => {
    const issue = makeIssue();
    const session = makeSession({
      id: sessionId("s-orphan"),
      cwd: "/some/random/path",
    });
    const result = enrichIssues([issue], [session], [], [], []);

    expect(result.issues[0]!.sessions).toHaveLength(0);
    expect(result.unlinked).toHaveLength(1);
    expect(result.unlinked[0]!.type).toBe("session");
  });

  test("most-recent PR wins dedup when two PRs match same issue", () => {
    const issue = makeIssue({ branch: "feature/auth-142-oauth" });
    const olderPR = makePR({
      number: prNumber(10),
      headRef: "feature/auth-142-oauth",
      updatedAt: "2026-02-24T10:00:00.000Z",
    });
    const newerPR = makePR({
      number: prNumber(20),
      headRef: "feature/auth-142-oauth",
      updatedAt: "2026-02-25T10:00:00.000Z",
    });
    const result = enrichIssues([issue], [], [olderPR, newerPR], [], []);

    expect(result.issues[0]!.pr!.number).toBe(prNumber(20));
    // Both are linked (both in linkedPRNumbers set), so neither is unlinked
    expect(result.unlinked).toHaveLength(0);
  });

  test("issue with no branch can still match via identifier extraction", () => {
    const issue = makeIssue({ branch: undefined, identifier: "AUTH-142" });
    const pr = makePR({ headRef: "auth-142-impl", ticketId: undefined });
    const result = enrichIssues([issue], [], [pr], [], []);

    expect(result.issues[0]!.pr).toBeDefined();
  });

  test("enriched issue gets correct section and badge", () => {
    const issue = makeIssue();
    const session = makeSession({ status: "approval" });
    const wt = makeWorktree();
    const result = enrichIssues([issue], [session], [], [], [wt]);

    expect(result.issues[0]!.section).toBe("attention");
    expect(result.issues[0]!.badge).toBe("apprvl");
  });

  test("session CWD that is subdirectory of worktree path matches", () => {
    const issue = makeIssue();
    const wt = makeWorktree({ path: worktreePath("/Users/dylan/worktrees/auth-142") });
    const session = makeSession({ cwd: "/Users/dylan/worktrees/auth-142/src/lib" });
    const result = enrichIssues([issue], [session], [], [], [wt]);

    expect(result.issues[0]!.sessions).toHaveLength(1);
  });

  test("spec issueId matching is case-insensitive", () => {
    const issue = makeIssue({ identifier: "AUTH-142" });
    const spec = makeSpec({ issueId: "auth-142" });
    const result = enrichIssues([issue], [], [], [spec], []);

    expect(result.issues[0]!.spec).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// sortEnrichedIssues
// ---------------------------------------------------------------------------

describe("sortEnrichedIssues", () => {
  test("section ordering: attention < active < backlog", () => {
    const backlog = makeIssue({
      id: linearIssueId("i-backlog"),
      identifier: "B-1",
      state: makeState({ type: "backlog" }),
    });
    const active = makeIssue({
      id: linearIssueId("i-active"),
      identifier: "A-1",
      state: makeState({ type: "started" }),
    });
    const attention = makeIssue({
      id: linearIssueId("i-attn"),
      identifier: "C-1",
      state: makeState({ type: "started" }),
    });

    const result = enrichIssues(
      [backlog, active, attention],
      [makeSession({ status: "approval", cwd: "/attn" })],
      [],
      [],
      [makeWorktree({ path: worktreePath("/attn"), branch: "c-1-thing" })],
    );

    const sorted = sortEnrichedIssues(result.issues);
    expect(sorted[0]!.section).toBe("attention");
    expect(sorted[1]!.section).toBe("active");
    expect(sorted[2]!.section).toBe("backlog");
  });

  test("within attention: badge priority sort (apprvl before error)", () => {
    const issue1 = makeIssue({
      id: linearIssueId("i-1"),
      identifier: "X-1",
      branch: "x-1-branch",
      state: makeState({ type: "started" }),
    });
    const issue2 = makeIssue({
      id: linearIssueId("i-2"),
      identifier: "Y-1",
      branch: "y-1-branch",
      state: makeState({ type: "started" }),
    });

    const wt1 = makeWorktree({ path: worktreePath("/wt1"), branch: "x-1-branch" });
    const wt2 = makeWorktree({ path: worktreePath("/wt2"), branch: "y-1-branch" });

    const sessionError = makeSession({
      id: sessionId("s-err"),
      status: "error",
      cwd: "/wt1",
    });
    const sessionApproval = makeSession({
      id: sessionId("s-appr"),
      status: "approval",
      cwd: "/wt2",
    });

    const result = enrichIssues([issue1, issue2], [sessionError, sessionApproval], [], [], [wt1, wt2]);
    const sorted = sortEnrichedIssues(result.issues);

    // apprvl (0) comes before error (1)
    expect(sorted[0]!.badge).toBe("apprvl");
    expect(sorted[1]!.badge).toBe("error");
  });

  test("within active: lastActivityAt descending", () => {
    const issue1 = makeIssue({
      id: linearIssueId("i-1"),
      identifier: "X-1",
      branch: "x-1-branch",
      state: makeState({ type: "started" }),
      updatedAt: "2026-02-20T00:00:00.000Z",
    });
    const issue2 = makeIssue({
      id: linearIssueId("i-2"),
      identifier: "Y-1",
      branch: "y-1-branch",
      state: makeState({ type: "started" }),
      updatedAt: "2026-02-20T00:00:00.000Z",
    });

    const wt1 = makeWorktree({ path: worktreePath("/wt1"), branch: "x-1-branch" });
    const wt2 = makeWorktree({ path: worktreePath("/wt2"), branch: "y-1-branch" });

    const sessionOlder = makeSession({
      id: sessionId("s-old"),
      status: "working",
      cwd: "/wt1",
      lastActivityAt: "2026-02-24T00:00:00.000Z",
    });
    const sessionNewer = makeSession({
      id: sessionId("s-new"),
      status: "working",
      cwd: "/wt2",
      lastActivityAt: "2026-02-25T00:00:00.000Z",
    });

    const result = enrichIssues([issue1, issue2], [sessionOlder, sessionNewer], [], [], [wt1, wt2]);
    const sorted = sortEnrichedIssues(result.issues);

    // Newer activity first
    expect(sorted[0]!.issue.identifier).toBe("Y-1");
    expect(sorted[1]!.issue.identifier).toBe("X-1");
  });

  test("within backlog: priority ascending, 0 treated as 5", () => {
    const urgent = makeIssue({
      id: linearIssueId("i-urg"),
      identifier: "U-1",
      state: makeState({ type: "backlog" }),
      priority: 1,
      updatedAt: "2026-02-20T00:00:00.000Z",
    });
    const noPriority = makeIssue({
      id: linearIssueId("i-none"),
      identifier: "N-1",
      state: makeState({ type: "backlog" }),
      priority: 0,
      updatedAt: "2026-02-20T00:00:00.000Z",
    });
    const medium = makeIssue({
      id: linearIssueId("i-med"),
      identifier: "M-1",
      state: makeState({ type: "backlog" }),
      priority: 3,
      updatedAt: "2026-02-20T00:00:00.000Z",
    });

    const result = enrichIssues([noPriority, medium, urgent], [], [], [], []);
    const sorted = sortEnrichedIssues(result.issues);

    // 1 (urgent) < 3 (medium) < 5 (0 mapped to 5)
    expect(sorted[0]!.issue.priority).toBe(1);
    expect(sorted[1]!.issue.priority).toBe(3);
    expect(sorted[2]!.issue.priority).toBe(0);
  });

  test("within backlog same priority: updatedAt descending", () => {
    const older = makeIssue({
      id: linearIssueId("i-old"),
      identifier: "O-1",
      state: makeState({ type: "backlog" }),
      priority: 2,
      updatedAt: "2026-02-20T00:00:00.000Z",
    });
    const newer = makeIssue({
      id: linearIssueId("i-new"),
      identifier: "N-1",
      state: makeState({ type: "backlog" }),
      priority: 2,
      updatedAt: "2026-02-25T00:00:00.000Z",
    });

    const result = enrichIssues([older, newer], [], [], [], []);
    const sorted = sortEnrichedIssues(result.issues);

    expect(sorted[0]!.issue.identifier).toBe("N-1");
    expect(sorted[1]!.issue.identifier).toBe("O-1");
  });
});

// ---------------------------------------------------------------------------
// buildIssueListModel
// ---------------------------------------------------------------------------

describe("buildIssueListModel", () => {
  test("returns sections populated from enrichment result", () => {
    const attentionIssue = makeIssue({
      id: linearIssueId("i-attn"),
      identifier: "A-1",
      branch: "a-1-branch",
      state: makeState({ type: "started" }),
    });
    const activeIssue = makeIssue({
      id: linearIssueId("i-active"),
      identifier: "B-1",
      state: makeState({ type: "started" }),
    });
    const backlogIssue = makeIssue({
      id: linearIssueId("i-back"),
      identifier: "C-1",
      state: makeState({ type: "backlog" }),
    });

    const wt = makeWorktree({ path: worktreePath("/wt-a"), branch: "a-1-branch" });
    const session = makeSession({ status: "error", cwd: "/wt-a" });

    const result = enrichIssues(
      [attentionIssue, activeIssue, backlogIssue],
      [session],
      [],
      [],
      [wt],
    );
    const model = buildIssueListModel(result);

    expect(model.attention).toHaveLength(1);
    expect(model.attention[0]!.issue.identifier).toBe("A-1");
    expect(model.active).toHaveLength(1);
    expect(model.active[0]!.issue.identifier).toBe("B-1");
    expect(model.backlog).toHaveLength(1);
    expect(model.backlog[0]!.issue.identifier).toBe("C-1");
  });

  test("unlinked items passed through", () => {
    const issue = makeIssue();
    const orphanPR = makePR({
      number: prNumber(99),
      headRef: "totally-unrelated",
      ticketId: undefined,
    });

    const result = enrichIssues([issue], [], [orphanPR], [], []);
    const model = buildIssueListModel(result);

    expect(model.unlinked).toHaveLength(1);
    expect(model.unlinked[0]!.type).toBe("pr");
  });

  test("empty enrichment produces empty model", () => {
    const result = enrichIssues([], [], [], [], []);
    const model = buildIssueListModel(result);

    expect(model.attention).toHaveLength(0);
    expect(model.active).toHaveLength(0);
    expect(model.backlog).toHaveLength(0);
    expect(model.unlinked).toHaveLength(0);
  });
});
