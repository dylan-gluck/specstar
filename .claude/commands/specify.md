---
name: specify
description: 'Start a new feature by creating a specification and feature branch. This is the first step in the Spec-Driven Development lifecycle.'
---

Start a new feature by creating a specification and feature branch.

<user-provided-details>
    $ARGUMENTS
</user-provided-details>

This is the first step in the Spec-Driven Development lifecycle.

Given the feature description provided as an argument, do this:

1. Run the script `scripts/create-new-feature.sh --json "$ARGUMENTS"` from repo root and parse its JSON output for BRANCH_NAME and SPEC_FILE.
2. Load `templates/spec-template.md` to understand required sections.
3. Consider constitutional principles when writing the specification:
   - Focus on WHAT users need, not HOW to implement
   - Keep specification simple and clear
   - Avoid technical implementation details
   - Mark any ambiguities for clarification
   - Remember: test infrastructure will be set up with project setup
   - Each future task will include its own tests and devlog entry
4. Write the specification to SPEC_FILE using the template structure, replacing placeholders with concrete details derived from the feature description (arguments) while preserving section order and headings.
5. Note that ALL feature implementation will be completed using spec-implementer agents in the tasks phase.
6. Report completion with branch name, spec file path, and readiness for the next phase.

Note: The script creates and checks out the new branch and initializes the spec file before writing.
