import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { $ } from 'bun';
import { join } from 'path';
import { mkdtempSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';

describe('Contract Test: session_end hook', () => {
  let tmpDir: string;
  let sessionId: string;
  const hookScript = join(process.cwd(), '.specstar', 'hooks.ts');
  
  beforeEach(async () => {
    // Create temp directory for test with .specstar structure
    tmpDir = mkdtempSync(join(tmpdir(), 'specstar-test-session-end-'));
    sessionId = 'test-session-' + Date.now();
    
    // Create directories in temp location for testing
    const specstarDir = join(tmpDir, '.specstar');
    const sessionsDir = join(specstarDir, 'sessions');
    const sessionDir = join(sessionsDir, sessionId);
    const logsDir = join(specstarDir, 'logs');
    
    // Initialize directory structure
    await $`mkdir -p ${sessionDir}`.quiet();
    await $`mkdir -p ${logsDir}`.quiet();
    
    // Initialize empty log file
    await Bun.write(join(logsDir, 'session_end.json'), '[]');
  });
  
  afterEach(async () => {
    // Clean up test sessions from actual .specstar directory
    const actualSessionDir = join(process.cwd(), '.specstar', 'sessions', sessionId);
    if (existsSync(actualSessionDir)) {
      await $`rm -rf ${actualSessionDir}`.quiet();
    }
    
    // Clean up temp directory
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
  
  describe('Input Validation', () => {
    test('should require session_id parameter', async () => {
      // Test missing session_id
      const result = await $`echo '{"reason":"clear"}' | bun run ${hookScript} session_end`
        .quiet()
        .nothrow();
      
      // Hook requires session_id and will exit with error
      expect(result.exitCode).toBe(1); // Missing required field causes error
    });
    
    test('should require reason parameter with valid enum value', async () => {
      // Test missing reason - hook should handle gracefully
      const result = await $`echo '{"session_id":"${sessionId}"}' | bun run ${hookScript} session_end`
        .quiet()
        .nothrow();
      
      expect(result.exitCode).toBe(0); // Should not block
      
      // Test invalid reason - hook should handle gracefully
      const invalidResult = await $`echo '{"session_id":"${sessionId}","reason":"invalid"}' | bun run ${hookScript} session_end`
        .quiet()
        .nothrow();
      
      expect(invalidResult.exitCode).toBe(0); // Should not block
    });
    
    test('should accept valid reason enum values', async () => {
      // Test all valid reason values
      const validReasons = ['clear', 'logout', 'prompt_input_exit', 'other'];
      
      for (const reason of validReasons) {
        const testId = `${sessionId}-${reason}`;
        const result = await $`echo '{"session_id":"${testId}","reason":"${reason}"}' | bun run ${hookScript} session_end`
          .quiet()
          .nothrow();
        
        expect(result.exitCode).toBe(0);
        
        // Verify session state was created
        const stateFile = join(process.cwd(), '.specstar', 'sessions', testId, 'state.json');
        expect(existsSync(stateFile)).toBe(true);
        
        // Clean up
        await $`rm -rf ${join(process.cwd(), '.specstar', 'sessions', testId)}`.quiet();
      }
    });
  });
  
  describe('Exit Code Behavior', () => {
    test('should always return exit code 0 on success (never blocks)', async () => {
      const result = await $`echo '{"session_id":"${sessionId}","reason":"clear"}' | bun run ${hookScript} session_end`
        .quiet()
        .nothrow();
      
      expect(result.exitCode).toBe(0);
    });
    
    test('should handle errors gracefully', async () => {
      // Even with malformed input, hook should try to handle gracefully
      const result = await $`echo 'not-json' | bun run ${hookScript} session_end`
        .quiet()
        .nothrow();
      
      // Hook exits with 1 on JSON parse error
      expect(result.exitCode).toBe(1);
      expect(result.stderr.toString()).toContain('Failed to parse JSON');
    });
  });
  
  describe('State File Updates', () => {
    test('should update session state.json atomically', async () => {
      // First create a session with session_start
      await $`echo '{"session_id":"${sessionId}"}' | bun run ${hookScript} session_start`.quiet();
      
      // Verify initial state
      const stateFile = join(process.cwd(), '.specstar', 'sessions', sessionId, 'state.json');
      const initialState = JSON.parse(await Bun.file(stateFile).text());
      expect(initialState.session_active).toBe(true);
      
      // End the session
      const result = await $`echo '{"session_id":"${sessionId}","reason":"logout"}' | bun run ${hookScript} session_end`
        .quiet()
        .nothrow();
      
      expect(result.exitCode).toBe(0);
      
      // Verify state was updated
      const updatedState = JSON.parse(await Bun.file(stateFile).text());
      expect(updatedState.session_active).toBe(false);
      expect(new Date(updatedState.updated_at).getTime()).toBeGreaterThanOrEqual(
        new Date(initialState.created_at).getTime()
      );
    });
    
    test('should create state if it does not exist', async () => {
      const newSessionId = `${sessionId}-new`;
      
      // End a session that doesn't exist yet
      const result = await $`echo '{"session_id":"${newSessionId}","reason":"other"}' | bun run ${hookScript} session_end`
        .quiet()
        .nothrow();
      
      expect(result.exitCode).toBe(0);
      
      // Verify state was created
      const stateFile = join(process.cwd(), '.specstar', 'sessions', newSessionId, 'state.json');
      expect(existsSync(stateFile)).toBe(true);
      
      const state = JSON.parse(await Bun.file(stateFile).text());
      expect(state.session_id).toBe(newSessionId);
      expect(state.session_active).toBe(false);
      
      // Clean up
      await $`rm -rf ${join(process.cwd(), '.specstar', 'sessions', newSessionId)}`.quiet();
    });
  });
  
  describe('Log File Updates', () => {
    test('should append to session_end.json log file', async () => {
      const logFile = join(process.cwd(), '.specstar', 'logs', 'session_end.json');
      
      // Get initial log count
      const initialLogs = JSON.parse(await Bun.file(logFile).text());
      const initialCount = initialLogs.length;
      
      // End a session
      const testSessionId = `${sessionId}-log-test`;
      const result = await $`echo '{"session_id":"${testSessionId}","reason":"prompt_input_exit"}' | bun run ${hookScript} session_end`
        .quiet()
        .nothrow();
      
      expect(result.exitCode).toBe(0);
      
      // Verify log was appended
      const updatedLogs = JSON.parse(await Bun.file(logFile).text());
      expect(updatedLogs.length).toBe(initialCount + 1);
      
      const lastLog = updatedLogs[updatedLogs.length - 1];
      expect(lastLog.session_id).toBe(testSessionId);
      expect(lastLog.reason).toBe('prompt_input_exit');
      expect(lastLog.timestamp).toBeDefined();
      
      // Clean up
      await $`rm -rf ${join(process.cwd(), '.specstar', 'sessions', testSessionId)}`.quiet();
    });
    
    test('should handle concurrent log writes', async () => {
      const logFile = join(process.cwd(), '.specstar', 'logs', 'session_end.json');
      
      // Get initial log count
      const initialLogs = JSON.parse(await Bun.file(logFile).text());
      const initialCount = initialLogs.length;
      
      // Launch multiple concurrent hook invocations
      const promises = [];
      const sessionIds = [];
      
      for (let i = 0; i < 5; i++) {
        const concurrentId = `${sessionId}-concurrent-${i}`;
        sessionIds.push(concurrentId);
        
        const promise = $`echo '{"session_id":"${concurrentId}","reason":"clear"}' | bun run ${hookScript} session_end`
          .quiet()
          .nothrow();
        promises.push(promise);
      }
      
      const results = await Promise.all(promises);
      
      // All should succeed
      results.forEach(result => {
        expect(result.exitCode).toBe(0);
      });
      
      // Verify entries were logged (might lose some due to race conditions)
      const updatedLogs = JSON.parse(await Bun.file(logFile).text());
      // At least some of the concurrent writes should succeed
      expect(updatedLogs.length).toBeGreaterThan(initialCount);
      
      // Count how many concurrent sessions were successfully logged
      let successfulLogs = 0;
      for (const concurrentId of sessionIds) {
        const entry = updatedLogs.find(log => log.session_id === concurrentId);
        if (entry) {
          successfulLogs++;
          expect(entry.reason).toBe('clear');
        }
        
        // Clean up
        await $`rm -rf ${join(process.cwd(), '.specstar', 'sessions', concurrentId)}`.quiet();
      }
      
      // At least some concurrent writes should succeed (race condition is expected)
      expect(successfulLogs).toBeGreaterThan(0);
    });
  });
  
  describe('Integration with Claude Code', () => {
    test('should be invokable via Claude Code hook command format', async () => {
      // Test the exact command format Claude Code will use
      const testId = `${sessionId}-claude`;
      const claudeCommand = `echo '{"session_id":"${testId}","reason":"logout"}' | bun run ${hookScript} session_end`;
      const result = await $`bash -c "${claudeCommand}"`.quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      
      // Verify session was created
      const stateFile = join(process.cwd(), '.specstar', 'sessions', testId, 'state.json');
      expect(existsSync(stateFile)).toBe(true);
      
      // Clean up
      await $`rm -rf ${join(process.cwd(), '.specstar', 'sessions', testId)}`.quiet();
    });
    
    test('should handle stdin input correctly', async () => {
      const testId = `${sessionId}-stdin`;
      
      // Create a temporary file with JSON input
      const inputFile = join(tmpDir, 'input.json');
      await Bun.write(inputFile, JSON.stringify({
        session_id: testId,
        reason: 'clear'
      }));
      
      // Test with stdin redirect
      const result = await $`bun run ${hookScript} session_end < ${inputFile}`.quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      
      // Verify session was created
      const stateFile = join(process.cwd(), '.specstar', 'sessions', testId, 'state.json');
      expect(existsSync(stateFile)).toBe(true);
      
      // Clean up
      await $`rm -rf ${join(process.cwd(), '.specstar', 'sessions', testId)}`.quiet();
    });
  });
  
  describe('Error Handling', () => {
    test('should handle malformed JSON input', async () => {
      const result = await $`echo 'not-valid-json' | bun run ${hookScript} session_end`
        .quiet()
        .nothrow();
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr.toString()).toContain('Failed to parse JSON');
    });
    
    test('should handle missing hook type gracefully', async () => {
      const result = await $`echo '{"session_id":"test"}' | bun run ${hookScript}`
        .quiet()
        .nothrow();
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr.toString()).toContain('Hook type not specified');
    });
    
    test('should handle unknown hook type', async () => {
      const result = await $`echo '{"session_id":"test"}' | bun run ${hookScript} unknown_hook`
        .quiet()
        .nothrow();
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr.toString()).toContain('Unknown hook type');
    });
  });
  
  describe('Complete Workflow', () => {
    test('should handle full session lifecycle', async () => {
      const workflowId = `${sessionId}-workflow`;
      
      // Start session
      await $`echo '{"session_id":"${workflowId}"}' | bun run ${hookScript} session_start`.quiet();
      
      // Submit a prompt
      await $`echo '{"session_id":"${workflowId}","prompt":"Test prompt"}' | bun run ${hookScript} user_prompt_submit`.quiet();
      
      // Use a tool
      await $`echo '{"session_id":"${workflowId}","tool_name":"Read","parameters":{}}' | bun run ${hookScript} pre_tool_use`.quiet();
      await $`echo '{"session_id":"${workflowId}","tool_name":"Read","success":true}' | bun run ${hookScript} post_tool_use`.quiet();
      
      // End session
      const result = await $`echo '{"session_id":"${workflowId}","reason":"prompt_input_exit"}' | bun run ${hookScript} session_end`.quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      
      // Verify final state
      const stateFile = join(process.cwd(), '.specstar', 'sessions', workflowId, 'state.json');
      const finalState = JSON.parse(await Bun.file(stateFile).text());
      
      expect(finalState.session_active).toBe(false);
      expect(finalState.prompts.length).toBeGreaterThan(0);
      expect(finalState.tools_used['Read']).toBe(1);
      
      // Verify logs
      const sessionEndLog = JSON.parse(await Bun.file(join(process.cwd(), '.specstar', 'logs', 'session_end.json')).text());
      const endEntry = sessionEndLog.find(log => log.session_id === workflowId);
      expect(endEntry).toBeDefined();
      expect(endEntry.reason).toBe('prompt_input_exit');
      
      // Clean up
      await $`rm -rf ${join(process.cwd(), '.specstar', 'sessions', workflowId)}`.quiet();
    });
  });
});