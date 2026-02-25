# Specstar

Issue-centric TUI for spec-driven development. Specstar connects Linear issues, GitHub PRs, Notion specs, and AI coding agent sessions into a single terminal interface. Issues are the primary object; everything else (specs, PRs, sessions, worktrees) is context attached to an issue.

## Overview

Specstar polls your integrations, links artifacts to issues through cross-integration enrichment, and surfaces what needs your attention. Agent sessions run in isolated git worktrees with human-in-the-loop approval at tool-call boundaries.

**Core capabilities:**

- Unified issue view with linked PRs, specs, sessions, and worktrees
- Agent session management with bounded concurrency and approval flow
- Command palette with context-sensitive, fuzzy-searchable actions
- Workflow engine with DAG-based parallel step execution
- Project memory stored in SQLite

## Prerequisites

- [Bun](https://bun.sh) (runtime and bundler)
- [Oh My Pi](https://github.com/can1357/oh-my-pi) (`omp`) installed and configured
- [GitHub CLI](https://cli.github.com) (`gh`) authenticated (used for PR operations)
- A Linear API key (if using Linear integration)
- A Notion API key (if using Notion integration)

## Setup

```sh
git clone <repo-url> && cd specstar
bun install
```

### Configuration

Specstar reads JSON configuration files. Discovery order (highest priority first):

1. `$SPECSTAR_CONFIG_FILE` -- explicit path override
2. `$XDG_CONFIG_HOME/specstar/config.json` (default: `~/.config/specstar/config.json`)
3. `~/.specstar.json`
4. `.specstar.json` in the current working directory (project-level)

Files are merged bottom-up. Nested objects are shallow-merged; arrays are concatenated. Project-level config merges onto global.

Add `"$schema": "./specstar.schema.json"` (or the absolute path) to your config file for editor autocompletion.

#### Environment variables

| Variable | Overrides |
|---|---|
| `SPECSTAR_CONFIG_FILE` | Config file path |
| `SPECSTAR_LINEAR_API_KEY` | `linear.apiKey` |
| `SPECSTAR_NOTION_API_KEY` | `notion.apiKey` |

#### Minimal configuration

```json
{
  "$schema": "./specstar.schema.json",
  "linear": {
    "apiKey": "lin_api_...",
    "teamId": "TEAM_ID",
    "assignedToMe": true,
    "refreshInterval": 30
  },
  "github": {
    "refreshInterval": 30
  },
  "notion": {
    "apiKey": "ntn_...",
    "databaseId": "DATABASE_ID",
    "refreshInterval": 60
  },
  "sessions": {
    "model": "claude-sonnet",
    "thinkingLevel": "high",
    "maxConcurrent": 8,
    "worktreeBase": "../worktrees"
  },
  "keybindings": {
    "togglePane": "tab",
    "openCommandPalette": "/",
    "refreshAll": "ctrl+r",
    "quit": "ctrl+q",
    "selectUp": "up",
    "selectDown": "down",
    "primaryAction": "enter",
    "tabNext": "right",
    "tabPrev": "left",
    "approve": "a",
    "deny": "x",
    "newSession": "n",
    "comment": "c",
    "openExternal": "e",
    "refreshCard": "r"
  },
  "workflowDirs": []
}
```

`github.repo` is auto-detected from the git remote when omitted. `linear.states` and `linear.filter` are optional issue filters.

#### Theme

Theme defaults to the terminal's base16 palette. Override individual semantic color roles with hex values:

```json
{
  "theme": {
    "error": "#ff5555",
    "success": "#50fa7b",
    "accent": "#bd93f9"
  }
}
```

Available roles: `background`, `backgroundAlt`, `selection`, `muted`, `foreground`, `foregroundBright`, `error`, `warning`, `success`, `info`, `accent`, `secondary`.

## Usage

### Run in development mode

```sh
bun run dev
```

### Build a standalone binary

```sh
bun run build
```

Produces `./dist/specstar` (compiled native binary via Bun). Run with:

```sh
./dist/specstar
./dist/specstar --config path/to/config.json
./dist/specstar --version
./dist/specstar --help
```

### TUI layout

The interface is a master-detail layout:

- **Left pane** (~35%): Issue list grouped into three sections:
  - **Attention** -- issues needing action (pending approvals, errors, shutdown sessions, pending specs)
  - **Active** -- issues with running sessions, open PRs, or started state
  - **Backlog** -- everything else
  - Unlinked PRs and sessions appear at the bottom
- **Right pane** (~65%): Detail view with three tabs:
  - **Overview** -- issue metadata, description, linked sessions with inline approval
  - **Spec** -- linked Notion spec content with approve/deny actions
  - **Review** -- linked PR with CI status, review decision, approve/comment actions
- **Status bar**: active session count, attention count, integration error indicators

### Keyboard navigation

#### Global

| Key | Action |
|---|---|
| `Ctrl+q` | Quit |
| `Ctrl+r` | Refresh all integrations |
| `Tab` | Toggle focus between panes |
| `/` | Open command palette |

#### Left pane (issue list)

| Key | Action |
|---|---|
| `j` / `Down` | Select next issue |
| `k` / `Up` | Select previous issue |
| `Enter` | Primary action |

#### Right pane (detail tabs)

| Key | Action |
|---|---|
| `h` / `Left` | Previous tab |
| `l` / `Right` | Next tab |
| `1` `2` `3` | Jump to tab by number |

#### Overview tab

| Key | Action |
|---|---|
| `j` / `k` | Navigate sessions |
| `a` | Approve session (when pending approval) |
| `x` | Reject session |
| `n` | Start new session |
| `Enter` | Open session detail |

#### Spec tab

| Key | Action |
|---|---|
| `a` | Approve spec (when pending) |
| `x` | Deny spec (when pending) |
| `r` | Refresh spec |
| `e` | Open in browser |
| `f` | Fullscreen view |

#### Review tab

| Key | Action |
|---|---|
| `a` | Approve PR (when open) |
| `c` | Comment on PR |
| `e` | Open in browser |
| `r` | Refresh PR |

All keybindings are reconfigurable via the `keybindings` section in config.

### Command palette

Press `/` to open. Actions are context-sensitive and grouped by category (Issue, Session, PR, Spec, Worktree, Global). Type to fuzzy-filter. Navigate with arrow keys, confirm with Enter, dismiss with Escape.

### Workflows

Specstar includes a workflow engine that executes multi-step agent tasks as DAGs. Steps within a wave run in parallel; waves execute sequentially.

Built-in workflows:

| Workflow | Steps | Description |
|---|---|---|
| `capture-issue` | 1 | Quick issue capture from natural language |
| `refine-issue` | 2 | Analyze codebase context, then refine issue details |
| `draft-spec` | 2 | Research requirements, then draft technical specification |
| `plan-cycle` | 3 | Assess state, generate plan, create summary report |

Custom workflows are loaded from directories listed in `workflowDirs`. Each workflow is a TypeScript module defining steps with `id`, `dependsOn`, and prompt templates supporting `{{issueId}}` and `{{key}}` interpolation.

### Integrations

| Service | Transport | Config key |
|---|---|---|
| Linear | GraphQL API | `linear` |
| GitHub | `gh` CLI | `github` |
| Notion | REST API | `notion` |

Polling intervals are configurable per integration (defaults: Linear 30s, GitHub 30s, Notion 60s, worktrees 10s fixed).

### Data storage

Specstar maintains a SQLite database at `.specstar/cache.db` (WAL mode) with six tables: `issues`, `pull_requests`, `worktrees`, `sessions`, `specs`, `memory_entries`. This is a local cache; deleting it triggers a full re-sync on next launch.

## Development

### Project structure

```
src/
  index.tsx          Entry point: CLI args, config, DB init, render
  app.tsx            Root component: signals, polling, enrichment, layout
  config.ts          Config discovery, merging, env overrides
  db.ts              SQLite schema, IntegrationCache<T>
  types.ts           Domain type re-exports, branded types, validators
  enrichment.ts      Cross-integration linking: sections, badges, issue model
  integrations/
    linear/          GraphQL client, command palette actions
    github/          gh CLI wrapper, PR ops, worktree manager
    notion/          REST client, markdown/block conversion
  sessions/
    pool.ts          Bounded session pool with event aggregation
    worker.ts        Worker session handle with message passing
    events.ts        Event types and notification dedup
    commands.ts      Session palette actions
  tui/
    layout.tsx       Responsive master-detail layout
    command-palette.tsx  Fuzzy command palette
    issue-list.tsx   Left pane: grouped issue list
    issue-detail.tsx Right pane: tab container
    overview-tab.tsx Overview tab
    spec-tab.tsx     Spec tab
    review-tab.tsx   Review tab
    status-bar.tsx   Bottom status bar
  workflows/
    engine.ts        DAG workflow executor
    bridge.ts        Workflow-to-session bridge
    builtins/        Built-in workflow definitions
  memory/
    store.ts         SQLite-backed key-value store
```

### Stack

| Layer | Technology |
|---|---|
| Runtime | Bun |
| Language | TypeScript (strict mode, ESNext) |
| UI framework | SolidJS with OpenTUI (terminal rendering) |
| Agent SDK | @oh-my-pi/pi-coding-agent |
| Linter | oxlint |
| Formatter | oxfmt |
| Schema gen | ts-json-schema-generator |

### Commands

```sh
bun run dev          # Run in development mode (interpreted)
bun run build        # Compile standalone binary
bun run lint         # Run oxlint
bun run lint:fix     # Run oxlint with auto-fix
bun run fmt          # Format with oxfmt
bun run fmt:check    # Check formatting without writing
bun run schema       # Regenerate specstar.schema.json from config types
```

### Build

The build script (`build.ts`) uses Bun's bundler with the SolidJS plugin to compile `src/index.tsx` into a standalone native binary at `./dist/specstar`. The Solid plugin is required for JSX transformation.

### Tests

Run `bun test` to execute the unit test suite. Tests live in `test/unit/` mirroring the `src/` structure.

### Schema generation

Running `bun run schema` generates `specstar.schema.json` from the `SpecstarConfig` type in `src/contracts/config.ts`. This file is the single source of truth for the configuration shape. Regenerate after modifying any config interface.

### Contributing

1. Read the design documents in `docs/` before making architectural changes.
2. Config types live in `src/contracts/config.ts`. After changes, run `bun run schema` to regenerate the JSON schema.
3. Run `bun run lint` and `bun run fmt:check` before committing.
4. The enrichment module (`src/enrichment.ts`) is the logical center of the application. Changes to how issues, PRs, specs, or sessions relate to each other happen there.
5. Integration clients are isolated under `src/integrations/<service>/`. Each exposes a client and command palette actions.
6. TUI components are in `src/tui/`. The layout is responsive with three modes: wide (>120 cols), compressed (80-120), and stacked (<80).

## License

See LICENSE file.
