import { useKeyboard } from "@opentui/solid";
import type { Accessor, JSX } from "solid-js";
import type { ResolvedTheme } from "./theme.js";

export interface LayoutProps {
  readonly leftPane: JSX.Element;
  readonly rightPane: JSX.Element;
  readonly statusBar: JSX.Element;
  readonly focusedPane: Accessor<"left" | "right">;
  readonly onFocusChange: (pane: "left" | "right") => void;
  readonly onTabSelect?: (tab: 1 | 2 | 3) => void;
  readonly onTabCycle?: (direction: "next" | "prev") => void;
  readonly theme: Accessor<ResolvedTheme>;
}

export function Layout(props: LayoutProps) {
  useKeyboard((key) => {
    if (key.name === "tab") {
      props.onFocusChange(props.focusedPane() === "left" ? "right" : "left");
      return;
    }

    if (props.focusedPane() !== "right") return;

    if (key.name === "1") { props.onTabSelect?.(1); return; }
    if (key.name === "2") { props.onTabSelect?.(2); return; }
    if (key.name === "3") { props.onTabSelect?.(3); return; }

    if (key.name === "h" || key.name === "left") { props.onTabCycle?.("prev"); return; }
    if (key.name === "l" || key.name === "right") { props.onTabCycle?.("next"); return; }
  });

  const leftBorder = () =>
    props.focusedPane() === "left" ? props.theme().accent : props.theme().muted;

  const rightBorder = () =>
    props.focusedPane() === "right" ? props.theme().accent : props.theme().muted;

  return (
    <box flexDirection="column" width="100%" height="100%">
      <box flexDirection="row" flexGrow={1}>
        <box
          width="35%"
          minWidth={28}
          maxWidth={50}
          borderStyle="single"
          borderColor={leftBorder()}
        >
          {props.leftPane}
        </box>
        <box flexGrow={1} borderStyle="single" borderColor={rightBorder()}>
          {props.rightPane}
        </box>
      </box>
      {props.statusBar}
    </box>
  );
}
