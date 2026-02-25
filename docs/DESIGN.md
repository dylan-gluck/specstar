# Specstar -- Design Document

Collaborative spec-driven development framework and agent harness.
Modeled on how engineering teams actually ship: Issue -> Research + Spec -> Implementation -> PR -> Merge.

**Binary**: `specstar` (alias: `ss`)

---

## Table of Contents

- [Design Philosophy](#design-philosophy)
- [Architecture Overview](#architecture-overview)
- [Stack](#stack)
- [Package Structure](#package-structure)
- [Configuration](#configuration)
- [Data Model](#data-model)
- [TUI Design](#tui-design)
  - [Component Hierarchy](#component-hierarchy)
  - [Dashboard Layout](#dashboard-layout)
  - [Keyboard Navigation](#keyboard-navigation)
  - [Command Palette](#command-palette)
  - [Overlays](#overlays)
- [Core Subsystems](#core-subsystems)
  - [Session Pool](#session-pool)
  - [Worker Sessions](#worker-sessions)
  - [Integration Cache](#integration-cache)
  - [Workflow Engine](#workflow-engine)
- [Integrations](#integrations)
  - [Linear](#linear)
  - [GitHub](#github)
  - [Notion](#notion)
  - [Worktree Manager](#worktree-manager)
- [Workflows](#workflows)
  - [Capture Issue](#capture-issue)
  - [Refine Issue](#refine-issue)
  - [Draft Spec](#draft-spec)
  - [Implementation](#implementation)
  - [Cycle Planning](#cycle-planning)
- [Data Flow](#data-flow)
  - [Polling and Refresh](#polling-and-refresh)
  - [Session Event Flow](#session-event-flow)
  - [Command Execution Flow](#command-execution-flow)
  - [End-to-End: Issue to PR](#end-to-end-issue-to-pr)
- [Project Memory](#project-memory)
- [Build and Distribution](#build-and-distribution)
- [Testing Strategy](#testing-strategy)
- [Implementation Phases](#implementation-phases)

---

## Design Philosophy

**Mirror how teams work.** Engineers scope work with tickets, branch for isolation, write specs before code, commit incrementally, publish PRs for review, and merge to ship. Specstar automates the scaffolding around that process while keeping the human in the loop at decision points.

**Specs are the contract.** Every issue that reaches implementation has a technical specification: data model changes, API contracts, system design, ACs. The spec is the handoff artifact between "what" and "how." Agents consume specs as context; humans review specs before approving work.

**HITL at approval boundaries, not at every step.** Agents run asynchronously in background workers. They refine tickets, draft specs, and implement features without supervision. Work that needs human judgment (spec approval, PR review, scope changes) surfaces in a "needs attention" queue.

**Observability over opacity.** Every change has a trace: the issue that motivated it, the spec that designed it, the branch and commits that built it, the PR that delivered it, and the session logs that explain decisions. A reviewer can follow any thread end-to-end.

---

## Architecture Overview

Specstar is a standalone terminal application. It owns the terminal, the render loop, and all agent session lifecycles. It is not an `omp` extension -- extensions cannot own the terminal or manage multiple concurrent sessions.

```
specstar (binary, owns terminal)
│
├── OpenTUI + Solid (render loop, components, reactivity)
│
├── Session Pool ─────── Worker Sessions (headless omp SDK sessions)
│   └── Bun Workers      └── createAgentSession({ hasUI: false })
│
├── Integrations
│   ├── Linear Client (GraphQL)
│   ├── GitHub Client (gh CLI)
│   ├── Notion Client (API)
│   └── Worktree Manager (git)
│
├── Workflow Engine ──── Swarm Bridge (YAML pipeline orchestration)
│
├── Cache Layer (SQLite)
│
└── Project Memory (.specstar/memory/)
```

**Key design decisions:**

1. **Specstar owns the terminal.** Creates `render()` directly via `@opentui/solid`. No parent omp process.
2. **Agent sessions are headless.** Each session uses `createAgentSession()` from `@oh-my-pi/pi-coding-agent` with `hasUI: false`. Specstar renders their output.
3. **Reactive UI via Solid.** Signals drive all state. Integration data, session status, and notifications are signals that trigger granular re-renders.
4. **Workers for isolation.** Bun workers provide process-level isolation for agent sessions, preventing a misbehaving session from blocking the TUI render loop.
5. **SQLite for structured cache.** Replaces JSON file caches from prior iteration. Single `.specstar/cache.db` per project with tables for issues, PRs, sessions, worktrees.
6. **Integrations are polling-based.** Linear, GitHub, and Notion data refreshes on configurable intervals. No persistent websockets.

---

## Stack

| Layer          | Technology                        | Purpose                                               |
| -------------- | --------------------------------- | ----------------------------------------------------- |
| Runtime        | Bun                               | JS runtime, bundler, SQLite, workers, JSONL           |
| UI Framework   | OpenTUI + Solid                   | Terminal rendering, fine-grained reactivity           |
| Agent SDK      | `@oh-my-pi/pi-coding-agent`       | `createAgentSession()`, session management, events    |
| Agent RPC      | `@oh-my-pi/pi-coding-agent` (RPC) | Cross-process agent communication via JSONL/stdio     |
| Orchestration  | `@oh-my-pi/swarm-extension`       | YAML workflow definitions, pipeline execution         |
| Type Schemas   | `ts-json-schema-generator`        | TypeScript types to JSON Schema for structured output |
| Styling        | chalk                             | ANSI color/style for text content                     |
| Config         | yaml                              | YAML config file parsing                              |
| Data           | Bun SQLite                        | Integration cache, session tracking, project state    |
| Data Streaming | Bun JSONL                         | Session event streaming, session file persistence     |

---

## Package Structure

```
specstar/
  src/
    index.tsx                     # CLI entry point, render()
    app.tsx                       # Root component, state provider
    config.ts                     # Configuration loading and validation
    types.ts                      # Shared type definitions
    db.ts                         # SQLite schema, migrations, queries

    tui/
      dashboard.tsx               # Root layout (card grid, focus ring)
      card.tsx                    # Card component (border, title, focus)
      table.tsx                   # Generic table (columns, rows, scroll, selection)
      command-palette.tsx         # Modal command palette (fuzzy search)
      input-overlay.tsx           # Text input / choice selection overlay
      text-overlay.tsx            # Scrollable text viewer (diffs, logs)
      status-bar.tsx              # Bottom status bar
      notification.tsx            # Toast notification overlay
      session-detail.tsx          # Expanded session view (streaming, controls)
      theme.ts                    # Color palette, style functions

    integrations/
      linear/
        client.ts                 # Linear GraphQL client
        types.ts                  # Linear data types
        commands.ts               # Linear command palette actions
      github/
        client.ts                 # GitHub client (gh CLI wrapper)
        types.ts                  # GitHub data types
        commands.ts               # GitHub PR command palette actions
        worktree.ts               # Git worktree management
        worktree-commands.ts      # Worktree command palette actions
      notion/
        client.ts                 # Notion API client
        types.ts                  # Notion page/block types
        commands.ts               # Notion command palette actions

    sessions/
      pool.ts                     # Session pool manager
      worker.ts                   # Worker session wrapper (Bun Worker)
      events.ts                   # Session event aggregator
      commands.ts                 # Session command palette actions

    workflows/
      engine.ts                   # Workflow discovery and execution
      bridge.ts                   # Swarm pipeline bridge
      types.ts                    # Workflow definition types
      builtins/
        capture-issue.ts          # Quick issue capture workflow
        refine-issue.ts           # Codebase-aware ticket refinement
        draft-spec.ts             # Technical spec generation
        plan-cycle.ts             # Cycle planning and reporting

    memory/
      store.ts                    # Project memory read/write (JSONL)
      types.ts                    # Memory entry types

  test/
    table.test.ts
    card.test.ts
    command-palette.test.ts
    pool.test.ts
    linear-client.test.ts
    github-client.test.ts
    notion-client.test.ts
    db.test.ts
    workflow.test.ts
```

---

## Configuration

### File Discovery

Configuration loads from (in priority order):

1. `$SPECSTAR_CONFIG_FILE` environment variable
2. `$XDG_CONFIG_HOME/specstar/config.yml` (default: `~/.config/specstar/config.yml`)
3. `~/.specstar.yml`
4. `.specstar.yml` in cwd (project-level, merged on top)

Project-level config merges onto global. Nested objects are shallow-merged; arrays are concatenated.

### Schema

```yaml
linear:
  apiKey: "lin_api_..." # or SPECSTAR_LINEAR_API_KEY env var
  teamId: "TEAM-UUID"
  assignedToMe: true
  filter: "custom-filter"
  refreshInterval: 30 # seconds

github:
  repo: "owner/repo" # auto-detected from git remote if omitted
  refreshInterval: 30

notion:
  apiKey: "ntn_..." # or SPECSTAR_NOTION_API_KEY env var
  databaseId: "..." # Notion database for specs
  refreshInterval: 60

sessions:
  model: "claude-sonnet"
  thinkingLevel: "high"
  maxConcurrent: 8
  worktreeBase: "../worktrees"

keybindings:
  cycleFocusForward: "tab"
  cycleFocusBackward: "shift+tab"
  openCommandPalette: "/"
  refreshAll: "ctrl+r"
  quit: "ctrl+q"
  selectUp: "up"
  selectDown: "down"
  primaryAction: "enter"
  secondaryAction: "d"
  refreshCard: "r"

workflowDirs:
  - "./workflows"
```

### Environment Variables

| Variable                  | Purpose                   |
| ------------------------- | ------------------------- |
| `SPECSTAR_LINEAR_API_KEY` | Linear API authentication |
| `SPECSTAR_NOTION_API_KEY` | Notion API authentication |
| `SPECSTAR_CONFIG_FILE`    | Config file path override |

### Setup Wizard

`specstar setup` runs an interactive wizard that:

1. Detects GitHub repo from git remote
2. Prompts for Linear API key, validates it, lists teams for selection
3. Prompts for Notion API key and database selection
4. Configures max concurrent sessions
5. Writes config to project or global location

---

## Data Model

### Project Directory

```
.specstar/
  settings.json                   # Project-level overrides (linear_id, notion_id, github_repo)
  memory/
    project.jsonl                 # Project summary, architecture notes
    people.jsonl                  # Team member context
    glossary.jsonl                # Domain terms, abbreviations
  workflows/
    refine_issue.yaml             # Custom workflow definitions
    capture_issue.yaml
    plan_cycle.yaml
  sessions/                       # Session logs (managed by omp SDK)
  cache.db                        # SQLite cache
```

### SQLite Schema (`cache.db`)

```sql
CREATE TABLE issues (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,       -- e.g. "AUTH-142"
  title TEXT NOT NULL,
  description TEXT,
  state TEXT NOT NULL,
  priority INTEGER NOT NULL,
  assignee TEXT,
  branch TEXT,
  spec_doc_id TEXT,               -- Notion document ID
  url TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  raw_json TEXT NOT NULL           -- Full API response for cache
);

CREATE TABLE pull_requests (
  number INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  state TEXT NOT NULL,             -- open, closed, merged, draft
  ci_status TEXT,                  -- pass, fail, pending, none
  review_decision TEXT,
  head_ref TEXT NOT NULL,
  url TEXT NOT NULL,
  ticket_id TEXT,                  -- Linked issue identifier
  updated_at TEXT NOT NULL,
  raw_json TEXT NOT NULL
);

CREATE TABLE worktrees (
  path TEXT PRIMARY KEY,
  branch TEXT NOT NULL,
  commit_hash TEXT NOT NULL,
  session_id TEXT,
  ticket_id TEXT,
  pr_number INTEGER,
  is_dirty INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL,            -- starting, idle, working, approval, error, shutdown
  cwd TEXT NOT NULL,
  worktree_path TEXT,
  workflow_id TEXT,
  branch TEXT,
  model TEXT,
  started_at TEXT NOT NULL,
  last_activity_at TEXT NOT NULL,
  token_count INTEGER DEFAULT 0
);

CREATE TABLE specs (
  id TEXT PRIMARY KEY,             -- Notion page ID
  issue_id TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL,            -- pending, approved, denied, draft
  url TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE memory_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,          -- project, people, glossary
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(category, key)
);
```

### Core Types

```typescript
/** Branded session identifier. */
type SessionId = string & { readonly __brand: unique symbol };

/** Worker session lifecycle states. */
type WorkerStatus =
  | "starting" // Session being created
  | "idle" // Awaiting input
  | "working" // Agent is streaming/executing
  | "approval" // Agent needs human approval
  | "error" // Session encountered an error
  | "shutdown"; // Session terminated

/** Notification requiring user attention. */
interface SessionNotification {
  sessionId: SessionId;
  type: "approval_needed" | "error" | "completed" | "info";
  message: string;
  timestamp: number;
  dismissed: boolean;
}

/** Dashboard card definition. */
interface CardDefinition {
  id: string;
  title: string;
  minHeight: number;
  column: 0 | 1;
  order: number;
}

/** Command palette action. */
interface CommandAction {
  id: string;
  label: string;
  shortcut?: string;
  category?: string;
  execute: () => Promise<boolean> | boolean;
}

/** Configurable keybindings. */
interface SpecstarKeybindings {
  cycleFocusForward: string;
  cycleFocusBackward: string;
  openCommandPalette: string;
  refreshAll: string;
  quit: string;
  selectUp: string;
  selectDown: string;
  primaryAction: string;
  secondaryAction: string;
  refreshCard: string;
}

/** Issue with all linked data. */
interface TrackedIssue {
  id: string;
  identifier: string;
  title: string;
  description: string;
  state: string;
  priority: number;
  assignee?: string;
  branch?: string;
  specDocId?: string;
  worktreePath?: string;
  sessionId?: SessionId;
  prNumber?: number;
  url: string;
}
```

---

## TUI Design

### Component Hierarchy

Built with OpenTUI Solid. All components are Solid functional components using signals for state, `createEffect` for side effects, and JSX intrinsics (`<box>`, `<text>`, `<input>`, etc.) for rendering.

```
render(() => <App />)
  <App>                           # State provider, lifecycle
    <Dashboard>                   # Card grid, focus ring
      <Card id="linear">          # Linear issues
        <Table<LinearIssue> />
      </Card>
      <Card id="sessions">        # Agent sessions
        <Table<WorkerSession> />
      </Card>
      <Card id="github-prs">      # GitHub PRs
        <Table<GithubPR> />
      </Card>
      <Card id="worktrees">       # Git worktrees
        <Table<Worktree> />
      </Card>
      <StatusBar />               # Mode, counts, shortcuts
    </Dashboard>
    <Show when={showCommandPalette()}>
      <CommandPalette />          # Fuzzy search overlay
    </Show>
    <Show when={showSessionDetail()}>
      <SessionDetail />           # Expanded session view
    </Show>
    <Show when={showInputOverlay()}>
      <InputOverlay />            # Text/choice input
    </Show>
    <Show when={showTextOverlay()}>
      <TextOverlay />             # Scrollable text (diffs, logs)
    </Show>
    <NotificationStack />         # Toast notifications
  </App>
```

### Dashboard Layout

Two-column, four-card grid with status bar:

```
+--[ Specstar ]---------------------------------------------------+
|                                                                  |
|  +--[ Linear (3) ]------------------+ +--[ Sessions (2) ]-----+ |
|  | #  ID          Title     State   | | *  Name     Status    | |
|  | >  AUTH-142    Fix auth  In Pro  | |    main     idle      | |
|  |    AUTH-139    Add logs  Todo    | |    feat-x   working   | |
|  |    AUTH-138    Update    Done    | |                        | |
|  +----------------------------------+ +------------------------+ |
|                                                                  |
|  +--[ GitHub PRs (1) ]--------------+ +--[ Worktrees (2) ]----+ |
|  | #  Title       Status   CI      | | Branch   Ticket  PR   | |
|  | >  fix-auth    Open     pass    | | main     -       -    | |
|  +----------------------------------+ | feat-x   AUTH-1  #42  | |
|                                       +------------------------+ |
|                                                                  |
|  [ Specstar | 2 sessions | Tab: focus  /: cmd  Ctrl+Q: quit ]   |
+------------------------------------------------------------------+
```

**Layout algorithm:**

1. Two columns, equal width.
2. Cards placed by `column` and `order`.
3. Fixed-height cards get `minHeight` rows; remaining space distributed equally among flex cards.
4. Terminals < 80 columns: single-column stacked layout.
5. Terminal resize triggers relayout.

### Keyboard Navigation

#### Global Keys

| Key         | Action                         |
| ----------- | ------------------------------ |
| `Tab`       | Cycle focus to next card       |
| `Shift+Tab` | Cycle focus to previous card   |
| `/`         | Open command palette           |
| `Ctrl+R`    | Refresh all integrations       |
| `Ctrl+Q`    | Quit (shuts down all sessions) |
| `1`-`4`     | Jump to card by position       |

#### Card Navigation

| Key          | Action                                          |
| ------------ | ----------------------------------------------- |
| `Up` / `k`   | Select previous row                             |
| `Down` / `j` | Select next row                                 |
| `Enter`      | Primary action (opens command palette for card) |
| `d`          | Secondary action                                |
| `r`          | Refresh current card                            |

#### Command Palette

| Key             | Action                       |
| --------------- | ---------------------------- |
| `/` or `Escape` | Close palette                |
| `Up` / `Down`   | Navigate actions             |
| `Enter`         | Execute selected action      |
| Typing          | Filter actions (fuzzy match) |
| `Backspace`     | Remove last filter character |

#### Session Detail View

| Key           | Action                        |
| ------------- | ----------------------------- |
| `Escape`      | Return to dashboard           |
| `Enter`       | Send prompt                   |
| `Ctrl+C`      | Abort current agent operation |
| `Ctrl+A`      | Approve pending tool call     |
| `Ctrl+X`      | Reject pending tool call      |
| `Up` / `Down` | Scroll conversation           |

**Implementation:** All keys are configurable via `SpecstarKeybindings`. The dashboard intercepts global keys before delegating to the focused card. Overlays receive input exclusively when active.

### Command Palette

The command palette is the primary interaction surface. Actions are context-sensitive based on the focused card and selected item.

#### Global Actions (always available)

| Action                  | Description                                |
| ----------------------- | ------------------------------------------ |
| New session             | Create a blank worker session              |
| New session from ticket | Select ticket, create worktree + session   |
| Capture issue           | Quick issue creation with codebase context |
| Run workflow            | Select and launch a workflow               |
| Refresh all             | Force-refresh all integrations             |
| Quit                    | Shutdown all sessions and exit             |

#### Linear Context Actions

| Action          | Description                                                |
| --------------- | ---------------------------------------------------------- |
| Refine ticket   | Spawn session to rewrite ticket with codebase context      |
| Draft spec      | Spawn session to produce technical specification in Notion |
| Start worker    | Create worktree + session for selected ticket              |
| Change state    | Update ticket state                                        |
| Open in browser | Open Linear issue URL                                      |

#### GitHub Context Actions

| Action            | Description                        |
| ----------------- | ---------------------------------- |
| Review PR         | Spawn review agent session         |
| Checkout worktree | Create/open worktree for PR branch |
| View diff         | Show PR diff in scrollable overlay |
| Approve / Comment | Interact with the PR               |
| Open in browser   | Open GitHub PR URL                 |

#### Worktree Context Actions

| Action       | Description                              |
| ------------ | ---------------------------------------- |
| Open session | Jump to session running in worktree      |
| Create PR    | Open a pull request from worktree branch |
| Sync         | Pull --rebase the worktree               |
| Delete       | Shut down session and remove worktree    |

#### Session Context Actions

| Action        | Description                               |
| ------------- | ----------------------------------------- |
| Open          | Enter session detail view                 |
| Send prompt   | Quick prompt without entering detail view |
| Steer         | Send steering message to interrupt        |
| Abort         | Abort current operation                   |
| Approve       | Approve pending tool call                 |
| Shutdown      | Terminate session                         |
| View worktree | Focus the associated worktree card        |

### Overlays

All overlays follow the same lifecycle:

1. `showOverlay(component)` -- renders over dashboard
2. Overlay receives keyboard input exclusively
3. On close (Escape or action completion) -- overlay removed, focus returns to dashboard

| Overlay             | Purpose                                 | Trigger                 |
| ------------------- | --------------------------------------- | ----------------------- |
| `CommandPalette`    | Fuzzy-searchable action list            | `/` key                 |
| `InputOverlay`      | Text input or choice selection          | Action callbacks        |
| `TextOverlay`       | Scrollable read-only text (diffs, logs) | View diff, view logs    |
| `SessionDetail`     | Full session conversation + controls    | Enter on session row    |
| `NotificationStack` | Toast messages (success, error, info)   | Async operation results |

---

## Core Subsystems

### Session Pool

Manages the lifecycle of all headless agent sessions. Enforces concurrency limits, aggregates notifications, and provides the data source for the Sessions card.

```typescript
class SessionPool {
  /** Create a new worker session. Throws if at capacity. */
  spawn(options: WorkerSessionOptions): Promise<WorkerSession>;

  /** Shutdown and remove a session. */
  destroy(id: SessionId): Promise<void>;

  /** Get all sessions sorted by last activity. */
  list(): WorkerSession[];

  /** Get aggregated notifications across all sessions. */
  getNotifications(): SessionNotification[];

  /** Dismiss a notification. */
  dismiss(sessionId: SessionId, type: string): void;

  /** Shutdown all sessions gracefully. */
  shutdownAll(): Promise<void>;

  /** Subscribe to pool change events. */
  subscribe(listener: SessionPoolListener): () => void;

  /** Current session count. */
  get size(): number;
}
```

**Concurrency:** Default limit is 8 concurrent sessions, configurable via `sessions.maxConcurrent`. Pool rejects `spawn()` when at capacity with a clear error.

**Notification aggregation:** Each worker session maintains its own notification list. The pool aggregates them sorted by timestamp, with approval-needed notifications floating to top.

**Shutdown ordering:** `shutdownAll()` aborts all sessions in parallel, waits for all to complete, then clears the pool.

### Worker Sessions

Each `WorkerSession` wraps an `AgentSession` from the `omp` SDK with specstar-specific metadata and event handling.

```typescript
interface WorkerSessionOptions {
  cwd: string;
  name: string;
  contextFiles?: Array<{ path: string; content: string }>;
  initialPrompt?: string;
  model?: Model;
  thinkingLevel?: ThinkingLevel;
  completionCriteria?: string;
}
```

**Creation flow:**

1. Generate branded `SessionId` (`s-<random8>`)
2. Call `createAgentSession({ cwd, hasUI: false, systemPrompt, model, thinkingLevel })`
3. Subscribe to agent events, map to `WorkerStatus` transitions
4. If `initialPrompt` provided, send it immediately
5. Return `WorkerSession` handle

**Status transitions:**

```
starting -> idle -> working -> idle (loop)
                 -> approval -> working (on approve/reject)
                 -> error
any      -> shutdown
```

**Event mapping:**
| Agent Event | Worker Action |
|-------------|---------------|
| `message_update` | Update `lastActivityAt`, increment `tokenCount` |
| `agent_end` | Set status = `idle` |
| `tool_execution_start` | Set status = `working` |
| `tool_approval_request` | Set status = `approval`, create notification |
| Error in handler | Set status = `error`, create notification |

**Approval flow:** When a tool call requires approval, the worker stores the `approve`/`reject` callbacks. The TUI surfaces the pending approval in the session detail view and notification stack. `Ctrl+A` approves; `Ctrl+X` rejects.

### Integration Cache

SQLite-backed cache for integration data. Provides instant display on startup and delta detection to avoid unnecessary re-renders.

```typescript
class IntegrationCache<T> {
  constructor(db: Database, table: string, keyOf: (item: T) => string);

  /** Load cached data from SQLite. */
  load(): T[];

  /** Replace cache with fresh data. Returns true if anything changed. */
  update(items: T[]): boolean;

  /** Get all cached items. */
  getAll(): T[];

  /** Get a single item by key. */
  get(key: string): T | undefined;
}
```

**Delta detection:** Compares JSON-serialized items by key. Returns `true` from `update()` only when additions, removals, or mutations are detected. The TUI only re-renders card data when `update()` returns true.

**Persistence:** Writes to SQLite are asynchronous. Read failures return empty arrays (cold start). The cache is per-project, stored at `.specstar/cache.db`.

### Workflow Engine

Discovers, validates, and executes workflow definitions. Bridges to the `omp` swarm extension for multi-agent pipeline orchestration.

```typescript
class WorkflowEngine {
  /** Discover available workflows from standard directories. */
  discover(): WorkflowDefinition[];

  /** Execute a workflow. Returns a handle for status monitoring. */
  execute(def: WorkflowDefinition, context: WorkflowContext): Promise<WorkflowHandle>;
}
```

**Discovery directories:**

1. `.specstar/workflows/`
2. `~/.omp/agent/workflows/`
3. `.omp/workflows/`
4. Additional directories from `config.workflowDirs`

**Execution:** Parses YAML, validates definition, builds dependency graph, generates execution waves, runs via `PipelineController` with abort support and progress callbacks.

---

## Integrations

### Linear

**Client:** Direct GraphQL over `fetch()`. No SDK dependency.

**Queries:**

- `getIssues(filter)` -- Fetch active issues for team, optionally filtered by assignee
- `getIssue(id)` -- Full issue detail with description and comments
- `getStates(teamId)` -- Team workflow states (cached for state change UI)
- `updateIssue(id, input)` -- Update state, description, assignee
- `addComment(issueId, body)` -- Post a comment

**Data type:**

```typescript
interface LinearIssue {
  id: string;
  identifier: string; // e.g. "AUTH-142"
  title: string;
  description?: string;
  state: { name: string; type: string };
  priority: number; // 0=none, 1=urgent, 2=high, 3=medium, 4=low
  assignee?: { name: string };
  branch?: string;
  url: string;
  updatedAt: string;
}
```

**Authentication:** `SPECSTAR_LINEAR_API_KEY` env var or `config.linear.apiKey`. Card shows "Linear not configured" when missing.

### GitHub

**Client:** Wraps `gh` CLI for authentication and API access. Auto-detects repo from git remote origin.

**Operations:**

- `listPRs()` -- Open PRs with status, CI, review state
- `getPR(number)` -- Full PR detail including body
- `createPR(opts)` -- Create PR from branch
- `comment(number, body)` -- Post a comment
- `approvePR(number)` -- Approve via `gh pr review --approve`

**Data type:**

```typescript
interface GithubPR {
  number: number;
  title: string;
  author: string;
  state: "open" | "closed" | "merged" | "draft";
  ciStatus: "pass" | "fail" | "pending" | "none";
  reviewDecision: "approved" | "changes_requested" | "review_required" | null;
  headRef: string;
  url: string;
  updatedAt: string;
  ticketId?: string; // Extracted from branch/title
}
```

### Notion

**Client:** Notion API for spec document management.

**Operations:**

- `listSpecs(databaseId)` -- Fetch spec documents from the configured database
- `getSpec(pageId)` -- Full page content
- `createSpec(issueId, title, content)` -- Create a new spec document
- `updateSpec(pageId, content)` -- Update spec content
- `setSpecStatus(pageId, status)` -- Update spec review status

**Data type:**

```typescript
interface NotionSpec {
  id: string; // Notion page ID
  issueId: string; // Linked Linear issue
  title: string;
  status: "draft" | "pending" | "approved" | "denied";
  url: string;
  updatedAt: string;
}
```

**Spec workflow:** Agents write specs as markdown. The Notion client converts markdown to Notion blocks for publishing. Specs link back to Linear issues via a relation property. Status changes in Notion trigger notifications in specstar.

### Worktree Manager

**Operations:**

- `list()` -- All git worktrees with branch, commit, dirty status
- `create(branch, baseBranch?)` -- Create worktree under `config.sessions.worktreeBase`
- `remove(path)` -- Remove worktree (shuts down associated session first)
- `sync(path)` -- `git pull --rebase` in worktree

**Enrichment:** Raw worktree data is enriched by cross-referencing:

- Session by matching `cwd` to worktree path
- PR by matching `headRef` to worktree branch
- Ticket by extracting identifier from branch name (`/^([A-Z]+-\d+)/i`)

**Naming convention:** Worktrees are named after their branch. Branches follow the pattern `{ticket-identifier}` (e.g., `auth-142`) for automatic linking.

---

## Workflows

Workflows are the core value proposition. They encode the engineering team process as automated, codebase-aware pipelines.

### Capture Issue

**Trigger:** Command palette "Capture issue"
**Input:** Freeform description of a problem or task
**Process:**

1. Agent reads codebase structure, project memory, and existing issues
2. Generates a structured issue: title, description, requirements, ACs, suggested labels
3. Surfaces for human review in the "needs attention" queue
4. On approval: creates Linear issue, updates cache

### Refine Issue

**Trigger:** Command palette "Refine ticket" on a Linear issue
**Input:** Existing Linear issue (may have sparse description)
**Process:**

1. Agent reads full issue detail from Linear
2. Scans codebase for relevant files, types, tests
3. Reads project memory for context
4. Rewrites description with implementation notes, affected files, suggested scope
5. Updates requirements and ACs to be specific and testable
6. Surfaces refined ticket for review
7. On approval: updates Linear issue

### Draft Spec

**Trigger:** Command palette "Draft spec" on a Linear issue
**Input:** Refined Linear issue with clear requirements
**Process:**

1. Agent reads issue requirements and ACs
2. Analyzes codebase: data models, API contracts, existing patterns
3. Produces technical specification covering:
   - System design and data-model changes
   - API contract changes (with TypeScript types or JSON Schema)
   - Migration plan (if applicable)
   - Test plan
   - Security considerations
4. Creates Notion spec document linked to the issue
5. Surfaces for human review
6. On approval: updates spec status, marks issue as ready for implementation

### Implementation

**Trigger:** Command palette "Start worker" on a spec-approved issue
**Input:** Issue + approved spec
**Process:**

1. Creates git worktree with branch named after issue identifier
2. Spawns headless agent session in the worktree
3. Agent reads spec from Notion as primary context
4. Implements changes following the spec
5. Runs tests, iterates on failures
6. On completion: creates PR linking back to issue
7. Surfaces PR for human review

### Cycle Planning

**Trigger:** Command palette "Plan cycle"
**Input:** Upcoming cycle/sprint dates, team capacity
**Process:**

1. Agent reads current backlog from Linear
2. Analyzes project memory for priorities, milestones
3. Generates cycle plan: issue assignments, capacity allocation, risk flags
4. Generates changelog from completed work in previous cycle
5. Surfaces plan for review

---

## Data Flow

### Polling and Refresh

```
App.start()
  -> scheduleRefresh(interval)
     -> LinearClient.getIssues()          -> cache.update() -> if changed: setIssues(signal)
     -> GithubClient.listPRs()            -> cache.update() -> if changed: setPRs(signal)
     -> GithubClient.listWorktrees()      -> enrichWorktrees() -> setWorktrees(signal)
     -> NotionClient.listSpecs()          -> cache.update() -> if changed: setSpecs(signal)
     -> SessionPool.list()                -> setSessions(signal)
     -> requestRender()                   (automatic via Solid reactivity)
```

Signals trigger granular re-renders. Only the card whose data changed will update.

### Session Event Flow

```
WorkerSession (AgentSession.subscribe)
  -> event: message_update       -> update lastActivityAt, tokenCount signals
  -> event: tool_approval_request -> set status signal = "approval", push notification signal
  -> event: agent_end            -> set status signal = "idle"
  -> event: error                -> set status signal = "error", push notification signal

SessionPool onChange
  -> sessionsSignal updated
  -> Sessions card re-renders (Solid reactivity)
  -> StatusBar notification badge updates
```

### Command Execution Flow

```
User presses "/"
  -> Dashboard opens CommandPalette overlay
  -> Palette gathers: globalActions + cardActions(focusedCard, selectedItem)
  -> User filters, selects action
  -> action.execute()
     e.g. "Start worker for AUTH-142":
       -> linearClient.getIssue("AUTH-142")
       -> worktreeManager.create("auth-142")
       -> sessionPool.spawn({
            cwd: worktree.path,
            name: "AUTH-142",
            contextFiles: [{ path: "ticket.md", content: issue.description }],
            initialPrompt: "Implement AUTH-142 following the spec...",
          })
  -> Palette closes
  -> Dashboard re-renders with new session
```

### End-to-End: Issue to PR

Complete lifecycle showing all subsystem interactions:

```
1. Capture Issue
   User: "We need rate limiting on the /api/auth endpoint"
   -> Agent reads codebase, finds auth routes, middleware patterns
   -> Agent drafts issue: "AUTH-150: Add rate limiting to /api/auth"
   -> Human reviews, approves
   -> Linear issue created

2. Refine Issue
   -> Agent reads AUTH-150, scans auth module
   -> Adds: affected files, existing rate-limit patterns in codebase, edge cases
   -> Updates requirements: "Must use Redis-backed sliding window, 100 req/min per IP"
   -> Human approves refined ticket

3. Draft Spec
   -> Agent analyzes auth module, middleware chain, Redis client usage
   -> Produces spec: data model (Redis key schema), middleware design,
      config changes, test plan, rollback procedure
   -> Creates Notion page: "AUTH-150: Rate Limiting Spec"
   -> Human reviews, approves spec

4. Implementation
   -> Creates worktree: ../worktrees/auth-150 (branch: auth-150)
   -> Spawns session with spec as context
   -> Agent implements: middleware, tests, config, docs
   -> Session completes, creates PR #52

5. Review
   -> PR #52 appears in GitHub card
   -> "Review PR" spawns review session
   -> Review agent reads diff, spec, identifies any spec deviations
   -> Human reads review, approves PR

6. Merge
   -> PR merged, worktree cleaned up
   -> Issue state updated to Done
   -> Session logs preserved for audit trail
```

---

## Project Memory

Project memory provides persistent context across sessions. Stored as JSONL in `.specstar/memory/`.

### Categories

| File             | Content                              | Example                                             |
| ---------------- | ------------------------------------ | --------------------------------------------------- |
| `project.jsonl`  | Architecture, conventions, decisions | "Uses Express middleware chain for auth"            |
| `people.jsonl`   | Team members, areas of expertise     | "Alice: auth/security lead"                         |
| `glossary.jsonl` | Domain terms, abbreviations          | "SLO: Service Level Objective, 99.9% uptime target" |

### Format

Each line is a JSON object:

```json
{
  "key": "auth-architecture",
  "value": "Redis-backed session store with JWT refresh tokens. See src/auth/README.md",
  "updatedAt": "2026-02-25T10:00:00Z"
}
```

### Usage

- Injected into agent system prompts as context
- Queried during issue refinement and spec drafting
- Updated by agents when they discover new architectural patterns
- Human-editable for corrections

---

## Build and Distribution

### Development

```bash
bun src/index.tsx                 # Run in development mode
```

### Compile

```typescript
import solidPlugin from "@opentui/solid/bun-plugin";

await Bun.build({
  entrypoints: ["./src/index.tsx"],
  plugins: [solidPlugin],
  compile: {
    target: "bun-darwin-arm64",
    outfile: "./dist/specstar",
  },
});
```

Produces a single self-contained binary. The Solid plugin transforms JSX at build time.

### Distribution

The compiled binary can be:

1. Symlinked to `~/.bun/bin/specstar` (and `ss` alias)
2. Distributed as a standalone executable (no runtime dependency)

---

## Testing Strategy

### Unit Tests

| Module                    | Focus                                                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `table.test.ts`           | Column width calculation, scroll behavior, selection stability across data refreshes, edge cases (empty, single row, overflow) |
| `card.test.ts`            | Border rendering, focus indicator, dimension allocation, title truncation                                                      |
| `command-palette.test.ts` | Fuzzy matching, action filtering, keyboard navigation, action execution                                                        |
| `pool.test.ts`            | Max concurrency enforcement, notification aggregation, shutdown ordering, events                                               |
| `linear-client.test.ts`   | GraphQL query construction, response parsing, error handling                                                                   |
| `github-client.test.ts`   | `gh` CLI output parsing, PR state mapping, ticket extraction from branch names                                                 |
| `notion-client.test.ts`   | API request construction, page/block parsing, markdown-to-blocks conversion                                                    |
| `db.test.ts`              | Schema migrations, cache CRUD, delta detection                                                                                 |
| `workflow.test.ts`        | Workflow discovery, YAML validation, pipeline execution with mock agents                                                       |

### Integration Tests

- **Session lifecycle:** Spawn a `createAgentSession()` with a mock model, verify status transitions (starting -> idle -> working -> idle -> shutdown).
- **Worktree lifecycle:** Create worktree, verify directory, associate session, remove worktree, verify cleanup.
- **Cache round-trip:** Write integration data, reload from SQLite, verify identical.
- **Workflow end-to-end:** Execute a simple workflow YAML with mock agents, verify completion.

### TUI Tests

OpenTUI provides a test renderer for headless snapshot testing:

```typescript
import { renderToString } from "@opentui/solid/test"

test("dashboard renders cards in two columns", () => {
  const output = renderToString(() => <Dashboard cards={mockCards} />)
  // Assert card borders, titles, content positions
})
```

---

## Implementation Phases

### Phase 1: Foundation

**Scope:** Project setup, core TUI components, dashboard layout, keyboard navigation, status bar, theme.

**Files:** `src/index.tsx`, `src/app.tsx`, `src/types.ts`, `src/config.ts`, `src/tui/dashboard.tsx`, `src/tui/card.tsx`, `src/tui/table.tsx`, `src/tui/status-bar.tsx`, `src/tui/theme.ts`

**Deliverable:** Running `specstar` binary with a navigable card grid, mock data, and status bar. No integrations.

**Tests:** `table.test.ts`, `card.test.ts`

### Phase 2: Session Management

**Scope:** Session pool, worker session wrapper, sessions card, session detail view.

**Files:** `src/sessions/pool.ts`, `src/sessions/worker.ts`, `src/sessions/events.ts`, `src/sessions/commands.ts`, `src/tui/session-detail.tsx`

**Deliverable:** Create, list, inspect, steer, and shutdown agent sessions from the dashboard. Session detail shows streaming output, accepts prompts, and handles tool approval.

**Tests:** `pool.test.ts`

### Phase 3: SQLite Cache + Data Layer

**Scope:** Database schema, migrations, integration cache abstraction, project memory store.

**Files:** `src/db.ts`, `src/memory/store.ts`, `src/memory/types.ts`

**Deliverable:** Persistent cache layer. Instant load on startup. Delta detection prevents unnecessary re-renders.

**Tests:** `db.test.ts`

### Phase 4: GitHub Integration

**Scope:** GitHub client, PR card, worktree card, worktree manager.

**Files:** `src/integrations/github/client.ts`, `src/integrations/github/types.ts`, `src/integrations/github/commands.ts`, `src/integrations/github/worktree.ts`, `src/integrations/github/worktree-commands.ts`

**Deliverable:** PR list with status/CI, worktree creation/deletion, session-worktree association.

**Tests:** `github-client.test.ts`

### Phase 5: Linear Integration

**Scope:** Linear GraphQL client, issues card, ticket refinement.

**Files:** `src/integrations/linear/client.ts`, `src/integrations/linear/types.ts`, `src/integrations/linear/commands.ts`

**Deliverable:** Issue list, ticket context injection, state updates.

**Tests:** `linear-client.test.ts`

### Phase 6: Notion Integration

**Scope:** Notion API client, spec management, markdown-to-blocks conversion.

**Files:** `src/integrations/notion/client.ts`, `src/integrations/notion/types.ts`, `src/integrations/notion/commands.ts`

**Deliverable:** Spec document CRUD, linked to Linear issues, status tracking.

**Tests:** `notion-client.test.ts`

### Phase 7: Command Palette + Overlays

**Scope:** Command palette, fuzzy search, all context actions, input overlay, text overlay.

**Files:** `src/tui/command-palette.tsx`, `src/tui/input-overlay.tsx`, `src/tui/text-overlay.tsx`

**Deliverable:** Full command palette with all context actions, overlay lifecycle.

**Tests:** `command-palette.test.ts`

### Phase 8: Workflows

**Scope:** Workflow engine, swarm bridge, built-in workflows (capture, refine, spec, implement, cycle plan).

**Files:** `src/workflows/engine.ts`, `src/workflows/bridge.ts`, `src/workflows/types.ts`, `src/workflows/builtins/*`

**Deliverable:** End-to-end workflow execution: Issue -> Spec -> Implementation -> PR.

**Tests:** `workflow.test.ts`

### Phase 9: Polish

**Scope:** Notification system, toast overlays, error recovery, setup wizard, config validation, edge case hardening.

**Files:** `src/tui/notification.tsx`, `src/setup.ts`

**Deliverable:** Production-ready with comprehensive error handling, notification system, and setup wizard.
