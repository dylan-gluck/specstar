# Research Document: Fix Session Monitoring and Hook Integration

## Executive Summary

This document consolidates research findings for implementing session monitoring and hook integration fixes in Specstar TUI. All technical decisions are based on the comprehensive specification in docs/specstar-hooks.md and the existing codebase analysis.

## Research Findings

### 1. Claude Code Hook System

**Decision**: Use Bun runtime with TypeScript for hook implementation  
**Rationale**: 
- Claude Code supports command-type hooks that execute shell commands
- Bun provides fast TypeScript execution without compilation step
- Native JSON parsing and file operations in Bun are optimized

**Alternatives considered**:
- Node.js with ts-node: Slower startup time
- Compiled JavaScript: Adds build step complexity

**Environment Variables Available**:
- `$CLAUDE_PROJECT_DIR`: Project root directory
- Hook receives JSON input via stdin
- Must exit with code 0 (success) or 2 (block operation)

### 2. Session State Structure

**Decision**: Adopt exact structure from docs/specstar-hooks.md  
**Rationale**: Specification provides comprehensive field definitions matching Claude Code's actual output

**Actual Structure** (from specification):
```typescript
interface SessionData {
  session_id: string;
  session_title: string;
  session_active: boolean;
  created_at: string;  // ISO8601
  updated_at: string;  // ISO8601
  agents: string[];
  agents_history: Array<{
    name: string;
    started_at: string;
    completed_at?: string;
  }>;
  files: {
    new: string[];
    edited: string[];
    read: string[];
  };
  tools_used: Record<string, number>;
  errors: Array<{
    timestamp: string;
    type: string;
    message: string;
    context?: any;
  }>;
  prompts: Array<{
    timestamp: string;
    prompt: string;
  }>;
  notifications: Array<{
    timestamp: string;
    message: string;
  }>;
}
```

**Current Issues Fixed**:
- Remove incorrect fields: `commands`, `id`, `timestamp`, `status`
- Add missing fields: `session_title`, `agents_history`, `notifications`
- Correct field names: `session_id` not `id`, `created_at` not `timestamp`

### 3. Atomic File Operations in Bun

**Decision**: Write to temp file then rename  
**Rationale**: 
- Rename is atomic on POSIX systems
- Prevents partial writes from corrupting state
- Bun.write() supports this pattern natively

**Implementation Pattern**:
```typescript
async function atomicWrite(filepath: string, data: any): Promise<void> {
  const tempPath = `${filepath}.tmp`;
  await Bun.write(tempPath, JSON.stringify(data, null, 2));
  await rename(tempPath, filepath);  // Atomic operation
}
```

**Alternatives considered**:
- File locking: Not portable across platforms
- Write with sync: Still not atomic, can corrupt on crash

### 4. File Watching with Debouncing

**Decision**: Use Node.js fs.watch with 250ms debounce  
**Rationale**:
- fs.watch is native and efficient
- 250ms prevents multiple rapid updates while maintaining responsiveness
- Content comparison prevents duplicate processing

**Implementation Pattern**:
```typescript
class FileWatcher {
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private lastContent = new Map<string, string>();
  
  watch(path: string, callback: (file: string) => void) {
    fs.watch(path, { recursive: true }, (event, filename) => {
      if (!filename?.endsWith('state.json')) return;
      
      const fullPath = join(path, filename);
      this.debounce(fullPath, () => {
        const content = readFileSync(fullPath, 'utf-8');
        if (this.lastContent.get(fullPath) !== content) {
          this.lastContent.set(fullPath, content);
          callback(fullPath);
        }
      });
    });
  }
  
  private debounce(key: string, fn: () => void, delay = 250) {
    clearTimeout(this.debounceTimers.get(key));
    this.debounceTimers.set(key, setTimeout(fn, delay));
  }
}
```

### 5. React Ink Real-time Updates

**Decision**: Use React hooks with EventEmitter pattern  
**Rationale**:
- React Ink supports standard React patterns
- EventEmitter allows decoupled updates
- useSyncExternalStore for external data synchronization

**Implementation Pattern**:
```typescript
function useSessionMonitor() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  
  useEffect(() => {
    const monitor = SessionMonitor.getInstance();
    
    const handleUpdate = (session: SessionData) => {
      setSessions(prev => {
        const index = prev.findIndex(s => s.session_id === session.session_id);
        if (index >= 0) {
          const next = [...prev];
          next[index] = session;
          return next;
        }
        return [...prev, session];
      });
    };
    
    monitor.on('session-update', handleUpdate);
    return () => monitor.off('session-update', handleUpdate);
  }, []);
  
  return sessions;
}
```

### 6. Hook Script Generation

**Decision**: Generate single TypeScript file with command routing  
**Rationale**:
- Single file simplifies distribution and updates
- TypeScript provides type safety for hook contracts
- Command-line argument determines which hook to execute

**Structure**:
```typescript
#!/usr/bin/env bun

const command = process.argv[2];
const input = await Bun.stdin.json();

switch(command) {
  case 'session_start':
    await handleSessionStart(input);
    break;
  // ... other cases
}
```

### 7. Claude Settings Integration

**Decision**: Modify .claude/settings.json programmatically  
**Rationale**:
- Preserves user's existing settings
- Backup prevents data loss
- JSON manipulation is safer than text replacement

**Implementation**:
```typescript
async function updateClaudeSettings() {
  const settingsPath = '.claude/settings.json';
  const backupPath = '.claude/settings.json.backup';
  
  // Backup existing
  if (await exists(settingsPath)) {
    await Bun.write(backupPath, await Bun.file(settingsPath).text());
  }
  
  // Load or create
  const settings = await exists(settingsPath) 
    ? JSON.parse(await Bun.file(settingsPath).text())
    : {};
  
  // Merge hooks
  settings.hooks = { ...hookConfiguration, ...settings.hooks };
  
  // Write back
  await Bun.write(settingsPath, JSON.stringify(settings, null, 2));
}
```

### 8. Error Handling Strategy

**Decision**: Graceful degradation with detailed logging  
**Rationale**:
- Hooks should not crash Claude Code
- Detailed logs help debugging
- Exit code 0 allows operation to continue despite errors

**Pattern**:
```typescript
async function hookHandler(input: any): Promise<void> {
  try {
    // Main logic
  } catch (error) {
    await logError({
      timestamp: new Date().toISOString(),
      hook: 'hook_name',
      error: error.message,
      stack: error.stack,
      input
    });
    // Exit 0 to not block Claude Code
    process.exit(0);
  }
}
```

## Technical Decisions Summary

| Area | Decision | Key Benefit |
|------|----------|-------------|
| Runtime | Bun with TypeScript | Fast execution, no build step |
| State Structure | Exact spec from docs/specstar-hooks.md | Compatibility with Claude Code |
| File Operations | Atomic write via rename | Data integrity |
| File Watching | fs.watch with 250ms debounce | Efficient and responsive |
| UI Updates | React hooks + EventEmitter | Decoupled, reactive |
| Hook Generation | Single TypeScript file | Simple distribution |
| Settings Update | Programmatic JSON merge | Preserves user config |
| Error Handling | Graceful degradation | Reliability |

## Implementation Priority

1. **Fix SessionData interface** - Critical for all other features
2. **Generate hooks.ts** - Enables Claude Code integration
3. **Update config-manager** - Automates setup
4. **Fix session-monitor** - Core functionality
5. **Implement ObserveView** - User-facing feature

## Risk Mitigation

**Risk**: Claude Code API changes  
**Mitigation**: Version check in hooks, graceful field handling

**Risk**: Concurrent file access  
**Mitigation**: Atomic writes, content comparison

**Risk**: Large session files  
**Mitigation**: Streaming JSON parsing planned for future

## Validation Approach

- Contract tests for each hook handler
- Integration tests with real file system
- Manual testing with active Claude Code session
- Performance benchmarks for file watching

---

All technical decisions resolved. Ready for Phase 1 design.