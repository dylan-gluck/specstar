# Specstar Monorepo Migration Strategy

## Overview

This document outlines the step-by-step process to migrate the existing Specstar platform and CLI repositories into a unified Turborepo monorepo structure. The migration will preserve git history, establish shared packages, and configure build orchestration.

## Target Structure

```
~/Workspace/specstar-mono/
├── apps/
│   ├── platform/          # Next.js web application
│   └── cli/               # Bun CLI tool
├── packages/
│   ├── shared/            # Shared types and utilities
│   └── config/            # Shared configurations
├── turbo.json             # Turborepo configuration
├── package.json           # Root package.json
├── pnpm-workspace.yaml    # PNPM workspace configuration
├── .gitignore
└── README.md
```

## Migration Steps

### Phase 1: Create Monorepo Structure

#### 1.1 Initialize New Repository
```bash
# Create new monorepo directory
mkdir ~/Workspace/specstar-mono
cd ~/Workspace/specstar-mono

# Initialize git repository
git init
git branch -M main

# Create initial commit
echo "# Specstar Monorepo" > README.md
git add README.md
git commit -m "Initial commit: Setup monorepo structure"
```

#### 1.2 Setup Turborepo
```bash
# Initialize package.json
pnpm init

# Install Turborepo
pnpm add -D turbo

# Create directory structure
mkdir -p apps packages/shared packages/config
```

#### 1.3 Create Root Configuration Files

**package.json** (root):
```json
{
  "name": "specstar-mono",
  "version": "0.0.1",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "clean": "turbo run clean",
    "db:migrate": "pnpm --filter platform db:migrate",
    "db:push": "pnpm --filter platform db:push",
    "db:generate": "pnpm --filter platform db:generate"
  },
  "devDependencies": {
    "turbo": "^2.3.3",
    "@types/node": "^22.5.5",
    "typescript": "^5.7.2",
    "prettier": "^3.4.2"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  },
  "packageManager": "pnpm@9.15.2"
}
```

**turbo.json**:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"],
      "env": [
        "NODE_ENV",
        "DATABASE_URL",
        "BETTER_AUTH_SECRET",
        "BETTER_AUTH_URL",
        "NEXT_PUBLIC_BASE_URL",
        "OPENAI_API_KEY"
      ]
    },
    "dev": {
      "persistent": true,
      "cache": false,
      "env": [
        "DATABASE_URL",
        "BETTER_AUTH_SECRET",
        "BETTER_AUTH_URL",
        "NEXT_PUBLIC_BASE_URL",
        "OPENAI_API_KEY",
        "SPECSTAR_CONFIG_PATH"
      ]
    },
    "lint": {
      "outputs": []
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "clean": {
      "cache": false
    },
    "db:migrate": {
      "cache": false,
      "env": ["DATABASE_URL", "BETTER_AUTH_SECRET"]
    },
    "db:push": {
      "cache": false,
      "env": ["DATABASE_URL"]
    },
    "db:generate": {
      "outputs": ["src/generated/**", "generated/**"],
      "env": ["DATABASE_URL"]
    }
  },
  "globalEnv": [
    "NODE_ENV"
  ],
  "globalPassThroughEnv": [
    "DATABASE_URL",
    "BETTER_AUTH_SECRET",
    "BETTER_AUTH_URL",
    "NEXT_PUBLIC_BASE_URL",
    "OPENAI_API_KEY",
    "SPECSTAR_CONFIG_PATH",
    "LOG_LEVEL"
  ]
}
```

**pnpm-workspace.yaml**:
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**.gitignore** (root):
```
# Dependencies
node_modules
.pnp
.pnp.js

# Testing
coverage

# Build outputs
.next
.turbo
dist
build
*.tsbuildinfo

# Misc
.DS_Store
*.pem
.env*.local

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# IDE
.vscode/*
!.vscode/extensions.json
.idea

# Turborepo
.turbo
```

### Phase 2: Migrate Platform Repository

#### 2.1 Add Platform as Subtree with History
```bash
cd ~/Workspace/specstar-mono

# Add platform repo as remote
git remote add platform ~/Workspace/projects/specstar-platform

# Fetch platform history
git fetch platform

# Merge platform into apps/platform preserving history
git read-tree --prefix=apps/platform/ -u platform/main

# Commit the merge
git commit -m "Migrate platform to monorepo with history"

# Remove the remote
git remote remove platform
```

#### 2.2 Update Platform Configuration

**apps/platform/package.json** (update):
```json
{
  "name": "@specstar/platform",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "next dev --turbo",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "db:migrate": "better-auth migrate && prisma migrate dev",
    "db:push": "prisma db push",
    "db:generate": "prisma generate",
    "db:reset": "prisma migrate reset --force",
    "clean": "rm -rf .next .turbo dist"
  },
  "dependencies": {
    "@specstar/shared": "workspace:*",
    "@ai-sdk/openai": "^1.3.24",
    "@hookform/resolvers": "^5.2.2",
    "@mastra/core": "^0.16.3",
    "@mastra/libsql": "^0.14.1",
    "@mastra/loggers": "^0.10.11",
    "@mastra/memory": "^0.15.1",
    "@prisma/client": "^6.16.1",
    "@trpc/server": "^11.0.0",
    "@trpc/client": "^11.0.0",
    "@trpc/react-query": "^11.0.0",
    "@trpc/next": "^11.0.0",
    "@tanstack/react-query": "^5.0.0",
    "better-auth": "^1.3.10",
    "pg": "^8.16.3",
    "zod": "^4.1.8",
    "@radix-ui/react-accordion": "^1.2.12",
    "@radix-ui/react-alert-dialog": "^1.1.15",
    "@radix-ui/react-avatar": "^1.1.10",
    "@radix-ui/react-checkbox": "^1.3.3",
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-dropdown-menu": "^2.1.16",
    "@radix-ui/react-label": "^2.1.7",
    "@radix-ui/react-popover": "^1.1.15",
    "@radix-ui/react-select": "^2.2.6",
    "@radix-ui/react-separator": "^1.1.7",
    "@radix-ui/react-slot": "^1.2.3",
    "@radix-ui/react-switch": "^1.2.6",
    "@radix-ui/react-tabs": "^1.1.13",
    "@radix-ui/react-tooltip": "^1.2.8",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "lucide-react": "^0.544.0",
    "tailwind-merge": "^3.3.1",
    "next": "15.5.3",
    "next-themes": "^0.4.6",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "react-hook-form": "^7.62.0",
    "date-fns": "^4.1.0",
    "sonner": "^2.0.7"
  },
  "devDependencies": {
    "@types/node": "^22.5.5",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@types/pg": "^8.10.0",
    "eslint": "^9",
    "eslint-config-next": "15.5.3",
    "prisma": "^6.16.1",
    "@tailwindcss/postcss": "^4",
    "tailwindcss": "^4",
    "typescript": "^5.7.2"
  }
}
```

#### 2.3 Update Import Paths
```bash
# Update imports to use shared package
# Update @/lib/types to @specstar/shared/types
# Update @/lib/api to use tRPC from shared
```

### Phase 3: Migrate CLI Repository

#### 3.1 Add CLI as Subtree with History
```bash
cd ~/Workspace/specstar-mono

# Add CLI repo as remote
git remote add cli ~/Workspace/projects/specstar

# Fetch CLI history
git fetch cli

# Merge CLI into apps/cli preserving history
git read-tree --prefix=apps/cli/ -u cli/main

# Commit the merge
git commit -m "Migrate CLI to monorepo with history"

# Remove the remote
git remote remove cli
```

#### 3.2 Update CLI Configuration

**apps/cli/package.json** (update):
```json
{
  "name": "@specstar/cli",
  "version": "0.0.1",
  "private": false,
  "type": "module",
  "bin": {
    "specstar": "./dist/cli.js"
  },
  "scripts": {
    "dev": "bun run src/cli.tsx",
    "build": "bun build src/cli.tsx --outdir dist --target node --format esm",
    "build:binary": "bun build --compile --outfile=dist/specstar src/cli.tsx",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src",
    "test": "bun test",
    "test:watch": "bun test --watch",
    "install:global": "bun run build:binary && sudo cp dist/specstar /usr/local/bin/",
    "uninstall:global": "sudo rm -f /usr/local/bin/specstar"
  },
  "dependencies": {
    "@specstar/shared": "workspace:*",
    "@trpc/client": "^11.0.0",
    "@types/minimatch": "^6.0.0",
    "cli-highlight": "^2.1.11",
    "fullscreen-ink": "^0.1.0",
    "gray-matter": "^4.0.3",
    "ink": "^6.3.0",
    "ink-big-text": "^2.0.0",
    "ink-gradient": "^3.0.0",
    "ink-syntax-highlight": "^2.0.2",
    "ink-table": "^3.1.0",
    "marked": "^16.2.1",
    "meow": "^13.2.0",
    "minimatch": "^10.0.3",
    "react": "^19.1.1"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "@types/marked": "^6.0.0",
    "chalk": "^5.6.2",
    "ink-testing-library": "^4.0.0",
    "react-devtools-core": "^6.1.5",
    "typescript": "^5.7.2"
  },
  "engines": {
    "bun": ">=1.0.0"
  }
}
```

### Phase 4: Create Shared Packages

#### 4.1 Setup Shared Types Package

**packages/shared/package.json**:
```json
{
  "name": "@specstar/shared",
  "version": "0.0.1",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./types": {
      "types": "./dist/types/index.d.ts",
      "import": "./dist/types/index.js"
    },
    "./api": {
      "types": "./dist/api/index.d.ts",
      "import": "./dist/api/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@trpc/server": "^11.0.0",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "typescript": "^5.7.2",
    "@types/node": "^22.5.5"
  }
}
```

**packages/shared/tsconfig.json**:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "declarationMap": true,
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**packages/shared/src/index.ts**:
```typescript
export * from './types'
export * from './api'
```

**packages/shared/src/types/index.ts**:
```typescript
// Core domain types
export interface User {
  id: string
  email: string
  name: string
  emailVerified: boolean
  image?: string
  createdAt: Date
  updatedAt: Date
}

export interface Organization {
  id: string
  name: string
  ownerId: string
  createdAt: Date
  updatedAt: Date
}

export interface Project {
  id: string
  name: string
  description?: string
  ownerId: string
  ownerType: 'user' | 'organization'
  createdAt: Date
  updatedAt: Date
}

export interface Document {
  id: string
  name: string
  content: string
  type?: 'constitution' | 'spec' | 'prd' | 'other'
  projectId: string
  createdAt: Date
  updatedAt: Date
}

export interface Story {
  id: string
  name: string
  description: string
  status: 'pending' | 'in-progress' | 'completed'
  projectId: string
  createdAt: Date
  updatedAt: Date
}

export interface ApiKey {
  id: string
  key: string
  name: string
  ownerId: string
  ownerType: 'user' | 'organization'
  expiresAt: Date
  createdAt: Date
}
```

**packages/shared/src/api/index.ts**:
```typescript
import { initTRPC } from '@trpc/server'
import { z } from 'zod'

const t = initTRPC.create()

export const router = t.router
export const publicProcedure = t.procedure
export const protectedProcedure = t.procedure // Will add auth middleware

// Validation schemas
export const projectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  ownerType: z.enum(['user', 'organization'])
})

export const documentSchema = z.object({
  name: z.string().min(1).max(255),
  content: z.string(),
  type: z.enum(['constitution', 'spec', 'prd', 'other']).optional()
})

export const storySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string(),
  status: z.enum(['pending', 'in-progress', 'completed'])
})
```

#### 4.2 Setup Config Package

**packages/config/package.json**:
```json
{
  "name": "@specstar/config",
  "version": "0.0.1",
  "private": true,
  "main": "index.js",
  "files": [
    "eslint",
    "typescript"
  ]
}
```

### Phase 5: Update Git Configuration

#### 5.1 Update Git Submodules (if applicable)
```bash
# If the original repos were submodules in another project
cd ~/Workspace/claude/brainstorm

# Remove old submodules
git rm projects/specstar-platform
git rm projects/specstar

# Add new monorepo as submodule
git submodule add ~/Workspace/specstar-mono projects/specstar-mono

# Commit the changes
git commit -m "Update submodules to use monorepo structure"
```

#### 5.2 Setup Remote Repository
```bash
cd ~/Workspace/specstar-mono

# Add remote origin (GitHub/GitLab/etc)
git remote add origin git@github.com:yourusername/specstar-mono.git

# Push to remote
git push -u origin main
```

### Phase 6: Verify Migration

#### 6.1 Install Dependencies
```bash
cd ~/Workspace/specstar-mono
pnpm install
```

#### 6.2 Build All Packages
```bash
pnpm build
```

#### 6.3 Run Tests
```bash
pnpm test
pnpm typecheck
pnpm lint
```

## Post-Migration Tasks

### 1. Update CI/CD Configuration
- Update GitHub Actions workflows for monorepo structure
- Configure Turborepo remote caching
- Setup deployment pipelines for each app

### 2. Update Documentation
- Update README files with monorepo instructions
- Document development workflow
- Update contribution guidelines

### 3. Archive Old Repositories
```bash
# Archive the original repositories
cd ~/Workspace/projects/specstar-platform
git tag -a archive-pre-monorepo -m "Archive before monorepo migration"
git push --tags

cd ~/Workspace/projects/specstar
git tag -a archive-pre-monorepo -m "Archive before monorepo migration"
git push --tags

# Add deprecation notice to README
echo "# DEPRECATED: Moved to monorepo" > README.md
echo "This repository has been migrated to: https://github.com/yourusername/specstar-mono" >> README.md
git add README.md
git commit -m "Add deprecation notice"
git push
```

### 4. Environment Configuration

Create `.env.example` files:

**apps/platform/.env.example**:
```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/specstar"

# Better-auth Configuration
BETTER_AUTH_SECRET="your-secret-here-32-chars-min"
BETTER_AUTH_URL="http://localhost:3000"

# Next.js
NEXT_PUBLIC_BASE_URL="http://localhost:3000"

# OpenAI (for Mastra agents)
OPENAI_API_KEY="sk-proj-your-api-key-here"

# Optional: Email configuration (for Better-auth email features)
# EMAIL_FROM="noreply@yourapp.com"
# EMAIL_SERVER_HOST="smtp.yourprovider.com"
# EMAIL_SERVER_PORT=587
# EMAIL_SERVER_USER="your-smtp-user"
# EMAIL_SERVER_PASSWORD="your-smtp-password"
```

**apps/cli/.env.example**:
```env
# API Configuration
SPECSTAR_API_URL="http://localhost:3000/api"

# Optional: Override default config directory
# SPECSTAR_CONFIG_PATH=.specstar
```

## Key Configuration Updates

### Turbo.json Corrections
1. **Environment Variables**: Fixed authentication variables from `NEXTAUTH_*` to `BETTER_AUTH_*`
2. **Added Missing Variables**: `NEXT_PUBLIC_BASE_URL`, `OPENAI_API_KEY`, `SPECSTAR_CONFIG_PATH`
3. **Database Migrations**: Added `BETTER_AUTH_SECRET` to `db:migrate` for Better-auth migrations
4. **Build Outputs**: Removed unused `build/**`, kept `.next/**` and `dist/**`

### Platform Package.json Updates
- **Added tRPC Dependencies**: Server, client, React Query, and Next.js integrations
- **Complete UI Libraries**: All Radix UI components for Shadcn/UI
- **Database Scripts**: Added `db:reset` and `clean` scripts
- **Mastra Framework**: All required packages for agent functionality

### CLI Package.json Updates
- **Build Scripts**: Added `build:binary` for compiled executable
- **Global Install**: Scripts for system-wide CLI installation
- **Complete Dependencies**: All Ink UI components and utilities
- **Test Scripts**: Added `test:watch` for development

## Benefits of Monorepo Structure

1. **Shared Code**: Types, utilities, and API contracts are shared between platform and CLI
2. **Atomic Changes**: Related changes across apps can be made in a single commit
3. **Consistent Dependencies**: Unified dependency management with PNPM workspaces
4. **Build Orchestration**: Turborepo handles build order and caching
5. **Type Safety**: tRPC types are automatically shared between client and server
6. **Development Experience**: Single `pnpm install` and coordinated dev servers

## Troubleshooting

### Common Issues

1. **Git History Issues**
   - Use `git subtree` instead of `read-tree` for more complex history preservation
   - Consider using `git filter-branch` to rewrite paths if needed

2. **Import Path Updates**
   - Use find/replace across codebase: `@/lib/types` → `@specstar/shared/types`
   - Update tsconfig.json path mappings

3. **Build Order Problems**
   - Ensure `dependsOn: ["^build"]` in turbo.json for dependent packages
   - Run `pnpm build` from root to build in correct order

4. **Type Resolution Issues**
   - Ensure TypeScript `composite: true` in dependent packages
   - Use `references` in tsconfig.json for project references

## Rollback Strategy

If migration fails:
1. The original repositories remain intact (tagged as archive-pre-monorepo)
2. Remove the monorepo directory
3. Continue development in original repositories
4. Retry migration after addressing issues

## Timeline

- **Day 1**: Create monorepo structure, migrate platform
- **Day 2**: Migrate CLI, create shared packages
- **Day 3**: Update imports, test integration
- **Day 4**: Documentation and CI/CD updates
- **Day 5**: Final testing and deployment

## Success Criteria

- [ ] Both apps build successfully in monorepo
- [ ] Shared types work correctly between platform and CLI
- [ ] Git history preserved from both repositories
- [ ] Development servers run without errors
- [ ] All tests pass
- [ ] Type checking passes across all packages
- [ ] Documentation updated
- [ ] Team can clone and run the monorepo
