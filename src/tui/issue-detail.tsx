/**
 * Issue detail container component for the right pane.
 *
 * Shows one of three tabs (Overview, SPEC, Review) for the currently
 * selected enriched issue, or handles unlinked items by displaying
 * only the relevant tab. Preserves per-tab scroll position.
 *
 * @module tui/issue-detail
 */

import { Show } from "solid-js";
import type { Accessor } from "solid-js";
import { TextAttributes } from "@opentui/core";
import type {
  EnrichedIssue,
  UnlinkedItem,
  SessionId,
  PrNumber,
  NotionPageId,
  NotionSpec,
} from "../types.js";
import { OverviewTab } from "./overview-tab.js";
import { ReviewTab } from "./review-tab.js";
import { SpecTab } from "./spec-tab.js";
import type { ResolvedTheme } from "./theme.js";
import type { SyntaxStyle } from "./theme.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DetailTab = "overview" | "spec" | "review";

export interface IssueDetailProps {
  readonly item: Accessor<EnrichedIssue | UnlinkedItem | undefined>;
  readonly activeTab: Accessor<DetailTab>;
  readonly onTabChange: (tab: DetailTab) => void;
  readonly theme: ResolvedTheme;
  readonly focused: Accessor<boolean>;
  readonly syntaxStyle: SyntaxStyle;
  readonly onApproveSession?: (sessionId: SessionId) => void;
  readonly onRejectSession?: (sessionId: SessionId) => void;
  readonly onNewSession?: () => void;
  readonly onOpenSessionDetail?: (sessionId: SessionId) => void;
  readonly onApprovePR?: (prNumber: PrNumber) => void;
  readonly onCommentPR?: (prNumber: PrNumber) => void;
  readonly onOpenExternal?: (url: string) => void;
  readonly onRefreshPR?: () => void;
  readonly onApproveSpec?: (specId: NotionPageId) => void;
  readonly onDenySpec?: (specId: NotionPageId) => void;
  readonly onRefreshSpec?: (specId: NotionPageId) => void;
  readonly onViewSpecFullScreen?: (spec: NotionSpec) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Type guard distinguishing an enriched issue from an unlinked item. */
export function isEnrichedIssue(item: EnrichedIssue | UnlinkedItem): item is EnrichedIssue {
  return "issue" in item;
}

/** Returns the effective tab for the current item, respecting unlinked constraints. */
function effectiveTab(
  item: EnrichedIssue | UnlinkedItem | undefined,
  requested: DetailTab,
): DetailTab {
  if (item === undefined) return requested;
  if (isEnrichedIssue(item)) return requested;
  return item.type === "pr" ? "review" : "overview";
}

/** Returns which tabs are visible for the current item. */
function visibleTabs(item: EnrichedIssue | UnlinkedItem | undefined): readonly DetailTab[] {
  if (item === undefined) return ["overview", "spec", "review"];
  if (isEnrichedIssue(item)) return ["overview", "spec", "review"];
  return item.type === "pr" ? ["review"] : ["overview"];
}

const TAB_LABELS: Record<DetailTab, string> = {
  overview: "Overview",
  spec: "SPEC",
  review: "Review",
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TabBar(props: {
  readonly tabs: readonly DetailTab[];
  readonly active: DetailTab;
  readonly onSelect: (tab: DetailTab) => void;
  readonly focused: boolean;
  readonly theme: ResolvedTheme;
}) {
  return (
    <box
      flexDirection="row"
      border={["bottom"]}
      borderStyle="single"
      borderColor={props.focused ? props.theme.accent : props.theme.muted}
      gap={2}
      paddingLeft={1}
    >
      {props.tabs.map((tab) => {
        const isActive = tab === props.active;
        return (
          <text
            fg={isActive ? props.theme.accent : props.theme.muted}
            attributes={isActive ? TextAttributes.BOLD : undefined}
          >
            {TAB_LABELS[tab]}
          </text>
        );
      })}
    </box>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function IssueDetail(props: IssueDetailProps) {
  const t = props.theme;

  const current = () => props.item();
  const tab = () => effectiveTab(current(), props.activeTab());
  const tabs = () => visibleTabs(current());

  // Derived data for each tab
  const enrichedIssue = () => {
    const c = current();
    return c && isEnrichedIssue(c) ? c : undefined;
  };

  const unlinkedSession = () => {
    const c = current();
    if (!c || isEnrichedIssue(c)) return undefined;
    return c.type === "session" ? c.session : undefined;
  };

  const spec = () => enrichedIssue()?.spec;
  const pr = () => {
    const c = current();
    if (!c) return undefined;
    if (isEnrichedIssue(c)) return c.pr;
    return c.type === "pr" ? c.pr : undefined;
  };
  return (
    <box flexDirection="column" flexGrow={1}>
      {/* Empty state */}
      <Show when={current() === undefined}>
        <box flexGrow={1} justifyContent="center" alignItems="center">
          <text fg={t.muted}>Select an issue to view details</text>
        </box>
      </Show>

      {/* Detail view */}
      <Show when={current() !== undefined}>
        <TabBar
          tabs={tabs()}
          active={tab()}
          onSelect={props.onTabChange}
          focused={props.focused()}
          theme={t}
        />

        {/*
         * Each tab wrapped in its own Show (keyed=false) so DOM nodes
         * persist across tab switches, preserving scroll position.
         */}
        <Show when={tab() === "overview"}>
          <scrollbox flexGrow={1}>
            <OverviewTab
              issue={enrichedIssue}
              unlinkedSession={unlinkedSession}
              theme={t}
              syntaxStyle={props.syntaxStyle}
              focused={() => props.focused() && tab() === "overview"}
              onApprove={props.onApproveSession}
              onReject={props.onRejectSession}
              onNewSession={props.onNewSession}
              onOpenSessionDetail={props.onOpenSessionDetail}
            />
          </scrollbox>
        </Show>

        <Show when={tab() === "spec"}>
          <scrollbox flexGrow={1}>
            <SpecTab
              spec={spec}
              theme={t}
              syntaxStyle={props.syntaxStyle}
              focused={() => props.focused() && tab() === "spec"}
              onApprove={props.onApproveSpec}
              onDeny={props.onDenySpec}
              onRefresh={props.onRefreshSpec}
              onOpenExternal={props.onOpenExternal}
              onViewFullScreen={props.onViewSpecFullScreen}
            />
          </scrollbox>
        </Show>

        <Show when={tab() === "review"}>
          <scrollbox flexGrow={1}>
            <ReviewTab
              pr={pr}
              theme={t}
              focused={() => props.focused() && tab() === "review"}
              onApprove={props.onApprovePR}
              onComment={props.onCommentPR}
              onOpenExternal={props.onOpenExternal}
              onRefresh={props.onRefreshPR}
            />
          </scrollbox>
        </Show>
      </Show>
    </box>
  );
}
