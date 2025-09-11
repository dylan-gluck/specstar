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

3. Read the constitution at `/memory/constitution.md` to understand core principles:
   - Testing Strategy: 80% code, 20% tests (not TDD-first)
   - Separation of Concerns: Modular, single-responsibility components
   - Simple, Clean Code: Files under 250 lines, no redundancy
   - Consistency: Reuse existing code, maintain naming conventions
   - Communication: Write devlog summaries after work

4. Execute the implementation plan template:
   - Load `/templates/plan-template.md` (already copied to IMPL_PLAN path)
   - Set Input path to FEATURE_SPEC
   - Run the Execution Flow (main) function steps 1-10
   - The template is self-contained and executable
   - Follow error handling and gate checks as specified
   - Let the template guide artifact generation in $SPECS_DIR:
     * Phase 0 generates research.md
     * Phase 1 generates data-model.md, contracts/, quickstart.md
     * Phase 2 describes task approach (tasks.md created by /tasks command)
   - Incorporate <user-provided-details> from arguments into Technical Context
   - Update Progress Tracking as you complete each phase

5. Verify execution completed:
   - Check Progress Tracking shows all phases complete
   - Ensure all required artifacts were generated
   - Confirm no ERROR states in execution

6. Report results with branch name, file paths, and generated artifacts.

Use absolute paths with the repository root for all file operations to avoid path issues.
