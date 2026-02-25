/**
 * Overview tab for the detail pane.
 *
 * Displays full issue metadata, description (rendered as markdown),
 * sessions list, and an activity placeholder. Also handles the
 * unlinked-session fallback when no enriched issue is selected.
 *
 * @module tui/overview-tab
 */

import { Show, For } from "solid-js";
import type { Accessor } from "solid-js";
import { TextAttributes } from "@opentui/core";
import type { EnrichedIssue, WorkerSession, WorkerStatus, Worktree } from "../types.js";
import type { ResolvedTheme, SyntaxStyle } from "./theme.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OverviewTabProps {
	readonly issue: Accessor<EnrichedIssue | undefined>;
	readonly unlinkedSession: Accessor<WorkerSession | undefined>;
	readonly theme: ResolvedTheme;
	readonly syntaxStyle: SyntaxStyle;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map numeric priority to a human-readable label. */
function priorityLabel(p: 0 | 1 | 2 | 3 | 4): string {
	switch (p) {
		case 1:
			return "Urgent";
		case 2:
			return "High";
		case 3:
			return "Medium";
		case 4:
			return "Low";
		default:
			return "None";
	}
}

/** Resolve a priority value to a theme color string. */
function priorityColor(p: 0 | 1 | 2 | 3 | 4, theme: ResolvedTheme): string {
	switch (p) {
		case 1:
			return theme.error;
		case 2:
			return theme.warning;
		case 3:
			return theme.info;
		case 4:
			return theme.muted;
		default:
			return theme.muted;
	}
}

/** Resolve a worker status to a theme color string. */
function statusColor(status: WorkerStatus, theme: ResolvedTheme): string {
	switch (status) {
		case "working":
			return theme.accent;
		case "approval":
		case "error":
			return theme.error;
		case "idle":
		case "starting":
		case "shutdown":
			return theme.muted;
	}
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeader(props: { readonly label: string; readonly theme: ResolvedTheme }) {
	return (
		<box marginTop={1} marginBottom={1}>
			<text fg={props.theme.foregroundBright} attributes={TextAttributes.BOLD}>
				{props.label}
			</text>
		</box>
	);
}

function MetadataRow(props: {
	readonly label: string;
	readonly theme: ResolvedTheme;
	readonly children: any;
}) {
	return (
		<box flexDirection="row">
			<text fg={props.theme.muted}>{`${props.label}: `}</text>
			{props.children}
		</box>
	);
}

function IssueOverview(props: { readonly issue: EnrichedIssue; readonly theme: ResolvedTheme; readonly syntaxStyle: SyntaxStyle }) {
	const t = props.theme;
	const li = props.issue.issue;
	const p = li.priority;

	return (
		<scrollbox flexGrow={1}>
			{/* ── Metadata ────────────────────────────────────────── */}
			<box flexDirection="row">
				<text fg={t.foregroundBright} attributes={TextAttributes.BOLD}>
					{li.identifier}
				</text>
				<text fg={t.muted}>{`  ${li.state.name}`}</text>
			</box>

			<MetadataRow label="Priority" theme={t}>
				<text fg={priorityColor(p, t)}>{priorityLabel(p)}</text>
			</MetadataRow>

			<MetadataRow label="Assignee" theme={t}>
				<text fg={li.assignee ? t.foreground : t.muted}>
					{li.assignee?.name ?? "Unassigned"}
				</text>
			</MetadataRow>

			<MetadataRow label="Branch" theme={t}>
				<text fg={li.branch ? t.foreground : t.muted}>{li.branch ?? "No branch"}</text>
			</MetadataRow>

			<MetadataRow label="Worktree" theme={t}>
				<Show
					when={props.issue.worktree}
					fallback={<text fg={t.muted}>{"No worktree"}</text>}
				>
					{(wt: Accessor<Worktree>) => (
						<box flexDirection="row">
							<text fg={t.foreground}>{wt().path}</text>
							<text fg={wt().dirty ? t.warning : t.success}>
								{wt().dirty ? " dirty" : " clean"}
							</text>
						</box>
					)}
				</Show>
			</MetadataRow>

			<MetadataRow label="URL" theme={t}>
				<text fg={t.info}>{li.url}</text>
			</MetadataRow>

			{/* ── Description ─────────────────────────────────────── */}
			<SectionHeader label="Description" theme={t} />
			<Show
				when={li.description}
				fallback={<text fg={t.muted}>{"No description"}</text>}
			>
				{(desc: Accessor<string>) => <markdown content={desc()} syntaxStyle={props.syntaxStyle} />}
			</Show>

			{/* ── Sessions ────────────────────────────────────────── */}
			<SectionHeader label="Sessions" theme={t} />
			<Show
				when={props.issue.sessions.length > 0}
				fallback={
					<text fg={t.muted}>{"No sessions. Press n to start one."}</text>
				}
			>
				<For each={props.issue.sessions}>
					{(session) => (
						<box flexDirection="row">
							<text fg={t.foreground}>{session.name}</text>
							<text fg={statusColor(session.status, t)}>
								{`  ${session.status}`}
							</text>
							<text fg={t.muted}>{`  ${session.startedAt}`}</text>
							<text fg={t.muted}>{`  ${session.tokenCount} tokens`}</text>
						</box>
					)}
				</For>
			</Show>

			{/* ── Activity ────────────────────────────────────────── */}
			<SectionHeader label="Activity" theme={t} />
			<text fg={t.muted}>{"No activity yet"}</text>
		</scrollbox>
	);
}

function SessionOverview(props: {
	readonly session: WorkerSession;
	readonly theme: ResolvedTheme;
}) {
	const t = props.theme;
	const s = props.session;

	return (
		<scrollbox flexGrow={1}>
			<text fg={t.foregroundBright} attributes={TextAttributes.BOLD}>
				{s.name}
			</text>

			<MetadataRow label="Status" theme={t}>
				<text fg={statusColor(s.status, t)}>{s.status}</text>
			</MetadataRow>

			<MetadataRow label="CWD" theme={t}>
				<text fg={t.foreground}>{s.cwd}</text>
			</MetadataRow>

			<MetadataRow label="Started" theme={t}>
				<text fg={t.muted}>{s.startedAt}</text>
			</MetadataRow>

			<MetadataRow label="Last Activity" theme={t}>
				<text fg={t.muted}>{s.lastActivityAt}</text>
			</MetadataRow>

			<MetadataRow label="Tokens" theme={t}>
				<text fg={t.muted}>{`${s.tokenCount}`}</text>
			</MetadataRow>
		</scrollbox>
	);
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function OverviewTab(props: OverviewTabProps) {
	return (
		<>
			<Show when={props.issue()}>
				{(issue: Accessor<EnrichedIssue>) => <IssueOverview issue={issue()} theme={props.theme} syntaxStyle={props.syntaxStyle} />}
			</Show>
			<Show when={!props.issue() && props.unlinkedSession()}>
				{() => (
					<SessionOverview
						session={props.unlinkedSession()!}
						theme={props.theme}
					/>
				)}
			</Show>
		</>
	);
}
