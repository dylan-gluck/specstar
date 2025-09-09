# Quickstart: Specstar TUI

## Installation

### Global Installation (Recommended)

```bash
# Clone and build
git clone https://github.com/yourusername/specstar.git
cd specstar
bun install
bun run build

# Install globally
bun link

# Verify installation
specstar --version
```

### Local Development

```bash
# Clone repository
git clone https://github.com/yourusername/specstar.git
cd specstar

# Install dependencies
bun install

# Run in development mode
bun run dev
```

## Quick Setup

### 1. Initialize in Your Project

Navigate to your project directory and initialize specstar:

```bash
cd your-project
specstar --init
```

This creates the `.specstar/` directory structure:
```
.specstar/
├── settings.json    # Configuration
├── sessions/        # Session data
├── logs/           # Application logs
└── hooks.ts        # Claude Code hooks
```

### 2. Configure Claude Code Integration

The initialization automatically updates your `.claude/settings.json` with hook configuration:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "command": "bun run $CLAUDE_PROJECT_DIR/.specstar/hooks.ts session_start",
            "type": "command"
          }
        ]
      }
    ],
    "SessionEnd": [
      {
        "hooks": [
          {
            "command": "bun run $CLAUDE_PROJECT_DIR/.specstar/hooks.ts session_end",
            "type": "command"
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "command": "bun run $CLAUDE_PROJECT_DIR/.specstar/hooks.ts user_prompt_submit",
            "type": "command"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "hooks": [
          {
            "command": "bun run $CLAUDE_PROJECT_DIR/.specstar/hooks.ts pre_tool_use",
            "type": "command"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "hooks": [
          {
            "command": "bun run $CLAUDE_PROJECT_DIR/.specstar/hooks.ts post_tool_use",
            "type": "command"
          }
        ]
      }
    ],
    "Notification": [
      {
        "hooks": [
          {
            "command": "bun run $CLAUDE_PROJECT_DIR/.specstar/hooks.ts notification",
            "type": "command"
          }
        ]
      }
    ],
    "PreCompact": [
      {
        "hooks": [
          {
            "command": "bun run $CLAUDE_PROJECT_DIR/.specstar/hooks.ts pre_compact",
            "type": "command"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "command": "bun run $CLAUDE_PROJECT_DIR/.specstar/hooks.ts stop",
            "type": "command"
          }
        ]
      }
    ],
    "SubagentStop": [
      {
        "hooks": [
          {
            "command": "bun run $CLAUDE_PROJECT_DIR/.specstar/hooks.ts subagent_stop",
            "type": "command"
          }
        ]
      }
    ]
  }
}
```

### 3. Customize Document Folders (Optional)

Edit `.specstar/settings.json` to configure which folders appear in Plan view:

```json
{
  "docs": [
    {
      "title": "Documentation",
      "path": "docs",
      "recursive": true
    },
    {
      "title": "Specifications",
      "path": "specs",
      "recursive": true,
      "glob": "**/*.md"
    },
    {
      "title": "Templates",
      "path": "templates",
      "recursive": false
    }
  ]
}
```

## Basic Usage

### Launch the TUI

```bash
specstar
```

### Navigation

#### Global Keys
- `p` - Switch to Plan view (document browser)
- `o` - Switch to Observe view (session monitor)
- `q` - Quit application
- `?` - Show help

#### Plan View Keys
- `1`, `2`, `3` - Focus document folder panels
- `↑`, `↓` - Navigate files in focused panel
- `Enter` - Open selected document
- `Tab` - Cycle focus between panels
- `/` - Search documents (if in panel)
- `Esc` - Clear selection

#### Observe View Keys
- `↑`, `↓` - Navigate sessions
- `Enter` - View session details
- `r` - Refresh session list
- `a` - Show only active sessions
- `h` - Show session history
- `Esc` - Return to session list

## Usage Scenarios

### Scenario 1: Planning a New Feature

1. Start specstar in your project:
   ```bash
   specstar
   ```

2. Press `p` to ensure you're in Plan view

3. Press `2` to focus the Specifications panel

4. Use arrow keys to navigate to your feature spec

5. Press `Enter` to view the specification

6. Press `1` to switch to Documentation panel

7. Review relevant documentation while planning

### Scenario 2: Monitoring Claude Code Session

1. Start Claude Code in your project:
   ```bash
   claude --task "implement feature X"
   ```

2. In another terminal, start specstar:
   ```bash
   specstar
   ```

3. Press `o` to switch to Observe view

4. See your active Claude Code session appear

5. Press `Enter` to view real-time session details:
   - Active agents and their tasks
   - Files being modified
   - Tools being used
   - Error tracking

6. Watch metrics update as Claude Code works

### Scenario 3: Reviewing Completed Sessions

1. Launch specstar:
   ```bash
   specstar
   ```

2. Press `o` for Observe view

3. Press `h` to show session history

4. Navigate to a completed session

5. Press `Enter` to review:
   - Total execution time
   - Files created/modified
   - Tools used frequency
   - Any errors encountered

## Validation Tests

### Test 1: Initialization

```bash
# In a test directory
mkdir test-project && cd test-project
specstar --init

# Verify structure
ls -la .specstar/
# Expected: settings.json, sessions/, logs/, hooks.ts

# Verify Claude Code integration
cat .claude/settings.json | grep hooks
# Expected: Hook configuration entries
```

### Test 2: Plan View Navigation

```bash
# Start specstar
specstar

# Test navigation:
# 1. Press 'p' - Should show Plan view
# 2. Press '1' - Should focus first folder
# 3. Press '↓' - Should select next file
# 4. Press 'Enter' - Should display document
# 5. Press 'q' - Should quit
```

### Test 3: Session Monitoring

```bash
# Terminal 1: Start a Claude Code session
claude --task "write hello world"

# Terminal 2: Start specstar
specstar

# Test monitoring:
# 1. Press 'o' - Should show Observe view
# 2. Should see active session
# 3. Press 'Enter' - Should show session details
# 4. Details should update in real-time
```

### Test 4: Document Rendering

```bash
# Create test markdown
echo "# Test Document\n\nThis is a test." > docs/test.md

# Start specstar
specstar

# Test rendering:
# 1. Press 'p' - Plan view
# 2. Press '1' - Focus docs folder
# 3. Navigate to test.md
# 4. Press 'Enter' - Should render markdown
```

## Troubleshooting

### Issue: "Command not found: specstar"

**Solution**: Ensure specstar is in your PATH:
```bash
# If installed globally
bun link

# Or use direct path
./dist/specstar
```

### Issue: "No sessions appearing in Observe view"

**Solution**: Verify hooks are configured:
```bash
# Check Claude Code settings
cat .claude/settings.json | grep hooks

# Test hook manually
echo '{"hook_event_name":"SessionStart","session_id":"test","source":"startup"}' | bun .specstar/hooks.ts session_start
```

### Issue: "Documents not showing in Plan view"

**Solution**: Check settings configuration:
```bash
# Verify paths exist
cat .specstar/settings.json

# Check folder permissions
ls -la docs/ specs/ templates/
```

### Issue: "TUI not responding to keyboard"

**Solution**: Ensure terminal supports raw mode:
```bash
# Reset terminal
reset

# Try with different terminal
TERM=xterm-256color specstar
```

## Next Steps

1. **Customize Settings**: Edit `.specstar/settings.json` for your workflow
2. **Add Document Folders**: Configure additional folders to monitor
3. **Review Sessions**: Use Observe view to analyze Claude Code patterns
4. **Integrate with CI**: Add specstar monitoring to your CI pipeline

## Getting Help

- Run `specstar --help` for command options
- Press `?` in the TUI for keyboard shortcuts
- Check logs at `.specstar/logs/app.log` for debugging
- Report issues at: https://github.com/yourusername/specstar/issues