import { test, expect, describe, beforeAll } from 'bun:test';
import { $ } from 'bun';
import { VERSION } from '../../src/version';

describe('CLI End-to-End Tests', () => {
  const CLI_PATH = 'dist/specstar';
  
  beforeAll(async () => {
    // Ensure the binary is built before running tests
    await $`bun run build`.quiet();
  });

  describe('Help Command', () => {
    test('should display help with --help flag', async () => {
      const result = await $`${CLI_PATH} --help`.quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('Usage');
      expect(result.stdout.toString()).toContain('Options');
    });

    test('should display help with -h shorthand', async () => {
      const result = await $`${CLI_PATH} -h`.quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('Usage');
    });

    test('should show same output for -h and --help', async () => {
      const resultShort = await $`${CLI_PATH} -h`.quiet().nothrow();
      const resultLong = await $`${CLI_PATH} --help`.quiet().nothrow();
      
      expect(resultShort.stdout.toString()).toBe(resultLong.stdout.toString());
    });

    test('should show all available options', async () => {
      const result = await $`${CLI_PATH} --help`.quiet().nothrow();
      const output = result.stdout.toString();
      
      expect(output).toContain('--init');
      expect(output).toContain('--force');
      expect(output).toContain('--version');
      expect(output).toContain('--help');
    });

    test('should describe each command', async () => {
      const result = await $`${CLI_PATH} --help`.quiet().nothrow();
      const output = result.stdout.toString();
      
      expect(output).toMatch(/--init.*Initialize/i);
      expect(output).toMatch(/--version.*Show version/i);
      expect(output).toMatch(/--help.*Show this help/i);
      expect(output).toMatch(/--force.*Force overwrite/i);
    });

    test('should show default TUI launch behavior', async () => {
      const result = await $`${CLI_PATH} --help`.quiet().nothrow();
      const output = result.stdout.toString();
      
      expect(output).toMatch(/\$\s+specstar\s+Launch the TUI/i);
    });
  });

  describe('Version Command', () => {
    test('should display version with --version flag', async () => {
      const result = await $`${CLI_PATH} --version`.quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString().trim()).toBe(VERSION);
    });

    test('should display version with -v shorthand', async () => {
      const result = await $`${CLI_PATH} -v`.quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString().trim()).toBe(VERSION);
    });

    test('should output valid semver format', async () => {
      const result = await $`${CLI_PATH} --version`.quiet().nothrow();
      const output = result.stdout.toString().trim();
      
      expect(output).toMatch(/^\d+\.\d+\.\d+$/);
    });

    test('should have same output for -v and --version', async () => {
      const resultShort = await $`${CLI_PATH} -v`.quiet().nothrow();
      const resultLong = await $`${CLI_PATH} --version`.quiet().nothrow();
      
      expect(resultShort.stdout.toString()).toBe(resultLong.stdout.toString());
    });
  });

  describe('Init Command', () => {
    test('should initialize new configuration', async () => {
      const tempDir = await $`mktemp -d`.text();
      const cleanTempDir = tempDir.trim();
      
      try {
        const result = await $`cd ${cleanTempDir} && ${process.cwd()}/${CLI_PATH} --init`.quiet().nothrow();
        
        expect(result.exitCode).toBe(0);
        expect(result.stdout.toString()).toContain('Specstar initialized successfully');
        
        // Verify created structure
        const dirExists = await $`test -d ${cleanTempDir}/.specstar && echo "exists"`.quiet().text();
        expect(dirExists.trim()).toBe('exists');
        
        const settingsExists = await $`test -f ${cleanTempDir}/.specstar/settings.json && echo "exists"`.quiet().text();
        expect(settingsExists.trim()).toBe('exists');
        
        const hooksExists = await $`test -f ${cleanTempDir}/.specstar/hooks.ts && echo "exists"`.quiet().text();
        expect(hooksExists.trim()).toBe('exists');
      } finally {
        await $`rm -rf ${cleanTempDir}`.quiet();
      }
    });

    test('should fail on existing configuration without --force', async () => {
      const tempDir = await $`mktemp -d`.text();
      const cleanTempDir = tempDir.trim();
      
      try {
        // First initialization
        await $`cd ${cleanTempDir} && ${process.cwd()}/${CLI_PATH} --init`.quiet().nothrow();
        
        // Second initialization should fail
        const result = await $`cd ${cleanTempDir} && ${process.cwd()}/${CLI_PATH} --init`.quiet().nothrow();
        
        expect(result.exitCode).toBe(1);
        expect(result.stderr.toString()).toContain('Failed to initialize');
      } finally {
        await $`rm -rf ${cleanTempDir}`.quiet();
      }
    });

    test('should succeed with --force on existing configuration', async () => {
      const tempDir = await $`mktemp -d`.text();
      const cleanTempDir = tempDir.trim();
      
      try {
        // First initialization
        await $`cd ${cleanTempDir} && ${process.cwd()}/${CLI_PATH} --init`.quiet().nothrow();
        
        // Second initialization with force
        const result = await $`cd ${cleanTempDir} && ${process.cwd()}/${CLI_PATH} --init --force`.quiet().nothrow();
        
        expect(result.exitCode).toBe(0);
        expect(result.stdout.toString()).toContain('Specstar initialized successfully');
      } finally {
        await $`rm -rf ${cleanTempDir}`.quiet();
      }
    });

    test('should create all required directories', async () => {
      const tempDir = await $`mktemp -d`.text();
      const cleanTempDir = tempDir.trim();
      
      try {
        await $`cd ${cleanTempDir} && ${process.cwd()}/${CLI_PATH} --init`.quiet().nothrow();
        
        // Check all directories
        const sessionsDirExists = await $`test -d ${cleanTempDir}/.specstar/sessions && echo "exists"`.quiet().text();
        expect(sessionsDirExists.trim()).toBe('exists');
        
        const logsDirExists = await $`test -d ${cleanTempDir}/.specstar/logs && echo "exists"`.quiet().text();
        expect(logsDirExists.trim()).toBe('exists');
      } finally {
        await $`rm -rf ${cleanTempDir}`.quiet();
      }
    });
  });

  describe('Command Priority', () => {
    test('help flag should take priority', async () => {
      const result = await $`${CLI_PATH} --help --version`.quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('Usage');
      expect(result.stdout.toString()).not.toBe(VERSION);
    });

    test('version should exit immediately', async () => {
      const result = await $`${CLI_PATH} --version`.quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      expect(result.stderr.toString()).toBe('');
    });
  });
});