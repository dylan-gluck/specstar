/**
 * Spec tab component for the detail pane.
 *
 * Displays a linked Notion spec document with status badge,
 * metadata, and rendered markdown content.
 *
 * @module tui/spec-tab
 */

import { Show } from "solid-js";
import type { Accessor } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { TextAttributes } from "@opentui/core";
import type { NotionPageId, NotionSpec, SpecStatus } from "../types.js";
import type { ResolvedTheme, SyntaxStyle } from "./theme.js";

export interface SpecTabProps {
  readonly spec: Accessor<NotionSpec | undefined>;
  readonly theme: ResolvedTheme;
  readonly syntaxStyle: SyntaxStyle;
  readonly focused?: Accessor<boolean>;
  readonly onApprove?: (specId: NotionPageId) => void;
  readonly onDeny?: (specId: NotionPageId) => void;
  readonly onRefresh?: (specId: NotionPageId) => void;
  readonly onOpenExternal?: (url: string) => void;
  readonly onViewFullScreen?: (spec: NotionSpec) => void;
}

/** Map a spec status to the appropriate theme color. */
function specStatusColor(status: SpecStatus, theme: ResolvedTheme): string {
  switch (status) {
    case "draft":
      return theme.muted;
    case "pending":
      return theme.warning;
    case "approved":
      return theme.success;
    case "denied":
      return theme.error;
  }
}

/** Format the status as a bracketed badge label. */
function specStatusLabel(status: SpecStatus): string {
  return `[${status}]`;
}

export function SpecTab(props: SpecTabProps) {
  useKeyboard((key) => {
    if (!props.focused?.()) return;
    const s = props.spec();
    if (!s) return;

    switch (key.name) {
      case "a":
        if (s.status === "pending") props.onApprove?.(s.id);
        return;
      case "x":
        if (s.status === "pending") props.onDeny?.(s.id);
        return;
      case "r":
        props.onRefresh?.(s.id);
        return;
      case "e":
        props.onOpenExternal?.(s.url);
        return;
      case "f":
        props.onViewFullScreen?.(s);
        return;
    }
  });

  return (
    <Show
      when={props.spec()}
      fallback={
        <box flexGrow={1} justifyContent="center" alignItems="center">
          <text fg={props.theme.muted}>
            No spec for this issue. Press / &gt; Draft Spec to create one.
          </text>
        </box>
      }
    >
      {(spec: Accessor<NotionSpec>) => (
        <scrollbox flexGrow={1}>
          {/* Header section */}
          <box flexDirection="column" paddingBottom={1}>
            <text fg={props.theme.foregroundBright} attributes={TextAttributes.BOLD}>
              {spec().title}
            </text>
            <text fg={specStatusColor(spec().status, props.theme)}>
              {specStatusLabel(spec().status)}
            </text>
            <text fg={props.theme.muted}>Updated: {spec().updatedAt}</text>
            <text fg={props.theme.info}>{spec().url}</text>
          </box>

          <Show when={spec().status === "pending"}>
            <box paddingX={1} width="100%" backgroundColor={props.theme.warning}>
              <text fg={props.theme.background} attributes={TextAttributes.BOLD}>
                This spec is pending approval. Press a to approve, x to deny.
              </text>
            </box>
          </Show>

          {/* Content section */}
          <Show
            when={spec().content}
            fallback={
              <text fg={props.theme.muted}>Spec content not loaded. Press r to refresh.</text>
            }
          >
            {(content: Accessor<string>) => (
              <markdown content={content()} syntaxStyle={props.syntaxStyle} />
            )}
          </Show>

          <box paddingTop={1} paddingX={1}>
            <text fg={props.theme.muted}>
              {spec().status === "pending"
                ? "a approve | x deny | r refresh | e open | f fullscreen"
                : "r refresh | e open | f fullscreen"}
            </text>
          </box>
        </scrollbox>
      )}
    </Show>
  );
}
