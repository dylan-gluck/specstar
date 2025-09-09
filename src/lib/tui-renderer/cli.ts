#!/usr/bin/env bun

import meow from 'meow';
import React from 'react';
import { Box, Text } from 'ink';
import { TuiRenderer, createTuiApp } from './index.js';
import type { TuiRendererOptions } from './index.js';
import chalk from 'chalk';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

const cli = meow(`
  Usage
    $ tui-renderer <command> [options]

  Commands
    render <file>        Render a React component file
    preview [text]       Preview text in TUI format
    export <file>        Export rendered output to file

  Options
    --fullscreen, -f     Run in fullscreen mode
    --no-exit-ctrl-c     Disable exit on Ctrl+C
    --exit-escape        Enable exit on Escape key
    --no-clear           Don't clear screen on exit
    --width <n>          Set terminal width (for export)
    --height <n>         Set terminal height (for export)
    --json               Output in JSON format
    --demo               Run interactive demo
    --help               Show this help message
    --version            Show version

  Examples
    $ tui-renderer preview "Hello, TUI!"
    $ tui-renderer preview --fullscreen
    $ tui-renderer render ./my-component.tsx
    $ tui-renderer render ./app.tsx --fullscreen
    $ tui-renderer export ./component.tsx output.txt
    $ tui-renderer --demo
`, {
  importMeta: import.meta,
  flags: {
    fullscreen: {
      type: 'boolean',
      alias: 'f',
      default: false
    },
    exitCtrlC: {
      type: 'boolean',
      default: true
    },
    exitEscape: {
      type: 'boolean',
      default: false
    },
    clear: {
      type: 'boolean',
      default: true
    },
    width: {
      type: 'number',
      default: 80
    },
    height: {
      type: 'number',
      default: 24
    },
    json: {
      type: 'boolean',
      default: false
    },
    demo: {
      type: 'boolean',
      default: false
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
    console.log(data);
  }
}

// Helper function to print error and exit
function error(message: string, code: number = 1): never {
  console.error(`Error: ${message}`);
  process.exit(code);
}

// Demo component
function DemoComponent() {
  const [counter, setCounter] = React.useState(0);
  const [selectedTab, setSelectedTab] = React.useState(0);
  
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCounter(c => c + 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  return React.createElement(
    Box,
    { flexDirection: 'column', padding: 1 },
    React.createElement(
      Text,
      { bold: true, color: 'cyan' },
      '🎨 TUI Renderer Demo'
    ),
    React.createElement(
      Box,
      { marginTop: 1 },
      React.createElement(
        Text,
        null,
        `Counter: ${counter}s`
      )
    ),
    React.createElement(
      Box,
      { marginTop: 1, flexDirection: 'column' },
      React.createElement(
        Text,
        { color: 'yellow' },
        'Features:'
      ),
      React.createElement(
        Box,
        { paddingLeft: 2, flexDirection: 'column' },
        React.createElement(Text, null, '• React-based terminal UI'),
        React.createElement(Text, null, '• Fullscreen support'),
        React.createElement(Text, null, '• Focus management'),
        React.createElement(Text, null, '• Keyboard navigation')
      )
    ),
    React.createElement(
      Box,
      { marginTop: 1 },
      React.createElement(
        Text,
        { dimColor: true },
        'Press Ctrl+C to exit'
      )
    )
  );
}

// Preview component
function PreviewComponent({ text }: { text: string }) {
  return React.createElement(
    Box,
    { borderStyle: 'round', borderColor: 'cyan', padding: 1 },
    React.createElement(
      Text,
      null,
      text
    )
  );
}

// Main CLI logic
async function main() {
  const command = cli.input[0];

  // Handle demo mode
  if (cli.flags.demo) {
    const options: TuiRendererOptions = {
      fullscreen: cli.flags.fullscreen,
      exitOnCtrlC: cli.flags.exitCtrlC,
      exitOnEscape: cli.flags.exitEscape,
      clearOnExit: cli.flags.clear
    };

    const app = createTuiApp(React.createElement(DemoComponent), options);
    await app();
    return;
  }

  try {
    switch (command) {
      case 'render': {
        const filePath = cli.input[1];
        
        if (!filePath) {
          error('File path is required for render command');
        }

        const resolvedPath = resolve(filePath);
        
        try {
          // Import the component module
          const module = await import(resolvedPath);
          const Component = module.default || module.App || module.Component;
          
          if (!Component) {
            error('No default export, App, or Component found in file');
          }

          const options: TuiRendererOptions = {
            fullscreen: cli.flags.fullscreen,
            exitOnCtrlC: cli.flags.exitCtrlC,
            exitOnEscape: cli.flags.exitEscape,
            clearOnExit: cli.flags.clear
          };

          const renderer = new TuiRenderer(options);
          const element = typeof Component === 'function' 
            ? React.createElement(Component)
            : Component;
          
          const { waitUntilExit, cleanup } = await renderer.render(element);

          try {
            await waitUntilExit();
          } finally {
            cleanup();
          }

          if (cli.flags.json) {
            output({
              success: true,
              file: resolvedPath,
              options
            }, true);
          }
        } catch (err) {
          if (err instanceof Error) {
            error(`Failed to render component: ${err.message}`);
          } else {
            error('Failed to render component');
          }
        }
        break;
      }

      case 'preview': {
        const text = cli.input.slice(1).join(' ') || 'Hello, TUI Renderer!';

        const options: TuiRendererOptions = {
          fullscreen: cli.flags.fullscreen,
          exitOnCtrlC: cli.flags.exitCtrlC,
          exitOnEscape: cli.flags.exitEscape,
          clearOnExit: cli.flags.clear
        };

        if (cli.flags.json) {
          output({
            text,
            options
          }, true);
        } else {
          const renderer = new TuiRenderer(options);
          const element = React.createElement(PreviewComponent, { text });
          
          const { waitUntilExit, cleanup } = await renderer.render(element);

          try {
            await waitUntilExit();
          } finally {
            cleanup();
          }
        }
        break;
      }

      case 'export': {
        const filePath = cli.input[1];
        const outputPath = cli.input[2];
        
        if (!filePath) {
          error('Component file path is required for export command');
        }
        
        if (!outputPath) {
          error('Output file path is required for export command');
        }

        const resolvedPath = resolve(filePath);
        const resolvedOutput = resolve(outputPath);
        
        try {
          // Import the component module
          const module = await import(resolvedPath);
          const Component = module.default || module.App || module.Component;
          
          if (!Component) {
            error('No default export, App, or Component found in file');
          }

          // Create a custom stdout stream to capture output
          const originalWrite = process.stdout.write;
          let capturedOutput = '';
          
          // Override stdout.write to capture output
          process.stdout.write = function(chunk: any, encoding?: any, callback?: any) {
            if (typeof chunk === 'string') {
              capturedOutput += chunk;
            } else if (chunk instanceof Buffer) {
              capturedOutput += chunk.toString();
            }
            
            // Call original write for callback compatibility
            if (typeof encoding === 'function') {
              callback = encoding;
              encoding = undefined;
            }
            
            if (callback) {
              process.nextTick(callback);
            }
            
            return true;
          } as any;

          // Set terminal dimensions for consistent export
          Object.defineProperty(process.stdout, 'columns', {
            value: cli.flags.width,
            writable: true,
            configurable: true
          });
          
          Object.defineProperty(process.stdout, 'rows', {
            value: cli.flags.height,
            writable: true,
            configurable: true
          });

          try {
            const renderer = new TuiRenderer({
              fullscreen: false,
              exitOnCtrlC: false,
              exitOnEscape: false,
              clearOnExit: false
            });
            
            const element = typeof Component === 'function' 
              ? React.createElement(Component)
              : Component;
            
            const { instance, cleanup } = await renderer.render(element);
            
            // Wait a moment for render to complete
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Unmount and cleanup
            cleanup();
            
            // Restore original stdout.write
            process.stdout.write = originalWrite;
            
            // Clean up ANSI escape codes for export
            const cleanOutput = capturedOutput
              .replace(/\x1B\[[0-9;]*m/g, '') // Remove color codes
              .replace(/\x1B\[[\?0-9]*[hlHJ]/g, '') // Remove cursor/screen codes
              .replace(/\x1B\[[0-9]*[A-Z]/g, ''); // Remove other escape sequences
            
            // Write to file
            await Bun.write(resolvedOutput, cleanOutput);
            
            if (cli.flags.json) {
              output({
                success: true,
                input: resolvedPath,
                output: resolvedOutput,
                size: cleanOutput.length,
                lines: cleanOutput.split('\n').length
              }, true);
            } else {
              console.log(chalk.green(`✅ Exported to ${resolvedOutput}`));
              console.log(`Size: ${cleanOutput.length} bytes`);
              console.log(`Lines: ${cleanOutput.split('\n').length}`);
            }
          } finally {
            // Ensure stdout.write is restored
            process.stdout.write = originalWrite;
          }
        } catch (err) {
          if (err instanceof Error) {
            error(`Failed to export component: ${err.message}`);
          } else {
            error('Failed to export component');
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
export { TuiRenderer, cli };

// Run if executed directly
if (import.meta.main) {
  main();
}