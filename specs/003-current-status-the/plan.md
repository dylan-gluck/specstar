# Implementation Plan: Bug Fixes for Specstar TUI

**Branch**: `003-current-status-the` | **Date**: 2025-09-09 | **Spec**: `/specs/003-current-status-the/spec.md`
**Input**: Feature specification from `/specs/003-current-status-the/spec.md`

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

Fix five documented bugs in the Specstar TUI application to ensure correct session state management, proper configuration handling, and improved UI display. These fixes address critical issues with session hooks, default page configuration, theme customization, list scrolling, and session detail display in the observe view.

## Technical Context

**Language/Version**: TypeScript 5.x with React JSX  
**Primary Dependencies**: React Ink v6.3.0, Bun runtime  
**Storage**: JSON files (.specstar/sessions/)  
**Testing**: Bun test with ink-testing-library  
**Target Platform**: Terminal/CLI (cross-platform via Node.js)  
**Project Type**: single (Terminal UI application)  
**Performance Goals**: Real-time session monitoring, instant UI response  
**Constraints**: Terminal display limitations, must work with Claude Code hooks  
**Scale/Scope**: ~15 components, 2 main views (Plan, Observe), 5 bug fixes

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**Simplicity**:

- Projects: 1 (Single TUI application)
- Using framework directly? YES (React Ink directly, no wrapper classes)
- Single data model? YES (Session state and config models)
- Avoiding patterns? YES (Direct state management, no unnecessary abstractions)

**Architecture**:

- EVERY feature as library? YES (session-monitor, config-manager, hook-integrator)
- Libraries listed: 
  - session-monitor: Watch and track Claude Code session state
  - config-manager: Handle settings.json and theme configuration
  - hook-integrator: Process Claude Code lifecycle hooks
  - tui-renderer: Terminal UI rendering and navigation
- CLI per library: YES (specstar --init, --help, --version)
- Library docs: llms.txt format planned? YES

**Testing (NON-NEGOTIABLE)**:

- RED-GREEN-Refactor cycle enforced? YES (Tests written first via tdd-engineer)
- Git commits show tests before implementation? YES
- Order: Contract→Integration→E2E→Unit strictly followed? YES
- Real dependencies used? YES (Real file system, actual hooks)
- Integration tests for: new libraries, contract changes, shared schemas? YES
- FORBIDDEN: Implementation before test, skipping RED phase - UNDERSTOOD

**Observability**:

- Structured logging included? YES (Debug logs for session state changes)
- Frontend logs → backend? N/A (Terminal UI only)
- Error context sufficient? YES

**Versioning**:

- Version number assigned? YES (Following existing versioning)
- BUILD increments on every change? YES
- Breaking changes handled? N/A (Bug fixes only)

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

**Status**: ✅ COMPLETED

1. **Extracted unknowns from Technical Context**: No NEEDS CLARIFICATION items found

2. **Research agents dispatched**:
   - codebase-locator: Found all bug locations in current implementation
   - codebase-analyzer: Analyzed configuration and UI implementation
   - Research completed on all five documented bugs

3. **Findings consolidated** in `research.md`:
   - All technical decisions documented
   - Implementation locations identified
   - Testing strategy defined

**Output**: research.md created with all issues resolved

## Phase 1: Design & Contracts

**Status**: ✅ COMPLETED

1. **Entities extracted** → `data-model.md`:
   - Enhanced Settings with startPage and ThemeConfig
   - SessionState with restricted session_active mutations
   - New SessionListItem and ObserveViewLayout entities
   - ListItemStyle for consistent UI rendering

2. **Contracts generated** → `/contracts/hook-contracts.ts`:
   - SessionActiveContract enforces lifecycle-only mutations
   - SettingsContract defines new configuration structure
   - ListItemRenderContract ensures proper styling
   - ObserveViewContract specifies layout requirements

3. **Test helpers included** in contracts:
   - testHookCompliance() validates hook behavior
   - testSettingsCompliance() verifies configuration

4. **Test scenarios extracted** → `quickstart.md`:
   - Manual validation steps for each bug fix
   - Automated test suite commands
   - Troubleshooting guide included

5. **CLAUDE.md updates** not needed (existing file sufficient)

**Output**: data-model.md, /contracts/hook-contracts.ts, quickstart.md created

## Phase 2: Task Planning Approach

_This section describes what the /tasks command will do - DO NOT execute during /plan_

**Task Generation Strategy with tdd-engineer agents**:

1. **Contract Test Tasks** (5 tasks - all use tdd-engineer):
   - Test SessionActiveContract enforcement [P]
   - Test SettingsContract validation [P]
   - Test ListItemRenderContract compliance [P]
   - Test ScrollableListContract behavior [P]
   - Test ObserveViewContract layout [P]

2. **Bug Fix Implementation Tasks** (15 tasks - paired test/implementation):
   - Bug 1: Session state hooks (test + fix) - `.specstar/hooks.ts`
   - Bug 2: StartPage setting (test + implement) - `src/models/settings.ts`, `src/app.tsx`
   - Bug 3: Config cleanup (test + fix) - `src/models/settings.ts`
   - Bug 4: List styling (test + fix) - `src/components/file-list.tsx`
   - Bug 5: Observe view (test + refactor) - `src/views/ObserveView.tsx`

3. **Integration Test Tasks** (5 tasks):
   - Full session lifecycle test
   - Settings loading and application test
   - UI theming integration test
   - List scrolling integration test
   - Observe view navigation test

**Ordering Strategy**:

- Tests ALWAYS before implementation (TDD with tdd-engineer)
- Fix dependencies: Settings → App initialization → UI components → Views
- Parallel where possible (marked with [P])

**File Update Strategy**:
- Each bug fix updates specific existing files
- No new files needed (all fixes to existing code)
- Tests added to existing test directories

**Estimated Output**: 25 tasks using tdd-engineer agents

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

_Based on Constitution v2.1.1 - See `/memory/constitution.md`_
