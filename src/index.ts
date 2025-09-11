/**
 * Specstar - Terminal UI for monitoring Claude Code sessions
 * 
 * This file exports the public API for the Specstar package.
 */

// Export types for hooks and configuration
export type {
  SessionContext,
  FileChangeEvent,
  SpecstarConfig,
  ConfigManagerOptions,
  InitOptions
} from './lib/config-manager/index.ts';

// Export the ConfigManager class
export { ConfigManager } from './lib/config-manager/index.ts';

// Export session monitor when implemented
// export { SessionMonitor } from './lib/session-monitor/index.ts';

