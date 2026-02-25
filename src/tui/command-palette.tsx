/**
 * Command palette overlay with fuzzy search and category grouping.
 *
 * Renders as a dialog overlay. Commands are filtered by visibility,
 * optionally fuzzy-matched against a search query, then grouped by
 * category in a fixed display order.
 *
 * @module tui/command-palette
 */

import { createSignal, createMemo, createEffect, For, Show } from "solid-js";
import { TextAttributes } from "@opentui/core";
import { useDialogKeyboard } from "@opentui-ui/dialog/solid";
import type { DialogId } from "@opentui-ui/dialog/solid";
import type { PaletteCommand, PaletteContext, PaletteCategory } from "./palette-types.js";
import { fuzzyMatch } from "./palette-types.js";
import type { ResolvedTheme } from "./theme.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_ORDER: PaletteCategory[] = ["Issue", "Session", "PR", "Spec", "Worktree", "Global"];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DialogHandle {
  prompt<T>(options: {
    content: (ctx: {
      resolve: (value: T) => void;
      dismiss: () => void;
      dialogId: DialogId;
    }) => () => import("solid-js").JSX.Element;
    size?: string;
  }): Promise<T | undefined>;
}

export interface CommandPaletteProps {
  readonly commands: readonly PaletteCommand[];
  readonly context: PaletteContext;
  readonly theme: ResolvedTheme;
  readonly dialogId: DialogId;
  readonly onExecute: (command: PaletteCommand) => Promise<void>;
  readonly onDismiss: () => void;
}

// ---------------------------------------------------------------------------
// showCommandPalette — async wrapper
// ---------------------------------------------------------------------------

/**
 * Open the command palette as a dialog overlay.
 *
 * Resolves when the user either executes a command or dismisses the palette.
 */
export async function showCommandPalette(
  dialog: DialogHandle,
  options: {
    commands: readonly PaletteCommand[];
    context: PaletteContext;
    theme: ResolvedTheme;
  },
): Promise<void> {
  await dialog.prompt<void>({
    content: (ctx) => {
      return () => (
        <CommandPalette
          commands={options.commands}
          context={options.context}
          theme={options.theme}
          dialogId={ctx.dialogId}
          onExecute={async (cmd) => {
            ctx.dismiss();
            await cmd.execute(options.context);
          }}
          onDismiss={() => {
            ctx.dismiss();
          }}
        />
      );
    },
    size: "large",
  });
}

// ---------------------------------------------------------------------------
// CommandPalette component
// ---------------------------------------------------------------------------

/**
 * Palette UI: search input, category-grouped command list, keyboard navigation.
 */
export function CommandPalette(props: CommandPaletteProps) {
  const t = props.theme;
  const [query, setQuery] = createSignal("");
  const [selectedIndex, setSelectedIndex] = createSignal(0);

  // -- Derived: visible commands, filtered and sorted -----------------------

  const visibleCommands = createMemo(() => {
    const q = query();
    let cmds = props.commands.filter((c) => c.isVisible(props.context));
    if (q.length > 0) {
      const scored = cmds
        .map((c) => {
          const labelScore = fuzzyMatch(q, c.label);
          const descScore = fuzzyMatch(q, c.description);
          const bestScore =
            labelScore >= 0 && descScore >= 0
              ? Math.min(labelScore, descScore)
              : labelScore >= 0
                ? labelScore
                : descScore;
          return { cmd: c, score: bestScore };
        })
        .filter((x) => x.score >= 0)
        .sort((a, b) => a.score - b.score);
      cmds = scored.map((x) => x.cmd);
    }
    return cmds;
  });

  // -- Derived: grouped by category -----------------------------------------

  const groupedCommands = createMemo(() => {
    const cmds = visibleCommands();
    const groups: Array<{ category: PaletteCategory; commands: PaletteCommand[] }> = [];
    for (const cat of CATEGORY_ORDER) {
      const catCmds = cmds.filter((c) => c.category === cat);
      if (catCmds.length > 0) {
        groups.push({ category: cat, commands: catCmds });
      }
    }
    return groups;
  });

  // -- Flat list alias for keyboard navigation ------------------------------

  const flatList = createMemo(() => visibleCommands());

  // -- Clamp selection when filter results shrink ---------------------------

  createEffect(() => {
    const len = flatList().length;
    if (len === 0) {
      setSelectedIndex(0);
    } else if (selectedIndex() >= len) {
      setSelectedIndex(len - 1);
    }
  });

  // -- Keyboard handling ----------------------------------------------------

  useDialogKeyboard((key) => {
    const len = flatList().length;

    if (key.name === "escape") {
      props.onDismiss();
      return;
    }

    if (len === 0) return;

    if (key.name === "down") {
      setSelectedIndex((i) => (i + 1) % len);
      return;
    }
    if (key.name === "up") {
      setSelectedIndex((i) => (i - 1 + len) % len);
      return;
    }
    if (key.name === "return" || key.name === "enter") {
      const cmd = flatList()[selectedIndex()];
      if (cmd) {
        void props.onExecute(cmd);
      }
      return;
    }
  }, props.dialogId);

  // -- Render ---------------------------------------------------------------

  return (
    <box flexDirection="column" padding={1}>
      {/* Search input */}
      <box borderStyle="single" borderColor={t.accent} padding={0}>
        <input
          value={query()}
          onInput={setQuery}
          placeholder="Search commands..."
          focused
          textColor={t.foreground}
          placeholderColor={t.muted}
          backgroundColor={t.background}
        />
      </box>

      {/* Results */}
      <scrollbox flexGrow={1} marginTop={1} maxHeight={20}>
        <Show
          when={flatList().length > 0}
          fallback={
            <text fg={t.muted}>
              {query().length > 0 ? "No matching commands" : "No commands available"}
            </text>
          }
        >
          <box flexDirection="column">
            <For each={groupedCommands()}>
              {(group) => {
                return (
                  <box flexDirection="column" marginBottom={1}>
                    {/* Category header */}
                    <text fg={t.foregroundBright} attributes={TextAttributes.BOLD}>
                      {group.category}
                    </text>

                    {/* Commands in this category */}
                    <For each={group.commands}>
                      {(cmd) => {
                        const globalIdx = () => flatList().indexOf(cmd);
                        const isSelected = () => globalIdx() === selectedIndex();

                        return (
                          <box
                            flexDirection="column"
                            backgroundColor={isSelected() ? t.backgroundAlt : undefined}
                            paddingLeft={1}
                            paddingRight={1}
                          >
                            <box flexDirection="row" justifyContent="space-between">
                              <text
                                fg={isSelected() ? t.foregroundBright : t.foreground}
                                attributes={isSelected() ? TextAttributes.BOLD : undefined}
                              >
                                {cmd.label}
                              </text>
                              <Show when={cmd.shortcut}>
                                <text fg={t.muted} attributes={TextAttributes.DIM}>
                                  {cmd.shortcut}
                                </text>
                              </Show>
                            </box>
                            <text fg={t.muted} attributes={TextAttributes.DIM} paddingLeft={1}>
                              {cmd.description}
                            </text>
                          </box>
                        );
                      }}
                    </For>
                  </box>
                );
              }}
            </For>
          </box>
        </Show>
      </scrollbox>

      {/* Footer hint */}
      <text fg={t.muted} marginTop={1}>
        {"Up/Down to move, Enter to select, Esc to close"}
      </text>
    </box>
  );
}
