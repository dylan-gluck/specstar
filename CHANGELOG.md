# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1] - 2025-02-25

Initial development release.

### Added

- Issue-centric TUI with master-detail layout (left pane issue list, right pane detail view)
- Linear integration for issue browsing and triage
- Notion integration for linked documents
- GitHub integration for pull request review inline
- Agent session management from issue view (create, monitor, stop sessions)
- Command palette with fuzzy search for workflows
- Spec approval workflow with text overlay
- Responsive layout adapting across terminal sizes
- SQLite-backed local cache for offline-capable browsing
- JSON schema generation for config validation (`specstar.schema.json`)
- Compiled standalone binary via Bun (`dist/specstar`)
- `build:link` script that compiles the binary and symlinks it to `~/.local/bin/specstar` for global access.
- `--version` / `--help` CLI flags

### Fixed

- Build: compiled binary no longer fails with `preload not found` when run from the project root. Moved the Solid preload from top-level `bunfig.toml` to an explicit `--preload` CLI flag in the dev script so it does not interfere with the standalone binary.
- Build: added `target: "bun"` to `Bun.build()` to match the recommended opentui/solid configuration.
