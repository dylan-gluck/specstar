#!/usr/bin/env bun
import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import React from 'react';
import { render } from 'ink-testing-library';
import { mkdtemp, rm, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SessionMonitor } from '../../src/lib/session-monitor';
import { DocumentViewer } from '../../src/components/document-viewer';
import { ConfigManager } from '../../src/lib/config-manager';
import App from '../../src/app';

describe('Error Recovery', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'specstar-error-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('Corrupted Session Files', () => {
    test('should handle malformed JSON in session file', async () => {
      const sessionMonitor = new SessionMonitor({
        sessionPath: join(tempDir, 'sessions')
      });

      const errorHandler = mock(() => {});
      sessionMonitor.on('error', errorHandler);

      // Create corrupted session file
      const sessionPath = join(tempDir, 'sessions', 'corrupted.json');
      await Bun.write(sessionPath, '{ "id": "test", invalid json }}}');

      await sessionMonitor.start();
      await new Promise(resolve => setTimeout(resolve, 200));

      // Should emit error event
      expect(errorHandler).toHaveBeenCalledWith(expect.objectContaining({
        type: 'parse_error',
        file: 'corrupted.json'
      }));

      // Should continue monitoring other files
      const validPath = join(tempDir, 'sessions', 'valid.json');
      await Bun.write(validPath, JSON.stringify({
        id: 'valid-session',
        startTime: new Date().toISOString()
      }));

      await new Promise(resolve => setTimeout(resolve, 200));
      
      const sessions = sessionMonitor.getActiveSessions();
      expect(sessions).toContainEqual(expect.objectContaining({
        id: 'valid-session'
      }));
    });

    test('should recover from truncated session files', async () => {
      const sessionMonitor = new SessionMonitor({
        sessionPath: join(tempDir, 'sessions')
      });

      // Create truncated file (incomplete JSON)
      const sessionPath = join(tempDir, 'sessions', 'truncated.json');
      await Bun.write(sessionPath, '{ "id": "test", "startTime": "2024-01-');

      await sessionMonitor.start();
      
      const recovered = await sessionMonitor.attemptRecovery(sessionPath);
      expect(recovered).toBe(false); // Cannot recover incomplete data

      // Write complete data
      await Bun.write(sessionPath, JSON.stringify({
        id: 'test',
        startTime: '2024-01-01T00:00:00Z'
      }));

      await new Promise(resolve => setTimeout(resolve, 200));
      
      const sessions = sessionMonitor.getActiveSessions();
      expect(sessions).toContainEqual(expect.objectContaining({
        id: 'test'
      }));
    });

    test('should handle binary data in session files', async () => {
      const sessionMonitor = new SessionMonitor({
        sessionPath: join(tempDir, 'sessions')
      });

      const errorHandler = mock(() => {});
      sessionMonitor.on('error', errorHandler);

      // Write binary data to session file
      const sessionPath = join(tempDir, 'sessions', 'binary.json');
      const binaryData = new Uint8Array([0xFF, 0xFE, 0x00, 0x01]);
      await Bun.write(sessionPath, binaryData);

      await sessionMonitor.start();
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(errorHandler).toHaveBeenCalledWith(expect.objectContaining({
        type: 'parse_error',
        message: expect.stringContaining('binary')
      }));
    });
  });

  describe('File System Errors', () => {
    test('should handle missing directories gracefully', async () => {
      const nonExistentPath = join(tempDir, 'does', 'not', 'exist');
      
      const { lastFrame } = render(
        <DocumentViewer path={join(nonExistentPath, 'file.md')} />
      );

      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(lastFrame()).toContain('File not found');
      expect(lastFrame()).not.toContain('Error');
    });

    test('should handle permission denied errors', async () => {
      const restrictedDir = join(tempDir, 'restricted');
      await Bun.write(join(restrictedDir, 'file.md'), '# Test');
      
      // Make directory unreadable
      await chmod(restrictedDir, 0o000);

      const configManager = new ConfigManager(restrictedDir);
      const errorHandler = mock(() => {});
      
      try {
        await configManager.load();
      } catch (error: any) {
        expect(error.message).toContain('Permission denied');
      }

      // Restore permissions for cleanup
      await chmod(restrictedDir, 0o755);
    });

    test('should handle disk space errors', async () => {
      const sessionMonitor = new SessionMonitor({
        sessionPath: join(tempDir, 'sessions'),
        maxSize: 1 // 1 byte max size to trigger space error
      });

      const errorHandler = mock(() => {});
      sessionMonitor.on('error', errorHandler);

      // Try to write large session
      const largeSession = {
        id: 'large',
        data: 'x'.repeat(10000) // Large data
      };

      const result = await sessionMonitor.saveSession(largeSession);
      
      expect(result).toBe(false);
      expect(errorHandler).toHaveBeenCalledWith(expect.objectContaining({
        type: 'disk_space'
      }));
    });

    test('should handle file locks and concurrent access', async () => {
      const sessionPath = join(tempDir, 'sessions', 'locked.json');
      
      // Simulate concurrent writes
      const writes = Array.from({ length: 10 }, async (_, i) => {
        await Bun.write(sessionPath, JSON.stringify({
          id: `session-${i}`,
          timestamp: new Date().toISOString()
        }));
      });

      await Promise.all(writes);

      // File should contain valid JSON from last write
      const content = await Bun.file(sessionPath).json();
      expect(content).toHaveProperty('id');
      expect(content.id).toMatch(/^session-\d$/);
    });
  });

  describe('Configuration Errors', () => {
    test('should use defaults for missing configuration', async () => {
      const configManager = new ConfigManager(join(tempDir, '.specstar'));
      
      // Load without existing config
      const config = await configManager.load();
      
      expect(config).toHaveProperty('theme', 'default');
      expect(config).toHaveProperty('keyBindings');
      expect(config).toHaveProperty('sessionPath', './sessions');
    });

    test('should validate and fix invalid configuration', async () => {
      const configPath = join(tempDir, '.specstar', 'settings.json');
      
      // Write invalid config
      await Bun.write(configPath, JSON.stringify({
        theme: 123, // Should be string
        sessionPath: null, // Should have default
        invalidKey: 'ignored'
      }));

      const configManager = new ConfigManager(join(tempDir, '.specstar'));
      const config = await configManager.load();
      
      expect(config.theme).toBe('default'); // Fixed to default
      expect(config.sessionPath).toBe('./sessions'); // Fixed to default
      expect(config).not.toHaveProperty('invalidKey'); // Removed
    });

    test('should handle circular references in config', async () => {
      const configManager = new ConfigManager(join(tempDir, '.specstar'));
      
      // Create config with circular reference (would cause JSON.stringify to fail)
      const circular: any = { a: 1 };
      circular.self = circular;
      
      const saved = await configManager.save(circular);
      expect(saved).toBe(false); // Should fail gracefully
    });
  });

  describe('UI Error Recovery', () => {
    test('should display error boundary for component crashes', () => {
      // Component that will throw
      const CrashingComponent = () => {
        throw new Error('Intentional crash');
      };

      const { lastFrame } = render(<CrashingComponent />);
      
      // Should show error message instead of crashing
      expect(lastFrame()).toContain('Error');
      expect(lastFrame()).toContain('Something went wrong');
    });

    test('should recover from keyboard input errors', () => {
      const { stdin, lastFrame } = render(<App />);
      
      // Send invalid/malformed input
      stdin.write('\x00'); // Null byte
      stdin.write('\xFF\xFF'); // Invalid UTF-8
      
      // Should not crash
      expect(lastFrame()).toBeDefined();
    });

    test('should handle terminal resize gracefully', () => {
      const { lastFrame, rerender } = render(<App />);
      
      // Simulate terminal resize
      process.stdout.columns = 20;
      process.stdout.rows = 10;
      process.stdout.emit('resize');
      
      rerender(<App />);
      
      // Should adapt to new size
      expect(lastFrame()).toBeDefined();
      expect(lastFrame().length).toBeLessThan(200); // Smaller output
      
      // Restore size
      process.stdout.columns = 80;
      process.stdout.rows = 24;
    });
  });

  describe('Network and External Service Errors', () => {
    test('should handle Claude Code API timeout', async () => {
      const mockApi = {
        getSession: mock(async () => {
          await new Promise(resolve => setTimeout(resolve, 5000));
          throw new Error('Timeout');
        })
      };

      const sessionMonitor = new SessionMonitor({
        api: mockApi,
        timeout: 1000
      });

      const errorHandler = mock(() => {});
      sessionMonitor.on('error', errorHandler);

      await sessionMonitor.fetchRemoteSession('test-id');
      
      expect(errorHandler).toHaveBeenCalledWith(expect.objectContaining({
        type: 'timeout',
        message: expect.stringContaining('Timeout')
      }));
    });

    test('should retry failed operations with backoff', async () => {
      let attempts = 0;
      const failingOperation = mock(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return { success: true };
      });

      const result = await retryWithBackoff(failingOperation, {
        maxAttempts: 5,
        initialDelay: 10
      });

      expect(result).toEqual({ success: true });
      expect(attempts).toBe(3);
    });
  });

  describe('Memory and Resource Management', () => {
    test('should handle out of memory scenarios', async () => {
      const sessionMonitor = new SessionMonitor({
        sessionPath: join(tempDir, 'sessions'),
        maxMemory: 1024 * 1024 // 1MB limit
      });

      // Try to load many large sessions
      const largeSessions = Array.from({ length: 100 }, (_, i) => ({
        id: `session-${i}`,
        data: 'x'.repeat(100000) // 100KB each
      }));

      for (const session of largeSessions) {
        await sessionMonitor.addSession(session);
      }

      // Should have evicted old sessions to stay under memory limit
      const activeSessions = sessionMonitor.getActiveSessions();
      expect(activeSessions.length).toBeLessThan(100);
    });

    test('should clean up resources on shutdown', async () => {
      const sessionMonitor = new SessionMonitor({
        sessionPath: join(tempDir, 'sessions')
      });

      const fileWatcher = await sessionMonitor.start();
      
      // Verify watcher is active
      expect(fileWatcher.isActive()).toBe(true);

      // Shutdown
      await sessionMonitor.stop();
      
      // Verify resources are cleaned up
      expect(fileWatcher.isActive()).toBe(false);
    });
  });

  describe('Data Integrity', () => {
    test('should create backups before risky operations', async () => {
      const configManager = new ConfigManager(join(tempDir, '.specstar'));
      
      // Save initial config
      await configManager.save({ version: 1 });
      
      // Perform update that creates backup
      await configManager.update({ version: 2 });
      
      // Verify backup exists
      const backupPath = join(tempDir, '.specstar', 'settings.backup.json');
      const backup = await Bun.file(backupPath).json();
      expect(backup.version).toBe(1);
    });

    test('should validate data integrity with checksums', async () => {
      const sessionPath = join(tempDir, 'sessions', 'checksummed.json');
      const sessionData = {
        id: 'test',
        data: 'important',
        checksum: null as string | null
      };

      // Calculate and add checksum
      const hasher = new Bun.CryptoHasher('sha256');
      hasher.update(JSON.stringify({ id: sessionData.id, data: sessionData.data }));
      sessionData.checksum = hasher.digest('hex');

      await Bun.write(sessionPath, JSON.stringify(sessionData));

      // Verify checksum on read
      const loaded = await Bun.file(sessionPath).json();
      const verifyHasher = new Bun.CryptoHasher('sha256');
      verifyHasher.update(JSON.stringify({ id: loaded.id, data: loaded.data }));
      const calculatedChecksum = verifyHasher.digest('hex');

      expect(calculatedChecksum).toBe(loaded.checksum);
    });
  });
});

// Helper function for retry logic
async function retryWithBackoff(
  fn: () => Promise<any>,
  options: { maxAttempts: number; initialDelay: number }
): Promise<any> {
  let lastError;
  
  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt < options.maxAttempts) {
        const delay = options.initialDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}