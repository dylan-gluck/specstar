# CLI Contracts: Specstar

## Main CLI

### specstar

Launch the TUI application in the current project directory.

```bash
specstar [options]
```

**Options:**
- `--version` - Display version and exit
- `--help` - Display help and exit
- `--init` - Initialize specstar in current project
- `--config <path>` - Use alternate config file

**Exit Codes:**
- `0` - Normal exit
- `1` - Initialization error
- `2` - Configuration error
- `3` - Runtime error

**Examples:**
```bash
specstar                    # Launch TUI
specstar --init            # Initialize project
specstar --version         # Show version
specstar --config custom.json  # Use custom config
```

## Library CLIs

Each library exposes its own CLI for testing and debugging.

### tui-renderer

```bash
tui-renderer [options]
```

**Options:**
- `--help` - Display help
- `--version` - Display version
- `--format <json|text>` - Output format
- `--demo` - Run demo mode
- `--test-layout <layout>` - Test specific layout

**Output (JSON format):**
```json
{
  "status": "running|stopped",
  "layout": "plan|observe",
  "focus": "component-id",
  "keystrokes": ["key1", "key2"]
}
```

### session-monitor

```bash
session-monitor [options] [session-id]
```

**Options:**
- `--help` - Display help
- `--version` - Display version
- `--format <json|text>` - Output format
- `--watch` - Watch for changes
- `--list` - List all sessions
- `--active` - List only active sessions

**Output (JSON format):**
```json
{
  "sessions": [
    {
      "session_id": "uuid",
      "session_title": "title",
      "session_active": true,
      "last_activity": "2025-01-01T00:00:00Z"
    }
  ]
}
```

### document-viewer

```bash
document-viewer [options] <file>
```

**Options:**
- `--help` - Display help
- `--version` - Display version
- `--format <json|text|html>` - Output format
- `--frontmatter` - Include frontmatter
- `--stats` - Include file statistics

**Output (JSON format):**
```json
{
  "path": "/path/to/file.md",
  "title": "Document Title",
  "content": "rendered content",
  "frontmatter": {},
  "stats": {
    "size": 1024,
    "modified": "2025-01-01T00:00:00Z"
  }
}
```

### hook-integrator

```bash
hook-integrator [options] <event-type>
```

**Options:**
- `--help` - Display help
- `--version` - Display version
- `--format <json|text>` - Output format
- `--test` - Test mode (don't write files)
- `--validate` - Validate hook configuration

**Event Types:**
- `SessionStart`
- `SessionEnd`
- `UserPromptSubmit`
- `PreToolUse`
- `PostToolUse`
- `Notification`
- `PreCompact`
- `Stop`
- `SubagentStop`

**Input (via stdin):**
```json
{
  "type": "event-type",
  "session_id": "uuid",
  "timestamp": "2025-01-01T00:00:00Z",
  "data": {}
}
```

**Output (JSON format):**
```json
{
  "status": "success|error",
  "session_updated": true,
  "state_file": "/path/to/state.json",
  "error": "error message if failed"
}
```

### config-manager

```bash
config-manager [options] [command]
```

**Commands:**
- `init` - Initialize configuration
- `get <key>` - Get configuration value
- `set <key> <value>` - Set configuration value
- `validate` - Validate configuration
- `migrate` - Migrate old configuration

**Options:**
- `--help` - Display help
- `--version` - Display version
- `--format <json|text>` - Output format
- `--config <path>` - Config file path

**Output (JSON format):**
```json
{
  "command": "init",
  "status": "success|error",
  "config_path": "/path/to/settings.json",
  "message": "Configuration initialized"
}
```

## Integration Contracts

### Initialization Flow

When `specstar --init` is executed:

1. Check if `.specstar/` exists
   - If yes: ERROR "Already initialized"
2. Create directory structure:
   ```
   .specstar/
   ├── settings.json
   ├── sessions/
   ├── logs/
   └── hooks.ts
   ```
3. Generate default `settings.json`
4. Create `hooks.ts` from template
5. Update `.claude/settings.json` with hook configuration
6. Output: SUCCESS "Initialized specstar in {path}"

### Hook Event Flow

When Claude Code triggers a hook:

1. Hook script receives event via command line args
2. Parse event type and data
3. Load or create session state file
4. Update state based on event type
5. Write updated state atomically
6. Log event to `events.jsonl`
7. Return success/error status

### Session State Updates

State updates follow these rules:

1. **SessionStart**: Create new state file
2. **SessionEnd**: Mark session inactive
3. **UserPromptSubmit**: Add to prompts array
4. **PreToolUse**: Increment tool counter
5. **PostToolUse**: Update file arrays if applicable
6. **Notification**: Add to notifications
7. **PreCompact**: Log compaction event
8. **Stop**: Mark session as stopped
9. **SubagentStop**: Update agent status

## Error Handling

### Standard Error Format

All CLIs return errors in consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {},
    "timestamp": "2025-01-01T00:00:00Z"
  }
}
```

### Error Codes

- `INIT_001` - Already initialized
- `INIT_002` - Cannot create directories
- `INIT_003` - Cannot write configuration
- `CONFIG_001` - Invalid configuration
- `CONFIG_002` - Missing required field
- `SESSION_001` - Session not found
- `SESSION_002` - Invalid session data
- `HOOK_001` - Invalid event type
- `HOOK_002` - Cannot update state
- `FILE_001` - File not found
- `FILE_002` - Cannot read file
- `FILE_003` - Cannot write file

## Testing Contracts

### Contract Test Structure

Each CLI must have contract tests that:

1. Verify command exists and is executable
2. Test `--help` output format
3. Test `--version` output format
4. Test `--format json` produces valid JSON
5. Test error cases produce correct error codes
6. Test success cases produce expected output

### Example Contract Test

```typescript
// tests/contract/cli-main.test.ts
import { test, expect } from "bun:test";
import { $ } from "bun";

test("specstar --help returns usage", async () => {
  const result = await $`specstar --help`.text();
  expect(result).toContain("Usage: specstar");
  expect(result).toContain("--init");
  expect(result).toContain("--version");
});

test("specstar --version returns version", async () => {
  const result = await $`specstar --version`.text();
  expect(result).toMatch(/^\d+\.\d+\.\d+$/);
});

test("specstar --init creates structure", async () => {
  // Test in temp directory
  const tmpDir = await $`mktemp -d`.text();
  process.chdir(tmpDir);
  
  const result = await $`specstar --init`.quiet();
  expect(result.exitCode).toBe(0);
  
  // Verify structure created
  expect(await $`test -d .specstar`.quiet().exitCode).toBe(0);
  expect(await $`test -f .specstar/settings.json`.quiet().exitCode).toBe(0);
});
```