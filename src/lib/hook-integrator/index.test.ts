import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { HookIntegrator } from "./index";
import type { HookEvent } from "./index";
import path from "path";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";

describe("HookIntegrator", () => {
  let tempDir: string;
  let hooksPath: string;

  beforeEach(async () => {
    // Create temporary directory for test hooks
    tempDir = await mkdtemp(path.join(tmpdir(), "hook-test-"));
    hooksPath = path.join(tempDir, "hooks.ts");
  });

  afterEach(async () => {
    // Clean up temporary directory
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("constructor", () => {
    test("accepts string path", () => {
      const integrator = new HookIntegrator("/path/to/hooks.ts");
      expect(integrator).toBeDefined();
    });

    test("accepts options object", () => {
      const integrator = new HookIntegrator({
        hooksPath: "/path/to/hooks.ts",
        isolateErrors: false
      });
      expect(integrator).toBeDefined();
    });
  });

  describe("registerHook", () => {
    test("registers a hook handler", () => {
      const integrator = new HookIntegrator(hooksPath);
      const handler = mock(() => {});
      
      integrator.registerHook("beforeSession", handler);
      expect(integrator.hasHandlers("beforeSession")).toBe(true);
    });

    test("allows multiple handlers for same event", () => {
      const integrator = new HookIntegrator(hooksPath);
      const handler1 = mock(() => {});
      const handler2 = mock(() => {});
      
      integrator.registerHook("beforeSession", handler1);
      integrator.registerHook("beforeSession", handler2);
      
      expect(integrator.getHandlerCount("beforeSession")).toBe(2);
    });

    test("throws error for non-function handler", () => {
      const integrator = new HookIntegrator(hooksPath);
      
      expect(() => {
        // @ts-ignore - testing invalid input
        integrator.registerHook("beforeSession", "not a function");
      }).toThrow('Hook handler for event "beforeSession" must be a function');
    });
  });

  describe("triggerHook", () => {
    test("triggers registered hook with string event", async () => {
      const integrator = new HookIntegrator(hooksPath);
      const handler = mock(() => {});
      
      integrator.registerHook("beforeSession", handler);
      await integrator.triggerHook("beforeSession");
      
      expect(handler).toHaveBeenCalledTimes(1);
      const call = handler.mock.calls[0] as any;
      expect(call?.[0]).toMatchObject({
        type: "beforeSession",
        data: {}
      });
    });

    test("triggers registered hook with HookEvent object", async () => {
      const integrator = new HookIntegrator(hooksPath);
      const handler = mock(() => {});
      
      integrator.registerHook("onFileChange", handler);
      
      const event: HookEvent = {
        type: "onFileChange",
        timestamp: new Date().toISOString(),
        data: { file: "/path/to/file.ts" }
      };
      
      await integrator.triggerHook(event);
      
      expect(handler).toHaveBeenCalledWith(event);
    });

    test("handles async hooks", async () => {
      const integrator = new HookIntegrator(hooksPath);
      let resolved = false;
      
      const asyncHandler = mock(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        resolved = true;
      });
      
      integrator.registerHook("afterSession", asyncHandler);
      await integrator.triggerHook("afterSession");
      
      expect(resolved).toBe(true);
      expect(asyncHandler).toHaveBeenCalledTimes(1);
    });

    test("isolates errors by default", async () => {
      const integrator = new HookIntegrator(hooksPath);
      const errorHandler = mock(() => {
        throw new Error("Test error");
      });
      const successHandler = mock(() => {});
      
      integrator.registerHook("onCommand", errorHandler);
      integrator.registerHook("onCommand", successHandler);
      
      // Should not throw
      await integrator.triggerHook("onCommand");
      
      expect(errorHandler).toHaveBeenCalledTimes(1);
      expect(successHandler).toHaveBeenCalledTimes(1);
    });

    test("propagates errors when isolation is disabled", async () => {
      const integrator = new HookIntegrator({
        hooksPath,
        isolateErrors: false
      });
      
      const errorHandler = mock(() => {
        throw new Error("Test error");
      });
      
      integrator.registerHook("onCommand", errorHandler);
      
      await expect(integrator.triggerHook("onCommand")).rejects.toThrow("Test error");
    });

    test("triggers onError hook when error occurs", async () => {
      const integrator = new HookIntegrator(hooksPath);
      const errorHandler = mock(() => {
        throw new Error("Test error");
      });
      const onErrorHandler = mock(() => {});
      
      integrator.registerHook("beforeSession", errorHandler);
      integrator.registerHook("onError", onErrorHandler);
      
      await integrator.triggerHook("beforeSession");
      
      expect(onErrorHandler).toHaveBeenCalledTimes(1);
      const errorEvent = (onErrorHandler.mock.calls[0] as any)?.[0];
      expect(errorEvent?.type).toBe("onError");
      expect(errorEvent?.data.originalEvent).toBe("beforeSession");
      expect(errorEvent?.data.error.message).toBe("Test error");
    });
  });

  describe("loadHooks", () => {
    test("loads hooks from file", async () => {
      const hookCode = `
        export default {
          beforeSession: (event) => {
            console.log('Before session:', event);
          },
          afterSession: async (event) => {
            console.log('After session:', event);
          }
        };
      `;
      
      await writeFile(hooksPath, hookCode);
      
      const integrator = new HookIntegrator(hooksPath);
      await integrator.loadHooks();
      
      expect(integrator.hasHandlers("beforeSession")).toBe(true);
      expect(integrator.hasHandlers("afterSession")).toBe(true);
    });

    test("handles named exports", async () => {
      const hookCode = `
        export const beforeSession = (event) => {
          console.log('Before session:', event);
        };
        
        export const onFileChange = (event) => {
          console.log('File changed:', event);
        };
      `;
      
      await writeFile(hooksPath, hookCode);
      
      const integrator = new HookIntegrator(hooksPath);
      await integrator.loadHooks();
      
      expect(integrator.hasHandlers("beforeSession")).toBe(true);
      expect(integrator.hasHandlers("onFileChange")).toBe(true);
    });

    test("warns when hooks file doesn't exist", async () => {
      const originalWarn = console.warn;
      const warnCalls: any[] = [];
      console.warn = (...args: any[]) => warnCalls.push(args);
      
      const integrator = new HookIntegrator("/nonexistent/hooks.ts");
      await integrator.loadHooks();
      
      console.warn = originalWarn;
      
      expect(warnCalls.length).toBeGreaterThan(0);
      expect(warnCalls[0][0]).toContain("Hooks file not found");
    });

    test("validates hook handlers", async () => {
      const hookCode = `
        export default {
          beforeSession: "not a function",
          afterSession: () => {},
          customHook: () => {}
        };
      `;
      
      await writeFile(hooksPath, hookCode);
      
      const originalWarn = console.warn;
      const warnCalls: any[] = [];
      console.warn = (...args: any[]) => warnCalls.push(args);
      
      const integrator = new HookIntegrator(hooksPath);
      await integrator.loadHooks();
      
      console.warn = originalWarn;
      
      // Should skip invalid handler
      expect(integrator.hasHandlers("beforeSession")).toBe(false);
      expect(integrator.hasHandlers("afterSession")).toBe(true);
      
      // Should warn about unknown hook type
      const unknownWarning = warnCalls.find(args => 
        args[0]?.includes("Unknown hook event type")
      );
      expect(unknownWarning).toBeDefined();
      expect(unknownWarning[0]).toContain("customHook");
    });
  });

  describe("utility methods", () => {
    test("clearHooks removes all handlers", () => {
      const integrator = new HookIntegrator(hooksPath);
      integrator.registerHook("beforeSession", () => {});
      integrator.registerHook("afterSession", () => {});
      
      expect(integrator.getRegisteredEvents()).toHaveLength(2);
      
      integrator.clearHooks();
      
      expect(integrator.getRegisteredEvents()).toHaveLength(0);
    });

    test("getRegisteredEvents returns event list", () => {
      const integrator = new HookIntegrator(hooksPath);
      integrator.registerHook("beforeSession", () => {});
      integrator.registerHook("onFileChange", () => {});
      
      const events = integrator.getRegisteredEvents();
      
      expect(events).toContain("beforeSession");
      expect(events).toContain("onFileChange");
      expect(events).toHaveLength(2);
    });

    test("hasHandlers checks for handlers", () => {
      const integrator = new HookIntegrator(hooksPath);
      
      expect(integrator.hasHandlers("beforeSession")).toBe(false);
      
      integrator.registerHook("beforeSession", () => {});
      
      expect(integrator.hasHandlers("beforeSession")).toBe(true);
    });

    test("removeHandlers removes specific event handlers", () => {
      const integrator = new HookIntegrator(hooksPath);
      integrator.registerHook("beforeSession", () => {});
      integrator.registerHook("afterSession", () => {});
      
      integrator.removeHandlers("beforeSession");
      
      expect(integrator.hasHandlers("beforeSession")).toBe(false);
      expect(integrator.hasHandlers("afterSession")).toBe(true);
    });

    test("getHandlerCount returns handler count", () => {
      const integrator = new HookIntegrator(hooksPath);
      
      expect(integrator.getHandlerCount("beforeSession")).toBe(0);
      
      integrator.registerHook("beforeSession", () => {});
      integrator.registerHook("beforeSession", () => {});
      
      expect(integrator.getHandlerCount("beforeSession")).toBe(2);
    });
  });

  describe("integration", () => {
    test("full workflow with file loading and triggering", async () => {
      // Setup global test results array
      (globalThis as any).testResults = [];
      
      const hookCode = `
        export default {
          beforeSession: (event) => {
            globalThis.testResults = globalThis.testResults || [];
            globalThis.testResults.push('before:' + event.type);
          },
          afterSession: async (event) => {
            globalThis.testResults = globalThis.testResults || [];
            await new Promise(r => setTimeout(r, 1));
            globalThis.testResults.push('after:' + event.type);
          },
          onFileChange: (event) => {
            globalThis.testResults = globalThis.testResults || [];
            globalThis.testResults.push('file:' + event.data.file);
          }
        };
      `;
      
      await writeFile(hooksPath, hookCode);
      
      const integrator = new HookIntegrator(hooksPath);
      await integrator.load();
      
      // Trigger hooks
      await integrator.triggerHook("beforeSession");
      await integrator.triggerHook({
        type: "onFileChange",
        timestamp: new Date().toISOString(),
        data: { file: "test.ts" }
      });
      await integrator.triggerHook("afterSession");
      
      // Check results through global (for test purposes)
      expect((globalThis as any).testResults).toEqual([
        "before:beforeSession",
        "file:test.ts",
        "after:afterSession"
      ]);
      
      // Clean up
      delete (globalThis as any).testResults;
    });
  });
});