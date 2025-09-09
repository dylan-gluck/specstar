/**
 * Session Active Mutation Tests
 * 
 * These tests expose the session_active mutation bug in the current hooks implementation.
 * They test the actual .specstar/hooks.ts implementation by running hooks as child processes
 * and validating state changes against the SessionActiveContract.
 * 
 * EXPECTED BEHAVIOR:
 * - session_start should set session_active to true ✅
 * - session_end should set session_active to false ✅  
 * - stop hook should NOT modify session_active (will FAIL currently) ❌
 * - user_prompt_submit should NOT modify session_active ✅
 * - pre_tool_use should NOT modify session_active ✅
 * - post_tool_use should NOT modify session_active ✅
 * - notification should NOT modify session_active ✅
 * 
 * The test for 'stop' hook should FAIL, exposing the bug where handleStop()
 * incorrectly sets state.session_active = false on line 419.
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { spawn } from "bun";
import { existsSync, rmSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { SessionActiveContract } from "../../specs/003-current-status-the/contracts/hook-contracts";

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

describe("Session Active Mutation Tests", () => {
  const testSessionId = "test-session-" + Date.now();
  const originalCwd = process.cwd();
  const tempTestDir = join(originalCwd, "temp-test-" + Date.now());
  const hooksScript = join(originalCwd, ".specstar", "hooks.ts");

  beforeEach(() => {
    // Create and switch to temporary directory
    if (existsSync(tempTestDir)) {
      rmSync(tempTestDir, { recursive: true, force: true });
    }
    mkdirSync(tempTestDir, { recursive: true });
    process.chdir(tempTestDir);

    // Create test .specstar structure in temp directory
    mkdirSync(".specstar", { recursive: true });
    mkdirSync(join(".specstar", "sessions", testSessionId), { recursive: true });
    mkdirSync(join(".specstar", "logs"), { recursive: true });
  });

  afterEach(() => {
    // Switch back to original directory
    process.chdir(originalCwd);
    
    // Clean up temp directory
    if (existsSync(tempTestDir)) {
      rmSync(tempTestDir, { recursive: true, force: true });
    }
  });

  /**
   * Helper function to execute a hook and return the session state before and after
   */
  async function executeHook(
    hookType: string, 
    input: Record<string, any>
  ): Promise<{ 
    beforeState: SessionState | null; 
    afterState: SessionState | null; 
    success: boolean;
    output: string;
    error: string;
  }> {
    const inputWithDefaults = {
      session_id: testSessionId,
      timestamp: new Date().toISOString(),
      ...input
    };

    const stateFilePath = join(process.cwd(), ".specstar", "sessions", testSessionId, "state.json");

    // Read state before execution
    const beforeState = existsSync(stateFilePath) 
      ? JSON.parse(readFileSync(stateFilePath, 'utf-8')) 
      : null;

    // Execute hook via child process
    const proc = spawn([
      "bun", "run", hooksScript, hookType
    ], {
      stdin: "pipe",
      stdout: "pipe", 
      stderr: "pipe",
      cwd: process.cwd() // Run from current (temp) directory
    });

    // Send input via stdin
    proc.stdin?.write(JSON.stringify(inputWithDefaults));
    proc.stdin?.end();

    const result = await proc.exited;
    const output = await new Response(proc.stdout).text();
    const error = await new Response(proc.stderr).text();

    // Read state after execution
    const afterState = existsSync(stateFilePath)
      ? JSON.parse(readFileSync(stateFilePath, 'utf-8'))
      : null;

    return {
      beforeState,
      afterState,
      success: result === 0,
      output: output.trim(),
      error: error.trim()
    };
  }

  /**
   * Helper function to validate session_active mutations
   */
  function validateSessionActiveMutation(
    hookType: string,
    beforeState: SessionState | null,
    afterState: SessionState | null
  ): { valid: boolean; error?: string; details: string } {
    const beforeActive = beforeState?.session_active ?? false;
    const afterActive = afterState?.session_active ?? false;
    
    const validation = SessionActiveContract.validateMutation(
      hookType,
      beforeActive,
      afterActive
    );

    const details = `Hook '${hookType}': session_active ${beforeActive} -> ${afterActive}`;
    
    return {
      valid: validation.valid,
      error: validation.error,
      details
    };
  }

  describe("Session Lifecycle Hooks (Should Modify session_active)", () => {
    test("session_start hook should set session_active to true", async () => {
      const result = await executeHook("session_start", {
        source: "claude-code"
      });

      expect(result.success).toBe(true);
      expect(result.afterState).not.toBeNull();
      expect(result.afterState!.session_active).toBe(true);

      const validation = validateSessionActiveMutation(
        "session_start", 
        result.beforeState, 
        result.afterState
      );
      
      expect(validation.valid).toBe(true);
      expect(validation.error).toBeUndefined();
    });

    test("session_end hook should set session_active to false", async () => {
      // First create a session in active state
      await executeHook("session_start", { source: "claude-code" });
      
      const result = await executeHook("session_end", {
        reason: "user_exit"
      });

      expect(result.success).toBe(true);
      expect(result.afterState).not.toBeNull();
      expect(result.afterState!.session_active).toBe(false);

      const validation = validateSessionActiveMutation(
        "session_end", 
        result.beforeState, 
        result.afterState
      );
      
      expect(validation.valid).toBe(true);
      expect(validation.error).toBeUndefined();
    });
  });

  describe("Non-Lifecycle Hooks (Should NOT Modify session_active)", () => {
    beforeEach(async () => {
      // Initialize session for each test
      await executeHook("session_start", { source: "claude-code" });
    });

    test("user_prompt_submit hook should NOT modify session_active", async () => {
      const result = await executeHook("user_prompt_submit", {
        prompt: "Help me debug this code"
      });

      expect(result.success).toBe(true);
      expect(result.beforeState!.session_active).toBe(true);
      expect(result.afterState!.session_active).toBe(true);

      const validation = validateSessionActiveMutation(
        "user_prompt_submit", 
        result.beforeState, 
        result.afterState
      );
      
      expect(validation.valid).toBe(true);
      expect(validation.error).toBeUndefined();
    });

    test("pre_tool_use hook should NOT modify session_active", async () => {
      const result = await executeHook("pre_tool_use", {
        tool_name: "Read",
        tool_input: { file_path: "/test/file.ts" }
      });

      expect(result.success).toBe(true);
      expect(result.beforeState!.session_active).toBe(true);
      expect(result.afterState!.session_active).toBe(true);

      const validation = validateSessionActiveMutation(
        "pre_tool_use", 
        result.beforeState, 
        result.afterState
      );
      
      expect(validation.valid).toBe(true);
      expect(validation.error).toBeUndefined();
    });

    test("post_tool_use hook should NOT modify session_active", async () => {
      const result = await executeHook("post_tool_use", {
        tool_name: "Read",
        tool_input: { file_path: "/test/file.ts" },
        tool_response: { content: "file content" }
      });

      expect(result.success).toBe(true);
      expect(result.beforeState!.session_active).toBe(true);
      expect(result.afterState!.session_active).toBe(true);

      const validation = validateSessionActiveMutation(
        "post_tool_use", 
        result.beforeState, 
        result.afterState
      );
      
      expect(validation.valid).toBe(true);
      expect(validation.error).toBeUndefined();
    });

    test("notification hook should NOT modify session_active", async () => {
      const result = await executeHook("notification", {
        message: "Task completed successfully"
      });

      expect(result.success).toBe(true);
      expect(result.beforeState!.session_active).toBe(true);
      expect(result.afterState!.session_active).toBe(true);

      const validation = validateSessionActiveMutation(
        "notification", 
        result.beforeState, 
        result.afterState
      );
      
      expect(validation.valid).toBe(true);
      expect(validation.error).toBeUndefined();
    });

    // THIS TEST SHOULD FAIL - exposes the bug
    test("stop hook should NOT modify session_active (BUG: currently FAILS)", async () => {
      const result = await executeHook("stop", {
        stop_hook_active: true,
        transcript_path: "/path/to/transcript.md"
      });

      expect(result.success).toBe(true);
      
      // The bug: handleStop() incorrectly sets session_active = false on line 419
      // This should remain true, but currently changes to false
      expect(result.beforeState!.session_active).toBe(true);
      
      // THIS ASSERTION WILL FAIL - this is the bug we're exposing
      expect(result.afterState!.session_active).toBe(true); // Should stay true
      
      const validation = validateSessionActiveMutation(
        "stop", 
        result.beforeState, 
        result.afterState
      );
      
      // THIS ASSERTION WILL FAIL - validation should pass but currently fails
      expect(validation.valid).toBe(true);
      expect(validation.error).toBeUndefined();
      
      // Log the bug for debugging
      if (!validation.valid) {
        console.log("🐛 BUG DETECTED:", validation.details);
        console.log("🐛 CONTRACT VIOLATION:", validation.error);
        console.log("🐛 LOCATION: .specstar/hooks.ts line 419 - handleStop() function");
        console.log("🐛 EXPECTED: stop hook should NOT modify session_active");
        console.log("🐛 ACTUAL: stop hook incorrectly sets session_active = false");
      }
    });
  });

  describe("Edge Cases and Error Scenarios", () => {
    test("hooks should work even when session state doesn't exist initially", async () => {
      // Don't initialize session first - test cold start
      const result = await executeHook("user_prompt_submit", {
        prompt: "First prompt"
      });

      expect(result.success).toBe(true);
      expect(result.beforeState).toBeNull();
      expect(result.afterState).not.toBeNull();
      
      // Should initialize with session_active = false (only session_start sets it to true)
      expect(result.afterState!.session_active).toBe(false);
      
      const validation = validateSessionActiveMutation(
        "user_prompt_submit", 
        result.beforeState, 
        result.afterState
      );
      
      // This is valid because false -> false (no change)
      expect(validation.valid).toBe(true);
    });

    test("multiple sequential hooks should maintain session_active consistency", async () => {
      // Start session
      await executeHook("session_start", { source: "claude-code" });
      
      // Execute several non-modifying hooks
      const hooks = [
        { type: "user_prompt_submit", data: { prompt: "Hello" } },
        { type: "pre_tool_use", data: { tool_name: "Read", tool_input: {} } },
        { type: "post_tool_use", data: { tool_name: "Read", tool_input: {}, tool_response: {} } },
        { type: "notification", data: { message: "Done" } }
      ];

      for (const hook of hooks) {
        const result = await executeHook(hook.type, hook.data);
        
        expect(result.success).toBe(true);
        expect(result.afterState!.session_active).toBe(true);
        
        const validation = validateSessionActiveMutation(
          hook.type, 
          result.beforeState, 
          result.afterState
        );
        
        expect(validation.valid).toBe(true, 
          `Hook ${hook.type} violated session_active contract: ${validation.error}`);
      }
    });
  });

  describe("Contract Validation Integration", () => {
    test("SessionActiveContract.canModifySessionActive aligns with actual hook behavior", () => {
      const testCases = [
        { hook: "session_start", canModify: true },
        { hook: "session_end", canModify: true },
        { hook: "stop", canModify: false }, // This is what SHOULD be the case
        { hook: "user_prompt_submit", canModify: false },
        { hook: "pre_tool_use", canModify: false },
        { hook: "post_tool_use", canModify: false },
        { hook: "notification", canModify: false },
      ];

      testCases.forEach(({ hook, canModify }) => {
        const result = SessionActiveContract.canModifySessionActive(hook);
        expect(result).toBe(canModify, 
          `Contract mismatch for ${hook}: expected ${canModify}, got ${result}`);
      });
    });

    test("all Claude Code hook types are covered by the contract", () => {
      const hookTypes = [
        "session_start", 
        "user_prompt_submit", 
        "pre_tool_use", 
        "post_tool_use",
        "notification", 
        "pre_compact", 
        "session_end", 
        "stop", 
        "subagent_stop"
      ];

      hookTypes.forEach(hookType => {
        // Should not throw and should return boolean
        const canModify = SessionActiveContract.canModifySessionActive(hookType);
        expect(typeof canModify).toBe("boolean");
        
        // Should return valid expected state or null
        const expectedState = SessionActiveContract.getExpectedActiveState(hookType);
        expect([true, false, null]).toContain(expectedState);
        
        // Validation should work
        const validation = SessionActiveContract.validateMutation(hookType, true, true);
        expect(validation).toHaveProperty("valid");
        expect(typeof validation.valid).toBe("boolean");
      });
    });
  });

  describe("Bug Documentation and Reproduction", () => {
    test("demonstrates the exact bug in handleStop function", async () => {
      // Start with active session
      await executeHook("session_start", { source: "claude-code" });
      
      const result = await executeHook("stop", {
        stop_hook_active: true,
        transcript_path: "/path/to/transcript.md"  
      });

      // Document the bug
      const bugReport = {
        location: ".specstar/hooks.ts:419",
        function: "handleStop()",
        issue: "Incorrectly sets state.session_active = false",
        contract_violation: "Only session_start and session_end should modify session_active",
        expected_behavior: "stop hook should NOT modify session_active field",
        actual_behavior: "stop hook sets session_active to false",
        session_id: testSessionId,
        before_state: result.beforeState?.session_active,
        after_state: result.afterState?.session_active,
        timestamp: new Date().toISOString()
      };

      // This test documents the bug - it will fail until fixed
      expect(result.beforeState!.session_active).toBe(true);
      expect(result.afterState!.session_active).toBe(true); // FAILS: actually becomes false
      
      // Log comprehensive bug details
      console.log("\n🚨 SESSION_ACTIVE MUTATION BUG DETECTED 🚨");
      console.log(JSON.stringify(bugReport, null, 2));
      console.log("\n📋 TO FIX: Remove line 419 from .specstar/hooks.ts");
      console.log("❌ Current: state.session_active = false;");
      console.log("✅ Fixed:   // Remove this line entirely");
    });
  });
});