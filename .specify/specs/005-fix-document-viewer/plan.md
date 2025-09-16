# Implementation Plan: Fix Document Viewer Layout and Rendering

**Branch**: `005-fix-document-viewer` | **Date**: 2025-09-11 | **Spec**: `/specs/005-fix-document-viewer/spec.md`
**Input**: Feature specification from `/specs/005-fix-document-viewer/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Analyze existing project MUST use agents in parallel:
   → codebase-analyzer: understand implementation patterns
   → codebase-locator: find relevant existing components
   → codebase-pattern-finder: identify patterns to follow
   → Extract project structure, naming conventions, utilities
3. Load constitution from ../../memory/constitution.md
   → Apply core principles to all design decisions
4. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
   → Incorporate insights from codebase analysis
5. Evaluate Constitution Check section below
   → Verify test infrastructure setup with project init
   → Verify 80/20 testing PER TASK approach
   → Check separation of concerns
   → Ensure file size limits (250 lines)
   → Confirm devlog per task requirement
   → Update Progress Tracking: Initial Constitution Check
6. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
7. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file
   → Apply modular architecture
   → Keep designs simple and clean
8. Re-evaluate Constitution Check section
   → If violations: Document minimal justification
   → Update Progress Tracking: Post-Design Constitution Check
9. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
   → Include devlog writing in task plan
   → Note ALL implementation MUST use spec-implementer agents
   → Note tasks marked [P] MUST be executed in parallel
10. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 10. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Fix the document viewer in the plan view to properly fill its parent container space using flex layout patterns from the session dashboard. The viewer must handle markdown rendering, scrolling, text wrapping, and error states while maintaining consistent TUI layout.

## Technical Context
**Language/Version**: TypeScript 5.3 with React 18 (Ink v6.3.0 for terminal UI)  
**Primary Dependencies**: React Ink, marked, gray-matter, cli-highlight, chalk  
**Debugger**: typescript-language-server (already configured)  
**Storage**: Local filesystem (markdown documents)  
**Testing**: Bun test with ink-testing-library  
**Target Platform**: Terminal/CLI application (cross-platform via Bun)
**Project Type**: single (TUI application)  
**Performance Goals**: Instant rendering (<100ms), smooth scrolling (60fps equivalent)  
**Constraints**: Terminal width/height limits, ANSI color support, text-only output  
**Scale/Scope**: Single document viewer component (~240 lines currently)

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Core Principles (from constitution.md)**:
- Setup: Test infrastructure AND pre-commit hooks AND language-specific debugger together first
- Testing: 80% code, 20% tests PER TASK (implementation first, then tests)
- Files: Maximum 250 lines per file
- Architecture: Modular with single responsibilities
- Code: Simple, clean, self-explanatory (no comments)
- Communication: EVERY task requires commit AND devlog entry

**Separation of Concerns**:
- Lightweight, performant, clean architecture? ✅ Yes - refactoring existing component
- Each module has single responsibility? ✅ Yes - MarkdownViewer handles UI, DocumentViewer handles parsing
- Modular project layout with centralized main? ✅ Yes - existing structure maintained
- Clear separation across components? ✅ Yes - clear boundaries between viewer, lib, and models

**Simple, Clean Code**:
- Readability and maintainability prioritized? ✅ Yes - minimal changes to fix layout
- Feature bloat avoided? ✅ Yes - focus only on layout fix
- Files planned under 250 lines? ✅ Yes - MarkdownViewer is 239 lines
- Code will be self-explanatory? ✅ Yes - using established React patterns

**Consistency**:
- Reusing existing functions? ✅ Yes - applying SessionDashboard patterns
- Following existing naming conventions? ✅ Yes - maintaining current names
- KISS and DRY principles applied? ✅ Yes - reusing flex patterns
- Pre-commit hooks planned? ✅ Yes - already configured in project

**Testing Strategy**:
- Test infrastructure included in project setup? ✅ Yes - Bun test already configured
- Language-specific debugger configured (pyright, gopls, etc.)? ✅ Yes - TypeScript LSP active
- 80% implementation, 20% testing PER TASK? ✅ Yes - will follow this ratio
- Tests included before task completion? ✅ Yes - tests after implementation
- Tests are modular and focused? ✅ Yes - component-specific tests
- Consistent testing framework? ✅ Yes - using ink-testing-library
- NOT doing TDD (implementation first, then tests)? ✅ Yes - implementation first

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

**Structure Decision**: Option 1 (Single project - TUI application)

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
   Include: Research test infrastructure setup approach
   Include: Research language-specific debugger setup
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

3. **Plan test approach** (20% effort PER TASK):
   - Test infrastructure setup with project init
   - Language-specific debugger configuration (pyright, gopls, etc.)
   - Debugger usage instructions in quickstart.md
   - Modular, focused test scenarios per task
   - Tests written AFTER implementation but BEFORE task completion
   - No TDD - implementation first approach

4. **Extract test scenarios** from user stories:
   - Each story → simple integration test
   - Quickstart test = basic validation steps

5. **Update agent file with constitution principles**:
   - Include constitutional guidelines at top
   - Add only NEW tech from current plan
   - Note file size limits and modular approach
   - Keep under 150 lines for efficiency
   - Include per-task testing and devlog requirements

**Output**: data-model.md, /contracts/*, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy (Constitutional)**:
- Load `../../templates/tasks-template.md` as base
- Apply 80/20 rule PER TASK: each task includes implementation + tests
- Single focused task for MarkdownViewer layout fix
- Separate task for error handling improvements
- Each task includes commit + devlog entry requirement
- ALL feature implementation MUST use spec-implementer agents

**Specific Tasks Planned**:
1. **Fix MarkdownViewer Layout** (Primary)
   - Remove fixed height constraint (line 190)
   - Add flexGrow={1} to content Box
   - Ensure parent passes flex properties
   - Add layout validation tests
   - Commit and devlog entry

2. **Improve Error Display** (Secondary)
   - Update error rendering with proper flex
   - Ensure error doesn't break layout
   - Add error state tests
   - Commit and devlog entry

3. **Validate Text Wrapping** (If needed)
   - Verify wrap="truncate-end" works
   - Test with long content
   - Add wrapping tests
   - Commit and devlog entry

**Ordering Strategy**:
- Layout fix first (critical path)
- Error handling second
- Text wrapping validation last
- All tasks independent (can run in parallel if needed)

**Estimated Output**: 2-3 focused, modular tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md using spec-implementer agents, with [P] tasks in parallel)  
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
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none required)

---
*Based on Specstar Constitution - See `../../memory/constitution.md`*
*Remember: Test infrastructure + debugger first | 80% code, 20% tests PER TASK | Max 250 lines/file | Simple & clean | Commit + devlog per task*