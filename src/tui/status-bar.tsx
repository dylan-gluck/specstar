import { Show } from "solid-js";
import type { Accessor } from "solid-js";
import { TextAttributes } from "@opentui/core";
import type { ResolvedTheme } from "./theme.js";

export interface StatusBarProps {
  readonly issueCount: Accessor<number>;
  readonly sessionCount: Accessor<number>;
  readonly attentionCount: Accessor<number>;
  readonly focusedPane: Accessor<"left" | "right">;
  readonly theme: ResolvedTheme;
  readonly integrationErrors?: Accessor<{
    linear: string | null;
    github: string | null;
    notion: string | null;
    worktrees: string | null;
  }>;
}

const LEFT_HINTS = "j/k:navigate  Tab:detail  /:commands  ^q:quit";
const RIGHT_HINTS = "1-3:tabs  h/l:switch  Tab:list  /:commands  ^q:quit";

const ERROR_LABELS: Record<string, string> = {
  linear: "Linear",
  github: "GitHub",
  notion: "Notion",
  worktrees: "Worktrees",
};

export function StatusBar(props: StatusBarProps) {
  const t = props.theme;

  const hasErrors = () => {
    if (!props.integrationErrors) return false;
    const errs = props.integrationErrors();
    return (
      errs.linear !== null ||
      errs.github !== null ||
      errs.notion !== null ||
      errs.worktrees !== null
    );
  };

  const errorSummary = () => {
    if (!props.integrationErrors) return "";
    const errs = props.integrationErrors();
    const parts: string[] = [];
    for (const [key, label] of Object.entries(ERROR_LABELS)) {
      if (errs[key as keyof typeof errs] !== null) {
        parts.push(`[${label}]: error`);
      }
    }
    return parts.join(" ");
  };

  return (
    <box flexDirection="row" height={1} backgroundColor={t.backgroundAlt}>
      <text fg={t.accent} attributes={TextAttributes.BOLD}>
        {" Specstar "}
      </text>
      <text fg={t.foreground}>{` ${props.sessionCount()} sessions `}</text>
      <text fg={props.attentionCount() > 0 ? t.error : t.muted}>
        {`${props.attentionCount()} attention `}
      </text>
      <Show when={hasErrors()}>
        <text fg={t.error}>{errorSummary()}</text>
      </Show>
      <box flexGrow={1}>
        <text fg={t.muted}>{props.focusedPane() === "left" ? LEFT_HINTS : RIGHT_HINTS}</text>
      </box>
    </box>
  );
}
