#!/usr/bin/env bun
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { $ } from 'bun';
import { tmpdir } from 'os';
import { join } from 'path';
import { rm, mkdir } from 'fs/promises';

describe('CLI Contract: session-monitor', () => {
  let tmpDir: string;
  
  beforeAll(async () => {
    // Create temp directory for test sessions
    tmpDir = join(tmpdir(), `specstar-test-session-monitor-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
    await mkdir(join(tmpDir, 'sessions'), { recursive: true });
  });
  
  afterAll(async () => {
    // Clean up temp directory
    await rm(tmpDir, { recursive: true, force: true });
  });
  
  describe('Direct execution: specstar-session-monitor', () => {
    it('should display help with --help flag', async () => {
      const result = await $`specstar-session-monitor --help`.quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('Claude Code session file monitoring');
      expect(result.stdout.toString()).toContain('Usage:');
      expect(result.stdout.toString()).toContain('Commands:');
      expect(result.stdout.toString()).toContain('watch');
      expect(result.stdout.toString()).toContain('list');
      expect(result.stdout.toString()).toContain('replay');
      expect(result.stdout.toString()).toContain('export');
    });
    
    it('should display help with -h flag', async () => {
      const result = await $`specstar-session-monitor -h`.quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('Claude Code session file monitoring');
    });
    
    it('should display version with --version flag', async () => {
      const result = await $`specstar-session-monitor --version`.quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toMatch(/\d+\.\d+\.\d+/);
    });
    
    it('should display version with -v flag', async () => {
      const result = await $`specstar-session-monitor -v`.quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toMatch(/\d+\.\d+\.\d+/);
    });
    
    describe('watch command', () => {
      it('should watch session directory for changes', async () => {
        // Start watching and kill after 1 second
        const watcher = $`specstar-session-monitor watch ${join(tmpDir, 'sessions')}`.quiet().nothrow();
        
        // Create a session file while watching
        await new Promise(resolve => setTimeout(resolve, 500));
        await Bun.write(join(tmpDir, 'sessions', 'test-session.json'), JSON.stringify({
          id: 'test-session',
          timestamp: Date.now(),
          events: []
        }));
        
        await new Promise(resolve => setTimeout(resolve, 500));
        watcher.kill();
        
        const result = await watcher;
        
        // Watcher should be killed gracefully
        expect(result.signal).toBeDefined();
      });
      
      it('should error on invalid directory', async () => {
        const result = await $`specstar-session-monitor watch /nonexistent/directory`.quiet().nothrow();
        
        expect(result.exitCode).not.toBe(0);
        expect(result.stderr.toString()).toContain('Error');
      });
    });
    
    describe('list command', () => {
      it('should list all sessions in directory', async () => {
        // Create test session files
        await Bun.write(join(tmpDir, 'sessions', 'session1.json'), JSON.stringify({
          id: 'session1',
          timestamp: Date.now() - 3600000,
          events: ['event1', 'event2']
        }));
        
        await Bun.write(join(tmpDir, 'sessions', 'session2.json'), JSON.stringify({
          id: 'session2',
          timestamp: Date.now(),
          events: ['event3']
        }));
        
        const result = await $`specstar-session-monitor list ${join(tmpDir, 'sessions')}`.quiet().nothrow();
        
        expect(result.exitCode).toBe(0);
        expect(result.stdout.toString()).toContain('session1');
        expect(result.stdout.toString()).toContain('session2');
        expect(result.stdout.toString()).toContain('2 sessions found');
      });
      
      it('should handle empty directory', async () => {
        const emptyDir = join(tmpDir, 'empty-sessions');
        await mkdir(emptyDir, { recursive: true });
        
        const result = await $`specstar-session-monitor list ${emptyDir}`.quiet().nothrow();
        
        expect(result.exitCode).toBe(0);
        expect(result.stdout.toString()).toContain('No sessions found');
      });
    });
    
    describe('replay command', () => {
      it('should replay a session file', async () => {
        const sessionFile = join(tmpDir, 'sessions', 'replay-session.json');
        await Bun.write(sessionFile, JSON.stringify({
          id: 'replay-session',
          timestamp: Date.now(),
          events: [
            { type: 'start', timestamp: Date.now() - 3000 },
            { type: 'action', timestamp: Date.now() - 2000, data: 'test action' },
            { type: 'end', timestamp: Date.now() - 1000 }
          ]
        }));
        
        const result = await $`specstar-session-monitor replay ${sessionFile}`.quiet().nothrow();
        
        expect(result.exitCode).toBe(0);
        expect(result.stdout.toString()).toContain('Replaying session');
        expect(result.stdout.toString()).toContain('replay-session');
      });
      
      it('should error on invalid session file', async () => {
        const result = await $`specstar-session-monitor replay /nonexistent/session.json`.quiet().nothrow();
        
        expect(result.exitCode).not.toBe(0);
        expect(result.stderr.toString()).toContain('Error');
      });
    });
    
    describe('export command', () => {
      it('should export session to different format', async () => {
        const sessionFile = join(tmpDir, 'sessions', 'export-session.json');
        const outputFile = join(tmpDir, 'exported-session.md');
        
        await Bun.write(sessionFile, JSON.stringify({
          id: 'export-session',
          timestamp: Date.now(),
          events: [
            { type: 'start', timestamp: Date.now() - 1000 },
            { type: 'action', timestamp: Date.now() - 500, data: 'test export' }
          ]
        }));
        
        const result = await $`specstar-session-monitor export ${sessionFile} --format markdown --output ${outputFile}`.quiet().nothrow();
        
        expect(result.exitCode).toBe(0);
        expect(result.stdout.toString()).toContain('Exported session to');
      });
      
      it('should support JSON export format', async () => {
        const sessionFile = join(tmpDir, 'sessions', 'json-export.json');
        const outputFile = join(tmpDir, 'exported.json');
        
        await Bun.write(sessionFile, JSON.stringify({
          id: 'json-export',
          timestamp: Date.now(),
          events: []
        }));
        
        const result = await $`specstar-session-monitor export ${sessionFile} --format json --output ${outputFile}`.quiet().nothrow();
        
        expect(result.exitCode).toBe(0);
        expect(result.stdout.toString()).toContain('Exported session to');
      });
    });
  });
  
  describe('Via main CLI: specstar lib session-monitor', () => {
    it('should display help', async () => {
      const result = await $`specstar lib session-monitor --help`.quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('Claude Code session file monitoring');
    });
    
    it('should display version', async () => {
      const result = await $`specstar lib session-monitor --version`.quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toMatch(/\d+\.\d+\.\d+/);
    });
    
    it('should execute list command', async () => {
      const result = await $`specstar lib session-monitor list ${join(tmpDir, 'sessions')}`.quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      // Should work even if there are sessions from previous tests
    });
  });
});