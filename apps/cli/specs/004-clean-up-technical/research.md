# Research: Technical Debt Cleanup Analysis

## Executive Summary
Comprehensive analysis confirms ~5,000+ lines of redundant code across 6 major areas. Additionally discovered unnecessary service CLIs adding 240MB of redundant executables.

## Critical Finding: Unnecessary Service CLIs

**Decision**: Remove all service CLI executables except main `specstar`
**Rationale**: Each service has its own 60MB+ executable when they should be internal libraries
**Impact**: 240MB reduction in dist/, 2,000+ lines of CLI code removed

### Evidence
- 5 separate executables in dist/: config-manager (60MB), document-viewer (62MB), hook-integrator (60MB), session-monitor (60MB), specstar (64MB)
- Each service has unnecessary cli.ts file with full command structure
- Services should be internal - no external API needed
- Only required executables: `specstar` and `hooks.ts` (created on --init)

### Files for Removal
- `/src/lib/session-monitor/cli.ts` (459 lines)
- `/src/lib/document-viewer/cli.ts` (estimated 400+ lines)
- `/src/lib/hook-integrator/cli.ts` (estimated 400+ lines)
- `/src/lib/config-manager/cli.ts` (estimated 400+ lines)
- `/src/lib/tui-renderer/cli.ts` (if exists)
- All `build:libs` commands from package.json

## 1. Hook-integrator Directory Analysis

**Decision**: Complete removal of hook-integrator directory
**Rationale**: Entirely unused, working implementation exists in config-manager/templates/hooks.ts
**Alternatives considered**: Fixing integration - rejected due to duplicate functionality

### Evidence
- Directory contains 2,642 lines across 6 files
- Main export commented out in `src/index.ts:23`
- Only references in test files
- Session Monitor has unused hook methods (lines 228-231, 469-493)
- Working hooks.ts template already exists in config-manager

### Safe Removal
- `/src/lib/hook-integrator/` (entire directory - 2,642 lines)
- `/tests/contract/cli-hook-integrator.test.ts` (93 lines)
- Unused imports and methods in SessionMonitor

## 2. Session Monitoring Redundancy

**Decision**: Keep only SessionMonitor class, remove FileWatcher and SessionWatcher
**Rationale**: SessionMonitor is actively used in ObserveView, others are unused
**Alternatives considered**: Consolidating all three - rejected as SessionMonitor is sufficient

### Evidence
- **SessionMonitor** (640 lines) - USED in ObserveView.tsx
- **FileWatcher** (637 lines) - UNUSED except in tests
- **SessionWatcher** (172 lines) - COMPLETELY UNUSED

### Safe Removal
- `/src/lib/session-monitor/watcher.ts` (637 lines)
- `/src/lib/session-monitor/session-watcher.ts` (172 lines)
- `/src/lib/session-monitor/cli.ts` (459 lines)

## 3. Configuration Management Duplication

**Decision**: Standardize on ConfigManager, remove settings-loader
**Rationale**: ConfigManager is more complete with proper schema and initialization
**Alternatives considered**: Keeping settings-loader - rejected due to deprecated schema

### Evidence
- **ConfigManager** (463 lines) - Full-featured, used in CLI init
- **settings-loader** (82 lines) - Simple, uses deprecated `sessionPath` field
- Different schemas causing inconsistency

### Migration Required
- Update `app.tsx` to use `ConfigManager.load()` instead of `loadSettings()`
- Remove entire `/src/lib/config/` directory

## 4. ObserveView Component Extraction

**Decision**: Extract SessionDashboard and EmptyState into separate components
**Rationale**: 606-line file violates 250-line constitutional limit
**Alternatives considered**: Keep as-is - rejected due to constitution requirements

### Extraction Plan
- `SessionDashboard` (265 lines) → `/src/components/session-dashboard.tsx`
- `EmptyState` (18 lines) → `/src/components/empty-state.tsx`
- Extract shared UI patterns for reuse in other views

### Pattern Library Opportunities
- Two-column responsive layout (20%/80% split)
- Bordered sections with classic style
- Status indicators with colored dots
- Footer navigation hints

## 5. Test Infrastructure Cleanup

**Decision**: Remove all skipped/broken tests
**Rationale**: 30+ skipped tests provide no value and create maintenance burden
**Alternatives considered**: Fixing tests - rejected as many test unused features

### Evidence
- 30 tests using `.skip()`
- Entire test files completely skipped
- Tests for removed features (hook-integrator)

### Safe Removal
- All `.skip()` test blocks
- Test files with 100% skipped tests
- Tests for removed libraries

## Summary of Removals

### Line Count Impact
| Area | Lines to Remove | Impact |
|------|-----------------|--------|
| Service CLIs | ~2,000 | No external APIs needed |
| Hook-integrator | 2,735 | Unused library |
| Redundant watchers | 1,268 | Duplicate implementations |
| Settings-loader | 82 | Replaced by ConfigManager |
| ObserveView extraction | 283 | Move to components |
| Skipped tests | ~500 | Broken/obsolete |
| **TOTAL** | **~6,868 lines** | **45% reduction** |

### Disk Space Impact
- Remove 240MB of unnecessary executables from dist/
- Reduce package size significantly

### Build Time Impact
- Remove 4 unnecessary build steps
- Faster CI/CD pipeline

## Implementation Order

1. **Phase 1**: Remove unused libraries
   - Delete hook-integrator directory
   - Delete redundant watcher files
   - Delete service CLI files
   - Update package.json build scripts

2. **Phase 2**: Consolidate configuration
   - Migrate app.tsx to ConfigManager
   - Remove settings-loader

3. **Phase 3**: Extract UI components
   - Create components directory structure
   - Extract SessionDashboard and EmptyState
   - Create shared UI pattern library

4. **Phase 4**: Clean tests
   - Remove skipped tests
   - Remove tests for deleted code

## Validation Strategy

After each removal phase:
1. Run `bun test` to ensure remaining tests pass
2. Run `bun run build` to verify build succeeds
3. Test `specstar` executable manually
4. Verify `--init` still creates hooks.ts correctly
5. Check all UI views still render properly

## Risk Assessment

**Low Risk**:
- Service CLI removal (never used in production)
- Hook-integrator removal (already commented out)
- Skipped test removal (provide no coverage)

**Medium Risk**:
- Settings-loader migration (requires app.tsx update)
- ObserveView extraction (active component refactor)

**Mitigation**:
- Test thoroughly after each phase
- Keep changes atomic and reversible
- Validate functionality remains intact