# Quickstart: Document Viewer Fix Validation

## Prerequisites
- Specstar TUI installed (`bun install`)
- Terminal with ANSI color support
- Sample markdown documents in project

## Quick Validation Steps

### 1. Start the Application
```bash
bun run dev
# or
./dist/specstar  # if built
```

### 2. Navigate to Plan View
- Press `P` to switch to Plan view
- Observe the document viewer on the right side

### 3. Verify Layout Filling
**Expected**: Document viewer should fill entire right column
- ✅ Viewer extends from top to bottom of content area
- ✅ No fixed height limitation (was 20 lines)
- ✅ Footer controls remain visible at bottom

### 4. Test Document Loading
- Use arrow keys to select different documents
- Press number keys `[1-3]` to switch categories

**Expected**:
- ✅ Documents load without errors
- ✅ Content displays immediately
- ✅ Title shows in header

### 5. Test Scrolling
- Select a long document (e.g., any agent template)
- Use vim keys to navigate:
  - `j/k` - scroll line by line
  - `u/d` - page up/down
  - `g/G` - top/bottom

**Expected**:
- ✅ Smooth scrolling through content
- ✅ Page indicator updates (e.g., "Page 1/5")
- ✅ Content doesn't overflow viewer bounds

### 6. Test Text Wrapping
- Select a document with long lines
- Observe text behavior at column edge

**Expected**:
- ✅ Long lines wrap within viewer width
- ✅ No horizontal scrolling needed
- ✅ Text remains readable

### 7. Test Error Handling
- Try to load a non-existent document (if possible)
- Or temporarily rename a document file

**Expected**:
- ✅ Error message displays clearly
- ✅ Error doesn't break layout
- ✅ Can recover by selecting valid document

### 8. Test Window Resize
- Resize terminal window while viewing document
- Make window narrower and wider

**Expected**:
- ✅ Viewer adjusts to new dimensions
- ✅ Content reflows appropriately
- ✅ Layout remains intact

## Debugger Usage (TypeScript)

### VSCode Setup
1. Ensure TypeScript extension installed
2. Open project in VSCode
3. Set breakpoints in `src/components/markdown-viewer.tsx`

### Debug Points
Key locations to inspect during debugging:
- Line 190: Content area Box component (flex properties)
- Line 126: getVisibleContent() method (viewport calculation)
- Line 105: useInput hook (scrolling logic)

### Watch Variables
Monitor these during execution:
- `scrollable` prop
- `renderedContent` array length
- Box component `flexGrow` property
- Container dimensions

## Running Tests

### Component Tests
```bash
bun test src/components/markdown-viewer.test.tsx
```

### Integration Tests
```bash
bun test tests/integration/plan-view.test.tsx
```

### All Tests
```bash
bun test
```

## Success Criteria Checklist

- [ ] Document viewer fills parent container height
- [ ] No fixed height=20 constraint
- [ ] Scrolling works with all navigation keys
- [ ] Text wraps properly at column boundaries
- [ ] Error states display without breaking layout
- [ ] Viewer responds to window resize
- [ ] All existing documents load successfully
- [ ] Performance remains smooth (<100ms render)

## Troubleshooting

### Issue: Viewer Still Small
- Check parent Box has `flexGrow={1}`
- Verify no `height` prop on content Box
- Ensure `flexDirection="column"` set

### Issue: Scrolling Broken
- Confirm `scrollable={true}` prop passed
- Check `scrollOffset` state updates
- Verify content array slicing logic

### Issue: Layout Overflow
- Ensure `overflow="hidden"` on container
- Check text wrap settings
- Verify maxWidth configuration

## Next Steps
If validation passes:
1. Commit changes with descriptive message
2. Create devlog entry documenting fix
3. Run full test suite
4. Merge to main branch

If issues found:
1. Document specific failure
2. Check implementation against SessionDashboard
3. Review flex properties in React Ink docs