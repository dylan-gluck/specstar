#!/usr/bin/env bun
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { $ } from 'bun';
import { tmpdir } from 'os';
import { join } from 'path';
import { rm, mkdir, stat, readFile } from 'fs/promises';
import { randomUUID } from 'crypto';

describe('Contract: session_start hook', () => {
  let tmpDir: string;
  let hookPath: string;
  
  beforeAll(async () => {
    // Create temp directory for test environment
    tmpDir = join(tmpdir(), `specstar-test-session-start-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
    await mkdir(join(tmpDir, '.specstar'), { recursive: true });
    await mkdir(join(tmpDir, '.specstar', 'sessions'), { recursive: true });
    await mkdir(join(tmpDir, '.specstar', 'logs'), { recursive: true });
    
    // Path to the hook executable (to be implemented)
    hookPath = join(process.cwd(), '.specstar', 'hooks', 'session_start');
  });
  
  afterAll(async () => {
    // Clean up temp directory
    await rm(tmpDir, { recursive: true, force: true });
  });
  
  beforeEach(async () => {
    // Clean up any existing session files before each test
    const sessionsDir = join(tmpDir, '.specstar', 'sessions');
    const logsDir = join(tmpDir, '.specstar', 'logs');
    
    // Remove all session directories
    const sessionDirs = await Bun.$`ls -d ${sessionsDir}/*/ 2>/dev/null || true`.quiet().text();
    if (sessionDirs.trim()) {
      await rm(sessionsDir, { recursive: true, force: true });
      await mkdir(sessionsDir, { recursive: true });
    }
    
    // Clear the log file
    const logFile = join(logsDir, 'session_start.json');
    await Bun.write(logFile, '[]');
  });

  describe('Input validation', () => {
    it('should require session_id parameter', async () => {
      const result = await $`${hookPath} --source startup`.cwd(tmpDir).quiet().nothrow();
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr.toString()).toContain('session_id');
    });
    
    it('should require source parameter', async () => {
      const sessionId = randomUUID();
      const result = await $`${hookPath} --session_id ${sessionId}`.cwd(tmpDir).quiet().nothrow();
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr.toString()).toContain('source');
    });
    
    it('should validate session_id is a valid UUID', async () => {
      const result = await $`${hookPath} --session_id invalid-uuid --source startup`.cwd(tmpDir).quiet().nothrow();
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr.toString()).toContain('Invalid session_id format');
    });
    
    it('should validate source is one of allowed values', async () => {
      const sessionId = randomUUID();
      const result = await $`${hookPath} --session_id ${sessionId} --source invalid`.cwd(tmpDir).quiet().nothrow();
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr.toString()).toContain('Invalid source');
      expect(result.stderr.toString()).toContain('startup');
      expect(result.stderr.toString()).toContain('resume');
      expect(result.stderr.toString()).toContain('clear');
    });
  });

  describe('Success scenarios', () => {
    it('should return exit code 0 on successful session start from startup', async () => {
      const sessionId = randomUUID();
      const result = await $`${hookPath} --session_id ${sessionId} --source startup`.cwd(tmpDir).quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('Session started successfully');
    });
    
    it('should return exit code 0 on successful session start from resume', async () => {
      const sessionId = randomUUID();
      const result = await $`${hookPath} --session_id ${sessionId} --source resume`.cwd(tmpDir).quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('Session resumed successfully');
    });
    
    it('should return exit code 0 on successful session start from clear', async () => {
      const sessionId = randomUUID();
      const result = await $`${hookPath} --session_id ${sessionId} --source clear`.cwd(tmpDir).quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('Session cleared and started successfully');
    });
  });

  describe('State file creation', () => {
    it('should create state.json atomically in session directory', async () => {
      const sessionId = randomUUID();
      const stateFile = join(tmpDir, '.specstar', 'sessions', sessionId, 'state.json');
      
      // Run hook
      await $`${hookPath} --session_id ${sessionId} --source startup`.cwd(tmpDir).quiet().nothrow();
      
      // Verify state file exists
      const fileStats = await stat(stateFile);
      expect(fileStats.isFile()).toBe(true);
      
      // Verify content structure
      const stateContent = await Bun.file(stateFile).json();
      expect(stateContent).toMatchObject({
        session_id: sessionId,
        source: 'startup',
        started_at: expect.any(String),
        status: 'active'
      });
      
      // Verify timestamp is valid ISO string
      expect(new Date(stateContent.started_at).toISOString()).toBe(stateContent.started_at);
    });
    
    it('should handle concurrent writes atomically', async () => {
      const sessionId = randomUUID();
      const stateFile = join(tmpDir, '.specstar', 'sessions', sessionId, 'state.json');
      
      // Launch multiple concurrent hook calls
      const promises = Array.from({ length: 5 }, (_, i) => 
        $`${hookPath} --session_id ${sessionId} --source startup`.cwd(tmpDir).quiet().nothrow()
      );
      
      const results = await Promise.all(promises);
      
      // All should succeed
      results.forEach(result => {
        expect(result.exitCode).toBe(0);
      });
      
      // State file should be valid and consistent
      const stateContent = await Bun.file(stateFile).json();
      expect(stateContent.session_id).toBe(sessionId);
      expect(stateContent.source).toBe('startup');
    });
    
    it('should preserve existing session data when resuming', async () => {
      const sessionId = randomUUID();
      const sessionDir = join(tmpDir, '.specstar', 'sessions', sessionId);
      const stateFile = join(sessionDir, 'state.json');
      
      // Create initial session
      await mkdir(sessionDir, { recursive: true });
      const initialState = {
        session_id: sessionId,
        source: 'startup',
        started_at: new Date().toISOString(),
        status: 'active',
        custom_data: 'should_be_preserved'
      };
      await Bun.write(stateFile, JSON.stringify(initialState, null, 2));
      
      // Resume session
      await $`${hookPath} --session_id ${sessionId} --source resume`.cwd(tmpDir).quiet().nothrow();
      
      // Verify custom data is preserved
      const updatedState = await Bun.file(stateFile).json();
      expect(updatedState.custom_data).toBe('should_be_preserved');
      expect(updatedState.resumed_at).toBeDefined();
      expect(updatedState.source).toBe('resume');
    });
  });

  describe('Logging', () => {
    it('should append entry to session_start.json log file', async () => {
      const sessionId = randomUUID();
      const logFile = join(tmpDir, '.specstar', 'logs', 'session_start.json');
      
      // Initialize log file with empty array
      await Bun.write(logFile, '[]');
      
      // Run hook
      await $`${hookPath} --session_id ${sessionId} --source startup`.cwd(tmpDir).quiet().nothrow();
      
      // Verify log entry was appended
      const logs = await Bun.file(logFile).json();
      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBeGreaterThan(0);
      
      const latestEntry = logs[logs.length - 1];
      expect(latestEntry).toMatchObject({
        session_id: sessionId,
        source: 'startup',
        timestamp: expect.any(String),
        result: 'success'
      });
    });
    
    it('should handle non-existent log file gracefully', async () => {
      const sessionId = randomUUID();
      const logFile = join(tmpDir, '.specstar', 'logs', 'session_start.json');
      
      // Remove log file if it exists
      await rm(logFile, { force: true });
      
      // Run hook
      const result = await $`${hookPath} --session_id ${sessionId} --source startup`.cwd(tmpDir).quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      
      // Verify log file was created
      const logs = await Bun.file(logFile).json();
      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBe(1);
    });
    
    it('should log failures with appropriate error details', async () => {
      const logFile = join(tmpDir, '.specstar', 'logs', 'session_start.json');
      
      // Initialize log file
      await Bun.write(logFile, '[]');
      
      // Run hook with invalid input to trigger failure
      await $`${hookPath} --session_id invalid --source startup`.cwd(tmpDir).quiet().nothrow();
      
      // Verify error was logged
      const logs = await Bun.file(logFile).json();
      const latestEntry = logs[logs.length - 1];
      
      expect(latestEntry).toMatchObject({
        session_id: 'invalid',
        source: 'startup',
        timestamp: expect.any(String),
        result: 'error',
        error: expect.objectContaining({
          message: expect.any(String)
        })
      });
    });
  });

  describe('Blocking behavior', () => {
    it('should return exit code 2 to block session under specific conditions', async () => {
      const sessionId = randomUUID();
      
      // Create a blocking condition file (e.g., maintenance mode)
      const blockFile = join(tmpDir, '.specstar', 'maintenance.lock');
      await Bun.write(blockFile, 'System under maintenance');
      
      const result = await $`${hookPath} --session_id ${sessionId} --source startup --check_maintenance`.cwd(tmpDir).quiet().nothrow();
      
      expect(result.exitCode).toBe(2);
      expect(result.stdout.toString()).toContain('Session blocked');
      expect(result.stdout.toString()).toContain('maintenance');
      
      // Clean up
      await rm(blockFile, { force: true });
    });
    
    it('should not create state file when blocking', async () => {
      const sessionId = randomUUID();
      const stateFile = join(tmpDir, '.specstar', 'sessions', sessionId, 'state.json');
      
      // Create blocking condition
      const blockFile = join(tmpDir, '.specstar', 'maintenance.lock');
      await Bun.write(blockFile, 'System under maintenance');
      
      const result = await $`${hookPath} --session_id ${sessionId} --source startup --check_maintenance`.cwd(tmpDir).quiet().nothrow();
      
      expect(result.exitCode).toBe(2);
      
      // Verify state file was NOT created
      const exists = await Bun.file(stateFile).exists();
      expect(exists).toBe(false);
      
      // Clean up
      await rm(blockFile, { force: true });
    });
    
    it('should still log when blocking', async () => {
      const sessionId = randomUUID();
      const logFile = join(tmpDir, '.specstar', 'logs', 'session_start.json');
      
      // Initialize log file
      await Bun.write(logFile, '[]');
      
      // Create blocking condition
      const blockFile = join(tmpDir, '.specstar', 'maintenance.lock');
      await Bun.write(blockFile, 'System under maintenance');
      
      await $`${hookPath} --session_id ${sessionId} --source startup --check_maintenance`.cwd(tmpDir).quiet().nothrow();
      
      // Verify blocking was logged
      const logs = await Bun.file(logFile).json();
      const latestEntry = logs[logs.length - 1];
      
      expect(latestEntry).toMatchObject({
        session_id: sessionId,
        source: 'startup',
        result: 'blocked',
        reason: expect.stringContaining('maintenance')
      });
      
      // Clean up
      await rm(blockFile, { force: true });
    });
  });

  describe('Error handling', () => {
    it('should handle file system errors gracefully', async () => {
      const sessionId = randomUUID();
      const sessionDir = join(tmpDir, '.specstar', 'sessions', sessionId);
      
      // Create session directory as a file to cause write error
      await Bun.write(sessionDir, 'not a directory');
      
      const result = await $`${hookPath} --session_id ${sessionId} --source startup`.cwd(tmpDir).quiet().nothrow();
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr.toString()).toContain('Failed to create session state');
      
      // Clean up
      await rm(sessionDir, { force: true });
    });
    
    it('should handle corrupted log file gracefully', async () => {
      const sessionId = randomUUID();
      const logFile = join(tmpDir, '.specstar', 'logs', 'session_start.json');
      
      // Create corrupted log file
      await Bun.write(logFile, '{ invalid json ]');
      
      const result = await $`${hookPath} --session_id ${sessionId} --source startup`.cwd(tmpDir).quiet().nothrow();
      
      // Should still succeed but potentially warn about log issue
      expect(result.exitCode).toBe(0);
      
      // State file should still be created
      const stateFile = join(tmpDir, '.specstar', 'sessions', sessionId, 'state.json');
      const exists = await Bun.file(stateFile).exists();
      expect(exists).toBe(true);
    });
    
    it('should timeout if execution takes too long', async () => {
      const sessionId = randomUUID();
      
      // Run hook with timeout flag (simulating slow operation)
      const result = await $`${hookPath} --session_id ${sessionId} --source startup --simulate_slow 5000`.cwd(tmpDir).timeout(1000).quiet().nothrow();
      
      // Should exit with error due to timeout
      expect(result.exitCode).not.toBe(0);
    });
  });

  describe('Environment compatibility', () => {
    it('should work with environment variables', async () => {
      const sessionId = randomUUID();
      const customPath = join(tmpDir, 'custom-specstar');
      
      await mkdir(join(customPath, 'sessions'), { recursive: true });
      await mkdir(join(customPath, 'logs'), { recursive: true });
      
      const result = await $`SPECSTAR_DIR=${customPath} ${hookPath} --session_id ${sessionId} --source startup`.cwd(tmpDir).quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      
      // Verify state file was created in custom location
      const stateFile = join(customPath, 'sessions', sessionId, 'state.json');
      const exists = await Bun.file(stateFile).exists();
      expect(exists).toBe(true);
    });
    
    it('should provide helpful output in verbose mode', async () => {
      const sessionId = randomUUID();
      
      const result = await $`${hookPath} --session_id ${sessionId} --source startup --verbose`.cwd(tmpDir).quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('Creating session directory');
      expect(result.stdout.toString()).toContain('Writing state file');
      expect(result.stdout.toString()).toContain('Appending to log');
      expect(result.stdout.toString()).toContain('Session started successfully');
    });
  });
});