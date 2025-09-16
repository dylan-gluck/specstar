# Research Results: Specstar TUI Implementation

## Executive Summary

Research confirms the project is already scaffolded with React Ink v6.3.0 as the TUI framework, Bun as the runtime, and TypeScript for type safety. The Plan view is partially implemented with focus management and layout structure. Key technical decisions have been made and initial implementation has begun.

## Technical Decisions

### 1. TUI Framework Selection

**Decision**: React Ink v6.3.0 with fullscreen-ink
**Rationale**: 
- Already implemented and working in the codebase
- Provides React component model for terminal UI
- Excellent keyboard navigation support via useFocus hooks
- Real-time updates through React state management
- Active maintenance and community support

**Alternatives Considered**:
- blessed: More traditional but less modern development experience
- Raw terminal control: Too low-level for rapid development
- Other frameworks: Ink provides best React ecosystem integration

### 2. Runtime Environment

**Decision**: Bun (not Node.js)
**Rationale**:
- Project CLAUDE.md explicitly requires Bun usage
- Built-in TypeScript support without transpilation step
- Fast compilation with `bun build --compile`
- Native test runner with `bun test`
- Automatic .env loading

**Alternatives Considered**:
- Node.js: Rejected per project requirements
- Deno: Not considered due to Bun preference

### 3. Project Architecture

**Decision**: Library-based architecture with 5 core libraries
**Rationale**:
- Follows constitutional requirement for library-first design
- Clean separation of concerns
- Each library independently testable
- CLI interface per library requirement

**Libraries Identified**:
1. `tui-renderer`: Terminal UI rendering and navigation (partially built)
2. `session-monitor`: Session JSON file watching (not built)
3. `document-viewer`: Markdown loading and rendering (stub exists)
4. `hook-integrator`: Claude Code lifecycle hooks (not built)
5. `config-manager`: Settings and initialization (not built)

### 4. State Management

**Decision**: File-based JSON state with file system watching
**Rationale**:
- Simple and debuggable
- No database dependencies
- Easy integration with Claude Code hooks
- Direct file system access for real-time updates

**Storage Locations**:
- `.specstar/sessions/{id}/state.json` - Session state
- `.specstar/settings.json` - Configuration
- `.specstar/logs/` - Structured logging

### 5. Component Architecture

**Decision**: Page View Pattern with Focus Management
**Rationale**:
- Already implemented in app.tsx
- Clear separation between Plan and Observe views
- Global keyboard navigation (p/o/q keys)
- Focus management via React Ink's useFocus hook

**Current Implementation**:
- App → PlanView → (FileList × 3, MarkdownViewer)
- FocusBox component for keyboard focus
- Number keys (1-3) for panel switching

### 6. Testing Strategy

**Decision**: Bun test with ink-testing-library
**Rationale**:
- ink-testing-library v4.0.0 already installed
- Bun test provides fast execution
- TDD approach per constitution requirements

**Test Order** (per constitution):
1. Contract tests (CLI interfaces)
2. Integration tests (file system, hooks)
3. E2E tests (full TUI interaction)
4. Unit tests (component logic)

### 7. Hook Integration Architecture

**Decision**: TypeScript hook script with 9 event handlers
**Rationale**:
- Comprehensive spec in docs/specstar-hooks.md
- Handles all Claude Code lifecycle events
- Updates session state atomically
- Provides error recovery and logging

**Events Covered**:
- SessionStart/End
- UserPromptSubmit
- PreToolUse/PostToolUse
- Notification
- PreCompact
- Stop/SubagentStop

### 8. Build and Distribution

**Decision**: Single compiled binary via Bun
**Rationale**:
- Simple distribution (one file)
- No runtime dependencies
- Fast startup time
- Already configured in package.json

**Build Command**: `bun build --compile --outfile=dist/specstar src/cli.tsx`

## Implementation Gaps Identified

### High Priority (Core Functionality)
1. **Dynamic File Loading**: FileList components use hardcoded data
2. **Document Rendering**: MarkdownViewer shows placeholder content
3. **Settings Management**: No .specstar/settings.json loading
4. **Initialization Command**: --init flag not implemented

### Medium Priority (Integration)
1. **ObserveView**: Commented out, needs implementation
2. **Hook Script**: Specified but not generated
3. **Session Monitoring**: No file watching for state changes
4. **Claude Code Integration**: Hook configuration not automated

### Low Priority (Polish)
1. **Error Handling**: Basic error boundaries needed
2. **Logging System**: Structured logging to files
3. **Performance**: File watching optimization
4. **Documentation**: User guide updates

## Best Practices Research

### React Ink Patterns
- Use `useFocus()` for keyboard navigation
- Implement `useInput()` for global keybinds
- Leverage `Box` with flexbox for layouts
- Use `Text` with color props for styling

### File System Watching
- Use Bun's native file watching APIs
- Debounce rapid changes (100ms recommended)
- Handle file deletion gracefully
- Use atomic writes for state updates

### TUI Design Guidelines
- Keep UI responsive (<100ms updates)
- Provide visual feedback for all actions
- Support standard terminal shortcuts (Ctrl+C)
- Handle terminal resize events

### Error Recovery
- Graceful degradation when files missing
- Clear error messages in UI
- Automatic retry for transient failures
- Preserve user context on errors

## Recommended Next Steps

1. Complete Phase 1 design artifacts based on existing implementation
2. Focus on filling implementation gaps in priority order
3. Write contract tests for CLI interfaces first
4. Implement missing core libraries (session-monitor, config-manager)
5. Add file system integration to existing components

## Conclusion

The project has a solid foundation with React Ink TUI framework, clear architecture, and partial implementation. Technical decisions align with constitutional requirements. Main focus should be on completing the dynamic data loading and integration features while maintaining the clean library-based architecture.