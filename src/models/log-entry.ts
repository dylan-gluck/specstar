/**
 * Log Entry Models
 * 
 * Type definitions for Claude Code session log entries.
 * Each log entry type corresponds to a specific hook event.
 */

// Base interface for all log entries
export interface BaseLogEntry {
  timestamp: string;
  session_id: string;
}

// Session lifecycle events

export interface SessionStartLogEntry extends BaseLogEntry {
  source?: string;
}

export interface SessionEndLogEntry extends BaseLogEntry {
  reason?: string;
}

// User interaction events

export interface UserPromptSubmitLogEntry extends BaseLogEntry {
  prompt: string;
}

// Tool usage events

export interface PreToolUseLogEntry extends BaseLogEntry {
  tool_name: string;
  tool_input?: {
    subagent_type?: string;
    file_path?: string;
    [key: string]: any;
  };
}

export interface PostToolUseLogEntry extends BaseLogEntry {
  tool_name: string;
  tool_input?: {
    subagent_type?: string;
    file_path?: string;
    [key: string]: any;
  };
  tool_response?: {
    error?: {
      type?: string;
      message?: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
}

// System events

export interface NotificationLogEntry extends BaseLogEntry {
  message: string;
}

export interface PreCompactLogEntry extends BaseLogEntry {
  transcript_path?: string;
  trigger?: string;
  custom_instructions?: string;
}

// Stop events

export interface StopLogEntry extends BaseLogEntry {
  stop_hook_active?: boolean;
  transcript_path?: string;
}

export interface SubagentStopLogEntry extends BaseLogEntry {
  stop_hook_active?: boolean;
  transcript_path?: string;
}

// Union type for all log entries
export type LogEntry = 
  | SessionStartLogEntry
  | SessionEndLogEntry
  | UserPromptSubmitLogEntry
  | PreToolUseLogEntry
  | PostToolUseLogEntry
  | NotificationLogEntry
  | PreCompactLogEntry
  | StopLogEntry
  | SubagentStopLogEntry;

// Type guards for log entries
export function isSessionStartLogEntry(entry: BaseLogEntry): entry is SessionStartLogEntry {
  return 'source' in entry;
}

export function isSessionEndLogEntry(entry: BaseLogEntry): entry is SessionEndLogEntry {
  return 'reason' in entry;
}

export function isUserPromptSubmitLogEntry(entry: BaseLogEntry): entry is UserPromptSubmitLogEntry {
  return 'prompt' in entry;
}

export function isPreToolUseLogEntry(entry: BaseLogEntry): entry is PreToolUseLogEntry {
  return 'tool_name' in entry && !('tool_response' in entry);
}

export function isPostToolUseLogEntry(entry: BaseLogEntry): entry is PostToolUseLogEntry {
  return 'tool_name' in entry && 'tool_response' in entry;
}

export function isNotificationLogEntry(entry: BaseLogEntry): entry is NotificationLogEntry {
  return 'message' in entry && !('prompt' in entry);
}

export function isPreCompactLogEntry(entry: BaseLogEntry): entry is PreCompactLogEntry {
  return 'trigger' in entry || 'custom_instructions' in entry;
}

export function isStopLogEntry(entry: BaseLogEntry): entry is StopLogEntry {
  return 'stop_hook_active' in entry && !('subagent_stop' in entry);
}

export function isSubagentStopLogEntry(entry: BaseLogEntry): entry is SubagentStopLogEntry {
  // This is a bit tricky since both have same fields, but we can check context
  // In practice, this would be determined by the log file it comes from
  return 'stop_hook_active' in entry && 'transcript_path' in entry;
}

// Helper type for log file names
export type LogEventType = 
  | 'session_start'
  | 'session_end'
  | 'user_prompt_submit'
  | 'pre_tool_use'
  | 'post_tool_use'
  | 'notification'
  | 'pre_compact'
  | 'stop'
  | 'subagent_stop';

// Map log event types to their corresponding entry types
export type LogEntryMap = {
  'session_start': SessionStartLogEntry;
  'session_end': SessionEndLogEntry;
  'user_prompt_submit': UserPromptSubmitLogEntry;
  'pre_tool_use': PreToolUseLogEntry;
  'post_tool_use': PostToolUseLogEntry;
  'notification': NotificationLogEntry;
  'pre_compact': PreCompactLogEntry;
  'stop': StopLogEntry;
  'subagent_stop': SubagentStopLogEntry;
};