# Research Findings: Bug Fixes for Specstar TUI

**Date**: 2025-09-09
**Feature**: Bug Fixes for Specstar TUI (003-current-status-the)

## Executive Summary

Research completed for five documented bugs in the Specstar TUI application. All technical decisions have been made based on existing codebase analysis and requirements from the specification. The implementation will follow TDD principles using the existing Bun test framework with ink-testing-library.

## Bug Analysis & Technical Decisions

### 1. Session Active State Management

**Current Issue**:
- `session_active` is being set to false prematurely by hooks other than `session_end`
- Found in `.specstar/hooks.ts` where multiple hooks incorrectly modify this state

**Decision**: Restrict `session_active` updates to only `session_start` (true) and `session_end` (false)
**Rationale**: Clear separation of concerns - only session lifecycle hooks should control session state
**Alternatives considered**: State machine pattern - rejected as overly complex for two-state system

**Implementation Location**:
- `.specstar/hooks.ts:397` - Already correct in `handleSessionEnd`
- Need to audit all other hook handlers to ensure they don't modify `session_active`

### 2. Default Page Configuration

**Current Issue**:
- App always opens to "welcome" view then auto-switches to "plan" after 2 seconds
- No user-configurable startPage setting exists

**Decision**: Add `startPage` setting to Settings model with values: "plan" | "observe" | "help"
**Rationale**: User preference should control initial view
**Alternatives considered**: Command-line flag - rejected as settings should persist

**Implementation Locations**:
- `src/models/settings.ts` - Add startPage property
- `src/app.tsx:54-58` - Replace hardcoded logic with settings-based initialization

### 3. Configuration Settings

**Current Issues**:
- `sessionPath` is configurable but shouldn't be (breaks Claude Code integration)
- Theme is a simple string instead of structured object

**Decision**:
- Remove `sessionPath` from user-configurable settings
- Implement full ThemeSettings interface with bg, fg, fgAccent properties

**Rationale**:
- sessionPath must remain consistent for hook integration
- Theme needs structure for proper UI customization

**Implementation Locations**:
- `src/models/settings.ts:36` - Remove sessionPath from interface
- Theme structure already exists at `src/models/settings.ts:6-13`, needs integration

### 4. List Display Improvements

**Current Issues**:
- Green background highlighting instead of green text
- Emojis (📁 📄) in file lists
- Lists overflow instead of scrolling

**Decision**:
- Change highlighting to green text only
- Remove all emojis from lists
- Implement proper scrolling with viewport constraints

**Rationale**:
- Better terminal compatibility and readability
- Cleaner, more professional UI

**Implementation Locations**:
- `src/components/file-list.tsx:121-122` - Change backgroundColor to text color
- `src/components/file-list.tsx:118` - Remove emoji logic
- Scrolling already partially implemented, needs viewport constraints

### 5. Observe View Refactor

**Current Issue**:
- Missing left sidebar with session list
- No green dot indicator for active sessions
- Session details not in dashboard layout

**Decision**: Implement two-column layout with session list (left) and details dashboard (right)
**Rationale**: Better information hierarchy and navigation
**Alternatives considered**: Tabs - rejected as less efficient for session monitoring

**Implementation Locations**:
- `src/views/observe-view.tsx` - Major refactor needed
- Add SessionList component with active indicators
- Enhance session details display with dashboard layout

## Technical Stack Confirmation

- **Runtime**: Bun (latest)
- **UI Framework**: React Ink v6.3.0
- **Testing**: Bun test with ink-testing-library
- **Language**: TypeScript 5.x with React JSX
- **State Management**: React hooks (useState, useEffect)
- **File System**: Node.js fs module with Bun optimizations

## Testing Strategy

Following TDD principles with test-first approach:

1. **Contract Tests**: Hook interfaces and session state contracts
2. **Integration Tests**: Settings loading, theme application, session monitoring
3. **E2E Tests**: Full TUI interaction flows for each bug fix
4. **Unit Tests**: Individual component behavior

## Dependencies Analysis

No new dependencies required. All fixes use existing packages:
- react: ^19.0.0
- ink: ^6.3.0
- @inkjs/ui: ^2.0.0
- ink-testing-library: ^4.0.0

## Performance Considerations

- Session list rendering: Virtualization not needed (typically <100 sessions)
- File watching: Already optimized with debouncing
- State updates: Atomic writes already implemented

## Risk Assessment

**Low Risk**:
- All changes are bug fixes, not new features
- Existing test coverage provides safety net
- Changes are isolated to specific components

**Mitigation**:
- Follow TDD strictly
- Test each fix in isolation before integration
- Maintain backward compatibility with existing session data

## Implementation Order

Recommended order based on dependencies:
1. Session active state fix (foundation)
2. Configuration settings (affects app initialization)
3. List display improvements (isolated UI changes)
4. Start page configuration (depends on settings)
5. Observe view refactor (most complex, builds on other fixes)

## Conclusion

All technical unknowns have been resolved. The existing codebase structure supports all required fixes without architectural changes. Implementation can proceed with Phase 1 design.
