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
   - **Testing (80/20 rule)**: Spend ~80% on implementation, ~20% on tests
   - **Separation of Concerns**: Each task targets a single responsibility
   - **Simplicity**: Keep tasks minimal and focused
   - **File size**: Plan splits if files would exceed 250 lines
   - **No redundancy**: Reuse existing functions, avoid duplication

4. Task categories and priorities:
   - **Setup tasks**: Project init, dependencies, pre-commit hooks
   - **Core tasks**: Lightweight, modular implementations (80% focus)
   - **Test tasks [P]**: Modular, focused tests (20% focus)
   - **Integration tasks**: Only if truly needed
   - **Communication tasks**: Write concise devlog summary

5. Task generation rules (per constitution):
   - Each module → single responsibility task
   - Files approaching 250 lines → split task planned
   - Tests are modular and focused (not TDD-first)
   - Different files = can be parallel [P]
   - Same file = sequential (no [P])
   - Consistent naming with existing code

6. Order tasks by constitutional priorities:
   - Setup and architecture first
   - Core implementation (80% effort)
   - Focused testing (20% effort)
   - Devlog summary at end

7. Create FEATURE_DIR/tasks.md with:
   - Feature name from implementation plan
   - Numbered tasks (T001, T002, etc.)
   - Clear file paths for each task
   - File size considerations noted
   - Devlog writing task included

Context for task generation: $ARGUMENTS

The tasks.md should be immediately executable - each task must be specific enough that an LLM can complete it without additional context.
