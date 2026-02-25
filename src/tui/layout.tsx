import { useKeyboard } from "@opentui/solid";
import type { Accessor, JSX } from "solid-js";
import type { ResolvedTheme } from "./theme.js";

export interface LayoutProps {
  readonly leftPane: JSX.Element;
  readonly rightPane: JSX.Element;
  readonly statusBar: JSX.Element;
  readonly focusedPane: Accessor<"left" | "right">;
  readonly onFocusChange: (pane: "left" | "right") => void;
  readonly theme: Accessor<ResolvedTheme>;
}

export function Layout(props: LayoutProps) {
  useKeyboard((key) => {
    if (key.name === "tab") {
      props.onFocusChange(props.focusedPane() === "left" ? "right" : "left");
    }
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
