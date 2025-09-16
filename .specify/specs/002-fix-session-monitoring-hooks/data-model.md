# Data Model: Session Monitoring and Hook Integration

## Core Entities

### SessionData

Primary entity for tracking Claude Code session state.

```typescript
interface SessionData {
  // Identity
  session_id: string;           // UUID from Claude Code
  session_title: string;        // Feature/epic/story name
  session_active: boolean;      // Current session status
  
  // Timestamps
  created_at: string;          // ISO8601 timestamp
  updated_at: string;          // ISO8601 timestamp
  
  // Agent tracking
  agents: string[];            // Currently active agents
  agents_history: AgentHistoryEntry[];
  
  // File operations
  files: FileOperations;
  
  // Tool usage
  tools_used: Record<string, number>;  // Tool name -> invocation count
  
  // Error tracking
  errors: ErrorEntry[];
  
  // User interactions
  prompts: PromptEntry[];
  notifications: NotificationEntry[];
}
```

### Supporting Types

```typescript
interface AgentHistoryEntry {
  name: string;              // Agent/subagent type
  started_at: string;        // ISO8601 timestamp
  completed_at?: string;     // ISO8601 timestamp (optional until completed)
}

interface FileOperations {
  new: string[];            // Files created
  edited: string[];         // Files modified
  read: string[];          // Files read
}

interface ErrorEntry {
  timestamp: string;        // ISO8601 timestamp
  type: string;            // Error type/category
  message: string;         // Error message
  context?: any;           // Optional error context
}

interface PromptEntry {
  timestamp: string;        // ISO8601 timestamp
  prompt: string;          // User's prompt text
}

interface NotificationEntry {
  timestamp: string;        // ISO8601 timestamp
  message: string;         // Notification text
}
```

## Hook Event Schemas

### SessionStartEvent

```typescript
interface SessionStartEvent {
  session_id: string;
  source: 'startup' | 'resume' | 'clear';  // Not stored in state
}
```

### UserPromptSubmitEvent

```typescript
interface UserPromptSubmitEvent {
  session_id: string;
  prompt: string;
}
```

### PreToolUseEvent

```typescript
interface PreToolUseEvent {
  session_id: string;
  tool_name: string;
  tool_input: any;  // Tool-specific input object
}

// Special handling for Task tool
interface TaskToolInput {
  subagent_type: string;
  description?: string;
  prompt?: string;
}
```

### PostToolUseEvent

```typescript
interface PostToolUseEvent {
  session_id: string;
  tool_name: string;
  tool_input: any;
  tool_response: any;  // Tool-specific response
}

// File tool inputs
interface WriteToolInput {
  file_path: string;
  content: string;
}

interface EditToolInput {
  file_path: string;
  old_string: string;
  new_string: string;
}

interface ReadToolInput {
  file_path: string;
}
```

### NotificationEvent

```typescript
interface NotificationEvent {
  session_id: string;
  message: string;
}
```

### PreCompactEvent

```typescript
interface PreCompactEvent {
  session_id: string;
  transcript_path: string;
  trigger: 'manual' | 'auto';
  custom_instructions?: string;
}
```

### SessionEndEvent

```typescript
interface SessionEndEvent {
  session_id: string;
  reason: 'clear' | 'logout' | 'prompt_input_exit' | 'other';
}
```

### StopEvent

```typescript
interface StopEvent {
  session_id: string;
  stop_hook_active: boolean;
  transcript_path?: string;
}
```

### SubagentStopEvent

```typescript
interface SubagentStopEvent {
  session_id: string;
  stop_hook_active: boolean;
  transcript_path?: string;
}
```

## Log Entry Structures

Each log file contains an array of entries with hook-specific fields.

### Base Log Entry

```typescript
interface BaseLogEntry {
  timestamp: string;      // ISO8601 timestamp
  session_id: string;     // Session identifier
}
```

### Extended Log Entries

```typescript
interface SessionStartLogEntry extends BaseLogEntry {
  source: 'startup' | 'resume' | 'clear';
}

interface UserPromptLogEntry extends BaseLogEntry {
  prompt: string;
}

interface ToolUseLogEntry extends BaseLogEntry {
  tool_name: string;
  tool_input: any;
  tool_response?: any;  // Only for post_tool_use
}

interface NotificationLogEntry extends BaseLogEntry {
  message: string;
}

interface CompactLogEntry extends BaseLogEntry {
  transcript_path: string;
  trigger: 'manual' | 'auto';
  custom_instructions?: string;
}

interface SessionEndLogEntry extends BaseLogEntry {
  reason: 'clear' | 'logout' | 'prompt_input_exit' | 'other';
}

interface StopLogEntry extends BaseLogEntry {
  stop_hook_active: boolean;
  transcript_path?: string;
}
```

## State Transitions

### Session Lifecycle

```
INITIAL → session_start → ACTIVE
ACTIVE → session_end → INACTIVE
ACTIVE → stop → INACTIVE
```

### Agent Lifecycle

```
NOT_RUNNING → pre_tool_use(Task) → RUNNING
RUNNING → post_tool_use(Task) → NOT_RUNNING
```

### File Operation States

```
UNKNOWN → post_tool_use(Write) → NEW
UNKNOWN → post_tool_use(Read) → READ
EXISTING → post_tool_use(Edit) → EDITED
```

## Validation Rules

### SessionData Validation

- `session_id`: Required, UUID format
- `session_title`: Required, non-empty string
- `created_at`: Required, valid ISO8601
- `updated_at`: Required, valid ISO8601, >= created_at
- `agents`: Array, no duplicates
- `agents_history`: Each entry must have valid timestamps
- `files.*`: Arrays with unique file paths
- `tools_used`: Non-negative integers only

### Event Validation

- All events must have `session_id`
- Timestamps must be valid ISO8601
- File paths must be absolute paths
- Tool names must match known tools

### State Consistency Rules

1. Active agents must have corresponding incomplete history entry
2. Completed agents must not be in active agents array
3. File arrays must not have duplicates
4. Tool counts must match actual invocations
5. Timestamps must be chronologically consistent

## File System Structure

```
.specstar/
├── sessions/
│   └── {session-id}/
│       └── state.json          # SessionData
├── logs/
│   ├── session_start.json      # Array<SessionStartLogEntry>
│   ├── user_prompt_submit.json # Array<UserPromptLogEntry>
│   ├── pre_tool_use.json       # Array<ToolUseLogEntry>
│   ├── post_tool_use.json      # Array<ToolUseLogEntry>
│   ├── notification.json       # Array<NotificationLogEntry>
│   ├── pre_compact.json        # Array<CompactLogEntry>
│   ├── session_end.json        # Array<SessionEndLogEntry>
│   ├── stop.json               # Array<StopLogEntry>
│   └── subagent_stop.json      # Array<StopLogEntry>
└── hooks.ts                    # Generated hook script
```

## Migration Strategy

For existing sessions with old structure:

1. Check for presence of required fields
2. Map old field names to new:
   - `id` → `session_id`
   - `timestamp` → `created_at`
   - `status` → `session_active`
3. Initialize missing fields with defaults:
   - `session_title`: "Untitled Session"
   - `agents_history`: []
   - `notifications`: []
4. Log migration for debugging

## Performance Considerations

- Session files typically < 100KB
- Log files may grow unbounded (future: implement rotation)
- File watching debounced at 250ms
- Content comparison prevents duplicate processing
- Atomic writes prevent corruption

---

This data model provides the foundation for implementing session monitoring and hook integration with full Claude Code compatibility.