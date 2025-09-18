# CLAUDE.md

Specstar is a platform & cli tool for collaborative spec-driven-development.

## Recent Updates:
* Monorepo refactor, started building out shared types & tRCP api
* Added `Organization` and `ApiKey` functionality to platform

## Current Objectives:
* Finalize data model and api contracts
* Knowledge Graph strategy
* Backlog strategy
* Agents, loops, and workflows

---

# Monorepo Structure

## App: Platform
- `apps/platform/` - Platform project root
- `apps/platform/CLAUDE.md` - Project structure & important files

## App: CLI
- `apps/cli/` - CLI project root
- `apps/cli/CLAUDE.md` - Project structure & important files

## Packages: Shared
- `packages/shared/src/api/` - tRCP API (Platform <-> CLI)
- `packages/shared/src/types/` - Shared types
