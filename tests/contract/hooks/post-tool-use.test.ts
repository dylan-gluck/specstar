import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { $ } from "bun";
import { randomUUID } from "node:crypto";

describe("post_tool_use hook contract", () => {
  const testDir = join(process.cwd(), ".specstar-test");
  const sessionsDir = join(testDir, "sessions");
  const logsDir = join(testDir, "logs");
  
  // The actual hook path that should be implemented
  const hookPath = join(process.cwd(), ".specstar", "hooks", "post_tool_use.ts");
  
  // Test data
  const sessionId = randomUUID();
  const sessionDir = join(sessionsDir, sessionId);
  const stateFile = join(sessionDir, "state.json");
  const logFile = join(logsDir, "post_tool_use.json");

  beforeEach(() => {
    // Set up test directory structure
    mkdirSync(testDir, { recursive: true });
    mkdirSync(sessionsDir, { recursive: true });
    mkdirSync(sessionDir, { recursive: true });
    mkdirSync(logsDir, { recursive: true });
    
    // Create initial state file
    const initialState = {
      session_id: sessionId,
      tools_used: [],
      last_updated: new Date().toISOString()
    };
    writeFileSync(stateFile, JSON.stringify(initialState, null, 2));
    
    // Create empty log file
    writeFileSync(logFile, "[]");
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("should exist at the expected location", () => {
    // The hook should be at .specstar/hooks/post_tool_use.ts
    expect(existsSync(hookPath)).toBe(true);
  });

  it("should accept required inputs and return success", async () => {
    // Skip if hook doesn't exist yet
    if (!existsSync(hookPath)) {
      console.log("Skipping: Hook not implemented yet");
      return;
    }

    // Arrange
    const toolName = "Read";
    const toolInput = { file_path: "/some/file.ts" };
    const toolResponse = { content: "file contents", success: true };
    
    // Act - Call the actual hook with test directories
    const result = await $`SPECSTAR_DIR=${testDir} bun ${hookPath} ${sessionId} ${toolName} ${JSON.stringify(toolInput)} ${JSON.stringify(toolResponse)}`.quiet();
    
    // Assert - Hook returns exit code 0
    expect(result.exitCode).toBe(0);
  });

  it("should update session state file atomically", async () => {
    // Skip if hook doesn't exist yet
    if (!existsSync(hookPath)) {
      console.log("Skipping: Hook not implemented yet");
      return;
    }

    // Arrange
    const toolName = "Write";
    const toolInput = { file_path: "/test.ts", content: "test content" };
    const toolResponse = { success: true, bytes_written: 12 };
    
    // Act
    await $`SPECSTAR_DIR=${testDir} bun ${hookPath} ${sessionId} ${toolName} ${JSON.stringify(toolInput)} ${JSON.stringify(toolResponse)}`.quiet();
    
    // Assert - State file was updated
    const updatedState = JSON.parse(readFileSync(stateFile, "utf-8"));
    expect(updatedState.tools_used).toHaveLength(1);
    expect(updatedState.tools_used[0].tool_name).toBe(toolName);
    expect(updatedState.tools_used[0].tool_input).toEqual(toolInput);
    expect(updatedState.tools_used[0].tool_response).toEqual(toolResponse);
    expect(updatedState.tools_used[0].timestamp).toBeDefined();
    expect(updatedState.last_updated).toBeDefined();
  });

  it("should append to post_tool_use log file", async () => {
    // Skip if hook doesn't exist yet
    if (!existsSync(hookPath)) {
      console.log("Skipping: Hook not implemented yet");
      return;
    }

    // Arrange
    const toolName = "Bash";
    const toolInput = { command: "ls -la" };
    const toolResponse = { output: "file listing", exit_code: 0 };
    
    // Act
    await $`SPECSTAR_DIR=${testDir} bun ${hookPath} ${sessionId} ${toolName} ${JSON.stringify(toolInput)} ${JSON.stringify(toolResponse)}`.quiet();
    
    // Assert - Log file was appended
    const logs = JSON.parse(readFileSync(logFile, "utf-8"));
    expect(logs).toHaveLength(1);
    expect(logs[0].session_id).toBe(sessionId);
    expect(logs[0].tool_name).toBe(toolName);
    expect(logs[0].tool_input).toEqual(toolInput);
    expect(logs[0].tool_response).toEqual(toolResponse);
    expect(logs[0].timestamp).toBeDefined();
  });

  it("should validate input types and return error for invalid inputs", async () => {
    // Skip if hook doesn't exist yet
    if (!existsSync(hookPath)) {
      console.log("Skipping: Hook not implemented yet");
      return;
    }

    // Test invalid session_id (not a UUID)
    let result = await $`SPECSTAR_DIR=${testDir} bun ${hookPath} "not-a-uuid" "Read" '{}' '{}'`.quiet().nothrow();
    expect(result.exitCode).toBe(1);
    
    // Test invalid tool_name (empty)
    result = await $`SPECSTAR_DIR=${testDir} bun ${hookPath} ${sessionId} "" '{}' '{}'`.quiet().nothrow();
    expect(result.exitCode).toBe(1);
    
    // Test invalid tool_input (not JSON)
    result = await $`SPECSTAR_DIR=${testDir} bun ${hookPath} ${sessionId} "Read" "not-json" '{}'`.quiet().nothrow();
    expect(result.exitCode).toBe(1);
    
    // Test invalid tool_response (null)
    result = await $`SPECSTAR_DIR=${testDir} bun ${hookPath} ${sessionId} "Read" '{}' 'null'`.quiet().nothrow();
    expect(result.exitCode).toBe(1);
    
    // Test valid inputs should succeed
    result = await $`SPECSTAR_DIR=${testDir} bun ${hookPath} ${sessionId} "Read" '{"file":"test.ts"}' '{"content":"data"}'`.quiet();
    expect(result.exitCode).toBe(0);
  });

  it("should never block and always return quickly", async () => {
    // Skip if hook doesn't exist yet
    if (!existsSync(hookPath)) {
      console.log("Skipping: Hook not implemented yet");
      return;
    }

    // Act
    const startTime = Date.now();
    const result = await $`SPECSTAR_DIR=${testDir} bun ${hookPath} ${sessionId} "Read" '{}' '{}'`.quiet();
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Assert - Should complete quickly (under 500ms is reasonable for a hook)
    expect(result.exitCode).toBe(0);
    expect(duration).toBeLessThan(500);
  });

  it("should handle concurrent calls without data loss", async () => {
    // Skip if hook doesn't exist yet
    if (!existsSync(hookPath)) {
      console.log("Skipping: Hook not implemented yet");
      return;
    }

    // Act - Call hook multiple times concurrently
    const promises = [];
    const numCalls = 10;
    for (let i = 0; i < numCalls; i++) {
      const toolName = `Tool${i}`;
      const toolInput = { index: i };
      const toolResponse = { result: `Result ${i}` };
      promises.push(
        $`SPECSTAR_DIR=${testDir} bun ${hookPath} ${sessionId} ${toolName} ${JSON.stringify(toolInput)} ${JSON.stringify(toolResponse)}`.quiet()
      );
    }
    
    const results = await Promise.all(promises);
    
    // Assert - All calls succeeded
    results.forEach(result => {
      expect(result.exitCode).toBe(0);
    });
    
    // Assert - All data was recorded without loss
    const updatedState = JSON.parse(readFileSync(stateFile, "utf-8"));
    expect(updatedState.tools_used).toHaveLength(numCalls);
    
    const logs = JSON.parse(readFileSync(logFile, "utf-8"));
    expect(logs).toHaveLength(numCalls);
    
    // Verify all tools are present
    const toolNames = updatedState.tools_used.map(t => t.tool_name).sort();
    const expectedNames = Array.from({length: numCalls}, (_, i) => `Tool${i}`).sort();
    expect(toolNames).toEqual(expectedNames);
  });
});