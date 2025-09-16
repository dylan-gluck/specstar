# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`
**Prerequisites**: plan.md (required), constitution.md, research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → If not found: ERROR "No implementation plan found"
   → Extract: tech stack, libraries, structure
2. Load constitutional principles from .specify/memory/constitution.md
   → Apply 80/20 testing PER TASK strategy
   → Ensure debugger setup included in initialization
   → Ensure separation of concerns
   → Check file size limits (250 lines)
   → Every task includes tests AND devlog
3. Load optional design documents:
   → data-model.md: Extract entities → model tasks
   → contracts/: Each file → test task (20% effort)
   → research.md: Extract decisions → setup tasks
4. Generate tasks by category (constitutional priorities):
   → Setup: project init WITH test infrastructure AND pre-commit hooks AND debugger
   → Core: models, services, CLI (each task: 80% implementation + 20% tests)
   → Polish: refactoring if >250 lines
   → Each task ends with: commit + devlog entry
5. Apply task rules:
   → Different files = MUST mark [P] for parallel
   → Same file = sequential (no [P])
   → Tasks marked with [P] MUST be completed in parallel
   → ALL feature implementation MUST use spec-implementer agents
   → Modular architecture enforced
   → Reuse existing functions
6. Number tasks sequentially (T001, T002...)
7. Generate dependency graph
8. Create parallel execution examples
9. Validate constitutional compliance:
   → Files under 250 lines?
   → Single responsibility per task?
   → Each task includes 80% implementation + 20% tests?
   → Each task includes commit + devlog?
10. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: MUST run in parallel (different files, no dependencies)
- Include exact file paths in descriptions
- All implementation tasks MUST specify use of spec-implementer agent

## Path Conventions
- **Single project**: `src/`, `tests/` at repository root
- **Web app**: `backend/src/`, `frontend/src/`
- **Mobile**: `api/src/`, `ios/src/` or `android/src/`
- Paths shown below assume single project - adjust based on plan.md structure

## Phase 3.1: Setup
- [ ] T001 Create modular project structure per implementation plan
- [ ] T002 Initialize [language] project with [framework] dependencies AND test infrastructure AND debugger ([language-specific LSP: pyright/gopls/rust-analyzer/etc])
- [ ] T003 [P] Configure pre-commit hooks for code quality AND test automation
- [ ] T004 [P] Create debugger configuration files (.vscode/launch.json or equivalent) with usage instructions

## Phase 3.2: Core Implementation (each task: 80% code + 20% tests)
- [ ] T005 [P] User model in src/models/user.py + unit tests (keep under 250 lines) - via spec-implementer agent
- [ ] T006 [P] UserService CRUD in src/services/user_service.py + tests (single responsibility) - via spec-implementer agent
- [ ] T007 [P] CLI --create-user in src/cli/user_commands.py + tests (reuse existing patterns) - via spec-implementer agent
- [ ] T008 POST /api/users endpoint + contract tests (modular, clean code) - via spec-implementer agent
- [ ] T009 GET /api/users/{id} endpoint + tests (consistent naming) - via spec-implementer agent
- [ ] T010 Input validation + validation tests (self-explanatory code) - via spec-implementer agent
- [ ] T011 Error handling and logging + tests (structured, clear) - via spec-implementer agent

## Phase 3.3: Integration Testing (if needed beyond task-level tests)
- [ ] T012 [P] End-to-end user flow in tests/integration/test_users.py
- [ ] T013 [P] Cross-module integration tests

## Phase 3.4: Integration (only if needed)
- [ ] T014 Connect UserService to DB + tests (reuse existing patterns)
- [ ] T015 Add consistent error handling across modules + tests
- [ ] T016 Configure structured logging + verification tests

## Phase 3.5: Polish
- [ ] T017 Refactor any files over 250 lines + update tests
- [ ] T018 Remove code duplication (DRY principle) + verify tests
- [ ] T019 Ensure KISS principle throughout

## Dependencies
- Setup (with test infrastructure and debugger) before core implementation
- Core implementation tasks can run parallel if different files
- Each task self-contained with implementation + tests + commit + devlog
- Integration tests after core tasks complete
- Polish after everything else

## Parallel Example
```
# MUST launch T005-T007 together in parallel (different files, modular components):
Task (spec-implementer): "Create User model in src/models/user.py with unit tests, commit, and devlog"
Task (spec-implementer): "Create UserService in src/services/user_service.py with tests, commit, and devlog" 
Task (spec-implementer): "Create CLI user commands in src/cli/user_commands.py with tests, commit, and devlog"

# These tasks marked [P] MUST be executed concurrently using spec-implementer agents
```

## Notes
- [P] tasks = different files, no dependencies, MUST run in parallel
- ALL feature implementation MUST use spec-implementer agents
- Keep files under 250 lines (split if needed)
- Reuse existing functions and patterns
- Write self-explanatory code (no comments)
- EVERY task: implementation + tests + commit + devlog entry

## Task Generation Rules (Constitutional)
*Applied during main() execution*

1. **From Constitution**:
   - Each task: 80% implementation, 20% tests before completion
   - Each module → single responsibility
   - Files approaching 250 lines → split task
   - Every task ends with commit + devlog entry
   - ALL implementation MUST use spec-implementer agents
   - Tasks marked [P] MUST be executed in parallel
   
2. **From Data Model**:
   - Each entity → model creation task [P]
   - Keep models lightweight and clean
   
3. **From User Stories**:
   - Core functionality with tests per task
   - No separate testing phase

4. **Ordering**:
   - Setup (with test infrastructure and debugger) → Core Implementation (with tests) → Polish
   - Modular components can run parallel

## Validation Checklist (Constitutional)
*GATE: Checked by main() before returning*

- [ ] Each task includes 80% implementation + 20% tests
- [ ] All files planned under 250 lines
- [ ] Each task has single responsibility
- [ ] Existing functions reused where possible
- [ ] Consistent naming conventions used
- [ ] Each task includes commit + devlog requirement
- [ ] No redundant code generation
- [ ] Parallel tasks truly independent
- [ ] Test infrastructure and debugger included in setup