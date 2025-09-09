/**
 * Example hooks file for Claude Code session monitoring
 * 
 * This file demonstrates how to define hooks that will be executed
 * during various lifecycle events of a Claude Code session.
 */

import type { HookEvent } from "./index";

/**
 * Called before a new Claude Code session starts
 */
export const beforeSession = async (event: HookEvent) => {
  console.log("🚀 Starting new Claude Code session");
  console.log(`  Timestamp: ${event.timestamp}`);
  
  // Example: Initialize session logging
  if (event.data?.sessionId) {
    console.log(`  Session ID: ${event.data.sessionId}`);
  }
  
  // Example: Setup session-specific resources
  // await setupSessionResources(event.data);
};

/**
 * Called after a Claude Code session ends
 */
export const afterSession = async (event: HookEvent) => {
  console.log("✅ Claude Code session completed");
  console.log(`  Timestamp: ${event.timestamp}`);
  
  // Example: Generate session summary
  if (event.data?.stats) {
    console.log(`  Files changed: ${event.data.stats.filesChanged}`);
    console.log(`  Commands run: ${event.data.stats.commandsRun}`);
    console.log(`  Duration: ${event.data.stats.duration}ms`);
  }
  
  // Example: Cleanup session resources
  // await cleanupSessionResources(event.data);
};

/**
 * Called when files change during a Claude Code session
 */
export const onFileChange = (event: HookEvent) => {
  const { file, operation, content } = event.data || {};
  
  console.log(`📝 File ${operation}: ${file}`);
  
  // Example: Track file changes
  switch (operation) {
    case "create":
      console.log(`  Created new file: ${file}`);
      break;
    case "modify":
      console.log(`  Modified file: ${file}`);
      break;
    case "delete":
      console.log(`  Deleted file: ${file}`);
      break;
  }
  
  // Example: Validate file changes
  // if (file.endsWith('.ts') && content) {
  //   validateTypeScript(file, content);
  // }
};

/**
 * Called when commands are executed during a session
 */
export const onCommand = (event: HookEvent) => {
  const { command, output, exitCode } = event.data || {};
  
  console.log(`🔧 Command executed: ${command}`);
  
  if (exitCode !== undefined) {
    if (exitCode === 0) {
      console.log(`  ✓ Command succeeded`);
    } else {
      console.log(`  ✗ Command failed with exit code: ${exitCode}`);
    }
  }
  
  // Example: Log dangerous commands
  const dangerousCommands = ["rm -rf", "git push --force", "npm publish"];
  if (dangerousCommands.some(cmd => command?.includes(cmd))) {
    console.warn(`  ⚠️  Warning: Potentially dangerous command executed`);
  }
  
  // Example: Capture test results
  // if (command?.includes('test')) {
  //   parseTestResults(output);
  // }
};

/**
 * Called when errors occur during hook execution
 */
export const onError = (event: HookEvent) => {
  const { originalEvent, error } = event.data || {};
  
  console.error(`❌ Error in hook "${originalEvent}":`, error?.message);
  
  // Example: Send error to monitoring service
  // await sendToMonitoring({
  //   type: 'hook_error',
  //   event: originalEvent,
  //   error: error,
  //   timestamp: event.timestamp
  // });
  
  // Example: Write to error log
  // await appendToErrorLog({
  //   timestamp: event.timestamp,
  //   hook: originalEvent,
  //   error: error
  // });
};

/**
 * Custom hook example: Track AI suggestions
 */
export const onAISuggestion = (event: HookEvent) => {
  const { suggestion, accepted, confidence } = event.data || {};
  
  if (suggestion) {
    console.log(`🤖 AI Suggestion: ${suggestion.type}`);
    console.log(`  Confidence: ${confidence}%`);
    console.log(`  Accepted: ${accepted ? 'Yes' : 'No'}`);
  }
};

// Export all hooks as default for compatibility
export default {
  beforeSession,
  afterSession,
  onFileChange,
  onCommand,
  onError,
  onAISuggestion
};