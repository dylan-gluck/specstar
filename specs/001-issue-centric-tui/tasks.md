# Tasks: Issue-Centric TUI

**Input**: Design documents from `/specs/001-issue-centric-tui/`
**Prerequisites**: plan.md, spec.md, data-model.md, research.md, quickstart.md, contracts/ (8 files)

**Tests**: Not requested. Test tasks are omitted. Add them if TDD is desired.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/` at repository root
- TUI components: `src/tui/`
- Integration clients: `src/integrations/{linear,github,notion}/`
- Session management: `src/sessions/`
- Workflow engine: `src/workflows/`
- Project memory: `src/memory/`
- Tests: `test/{unit,contract,integration}/`
- Scripts: `scripts/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependency installation, and tooling configuration

- [x] T001 Create project directory structure per implementation plan: `src/tui/`, `src/integrations/linear/`, `src/integrations/github/`, `src/integrations/notion/`, `src/sessions/`, `src/workflows/builtins/`, `src/memory/`, `test/unit/`, `test/contract/`, `test/integration/`, `scripts/`
- [x] T002 Initialize Bun TypeScript project with all dependencies in package.json (`@opentui/solid` ^0.1.82, `@opentui-ui/dialog`, `@opentui-ui/toast`, `@oh-my-pi/pi-coding-agent` ^13.2.1, `solid-js` ^1.9.11, `ts-json-schema-generator` as devDep) and configure tsconfig.json with strict mode, JSX preserve, and Bun types
- [x] T003 [P] Configure linting (oxlint) and formatting (oxfmt) with dev scripts in package.json (`lint`, `lint:fix`, `fmt`, `fmt:check`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented. Includes shared types, database layer, configuration, all integration clients, and application shell.

**Why all integration clients are foundational**: User Story 1 requires enrichment with data from ALL integrations (Linear issues, GitHub PRs, Notion specs, worktrees) to compute correct section grouping and status badges. Deferring any integration client would produce incomplete badge/section behavior in the MVP.

**Agent skills**: Activate the `opentui` skill for all implementation tasks in this and subsequent phases.

**Contracts reference**: All service interfaces are defined in `specs/001-issue-centric-tui/contracts/` (cache.ts, config.ts, enrichment.ts, github.ts, linear.ts, notion.ts, session-pool.ts, workflow.ts). Implementations MUST conform to these contracts.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Define shared types, branded type helpers, and state machine types (WorkerStatus, SpecStatus, PRState transitions) in src/types.ts per contracts and data-model.md Section 5
- [ ] T005 [P] Implement SQLite schema with all 6 tables (issues, pull_requests, worktrees, sessions, specs, memory_entries), indexes, migrations, connection management, and generic `IntegrationCache<T>` with delta detection in src/db.ts per data-model.md Section 4 and contracts/cache.ts
- [ ] T006 [P] Implement base16 semantic theme mapping (12 color roles: background, backgroundAlt, selection, muted, foreground, foregroundBright, error, warning, success, info, accent, secondary) with ANSI fallback and hex override support in src/tui/theme.ts per research.md Section 10
- [ ] T007 Implement configuration loading with 4-location file discovery chain ($SPECSTAR_CONFIG_FILE, XDG, ~/.specstar.json, .specstar.json), shallow-merge strategy, and JSON Schema validation in src/config.ts per contracts/config.ts
- [ ] T008 [P] Implement Linear GraphQL client (`getIssues`, `getIssue`, `getStates`, `updateIssue`, `addComment`) and domain types (LinearIssue, LinearState, LinearFilter) in src/integrations/linear/client.ts and src/integrations/linear/types.ts per contracts/linear.ts
- [ ] T009 [P] Implement GitHub PR client via `gh` CLI wrapper (`listPRs`, `getPR`, `createPR`, `comment`, `approvePR`) and domain types (GithubPR, CreatePROptions, Worktree) in src/integrations/github/client.ts and src/integrations/github/types.ts per contracts/github.ts
- [ ] T010 Implement Git worktree manager (`list`, `create`, `remove`, `sync`) using git CLI in src/integrations/github/worktree.ts per contracts/github.ts WorktreeManager interface
- [ ] T011 [P] Implement Notion API client (`listSpecs`, `getSpec`, `createSpec`, `updateSpec`, `setSpecStatus`) and domain types (NotionSpec, SpecStatus) in src/integrations/notion/client.ts and src/integrations/notion/types.ts per contracts/notion.ts
- [ ] T012 [P] Implement project memory JSONL store (`read`, `write`, `search` by category) and types (MemoryEntry) in src/memory/store.ts and src/memory/types.ts per data-model.md Section 1.7
- [ ] T013 Create CLI entry point with arg parsing, configuration loading, terminal setup, and `render()` call in src/index.tsx
- [ ] T014 Create root App component with `<DialogProvider>`, `<Toaster position="bottom-right" />`, Solid signal providers for integration data (issues, PRs, specs, worktrees, sessions), and polling scaffolding (configurable intervals: Linear 30s, GitHub 30s, Worktrees 10s, Notion 60s) in src/app.tsx
- [ ] T015 [P] Create JSON Schema generation script (`ts-json-schema-generator --path src/config.ts --type SpecstarConfig`) with `bun run schema` npm script in scripts/generate-schema.ts
- [ ] T016 [P] Create build script for standalone binary compilation (`Bun.build` with `@opentui/solid/bun-plugin`, target `bun-darwin-arm64`) with `bun run build` npm script in build.ts

**Checkpoint**: Foundation ready -- all integration clients fetch data, cache layer stores/detects deltas, configuration loads and validates, app shell renders. User story implementation can now begin.

---

## Phase 3: User Story 1 -- Browse and Triage Issues at a Glance (Priority: P1) :dart: MVP

**Goal**: Developer opens Specstar and immediately sees all assigned issues organized by urgency. Issues needing human action float to "Attention", active work in "Active", remaining in "Backlog", unlinked artifacts in "Unlinked". Status badges show the most urgent state per issue. Empty sections are hidden.

**Independent Test**: Launch with configured Linear workspace. Verify issues appear grouped into correct sections with accurate status badges. Verify empty sections are hidden. Verify keyboard navigation (j/k) moves selection.

**Entity mapping**: LinearIssue (primary), EnrichedIssue (computed), IssueListModel, UnlinkedItem, StatusBadge, IssueSection -- per data-model.md Sections 1-3 and enrichment contract.

### Implementation for User Story 1

- [ ] T017 [US1] Implement enrichment service with `enrichIssues()`, section classifier (`assignSection` per data-model.md Section 5.4 decision table: 9 rules), badge resolver (`resolveBadge` per Section 6: 12-level priority), identifier extraction regex (`/^([A-Z]+-\d+)/i` with slash-prefix handling), and standalone badge resolvers for unlinked items in src/enrichment.ts per contracts/enrichment.ts
- [ ] T018 [US1] Implement master-detail layout component with flexbox `<box flexDirection="row">`, left pane `<scrollbox>` (30-35% width, min 28, max 50 cols), right pane `<box flexGrow={1}>`, and pane focus state signal in src/tui/layout.tsx
- [ ] T019 [US1] Implement issue list component with 4 section headers (Attention/Active/Backlog/Unlinked), status badge rendering (color-coded per theme), `!` prefix for attention items, `[PR]`/`[S]` prefixes for unlinked items, keyboard navigation (j/k/up/down for selection), empty section hiding, and "No issues found" empty state in src/tui/issue-list.tsx
- [ ] T020 [P] [US1] Implement status bar with app name, active session count, attention count (red when > 0), and context-sensitive keyboard hints for focused pane in src/tui/status-bar.tsx
- [ ] T021 [US1] Wire enrichment pipeline into app root: on each polling refresh, call `enrichIssues()` with latest integration data, update `IssueListModel` signal, preserve selected issue across refreshes by matching on issue ID, show toast on selection displacement in src/app.tsx

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. Issues display in grouped sections with correct badges. Keyboard navigation works. Status bar reflects current state.

---

## Phase 4: User Story 2 -- Inspect Full Issue Context Without Switching Views (Priority: P1)

**Goal**: Developer selects an issue and the right pane instantly populates with the issue's complete lifecycle across three tabs (Overview, SPEC, Review). Tab switching preserves scroll positions. Selecting a different issue updates the right pane immediately.

**Independent Test**: Select an issue with linked sessions, spec, and PR. Verify Overview shows metadata/description/sessions/activity. Switch to SPEC tab, verify spec content displays. Switch to Review tab, verify PR metadata and diff render. Switch back to SPEC, verify scroll position preserved. Select "no issue" state shows placeholder message.

**Entity mapping**: EnrichedIssue drives all three tabs. Overview: LinearIssue + WorkerSession[]. SPEC: NotionSpec. Review: GithubPR.

### Implementation for User Story 2

- [ ] T022 [US2] Implement issue detail container with tab bar (Overview/SPEC/Review), `<Switch>`/`<Match>` content switching, per-tab scroll position preservation via refs, and handling for unlinked items (show only relevant tab) in src/tui/issue-detail.tsx
- [ ] T023 [US2] Implement Overview tab displaying issue metadata (identifier, state, priority, assignee, branch, worktree status, URL), full description via `<markdown>`, structured requirements/acceptance criteria if present, sessions placeholder list, and compact activity log (last 10 events) in src/tui/overview-tab.tsx
- [ ] T024 [P] [US2] Implement SPEC tab displaying spec title, status (color-coded: draft=muted, pending=warning, approved=success, denied=error), last updated time, URL, and full formatted content via `<markdown>`. Show "No spec for this issue. Press `/` > Draft Spec to create one." when no spec linked in src/tui/spec-tab.tsx
- [ ] T025 [P] [US2] Implement Review tab displaying PR metadata (number, title, author, state, branch, CI status, review decision, URL), review summary section (placeholder for AI summary), and syntax-colored diff via `<diff>` component. Show "No pull request. Press `/` > Create PR to open one." when no PR linked in src/tui/review-tab.tsx
- [ ] T026 [US2] Add pane focus toggle (Tab key), direct tab access (keys 1-3), and tab cycling (h/l or left/right arrows) to layout keyboard handling in src/tui/layout.tsx

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. Developers can browse issues and view full context in three tabs.

---

## Phase 5: User Story 3 -- Manage Agent Sessions from the Issue View (Priority: P1)

**Goal**: Developer monitors and controls agent sessions directly from the issue's Overview tab. Sessions show status, token usage. Approval requests are handled inline. New sessions can be started, prompted, steered, or aborted. Full session detail available in a full-screen overlay.

**Independent Test**: Create a session for an issue, verify it appears in sessions list with correct status. Trigger approval, verify inline approval flow works. Open session detail overlay, verify conversation and controls render.

**Entity mapping**: WorkerSession (state machine per data-model.md Section 5.1), SessionPool, WorkerEvent, MainToWorkerMessage, SessionNotification -- per contracts/session-pool.ts.

### Implementation for User Story 3

- [ ] T027 [US3] Implement session pool manager with `spawn()`, `destroy()`, `list()`, `getNotifications()`, `dismiss()`, `shutdownAll()`, `subscribe()`, concurrency limit enforcement, and worker lifecycle management in src/sessions/pool.ts per contracts/session-pool.ts
- [ ] T028 [US3] Implement worker session wrapper creating `AgentSession` via omp SDK in Bun Worker, mapping SDK events to `WorkerEvent` union (status_changed, activity, approval_needed, notification, error, shutdown_complete), handling `MainToWorkerMessage` (prompt, approve, reject, abort, shutdown), and enforcing WorkerStatus state machine transitions in src/sessions/worker.ts
- [ ] T029 [P] [US3] Implement session event types (WorkerEvent, MainToWorkerMessage unions) and event aggregator that collects notifications across all sessions and surfaces them to the UI layer in src/sessions/events.ts
- [ ] T030 [US3] Enhance Overview tab with sessions table (name, color-coded status, relative start time, token count), inline approval flow (press `a` to approve, `x` to reject), "No sessions. Press `n` to start one." empty state, new session creation (press `n`), and Enter to open session detail in src/tui/overview-tab.tsx
- [ ] T031 [US3] Implement session detail full-screen overlay (Dialog size `"full"`) with conversation history, streaming output display, prompt input field, approval controls, abort button, and `useDialogKeyboard()` scoped keyboard handling in src/tui/session-detail.tsx
- [ ] T032 [P] [US3] Implement input overlay for text prompts and choice selection using `useDialog().prompt<T>()` and `useDialog().choice<K>()` with keyboard handling in src/tui/input-overlay.tsx

**Checkpoint**: All three P1 user stories should now be independently functional. Developers can browse issues, view full context, and manage agent sessions.

---

## Phase 6: User Story 4 -- Review Pull Requests Inline (Priority: P2)

**Goal**: Developer views the Review tab and sees PR metadata, AI-generated review summary, and full syntax-colored diff with file-index for large diffs. Can approve, comment, or launch review agent from the tab.

**Independent Test**: View Review tab for issue with linked PR. Verify metadata displays. Verify diff renders with syntax colors. For >1000 line diffs, verify file-index summary appears. Execute approve and comment actions.

**Entity mapping**: GithubPR, PRState -- per contracts/github.ts and data-model.md Section 1.4.

### Implementation for User Story 4

- [ ] T033 [US4] Enhance Review tab with AI review summary section, file-index summary for diffs exceeding 1000 lines (changed files with +/- counts), and PR actions: approve (`a`), comment (`c`), open externally (`e`), refresh (`r`), with toast confirmation on success in src/tui/review-tab.tsx
- [ ] T034 [P] [US4] Implement GitHub PR command palette actions (Create PR, Approve PR, Comment on PR, Open PR in browser, Refresh PRs) with context-aware visibility conditions in src/integrations/github/commands.ts

**Checkpoint**: PR review workflow is fully inline. Developers can review and act on PRs without leaving the TUI.

---

## Phase 7: User Story 5 -- Execute Actions via Command Palette (Priority: P2)

**Goal**: Developer presses `/` to open a centered command palette with fuzzy search. Actions are grouped by category (Issue, Session, PR, Spec, Worktree, Global) and filtered by current context. Workflows (Capture Issue, Refine Issue, Draft Spec, Cycle Planning) are launchable from the palette.

**Independent Test**: Open palette in various contexts. Verify actions filter correctly (e.g., "Approve spec" hidden when no spec exists). Type "refine" and verify fuzzy match. Execute a workflow and verify session spawns.

**Entity mapping**: Workflow, WorkflowDefinition, WorkflowStep, WorkflowContext, WorkflowHandle -- per contracts/workflow.ts and data-model.md Section 1.6.

### Implementation for User Story 5

- [ ] T035 [US5] Implement command palette component (Dialog size `"large"`) with fuzzy search input, categorized action list (Issue, Session, PR, Spec, Worktree, Global), context-sensitive filtering (conditions evaluated against selected issue state), keyboard navigation, and `useDialogKeyboard()` scoped input handling in src/tui/command-palette.tsx
- [ ] T036 [P] [US5] Implement Linear command palette actions (Capture Issue, Refine Ticket, Update Issue State, Add Comment) with context conditions in src/integrations/linear/commands.ts
- [ ] T037 [P] [US5] Implement session command palette actions (New Session, Abort Session, Approve All Pending, Shutdown All) with context conditions in src/sessions/commands.ts
- [ ] T038 [P] [US5] Implement Notion command palette actions (Draft Spec, Refresh Specs, Open Spec in Browser) with context conditions in src/integrations/notion/commands.ts
- [ ] T039 [US5] Implement workflow engine with YAML discovery (4 directories: `.specstar/workflows/`, `~/.omp/agent/workflows/`, `.omp/workflows/`, config `workflowDirs`), definition validation, DAG execution planner (dependency waves), and swarm pipeline bridge in src/workflows/engine.ts, src/workflows/types.ts, and src/workflows/bridge.ts per contracts/workflow.ts
- [ ] T040 [P] [US5] Implement built-in workflow definitions (capture-issue, refine-issue, draft-spec, plan-cycle) as YAML-loadable step pipelines in src/workflows/builtins/capture-issue.ts, src/workflows/builtins/refine-issue.ts, src/workflows/builtins/draft-spec.ts, and src/workflows/builtins/plan-cycle.ts

**Checkpoint**: Command palette is the universal action gateway. All available actions are discoverable and executable via fuzzy search.

---

## Phase 8: User Story 6 -- View and Act on Specifications (Priority: P2)

**Goal**: Developer views the SPEC tab and reads the full technical specification. Pending specs show an approval banner. Developer can approve, deny, refresh, or open specs externally. Status transitions follow the SpecStatus state machine (draft -> pending -> approved/denied, with revise paths).

**Independent Test**: View SPEC tab for issue with pending spec. Verify yellow banner with approve/deny prompt. Press `a` to approve, verify status changes to "approved" (green). Refresh and verify content updates.

**Entity mapping**: NotionSpec, SpecStatus state machine -- per contracts/notion.ts and data-model.md Section 5.2.

### Implementation for User Story 6

- [ ] T041 [US6] Enhance SPEC tab with pending approval banner ("This spec is pending approval. Press `a` to approve, `x` to deny."), approve action (`a` -> `setSpecStatus("approved")`), deny action (`x` -> `setSpecStatus("denied")`), refresh action (`r` -> `getSpec()`), open externally (`e`), and status badge update propagation in src/tui/spec-tab.tsx
- [ ] T042 [P] [US6] Implement scrollable text overlay (Dialog size `"full"`) for full-screen viewing of long spec content, issue descriptions, and other text with keyboard scrolling in src/tui/text-overlay.tsx

**Checkpoint**: Spec workflow is fully inline. Developers can read, approve, deny, and manage specs without leaving the TUI.

---

## Phase 9: User Story 7 -- Responsive Layout Across Terminal Sizes (Priority: P3)

**Goal**: TUI adapts to terminal sizes: side-by-side above 80 cols, compressed left pane between 60-80 cols (identifier + indicator only), stacked vertical below 60 cols (list 40% top, detail 60% bottom). Resizing mid-use preserves selection and scroll state.

**Independent Test**: Resize terminal from 120 to 70 to 55 columns. Verify layout transitions at each breakpoint. Verify selected issue and scroll positions are preserved across transitions.

### Implementation for User Story 7

- [ ] T043 [US7] Implement responsive layout with `useTerminalDimensions()` breakpoint detection (>80: side-by-side with 30-35% left pane; 60-80: compressed left pane showing only indicator and identifier; <60: stacked vertical with list 40% / detail 60%), dynamic flexDirection switching, and selection/scroll state preservation across resize events in src/tui/layout.tsx and src/tui/issue-list.tsx

**Checkpoint**: All user stories should now be independently functional across all supported terminal sizes.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories, hardening, and final validation

- [ ] T044 [P] Add graceful error handling for unreachable APIs: cached data remains visible, status bar shows "[Integration]: connection error (r to retry)", toast notification on connection failure, automatic retry on `r` keypress -- across src/integrations/linear/client.ts, src/integrations/github/client.ts, and src/integrations/notion/client.ts
- [ ] T045 [P] Implement configurable keybinding system: load keybinding overrides from config (SpecstarKeybindings), merge with defaults, validate against schema, and wire into all keyboard handlers in src/app.tsx per contracts/config.ts and FR-019/FR-026
- [ ] T046 [P] Implement delta-based re-rendering: ensure `IntegrationCache.update()` return value gates signal updates, add `viewportCulling={true}` to issue list `<scrollbox>`, and verify no visual flicker on data refresh in src/app.tsx and src/tui/issue-list.tsx
- [ ] T047 [P] Handle edge cases: selected issue disappearing from filter (move to nearest neighbor + toast), multiple PRs for one branch (show most recent + note), diff load failure (show metadata + "Failed to load diff. Press `r` to retry."), no integrations configured (show setup instructions) -- across src/tui/ components
- [ ] T048 Run quickstart.md validation: verify all development commands (`bun run dev`, `bun run fmt`, `bun run lint`, `bun test`), schema generation (`bun run schema`), build (`bun run build`), and configuration file discovery chain work end-to-end

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies -- can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion -- BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational phase completion
- **User Story 2 (Phase 4)**: Depends on US1 (needs layout from T018)
- **User Story 3 (Phase 5)**: Depends on US2 (needs Overview tab from T023)
- **User Story 4 (Phase 6)**: Depends on US2 (needs Review tab from T025)
- **User Story 5 (Phase 7)**: Depends on US3 (workflow execution needs session pool from T027)
- **User Story 6 (Phase 8)**: Depends on US2 (needs SPEC tab from T024)
- **User Story 7 (Phase 9)**: Depends on US2 (needs complete layout from T018 + T026)
- **Polish (Phase 10)**: Depends on all desired user stories being complete

### User Story Dependencies

```
Foundation ──► US1 ──► US2 ──┬──► US3 ──► US5
                             ├──► US4
                             ├──► US6
                             └──► US7
```

- **US1 (P1)**: Foundation only. No story dependencies.
- **US2 (P1)**: US1. Needs master-detail layout and issue list.
- **US3 (P1)**: US2. Needs Overview tab to embed session controls.
- **US4 (P2)**: US2. Enhances Review tab created in US2.
- **US5 (P2)**: US3. Workflow execution spawns sessions via session pool.
- **US6 (P2)**: US2. Enhances SPEC tab created in US2.
- **US7 (P3)**: US2. Modifies layout component from US1/US2.

### Within Each User Story

- Models/types before services
- Services before UI components
- Core implementation before integration wiring
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 2 (Foundational)**: 8 of 13 tasks are parallelizable:

- T005 (db.ts), T006 (theme.ts), T008 (Linear), T009 (GitHub), T011 (Notion), T012 (Memory), T015 (schema script), T016 (build script) can all run in parallel after T004 completes

**Phase 3 (US1)**: T020 (status-bar.tsx) parallel with T019 (issue-list.tsx)

**Phase 4 (US2)**: T024 (spec-tab.tsx) and T025 (review-tab.tsx) parallel with each other

**Phase 5 (US3)**: T029 (events.ts) and T032 (input-overlay.tsx) parallel with other US3 tasks

**Phase 7 (US5)**: T036 (Linear commands), T037 (Session commands), T038 (Notion commands), T040 (built-in workflows) all parallel with each other

**Cross-story parallelism** (with multiple developers after US2 completes):

- Developer A: US3 (session management)
- Developer B: US4 (PR review) + US6 (specifications) -- both enhance US2 tabs
- US4 and US6 can be done in parallel since they modify different files (review-tab.tsx vs spec-tab.tsx)

---

## Parallel Example: User Story 1

```
# After Foundation completes, launch US1 tasks:

# Sequential (enrichment first, then UI):
Task T017: "Implement enrichment service in src/enrichment.ts"

# Then parallel (different files):
Task T018: "Implement layout in src/tui/layout.tsx"
Task T019: "Implement issue list in src/tui/issue-list.tsx"
Task T020: "Implement status bar in src/tui/status-bar.tsx"  [P]

# Finally wire into app:
Task T021: "Wire enrichment pipeline in src/app.tsx"
```

## Parallel Example: Foundational Phase

```
# T004 first (shared types), then launch all parallel tasks:

Task T005: "SQLite schema in src/db.ts"                      [P]
Task T006: "Theme mapping in src/tui/theme.ts"                [P]
Task T008: "Linear client in src/integrations/linear/"        [P]
Task T009: "GitHub client in src/integrations/github/"        [P]
Task T011: "Notion client in src/integrations/notion/"        [P]
Task T012: "Memory store in src/memory/"                      [P]
Task T015: "Schema generation in scripts/generate-schema.ts"  [P]
Task T016: "Build script in build.ts"                         [P]

# Then sequential:
Task T007: "Config loading in src/config.ts"
Task T010: "Worktree manager in src/integrations/github/worktree.ts"
Task T013: "CLI entry point in src/index.tsx"
Task T014: "Root App component in src/app.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL -- blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently -- issues display in grouped sections with correct badges, keyboard navigation works, status bar reflects state
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational -> Foundation ready
2. Add User Story 1 -> Test independently -> Demo (MVP: issue list with badges!)
3. Add User Story 2 -> Test independently -> Demo (full issue context in tabs)
4. Add User Story 3 -> Test independently -> Demo (session management inline)
5. Add User Stories 4+5+6 in parallel -> Test each -> Demo (PR review, command palette, specs)
6. Add User Story 7 -> Test independently -> Demo (responsive layout)
7. Polish phase -> Final validation

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. US1 and US2 are sequential (one developer)
3. Once US2 is done:
   - Developer A: US3 (session management)
   - Developer B: US4 + US6 (PR review + specs -- different files)
4. Once US3 is done:
   - Developer A: US5 (command palette + workflows)
   - Developer C: US7 (responsive layout)
5. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks in the same phase
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Agent skills: `opentui` for implementation, `pilotty` for TUI testing
- All contracts in `specs/001-issue-centric-tui/contracts/` are the source of truth for service interfaces
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
