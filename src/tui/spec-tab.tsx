/**
 * Spec tab component for the detail pane.
 *
 * Displays a linked Notion spec document with status badge,
 * metadata, and rendered markdown content.
 *
 * @module tui/spec-tab
 */

import { Show } from "solid-js";
import type { Accessor } from "solid-js";
import { TextAttributes } from "@opentui/core";
import type { NotionSpec, SpecStatus } from "../types.js";
import type { ResolvedTheme, SyntaxStyle } from "./theme.js";

export interface SpecTabProps {
	readonly spec: Accessor<NotionSpec | undefined>;
	readonly theme: ResolvedTheme;
	readonly syntaxStyle: SyntaxStyle;
}

/** Map a spec status to the appropriate theme color. */
function specStatusColor(status: SpecStatus, theme: ResolvedTheme): string {
	switch (status) {
		case "draft":
			return theme.muted;
		case "pending":
			return theme.warning;
		case "approved":
			return theme.success;
		case "denied":
			return theme.error;
	}
}

/** Format the status as a bracketed badge label. */
function specStatusLabel(status: SpecStatus): string {
	return `[${status}]`;
}

export function SpecTab(props: SpecTabProps) {
	return (
		<Show
			when={props.spec()}
			fallback={
				<box flexGrow={1} justifyContent="center" alignItems="center">
					<text fg={props.theme.muted}>
						No spec for this issue. Press / &gt; Draft Spec to create one.
					</text>
				</box>
			}
		>
			{(spec: Accessor<NotionSpec>) => (
				<scrollbox flexGrow={1}>
					{/* Header section */}
					<box flexDirection="column" paddingBottom={1}>
						<text
							fg={props.theme.foregroundBright}
							attributes={TextAttributes.BOLD}
						>
							{spec().title}
						</text>
						<text fg={specStatusColor(spec().status, props.theme)}>
							{specStatusLabel(spec().status)}
						</text>
						<text fg={props.theme.muted}>Updated: {spec().updatedAt}</text>
						<text fg={props.theme.info}>{spec().url}</text>
					</box>

					{/* Content section */}
					<Show
						when={spec().content}
						fallback={
							<text fg={props.theme.muted}>
								Spec content not loaded. Press r to refresh.
							</text>
						}
					>
						{(content: Accessor<string>) => <markdown content={content()} syntaxStyle={props.syntaxStyle} />}
					</Show>
				</scrollbox>
			)}
		</Show>
	);
}
