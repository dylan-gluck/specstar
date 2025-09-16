import { beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';

// Global test setup for ink-testing-library
beforeAll(() => {
  // Suppress console output during tests unless DEBUG is set
  if (!process.env.DEBUG) {
    global.console = {
      ...console,
      log: () => {},
      error: () => {},
      warn: () => {},
      info: () => {},
      debug: () => {},
    };
  }
});

afterAll(() => {
  // Restore console
  if (!process.env.DEBUG) {
    delete (global as any).console;
  }
});

// Mock process.stdout for terminal dimensions
beforeEach(() => {
  process.stdout.columns = 80;
  process.stdout.rows = 24;
});

afterEach(() => {
  // Clean up any mocks or test artifacts
});