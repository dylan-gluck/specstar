/**
 * Root application component.
 *
 * Provides DialogProvider, Toaster, Solid signal providers for integration data,
 * and polling scaffolding with configurable intervals.
 *
 * @module app
 */

import { createSignal, createEffect, onCleanup } from "solid-js";
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
  const _theme = resolveTheme(config.theme);

  // -------------------------------------------------------------------------
  // Integration data signals
  // -------------------------------------------------------------------------

  const [issues, setIssues] = createSignal<readonly LinearIssue[]>([]);
  const [prs, setPrs] = createSignal<readonly GithubPR[]>([]);
  const [specs, setSpecs] = createSignal<readonly NotionSpec[]>([]);
  const [worktrees, setWorktrees] = createSignal<readonly Worktree[]>([]);
  const [_sessions, _setSessions] = createSignal<readonly WorkerSession[]>([]);

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
  // Render
  // -------------------------------------------------------------------------

  return (
    <DialogProvider>
      <box flexDirection="column" width="100%" height="100%">
        <box flexGrow={1}>
          <text>
            Specstar v0.1.0 — {issues().length} issues, {prs().length} PRs, {specs().length} specs,{" "}
            {worktrees().length} worktrees
          </text>
        </box>
        <Toaster position="bottom-right" />
      </box>
    </DialogProvider>
  );
}
