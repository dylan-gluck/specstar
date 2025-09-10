# Specstar TUI Codebase Inconsistency Report

## Executive Summary

This report synthesizes findings from six parallel codebase analyses examining inconsistencies in the Specstar TUI project. The analysis reveals significant architectural mismatches, duplicate implementations, and documentation gaps that impact maintainability and functionality.

**Critical Issues Identified:**
- Dual incompatible hook systems running in parallel
- Three separate file watching implementations (~1,451 lines of duplicate code)
- Three conflicting settings/configuration interfaces
- Missing documentation for 4 critical libraries
- Inconsistent naming conventions across modules

## 1. Hook System Architecture Mismatch

### Finding: Two Incompatible Hook Systems
The codebase contains two parallel hook systems that cannot interoperate:

#### Internal Hook System (`hook-integrator`)
- **Location**: `src/lib/hook-integrator/index.ts:145-151`
- **Events**: `beforeSession`, `afterSession`, `onFileChange`, `onCommand`, `onError`
- **Format**: camelCase naming
- **Handler**: `(event: HookEvent) => void | Promise<void>`
- **Execution**: TypeScript module imports

#### Claude Code Hook System (`config-manager/templates`)
- **Location**: `src/lib/config-manager/templates/hooks.ts:472-499`
- **Events**: `session_start`, `user_prompt_submit`, `pre_tool_use`, `post_tool_use`, `notification`, `pre_compact`, `session_end`, `stop`, `subagent_stop`
- **Format**: snake_case naming
- **Handler**: CLI script with stdin/argv
- **Execution**: Process spawning

### Impact
- `SessionMonitor` calls non-existent methods like `onSessionStart()` (line 470)
- Hook validation fails due to mismatched event names
- Template generates CLI scripts but `HookIntegrator` expects TypeScript modules

### Recommendation
Choose one hook system architecture and remove the other. The Claude Code system appears to be the intended design based on project goals.

## 2. Duplicate File Watching Implementations

### Finding: Three Redundant File Watchers
The codebase contains three separate file watching implementations:

1. **SessionWatcher** (`src/lib/session-monitor/session-watcher.ts`) - 172 lines
   - Basic JSON file watcher with debouncing
   - Simple event emission

2. **FileWatcher** (`src/lib/session-monitor/watcher.ts`) - 638 lines
   - Advanced recursive file watching
   - Pattern matching and filtering
   - Extensive configuration options

3. **SessionMonitor** (`src/lib/session-monitor/index.ts`) - 641 lines
   - Session-specific monitoring
   - Integrated hooks support
   - Statistics and analytics

### Impact
- ~1,451 lines of overlapping code
- Maintenance burden of three implementations
- Confusion about which to use

### Recommendation
Consolidate to single `FileWatcher` base class with `SessionMonitor` as specialized subclass.

## 3. Configuration/Settings Chaos

### Finding: Three Conflicting Settings Interfaces

1. **Settings** (`src/models/settings.ts:31-47`)
   - Comprehensive with hooks and theme
   - Used by models layer

2. **SpecstarSettings** (`src/lib/config/settings-loader.ts:8-16`)
   - Includes `sessionPath` property
   - Used by settings loader

3. **SpecstarConfig** (`src/lib/config-manager/index.ts:30-37`)
   - Optional `startPage` property
   - Used by config manager

### Impact
- Type mismatches when passing settings between modules
- Inconsistent validation rules
- Duplicate code for loading/saving settings

### Recommendation
Consolidate to single `Settings` interface in `src/models/settings.ts`.

## 4. Documentation Gaps

### Finding: Critical Libraries Lack Documentation

**Undocumented Libraries:**
- `src/lib/session-monitor/` - 641 lines of complex monitoring logic
- `src/lib/document-viewer/` - 477 lines of markdown rendering
- `src/lib/config-manager/` - 463 lines of initialization logic
- `src/lib/logger/` - Core logging infrastructure

**Well-Documented Libraries:**
- `src/lib/tui-renderer/` - Complete README with examples
- `src/lib/hook-integrator/` - Detailed API documentation

### Impact
- Difficult onboarding for new developers
- Unclear usage patterns
- Hidden features not discoverable

### Recommendation
Create README.md files for all undocumented libraries following the tui-renderer pattern.

## 5. Import and Dependency Issues

### Finding: Inconsistent Import Patterns

1. **Extension Inconsistency**
   ```typescript
   // Some files include .ts extension
   import { ConfigManager } from "./lib/config-manager/index.ts"
   // Others don't
   import { Logger } from "./lib/logger/index"
   ```

2. **Invalid External Import**
   ```typescript
   // src/lib/config-manager/index.ts:85
   import type { SessionContext, FileChangeEvent } from 'specstar';
   // 'specstar' package doesn't exist
   ```

3. **Missing Type-Only Imports**
   - Many files import types as values instead of using `import type`

### Impact
- Potential bundle size increase
- Build errors if 'specstar' is referenced
- Inconsistent code style

### Recommendation
- Remove all `.ts` extensions from imports
- Fix invalid 'specstar' import to use local types
- Use `import type` for all type-only imports

## 6. Naming Convention Inconsistencies

### Finding: Mixed Naming Patterns

1. **File Naming**
   - Views: `plan-view.tsx` (kebab) vs `ObserveView.tsx` (Pascal)
   - Components: Consistently kebab-case ✓

2. **Event Naming**
   - Internal: `beforeSession`, `onFileChange` (camelCase)
   - Claude Code: `session_start`, `pre_tool_use` (snake_case)

3. **Validation Functions**
   - `isValidAgent()`, `isValidSession()` vs `validate()`

### Impact
- Cognitive overhead when navigating codebase
- Potential import errors
- Inconsistent API surface

### Recommendation
- Standardize view files to kebab-case
- Unify event naming to snake_case (Claude Code standard)
- Use `isValid*` pattern consistently

## 7. Dead Code and Unused Files

### Finding: Significant Dead Code

**Unused Files:**
- `src/lib/tui-renderer/example.tsx` - 193 lines, no imports
- Commented exports in `src/index.ts:20-23`

**Duplicate CLI Utilities:**
- Identical `output()` and `error()` functions in 3 CLI files
- ~100 lines of duplicate boilerplate per file

### Impact
- Increased bundle size
- Maintenance burden
- Confusion about what's active

### Recommendation
- Delete unused example files
- Extract common CLI utilities to shared module
- Remove commented code

## Priority Action Items

### High Priority (Breaking Issues)
1. **Fix Hook System**: Choose Claude Code architecture, remove internal system
2. **Fix Invalid Import**: Replace 'specstar' package import with local types
3. **Fix SessionMonitor Calls**: Update to use correct hook methods

### Medium Priority (Code Quality)
1. **Consolidate File Watchers**: Merge three implementations into one
2. **Unify Settings Interfaces**: Single source of truth for configuration
3. **Standardize Imports**: Remove .ts extensions consistently

### Low Priority (Documentation/Cleanup)
1. **Create Missing READMEs**: Document undocumented libraries
2. **Remove Dead Code**: Delete unused files and commented exports
3. **Standardize Naming**: Fix file and function naming inconsistencies

## Consensus Analysis

All six analysis agents consistently identified:
1. The dual hook system as the most critical architectural issue
2. Duplicate file watching as the largest code duplication problem
3. Settings/configuration interfaces as a source of type conflicts
4. Missing documentation as a barrier to understanding
5. Import inconsistencies as a code style issue

The unanimous agreement across analyses indicates these are not edge cases but fundamental structural issues requiring attention.

## Estimated Impact

**If Issues Remain Unresolved:**
- Hook integration will fail silently or throw runtime errors
- ~1,500 lines of duplicate code will increase maintenance burden
- Type errors will occur when passing settings between modules
- New developers will struggle to understand undocumented features

**After Cleanup:**
- Single, working hook system aligned with Claude Code
- ~60% reduction in file watching code
- Type-safe settings flow throughout application
- Clear documentation for all major libraries

---

*Report generated: 2025-09-10*
*Analysis performed by: 6 parallel codebase analysis agents*
*Synthesis method: Majority consensus with cross-validation*