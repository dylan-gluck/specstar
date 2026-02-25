import type { PaletteCommand, PaletteContext } from "../tui/palette-types.js";

export function getSessionCommands(): readonly PaletteCommand[] {
  return [
    {
      id: "session.new",
      label: "New Session",
      category: "Session",
      description: "Spawn a new worker session",
      execute: async (ctx: PaletteContext) => {
        const name = await ctx.promptInput("Session name", `Session ${ctx.sessions.length + 1}`);
        if (!name) return;
        try {
          await ctx.pool.spawn({
            cwd: ".",
            name,
            model: undefined,
            thinkingLevel: undefined,
          });
          ctx.toast.success(`Session "${name}" started`);
        } catch (err) {
          ctx.toast.error(
            `Failed to spawn session: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      },
      isVisible: () => true,
    },
    {
      id: "session.abort",
      label: "Abort Session",
      category: "Session",
      description: "Abort the active session linked to the selected issue",
      execute: async (ctx: PaletteContext) => {
        const activeStatuses = new Set(["working", "idle", "approval"]);
        const linked =
          ctx.selectedIssue?.sessions?.filter((s) => activeStatuses.has(s.status)) ?? [];

        if (linked.length === 0) {
          ctx.toast.warning("No active session to abort");
          return;
        }

        const target = linked[0]!;
        const handle = ctx.pool.getHandle(target.id);
        if (!handle) {
          ctx.toast.warning("No active session to abort");
          return;
        }

        try {
          handle.sendAbort();
          ctx.toast.success(`Aborted session "${target.name}"`);
        } catch (err) {
          ctx.toast.error(
            `Failed to abort session: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      },
      isVisible: (ctx: PaletteContext) =>
        ctx.sessions.some(
          (s) => s.status === "working" || s.status === "idle" || s.status === "approval",
        ),
    },
    {
      id: "session.approve-all",
      label: "Approve All Pending",
      category: "Session",
      description: "Approve all sessions awaiting approval",
      execute: async (ctx: PaletteContext) => {
        const pending = ctx.sessions.filter((s) => s.status === "approval");
        let approved = 0;

        for (const session of pending) {
          const handle = ctx.pool.getHandle(session.id);
          if (!handle) continue;
          try {
            handle.sendApproval();
            ctx.pool.dismiss(session.id, "approval_needed");
            approved++;
          } catch {
            // skip individual failures, count only successes
          }
        }

        ctx.toast.success(`Approved ${approved} session${approved === 1 ? "" : "s"}`);
      },
      isVisible: (ctx: PaletteContext) => ctx.sessions.some((s) => s.status === "approval"),
    },
    {
      id: "session.shutdown-all",
      label: "Shutdown All",
      category: "Session",
      description: "Shut down all active sessions",
      execute: async (ctx: PaletteContext) => {
        try {
          await ctx.pool.shutdownAll();
          ctx.toast.success("All sessions shut down");
        } catch (err) {
          ctx.toast.error(`Shutdown failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      },
      isVisible: (ctx: PaletteContext) => ctx.sessions.length > 0,
    },
  ] as const;
}
