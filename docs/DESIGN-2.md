# Specstar -- Product Design Document

Issue-centric TUI for spec-driven development and async agent orchestration.

**Binary**: `specstar` (alias: `ss`)

---

## Design Philosophy

The prior iteration used a four-card grid dashboard: Linear issues, Sessions, GitHub PRs, and Worktrees as parallel panels. This worked for monitoring but created cognitive overhead -- the user had to mentally link an issue to its branch, PR, sessions, and spec across four separate cards.

**This iteration inverts the model.** The issue is the primary object. Everything else -- specs, sessions, PRs, branches, worktrees -- is presented as context within the issue. The user selects an issue and sees its complete lifecycle without switching between cards.

### Principles

1. **Issue as the unit of work.** Every artifact (spec, session, PR, branch) belongs to an issue. The UI reflects this hierarchy.
2. **Master-detail, always visible.** The issue list and detail pane are side-by-side at all times. No full-screen transitions for basic navigation.
3. **Attention floats to the top.** Issues requiring human action (approval, review, errors) are pinned above the rest. No separate notification queue to check.
4. **Tabbed detail reduces scrolling.** Overview, SPEC, and Review are distinct concerns. Tabs prevent a single endless scroll.
5. **Unlinked work is visible, not hidden.** Sessions and PRs that don't belong to a tracked issue appear in a dedicated section so nothing is invisible.

---

## Layout Structure

### Master-Detail

```
+--[ Specstar ]-----------------------------------------------------------+
|                                                                          |
|  Issue List (left pane)        |  Issue Detail (right pane)              |
|  ~30-35% width                 |  ~65-70% width                         |
|                                |                                         |
|  [Attention]                   |  +--[ AUTH-142: Fix auth flow ]-------+ |
|  ! AUTH-142  Fix auth   apprvl |  |                                    | |
|  ! AUTH-150  Rate lim   error  |  |  [ Overview ]  [ SPEC ]  [ Review ]| |
|                                |  |                                    | |
|  [Active]                      |  |  (tab content rendered here)       | |
|  > AUTH-139  Add logs   wrkng  |  |                                    | |
|    AUTH-145  Cache inv  idle   |  |                                    | |
|                                |  |                                    | |
|  [Backlog]                     |  |                                    | |
|    AUTH-138  Update deps  --   |  |                                    | |
|    AUTH-137  Refactor     --   |  |                                    | |
|                                |  |                                    | |
|  [Unlinked]                    |  |                                    | |
|    [PR] #52 fix-typo    open   |  |                                    | |
|    [S] review-misc  idle       |  |                                    | |
|                                |  +------------------------------------+ |
|                                                                          |
|  [ Specstar | 3 active | Tab: focus  /: cmd  Ctrl+Q: quit ]             |
+--------------------------------------------------------------------------+
```

**Proportions:**
- Left pane: 30-35% of terminal width (min 28 columns, max 50 columns).
- Right pane: remaining width.
- Status bar: 1 row, full width, bottom.
- Terminals < 80 columns: left pane collapses to icon+identifier only (e.g., `! AUTH-142`); detail pane gets remaining space.
- Terminals < 60 columns: single-column mode; list and detail are stacked vertically, list takes top 40%, detail takes bottom 60%.

**Pane focus:** One pane is focused at a time. `Tab` toggles focus between left and right pane. The focused pane has a highlighted border. When the right pane is focused, tab-key navigation cycles through the detail tabs.

---

## Left Pane: Issue List

### Data Sources

Issues are pulled from the configured Linear workspace and enriched with local state:
- **Linear API**: identifier, title, description, state, priority, assignee, branch, URL.
- **Local enrichment**: linked session (by branch match), linked PR (by branch match), linked spec (by issue ID in Notion), worktree status.

### Sections

Issues in the list are grouped into four sections, rendered top-to-bottom:

| Section | Criteria | Sort | Visual |
|---------|----------|------|--------|
| **Attention** | Has pending approval, error, or completed-needs-review status | By urgency (approval > error > completed) | `!` prefix, highlighted row |
| **Active** | Has a running session or open PR, state = In Progress | By last activity (most recent first) | Normal rendering |
| **Backlog** | State = Todo, Backlog, or Triage; no active session | By priority (urgent first), then updated_at | Dimmed compared to Active |
| **Unlinked** | Sessions or PRs that don't match any tracked issue | By type (PR first, then sessions) | Badge prefix: `[PR]`, `[S]` |

Section headers are rendered as separator rows with the section name. Sections with zero items are hidden entirely (no empty headers).

### Row Format

Each row shows:

```
[indicator] [identifier]  [title (truncated)]  [status badge]
```

- **Indicator**: `!` for attention, `>` for selected, ` ` otherwise.
- **Identifier**: Issue identifier (e.g., `AUTH-142`) or `[PR] #52` / `[S] session-name` for unlinked items.
- **Title**: Truncated to fit available width, with ellipsis.
- **Status badge**: Short status token reflecting the most relevant state:

| Badge | Meaning |
|-------|---------|
| `apprvl` | A session linked to this issue needs tool approval |
| `error` | A session linked to this issue has errored |
| `done` | Session completed, PR ready for review |
| `wrkng` | Session is actively working |
| `idle` | Session exists but is idle |
| `review` | PR is open and awaiting review |
| `draft` | PR is in draft state |
| `ci:fail` | PR CI is failing |
| `ci:pass` | PR CI passing, no review yet |
| `merged` | PR merged |
| `spec` | Spec drafted, awaiting approval |
| `--` | No active session, PR, or spec |

When multiple statuses apply (e.g., session working + PR open), the most urgent one wins. Priority: `apprvl` > `error` > `done` > `wrkng` > `review` > `ci:fail` > `spec` > remaining.

### Selection Behavior

- Arrow keys (`Up`/`Down` or `k`/`j`) move selection.
- Selection wraps across section boundaries (sections are visual, not navigational barriers).
- Selected row is highlighted with a cursor indicator (`>`).
- Changing selection updates the right pane immediately.
- Selection is preserved across data refreshes by matching on issue ID. If the selected issue disappears (e.g., state changed to Done and filtered out), selection moves to the nearest neighbor.

### Empty States

| Condition | Display |
|-----------|---------|
| No Linear configured | "Linear not configured. Press `/` > Setup" |
| No issues match filters | "No issues found" |
| Linear API error | "Linear: connection error (r to retry)" |
| Loading (first fetch) | "Loading issues..." with spinner |

---

## Right Pane: Issue Detail

The right pane renders the detail view for the currently selected issue in the left pane. It has a title bar and a tabbed content area.

### Title Bar

```
+--[ AUTH-142: Fix authentication flow ]--[ In Progress ]--+
|                                                           |
|  [ Overview ]  [ SPEC ]  [ Review ]                      |
```

- **Title**: Issue identifier + title, truncated if necessary.
- **State badge**: Current Linear state, colored by type (e.g., green for Done, blue for In Progress, gray for Backlog).
- **Tab bar**: Three tabs, the active tab is highlighted/underlined. Inactive tabs are dimmed.

### Tab Navigation

- When the right pane is focused: `Left`/`Right` arrows (or `h`/`l`) switch between tabs.
- `1`, `2`, `3` jump directly to Overview, SPEC, Review tabs.
- Each tab's scroll position is preserved independently when switching tabs.
- `Up`/`Down` (or `j`/`k`) scroll the content within the active tab.

### Unlinked Item Detail

When an unlinked item is selected in the left pane:
- **Unlinked PR**: The right pane shows only the Review tab content (PR metadata, diff). Overview and SPEC tabs are disabled/hidden.
- **Unlinked Session**: The right pane shows only the Overview tab with session detail (status, conversation, controls). SPEC and Review tabs are disabled/hidden.

---

## Overview Tab

The Overview tab is the default tab shown when an issue is selected. It presents a vertical layout of sections, each separated by a horizontal rule.

### Sections (top to bottom)

#### 1. Issue Metadata

```
AUTH-142: Fix authentication flow
State: In Progress    Priority: High    Assignee: Alice
Branch: auth-142      Worktree: ../worktrees/auth-142 (clean)
URL: https://linear.app/team/AUTH-142
```

- Single-line key-value pairs.
- Branch and worktree show current status. If no branch exists, shows "No branch".
- Worktree shows `(clean)` or `(dirty)`.

#### 2. Description

The full issue description rendered as formatted text. Markdown formatting is applied where the terminal supports it (bold, lists, code blocks). Long descriptions are scrollable.

#### 3. Requirements & Acceptance Criteria

If the issue description contains structured requirements or ACs (detected by header patterns like `## Requirements`, `## ACs`, `## Acceptance Criteria`, or list items after such headers), they are extracted and rendered as a checklist:

```
Requirements:
  [ ] Must use Redis-backed sliding window
  [ ] 100 req/min per IP default, configurable
  [ ] Return 429 with Retry-After header

Acceptance Criteria:
  [ ] Unit tests for rate limiter middleware
  [ ] Integration test with Redis
  [ ] Documentation updated
```

If no structured requirements are found, this section is omitted and the description is shown as-is.

#### 4. Sessions

Lists all agent sessions linked to this issue (matched by branch name or explicit issue ID):

```
Sessions:
  Name          Status    Started         Tokens
  auth-142      working   12m ago         45.2k
  refine-142    idle      2h ago          12.1k

  [Enter: open session]  [n: new session]  [a: approve]
```

- Table format with columns: Name, Status (colored), Started (relative time), Tokens.
- Status is colored: `working` = yellow, `idle` = dim, `approval` = red pulsing, `error` = red, `shutdown` = gray.
- A hint line below shows available actions for the selected session.
- If no sessions exist: "No sessions. Press `n` to start one."

**Session interaction within Overview:**
- When the sessions section is focused and `Enter` is pressed on a session row, the session detail overlay opens (full-screen overlay with conversation, prompt input, and approval controls -- same as the prior iteration's `SessionDetail`).
- `n` spawns a new session for this issue.
- `a` approves a pending tool call (if the selected session is in `approval` status).

#### 5. Activity Log (compact)

A condensed timeline of recent activity across all linked artifacts:

```
Activity:
  2m ago   Session auth-142 completed implementation
  15m ago  CI passed on PR #52
  1h ago   PR #52 opened by agent
  3h ago   Spec approved
  1d ago   Issue refined by agent
```

- Last 10 events, most recent first.
- Events sourced from: session status changes, PR state changes, spec status changes, Linear state changes.
- Scrollable if more than visible area.

### Overview Tab States

| State | Rendering |
|-------|-----------|
| **Issue with full data** | All sections populated |
| **Issue with sparse data** | Description shows raw text; Requirements section hidden; Sessions shows "No sessions" |
| **Issue loading detail** | Skeleton/placeholder for description while fetching full issue from Linear API |
| **Unlinked session selected** | Shows session detail inline: status, conversation preview, controls. Other sections hidden |
| **No issue selected** | "Select an issue from the list" centered message |

---

## SPEC Tab

The SPEC tab shows the technical specification associated with the issue. Specs are stored in Notion and linked to issues via the `spec_doc_id` relationship.

### Layout

```
+--[ SPEC: AUTH-142 Rate Limiting Specification ]--------+
|                                                         |
|  Status: approved       Last updated: 2h ago            |
|  Notion: https://notion.so/...                          |
|                                                         |
|  ─────────────────────────────────────────────────────  |
|                                                         |
|  ## System Design                                       |
|                                                         |
|  Rate limiting middleware sits between the auth          |
|  router and the handler chain. Uses Redis sorted         |
|  sets with sliding window algorithm.                     |
|                                                         |
|  ### Data Model                                          |
|                                                         |
|  Redis key: `rate:{ip}:{endpoint}`                       |
|  Value: sorted set of request timestamps                 |
|  TTL: window size (60s default)                          |
|                                                         |
|  ### API Contract                                        |
|                                                         |
|  ```typescript                                           |
|  interface RateLimitConfig {                              |
|    windowMs: number;                                      |
|    maxRequests: number;                                   |
|    keyGenerator: (req: Request) => string;                |
|  }                                                       |
|  ```                                                     |
|                                                         |
|  (scrollable)                                            |
+---------------------------------------------------------+
```

### Header

- **Title**: Spec document title from Notion.
- **Status**: `draft` | `pending` | `approved` | `denied`, colored accordingly:
  - `draft` = dim/gray
  - `pending` = yellow
  - `approved` = green
  - `denied` = red
- **Last updated**: Relative timestamp.
- **Notion URL**: Clickable (terminals supporting OSC 8 hyperlinks) or copyable.

### Content

The spec document body, fetched from Notion and rendered as formatted text. Markdown-like formatting:
- Headers (`##`, `###`) rendered with bold/color.
- Code blocks rendered with background color or indent.
- Lists rendered with bullets/numbers.
- The content is scrollable with `Up`/`Down` or `j`/`k`.

### SPEC Tab States

| State | Rendering |
|-------|-----------|
| **Spec exists and loaded** | Full content rendered with header |
| **Spec exists, loading** | Header with status, body shows "Loading spec content..." |
| **Spec exists, load failed** | Header with status, body shows "Failed to load spec. Press `r` to retry." |
| **No spec linked** | Centered message: "No spec for this issue. Press `/` > Draft Spec to create one." |
| **Notion not configured** | "Notion not configured. Press `/` > Setup" |
| **Spec pending approval** | Yellow banner at top: "This spec is pending approval. Press `a` to approve, `x` to deny." |

### SPEC Tab Actions

| Key | Action | Condition |
|-----|--------|-----------|
| `a` | Approve spec | Spec status = `pending` |
| `x` | Deny spec | Spec status = `pending` |
| `e` | Open spec in browser (Notion) | Spec exists |
| `r` | Refresh/reload spec content | Spec exists |
| `d` | Draft spec (command palette) | No spec exists |

---

## Review Tab

The Review tab presents the pull request associated with the issue's branch. It renders as a single scrollable view with three sections stacked vertically.

### Layout

```
+--[ Review: PR #52 -- Add rate limiting ]---------------+
|                                                         |
|  ┌─ PR Metadata ──────────────────────────────────────┐ |
|  │ PR #52: Add rate limiting to /api/auth              │ |
|  │ Author: agent (auth-142)    State: open             │ |
|  │ Branch: auth-142 -> main                            │ |
|  │ CI: pass  ✓    Review: review_required              │ |
|  │ URL: https://github.com/org/repo/pull/52            │ |
|  └─────────────────────────────────────────────────────┘ |
|                                                         |
|  ┌─ Review Summary ───────────────────────────────────┐ |
|  │ AI-generated review summary from the review agent   │ |
|  │ session, if one has run. Key findings:              │ |
|  │                                                     │ |
|  │ - Rate limiter uses sorted sets correctly            │ |
|  │ - Missing edge case: IPv6 normalization              │ |
|  │ - Test coverage: 87% of new code                     │ |
|  │ - Spec compliance: 5/5 requirements met              │ |
|  └─────────────────────────────────────────────────────┘ |
|                                                         |
|  ┌─ Diff ─────────────────────────────────────────────┐ |
|  │ src/middleware/rate-limit.ts  (+142, -0)             │ |
|  │ ────────────────────────────────────────────────     │ |
|  │ + import { Redis } from "../clients/redis";          │ |
|  │ + import type { RateLimitConfig } from "./types";    │ |
|  │ +                                                    │ |
|  │ + export function createRateLimiter(                  │ |
|  │ +   config: RateLimitConfig                           │ |
|  │ + ): Middleware {                                     │ |
|  │ +   ...                                               │ |
|  │                                                     │ |
|  │ (scrollable, syntax-colored diff)                    │ |
|  └─────────────────────────────────────────────────────┘ |
|                                                         |
+---------------------------------------------------------+
```

### Section 1: PR Metadata

A compact card showing:
- **PR number and title**
- **Author**: GitHub username or `agent (<session-name>)` if created by a specstar session.
- **State**: `open` | `draft` | `closed` | `merged`, colored:
  - `open` = green
  - `draft` = yellow
  - `closed` = red
  - `merged` = purple
- **Branch**: `<head> -> <base>` (e.g., `auth-142 -> main`)
- **CI status**: `pass` (green checkmark), `fail` (red X), `pending` (yellow spinner), `none` (gray dash)
- **Review decision**: `approved` (green), `changes_requested` (red), `review_required` (yellow), `null` (gray "no reviews")
- **URL**: Hyperlinked or copyable.

### Section 2: Review Summary

The output of a review agent session, if one has been run. This is stored as a session artifact.

| State | Rendering |
|-------|-----------|
| **Review session completed** | Formatted summary text |
| **Review session running** | "Review in progress..." with a spinner |
| **No review session** | "No review yet. Press `/` > Review PR to start one." |
| **Review session errored** | "Review failed. Press `/` > Review PR to retry." |

### Section 3: Diff

The PR diff fetched via `gh pr diff`. Rendered with syntax-aware coloring:
- Added lines: green with `+` prefix.
- Removed lines: red with `-` prefix.
- Context lines: default color.
- File headers: bold, highlighted.
- Hunk headers (`@@`): dim cyan.

The diff is the largest section and scrollable. If the diff is very large (>1000 lines), a file-index summary is shown at the top:

```
Files changed (7):
  M src/middleware/rate-limit.ts      +142 -0
  M src/middleware/index.ts           +3   -0
  A src/middleware/rate-limit.test.ts +89  -0
  M src/config/defaults.ts           +5   -1
  ...
```

### Review Tab States

| State | Rendering |
|-------|-----------|
| **PR exists with full data** | All three sections populated |
| **PR exists, diff loading** | Metadata shown, diff shows "Loading diff..." |
| **PR exists, diff failed** | Metadata shown, diff shows "Failed to load diff. Press `r` to retry." |
| **No PR for this issue** | Centered: "No pull request. Press `/` > Create PR to open one." |
| **GitHub not configured** | "GitHub not configured. Press `/` > Setup" |
| **Multiple PRs** | Show most recent PR. Note at bottom: "2 other PRs exist for this branch." (future: PR selector) |

### Review Tab Actions

| Key | Action | Condition |
|-----|--------|-----------|
| `a` | Approve PR | PR state = open, review_decision != approved |
| `c` | Comment on PR | PR exists |
| `e` | Open PR in browser | PR exists |
| `r` | Refresh PR data + diff | PR exists |
| `v` | Start review session | PR exists, no review session running |

---

## Status Bar

The status bar is a single row at the bottom of the terminal, always visible.

```
[ Specstar | 3 active | 1 needs attention | Tab: pane  /: cmd  Ctrl+Q: quit ]
```

### Segments

| Segment | Content |
|---------|---------|
| **App name** | "Specstar", colored cyan |
| **Active count** | Number of issues with running sessions (e.g., "3 active") |
| **Attention count** | Number of issues in the Attention section (e.g., "1 needs attention"), colored red if > 0 |
| **Shortcuts** | Context-sensitive hints for the focused pane |

### Context-Sensitive Shortcuts

| Focus | Hints |
|-------|-------|
| Left pane | `Tab: detail  /: cmd  j/k: select  Enter: actions` |
| Right pane (Overview) | `Tab: list  1-3: tab  n: new session  /: cmd` |
| Right pane (SPEC) | `Tab: list  1-3: tab  a: approve  r: refresh` |
| Right pane (Review) | `Tab: list  1-3: tab  a: approve  c: comment  r: refresh` |

---

## Command Palette

Opened with `/` from any context. Renders as a centered overlay (60% width, 70% height) with fuzzy search.

### Structure

```
+--[ Command Palette ]------------------------------------+
|                                                          |
|  > refine_                                               |
|                                                          |
|  Issue: AUTH-142                                         |
|    Refine ticket         Rewrite with codebase context   |
|    Draft spec            Generate technical spec         |
|    Start worker          Create worktree + session       |
|    Change state          Update Linear issue state       |
|    Open in browser       Open Linear issue URL           |
|                                                          |
|  Session: auth-142                                       |
|    Open session          View session conversation       |
|    Send prompt           Quick prompt to session         |
|    Steer                 Interrupt with instruction      |
|    Approve               Approve pending tool call       |
|    Abort                 Stop current operation          |
|    Shutdown              Terminate session               |
|                                                          |
|  Global                                                  |
|    Capture issue         Quick issue creation            |
|    New session           Create unlinked session         |
|    Run workflow          Execute a workflow pipeline     |
|    Setup                 Configure integrations          |
|    Refresh all           Force-refresh all data          |
|    Quit                  Shutdown and exit                |
|                                                          |
+---------------------------------------------------------+
```

### Action Categories

Actions are grouped by category and filtered based on the current context (selected issue, selected session, focused tab).

**Issue Actions** (when an issue is selected):

| Action | Description | Condition |
|--------|-------------|-----------|
| Refine ticket | Spawn session to rewrite with codebase context | Issue selected |
| Draft spec | Spawn session to generate technical spec | Issue selected, no spec exists |
| Start worker | Create worktree + session for implementation | Issue selected, spec approved or no spec |
| Change state | Update Linear issue state | Issue selected |
| Open in browser | Open Linear URL | Issue selected |
| Create PR | Open PR from issue branch | Branch exists, no PR |

**Session Actions** (when issue has linked sessions):

| Action | Description | Condition |
|--------|-------------|-----------|
| Open session | View full session detail overlay | Session exists |
| Send prompt | Quick prompt input | Session status = idle |
| Steer | Send steering instruction | Session status = working |
| Approve | Approve pending tool call | Session status = approval |
| Reject | Reject pending tool call | Session status = approval |
| Abort | Abort current operation | Session status = working |
| Shutdown | Terminate session | Session exists |

**PR Actions** (when issue has linked PR):

| Action | Description | Condition |
|--------|-------------|-----------|
| Review PR | Spawn review agent session | PR exists |
| Approve PR | Approve via `gh pr review` | PR open |
| Comment | Post comment on PR | PR exists |
| View diff | Open diff in scrollable overlay | PR exists |
| Open in browser | Open GitHub PR URL | PR exists |

**Spec Actions** (when issue has linked spec):

| Action | Description | Condition |
|--------|-------------|-----------|
| Approve spec | Set spec status to approved | Spec status = pending |
| Deny spec | Set spec status to denied | Spec status = pending |
| Open in Notion | Open Notion page URL | Spec exists |
| Refresh spec | Reload spec content | Spec exists |

**Worktree Actions** (when issue has linked worktree):

| Action | Description | Condition |
|--------|-------------|-----------|
| Sync worktree | `git pull --rebase` | Worktree exists |
| Delete worktree | Shut down session + remove worktree | Worktree exists |

**Global Actions** (always available):

| Action | Description |
|--------|-------------|
| Capture issue | Quick issue creation with codebase context |
| New session | Create a blank unlinked session |
| Run workflow | Select and launch a workflow pipeline |
| Plan cycle | Run cycle planning workflow |
| Setup | Interactive configuration wizard |
| Refresh all | Force-refresh all integrations |
| Quit | Shutdown all sessions and exit |

### Palette Behavior

- Typing filters actions by fuzzy match on label.
- `Up`/`Down` navigate filtered results.
- `Enter` executes selected action and closes palette (unless action opens a sub-overlay).
- `Escape` or `/` closes palette without action.
- Actions not meeting their condition are hidden, not grayed out.

---

## Overlays

Overlays render on top of the master-detail layout and capture all keyboard input while active. `Escape` always closes the topmost overlay.

### Session Detail Overlay

Full-screen overlay showing a single session's conversation, streaming output, and controls. Same as the prior iteration.

```
+--[ Session: auth-142 ]--[ working ]---------------------+
|                                                          |
|  (scrollable conversation log)                           |
|                                                          |
|  Agent: I'll implement the rate limiting middleware      |
|  following the spec. Let me start by reading the         |
|  existing auth module...                                 |
|                                                          |
|  [Tool: read_file] src/middleware/auth.ts                |
|  [Tool: write_file] src/middleware/rate-limit.ts         |
|                                                          |
|  Agent: I've created the rate limiter. Let me run        |
|  the tests...                                            |
|                                                          |
|  > [prompt input area]                                   |
|                                                          |
|  Escape: close  Enter: send  Ctrl+A: approve  Ctrl+X: reject  Ctrl+C: abort |
+---------------------------------------------------------+
```

**States:**
- `working`: Streaming output, tool calls appearing in real-time.
- `idle`: Cursor in prompt input, ready for user message.
- `approval`: Tool call highlighted with approve/reject prompt. Pulsing indicator.
- `error`: Error message displayed, prompt available for retry/instruction.
- `shutdown`: "Session ended" message, `Escape` to close.

### Input Overlay

Centered modal for text input or choice selection. Used by actions like "Change state", "Send prompt", "Comment on PR".

```
+--[ Change State: AUTH-142 ]--------+
|                                     |
|  > Backlog                          |
|    Todo                             |
|    In Progress                      |
|    Done                             |
|    Cancelled                        |
|                                     |
|  Enter: select  Escape: cancel      |
+-------------------------------------+
```

### Text Overlay

Full-screen scrollable text viewer. Used for viewing diffs outside the Review tab, log files, workflow output.

### Notification Toasts

Non-blocking toast messages that appear in the top-right corner and auto-dismiss after a timeout.

```
  +------------------------------------+
  | ✓ Session "auth-142" started (3s)  |
  +------------------------------------+
```

Types: `success` (green), `error` (red, longer timeout), `info` (blue).

---

## Keyboard Navigation

### Global Keys (always active, not captured by overlays)

| Key | Action |
|-----|--------|
| `Ctrl+Q` | Quit (shutdown all sessions, exit) |
| `Ctrl+R` | Refresh all integration data |

### Pane Keys (when no overlay is active)

| Key | Action |
|-----|--------|
| `Tab` | Toggle focus between left pane and right pane |
| `/` | Open command palette |

### Left Pane Keys (when left pane is focused)

| Key | Action |
|-----|--------|
| `Up` / `k` | Select previous issue |
| `Down` / `j` | Select next issue |
| `Enter` | Open command palette with issue context |
| `r` | Refresh issue data |
| `n` | Quick: start new session for selected issue |

### Right Pane Keys (when right pane is focused)

| Key | Action |
|-----|--------|
| `Left` / `h` | Switch to previous tab |
| `Right` / `l` | Switch to next tab |
| `1` | Jump to Overview tab |
| `2` | Jump to SPEC tab |
| `3` | Jump to Review tab |
| `Up` / `k` | Scroll tab content up |
| `Down` / `j` | Scroll tab content down |
| `Enter` | Primary action for focused element (e.g., open session from Overview) |

### Tab-Specific Keys

| Tab | Key | Action |
|-----|-----|--------|
| Overview | `n` | New session for this issue |
| Overview | `a` | Approve pending session tool call |
| SPEC | `a` | Approve spec |
| SPEC | `x` | Deny spec |
| SPEC | `e` | Open spec in Notion |
| Review | `a` | Approve PR |
| Review | `c` | Comment on PR |
| Review | `e` | Open PR in browser |
| Review | `v` | Start review session |

### Overlay Keys

| Overlay | Key | Action |
|---------|-----|--------|
| All overlays | `Escape` | Close overlay |
| Session Detail | `Enter` | Send prompt |
| Session Detail | `Ctrl+A` | Approve tool call |
| Session Detail | `Ctrl+X` | Reject tool call |
| Session Detail | `Ctrl+C` | Abort operation |
| Session Detail | `Up`/`Down` | Scroll conversation |
| Command Palette | Typing | Filter actions |
| Command Palette | `Up`/`Down` | Navigate actions |
| Command Palette | `Enter` | Execute action |
| Input Overlay | `Enter` | Submit |
| Input Overlay | `Up`/`Down` | Navigate choices |
| Text Overlay | `Up`/`Down` | Scroll |
| Text Overlay | `g` / `G` | Jump to top / bottom |

All keys are configurable via `config.keybindings`.

---

## Data Lifecycle and Refresh

### Startup Sequence

1. Load configuration (config files, env vars).
2. Initialize integrations (Linear client, GitHub client, Notion client, worktree manager).
3. Load cached data from SQLite for instant display.
4. Render initial UI with cached data.
5. Begin first full refresh cycle (async, UI updates as data arrives).
6. Start polling timers.

### Refresh Cycle

A refresh cycle fetches data from all configured integrations in parallel:

```
refresh()
  -> Linear: getIssues()     -> cache.update() -> if changed: update issue list signal
  -> GitHub: listPRs()       -> cache.update() -> if changed: update PR data signal
  -> GitHub: listWorktrees() -> enrich()       -> update worktree data signal
  -> Notion: listSpecs()     -> cache.update() -> if changed: update spec data signal
  -> SessionPool: list()     -> update session data signal
  -> Enrich issues with linked sessions, PRs, specs, worktrees
  -> Re-sort issue list into sections
  -> Re-render affected components
```

**Enrichment** is the process of linking integration data to issues:
- **Session -> Issue**: Session's `cwd` matches a worktree, worktree's branch matches an issue's branch.
- **PR -> Issue**: PR's `headRef` matches an issue's branch, or PR title/branch contains the issue identifier.
- **Spec -> Issue**: Spec's `issueId` field matches the issue ID.
- **Worktree -> Issue**: Worktree branch matches an issue's branch or contains the issue identifier.

### Polling Intervals

| Integration | Default | Configurable |
|-------------|---------|-------------|
| Linear | 30s | `linear.refreshInterval` |
| GitHub PRs | 30s | `github.refreshInterval` |
| Worktrees | 10s | (local, cheap) |
| Notion specs | 60s | `notion.refreshInterval` |
| Sessions | Live | Event-driven, not polled |

### Delta Detection

The integration cache compares incoming data with cached data by serialized JSON comparison per key. Only when changes are detected does the UI re-render. This prevents visual flicker from no-op refreshes.

---

## Configuration

### File Discovery (unchanged from prior iteration)

1. `$SPECSTAR_CONFIG_FILE` environment variable
2. `$XDG_CONFIG_HOME/specstar/config.yml`
3. `~/.specstar.yml`
4. `.specstar.yml` in cwd (project-level, merged on top)

### Schema

```yaml
linear:
  apiKey: "lin_api_..."
  teamId: "TEAM-UUID"
  assignedToMe: true
  refreshInterval: 30

github:
  repo: "owner/repo"        # auto-detected from git remote
  refreshInterval: 30

notion:
  apiKey: "ntn_..."
  databaseId: "..."
  refreshInterval: 60

sessions:
  model: "claude-sonnet"
  thinkingLevel: "high"
  maxConcurrent: 8
  worktreeBase: "../worktrees"

keybindings:
  togglePane: "tab"
  openCommandPalette: "/"
  refreshAll: "ctrl+r"
  quit: "ctrl+q"
  selectUp: "up"
  selectDown: "down"
  primaryAction: "enter"
  tabNext: "right"
  tabPrev: "left"
  approve: "a"
  deny: "x"
  newSession: "n"
  comment: "c"
  openExternal: "e"
  refreshCard: "r"

workflowDirs:
  - "./workflows"
```

### Issue List Filters

The issue list can be filtered by configuration:

```yaml
linear:
  assignedToMe: true          # Show only issues assigned to the authenticated user
  states: ["backlog", "todo", "in_progress"]  # Filter by state
  # OR
  filter: "custom-linear-filter-id"  # Use a saved Linear filter
```

---

## Workflows

Workflows are unchanged from the prior design. They are launched from the command palette and execute as headless agent sessions. The key workflows and how they interact with the new UI:

| Workflow | Trigger | Visible Effect |
|----------|---------|---------------|
| **Capture Issue** | `/` > Capture issue | New issue appears in Backlog section after creation |
| **Refine Issue** | `/` > Refine ticket | Session appears in Overview tab; issue description updates on completion |
| **Draft Spec** | `/` > Draft spec | Session appears in Overview tab; SPEC tab populates on completion |
| **Implementation** | `/` > Start worker | Worktree created, session appears in Overview tab; Review tab populates when PR is created |
| **Review PR** | `/` > Review PR | Review session appears; Review tab summary populates on completion |
| **Cycle Planning** | `/` > Plan cycle | Global workflow, not tied to a specific issue; results shown in a text overlay |

---

## Edge Cases and Special States

### Terminal Resize

- Layout recalculates on `SIGWINCH`.
- Left pane width adjusts proportionally (within min/max bounds).
- Right pane content re-wraps.
- Scroll positions preserved relative to content.
- If terminal shrinks below 60 columns, switch to stacked mode.
- If terminal grows back above 60 columns, restore side-by-side mode.

### No Integrations Configured

If no integrations are configured at all:
- Left pane shows: "No integrations configured. Press `/` > Setup to get started."
- Right pane shows: "Select an issue to see details."
- Status bar: "Specstar | No integrations | /: cmd  Ctrl+Q: quit"

### Multiple Sessions Per Issue

An issue may have multiple sessions (e.g., a refine session, a spec session, and an implementation session). All are listed in the Overview tab's Sessions section. The status badge in the issue list reflects the most urgent session's status.

### Issue Disappears During Selection

If the selected issue is removed from the Linear query results (e.g., state changed to Done and the filter excludes Done):
- Selection moves to the nearest neighbor in the list.
- If the list is now empty, right pane shows the empty state.
- A toast notification: "AUTH-142 no longer matches filters."

### Session Completes While Viewing Another Tab

- The issue's status badge updates in the left pane list immediately.
- If the issue is selected, the Overview tab's Sessions section updates.
- A toast notification appears: "Session auth-142 completed."
- No forced tab switch; the user stays on whatever tab they were viewing.

### Concurrent Approval Requests

If multiple sessions across different issues need approval simultaneously:
- All such issues appear in the Attention section, sorted by timestamp (oldest first).
- The status bar shows the count: "3 need attention".
- No modal interruption; the user can address approvals in any order by selecting the issue and pressing `a` or opening the session detail.
