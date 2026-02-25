/**
 * Review tab component for the detail pane.
 *
 * Displays PR metadata, a review summary placeholder, and a diff
 * placeholder. When no PR is associated, shows an empty-state hint.
 *
 * @module tui/review-tab
 */

import { Show } from "solid-js";
import type { Accessor } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { TextAttributes } from "@opentui/core";
import type { GithubPR, PrNumber } from "../types.js";
import type { ResolvedTheme } from "./theme.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReviewTabProps {
  readonly pr: Accessor<GithubPR | undefined>;
  readonly theme: ResolvedTheme;
  readonly focused: Accessor<boolean>;
  readonly onApprove?: (prNumber: PrNumber) => void;
  readonly onComment?: (prNumber: PrNumber) => void;
  readonly onOpenExternal?: (url: string) => void;
  readonly onRefresh?: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map PR state to a theme color. */
function prStateColor(state: GithubPR["state"], theme: ResolvedTheme): string {
  switch (state) {
    case "open":
      return theme.success;
    case "closed":
      return theme.error;
    case "merged":
      return theme.success;
    case "draft":
      return theme.muted;
  }
}

/** Map CI status to a theme color. */
function ciStatusColor(status: GithubPR["ciStatus"], theme: ResolvedTheme): string {
  switch (status) {
    case "pass":
      return theme.success;
    case "fail":
      return theme.error;
    case "pending":
      return theme.warning;
    case "none":
      return theme.muted;
  }
}

/** Human-readable label for a review decision. */
function reviewDecisionLabel(decision: GithubPR["reviewDecision"]): string {
  switch (decision) {
    case "approved":
      return "Review: approved";
    case "changes_requested":
      return "Review: changes requested";
    case "review_required":
      return "Review: required";
    default:
      return "Review: none";
  }
}

/** Map review decision to a theme color. */
function reviewDecisionColor(decision: GithubPR["reviewDecision"], theme: ResolvedTheme): string {
  switch (decision) {
    case "approved":
      return theme.success;
    case "changes_requested":
      return theme.warning;
    case "review_required":
      return theme.info;
    default:
      return theme.muted;
  }
}

/** Map CI status to its display label. */
function ciStatusLabel(status: GithubPR["ciStatus"]): string {
  switch (status) {
    case "pass":
      return "CI: passing";
    case "fail":
      return "CI: failing";
    case "pending":
      return "CI: pending";
    case "none":
      return "CI: none";
  }
}

/** Map PR state to its display label. */
function prStateLabel(state: GithubPR["state"]): string {
  switch (state) {
    case "open":
      return "[open]";
    case "closed":
      return "[closed]";
    case "merged":
      return "[merged]";
    case "draft":
      return "[draft]";
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PrMetadata(props: { readonly pr: GithubPR; readonly theme: ResolvedTheme }) {
  return (
    <box flexDirection="column">
      <box flexDirection="row">
        <text fg={props.theme.info} attributes={TextAttributes.BOLD}>
          {`#${props.pr.number}`}
        </text>
        <text fg={props.theme.foregroundBright}>{` ${props.pr.title}`}</text>
      </box>
      <text fg={props.theme.muted}>{`by ${props.pr.author}`}</text>
      <text fg={prStateColor(props.pr.state, props.theme)}>{prStateLabel(props.pr.state)}</text>
      <text fg={props.theme.info}>{props.pr.headRef}</text>
      <text fg={ciStatusColor(props.pr.ciStatus, props.theme)}>
        {ciStatusLabel(props.pr.ciStatus)}
      </text>
      <text fg={reviewDecisionColor(props.pr.reviewDecision, props.theme)}>
        {reviewDecisionLabel(props.pr.reviewDecision)}
      </text>
      <text fg={props.theme.info}>{props.pr.url}</text>
    </box>
  );
}

function ReviewSummary(props: { readonly theme: ResolvedTheme }) {
  return (
    <box flexDirection="column">
      <text fg={props.theme.foregroundBright} attributes={TextAttributes.BOLD}>
        Review Summary
      </text>
      <text fg={props.theme.muted}>
        AI review summary will be generated when a review agent completes.
      </text>
    </box>
  );
}

function FileIndex(props: { readonly theme: ResolvedTheme; readonly diffLineCount?: number }) {
  return (
    <Show when={props.diffLineCount !== undefined && props.diffLineCount > 1000}>
      <box flexDirection="column">
        <text fg={props.theme.foregroundBright} attributes={TextAttributes.BOLD}>
          File Index
        </text>
        <text fg={props.theme.muted}>Diff exceeds 1000 lines. File summary:</text>
        <text fg={props.theme.muted}>File index will appear here when diff data is available.</text>
      </box>
    </Show>
  );
}

function DiffSection(props: { readonly theme: ResolvedTheme }) {
  return (
    <box flexDirection="column">
      <text fg={props.theme.foregroundBright} attributes={TextAttributes.BOLD}>
        Diff
      </text>
      <text fg={props.theme.muted}>Diff content will be loaded here.</text>
      <text fg={props.theme.muted}>Press r to refresh.</text>
    </box>
  );
}

function ActionHints(props: { readonly pr: GithubPR; readonly theme: ResolvedTheme }) {
  const canApprove = () => props.pr.state === "open";
  return (
    <box flexDirection="row">
      <text fg={props.theme.muted}>
        {canApprove() ? "a:approve  " : ""}
        {"c:comment  e:open  r:refresh"}
      </text>
    </box>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ReviewTab(props: ReviewTabProps) {
  const t = props.theme;

  useKeyboard((key) => {
    if (!props.focused()) return;
    const pr = props.pr();
    if (!pr) return;

    switch (key.name) {
      case "a":
        if (pr.state === "open") props.onApprove?.(pr.number);
        return;
      case "c":
        props.onComment?.(pr.number);
        return;
      case "e":
        props.onOpenExternal?.(pr.url);
        return;
      case "r":
        props.onRefresh?.();
        return;
    }
  });

  return (
    <Show
      when={props.pr()}
      fallback={
        <box justifyContent="center" alignItems="center" flexGrow={1}>
          <text fg={t.muted}>No pull request. Press / &gt; Create PR to open one.</text>
        </box>
      }
    >
      {(pr: Accessor<GithubPR>) => (
        <scrollbox flexDirection="column" flexGrow={1}>
          <PrMetadata pr={pr()} theme={t} />
          <ReviewSummary theme={t} />
          <FileIndex theme={t} />
          <DiffSection theme={t} />
          <ActionHints pr={pr()} theme={t} />
        </scrollbox>
      )}
    </Show>
  );
}
