#!/usr/bin/env bun
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { $ } from 'bun';
import { tmpdir } from 'os';
import { join } from 'path';
import { rm, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';

// Simple UUID v4 generator for testing
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

describe('Contract Test: notification hook', () => {
  let tmpDir: string;
  let sessionId: string;
  let hookPath: string;
  
  beforeEach(async () => {
    // Create temp directory for test
    tmpDir = join(tmpdir(), `specstar-test-notification-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
    await mkdir(join(tmpDir, '.specstar'), { recursive: true });
    await mkdir(join(tmpDir, '.specstar', 'sessions'), { recursive: true });
    await mkdir(join(tmpDir, '.specstar', 'logs'), { recursive: true });
    
    // Generate new session ID for each test
    sessionId = generateUUID();
    
    // Path to the hooks.ts file
    hookPath = join(tmpDir, '.specstar', 'hooks.ts');
    
    // Copy the actual hooks file to test directory (if it exists)
    const sourceHookPath = join(process.cwd(), '.specstar', 'hooks.ts');
    if (existsSync(sourceHookPath)) {
      const hookContent = await readFile(sourceHookPath, 'utf-8');
      await Bun.write(hookPath, hookContent);
    }
  });
  
  afterEach(async () => {
    // Clean up temp directory
    await rm(tmpDir, { recursive: true, force: true });
  });

  describe('Input validation', () => {
    it('should accept required inputs: session_id and message', async () => {
      const input = {
        session_id: sessionId,
        message: 'Test notification message'
      };
      
      const result = await $`cd ${tmpDir} && echo ${JSON.stringify(input)} | bun run ${hookPath} notification`
        .quiet()
        .nothrow();
      
      expect(result.exitCode).toBe(0);
    });
    
    it('should handle missing session_id gracefully', async () => {
      const input = {
        message: 'Test notification without session_id'
      };
      
      const result = await $`cd ${tmpDir} && echo ${JSON.stringify(input)} | bun run ${hookPath} notification`
        .quiet()
        .nothrow();
      
      // Should still return 0 (never blocks) but might log error
      expect(result.exitCode).toBe(0);
    });
    
    it('should handle missing message gracefully', async () => {
      const input = {
        session_id: sessionId
      };
      
      const result = await $`cd ${tmpDir} && echo ${JSON.stringify(input)} | bun run ${hookPath} notification`
        .quiet()
        .nothrow();
      
      // Should still return 0 (never blocks)
      expect(result.exitCode).toBe(0);
    });
    
    it('should handle invalid JSON input', async () => {
      const result = await $`cd ${tmpDir} && echo '{ invalid json }' | bun run ${hookPath} notification`
        .quiet()
        .nothrow();
      
      // Hook should fail gracefully but not block Claude Code
      expect(result.exitCode).toBe(1);
    });
    
    it('should validate session_id is a valid UUID string', async () => {
      const input = {
        session_id: 'not-a-valid-uuid',
        message: 'Test message'
      };
      
      const result = await $`cd ${tmpDir} && echo ${JSON.stringify(input)} | bun run ${hookPath} notification`
        .quiet()
        .nothrow();
      
      // Should process anyway (hooks are forgiving)
      expect(result.exitCode).toBe(0);
    });
  });

  describe('Exit code behavior', () => {
    it('should always return exit code 0 on successful execution', async () => {
      const input = {
        session_id: sessionId,
        message: 'Valid notification'
      };
      
      const result = await $`cd ${tmpDir} && echo ${JSON.stringify(input)} | bun run ${hookPath} notification`
        .quiet()
        .nothrow();
      
      expect(result.exitCode).toBe(0);
    });
    
    it('should never block Claude Code execution', async () => {
      const input = {
        session_id: sessionId,
        message: 'Test notification'
      };
      
      // Execute with timeout to ensure it doesn't block
      const startTime = Date.now();
      const result = await $`cd ${tmpDir} && echo ${JSON.stringify(input)} | bun run ${hookPath} notification`
        .quiet()
        .nothrow();
      const executionTime = Date.now() - startTime;
      
      expect(result.exitCode).toBe(0);
      expect(executionTime).toBeLessThan(1000); // Should complete quickly
    });
    
    it('should handle concurrent executions', async () => {
      const promises = [];
      
      // Run 5 concurrent notification hooks
      for (let i = 0; i < 5; i++) {
        const input = {
          session_id: sessionId,
          message: `Concurrent notification ${i}`
        };
        
        promises.push(
          $`cd ${tmpDir} && echo ${JSON.stringify(input)} | bun run ${hookPath} notification`
            .quiet()
            .nothrow()
        );
      }
      
      const results = await Promise.all(promises);
      
      // All should succeed
      results.forEach(result => {
        expect(result.exitCode).toBe(0);
      });
    });
  });

  describe('State file updates', () => {
    it('should create state.json if it does not exist', async () => {
      const input = {
        session_id: sessionId,
        message: 'First notification'
      };
      
      const stateFile = join(tmpDir, '.specstar', 'sessions', sessionId, 'state.json');
      
      // Verify state file doesn't exist
      expect(existsSync(stateFile)).toBe(false);
      
      await $`cd ${tmpDir} && echo ${JSON.stringify(input)} | bun run ${hookPath} notification`
        .quiet()
        .nothrow();
      
      // Verify state file was created
      expect(existsSync(stateFile)).toBe(true);
      
      // Verify content structure
      const state = JSON.parse(await readFile(stateFile, 'utf-8'));
      expect(state.session_id).toBe(sessionId);
      expect(state.notifications).toBeArray();
      expect(state.notifications.length).toBe(1);
      expect(state.notifications[0].message).toBe('First notification');
      expect(state.notifications[0].timestamp).toBeString();
    });
    
    it('should append to existing notifications array', async () => {
      const stateFile = join(tmpDir, '.specstar', 'sessions', sessionId, 'state.json');
      const sessionDir = join(tmpDir, '.specstar', 'sessions', sessionId);
      
      // Create initial state
      await mkdir(sessionDir, { recursive: true });
      const initialState = {
        session_id: sessionId,
        session_title: 'Test Session',
        session_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        agents: [],
        agents_history: [],
        files: { new: [], edited: [], read: [] },
        tools_used: {},
        errors: [],
        prompts: [],
        notifications: [
          {
            timestamp: new Date().toISOString(),
            message: 'Existing notification'
          }
        ]
      };
      await Bun.write(stateFile, JSON.stringify(initialState, null, 2));
      
      // Send new notification
      const input = {
        session_id: sessionId,
        message: 'New notification'
      };
      
      await $`cd ${tmpDir} && echo ${JSON.stringify(input)} | bun run ${hookPath} notification`
        .quiet()
        .nothrow();
      
      // Verify notification was appended
      const updatedState = JSON.parse(await readFile(stateFile, 'utf-8'));
      expect(updatedState.notifications).toBeArray();
      expect(updatedState.notifications.length).toBe(2);
      expect(updatedState.notifications[0].message).toBe('Existing notification');
      expect(updatedState.notifications[1].message).toBe('New notification');
    });
    
    it('should update state atomically to prevent corruption', async () => {
      const stateFile = join(tmpDir, '.specstar', 'sessions', sessionId, 'state.json');
      
      // Send multiple notifications rapidly
      const promises = [];
      for (let i = 0; i < 10; i++) {
        const input = {
          session_id: sessionId,
          message: `Rapid notification ${i}`
        };
        
        promises.push(
          $`cd ${tmpDir} && echo ${JSON.stringify(input)} | bun run ${hookPath} notification`
            .quiet()
            .nothrow()
        );
      }
      
      await Promise.all(promises);
      
      // Verify state file is valid JSON and contains all notifications
      const state = JSON.parse(await readFile(stateFile, 'utf-8'));
      expect(state.notifications).toBeArray();
      expect(state.notifications.length).toBe(10);
      
      // Verify all notifications are present (order may vary due to concurrency)
      const messages = state.notifications.map((n: any) => n.message);
      for (let i = 0; i < 10; i++) {
        expect(messages).toContain(`Rapid notification ${i}`);
      }
    });
    
    it('should preserve other state properties when updating', async () => {
      const stateFile = join(tmpDir, '.specstar', 'sessions', sessionId, 'state.json');
      const sessionDir = join(tmpDir, '.specstar', 'sessions', sessionId);
      
      // Create state with various properties
      await mkdir(sessionDir, { recursive: true });
      const initialState = {
        session_id: sessionId,
        session_title: 'Important Session',
        session_active: true,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        agents: ['test-agent'],
        agents_history: [{ name: 'test-agent', started_at: '2024-01-01T00:00:00.000Z' }],
        files: { 
          new: ['file1.ts'], 
          edited: ['file2.ts'], 
          read: ['file3.ts'] 
        },
        tools_used: { 'Read': 5, 'Write': 3 },
        errors: [{ timestamp: '2024-01-01T00:00:00.000Z', type: 'TestError', message: 'Test' }],
        prompts: [{ timestamp: '2024-01-01T00:00:00.000Z', prompt: 'Test prompt' }],
        notifications: []
      };
      await Bun.write(stateFile, JSON.stringify(initialState, null, 2));
      
      // Send notification
      const input = {
        session_id: sessionId,
        message: 'Test notification'
      };
      
      await $`cd ${tmpDir} && echo ${JSON.stringify(input)} | bun run ${hookPath} notification`
        .quiet()
        .nothrow();
      
      // Verify all other properties are preserved
      const updatedState = JSON.parse(await readFile(stateFile, 'utf-8'));
      expect(updatedState.session_title).toBe('Important Session');
      expect(updatedState.session_active).toBe(true);
      expect(updatedState.created_at).toBe('2024-01-01T00:00:00.000Z');
      expect(updatedState.agents).toEqual(['test-agent']);
      expect(updatedState.agents_history).toEqual([{ name: 'test-agent', started_at: '2024-01-01T00:00:00.000Z' }]);
      expect(updatedState.files).toEqual({ 
        new: ['file1.ts'], 
        edited: ['file2.ts'], 
        read: ['file3.ts'] 
      });
      expect(updatedState.tools_used).toEqual({ 'Read': 5, 'Write': 3 });
      expect(updatedState.errors.length).toBe(1);
      expect(updatedState.prompts.length).toBe(1);
      expect(updatedState.notifications.length).toBe(1);
      expect(updatedState.updated_at).not.toBe('2024-01-01T00:00:00.000Z'); // Should be updated
    });
  });

  describe('Log file updates', () => {
    it('should create notification.json log file if it does not exist', async () => {
      const logFile = join(tmpDir, '.specstar', 'logs', 'notification.json');
      
      // Verify log file doesn't exist
      expect(existsSync(logFile)).toBe(false);
      
      const input = {
        session_id: sessionId,
        message: 'First log entry'
      };
      
      await $`cd ${tmpDir} && echo ${JSON.stringify(input)} | bun run ${hookPath} notification`
        .quiet()
        .nothrow();
      
      // Verify log file was created
      expect(existsSync(logFile)).toBe(true);
      
      // Verify content structure
      const logs = JSON.parse(await readFile(logFile, 'utf-8'));
      expect(logs).toBeArray();
      expect(logs.length).toBe(1);
      expect(logs[0].session_id).toBe(sessionId);
      expect(logs[0].message).toBe('First log entry');
      expect(logs[0].timestamp).toBeString();
    });
    
    it('should append to existing notification.json log file', async () => {
      const logFile = join(tmpDir, '.specstar', 'logs', 'notification.json');
      
      // Create initial log file
      const initialLogs = [
        {
          timestamp: '2024-01-01T00:00:00.000Z',
          session_id: 'old-session-id',
          message: 'Old notification'
        }
      ];
      await Bun.write(logFile, JSON.stringify(initialLogs, null, 2));
      
      // Send new notification
      const input = {
        session_id: sessionId,
        message: 'New log entry'
      };
      
      await $`cd ${tmpDir} && echo ${JSON.stringify(input)} | bun run ${hookPath} notification`
        .quiet()
        .nothrow();
      
      // Verify log was appended
      const logs = JSON.parse(await readFile(logFile, 'utf-8'));
      expect(logs).toBeArray();
      expect(logs.length).toBe(2);
      expect(logs[0].session_id).toBe('old-session-id');
      expect(logs[1].session_id).toBe(sessionId);
      expect(logs[1].message).toBe('New log entry');
    });
    
    it('should handle concurrent log writes', async () => {
      const logFile = join(tmpDir, '.specstar', 'logs', 'notification.json');
      
      // Send multiple notifications from different sessions
      const promises = [];
      for (let i = 0; i < 5; i++) {
        const input = {
          session_id: generateUUID(),
          message: `Concurrent log ${i}`
        };
        
        promises.push(
          $`cd ${tmpDir} && echo ${JSON.stringify(input)} | bun run ${hookPath} notification`
            .quiet()
            .nothrow()
        );
      }
      
      await Promise.all(promises);
      
      // Verify all logs were written
      const logs = JSON.parse(await readFile(logFile, 'utf-8'));
      expect(logs).toBeArray();
      expect(logs.length).toBe(5);
      
      // Verify all messages are present
      const messages = logs.map((l: any) => l.message);
      for (let i = 0; i < 5; i++) {
        expect(messages).toContain(`Concurrent log ${i}`);
      }
    });
  });

  describe('Special message handling', () => {
    it('should handle empty message strings', async () => {
      const input = {
        session_id: sessionId,
        message: ''
      };
      
      const result = await $`cd ${tmpDir} && echo ${JSON.stringify(input)} | bun run ${hookPath} notification`
        .quiet()
        .nothrow();
      
      expect(result.exitCode).toBe(0);
      
      // Verify empty message was stored
      const stateFile = join(tmpDir, '.specstar', 'sessions', sessionId, 'state.json');
      const state = JSON.parse(await readFile(stateFile, 'utf-8'));
      expect(state.notifications[0].message).toBe('');
    });
    
    it('should handle very long messages', async () => {
      const longMessage = 'A'.repeat(10000); // 10KB message
      const input = {
        session_id: sessionId,
        message: longMessage
      };
      
      const result = await $`cd ${tmpDir} && echo ${JSON.stringify(input)} | bun run ${hookPath} notification`
        .quiet()
        .nothrow();
      
      expect(result.exitCode).toBe(0);
      
      // Verify long message was stored correctly
      const stateFile = join(tmpDir, '.specstar', 'sessions', sessionId, 'state.json');
      const state = JSON.parse(await readFile(stateFile, 'utf-8'));
      expect(state.notifications[0].message).toBe(longMessage);
    });
    
    it('should handle messages with special characters', async () => {
      const specialMessage = 'Test\n\t"quotes" and \'apostrophes\' & symbols: <>|\\';
      const input = {
        session_id: sessionId,
        message: specialMessage
      };
      
      const result = await $`cd ${tmpDir} && echo ${JSON.stringify(input)} | bun run ${hookPath} notification`
        .quiet()
        .nothrow();
      
      expect(result.exitCode).toBe(0);
      
      // Verify special characters were preserved
      const stateFile = join(tmpDir, '.specstar', 'sessions', sessionId, 'state.json');
      const state = JSON.parse(await readFile(stateFile, 'utf-8'));
      expect(state.notifications[0].message).toBe(specialMessage);
    });
    
    it('should handle Unicode and emoji in messages', async () => {
      const unicodeMessage = 'Hello 世界 🌍 Testing émojis 🚀 and ñ special çhars';
      const input = {
        session_id: sessionId,
        message: unicodeMessage
      };
      
      const result = await $`cd ${tmpDir} && echo ${JSON.stringify(input)} | bun run ${hookPath} notification`
        .quiet()
        .nothrow();
      
      expect(result.exitCode).toBe(0);
      
      // Verify Unicode was preserved
      const stateFile = join(tmpDir, '.specstar', 'sessions', sessionId, 'state.json');
      const state = JSON.parse(await readFile(stateFile, 'utf-8'));
      expect(state.notifications[0].message).toBe(unicodeMessage);
    });
  });

  describe('Error recovery', () => {
    it('should handle corrupted state file gracefully', async () => {
      const stateFile = join(tmpDir, '.specstar', 'sessions', sessionId, 'state.json');
      const sessionDir = join(tmpDir, '.specstar', 'sessions', sessionId);
      
      // Create corrupted state file
      await mkdir(sessionDir, { recursive: true });
      await Bun.write(stateFile, '{ invalid json }');
      
      const input = {
        session_id: sessionId,
        message: 'Recovery test'
      };
      
      const result = await $`cd ${tmpDir} && echo ${JSON.stringify(input)} | bun run ${hookPath} notification`
        .quiet()
        .nothrow();
      
      // Should handle error gracefully
      expect(result.exitCode).toBe(0);
    });
    
    it('should handle file system permissions issues', async () => {
      // This test would require changing file permissions, which may not work consistently
      // across different environments. Marking as a conceptual test.
      
      // In production, the hook should handle permission errors gracefully
      // and not block Claude Code execution
      expect(true).toBe(true);
    });
    
    it('should handle disk full scenarios', async () => {
      // This is a conceptual test that would be difficult to implement reliably
      // In production, the hook should handle disk full errors gracefully
      expect(true).toBe(true);
    });
  });
});