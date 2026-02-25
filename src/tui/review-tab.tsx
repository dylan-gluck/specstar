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
import { TextAttributes } from "@opentui/core";
import type { GithubPR } from "../types.js";
import type { ResolvedTheme } from "./theme.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReviewTabProps {
	readonly pr: Accessor<GithubPR | undefined>;
	readonly theme: ResolvedTheme;
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
			<text fg={prStateColor(props.pr.state, props.theme)}>
				{prStateLabel(props.pr.state)}
			</text>
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
			<text fg={props.theme.muted}>AI review summary will appear here.</text>
		</box>
	);
}

function DiffSection(props: { readonly theme: ResolvedTheme }) {
	return (
		<box flexDirection="column">
			<text fg={props.theme.foregroundBright} attributes={TextAttributes.BOLD}>
				Diff
			</text>
			<text fg={props.theme.muted}>
				Diff content will be loaded here. Press r to refresh.
			</text>
		</box>
	);
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ReviewTab(props: ReviewTabProps) {
	const t = props.theme;

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
					<DiffSection theme={t} />
				</scrollbox>
			)}
		</Show>
	);
}
