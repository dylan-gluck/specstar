#!/usr/bin/env bun
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import React from 'react';
import { render } from 'ink-testing-library';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

  describe('Configuration Errors', () => {
    test('should throw error for missing configuration', async () => {
      const configManager = new ConfigManager({ configPath: join(tempDir, '.specstar') });
      
      // Load without existing config should throw
      await expect(configManager.load()).rejects.toThrow('Failed to load configuration');
    });

    test('should throw error for invalid configuration', async () => {
      const configPath = join(tempDir, '.specstar');
      await Bun.$`mkdir -p ${configPath}`.quiet();
      
      // Write invalid config (not valid JSON)
      await Bun.write(join(configPath, 'settings.json'), 'not json {');

      const configManager = new ConfigManager({ configPath });
      
      // Should throw for invalid JSON
      await expect(configManager.load()).rejects.toThrow('Failed to load configuration');
    });
  });

  describe('UI Error Recovery', () => {
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
      
      rerender(<App />);
      
      // Should adapt to new size
      const frame = lastFrame();
      expect(frame).toBeDefined();
      
      // Restore size
      process.stdout.columns = 80;
      process.stdout.rows = 24;
    });
  });
});

// Helper function for retry logic
export async function retryWithBackoff(
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