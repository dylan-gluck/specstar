#!/usr/bin/env node
import { withFullScreen } from "fullscreen-ink";
import meow from "meow";
import App from "./app.tsx";
import { ConfigManager } from "./lib/config-manager/index.ts";
import { Logger } from "./lib/logger/index.ts";
import { VERSION } from "./version.ts";

const cli = meow(
  `
	Usage
	  $ specstar        Launch the TUI
	  $ specstar --init Initialize Specstar in the current project

	Options
	  --init      Initialize .specstar directory with default configuration
	  --force     Force overwrite existing configuration (use with --init)
	  --version   Show version information
	  --help, -h  Show this help message
`,
  {
    importMeta: import.meta,
    flags: {
      init: {
        type: "boolean",
      },
      force: {
        type: "boolean",
      },
      help: {
        type: "boolean",
        shortFlag: 'h'
      },
      version: {
        type: "boolean",
        shortFlag: 'v'
      }
    },
    helpIndent: 2,
    // Disable automatic version handling
    autoVersion: false
  }
);

const logger = new Logger('CLI');

// Check for help flag first - before anything else
if (process.argv.includes('-h') || process.argv.includes('--help')) {
  console.log(cli.help);
  process.exit(0);
}

// Handle version flag
if (cli.flags.version || process.argv.includes('-v')) {
  console.log(VERSION);
  process.exit(0);
}

// Handle --init flag
if (cli.flags.init) {
  const configManager = new ConfigManager();
  
  try {
    logger.info('Initializing Specstar', { 
      cwd: process.cwd(), 
      force: cli.flags.force 
    });
    
    await configManager.init(process.cwd(), { force: cli.flags.force });
    
    console.log('✅ Specstar initialized successfully!');
    console.log('📁 Created .specstar directory with:');
    console.log('   - settings.json (configuration)');
    console.log('   - sessions/ (session data storage)');
    console.log('   - hooks.ts (lifecycle hooks)');
    console.log('   - logs/ (application logs)');
    console.log('\nRun `specstar` to launch the TUI.');
    
    logger.info('Initialization completed successfully');
    process.exit(0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to initialize Specstar', error as Error);
    console.error('❌ Failed to initialize Specstar:', errorMessage);
    console.error('\nTry running with --force to overwrite existing configuration.');
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
  console.error('Fatal error:', error.message);
  console.error('Check .specstar/logs for details');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', reason as Error);
  console.error('Unhandled promise rejection:', reason);
  process.exit(1);
});

// Launch TUI if no flags provided
try {
  logger.debug('Debug: Starting TUI initialization');
  logger.info('Launching Specstar TUI');
  logger.debug('Debug: Creating Ink instance');
  const ink = withFullScreen(<App />);

  logger.debug('Debug: Starting Ink render');
  await ink.start();
  await ink.waitUntilExit();
  
  logger.debug('Debug: TUI cleanup complete');
  logger.info('Specstar TUI exited normally');
} catch (error) {
  logger.error('Failed to launch TUI', error as Error);
  console.error('Failed to launch TUI:', error);
  console.error('Check .specstar/logs for details');
  process.exit(1);
}
