# Specstar TUI Codebase Inconsistency Solution Plan

## Executive Summary

This plan synthesizes solutions from four parallel strategy analyses to address the critical inconsistencies identified in the Specstar TUI codebase. The plan prioritizes stability, maintains backward compatibility where possible, and provides a clear migration path with minimal disruption.

**Implementation Timeline:** 4-5 days  
**Risk Level:** Medium (mitigated through phased approach)  
**Expected Outcome:** Clean, maintainable codebase with single implementations for each subsystem

## Phase 1: Critical Fixes (Day 1)
*These fixes address breaking issues and must be completed first*

### 1.1 Fix Invalid 'specstar' Package Import

**File:** `/Users/dylan/Workspace/projects/specstar/src/lib/config-manager/index.ts`  
**Line:** 85  
**Action:** Remove the invalid import line
```typescript
// DELETE THIS LINE:
import type { SessionContext, FileChangeEvent } from 'specstar';
```
**Reason:** The 'specstar' package doesn't exist. Types are already defined locally in the same file.

### 1.2 Fix SessionMonitor Hook Integration

**Problem:** SessionMonitor calls non-existent methods like `onSessionStart()`

**Files to Update:**
1. `/Users/dylan/Workspace/projects/specstar/src/lib/session-monitor/index.ts`
   - Line 470: Change `(this.hookIntegrator as any).onSessionStart?.(session)`  
     to `this.hookIntegrator?.triggerHook('session_start', session)`
   - Line 492: Change `(this.hookIntegrator as any).onSessionEnd?.(session)`  
     to `this.hookIntegrator?.triggerHook('session_end', session)`
   - Line 522: Change `(this.hookIntegrator as any).onFileChange?.(event.data)`  
     to `this.hookIntegrator?.triggerHook('file_change', event.data)`

### 1.3 Standardize Import Extensions

**Quick Fix Script:**
```bash
#!/bin/bash
# fix-imports.sh
find src tests scripts -name "*.ts" -o -name "*.tsx" | while read file; do
  sed -i '' 's/from "\(.*\)\.ts"/from "\1"/g' "$file"
  sed -i '' "s/from '\(.*\)\.ts'/from '\1'/g" "$file"
done
```

**Manual Updates Required:**
- `/Users/dylan/Workspace/projects/specstar/src/cli.tsx` (lines 5-6)
- `/Users/dylan/Workspace/projects/specstar/src/components/error-boundary.tsx` (line 4)
- `/Users/dylan/Workspace/projects/specstar/tests/contracts/list-render.test.ts` (line 13)
- `/Users/dylan/Workspace/projects/specstar/scripts/validate-quickstart.ts` (line 5)

## Phase 2: Hook System Migration (Day 2)
*Migrate from dual hook system to single Claude Code architecture*

### 2.1 Create Claude Hook Executor

**New File:** `/Users/dylan/Workspace/projects/specstar/src/lib/claude-hook-executor/index.ts`

```typescript
import { spawn } from 'child_process';
import { join } from 'path';
import { existsSync } from 'fs';

export interface ClaudeHookEvent {
  session_id: string;
  hook_event_name: string;
  [key: string]: any;
}

export class ClaudeHookExecutor {
  private hooksPath: string;
  
  constructor(configPath: string = '.specstar') {
    this.hooksPath = join(configPath, 'hooks.ts');
  }
  
  async executeHook(eventName: string, data: ClaudeHookEvent): Promise<void> {
    if (!existsSync(this.hooksPath)) {
      return; // No hooks file, skip silently
    }
    
    const child = spawn('bun', [this.hooksPath], {
      env: { ...process.env, HOOK_EVENT: eventName },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    child.stdin.write(JSON.stringify({
      ...data,
      hook_event_name: eventName
    }));
    child.stdin.end();
    
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => stdout += data);
      child.stderr.on('data', (data) => stderr += data);
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          console.error(`Hook ${eventName} failed:`, stderr);
          resolve(); // Don't break on hook failure
        }
      });
    });
  }
}
```

### 2.2 Update SessionMonitor Integration

**File:** `/Users/dylan/Workspace/projects/specstar/src/lib/session-monitor/index.ts`

**Add at line 9:**
```typescript
import { ClaudeHookExecutor } from '../claude-hook-executor';
```

**Add property at line 95:**
```typescript
private hookExecutor?: ClaudeHookExecutor;
```

**Add method at line 105:**
```typescript
setHookExecutor(executor: ClaudeHookExecutor): void {
  this.hookExecutor = executor;
}
```

**Update hook calls (lines 469-522):**
```typescript
// Line 469-471 - Replace with:
if (this.hookExecutor && event.type === 'session_start') {
  await this.hookExecutor.executeHook('session_start', {
    session_id: session.id,
    source: 'startup'
  });
}

// Line 491-493 - Replace with:
if (this.hookExecutor && event.type === 'session_end') {
  await this.hookExecutor.executeHook('session_end', {
    session_id: session.id
  });
}

// Line 521-523 - Replace with:
if (this.hookExecutor && event.type === 'file_change') {
  await this.hookExecutor.executeHook('file_change', {
    session_id: this.currentSession?.id || '',
    path: event.data.path,
    content: event.data.content
  });
}
```

### 2.3 Deprecate Old Hook System

**File:** `/Users/dylan/Workspace/projects/specstar/src/lib/hook-integrator/index.ts`  
**Add at line 1:**
```typescript
/**
 * @deprecated Use ClaudeHookExecutor instead. This will be removed in v2.0.0
 */
```

## Phase 3: File Watcher Consolidation (Day 3)
*Merge three file watching implementations into one*

### 3.1 Create Unified File Watcher Architecture

**Step 1: Extract Common Types**  
**New File:** `/Users/dylan/Workspace/projects/specstar/src/lib/session-monitor/types.ts`
```typescript
export interface FileChangeEvent {
  path: string;
  type: 'change' | 'rename' | 'add' | 'unlink';
  content?: string;
  stats?: any;
}

export interface WatcherOptions {
  recursive?: boolean;
  persistent?: boolean;
  ignoreInitial?: boolean;
  debounceMs?: number;
  filter?: (path: string) => boolean;
}
```

**Step 2: Create Session-Specific Watcher**  
**New File:** `/Users/dylan/Workspace/projects/specstar/src/lib/session-monitor/session-file-watcher.ts`
```typescript
import { FileWatcher } from './watcher';
import type { FileChangeEvent, WatcherOptions } from './types';

export class SessionFileWatcher extends FileWatcher {
  private sessionPath: string;
  
  constructor(sessionPath: string, options: WatcherOptions = {}) {
    super({
      ...options,
      filter: (path) => path.endsWith('.json') && path.includes('session')
    });
    this.sessionPath = sessionPath;
  }
  
  // Session-specific methods
  async watchSession(sessionId: string): Promise<void> {
    const path = `${this.sessionPath}/${sessionId}.json`;
    await this.watch(path);
  }
}
```

**Step 3: Refactor SessionMonitor**  
**File:** `/Users/dylan/Workspace/projects/specstar/src/lib/session-monitor/index.ts`
- Lines 349-375: Replace polling logic with `SessionFileWatcher`
- Line 95: Add `private watcher: SessionFileWatcher;`
- Line 103: Initialize `this.watcher = new SessionFileWatcher(this.sessionPath);`

### 3.2 Remove Duplicate Implementations

**Delete Files:**
1. `/Users/dylan/Workspace/projects/specstar/src/lib/session-monitor/session-watcher.ts` (entire file)
2. Remove duplicate watcher code from `session-monitor/index.ts` (lines 349-375)

**Update Imports:**
- Any file importing from `session-watcher.ts` should import from `session-file-watcher.ts`

## Phase 4: Settings Unification (Day 4)
*Consolidate three settings interfaces into one*

### 4.1 Create Unified Settings Interface

**File:** `/Users/dylan/Workspace/projects/specstar/src/models/settings.ts`

**Update Settings interface (line 31):**
```typescript
export interface Settings {
  version: string;
  sessionPath: string;  // Add this from SpecstarSettings
  startPage: 'plan' | 'observe' | 'help';
  folders: FolderConfig[];
  hooks: HookSettings;
  theme: ThemeSettings;
  ui: UISettings;
  monitoring: MonitoringSettings;
  logs: LogSettings;
}
```

### 4.2 Create Migration Utilities

**Add to:** `/Users/dylan/Workspace/projects/specstar/src/models/settings.ts` (line 160)
```typescript
export function migrateFromLegacySettings(legacy: any): Settings {
  // Handle SpecstarSettings format
  if ('sessionPath' in legacy && !('hooks' in legacy)) {
    return {
      ...legacy,
      hooks: { enabled: false, path: '.specstar/hooks.ts' },
      theme: { name: 'default', customColors: {} },
      ui: { shortcuts: true, animations: true },
      monitoring: { interval: 1000, maxRetries: 3 },
      logs: { level: 'info', maxSize: 10485760 }
    };
  }
  
  // Handle SpecstarConfig format
  if (!('sessionPath' in legacy) && 'folders' in legacy) {
    return {
      ...legacy,
      sessionPath: '.specstar/sessions',
      hooks: { enabled: false, path: '.specstar/hooks.ts' },
      theme: { name: 'default', customColors: {} },
      ui: { shortcuts: true, animations: true },
      monitoring: { interval: 1000, maxRetries: 3 },
      logs: { level: 'info', maxSize: 10485760 }
    };
  }
  
  // Already in Settings format
  return legacy as Settings;
}
```

### 4.3 Update ConfigManager

**File:** `/Users/dylan/Workspace/projects/specstar/src/lib/config-manager/index.ts`

**Line 30-37: Replace SpecstarConfig with:**
```typescript
import type { Settings } from '../../models/settings';
export type SpecstarConfig = Settings; // Alias for backward compatibility
```

**Line 235: Update validation method:**
```typescript
validateConfig(config: any): config is Settings {
  return Settings.validate(config);
}
```

### 4.4 Update Settings Loader

**File:** `/Users/dylan/Workspace/projects/specstar/src/lib/config/settings-loader.ts`

**Lines 8-16: Replace with:**
```typescript
import type { Settings } from '../../models/settings';
import { migrateFromLegacySettings } from '../../models/settings';

export async function loadSettings(): Promise<Settings> {
  const raw = await readSettingsFile();
  return migrateFromLegacySettings(raw);
}
```

## Phase 5: Cleanup and Documentation (Day 5)
*Final cleanup, testing, and documentation*

### 5.1 File Naming Standardization

**Rename Files:**
```bash
git mv src/views/ObserveView.tsx src/views/observe-view.tsx
```

**Update Imports:**
- `/Users/dylan/Workspace/projects/specstar/src/app.tsx` (line 4)
  Change: `import ObserveView from "./views/ObserveView";`
  To: `import ObserveView from "./views/observe-view";`

### 5.2 Remove Dead Code

**Delete Files:**
1. `/Users/dylan/Workspace/projects/specstar/src/lib/tui-renderer/example.tsx`
2. Remove commented exports from `/Users/dylan/Workspace/projects/specstar/src/index.ts` (lines 20-23)

### 5.3 Extract Common CLI Utilities

**New File:** `/Users/dylan/Workspace/projects/specstar/src/lib/cli-utils/index.ts`
```typescript
export function output(data: any, jsonFormat: boolean = false): void {
  if (jsonFormat) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(data);
  }
}

export function error(message: string, code: number = 1): never {
  console.error(message);
  process.exit(code);
}
```

**Update CLI files to import from cli-utils:**
- `/Users/dylan/Workspace/projects/specstar/src/lib/tui-renderer/cli.ts`
- `/Users/dylan/Workspace/projects/specstar/src/lib/hook-integrator/cli.ts`
- `/Users/dylan/Workspace/projects/specstar/src/lib/config-manager/cli.ts`

### 5.4 Create Missing Documentation

**Create README files for:**
1. `/Users/dylan/Workspace/projects/specstar/src/lib/session-monitor/README.md`
2. `/Users/dylan/Workspace/projects/specstar/src/lib/document-viewer/README.md`
3. `/Users/dylan/Workspace/projects/specstar/src/lib/config-manager/README.md`
4. `/Users/dylan/Workspace/projects/specstar/src/lib/logger/README.md`

## Testing Strategy

### Unit Tests
Run after each phase:
```bash
bun test
```

### Integration Tests
After Phase 2 (Hook System):
```bash
bun test src/lib/session-monitor
bun test src/lib/hook-integrator
```

After Phase 3 (File Watcher):
```bash
bun test src/lib/session-monitor/watcher
```

After Phase 4 (Settings):
```bash
bun test src/models/settings
bun test src/lib/config-manager
```

### E2E Tests
Final validation:
```bash
bun run build
./specstar --init
./specstar
```

## Migration Checklist

- [ ] **Phase 1: Critical Fixes**
  - [ ] Fix invalid 'specstar' import
  - [ ] Fix SessionMonitor hook calls
  - [ ] Remove .ts extensions from imports
  
- [ ] **Phase 2: Hook System**
  - [ ] Create ClaudeHookExecutor
  - [ ] Update SessionMonitor integration
  - [ ] Add deprecation notices
  
- [ ] **Phase 3: File Watcher**
  - [ ] Create unified watcher architecture
  - [ ] Refactor SessionMonitor
  - [ ] Delete duplicate implementations
  
- [ ] **Phase 4: Settings**
  - [ ] Create unified Settings interface
  - [ ] Add migration utilities
  - [ ] Update all references
  
- [ ] **Phase 5: Cleanup**
  - [ ] Standardize file names
  - [ ] Remove dead code
  - [ ] Extract common utilities
  - [ ] Create documentation

## Risk Mitigation

### Rollback Plan
1. Each phase is in a separate git commit
2. Feature branches for each major change
3. Tag stable version before starting

### Backward Compatibility
1. Keep deprecated interfaces with warnings
2. Provide migration utilities for settings
3. Support both hook systems temporarily
4. Document breaking changes in CHANGELOG

### Testing Coverage
1. Existing tests remain passing
2. New tests for migration utilities
3. Integration tests for each phase
4. Manual testing of CLI commands

## Expected Outcomes

### Immediate Benefits
- **Eliminated Runtime Errors:** No more invalid imports or missing methods
- **Reduced Code Size:** ~1,500 lines removed through consolidation
- **Type Safety:** Single source of truth for all interfaces

### Long-term Benefits
- **Maintainability:** Clear, single implementations for each subsystem
- **Documentation:** Complete READMEs for all libraries
- **Developer Experience:** Consistent patterns and naming conventions
- **Performance:** Reduced bundle size from type-only imports

### Metrics for Success
- Zero TypeScript compilation errors
- All tests passing (100% of existing tests)
- File watcher code reduced by 60%
- Settings type conflicts eliminated
- Hook system working with Claude Code

## Conclusion

This phased approach ensures stability while systematically addressing each inconsistency. The plan prioritizes critical fixes first, then migrates complex systems with careful testing at each step. The total implementation time of 4-5 days includes testing and documentation, ensuring a thorough and sustainable solution.

The key to success is maintaining a working system throughout the migration, with clear rollback points and comprehensive testing at each phase. By following this plan, the Specstar TUI codebase will be transformed from a system with multiple parallel implementations into a clean, maintainable architecture with single, well-documented solutions for each subsystem.

---

*Plan synthesized from 4 parallel strategy analyses*  
*Generated: 2025-09-10*  
*Implementation ready: Yes*