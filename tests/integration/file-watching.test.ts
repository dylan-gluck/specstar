import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, rmSync, writeFileSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { SessionWatcher } from '../../src/lib/session-monitor/session-watcher';

// Define the expected SessionData interface for the watcher
// This is simpler than the full SessionMonitor data structure
export interface SessionData {
  id: string;
  startTime: string;
  lastUpdate: string;
  files: string[];
  commands: string[];
  errors: string[];
}

describe('File Watching Integration', () => {
  let testDir: string;
  let sessionsDir: string;
  let watcher: SessionWatcher;
  let emittedEvents: Array<{ type: string; data?: SessionData; error?: Error }> = [];

  beforeEach(() => {
    // Create temporary test directory structure
    testDir = join(tmpdir(), `specstar-test-${Date.now()}`);
    sessionsDir = join(testDir, '.specstar', 'sessions');
    mkdirSync(sessionsDir, { recursive: true });
    
    // Reset event tracker
    emittedEvents = [];
    
    // Create watcher instance
    watcher = new SessionWatcher(sessionsDir);
    
    // Listen to all events
    watcher.on('change', (data: SessionData) => {
      emittedEvents.push({ type: 'change', data });
    });
    
    watcher.on('error', (error: Error) => {
      emittedEvents.push({ type: 'error', error });
    });
    
    watcher.on('new-session', (data: SessionData) => {
      emittedEvents.push({ type: 'new-session', data });
    });
  });

  afterEach(async () => {
    // Stop watcher if running
    if (watcher) {
      await watcher.stop();
    }
    
    // Clean up test directory
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  test('detects changes to session files', async () => {
    // Start watching
    await watcher.start();
    
    // Create initial session file
    const sessionFile = join(sessionsDir, 'session-1.json');
    const initialData: SessionData = {
      id: 'session-1',
      startTime: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      files: [],
      commands: [],
      errors: []
    };
    
    writeFileSync(sessionFile, JSON.stringify(initialData, null, 2));
    
    // Wait for initial detection
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Update the session file
    const updatedData: SessionData = {
      ...initialData,
      lastUpdate: new Date().toISOString(),
      files: ['test.ts'],
      commands: ['bun test']
    };
    
    writeFileSync(sessionFile, JSON.stringify(updatedData, null, 2));
    
    // Wait for change detection
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Verify change was detected
    const changeEvents = emittedEvents.filter(e => e.type === 'change');
    expect(changeEvents.length).toBeGreaterThan(0);
    
    const lastChange = changeEvents[changeEvents.length - 1];
    expect(lastChange?.data).toBeDefined();
    expect(lastChange?.data?.files).toEqual(['test.ts']);
    expect(lastChange?.data?.commands).toEqual(['bun test']);
  });

  test('debounces multiple rapid changes', async () => {
    await watcher.start();
    
    const sessionFile = join(sessionsDir, 'session-2.json');
    const baseData: SessionData = {
      id: 'session-2',
      startTime: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      files: [],
      commands: [],
      errors: []
    };
    
    // Create initial file
    writeFileSync(sessionFile, JSON.stringify(baseData, null, 2));
    
    // Wait for initial processing
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Clear events from initial creation
    emittedEvents = [];
    
    // Make rapid successive changes
    for (let i = 1; i <= 5; i++) {
      const data = {
        ...baseData,
        lastUpdate: new Date().toISOString(),
        commands: [`command-${i}`]
      };
      writeFileSync(sessionFile, JSON.stringify(data, null, 2));
      // Small delay between writes but within debounce window
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Wait for debounce period to complete (assuming 300ms debounce)
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // Should only emit one change event after debouncing
    const changeEvents = emittedEvents.filter(e => e.type === 'change');
    expect(changeEvents.length).toBe(1);
    
    // Should have the last written data
    expect(changeEvents[0]?.data?.commands).toEqual(['command-5']);
  });

  test('recovers from file deletion errors', async () => {
    await watcher.start();
    
    const sessionFile = join(sessionsDir, 'session-3.json');
    const sessionData: SessionData = {
      id: 'session-3',
      startTime: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      files: ['app.ts'],
      commands: [],
      errors: []
    };
    
    // Create file
    writeFileSync(sessionFile, JSON.stringify(sessionData, null, 2));
    
    // Wait for initial detection
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Delete the file
    rmSync(sessionFile);
    
    // Wait for error handling
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Recreate the file with new data
    const newData = {
      ...sessionData,
      files: ['app.ts', 'test.ts']
    };
    writeFileSync(sessionFile, JSON.stringify(newData, null, 2));
    
    // Wait for recovery and detection
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Should have detected the recreated file
    const changeEvents = emittedEvents.filter(e => e.type === 'change');
    const lastEvent = changeEvents[changeEvents.length - 1];
    expect(lastEvent?.data?.files).toContain('test.ts');
  });

  test('handles permission changes gracefully', async () => {
    // Skip on Windows as chmod behavior differs
    if (process.platform === 'win32') {
      return;
    }
    
    await watcher.start();
    
    const sessionFile = join(sessionsDir, 'session-4.json');
    const sessionData: SessionData = {
      id: 'session-4',
      startTime: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      files: [],
      commands: [],
      errors: []
    };
    
    // Create file with normal permissions
    writeFileSync(sessionFile, JSON.stringify(sessionData, null, 2));
    
    // Wait for initial detection
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Remove read permissions
    chmodSync(sessionFile, 0o000);
    
    // Try to trigger a change (this should fail)
    try {
      writeFileSync(sessionFile, JSON.stringify({
        ...sessionData,
        commands: ['failed-write']
      }, null, 2));
    } catch {
      // Expected to fail
    }
    
    // Wait for error handling
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Restore permissions
    chmodSync(sessionFile, 0o644);
    
    // Write valid data
    writeFileSync(sessionFile, JSON.stringify({
      ...sessionData,
      commands: ['successful-write']
    }, null, 2));
    
    // Wait for recovery
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Should have error event and subsequent recovery
    const errorEvents = emittedEvents.filter(e => e.type === 'error');
    expect(errorEvents.length).toBeGreaterThan(0);
    
    // Should have recovered and detected the change
    const changeEvents = emittedEvents.filter(e => e.type === 'change');
    const lastChange = changeEvents[changeEvents.length - 1];
    expect(lastChange?.data?.commands).toContain('successful-write');
  });

  test('prevents duplicate processing of identical content', async () => {
    await watcher.start();
    
    const sessionFile = join(sessionsDir, 'session-5.json');
    const sessionData: SessionData = {
      id: 'session-5',
      startTime: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      files: ['main.ts'],
      commands: ['bun run dev'],
      errors: []
    };
    
    // Write initial file
    writeFileSync(sessionFile, JSON.stringify(sessionData, null, 2));
    
    // Wait for initial processing
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Clear events
    emittedEvents = [];
    
    // Write the exact same content multiple times
    for (let i = 0; i < 3; i++) {
      writeFileSync(sessionFile, JSON.stringify(sessionData, null, 2));
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Wait for any potential processing
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // Should not emit any change events for identical content
    const changeEvents = emittedEvents.filter(e => e.type === 'change');
    expect(changeEvents.length).toBe(0);
    
    // Now write different content
    const newData = {
      ...sessionData,
      lastUpdate: new Date().toISOString(),
      files: ['main.ts', 'utils.ts']
    };
    writeFileSync(sessionFile, JSON.stringify(newData, null, 2));
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Should detect the actual change
    const newChangeEvents = emittedEvents.filter(e => e.type === 'change');
    expect(newChangeEvents.length).toBe(1);
    expect(newChangeEvents[0]?.data?.files).toContain('utils.ts');
  });

  test('handles new session creation', async () => {
    await watcher.start();
    
    // Wait for watcher to be ready
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Create multiple new session files
    const sessions = [
      {
        id: 'new-session-1',
        file: 'new-session-1.json',
        data: {
          id: 'new-session-1',
          startTime: new Date().toISOString(),
          lastUpdate: new Date().toISOString(),
          files: ['index.ts'],
          commands: [],
          errors: []
        }
      },
      {
        id: 'new-session-2',
        file: 'new-session-2.json',
        data: {
          id: 'new-session-2',
          startTime: new Date(Date.now() + 1000).toISOString(),
          lastUpdate: new Date(Date.now() + 1000).toISOString(),
          files: ['app.tsx'],
          commands: [],
          errors: []
        }
      }
    ];
    
    // Create session files
    for (const session of sessions) {
      const sessionFile = join(sessionsDir, session.file);
      writeFileSync(sessionFile, JSON.stringify(session.data, null, 2));
      // Small delay between creations
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Wait for detection
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Should have new-session events for each
    const newSessionEvents = emittedEvents.filter(e => e.type === 'new-session');
    expect(newSessionEvents.length).toBe(2);
    
    // Verify session data
    const sessionIds = newSessionEvents.map(e => e.data?.id);
    expect(sessionIds).toContain('new-session-1');
    expect(sessionIds).toContain('new-session-2');
  });

  test('handles malformed JSON gracefully', async () => {
    await watcher.start();
    
    const sessionFile = join(sessionsDir, 'malformed.json');
    
    // Write malformed JSON
    writeFileSync(sessionFile, '{ "id": "test", "broken": ]');
    
    // Wait for error handling
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Should emit error event
    const errorEvents = emittedEvents.filter(e => e.type === 'error');
    expect(errorEvents.length).toBeGreaterThan(0);
    expect(errorEvents[0]?.error).toBeDefined();
    
    // Fix the JSON
    const validData: SessionData = {
      id: 'fixed-session',
      startTime: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      files: [],
      commands: [],
      errors: []
    };
    writeFileSync(sessionFile, JSON.stringify(validData, null, 2));
    
    // Wait for recovery
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Should recover and process the valid JSON
    const changeEvents = emittedEvents.filter(e => e.type === 'change' || e.type === 'new-session');
    const lastEvent = changeEvents[changeEvents.length - 1];
    expect(lastEvent?.data?.id).toBe('fixed-session');
  });

  test('stops watching on command', async () => {
    await watcher.start();
    
    const sessionFile = join(sessionsDir, 'stop-test.json');
    const sessionData: SessionData = {
      id: 'stop-test',
      startTime: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      files: [],
      commands: [],
      errors: []
    };
    
    // Write initial file
    writeFileSync(sessionFile, JSON.stringify(sessionData, null, 2));
    
    // Wait for initial detection
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Stop the watcher
    await watcher.stop();
    
    // Clear events
    emittedEvents = [];
    
    // Make changes after stopping
    const updatedData = {
      ...sessionData,
      commands: ['should-not-detect']
    };
    writeFileSync(sessionFile, JSON.stringify(updatedData, null, 2));
    
    // Wait to ensure no detection happens
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Should not have detected any changes after stopping
    expect(emittedEvents.length).toBe(0);
  });
});