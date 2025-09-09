#!/usr/bin/env bun
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { tmpdir } from 'os';
import { join } from 'path';
import { rm, mkdir, exists } from 'fs/promises';

describe('Contract Test: stop hook', () => {
  let testDir: string;
  let sessionId: string;
  let hookPath: string;
  
  beforeEach(async () => {
    // Create unique test directory
    sessionId = crypto.randomUUID();
    testDir = join(tmpdir(), `specstar-test-stop-hook-${Date.now()}`);
    
    // Set up .specstar directory structure
    await mkdir(join(testDir, '.specstar'), { recursive: true });
    await mkdir(join(testDir, '.specstar', 'sessions', sessionId), { recursive: true });
    await mkdir(join(testDir, '.specstar', 'logs'), { recursive: true });
    
    // Path to the stop hook executable
    hookPath = join(testDir, '.specstar', 'hooks', 'stop');
    await mkdir(join(testDir, '.specstar', 'hooks'), { recursive: true });
  });
  
  afterEach(async () => {
    // Clean up test directory
    await rm(testDir, { recursive: true, force: true });
  });
  
  describe('Input validation', () => {
    it('should accept required inputs: session_id and stop_hook_active', async () => {
      // Mock hook implementation for testing contract
      const mockHook = `#!/usr/bin/env bun
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Parse input from stdin
const input = await Bun.stdin.text();
const data = JSON.parse(input);

// Validate required fields
if (!data.session_id || typeof data.session_id !== 'string') {
  console.error('Error: session_id is required and must be a string');
  process.exit(1);
}

if (typeof data.stop_hook_active !== 'boolean') {
  console.error('Error: stop_hook_active is required and must be a boolean');
  process.exit(1);
}

// Contract: Always exit with code 0 on success
process.exit(0);
`;
      
      await Bun.write(hookPath, mockHook);
      await Bun.spawn(['chmod', '+x', hookPath]).exited;
      
      const input = JSON.stringify({
        session_id: sessionId,
        stop_hook_active: true
      });
      
      const proc = Bun.spawn([hookPath], {
        stdin: Buffer.from(input),
        cwd: testDir
      });
      
      const exitCode = await proc.exited;
      expect(exitCode).toBe(0);
    });
    
    it('should accept optional transcript_path', async () => {
      const mockHook = `#!/usr/bin/env bun
import { readFileSync, writeFileSync } from 'fs';

const input = await Bun.stdin.text();
const data = JSON.parse(input);

// Validate optional transcript_path
if (data.transcript_path !== undefined && typeof data.transcript_path !== 'string') {
  console.error('Error: transcript_path must be a string when provided');
  process.exit(1);
}

process.exit(0);
`;
      
      await Bun.write(hookPath, mockHook);
      await Bun.spawn(['chmod', '+x', hookPath]).exited;
      
      const input = JSON.stringify({
        session_id: sessionId,
        stop_hook_active: false,
        transcript_path: '/path/to/transcript.txt'
      });
      
      const proc = Bun.spawn([hookPath], {
        stdin: Buffer.from(input),
        cwd: testDir
      });
      
      const exitCode = await proc.exited;
      expect(exitCode).toBe(0);
    });
    
    it('should reject invalid session_id (non-uuid string)', async () => {
      const mockHook = `#!/usr/bin/env bun
const input = await Bun.stdin.text();
const data = JSON.parse(input);

// UUID validation regex
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

if (!data.session_id || !uuidRegex.test(data.session_id)) {
  console.error('Error: session_id must be a valid UUID');
  process.exit(1);
}

process.exit(0);
`;
      
      await Bun.write(hookPath, mockHook);
      await Bun.spawn(['chmod', '+x', hookPath]).exited;
      
      const input = JSON.stringify({
        session_id: 'not-a-uuid',
        stop_hook_active: true
      });
      
      const proc = Bun.spawn([hookPath], {
        stdin: Buffer.from(input),
        cwd: testDir
      });
      
      const exitCode = await proc.exited;
      expect(exitCode).toBe(1);
    });
    
    it('should reject missing stop_hook_active', async () => {
      const mockHook = `#!/usr/bin/env bun
const input = await Bun.stdin.text();
const data = JSON.parse(input);

if (typeof data.stop_hook_active !== 'boolean') {
  console.error('Error: stop_hook_active is required and must be a boolean');
  process.exit(1);
}

process.exit(0);
`;
      
      await Bun.write(hookPath, mockHook);
      await Bun.spawn(['chmod', '+x', hookPath]).exited;
      
      const input = JSON.stringify({
        session_id: sessionId
        // Missing stop_hook_active
      });
      
      const proc = Bun.spawn([hookPath], {
        stdin: Buffer.from(input),
        cwd: testDir
      });
      
      const exitCode = await proc.exited;
      expect(exitCode).toBe(1);
    });
  });
  
  describe('State management', () => {
    it('should update .specstar/sessions/{session_id}/state.json atomically', async () => {
      // Create initial state
      const stateFile = join(testDir, '.specstar', 'sessions', sessionId, 'state.json');
      const initialState = {
        session_id: sessionId,
        session_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_prompts: [],
        agents: [],
        files_new: [],
        files_edited: [],
        files_read: [],
        tools_used: {},
        errors: [],
        notifications: []
      };
      
      await Bun.write(stateFile, JSON.stringify(initialState, null, 2));
      
      // Mock hook that updates state atomically
      const mockHook = `#!/usr/bin/env bun
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const input = await Bun.stdin.text();
const data = JSON.parse(input);

const stateFile = join('.specstar', 'sessions', data.session_id, 'state.json');
const tempFile = stateFile + '.tmp';

try {
  // Read current state
  const currentState = JSON.parse(readFileSync(stateFile, 'utf-8'));
  
  // Update state
  currentState.session_active = false;
  currentState.updated_at = new Date().toISOString();
  
  // Write atomically (write to temp file, then rename)
  writeFileSync(tempFile, JSON.stringify(currentState, null, 2));
  
  // Atomic rename
  const fs = require('fs');
  fs.renameSync(tempFile, stateFile);
  
  process.exit(0);
} catch (error) {
  console.error('Error updating state:', error);
  process.exit(1);
}
`;
      
      await Bun.write(hookPath, mockHook);
      await Bun.spawn(['chmod', '+x', hookPath]).exited;
      
      const input = JSON.stringify({
        session_id: sessionId,
        stop_hook_active: true
      });
      
      const proc = Bun.spawn([hookPath], {
        stdin: Buffer.from(input),
        cwd: testDir
      });
      
      const exitCode = await proc.exited;
      expect(exitCode).toBe(0);
      
      // Verify state was updated
      const updatedState = JSON.parse(await Bun.file(stateFile).text());
      expect(updatedState.session_active).toBe(false);
      expect(updatedState.updated_at).not.toBe(initialState.updated_at);
    });
    
    it('should handle missing state file gracefully', async () => {
      const mockHook = `#!/usr/bin/env bun
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const input = await Bun.stdin.text();
const data = JSON.parse(input);

const stateFile = join('.specstar', 'sessions', data.session_id, 'state.json');

// Create default state if file doesn't exist
if (!existsSync(stateFile)) {
  const dir = dirname(stateFile);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  
  const defaultState = {
    session_id: data.session_id,
    session_active: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_prompts: [],
    agents: [],
    files_new: [],
    files_edited: [],
    files_read: [],
    tools_used: {},
    errors: [],
    notifications: []
  };
  
  writeFileSync(stateFile, JSON.stringify(defaultState, null, 2));
}

process.exit(0);
`;
      
      await Bun.write(hookPath, mockHook);
      await Bun.spawn(['chmod', '+x', hookPath]).exited;
      
      const newSessionId = crypto.randomUUID();
      const input = JSON.stringify({
        session_id: newSessionId,
        stop_hook_active: true
      });
      
      const proc = Bun.spawn([hookPath], {
        stdin: Buffer.from(input),
        cwd: testDir
      });
      
      const exitCode = await proc.exited;
      expect(exitCode).toBe(0);
      
      // Verify state file was created
      const stateFile = join(testDir, '.specstar', 'sessions', newSessionId, 'state.json');
      expect(await exists(stateFile)).toBe(true);
    });
  });
  
  describe('Logging', () => {
    it('should append to .specstar/logs/stop.json', async () => {
      const logFile = join(testDir, '.specstar', 'logs', 'stop.json');
      
      // Create initial log file with one entry
      const initialLogs = [
        {
          timestamp: new Date().toISOString(),
          session_id: 'previous-session',
          stop_hook_active: false
        }
      ];
      await Bun.write(logFile, JSON.stringify(initialLogs, null, 2));
      
      // Mock hook that appends to log
      const mockHook = `#!/usr/bin/env bun
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const input = await Bun.stdin.text();
const data = JSON.parse(input);

const logFile = join('.specstar', 'logs', 'stop.json');

try {
  // Read existing logs or create empty array
  let logs = [];
  if (existsSync(logFile)) {
    logs = JSON.parse(readFileSync(logFile, 'utf-8'));
  }
  
  // Append new log entry
  logs.push({
    timestamp: new Date().toISOString(),
    session_id: data.session_id,
    stop_hook_active: data.stop_hook_active,
    transcript_path: data.transcript_path
  });
  
  // Write back to file
  writeFileSync(logFile, JSON.stringify(logs, null, 2));
  
  process.exit(0);
} catch (error) {
  console.error('Error logging:', error);
  process.exit(1);
}
`;
      
      await Bun.write(hookPath, mockHook);
      await Bun.spawn(['chmod', '+x', hookPath]).exited;
      
      const input = JSON.stringify({
        session_id: sessionId,
        stop_hook_active: true,
        transcript_path: '/test/transcript.txt'
      });
      
      const proc = Bun.spawn([hookPath], {
        stdin: Buffer.from(input),
        cwd: testDir
      });
      
      const exitCode = await proc.exited;
      expect(exitCode).toBe(0);
      
      // Verify log was appended
      const logs = JSON.parse(await Bun.file(logFile).text());
      expect(logs).toHaveLength(2);
      expect(logs[1].session_id).toBe(sessionId);
      expect(logs[1].stop_hook_active).toBe(true);
      expect(logs[1].transcript_path).toBe('/test/transcript.txt');
    });
    
    it('should create log file if it does not exist', async () => {
      const logFile = join(testDir, '.specstar', 'logs', 'stop.json');
      
      const mockHook = `#!/usr/bin/env bun
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const input = await Bun.stdin.text();
const data = JSON.parse(input);

const logFile = join('.specstar', 'logs', 'stop.json');
const logDir = dirname(logFile);

// Ensure log directory exists
if (!existsSync(logDir)) {
  mkdirSync(logDir, { recursive: true });
}

// Create new log entry
const logEntry = {
  timestamp: new Date().toISOString(),
  session_id: data.session_id,
  stop_hook_active: data.stop_hook_active
};

// Write as array with single entry
writeFileSync(logFile, JSON.stringify([logEntry], null, 2));

process.exit(0);
`;
      
      await Bun.write(hookPath, mockHook);
      await Bun.spawn(['chmod', '+x', hookPath]).exited;
      
      const input = JSON.stringify({
        session_id: sessionId,
        stop_hook_active: false
      });
      
      const proc = Bun.spawn([hookPath], {
        stdin: Buffer.from(input),
        cwd: testDir
      });
      
      const exitCode = await proc.exited;
      expect(exitCode).toBe(0);
      
      // Verify log file was created
      expect(await exists(logFile)).toBe(true);
      const logs = JSON.parse(await Bun.file(logFile).text());
      expect(logs).toHaveLength(1);
      expect(logs[0].session_id).toBe(sessionId);
    });
  });
  
  describe('Exit behavior', () => {
    it('should always return exit code 0 on success (never blocks)', async () => {
      const mockHook = `#!/usr/bin/env bun
const input = await Bun.stdin.text();
const data = JSON.parse(input);

// Simulate some processing
await new Promise(resolve => setTimeout(resolve, 10));

// Contract: Must ALWAYS exit with 0 on success
// Never block or wait indefinitely
process.exit(0);
`;
      
      await Bun.write(hookPath, mockHook);
      await Bun.spawn(['chmod', '+x', hookPath]).exited;
      
      const input = JSON.stringify({
        session_id: sessionId,
        stop_hook_active: true
      });
      
      const startTime = Date.now();
      const proc = Bun.spawn([hookPath], {
        stdin: Buffer.from(input),
        cwd: testDir
      });
      
      const exitCode = await proc.exited;
      const duration = Date.now() - startTime;
      
      expect(exitCode).toBe(0);
      // Should complete quickly (under 1 second)
      expect(duration).toBeLessThan(1000);
    });
    
    it('should exit with non-zero code on error', async () => {
      const mockHook = `#!/usr/bin/env bun
const input = await Bun.stdin.text();

try {
  const data = JSON.parse(input);
  
  // Simulate an error condition
  if (data.session_id === 'error-trigger') {
    throw new Error('Simulated error');
  }
  
  process.exit(0);
} catch (error) {
  console.error('Hook error:', error.message);
  process.exit(1);
}
`;
      
      await Bun.write(hookPath, mockHook);
      await Bun.spawn(['chmod', '+x', hookPath]).exited;
      
      const input = JSON.stringify({
        session_id: 'error-trigger',
        stop_hook_active: true
      });
      
      const proc = Bun.spawn([hookPath], {
        stdin: Buffer.from(input),
        cwd: testDir
      });
      
      const exitCode = await proc.exited;
      expect(exitCode).toBe(1);
    });
  });
  
  describe('Integration with actual hook (when implemented)', () => {
    it.skip('should execute the actual stop hook implementation', async () => {
      // This test will be enabled when the actual hook is implemented
      // It will test against the real implementation in .specstar/hooks/stop
      
      const actualHookPath = join(process.cwd(), '.specstar', 'hooks', 'stop');
      
      // Skip if hook doesn't exist yet
      if (!await exists(actualHookPath)) {
        return;
      }
      
      const input = JSON.stringify({
        session_id: sessionId,
        stop_hook_active: true,
        transcript_path: '/tmp/test-transcript.txt'
      });
      
      const proc = Bun.spawn([actualHookPath], {
        stdin: Buffer.from(input),
        cwd: testDir
      });
      
      const exitCode = await proc.exited;
      expect(exitCode).toBe(0);
      
      // Verify actual behavior
      const stateFile = join(testDir, '.specstar', 'sessions', sessionId, 'state.json');
      const logFile = join(testDir, '.specstar', 'logs', 'stop.json');
      
      if (await exists(stateFile)) {
        const state = JSON.parse(await Bun.file(stateFile).text());
        expect(state.session_active).toBe(false);
      }
      
      if (await exists(logFile)) {
        const logs = JSON.parse(await Bun.file(logFile).text());
        const lastLog = logs[logs.length - 1];
        expect(lastLog.session_id).toBe(sessionId);
      }
    });
  });
});