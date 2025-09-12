# Tasks: Fix Document Viewer Layout and Rendering

**Feature**: Document Viewer Layout Fix  
**Branch**: `005-fix-document-viewer`  
**Dependencies**: TypeScript 5.3, React Ink v6.3.0, Bun test

## Constitutional Requirements
- Each task includes 80% implementation, 20% tests
- Each task ends with git commit AND devlog entry
- All implementation via spec-implementer agent
- Files must stay under 250 lines
- Code must be self-explanatory (no comments)
- Tests written AFTER implementation but BEFORE task completion

---

## Task T001: Fix MarkdownViewer Layout [CRITICAL]
**Agent**: spec-implementer  
**File**: `/src/components/markdown-viewer.tsx` (239 lines)  
**Dependencies**: None  
**Can Parallel**: No (single file)

### Implementation (80%)
1. Open `/src/components/markdown-viewer.tsx`
2. Locate line 190 - the problematic Box component with `height={scrollable ? 20 : undefined}`
3. Remove the `height` prop entirely
4. Add `flexGrow={1}` to the Box props to fill parent container
5. Ensure `flexDirection="column"` remains
6. Ensure `overflow="hidden"` remains for proper scrolling
7. Verify the parent Box (around line 159) has `flexGrow={1}` to pass down

**Specific change at line 190**:
```tsx
// FROM:
<Box
  flexDirection="column"
  height={scrollable ? 20 : undefined}
  overflow="hidden"
  marginTop={1}
>

// TO:
<Box
  flexDirection="column"
  flexGrow={1}
  overflow="hidden"
  marginTop={1}
>
```

### Testing (20%)
1. Create or update `/tests/unit/markdown-viewer.test.tsx`
2. Test that component renders with `flexGrow={1}` property
3. Test that no fixed height is applied when scrollable=true
4. Test that viewer fills available space in parent container
5. Run `bun test tests/unit/markdown-viewer.test.tsx`

### Completion
- Run `bun test` to ensure no regressions
- Commit: `git commit -m "fix(markdown-viewer): remove fixed height constraint and add flexGrow for proper layout"`
- Create devlog: `/memory/devlog/005-fix-document-viewer-T001.md`
  - Document the flex pattern change
  - Note removal of height=20 constraint
  - Record that pattern matches SessionDashboard

---

## Task T002: Validate Error State Layout
**Agent**: spec-implementer  
**File**: `/src/components/markdown-viewer.tsx`  
**Dependencies**: T001 completed  
**Can Parallel**: No (same file as T001)

### Implementation (80%)
1. Open `/src/components/markdown-viewer.tsx`
2. Locate error display around line 220
3. Ensure error message Box has proper flex properties:
   - Should not have fixed dimensions
   - Should respect parent's flexGrow
4. Verify error state doesn't break the layout
5. Ensure error Box is within the scrollable container

**Verify error display structure**:
```tsx
// Ensure error is displayed within the flex container
{error && (
  <Text color="red">
    Error: {error}
  </Text>
)}
```

### Testing (20%)
1. Update `/tests/unit/markdown-viewer.test.tsx`
2. Add test case for error state rendering
3. Test that error displays within viewer bounds
4. Test that layout remains intact with error
5. Mock a file load error and verify display

### Completion
- Run `bun test tests/unit/markdown-viewer.test.tsx`
- Commit: `git commit -m "fix(markdown-viewer): ensure error state respects flex layout"`
- Create devlog: `/memory/devlog/005-fix-document-viewer-T002.md`
  - Document error state validation
  - Note that errors display within bounds
  - Confirm layout stability

---

## Task T003: Integration Testing and Validation
**Agent**: spec-implementer  
**Files**: `/tests/integration/plan-view.test.tsx`  
**Dependencies**: T001, T002 completed  
**Can Parallel**: Yes [P] (different file)

### Implementation (80%)
1. Create or update `/tests/integration/plan-view.test.tsx`
2. Add integration test for document viewer in plan view
3. Test the complete flow:
   - Plan view renders
   - Document viewer fills right column (70% width)
   - Documents load and display
   - Scrolling works correctly
   - Layout responsive to content

### Testing (20%)
1. Run the integration test suite
2. Manually validate using quickstart.md checklist:
   - Start app with `bun run dev`
   - Navigate to Plan view (press P)
   - Verify viewer fills entire right column
   - Test scrolling with j/k/u/d/g/G keys
   - Verify no height=20 limitation
3. Run full test suite: `bun test`

### Completion
- Ensure all tests pass
- Commit: `git commit -m "test(plan-view): add integration tests for document viewer layout"`
- Create devlog: `/memory/devlog/005-fix-document-viewer-T003.md`
  - Document test coverage added
  - Note validation results
  - Record any edge cases found

---

## Task T004: Performance Validation [OPTIONAL]
**Agent**: spec-implementer  
**Files**: Various test files  
**Dependencies**: T001, T002, T003 completed  
**Can Parallel**: Yes [P] (testing only)

### Implementation (80%)
1. Create performance test in `/tests/performance/viewer-perf.test.tsx`
2. Measure render time with large documents
3. Verify <100ms render target
4. Test scroll performance
5. Validate memory usage stays constant

### Testing (20%)
1. Run performance tests
2. Document results
3. Compare before/after metrics

### Completion
- Run `bun test tests/performance/`
- Commit: `git commit -m "test(performance): validate document viewer render performance"`
- Create devlog: `/memory/devlog/005-fix-document-viewer-T004.md`
  - Record performance metrics
  - Note any improvements
  - Document baseline for future

---

## Execution Order

### Sequential Phase (must complete in order):
1. **T001** - Fix MarkdownViewer Layout (CRITICAL)
2. **T002** - Validate Error State Layout

### Parallel Phase (can run simultaneously):
3. **T003** [P] - Integration Testing and Validation
4. **T004** [P] - Performance Validation (OPTIONAL)

## Success Criteria
- [ ] Document viewer fills parent container
- [ ] No fixed height=20 constraint remains
- [ ] Error states display correctly
- [ ] All tests pass
- [ ] Performance targets met (<100ms)
- [ ] Each task has commit and devlog

## Notes
- Test infrastructure already configured (Bun test, ink-testing-library)
- TypeScript LSP already active for debugging
- Pre-commit hooks already configured
- Follow existing patterns from SessionDashboard component
- Maintain file under 250 lines (currently 239)