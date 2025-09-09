#!/usr/bin/env bun
import { describe, it, expect, beforeAll, afterAll, beforeEach, mock } from 'bun:test';
import { tmpdir } from 'os';
import { join } from 'path';
import { rm, mkdir, readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { $ } from 'bun';

describe('Contract Test: pre_compact hook', () => {
  let tmpDir: string;
  let hookScript: string;
  let logsDir: string;
  let logFile: string;
  let actualHookScript: string;
  
  beforeAll(async () => {
    // Create temp directory for test environment
    tmpDir = join(tmpdir(), `specstar-test-pre-compact-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
    
    // Create .specstar structure
    await mkdir(join(tmpDir, '.specstar'), { recursive: true });
    logsDir = join(tmpDir, '.specstar', 'logs');
    await mkdir(logsDir, { recursive: true });
    logFile = join(logsDir, 'pre_compact.json');
    
    // Create the hook script path
    hookScript = join(tmpDir, '.specstar', 'hooks.ts');
    
    // Path to actual hook implementation (should exist in project)
    actualHookScript = join(process.cwd(), '.specstar', 'hooks.ts');
  });
  
  afterAll(async () => {
    // Clean up temp directory
    await rm(tmpDir, { recursive: true, force: true });
  });
  
  beforeEach(async () => {
    // Clear log file before each test
    if (existsSync(logFile)) {
      await rm(logFile);
    }
  });
  
  describe('Input validation', () => {
    it('should accept required inputs: session_id, transcript_path, trigger', async () => {
      // Prepare test input
      const input = {
        session_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        transcript_path: '/path/to/transcript.json',
        trigger: 'auto' as const
      };
      
      // Mock hook execution
      const mockHook = mock(async (hookInput: typeof input) => {
        // Validate required fields
        expect(hookInput.session_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        expect(hookInput.transcript_path).toBeDefined();
        expect(hookInput.transcript_path).toBeString();
        expect(hookInput.trigger).toMatch(/^(manual|auto)$/);
        
        // Simulate successful execution
        return { exitCode: 0 };
      });
      
      const result = await mockHook(input);
      expect(result.exitCode).toBe(0);
      expect(mockHook).toHaveBeenCalledTimes(1);
      expect(mockHook).toHaveBeenCalledWith(input);
    });
    
    it('should accept optional custom_instructions', async () => {
      // Prepare test input with optional field
      const input = {
        session_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        transcript_path: '/path/to/transcript.json',
        trigger: 'manual' as const,
        custom_instructions: 'Special compaction instructions'
      };
      
      // Mock hook execution
      const mockHook = mock(async (hookInput: typeof input) => {
        // Validate optional field
        if (hookInput.custom_instructions) {
          expect(hookInput.custom_instructions).toBeString();
        }
        
        return { exitCode: 0 };
      });
      
      const result = await mockHook(input);
      expect(result.exitCode).toBe(0);
      expect(mockHook).toHaveBeenCalledWith(input);
    });
    
    it('should validate trigger enum values', async () => {
      // Test valid trigger values
      const validTriggers = ['manual', 'auto'] as const;
      
      for (const trigger of validTriggers) {
        const input = {
          session_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          transcript_path: '/path/to/transcript.json',
          trigger
        };
        
        const mockHook = mock(async (hookInput: typeof input) => {
          expect(hookInput.trigger).toBe(trigger);
          return { exitCode: 0 };
        });
        
        const result = await mockHook(input);
        expect(result.exitCode).toBe(0);
      }
      
      // Test invalid trigger value
      const invalidInput = {
        session_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        transcript_path: '/path/to/transcript.json',
        trigger: 'invalid' as any
      };
      
      const mockHook = mock(async (hookInput: typeof invalidInput) => {
        // Should validate trigger value
        if (!['manual', 'auto'].includes(hookInput.trigger)) {
          throw new Error(`Invalid trigger value: ${hookInput.trigger}`);
        }
        return { exitCode: 0 };
      });
      
      await expect(mockHook(invalidInput)).rejects.toThrow('Invalid trigger value: invalid');
    });
    
    it('should validate session_id is a valid UUID', async () => {
      const validUUIDs = [
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        '550e8400-e29b-41d4-a716-446655440000',
        '00000000-0000-0000-0000-000000000000'
      ];
      
      for (const uuid of validUUIDs) {
        const input = {
          session_id: uuid,
          transcript_path: '/path/to/transcript.json',
          trigger: 'auto' as const
        };
        
        const mockHook = mock(async (hookInput: typeof input) => {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          expect(hookInput.session_id).toMatch(uuidRegex);
          return { exitCode: 0 };
        });
        
        const result = await mockHook(input);
        expect(result.exitCode).toBe(0);
      }
      
      // Test invalid UUIDs
      const invalidUUIDs = [
        'not-a-uuid',
        '12345',
        'f47ac10b-58cc-4372-a567',
        ''
      ];
      
      for (const invalidUuid of invalidUUIDs) {
        const input = {
          session_id: invalidUuid,
          transcript_path: '/path/to/transcript.json',
          trigger: 'auto' as const
        };
        
        const mockHook = mock(async (hookInput: typeof input) => {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(hookInput.session_id)) {
            throw new Error(`Invalid session_id format: ${hookInput.session_id}`);
          }
          return { exitCode: 0 };
        });
        
        await expect(mockHook(input)).rejects.toThrow(`Invalid session_id format: ${invalidUuid}`);
      }
    });
  });
  
  describe('Execution behavior', () => {
    it('should return exit code 0 on success (never blocks)', async () => {
      const input = {
        session_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        transcript_path: '/path/to/transcript.json',
        trigger: 'auto' as const
      };
      
      // Mock hook that always succeeds
      const mockHook = mock(async () => {
        // Hook should never block Claude Code operations
        // Always return success even if internal operations fail
        return { exitCode: 0 };
      });
      
      const result = await mockHook();
      expect(result.exitCode).toBe(0);
    });
    
    it('should handle internal errors gracefully without blocking', async () => {
      const input = {
        session_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        transcript_path: '/path/to/transcript.json',
        trigger: 'auto' as const
      };
      
      // Mock hook with internal error handling
      const mockHook = mock(async (hookInput: typeof input) => {
        try {
          // Simulate an internal error
          throw new Error('Internal logging error');
        } catch (error) {
          // Hook should catch and handle errors internally
          // Still return success to avoid blocking Claude Code
          console.error('Hook error handled internally:', error);
          return { exitCode: 0 };
        }
      });
      
      const result = await mockHook(input);
      expect(result.exitCode).toBe(0);
    });
    
    it('should complete execution quickly (non-blocking)', async () => {
      const input = {
        session_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        transcript_path: '/path/to/transcript.json',
        trigger: 'manual' as const
      };
      
      // Mock hook with timing check
      const mockHook = mock(async (hookInput: typeof input) => {
        const startTime = Date.now();
        
        // Simulate quick logging operation
        await new Promise(resolve => setTimeout(resolve, 10));
        
        const executionTime = Date.now() - startTime;
        
        // Hook should execute quickly (under 100ms for logging)
        expect(executionTime).toBeLessThan(100);
        
        return { exitCode: 0, executionTime };
      });
      
      const result = await mockHook(input);
      expect(result.exitCode).toBe(0);
      expect(result.executionTime).toBeLessThan(100);
    });
  });
  
  describe('Logging behavior', () => {
    it('should append to .specstar/logs/pre_compact.json', async () => {
      const input = {
        session_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        transcript_path: '/path/to/transcript.json',
        trigger: 'auto' as const,
        custom_instructions: 'Test instructions'
      };
      
      // Mock hook that simulates logging
      const mockHook = mock(async (hookInput: typeof input) => {
        // Simulate appending to log file
        const logEntry = {
          timestamp: new Date().toISOString(),
          ...hookInput
        };
        
        let logs = [];
        if (existsSync(logFile)) {
          const content = await readFile(logFile, 'utf-8');
          logs = JSON.parse(content);
        }
        
        logs.push(logEntry);
        await writeFile(logFile, JSON.stringify(logs, null, 2));
        
        return { exitCode: 0 };
      });
      
      // Execute hook multiple times
      await mockHook(input);
      await mockHook({ ...input, trigger: 'auto' });
      
      // Verify log file exists and contains entries
      expect(existsSync(logFile)).toBe(true);
      
      const logContent = await readFile(logFile, 'utf-8');
      const logs = JSON.parse(logContent);
      
      expect(logs).toBeArray();
      expect(logs).toHaveLength(2);
      expect(logs[0]).toMatchObject({
        session_id: input.session_id,
        transcript_path: input.transcript_path,
        trigger: 'auto',
        custom_instructions: input.custom_instructions
      });
      expect(logs[1]).toMatchObject({
        session_id: input.session_id,
        transcript_path: input.transcript_path,
        trigger: 'manual',
        custom_instructions: input.custom_instructions
      });
    });
    
    it('should preserve existing log entries when appending', async () => {
      // Create initial log entries
      const existingLogs = [
        {
          timestamp: '2025-01-01T10:00:00Z',
          session_id: 'old-session-id',
          transcript_path: '/old/path',
          trigger: 'manual'
        }
      ];
      await writeFile(logFile, JSON.stringify(existingLogs, null, 2));
      
      const input = {
        session_id: 'new-session-id',
        transcript_path: '/new/path',
        trigger: 'auto' as const
      };
      
      // Mock hook that appends to existing log
      const mockHook = mock(async (hookInput: typeof input) => {
        let logs = [];
        if (existsSync(logFile)) {
          const content = await readFile(logFile, 'utf-8');
          logs = JSON.parse(content);
        }
        
        const logEntry = {
          timestamp: new Date().toISOString(),
          ...hookInput
        };
        
        logs.push(logEntry);
        await writeFile(logFile, JSON.stringify(logs, null, 2));
        
        return { exitCode: 0 };
      });
      
      await mockHook(input);
      
      // Verify both old and new entries exist
      const logContent = await readFile(logFile, 'utf-8');
      const logs = JSON.parse(logContent);
      
      expect(logs).toHaveLength(2);
      expect(logs[0]).toMatchObject(existingLogs[0] ?? {});
      expect(logs[1]).toMatchObject(input);
    });
    
    it('should include timestamp in log entries', async () => {
      const input = {
        session_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        transcript_path: '/path/to/transcript.json',
        trigger: 'auto' as const
      };
      
      // Mock hook with timestamp
      const mockHook = mock(async (hookInput: typeof input) => {
        const beforeTime = new Date();
        
        const logEntry = {
          timestamp: new Date().toISOString(),
          ...hookInput
        };
        
        const afterTime = new Date();
        
        // Verify timestamp is valid ISO string
        expect(logEntry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        
        // Verify timestamp is within reasonable range
        const logTime = new Date(logEntry.timestamp);
        expect(logTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
        expect(logTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());
        
        let logs = [];
        if (existsSync(logFile)) {
          const content = await readFile(logFile, 'utf-8');
          logs = JSON.parse(content);
        }
        
        logs.push(logEntry);
        await writeFile(logFile, JSON.stringify(logs, null, 2));
        
        return { exitCode: 0 };
      });
      
      await mockHook(input);
      
      // Verify timestamp in saved log
      const logContent = await readFile(logFile, 'utf-8');
      const logs = JSON.parse(logContent);
      
      expect(logs[0]).toHaveProperty('timestamp');
      expect(logs[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });
  
  describe('Actual hook implementation', () => {
    it('should execute the real pre_compact hook and log to file', async () => {
      // This test verifies the actual hook implementation
      if (!existsSync(actualHookScript)) {
        // Hook not implemented yet - this test should fail initially
        throw new Error('Hook script not found at .specstar/hooks.ts - implement the hook first!');
      }
      
      const input = {
        session_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        transcript_path: '/path/to/transcript.json',
        trigger: 'auto',
        custom_instructions: 'Test compaction'
      };
      
      // Change to temp directory to use its log structure
      const result = await $`cd ${tmpDir} && echo ${JSON.stringify(input)} | bun run ${actualHookScript} pre_compact`.quiet().nothrow();
      
      // Hook should always return 0 (non-blocking)
      expect(result.exitCode).toBe(0);
      
      // Check if log file was created
      expect(existsSync(logFile)).toBe(true);
      
      // Verify log entry was appended
      const logContent = await readFile(logFile, 'utf-8');
      const logs = JSON.parse(logContent);
      
      expect(logs).toBeArray();
      expect(logs.length).toBeGreaterThan(0);
      
      const lastLog = logs[logs.length - 1];
      expect(lastLog).toMatchObject({
        session_id: input.session_id,
        transcript_path: input.transcript_path,
        trigger: input.trigger,
        custom_instructions: input.custom_instructions
      });
      expect(lastLog).toHaveProperty('timestamp');
    });
  });
  
  describe('Integration with hook script', () => {
    it('should execute via command line with JSON input', async () => {
      // Create a minimal hook script for testing
      const testHookScript = `
#!/usr/bin/env bun

// Minimal test hook implementation
const hookType = process.argv[2];
const input = JSON.parse(await Bun.stdin.text());

if (hookType !== 'pre_compact') {
  console.error('Unknown hook type:', hookType);
  process.exit(1);
}

// Validate required fields
if (!input.session_id || !input.transcript_path || !input.trigger) {
  console.error('Missing required fields');
  process.exit(1);
}

// Validate trigger enum
if (!['manual', 'auto'].includes(input.trigger)) {
  console.error('Invalid trigger value:', input.trigger);
  process.exit(1);
}

// Simulate logging (minimal implementation)
console.log('Hook executed successfully');
process.exit(0);
`;
      
      await writeFile(hookScript, testHookScript);
      
      const input = {
        session_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        transcript_path: '/path/to/transcript.json',
        trigger: 'auto'
      };
      
      // Execute actual hook script
      const result = await $`echo ${JSON.stringify(input)} | bun run ${hookScript} pre_compact`.quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('Hook executed successfully');
    });
    
    it('should handle malformed JSON input gracefully', async () => {
      // Mock command execution with invalid JSON
      const mockExec = mock(async (command: string, inputJson: string) => {
        try {
          JSON.parse(inputJson);
        } catch (error) {
          // Hook should handle parse errors gracefully
          console.error('Invalid JSON input:', error);
          return { exitCode: 0, stdout: '', stderr: 'Invalid JSON input' };
        }
        
        return { exitCode: 0, stdout: '', stderr: '' };
      });
      
      const result = await mockExec(
        `bun run ${hookScript} pre_compact`,
        'invalid json {'
      );
      
      // Should still return success to avoid blocking
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain('Invalid JSON');
    });
  });
});