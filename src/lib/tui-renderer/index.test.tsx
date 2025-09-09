import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import React from 'react';
import { render } from 'ink-testing-library';
import { Box, Text } from 'ink';
import {
  TuiRenderer,
  useFullscreen,
  useFocus,
  useNavigation,
  useTerminalSize,
  FocusableBox,
  createTuiApp,
} from './index';

describe('TuiRenderer', () => {
  let renderer: TuiRenderer;

  beforeEach(() => {
    renderer = new TuiRenderer();
  });

  afterEach(() => {
    renderer.cleanup();
  });

  test('should create instance with default options', () => {
    expect(renderer).toBeInstanceOf(TuiRenderer);
  });

  test('should create instance with custom options', () => {
    const customRenderer = new TuiRenderer({
      fullscreen: true,
      exitOnCtrlC: false,
      exitOnEscape: true,
      clearOnExit: false,
    });
    expect(customRenderer).toBeInstanceOf(TuiRenderer);
  });
});

describe('useFullscreen hook', () => {
  test('should provide fullscreen controls', () => {
    const TestComponent = () => {
      const { isFullscreen, enterFullscreen, exitFullscreen } = useFullscreen();
      
      return (
        <Box>
          <Text>{isFullscreen ? 'Fullscreen' : 'Normal'}</Text>
        </Box>
      );
    };

    const { lastFrame } = render(<TestComponent />);
    expect(lastFrame()).toContain('Normal');
  });
});

describe('useFocus hook', () => {
  test('should manage focus state', () => {
    const TestComponent = () => {
      const { isFocused, focusSelf } = useFocus('test-id');
      
      return (
        <Box>
          <Text>{isFocused ? 'Focused' : 'Not Focused'}</Text>
        </Box>
      );
    };

    const { lastFrame } = render(<TestComponent />);
    expect(lastFrame()).toContain('Not Focused');
  });
});

describe('useNavigation hook', () => {
  test('should handle navigation callbacks', () => {
    let upPressed = false;
    let enterPressed = false;

    const TestComponent = () => {
      useNavigation({
        onUp: () => { upPressed = true; },
        onEnter: () => { enterPressed = true; },
      });
      
      return <Text>Navigation Test</Text>;
    };

    const { lastFrame } = render(<TestComponent />);
    expect(lastFrame()).toContain('Navigation Test');
  });
});

describe('useTerminalSize hook', () => {
  test('should return terminal dimensions', () => {
    const TestComponent = () => {
      const { columns, rows } = useTerminalSize();
      
      return (
        <Box>
          <Text>{`Size: ${columns}x${rows}`}</Text>
        </Box>
      );
    };

    const { lastFrame } = render(<TestComponent />);
    expect(lastFrame()).toMatch(/Size: \d+x\d+/);
  });
});

describe('FocusableBox component', () => {
  test('should render with default props', () => {
    const { lastFrame } = render(
      <FocusableBox id="test-box">
        <Text>Content</Text>
      </FocusableBox>
    );
    
    expect(lastFrame()).toContain('Content');
  });

  test('should render with custom border styles', () => {
    const { lastFrame } = render(
      <FocusableBox 
        id="test-box"
        borderStyle="double"
        borderColor="red"
        focusBorderColor="green"
      >
        <Text>Custom Border</Text>
      </FocusableBox>
    );
    
    expect(lastFrame()).toContain('Custom Border');
  });
});

describe('createTuiApp utility', () => {
  test('should create an app launcher function', () => {
    const TestApp = () => <Text>Test App</Text>;
    const launcher = createTuiApp(<TestApp />);
    
    expect(launcher).toBeInstanceOf(Function);
  });

  test('should accept custom options', () => {
    const TestApp = () => <Text>Test App</Text>;
    const launcher = createTuiApp(<TestApp />, {
      fullscreen: true,
      exitOnEscape: true,
    });
    
    expect(launcher).toBeInstanceOf(Function);
  });
});