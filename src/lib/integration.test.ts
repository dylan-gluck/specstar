#!/usr/bin/env bun
/**
 * Integration Test Suite for Specstar Features
 * 
 * Tests:
 * - Hooks template generation
 * - Claude Code settings integration
 * - File system watching with debouncing
 * - Atomic state management
 */

import { test, describe, expect, beforeAll, afterAll } from "bun:test";
import { join, dirname } from "path";
import { rm, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { $ } from "bun";

// Import components
import ConfigManager from "./config-manager";
import HookIntegrator from "./hook-integrator";
import SessionMonitor from "./session-monitor";
import { FileWatcher } from "./session-monitor/watcher";
import { StateManager } from "./hook-integrator/state-manager";

// Test directories
const TEST_DIR = join(import.meta.dir, "../../.test-integration");
const PROJECT_DIR = join(TEST_DIR, "test-project");
const SPECSTAR_DIR = join(PROJECT_DIR, ".specstar");

describe("Specstar Integration Tests", () => {
  // Setup and teardown
  beforeAll(async () => {
    // Clean up any existing test directory
    if (existsSync(TEST_DIR)) {
      await rm(TEST_DIR, { recursive: true, force: true });
    }
    
    // Create test directories
    await mkdir(TEST_DIR, { recursive: true });
    await mkdir(PROJECT_DIR, { recursive: true });
  });
  
  afterAll(async () => {
    // Clean up test directory
    if (existsSync(TEST_DIR)) {
      await rm(TEST_DIR, { recursive: true, force: true });
    }
  });
  
  describe("ConfigManager Integration", () => {
    test("should initialize .specstar directory with comprehensive hooks template", async () => {
      const configManager = new ConfigManager({
        configPath: SPECSTAR_DIR
      });
      
      // Initialize the project
      await configManager.init(PROJECT_DIR, {
        updateClaudeSettings: false // Don't modify real Claude settings during test
      });
      
      // Check that all files were created
      expect(existsSync(SPECSTAR_DIR)).toBe(true);
      expect(existsSync(join(SPECSTAR_DIR, "settings.json"))).toBe(true);
      expect(existsSync(join(SPECSTAR_DIR, "hooks.ts"))).toBe(true);
      expect(existsSync(join(SPECSTAR_DIR, "sessions"))).toBe(true);
      expect(existsSync(join(SPECSTAR_DIR, ".gitignore"))).toBe(true);
      
      // Load and validate the configuration
      const config = await configManager.load();
      expect(config.version).toBe("1.0.0");
      expect(config.sessionPath).toBe(".specstar/sessions");
      
      // Check hooks.ts content
      const hooksFile = await Bun.file(join(SPECSTAR_DIR, "hooks.ts")).text();
      expect(hooksFile).toContain("export async function beforeSession");
      expect(hooksFile).toContain("export async function afterSession");
      expect(hooksFile).toContain("export async function onFileChange");
      expect(hooksFile).toContain("export async function onCommand");
      expect(hooksFile).toContain("export async function onError");
      expect(hooksFile).toContain("SessionContext");
      expect(hooksFile).toContain("FileChangeEvent");
      expect(hooksFile).toContain("CommandEvent");
    });
    
    test("should validate configuration correctly", async () => {
      const configManager = new ConfigManager({
        configPath: SPECSTAR_DIR
      });
      
      // Valid configuration
      const validConfig = {
        version: "1.0.0",
        sessionPath: ".specstar/sessions",
        folders: [{title: "Docs", path: "docs"}],  // Replace hooks with folders
        theme: "dark" as const,
        autoStart: true,
        logLevel: "info" as const
      };
      
      expect(configManager.validate(validConfig)).toBe(true);
      
      // Invalid configurations
      expect(configManager.validate({})).toBe(false); // Missing version
      expect(configManager.validate({ version: "" })).toBe(false); // Empty version
      expect(configManager.validate({ version: "1.0", theme: "invalid" })).toBe(false); // Invalid theme
    });
  });
  
  describe("HookIntegrator Integration", () => {
    test("should load and execute hooks from generated template", async () => {
      const hooksPath = join(SPECSTAR_DIR, "hooks.ts");
      const hookIntegrator = new HookIntegrator({
        hooksPath,
        isolateErrors: true
      });
      
      // Load hooks
      await hookIntegrator.load();
      
      // Check that hooks are registered
      const registeredEvents = hookIntegrator.getRegisteredEvents();
      expect(registeredEvents).toContain("beforeSession");
      expect(registeredEvents).toContain("afterSession");
      expect(registeredEvents).toContain("onFileChange");
      expect(registeredEvents).toContain("onCommand");
      expect(registeredEvents).toContain("onError");
      
      // Test hook execution
      let beforeSessionCalled = false;
      let afterSessionCalled = false;
      
      // Override console.log to capture output
      const originalLog = console.log;
      const logs: string[] = [];
      console.log = (...args: any[]) => {
        logs.push(args.join(" "));
        if (args[0]?.includes("Starting Specstar session")) {
          beforeSessionCalled = true;
        }
        if (args[0]?.includes("Session completed")) {
          afterSessionCalled = true;
        }
      };
      
      try {
        // Trigger hooks
        await hookIntegrator.triggerHook({
          type: "beforeSession",
          timestamp: new Date().toISOString(),
          data: {
            sessionId: "test-session-123",
            projectPath: PROJECT_DIR,
            startTime: new Date()
          }
        });
        
        await hookIntegrator.triggerHook({
          type: "afterSession",
          timestamp: new Date().toISOString(),
          data: {
            sessionId: "test-session-123",
            projectPath: PROJECT_DIR,
            startTime: new Date(),
            endTime: new Date(),
            stats: {
              duration: 60000,
              filesChanged: 5,
              commandsExecuted: 10
            }
          }
        });
        
        // Verify hooks were called
        expect(beforeSessionCalled).toBe(true);
        expect(afterSessionCalled).toBe(true);
        expect(logs.some(log => log.includes("test-session-123"))).toBe(true);
        
      } finally {
        console.log = originalLog;
      }
    });
    
    test("should handle hook errors gracefully", async () => {
      const hookIntegrator = new HookIntegrator({
        hooksPath: join(SPECSTAR_DIR, "hooks.ts"),
        isolateErrors: true
      });
      
      // Register a failing hook
      hookIntegrator.registerHook("testHook", async () => {
        throw new Error("Test error");
      });
      
      // Should not throw when errors are isolated
      await expect(
        hookIntegrator.triggerHook("testHook")
      ).resolves.toBeUndefined();
      
      // Test with isolateErrors = false
      const strictIntegrator = new HookIntegrator({
        hooksPath: join(SPECSTAR_DIR, "hooks.ts"),
        isolateErrors: false
      });
      
      strictIntegrator.registerHook("testHook", async () => {
        throw new Error("Test error");
      });
      
      // Should throw when errors are not isolated
      await expect(
        strictIntegrator.triggerHook("testHook")
      ).rejects.toThrow("Test error");
    });
  });
  
  describe("FileWatcher Integration", () => {
    test("should watch files with debouncing", async () => {
      const watchDir = join(PROJECT_DIR, "watch-test");
      await mkdir(watchDir, { recursive: true });
      
      const events: any[] = [];
      const watcher = new FileWatcher({
        paths: [watchDir],
        patterns: ["**/*.txt"],
        debounceDelay: 50,
        recursive: true
      });
      
      watcher.on("all", (event) => {
        events.push(event);
      });
      
      await watcher.start();
      
      // Wait for ready event
      await new Promise(resolve => watcher.once("ready", resolve));
      
      // Create multiple files rapidly
      const testFile1 = join(watchDir, "test1.txt");
      const testFile2 = join(watchDir, "test2.txt");
      
      await Bun.write(testFile1, "content1");
      await Bun.write(testFile2, "content2");
      
      // Modify files rapidly
      for (let i = 0; i < 5; i++) {
        await Bun.write(testFile1, `updated ${i}`);
        await Bun.sleep(10); // Less than debounce delay
      }
      
      // Wait for debounce
      await Bun.sleep(100);
      
      // Check that events were debounced
      const test1Events = events.filter(e => e.path === testFile1);
      expect(test1Events.length).toBeLessThan(6); // Should be debounced
      
      // Check stats
      const stats = watcher.getStats();
      expect(stats.fileCount).toBeGreaterThanOrEqual(2);
      expect(stats.eventCount).toBeGreaterThan(0);
      
      await watcher.stop();
    });
    
    test("should respect ignore patterns", async () => {
      const watchDir = join(PROJECT_DIR, "ignore-test");
      await mkdir(join(watchDir, "node_modules"), { recursive: true });
      
      const events: any[] = [];
      const watcher = new FileWatcher({
        paths: [watchDir],
        ignore: ["**/node_modules/**"],
        debounceDelay: 50
      });
      
      watcher.on("all", (event) => {
        events.push(event);
      });
      
      await watcher.start();
      await new Promise(resolve => watcher.once("ready", resolve));
      
      // Create files
      await Bun.write(join(watchDir, "included.txt"), "content");
      await Bun.write(join(watchDir, "node_modules", "ignored.txt"), "content");
      
      await Bun.sleep(100);
      
      // Check that node_modules file was ignored
      const ignoredEvents = events.filter(e => 
        e.path.includes("node_modules")
      );
      expect(ignoredEvents.length).toBe(0);
      
      const includedEvents = events.filter(e => 
        e.path.includes("included.txt")
      );
      expect(includedEvents.length).toBeGreaterThan(0);
      
      await watcher.stop();
    });
  });
  
  describe("StateManager Integration", () => {
    test("should manage state atomically with transactions", async () => {
      const statePath = join(PROJECT_DIR, "state.json");
      const stateManager = new StateManager({
        statePath,
        initialState: { counter: 0, items: [] },
        keepHistory: true,
        useWAL: true
      });
      
      await stateManager.initialize();
      
      // Execute multiple transactions
      await stateManager.executeTransaction(async (tx) => {
        tx.set(["counter"], 1);
      });
      
      await stateManager.executeTransaction(async (tx) => {
        tx.update([], { items: ["item1", "item2"] });
      });
      
      // Verify state
      const state = stateManager.getState();
      expect(state.counter).toBe(1);
      expect((state as any).items).toEqual(["item1", "item2"]);
      
      // Check history
      const history = stateManager.getHistory();
      expect(history.length).toBeGreaterThan(0);
      
      // Test rollback on error
      await expect(
        stateManager.executeTransaction(async (tx) => {
          tx.set(["counter"], 999);
          throw new Error("Rollback test");
        })
      ).rejects.toThrow("Rollback test");
      
      // State should not have changed
      const stateAfterRollback = stateManager.getState();
      expect(stateAfterRollback.counter).toBe(1);
      
      await stateManager.destroy();
    });
    
    test("should handle concurrent access with locks", async () => {
      const statePath = join(PROJECT_DIR, "locked-state.json");
      const stateManager = new StateManager({
        statePath,
        initialState: { value: 0 }
      });
      
      await stateManager.initialize();
      
      // Acquire lock
      const lock1 = await stateManager.acquireLock("user1", 1000);
      
      // Try to acquire another lock (should fail)
      await expect(
        stateManager.acquireLock("user2", 1000)
      ).rejects.toThrow(/locked by user1/);
      
      // Release lock
      stateManager.releaseLock(lock1.id);
      
      // Now should be able to acquire
      const lock2 = await stateManager.acquireLock("user2", 1000);
      expect(lock2.holder).toBe("user2");
      
      stateManager.releaseLock(lock2.id);
      await stateManager.destroy();
    });
    
    test("should create and restore snapshots", async () => {
      const statePath = join(PROJECT_DIR, "snapshot-state.json");
      const stateManager = new StateManager({
        statePath,
        initialState: { version: 1, data: "original" }
      });
      
      await stateManager.initialize();
      
      // Create snapshot
      const snapshot = await stateManager.createSnapshot({
        reason: "Before changes"
      });
      
      // Modify state
      await stateManager.update({ version: 2, data: "modified" });
      
      // Verify modification
      let state = stateManager.getState();
      expect(state.version).toBe(2);
      expect(state.data).toBe("modified");
      
      // Restore snapshot
      await stateManager.restoreSnapshot(snapshot.id);
      
      // Verify restoration
      state = stateManager.getState();
      expect(state.version).toBe(1);
      expect(state.data).toBe("original");
      
      await stateManager.destroy();
    });
  });
  
  describe("Full Integration", () => {
    test("should integrate all components together", async () => {
      // Initialize config
      const configManager = new ConfigManager({
        configPath: join(PROJECT_DIR, ".specstar-full")
      });
      
      await configManager.init(PROJECT_DIR, {
        updateClaudeSettings: false
      });
      
      // Set up session monitor
      const sessionMonitor = new SessionMonitor({
        sessionPath: join(PROJECT_DIR, ".specstar-full", "sessions"),
        claudePath: join(PROJECT_DIR, ".claude"),
        pollingInterval: 100,
        debounceDelay: 50
      });
      
      // Set up hook integrator
      const hookIntegrator = new HookIntegrator({
        hooksPath: join(PROJECT_DIR, ".specstar-full", "hooks.ts"),
        isolateErrors: true
      });
      
      await hookIntegrator.load();
      sessionMonitor.setHookIntegrator(hookIntegrator);
      
      // Set up state manager
      const stateManager = new StateManager({
        statePath: join(PROJECT_DIR, ".specstar-full", "app-state.json"),
        initialState: {
          sessions: [],
          currentSession: null,
          stats: {
            totalSessions: 0,
            totalDuration: 0
          }
        },
        autoSaveInterval: 1000
      });
      
      await stateManager.initialize();
      
      // Set up file watcher
      const fileWatcher = new FileWatcher({
        paths: [PROJECT_DIR],
        patterns: ["**/*.{ts,tsx,js,jsx}"],
        ignore: ["**/node_modules/**", "**/.specstar-full/**"],
        debounceDelay: 100
      });
      
      // Wire up events
      let fileChangeCount = 0;
      fileWatcher.on("all", async (event) => {
        fileChangeCount++;
        
        // Update state
        await stateManager.executeTransaction(async (tx) => {
          const state = stateManager.getState();
          tx.update([], {
            stats: {
              ...state.stats,
              lastFileChange: event.path,
              fileChangeCount
            }
          });
        });
        
        // Trigger hook
        await hookIntegrator.triggerHook({
          type: "onFileChange",
          timestamp: new Date().toISOString(),
          data: {
            type: event.type === "add" ? "create" : 
                  event.type === "change" ? "modify" : "delete",
            path: event.path,
            timestamp: event.timestamp,
            sessionId: "integration-test"
          }
        });
      });
      
      // Start services
      await sessionMonitor.start();
      await fileWatcher.start();
      
      // Simulate activity
      const testFile = join(PROJECT_DIR, "integration-test.js");
      await Bun.write(testFile, "console.log('test');");
      await Bun.sleep(150); // Wait for debounce
      
      // Verify integration
      const finalState = stateManager.getState();
      expect(fileChangeCount).toBeGreaterThan(0);
      expect((finalState.stats as any)?.lastFileChange).toContain("integration-test.js");
      
      // Clean up
      await fileWatcher.stop();
      await sessionMonitor.stop();
      await stateManager.destroy();
    });
  });
});

// Run tests if executed directly
if (import.meta.main) {
  console.log("Running Specstar Integration Tests...\n");
}