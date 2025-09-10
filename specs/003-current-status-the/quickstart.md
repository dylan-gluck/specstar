# Quickstart: Bug Fixes Validation

**Feature**: Bug Fixes for Specstar TUI
**Date**: 2025-09-09

## Overview

This quickstart guide provides step-by-step instructions to validate that all five bugs have been successfully fixed in the Specstar TUI application.

## Prerequisites

1. Specstar TUI installed and initialized:
```bash
bun install
bun run build
specstar --init
```

2. Claude Code configured with Specstar hooks

## Bug Fix Validation

### 1. Session Active State Management

**Test Scenario**: Verify session_active is only modified by lifecycle hooks

```bash
# Start a Claude Code session
# Watch the session state file
watch -n 1 cat .specstar/sessions/*/state.json | jq .session_active

# Trigger various hooks (file operations, tool use, etc.)
# Verify session_active remains true

# End the Claude Code session
# Verify session_active changes to false only on session_end
```

**Expected Result**:
- ✅ session_active stays `true` during active session
- ✅ Only changes to `false` when session ends
- ✅ No premature state changes

### 2. Default Page Configuration

**Test Scenario**: Verify startPage setting works

```bash
# Test 1: Default behavior (no setting)
rm .specstar/settings.json
specstar
# Should open to help page

# Test 2: Set to plan
echo '{"startPage": "plan"}' > .specstar/settings.json
specstar
# Should open directly to plan view

# Test 3: Set to observe
echo '{"startPage": "observe"}' > .specstar/settings.json
specstar
# Should open directly to observe view
```

**Expected Result**:
- ✅ App respects startPage setting
- ✅ Defaults to help when not configured
- ✅ No auto-switching after 2 seconds

### 3. Configuration Settings

**Test Scenario**: Verify theme configuration and sessionPath removal

```bash
# Create test settings
cat > .specstar/settings.json << 'EOF'
{
  "startPage": "observe",
  "theme": {
    "bg": "black",
    "fg": "white",
    "fgAccent": "green"
  }
}
EOF

# Run Specstar
specstar

# Try to add sessionPath (should be ignored)
cat > .specstar/settings.json << 'EOF'
{
  "sessionPath": "/custom/path",
  "startPage": "observe"
}
EOF

specstar
# Should still use .specstar/sessions
```

**Expected Result**:
- ✅ Theme object applies colors correctly
- ✅ sessionPath is ignored if present
- ✅ Sessions always stored in .specstar/sessions

### 4. List Display Improvements

**Test Scenario**: Verify list styling and scrolling

```bash
# Start Specstar in observe view
specstar

# Navigate list with arrow keys
# Check highlighted items
```

**Visual Validation Checklist**:
- ✅ Selected items show green text (not green background)
- ✅ No emojis (📁 📄) in list items
- ✅ Long lists scroll within viewport
- ✅ No overflow beyond box boundaries

### 5. Observe View Layout

**Test Scenario**: Verify two-column layout with session details

```bash
# Create multiple test sessions
for i in {1..5}; do
  mkdir -p .specstar/sessions/test-session-$i
  cat > .specstar/sessions/test-session-$i/state.json << EOF
{
  "session_id": "test-session-$i",
  "session_title": "Test Session $i",
  "session_active": $([ $i -eq 1 ] && echo "true" || echo "false"),
  "agents": {
    "active": ["agent-1"],
    "completed": ["agent-2", "agent-3"]
  },
  "files": {
    "read": ["file1.ts", "file2.ts"],
    "edited": ["file3.ts"],
    "created": ["file4.ts"]
  },
  "tools": {
    "bash": 5,
    "read": 10,
    "write": 3
  }
}
EOF
done

# Open observe view
specstar
# Press 'o' to switch to observe view
```

**Layout Validation**:
- ✅ Left sidebar (30% width) shows session list
- ✅ Green dot (●) indicator next to active sessions
- ✅ Right panel (70% width) empty initially
- ✅ Press Enter on a session to show details
- ✅ Dashboard displays all session data:
  - Session ID and title
  - Active status with indicator
  - Agent statistics
  - File operation counts
  - Tool usage metrics

## Automated Test Suite

Run the automated test suite to validate all fixes:

```bash
# Run all tests
bun test

# Run specific test suites
bun test session-state
bun test settings
bun test ui-components
bun test observe-view
```

Expected output:
```
✓ Session state: session_active only modified by lifecycle hooks
✓ Settings: startPage configuration works
✓ Settings: theme object structure applied
✓ Settings: sessionPath not configurable
✓ UI: List items use green text for selection
✓ UI: No emojis in list items
✓ UI: Lists scroll within viewport
✓ Observe: Two-column layout rendered
✓ Observe: Session list with active indicators
✓ Observe: Dashboard shows session details

All tests passed!
```

## Manual Verification Checklist

Use this checklist to manually verify each bug fix:

### Bug 1: Session Active State
- [ ] Create new Claude Code session
- [ ] Verify session_active is true
- [ ] Perform various operations (read/write files, use tools)
- [ ] Verify session_active remains true
- [ ] End session
- [ ] Verify session_active becomes false

### Bug 2: Start Page Configuration
- [ ] Set startPage to "plan" in settings.json
- [ ] Launch Specstar - verify opens to plan view
- [ ] Set startPage to "observe"
- [ ] Launch Specstar - verify opens to observe view
- [ ] Remove startPage setting
- [ ] Launch Specstar - verify opens to help view

### Bug 3: Configuration Settings
- [ ] Configure theme with bg, fg, fgAccent
- [ ] Verify colors applied to UI
- [ ] Try to set sessionPath
- [ ] Verify it's ignored

### Bug 4: List Display
- [ ] Navigate any list view
- [ ] Verify selected items have green text only
- [ ] Verify no emojis appear
- [ ] Create long list (20+ items)
- [ ] Verify scrolling works

### Bug 5: Observe View
- [ ] Open observe view
- [ ] Verify left sidebar with session list
- [ ] Verify green dots for active sessions
- [ ] Select a session with Enter
- [ ] Verify dashboard shows all session details

## Troubleshooting

If any validation fails:

1. Check error logs:
```bash
cat .specstar/logs/error.log
```

2. Verify hook integration:
```bash
cat .specstar/hooks.ts | grep session_active
```

3. Check settings file:
```bash
cat .specstar/settings.json | jq .
```

4. Run diagnostic:
```bash
specstar --diagnose
```

## Success Criteria

All five bugs are considered fixed when:
1. All automated tests pass
2. All manual verification steps complete successfully
3. No regressions in existing functionality
4. Performance remains acceptable (<100ms UI response time)