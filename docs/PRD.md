# Specstar Product Requirements Document (PRD)

## Executive Summary

Specstar is a spec-driven development platform that enables teams to maintain living project specifications, documentation, and requirements separate from their codebase. The platform combines a locally-run web application with a CLI tool to provide seamless integration between project planning and code development.

**Pre-Alpha Scope**: Build the foundational platform with authentication, project management, document storage, and CLI connectivity.

## Product Vision

### Problem Statement
Development teams struggle to maintain accurate, up-to-date project documentation and specifications. Documentation often becomes outdated as codebases evolve, and there's a disconnect between high-level project requirements and day-to-day coding activities.

### Solution
Specstar provides a centralized platform for spec-driven development where:
- Project specifications live independently from code
- Documentation stays connected to development through CLI integration
- Teams collaborate on living documents that guide implementation
- AI coding assistants access project context through the CLI

### Target Users (Pre-Alpha)
- Individual developers using AI coding assistants
- Small development teams wanting better documentation practices
- Technical founders planning new projects

## System Architecture

### High-Level Architecture
```
┌─────────────────────────────────────────────┐
│                 Monorepo                     │
│  ┌──────────────────────────────────────┐   │
│  │         apps/platform                │   │
│  │  - Next.js Web Application          │   │
│  │  - tRPC API                         │   │
│  │  - Better-auth                      │   │
│  │  - PostgreSQL Database              │   │
│  └──────────────────────────────────────┘   │
│                     ↕                        │
│  ┌──────────────────────────────────────┐   │
│  │       packages/shared                │   │
│  │  - TypeScript Types                  │   │
│  │  - API Contracts                     │   │
│  └──────────────────────────────────────┘   │
│                     ↕                        │
│  ┌──────────────────────────────────────┐   │
│  │          apps/cli                    │   │
│  │  - Bun Runtime                       │   │
│  │  - React + Ink TUI                   │   │
│  │  - tRPC Client                       │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### Technology Stack

#### Platform (Web Application)
- **Framework**: Next.js 15.5.3 with App Router
- **API**: tRPC for type-safe API
- **Authentication**: Better-auth with PostgreSQL adapter
- **Database**: PostgreSQL with Prisma ORM
- **UI Components**: Shadcn/UI with Tailwind CSS
- **Runtime**: Node.js

#### CLI Tool
- **Runtime**: Bun
- **UI Framework**: React with Ink (Terminal UI)
- **API Client**: tRPC client
- **Configuration**: JSON-based local storage

#### Shared Infrastructure
- **Monorepo**: Turbo
- **Types**: Shared TypeScript package
- **Language**: TypeScript

## Functional Requirements

### 1. Authentication & Authorization

#### 1.1 User Authentication
- **Email/password registration and login**
- **Session management with secure cookies**
- **Protected routes with automatic redirects**
- **Password requirements validation**

#### 1.2 Organization Management
- **Create and manage organizations**
- **Flat organization structure**
- **Three roles**: owner, admin, member
- **Organization-wide project access**
- **Member invitation system (future)**

#### 1.3 API Key Management
- **Generate API keys for CLI authentication**
- **Set expiration date when creating keys**
- **Keys scoped to user's projects**
- **Bearer token authentication format**
- **List and revoke active keys**

### 2. Project Management

#### 2.1 Project CRUD Operations
- **Create projects (personal or organization)**
- **List user/organization projects**
- **View project details**
- **Update project metadata**
- **Delete projects with confirmation**

#### 2.2 Project Ownership
- **Projects belong to user OR organization**
- **Ownership type field (user/organization)**
- **Access control based on ownership**
- **Future: Transfer ownership between entities**

### 3. Document Management

#### 3.1 Document Storage
- **Markdown-based documents**
- **Belongs to specific project**
- **Document types**: Constitution, Specs, PRDs
- **Type validation in application layer**

#### 3.2 Document Operations
- **Create documents via API**
- **Read document content**
- **Update documents (full replacement)**
- **Delete documents**
- **List project documents**

#### 3.3 Document Viewing
- **Plain text display in web UI**
- **No editing in web UI (pre-alpha)**
- **No markdown preview (pre-alpha)**
- **No versioning (pre-alpha)**

### 4. Story Management

#### 4.1 Story Tracking
- **User stories and tasks**
- **Three statuses**: pending, in-progress, completed
- **Belongs to specific project**
- **Name and description fields**

#### 4.2 Story Operations
- **Create stories via API**
- **Update story status and details**
- **List project stories**
- **Delete stories**

### 5. Web Application UI

#### 5.1 Authentication Pages
- **Sign-in page with email/password**
- **Sign-up page with registration form**
- **Logout functionality**

#### 5.2 Dashboard
- **List user's personal projects**
- **List organization projects**
- **Project creation button**
- **Navigation to project details**

#### 5.3 Project Page
- **Display project metadata**
- **List project documents**
- **List project stories**
- **View document content (read-only)**
- **Navigation between documents**

#### 5.4 Settings Page
- **Three sections**: Profile, Organization, API Keys
- **Profile**: View/edit user information
- **Organization**: Manage organizations and members
- **API Keys**: Generate and manage API keys

### 6. API Specification (tRPC)

#### 6.1 Authentication Procedures
- `auth.signIn` - User login
- `auth.signUp` - User registration
- `auth.signOut` - User logout
- `auth.validateApiKey` - Validate CLI API key

#### 6.2 Project Procedures
- `project.list` - List accessible projects
- `project.create` - Create new project
- `project.get` - Get project details
- `project.update` - Update project
- `project.delete` - Delete project

#### 6.3 Document Procedures
- `document.list` - List project documents
- `document.create` - Create document
- `document.get` - Get document content
- `document.update` - Update document
- `document.delete` - Delete document

#### 6.4 Story Procedures
- `story.list` - List project stories
- `story.create` - Create story
- `story.update` - Update story
- `story.delete` - Delete story

#### 6.5 Organization Procedures
- `organization.create` - Create organization
- `organization.list` - List user's organizations
- `organization.get` - Get organization details
- `organization.updateMember` - Update member role

#### 6.6 API Key Procedures
- `apiKey.create` - Generate new API key
- `apiKey.list` - List user's API keys
- `apiKey.revoke` - Revoke API key

### 7. CLI Tool

#### 7.1 Authentication
- **Store API key in `.specstar/config.json`**
- **Store project ID in config**
- **Send Bearer token in requests**
- **Handle expired/invalid keys**

#### 7.2 CLI Commands
- `specstar` - Launch TUI
- `specstar --init` - Initialize configuration
- `specstar auth <api-key>` - Set API key
- `specstar project <id>` - Set active project
- `specstar document list` - List documents
- `specstar document get <id>` - Get document content
- `specstar story list` - List stories

#### 7.3 TUI Features
- **Plan View**:
  - Display remote documents from platform
  - Cache document list in memory
  - Fetch documents on selection
  - Plain text viewing
- **Observe View**:
  - Keep existing Claude Code monitoring
  - Session tracking and metrics
  - Local storage of sessions

## Non-Functional Requirements

### 1. Performance
- **Page load time < 2 seconds**
- **API response time < 500ms**
- **CLI command response < 1 second**
- **Support 100 concurrent users (pre-alpha)**

### 2. Security
- **Secure password hashing (Better-auth)**
- **API key authentication for CLI**
- **HTTPS only in production**
- **SQL injection prevention (Prisma)**
- **XSS protection (React)**

### 3. Usability
- **Intuitive navigation**
- **Clear error messages**
- **Keyboard shortcuts in CLI**
- **Responsive web design**

### 4. Reliability
- **99% uptime for local instance**
- **Graceful error handling**
- **Database backup capability**
- **Session persistence**

### 5. Development
- **TypeScript for type safety**
- **Monorepo for code sharing**
- **Comprehensive logging**

## Data Model

### Core Entities

```typescript
// User (managed by Better-auth)
type User = {
  id: string
  email: string
  name: string
  emailVerified: boolean
  image?: string
  createdAt: Date
  updatedAt: Date
}

// Organization (Better-auth plugin)
type Organization = {
  id: string
  name: string
  ownerId: string
  createdAt: Date
  updatedAt: Date
}

// Organization Member (Better-auth plugin)
type OrganizationMember = {
  organizationId: string
  userId: string
  role: 'owner' | 'admin' | 'member'
  createdAt: Date
}

// API Key (Better-auth plugin)
type ApiKey = {
  id: string
  key: string
  name: string
  ownerId: string
  ownerType: 'user' | 'organization'
  expiresAt: Date
  createdAt: Date
}

// Project
type Project = {
  id: string
  name: string
  description?: string
  ownerId: string
  ownerType: 'user' | 'organization'
  createdAt: Date
  updatedAt: Date
}

// Document
type Document = {
  id: string
  name: string
  content: string
  type?: 'constitution' | 'spec' | 'prd' | 'other'
  projectId: string
  createdAt: Date
  updatedAt: Date
}

// Story
type Story = {
  id: string
  name: string
  description: string
  status: 'pending' | 'in-progress' | 'completed'
  projectId: string
  createdAt: Date
  updatedAt: Date
}
```

## Implementation Priorities

### Phase 1: Authentication Foundation
1. **Add Better-auth organization plugin**
2. **Add Better-auth API key plugin**
3. **Run database migrations**
4. **Test authentication flows**

### Phase 2: Data Model & API
1. **Create Prisma schema for Project, Document, Story**
2. **Generate Prisma client**
3. **Implement tRPC procedures**
4. **Add API key validation middleware**
5. **Test API endpoints**

### Phase 3: Web UI Implementation
1. **Build Dashboard page**
2. **Build Project page**
3. **Build Settings page (Profile, Organization, API Keys)**
4. **Implement document viewer**
5. **Add navigation and routing**

### Phase 4: CLI Integration
1. **Add tRPC client to CLI**
2. **Implement authentication commands**
3. **Update Plan view to fetch remote documents**
4. **Add document caching logic**
5. **Test end-to-end flow**

### Phase 5: Testing & Polish
1. **Integration testing**
2. **Error handling improvements**
3. **Documentation**
4. **Performance optimization**
5. **Deployment setup**

## Success Criteria

### Milestones
- [ ] Users can register and sign in
- [ ] Users can create organizations
- [ ] Users can generate API keys
- [ ] Users can create projects
- [ ] Users can add documents to projects
- [ ] CLI can authenticate with API key
- [ ] CLI can fetch and display documents
- [ ] Platform runs locally without errors

## Risks & Mitigation

### Technical Risks
1. **Risk**: Complex Better-auth plugin integration
   - **Mitigation**: Start with minimal configuration, add features incrementally

2. **Risk**: tRPC type synchronization issues
   - **Mitigation**: Use shared types package, automated type generation

3. **Risk**: Database migration failures
   - **Mitigation**: Test migrations locally, maintain rollback scripts

### Product Risks
1. **Risk**: Scope creep beyond pre-alpha
   - **Mitigation**: Strictly follow PRD priorities, defer enhancements

2. **Risk**: Poor CLI/Platform integration
   - **Mitigation**: Test end-to-end flows early and often

## Conclusion

This PRD defines a focused pre-alpha implementation of Specstar that delivers core value while establishing a solid foundation for future enhancements. The platform enables spec-driven development through a simple yet powerful combination of web-based project management and CLI-based development integration.

The pre-alpha scope intentionally limits complexity while ensuring all critical components work together seamlessly. This approach allows for rapid iteration and user feedback before investing in advanced features like real-time collaboration or AI-powered document generation.
