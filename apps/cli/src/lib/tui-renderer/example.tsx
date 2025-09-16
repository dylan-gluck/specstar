#!/usr/bin/env bun
/**
 * Example usage of the tui-renderer library
 * Run with: bun run src/lib/tui-renderer/example.tsx
 */

import React, { useState } from 'react';
import { Box, Text, useApp } from 'ink';
import {
  TuiRenderer,
  useNavigation,
  useTerminalSize,
  FocusableBox,
  createTuiApp,
} from './index';

// Example 1: Simple component with navigation
function NavigationExample() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const { exit } = useApp();
  const { columns, rows } = useTerminalSize();

  useNavigation({
    onUp: () => setPosition(p => ({ ...p, y: Math.max(0, p.y - 1) })),
    onDown: () => setPosition(p => ({ ...p, y: Math.min(rows - 5, p.y + 1) })),
    onLeft: () => setPosition(p => ({ ...p, x: Math.max(0, p.x - 1) })),
    onRight: () => setPosition(p => ({ ...p, x: Math.min(columns - 20, p.x + 1) })),
    onEscape: () => exit(),
  });

  return (
    <Box flexDirection="column" width={columns} height={rows}>
      <Box marginBottom={1}>
        <Text bold color="green">Navigation Example</Text>
      </Box>
      <Box marginBottom={1}>
        <Text>Use arrow keys to move, ESC to exit</Text>
      </Box>
      <Box marginBottom={1}>
        <Text>Terminal size: {columns}x{rows}</Text>
      </Box>
      <Box position="relative" width={columns} height={rows - 4}>
        <Box marginLeft={position.x} marginTop={position.y}>
          <Text color="cyan">◆</Text>
        </Box>
      </Box>
    </Box>
  );
}

// Example 2: Focusable boxes
function FocusableExample() {
  const [selectedBox, setSelectedBox] = useState<string | null>(null);
  const { exit } = useApp();

  useNavigation({
    onEscape: () => exit(),
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="green">Focusable Boxes Example</Text>
      </Box>
      <Box marginBottom={1}>
        <Text>Use Tab/Shift+Tab to navigate, ESC to exit</Text>
      </Box>
      <Box gap={1}>
        <FocusableBox
          id="box1"
          width={20}
          height={5}
          borderStyle="single"
          onFocus={() => setSelectedBox('box1')}
          onBlur={() => setSelectedBox(null)}
        >
          <Text>Box 1{selectedBox === 'box1' && ' (focused)'}</Text>
        </FocusableBox>
        
        <FocusableBox
          id="box2"
          width={20}
          height={5}
          borderStyle="double"
          borderColor="yellow"
          focusBorderColor="green"
          onFocus={() => setSelectedBox('box2')}
          onBlur={() => setSelectedBox(null)}
        >
          <Text>Box 2{selectedBox === 'box2' && ' (focused)'}</Text>
        </FocusableBox>
        
        <FocusableBox
          id="box3"
          width={20}
          height={5}
          borderStyle="round"
          borderColor="blue"
          focusBorderColor="magenta"
          onFocus={() => setSelectedBox('box3')}
          onBlur={() => setSelectedBox(null)}
        >
          <Text>Box 3{selectedBox === 'box3' && ' (focused)'}</Text>
        </FocusableBox>
      </Box>
    </Box>
  );
}

// Example 3: Menu with custom renderer
function MenuExample() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { exit } = useApp();
  
  const menuItems = [
    'Navigation Demo',
    'Focusable Boxes',
    'Exit',
  ];

  useNavigation({
    onUp: () => setSelectedIndex(i => Math.max(0, i - 1)),
    onDown: () => setSelectedIndex(i => Math.min(menuItems.length - 1, i + 1)),
    onEnter: () => {
      if (selectedIndex === 2) {
        exit();
      }
    },
    onEscape: () => exit(),
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="green">TUI Renderer Examples</Text>
      </Box>
      <Box marginBottom={1}>
        <Text dimColor>Use ↑/↓ to navigate, Enter to select, ESC to exit</Text>
      </Box>
      <Box flexDirection="column">
        {menuItems.map((item, index) => (
          <Box key={item} marginY={0}>
            <Text color={index === selectedIndex ? 'cyan' : 'white'}>
              {index === selectedIndex ? '▶ ' : '  '}
              {item}
            </Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// Main app launcher
async function main() {
  const args = process.argv.slice(2);
  const example = args[0] || 'menu';

  let component: React.ReactElement;
  let options = { exitOnCtrlC: true, exitOnEscape: false };

  switch (example) {
    case 'navigation':
      component = <NavigationExample />;
      break;
    case 'focusable':
      component = <FocusableExample />;
      break;
    case 'menu':
    default:
      component = <MenuExample />;
      break;
  }

  // Method 1: Using TuiRenderer directly
  const renderer = new TuiRenderer(options);
  const { waitUntilExit, cleanup } = await renderer.render(component);

  try {
    await waitUntilExit();
  } finally {
    cleanup();
  }

  // Method 2: Using createTuiApp utility (alternative)
  // const app = createTuiApp(component, options);
  // await app();
}

// Run the example
if (import.meta.main) {
  main().catch(console.error);
}