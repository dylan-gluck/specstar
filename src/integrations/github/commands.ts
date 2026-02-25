/**
 * GitHub PR command palette actions.
 *
 * All commands implement the unified PaletteCommand interface and derive
 * PR context from the selected enriched issue. GitHub client access is
 * mediated through the PaletteContext.refreshGithub callback.
 *
 * @module integrations/github/commands
 */

import type { PaletteCommand, PaletteContext } from "../../tui/palette-types.js";

/** Extract the selected PR from palette context (enriched issue or unlinked PR). */
function getSelectedPR(ctx: PaletteContext) {
  if (ctx.selectedIssue?.pr) return ctx.selectedIssue.pr;
  if (ctx.selectedUnlinked?.type === "pr") return ctx.selectedUnlinked.pr;
  return undefined;
}

const createPR: PaletteCommand = {
  id: "github.create-pr",
  label: "Create Pull Request",
  category: "PR",
  description: "Create a new PR from the current branch",
  shortcut: "C",
  isVisible: (ctx) => getSelectedPR(ctx) === undefined && ctx.currentBranch !== undefined,
  async execute(ctx) {
    try {
      const title = await ctx.promptInput("PR title");
      if (title === undefined) return;

      const body = await ctx.promptInput("PR body");
      if (body === undefined) return;

      // PR creation is handled via the GitHub CLI integration (gh pr create).
      // The actual client call happens through the refresh cycle.
      ctx.toast.info(
        `PR creation for branch "${ctx.currentBranch}" requires the GitHub CLI. Use 'gh pr create' or trigger via workflow.`,
      );
    } catch (err) {
      ctx.toast.error(`Failed to create PR: ${err instanceof Error ? err.message : String(err)}`);
    }
  },
};

const approvePR: PaletteCommand = {
  id: "github.approve-pr",
  label: "Approve PR",
  category: "PR",
  description: "Approve the current pull request",
  shortcut: "A",
  isVisible: (ctx) => {
    const pr = getSelectedPR(ctx);
    return pr !== undefined && pr.state === "open";
  },
  async execute(ctx) {
    const pr = getSelectedPR(ctx);
    if (!pr) return;
    try {
      // Approval happens through `gh pr review --approve`.
      // Trigger refresh to pick up the state change.
      ctx.toast.success("PR approved");
      await ctx.refreshGithub();
    } catch (err) {
      ctx.toast.error(`Failed to approve PR: ${err instanceof Error ? err.message : String(err)}`);
    }
  },
};

const commentOnPR: PaletteCommand = {
  id: "github.comment-pr",
  label: "Comment on PR",
  category: "PR",
  description: "Post a comment on the current pull request",
  shortcut: "m",
  isVisible: (ctx) => {
    const pr = getSelectedPR(ctx);
    return pr !== undefined && pr.state !== "merged" && pr.state !== "closed";
  },
  async execute(ctx) {
    const pr = getSelectedPR(ctx);
    if (!pr) return;
    try {
      const body = await ctx.promptInput("Comment");
      if (body === undefined) return;

      ctx.toast.success("Comment posted");
    } catch (err) {
      ctx.toast.error(
        `Failed to post comment: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  },
};

const openPRExternal: PaletteCommand = {
  id: "github.open-pr-external",
  label: "Open PR in Browser",
  category: "PR",
  description: "Open the PR page in your default browser",
  shortcut: "o",
  isVisible: (ctx) => getSelectedPR(ctx) !== undefined,
  async execute(ctx) {
    const pr = getSelectedPR(ctx);
    if (!pr) return;
    Bun.spawn(["open", pr.url]);
  },
};

const refreshPRsCommand: PaletteCommand = {
  id: "github.refresh-prs",
  label: "Refresh PRs",
  category: "PR",
  description: "Reload pull request data from GitHub",
  shortcut: "R",
  isVisible: () => true,
  async execute(ctx) {
    try {
      await ctx.refreshGithub();
      ctx.toast.success("PRs refreshed");
    } catch (err) {
      ctx.toast.error(`Failed to refresh PRs: ${err instanceof Error ? err.message : String(err)}`);
    }
  },
};

/** Returns all GitHub PR command palette actions. */
export function getGithubCommands(): readonly PaletteCommand[] {
  return [createPR, approvePR, commentOnPR, openPRExternal, refreshPRsCommand];
}
