#!/usr/bin/env bun
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { $ } from 'bun';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

// Path to the built specstar binary
const SPECSTAR_BIN = resolve(process.cwd(), 'dist/specstar');

describe('Project Initialization', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    // Create temporary directory for isolated testing
    tempDir = await mkdtemp(join(tmpdir(), 'specstar-init-test-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(async () => {
    // Cleanup
    process.chdir(originalCwd);
    await rm(tempDir, { recursive: true, force: true });
  });

  test('should initialize specstar in a new project', async () => {
    // Initialize specstar
    const result = await $`${SPECSTAR_BIN} --init`.quiet();
    
    // Verify .specstar directory structure was created
    const specstarDir = join(tempDir, '.specstar');
    expect(await Bun.file(join(specstarDir, 'settings.json')).exists()).toBe(true);
    expect(await Bun.file(join(specstarDir, 'hooks.ts')).exists()).toBe(true);
    
    // Verify sessions directory
    const sessionsDir = join(specstarDir, 'sessions');
    const sessionsDirExists = await Bun.file(sessionsDir).exists();
    expect(sessionsDirExists).toBe(true);
    
    // Verify default settings
    const settings = await Bun.file(join(specstarDir, 'settings.json')).json();
    expect(settings).toHaveProperty('theme');
    expect(settings).toHaveProperty('keyBindings');
    expect(settings).toHaveProperty('sessionPath');
    expect(settings.sessionPath).toBe('./sessions');
  });

  test('should not overwrite existing .specstar directory', async () => {
    // Create existing .specstar directory with custom settings
    const specstarDir = join(tempDir, '.specstar');
    await $`mkdir -p ${specstarDir}`.quiet();
    
    const customSettings = {
      theme: 'custom',
      customField: 'preserved'
    };
    await Bun.write(join(specstarDir, 'settings.json'), JSON.stringify(customSettings, null, 2));
    
    // Try to initialize again
    const result = await $`${SPECSTAR_BIN} --init`.quiet();
    
    // Verify original settings were preserved
    const settings = await Bun.file(join(specstarDir, 'settings.json')).json();
    expect(settings.customField).toBe('preserved');
    expect(settings.theme).toBe('custom');
  });

  test('should create Claude Code lifecycle hooks', async () => {
    await $`${SPECSTAR_BIN} --init`.quiet();
    
    const hooksFile = join(tempDir, '.specstar', 'hooks.ts');
    const hooksContent = await Bun.file(hooksFile).text();
    
    // Verify hooks export required functions
    expect(hooksContent).toContain('export function onSessionStart');
    expect(hooksContent).toContain('export function onFileChange');
    expect(hooksContent).toContain('export function onSessionEnd');
    expect(hooksContent).toContain('export function onError');
  });

  test('should handle initialization in git repository', async () => {
    // Initialize git repo
    await $`git init`.quiet();
    await $`git config user.email "test@example.com"`.quiet();
    await $`git config user.name "Test User"`.quiet();
    
    // Initialize specstar
    await $`${SPECSTAR_BIN} --init`.quiet();
    
    // Verify .gitignore was updated
    const gitignore = await Bun.file('.gitignore').text();
    expect(gitignore).toContain('.specstar/sessions/');
    expect(gitignore).toContain('.specstar/*.log');
    
    // Verify settings.json is NOT in gitignore (should be committed)
    expect(gitignore).not.toContain('.specstar/settings.json');
  });

  test('should support custom session directory path', async () => {
    // Initialize with custom path
    await $`${SPECSTAR_BIN} --init --session-path="../custom-sessions"`.quiet();
    
    const settings = await Bun.file(join(tempDir, '.specstar', 'settings.json')).json();
    expect(settings.sessionPath).toBe('../custom-sessions');
    
    // Verify custom directory was created
    const customDir = join(tempDir, '..', 'custom-sessions');
    expect(await Bun.file(customDir).exists()).toBe(true);
  });

  test('should validate and create parent directories', async () => {
    const deepPath = join(tempDir, 'deep', 'nested', 'project');
    await $`mkdir -p ${deepPath}`.quiet();
    process.chdir(deepPath);
    
    // Initialize in nested directory
    await $`${SPECSTAR_BIN} --init`.quiet();
    
    // Verify initialization succeeded
    const specstarDir = join(deepPath, '.specstar');
    expect(await Bun.file(join(specstarDir, 'settings.json')).exists()).toBe(true);
  });

  test('should handle permission errors gracefully', async () => {
    // Create read-only directory
    const readOnlyDir = join(tempDir, 'readonly');
    await $`mkdir ${readOnlyDir}`.quiet();
    await $`chmod 555 ${readOnlyDir}`.quiet();
    process.chdir(readOnlyDir);
    
    try {
      // Attempt initialization in read-only directory
      const result = await $`${SPECSTAR_BIN} --init`.quiet().nothrow();
      const errorOutput = result.stderr.toString();
      expect(errorOutput).toContain('Permission denied');
    } finally {
      // Restore permissions for cleanup
      process.chdir(originalCwd);
      await $`chmod 755 ${readOnlyDir}`.quiet();
    }
  });

  test('should integrate with existing Claude Code session', async () => {
    // Create mock Claude Code session file
    const sessionData = {
      id: 'test-session-123',
      startTime: new Date().toISOString(),
      files: [],
      commands: []
    };
    
    const claudeSessionPath = join(tempDir, '.claude', 'session.json');
    await $`mkdir -p ${join(tempDir, '.claude')}`.quiet();
    await Bun.write(claudeSessionPath, JSON.stringify(sessionData, null, 2));
    
    // Initialize specstar
    await $`${SPECSTAR_BIN} --init`.quiet();
    
    // Verify specstar detected existing session
    const settings = await Bun.file(join(tempDir, '.specstar', 'settings.json')).json();
    expect(settings).toHaveProperty('activeSession');
    expect(settings.activeSession).toBe('test-session-123');
  });
});