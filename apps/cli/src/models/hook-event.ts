/**
 * Hook Event Interfaces
 * 
 * TypeScript interfaces for all Claude Code hook events.
 * Based on the contract specifications in specs/002-fix-session-monitoring-hooks/contracts/hook-contracts.json
 */

/**
 * Session Start Event
 * Triggered when a Claude Code session begins.
 */
export interface SessionStartEvent {
  session_id: string; // UUID format
  source: 'startup' | 'resume' | 'clear';
}

/**
 * User Prompt Submit Event
 * Triggered when a user submits a prompt to Claude.
 */
export interface UserPromptSubmitEvent {
  session_id: string; // UUID format
  prompt: string;
}

/**
 * Pre Tool Use Event
 * Triggered before Claude uses a tool.
 */
export interface PreToolUseEvent {
  session_id: string; // UUID format
  tool_name: string;
  tool_input: Record<string, unknown>;
}

/**
 * Post Tool Use Event
 * Triggered after Claude uses a tool.
 */
export interface PostToolUseEvent {
  session_id: string; // UUID format
  tool_name: string;
  tool_input: Record<string, unknown>;
  tool_response: Record<string, unknown>;
}

/**
 * Notification Event
 * Triggered for system notifications during the session.
 */
export interface NotificationEvent {
  session_id: string; // UUID format
  message: string;
}

/**
 * Pre Compact Event
 * Triggered before Claude performs conversation compaction.
 */
export interface PreCompactEvent {
  session_id: string; // UUID format
  transcript_path: string;
  trigger: 'manual' | 'auto';
  custom_instructions?: string; // Optional field
}

/**
 * Session End Event
 * Triggered when a Claude Code session ends.
 */
export interface SessionEndEvent {
  session_id: string; // UUID format
  reason: 'clear' | 'logout' | 'prompt_input_exit' | 'other';
}

/**
 * Stop Event
 * Triggered when Claude stops during execution.
 */
export interface StopEvent {
  session_id: string; // UUID format
  stop_hook_active: boolean;
  transcript_path?: string; // Optional field
}

/**
 * Subagent Stop Event
 * Triggered when a subagent stops during execution.
 */
export interface SubagentStopEvent {
  session_id: string; // UUID format
  stop_hook_active: boolean;
  transcript_path?: string; // Optional field
}

/**
 * Union type for all hook events
 */
export type HookEvent =
  | SessionStartEvent
  | UserPromptSubmitEvent
  | PreToolUseEvent
  | PostToolUseEvent
  | NotificationEvent
  | PreCompactEvent
  | SessionEndEvent
  | StopEvent
  | SubagentStopEvent;

/**
 * Hook event names enum for type safety
 */
export enum HookEventName {
  SessionStart = 'session_start',
  UserPromptSubmit = 'user_prompt_submit',
  PreToolUse = 'pre_tool_use',
  PostToolUse = 'post_tool_use',
  Notification = 'notification',
  PreCompact = 'pre_compact',
  SessionEnd = 'session_end',
  Stop = 'stop',
  SubagentStop = 'subagent_stop',
}

/**
 * Exit codes for hook responses
 */
export enum HookExitCode {
  Success = 0,
  Block = 2, // Only for session_start, user_prompt_submit, and pre_tool_use
}

/**
 * Helper type to map event names to their corresponding event types
 */
export interface HookEventMap {
  [HookEventName.SessionStart]: SessionStartEvent;
  [HookEventName.UserPromptSubmit]: UserPromptSubmitEvent;
  [HookEventName.PreToolUse]: PreToolUseEvent;
  [HookEventName.PostToolUse]: PostToolUseEvent;
  [HookEventName.Notification]: NotificationEvent;
  [HookEventName.PreCompact]: PreCompactEvent;
  [HookEventName.SessionEnd]: SessionEndEvent;
  [HookEventName.Stop]: StopEvent;
  [HookEventName.SubagentStop]: SubagentStopEvent;
}