#!/usr/bin/env bun
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { $ } from 'bun';
import { tmpdir } from 'os';
import { join } from 'path';
import { rm, mkdir, readFile, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { existsSync } from 'fs';

describe('Contract: hooks.ts implementation', () => {
  let tmpDir: string;
  let hookPath: string;
  
  beforeAll(async () => {
    // Create temp directory for test environment
    tmpDir = join(tmpdir(), `specstar-test-hooks-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
    await mkdir(join(tmpDir, '.specstar'), { recursive: true });
    await mkdir(join(tmpDir, '.specstar', 'sessions'), { recursive: true });
    await mkdir(join(tmpDir, '.specstar', 'logs'), { recursive: true });
    
    // Path to the hooks.ts file
    hookPath = join(process.cwd(), '.specstar', 'hooks.ts');
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
    if (existsSync(sessionsDir)) {
      await rm(sessionsDir, { recursive: true, force: true });
      await mkdir(sessionsDir, { recursive: true });
    }
    
    // Initialize empty log files
    const hookTypes = ['session_start', 'session_end', 'user_prompt_submit', 
                       'pre_tool_use', 'post_tool_use', 'notification', 
                       'pre_compact', 'stop', 'subagent_stop'];
    for (const hookType of hookTypes) {
      await writeFile(join(logsDir, `${hookType}.json`), '[]');
    }
  });

  describe('session_start hook', () => {
    it('should create session directory and state file', async () => {
      const sessionId = randomUUID();
      const input = {
        session_id: sessionId,
        source: 'startup',
        transcript_path: '/tmp/transcript.md'
      };
      
      const result = await $`echo ${JSON.stringify(input)} | bun ${hookPath} session_start`.cwd(tmpDir).quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      
      // Check if session directory was created
      const sessionDir = join(tmpDir, '.specstar', 'sessions', sessionId);
      expect(existsSync(sessionDir)).toBe(true);
      
      // Check if state file was created
      const stateFile = join(sessionDir, 'state.json');
      expect(existsSync(stateFile)).toBe(true);
      
      // Verify state file content
      const state = JSON.parse(await readFile(stateFile, 'utf-8'));
      expect(state.session_id).toBe(sessionId);
      expect(state.session_active).toBe(true);
    });

    it('should log session start event', async () => {
      const sessionId = randomUUID();
      const input = {
        session_id: sessionId,
        source: 'command'
      };
      
      await $`echo ${JSON.stringify(input)} | bun ${hookPath} session_start`.cwd(tmpDir).quiet().nothrow();
      
      const logFile = join(tmpDir, '.specstar', 'logs', 'session_start.json');
      const logs = JSON.parse(await readFile(logFile, 'utf-8'));
      
      expect(logs.length).toBeGreaterThan(0);
      const lastLog = logs[logs.length - 1];
      expect(lastLog.session_id).toBe(sessionId);
      expect(lastLog.source).toBe('command');
    });
  });

  describe('session_end hook', () => {
    it('should mark session as inactive', async () => {
      const sessionId = randomUUID();
      
      // Start session first
      const startInput = {
        session_id: sessionId,
        source: 'startup'
      };
      await $`echo ${JSON.stringify(startInput)} | bun ${hookPath} session_start`.cwd(tmpDir).quiet().nothrow();
      
      // End session
      const endInput = {
        session_id: sessionId,
        reason: 'user_initiated'
      };
      const result = await $`echo ${JSON.stringify(endInput)} | bun ${hookPath} session_end`.cwd(tmpDir).quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      
      // Check state file
      const stateFile = join(tmpDir, '.specstar', 'sessions', sessionId, 'state.json');
      const state = JSON.parse(await readFile(stateFile, 'utf-8'));
      expect(state.session_active).toBe(false);
    });
  });

  describe('user_prompt_submit hook', () => {
    it('should add prompt to session state', async () => {
      const sessionId = randomUUID();
      
      // Start session first
      const startInput = {
        session_id: sessionId,
        source: 'startup'
      };
      await $`echo ${JSON.stringify(startInput)} | bun ${hookPath} session_start`.cwd(tmpDir).quiet().nothrow();
      
      // Submit prompt
      const promptInput = {
        session_id: sessionId,
        prompt: 'Test prompt',
        conversation_id: 'conv-123'
      };
      const result = await $`echo ${JSON.stringify(promptInput)} | bun ${hookPath} user_prompt_submit`.cwd(tmpDir).quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      
      // Check state file
      const stateFile = join(tmpDir, '.specstar', 'sessions', sessionId, 'state.json');
      const state = JSON.parse(await readFile(stateFile, 'utf-8'));
      expect(state.prompts.length).toBeGreaterThan(0);
      expect(state.prompts[0].prompt).toBe('Test prompt');
    });
  });

  describe('pre_tool_use hook', () => {
    it('should track tool usage', async () => {
      const sessionId = randomUUID();
      
      // Start session first
      const startInput = {
        session_id: sessionId,
        source: 'startup'
      };
      await $`echo ${JSON.stringify(startInput)} | bun ${hookPath} session_start`.cwd(tmpDir).quiet().nothrow();
      
      // Pre tool use
      const toolInput = {
        session_id: sessionId,
        tool_name: 'Read',
        parameters: { file_path: '/test/file.ts' }
      };
      const result = await $`echo ${JSON.stringify(toolInput)} | bun ${hookPath} pre_tool_use`.cwd(tmpDir).quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
    });
  });

  describe('post_tool_use hook', () => {
    it('should update file tracking based on tool use', async () => {
      const sessionId = randomUUID();
      
      // Start session first
      const startInput = {
        session_id: sessionId,
        source: 'startup'
      };
      await $`echo ${JSON.stringify(startInput)} | bun ${hookPath} session_start`.cwd(tmpDir).quiet().nothrow();
      
      // Post tool use - Read (tool_input not parameters)
      const readInput = {
        session_id: sessionId,
        tool_name: 'Read',
        tool_input: { file_path: '/test/file.ts' },
        tool_response: { success: true }
      };
      await $`echo ${JSON.stringify(readInput)} | bun ${hookPath} post_tool_use`.cwd(tmpDir).quiet().nothrow();
      
      // Check state file
      const stateFile = join(tmpDir, '.specstar', 'sessions', sessionId, 'state.json');
      const state = JSON.parse(await readFile(stateFile, 'utf-8'));
      expect(state.files.read).toContain('/test/file.ts');
      expect(state.tools_used.Read).toBe(1);
    });
  });

  describe('notification hook', () => {
    it('should add notification to session state', async () => {
      const sessionId = randomUUID();
      
      // Start session first
      const startInput = {
        session_id: sessionId,
        source: 'startup'
      };
      await $`echo ${JSON.stringify(startInput)} | bun ${hookPath} session_start`.cwd(tmpDir).quiet().nothrow();
      
      // Send notification
      const notificationInput = {
        session_id: sessionId,
        message: 'Test notification',
        type: 'info'
      };
      const result = await $`echo ${JSON.stringify(notificationInput)} | bun ${hookPath} notification`.cwd(tmpDir).quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      
      // Check state file
      const stateFile = join(tmpDir, '.specstar', 'sessions', sessionId, 'state.json');
      const state = JSON.parse(await readFile(stateFile, 'utf-8'));
      expect(state.notifications.length).toBeGreaterThan(0);
      expect(state.notifications[0].message).toBe('Test notification');
    });
  });

  describe('stop hook', () => {
    it('should handle stop request', async () => {
      const sessionId = randomUUID();
      
      const stopInput = {
        session_id: sessionId,
        reason: 'user_requested'
      };
      const result = await $`echo ${JSON.stringify(stopInput)} | bun ${hookPath} stop`.cwd(tmpDir).quiet().nothrow();
      
      // Stop hook returns exit code 0 to allow stopping
      expect(result.exitCode).toBe(0);
    });
  });

  describe('subagent_stop hook', () => {
    it('should handle subagent stop request', async () => {
      const sessionId = randomUUID();
      
      const stopInput = {
        session_id: sessionId,
        agent_name: 'test-agent',
        reason: 'user_requested'
      };
      const result = await $`echo ${JSON.stringify(stopInput)} | bun ${hookPath} subagent_stop`.cwd(tmpDir).quiet().nothrow();
      
      // Subagent stop hook returns exit code 0 to allow stopping
      expect(result.exitCode).toBe(0);
    });
  });

  describe('pre_compact hook', () => {
    it('should handle pre-compact event', async () => {
      const sessionId = randomUUID();
      
      const compactInput = {
        session_id: sessionId,
        conversation_id: 'conv-123'
      };
      const result = await $`echo ${JSON.stringify(compactInput)} | bun ${hookPath} pre_compact`.cwd(tmpDir).quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle invalid hook type', async () => {
      const input = {
        session_id: randomUUID()
      };
      
      const result = await $`echo ${JSON.stringify(input)} | bun ${hookPath} invalid_hook`.cwd(tmpDir).quiet().nothrow();
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr.toString()).toContain('Unknown hook type');
    });

    it('should handle missing session_id', async () => {
      const input = {};
      
      const result = await $`echo ${JSON.stringify(input)} | bun ${hookPath} session_start`.cwd(tmpDir).quiet().nothrow();
      
      expect(result.exitCode).toBe(1);
    });

    it('should handle malformed JSON input', async () => {
      const result = await $`echo "not json" | bun ${hookPath} session_start`.cwd(tmpDir).quiet().nothrow();
      
      expect(result.exitCode).toBe(1);
    });
  });
});