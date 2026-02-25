/**
 * Root application component.
 *
 * Provides DialogProvider, Toaster, Solid signal providers for integration data,
 * and polling scaffolding with configurable intervals.
 *
 * @module app
 */

import { createSignal, createEffect, createMemo, onCleanup } from "solid-js";
import { DialogProvider, useDialog } from "@opentui-ui/dialog/solid";
import { Toaster, toast } from "@opentui-ui/toast/solid";
import { Database } from "bun:sqlite";

import type {
  SpecstarConfig,
  LinearIssue,
  GithubPR,
  NotionSpec,
  WorkerSession,
  SessionId,
  PrNumber,
} from "./types.js";
import type { Worktree } from "../specs/001-issue-centric-tui/contracts/github.js";

import { createLinearClient } from "./integrations/linear/client.js";
import { createGithubClient } from "./integrations/github/client.js";
import { createWorktreeManager } from "./integrations/github/worktree.js";
import { createNotionClient } from "./integrations/notion/client.js";
import { createCache } from "./db.js";
import { resolveTheme, createDefaultSyntaxStyle } from "./tui/theme.js";
import { enrichIssues, buildIssueListModel } from "./enrichment.js";
import { Layout } from "./tui/layout.js";
import { IssueList, getFlatItems } from "./tui/issue-list.js";
import { StatusBar } from "./tui/status-bar.js";
import { IssueDetail } from "./tui/issue-detail.js";
import type { DetailTab } from "./tui/issue-detail.js";
import { createSessionPool } from "./sessions/pool.js";
import type { SessionPoolWithHandles } from "./sessions/pool.js";
import { showSessionDetail } from "./tui/session-detail.js";
import { showPromptOverlay } from "./tui/input-overlay.js";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AppProps {
  readonly config: SpecstarConfig;
  readonly db: Database;
}

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

export function App(props: AppProps) {
  const { config, db } = props;
  const theme = resolveTheme(config.theme);

  // -------------------------------------------------------------------------
  // Integration data signals
  // -------------------------------------------------------------------------

  const [issues, setIssues] = createSignal<readonly LinearIssue[]>([]);
  const [prs, setPrs] = createSignal<readonly GithubPR[]>([]);
  const [specs, setSpecs] = createSignal<readonly NotionSpec[]>([]);
  const [worktrees, setWorktrees] = createSignal<readonly Worktree[]>([]);
  const [sessions, setSessions] = createSignal<readonly WorkerSession[]>([]);

  // -------------------------------------------------------------------------
  // Session pool
  // -------------------------------------------------------------------------

  const pool: SessionPoolWithHandles = createSessionPool({
    maxConcurrent: config.sessions.maxConcurrent,
  });

  // Subscribe to pool changes to keep the sessions signal in sync
  pool.subscribe({
    onSessionAdded: () => setSessions(pool.list()),
    onSessionRemoved: () => setSessions(pool.list()),
    onSessionUpdated: () => setSessions(pool.list()),
    onNotification: (notification) => {
      if (notification.kind === "approval_needed") {
        toast.warning(`Session "${notification.sessionName}": approval needed`);
      } else if (notification.kind === "error") {
        toast.error(`Session "${notification.sessionName}": ${notification.message}`);
      } else if (notification.kind === "completed") {
        toast.success(`Session "${notification.sessionName}" completed`);
      }
    },
  });

  onCleanup(() => {
    void pool.shutdownAll();
  });

  // Session action handlers
  async function handleNewSession() {
    const cwd = config.sessions.worktreeBase;
    try {
      await pool.spawn({
        cwd,
        name: `Session ${pool.size + 1}`,
        model: config.sessions.model,
        thinkingLevel: config.sessions.thinkingLevel,
      });
      toast.success("Session started");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
            ? String((err as { message: unknown }).message)
            : String(err);
      toast.error(`Failed to start session: ${msg}`);
    }
  }

  function handleApproveSession(sessionId: SessionId) {
    const handle = pool.getHandle(sessionId);
    if (!handle || handle.status !== "approval") return;
    handle.sendApproval();
    pool.dismiss(sessionId, "approval_needed");
    toast.success("Approved");
  }

  function handleRejectSession(sessionId: SessionId) {
    const handle = pool.getHandle(sessionId);
    if (!handle || handle.status !== "approval") return;
    handle.sendRejection();
    pool.dismiss(sessionId, "approval_needed");
    toast("Rejected");
  }

  // PR action handlers
  async function handleApprovePR(prNumber: PrNumber) {
    if (!githubClientPromise) return;
    try {
      const client = await githubClientPromise;
      await client.approvePR(prNumber);
      toast.success("PR approved");
      void refreshGithub();
    } catch (err: unknown) {
      toast.error(`Failed to approve PR: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  function handleOpenExternal(url: string) {
    Bun.spawn(["open", url]);
  }

  async function handleRefreshPR() {
    await refreshGithub();
    toast.success("PRs refreshed");
  }

  // UI state signals
  const [focusedPane, setFocusedPane] = createSignal<"left" | "right">("left");
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const [activeTab, setActiveTab] = createSignal<DetailTab>("overview");
  const syntaxStyle = createDefaultSyntaxStyle();

  const TAB_ORDER: DetailTab[] = ["overview", "spec", "review"];

  function handleTabSelect(tab: 1 | 2 | 3) {
    setActiveTab(TAB_ORDER[tab - 1]!);
  }

  function handleTabCycle(direction: "next" | "prev") {
    const current = TAB_ORDER.indexOf(activeTab());
    if (direction === "next") {
      setActiveTab(TAB_ORDER[(current + 1) % TAB_ORDER.length]!);
    } else {
      setActiveTab(TAB_ORDER[(current - 1 + TAB_ORDER.length) % TAB_ORDER.length]!);
    }
  }

  // -------------------------------------------------------------------------
  // Integration caches (for delta detection)
  // -------------------------------------------------------------------------

  const issueCache = createCache<LinearIssue>(db, "issues", (i) => i.id);
  const prCache = createCache<GithubPR>(db, "pull_requests", (p) => String(p.number));
  const specCache = createCache<NotionSpec>(db, "specs", (s) => s.id);

  // Load cached data for instant display on startup
  setIssues(issueCache.load());
  setPrs(prCache.load());
  setSpecs(specCache.load());

  // -------------------------------------------------------------------------
  // Integration clients (created lazily based on config)
  // -------------------------------------------------------------------------

  const linearClient = config.linear
    ? createLinearClient(config.linear.apiKey, config.linear.teamId)
    : undefined;

  // GitHub client is async (repo detection), create eagerly
  let githubClientPromise: ReturnType<typeof createGithubClient> | undefined;
  if (config.github !== undefined) {
    githubClientPromise = createGithubClient(config.github.repo);
  }

  const worktreeManager = createWorktreeManager(config.sessions.worktreeBase);

  const notionClient = config.notion
    ? createNotionClient(config.notion.apiKey, config.notion.databaseId)
    : undefined;

  // -------------------------------------------------------------------------
  // Polling
  // -------------------------------------------------------------------------

  const timers: ReturnType<typeof setInterval>[] = [];

  async function refreshLinear() {
    if (!linearClient || !config.linear) return;
    try {
      const fresh = await linearClient.getIssues({
        teamId: config.linear.teamId as never,
        assigneeId: config.linear.assignedToMe ? "me" : undefined,
      });
      if (issueCache.update(fresh)) {
        setIssues(fresh);
      }
    } catch (err) {
      toast.error(`Linear: ${err instanceof Error ? err.message : "connection error"}`);
    }
  }

  async function refreshGithub() {
    if (!githubClientPromise) return;
    try {
      const client = await githubClientPromise;
      const fresh = await client.listPRs();
      if (prCache.update(fresh)) {
        setPrs(fresh);
      }
    } catch (err) {
      toast.error(`GitHub: ${err instanceof Error ? err.message : "connection error"}`);
    }
  }

  async function refreshWorktrees() {
    try {
      const fresh = await worktreeManager.list();
      setWorktrees(fresh);
    } catch (err) {
      toast.error(`Worktrees: ${err instanceof Error ? err.message : "connection error"}`);
    }
  }

  async function refreshNotion() {
    if (!notionClient || !config.notion) return;
    try {
      const fresh = await notionClient.listSpecs(config.notion.databaseId as never);
      if (specCache.update(fresh)) {
        setSpecs(fresh);
      }
    } catch (err) {
      toast.error(`Notion: ${err instanceof Error ? err.message : "connection error"}`);
    }
  }

  // Initial fetch
  createEffect(() => {
    void refreshLinear();
    void refreshGithub();
    void refreshWorktrees();
    void refreshNotion();
  });

  // Set up polling intervals
  createEffect(() => {
    const linearInterval = config.linear?.refreshInterval ?? 30;
    const githubInterval = config.github?.refreshInterval ?? 30;
    const notionInterval = config.notion?.refreshInterval ?? 60;
    const worktreeInterval = 10; // Fixed 10s for worktrees

    if (linearClient) {
      timers.push(setInterval(() => void refreshLinear(), linearInterval * 1000));
    }
    if (githubClientPromise) {
      timers.push(setInterval(() => void refreshGithub(), githubInterval * 1000));
    }
    timers.push(setInterval(() => void refreshWorktrees(), worktreeInterval * 1000));
    if (notionClient) {
      timers.push(setInterval(() => void refreshNotion(), notionInterval * 1000));
    }
  });

  onCleanup(() => {
    for (const timer of timers) {
      clearInterval(timer);
    }
  });

  // -------------------------------------------------------------------------
  // Enrichment pipeline
  // -------------------------------------------------------------------------

  const enrichmentResult = createMemo(() =>
    enrichIssues(issues(), sessions(), prs(), specs(), worktrees()),
  );

  const issueListModel = createMemo(() => buildIssueListModel(enrichmentResult()));

  const selectedItem = createMemo(() => {
    const model = issueListModel();
    const flatItems = getFlatItems(model);
    const idx = selectedIndex();
    const current = flatItems[idx];
    if (!current) return undefined;
    if (current.kind === "issue") return current.issue;
    return current.item;
  });

  // Preserve selected issue across refreshes by matching on issue ID
  let lastSelectedIssueId: string | undefined;

  createEffect(() => {
    const model = issueListModel();
    const flatItems = getFlatItems(model);

    if (lastSelectedIssueId && flatItems.length > 0) {
      const newIndex = flatItems.findIndex(
        (item) => item.kind === "issue" && item.issue.issue.id === lastSelectedIssueId,
      );
      if (newIndex >= 0) {
        setSelectedIndex(newIndex);
      } else {
        // Selected issue disappeared -- move to nearest neighbor
        const current = selectedIndex();
        const clamped = Math.min(current, flatItems.length - 1);
        setSelectedIndex(Math.max(0, clamped));
        if (flatItems.length > 0) {
          toast("Selected issue moved or removed");
        }
      }
    }
  });

  // Track selected issue ID for preservation
  createEffect(() => {
    const model = issueListModel();
    const flatItems = getFlatItems(model);
    const idx = selectedIndex();
    const current = flatItems[idx];
    lastSelectedIssueId = current?.kind === "issue" ? current.issue.issue.id : undefined;
  });

  // Derived counts for status bar
  const attentionCount = createMemo(() => issueListModel().attention.length);
  const sessionCount = createMemo(() => sessions().length);
  const issueCount = createMemo(() => issues().length);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <DialogProvider>
      <AppInner
        config={config}
        theme={theme}
        syntaxStyle={syntaxStyle}
        pool={pool}
        focusedPane={focusedPane}
        setFocusedPane={setFocusedPane}
        selectedIndex={selectedIndex}
        setSelectedIndex={setSelectedIndex}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        handleTabSelect={handleTabSelect}
        handleTabCycle={handleTabCycle}
        issueListModel={issueListModel}
        selectedItem={selectedItem}
        issueCount={issueCount}
        sessionCount={sessionCount}
        attentionCount={attentionCount}
        sessions={sessions}
        handleNewSession={handleNewSession}
        handleApproveSession={handleApproveSession}
        handleRejectSession={handleRejectSession}
        handleApprovePR={handleApprovePR}
        handleOpenExternal={handleOpenExternal}
        handleRefreshPR={handleRefreshPR}
      />
      <Toaster position="bottom-right" />
    </DialogProvider>
  );
}

// ---------------------------------------------------------------------------
// Inner component (rendered inside DialogProvider for useDialog() access)
// ---------------------------------------------------------------------------

function AppInner(props: {
  config: SpecstarConfig;
  theme: ReturnType<typeof resolveTheme>;
  syntaxStyle: ReturnType<typeof createDefaultSyntaxStyle>;
  pool: SessionPoolWithHandles;
  focusedPane: ReturnType<typeof createSignal<"left" | "right">>[0];
  setFocusedPane: ReturnType<typeof createSignal<"left" | "right">>[1];
  selectedIndex: ReturnType<typeof createSignal<number>>[0];
  setSelectedIndex: ReturnType<typeof createSignal<number>>[1];
  activeTab: ReturnType<typeof createSignal<DetailTab>>[0];
  setActiveTab: ReturnType<typeof createSignal<DetailTab>>[1];
  handleTabSelect: (tab: 1 | 2 | 3) => void;
  handleTabCycle: (direction: "next" | "prev") => void;
  issueListModel: () => ReturnType<typeof buildIssueListModel>;
  selectedItem: () =>
    | ReturnType<typeof buildIssueListModel>["attention"][number]
    | import("./types.js").UnlinkedItem
    | undefined;
  issueCount: () => number;
  sessionCount: () => number;
  attentionCount: () => number;
  sessions: () => readonly WorkerSession[];
  handleNewSession: () => void;
  handleApproveSession: (id: SessionId) => void;
  handleRejectSession: (id: SessionId) => void;
  handleApprovePR: (prNumber: PrNumber) => void;
  handleOpenExternal: (url: string) => void;
  handleRefreshPR: () => void;
}) {
  // useDialog() is available here because AppInner renders inside DialogProvider
  const dialog = useDialog();

  function handleOpenSessionDetail(sessionId: SessionId) {
    const handle = props.pool.getHandle(sessionId);
    if (!handle) return;
    void showSessionDetail(dialog as any, {
      session: handle.toSession(),
      theme: props.theme,
      onPrompt: (text) => handle.sendPrompt(text),
      onApprove: () => {
        handle.sendApproval();
        props.pool.dismiss(sessionId, "approval_needed");
        toast.success("Approved");
      },
      onReject: () => {
        handle.sendRejection();
        props.pool.dismiss(sessionId, "approval_needed");
        toast("Rejected");
      },
      onAbort: () => {
        handle.sendAbort();
        toast.warning("Session aborted");
      },
    });
  }

  async function handleCommentPR(prNumber: PrNumber) {
    const body = await showPromptOverlay(dialog as any, {
      title: "Comment on PR",
      placeholder: "Enter your comment...",
      theme: props.theme,
    });
    if (body === undefined) return;
    if (!props.config.github) return;
    try {
      const client = await createGithubClient(props.config.github.repo);
      await client.comment(prNumber, body);
      toast.success("Comment posted");
    } catch (err: unknown) {
      toast.error(`Failed to post comment: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return (
    <Layout
      focusedPane={props.focusedPane}
      onFocusChange={props.setFocusedPane}
      onTabSelect={props.handleTabSelect}
      onTabCycle={props.handleTabCycle}
      theme={() => props.theme}
      leftPane={
        <IssueList
          model={props.issueListModel}
          selectedIndex={props.selectedIndex}
          onSelect={props.setSelectedIndex}
          theme={props.theme}
          focused={() => props.focusedPane() === "left"}
        />
      }
      rightPane={
        <IssueDetail
          item={props.selectedItem as any}
          activeTab={props.activeTab}
          onTabChange={props.setActiveTab}
          theme={props.theme}
          focused={() => props.focusedPane() === "right"}
          syntaxStyle={props.syntaxStyle}
          onApproveSession={props.handleApproveSession}
          onRejectSession={props.handleRejectSession}
          onNewSession={props.handleNewSession}
          onOpenSessionDetail={handleOpenSessionDetail}
          onApprovePR={props.handleApprovePR}
          onCommentPR={handleCommentPR}
          onOpenExternal={props.handleOpenExternal}
          onRefreshPR={props.handleRefreshPR}
        />
      }
      statusBar={
        <StatusBar
          issueCount={props.issueCount}
          sessionCount={props.sessionCount}
          attentionCount={props.attentionCount}
          focusedPane={props.focusedPane}
          theme={props.theme}
        />
      }
    />
  );
}
