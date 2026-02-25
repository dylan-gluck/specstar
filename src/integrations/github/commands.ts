import type { GithubPR, GithubClient, CreatePROptions } from "../../types.js";

/** A command palette action for GitHub PR operations. */
export interface GithubCommand {
  /** Unique identifier for the command. */
  readonly id: string;
  /** Display label shown in the command palette. */
  readonly label: string;
  /** Category for grouping in the palette. */
  readonly category: "PR";
  /** Short description shown below the label. */
  readonly description: string;
  /** Keyboard shortcut hint (display only, not bound here). */
  readonly shortcut?: string;
  /**
   * Whether this command is visible in the current context.
   * Returns true if the command should be shown.
   */
  readonly isVisible: (ctx: GithubCommandContext) => boolean;
  /**
   * Execute the command. Returns a promise that resolves when done.
   */
  readonly execute: (ctx: GithubCommandContext) => Promise<void>;
}

/** Context provided to GitHub commands for visibility checks and execution. */
export interface GithubCommandContext {
  /** The currently selected PR, if any. */
  readonly selectedPR: GithubPR | undefined;
  /** The GitHub client instance. May be undefined if GitHub is not configured. */
  readonly client: GithubClient | undefined;
  /** Callback to show a toast notification. */
  readonly toast: {
    success: (msg: string) => void;
    error: (msg: string) => void;
    warning: (msg: string) => void;
  };
  /** Callback to prompt user for text input. Returns undefined if cancelled. */
  readonly promptInput: (label: string) => Promise<string | undefined>;
  /** Callback to refresh PR data. */
  readonly refreshPRs: () => Promise<void>;
  /** Current branch name, used for Create PR. */
  readonly currentBranch: string | undefined;
}

const createPR: GithubCommand = {
  id: "github.create-pr",
  label: "Create Pull Request",
  category: "PR",
  description: "Create a new PR from the current branch",
  shortcut: "C",
  isVisible: (ctx) =>
    ctx.client !== undefined && ctx.selectedPR === undefined && ctx.currentBranch !== undefined,
  async execute(ctx) {
    try {
      const title = await ctx.promptInput("PR title");
      if (title === undefined) return;

      const body = await ctx.promptInput("PR body");
      if (body === undefined) return;

      const opts: CreatePROptions = {
        title,
        body,
        headBranch: ctx.currentBranch!,
      };

      await ctx.client!.createPR(opts);
      ctx.toast.success("Pull request created");
      await ctx.refreshPRs();
    } catch (err) {
      ctx.toast.error(`Failed to create PR: ${err instanceof Error ? err.message : String(err)}`);
    }
  },
};

const approvePR: GithubCommand = {
  id: "github.approve-pr",
  label: "Approve PR",
  category: "PR",
  description: "Approve the current pull request",
  shortcut: "A",
  isVisible: (ctx) =>
    ctx.client !== undefined && ctx.selectedPR !== undefined && ctx.selectedPR.state === "open",
  async execute(ctx) {
    try {
      await ctx.client!.approvePR(ctx.selectedPR!.number);
      ctx.toast.success("PR approved");
      await ctx.refreshPRs();
    } catch (err) {
      ctx.toast.error(`Failed to approve PR: ${err instanceof Error ? err.message : String(err)}`);
    }
  },
};

const commentOnPR: GithubCommand = {
  id: "github.comment-pr",
  label: "Comment on PR",
  category: "PR",
  description: "Post a comment on the current pull request",
  shortcut: "m",
  isVisible: (ctx) =>
    ctx.client !== undefined &&
    ctx.selectedPR !== undefined &&
    ctx.selectedPR.state !== "merged" &&
    ctx.selectedPR.state !== "closed",
  async execute(ctx) {
    try {
      const body = await ctx.promptInput("Comment");
      if (body === undefined) return;

      await ctx.client!.comment(ctx.selectedPR!.number, body);
      ctx.toast.success("Comment posted");
    } catch (err) {
      ctx.toast.error(
        `Failed to post comment: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  },
};

const openPRExternal: GithubCommand = {
  id: "github.open-pr-external",
  label: "Open PR in Browser",
  category: "PR",
  description: "Open the PR page in your default browser",
  shortcut: "o",
  isVisible: (ctx) => ctx.selectedPR !== undefined,
  async execute(ctx) {
    Bun.spawn(["open", ctx.selectedPR!.url]);
  },
};

const refreshPRs: GithubCommand = {
  id: "github.refresh-prs",
  label: "Refresh PRs",
  category: "PR",
  description: "Reload pull request data from GitHub",
  shortcut: "R",
  isVisible: (ctx) => ctx.client !== undefined,
  async execute(ctx) {
    try {
      await ctx.refreshPRs();
      ctx.toast.success("PRs refreshed");
    } catch (err) {
      ctx.toast.error(`Failed to refresh PRs: ${err instanceof Error ? err.message : String(err)}`);
    }
  },
};

/** Returns all GitHub PR command palette actions. */
export function getGithubCommands(): readonly GithubCommand[] {
  return [createPR, approvePR, commentOnPR, openPRExternal, refreshPRs];
}
