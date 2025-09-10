# CLAUDE.md

---

## Development Commands

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Bun automatically loads .env, so don't use dotenv.

## Project: Specstar TUI

Terminal UI for monitoring Claude Code sessions and viewing planning documents.

### Tech Stack
- **Runtime**: Bun
- **UI Framework**: React Ink v6.3.0 (Terminal UI)
- **Language**: TypeScript with React JSX
- **Testing**: Bun test with ink-testing-library

### Key Libraries
- `tui-renderer`: Terminal UI rendering and navigation
- `session-monitor`: Session JSON file watching
- `document-viewer`: Markdown document rendering
- `hook-integrator`: Claude Code lifecycle hooks
- `config-manager`: Settings and initialization

### Commands
```bash
bun install          # Install dependencies
bun run build       # Build executable
bun test            # Run tests
bun run dev         # Development mode
specstar --init     # Initialize in project
```

### Project Structure
```
src/
├── app.tsx         # Main app component
├── cli.tsx         # CLI entry point
├── components/     # UI components
├── views/          # Page views (Plan, Observe)
└── lib/            # Core libraries

.specstar/          # User configuration
├── settings.json   # Config file
├── sessions/       # Session data
├── logs/           # Session logs
└── hooks.ts        # Claude Code hooks
```

### Testing Approach
Follow TDD with this order:
1. Contract tests (CLI interfaces)
2. Integration tests (file system, hooks)
3. E2E tests (full TUI interaction)
4. Unit tests (component logic)

### Recent Changes
- 001-docs-specstar-plan: Added TypeScript + React Ink TUI framework
- 002-fix-session-monitoring-hooks: Fixed settings.json to use folders instead of hooks
