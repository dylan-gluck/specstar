#!/usr/bin/env bun

/**
 * Specstar Hooks for Claude Code
 *
 * This script implements all Claude Code lifecycle hooks according to the specification.
 * It's executed as a CLI tool with the hook type as the first argument and JSON input via stdin.
 *
 * Usage: bun run hooks.ts <hook_type>
 *
 * Hook types: session_start, user_prompt_submit, pre_tool_use, post_tool_use,
 *            notification, pre_compact, session_end, stop, subagent_stop
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  appendFileSync,
} from "fs";
import { join, dirname } from "path";

// ============================================================================
// Types and Interfaces
// ============================================================================

interface SessionState {
  session_id: string;
  session_title: string;
  session_active: boolean;
  created_at: string;
  updated_at: string;
  agents: string[];
  agents_history: Array<{
    name: string;
    started_at: string;
    completed_at?: string;
  }>;
  files: {
    new: string[];
    edited: string[];
    read: string[];
  };
  tools_used: Record<string, number>;
  errors: Array<{
    timestamp: string;
    type: string;
    message: string;
    context?: any;
  }>;
  prompts: Array<{
    timestamp: string;
    prompt: string;
  }>;
  notifications: Array<{
    timestamp: string;
    message: string;
  }>;
}

interface HookInput {
  session_id: string;
  transcript_path?: string;
  cwd?: string;
  hook_event_name?: string;
  [key: string]: any;
}

// ============================================================================
// Utility Functions
// ============================================================================

// Get the directory where this hooks.ts script is located
// Using import.meta.dir which is Bun's way to get the current file's directory
const HOOKS_DIR = import.meta.dir;

function ensureDirectoryExists(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

function getSpecstarDir(): string {
  // Always return the .specstar directory relative to where hooks.ts is located
  // hooks.ts is inside .specstar/, so we just return the parent directory
  return HOOKS_DIR;
}

function getSessionDir(sessionId: string): string {
  return join(getSpecstarDir(), "sessions", sessionId);
}

function getStateFilePath(sessionId: string): string {
  return join(getSessionDir(sessionId), "state.json");
}

function getLogsDir(): string {
  return join(getSpecstarDir(), "logs");
}

function getLogFilePath(eventType: string): string {
  return join(getLogsDir(), `${eventType}.json`);
}

function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

// ============================================================================
// State Management Functions
// ============================================================================

function initializeState(sessionId: string): SessionState {
  return {
    session_id: sessionId,
    session_title: "",
    session_active: true,
    created_at: getCurrentTimestamp(),
    updated_at: getCurrentTimestamp(),
    agents: [],
    agents_history: [],
    files: {
      new: [],
      edited: [],
      read: [],
    },
    tools_used: {},
    errors: [],
    prompts: [],
    notifications: [],
  };
}

function loadState(sessionId: string): SessionState | null {
  const stateFile = getStateFilePath(sessionId);
  if (!existsSync(stateFile)) {
    return null;
  }

  try {
    const content = readFileSync(stateFile, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    console.error(`Failed to load state for session ${sessionId}:`, error);
    return null;
  }
}

function saveState(sessionId: string, state: SessionState): void {
  const stateFile = getStateFilePath(sessionId);
  const tempFile = `${stateFile}.tmp`;

  // Update timestamp
  state.updated_at = getCurrentTimestamp();

  // Atomic write: write to temp file, then rename
  try {
    ensureDirectoryExists(dirname(stateFile));
    writeFileSync(tempFile, JSON.stringify(state, null, 2));

    // Atomic rename
    Bun.write(stateFile, Bun.file(tempFile));

    // Clean up temp file
    if (existsSync(tempFile)) {
      Bun.spawn(["rm", tempFile]);
    }
  } catch (error) {
    console.error(`Failed to save state for session ${sessionId}:`, error);
    throw error;
  }
}

// ============================================================================
// Logging Functions
// ============================================================================

function logEvent(eventType: string, data: any): void {
  const logFile = getLogFilePath(eventType);
  ensureDirectoryExists(dirname(logFile));

  let logs: any[] = [];
  if (existsSync(logFile)) {
    try {
      const content = readFileSync(logFile, "utf-8");
      logs = JSON.parse(content);
    } catch (error) {
      console.error(`Failed to read log file ${logFile}:`, error);
      logs = [];
    }
  }

  logs.push({
    timestamp: getCurrentTimestamp(),
    ...data,
  });

  writeFileSync(logFile, JSON.stringify(logs, null, 2));
}

// ============================================================================
// Hook Handlers
// ============================================================================

function handleSessionStart(input: HookInput): void {
  const { session_id, source } = input;

  // Create session directory if not exists
  const sessionDir = getSessionDir(session_id);
  ensureDirectoryExists(sessionDir);

  // Initialize state
  const state = initializeState(session_id);
  saveState(session_id, state);

  // Log event
  logEvent("session_start", {
    session_id,
    source,
  });
}

function handleUserPromptSubmit(input: HookInput): void {
  const { session_id, prompt } = input;

  // Load or initialize state
  let state = loadState(session_id);
  if (!state) {
    state = initializeState(session_id);
  }

  // Append prompt to history
  state.prompts.push({
    timestamp: getCurrentTimestamp(),
    prompt,
  });

  // Save state
  saveState(session_id, state);

  // Log event
  logEvent("user_prompt_submit", {
    session_id,
    prompt,
  });
}

function handlePreToolUse(input: HookInput): void {
  const { session_id, tool_name, tool_input } = input;

  // Load or initialize state
  let state = loadState(session_id);
  if (!state) {
    state = initializeState(session_id);
  }

  // Handle Task tool for agent management
  if (tool_name === "Task" && tool_input) {
    const subagentType = tool_input.subagent_type;
    if (subagentType) {
      // Add to active agents if not present
      if (!state.agents.includes(subagentType)) {
        state.agents.push(subagentType);
      }

      // Add to agents history
      state.agents_history.push({
        name: subagentType,
        started_at: getCurrentTimestamp(),
      });
    }
  }

  // Save state
  saveState(session_id, state);

  // Log event
  logEvent("pre_tool_use", {
    session_id,
    tool_name,
    tool_input,
  });
}

function handlePostToolUse(input: HookInput): void {
  const { session_id, tool_name, tool_input, tool_response } = input;

  // Load or initialize state
  let state = loadState(session_id);
  if (!state) {
    state = initializeState(session_id);
  }

  // Increment tool usage count
  if (!state.tools_used[tool_name]) {
    state.tools_used[tool_name] = 0;
  }
  state.tools_used[tool_name]++;

  // Handle specific tools
  if (tool_name === "Task" && tool_input) {
    const subagentType = tool_input.subagent_type;
    if (subagentType) {
      // Find the OLDEST incomplete agent of this type (FIFO approach)
      const historyEntry = state.agents_history
        .find((a) => a.name === subagentType && !a.completed_at);
      
      if (historyEntry) {
        historyEntry.completed_at = getCurrentTimestamp();
        
        // Only remove from active agents array if no more incomplete agents of this type exist
        const hasMoreIncomplete = state.agents_history
          .some((a) => a.name === subagentType && !a.completed_at);
        
        if (!hasMoreIncomplete) {
          const agentIndex = state.agents.indexOf(subagentType);
          if (agentIndex > -1) {
            state.agents.splice(agentIndex, 1);
          }
        }
      }
    }
  } else if (tool_name === "Write" && tool_input) {
    const filePath = tool_input.file_path;
    if (filePath && !state.files.new.includes(filePath)) {
      state.files.new.push(filePath);
    }
  } else if (
    (tool_name === "Edit" || tool_name === "MultiEdit") &&
    tool_input
  ) {
    const filePath = tool_input.file_path;
    if (filePath && !state.files.edited.includes(filePath)) {
      state.files.edited.push(filePath);
    }
  } else if (tool_name === "Read" && tool_input) {
    const filePath = tool_input.file_path;
    if (filePath && !state.files.read.includes(filePath)) {
      state.files.read.push(filePath);
    }
  }

  // Check for errors in tool response
  if (tool_response && tool_response.error) {
    state.errors.push({
      timestamp: getCurrentTimestamp(),
      type: tool_response.error.type || "ToolError",
      message: tool_response.error.message || "Unknown error",
      context: {
        tool: tool_name,
        tool_input,
      },
    });
  }

  // Save state
  saveState(session_id, state);

  // Log event
  logEvent("post_tool_use", {
    session_id,
    tool_name,
    tool_input,
    tool_response,
  });
}

function handleNotification(input: HookInput): void {
  const { session_id, message } = input;

  // Load or initialize state
  let state = loadState(session_id);
  if (!state) {
    state = initializeState(session_id);
  }

  // Append notification
  state.notifications.push({
    timestamp: getCurrentTimestamp(),
    message,
  });

  // Save state
  saveState(session_id, state);

  // Log event
  logEvent("notification", {
    session_id,
    message,
  });
}

function handlePreCompact(input: HookInput): void {
  const { session_id, transcript_path, trigger, custom_instructions } = input;

  // Log event only (no state changes)
  logEvent("pre_compact", {
    session_id,
    transcript_path,
    trigger,
    custom_instructions,
  });
}

function handleSessionEnd(input: HookInput): void {
  const { session_id, reason } = input;

  // Load or initialize state
  let state = loadState(session_id);
  if (!state) {
    state = initializeState(session_id);
  }

  // Set session as inactive
  state.session_active = false;

  // Save state
  saveState(session_id, state);

  // Log event with reason
  logEvent("session_end", {
    session_id,
    reason,
  });
}

function handleStop(input: HookInput): void {
  const { session_id, stop_hook_active, transcript_path } = input;

  // Log event only (no state changes for stop)
  logEvent("stop", {
    session_id,
    stop_hook_active,
    transcript_path,
  });
}

function handleSubagentStop(input: HookInput): void {
  const { session_id, stop_hook_active, transcript_path } = input;

  // Log event only (no state changes for subagent stop)
  logEvent("subagent_stop", {
    session_id,
    stop_hook_active,
    transcript_path,
  });
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main() {
  // Get hook type from command line argument
  const hookType = process.argv[2];

  if (!hookType) {
    console.error("Error: Hook type not specified");
    console.error("Usage: bun run hooks.ts <hook_type>");
    process.exit(1);
  }

  // Read JSON input from stdin
  let input: HookInput;
  try {
    const stdinBuffer = await Bun.stdin.text();
    input = JSON.parse(stdinBuffer);
  } catch (error) {
    console.error("Error: Failed to parse JSON input from stdin");
    console.error(error);
    process.exit(1);
  }

  // Ensure directories exist (relative to hooks.ts location)
  ensureDirectoryExists(getSpecstarDir());
  ensureDirectoryExists(join(getSpecstarDir(), "sessions"));
  ensureDirectoryExists(getLogsDir());

  // Route to appropriate handler based on hook type
  try {
    switch (hookType) {
      case "session_start":
        handleSessionStart(input);
        break;
      case "user_prompt_submit":
        handleUserPromptSubmit(input);
        break;
      case "pre_tool_use":
        handlePreToolUse(input);
        break;
      case "post_tool_use":
        handlePostToolUse(input);
        break;
      case "notification":
        handleNotification(input);
        break;
      case "pre_compact":
        handlePreCompact(input);
        break;
      case "session_end":
        handleSessionEnd(input);
        break;
      case "stop":
        handleStop(input);
        break;
      case "subagent_stop":
        handleSubagentStop(input);
        break;
      default:
        console.error(`Error: Unknown hook type: ${hookType}`);
        process.exit(1);
    }

    // Success - exit with code 0
    process.exit(0);
  } catch (error) {
    console.error(`Error executing hook ${hookType}:`, error);
    process.exit(1);
  }
}

// Run main function
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
