# Plan Validation Report

## Critical Issues Found

### 1. ❌ Hook Configuration Structure Mismatch

**Issue**: The quickstart.md shows an incorrect flat structure for Claude Code hooks configuration.

**Incorrect (in quickstart.md lines 59-70):**
```json
{
  "hooks": {
    "SessionStart": "bun .specstar/hooks.ts SessionStart",
    "SessionEnd": "bun .specstar/hooks.ts SessionEnd",
    // ...
  }
}
```

**Correct (per cc-hooks-reference.md and specstar-hooks.md):**
```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "command": "bun run $CLAUDE_PROJECT_DIR/.specstar/hooks.ts session_start",
            "type": "command"
          }
        ]
      }
    ]
  }
}
```

**Impact**: The initialization command would create invalid hook configuration that Claude Code wouldn't recognize.

### 2. ⚠️ Hook Command Argument Inconsistency

**Issue**: Inconsistent hook command arguments between documents.

- specstar-hooks.md uses snake_case: `hooks.ts session_start`
- quickstart.md uses PascalCase: `hooks.ts SessionStart`

**Recommendation**: Use snake_case consistently to match the specstar-hooks.md specification.

### 3. ⚠️ Missing $CLAUDE_PROJECT_DIR Variable

**Issue**: The quickstart.md doesn't use the `$CLAUDE_PROJECT_DIR` environment variable in hook commands.

**Impact**: Hooks may fail if Claude Code's working directory isn't the project root.

## Document Review Summary

### /docs/specstar-plan.md
✅ **Valid** - General architecture and user flow documentation is accurate.

### /docs/specstar-hooks.md  
✅ **Valid** - Correctly specifies the nested hook structure with proper JSON format.

### /docs/vendor/cc-hooks-reference.md
✅ **Reference** - Official Claude Code documentation showing correct hook structure.

### /specs/001-docs-specstar-plan/quickstart.md
❌ **Invalid** - Contains incorrect hook configuration structure that needs correction.

### /specs/001-docs-specstar-plan/data-model.md
✅ **Valid** - Data models are correctly defined and consistent.

### /specs/001-docs-specstar-plan/contracts/cli-contracts.md
✅ **Valid** - CLI contracts are properly specified.

### /specs/001-docs-specstar-plan/research.md
✅ **Valid** - Technical research and decisions are sound.

### /specs/001-docs-specstar-plan/plan.md
✅ **Valid** - Implementation plan follows constitution and is well-structured.

## Required Corrections

### 1. Update quickstart.md Hook Configuration

The hook configuration section (lines 57-70) needs to be replaced with the correct nested structure from specstar-hooks.md.

### 2. Standardize Hook Command Arguments

Ensure all documents use consistent snake_case arguments:
- `session_start` not `SessionStart`
- `user_prompt_submit` not `UserPromptSubmit`
- etc.

### 3. Add Environment Variable

All hook commands should use `$CLAUDE_PROJECT_DIR` to ensure they work regardless of Claude Code's working directory.

## Additional Observations

### Positive Findings

1. **Architecture Consistency**: The overall architecture between documents is consistent.
2. **Data Model Alignment**: Session state schema matches between specstar-hooks.md and data-model.md.
3. **TDD Approach**: Plan correctly emphasizes test-first development per constitution.
4. **Library Structure**: Five libraries with CLI interfaces properly defined.

### Minor Improvements Needed

1. **Hook Script Implementation**: The hooks.ts file needs to handle command-line arguments (e.g., `session_start`) to route to the correct handler.
2. **Error Handling**: Hook scripts should return appropriate exit codes (0 for success, 2 for blocking errors).
3. **Atomic Writes**: State updates must use temp file + rename pattern for atomicity.

## Validation Checklist

- [x] Hook structure matches Claude Code reference documentation
- [x] Data models are internally consistent
- [x] CLI contracts follow standard patterns
- [x] Constitution requirements are met
- [x] File paths use absolute paths or environment variables
- [x] Hook configuration in quickstart.md is correct (FIXED)
- [x] Hook command arguments are consistent (snake_case)
- [x] Test-first approach is maintained

## Corrections Applied

1. ✅ Updated quickstart.md with correct nested hook structure
2. ✅ Standardized hook command arguments to snake_case
3. ✅ Added $CLAUDE_PROJECT_DIR environment variable to all hook commands
4. ✅ Fixed manual test command to use correct JSON structure

## Recommendation

**READY TO PROCEED** - All critical issues have been addressed. The plan is now valid and ready for the /tasks command to generate the detailed task list.

## Next Steps

1. ✅ ~~Fix quickstart.md hook configuration~~ (COMPLETED)
2. Ensure config-manager library generates correct hook structure (for implementation phase)
3. ✅ ~~Update any other references to hook configuration~~ (COMPLETED)
4. Proceed with /tasks command