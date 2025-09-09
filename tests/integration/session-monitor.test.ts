#!/usr/bin/env bun
import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SessionMonitor } from '../../src/lib/session-monitor';
import { HookIntegrator } from '../../src/lib/hook-integrator';

describe('Claude Code Session Monitoring', () => {
  let tempDir: string;
  let sessionMonitor: SessionMonitor;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'specstar-session-test-'));
    sessionMonitor = new SessionMonitor({
      sessionPath: join(tempDir, 'sessions'),
      claudePath: join(tempDir, '.claude')
    });
  });

  afterEach(async () => {
    await sessionMonitor.stop();
    await rm(tempDir, { recursive: true, force: true });
  });

  test('should detect new Claude Code session', async () => {
    const sessionStartHandler = mock(() => {});
    sessionMonitor.on('sessionStart', sessionStartHandler);

    // Create Claude session file
    const claudeDir = join(tempDir, '.claude');
    await Bun.write(join(claudeDir, 'session.json'), JSON.stringify({
      id: 'session-123',
      startTime: new Date().toISOString(),
      user: 'test-user',
      project: 'test-project'
    }));

    await sessionMonitor.start();
    
    // Wait for file watcher to detect
    await new Promise(resolve => setTimeout(resolve, 200));

    expect(sessionStartHandler).toHaveBeenCalledWith({
      id: 'session-123',
      startTime: expect.any(String),
      user: 'test-user',
      project: 'test-project'
    });
  });

  test('should monitor file changes in active session', async () => {
    const fileChangeHandler = mock(() => {});
    sessionMonitor.on('fileChange', fileChangeHandler);

    // Start monitoring
    await sessionMonitor.start();

    // Create initial session
    const sessionData = {
      id: 'session-456',
      startTime: new Date().toISOString(),
      files: []
    };
    
    const sessionPath = join(tempDir, '.claude', 'session.json');
    await Bun.write(sessionPath, JSON.stringify(sessionData));
    
    await new Promise(resolve => setTimeout(resolve, 200));

    // Update session with file change
    (sessionData as any).files.push({
      path: '/test/file.ts',
      action: 'modified',
      timestamp: new Date().toISOString()
    });
    
    await Bun.write(sessionPath, JSON.stringify(sessionData));
    
    await new Promise(resolve => setTimeout(resolve, 200));

    expect(fileChangeHandler).toHaveBeenCalledWith({
      path: '/test/file.ts',
      action: 'modified',
      timestamp: expect.any(String)
    });
  });

  test('should track command execution in session', async () => {
    const commandHandler = mock(() => {});
    sessionMonitor.on('command', commandHandler);

    await sessionMonitor.start();

    const sessionPath = join(tempDir, '.claude', 'session.json');
    const sessionData = {
      id: 'session-789',
      startTime: new Date().toISOString(),
      commands: []
    };
    
    await Bun.write(sessionPath, JSON.stringify(sessionData));
    await new Promise(resolve => setTimeout(resolve, 200));

    // Add command to session
    (sessionData as any).commands.push({
      command: 'bun test',
      timestamp: new Date().toISOString(),
      exitCode: 0,
      output: 'Tests passed'
    });
    
    await Bun.write(sessionPath, JSON.stringify(sessionData));
    await new Promise(resolve => setTimeout(resolve, 200));

    expect(commandHandler).toHaveBeenCalledWith({
      command: 'bun test',
      timestamp: expect.any(String),
      exitCode: 0,
      output: 'Tests passed'
    });
  });

  test('should detect session end', async () => {
    const sessionEndHandler = mock(() => {});
    sessionMonitor.on('sessionEnd', sessionEndHandler);

    await sessionMonitor.start();

    // Create session
    const sessionPath = join(tempDir, '.claude', 'session.json');
    await Bun.write(sessionPath, JSON.stringify({
      id: 'session-end-test',
      startTime: new Date().toISOString()
    }));
    
    await new Promise(resolve => setTimeout(resolve, 200));

    // Mark session as ended
    await Bun.write(sessionPath, JSON.stringify({
      id: 'session-end-test',
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      status: 'completed'
    }));
    
    await new Promise(resolve => setTimeout(resolve, 200));

    expect(sessionEndHandler).toHaveBeenCalledWith({
      id: 'session-end-test',
      endTime: expect.any(String),
      status: 'completed'
    });
  });

  test('should save session history', async () => {
    await sessionMonitor.start();

    // Create session with history
    const sessionData = {
      id: 'history-test',
      startTime: new Date().toISOString(),
      files: [
        { path: 'file1.ts', action: 'created' },
        { path: 'file2.ts', action: 'modified' }
      ],
      commands: [
        { command: 'bun install', exitCode: 0 }
      ]
    };
    
    const sessionPath = join(tempDir, '.claude', 'session.json');
    await Bun.write(sessionPath, JSON.stringify(sessionData));
    
    await new Promise(resolve => setTimeout(resolve, 200));

    // Verify session is saved to history
    const historyPath = join(tempDir, 'sessions', 'history-test.json');
    const savedSession = await Bun.file(historyPath).json();
    
    expect(savedSession.id).toBe('history-test');
    expect(savedSession.files).toHaveLength(2);
    expect(savedSession.commands).toHaveLength(1);
  });

  test('should integrate with lifecycle hooks', async () => {
    // Create hooks file
    const hooksContent = `
export function onSessionStart(session) {
  console.log('Session started:', session.id);
}

export function onFileChange(file) {
  console.log('File changed:', file.path);
}

export function onSessionEnd(session) {
  console.log('Session ended:', session.id);
}
`;
    
    const hooksPath = join(tempDir, '.specstar', 'hooks.ts');
    await Bun.write(hooksPath, hooksContent);

    const hookIntegrator = new HookIntegrator(hooksPath);
    await hookIntegrator.load();
    
    sessionMonitor.setHookIntegrator(hookIntegrator);
    await sessionMonitor.start();

    // Mock console.log to verify hook execution
    const consoleLog = mock(() => {});
    const originalLog = console.log;
    console.log = consoleLog;

    // Trigger session start
    const sessionPath = join(tempDir, '.claude', 'session.json');
    await Bun.write(sessionPath, JSON.stringify({
      id: 'hook-test',
      startTime: new Date().toISOString()
    }));
    
    await new Promise(resolve => setTimeout(resolve, 200));

    expect(consoleLog).toHaveBeenCalledWith('Session started:', 'hook-test');

    console.log = originalLog;
  });

  test('should handle multiple concurrent sessions', async () => {
    const sessions = new Map();
    
    sessionMonitor.on('sessionStart', (session) => {
      sessions.set(session.id, session);
    });

    await sessionMonitor.start();

    // Create multiple session files
    const session1Path = join(tempDir, '.claude', 'session1.json');
    const session2Path = join(tempDir, '.claude', 'session2.json');
    
    await Bun.write(session1Path, JSON.stringify({
      id: 'session-1',
      startTime: new Date().toISOString()
    }));
    
    await Bun.write(session2Path, JSON.stringify({
      id: 'session-2',
      startTime: new Date().toISOString()
    }));
    
    await new Promise(resolve => setTimeout(resolve, 300));

    expect(sessions.size).toBe(2);
    expect(sessions.has('session-1')).toBe(true);
    expect(sessions.has('session-2')).toBe(true);
  });

  test('should recover from corrupted session data', async () => {
    const errorHandler = mock(() => {});
    sessionMonitor.on('error', errorHandler);

    await sessionMonitor.start();

    // Write corrupted JSON
    const sessionPath = join(tempDir, '.claude', 'session.json');
    await Bun.write(sessionPath, '{ invalid json }}}');
    
    await new Promise(resolve => setTimeout(resolve, 200));

    expect(errorHandler).toHaveBeenCalledWith(expect.objectContaining({
      type: 'parse_error',
      message: expect.stringContaining('JSON')
    }));

    // Write valid JSON after corruption
    await Bun.write(sessionPath, JSON.stringify({
      id: 'recovered',
      startTime: new Date().toISOString()
    }));
    
    await new Promise(resolve => setTimeout(resolve, 200));

    // Should recover and process valid data
    const sessions = sessionMonitor.getActiveSessions();
    expect(sessions).toContainEqual(expect.objectContaining({
      id: 'recovered'
    }));
  });

  test('should provide session statistics', async () => {
    await sessionMonitor.start();

    // Create session with activity
    const startTime = new Date();
    const sessionData = {
      id: 'stats-test',
      startTime: startTime.toISOString(),
      files: [
        { path: 'a.ts', action: 'created', timestamp: new Date(startTime.getTime() + 1000).toISOString() },
        { path: 'b.ts', action: 'modified', timestamp: new Date(startTime.getTime() + 2000).toISOString() },
        { path: 'c.ts', action: 'deleted', timestamp: new Date(startTime.getTime() + 3000).toISOString() }
      ],
      commands: [
        { command: 'bun test', exitCode: 0 },
        { command: 'bun build', exitCode: 0 }
      ]
    };
    
    const sessionPath = join(tempDir, '.claude', 'session.json');
    await Bun.write(sessionPath, JSON.stringify(sessionData));
    
    await new Promise(resolve => setTimeout(resolve, 200));

    const stats = sessionMonitor.getSessionStats('stats-test');
    
    expect(stats).toEqual({
      duration: expect.any(Number),
      filesCreated: 1,
      filesModified: 1,
      filesDeleted: 1,
      filesRead: 0,  // Added missing property
      commandsExecuted: 2,
      commandsSucceeded: 2,
      commandsFailed: 0
    });
  });

  test('should stream session events in real-time', async () => {
    const events: any[] = [];
    const stream = sessionMonitor.streamEvents();
    
    stream.on('data', (event) => {
      events.push(event);
    });

    await sessionMonitor.start();

    // Generate events
    const sessionPath = join(tempDir, '.claude', 'session.json');
    
    // Event 1: Session start
    await Bun.write(sessionPath, JSON.stringify({
      id: 'stream-test',
      startTime: new Date().toISOString(),
      files: [],
      commands: []
    }));
    
    await new Promise(resolve => setTimeout(resolve, 200));

    // Event 2: File change
    await Bun.write(sessionPath, JSON.stringify({
      id: 'stream-test',
      startTime: new Date().toISOString(),
      files: [{ path: 'new.ts', action: 'created' }],
      commands: []
    }));
    
    await new Promise(resolve => setTimeout(resolve, 200));

    expect(events).toHaveLength(2);
    expect(events[0].type).toBe('session_start');
    expect(events[1].type).toBe('file_change');
  });

  test('should clean up old session files', async () => {
    // Create old session files
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 30); // 30 days old
    
    const sessionsDir = join(tempDir, 'sessions');
    await Bun.write(join(sessionsDir, 'old-session.json'), JSON.stringify({
      id: 'old-session',
      startTime: oldDate.toISOString(),
      endTime: oldDate.toISOString()
    }));
    
    await Bun.write(join(sessionsDir, 'recent-session.json'), JSON.stringify({
      id: 'recent-session',
      startTime: new Date().toISOString()
    }));

    await sessionMonitor.cleanupOldSessions(7); // Keep only 7 days
    
    // Old session should be deleted
    expect(await Bun.file(join(sessionsDir, 'old-session.json')).exists()).toBe(false);
    
    // Recent session should remain
    expect(await Bun.file(join(sessionsDir, 'recent-session.json')).exists()).toBe(true);
  });
});