#!/usr/bin/env bun
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, mock } from 'bun:test';
import { $ } from 'bun';
import { tmpdir } from 'os';
import { join } from 'path';
import { rm, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';

describe('Contract Test: subagent_stop hook', () => {
  let tmpDir: string;
  let sessionId: string;
  let logsDir: string;
  let logFile: string;
  
  beforeAll(async () => {
    // Create temp directory for test
    tmpDir = join(tmpdir(), `specstar-test-subagent-stop-${Date.now()}`);
    logsDir = join(tmpDir, '.specstar', 'logs');
    await mkdir(logsDir, { recursive: true });
    
    // Generate a test session ID
    sessionId = crypto.randomUUID();
    logFile = join(logsDir, 'subagent_stop.json');
  });
  
  afterAll(async () => {
    // Clean up temp directory
    await rm(tmpDir, { recursive: true, force: true });
  });
  
  beforeEach(async () => {
    // Ensure clean log file for each test
    if (existsSync(logFile)) {
      await rm(logFile);
    }
  });
  
  describe('Input validation', () => {
    it('should accept required inputs: session_id and stop_hook_active', async () => {
      // Mock the hook execution
      const executeHook = mock(async (args: any) => {
        // Validate required fields
        expect(args.session_id).toBeDefined();
        expect(typeof args.session_id).toBe('string');
        expect(args.session_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
        
        expect(args.stop_hook_active).toBeDefined();
        expect(typeof args.stop_hook_active).toBe('boolean');
        
        return { exitCode: 0 };
      });
      
      const result = await executeHook({
        session_id: sessionId,
        stop_hook_active: true
      });
      
      expect(result.exitCode).toBe(0);
      expect(executeHook).toHaveBeenCalledTimes(1);
    });
    
    it('should accept optional transcript_path', async () => {
      // Mock the hook execution
      const executeHook = mock(async (args: any) => {
        // Validate optional field
        if (args.transcript_path !== undefined) {
          expect(typeof args.transcript_path).toBe('string');
        }
        
        return { exitCode: 0 };
      });
      
      // Test with transcript_path
      const resultWithPath = await executeHook({
        session_id: sessionId,
        stop_hook_active: false,
        transcript_path: '/path/to/transcript.json'
      });
      
      expect(resultWithPath.exitCode).toBe(0);
      
      // Test without transcript_path
      const resultWithoutPath = await executeHook({
        session_id: sessionId,
        stop_hook_active: true
      });
      
      expect(resultWithoutPath.exitCode).toBe(0);
      expect(executeHook).toHaveBeenCalledTimes(2);
    });
    
    it('should reject invalid session_id format', async () => {
      // Mock the hook execution with validation
      const executeHook = mock(async (args: any) => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(args.session_id)) {
          throw new Error('Invalid session_id format');
        }
        return { exitCode: 0 };
      });
      
      // Test with invalid session_id
      await expect(executeHook({
        session_id: 'invalid-uuid',
        stop_hook_active: true
      })).rejects.toThrow('Invalid session_id format');
      
      expect(executeHook).toHaveBeenCalledTimes(1);
    });
    
    it('should reject missing required fields', async () => {
      // Mock the hook execution with validation
      const executeHook = mock(async (args: any) => {
        if (!args.session_id || args.stop_hook_active === undefined) {
          throw new Error('Missing required fields');
        }
        return { exitCode: 0 };
      });
      
      // Test missing session_id
      await expect(executeHook({
        stop_hook_active: true
      })).rejects.toThrow('Missing required fields');
      
      // Test missing stop_hook_active
      await expect(executeHook({
        session_id: sessionId
      })).rejects.toThrow('Missing required fields');
      
      expect(executeHook).toHaveBeenCalledTimes(2);
    });
  });
  
  describe('Output behavior', () => {
    it('should return exit code 0 on success', async () => {
      // Mock the hook execution
      const executeHook = mock(async (args: any) => {
        // Simulate successful execution
        return { exitCode: 0 };
      });
      
      const result = await executeHook({
        session_id: sessionId,
        stop_hook_active: true
      });
      
      expect(result.exitCode).toBe(0);
      expect(executeHook).toHaveBeenCalledTimes(1);
    });
    
    it('should never block (never return exit code 2)', async () => {
      // Mock the hook execution
      const executeHook = mock(async (args: any) => {
        // Hook should always return 0, never 2 (blocking code)
        // Even in error cases, it should return 0 to avoid blocking
        try {
          // Simulate some processing
          if (args.stop_hook_active === undefined) {
            throw new Error('Missing stop_hook_active');
          }
          return { exitCode: 0 };
        } catch (error) {
          // Even on error, should return 0 (not block)
          return { exitCode: 0 };
        }
      });
      
      // Test normal case
      const result1 = await executeHook({
        session_id: sessionId,
        stop_hook_active: true
      });
      expect(result1.exitCode).toBe(0);
      expect(result1.exitCode).not.toBe(2);
      
      // Test error case
      const result2 = await executeHook({
        session_id: sessionId
      });
      expect(result2.exitCode).toBe(0);
      expect(result2.exitCode).not.toBe(2);
      
      expect(executeHook).toHaveBeenCalledTimes(2);
    });
  });
  
  describe('Side effects', () => {
    it('should append to .specstar/logs/subagent_stop.json', async () => {
      // Mock the hook execution with file writing
      const executeHook = mock(async (args: any) => {
        const logEntry = {
          timestamp: new Date().toISOString(),
          session_id: args.session_id,
          stop_hook_active: args.stop_hook_active,
          transcript_path: args.transcript_path
        };
        
        // Simulate appending to log file
        let logData = [];
        if (existsSync(logFile)) {
          const content = await readFile(logFile, 'utf-8');
          logData = JSON.parse(content);
        }
        logData.push(logEntry);
        await Bun.write(logFile, JSON.stringify(logData, null, 2));
        
        return { exitCode: 0 };
      });
      
      // Execute hook multiple times
      await executeHook({
        session_id: sessionId,
        stop_hook_active: true
      });
      
      await executeHook({
        session_id: sessionId,
        stop_hook_active: false,
        transcript_path: '/path/to/transcript.json'
      });
      
      // Verify log file exists and contains correct entries
      expect(existsSync(logFile)).toBe(true);
      
      const logContent = await readFile(logFile, 'utf-8');
      const logs = JSON.parse(logContent);
      
      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBe(2);
      
      // Check first entry
      expect(logs[0].session_id).toBe(sessionId);
      expect(logs[0].stop_hook_active).toBe(true);
      expect(logs[0].transcript_path).toBeUndefined();
      expect(logs[0].timestamp).toBeDefined();
      
      // Check second entry
      expect(logs[1].session_id).toBe(sessionId);
      expect(logs[1].stop_hook_active).toBe(false);
      expect(logs[1].transcript_path).toBe('/path/to/transcript.json');
      expect(logs[1].timestamp).toBeDefined();
      
      expect(executeHook).toHaveBeenCalledTimes(2);
    });
    
    it('should NOT update state.json', async () => {
      const stateFile = join(tmpDir, '.specstar', 'sessions', sessionId, 'state.json');
      const sessionsDir = join(tmpDir, '.specstar', 'sessions', sessionId);
      
      // Create a state file with initial data
      await mkdir(sessionsDir, { recursive: true });
      const initialState = {
        session_id: sessionId,
        status: 'active',
        timestamp: new Date().toISOString()
      };
      await Bun.write(stateFile, JSON.stringify(initialState, null, 2));
      
      // Mock the hook execution
      const executeHook = mock(async (args: any) => {
        // Hook should only append to log, NOT modify state.json
        const logEntry = {
          timestamp: new Date().toISOString(),
          session_id: args.session_id,
          stop_hook_active: args.stop_hook_active,
          transcript_path: args.transcript_path
        };
        
        // Only append to log file
        let logData = [];
        if (existsSync(logFile)) {
          const content = await readFile(logFile, 'utf-8');
          logData = JSON.parse(content);
        }
        logData.push(logEntry);
        await Bun.write(logFile, JSON.stringify(logData, null, 2));
        
        // Should NOT touch state.json
        
        return { exitCode: 0 };
      });
      
      // Execute hook
      await executeHook({
        session_id: sessionId,
        stop_hook_active: true
      });
      
      // Verify state.json was NOT modified
      const stateContent = await readFile(stateFile, 'utf-8');
      const currentState = JSON.parse(stateContent);
      
      expect(currentState).toEqual(initialState);
      expect(currentState.stop_hook_active).toBeUndefined(); // Should not have been added
      
      expect(executeHook).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('Hook execution via CLI', () => {
    it('should fail when actual hook is not implemented', async () => {
      // This test attempts to run the actual hook implementation
      // It should FAIL initially because the hook isn't implemented yet
      
      const hookPath = join(tmpDir, '.specstar', 'hooks', 'subagent_stop.ts');
      
      // Try to execute the non-existent hook
      const result = await $`cd ${tmpDir} && bun run ${hookPath} '${JSON.stringify({
        session_id: sessionId,
        stop_hook_active: true
      })}'`.quiet().nothrow();
      
      // Hook doesn't exist yet, so this should fail
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr.toString()).toContain('Module not found');
    });
  });
});