# Data Model: Specstar TUI

## Overview

Data models for the Specstar multi-session observability TUI application. All data is persisted as JSON files in the file system.

## Core Entities

### 1. Session

Represents a Claude Code work session with complete activity tracking.

```typescript
interface Session {
  // Identity
  session_id: string;          // Unique identifier (UUID)
  session_title: string;       // Human-readable title
  
  // Status
  session_active: boolean;     // true if session is running
  session_start: string;       // ISO 8601 timestamp
  session_end?: string;        // ISO 8601 timestamp (when ended)
  
  // Agents
  agents: string[];            // Currently active agent names
  agents_history: Agent[];     // Complete agent activity history
  subagents_active: number;    // Count of active subagents
  subagents_complete: number;  // Count of completed subagents
  
  // Files
  files: {
    new: string[];            // Newly created file paths
    edited: string[];         // Modified file paths
    read: string[];           // Read file paths
  };
  
  // Activity
  tools_used: Record<string, number>;  // Tool name → usage count
  errors: ErrorEntry[];                 // Error log
  prompts: PromptEntry[];              // User prompts
  notifications: NotificationEntry[];   // System notifications
  
  // Metrics
  total_tool_calls: number;    // Total tool invocations
  last_activity: string;       // ISO 8601 timestamp
}
```

### 2. Agent

Individual AI agent instance within a session.

```typescript
interface Agent {
  name: string;                // Agent identifier
  type: string;                // Agent type/role
  status: 'active' | 'complete' | 'failed';
  started_at: string;          // ISO 8601 timestamp
  completed_at?: string;       // ISO 8601 timestamp
  current_task?: string;       // Current task description
  tools_used: string[];        // Tools this agent has used
}
```

### 3. Settings

Application configuration for document folders and display preferences.

```typescript
interface Settings {
  version: string;             // Settings schema version
  docs: DocumentFolder[];      // Document folder configurations
  sessions_path: string;       // Path to sessions directory
  logs_path: string;          // Path to logs directory
  hooks: {
    enabled: boolean;         // Whether hooks are active
    script_path: string;      // Path to hooks.ts script
  };
  ui: {
    theme: 'dark' | 'light'; // UI theme
    refresh_rate: number;     // UI refresh interval (ms)
    show_hidden_files: boolean;
  };
}
```

### 4. DocumentFolder

Configuration for a document folder shown in Plan view.

```typescript
interface DocumentFolder {
  title: string;              // Display name (e.g., "Docs")
  path: string;               // Relative or absolute path
  glob?: string;              // Optional glob pattern for filtering
  recursive: boolean;         // Scan subdirectories
  max_depth?: number;         // Maximum directory depth
}
```

### 5. Document

Markdown document metadata for display in Plan view.

```typescript
interface Document {
  path: string;               // Full file path
  name: string;               // File name without extension
  title: string;              // Display title (from frontmatter or name)
  folder: string;             // Parent folder category
  size: number;               // File size in bytes
  modified: string;           // ISO 8601 timestamp
  frontmatter?: Record<string, any>; // Parsed frontmatter
}
```

### 6. Task

Work item tracked in session (from TodoWrite tool).

```typescript
interface Task {
  content: string;            // Task description
  activeForm: string;         // Present continuous form
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;         // ISO 8601 timestamp
  updated_at: string;         // ISO 8601 timestamp
  completed_at?: string;      // ISO 8601 timestamp
}
```

### 7. ErrorEntry

Error occurrence within a session.

```typescript
interface ErrorEntry {
  timestamp: string;          // ISO 8601 timestamp
  type: string;              // Error type/category
  message: string;           // Error message
  tool?: string;             // Tool that caused error
  context?: any;             // Additional error context
}
```

### 8. PromptEntry

User prompt submitted to Claude Code.

```typescript
interface PromptEntry {
  timestamp: string;          // ISO 8601 timestamp
  text: string;              // Prompt text
  tokens?: number;           // Token count if available
}
```

### 9. NotificationEntry

System notification or message.

```typescript
interface NotificationEntry {
  timestamp: string;          // ISO 8601 timestamp
  level: 'info' | 'warning' | 'error';
  message: string;           // Notification text
  source?: string;           // Source component
}
```

### 10. HookEvent

Claude Code lifecycle event for processing.

```typescript
interface HookEvent {
  type: 'SessionStart' | 'SessionEnd' | 'UserPromptSubmit' | 
        'PreToolUse' | 'PostToolUse' | 'Notification' |
        'PreCompact' | 'Stop' | 'SubagentStop';
  session_id: string;         // Session identifier
  timestamp: string;          // ISO 8601 timestamp
  data: any;                  // Event-specific data
}
```

## File System Layout

```
.specstar/
├── settings.json             # Settings entity
├── sessions/
│   └── {session_id}/
│       ├── state.json       # Session entity
│       ├── events.jsonl     # HookEvent stream
│       └── tasks.json       # Task[] array
├── logs/
│   ├── app.log             # Application logs
│   └── hooks.log           # Hook execution logs
└── hooks.ts                # Hook script (generated)
```

## State Transitions

### Session Lifecycle
```
Created → Active → Suspended → Active → Completed
                ↓
              Failed
```

### Agent Status
```
Created → Active → Complete
               ↓
            Failed
```

### Task Status
```
Pending → In Progress → Completed
```

## Validation Rules

### Session
- `session_id` must be unique UUID
- `session_title` required, max 100 characters
- `session_start` must be valid ISO 8601
- `session_end` only set when `session_active` is false
- `agents` array contains unique values
- `total_tool_calls` >= 0

### Settings
- `version` must match current schema version
- `docs` array must have at least one entry
- `refresh_rate` between 50-5000ms
- Paths must be valid file system paths

### Document
- `path` must exist on file system
- `name` derived from file name
- `size` >= 0
- `modified` must be valid ISO 8601

### Task
- `content` and `activeForm` required
- `status` transitions follow defined flow
- `completed_at` only set when status is 'completed'

## Indexes and Queries

### Primary Lookups
- Session by `session_id`
- Active sessions where `session_active = true`
- Documents by `folder` category
- Tasks by `status`

### Sort Orders
- Sessions by `last_activity` DESC
- Documents by `modified` DESC or `name` ASC
- Tasks by `created_at` ASC
- Errors by `timestamp` DESC

## Data Consistency

### Atomic Operations
- Session state updates are written atomically
- Use file system rename for atomic writes
- Lock files during multi-field updates

### Referential Integrity
- Agent names in `agents` array must exist in `agents_history`
- File paths in `files` arrays must be absolute paths
- Tool names in `tools_used` must be valid Claude Code tools

### Data Retention
- Keep last 100 sessions
- Rotate logs weekly
- Archive old sessions after 30 days
- Prune events.jsonl files over 10MB