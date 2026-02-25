# Research: Issue-Centric TUI

**Feature**: 001-issue-centric-tui
**Date**: 2026-02-25

## Research Topics

### 1. Data Model Migration: Four-Card Grid to Issue-Centric

**Decision**: The Issue is the primary entity. All other entities (Session, PR, Spec, Worktree) are linked to an Issue by branch name or explicit ID. The SQLite schema retains per-service tables (no cross-service foreign keys) but adds computed enrichment at the application layer.

**Rationale**: The original DESIGN.md treated Issues, Sessions, PRs, and Worktrees as peer-level entities displayed in independent cards. The updated design (DESIGN-2.md, spec.md) requires a single entity hierarchy rooted at Issue. Rather than restructuring the database to nest everything under an `issues` table (which would violate service-based data ownership), enrichment is computed at query time by matching on branch identifiers. This preserves independent testability of each integration while supporting the issue-centric view.

**Alternatives considered**:
- **Denormalized issue-centric table**: Single `enriched_issues` table with embedded session/PR/spec data. Rejected because it violates Constitution Principle III (services must own their data) and makes cache invalidation complex.
- **Foreign keys across tables**: `sessions.issue_id`, `pull_requests.issue_id`, etc. Rejected because these relationships are ephemeral (computed by branch matching), not authoritative -- the source of truth for linking is the branch name pattern, not a stored FK.

---

### 2. Issue Section Grouping Algorithm

**Decision**: Issues are sorted into four sections by a pure function `assignSection(issue, sessions, prs, specs) -> Section`. The function is deterministic and testable in isolation.

**Rationale**: The spec defines clear section criteria:
- **Attention**: Has pending approval, error, or completed-needs-review status from linked sessions.
- **Active**: Has running session or open PR; Linear state = In Progress.
- **Backlog**: Linear state = Todo/Backlog/Triage; no active session.
- **Unlinked**: Sessions or PRs not matching any tracked issue.

This is modeled as a pure function taking enriched issue data, not stored state. Section assignment changes reactively when integration data refreshes.

**Alternatives considered**:
- **Stored section column in SQLite**: Rejected because section is derived from multiple data sources; storing it creates a cache invalidation problem and violates single-source-of-truth.
- **Sort at render time only**: Considered but explicit grouping function is better for testing and for the status bar counts.

---

### 3. Status Badge Priority Resolution

**Decision**: A pure function `resolveBadge(issue) -> Badge` computes the most urgent badge from linked artifacts. Priority order: `apprvl` > `error` > `done` > `wrkng` > `review` > `ci:fail` > `spec` > `idle` > `draft` > `ci:pass` > `merged` > `--`.

**Rationale**: The spec (FR-003) defines a strict priority order. Multiple statuses can apply simultaneously (e.g., session working + PR open). The function inspects all linked artifacts and returns the highest-priority badge. This is a pure computation on the enriched issue object.

**Alternatives considered**:
- **Badge as stored column**: Rejected for same reason as section grouping -- derived from multiple sources.
- **Multiple badges displayed**: Considered showing all applicable badges. Rejected because the spec explicitly states "most urgent one wins" and the issue list has limited horizontal space.

---

### 4. Issue Enrichment Strategy

**Decision**: Enrichment is a cross-referencing pass that runs after each refresh cycle. It links integration data to issues by:
- **Session -> Issue**: Session `cwd` matches a worktree path, worktree branch matches issue branch.
- **PR -> Issue**: PR `headRef` matches issue branch, or PR title/branch contains issue identifier (regex: `/^([A-Z]+-\d+)/i`).
- **Spec -> Issue**: Spec `issueId` matches the issue's Linear ID.
- **Worktree -> Issue**: Worktree branch matches issue branch or contains issue identifier.

**Rationale**: Branch-based matching is the standard convention in engineering teams. The identifier extraction regex handles common branch naming patterns (`auth-142`, `AUTH-142-fix-flow`). The enrichment produces an `EnrichedIssue` type that combines `LinearIssue` data with optional linked `WorkerSession[]`, `GithubPR`, `NotionSpec`, and `Worktree`.

**Alternatives considered**:
- **Explicit linking via UI action**: User manually links PR/session to issue. Rejected because it defeats the automation goal; branch naming conventions already provide this.
- **Metadata tagging in external systems**: Store specstar issue IDs in Linear/GitHub/Notion metadata fields. More reliable but requires write access and configuration in each system. Could be a future enhancement.

---

### 5. OpenTUI Solid Layout Pattern for Master-Detail

**Decision**: Use flexbox `<box>` with `flexDirection="row"` as the root layout. Left pane is a `<scrollbox>` with percentage width (30-35%). Right pane is a `<box>` with `flexGrow={1}`. Tab navigation uses `<tab_select>` component. Content switching uses Solid's `<Switch>`/`<Match>`.

**Rationale**: OpenTUI's layout engine is Yoga-based flexbox. The `<scrollbox>` component provides viewport culling for performance with large issue lists. The `<tab_select>` component provides built-in keyboard navigation (Left/Right arrows) with `onChange` callbacks. Solid's fine-grained reactivity means only the changed pane re-renders on data updates.

**Key patterns from research**:
- `useKeyboard(handler)` for global keyboard shortcuts
- `useTerminalDimensions()` for responsive layout breakpoints
- `createSignal()` for selected issue, active tab, pane focus
- `<scrollbox viewportCulling={true}>` for issue list performance
- `<markdown>` component for rendering issue descriptions and spec content
- `<diff>` component for PR diff rendering
- `<code>` component for syntax-highlighted code blocks in specs
- `testRender()` from `@opentui/solid` for headless snapshot testing

**Alternatives considered**:
- **Custom scrolling implementation**: Rejected; OpenTUI's ScrollBox already handles viewport culling, keyboard scroll, and scrollbar rendering.
- **React bindings**: OpenTUI supports both React and Solid. Solid chosen per existing project setup (`@opentui/solid` in package.json) and for fine-grained reactivity advantages in a complex TUI.

---

### 6. Worker Session Actor Pattern

**Decision**: Each agent session runs in a Bun Worker. The main thread communicates via `postMessage`/`onmessage`. The Worker creates an `AgentSession` via `createAgentSession()` from the omp SDK with `SessionManager.create(cwd)` for file-backed persistence. Events are forwarded to the main thread as serialized messages.

**Rationale**: Constitution Principle V requires actors with isolated state communicating via async messages. Bun Workers provide process-level isolation. The omp SDK's `session.subscribe()` provides the event stream. Events are mapped to `WorkerStatus` transitions:

| SDK Event | Worker Status |
|-----------|---------------|
| `createAgentSession()` returns | `starting` -> `idle` |
| `session.prompt()` called | `idle` -> `working` |
| `message_update` with `text_delta` | remains `working` |
| `tool_execution_start` | remains `working` |
| Turn ends (inferred from idle) | `working` -> `idle` |
| Error in handler | any -> `error` |
| `session.dispose()` | any -> `shutdown` |

**Tool approval**: The omp SDK does not have a built-in tool approval mechanism at the SDK level. Tool approval is an extension/UI concern. Specstar will implement approval by:
1. Configuring the session with a custom tool approval handler
2. When a tool needs approval, the worker posts an `approval_needed` message to main thread
3. Main thread surfaces the approval in the UI
4. User approves/rejects, main thread posts response back to worker
5. Worker resolves the approval promise

**Alternatives considered**:
- **RPC mode instead of SDK mode**: The omp SDK supports both in-process (SDK) and cross-process (RPC via stdio JSONL). RPC would provide stronger isolation but adds serialization overhead and complexity. SDK mode in a Worker provides sufficient isolation with simpler API. RPC can be a future option if Worker isolation proves insufficient.
- **Single-threaded sessions**: Running sessions on main thread with async scheduling. Rejected because a misbehaving session would block the TUI render loop (Constitution constraint: main thread must not block on I/O).

---

### 7. SQLite Schema Changes from Original Design

**Decision**: The SQLite schema from DESIGN.md is retained with minimal changes:
1. All six tables preserved: `issues`, `pull_requests`, `worktrees`, `sessions`, `specs`, `memory_entries`.
2. No new tables needed -- the issue-centric view is a computed projection, not stored structure.
3. The `sessions` table gains an `issue_identifier` column (nullable TEXT) for explicit linking when branch matching is ambiguous.
4. The `issues` table gains a `section` column (nullable TEXT) as a cached computation for faster sorting, recomputed on each refresh.

**Rationale**: The original schema was already service-oriented (one table per integration). The issue-centric view is an application-layer concern. Adding explicit linking columns is optional and supplementary to branch matching.

**Alternatives considered**:
- **New `enriched_issues` materialized view**: Rejected because SQLite views don't improve cache performance and add schema complexity.
- **Complete schema redesign around issues**: Rejected because it would couple all services to the issue model, violating service-based architecture.

---

### 8. Configuration Schema Changes

**Decision**: The configuration schema from DESIGN.md is updated per DESIGN-2.md:
- `keybindings` section updated to reflect master-detail navigation (replace `cycleFocusForward`/`cycleFocusBackward` with `togglePane`, add `tabNext`/`tabPrev`, `approve`, `deny`, `newSession`, `comment`, `openExternal`).
- `linear.states` filter array added for issue list filtering.
- All other configuration unchanged.

**Rationale**: The master-detail layout has different navigation semantics (two-pane toggle vs. card grid cycling). The keybinding names must match the new interaction model.

**Alternatives considered**:
- **Backward-compatible keybindings**: Keep old names as aliases. Rejected because this is a greenfield implementation; there are no existing users with custom keybinding configs.

---

### 9. UI Components: Dialog and Toast

**Decision**: Modal UI (command palette, input overlays, confirmations, session detail) uses `@opentui-ui/dialog`. Non-blocking notifications use `@opentui-ui/toast`. Both via their Solid.js adapters.

**Rationale**: The opentui-ui ecosystem provides purpose-built terminal UI primitives that integrate with the OpenTUI rendering pipeline. Using community components avoids reinventing dialog stack management, focus trapping, backdrop rendering, toast queuing, and animation.

**Dialog integration (Solid)**:
- `DialogProvider` wraps the app root with configurable size presets and theme
- `useDialog()` returns `show()`, `close()`, `closeAll()`, `replace()`, plus async methods: `confirm()`, `alert()`, `prompt<T>()`, `choice<K>()`
- `useDialogKeyboard(handler, dialogId)` scopes keyboard events to the topmost dialog in a stack -- critical for nested overlays (e.g., command palette opens a confirmation)
- `useDialogState(selector)` provides reactive dialog state (Solid accessors)
- Size presets: `small` (40 cols), `medium` (60), `large` (80), `full` (terminal width - 4)

**Toast integration (Solid)**:
- `<Toaster position="bottom-right" />` component at app root
- `toast()`, `toast.success()`, `toast.error()`, `toast.warning()`, `toast.info()`, `toast.loading()` callable from anywhere
- `toast.promise()` for async operations with loading/success/error states
- `TOAST_DURATION` presets: `SHORT` (2s), `DEFAULT` (4s), `LONG` (6s), `EXTENDED` (10s), `PERSISTENT` (Infinity)
- `useToasts()` returns reactive accessor for current toast array

**Mapping to existing spec**:
- `command-palette.tsx` -> `useDialog().show()` with size `"large"` and `useDialogKeyboard()` for fuzzy search input
- `input-overlay.tsx` -> `useDialog().prompt<T>()` or `useDialog().choice<K>()`
- `text-overlay.tsx` -> `useDialog().show()` with size `"full"`
- `session-detail.tsx` -> `useDialog().show()` with size `"full"` and custom keyboard handler
- `notification.tsx` -> replaced entirely by `<Toaster />` + `toast.*()` calls
- Tool approval confirmation -> `useDialog().confirm()`

**Alternatives considered**:
- **Custom modal implementation**: Build own backdrop + focus management. Rejected because dialog stacking and focus restoration are error-prone; the library handles edge cases (ESC key, programmatic close, promise resolution on dismiss).
- **Custom toast system**: Build own notification stack. Rejected because toast timing, positioning, stacking modes, and update-in-place are solved problems in the library.

---

### 10. Theme Strategy: Base16 Terminal Colors

**Decision**: Use the user's terminal base16 color palette by default. Allow full theme override via JSON settings. Map base16 slots to semantic color roles.

**Rationale**: Terminal applications inherit the user's color scheme when using ANSI color codes (colors 0-15). Base16 is the de facto standard for terminal color theming, supported by all major terminal emulators and theme frameworks. By default, Specstar should look native in any terminal. Users who want a specific aesthetic (e.g., for screenshots or branding) can override individual semantic colors in settings.

**Base16 to semantic mapping**:

| Semantic Role | Base16 Slot | ANSI | Usage |
|---|---|---|---|
| `background` | base00 | 0 | Primary background |
| `backgroundAlt` | base01 | 18 | Panels, selected items |
| `selection` | base02 | 19 | Active selection highlight |
| `muted` | base03 | 8 | Comments, inactive text |
| `foreground` | base05 | 7 | Primary text |
| `foregroundBright` | base06 | 15 | Headings, emphasis |
| `error` | base08 | 1 | Errors, `apprvl`/`error` badges |
| `warning` | base09 | 3 | Warnings, `ci:fail` badge |
| `success` | base0B | 2 | Success, `done`/`ci:pass` badges |
| `info` | base0D | 4 | Information, links |
| `accent` | base0E | 5 | Active elements, focused borders |
| `secondary` | base0C | 6 | Secondary accent, `spec` badge |

**Override mechanism**: The `theme` section in `config.json` allows overriding any semantic color with a hex value or base16 slot reference. When `theme` is absent or empty, all colors resolve to the terminal's current palette via ANSI codes.

**Alternatives considered**:
- **Hard-coded dark theme**: Ship a specific color palette. Rejected because it clashes with user terminal themes and ignores accessibility preferences (high contrast, light themes).
- **Multiple built-in themes**: Ship 3-4 themes (dark, light, solarized, etc.). Rejected as premature. Base16 inheritance covers 95% of cases. Custom overrides cover the rest.

---

### 11. Configuration Format: JSON with Schema Validation

**Decision**: Configuration files use JSON format (`.json`). A JSON Schema is generated from TypeScript config types via `ts-json-schema-generator` and bundled with the application. Config is validated against the schema at load time.

**Rationale**: JSON is the native serialization format for TypeScript/JavaScript. YAML adds a parser dependency, introduces indentation-sensitivity bugs, and lacks schema tooling parity. JSON Schema provides:
- Editor autocompletion (VS Code, JetBrains, vim-coc) via `$schema` field
- Type-safe validation at load time without hand-written validators
- Self-documenting configuration (descriptions from JSDoc flow into schema)
- Single source of truth: TypeScript types are the authority; schema is derived

**ts-json-schema-generator integration**:
- Dev dependency: `ts-json-schema-generator`
- Build script: `bun run schema` generates `specstar.schema.json` from `src/config.ts` type `SpecstarConfig`
- CLI: `npx ts-json-schema-generator --path src/config.ts --type SpecstarConfig --tsconfig tsconfig.json -o specstar.schema.json`
- Config files include `{ "$schema": "./specstar.schema.json" }` for editor support
- Schema regenerated on build; checked into version control for portability

**File discovery chain (updated from YAML)**:
1. `$SPECSTAR_CONFIG_FILE` -- explicit path override
2. `$XDG_CONFIG_HOME/specstar/config.json` (default: `~/.config/specstar/config.json`)
3. `~/.specstar.json`
4. `.specstar.json` in cwd (project-level)

Merge strategy unchanged: project-level merges onto global. Nested objects shallow-merged; arrays concatenated.

**Alternatives considered**:
- **YAML configuration**: More human-readable for simple cases. Rejected because: (a) YAML parsing is a runtime dependency, (b) YAML has no equivalent of `$schema` for editor autocompletion, (c) YAML's implicit type coercion (e.g., `yes` -> `true`, `3.0` -> `3`) causes subtle bugs, (d) JSON Schema validation tooling is more mature for JSON input.
- **TOML configuration**: Good for flat configs. Rejected because nested config structures (keybindings, integration configs) are awkward in TOML, and JSON Schema tooling does not natively target TOML.
- **Hand-written validation**: Write custom `validateConfig()` function. Rejected because it duplicates type information and drifts from types over time. Schema generation is zero-maintenance.

---

### 12. Agent Skills and Testing Tools

**Decision**: Coding agents activate the `opentui` skill for implementation tasks. Review agents use the `pilotty` skill and `pilotty` CLI for TUI testing. All tests use the `bun` native test runner.

**Rationale**:
- **`opentui` skill**: Provides coding agents with OpenTUI component API knowledge, JSX element reference, layout patterns, and `@opentui/solid` bindings. Without this skill, agents lack context on terminal rendering primitives.
- **`pilotty` skill + CLI**: Pilotty is the TUI testing framework that enables headless visual testing of OpenTUI applications. Review agents use it to verify rendering correctness, layout behavior, and interaction flows. The `pilotty` CLI captures terminal output, replays interactions, and compares snapshots.
- **`bun test`**: Bun's built-in test runner is Jest-compatible with native TypeScript support, snapshot testing, lifecycle hooks, and watch mode. No configuration needed -- it auto-discovers `*.test.ts` and `*.spec.ts` files. Importing from `bun:test` provides `describe`, `test`, `expect`, `beforeEach`, `afterEach`, `mock`, etc.

**Testing stack**:
- Unit tests: `bun test` with `*.test.ts` files in `test/unit/`
- Contract tests: `bun test` with `*.test.ts` files in `test/contract/`
- Integration tests: `bun test` with `*.test.ts` files in `test/integration/`
- TUI rendering tests: `pilotty` CLI for visual snapshot testing
- Component tests: OpenTUI `testRender()` + `renderToString()` for headless component testing

**Alternatives considered**:
- **Vitest**: Feature-rich but adds a dependency when Bun's runner is sufficient and faster (no separate process, native TypeScript).
- **Jest**: Requires `ts-jest` or `babel` transforms. Bun's runner is compatible and zero-config.
- **Manual TUI testing**: Rejected for review agents. Pilotty provides deterministic headless testing that agents can execute without a real terminal.
