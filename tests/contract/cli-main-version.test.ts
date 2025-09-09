import { test, expect, describe } from 'bun:test';
import { $ } from 'bun';

describe('CLI: specstar --version', () => {
  const CLI_PATH = 'dist/specstar';

  test('should display version with exit code 0', async () => {
    // This test will fail until implementation exists
    const result = await $`${CLI_PATH} --version`.quiet().nothrow();
    
    expect(result.exitCode).toBe(0);
  });

  test('should show semantic version number', async () => {
    // This test will fail until implementation exists
    const result = await $`${CLI_PATH} --version`.quiet().nothrow();
    const output = result.stdout.toString();
    
    // Should match semantic versioning pattern (e.g., 1.0.0, 0.1.0-beta)
    expect(output).toMatch(/\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?/);
  });

  test('should include application name', async () => {
    // This test will fail until implementation exists
    const result = await $`${CLI_PATH} --version`.quiet().nothrow();
    const output = result.stdout.toString();
    
    expect(output.toLowerCase()).toContain('specstar');
  });

  test('should handle -v shorthand', async () => {
    // This test will fail until implementation exists
    const resultShort = await $`${CLI_PATH} -v`.quiet().nothrow();
    const resultLong = await $`${CLI_PATH} --version`.quiet().nothrow();
    const outputShort = resultShort.stdout.toString();
    const outputLong = resultLong.stdout.toString();
    
    expect(outputShort).toBe(outputLong);
    expect(outputShort).toMatch(/\d+\.\d+\.\d+/);
  });

  test('should output clean single-line format', async () => {
    // This test will fail until implementation exists
    const result = await $`${CLI_PATH} --version`.quiet().nothrow();
    const output = result.stdout.toString();
    
    // Should be a single line without extra whitespace
    const lines = output.trim().split('\n');
    expect(lines.length).toBe(1);
    
    // Should follow common format: "specstar 1.0.0" or "Specstar v1.0.0"
    expect(output.trim()).toMatch(/^(specstar|Specstar)\s+(v?\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?)$/i);
  });

  test('should not output debug or verbose information', async () => {
    // This test will fail until implementation exists
    const result = await $`${CLI_PATH} --version`.quiet().nothrow();
    const output = result.stdout.toString();
    
    // Should not contain debug info
    expect(output).not.toContain('debug');
    expect(output).not.toContain('built');
    expect(output).not.toContain('compiled');
    expect(output.length).toBeLessThan(100); // Version string should be concise
  });
});