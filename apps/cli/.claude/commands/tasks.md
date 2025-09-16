---
name: tasks
description: 'Break down the plan into executable tasks. This is the third step in the Spec-Driven Development lifecycle.'
---

Break down the plan into executable tasks following constitutional principles.

This is the third step in the Spec-Driven Development lifecycle.

Given the context provided as an argument, do this:

1. Run `scripts/check-task-prerequisites.sh --json` from repo root and parse FEATURE_DIR and AVAILABLE_DOCS list. All paths must be absolute.

2. Load and analyze available design documents:
   - Always read plan.md for tech stack and libraries
   - Read constitution at `/memory/constitution.md` for principles
   - IF EXISTS: Read data-model.md for entities
   - IF EXISTS: Read contracts/ for API endpoints
   - IF EXISTS: Read research.md for technical decisions
   - IF EXISTS: Read quickstart.md for test scenarios

3. Generate tasks following constitutional principles:
   - **Project Setup**: MUST include language-specific debugger (pyright, gopls, rust-analyzer, etc.)
   - **Testing (80/20 rule PER TASK)**: Each task includes 80% implementation, 20% tests BEFORE completion
   - **Separation of Concerns**: Each task targets a single responsibility
   - **Simplicity**: Keep tasks minimal and focused
   - **File size**: Plan splits if files would exceed 250 lines
   - **No redundancy**: Reuse existing functions, avoid duplication
   - **Task completion**: EVERY task must include tests AND devlog entry before marking complete
   - **Implementation method**: ALL feature implementation MUST be completed using spec-implementer agents

4. Task categories and priorities:
   - **Setup tasks**: Project init WITH test infrastructure AND pre-commit hooks AND debugger together
   - **Debugger config**: Language-specific LSP setup with usage instructions
   - **Core tasks**: Each includes implementation (80%) AND tests (20%) in same task, executed via spec-implementer agent
   - **Integration tasks**: Only if truly needed, also include tests
   - **Communication**: EVERY task requires git commit AND devlog entry

5. Task generation rules (per constitution):
   - Each module → single responsibility task WITH tests included
   - Files approaching 250 lines → split task planned
   - Tests are part of EACH task (implementation first, then tests)
   - Different files = can be parallel, MUST mark with [P]
   - Same file = sequential (no [P])
   - Tasks marked with [P] MUST be completed in parallel when executing
   - Consistent naming with existing code
   - Every task ends with: commit + devlog entry
   - All implementation tasks MUST specify use of spec-implementer agent

6. Order tasks by constitutional priorities:
   - Setup (including test infrastructure) first
   - Core implementation WITH tests per task
   - Each task self-contained with implementation + tests + commit + devlog
   - No separate testing phase - tests are part of each task
   - Parallel tasks [P] should be grouped for concurrent execution

7. Create FEATURE_DIR/tasks.md with:
   - Feature name from implementation plan
   - Numbered tasks (T001, T002, etc.)
   - Clear file paths for each task
   - File size considerations noted
   - [P] markers for parallel execution where applicable
   - Specification that spec-implementer agent must be used
   - Devlog writing task included

Context for task generation: $ARGUMENTS

The tasks.md should be immediately executable - each task must be specific enough that an LLM can complete it without additional context.
