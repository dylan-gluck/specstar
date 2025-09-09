# Fix Session Monitoring and Hook Integration - Feature Specification

## Feature Name
Fix Session Monitoring and Hook Integration

## Feature ID
002-fix-session-monitoring-hooks

## Summary
Fix the session monitoring system and hook integration in Specstar TUI to properly track Claude Code sessions and implement all 9 lifecycle hooks as specified in docs/specstar-hooks.md.

## Problem Statement

### Current Issues
1. **Data Model Inconsistency**: The SessionMonitor expects different field names than the actual session structure
   - Monitor expects: `session_id`, `created_at`, `session_active`
   - Interface defines: `id`, `timestamp`, `status`
   - Actual `.specstar/sessions/*/state.json` structure doesn't match either

2. **Undefined Variables**: Session monitoring code references non-existent fields
   - `newSession.commands` field doesn't exist in SessionData interface
   - Code will never execute correctly

3. **Incomplete Hook Integration**: 
   - Hook system not fully implemented
   - Missing actual hook script file generation
   - No Claude Code settings.json integration

4. **Observe View Not Implemented**: The session monitoring UI is just a placeholder

## User Stories

### As a developer
- I want Specstar to accurately track my Claude Code session state
- I want to see real-time updates of files being edited, tools being used, and agents running
- I want hooks to automatically capture all Claude Code lifecycle events

### As a Claude Code user
- I want my sessions to be tracked automatically without manual intervention
- I want to be able to observe my current session status in the TUI
- I want comprehensive logging of all session activities

## Functional Requirements

### Session State Management
1. Implement proper SessionData interface matching actual Claude Code output
2. Create and maintain `.specstar/sessions/{session-id}/state.json` files
3. Track all session activities as specified in docs/specstar-hooks.md:
   - Active agents and agent history
   - File operations (new, edited, read)
   - Tool usage counts
   - User prompts
   - Errors and notifications

### Hook Implementation
1. Generate `.specstar/hooks.ts` file with all 9 lifecycle hooks:
   - session_start, session_end
   - user_prompt_submit
   - pre_tool_use, post_tool_use
   - notification, pre_compact
   - stop, subagent_stop

2. Integrate with Claude Code by updating `.claude/settings.json`

3. Implement atomic file operations for state updates

### Session Monitor Fixes
1. Fix data model to match actual session structure
2. Implement proper file watching with debouncing
3. Process session changes and emit appropriate events
4. Handle concurrent sessions properly

### Observe View Implementation
1. Create functional ObserveView component
2. Display real-time session information:
   - Active session ID and status
   - Currently running agents
   - Recent file operations
   - Tool usage statistics
   - Error messages

## Non-Functional Requirements

### Performance
- File watching should use debouncing (250ms default)
- State updates must be atomic to prevent corruption
- Hook execution should not block Claude Code operations

### Reliability
- Graceful handling of missing session files
- Recovery from malformed JSON
- Error isolation in hook execution

### Compatibility
- Support Bun runtime for hook scripts
- Work with Claude Code's hook system
- Handle different session termination scenarios

## Technical Constraints

### Dependencies
- Must use Bun runtime for hooks
- React Ink for TUI components
- Node.js fs.watch for file monitoring

### File Structure
```
.specstar/
├── sessions/
│   └── {session-id}/
│       └── state.json
├── logs/
│   ├── session_start.json
│   ├── user_prompt_submit.json
│   ├── pre_tool_use.json
│   ├── post_tool_use.json
│   ├── notification.json
│   ├── pre_compact.json
│   ├── session_end.json
│   ├── stop.json
│   └── subagent_stop.json
└── hooks.ts
```

## Success Criteria

### Acceptance Tests
1. Running `specstar --init` creates hooks.ts and updates Claude settings
2. Session state is accurately tracked during Claude Code sessions
3. Observe view shows real-time session information
4. All 9 hooks execute properly and update state
5. Logs are created and maintained correctly

### Metrics
- 100% of Claude Code events captured
- Zero data corruption in state files
- Sub-second UI updates for session changes

## Dependencies

### Internal
- TUI Renderer library
- Config Manager library
- Logger library

### External
- Claude Code hook system
- Bun runtime
- React Ink v6.3.0

## Risks and Mitigations

### Risk: Claude Code API changes
**Mitigation**: Version-specific hook implementations, graceful degradation

### Risk: File system race conditions
**Mitigation**: Atomic writes, file locking, debouncing

### Risk: Large session files
**Mitigation**: Streaming JSON parsing, log rotation

## Implementation Notes

Based on the comprehensive specification in docs/specstar-hooks.md, the implementation should:

1. Generate a TypeScript hooks file that handles all 9 Claude Code events
2. Update the SessionData interface to match the exact structure specified
3. Implement the state management module with atomic operations
4. Create proper file watching with content comparison
5. Build the ObserveView component with real-time updates

The hooks should follow the exact JSON schemas provided and implement the state transitions as documented in the appendix examples.

## References
- docs/specstar-hooks.md - Complete hook specification
- src/lib/session-monitor/index.ts - Current implementation
- src/lib/hook-integrator/index.ts - Hook integration system