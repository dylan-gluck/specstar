# Feature Specification: Issue-Centric TUI

**Feature Branch**: `001-issue-centric-tui`  
**Created**: 2026-02-25  
**Status**: Draft  
**Input**: User description: "Issue-centric TUI for spec-driven development and async agent orchestration"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse and Triage Issues at a Glance (Priority: P1)

A developer opens Specstar and immediately sees all their assigned issues organized by urgency. Issues needing human action (approvals, errors, completed reviews) float to the top in an "Attention" section, followed by "Active" work, then "Backlog." Without clicking into anything, the developer can scan status badges to understand the state of every issue -- which sessions are working, which PRs need review, which specs await approval.

**Why this priority**: This is the foundational interaction. If the developer cannot quickly see and navigate their work, nothing else in the application delivers value. Every other feature depends on the issue list being correct, fast, and readable.

**Independent Test**: Can be fully tested by launching the application with a configured Linear workspace and verifying that issues appear grouped into the correct sections with accurate status badges. Delivers immediate situational awareness.

**Acceptance Scenarios**:

1. **Given** a configured Linear workspace with assigned issues, **When** the user launches Specstar, **Then** issues are displayed in a left pane grouped into Attention, Active, Backlog, and Unlinked sections, sorted according to defined rules (Attention by urgency, Active by recency, Backlog by priority).
2. **Given** an issue with a session awaiting tool approval, **When** the issue list renders, **Then** that issue appears in the Attention section with an `apprvl` badge and a `!` prefix indicator.
3. **Given** no issues match the current filter, **When** the issue list renders, **Then** a "No issues found" message is displayed. Empty sections are hidden entirely (no empty headers).
4. **Given** sessions or PRs exist that do not match any tracked issue, **When** the issue list renders, **Then** they appear in an "Unlinked" section with `[PR]` or `[S]` badge prefixes.
5. **Given** a terminal width below 80 columns, **When** the layout renders, **Then** the left pane collapses to show only the indicator and identifier. Below 60 columns, layout switches to stacked vertical mode.

---

### User Story 2 - Inspect Full Issue Context Without Switching Views (Priority: P1)

A developer selects an issue from the list and the right pane instantly populates with the issue's complete lifecycle. Three tabs -- Overview, SPEC, and Review -- present the issue's metadata, description, requirements, linked sessions, specification document, and pull request details. The developer can navigate between tabs without losing their place. Selecting a different issue in the left pane immediately updates the right pane.

**Why this priority**: This eliminates the cognitive overhead of the prior four-card grid. The developer gets a unified view of every artifact related to an issue in one place. Without this, the TUI is just a list viewer.

**Independent Test**: Can be tested by selecting an issue and verifying that Overview shows metadata, description, sessions, and activity; SPEC shows the linked specification; Review shows the linked PR with diff. Tab switching preserves scroll positions.

**Acceptance Scenarios**:

1. **Given** an issue with linked sessions, a spec, and a PR, **When** the user selects it, **Then** the Overview tab displays metadata, description, requirements (if structured), sessions list, and activity log.
2. **Given** the user is viewing the Overview tab, **When** they press `2` or navigate right, **Then** the SPEC tab activates showing the specification document with status, content, and available actions.
3. **Given** the user is viewing the SPEC tab and scrolled halfway down, **When** they switch to Review and back, **Then** the SPEC tab scroll position is preserved.
4. **Given** an unlinked PR is selected, **When** the right pane renders, **Then** only the Review tab is available; Overview and SPEC tabs are hidden.
5. **Given** no issue is selected, **When** the right pane renders, **Then** a centered "Select an issue from the list" message is displayed.

---

### User Story 3 - Manage Agent Sessions from the Issue View (Priority: P1)

A developer monitors and controls agent sessions directly from the issue's Overview tab. They can see all sessions linked to the issue, their statuses, and token usage. When a session needs tool approval, the developer can approve it without leaving their current context. They can start new sessions, send prompts, steer working sessions, or abort them.

**Why this priority**: Session management is the core interaction loop for spec-driven development. Agents do the implementation work; the developer's job is to supervise, approve, and steer. If this is cumbersome, the entire async orchestration model fails.

**Independent Test**: Can be tested by creating a session for an issue, verifying it appears in the sessions list with correct status and controls, then performing approval/prompt/abort actions.

**Acceptance Scenarios**:

1. **Given** an issue with two linked sessions (one working, one idle), **When** the user views the Overview tab, **Then** both sessions appear in a table with name, status (color-coded), relative start time, and token count.
2. **Given** a session in "approval" status, **When** the user presses `a`, **Then** the pending tool call is approved and the session resumes.
3. **Given** no sessions exist for the selected issue, **When** the user views the sessions section, **Then** "No sessions. Press `n` to start one." is displayed.
4. **Given** a session row is focused, **When** the user presses `Enter`, **Then** a full-screen session detail overlay opens showing the conversation, streaming output, and controls.
5. **Given** multiple sessions across different issues need approval simultaneously, **When** the developer views the issue list, **Then** all such issues appear in the Attention section with `apprvl` badges, and the status bar shows the count.

---

### User Story 4 - Review Pull Requests Inline (Priority: P2)

A developer switches to the Review tab for an issue and sees the associated PR's metadata, an AI-generated review summary (if available), and the full syntax-colored diff. They can approve the PR, post comments, or launch a review agent session without leaving the TUI.

**Why this priority**: Code review is the terminal step before merge. Keeping it inside the issue context reduces context-switching to GitHub and ensures the developer reviews with full awareness of the spec and session history.

**Independent Test**: Can be tested by viewing the Review tab for an issue with a linked PR, verifying metadata/diff rendering, and performing approve/comment actions.

**Acceptance Scenarios**:

1. **Given** an issue with an open PR, **When** the user views the Review tab, **Then** PR metadata (number, title, author, state, branch, CI status, review decision, URL) is displayed, followed by the review summary (if any), followed by the syntax-colored diff.
2. **Given** a PR diff exceeding 1000 lines, **When** the diff section renders, **Then** a file-index summary appears at the top listing changed files with additions/deletions counts.
3. **Given** no PR exists for the issue, **When** the Review tab is viewed, **Then** a centered message "No pull request. Press `/` > Create PR to open one." is displayed.
4. **Given** a PR with CI failure, **When** the issue list renders, **Then** the issue shows a `ci:fail` badge (unless a higher-priority status applies).

---

### User Story 5 - Execute Actions via Command Palette (Priority: P2)

A developer presses `/` to open a centered command palette overlay with fuzzy search. Actions are grouped by category (Issue, Session, PR, Spec, Worktree, Global) and filtered by the current context -- only actions whose conditions are met appear. The developer can quickly find and execute any action without memorizing keybindings.

**Why this priority**: The command palette is the universal action gateway. It makes the application discoverable and accessible beyond keyboard shortcuts, especially for infrequent actions.

**Independent Test**: Can be tested by opening the palette in various contexts and verifying correct action filtering, fuzzy search, and execution.

**Acceptance Scenarios**:

1. **Given** the user presses `/`, **When** the command palette opens, **Then** it shows contextual actions grouped by category, with the currently selected issue providing context.
2. **Given** the palette is open, **When** the user types "refine", **Then** the action list filters by fuzzy match to show "Refine ticket" (and any other matching actions).
3. **Given** no spec exists for the selected issue, **When** the palette opens, **Then** "Draft spec" appears but "Approve spec" does not.
4. **Given** the palette is open, **When** the user presses `Escape`, **Then** the palette closes without executing any action.

---

### User Story 6 - View and Act on Specifications (Priority: P2)

A developer switches to the SPEC tab and reads the full technical specification for the issue. If the spec is pending approval, a prominent banner invites them to approve or deny. They can open the spec in the browser for editing, or refresh content after external changes.

**Why this priority**: Specs drive the entire development workflow. The ability to read, approve, and manage specs within the issue context keeps the developer in flow.

**Independent Test**: Can be tested by viewing the SPEC tab for an issue with a linked spec and performing approve/deny/refresh actions.

**Acceptance Scenarios**:

1. **Given** an issue with an approved spec, **When** the SPEC tab is viewed, **Then** the spec title, status (green "approved"), last updated time, and full formatted content are displayed.
2. **Given** a spec in "pending" status, **When** the SPEC tab is viewed, **Then** a yellow banner reads "This spec is pending approval. Press `a` to approve, `x` to deny."
3. **Given** no spec is linked, **When** the SPEC tab is viewed, **Then** "No spec for this issue. Press `/` > Draft Spec to create one." is displayed.
4. **Given** the user presses `a` on a pending spec, **When** the action completes, **Then** the spec status changes to "approved" and the status badge updates.

---

### User Story 7 - Responsive Layout Across Terminal Sizes (Priority: P3)

A developer uses Specstar on terminals of various sizes. The layout adapts: side-by-side master-detail above 80 columns, a compressed left pane between 60-80 columns, and a stacked vertical layout below 60 columns. Resizing the terminal mid-use preserves scroll positions and selection state.

**Why this priority**: Developers work in varied environments -- tiled window managers, split tmux panes, remote SSH sessions. The TUI must be functional in all of them, but this is a fit-and-finish concern after core features work.

**Independent Test**: Can be tested by resizing the terminal to various widths and verifying layout transitions, content re-wrapping, and state preservation.

**Acceptance Scenarios**:

1. **Given** a terminal of 120 columns, **When** the layout renders, **Then** the left pane takes 30-35% width (min 28, max 50 columns) and the right pane takes the remainder.
2. **Given** a terminal is resized from 100 columns to 55 columns, **When** the resize completes, **Then** the layout switches to stacked vertical mode (list top 40%, detail bottom 60%) and the selected issue and scroll positions are preserved.
3. **Given** the terminal is resized back from 55 to 100 columns, **Then** side-by-side mode is restored.

---

### Edge Cases

- What happens when the Linear API is unreachable? The issue list shows "Linear: connection error (r to retry)" and cached data remains visible.
- What happens when the selected issue disappears from filter results mid-session? Selection moves to the nearest neighbor; a toast notification informs the user.
- What happens when a session completes while the user is viewing a different tab? The status badge updates in the issue list, the Overview tab's sessions section updates, and a toast notification appears -- but no forced tab switch occurs.
- What happens when multiple sessions for the same issue need approval? All are listed in the sessions section; the issue's badge shows `apprvl` (highest urgency). The user can approve each independently.
- What happens when no integrations are configured? Left pane shows setup instructions; status bar reflects "No integrations."
- What happens when the diff fails to load? The Review tab shows metadata but the diff section displays "Failed to load diff. Press `r` to retry."
- What happens when multiple PRs exist for one branch? The most recent PR is shown with a note: "N other PRs exist for this branch."

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display issues in a master-detail layout with an issue list (left pane) and issue detail (right pane) visible simultaneously at all times.
- **FR-002**: System MUST group issues into four sections -- Attention, Active, Backlog, and Unlinked -- based on defined criteria and sort rules. Sections with zero items MUST be hidden.
- **FR-003**: System MUST display a status badge for each issue reflecting its most urgent state, following the defined priority order: `apprvl` > `error` > `done` > `wrkng` > `review` > `ci:fail` > `spec` > remaining.
- **FR-004**: System MUST support three tabs in the detail pane -- Overview, SPEC, and Review -- with independent scroll positions preserved when switching.
- **FR-005**: The Overview tab MUST display issue metadata (identifier, state, priority, assignee, branch, worktree status, URL), the full description with formatting, structured requirements/acceptance criteria if present, all linked sessions with status and controls, and a compact activity log of the last 10 events.
- **FR-006**: The SPEC tab MUST display the linked specification document with title, status (color-coded: draft/pending/approved/denied), last updated time, URL, and full formatted content. Users MUST be able to approve, deny, refresh, and open specs externally.
- **FR-007**: The Review tab MUST display the linked PR's metadata, an AI-generated review summary (if available), and the full syntax-colored diff with file-index summary for large diffs (>1000 lines).
- **FR-008**: System MUST provide a command palette (opened with `/`) that shows context-filtered, fuzzy-searchable actions grouped by category. Actions not meeting their conditions MUST be hidden.
- **FR-009**: System MUST support keyboard-driven navigation: `Tab` toggles pane focus, arrow keys / `j`/`k` for selection/scrolling, `h`/`l` or arrow keys for tab switching, number keys `1-3` for direct tab access, and context-specific action keys per tab.
- **FR-010**: System MUST support full-screen overlays for session detail (conversation, streaming output, prompt input, approval controls), input modals (choices, text), and text viewing.
- **FR-011**: System MUST display a status bar showing app name, active session count, attention count (colored red if > 0), and context-sensitive keyboard hints for the focused pane.
- **FR-012**: System MUST fetch and enrich issue data by linking sessions (by branch match), PRs (by branch/identifier match), specs (by issue ID), and worktrees (by branch match).
- **FR-013**: System MUST refresh integration data on configurable polling intervals (default: Linear 30s, GitHub 30s, Worktrees 10s, Notion 60s, Sessions event-driven) and only re-render on detected changes.
- **FR-014**: System MUST adapt layout based on terminal width: side-by-side above 80 columns, compressed left pane between 60-80 columns, stacked vertical below 60 columns. Terminal resize MUST preserve selection and scroll state.
- **FR-015**: System MUST display non-blocking toast notifications for status changes (session started/completed, filter changes) with type-based styling (success/error/info) and auto-dismiss.
- **FR-016**: System MUST support workflows (Capture Issue, Refine Issue, Draft Spec, Implementation, Review PR, Cycle Planning) launchable from the command palette.
- **FR-017**: System MUST persist cached data locally so the UI renders instantly on startup, with background refresh updating data asynchronously.
- **FR-018**: System MUST preserve issue selection across data refreshes by matching on issue ID. If the selected issue disappears, selection moves to the nearest neighbor with a toast notification.
- **FR-019**: All keyboard bindings MUST be user-configurable through the configuration file.

### Key Entities

- **Issue**: The primary unit of work. Has an identifier, title, description, state, priority, assignee, and branch. Linked to zero or more sessions, zero or one spec, zero or one PR, and zero or one worktree. Sourced from Linear, enriched locally.
- **Session**: An agent execution context linked to an issue by branch. Has a name, status (working/idle/approval/error/shutdown), start time, and token count. Supports prompt input, approval, steering, and abort.
- **Specification (Spec)**: A technical document linked to an issue by ID. Has a title, status (draft/pending/approved/denied), content body, and external URL. Stored in Notion.
- **Pull Request (PR)**: A code change linked to an issue by branch. Has a number, title, author, state, branch mapping, CI status, review decision, diff, and external URL. Sourced from GitHub.
- **Worktree**: A local git working tree linked to an issue by branch. Has a path and clean/dirty status.
- **Workflow**: A named pipeline of headless agent sessions. Triggered from the command palette. Types include capture, refine, draft spec, implement, review, and cycle planning.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can identify which issues need their attention within 5 seconds of launching the application.
- **SC-002**: A developer can view the full context of any issue (metadata, spec, PR, sessions) within 2 interactions (select issue + optional tab switch) and under 3 seconds.
- **SC-003**: A developer can approve a pending session tool call within 3 interactions (select issue, view session, approve) without leaving the TUI.
- **SC-004**: The application remains responsive (input latency under 100ms) with up to 200 issues, 20 concurrent sessions, and 50 PRs loaded simultaneously.
- **SC-005**: Data refreshes complete without visual flicker -- only changed data causes re-rendering.
- **SC-006**: The application is fully usable (all core workflows accessible) on terminals as narrow as 60 columns.
- **SC-007**: A developer can find and execute any available action via the command palette within 5 seconds using fuzzy search.
- **SC-008**: 100% of keyboard navigation paths documented in the design are functional and consistent across all panes, tabs, and overlays.
- **SC-009**: Startup to interactive display takes under 2 seconds when cached data is available.
- **SC-010**: A developer new to Specstar can discover available actions through status bar hints and the command palette without external documentation.

## Assumptions

- The developer has a configured Linear workspace with API access for issue data.
- GitHub integration is available for PR operations (listing, reviewing, approving, diffing).
- Notion API access is available for spec document storage and retrieval.
- The terminal emulator supports basic ANSI escape sequences for colors, bold, and cursor movement.
- Agent sessions are managed by an external session pool accessible locally.
- Git is installed and the project is a git repository with remote configured.
- Configuration follows the existing file discovery chain (`$SPECSTAR_CONFIG_FILE` > XDG > home dir > project-level).
- Industry-standard error handling: user-friendly messages with retry options for transient failures.
- Standard session-based authentication for integrations via API keys stored in configuration.
