# Implementation Plan: Fix Session Monitoring and Hook Integration

**Branch**: `002-fix-session-monitoring-hooks` | **Date**: 2025-09-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-fix-session-monitoring-hooks/spec.md`

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
5. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file
6. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
7. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
8. STOP - Ready for /tasks command
```

## Summary

Fix the session monitoring system and hook integration in Specstar TUI to properly track Claude Code sessions. Implement all 9 lifecycle hooks, correct data model inconsistencies, and create a functional Observe view for real-time session monitoring.

## Technical Context

**Language/Version**: TypeScript 5.x with Bun runtime  
**Primary Dependencies**: React Ink v6.3.0, Bun filesystem APIs, Node.js fs.watch  
**Storage**: JSON files in .specstar/sessions/ and .specstar/logs/  
**Testing**: Bun test with ink-testing-library  
**Target Platform**: Terminal UI on macOS/Linux  
**Project Type**: single - Terminal UI application  
**Performance Goals**: Sub-second UI updates, <250ms debounce for file watching  
**Constraints**: Non-blocking hook execution, atomic file writes  
**Scale/Scope**: Support concurrent sessions, handle 9 event types, track unlimited session history

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**Simplicity**:

- Projects: 1 (Specstar TUI application)
- Using framework directly? YES (React Ink directly, no wrappers)
- Single data model? YES (SessionData interface for all state)
- Avoiding patterns? YES (direct file operations, no repository pattern)

**Architecture**:

- EVERY feature as library? YES
- Libraries listed:
  - session-monitor: File watching and session state tracking
  - hook-integrator: Claude Code lifecycle hook execution
  - config-manager: Settings and initialization (existing, to be enhanced)
- CLI per library: YES (each has cli.ts entry point)
- Library docs: llms.txt format planned? YES (will add to each library)

**Testing (NON-NEGOTIABLE)**:

- RED-GREEN-Refactor cycle enforced? YES
- Git commits show tests before implementation? YES
- Order: Contract→Integration→E2E→Unit strictly followed? YES
- Real dependencies used? YES (actual file system, real React Ink)
- Integration tests for: new libraries, contract changes, shared schemas? YES
- FORBIDDEN: Implementation before test, skipping RED phase - UNDERSTOOD

**Observability**:

- Structured logging included? YES (existing Logger library)
- Frontend logs → backend? N/A (terminal UI only)
- Error context sufficient? YES (error tracking in state)

**Versioning**:

- Version number assigned? YES (1.0.0 in settings)
- BUILD increments on every change? YES
- Breaking changes handled? YES (graceful degradation for missing fields)

## Project Structure

### Documentation (this feature)

```
specs/002-fix-session-monitoring-hooks/
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
│   └── session.ts       # Updated SessionData interface
├── services/
├── cli/
└── lib/
    ├── session-monitor/ # Fixed implementation
    ├── hook-integrator/ # Enhanced with hook generation
    └── config-manager/  # Enhanced with Claude settings integration

tests/
├── contract/
│   └── hook-contracts.test.ts
├── integration/
│   └── session-tracking.test.ts
└── unit/

.specstar/
├── hooks.ts            # Generated hook script
├── sessions/
└── logs/
```

**Structure Decision**: Option 1 (Single project) - Terminal UI application

## Phase 0: Outline & Research

1. **Extract unknowns from Technical Context**:
   - Claude Code hook JSON schemas and execution environment
   - Actual session state.json structure from Claude Code
   - Atomic file write patterns in Bun
   - React Ink real-time update patterns

2. **Generate and dispatch research agents**:
   - Research Claude Code hook system environment variables and execution
   - Find best practices for atomic file operations in Bun
   - Research React Ink patterns for real-time data updates
   - Investigate file watching debouncing strategies

3. **Consolidate findings** in `research.md`

**Output**: research.md with all technical decisions documented

## Phase 1: Design & Contracts

_Prerequisites: research.md complete_

1. **Extract entities from feature spec** → `data-model.md`:
   - SessionData with correct field names
   - HookEvent interfaces for all 9 event types
   - LogEntry structure for each log file

2. **Generate API contracts** from functional requirements:
   - Hook input/output JSON schemas for each event
   - Session state transitions
   - File system operations contracts

3. **Generate contract tests** from contracts:
   - Tests for each hook handler
   - Session state mutation tests
   - File watching event tests

4. **Extract test scenarios** from user stories:
   - Initialize session tracking
   - Track tool usage and file operations
   - Handle concurrent agents
   - Display real-time updates

5. **Update CLAUDE.md incrementally**:
   - Add session monitoring and hooks info
   - Keep under 150 lines

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, CLAUDE.md update

## Phase 2: Task Planning Approach

_This section describes what the /tasks command will do - DO NOT execute during /plan_

**Task Generation Strategy**:
- Fix SessionData interface → model task [P]
- Generate hooks.ts file → hook generation task
- Update config-manager for Claude settings → config task
- Fix session-monitor data handling → monitor tasks
- Implement ObserveView component → UI task
- Create contract tests for each hook → 9 test tasks [P]
- Integration tests for session tracking → integration task

**Ordering Strategy**:
1. Contract tests first (TDD)
2. Data model fixes
3. Hook generation and config
4. Session monitor fixes
5. ObserveView implementation
6. Integration tests

**Estimated Output**: 20-25 numbered, ordered tasks in tasks.md

## Phase 3+: Future Implementation

_These phases are beyond the scope of the /plan command_

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking

_No violations - all constitutional principles satisfied_

## Progress Tracking

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
- [x] Complexity deviations documented (none)

---

_Based on Constitution v2.1.1 - See `../../memory/constitution.md`_