---
name: plan
description: 'Plan how to implement the specified feature. This is the second step in the Spec-Driven Development lifecycle.'
---

Plan how to implement the specified feature.

<user-provided-details>
    $ARGUMENTS
</user-provided-details>

This is the second step in the Spec-Driven Development lifecycle.

Given the implementation details provided as an argument, do this:

1. Run `scripts/setup-plan.sh --json` from the repo root and parse JSON for FEATURE_SPEC, IMPL_PLAN, SPECS_DIR, BRANCH. All future file paths must be absolute.
2. Read and analyze the feature specification to understand:
   - The feature requirements and user stories
   - Functional and non-functional requirements
   - Success criteria and acceptance criteria
   - Any technical constraints or dependencies mentioned

3. Analyze the existing project MUST use codebase-analyzer, codebase-locator and codebase-pattern-finder agents in parallel:
   - Use codebase-analyzer to understand current implementation patterns
   - Use codebase-locator to find relevant existing components
   - Use codebase-pattern-finder to identify patterns to follow
   - Extract insights about project structure, naming conventions, and existing utilities

4. Read the constitution at `/memory/constitution.md` to understand core principles:
   - Project Setup: Test infrastructure AND pre-commit hooks AND language-specific debugger together as first priority
   - Testing Strategy: 80% code, 20% tests PER TASK (implementation first, then tests)
   - Separation of Concerns: Modular, single-responsibility components
   - Simple, Clean Code: Files under 250 lines, no redundancy
   - Consistency: Reuse existing code, maintain naming conventions
   - Communication: EVERY task requires commit AND devlog entry

5. Execute the implementation plan template:
   - Load `/templates/plan-template.md` (already copied to IMPL_PLAN path)
   - Set Input path to FEATURE_SPEC
   - Run the Execution Flow (main) function steps 1-10
   - The template is self-contained and executable
   - Follow error handling and gate checks as specified
   - Let the template guide artifact generation in $SPECS_DIR:
     * Phase 0 generates research.md (includes test infrastructure and debugger planning)
     * Phase 1 generates data-model.md, contracts/, quickstart.md with debugger usage instructions
     * Phase 2 describes task approach with per-task testing (tasks.md created by /tasks command)
   - Incorporate <user-provided-details> from arguments into Technical Context
   - Incorporate codebase analysis insights from step 3 into planning
   - Update Progress Tracking as you complete each phase

6. Verify execution completed:
   - Check Progress Tracking shows all phases complete
   - Ensure all required artifacts were generated
   - Confirm no ERROR states in execution
   - Verify codebase analysis insights were incorporated

7. Report results with branch name, file paths, and generated artifacts.

Use absolute paths with the repository root for all file operations to avoid path issues.
