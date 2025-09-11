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
- `session-monitor`: Session JSON file watching (internal)
- `document-viewer`: Markdown document rendering (internal)
- `config-manager`: Settings and initialization (internal)
- `tui-renderer`: Terminal UI rendering and navigation (internal)

### Commands
```bash
bun install         # Install dependencies
bun run build       # Build single executable (dist/specstar)
bun test            # Run tests
bun run dev         # Development mode
specstar --init     # Initialize in project (creates hooks.ts)
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
