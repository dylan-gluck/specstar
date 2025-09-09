#!/usr/bin/env bun

import meow from 'meow';
import { HookIntegrator } from './index.js';
import type { HookEvent } from './index.js';
import { join, resolve } from 'path';
import chalk from 'chalk';

const cli = meow(`
  Usage
    $ hook-integrator <command> [options]

  Commands
    install [path]       Install hooks from hooks.ts file
    uninstall            Remove all registered hooks
    list                 List all registered hooks
    validate [path]      Validate hooks file syntax and structure
    run <event> [data]   Manually trigger a hook event

  Options
    --hooks-path, -h     Path to hooks.ts file (default: .specstar/hooks.ts)
    --isolate            Isolate errors in hook execution (default: true)
    --no-isolate         Don't isolate errors (fail on first error)
    --json               Output in JSON format
    --verbose, -v        Verbose output
    --dry-run            Simulate actions without executing
    --help               Show this help message
    --version            Show version

  Examples
    $ hook-integrator install
    $ hook-integrator install ./custom-hooks.ts
    $ hook-integrator list
    $ hook-integrator validate ./hooks.ts
    $ hook-integrator run beforeSession '{"sessionId":"123"}'
    $ hook-integrator run onFileChange --json < event.json
    $ hook-integrator uninstall
`, {
  importMeta: import.meta,
  flags: {
    hooksPath: {
      type: 'string',
      alias: 'h',
      default: '.specstar/hooks.ts'
    },
    isolate: {
      type: 'boolean',
      default: true
    },
    json: {
      type: 'boolean',
      default: false
    },
    verbose: {
      type: 'boolean',
      alias: 'v',
      default: false
    },
    dryRun: {
      type: 'boolean',
      default: false
    },
    help: {
      type: 'boolean'
    },
    version: {
      type: 'boolean'
    }
  }
});

// Helper function to print output
function output(data: any, jsonFormat: boolean = false) {
  if (jsonFormat) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(data);
  }
}

// Helper function to print error and exit
function error(message: string, code: number = 1): never {
  console.error(`Error: ${message}`);
  process.exit(code);
}

// Helper function to print verbose log
function verbose(message: string, data?: any) {
  if (cli.flags.verbose) {
    console.log(chalk.dim(`[verbose] ${message}`));
    if (data) {
      console.log(chalk.dim(JSON.stringify(data, null, 2)));
    }
  }
}

// Helper function to validate hooks file syntax
async function validateHooksFile(path: string): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];
  const resolvedPath = resolve(path);
  
  try {
    // Check if file exists
    const file = Bun.file(resolvedPath);
    if (!await file.exists()) {
      errors.push(`File not found: ${resolvedPath}`);
      return { valid: false, errors };
    }
    
    // Try to import the module
    verbose(`Importing hooks from ${resolvedPath}`);
    const module = await import(resolvedPath);
    
    // Check for expected exports
    const hooks = module.default || module;
    const validHookNames = [
      'beforeSession',
      'afterSession',
      'onFileChange',
      'onCommand',
      'onError'
    ];
    
    // Validate exported functions
    let hasValidHooks = false;
    for (const hookName of validHookNames) {
      if (hookName in hooks) {
        if (typeof hooks[hookName] === 'function') {
          verbose(`Found valid hook: ${hookName}`);
          hasValidHooks = true;
        } else {
          errors.push(`${hookName} is not a function (type: ${typeof hooks[hookName]})`);
        }
      }
    }
    
    if (!hasValidHooks) {
      errors.push('No valid hook functions found');
    }
    
    // Check for unknown exports
    for (const key in hooks) {
      if (!validHookNames.includes(key) && typeof hooks[key] === 'function') {
        verbose(`Warning: Unknown hook function: ${key}`);
      }
    }
    
    return { valid: errors.length === 0, errors };
    
  } catch (err) {
    if (err instanceof Error) {
      errors.push(`Failed to import hooks: ${err.message}`);
    } else {
      errors.push('Failed to import hooks: Unknown error');
    }
    return { valid: false, errors };
  }
}

// Main CLI logic
async function main() {
  const command = cli.input[0];
  
  try {
    switch (command) {
      case 'install': {
        const hooksPath = cli.input[1] || cli.flags.hooksPath;
        const resolvedPath = resolve(hooksPath);
        
        verbose(`Installing hooks from ${resolvedPath}`);
        
        // Validate hooks file first
        const validation = await validateHooksFile(resolvedPath);
        
        if (!validation.valid) {
          if (cli.flags.json) {
            output({ success: false, errors: validation.errors }, true);
          } else {
            console.error(chalk.red('Hook validation failed:'));
            for (const err of validation.errors) {
              console.error(`  - ${err}`);
            }
          }
          process.exit(1);
        }
        
        if (cli.flags.dryRun) {
          console.log(chalk.yellow('Dry run mode - no changes made'));
          console.log(`Would install hooks from: ${resolvedPath}`);
        } else {
          const integrator = new HookIntegrator({
            hooksPath: resolvedPath,
            isolateErrors: cli.flags.isolate
          });
          
          await integrator.load();
          const events = integrator.getRegisteredEvents();
          
          if (cli.flags.json) {
            output({
              success: true,
              hooksPath: resolvedPath,
              registeredEvents: events,
              isolateErrors: cli.flags.isolate
            }, true);
          } else {
            console.log(chalk.green(`✅ Hooks installed from ${resolvedPath}`));
            console.log(`Registered events: ${events.join(', ') || 'none'}`);
            console.log(`Error isolation: ${cli.flags.isolate ? 'enabled' : 'disabled'}`);
          }
        }
        break;
      }

      case 'uninstall': {
        if (cli.flags.dryRun) {
          console.log(chalk.yellow('Dry run mode - no changes made'));
          console.log('Would uninstall all hooks');
        } else {
          const integrator = new HookIntegrator({
            hooksPath: cli.flags.hooksPath,
            isolateErrors: cli.flags.isolate
          });
          
          await integrator.load();
          const eventsBefore = integrator.getRegisteredEvents();
          integrator.clearHooks();
          
          if (cli.flags.json) {
            output({
              success: true,
              uninstalledEvents: eventsBefore
            }, true);
          } else {
            console.log(chalk.green('✅ All hooks uninstalled'));
            if (eventsBefore.length > 0) {
              console.log(`Removed events: ${eventsBefore.join(', ')}`);
            }
          }
        }
        break;
      }

      case 'list': {
        const integrator = new HookIntegrator({
          hooksPath: cli.flags.hooksPath,
          isolateErrors: cli.flags.isolate
        });
        
        await integrator.load();
        const events = integrator.getRegisteredEvents();
        
        if (cli.flags.json) {
          const details = events.map(event => ({
            event,
            handlers: integrator.getHandlerCount(event)
          }));
          output(details, true);
        } else {
          if (events.length === 0) {
            console.log('No hooks registered');
          } else {
            console.log(chalk.cyan('Registered hooks:'));
            console.log();
            
            for (const event of events) {
              const count = integrator.getHandlerCount(event);
              const icon = count > 0 ? '✓' : '○';
              console.log(`  ${icon} ${event} (${count} handler${count !== 1 ? 's' : ''})`);
            }
            
            console.log();
            console.log(`Hooks path: ${resolve(cli.flags.hooksPath)}`);
            console.log(`Error isolation: ${cli.flags.isolate ? 'enabled' : 'disabled'}`);
          }
        }
        break;
      }

      case 'validate': {
        const hooksPath = cli.input[1] || cli.flags.hooksPath;
        const resolvedPath = resolve(hooksPath);
        
        verbose(`Validating hooks at ${resolvedPath}`);
        
        const validation = await validateHooksFile(resolvedPath);
        
        if (cli.flags.json) {
          output({
            path: resolvedPath,
            valid: validation.valid,
            errors: validation.errors
          }, true);
        } else {
          if (validation.valid) {
            console.log(chalk.green(`✅ Hooks file is valid: ${resolvedPath}`));
            
            // Load and show hook details
            const integrator = new HookIntegrator({
              hooksPath: resolvedPath,
              isolateErrors: true
            });
            
            await integrator.load();
            const events = integrator.getRegisteredEvents();
            
            if (events.length > 0) {
              console.log();
              console.log('Available hooks:');
              for (const event of events) {
                console.log(`  - ${event}`);
              }
            }
          } else {
            console.error(chalk.red(`❌ Hooks file validation failed: ${resolvedPath}`));
            console.error();
            console.error('Errors:');
            for (const err of validation.errors) {
              console.error(`  - ${err}`);
            }
            process.exit(1);
          }
        }
        break;
      }

      case 'run': {
        const eventType = cli.input[1];
        const eventData = cli.input[2];
        
        if (!eventType) {
          error('Event type is required for run command');
        }
        
        // Parse event data
        let data: any = {};
        if (eventData) {
          try {
            data = JSON.parse(eventData);
          } catch {
            // If not JSON, treat as string
            data = { value: eventData };
          }
        }
        
        // Create hook event
        const hookEvent: HookEvent = {
          type: eventType,
          timestamp: new Date().toISOString(),
          data
        };
        
        verbose(`Triggering event: ${eventType}`, hookEvent);
        
        if (cli.flags.dryRun) {
          console.log(chalk.yellow('Dry run mode - no hooks executed'));
          console.log('Would trigger event:', hookEvent);
        } else {
          const integrator = new HookIntegrator({
            hooksPath: cli.flags.hooksPath,
            isolateErrors: cli.flags.isolate
          });
          
          await integrator.load();
          
          // Check if event has handlers
          if (!integrator.hasHandlers(eventType)) {
            if (cli.flags.json) {
              output({
                success: false,
                message: `No handlers registered for event: ${eventType}`,
                availableEvents: integrator.getRegisteredEvents()
              }, true);
            } else {
              console.warn(chalk.yellow(`Warning: No handlers registered for event: ${eventType}`));
              const events = integrator.getRegisteredEvents();
              if (events.length > 0) {
                console.log(`Available events: ${events.join(', ')}`);
              }
            }
          } else {
            // Trigger the hook
            try {
              await integrator.triggerHook(hookEvent);
              
              if (cli.flags.json) {
                output({
                  success: true,
                  event: hookEvent,
                  handlersExecuted: integrator.getHandlerCount(eventType)
                }, true);
              } else {
                console.log(chalk.green(`✅ Event triggered: ${eventType}`));
                console.log(`Handlers executed: ${integrator.getHandlerCount(eventType)}`);
                if (cli.flags.verbose) {
                  console.log('Event data:', JSON.stringify(data, null, 2));
                }
              }
            } catch (err) {
              if (cli.flags.json) {
                output({
                  success: false,
                  event: hookEvent,
                  error: err instanceof Error ? err.message : 'Unknown error'
                }, true);
              } else {
                console.error(chalk.red(`Failed to trigger event: ${err}`));
              }
              process.exit(1);
            }
          }
        }
        break;
      }

      default: {
        if (command) {
          error(`Unknown command: ${command}`);
        }
        cli.showHelp();
        break;
      }
    }
  } catch (err) {
    if (err instanceof Error) {
      error(err.message);
    } else {
      error('An unexpected error occurred');
    }
  }
}

// Export for library usage
export { HookIntegrator, cli };

// Run if executed directly
if (import.meta.main) {
  main();
}