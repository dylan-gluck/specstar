# Claude Code Hook Scripts and State Management System - Technical Specification

## Executive Summary

This specification defines a streamlined hook system for Claude Code that tracks session state and provides comprehensive logging capabilities. The primary responsibilities are session state tracking in `.specstar/sessions/{session-id}/state.json` and event logging in `.specstar/logs/`.

## System Architecture Overview

### Core Components

1. **Hook Scripts** - Event-driven scripts triggered by Claude Code lifecycle events
2. **State Management** - Centralized session state tracking system
3. **Logging System** - Comprehensive event and audit logging

### Directory Structure

```
.specstar/
├── sessions/
│   └── {session-id}/
│       └── state.json           # Session state tracking
└── logs/
    ├── session_start.json        # Session initialization events
    ├── user_prompt_submit.json   # User prompt events
    ├── pre_tool_use.json         # Tool invocation events
    ├── post_tool_use.json        # Tool completion events
    ├── notification.json          # Notification events
    ├── pre_compact.json          # Context compaction events
    ├── session_end.json           # Session ending events with reason
    ├── stop.json                 # Session termination events
    └── subagent_stop.json        # Sub-agent termination events
```

## Session State Schema

### state.json Structure

```json
{
	"session_id": "string", // Unique session identifier
	"session_title": "string", // Name of feature / epic / story
	"session_active": "boolean", // Whether session is currently active
	"created_at": "ISO8601", // Session creation timestamp
	"updated_at": "ISO8601", // Last modification timestamp
	"agents": ["string"], // Currently active agents
	"agents_history": [
		{
			// Historical agent invocations
			"name": "string",
			"started_at": "ISO8601",
			"completed_at": "ISO8601" // Optional, when agent completes
		}
	],
	"files": {
		"new": ["string"], // Files created during session
		"edited": ["string"], // Files modified during session
		"read": ["string"] // Files read during session
	},
	"tools_used": {
		"tool_name": "number" // Tool usage counts
	},
	"errors": [
		{
			// Error tracking
			"timestamp": "ISO8601",
			"type": "string",
			"message": "string",
			"context": {} // Optional error context
		}
	],
	"prompts": [
		{
			// User prompt history
			"timestamp": "ISO8601",
			"prompt": "string"
		}
	],
	"notifications": [
		{
			// Notification messages
			"timestamp": "ISO8601",
			"message": "string"
		}
	]
}
```

## Claude Code Hook Settings

**On `specstar --init`**
* Make a backup of `.claude/settings.json` if it exists.
* Append the following `"hooks"` object into the end of the JSON in `.claude/settings.json`.
* If claude settings file does not exist, create it with the following JSON.

```json
{
  "hooks": {
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
    ]
  }
}
```


## Hook Specifications

### 1. session_start Hook

**Purpose:** Initialize session state when a new Claude Code session begins.

**Input JSON:**
```json
{
  "session_id": "string",
  "source": "startup|resume|clear"  // Not stored in state
}
```

**Logic Flow:**
1. Create session directory `.specstar/sessions/{session-id}/` if not exists
2. Initialize `state.json` with default structure
3. Log event to `.specstar/logs/session_start.json`
4. Return success (exit code 0)

**State Operations:**
- Create new state file with initialized structure
- Set `created_at` and `updated_at` to current timestamp
- Set `session_active` to true

### 2. user_prompt_submit Hook

**Purpose:** Track user prompts and manage session data.

**Input JSON:**
```json
{
  "session_id": "string",
  "prompt": "string"
}
```

**Logic Flow:**
1. Load existing session state or initialize if missing
2. Append prompt to `prompts` array with timestamp
3. Update `updated_at` timestamp
4. Save state atomically (write to temp file, then rename)
5. Log event to `.specstar/logs/user_prompt_submit.json`
6. Return success or block with exit code 2 if validation fails

**State Operations:**
- Append to `prompts` array
- Update `updated_at`

### 3. pre_tool_use Hook

**Purpose:** Track tool invocations and manage agent lifecycle.

**Input JSON:**
```json
{
  "session_id": "string",
  "tool_name": "string",
  "tool_input": {}
}
```

**Logic Flow:**
1. Load session state
2. For `Task` tool:
   - Extract `subagent_type` from `tool_input`
   - Add to `agents` array if not present
   - Add entry to `agents_history` with `started_at`
3. Update `updated_at`
4. Save state atomically
5. Log event to `.specstar/logs/pre_tool_use.json`
6. Return success or block with exit code 2

**State Operations:**
- Manage `agents` array for Task tool
- Update `agents_history` for new agents

### 4. post_tool_use Hook

**Purpose:** Track tool completion and file operations.

**Input JSON:**
```json
{
  "session_id": "string",
  "tool_name": "string",
  "tool_input": {},
  "tool_response": {}
}
```

**Logic Flow:**
1. Load session state
2. Increment tool usage count in `tools_used`
3. Process based on tool type:
   - **Task tool:**
     - Remove `subagent_type` from `agents` array
     - Update `agents_history` entry with `completed_at`
   - **Write tool:**
     - Add `file_path` to `files.new` if not exists
   - **Edit/MultiEdit tools:**
     - Add `file_path` to `files.edited` if not exists
   - **Read tool:**
     - Add `file_path` to `files.read` if not exists
4. Check for errors in `tool_response` and add to `errors` if present
5. Update `updated_at`
6. Save state atomically
7. Log event to `.specstar/logs/post_tool_use.json`
8. Return success

**State Operations:**
- Update `tools_used` counts
- Update file tracking arrays
- Complete agent lifecycle for Task tool
- Track errors if present

### 5. notification Hook

**Purpose:** Track notification messages sent to the user.

**Input JSON:**
```json
{
  "session_id": "string",
  "message": "string"
}
```

**Logic Flow:**
1. Load session state
2. Append notification to `notifications` array with timestamp
3. Update `updated_at`
4. Save state atomically
5. Log event to `.specstar/logs/notification.json`
6. Return success

**State Operations:**
- Append to `notifications` array
- Update `updated_at`

### 6. pre_compact Hook

**Purpose:** Handle context window compaction events.

**Input JSON:**
```json
{
  "session_id": "string",
  "transcript_path": "string",
  "trigger": "manual|auto",
  "custom_instructions": "string"  // Optional
}
```

**Logic Flow:**
1. Log event to `.specstar/logs/pre_compact.json`
2. Return success

**State Operations:** None (logging only)

### 7. session_end Hook

**Purpose:** Handle session ending and track termination reason.

**Input JSON:**
```json
{
  "session_id": "string",
  "reason": "clear|logout|prompt_input_exit|other"
}
```

**Logic Flow:**
1. Load session state
2. Set `session_active` to false
3. Update `updated_at`
4. Save state atomically
5. Log event to `.specstar/logs/session_end.json` with timestamp and reason
6. Return success

**State Operations:**
- Set `session_active` to false
- Update `updated_at`

### 8. stop Hook

**Purpose:** Handle session termination.

**Input JSON:**
```json
{
  "session_id": "string",
  "stop_hook_active": "boolean",
  "transcript_path": "string"  // Optional
}
```

**Logic Flow:**
1. Load session state
2. Set `session_active` to false
3. Update `updated_at`
4. Save state atomically
5. Log event to `.specstar/logs/stop.json`
6. Optional: Archive transcript (configurable)
7. Return success

**State Operations:**
- Set `session_active` to false
- Update `updated_at`

### 9. subagent_stop Hook

**Purpose:** Handle sub-agent termination.

**Input JSON:**
```json
{
  "session_id": "string",
  "stop_hook_active": "boolean",
  "transcript_path": "string"  // Optional
}
```

**Logic Flow:**
1. Log event to `.specstar/logs/subagent_stop.json`
2. Return success

**State Operations:** None (logging only)

## State Management Module

### Core Functions

#### InitializeState(sessionID string) error
- Create session directory
- Initialize state.json with default structure
- Return error if filesystem operations fail

#### LoadState(sessionID string) (*SessionState, error)
- Read state.json from session directory
- Parse JSON into SessionState struct
- Return error if file not found or invalid JSON

#### UpdateState(sessionID string, updates map[string]interface{}) error
- Load existing state
- Apply updates based on operation type
- Use atomic write pattern (temp file + rename)
- Update `updated_at` timestamp
- Return error if update fails

#### AtomicWrite(filepath string, data interface{}) error
- Marshal data to JSON
- Write to temp file with `.tmp` extension
- Rename temp file to target (atomic operation)
- Return error if any step fails


## Logging System

### Log File Format

All log files use JSON array format with append-only writes:

```json
[
  {
    "timestamp": "ISO8601",
    "session_id": "string",
    // Hook-specific fields
  }
]
```

---

## Appendix: Example State Transitions

### Agent Invocation Flow

```
1. pre_tool_use (Task tool):
   - agents: [] → ["research-agent"]
   - agents_history: add {name: "research-agent", started_at: "2025-01-01T10:00:00Z"}
   - tools_used: {"Task": 0} → {"Task": 1}

2. post_tool_use (Task tool):
   - agents: ["research-agent"] → []
   - agents_history: update {name: "research-agent", started_at: "...", completed_at: "2025-01-01T10:05:00Z"}
   - tools_used: {"Task": 1} → {"Task": 2}
```

### File Operation Flow

```
1. pre_tool_use (Write tool):
   - tools_used: {"Write": 0} → {"Write": 1}

2. post_tool_use (Write tool):
   - files.new: [] → ["/path/to/newfile.txt"]
   - tools_used: {"Write": 1} → {"Write": 2}

3. pre_tool_use (Edit tool):
   - tools_used: {"Edit": 0} → {"Edit": 1}

4. post_tool_use (Edit tool):
   - files.edited: [] → ["/path/to/existingfile.txt"]
   - tools_used: {"Edit": 1} → {"Edit": 2}

5. pre_tool_use (Read tool):
   - tools_used: {"Read": 0} → {"Read": 1}

6. post_tool_use (Read tool):
   - files.read: [] → ["/path/to/readme.md"]
   - tools_used: {"Read": 1} → {"Read": 2}
```

### User Interaction Flow

```
1. user_prompt_submit:
   - prompts: [] → [{timestamp: "2025-01-01T10:00:00Z", prompt: "Create a new Python script"}]

2. notification:
   - notifications: [] → [{timestamp: "2025-01-01T10:01:00Z", message: "Starting Python script creation"}]

3. Multiple tool uses:
   - tools_used: {} → {"Read": 3, "Write": 1, "Bash": 2}
```

### Session Lifecycle

```
1. session_start:
   - state.json created with initial structure
   - created_at: "2025-01-01T10:00:00Z"
   - updated_at: "2025-01-01T10:00:00Z"
   - session_active: true

2. Various operations...
   - updated_at continuously updated
   - tools_used incrementing
   - files arrays growing
   - session_active remains true

3. session_end (reason: "clear"):
   - session_active: true → false
   - updated_at: "2025-01-01T15:00:00Z"
   - Log includes reason: "clear"

4. Alternative endings:
   - session_end (reason: "logout"): User logged out
   - session_end (reason: "prompt_input_exit"): User exited during prompt
   - session_end (reason: "other"): Other termination reasons
   - stop hook: Also sets session_active to false
```

### Error Tracking Flow

```
1. post_tool_use with error:
   - errors: [] → [{timestamp: "2025-01-01T10:02:00Z", type: "FileNotFound", message: "Cannot find file.txt", context: {tool: "Read", file_path: "/missing/file.txt"}}]
```

### Complex Multi-Agent Workflow

```
1. pre_tool_use (Task: research-agent):
   - agents: [] → ["research-agent"]
   - tools_used: {"Task": 0} → {"Task": 1}

2. pre_tool_use (Task: engineering-lead):
   - agents: ["research-agent"] → ["research-agent", "engineering-lead"]
   - tools_used: {"Task": 1} → {"Task": 2}

3. post_tool_use (Task: research-agent):
   - agents: ["research-agent", "engineering-lead"] → ["engineering-lead"]
   - agents_history: update research-agent with completed_at
   - tools_used: {"Task": 2} → {"Task": 3}

4. post_tool_use (Task: engineering-lead):
   - agents: ["engineering-lead"] → []
   - agents_history: update engineering-lead with completed_at
   - tools_used: {"Task": 3} → {"Task": 4}
```

This specification provides a comprehensive blueprint for implementing the hook and state management system with clear separation of concerns, robust error handling, and detailed state transition examples.
