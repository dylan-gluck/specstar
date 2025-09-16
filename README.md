# Specstar Monorepo

Platform + CLI tool for collaborative spec-driven development.

Main Features:
* Project specs and documentation maintained independently from codebase
* Integrated knowledge graph for large codebase understanding and dependency mapping
* Agentic tasks and workflows for planning features, epics, sprints and whole projects
* Web-ui for managing projects, tasks and requirements
* CLI tool that connects coding agents to the platform within project repo

## Monorepo Structure

```
specstar-mono/
├── apps/
│   ├── platform/          # Next.js web application
│   └── cli/               # Bun CLI tool
├── packages/
│   ├── shared/            # Shared types and utilities
│   └── config/            # Shared configurations
```

## Quick Start

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Bun >= 1.0.0 (for CLI development)
- PostgreSQL database

### Installation

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Development

```bash
# Run all development servers
pnpm dev

# Run specific app
pnpm --filter @specstar/platform dev
pnpm --filter @specstar/cli dev
```

## Available Scripts

### Root Commands

- `pnpm build` - Build all packages
- `pnpm dev` - Start all dev servers
- `pnpm lint` - Run linting across all packages
- `pnpm typecheck` - Type check all packages
- `pnpm clean` - Clean build artifacts

### Database Commands (Platform)

- `pnpm db:migrate` - Run database migrations
- `pnpm db:push` - Push schema changes
- `pnpm db:generate` - Generate Prisma client

## Components

### Platform (`apps/platform`)

* Platform as a service, open-source community edition run locally
* User authentication, user can belong to an organization
* Projects belong to user or organization
* Each project has a Knowledge-graph and markdown documents
* Built with Next.js 15.5, Better-auth, Prisma, tRPC, and Tailwind CSS

### CLI Tool (`apps/cli`)

* CLI tool `specstar` connects to platform instance (API key)
* Commands to fetch project context, specs, requirements
* Observibility hooks to monitor sessions
* Built with Bun, Ink for terminal UI, and React components

## Configuration

### Environment Variables

Create `.env.local` files in respective app directories. See example files:
- `apps/platform/.env.example`
- `apps/cli/.env.example`

## Build System

This monorepo uses Turborepo for:
- Intelligent caching
- Parallel execution
- Dependency graph awareness
- Remote caching support

## Deployment

### Platform

Deploy to Vercel, any Node.js hosting provider, or Docker containers.

### CLI

```bash
# Build binary
pnpm --filter @specstar/cli build:binary

# Install globally
pnpm --filter @specstar/cli install:global
```
