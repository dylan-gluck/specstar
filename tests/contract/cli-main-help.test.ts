import { test, expect, describe } from 'bun:test';
import { $ } from 'bun';

describe('CLI: specstar --help', () => {
  const CLI_PATH = 'dist/specstar';

  test('should display help message with exit code 0', async () => {
    // This test will fail until implementation exists
    const result = await $`${CLI_PATH} --help`.quiet().nothrow();
    
    expect(result.exitCode).toBe(0);
  });

  test('should show usage information', async () => {
    // This test will fail until implementation exists
    const result = await $`${CLI_PATH} --help`.quiet().nothrow();
    const output = result.stdout.toString();
    
    expect(output).toContain('Usage:');
    expect(output).toContain('specstar');
  });

  test('should list available commands', async () => {
    // This test will fail until implementation exists
    const result = await $`${CLI_PATH} --help`.quiet().nothrow();
    const output = result.stdout.toString();
    
    expect(output).toContain('Commands:');
    expect(output).toContain('--init');
    expect(output).toContain('--version');
    expect(output).toContain('--help');
  });

  test('should describe each command', async () => {
    // This test will fail until implementation exists
    const result = await $`${CLI_PATH} --help`.quiet().nothrow();
    const output = result.stdout.toString();
    
    // Check for command descriptions
    expect(output).toMatch(/--init\s+.*Initialize Specstar in current project/i);
    expect(output).toMatch(/--version\s+.*Show version information/i);
    expect(output).toMatch(/--help\s+.*Show this help message/i);
  });

  test('should mention default TUI launch behavior', async () => {
    // This test will fail until implementation exists
    const result = await $`${CLI_PATH} --help`.quiet().nothrow();
    const output = result.stdout.toString();
    
    expect(output).toMatch(/Run without arguments to launch the TUI/i);
  });

  test('should handle -h shorthand', async () => {
    // This test will fail until implementation exists
    const resultShort = await $`${CLI_PATH} -h`.quiet().nothrow();
    const resultLong = await $`${CLI_PATH} --help`.quiet().nothrow();
    const outputShort = resultShort.stdout.toString();
    const outputLong = resultLong.stdout.toString();
    
    expect(outputShort).toBe(outputLong);
    expect(outputShort).toContain('Usage:');
  });
});