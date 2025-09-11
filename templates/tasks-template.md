# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`
**Prerequisites**: plan.md (required), constitution.md, research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → If not found: ERROR "No implementation plan found"
   → Extract: tech stack, libraries, structure
2. Load constitutional principles from /memory/constitution.md
   → Apply 80/20 testing strategy
   → Ensure separation of concerns
   → Check file size limits (250 lines)
3. Load optional design documents:
   → data-model.md: Extract entities → model tasks
   → contracts/: Each file → test task (20% effort)
   → research.md: Extract decisions → setup tasks
4. Generate tasks by category (constitutional priorities):
   → Setup: project init, dependencies, pre-commit hooks
   → Core: models, services, CLI (80% effort, modular)
   → Tests: focused unit & integration (20% effort)
   → Polish: refactoring if >250 lines
   → Communication: devlog summary task
5. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Modular architecture enforced
   → Reuse existing functions
6. Number tasks sequentially (T001, T002...)
7. Generate dependency graph
8. Create parallel execution examples
9. Validate constitutional compliance:
   → Files under 250 lines?
   → Single responsibility per task?
   → 80/20 code/test ratio?
   → Devlog task included?
10. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Single project**: `src/`, `tests/` at repository root
- **Web app**: `backend/src/`, `frontend/src/`
- **Mobile**: `api/src/`, `ios/src/` or `android/src/`
- Paths shown below assume single project - adjust based on plan.md structure

## Phase 3.1: Setup
- [ ] T001 Create modular project structure per implementation plan
- [ ] T002 Initialize [language] project with [framework] dependencies
- [ ] T003 [P] Configure pre-commit hooks for code quality

## Phase 3.2: Core Implementation (80% effort focus)
- [ ] T004 [P] User model in src/models/user.py (keep under 250 lines)
- [ ] T005 [P] UserService CRUD in src/services/user_service.py (single responsibility)
- [ ] T006 [P] CLI --create-user in src/cli/user_commands.py (reuse existing patterns)
- [ ] T007 POST /api/users endpoint (modular, clean code)
- [ ] T008 GET /api/users/{id} endpoint (consistent naming)
- [ ] T009 Input validation (self-explanatory code)
- [ ] T010 Error handling and logging (structured, clear)

## Phase 3.3: Focused Testing (20% effort)
- [ ] T011 [P] Unit test for User model in tests/unit/test_user.py
- [ ] T012 [P] Integration test user flow in tests/integration/test_users.py
- [ ] T013 [P] Contract test API endpoints in tests/contract/test_api.py

## Phase 3.4: Integration (only if needed)
- [ ] T014 Connect UserService to DB (reuse existing patterns)
- [ ] T015 Add consistent error handling across modules
- [ ] T016 Configure structured logging

## Phase 3.5: Polish & Communication
- [ ] T017 Refactor any files over 250 lines
- [ ] T018 Remove code duplication (DRY principle)
- [ ] T019 Ensure KISS principle throughout
- [ ] T020 Write devlog summary in memory/devlog/[feature].md

## Dependencies
- Setup before core implementation
- Core implementation (T004-T010) can run parallel if different files
- Tests (T011-T013) after core implementation (80/20 rule)
- Polish after everything else
- Devlog summary as final task

## Parallel Example
```
# Launch T004-T006 together (different files, modular components):
Task: "Create User model in src/models/user.py keeping under 250 lines"
Task: "Create UserService in src/services/user_service.py with single responsibility"
Task: "Create CLI user commands in src/cli/user_commands.py reusing patterns"
```

## Notes
- [P] tasks = different files, no dependencies
- Keep files under 250 lines (split if needed)
- Reuse existing functions and patterns
- Write self-explanatory code (no comments)
- Commit after each task with clear message
- Write devlog summary at end

## Task Generation Rules (Constitutional)
*Applied during main() execution*

1. **From Constitution**:
   - 80% implementation tasks, 20% test tasks
   - Each module → single responsibility
   - Files approaching 250 lines → split task
   - Always include devlog summary task
   
2. **From Data Model**:
   - Each entity → model creation task [P]
   - Keep models lightweight and clean
   
3. **From User Stories**:
   - Core functionality first (80%)
   - Focused tests after (20%)

4. **Ordering**:
   - Setup → Core Implementation → Tests → Polish → Devlog
   - Modular components can run parallel

## Validation Checklist (Constitutional)
*GATE: Checked by main() before returning*

- [ ] 80/20 code/test ratio maintained
- [ ] All files planned under 250 lines
- [ ] Each task has single responsibility
- [ ] Existing functions reused where possible
- [ ] Consistent naming conventions used
- [ ] Devlog summary task included
- [ ] No redundant code generation
- [ ] Parallel tasks truly independent