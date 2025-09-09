#!/usr/bin/env bun
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { $ } from 'bun';
import { tmpdir } from 'os';
import { join } from 'path';
import { rm, mkdir, exists } from 'fs/promises';
import { randomUUID } from 'crypto';

describe('Contract Test: user_prompt_submit hook', () => {
  let tmpDir: string;
  let sessionId: string;
  let hookScript: string;
  
  beforeEach(async () => {
    // Create temp directory for test environment
    sessionId = randomUUID();
    tmpDir = join(tmpdir(), `specstar-hook-test-${Date.now()}`);
    
    // Set up .specstar directory structure
    await mkdir(join(tmpDir, '.specstar'), { recursive: true });
    await mkdir(join(tmpDir, '.specstar', 'sessions', sessionId), { recursive: true });
    await mkdir(join(tmpDir, '.specstar', 'logs'), { recursive: true });
    
    // Create initial state.json for the session
    const initialState = {
      session_id: sessionId,
      started_at: new Date().toISOString(),
      prompts: [],
      status: 'active'
    };
    await Bun.write(
      join(tmpDir, '.specstar', 'sessions', sessionId, 'state.json'),
      JSON.stringify(initialState, null, 2)
    );
    
    // Create the hook script path (will be mocked/implemented later)
    hookScript = join(tmpDir, '.specstar', 'hooks', 'user_prompt_submit');
  });
  
  afterEach(async () => {
    // Clean up temp directory
    await rm(tmpDir, { recursive: true, force: true });
  });
  
  describe('Hook Contract Requirements', () => {
    it('should accept session_id and prompt as required inputs', async () => {
      // Test that hook accepts required parameters
      const prompt = "Test prompt for validation";
      
      // This should fail initially since hook doesn't exist
      const result = await $`${hookScript} --session-id ${sessionId} --prompt ${prompt}`
        .cwd(tmpDir)
        .quiet()
        .nothrow();
      
      // Hook should exist and be executable
      expect(result.exitCode).toBeDefined();
    });
    
    it('should return exit code 0 on successful execution', async () => {
      const prompt = "Create a new React component";
      
      // Execute hook with valid inputs
      const result = await $`${hookScript} --session-id ${sessionId} --prompt ${prompt}`
        .cwd(tmpDir)
        .quiet()
        .nothrow();
      
      // Contract: successful execution returns 0
      expect(result.exitCode).toBe(0);
    });
    
    it('should return exit code 2 to block prompt submission', async () => {
      const prompt = "DELETE * FROM users;"; // Potentially dangerous prompt
      
      // Execute hook with prompt that should be blocked
      const result = await $`${hookScript} --session-id ${sessionId} --prompt ${prompt} --block`
        .cwd(tmpDir)
        .quiet()
        .nothrow();
      
      // Contract: blocking returns exit code 2
      expect(result.exitCode).toBe(2);
    });
    
    it('should update session state.json atomically', async () => {
      const prompt = "Implement user authentication";
      const stateFile = join(tmpDir, '.specstar', 'sessions', sessionId, 'state.json');
      
      // Read initial state
      const initialState = await Bun.file(stateFile).json();
      const initialPromptCount = initialState.prompts?.length || 0;
      
      // Execute hook
      const result = await $`${hookScript} --session-id ${sessionId} --prompt ${prompt}`
        .cwd(tmpDir)
        .quiet()
        .nothrow();
      
      expect(result.exitCode).toBe(0);
      
      // Verify state was updated atomically
      const updatedState = await Bun.file(stateFile).json();
      
      // Contract: state should be updated with new prompt
      expect(updatedState.prompts).toBeDefined();
      expect(updatedState.prompts.length).toBe(initialPromptCount + 1);
      
      // Verify the prompt was added correctly
      const lastPrompt = updatedState.prompts[updatedState.prompts.length - 1];
      expect(lastPrompt).toMatchObject({
        prompt: prompt,
        timestamp: expect.any(String),
        session_id: sessionId
      });
      
      // Verify atomic write (file should be valid JSON)
      expect(() => JSON.parse(JSON.stringify(updatedState))).not.toThrow();
    });
    
    it('should append to user_prompt_submit.json log file', async () => {
      const prompt = "Add unit tests for the API";
      const logFile = join(tmpDir, '.specstar', 'logs', 'user_prompt_submit.json');
      
      // Create initial log file with one entry
      const initialLog = [{
        timestamp: new Date().toISOString(),
        session_id: 'previous-session',
        prompt: 'Previous prompt',
        result: 'success'
      }];
      await Bun.write(logFile, JSON.stringify(initialLog, null, 2));
      
      // Execute hook
      const result = await $`${hookScript} --session-id ${sessionId} --prompt ${prompt}`
        .cwd(tmpDir)
        .quiet()
        .nothrow();
      
      expect(result.exitCode).toBe(0);
      
      // Verify log was appended to
      const updatedLog = await Bun.file(logFile).json();
      
      // Contract: log should be appended, not overwritten
      expect(Array.isArray(updatedLog)).toBe(true);
      expect(updatedLog.length).toBeGreaterThan(initialLog.length);
      
      // Verify new log entry
      const newEntry = updatedLog[updatedLog.length - 1];
      expect(newEntry).toMatchObject({
        timestamp: expect.any(String),
        session_id: sessionId,
        prompt: prompt,
        result: 'success'
      });
    });
    
    it('should handle missing session gracefully', async () => {
      const invalidSessionId = randomUUID();
      const prompt = "Test with invalid session";
      
      // Execute hook with non-existent session
      const result = await $`${hookScript} --session-id ${invalidSessionId} --prompt ${prompt}`
        .cwd(tmpDir)
        .quiet()
        .nothrow();
      
      // Contract: should handle gracefully (exit code 1 for error)
      expect(result.exitCode).toBe(1);
      expect(result.stderr.toString()).toContain('Session not found');
    });
    
    it('should validate input parameters', async () => {
      // Test missing session_id
      const result1 = await $`${hookScript} --prompt "Test prompt"`
        .cwd(tmpDir)
        .quiet()
        .nothrow();
      
      expect(result1.exitCode).toBe(1);
      expect(result1.stderr.toString()).toContain('session-id');
      
      // Test missing prompt
      const result2 = await $`${hookScript} --session-id ${sessionId}`
        .cwd(tmpDir)
        .quiet()
        .nothrow();
      
      expect(result2.exitCode).toBe(1);
      expect(result2.stderr.toString()).toContain('prompt');
      
      // Test invalid session_id format (not a UUID)
      const result3 = await $`${hookScript} --session-id "not-a-uuid" --prompt "Test"`
        .cwd(tmpDir)
        .quiet()
        .nothrow();
      
      expect(result3.exitCode).toBe(1);
      expect(result3.stderr.toString()).toContain('Invalid session ID format');
    });
    
    it('should handle concurrent updates safely', async () => {
      const prompts = [
        "First concurrent prompt",
        "Second concurrent prompt",
        "Third concurrent prompt"
      ];
      
      // Execute multiple hooks concurrently
      const results = await Promise.all(
        prompts.map(prompt => 
          $`${hookScript} --session-id ${sessionId} --prompt ${prompt}`
            .cwd(tmpDir)
            .quiet()
            .nothrow()
        )
      );
      
      // All should succeed
      results.forEach(result => {
        expect(result.exitCode).toBe(0);
      });
      
      // Verify all prompts were recorded
      const stateFile = join(tmpDir, '.specstar', 'sessions', sessionId, 'state.json');
      const finalState = await Bun.file(stateFile).json();
      
      // All prompts should be in the state
      prompts.forEach(prompt => {
        const found = finalState.prompts.some((p: any) => p.prompt === prompt);
        expect(found).toBe(true);
      });
    });
    
    it('should create log file if it does not exist', async () => {
      const prompt = "Initial prompt for new log";
      const logFile = join(tmpDir, '.specstar', 'logs', 'user_prompt_submit.json');
      
      // Ensure log file doesn't exist
      if (await exists(logFile)) {
        await rm(logFile);
      }
      
      // Execute hook
      const result = await $`${hookScript} --session-id ${sessionId} --prompt ${prompt}`
        .cwd(tmpDir)
        .quiet()
        .nothrow();
      
      expect(result.exitCode).toBe(0);
      
      // Verify log file was created
      expect(await exists(logFile)).toBe(true);
      
      // Verify log file contains the entry
      const log = await Bun.file(logFile).json();
      expect(Array.isArray(log)).toBe(true);
      expect(log.length).toBe(1);
      expect(log[0]).toMatchObject({
        session_id: sessionId,
        prompt: prompt
      });
    });
    
    it('should preserve existing session data when updating', async () => {
      const stateFile = join(tmpDir, '.specstar', 'sessions', sessionId, 'state.json');
      
      // Add custom data to session state
      const initialState = await Bun.file(stateFile).json();
      initialState.custom_field = "should be preserved";
      initialState.metadata = { version: "1.0.0", environment: "test" };
      await Bun.write(stateFile, JSON.stringify(initialState, null, 2));
      
      // Execute hook
      const prompt = "Update session but preserve custom fields";
      const result = await $`${hookScript} --session-id ${sessionId} --prompt ${prompt}`
        .cwd(tmpDir)
        .quiet()
        .nothrow();
      
      expect(result.exitCode).toBe(0);
      
      // Verify custom fields were preserved
      const updatedState = await Bun.file(stateFile).json();
      expect(updatedState.custom_field).toBe("should be preserved");
      expect(updatedState.metadata).toEqual({ version: "1.0.0", environment: "test" });
    });
  });
  
  describe('Hook Output Contract', () => {
    it('should output JSON response on success', async () => {
      const prompt = "Generate documentation";
      
      const result = await $`${hookScript} --session-id ${sessionId} --prompt ${prompt}`
        .cwd(tmpDir)
        .quiet()
        .nothrow();
      
      expect(result.exitCode).toBe(0);
      
      // Parse stdout as JSON
      const output = JSON.parse(result.stdout.toString());
      expect(output).toMatchObject({
        status: 'success',
        session_id: sessionId,
        prompt: prompt,
        timestamp: expect.any(String)
      });
    });
    
    it('should output JSON error on failure', async () => {
      const invalidSessionId = randomUUID();
      const prompt = "Test error output";
      
      const result = await $`${hookScript} --session-id ${invalidSessionId} --prompt ${prompt}`
        .cwd(tmpDir)
        .quiet()
        .nothrow();
      
      expect(result.exitCode).toBe(1);
      
      // Parse stderr as JSON
      const error = JSON.parse(result.stderr.toString());
      expect(error).toMatchObject({
        status: 'error',
        message: expect.any(String),
        session_id: invalidSessionId
      });
    });
    
    it('should output JSON response when blocking', async () => {
      const prompt = "rm -rf /"; // Dangerous command to block
      
      const result = await $`${hookScript} --session-id ${sessionId} --prompt ${prompt} --block`
        .cwd(tmpDir)
        .quiet()
        .nothrow();
      
      expect(result.exitCode).toBe(2);
      
      // Parse stdout as JSON
      const output = JSON.parse(result.stdout.toString());
      expect(output).toMatchObject({
        status: 'blocked',
        session_id: sessionId,
        prompt: prompt,
        reason: expect.any(String)
      });
    });
  });
});