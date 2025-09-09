import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { $ } from 'bun';
import { rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('CLI: specstar --init', () => {
  const CLI_PATH = 'dist/specstar';
  const TEST_DIR = 'tests/contract/test-init-project';
  const SPECSTAR_DIR = join(TEST_DIR, '.specstar');

  beforeEach(async () => {
    // Create a test directory for initialization
    await $`mkdir -p ${TEST_DIR}`.quiet();
    // Create a simple package.json to simulate a project
    await Bun.write(join(TEST_DIR, 'package.json'), JSON.stringify({
      name: 'test-project',
      version: '1.0.0'
    }, null, 2));
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  test('should initialize .specstar directory with exit code 0', async () => {
    // This test will fail until implementation exists
    const result = await $`cd ${TEST_DIR} && ../../${CLI_PATH} --init`.quiet().nothrow();
    
    expect(result.exitCode).toBe(0);
  });

  test('should create .specstar directory structure', async () => {
    // This test will fail until implementation exists
    await $`cd ${TEST_DIR} && ../../${CLI_PATH} --init`.quiet().nothrow();
    
    expect(existsSync(SPECSTAR_DIR)).toBe(true);
    expect(existsSync(join(SPECSTAR_DIR, 'settings.json'))).toBe(true);
    expect(existsSync(join(SPECSTAR_DIR, 'sessions'))).toBe(true);
    expect(existsSync(join(SPECSTAR_DIR, 'hooks.ts'))).toBe(true);
  });

  test('should create valid settings.json with default configuration', async () => {
    // This test will fail until implementation exists
    await $`cd ${TEST_DIR} && ../../${CLI_PATH} --init`.quiet().nothrow();
    
    const settingsPath = join(SPECSTAR_DIR, 'settings.json');
    expect(existsSync(settingsPath)).toBe(true);
    
    const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    expect(settings).toHaveProperty('version');
    expect(settings).toHaveProperty('theme');
    expect(settings).toHaveProperty('sessionPath');
    expect(settings.sessionPath).toBe('./sessions');
  });

  test('should create hooks.ts with Claude Code lifecycle hooks', async () => {
    // This test will fail until implementation exists
    await $`cd ${TEST_DIR} && ../../${CLI_PATH} --init`.quiet().nothrow();
    
    const hooksPath = join(SPECSTAR_DIR, 'hooks.ts');
    expect(existsSync(hooksPath)).toBe(true);
    
    const hooksContent = readFileSync(hooksPath, 'utf-8');
    // Should contain hook function exports
    expect(hooksContent).toContain('export');
    expect(hooksContent).toContain('onSessionStart');
    expect(hooksContent).toContain('onSessionEnd');
    expect(hooksContent).toContain('onTaskUpdate');
  });

  test('should display success message', async () => {
    // This test will fail until implementation exists
    const result = await $`cd ${TEST_DIR} && ../../${CLI_PATH} --init`.quiet().nothrow();
    const output = result.stdout.toString();
    
    expect(output).toMatch(/Specstar initialized successfully/i);
    expect(output).toContain('.specstar');
  });

  test('should handle existing .specstar directory gracefully', async () => {
    // This test will fail until implementation exists
    // First initialization
    await $`cd ${TEST_DIR} && ../../${CLI_PATH} --init`.quiet().nothrow();
    
    // Second initialization should warn or skip
    const result = await $`cd ${TEST_DIR} && ../../${CLI_PATH} --init`.quiet().nothrow();
    const output = result.stdout.toString();
    
    expect(output).toMatch(/(already initialized|exists|skipping)/i);
    expect(output).not.toContain('error');
  });

  test('should work in non-npm projects', async () => {
    // This test will fail until implementation exists
    // Remove package.json to simulate non-npm project
    rmSync(join(TEST_DIR, 'package.json'));
    
    const result = await $`cd ${TEST_DIR} && ../../${CLI_PATH} --init`.quiet().nothrow();
    
    expect(result.exitCode).toBe(0);
    expect(existsSync(SPECSTAR_DIR)).toBe(true);
  });

  test('should add .specstar to .gitignore if git repo exists', async () => {
    // This test will fail until implementation exists
    // Initialize git repo
    await $`cd ${TEST_DIR} && git init`.quiet();
    
    await $`cd ${TEST_DIR} && ../../${CLI_PATH} --init`.quiet().nothrow();
    
    const gitignorePath = join(TEST_DIR, '.gitignore');
    if (existsSync(gitignorePath)) {
      const gitignoreContent = readFileSync(gitignorePath, 'utf-8');
      expect(gitignoreContent).toContain('.specstar/sessions');
    }
  });

  test('should respect --path option for custom location', async () => {
    // This test will fail until implementation exists
    const customPath = join(TEST_DIR, 'custom-specstar');
    
    const result = await $`cd ${TEST_DIR} && ../../${CLI_PATH} --init --path custom-specstar`.quiet().nothrow();
    
    expect(result.exitCode).toBe(0);
    expect(existsSync(customPath)).toBe(true);
    expect(existsSync(join(customPath, 'settings.json'))).toBe(true);
  });
});