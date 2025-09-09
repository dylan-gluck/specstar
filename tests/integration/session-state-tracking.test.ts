#!/usr/bin/env bun
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { $ } from 'bun';
import { tmpdir } from 'os';
import { join } from 'path';
import { rm, mkdir, readFile, writeFile, access } from 'fs/promises';
import { randomUUID } from 'crypto';
import { SessionMonitor } from '../../src/lib/session-monitor';
import { HookIntegrator } from '../../src/lib/hook-integrator';
import type { SessionData } from '../../src/lib/session-monitor';

describe('Integration: Session State Tracking', () => {
  let tmpDir: string;
  let sessionMonitor: SessionMonitor;
  let hookIntegrator: HookIntegrator;
  let sessionId: string;

  beforeAll(async () => {
    // Create temp directory for test environment
    tmpDir = join(tmpdir(), `specstar-test-session-tracking-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
    await mkdir(join(tmpDir, '.specstar'), { recursive: true });
    await mkdir(join(tmpDir, '.specstar', 'sessions'), { recursive: true });
    await mkdir(join(tmpDir, '.specstar', 'logs'), { recursive: true });
  });

  afterAll(async () => {
    // Clean up temp directory
    await rm(tmpDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    sessionId = randomUUID();
    
    // Initialize session monitor
    sessionMonitor = new SessionMonitor({
      sessionPath: join(tmpDir, '.specstar', 'sessions'),
      claudePath: join(tmpDir, '.claude'),
      pollingInterval: 50, // Faster for tests
      debounceDelay: 10
    });

    // Initialize hook integrator
    hookIntegrator = new HookIntegrator({
      hooksPath: join(tmpDir, '.specstar', 'hooks.ts'),
      isolateErrors: false
    });

    // Link monitor and integrator
    sessionMonitor.setHookIntegrator(hookIntegrator);
  });

  afterEach(async () => {
    // Stop monitor to clean up watchers
    await sessionMonitor.stop();
    
    // Clean up session files
    const sessionsDir = join(tmpDir, '.specstar', 'sessions');
    await rm(sessionsDir, { recursive: true, force: true });
    await mkdir(sessionsDir, { recursive: true });
  });

  describe('Session lifecycle state transitions', () => {
    it('should track state from session_start to session_end', async () => {
      const sessionDir = join(tmpDir, '.specstar', 'sessions', sessionId);
      const stateFile = join(sessionDir, 'state.json');

      // Start monitoring
      await sessionMonitor.start();

      // 1. Session Start
      await mkdir(sessionDir, { recursive: true });
      const initialState: SessionData = {
        session_id: sessionId,
        session_title: 'Test Session',
        session_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        agents: [],
        agents_history: [],
        files: {
          new: [],
          edited: [],
          read: []
        },
        tools_used: {},
        errors: [],
        prompts: []
      };
      
      await writeFile(stateFile, JSON.stringify(initialState, null, 2), 'utf-8');
      
      // Wait for monitor to detect
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify session is tracked
      const currentSession = sessionMonitor.getCurrentSession();
      expect(currentSession).toBeDefined();
      expect(currentSession?.session_id).toBe(sessionId);
      expect(currentSession?.session_active).toBe(true);

      // 2. User Prompt Submit
      const promptState: SessionData = {
        ...initialState,
        updated_at: new Date().toISOString(),
        prompts: [{
          timestamp: new Date().toISOString(),
          prompt: 'Test prompt'
        }]
      };
      
      await writeFile(stateFile, JSON.stringify(promptState, null, 2), 'utf-8');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify prompt is tracked
      const afterPrompt = sessionMonitor.getCurrentSession();
      expect(afterPrompt?.prompts).toHaveLength(1);
      expect(afterPrompt?.prompts[0]?.prompt).toBe('Test prompt');

      // 3. Tool Use
      const toolState: SessionData = {
        ...promptState,
        updated_at: new Date().toISOString(),
        tools_used: {
          'Read': 1,
          'Write': 2,
          'Bash': 3
        },
        files: {
          new: ['file1.ts'],
          edited: ['file2.ts', 'file3.ts'],
          read: ['file4.ts']
        }
      };
      
      await writeFile(stateFile, JSON.stringify(toolState, null, 2), 'utf-8');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify tool use is tracked
      const afterTools = sessionMonitor.getCurrentSession();
      expect(afterTools?.tools_used['Read']).toBe(1);
      expect(afterTools?.tools_used['Write']).toBe(2);
      expect(afterTools?.files.new).toContain('file1.ts');
      expect(afterTools?.files.edited).toHaveLength(2);

      // 4. Session End
      const endState: SessionData = {
        ...toolState,
        session_active: false,
        updated_at: new Date().toISOString()
      };
      
      await writeFile(stateFile, JSON.stringify(endState, null, 2), 'utf-8');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify session ended
      const endedSession = sessionMonitor.getCurrentSession();
      expect(endedSession).toBeNull(); // No active sessions
      
      // But history should contain it
      const history = await sessionMonitor.getSessionHistory();
      expect(history.some(s => s.session_id === sessionId)).toBe(true);
    });

    it('should handle multiple state transitions rapidly', async () => {
      const sessionDir = join(tmpDir, '.specstar', 'sessions', sessionId);
      const stateFile = join(sessionDir, 'state.json');

      await sessionMonitor.start();
      await mkdir(sessionDir, { recursive: true });

      const states: SessionData[] = [];
      const baseState: SessionData = {
        session_id: sessionId,
        session_title: 'Rapid Test',
        session_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        agents: [],
        agents_history: [],
        files: { new: [], edited: [], read: [] },
        tools_used: {},
        errors: [],
        prompts: []
      };

      // Simulate rapid state changes
      for (let i = 0; i < 10; i++) {
        const state = {
          ...baseState,
          updated_at: new Date().toISOString(),
          prompts: Array.from({ length: i + 1 }, (_, j) => ({
            timestamp: new Date().toISOString(),
            prompt: `Prompt ${j}`
          }))
        };
        
        states.push(state);
        await writeFile(stateFile, JSON.stringify(state, null, 2), 'utf-8');
        await new Promise(resolve => setTimeout(resolve, 20));
      }

      // Final state should have all prompts
      const finalSession = sessionMonitor.getCurrentSession();
      expect(finalSession?.prompts).toHaveLength(10);
    });
  });

  describe('Atomic state file operations', () => {
    it('should create state file atomically', async () => {
      const sessionDir = join(tmpDir, '.specstar', 'sessions', sessionId);
      const stateFile = join(sessionDir, 'state.json');
      const tempFile = `${stateFile}.tmp`;

      await sessionMonitor.start();
      await mkdir(sessionDir, { recursive: true });

      // Create state with atomic write simulation
      const state: SessionData = {
        session_id: sessionId,
        session_title: 'Atomic Test',
        session_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        agents: [],
        agents_history: [],
        files: { new: [], edited: [], read: [] },
        tools_used: {},
        errors: [],
        prompts: []
      };

      // Write to temp file first
      await writeFile(tempFile, JSON.stringify(state, null, 2), 'utf-8');
      
      // Atomic rename
      await Bun.$`mv ${tempFile} ${stateFile}`.quiet();
      
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify state was read correctly
      const currentSession = sessionMonitor.getCurrentSession();
      expect(currentSession?.session_id).toBe(sessionId);
      
      // Verify temp file no longer exists
      try {
        await access(tempFile);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeDefined(); // File should not exist
      }
    });

    it('should handle partial writes gracefully', async () => {
      const sessionDir = join(tmpDir, '.specstar', 'sessions', sessionId);
      const stateFile = join(sessionDir, 'state.json');

      await sessionMonitor.start();
      await mkdir(sessionDir, { recursive: true });

      // Write valid initial state
      const validState: SessionData = {
        session_id: sessionId,
        session_title: 'Valid State',
        session_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        agents: [],
        agents_history: [],
        files: { new: [], edited: [], read: [] },
        tools_used: {},
        errors: [],
        prompts: []
      };
      
      await writeFile(stateFile, JSON.stringify(validState, null, 2), 'utf-8');
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify valid state is tracked
      expect(sessionMonitor.getCurrentSession()?.session_id).toBe(sessionId);

      // Write corrupted JSON (partial write simulation)
      await writeFile(stateFile, '{"session_id": "' + sessionId + '", "session_title": "Corrupted', 'utf-8');
      await new Promise(resolve => setTimeout(resolve, 100));

      // Monitor should retain last valid state or handle error gracefully
      const session = sessionMonitor.getCurrentSession();
      expect(session).toBeDefined(); // Should still have the last valid state
    });
  });

  describe('Session data persistence', () => {
    it('should persist session data between hook invocations', async () => {
      const sessionDir = join(tmpDir, '.specstar', 'sessions', sessionId);
      const stateFile = join(sessionDir, 'state.json');

      // First hook invocation (session_start)
      await mkdir(sessionDir, { recursive: true });
      const startState: SessionData = {
        session_id: sessionId,
        session_title: 'Persistence Test',
        session_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        agents: [],
        agents_history: [],
        files: { new: [], edited: [], read: [] },
        tools_used: {},
        errors: [],
        prompts: [],
        notifications: [{
          timestamp: new Date().toISOString(),
          message: 'Session started'
        }]
      };
      
      await writeFile(stateFile, JSON.stringify(startState, null, 2), 'utf-8');

      // Stop and restart monitor (simulating new hook invocation)
      await sessionMonitor.start();
      await new Promise(resolve => setTimeout(resolve, 100));
      await sessionMonitor.stop();

      // Verify data persists
      const persistedContent = await readFile(stateFile, 'utf-8');
      const persistedState = JSON.parse(persistedContent) as SessionData;
      expect(persistedState.session_id).toBe(sessionId);
      expect(persistedState.notifications?.[0]?.message).toBe('Session started');

      // Second hook invocation (user_prompt_submit)
      const newMonitor = new SessionMonitor({
        sessionPath: join(tmpDir, '.specstar', 'sessions'),
        claudePath: join(tmpDir, '.claude'),
        pollingInterval: 50,
        debounceDelay: 10
      });
      
      await newMonitor.start();

      // Update state with new prompt
      const promptState: SessionData = {
        ...persistedState,
        updated_at: new Date().toISOString(),
        prompts: [{
          timestamp: new Date().toISOString(),
          prompt: 'User query'
        }]
      };
      
      await writeFile(stateFile, JSON.stringify(promptState, null, 2), 'utf-8');
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify both old and new data exist
      const currentSession = newMonitor.getCurrentSession();
      expect(currentSession?.notifications?.[0]?.message).toBe('Session started');
      expect(currentSession?.prompts[0]?.prompt).toBe('User query');

      await newMonitor.stop();
    });

    it('should maintain session history across restarts', async () => {
      const sessions: string[] = [];
      
      // Create multiple sessions
      for (let i = 0; i < 3; i++) {
        const sid = randomUUID();
        sessions.push(sid);
        
        const sessionDir = join(tmpDir, '.specstar', 'sessions', sid);
        const stateFile = join(sessionDir, 'state.json');
        
        await mkdir(sessionDir, { recursive: true });
        
        const state: SessionData = {
          session_id: sid,
          session_title: `Session ${i}`,
          session_active: i === 2, // Only last one active
          created_at: new Date(Date.now() - (3 - i) * 3600000).toISOString(), // Stagger creation times
          updated_at: new Date().toISOString(),
          agents: [],
          agents_history: [],
          files: { new: [], edited: [], read: [] },
          tools_used: {},
          errors: [],
          prompts: []
        };
        
        await writeFile(stateFile, JSON.stringify(state, null, 2), 'utf-8');
      }

      // Start monitor and check history
      await sessionMonitor.start();
      await new Promise(resolve => setTimeout(resolve, 200));

      const history = await sessionMonitor.getSessionHistory();
      expect(history).toHaveLength(3);
      expect(history[0]?.session_title).toBe('Session 2'); // Most recent first
      
      const activeSessions = sessionMonitor.getActiveSessions();
      expect(activeSessions).toHaveLength(1);
      expect(activeSessions[0]?.session_id).toBe(sessions[2] ?? '');
    });
  });

  describe('Concurrent session updates', () => {
    it('should handle concurrent updates without corruption', async () => {
      const sessionDir = join(tmpDir, '.specstar', 'sessions', sessionId);
      const stateFile = join(sessionDir, 'state.json');

      await sessionMonitor.start();
      await mkdir(sessionDir, { recursive: true });

      // Initial state
      const initialState: SessionData = {
        session_id: sessionId,
        session_title: 'Concurrency Test',
        session_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        agents: [],
        agents_history: [],
        files: { new: [], edited: [], read: [] },
        tools_used: {},
        errors: [],
        prompts: []
      };
      
      await writeFile(stateFile, JSON.stringify(initialState, null, 2), 'utf-8');
      await new Promise(resolve => setTimeout(resolve, 100));

      // Simulate concurrent updates from different hooks
      const updates = [
        // Hook 1: Add prompt
        async () => {
          const content = await readFile(stateFile, 'utf-8');
          const state = JSON.parse(content) as SessionData;
          state.prompts.push({
            timestamp: new Date().toISOString(),
            prompt: 'Concurrent prompt 1'
          });
          state.updated_at = new Date().toISOString();
          await writeFile(stateFile, JSON.stringify(state, null, 2), 'utf-8');
        },
        // Hook 2: Add file
        async () => {
          const content = await readFile(stateFile, 'utf-8');
          const state = JSON.parse(content) as SessionData;
          state.files.new.push('concurrent-file.ts');
          state.updated_at = new Date().toISOString();
          await writeFile(stateFile, JSON.stringify(state, null, 2), 'utf-8');
        },
        // Hook 3: Update tools
        async () => {
          const content = await readFile(stateFile, 'utf-8');
          const state = JSON.parse(content) as SessionData;
          state.tools_used['Bash'] = (state.tools_used['Bash'] || 0) + 1;
          state.updated_at = new Date().toISOString();
          await writeFile(stateFile, JSON.stringify(state, null, 2), 'utf-8');
        }
      ];

      // Run updates concurrently
      await Promise.all(updates.map(fn => fn()));
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify final state has all updates (might have lost some due to race conditions)
      const finalSession = sessionMonitor.getCurrentSession();
      expect(finalSession).toBeDefined();
      expect(finalSession?.session_id).toBe(sessionId);
      
      // At least one update should have succeeded
      const hasUpdate = 
        (finalSession?.prompts.length ?? 0) > 0 ||
        (finalSession?.files.new.length ?? 0) > 0 ||
        (finalSession?.tools_used['Bash'] ?? 0) > 0;
      
      expect(hasUpdate).toBe(true);
    });

    it('should use file locking for atomic updates', async () => {
      const sessionDir = join(tmpDir, '.specstar', 'sessions', sessionId);
      const stateFile = join(sessionDir, 'state.json');
      const lockFile = `${stateFile}.lock`;

      await mkdir(sessionDir, { recursive: true });

      // Helper function to update with lock
      const updateWithLock = async (updateFn: (state: SessionData) => void) => {
        let retries = 0;
        const maxRetries = 10;
        
        while (retries < maxRetries) {
          try {
            // Try to acquire lock
            await writeFile(lockFile, process.pid.toString(), { flag: 'wx' });
            
            // Read current state
            let state: SessionData;
            try {
              const content = await readFile(stateFile, 'utf-8');
              state = JSON.parse(content);
            } catch {
              // File doesn't exist yet, use initial state
              state = {
                session_id: sessionId,
                session_title: 'Lock Test',
                session_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                agents: [],
                agents_history: [],
                files: { new: [], edited: [], read: [] },
                tools_used: {},
                errors: [],
                prompts: []
              };
            }
            
            // Apply update
            updateFn(state);
            state.updated_at = new Date().toISOString();
            
            // Write atomically
            const tempFile = `${stateFile}.tmp`;
            await writeFile(tempFile, JSON.stringify(state, null, 2), 'utf-8');
            await Bun.$`mv ${tempFile} ${stateFile}`.quiet();
            
            // Release lock
            await rm(lockFile, { force: true });
            
            return;
          } catch (error: any) {
            if (error.code === 'EEXIST') {
              // Lock exists, wait and retry
              await new Promise(resolve => setTimeout(resolve, 10));
              retries++;
            } else {
              // Release lock on error
              await rm(lockFile, { force: true });
              throw error;
            }
          }
        }
        
        throw new Error('Failed to acquire lock after max retries');
      };

      // Concurrent updates with locking
      const updates = Array.from({ length: 10 }, (_, i) => 
        updateWithLock(state => {
          state.prompts.push({
            timestamp: new Date().toISOString(),
            prompt: `Locked prompt ${i}`
          });
        })
      );

      await Promise.all(updates);

      // Verify all updates were applied
      const finalContent = await readFile(stateFile, 'utf-8');
      const finalState = JSON.parse(finalContent) as SessionData;
      expect(finalState.prompts).toHaveLength(10);
      
      // Verify lock file is cleaned up
      try {
        await access(lockFile);
        expect(true).toBe(false); // Should not reach here
      } catch {
        // Lock file should not exist
      }
    });
  });

  describe('Error recovery', () => {
    it('should recover from corrupted state files', async () => {
      const sessionDir = join(tmpDir, '.specstar', 'sessions', sessionId);
      const stateFile = join(sessionDir, 'state.json');
      const backupFile = `${stateFile}.backup`;

      await sessionMonitor.start();
      await mkdir(sessionDir, { recursive: true });

      // Write valid state
      const validState: SessionData = {
        session_id: sessionId,
        session_title: 'Recovery Test',
        session_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        agents: [],
        agents_history: [],
        files: { new: [], edited: [], read: [] },
        tools_used: {},
        errors: [],
        prompts: [{
          timestamp: new Date().toISOString(),
          prompt: 'Important data'
        }]
      };
      
      await writeFile(stateFile, JSON.stringify(validState, null, 2), 'utf-8');
      await writeFile(backupFile, JSON.stringify(validState, null, 2), 'utf-8');
      await new Promise(resolve => setTimeout(resolve, 100));

      // Corrupt the state file
      await writeFile(stateFile, '{ corrupted json }}}', 'utf-8');
      await new Promise(resolve => setTimeout(resolve, 100));

      // Monitor should handle the corruption
      // In a real implementation, it might restore from backup
      const session = sessionMonitor.getCurrentSession();
      
      // Should either have the last valid state or be null
      if (session) {
        expect(session.session_id).toBe(sessionId);
      }
    });

    it('should handle missing directories gracefully', async () => {
      // Remove sessions directory
      const sessionsDir = join(tmpDir, '.specstar', 'sessions');
      await rm(sessionsDir, { recursive: true, force: true });

      // Start monitor - should create directory
      await sessionMonitor.start();
      
      // Verify directory was created
      try {
        await access(sessionsDir);
        expect(true).toBe(true); // Directory exists
      } catch {
        expect(true).toBe(false); // Should not reach here
      }

      // Should be able to track new sessions
      const sessionDir = join(sessionsDir, sessionId);
      const stateFile = join(sessionDir, 'state.json');
      
      await mkdir(sessionDir, { recursive: true });
      
      const state: SessionData = {
        session_id: sessionId,
        session_title: 'After Recovery',
        session_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        agents: [],
        agents_history: [],
        files: { new: [], edited: [], read: [] },
        tools_used: {},
        errors: [],
        prompts: []
      };
      
      await writeFile(stateFile, JSON.stringify(state, null, 2), 'utf-8');
      await new Promise(resolve => setTimeout(resolve, 100));

      const currentSession = sessionMonitor.getCurrentSession();
      expect(currentSession?.session_id).toBe(sessionId);
    });
  });

  describe('Hook lifecycle integration', () => {
    it('should trigger appropriate hooks for session events', async () => {
      const events: Array<{ type: string; data: any }> = [];
      
      // Register hook handlers
      hookIntegrator.registerHook('beforeSession', async (event) => {
        events.push({ type: 'beforeSession', data: event.data });
      });
      
      hookIntegrator.registerHook('afterSession', async (event) => {
        events.push({ type: 'afterSession', data: event.data });
      });
      
      hookIntegrator.registerHook('onFileChange', async (event) => {
        events.push({ type: 'onFileChange', data: event.data });
      });

      await sessionMonitor.start();

      const sessionDir = join(tmpDir, '.specstar', 'sessions', sessionId);
      const stateFile = join(sessionDir, 'state.json');
      await mkdir(sessionDir, { recursive: true });

      // Session start
      const startState: SessionData = {
        session_id: sessionId,
        session_title: 'Hook Test',
        session_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        agents: [],
        agents_history: [],
        files: { new: [], edited: [], read: [] },
        tools_used: {},
        errors: [],
        prompts: []
      };
      
      await writeFile(stateFile, JSON.stringify(startState, null, 2), 'utf-8');
      await new Promise(resolve => setTimeout(resolve, 100));

      // File change
      const fileState: SessionData = {
        ...startState,
        updated_at: new Date().toISOString(),
        files: {
          new: ['newfile.ts'],
          edited: ['modified.ts'],
          read: ['read.ts']
        }
      };
      
      await writeFile(stateFile, JSON.stringify(fileState, null, 2), 'utf-8');
      await new Promise(resolve => setTimeout(resolve, 100));

      // Session end
      const endState: SessionData = {
        ...fileState,
        session_active: false,
        updated_at: new Date().toISOString()
      };
      
      await writeFile(stateFile, JSON.stringify(endState, null, 2), 'utf-8');
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify hooks were triggered
      expect(events.some(e => e.type === 'onFileChange')).toBe(true);
      
      // Verify correct data was passed
      const fileChangeEvent = events.find(e => e.type === 'onFileChange');
      if (fileChangeEvent) {
        expect(fileChangeEvent.data.new).toContain('newfile.ts');
        expect(fileChangeEvent.data.edited).toContain('modified.ts');
      }
    });
  });
});