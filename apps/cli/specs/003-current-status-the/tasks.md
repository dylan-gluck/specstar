# Tasks: Bug Fixes for Specstar TUI

**Input**: Design documents from `/specs/003-current-status-the/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/hook-contracts.ts

## Execution Flow (main)

```
1. Load plan.md from feature directory
   → Tech stack: TypeScript, React Ink, Bun runtime
   → Libraries: session-monitor, config-manager, hook-integrator, tui-renderer
2. Load design documents:
   → data-model.md: Settings, SessionState, ListItemStyle, ObserveViewLayout
   → contracts/hook-contracts.ts: SessionActiveContract, SettingsContract, UI contracts
   → research.md: 5 bugs identified with implementation locations
3. Generate tasks by bug fix category
4. Apply TDD with tdd-engineer agents
5. Number tasks sequentially (T001-T025)
6. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **tdd-engineer**: All test and implementation tasks use tdd-engineer agent
- Include exact file paths in descriptions

## Phase 3.1: Setup & Prerequisites

- [ ] T001 Verify Bun runtime and dependencies (package.json check)
- [ ] T002 [P] Run existing test suite to establish baseline (`bun test`)
- [ ] T003 [P] Create test directory structure for new contract tests

## Phase 3.2: Contract Tests (TDD - MUST FAIL FIRST)

**CRITICAL: These tests MUST be written with tdd-engineer and MUST FAIL before ANY implementation**

- [ ] T004 [P] Contract test for SessionActiveContract in `tests/contracts/session-active.test.ts` (tdd-engineer)
- [ ] T005 [P] Contract test for SettingsContract validation in `tests/contracts/settings.test.ts` (tdd-engineer)
- [ ] T006 [P] Contract test for ListItemRenderContract in `tests/contracts/list-render.test.ts` (tdd-engineer)
- [ ] T007 [P] Contract test for ObserveViewContract layout in `tests/contracts/observe-view.test.ts` (tdd-engineer)

## Phase 3.3: Bug 1 - Session Active State (Hook Management)

- [ ] T008 Test session_active mutations in `.specstar/hooks.ts` (tdd-engineer: write test)
- [ ] T009 Fix session_active to only update on session_start/session_end in `.specstar/hooks.ts` (tdd-engineer: implement)
- [ ] T010 [P] Audit and fix all other hook handlers to prevent session_active modifications (tdd-engineer)

## Phase 3.4: Bug 2 - Start Page Configuration

- [ ] T011 Test startPage setting in `tests/models/settings.test.ts` (tdd-engineer: write test)
- [ ] T012 Add startPage property to Settings interface in `src/models/settings.ts` (tdd-engineer: implement)
- [ ] T013 Test app initialization with startPage in `tests/app.test.tsx` (tdd-engineer: write test)
- [ ] T014 Update app.tsx to use startPage setting instead of hardcoded view in `src/app.tsx:54-58` (tdd-engineer: implement)

## Phase 3.5: Bug 3 - Configuration Cleanup

- [ ] T015 Test theme object structure in `tests/models/settings.test.ts` (tdd-engineer: write test)
- [ ] T016 Remove sessionPath from Settings interface in `src/models/settings.ts:36` (tdd-engineer: implement)
- [ ] T017 Update theme to use ThemeConfig object structure in `src/models/settings.ts` (tdd-engineer: implement)
- [ ] T018 [P] Update settings loading to handle theme migration in `src/lib/config-manager/index.ts` (tdd-engineer)

## Phase 3.6: Bug 4 - List Display Improvements

- [ ] T019 Test list item rendering without green background in `tests/components/file-list.test.tsx` (tdd-engineer: write test)
- [ ] T020 Fix list highlighting to use green text instead of background in `src/components/file-list.tsx:121-122` (tdd-engineer: implement)
- [ ] T021 Remove emoji usage from list items in `src/components/file-list.tsx:118` (tdd-engineer: implement)
- [ ] T022 Test and implement proper list scrolling with viewport constraints in `src/components/file-list.tsx` (tdd-engineer)

## Phase 3.7: Bug 5 - Observe View Refactor

- [ ] T023 Test two-column layout structure in `tests/views/observe-view.test.tsx` (tdd-engineer: write test)
- [ ] T024 Implement left sidebar with session list in `src/views/observe-view.tsx` (tdd-engineer: implement)
- [ ] T025 Add green dot indicators for active sessions in session list (tdd-engineer: implement)
- [ ] T026 Test session selection and detail display in dashboard (tdd-engineer: write test)
- [ ] T027 Implement dashboard layout for session details in right panel (tdd-engineer: implement)

## Phase 3.8: Integration Testing

- [ ] T028 [P] Integration test: Full session lifecycle with correct state management (tdd-engineer)
- [ ] T029 [P] Integration test: Settings loading and theme application (tdd-engineer)
- [ ] T030 [P] Integration test: List navigation and scrolling behavior (tdd-engineer)
- [ ] T031 Integration test: Observe view session selection and display (tdd-engineer)

## Phase 3.9: Validation & Polish

- [ ] T032 Run quickstart.md validation steps manually
- [ ] T033 [P] Update CLAUDE.md with recent bug fixes in recent changes section
- [ ] T034 [P] Run full test suite and ensure all tests pass (`bun test`)
- [ ] T035 Performance validation: Ensure UI response time <100ms

## Dependencies

### Critical TDD Order:
- Contract tests (T004-T007) MUST complete and fail before ANY implementation
- Each bug fix test (T008, T011, T013, T015, T019, T023, T026) MUST fail before its implementation

### Bug Fix Dependencies:
- T008 → T009 → T010 (Session state fixes in sequence)
- T011 → T012, T013 → T014 (Settings before app initialization)
- T015 → T016 → T017 → T018 (Configuration structure changes)
- T019 → T020 → T021 → T022 (List display fixes)
- T023 → T024 → T025, T026 → T027 (Observe view structure before details)

### Integration Dependencies:
- All bug fixes (T008-T027) before integration tests (T028-T031)
- Integration tests before validation (T032-T035)

## Parallel Execution Examples

### Contract Tests (can run simultaneously):
```bash
# Launch T004-T007 together with tdd-engineer:
Task: "Contract test SessionActiveContract" subagent: tdd-engineer
Task: "Contract test SettingsContract" subagent: tdd-engineer
Task: "Contract test ListItemRenderContract" subagent: tdd-engineer
Task: "Contract test ObserveViewContract" subagent: tdd-engineer
```

### Integration Tests (after implementation):
```bash
# Launch T028-T030 together:
Task: "Integration test session lifecycle" subagent: tdd-engineer
Task: "Integration test settings and theme" subagent: tdd-engineer
Task: "Integration test list navigation" subagent: tdd-engineer
```

## Notes

- **TDD Enforcement**: Every implementation task has a preceding test task
- **tdd-engineer agent**: Used for all test writing and implementation
- **File Isolation**: [P] tasks modify different files to avoid conflicts
- **Atomic Commits**: Commit after each test-implement pair
- **No Regressions**: Existing tests must continue passing

## Validation Checklist

_GATE: All must be checked before marking feature complete_

- [ ] All contract tests written and passing
- [ ] Bug 1: session_active only modified by lifecycle hooks
- [ ] Bug 2: startPage configuration working
- [ ] Bug 3: sessionPath removed, theme object structure
- [ ] Bug 4: Green text selection, no emojis, proper scrolling
- [ ] Bug 5: Two-column observe view with session list
- [ ] All integration tests passing
- [ ] Performance <100ms UI response
- [ ] Quickstart validation complete
