# Specstar Monorepo - CRUSH Configuration

## Build, Lint & Test Commands

### Root/Monorepo Commands
```bash
pnpm build          # Build all packages with Turbo
pnpm dev            # Start all dev servers with Turbo
pnpm lint           # Run ESLint across all packages
pnpm typecheck      # Run TypeScript checks with Turbo
pnpm clean          # Clean build artifacts and caches
```

### Platform (Next.js)
```bash
pnpm --filter @specstar/platform dev        # Start Next.js dev server with --turbo
pnpm --filter @specstar/platform build      # Production build with Next.js
pnpm --filter @specstar/platform lint       # Next.js lint
pnpm --filter @specstar/platform typecheck  # TypeScript check
```

### CLI (Bun + React/Ink)
```bash
pnpm --filter @specstar/cli dev             # Run CLI in dev mode
pnpm --filter @specstar/cli test            # Run all CLI tests with Bun:test
pnpm --filter @specstar/cli test <file>     # Run single test file
pnpm --filter @specstar/cli test:watch      # Watch mode for tests
pnpm --filter @specstar/cli lint            # ESLint for CLI
pnpm --filter @specstar/cli build           # Build CLI for distribution
pnpm --filter @specstar/cli build:binary    # Build standalone binary
```

### Database (Prisma + Platform)
```bash
pnpm db:migrate    # Run migrations with Better Auth
pnpm db:push       # Push schema changes to database
pnpm db:generate   # Generate Prisma client
```

## Code Style Guidelines

### TypeScript & Types
- Use strict TypeScript with no implicit any
- Define comprehensive interfaces for all domain objects
- Use type imports: `import type { Metadata } from "next"`
- Explicit return types on functions: `(props: Props): JSX.Element =>`
- Prefer unions over enums: `'pending' | 'in-progress' | 'completed'`

### React Components
- Functional components only (no classes)
- Named imports from React: `import { useState, useEffect } from "react"`
- No explicit React import (React 19+)
- Proper TypeScript props interfaces for all components
- Default export for components, named exports for utilities

### Import Organization
```typescript
// External libraries first (alphabetical)
import { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { describe, test, expect } from "bun:test";

// Internal modules (named imports)
import { DocumentViewer } from "../../src/components/document-viewer";
import type { Document } from "../../src/models/document";
```

### Naming Conventions
- camelCase for variables, functions, methods
- PascalCase for components, interfaces, types
- UPPER_CASE for constants and enum-like values
- kebab-case for file names
- No Hungarian notation or type prefixes

### Formatting & Style
- 2-space indentation
- Double quotes for strings
- Semicolons always required
- Trailing commas in multi-line structures
- Max line length: reasonable (let Prettier handle)
- Prettier for automatic formatting

### Error Handling
- Try/catch blocks for async operations
- Proper error messages: `err instanceof Error ? err.message : "Generic error"`
- Loading and error states in UI components
- Graceful fallbacks for missing data

### Testing
- Bun:test framework with describe/test/expect
- Test filenames: `<component>.test.tsx`
- Ink-testing-library for React/Ink components
- Mock setup in `tests/setup.ts`
- Mock consoles unless DEBUG=true

### File Structure
- `src/` for source code
- `tests/` for all test types (unit, integration, e2e, performance)
- `components/ui/` for reusable UI components
- `lib/` for utilities and business logic
- `models/` for type definitions
- Flat structure preferred over deep nesting

### Key Dependencies
- Next.js 15.5, React 19, TypeScript 5.7
- Bun for CLI runtime and testing
- Tailwind CSS for styling, Radix UI components
- Prisma + Better Auth for data/auth
- Turborepo for monorepo management
- ESLint + Prettier for code quality
</content>
<parameter name="file_path">CRUSH.md
