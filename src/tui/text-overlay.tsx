/**
 * Scrollable text overlay for full-screen viewing of long content.
 *
 * Displays a title, optional status badge, and scrollable markdown or
 * plain text content in a full-screen dialog.
 *
 * @module tui/text-overlay
 */

import { Show } from "solid-js";
import { TextAttributes } from "@opentui/core";
import { useDialogKeyboard } from "@opentui-ui/dialog/solid";
import type { DialogId } from "@opentui-ui/dialog/solid";
import type { ResolvedTheme, SyntaxStyle } from "./theme.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TextOverlayProps {
  readonly title: string;
  readonly content: string;
  readonly theme: ResolvedTheme;
  readonly syntaxStyle: SyntaxStyle;
  readonly dialogId: DialogId;
  readonly onClose: () => void;
  /** Optional status text shown next to title. */
  readonly status?: string;
  /** Color for the status text. */
  readonly statusColor?: string;
  /** If true, render content as markdown. Default: true. */
  readonly markdown?: boolean;
}

// ---------------------------------------------------------------------------
// Dialog handle (subset of useDialog() return)
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

// ---------------------------------------------------------------------------
// TextOverlay component
// ---------------------------------------------------------------------------

/**
 * Full-screen scrollable text viewer with scoped keyboard handling.
 *
 * Escape or `q` closes the overlay.
 */
export function TextOverlay(props: TextOverlayProps) {
  const t = props.theme;
  const markdown = () => props.markdown !== false;

  useDialogKeyboard((key) => {
    if (key.name === "escape") {
      props.onClose();
      return;
    }
    if (key.name === "q") {
      props.onClose();
      return;
    }
  }, props.dialogId);

  return (
    <box flexDirection="column" width="100%" height="100%">
      {/* Header */}
      <box flexDirection="row" paddingX={1} gap={2}>
        <text fg={t.foregroundBright} attributes={TextAttributes.BOLD}>
          {props.title}
        </text>
        <Show when={props.status}>
          <text fg={props.statusColor ?? t.muted}>{props.status}</text>
        </Show>
      </box>

      {/* Content */}
      <scrollbox flexGrow={1} paddingX={1} paddingY={1}>
        <Show when={markdown()} fallback={<text fg={t.foreground}>{props.content}</text>}>
          <markdown content={props.content} syntaxStyle={props.syntaxStyle} />
        </Show>
      </scrollbox>

      {/* Footer */}
      <box paddingX={1}>
        <text fg={t.muted}>Press Esc to close</text>
      </box>
    </box>
  );
}

// ---------------------------------------------------------------------------
// Convenience launcher
// ---------------------------------------------------------------------------

/**
 * Show a full-screen scrollable text overlay via the dialog system.
 *
 * Resolves when the user closes the overlay.
 */
export async function showTextOverlay(
  dialog: DialogHandle,
  options: {
    title: string;
    content: string;
    theme: ResolvedTheme;
    syntaxStyle: SyntaxStyle;
    status?: string;
    statusColor?: string;
    markdown?: boolean;
  },
): Promise<void> {
  await dialog.prompt<void>({
    content: (ctx) => {
      return () => (
        <TextOverlay
          title={options.title}
          content={options.content}
          theme={options.theme}
          syntaxStyle={options.syntaxStyle}
          dialogId={ctx.dialogId}
          onClose={() => ctx.dismiss()}
          status={options.status}
          statusColor={options.statusColor}
          markdown={options.markdown}
        />
      );
    },
    size: "full",
  });
}
