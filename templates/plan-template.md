# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Load constitution from /memory/constitution.md
   → Apply core principles to all design decisions
3. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
4. Evaluate Constitution Check section below
   → Verify 80/20 testing approach
   → Check separation of concerns
   → Ensure file size limits (250 lines)
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file
   → Apply modular architecture
   → Keep designs simple and clean
7. Re-evaluate Constitution Check section
   → If violations: Document minimal justification
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
   → Include devlog writing in task plan
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context
**Language/Version**: [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION]  
**Primary Dependencies**: [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]  
**Storage**: [if applicable, e.g., PostgreSQL, CoreData, files or N/A]  
**Testing**: [e.g., pytest, XCTest, cargo test or NEEDS CLARIFICATION]  
**Target Platform**: [e.g., Linux server, iOS 15+, WASM or NEEDS CLARIFICATION]
**Project Type**: [single/web/mobile - determines source structure]  
**Performance Goals**: [domain-specific, e.g., 1000 req/s, 10k lines/sec, 60 fps or NEEDS CLARIFICATION]  
**Constraints**: [domain-specific, e.g., <200ms p95, <100MB memory, offline-capable or NEEDS CLARIFICATION]  
**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Core Principles (from constitution.md)**:
- Testing: 80% code, 20% tests (NOT TDD-first)
- Files: Maximum 250 lines per file
- Architecture: Modular with single responsibilities
- Code: Simple, clean, self-explanatory (no comments)
- Communication: Devlog summaries after work

**Separation of Concerns**:
- Lightweight, performant, clean architecture?
- Each module has single responsibility?
- Modular project layout with centralized main?
- Clear separation across components?

**Simple, Clean Code**:
- Readability and maintainability prioritized?
- Feature bloat avoided?
- Files planned under 250 lines?
- Code will be self-explanatory?

**Consistency**:
- Reusing existing functions?
- Following existing naming conventions?
- KISS and DRY principles applied?
- Pre-commit hooks planned?

**Testing Strategy**:
- 80% implementation, 20% testing effort?
- Tests are modular and focused?
- Consistent testing framework?
- NOT doing TDD (tests after implementation)?

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure]
```

**Structure Decision**: [DEFAULT to Option 1 unless Technical Context indicates web/mobile app]

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → simple, lightweight solution
   - For each integration → minimal, focused approach

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research simple {unknown} solution for {feature}"
   For each technology choice:
     Task: "Find minimal {tech} approach following KISS principle"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [simplest viable solution]
   - Rationale: [why this keeps code clean and minimal]
   - Alternatives rejected: [why they add unnecessary complexity]

**Output**: research.md with simple, focused solutions

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Simple entity definitions (under 250 lines total)
   - Minimal fields, clear relationships
   - Validation rules from requirements

2. **Generate API contracts** from functional requirements:
   - For each user action → simple endpoint
   - Use standard REST patterns (KISS principle)
   - Output minimal OpenAPI schema to `/contracts/`

3. **Plan test approach** (20% effort allocation):
   - Modular, focused test scenarios
   - Tests will be written AFTER implementation
   - No TDD - implementation first approach

4. **Extract test scenarios** from user stories:
   - Each story → simple integration test
   - Quickstart test = basic validation steps

5. **Update agent file with constitution principles**:
   - Include constitutional guidelines at top
   - Add only NEW tech from current plan
   - Note file size limits and modular approach
   - Keep under 150 lines for efficiency
   - Include devlog requirement

**Output**: data-model.md, /contracts/*, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy (Constitutional)**:
- Load `/templates/tasks-template.md` as base
- Apply 80/20 rule: 80% implementation, 20% testing
- Each module → single responsibility task
- Files approaching 250 lines → split into multiple tasks
- Each entity → lightweight model task [P]
- Tests come AFTER implementation (not TDD)
- Include devlog summary task at end

**Ordering Strategy**:
- Setup with pre-commit hooks first
- Core implementation (80% of tasks)
- Focused testing (20% of tasks) 
- Polish and refactoring
- Devlog summary last
- Mark [P] for parallel execution (different files)

**Estimated Output**: 20-25 focused, modular tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution principles cannot be fully met*

| Principle | Challenge | Mitigation |
|-----------|-----------|------------|
| [e.g., 250 line limit] | [specific file] | [how it will be split] |
| [e.g., Single responsibility] | [complex module] | [how to modularize] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [ ] Phase 0: Research complete (/plan command)
- [ ] Phase 1: Design complete (/plan command)
- [ ] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [ ] Initial Constitution Check: PASS
- [ ] Post-Design Constitution Check: PASS
- [ ] All NEEDS CLARIFICATION resolved
- [ ] Complexity deviations documented

---
*Based on Specstar Constitution - See `/memory/constitution.md`*
*Remember: 80% code, 20% tests | Max 250 lines/file | Simple & clean | Write devlog*