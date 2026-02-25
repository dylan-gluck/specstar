/**
 * Root application component.
 *
 * Provides DialogProvider, Toaster, Solid signal providers for integration data,
 * and polling scaffolding with configurable intervals.
 *
 * @module app
 */

import { createSignal, createEffect, createMemo, onCleanup } from "solid-js";
import { DialogProvider } from "@opentui-ui/dialog/solid";
import { Toaster, toast } from "@opentui-ui/toast/solid";
import { Database } from "bun:sqlite";

import type { SpecstarConfig, LinearIssue, GithubPR, NotionSpec, WorkerSession } from "./types.js";
import type { Worktree } from "../specs/001-issue-centric-tui/contracts/github.js";

import { createLinearClient } from "./integrations/linear/client.js";
import { createGithubClient } from "./integrations/github/client.js";
import { createWorktreeManager } from "./integrations/github/worktree.js";
import { createNotionClient } from "./integrations/notion/client.js";
import { createCache } from "./db.js";
import { resolveTheme } from "./tui/theme.js";
import { enrichIssues, buildIssueListModel } from "./enrichment.js";
import { Layout } from "./tui/layout.js";
import { IssueList, getFlatItems } from "./tui/issue-list.js";
import { StatusBar } from "./tui/status-bar.js";

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
  const [sessions, _setSessions] = createSignal<readonly WorkerSession[]>([]);

  // UI state signals
  const [focusedPane, setFocusedPane] = createSignal<"left" | "right">("left");
  const [selectedIndex, setSelectedIndex] = createSignal(0);

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
      <Layout
        focusedPane={focusedPane}
        onFocusChange={setFocusedPane}
        theme={() => theme}
        leftPane={
          <IssueList
            model={issueListModel}
            selectedIndex={selectedIndex}
            onSelect={setSelectedIndex}
            theme={theme}
            focused={() => focusedPane() === "left"}
          />
        }
        rightPane={
          <box flexGrow={1}>
            <text fg={theme.muted}>{"Select an issue to view details"}</text>
          </box>
        }
        statusBar={
          <StatusBar
            issueCount={issueCount}
            sessionCount={sessionCount}
            attentionCount={attentionCount}
            focusedPane={focusedPane}
            theme={theme}
          />
        }
      />
      <Toaster position="bottom-right" />
    </DialogProvider>
  );
}
