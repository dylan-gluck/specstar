# Tasks: Specstar - Multi-Session Observability TUI

**Input**: Design documents from `/specs/001-docs-specstar-plan/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/cli-contracts.md, quickstart.md

## Execution Flow (main)

```
1. Load plan.md from feature directory
   → Extract: TypeScript/Bun, React Ink v6.3.0, 5 libraries
   → Structure: Single project (CLI application)
2. Load design documents:
   → data-model.md: 10 entities (Session, Agent, Settings, etc.)
   → contracts/cli-contracts.md: Main CLI + 5 library CLIs
   → research.md: React Ink framework, Bun runtime decisions
   → quickstart.md: Installation and usage scenarios
3. Generate tasks by category:
   → Setup: Complete existing scaffolding
   → Tests: Contract tests for all CLIs, integration tests
   → Core: Complete libraries, fix dynamic loading
   → Integration: Hook script, session monitoring
   → Polish: Error handling, logging, documentation
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001-T037)
6. Dependencies: Tests before implementation, libraries before UI
7. Validate: All CLIs tested, all entities modeled, all features implemented
8. Return: SUCCESS (37 tasks ready for execution)
```

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- TypeScript files use `.ts` and `.tsx` extensions
- Test files use `.test.ts` pattern

## Phase 3.1: Setup

- [ ] T001 Configure TypeScript for strict mode and React JSX in tsconfig.json
- [ ] T002 [P] Set up Bun test configuration for ink-testing-library
- [ ] T003 [P] Create library directory structure in src/lib/

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests - Main CLI
- [ ] T004 [P] Contract test for specstar --help in tests/contract/cli-main-help.test.ts
- [ ] T005 [P] Contract test for specstar --version in tests/contract/cli-main-version.test.ts
- [ ] T006 [P] Contract test for specstar --init in tests/contract/cli-main-init.test.ts
- [ ] T007 [P] Contract test for specstar main TUI launch in tests/contract/cli-main-tui.test.ts

### Contract Tests - Library CLIs
- [ ] T011 [P] Contract test for hook-integrator CLI in tests/contract/cli-hook-integrator.test.ts

### Integration Tests
- [ ] T013 Integration test for initializing specstar in new project in tests/integration/init-project.test.ts
- [ ] T014 Integration test for Plan view keyboard navigation in tests/integration/plan-navigation.test.ts
- [ ] T015 Integration test for loading and rendering markdown documents in tests/integration/document-render.test.ts
- [ ] T016 Integration test for monitoring active Claude Code session in tests/integration/session-monitor.test.ts
- [ ] T017 Integration test for handling corrupted session files in tests/integration/error-recovery.test.ts

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Library Implementations
- [ ] T018 Implement config-manager library with init functionality in src/lib/config-manager/index.ts
- [ ] T019 Implement session-monitor library for file watching in src/lib/session-monitor/index.ts
- [ ] T020 Implement document-viewer library for markdown rendering in src/lib/document-viewer/index.ts
- [ ] T021 Implement hook-integrator library for event processing in src/lib/hook-integrator/index.ts
- [ ] T022 Update tui-renderer library with proper exports in src/lib/tui-renderer/index.ts

### Data Models
- [ ] T023 [P] Create Session model with validation in src/models/session.ts
- [ ] T024 [P] Create Settings model with schema in src/models/settings.ts
- [ ] T025 [P] Create Document model with frontmatter parsing in src/models/document.ts
- [ ] T026 [P] Create HookEvent model with type definitions in src/models/hook-event.ts

### UI Components
- [ ] T027 Fix dynamic file loading in FileList component in src/components/FileList.tsx
- [ ] T028 Implement markdown rendering in MarkdownViewer component in src/components/MarkdownViewer.tsx
- [ ] T029 Create ObserveView component for session monitoring in src/views/ObserveView.tsx
- [ ] T030 Wire up session state to ObserveView in src/app.tsx

## Phase 3.4: Integration

- [ ] T031 Generate hooks.ts script during --init in src/lib/config-manager/templates/hooks.ts
- [ ] T032 Implement Claude Code settings.json update during --init
- [ ] T033 Add file system watching with debouncing in src/lib/session-monitor/watcher.ts
- [ ] T034 Implement atomic state updates in src/lib/hook-integrator/state-manager.ts

## Phase 3.5: Polish

### Library CLIs
- [ ] T038 [P] Implement hook-integrator CLI interface in src/lib/hook-integrator/cli.ts

### Final Polish
- [ ] T040 Add error boundaries to UI components
- [ ] T041 Implement structured logging to .specstar/logs/
- [ ] T042 Add terminal resize event handling
- [ ] T043 Update package.json build script for library CLIs
- [ ] T044 Run quickstart.md validation tests

## Dependencies

- Setup (T001-T003) must complete first
- Tests (T004-T017) before implementation (T018-T030) - Note: Some tests removed during cleanup
- Libraries (T018-T022) before UI components (T027-T030)
- Models (T023-T026) can run in parallel
- Library CLI (T038) after core libraries
- Integration (T031-T034) requires core implementation
- Polish (T040-T044) runs last

## Parallel Execution Examples

### Phase 3.2 - Contract Tests (T004-T011)
```bash
# Launch all contract tests together:
Task agent: "Contract test for specstar --help in tests/contract/cli-main-help.test.ts"
Task agent: "Contract test for specstar --version in tests/contract/cli-main-version.test.ts"
Task agent: "Contract test for specstar --init in tests/contract/cli-main-init.test.ts"
Task agent: "Contract test for specstar main TUI launch in tests/contract/cli-main-tui.test.ts"
Task agent: "Contract test for hook-integrator CLI in tests/contract/cli-hook-integrator.test.ts"
```

### Phase 3.3 - Data Models (T023-T026)
```bash
# Launch all model creation together:
Task agent: "Create Session model with validation in src/models/session.ts"
Task agent: "Create Settings model with schema in src/models/settings.ts"
Task agent: "Create Document model with frontmatter parsing in src/models/document.ts"
Task agent: "Create HookEvent model with type definitions in src/models/hook-event.ts"
```

### Phase 3.5 - Library CLIs (T038)
```bash
# Launch library CLI implementation:
Task agent: "Implement hook-integrator CLI interface in src/lib/hook-integrator/cli.ts"
```

## Notes

- React Ink v6.3.0 already installed and partially implemented
- Plan view exists but needs dynamic file loading
- Observe view is commented out and needs implementation
- Follow Bun conventions per CLAUDE.md (no dotenv, use Bun.$ for shell)
- All tests must fail first (RED phase) before implementation
- Commit after each task completion
- Library-first architecture per constitution requirements

## Task Generation Rules Applied

1. **From Contracts**:
   - Main CLI (4 commands) → 4 contract test tasks [P]
   - 5 library CLIs → 5 contract test tasks [P]
   - Each CLI command → implementation task

2. **From Data Model**:
   - 10 entities → Focused on 4 core models [P]
   - Session state → state management tasks

3. **From User Stories (quickstart.md)**:
   - Initialize project → init test and implementation
   - Navigate Plan view → navigation test
   - Monitor session → monitoring test
   - View documents → rendering test

4. **From Existing Code**:
   - Fix incomplete FileList component
   - Fix placeholder MarkdownViewer
   - Implement missing ObserveView
   - Complete library structure

## Validation Checklist

- ✅ All CLI contracts have corresponding tests (T004-T011, some removed during cleanup)
- ✅ Core entities have model tasks (T023-T026)
- ✅ All tests come before implementation (Phase 3.2 before 3.3)
- ✅ Parallel tasks truly independent (different files)
- ✅ Each task specifies exact file path
- ✅ No [P] task modifies same file as another [P] task
- ✅ Hook integration specified (T021, T031)
- ✅ Existing partial implementation considered