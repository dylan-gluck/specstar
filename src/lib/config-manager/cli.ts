#!/usr/bin/env bun

import meow from 'meow';
import { ConfigManager } from './index.js';
import type { SpecstarConfig } from './index.js';
import { homedir } from 'os';
import { join } from 'path';

const cli = meow(`
  Usage
    $ config-manager <command> [options]

  Commands
    init [path]           Initialize Specstar configuration in a project
    get [key]            Get configuration value(s)
    set <key> <value>    Set a configuration value
    list                 List all configuration values
    reset                Reset configuration to defaults
    validate [path]      Validate configuration file

  Options
    --config, -c         Path to config directory (default: .specstar)
    --force, -f          Force overwrite existing configuration
    --json               Output in JSON format
    --no-claude          Skip updating Claude Code settings
    --help               Show this help message
    --version            Show version

  Examples
    $ config-manager init
    $ config-manager init /path/to/project --force
    $ config-manager get theme
    $ config-manager set theme dark
    $ config-manager set logLevel debug
    $ config-manager list --json
    $ config-manager reset --force
    $ config-manager validate
`, {
  importMeta: import.meta,
  flags: {
    config: {
      type: 'string',
      alias: 'c'
    },
    force: {
      type: 'boolean',
      alias: 'f',
      default: false
    },
    json: {
      type: 'boolean',
      default: false
    },
    claude: {
      type: 'boolean',
      default: true
    },
    help: {
      type: 'boolean',
      alias: 'h'
    },
    version: {
      type: 'boolean',
      alias: 'v'
    }
  }
});

// Helper function to print output
function output(data: any, jsonFormat: boolean = false) {
  if (jsonFormat) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    if (typeof data === 'object') {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(data);
    }
  }
}

// Helper function to print error and exit
function error(message: string, code: number = 1): never {
  console.error(`Error: ${message}`);
  process.exit(code);
}

// Helper function to print success message
function success(message: string) {
  console.log(`✅ ${message}`);
}

// Main CLI logic
async function main() {
  const command = cli.input[0];
  const manager = new ConfigManager({
    configPath: cli.flags.config
  });

  try {
    switch (command) {
      case 'init': {
        const path = cli.input[1] || process.cwd();
        await manager.init(path, {
          force: cli.flags.force,
          updateClaudeSettings: cli.flags.claude
        });
        success(`Initialized Specstar configuration at ${join(path, '.specstar')}`);
        if (cli.flags.claude) {
          console.log('   Claude Code settings have been updated');
        }
        break;
      }

      case 'get': {
        const config = await manager.load();
        const key = cli.input[1];
        
        if (key) {
          // Get specific key using dot notation
          const keys = key.split('.');
          let value: any = config;
          
          for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
              value = value[k as keyof typeof value];
            } else {
              error(`Key '${key}' not found in configuration`);
            }
          }
          
          output(value, cli.flags.json);
        } else {
          // Get all configuration
          output(config, cli.flags.json);
        }
        break;
      }

      case 'set': {
        const key = cli.input[1];
        const value = cli.input[2];
        
        if (!key || value === undefined) {
          error('Both key and value are required for set command');
        }
        
        const config = await manager.load();
        
        // Parse value based on type
        let parsedValue: any = value;
        if (value === 'true') parsedValue = true;
        else if (value === 'false') parsedValue = false;
        else if (!isNaN(Number(value))) parsedValue = Number(value);
        
        // Set value using dot notation
        const keys = key.split('.');
        let current: any = config;
        
        for (let i = 0; i < keys.length - 1; i++) {
          const k = keys[i];
          if (!k) continue;
          if (!(k in current) || typeof current[k as keyof typeof current] !== 'object') {
            (current as any)[k] = {};
          }
          current = (current as any)[k];
        }
        
        const lastKey = keys[keys.length - 1];
        if (lastKey) {
          (current as any)[lastKey] = parsedValue;
        }
        
        // Validate and save
        if (!manager.validate(config)) {
          error('Invalid configuration after setting value');
        }
        
        await manager.save(config);
        success(`Set ${key} = ${parsedValue}`);
        break;
      }

      case 'list': {
        const config = await manager.load();
        
        if (cli.flags.json) {
          output(config, true);
        } else {
          console.log('Current configuration:');
          console.log('');
          
          // Format configuration for display
          const formatConfig = (obj: any, indent = '  '): string[] => {
            const lines: string[] = [];
            for (const [key, value] of Object.entries(obj)) {
              if (value === null || value === undefined) {
                lines.push(`${indent}${key}: (not set)`);
              } else if (typeof value === 'object' && !Array.isArray(value)) {
                lines.push(`${indent}${key}:`);
                lines.push(...formatConfig(value, indent + '  '));
              } else if (Array.isArray(value)) {
                lines.push(`${indent}${key}: [${value.join(', ')}]`);
              } else {
                lines.push(`${indent}${key}: ${value}`);
              }
            }
            return lines;
          };
          
          console.log(formatConfig(config).join('\n'));
        }
        break;
      }

      case 'reset': {
        if (!cli.flags.force) {
          error('Reset requires --force flag to confirm');
        }
        
        // Load default configuration
        const defaultConfig: SpecstarConfig = {
          version: '1.0.0',
          sessionPath: '.specstar/sessions',
          folders: [],
          theme: 'dark',
          autoStart: false,
          logLevel: 'info'
        };
        
        await manager.save(defaultConfig);
        success('Configuration reset to defaults');
        break;
      }

      case 'validate': {
        const configPath = cli.input[1];
        
        if (configPath) {
          // Validate specific file
          try {
            const file = Bun.file(configPath);
            const content = await file.text();
            const config = JSON.parse(content);
            
            if (manager.validate(config)) {
              success(`Configuration at ${configPath} is valid`);
            } else {
              error(`Configuration at ${configPath} is invalid`);
            }
          } catch (err) {
            error(`Failed to validate ${configPath}: ${err}`);
          }
        } else {
          // Validate current configuration
          const config = await manager.load();
          if (manager.validate(config)) {
            success('Current configuration is valid');
          } else {
            error('Current configuration is invalid');
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
export { ConfigManager, cli };

// Run if executed directly
if (import.meta.main) {
  main();
}