/**
 * SessionActiveContract Tests
 * 
 * TDD Tests for SessionActiveContract - these tests MUST FAIL initially
 * before implementation exists or is correct.
 * 
 * Tests the critical contract that governs which hooks can modify
 * session_active state and validates state transitions.
 */

import { describe, test, expect } from "bun:test";
import { SessionActiveContract } from "../../specs/003-current-status-the/contracts/hook-contracts";

describe("SessionActiveContract", () => {
  
  describe("canModifySessionActive()", () => {
    test("returns true for session_start hook", () => {
      const result = SessionActiveContract.canModifySessionActive("session_start");
      expect(result).toBe(true);
    });

    test("returns true for session_end hook", () => {
      const result = SessionActiveContract.canModifySessionActive("session_end");
      expect(result).toBe(true);
    });

    test("returns false for tool_use hook", () => {
      const result = SessionActiveContract.canModifySessionActive("tool_use");
      expect(result).toBe(false);
    });

    test("returns false for file_read hook", () => {
      const result = SessionActiveContract.canModifySessionActive("file_read");
      expect(result).toBe(false);
    });

    test("returns false for file_write hook", () => {
      const result = SessionActiveContract.canModifySessionActive("file_write");
      expect(result).toBe(false);
    });

    test("returns false for file_edit hook", () => {
      const result = SessionActiveContract.canModifySessionActive("file_edit");
      expect(result).toBe(false);
    });

    test("returns false for agent_start hook", () => {
      const result = SessionActiveContract.canModifySessionActive("agent_start");
      expect(result).toBe(false);
    });

    test("returns false for agent_complete hook", () => {
      const result = SessionActiveContract.canModifySessionActive("agent_complete");
      expect(result).toBe(false);
    });

    test("returns false for unknown hook types", () => {
      const result = SessionActiveContract.canModifySessionActive("unknown_hook");
      expect(result).toBe(false);
    });

    test("returns false for empty string hook type", () => {
      const result = SessionActiveContract.canModifySessionActive("");
      expect(result).toBe(false);
    });

    test("handles case sensitivity correctly", () => {
      expect(SessionActiveContract.canModifySessionActive("SESSION_START")).toBe(false);
      expect(SessionActiveContract.canModifySessionActive("Session_Start")).toBe(false);
      expect(SessionActiveContract.canModifySessionActive("session_START")).toBe(false);
    });
  });

  describe("getExpectedActiveState()", () => {
    test("returns true for session_start hook", () => {
      const result = SessionActiveContract.getExpectedActiveState("session_start");
      expect(result).toBe(true);
    });

    test("returns false for session_end hook", () => {
      const result = SessionActiveContract.getExpectedActiveState("session_end");
      expect(result).toBe(false);
    });

    test("returns null for tool_use hook", () => {
      const result = SessionActiveContract.getExpectedActiveState("tool_use");
      expect(result).toBe(null);
    });

    test("returns null for file_read hook", () => {
      const result = SessionActiveContract.getExpectedActiveState("file_read");
      expect(result).toBe(null);
    });

    test("returns null for file_write hook", () => {
      const result = SessionActiveContract.getExpectedActiveState("file_write");
      expect(result).toBe(null);
    });

    test("returns null for file_edit hook", () => {
      const result = SessionActiveContract.getExpectedActiveState("file_edit");
      expect(result).toBe(null);
    });

    test("returns null for agent_start hook", () => {
      const result = SessionActiveContract.getExpectedActiveState("agent_start");
      expect(result).toBe(null);
    });

    test("returns null for agent_complete hook", () => {
      const result = SessionActiveContract.getExpectedActiveState("agent_complete");
      expect(result).toBe(null);
    });

    test("returns null for unknown hook types", () => {
      const result = SessionActiveContract.getExpectedActiveState("unknown_hook");
      expect(result).toBe(null);
    });

    test("returns null for empty string hook type", () => {
      const result = SessionActiveContract.getExpectedActiveState("");
      expect(result).toBe(null);
    });

    test("handles case sensitivity correctly", () => {
      expect(SessionActiveContract.getExpectedActiveState("SESSION_START")).toBe(null);
      expect(SessionActiveContract.getExpectedActiveState("Session_End")).toBe(null);
    });
  });

  describe("validateMutation()", () => {
    
    describe("for non-modifying hooks", () => {
      test("allows tool_use hook when state remains unchanged (true -> true)", () => {
        const result = SessionActiveContract.validateMutation("tool_use", true, true);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      test("allows tool_use hook when state remains unchanged (false -> false)", () => {
        const result = SessionActiveContract.validateMutation("tool_use", false, false);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      test("rejects tool_use hook when state changes (true -> false)", () => {
        const result = SessionActiveContract.validateMutation("tool_use", true, false);
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Hook type 'tool_use' is not allowed to modify session_active");
      });

      test("rejects tool_use hook when state changes (false -> true)", () => {
        const result = SessionActiveContract.validateMutation("tool_use", false, true);
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Hook type 'tool_use' is not allowed to modify session_active");
      });

      test("rejects file_read hook when state changes", () => {
        const result = SessionActiveContract.validateMutation("file_read", true, false);
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Hook type 'file_read' is not allowed to modify session_active");
      });

      test("rejects file_write hook when state changes", () => {
        const result = SessionActiveContract.validateMutation("file_write", false, true);
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Hook type 'file_write' is not allowed to modify session_active");
      });

      test("rejects file_edit hook when state changes", () => {
        const result = SessionActiveContract.validateMutation("file_edit", true, false);
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Hook type 'file_edit' is not allowed to modify session_active");
      });

      test("rejects agent_start hook when state changes", () => {
        const result = SessionActiveContract.validateMutation("agent_start", false, true);
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Hook type 'agent_start' is not allowed to modify session_active");
      });

      test("rejects agent_complete hook when state changes", () => {
        const result = SessionActiveContract.validateMutation("agent_complete", true, false);
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Hook type 'agent_complete' is not allowed to modify session_active");
      });

      test("rejects unknown hook types when state changes", () => {
        const result = SessionActiveContract.validateMutation("unknown_hook", true, false);
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Hook type 'unknown_hook' is not allowed to modify session_active");
      });
    });

    describe("for session_start hook", () => {
      test("allows session_start hook when setting state to true (false -> true)", () => {
        const result = SessionActiveContract.validateMutation("session_start", false, true);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      test("allows session_start hook when setting state to true (true -> true)", () => {
        const result = SessionActiveContract.validateMutation("session_start", true, true);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      test("rejects session_start hook when setting state to false (true -> false)", () => {
        const result = SessionActiveContract.validateMutation("session_start", true, false);
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Hook type 'session_start' must set session_active to true");
      });

      test("rejects session_start hook when setting state to false (false -> false)", () => {
        const result = SessionActiveContract.validateMutation("session_start", false, false);
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Hook type 'session_start' must set session_active to true");
      });
    });

    describe("for session_end hook", () => {
      test("allows session_end hook when setting state to false (true -> false)", () => {
        const result = SessionActiveContract.validateMutation("session_end", true, false);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      test("allows session_end hook when setting state to false (false -> false)", () => {
        const result = SessionActiveContract.validateMutation("session_end", false, false);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      test("rejects session_end hook when setting state to true (false -> true)", () => {
        const result = SessionActiveContract.validateMutation("session_end", false, true);
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Hook type 'session_end' must set session_active to false");
      });

      test("rejects session_end hook when setting state to true (true -> true)", () => {
        const result = SessionActiveContract.validateMutation("session_end", true, true);
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Hook type 'session_end' must set session_active to false");
      });
    });

    describe("edge cases and error handling", () => {
      test("handles empty string hook type correctly", () => {
        const result = SessionActiveContract.validateMutation("", true, false);
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Hook type '' is not allowed to modify session_active");
      });

      test("error messages include exact hook type for debugging", () => {
        const result = SessionActiveContract.validateMutation("custom_hook_123", true, false);
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Hook type 'custom_hook_123' is not allowed to modify session_active");
      });

      test("error messages specify expected state value", () => {
        const result1 = SessionActiveContract.validateMutation("session_start", true, false);
        expect(result1.error).toBe("Hook type 'session_start' must set session_active to true");
        
        const result2 = SessionActiveContract.validateMutation("session_end", false, true);
        expect(result2.error).toBe("Hook type 'session_end' must set session_active to false");
      });

      test("validates return type structure", () => {
        const result = SessionActiveContract.validateMutation("session_start", false, true);
        expect(typeof result).toBe("object");
        expect(typeof result.valid).toBe("boolean");
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      test("validates return type structure for errors", () => {
        const result = SessionActiveContract.validateMutation("tool_use", true, false);
        expect(typeof result).toBe("object");
        expect(typeof result.valid).toBe("boolean");
        expect(result.valid).toBe(false);
        expect(typeof result.error).toBe("string");
        expect(result.error).toBeTruthy();
      });
    });

    describe("comprehensive state transition matrix", () => {
      const validTransitions = [
        // session_start: any -> true
        { hook: "session_start", from: false, to: true, valid: true },
        { hook: "session_start", from: true, to: true, valid: true },
        
        // session_end: any -> false
        { hook: "session_end", from: true, to: false, valid: true },
        { hook: "session_end", from: false, to: false, valid: true },
        
        // non-modifying hooks: no change
        { hook: "tool_use", from: true, to: true, valid: true },
        { hook: "tool_use", from: false, to: false, valid: true },
        { hook: "file_read", from: true, to: true, valid: true },
        { hook: "file_read", from: false, to: false, valid: true },
      ];

      const invalidTransitions = [
        // session_start: any -> false (invalid)
        { hook: "session_start", from: true, to: false, valid: false },
        { hook: "session_start", from: false, to: false, valid: false },
        
        // session_end: any -> true (invalid)
        { hook: "session_end", from: false, to: true, valid: false },
        { hook: "session_end", from: true, to: true, valid: false },
        
        // non-modifying hooks: any change (invalid)
        { hook: "tool_use", from: true, to: false, valid: false },
        { hook: "tool_use", from: false, to: true, valid: false },
        { hook: "file_read", from: true, to: false, valid: false },
        { hook: "file_read", from: false, to: true, valid: false },
        { hook: "file_write", from: true, to: false, valid: false },
        { hook: "file_write", from: false, to: true, valid: false },
        { hook: "agent_start", from: true, to: false, valid: false },
        { hook: "agent_start", from: false, to: true, valid: false },
      ];

      validTransitions.forEach(({ hook, from, to, valid }) => {
        test(`allows ${hook} hook: ${from} -> ${to}`, () => {
          const result = SessionActiveContract.validateMutation(hook, from, to);
          expect(result.valid).toBe(valid);
          expect(result.error).toBeUndefined();
        });
      });

      invalidTransitions.forEach(({ hook, from, to, valid }) => {
        test(`rejects ${hook} hook: ${from} -> ${to}`, () => {
          const result = SessionActiveContract.validateMutation(hook, from, to);
          expect(result.valid).toBe(valid);
          expect(result.error).toBeDefined();
          expect(typeof result.error).toBe("string");
          expect(result.error!.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe("contract class structure and methods", () => {
    test("SessionActiveContract exists and is a class", () => {
      expect(SessionActiveContract).toBeDefined();
      expect(typeof SessionActiveContract).toBe("function");
    });

    test("canModifySessionActive is a static method", () => {
      expect(typeof SessionActiveContract.canModifySessionActive).toBe("function");
      expect(SessionActiveContract.canModifySessionActive.length).toBe(1); // expects 1 parameter
    });

    test("getExpectedActiveState is a static method", () => {
      expect(typeof SessionActiveContract.getExpectedActiveState).toBe("function");
      expect(SessionActiveContract.getExpectedActiveState.length).toBe(1); // expects 1 parameter
    });

    test("validateMutation is a static method", () => {
      expect(typeof SessionActiveContract.validateMutation).toBe("function");
      expect(SessionActiveContract.validateMutation.length).toBe(3); // expects 3 parameters
    });
  });
});