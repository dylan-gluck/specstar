# Quickstart

## Prerequisites

| Requirement | Notes |
|---|---|
| [Bun](https://bun.sh) >= 1.2 | Runtime, bundler, test runner, SQLite |
| [Oh-my-pi](https://github.com/can1357/oh-my-pi) | Coding agent — must be installed and configured (`omp` on PATH) |
| Git | Repository with remote configured |
| Linear API key | `lin_api_...` — obtain from Linear Settings > API |
| GitHub CLI (`gh`) | Authenticated — run `gh auth status` to verify |
| Notion API key + database ID | `ntn_...` — create an internal integration at notion.so/my-integrations |

## Installation

```bash
git clone <repo-url> && cd specstar
bun install
```

## Configuration

### File discovery (highest priority first)

1. `$SPECSTAR_CONFIG_FILE` — explicit path override
2. `$XDG_CONFIG_HOME/specstar/config.yml` (default: `~/.config/specstar/config.yml`)
3. `~/.specstar.yml`
4. `.specstar.yml` in cwd (project-level)

Project-level config merges onto global. Nested objects are shallow-merged; arrays are concatenated.

### Minimal config.yml

```yaml
linear:
  apiKey: "lin_api_..."        # or set SPECSTAR_LINEAR_API_KEY
  teamId: "TEAM-UUID"
  assignedToMe: true
  refreshInterval: 30

github:
  repo: "owner/repo"          # auto-detected from git remote if omitted
  refreshInterval: 30

notion:
  apiKey: "ntn_..."            # or set SPECSTAR_NOTION_API_KEY
  databaseId: "..."
  refreshInterval: 60

sessions:
  model: "claude-sonnet"
  thinkingLevel: "high"
  maxConcurrent: 8
  worktreeBase: "../worktrees"
```

### Environment variables

| Variable | Purpose |
|---|---|
| `SPECSTAR_LINEAR_API_KEY` | Linear API authentication |
| `SPECSTAR_NOTION_API_KEY` | Notion API authentication |
| `SPECSTAR_CONFIG_FILE` | Config file path override |

### Setup wizard

```bash
specstar setup
```

Interactive wizard that:
1. Detects GitHub repo from git remote
2. Prompts for Linear API key, validates it, lists teams for selection
3. Prompts for Notion API key and database selection
4. Configures max concurrent sessions
5. Writes config to project or global location

## Development

```bash
bun run dev          # Start TUI in dev mode (bun src/index.tsx)
bun run fmt          # Format with oxfmt
bun run fmt:check    # Check formatting without writing
bun run lint         # Lint with oxlint
bun run lint:fix     # Lint and auto-fix
bun test             # Run test suite
```

## Build

Compile a standalone binary:

```ts
// build.ts
import solidPlugin from "@opentui/solid/bun-plugin"

await Bun.build({
  entrypoints: ["./src/index.tsx"],
  plugins: [solidPlugin],
  compile: {
    target: "bun-darwin-arm64",
    outfile: "./specstar",
  },
})
```

```bash
bun run build.ts
```

Output: `./specstar` binary in project root.

Symlink for global access:

```bash
ln -sf "$(pwd)/specstar" /usr/local/bin/specstar
```

## Project Structure

```
src/
  index.tsx              # Application entry point

docs/
  DESIGN.md              # Original 4-card grid design
  DESIGN-2.md            # Issue-centric master-detail design

specs/
  001-issue-centric-tui/
    spec.md              # Feature specification
    research.md          # Research findings
    quickstart.md        # This file
```

Planned `src/` layout (per DESIGN-2.md):

```
src/
  services/              # Per-integration services (Linear, GitHub, Notion)
  workers/               # Bun Worker actors for agent sessions
  ui/
    components/          # SolidJS/OpenTUI components
    views/               # Master-detail layout, panes, tabs
  state/                 # Reactive stores, computed enrichment
  config/                # Config loading, schema validation
  db/                    # SQLite schema, migrations, per-service tables
  index.tsx              # Entry point
```

## Key Concepts

**Issue as primary entity.** Every view radiates from a Linear issue. Sessions, PRs, specs, and worktrees are linked to issues through branch name matching — not stored foreign keys. The issue list is the single navigational spine.

**Master-detail layout.** Left pane: issue list grouped into sections (Attention, Active, Backlog, Unlinked). Right pane: detail tabs (Overview, Spec, Review) for the selected issue. Section grouping and status badge priority are pure functions over enriched issue state.

**Session pool and worker isolation.** Agent sessions run in Bun Workers as actors. Each worker owns its session lifecycle. Communication with the main thread is via `postMessage` with JSON-serialized immutable events. `maxConcurrent` caps parallelism.

**Enrichment and branch matching.** Cross-entity linking is computed at the application layer. A session or PR is associated with an issue when its branch name contains the issue identifier. No cross-service foreign keys exist in SQLite — each service owns its own tables.

**Command palette as action gateway.** All actions (start session, approve tool call, open PR, refresh) are invoked through the command palette (`/`). Context-sensitive: available commands change based on the selected issue and its state.
