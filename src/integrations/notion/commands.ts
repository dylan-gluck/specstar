import type { PaletteCommand, PaletteContext } from "../../tui/palette-types.js";

const draftSpec: PaletteCommand = {
  id: "notion.draft-spec",
  label: "Draft Spec",
  category: "Spec",
  description: "Start the draft-spec workflow for the selected issue",
  isVisible: (ctx) => ctx.selectedIssue !== undefined && ctx.selectedIssue.spec === undefined,
  async execute(ctx: PaletteContext) {
    try {
      if (ctx.startWorkflow) {
        await ctx.startWorkflow("draft-spec");
      } else {
        ctx.toast.info("Workflow engine not available. Cannot start draft-spec workflow.");
      }
    } catch (err) {
      ctx.toast.error(`Failed to draft spec: ${err instanceof Error ? err.message : String(err)}`);
    }
  },
};

const refreshSpecs: PaletteCommand = {
  id: "notion.refresh-specs",
  label: "Refresh Specs",
  category: "Spec",
  description: "Reload spec data from Notion",
  isVisible: () => true,
  async execute(ctx: PaletteContext) {
    try {
      await ctx.refreshNotion();
      ctx.toast.success("Specs refreshed");
    } catch (err) {
      ctx.toast.error(
        `Failed to refresh specs: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  },
};

const openSpec: PaletteCommand = {
  id: "notion.open-spec",
  label: "Open Spec in Browser",
  category: "Spec",
  description: "Open the linked Notion spec in your default browser",
  isVisible: (ctx) => ctx.selectedIssue !== undefined && ctx.selectedIssue.spec !== undefined,
  async execute(ctx: PaletteContext) {
    try {
      const spec = ctx.selectedIssue?.spec;
      if (!spec) return;
      Bun.spawn(["open", spec.url]);
    } catch (err) {
      ctx.toast.error(`Failed to open spec: ${err instanceof Error ? err.message : String(err)}`);
    }
  },
};

/** Returns all Notion spec command palette actions. */
export function getNotionCommands(): readonly PaletteCommand[] {
  return [draftSpec, refreshSpecs, openSpec];
}
