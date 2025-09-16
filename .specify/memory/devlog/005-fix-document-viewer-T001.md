# Task T001: Fix Document Viewer Layout

## Date: 2025-09-11

## Problem
The MarkdownViewer component had a fixed height constraint of 20 lines when scrollable was enabled, which prevented it from filling the available space in its parent container.

## Solution
Removed the fixed `height={scrollable ? 20 : undefined}` property and replaced it with `flexGrow={1}` to allow the component to fill the available space in its parent container.

## Changes Made

### Component Update
- **File**: `/src/components/markdown-viewer.tsx`
- **Line**: 190
- **Change**: Replaced `height={scrollable ? 20 : undefined}` with `flexGrow={1}`

### Before
```tsx
<Box
  flexDirection="column"
  height={scrollable ? 20 : undefined}
  overflow="hidden"
  marginTop={1}
>
```

### After
```tsx
<Box
  flexDirection="column"
  flexGrow={1}
  overflow="hidden"
  marginTop={1}
>
```

## Testing
Created unit tests in `/tests/unit/markdown-viewer.test.tsx` to verify:
1. Component renders with flexGrow property
2. No fixed height is applied when scrollable=true
3. Viewer fills available space in parent container
4. FlexGrow is applied to content area
5. Scrollable false does not apply fixed height

All tests pass successfully.

## Impact
This fix allows the MarkdownViewer to properly adapt to its container's dimensions, enabling better layout flexibility in the TUI application. The component now uses the flex pattern consistently throughout the application.