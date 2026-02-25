/**
 * GitHub PR command palette actions.
 *
 * All commands implement the unified PaletteCommand interface and derive
 * PR context from the selected enriched issue. GitHub client access is
 * mediated through an optional clientPromise closure parameter.
 *
 * @module integrations/github/commands
 */

import type { GithubClient } from "../../../specs/001-issue-centric-tui/contracts/github.js";
import type { PaletteCommand, PaletteContext } from "../../tui/palette-types.js";

/** Extract the selected PR from palette context (enriched issue or unlinked PR). */
function getSelectedPR(ctx: PaletteContext) {
  if (ctx.selectedIssue?.pr) return ctx.selectedIssue.pr;
  if (ctx.selectedUnlinked?.type === "pr") return ctx.selectedUnlinked.pr;
  return undefined;
}

/** Returns all GitHub PR command palette actions. */
export function getGithubCommands(
  clientPromise?: Promise<GithubClient>,
): readonly PaletteCommand[] {
  const createPR: PaletteCommand = {
    id: "github.create-pr",
    label: "Create Pull Request",
    category: "PR",
    description: "Create a new PR from the current branch",
    shortcut: "C",
    isVisible: (ctx) => getSelectedPR(ctx) === undefined && ctx.currentBranch !== undefined,
    async execute(ctx) {
      const title = await ctx.promptInput("PR title");
      if (title === undefined) return;

      const body = await ctx.promptInput("PR body");
      if (body === undefined) return;

      if (!clientPromise) {
        ctx.toast.info("GitHub client not configured. Use 'gh pr create' from the CLI.");
        return;
      }
      try {
        const client = await clientPromise;
        await client.createPR({ title, body, headBranch: ctx.currentBranch ?? "" });
        ctx.toast.success("PR created");
        await ctx.refreshGithub();
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
      if (!clientPromise) {
        ctx.toast.info("GitHub client not configured");
        return;
      }
      try {
        const client = await clientPromise;
        await client.approvePR(pr.number);
        ctx.toast.success("PR approved");
        await ctx.refreshGithub();
      } catch (err) {
        ctx.toast.error(
          `Failed to approve PR: ${err instanceof Error ? err.message : String(err)}`,
        );
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
      if (!clientPromise) {
        ctx.toast.info("GitHub client not configured");
        return;
      }
      try {
        const body = await ctx.promptInput("Comment");
        if (body === undefined) return;
        const client = await clientPromise;
        await client.comment(pr.number, body);
        ctx.toast.success("Comment posted");
        await ctx.refreshGithub();
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
        ctx.toast.error(
          `Failed to refresh PRs: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
  };

  return [createPR, approvePR, commentOnPR, openPRExternal, refreshPRsCommand];
}
