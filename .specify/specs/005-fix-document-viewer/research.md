# Research: Fix Document Viewer Layout

## Codebase Analysis Summary

### Current Implementation Issues
Based on deep analysis of the codebase, the primary issue is in `/src/components/markdown-viewer.tsx:190`:

```tsx
// PROBLEMATIC - Fixed height prevents proper filling
<Box
  flexDirection="column"
  height={scrollable ? 20 : undefined}  // <- Fixed height!
  overflow="hidden"
  marginTop={1}
>
```

### Working Pattern from Session Dashboard
The session dashboard (`/src/components/session-dashboard.tsx`) uses this pattern successfully:

```tsx
// CORRECT - Flexible height that fills available space
<Box
  flexDirection="column"
  flexGrow={1}  // <- Fills parent container
  overflow="hidden"
>
```

## Technology Decisions

### Decision: React Ink Flex Layout
- **Choice**: Use React Ink's built-in flexbox properties
- **Rationale**: Already working in SessionDashboard, no new dependencies
- **Alternatives rejected**: 
  - Custom layout system - adds unnecessary complexity
  - Fixed positioning - breaks terminal responsiveness

### Decision: Maintain Existing Architecture
- **Choice**: Refactor MarkdownViewer component only
- **Rationale**: Minimal change, preserves separation of concerns
- **Alternatives rejected**:
  - Complete rewrite - violates KISS principle
  - Merging components - breaks modularity

### Decision: Error Handling Strategy
- **Choice**: Keep existing try-catch with improved display
- **Rationale**: Already robust, just needs layout fix
- **Alternatives rejected**:
  - Error boundaries - already implemented at app level
  - Complex recovery - adds unnecessary complexity

## Layout Pattern Analysis

### Key Flex Properties Required
1. **Root Container**: `flexGrow={1} flexDirection="column"`
2. **Content Area**: Remove `height={20}`, add `flexGrow={1}`
3. **Header/Footer**: No flex properties (fixed height)
4. **Overflow**: `overflow="hidden"` on scrollable container

### Text Wrapping Strategy
- Use `wrap="truncate-end"` for main content
- Maintain existing wrapping logic in DocumentViewer
- No changes to the underlying text processing

## Test Infrastructure
- **Existing**: Bun test with ink-testing-library
- **Required**: Add layout validation tests
- **Approach**: Test component renders with proper flex properties

## Implementation Approach
1. Apply flex pattern to MarkdownViewer
2. Remove fixed height constraint
3. Ensure parent container passes flex properties
4. Validate with existing documents
5. Add component tests for layout

## Risk Assessment
- **Low Risk**: Changes isolated to single component
- **Mitigation**: Existing tests will catch regressions
- **Rollback**: Simple revert if issues arise

## Performance Considerations
- No performance impact expected
- Flex layout is native to React Ink
- Scrolling performance unchanged

## Compatibility
- Compatible with all terminal emulators
- Works with existing window resize handling
- Maintains vim-like navigation keys