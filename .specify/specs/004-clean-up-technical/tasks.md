# Tasks: Technical Debt Cleanup

**Input**: Design documents from `/specs/004-clean-up-technical/`
**Prerequisites**: plan.md (required), research.md, data-model.md, quickstart.md

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Extract: removal targets, validation approach
2. Load optional design documents:
   → research.md: Extract removal priorities (6,868 lines identified)
   → data-model.md: Extract files to remove
   → quickstart.md: Extract validation steps
3. Generate tasks by category:
   → Service CLI removal (parallel safe)
   → Unused library removal (sequential)
   → Code consolidation (requires migration)
   → Component extraction (refactoring)
   → Test cleanup (parallel safe)
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Validate after each major removal
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Return: SUCCESS (ready to remove 6,868 lines)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Single project**: `src/`, `tests/` at repository root
- All paths shown are absolute from repository root

## Phase 3.1: Pre-Cleanup Validation
- [ ] T001 Create backup branch and record baseline metrics (LOC, dist size, test status)
- [ ] T002 Run full test suite and document skipped/failing tests
- [ ] T003 Test current build creates all 5 executables in dist/
- [ ] T004 Verify specstar --init creates hooks.ts correctly

## Phase 3.2: Service CLI Removal [P]
**Target: Remove ~2,000 lines and 240MB of unnecessary executables**
- [ ] T005 [P] Remove src/lib/session-monitor/cli.ts (459 lines)
- [ ] T006 [P] Remove src/lib/document-viewer/cli.ts (~400 lines)
- [ ] T007 [P] Remove src/lib/config-manager/cli.ts (~400 lines)
- [ ] T008 [P] Remove src/lib/hook-integrator/cli.ts (~400 lines)
- [ ] T009 [P] Remove src/lib/tui-renderer/cli.ts if exists
- [ ] T010 Update package.json to remove all build:libs scripts
- [ ] T011 Simplify package.json build script to single command
- [ ] T012 Run bun run build and verify only specstar executable created
- [ ] T013 Test specstar --init still works after CLI removal

## Phase 3.3: Hook-integrator Directory Removal
**Target: Remove 2,642 lines of completely unused code**
- [ ] T014 Remove entire src/lib/hook-integrator/ directory (2,642 lines)
- [ ] T015 Remove tests/contract/cli-hook-integrator.test.ts (93 lines)
- [ ] T016 Remove commented hook-integrator export from src/index.ts:23
- [ ] T017 Remove unused hook methods from src/lib/session-monitor/index.ts (lines 228-231, 469-493)
- [ ] T018 Search and remove any remaining hook-integrator imports
- [ ] T019 Run bun test to verify no broken imports

## Phase 3.4: Redundant Watcher Removal
**Target: Remove 1,268 lines of duplicate watcher implementations**
- [ ] T020 Remove src/lib/session-monitor/watcher.ts (637 lines - FileWatcher)
- [ ] T021 Remove src/lib/session-monitor/session-watcher.ts (172 lines - SessionWatcher)
- [ ] T022 Update src/lib/session-monitor/index.ts to remove FileWatcher and SessionWatcher exports
- [ ] T023 Remove or update tests that use FileWatcher or SessionWatcher
- [ ] T024 Verify SessionMonitor class still works in ObserveView

## Phase 3.5: Configuration Consolidation
**Target: Migrate from settings-loader to ConfigManager**
- [ ] T025 Update src/app.tsx to import ConfigManager instead of settings-loader
- [ ] T026 Replace loadSettings() call with ConfigManager.load() in app.tsx
- [ ] T027 Remove entire src/lib/config/ directory (settings-loader.ts - 82 lines)
- [ ] T028 Update any remaining imports of settings-loader
- [ ] T029 Test specstar --init creates settings.json with correct schema (folders not sessionPath)
- [ ] T030 Run bun run dev and verify settings load correctly

## Phase 3.6: ObserveView Component Extraction
**Target: Extract 283 lines to comply with 250-line limit**
- [ ] T031 Create src/components/ directory if not exists
- [ ] T032 Extract SessionDashboard component to src/components/session-dashboard.tsx (265 lines)
- [ ] T033 Extract EmptyState component to src/components/empty-state.tsx (18 lines)
- [ ] T034 Update ObserveView.tsx to import extracted components
- [ ] T035 Verify ObserveView.tsx is now under 250 lines
- [ ] T036 Test UI rendering with bun run dev - verify Observe view displays correctly

## Phase 3.7: Test Infrastructure Cleanup [P]
**Target: Remove ~500 lines of skipped/broken tests**
- [ ] T037 [P] Find and remove all test blocks using .skip()
- [ ] T038 [P] Remove test files that are 100% skipped
- [ ] T039 [P] Remove tests for deleted hook-integrator library
- [ ] T040 [P] Remove tests for deleted FileWatcher and SessionWatcher
- [ ] T041 [P] Remove tests for deleted service CLIs
- [ ] T042 Run bun test and verify no skipped tests in output
- [ ] T043 Run bun test --coverage to check coverage metrics

## Phase 3.8: Final Validation
- [ ] T044 Count total lines removed (target: 6,868 lines)
- [ ] T045 Verify dist/ contains only specstar executable (~64MB)
- [ ] T046 Run full quickstart.md validation sequence
- [ ] T047 Test with real Claude Code session if available
- [ ] T048 Update CLAUDE.md with recent changes
- [ ] T049 Document removal statistics and performance improvements

## Dependencies
- T001-T004 must complete before any removal tasks
- T005-T009 can run in parallel (different CLI files)
- T010-T013 must run after T005-T009
- T014-T019 must run sequentially (hook-integrator removal)
- T020-T024 must run sequentially (watcher removal)
- T025-T030 must run sequentially (config migration)
- T031-T036 must run sequentially (component extraction)
- T037-T041 can run in parallel (different test files)
- T042-T043 must run after T037-T041
- T044-T049 must run after all removal tasks

## Parallel Execution Examples

### Service CLI Removal (T005-T009)
```bash
# Launch all service CLI removals together:
Task: "Remove src/lib/session-monitor/cli.ts"
Task: "Remove src/lib/document-viewer/cli.ts"
Task: "Remove src/lib/config-manager/cli.ts"
Task: "Remove src/lib/hook-integrator/cli.ts"
Task: "Remove src/lib/tui-renderer/cli.ts if exists"
```

### Test Cleanup (T037-T041)
```bash
# Launch all test removals together:
Task: "Find and remove all .skip() test blocks"
Task: "Remove 100% skipped test files"
Task: "Remove hook-integrator tests"
Task: "Remove FileWatcher/SessionWatcher tests"
Task: "Remove service CLI tests"
```

## Notes
- Each removal phase has validation to ensure functionality preserved
- Backup branch created in T001 for rollback if needed
- Target reduction: 6,868 lines (~45% of codebase)
- Disk space savings: 240MB from removing unnecessary executables
- All tasks include specific line counts from research.md

## Validation Checklist
*GATE: Must pass before marking cleanup complete*

- [ ] Build succeeds with single executable
- [ ] All remaining tests pass (no skipped)
- [ ] specstar --init creates proper structure
- [ ] Both UI views render correctly
- [ ] Settings load with correct schema
- [ ] At least 5,000 lines removed
- [ ] Dist size reduced to ~64MB
- [ ] No files exceed 250 lines
