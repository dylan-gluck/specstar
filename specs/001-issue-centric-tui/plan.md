# Implementation Plan: Issue-Centric TUI

**Branch**: `001-issue-centric-tui` | **Date**: 2026-02-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-issue-centric-tui/spec.md`

## Summary

Replace the four-card grid dashboard (Linear, Sessions, GitHub PRs, Worktrees) with an issue-centric master-detail TUI. The issue becomes the primary object; all related artifacts (specs, sessions, PRs, worktrees) are presented as context within three tabs (Overview, SPEC, Review). Issues are grouped into Attention/Active/Backlog/Unlinked sections with status badges reflecting the most urgent state. The right pane provides full lifecycle visibility without switching views. Agent sessions are managed inline from the issue context.

## Technical Context

**Language/Version**: TypeScript (strict mode) on Bun runtime (latest stable)
**Primary Dependencies**: `@opentui/solid` ^0.1.82 (terminal rendering + Solid bindings), `@opentui-ui/dialog` (modal/dialog UI), `@opentui-ui/toast` (toast notifications), `@oh-my-pi/pi-coding-agent` ^13.2.1 (agent session SDK), `solid-js` ^1.9.11 (reactivity)
**Storage**: Bun SQLite (`.specstar/cache.db`) for integration cache + session tracking; JSONL for project memory (`.specstar/memory/`); JSONL for session logs (managed by omp SDK)
**Testing**: `bun test` (Bun's built-in Jest-compatible test runner; imports from `bun:test`); OpenTUI provides `renderToString` from `@opentui/solid/test` for headless snapshot testing; `pilotty` CLI for visual TUI snapshot testing
**Target Platform**: macOS arm64 (primary, compiled binary via `Bun.build` with `bun-darwin-arm64` target); Linux x64 as secondary
**Project Type**: Standalone terminal application (compiled binary, owns terminal, not an omp extension)
**Performance Goals**: <100ms input latency with 200 issues + 20 sessions + 50 PRs; startup to interactive <2s with warm cache; no visual flicker on data refresh (delta detection)
**Constraints**: Must work on terminals >= 60 columns; no persistent websockets (polling-based integrations); agent sessions are headless (Bun Workers, `hasUI: false`); main thread must not block on I/O
**Scale/Scope**: Up to 200 tracked issues, 20 concurrent agent sessions, 50 PRs; single-user local process; 3 integration backends (Linear, GitHub, Notion)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Contract-First Design

- **Service boundaries identified**: Integration clients (Linear, GitHub, Notion), Session Pool, Workflow Engine, Integration Cache, Worktree Manager, Project Memory Store.
- **Contract artifacts required**: TypeScript interfaces at each boundary before implementation. JSON Schema generation via `ts-json-schema-generator` for structured agent output.
- **Status**: PASS. Contracts will be defined in Phase 1 (`contracts/` directory) before any implementation begins. Each integration client exposes a typed interface; session pool has a typed API; cache layer has a generic typed interface.

### II. Separation of Concerns & SOLID

- **SRP**: TUI components (presentation), integration clients (data fetch), session pool (concurrency management), cache (persistence), workflow engine (orchestration) are distinct modules with single responsibilities.
- **DIP**: High-level TUI components depend on signal-based abstractions, not concrete integration clients. Integration data flows through Solid signals.
- **ISP**: Integration clients expose narrow interfaces per operation (e.g., `getIssues`, `listPRs`), not monolithic client objects.
- **Status**: PASS. The package structure from DESIGN.md already separates `tui/`, `integrations/`, `sessions/`, `workflows/`, `memory/`. Each module has a single responsibility.

### III. Service-Based Architecture

- **Bounded contexts**: Linear integration owns issue data. GitHub integration owns PR/worktree data. Notion integration owns spec data. Session pool owns session lifecycle. Each owns its cache table in SQLite.
- **Data ownership**: No service reads another's storage directly. Enrichment (linking issues to PRs/sessions/specs) happens at the application layer via cross-referencing by branch/identifier.
- **Independent testability**: Each integration client can be tested with mock HTTP responses. Session pool tested with mock agent sessions. Cache tested with in-memory SQLite.
- **Status**: PASS. SQLite tables are per-service (`issues`, `pull_requests`, `worktrees`, `sessions`, `specs`). Cross-references are computed, not stored as foreign keys across service boundaries.

### IV. Explicit State Machines

- **Worker session states**: `starting` | `idle` | `working` | `approval` | `error` | `shutdown` -- finite, closed set with declared transitions.
- **Spec lifecycle**: `draft` | `pending` | `approved` | `denied` -- finite set with guard conditions on transitions.
- **PR state**: `open` | `draft` | `closed` | `merged` -- sourced from GitHub, finite set.
- **Issue section assignment**: Deterministic function `(issue, sessions, prs, specs) -> Attention | Active | Backlog | Unlinked` -- pure computation, testable in isolation.
- **Overlay lifecycle**: Explicit open/close transitions with input capture semantics.
- **Status**: PASS. All stateful entities have enumerated states. Transitions are declared (see data-model.md). No ad-hoc boolean flags.

### V. Event-Driven Actor Model

- **Worker sessions as actors**: Each session runs in a Bun Worker with its own state. Communication via async message passing (postMessage/onmessage). No shared mutable state.
- **Session pool as supervisor**: Manages session lifecycle, enforces concurrency limits, handles failure (error events surfaced as notifications).
- **Event types**: Session events (status change, token update, tool approval request, completion) are immutable, timestamped, self-describing.
- **Integration refresh as events**: Polling results trigger signal updates (effectively events in Solid's reactive system).
- **Status**: PASS. Bun Workers provide process-level actor isolation. omp SDK events are subscribed to via `session.subscribe()` and mapped to immutable status transitions.

### Gate Result: **PASS** -- All five principles satisfied. No violations requiring justification.

### Post-Design Re-Evaluation (Phase 1 Complete)

All Phase 1 artifacts have been produced. Re-checking each principle against the delivered design:

| Principle | Artifact | Verification | Status |
|-----------|----------|--------------|--------|
| I. Contract-First | `contracts/*.ts` (7 files) | Every service boundary has a versioned TypeScript interface with JSDoc. Types are self-contained per file. Branded types for IDs. Discriminated unions for events/errors. | PASS |
| II. SOLID | `contracts/*.ts`, `data-model.md` | Each contract file governs a single bounded context. `enrichment.ts` uses `import type` only from other contracts (composition layer). No concrete dependencies at boundaries. | PASS |
| III. Service-Based | `data-model.md` Section 4 (SQLite schema) | 6 tables, each owned by one service. No cross-table FKs. Enrichment is computed at application layer by branch matching, not stored joins. | PASS |
| IV. Explicit State Machines | `data-model.md` Section 5 | WorkerStatus (6 states, 14 transitions, invalid transitions enumerated). SpecStatus (4 states, 5 transitions). PRState (4 states, observed-only). IssueSection classifier (9-rule decision table). All with guard conditions. | PASS |
| V. Event-Driven Actor | `contracts/session-pool.ts` | `WorkerEvent` union (9 event types). `MainToWorkerCommand` union (5 command types). All events are `readonly`, timestamped, discriminated by `type` field. Worker isolation via Bun Workers. | PASS |

**Post-Design Gate Result: PASS** -- No violations introduced during design phase.

## Project Structure

### Documentation (this feature)

```text
specs/001-issue-centric-tui/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (8 files: linear, github, notion, session-pool, cache, workflow, enrichment, config)
└── tasks.md             # Phase 2 output (NOT created by this command)
```

### Source Code (repository root)

```text
src/
├── index.tsx                     # CLI entry point, render()
├── app.tsx                       # Root component, state provider, signals
├── config.ts                     # Configuration loading, JSON Schema validation
├── types.ts                      # Shared type definitions, branded types
├── db.ts                         # SQLite schema, migrations, queries
│
├── tui/
│   ├── layout.tsx                # Master-detail layout (left/right panes, responsive)
│   ├── issue-list.tsx            # Left pane: issue list with sections
│   ├── issue-detail.tsx          # Right pane: tabbed detail view
│   ├── overview-tab.tsx          # Overview tab (metadata, description, sessions, activity)
│   ├── spec-tab.tsx              # SPEC tab (spec content, approve/deny)
│   ├── review-tab.tsx            # Review tab (PR metadata, review summary, diff)
│   ├── command-palette.tsx        # Modal command palette (Dialog-based, fuzzy search)
│   ├── input-overlay.tsx         # Text input / choice selection (Dialog prompt/choice)
│   ├── text-overlay.tsx          # Scrollable text viewer (Dialog full-screen)
│   ├── session-detail.tsx        # Full-screen session overlay (Dialog full-screen)
│   ├── status-bar.tsx            # Bottom status bar
│   ├── notification.tsx          # Toast notification (Toaster from @opentui-ui/toast/solid)
│   └── theme.ts                  # Base16 theme mapping, semantic color roles
│
├── integrations/
│   ├── linear/
│   │   ├── client.ts             # Linear GraphQL client
│   │   ├── types.ts              # Linear data types
│   │   └── commands.ts           # Linear command palette actions
│   ├── github/
│   │   ├── client.ts             # GitHub client (gh CLI wrapper)
│   │   ├── types.ts              # GitHub data types
│   │   ├── commands.ts           # GitHub PR command palette actions
│   │   └── worktree.ts           # Git worktree management
│   └── notion/
│       ├── client.ts             # Notion API client
│       ├── types.ts              # Notion page/block types
│       └── commands.ts           # Notion command palette actions
│
├── sessions/
│   ├── pool.ts                   # Session pool manager (supervisor)
│   ├── worker.ts                 # Worker session wrapper (Bun Worker actor)
│   ├── events.ts                 # Session event types and aggregator
│   └── commands.ts               # Session command palette actions
│
├── workflows/
│   ├── engine.ts                 # Workflow discovery and execution
│   ├── bridge.ts                 # Swarm pipeline bridge
│   ├── types.ts                  # Workflow definition types
│   └── builtins/
│       ├── capture-issue.ts      # Quick issue capture workflow
│       ├── refine-issue.ts       # Codebase-aware ticket refinement
│       ├── draft-spec.ts         # Technical spec generation
│       └── plan-cycle.ts         # Cycle planning and reporting
│
└── memory/
    ├── store.ts                  # Project memory read/write (JSONL)
    └── types.ts                  # Memory entry types

test/
├── contract/                     # Contract tests per service boundary
├── integration/                  # Cross-service integration tests
└── unit/                         # Unit tests per module
```

scripts/
├── generate-schema.ts           # ts-json-schema-generator: SpecstarConfig -> specstar.schema.json

Agent Skills:
├── Coding agents: activate `opentui` skill for implementation tasks
├── Review agents: activate `pilotty` skill + use `pilotty` CLI for TUI testing

**Structure Decision**: Single project with domain-separated directories under `src/`. The TUI layer (`tui/`) depends on signal abstractions, not concrete integration clients. Integration modules (`integrations/`) own their data types and client implementations. Session management (`sessions/`) is isolated as a supervisor-actor pattern via Bun Workers. This aligns with the DESIGN.md package structure while adapting to the issue-centric layout (replacing `tui/dashboard.tsx` + `tui/card.tsx` with `tui/layout.tsx` + `tui/issue-list.tsx` + `tui/issue-detail.tsx`).

## Complexity Tracking

> No constitutional violations identified. Table left empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none)    | --         | --                                  |