import { useKeyboard, useTerminalDimensions } from "@opentui/solid";
import { Match, Switch } from "solid-js";
import type { Accessor, JSX } from "solid-js";
import type { ResolvedTheme } from "./theme.js";

export type LayoutMode = "wide" | "compressed" | "stacked";

export interface LayoutProps {
  readonly leftPane: JSX.Element;
  readonly rightPane: JSX.Element;
  readonly statusBar: JSX.Element;
  readonly focusedPane: Accessor<"left" | "right">;
  readonly onFocusChange: (pane: "left" | "right") => void;
  readonly onTabSelect?: (tab: 1 | 2 | 3) => void;
  readonly onTabCycle?: (direction: "next" | "prev") => void;
  readonly onCommandPalette?: () => void;
  readonly theme: Accessor<ResolvedTheme>;
  readonly keybindings?: import("../types.js").SpecstarKeybindings;
}

export function Layout(props: LayoutProps) {
  useKeyboard((key) => {
    const kb = props.keybindings;
    if (key.name === (kb?.togglePane ?? "tab")) {
      props.onFocusChange(props.focusedPane() === "left" ? "right" : "left");
      return;
    }

    if (key.name === (kb?.openCommandPalette ?? "/")) {
      props.onCommandPalette?.();
      return;
    }

    if (props.focusedPane() !== "right") return;

    if (key.name === "1") {
      props.onTabSelect?.(1);
      return;
    }
    if (key.name === "2") {
      props.onTabSelect?.(2);
      return;
    }
    if (key.name === "3") {
      props.onTabSelect?.(3);
      return;
    }

    if (key.name === (kb?.tabPrev ?? "left") || key.name === "h") {
      props.onTabCycle?.("prev");
      return;
    }
    if (key.name === (kb?.tabNext ?? "right") || key.name === "l") {
      props.onTabCycle?.("next");
      return;
    }
  });

  const leftBorder = () =>
    props.focusedPane() === "left" ? props.theme().accent : props.theme().muted;

  const rightBorder = () =>
    props.focusedPane() === "right" ? props.theme().accent : props.theme().muted;

  const dims = useTerminalDimensions();
  const layoutMode = (): LayoutMode => {
    const w = dims().width;
    if (w > 80) return "wide";
    if (w >= 60) return "compressed";
    return "stacked";
  };

  return (
    <Switch>
      <Match when={layoutMode() === "wide"}>
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
      </Match>
      <Match when={layoutMode() === "compressed"}>
        <box flexDirection="column" width="100%" height="100%">
          <box flexDirection="row" flexGrow={1}>
            <box width={22} borderStyle="single" borderColor={leftBorder()}>
              {props.leftPane}
            </box>
            <box flexGrow={1} borderStyle="single" borderColor={rightBorder()}>
              {props.rightPane}
            </box>
          </box>
          {props.statusBar}
        </box>
      </Match>
      <Match when={layoutMode() === "stacked"}>
        <box flexDirection="column" width="100%" height="100%">
          <box height="40%" borderStyle="single" borderColor={leftBorder()}>
            {props.leftPane}
          </box>
          <box flexGrow={1} borderStyle="single" borderColor={rightBorder()}>
            {props.rightPane}
          </box>
          {props.statusBar}
        </box>
      </Match>
    </Switch>
  );
}
