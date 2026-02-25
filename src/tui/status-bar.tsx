import type { Accessor } from "solid-js";
import { TextAttributes } from "@opentui/core";
import type { ResolvedTheme } from "./theme.js";

export interface StatusBarProps {
  readonly issueCount: Accessor<number>;
  readonly sessionCount: Accessor<number>;
  readonly attentionCount: Accessor<number>;
  readonly focusedPane: Accessor<"left" | "right">;
  readonly theme: ResolvedTheme;
}

const LEFT_HINTS = "j/k:navigate  Tab:detail  /:commands  ^q:quit";
const RIGHT_HINTS = "1-3:tabs  h/l:switch  Tab:list  /:commands  ^q:quit";

export function StatusBar(props: StatusBarProps) {
  const t = props.theme;

  return (
    <box flexDirection="row" height={1} backgroundColor={t.backgroundAlt}>
      <text fg={t.accent} attributes={TextAttributes.BOLD}>
        {" Specstar "}
      </text>
      <text fg={t.foreground}>{` ${props.sessionCount()} sessions `}</text>
      <text fg={props.attentionCount() > 0 ? t.error : t.muted}>
        {`${props.attentionCount()} attention `}
      </text>
      <box flexGrow={1}>
        <text fg={t.muted}>{props.focusedPane() === "left" ? LEFT_HINTS : RIGHT_HINTS}</text>
      </box>
    </box>
  );
}
