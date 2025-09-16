# Implementation Plan: Specstar - Multi-Session Observability TUI

**Branch**: `001-docs-specstar-plan` | **Date**: 2025-09-09 | **Spec**: `/specs/001-docs-specstar-plan/spec.md`
**Input**: Feature specification from `/specs/001-docs-specstar-plan/spec.md`

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

Develop a terminal user interface (TUI) application called Specstar that provides observability and orchestration capabilities for multiple Claude Code AI agent sessions. The system enables developers to monitor spec-driven development workflows, view planning documents, and track agent activities in real-time through a dual-view interface (Plan view for documents, Observe view for session monitoring).

## Technical Context

**Language/Version**: TypeScript/Node.js (Bun runtime)  
**Primary Dependencies**: TUI framework (e.g., blessed, ink, or similar), JSON parsing, file system operations  
**Storage**: JSON files for session state, markdown files for documents  
**Testing**: Bun test  
**Target Platform**: macOS/Linux/Windows terminal environments  
**Project Type**: single (CLI application)  
**Performance Goals**: Real-time UI updates (<100ms refresh), handle 10+ concurrent sessions  
**Constraints**: Terminal-based interface, keyboard-only navigation, must integrate with Claude Code hooks  
**Scale/Scope**: Support unlimited sessions, 100+ planning documents, real-time updates from file system changes

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**Simplicity**:

- Projects: 2 (cli, tests)
- Using framework directly? Yes (TUI framework without wrappers)
- Single data model? Yes (session state and document models)
- Avoiding patterns? Yes (direct file system access, no unnecessary abstractions)

**Architecture**:

- EVERY feature as library? Yes (plan below)
- Libraries listed:
  - tui-renderer: Handles terminal UI rendering and navigation
  - session-monitor: Watches and parses session JSON files
  - document-viewer: Loads and renders markdown documents
  - hook-integrator: Manages Claude Code hook integration
  - config-manager: Handles project initialization and settings
- CLI per library: Yes (each exposes --help/--version/--format)
- Library docs: llms.txt format planned? Yes

**Testing (NON-NEGOTIABLE)**:

- RED-GREEN-Refactor cycle enforced? Yes
- Git commits show tests before implementation? Yes
- Order: Contract→Integration→E2E→Unit strictly followed? Yes
- Real dependencies used? Yes (actual file system, terminal emulator for tests)
- Integration tests for: new libraries, contract changes, shared schemas? Yes
- FORBIDDEN: Implementation before test, skipping RED phase - Understood

**Observability**:

- Structured logging included? Yes (to ~/.specstar/logs/)
- Frontend logs → backend? N/A (single CLI app)
- Error context sufficient? Yes (command context, file paths, error traces)

**Versioning**:

- Version number assigned? 0.1.0
- BUILD increments on every change? Yes
- Breaking changes handled? Yes (config migration plan)

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

**Structure Decision**: Option 1 (Single project - CLI application)

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

_Prerequisites: research.md complete_

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

**Output**: data-model.md, /contracts/\*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach

_This section describes what the /tasks command will do - DO NOT execute during /plan_

**Task Generation Strategy**:

The /tasks command will generate tasks following TDD principles and the existing partial implementation:

1. **Contract Test Tasks** (Tests First - RED phase):
   - CLI contract test for main specstar command [P]
   - CLI contract test for --init functionality [P]
   - Library CLI tests for each of 5 libraries [P]
   - Hook event contract tests (9 event types)

2. **Integration Test Tasks** (Based on User Stories):
   - Test: Initialize specstar in new project
   - Test: Navigate Plan view with keyboard
   - Test: Load and render markdown documents
   - Test: Monitor active Claude Code session
   - Test: View session history and details
   - Test: Handle corrupted session files

3. **Implementation Tasks** (Make Tests Pass - GREEN phase):
   - Complete config-manager library with --init
   - Implement dynamic file loading in FileList
   - Implement markdown rendering in MarkdownViewer
   - Build session-monitor library for file watching
   - Build hook-integrator library for events
   - Create ObserveView component
   - Wire up session state to ObserveView
   - Add error handling and recovery

4. **Library CLI Tasks**:
   - Implement tui-renderer CLI interface [P]
   - Implement session-monitor CLI interface [P]
   - Implement document-viewer CLI interface [P]
   - Implement hook-integrator CLI interface [P]
   - Implement config-manager CLI interface [P]

**Ordering Strategy**:

```
Phase A: Contract Tests (Parallel)
  1-6: CLI contract tests [P]
  7-11: Library CLI contract tests [P]
  
Phase B: Core Libraries (Sequential)
  12: config-manager implementation
  13: Test --init functionality
  14: session-monitor implementation
  15: Test session file watching
  16: hook-integrator implementation
  17: Test hook event processing
  
Phase C: UI Completion (Sequential)  
  18: Dynamic file loading
  19: Test Plan view navigation
  20: Markdown rendering
  21: Test document display
  22: ObserveView implementation
  23: Test Observe view
  
Phase D: Integration (Sequential)
  24: End-to-end Plan view test
  25: End-to-end Observe view test
  26: Full application flow test
  27: Error recovery test
  
Phase E: Library CLIs (Parallel)
  28-32: Library CLI implementations [P]
```

**Task Prioritization**:

- **Critical Path**: Tasks 12-17 (core libraries) block everything else
- **Parallel Opportunities**: Contract tests and library CLIs
- **Dependencies**: UI tasks depend on core libraries
- **Already Started**: Plan view partially done, focus on completion

**Estimated Output**: ~32 tasks organized in 5 phases

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation

_These phases are beyond the scope of the /plan command_

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking

_Fill ONLY if Constitution Check has violations that must be justified_

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |

## Progress Tracking

_This checklist is updated during execution flow_

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

_Based on Constitution v2.1.1 - See `../../memory/constitution.md`_
