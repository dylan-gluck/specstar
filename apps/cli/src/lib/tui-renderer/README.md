# TUI Renderer Library

A comprehensive terminal UI rendering library built on React Ink, providing utilities for building robust TUI applications.

## Features

- **TuiRenderer Class**: Main renderer with fullscreen and cleanup support
- **React Hooks**: Custom hooks for terminal UI development
- **Navigation Utilities**: Keyboard handling and focus management
- **Focusable Components**: Pre-built components with focus states
- **Terminal Utilities**: Size detection and resize handling

## Installation

This library is included with the Specstar project. To use it in your own project:

```bash
bun add ink react
```

## Basic Usage

### Simple Rendering

```tsx
import { TuiRenderer } from './lib/tui-renderer';
import { Text } from 'ink';

const renderer = new TuiRenderer();
const { waitUntilExit, cleanup } = await renderer.render(<Text>Hello TUI!</Text>);

await waitUntilExit();
cleanup();
```

### Using createTuiApp

```tsx
import { createTuiApp } from './lib/tui-renderer';
import App from './app';

const launch = createTuiApp(<App />, {
  fullscreen: true,
  exitOnCtrlC: true,
});

await launch();
```

## API Reference

### TuiRenderer Class

```tsx
const renderer = new TuiRenderer(options?: TuiRendererOptions);
```

**Options:**
- `fullscreen`: Enable fullscreen mode (default: false)
- `exitOnCtrlC`: Exit on Ctrl+C (default: true)
- `exitOnEscape`: Exit on Escape key (default: false)
- `clearOnExit`: Clear terminal on exit (default: true)

**Methods:**
- `render(component)`: Render a React component
- `cleanup()`: Clean up and restore terminal

### Hooks

#### useFullscreen()

Manage fullscreen mode within components.

```tsx
const { isFullscreen, enterFullscreen, exitFullscreen } = useFullscreen();
```

#### useFocus(id?)

Enhanced focus management.

```tsx
const {
  isFocused,
  focusSelf,
  focusNext,
  focusPrevious,
  onFocus,
  onBlur,
} = useFocus('my-component');
```

#### useNavigation(options)

Handle keyboard navigation.

```tsx
useNavigation({
  onUp: () => console.log('Up arrow pressed'),
  onDown: () => console.log('Down arrow pressed'),
  onEnter: () => console.log('Enter pressed'),
  onEscape: () => exit(),
  enabled: true, // Enable/disable navigation
});
```

**Available Callbacks:**
- `onUp`, `onDown`, `onLeft`, `onRight`: Arrow keys
- `onEnter`, `onEscape`: Action keys
- `onTab`, `onShiftTab`: Tab navigation
- `onPageUp`, `onPageDown`: Page navigation
- `onHome`, `onEnd`: Home/End keys

#### useTerminalSize()

Get current terminal dimensions.

```tsx
const { columns, rows } = useTerminalSize();
```

### Components

#### FocusableBox

A container that can receive focus.

```tsx
<FocusableBox
  id="my-box"
  borderStyle="single"
  borderColor="gray"
  focusBorderColor="cyan"
  onFocus={() => console.log('Focused')}
  onBlur={() => console.log('Blurred')}
>
  <Text>Focusable content</Text>
</FocusableBox>
```

**Props:**
- `id`: Unique identifier for focus management
- `borderStyle`: Border style (single, double, round, etc.)
- `borderColor`: Default border color
- `focusBorderColor`: Border color when focused
- `onFocus`: Callback when focused
- `onBlur`: Callback when blurred

## Examples

### Navigation with Arrow Keys

```tsx
function NavigableApp() {
  const [position, setPosition] = useState(0);

  useNavigation({
    onUp: () => setPosition(p => Math.max(0, p - 1)),
    onDown: () => setPosition(p => Math.min(10, p + 1)),
  });

  return <Text>Position: {position}</Text>;
}
```

### Focus Management

```tsx
function FocusableList() {
  return (
    <Box flexDirection="column">
      <FocusableBox id="item1">
        <Text>Item 1</Text>
      </FocusableBox>
      <FocusableBox id="item2">
        <Text>Item 2</Text>
      </FocusableBox>
    </Box>
  );
}
```

### Fullscreen Mode

```tsx
function FullscreenApp() {
  const { enterFullscreen, exitFullscreen, isFullscreen } = useFullscreen();

  return (
    <Box>
      <Text>{isFullscreen ? 'Fullscreen Mode' : 'Normal Mode'}</Text>
    </Box>
  );
}

// Render with fullscreen option
const renderer = new TuiRenderer({ fullscreen: true });
await renderer.render(<FullscreenApp />);
```

## Running Examples

```bash
# Run menu example
bun run src/lib/tui-renderer/example.tsx menu

# Run navigation example
bun run src/lib/tui-renderer/example.tsx navigation

# Run focusable boxes example
bun run src/lib/tui-renderer/example.tsx focusable
```

## Testing

```bash
bun test src/lib/tui-renderer/index.test.tsx
```

## Integration with Specstar

This library is the foundation for Specstar's terminal UI, providing:

- Full-screen terminal rendering
- Focus management for file lists
- Keyboard navigation between views
- Clean terminal restoration on exit

## Best Practices

1. **Always cleanup**: Call `cleanup()` in a finally block
2. **Use unique IDs**: For FocusableBox components
3. **Handle resize**: Use `useTerminalSize()` for responsive layouts
4. **Test navigation**: Ensure all keyboard shortcuts work
5. **Provide escape**: Always include a way to exit the app