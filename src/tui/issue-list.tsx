/**
 * Issue list component for the left pane.
 *
 * Renders enriched issues grouped by section (attention, active, backlog)
 * plus unlinked PRs and sessions, with keyboard navigation.
 *
 * @module tui/issue-list
 */

import { createMemo, For, Show } from "solid-js";
import type { Accessor } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { TextAttributes } from "@opentui/core";
import type { EnrichedIssue, UnlinkedItem } from "../types.js";
import type { IssueListModel } from "../enrichment.js";
import type { ResolvedTheme } from "./theme.js";
import { badgeColor } from "./theme.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IssueListProps {
  readonly model: Accessor<IssueListModel>;
  readonly selectedIndex: Accessor<number>;
  readonly onSelect: (index: number) => void;
  readonly theme: ResolvedTheme;
  readonly focused: Accessor<boolean>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type FlatItem =
  | {
      readonly kind: "issue";
      readonly issue: EnrichedIssue;
      readonly section: "attention" | "active" | "backlog";
    }
  | { readonly kind: "unlinked"; readonly item: UnlinkedItem };

/** Build a flat array of all visible items (section headers excluded). */
export function getFlatItems(model: IssueListModel): readonly FlatItem[] {
  const items: FlatItem[] = [];
  for (const issue of model.attention) {
    items.push({ kind: "issue", issue, section: "attention" });
  }
  for (const issue of model.active) {
    items.push({ kind: "issue", issue, section: "active" });
  }
  for (const issue of model.backlog) {
    items.push({ kind: "issue", issue, section: "backlog" });
  }
  for (const item of model.unlinked) {
    items.push({ kind: "unlinked", item });
  }
  return items;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeader(props: { readonly label: string; readonly theme: ResolvedTheme }) {
  return (
    <text fg={props.theme.foregroundBright} attributes={TextAttributes.BOLD}>
      {props.label}
    </text>
  );
}

function IssueRow(props: {
  readonly enriched: EnrichedIssue;
  readonly isAttention: boolean;
  readonly selected: boolean;
  readonly theme: ResolvedTheme;
}) {
  const prefix = props.isAttention ? "! " : "  ";
  const color = badgeColor(props.enriched.badge, props.theme);

  return (
    <box
      flexDirection="row"
      backgroundColor={props.selected ? props.theme.backgroundAlt : undefined}
    >
      <text>{prefix}</text>
      <text fg={color}>{`[${props.enriched.badge}]`}</text>
      <text>{` ${props.enriched.issue.identifier} ${props.enriched.issue.title}`}</text>
    </box>
  );
}

function UnlinkedRow(props: {
  readonly item: UnlinkedItem;
  readonly selected: boolean;
  readonly theme: ResolvedTheme;
}) {
  const label =
    props.item.type === "pr"
      ? `  [PR] #${props.item.pr.number} ${props.item.pr.title}`
      : `  [S] ${props.item.session.name} ${props.item.session.status}`;

  return (
    <box backgroundColor={props.selected ? props.theme.backgroundAlt : undefined}>
      <text>{label}</text>
    </box>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function IssueList(props: IssueListProps) {
  const t = props.theme;

  const flatItems = createMemo(() => getFlatItems(props.model()));
  const totalItems = createMemo(() => flatItems().length);

  // Keyboard navigation
  useKeyboard((key) => {
    if (!props.focused()) return;

    const count = totalItems();
    if (count === 0) return;

    const current = props.selectedIndex();

    switch (key.name) {
      case "j":
      case "down": {
        const next = Math.min(count - 1, current + 1);
        if (next !== current) props.onSelect(next);
        break;
      }
      case "k":
      case "up": {
        const next = Math.max(0, current - 1);
        if (next !== current) props.onSelect(next);
        break;
      }
    }
  });

  // Track running offset for flat index per section
  const attentionItems = createMemo(() => props.model().attention);
  const activeItems = createMemo(() => props.model().active);
  const backlogItems = createMemo(() => props.model().backlog);
  const unlinkedItems = createMemo(() => props.model().unlinked);

  const attentionOffset = 0;
  const activeOffset = createMemo(() => attentionItems().length);
  const backlogOffset = createMemo(() => activeOffset() + activeItems().length);
  const unlinkedOffset = createMemo(() => backlogOffset() + backlogItems().length);

  return (
    <scrollbox flexGrow={1}>
      <Show when={totalItems() === 0}>
        <box justifyContent="center">
          <text fg={t.muted}>{"No issues found"}</text>
        </box>
      </Show>

      <Show when={attentionItems().length > 0}>
        <SectionHeader label={" ATTENTION "} theme={t} />
        <For each={attentionItems()}>
          {(issue, i) => (
            <IssueRow
              enriched={issue}
              isAttention={true}
              selected={props.selectedIndex() === attentionOffset + i()}
              theme={t}
            />
          )}
        </For>
      </Show>

      <Show when={activeItems().length > 0}>
        <SectionHeader label={" ACTIVE "} theme={t} />
        <For each={activeItems()}>
          {(issue, i) => (
            <IssueRow
              enriched={issue}
              isAttention={false}
              selected={props.selectedIndex() === activeOffset() + i()}
              theme={t}
            />
          )}
        </For>
      </Show>

      <Show when={backlogItems().length > 0}>
        <SectionHeader label={" BACKLOG "} theme={t} />
        <For each={backlogItems()}>
          {(issue, i) => (
            <IssueRow
              enriched={issue}
              isAttention={false}
              selected={props.selectedIndex() === backlogOffset() + i()}
              theme={t}
            />
          )}
        </For>
      </Show>

      <Show when={unlinkedItems().length > 0}>
        <SectionHeader label={" UNLINKED "} theme={t} />
        <For each={unlinkedItems()}>
          {(item, i) => (
            <UnlinkedRow
              item={item}
              selected={props.selectedIndex() === unlinkedOffset() + i()}
              theme={t}
            />
          )}
        </For>
      </Show>
    </scrollbox>
  );
}
