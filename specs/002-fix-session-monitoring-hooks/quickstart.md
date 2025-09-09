# Quickstart: Session Monitoring and Hook Integration

## Prerequisites

- Bun runtime installed
- Specstar TUI built and installed
- Active Claude Code session

## Quick Setup

### 1. Initialize Specstar with Hooks

```bash
# From your project root
specstar --init

# This will:
# - Create .specstar/ directory structure
# - Generate hooks.ts file
# - Update .claude/settings.json with hook configuration
# - Create initial log files
```

### 2. Verify Hook Integration

```bash
# Check that hooks are registered
cat .claude/settings.json | grep -A 5 "hooks"

# You should see all 9 hooks configured
```

### 3. Start Claude Code Session

```bash
# Start a new Claude Code session in your project
claude

# The session_start hook will automatically:
# - Create .specstar/sessions/{session-id}/state.json
# - Log to .specstar/logs/session_start.json
```

## Testing Session Monitoring

### Test 1: Prompt Tracking

```bash
# In Claude Code, submit a prompt
> Help me create a new feature

# Check that it was tracked
cat .specstar/sessions/*/state.json | jq '.prompts'
# Should show your prompt with timestamp
```

### Test 2: Tool Usage Tracking

```bash
# In Claude Code, ask it to read a file
> Show me the contents of README.md

# Check tool usage
cat .specstar/sessions/*/state.json | jq '.tools_used'
# Should show: {"Read": 1}

# Check file tracking
cat .specstar/sessions/*/state.json | jq '.files.read'
# Should show: ["README.md"]
```

### Test 3: Agent Tracking

```bash
# In Claude Code, trigger an agent
> Use the web-search agent to find React Ink documentation

# Check active agents
cat .specstar/sessions/*/state.json | jq '.agents'
# Should show: ["web-search"] while running

# Check agent history
cat .specstar/sessions/*/state.json | jq '.agents_history'
# Should show start and completion times
```

## Using the Observe View

### 1. Launch Specstar TUI

```bash
# In a separate terminal
specstar

# Press 'o' to switch to Observe view
```

### 2. Monitor Real-time Updates

The Observe view displays:
- **Session Info**: ID, title, active status
- **Active Agents**: Currently running agents
- **Recent Files**: Last 5 files (new/edited/read)
- **Tool Usage**: Top 5 most used tools
- **Recent Errors**: Any errors encountered
- **Recent Prompts**: Last 3 user prompts

### 3. Navigation

- `↑↓` or `j/k`: Scroll through session details
- `r`: Refresh session data
- `p`: Switch to Plan view
- `q`: Quit

## Manual Hook Testing

### Test Individual Hooks

```bash
# Test session_start
echo '{"session_id":"test-123","source":"startup"}' | bun .specstar/hooks.ts session_start

# Test user_prompt_submit
echo '{"session_id":"test-123","prompt":"Test prompt"}' | bun .specstar/hooks.ts user_prompt_submit

# Test pre_tool_use
echo '{"session_id":"test-123","tool_name":"Read","tool_input":{"file_path":"test.md"}}' | bun .specstar/hooks.ts pre_tool_use

# Check the state file
cat .specstar/sessions/test-123/state.json | jq
```

## Verify All Components

### Complete Integration Test

1. **Start fresh session**:
   ```bash
   rm -rf .specstar/sessions/*
   claude
   ```

2. **Perform actions in Claude**:
   ```
   > Create a new file called test.ts
   > Edit the file to add a function
   > Read the file back
   > Use the Task tool to research something
   ```

3. **Check comprehensive tracking**:
   ```bash
   # Session state should show all operations
   cat .specstar/sessions/*/state.json | jq '{
     tools: .tools_used,
     files: .files,
     agents: .agents_history,
     prompts: .prompts | length,
     active: .session_active
   }'
   ```

4. **Verify logs**:
   ```bash
   # Each log file should have entries
   ls -la .specstar/logs/*.json
   wc -l .specstar/logs/*.json
   ```

## Troubleshooting

### Hooks Not Firing

```bash
# Check Claude settings
cat .claude/settings.json | jq '.hooks'

# Test hook directly
echo '{"session_id":"debug","source":"startup"}' | bun .specstar/hooks.ts session_start

# Check for errors
cat .specstar/logs/errors.json
```

### Session Not Updating

```bash
# Check file watcher
ps aux | grep specstar

# Verify session file exists
ls -la .specstar/sessions/*/state.json

# Check permissions
ls -la .specstar/
```

### Observe View Not Showing Data

```bash
# Ensure session is active
cat .specstar/sessions/*/state.json | jq '.session_active'

# Restart Specstar TUI
pkill specstar
specstar
```

## Expected Behavior

After setup, you should see:

1. **Automatic session tracking** - All Claude Code activities logged
2. **Real-time updates** - Observe view updates within 250ms
3. **Comprehensive state** - Complete session history in state.json
4. **Detailed logs** - Each hook creates timestamped log entries
5. **No Claude interruption** - Hooks run silently in background

## Performance Validation

```bash
# Measure hook execution time
time echo '{"session_id":"perf-test","source":"startup"}' | bun .specstar/hooks.ts session_start
# Should complete in < 50ms

# Check file sizes
du -h .specstar/sessions/*/state.json
# Should be < 100KB for typical session

# Monitor file watching
top -p $(pgrep specstar)
# CPU usage should be < 1% when idle
```

## Next Steps

1. Keep Claude Code session active
2. Monitor in Specstar TUI Observe view
3. Review session history in state.json
4. Analyze patterns in log files
5. Use data for debugging and insights

---

This quickstart validates that session monitoring and hook integration are working correctly with Claude Code.