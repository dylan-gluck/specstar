# Implementation Plan: Technical Debt Cleanup

**Branch**: `004-clean-up-technical` | **Date**: 2025-09-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-clean-up-technical/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
4. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
5. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, or `GEMINI.md` for Gemini CLI).
6. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
7. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
8. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Primary requirement: Remove ~5,000 lines of redundant code while maintaining all current functionality. Focus on consolidating duplicate implementations (hook-integrator, session monitoring, configuration), standardizing UI components using ObserveView patterns, and removing broken/obsolete test infrastructure. Technical approach involves systematic code removal with functional validation at each step.

## Technical Context
**Language/Version**: TypeScript 5.x with Bun runtime
**Primary Dependencies**: React Ink v6.3.0 (Terminal UI), Bun (runtime, build, test)
**Storage**: JSON files in .specstar/ directory
**Testing**: Bun test with ink-testing-library
**Target Platform**: Terminal/CLI (macOS, Linux, Windows via WSL)
**Project Type**: single - Terminal UI application
**Performance Goals**: Instant UI updates (<50ms), efficient file watching
**Constraints**: Remove 5,000+ lines while maintaining functionality, files <250 lines each
**Scale/Scope**: ~15,000 LOC currently, target ~10,000 LOC after cleanup

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity**:
- Projects: 1 (single TUI application with tests)
- Using framework directly? YES (React Ink directly, no wrappers)
- Single data model? YES (Session, Config, Document models only)
- Avoiding patterns? YES (removing unnecessary abstractions)

**Architecture**:
- EVERY feature as library? YES (lib/ structure maintained)
- Libraries listed:
  - session-monitor: Session JSON file watching
  - config-manager: Settings and initialization
  - document-viewer: Markdown document rendering
  - tui-renderer: Terminal UI rendering
- CLI per library: Main CLI with --init, --help, --version
- Library docs: Will maintain in CLAUDE.md

**Testing (NON-NEGOTIABLE)**:
- NOTE: This is a cleanup task, not new feature development
- Existing tests will be cleaned/fixed as part of debt removal
- Validation through manual testing after each removal
- Will remove broken/obsolete tests (26+ skipped tests)

**Observability**:
- Structured logging included? YES (existing console output)
- Frontend logs → backend? N/A (single process)
- Error context sufficient? YES

**Versioning**:
- Version number assigned? Maintained in package.json
- BUILD increments on every change? Via bun version
- Breaking changes handled? No external API changes

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

**Structure Decision**: Option 1 (Single project - Terminal UI application)

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `/scripts/update-agent-context.sh [claude|gemini|copilot]` for your AI assistant
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load research.md and data-model.md to identify removal targets
- Group removals by dependency order (remove leaves before roots)
- Create validation tasks after each removal group
- Generate component extraction tasks
- Include build script cleanup tasks

**Task Categories**:
1. **Service CLI Removal** [P] - Can be done in parallel
   - Remove each cli.ts file
   - Update package.json build scripts

2. **Unused Library Removal**
   - Remove hook-integrator directory
   - Clean up imports in session-monitor
   - Remove related tests

3. **Redundant Code Consolidation**
   - Remove duplicate watchers
   - Migrate app.tsx to ConfigManager
   - Remove settings-loader

4. **Component Extraction**
   - Extract SessionDashboard component
   - Extract EmptyState component
   - Update ObserveView imports

5. **Test Cleanup** [P] - Can be done in parallel
   - Remove skipped test blocks
   - Delete obsolete test files

**Ordering Strategy**:
- Start with leaf nodes (no dependencies)
- Progress to nodes with cleared dependencies
- Validate after each major removal
- Mark [P] for parallel execution where safe

**Validation Points**:
- After service CLI removal: Build and test executable
- After library removal: Run tests, check imports
- After consolidation: Test UI functionality
- After extraction: Verify UI renders correctly
- Final: Full validation per quickstart.md

**Estimated Output**: 30-35 numbered tasks with clear removal targets and validation steps

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [x] Phase 3: Tasks generated (/tasks command)
- [x] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (N/A - cleanup task)

---
*Based on Constitution v2.1.1 - See `../../memory/constitution.md`*
