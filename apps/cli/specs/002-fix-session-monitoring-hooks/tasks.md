# Tasks: Fix Session Monitoring and Hook Integration

**Input**: Design documents from `/specs/002-fix-session-monitoring-hooks/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)

```
1. Load plan.md from feature directory
   → Extract: TypeScript/Bun, React Ink, session-monitor/hook-integrator/config-manager libraries
2. Load optional design documents:
   → data-model.md: SessionData, HookEvent interfaces
   → contracts/hook-contracts.json: 9 hook specifications
   → research.md: Atomic writes, debouncing decisions
3. Generate tasks by category:
   → Setup: TypeScript configurations
   → Tests: 9 hook contract tests, integration tests
   → Core: Data model, hooks.ts generation, libraries
   → Integration: Config manager, session monitor
   → Polish: ObserveView, documentation
4. Apply TDD rules:
   → Contract tests before implementation
   → Integration tests before features
5. Number tasks sequentially (T001, T002...)
6. Validate: All hooks tested, all libraries updated
```

## Format: `[ID] [P?] Description`

- **[P]**: MUST run in parallel using subagents (different files, no dependencies)
- Include exact file paths in descriptions

## Phase 3.1: Setup

- [ ] T001 Create TypeScript interfaces directory at src/models/ if not exists
- [ ] T002 Ensure test directories exist: tests/contract/, tests/integration/
- [ ] T003 [P] Create .specstar/ directory structure with sessions/ and logs/ subdirectories

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests for Hooks

- [ ] T004 [P] Contract test for session_start hook in tests/contract/hooks/session-start.test.ts
- [ ] T005 [P] Contract test for user_prompt_submit hook in tests/contract/hooks/user-prompt-submit.test.ts
- [ ] T006 [P] Contract test for pre_tool_use hook in tests/contract/hooks/pre-tool-use.test.ts
- [ ] T007 [P] Contract test for post_tool_use hook in tests/contract/hooks/post-tool-use.test.ts
- [ ] T008 [P] Contract test for notification hook in tests/contract/hooks/notification.test.ts
- [ ] T009 [P] Contract test for pre_compact hook in tests/contract/hooks/pre-compact.test.ts
- [ ] T010 [P] Contract test for session_end hook in tests/contract/hooks/session-end.test.ts
- [ ] T011 [P] Contract test for stop hook in tests/contract/hooks/stop.test.ts
- [ ] T012 [P] Contract test for subagent_stop hook in tests/contract/hooks/subagent-stop.test.ts

### Integration Tests

- [ ] T013 [P] Integration test for session state tracking in tests/integration/session-state-tracking.test.ts
- [ ] T014 [P] Integration test for file watching with debouncing in tests/integration/file-watching.test.ts
- [ ] T015 [P] Integration test for atomic file writes in tests/integration/atomic-writes.test.ts
- [ ] T016 [P] Integration test for Claude settings update in tests/integration/claude-settings.test.ts

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Data Model Fixes

- [ ] T017 [P] Fix SessionData interface in src/models/session.ts with correct field names
- [ ] T018 [P] Create HookEvent interfaces in src/models/hook-event.ts for all 9 event types
- [ ] T019 [P] Create LogEntry interfaces in src/models/log-entry.ts for log file structures

### Hook Script Generation

- [ ] T020 Generate hooks.ts file in .specstar/hooks.ts with all 9 hook handlers
- [ ] T021 Implement atomic write utility in src/lib/hook-integrator/atomic-write.ts
- [ ] T022 Implement log append utility in src/lib/hook-integrator/log-append.ts

### Session Monitor Library Fixes

- [ ] T023 Fix SessionMonitor class in src/lib/session-monitor/index.ts to use correct SessionData fields
- [ ] T024 Implement debounced file watcher in src/lib/session-monitor/watcher.ts
- [ ] T025 Add content comparison to prevent duplicate processing in session-monitor
- [ ] T026 Fix session state initialization in session-monitor for new sessions

### Hook Integrator Library

- [ ] T027 Update HookIntegrator in src/lib/hook-integrator/index.ts to generate hooks.ts
- [ ] T028 Implement state management module in src/lib/hook-integrator/state-manager.ts
- [ ] T029 Add error isolation for hook execution in hook-integrator

## Phase 3.4: Integration

### Config Manager Enhancement

- [ ] T030 Update ConfigManager in src/lib/config-manager/index.ts to modify .claude/settings.json
- [ ] T031 Implement backup mechanism for settings.json before modification
- [ ] T032 Add hook configuration merger to preserve existing user settings

### Session Monitor Integration

- [ ] T033 Connect SessionMonitor to HookIntegrator for real-time updates
- [ ] T034 Implement EventEmitter pattern for session update notifications
- [ ] T035 Add migration logic for old session format to new format

## Phase 3.5: UI Implementation

### ObserveView Component

- [ ] T036 Implement ObserveView component in src/views/observe-view.tsx
- [ ] T037 Create useSessionMonitor React hook in src/hooks/useSessionMonitor.ts
- [ ] T038 Add real-time session display with active agents, files, and tools
- [ ] T039 Implement scroll and navigation for ObserveView

## Phase 3.6: Polish

### Documentation and Testing

- [ ] T040 [P] Update CLAUDE.md with session monitoring and hooks information
- [ ] T041 [P] Create llms.txt for each library (session-monitor, hook-integrator, config-manager)
- [ ] T042 Run quickstart.md validation tests to ensure everything works
- [ ] T043 Performance test: Verify hook execution < 50ms
- [ ] T044 Performance test: Verify UI updates < 250ms after file change

## Dependencies

- All tests (T004-T016) MUST complete and fail before implementation (T017-T039)
- T017-T019 (data models) before T020-T022 (hook generation)
- T020 (hooks.ts) before T030-T032 (config manager)
- T023-T026 (session monitor) before T033-T035 (integration)
- T027-T029 (hook integrator) parallel with T023-T026
- T036-T039 (UI) after T033-T035 (integration)
- All implementation before polish (T040-T044)

## Parallel Execution Examples

### Batch 1: All Contract Tests (T004-T012)
```bash
# Launch all 9 hook contract tests together:
Task: "Contract test for session_start hook in tests/contract/hooks/session-start.test.ts"
Task: "Contract test for user_prompt_submit hook in tests/contract/hooks/user-prompt-submit.test.ts"
Task: "Contract test for pre_tool_use hook in tests/contract/hooks/pre-tool-use.test.ts"
Task: "Contract test for post_tool_use hook in tests/contract/hooks/post-tool-use.test.ts"
Task: "Contract test for notification hook in tests/contract/hooks/notification.test.ts"
Task: "Contract test for pre_compact hook in tests/contract/hooks/pre-compact.test.ts"
Task: "Contract test for session_end hook in tests/contract/hooks/session-end.test.ts"
Task: "Contract test for stop hook in tests/contract/hooks/stop.test.ts"
Task: "Contract test for subagent_stop hook in tests/contract/hooks/subagent-stop.test.ts"
```

### Batch 2: Integration Tests (T013-T016)
```bash
Task: "Integration test for session state tracking in tests/integration/session-state-tracking.test.ts"
Task: "Integration test for file watching with debouncing in tests/integration/file-watching.test.ts"
Task: "Integration test for atomic file writes in tests/integration/atomic-writes.test.ts"
Task: "Integration test for Claude settings update in tests/integration/claude-settings.test.ts"
```

### Batch 3: Data Models (T017-T019)
```bash
Task: "Fix SessionData interface in src/models/session.ts with correct field names"
Task: "Create HookEvent interfaces in src/models/hook-event.ts for all 9 event types"
Task: "Create LogEntry interfaces in src/models/log-entry.ts for log file structures"
```

## Notes

- Tests MUST fail first (RED phase of TDD)
- Commit after each task completion
- hooks.ts is a generated file, not manually written
- Session monitor fixes are critical - many other components depend on it
- ObserveView is the user-facing component showing real-time data
- Performance targets: <50ms hooks, <250ms UI updates

## Validation Checklist

- [x] All 9 hooks have corresponding contract tests
- [x] SessionData entity has model task
- [x] All tests come before implementation
- [x] Parallel tasks are truly independent (different files)
- [x] Each task specifies exact file path
- [x] No [P] task modifies same file as another [P] task
- [x] Integration tests cover critical features
- [x] Performance tests included for key metrics

## Task Count Summary

- Setup: 3 tasks
- Contract Tests: 9 tasks
- Integration Tests: 4 tasks
- Core Implementation: 13 tasks
- Integration: 6 tasks
- UI Implementation: 4 tasks
- Polish: 5 tasks
- **Total: 44 tasks**

Ready for execution following TDD principles.
