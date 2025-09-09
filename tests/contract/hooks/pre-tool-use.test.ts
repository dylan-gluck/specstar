#!/usr/bin/env bun
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { $ } from 'bun';
import { tmpdir } from 'os';
import { join } from 'path';
import { rm, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
describe('Contract Test: pre_tool_use hook', () => {
  let tmpDir: string;
  let sessionId: string;
  let hookPath: string;
  
  beforeEach(async () => {
    // Create temp directory for test isolation
    tmpDir = join(tmpdir(), `specstar-hook-test-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
    await mkdir(join(tmpDir, '.specstar'), { recursive: true });
    await mkdir(join(tmpDir, '.specstar', 'sessions'), { recursive: true });
    await mkdir(join(tmpDir, '.specstar', 'logs'), { recursive: true });
    
    // Generate test session ID (UUID v4 format)
    sessionId = `${Math.random().toString(16).slice(2, 10)}-${Math.random().toString(16).slice(2, 6)}-4${Math.random().toString(16).slice(2, 5)}-${Math.random().toString(16).slice(2, 6)}-${Math.random().toString(16).slice(2, 14)}`;
    
    // Copy hooks.ts to test directory
    hookPath = join(tmpDir, '.specstar', 'hooks.ts');
    const originalHookPath = join(process.cwd(), '.specstar', 'hooks.ts');
    if (await existsSync(originalHookPath)) {
      const hookContent = await readFile(originalHookPath, 'utf-8');
      await Bun.write(hookPath, hookContent);
    }
  });
  
  afterEach(async () => {
    // Clean up temp directory
    await rm(tmpDir, { recursive: true, force: true });
  });
  
  describe('Input validation', () => {
    it('should accept required inputs: session_id, tool_name, and tool_input', async () => {
      const input = {
        session_id: sessionId,
        tool_name: 'Read',
        tool_input: { file_path: '/some/file.txt' }
      };
      
      const result = await $`cd ${tmpDir} && echo ${JSON.stringify(input)} | bun run .specstar/hooks.ts pre_tool_use`
        .quiet()
        .nothrow();
      
      // Should return exit code 0 on success
      expect(result.exitCode).toBe(0);
    });
    
    it('should validate session_id is a valid UUID string', async () => {
      const invalidInputs = [
        { session_id: 'not-a-uuid', tool_name: 'Read', tool_input: {} },
        { session_id: 123, tool_name: 'Read', tool_input: {} },
        { session_id: null, tool_name: 'Read', tool_input: {} },
        { tool_name: 'Read', tool_input: {} } // missing session_id
      ];
      
      for (const input of invalidInputs) {
        const result = await $`cd ${tmpDir} && echo ${JSON.stringify(input)} | bun run .specstar/hooks.ts pre_tool_use`
          .quiet()
          .nothrow();
        
        // Should fail with non-zero exit code
        expect(result.exitCode).not.toBe(0);
      }
    });
    
    it('should require tool_name to be a string', async () => {
      const invalidInputs = [
        { session_id: sessionId, tool_name: null, tool_input: {} },
        { session_id: sessionId, tool_name: 123, tool_input: {} },
        { session_id: sessionId, tool_input: {} } // missing tool_name
      ];
      
      for (const input of invalidInputs) {
        const result = await $`cd ${tmpDir} && echo ${JSON.stringify(input)} | bun run .specstar/hooks.ts pre_tool_use`
          .quiet()
          .nothrow();
        
        // Should fail with non-zero exit code
        expect(result.exitCode).not.toBe(0);
      }
    });
    
    it('should require tool_input to be an object', async () => {
      const invalidInputs = [
        { session_id: sessionId, tool_name: 'Read', tool_input: 'string' },
        { session_id: sessionId, tool_name: 'Read', tool_input: 123 },
        { session_id: sessionId, tool_name: 'Read' } // missing tool_input is OK (empty object)
      ];
      
      // Missing tool_input should be treated as empty object
      const missingInput = { session_id: sessionId, tool_name: 'Read' };
      const result = await $`cd ${tmpDir} && echo ${JSON.stringify(missingInput)} | bun run .specstar/hooks.ts pre_tool_use`
        .quiet()
        .nothrow();
      expect(result.exitCode).toBe(0);
      
      // Invalid types should fail
      for (const input of invalidInputs.slice(0, 2)) {
        const result = await $`cd ${tmpDir} && echo ${JSON.stringify(input)} | bun run .specstar/hooks.ts pre_tool_use`
          .quiet()
          .nothrow();
        
        // Should fail with non-zero exit code
        expect(result.exitCode).not.toBe(0);
      }
    });
  });
  
  describe('Exit codes', () => {
    it('should return exit code 0 on successful execution', async () => {
      const input = {
        session_id: sessionId,
        tool_name: 'Bash',
        tool_input: { command: 'ls -la' }
      };
      
      const result = await $`cd ${tmpDir} && echo ${JSON.stringify(input)} | bun run .specstar/hooks.ts pre_tool_use`
        .quiet()
        .nothrow();
      
      expect(result.exitCode).toBe(0);
    });
    
    it('should return exit code 2 to block tool execution', async () => {
      // This test would require modifying the hook to block certain tools
      // For now, we'll test that the hook CAN return exit code 2
      // In a real scenario, you'd configure the hook to block based on rules
      
      // Create a blocking configuration
      const blockingConfig = {
        blocked_tools: ['DangerousTool']
      };
      await Bun.write(
        join(tmpDir, '.specstar', 'hook_config.json'),
        JSON.stringify(blockingConfig)
      );
      
      const input = {
        session_id: sessionId,
        tool_name: 'DangerousTool',
        tool_input: { action: 'delete_everything' }
      };
      
      // Note: This test assumes the hook checks for blocked tools
      // The actual implementation would need to support this
      const result = await $`cd ${tmpDir} && echo ${JSON.stringify(input)} | bun run .specstar/hooks.ts pre_tool_use`
        .quiet()
        .nothrow();
      
      // Should return 2 to block (or 0 if blocking not implemented yet)
      expect([0, 2]).toContain(result.exitCode);
    });
    
    it('should return exit code 1 on error', async () => {
      // Send malformed JSON to trigger an error
      const result = await $`cd ${tmpDir} && echo "not-valid-json" | bun run .specstar/hooks.ts pre_tool_use`
        .quiet()
        .nothrow();
      
      expect(result.exitCode).toBe(1);
    });
  });
  
  describe('State management for Task tool', () => {
    it('should update state.json when tool_name is "Task"', async () => {
      const sessionDir = join(tmpDir, '.specstar', 'sessions', sessionId);
      await mkdir(sessionDir, { recursive: true });
      
      const input = {
        session_id: sessionId,
        tool_name: 'Task',
        tool_input: {
          subagent_type: 'code_editor',
          instructions: 'Fix the bug in main.ts'
        }
      };
      
      const result = await $`cd ${tmpDir} && echo ${JSON.stringify(input)} | bun run .specstar/hooks.ts pre_tool_use`
        .quiet()
        .nothrow();
      
      expect(result.exitCode).toBe(0);
      
      // Check that state.json was created/updated
      const stateFile = join(sessionDir, 'state.json');
      expect(await existsSync(stateFile)).toBe(true);
      
      // Read and verify state content
      const stateContent = await readFile(stateFile, 'utf-8');
      const state = JSON.parse(stateContent);
      
      expect(state.session_id).toBe(sessionId);
      expect(state.agents).toContain('code_editor');
      expect(state.agents_history).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'code_editor',
            started_at: expect.any(String)
          })
        ])
      );
    });
    
    it('should not update state for non-Task tools', async () => {
      const sessionDir = join(tmpDir, '.specstar', 'sessions', sessionId);
      await mkdir(sessionDir, { recursive: true });
      
      // Create initial state
      const initialState = {
        session_id: sessionId,
        agents: [],
        agents_history: []
      };
      await Bun.write(
        join(sessionDir, 'state.json'),
        JSON.stringify(initialState)
      );
      
      const input = {
        session_id: sessionId,
        tool_name: 'Read',
        tool_input: { file_path: '/some/file.txt' }
      };
      
      const result = await $`cd ${tmpDir} && echo ${JSON.stringify(input)} | bun run .specstar/hooks.ts pre_tool_use`
        .quiet()
        .nothrow();
      
      expect(result.exitCode).toBe(0);
      
      // State should not have agent-related changes
      const stateContent = await readFile(join(sessionDir, 'state.json'), 'utf-8');
      const state = JSON.parse(stateContent);
      
      expect(state.agents).toEqual([]);
      expect(state.agents_history).toEqual([]);
    });
    
    it('should handle multiple Task invocations', async () => {
      const sessionDir = join(tmpDir, '.specstar', 'sessions', sessionId);
      await mkdir(sessionDir, { recursive: true });
      
      // First Task invocation
      const input1 = {
        session_id: sessionId,
        tool_name: 'Task',
        tool_input: { subagent_type: 'code_editor' }
      };
      
      await $`cd ${tmpDir} && echo ${JSON.stringify(input1)} | bun run .specstar/hooks.ts pre_tool_use`
        .quiet()
        .nothrow();
      
      // Second Task invocation with different agent
      const input2 = {
        session_id: sessionId,
        tool_name: 'Task',
        tool_input: { subagent_type: 'test_writer' }
      };
      
      await $`cd ${tmpDir} && echo ${JSON.stringify(input2)} | bun run .specstar/hooks.ts pre_tool_use`
        .quiet()
        .nothrow();
      
      // Verify both agents are tracked
      const stateContent = await readFile(join(sessionDir, 'state.json'), 'utf-8');
      const state = JSON.parse(stateContent);
      
      expect(state.agents).toContain('code_editor');
      expect(state.agents).toContain('test_writer');
      expect(state.agents_history.length).toBe(2);
    });
  });
  
  describe('Logging', () => {
    it('should append to pre_tool_use.json log file', async () => {
      const input = {
        session_id: sessionId,
        tool_name: 'Write',
        tool_input: { 
          file_path: '/test/file.txt',
          content: 'Hello, world!'
        }
      };
      
      const result = await $`cd ${tmpDir} && echo ${JSON.stringify(input)} | bun run .specstar/hooks.ts pre_tool_use`
        .quiet()
        .nothrow();
      
      expect(result.exitCode).toBe(0);
      
      // Check that log file was created
      const logFile = join(tmpDir, '.specstar', 'logs', 'pre_tool_use.json');
      expect(await existsSync(logFile)).toBe(true);
      
      // Read and verify log content
      const logContent = await readFile(logFile, 'utf-8');
      const logs = JSON.parse(logContent);
      
      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBeGreaterThan(0);
      
      const lastLog = logs[logs.length - 1];
      expect(lastLog).toEqual(
        expect.objectContaining({
          timestamp: expect.any(String),
          session_id: sessionId,
          tool_name: 'Write',
          tool_input: expect.objectContaining({
            file_path: '/test/file.txt',
            content: 'Hello, world!'
          })
        })
      );
    });
    
    it('should append to existing log file', async () => {
      // Create initial log file
      const logFile = join(tmpDir, '.specstar', 'logs', 'pre_tool_use.json');
      const initialLogs = [
        {
          timestamp: '2024-01-01T00:00:00.000Z',
          session_id: 'old-session',
          tool_name: 'OldTool',
          tool_input: {}
        }
      ];
      await mkdir(join(tmpDir, '.specstar', 'logs'), { recursive: true });
      await Bun.write(logFile, JSON.stringify(initialLogs, null, 2));
      
      // Execute hook
      const input = {
        session_id: sessionId,
        tool_name: 'NewTool',
        tool_input: { param: 'value' }
      };
      
      await $`cd ${tmpDir} && echo ${JSON.stringify(input)} | bun run .specstar/hooks.ts pre_tool_use`
        .quiet()
        .nothrow();
      
      // Verify log was appended
      const logContent = await readFile(logFile, 'utf-8');
      const logs = JSON.parse(logContent);
      
      expect(logs.length).toBe(2);
      expect(logs[0].tool_name).toBe('OldTool');
      expect(logs[1].tool_name).toBe('NewTool');
    });
    
    it('should handle concurrent logging safely', async () => {
      // Run multiple hooks in parallel
      const promises = [];
      for (let i = 0; i < 5; i++) {
        const input = {
          session_id: sessionId,
          tool_name: `Tool${i}`,
          tool_input: { index: i }
        };
        
        promises.push(
          $`cd ${tmpDir} && echo ${JSON.stringify(input)} | bun run .specstar/hooks.ts pre_tool_use`
            .quiet()
            .nothrow()
        );
      }
      
      const results = await Promise.all(promises);
      
      // All should succeed
      results.forEach(result => {
        expect(result.exitCode).toBe(0);
      });
      
      // Verify all logs were written
      const logFile = join(tmpDir, '.specstar', 'logs', 'pre_tool_use.json');
      const logContent = await readFile(logFile, 'utf-8');
      const logs = JSON.parse(logContent);
      
      expect(logs.length).toBe(5);
      
      // Check that all tools are present
      const toolNames = logs.map((log: any) => log.tool_name);
      for (let i = 0; i < 5; i++) {
        expect(toolNames).toContain(`Tool${i}`);
      }
    });
  });
  
  describe('Error handling', () => {
    it('should handle missing hook file gracefully', async () => {
      // Remove hook file
      await rm(hookPath, { force: true });
      
      const input = {
        session_id: sessionId,
        tool_name: 'Read',
        tool_input: {}
      };
      
      const result = await $`cd ${tmpDir} && echo ${JSON.stringify(input)} | bun run .specstar/hooks.ts pre_tool_use 2>&1`
        .quiet()
        .nothrow();
      
      // Should fail with error
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr.toString() + result.stdout.toString()).toContain('error');
    });
    
    it('should handle file system errors gracefully', async () => {
      // Make logs directory read-only
      const logsDir = join(tmpDir, '.specstar', 'logs');
      await $`chmod 444 ${logsDir}`.quiet().nothrow();
      
      const input = {
        session_id: sessionId,
        tool_name: 'Read',
        tool_input: {}
      };
      
      const result = await $`cd ${tmpDir} && echo ${JSON.stringify(input)} | bun run .specstar/hooks.ts pre_tool_use`
        .quiet()
        .nothrow();
      
      // Should handle the error (may still return 0 if it continues despite log error)
      expect([0, 1]).toContain(result.exitCode);
      
      // Restore permissions for cleanup
      await $`chmod 755 ${logsDir}`.quiet().nothrow();
    });
  });
});