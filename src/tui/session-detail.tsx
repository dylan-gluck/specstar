/**
 * Full-screen dialog overlay for detailed session inspection.
 *
 * Shows session header, conversation placeholder, approval banner,
 * and prompt input area with scoped keyboard handling.
 *
 * @module tui/session-detail
 */

import { Show } from "solid-js";
import { TextAttributes } from "@opentui/core";
import { useDialogKeyboard } from "@opentui-ui/dialog/solid";
import type { DialogId } from "@opentui-ui/dialog/solid";
import { toast } from "@opentui-ui/toast/solid";
import type { WorkerSession, WorkerStatus } from "../types.js";
import type { ResolvedTheme } from "./theme.js";
import { showPromptOverlay } from "./input-overlay.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SessionDetailProps {
  readonly session: WorkerSession;
  readonly theme: ResolvedTheme;
  readonly dialogId: DialogId;
  readonly onPrompt: (text: string) => void;
  readonly onApprove: () => void;
  readonly onReject: () => void;
  readonly onAbort: () => void;
  readonly onClose: () => void;
  /** Fires when the user presses `p` to request prompt input. */
  readonly onRequestPrompt?: () => void;
}

/**
 * Subset of `useDialog()` return required by {@link showSessionDetail}.
 *
 * `show` renders the detail overlay; `prompt` is passed through to
 * {@link showPromptOverlay} for the nested prompt input.
 */
interface DialogHandle {
  show(options: {
    content: (ctx: {
      dismiss: () => void;
      dialogId: DialogId;
    }) => () => import("solid-js").JSX.Element;
    size?: string;
  }): void;
  prompt<T>(options: {
    content: (ctx: {
      resolve: (value: T) => void;
      dismiss: () => void;
      dialogId: DialogId;
    }) => () => import("solid-js").JSX.Element;
    size?: string;
  }): Promise<T | undefined>;
  choice<K>(options: {
    content: (ctx: {
      resolve: (key: K) => void;
      dismiss: () => void;
      dialogId: DialogId;
    }) => () => import("solid-js").JSX.Element;
    size?: string;
  }): Promise<K | undefined>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusColor(status: WorkerStatus, theme: ResolvedTheme): string {
  switch (status) {
    case "working":
      return theme.accent;
    case "approval":
      return theme.warning;
    case "error":
      return theme.error;
    case "idle":
    case "starting":
    case "shutdown":
      return theme.muted;
  }
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// SessionDetail component
// ---------------------------------------------------------------------------

export function SessionDetail(props: SessionDetailProps) {
  const t = props.theme;
  const s = props.session;

  useDialogKeyboard((key) => {
    if (key.name === "escape") {
      props.onClose();
      return;
    }

    if (key.name === "a" && s.status === "approval") {
      props.onApprove();
      return;
    }

    if (key.name === "x" && s.status === "approval") {
      props.onReject();
      return;
    }

    if (key.name === "p" && s.status !== "shutdown") {
      props.onRequestPrompt?.();
      return;
    }

    if ((key.ctrl && key.name === "c") || key.name === "q") {
      if (s.status === "working") {
        toast.warning("Aborting session...");
        props.onAbort();
      } else {
        props.onClose();
      }
    }
  }, props.dialogId);

  return (
    <box flexDirection="column" width="100%" height="100%">
      {/* Header */}
      <box flexDirection="row" paddingX={1} gap={2}>
        <text fg={t.foregroundBright} attributes={TextAttributes.BOLD}>
          {s.name}
        </text>
        <text fg={statusColor(s.status, t)}>{s.status}</text>
        <text fg={t.muted}>{`${s.tokenCount} tokens`}</text>
        <text fg={t.muted}>{`started ${formatTime(s.startedAt)}`}</text>
      </box>

      {/* Conversation history placeholder */}
      <box flexGrow={1} flexDirection="column" paddingX={1} paddingY={1}>
        <Show when={s.status !== "shutdown"} fallback={<text fg={t.muted}>Session ended.</text>}>
          <text fg={t.muted}>Session output will appear here when streaming is implemented.</text>
        </Show>

        <Show when={s.status === "error"}>
          <text fg={t.error}>Session encountered an error.</text>
        </Show>
      </box>

      {/* Approval banner */}
      <Show when={s.status === "approval"}>
        <box paddingX={1} width="100%" backgroundColor={t.warning}>
          <text fg={t.background} attributes={TextAttributes.BOLD}>
            Tool approval needed. Press a to approve, x to reject.
          </text>
        </box>
      </Show>

      {/* Footer / prompt area */}
      <box paddingX={1} width="100%">
        <Show
          when={s.status !== "shutdown"}
          fallback={<text fg={t.muted}>Press Esc to close</text>}
        >
          <text fg={t.muted}>Press p to send a prompt, Esc to close</text>
        </Show>
      </box>
    </box>
  );
}

// ---------------------------------------------------------------------------
// Convenience launcher
// ---------------------------------------------------------------------------

/**
 * Show a full-screen session detail overlay via the dialog system.
 *
 * Resolves when the user closes the overlay. Prompt input is collected
 * through a nested {@link showPromptOverlay} dialog.
 */
export async function showSessionDetail(
  dialog: DialogHandle,
  options: {
    session: WorkerSession;
    theme: ResolvedTheme;
    onPrompt: (text: string) => void;
    onApprove: () => void;
    onReject: () => void;
    onAbort: () => void;
  },
): Promise<void> {
  return new Promise<void>((resolve) => {
    dialog.show({
      content: (ctx) => {
        const requestPrompt = async () => {
          const text = await showPromptOverlay(dialog, {
            title: "Send prompt",
            placeholder: "Enter your prompt...",
            theme: options.theme,
          });
          if (text != null && text.length > 0) {
            options.onPrompt(text);
          }
        };

        return () => (
          <SessionDetail
            session={options.session}
            theme={options.theme}
            dialogId={ctx.dialogId}
            onPrompt={options.onPrompt}
            onApprove={options.onApprove}
            onReject={options.onReject}
            onAbort={options.onAbort}
            onRequestPrompt={requestPrompt}
            onClose={() => {
              ctx.dismiss();
              resolve();
            }}
          />
        );
      },
      size: "full",
    });
  });
}
