/**
 * Input overlay components for text prompts and choice selection.
 *
 * Provides both raw Solid components (InputOverlay, ChoiceOverlay) and
 * async convenience wrappers (showPromptOverlay, showChoiceOverlay) that
 * use the dialog system from @opentui-ui/dialog.
 *
 * @module tui/input-overlay
 */

import { createSignal, For, Show, type Accessor } from "solid-js";
import { TextAttributes } from "@opentui/core";
import { useDialogKeyboard } from "@opentui-ui/dialog/solid";
import type { DialogId } from "@opentui-ui/dialog/solid";
import type { ResolvedTheme } from "./theme.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InputOverlayProps {
  readonly title: string;
  readonly placeholder?: string;
  readonly value: Accessor<string>;
  readonly onInput: (value: string) => void;
  readonly onSubmit: (value: string) => void;
  readonly onCancel: () => void;
  readonly theme: ResolvedTheme;
  readonly dialogId: DialogId;
}

export interface ChoiceOverlayProps {
  readonly title: string;
  readonly choices: ReadonlyArray<{ readonly key: string; readonly label: string }>;
  readonly onSelect: (key: string) => void;
  readonly onCancel: () => void;
  readonly theme: ResolvedTheme;
  readonly dialogId: DialogId;
}

interface PromptOverlayOptions {
  readonly title: string;
  readonly placeholder?: string;
  readonly defaultValue?: string;
}

interface ChoiceOverlayOptions {
  readonly title: string;
  readonly choices: ReadonlyArray<{ readonly key: string; readonly label: string }>;
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
// Async convenience wrappers
// ---------------------------------------------------------------------------

/**
 * Show a text input prompt via the dialog system.
 *
 * Returns the entered string, or `undefined` if the user cancelled.
 */
export async function showPromptOverlay(
  dialog: DialogHandle,
  options: PromptOverlayOptions & { readonly theme: ResolvedTheme },
): Promise<string | undefined> {
  return dialog.prompt<string>({
    content: (ctx) => {
      const [value, setValue] = createSignal(options.defaultValue ?? "");
      return () => (
        <InputOverlay
          title={options.title}
          placeholder={options.placeholder}
          value={value}
          onInput={setValue}
          onSubmit={(v) => ctx.resolve(v)}
          onCancel={() => ctx.dismiss()}
          theme={options.theme}
          dialogId={ctx.dialogId}
        />
      );
    },
    size: "medium",
  });
}

/**
 * Show a choice selection dialog.
 *
 * Returns the key of the selected choice, or `undefined` if cancelled.
 */
export async function showChoiceOverlay(
  dialog: DialogHandle,
  options: ChoiceOverlayOptions & { readonly theme: ResolvedTheme },
): Promise<string | undefined> {
  return dialog.choice<string>({
    content: (ctx) => {
      return () => (
        <ChoiceOverlay
          title={options.title}
          choices={options.choices}
          onSelect={(key) => ctx.resolve(key)}
          onCancel={() => ctx.dismiss()}
          theme={options.theme}
          dialogId={ctx.dialogId}
        />
      );
    },
    size: "medium",
  });
}

// ---------------------------------------------------------------------------
// InputOverlay component
// ---------------------------------------------------------------------------

/**
 * Inline text input overlay with scoped keyboard handling.
 *
 * Enter submits the current value; Escape cancels.
 */
export function InputOverlay(props: InputOverlayProps) {
  const t = props.theme;

  useDialogKeyboard((key) => {
    if (key.name === "return" || key.name === "enter") {
      props.onSubmit(props.value());
      return;
    }
    if (key.name === "escape") {
      props.onCancel();
      return;
    }
  }, props.dialogId);

  return (
    <box flexDirection="column" padding={1}>
      <text fg={t.foregroundBright} attributes={TextAttributes.BOLD}>
        {props.title}
      </text>
      <box borderStyle="single" borderColor={t.accent} marginTop={1} padding={0}>
        <input
          value={props.value()}
          onInput={props.onInput}
          placeholder={props.placeholder ?? ""}
          focused
          textColor={t.foreground}
          placeholderColor={t.muted}
          backgroundColor={t.background}
        />
      </box>
      <text fg={t.muted} marginTop={1}>
        {"Enter to submit, Esc to cancel"}
      </text>
    </box>
  );
}

// ---------------------------------------------------------------------------
// ChoiceOverlay component
// ---------------------------------------------------------------------------

/**
 * Choice selection overlay with j/k navigation and Enter to select.
 *
 * Keyboard navigation wraps around.
 */
export function ChoiceOverlay(props: ChoiceOverlayProps) {
  const t = props.theme;
  const [selectedIndex, setSelectedIndex] = createSignal(0);

  useDialogKeyboard((key) => {
    const len = props.choices.length;
    if (len === 0) {
      if (key.name === "escape") props.onCancel();
      return;
    }

    if (key.name === "j" || key.name === "down") {
      setSelectedIndex((i) => (i + 1) % len);
      return;
    }
    if (key.name === "k" || key.name === "up") {
      setSelectedIndex((i) => (i - 1 + len) % len);
      return;
    }
    if (key.name === "return" || key.name === "enter") {
      const choice = props.choices[selectedIndex()];
      if (choice) props.onSelect(choice.key);
      return;
    }
    if (key.name === "escape") {
      props.onCancel();
      return;
    }
  }, props.dialogId);

  return (
    <box flexDirection="column" padding={1}>
      <text fg={t.foregroundBright} attributes={TextAttributes.BOLD}>
        {props.title}
      </text>
      <box flexDirection="column" marginTop={1}>
        <Show
          when={props.choices.length > 0}
          fallback={<text fg={t.muted}>{"No options available"}</text>}
        >
          <For each={props.choices}>
            {(choice, index) => {
              const isSelected = () => index() === selectedIndex();
              return (
                <box
                  backgroundColor={isSelected() ? t.accent : undefined}
                  paddingLeft={1}
                  paddingRight={1}
                >
                  <text
                    fg={isSelected() ? t.background : t.foreground}
                    attributes={isSelected() ? TextAttributes.BOLD : undefined}
                  >
                    {choice.label}
                  </text>
                </box>
              );
            }}
          </For>
        </Show>
      </box>
      <text fg={t.muted} marginTop={1}>
        {"j/k to move, Enter to select, Esc to cancel"}
      </text>
    </box>
  );
}
