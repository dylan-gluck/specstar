import type { PaletteCommand, PaletteContext } from "../../tui/palette-types.js";
import type {
  LinearClient,
  LinearIssueId,
} from "../../../specs/001-issue-centric-tui/contracts/linear.js";
const captureIssue: PaletteCommand = {
  id: "linear.capture-issue",
  label: "Capture Issue",
  category: "Issue",
  description: "Create a new Linear issue from a quick title and description",
  isVisible: () => true,
  async execute(ctx: PaletteContext) {
    try {
      const title = await ctx.promptInput("Issue title");
      if (title === undefined) return;

      const description = await ctx.promptInput("Issue description");
      if (description === undefined) return;

      ctx.toast.info(
        "Issue capture requires the 'capture-issue' workflow. Use the workflow palette to run it.",
      );
    } catch (err) {
      ctx.toast.error(
        `Failed to capture issue: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  },
};

const refineTicket: PaletteCommand = {
  id: "linear.refine-ticket",
  label: "Refine Ticket",
  category: "Issue",
  description: "Run the refine-issue workflow on the selected issue",
  isVisible: (ctx) => ctx.selectedIssue !== undefined,
  async execute(ctx: PaletteContext) {
    try {
      if (ctx.startWorkflow) {
        await ctx.startWorkflow("refine-issue");
      } else {
        ctx.toast.info("Workflow engine not available. Cannot start refine-issue workflow.");
      }
    } catch (err) {
      ctx.toast.error(
        `Failed to refine ticket: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  },
};

/** Returns all Linear issue command palette actions. */
export function getLinearCommands(client?: LinearClient): readonly PaletteCommand[] {
  const updateState: PaletteCommand = {
    id: "linear.update-state",
    label: "Update Issue State",
    category: "Issue",
    description: "Change the state of the selected Linear issue",
    isVisible: (ctx) => ctx.selectedIssue !== undefined,
    async execute(ctx: PaletteContext) {
      if (!client) {
        ctx.toast.info("Linear client not configured");
        return;
      }
      const issue = ctx.selectedIssue;
      if (!issue) return;
      try {
        const stateName = await ctx.promptInput(
          "New state name",
          "e.g. In Progress, Done, Cancelled",
        );
        if (stateName === undefined) return;
        await client.updateIssue(issue.issue.id as LinearIssueId, { stateId: stateName });
        ctx.toast.success(`Issue state updated to "${stateName}"`);
        await ctx.refreshLinear();
      } catch (err) {
        ctx.toast.error(
          `Failed to update state: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
  };

  const addComment: PaletteCommand = {
    id: "linear.add-comment",
    label: "Add Comment",
    category: "Issue",
    description: "Post a comment on the selected Linear issue",
    isVisible: (ctx) => ctx.selectedIssue !== undefined,
    async execute(ctx: PaletteContext) {
      if (!client) {
        ctx.toast.info("Linear client not configured");
        return;
      }
      const issue = ctx.selectedIssue;
      if (!issue) return;
      try {
        const body = await ctx.promptInput("Comment body");
        if (body === undefined) return;
        await client.addComment(issue.issue.id as LinearIssueId, body);
        ctx.toast.success("Comment added to issue");
        await ctx.refreshLinear();
      } catch (err) {
        ctx.toast.error(
          `Failed to add comment: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
  };

  return [captureIssue, refineTicket, updateState, addComment];
}
