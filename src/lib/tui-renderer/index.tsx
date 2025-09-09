import React, { useEffect, useRef, useCallback, useState } from 'react';
import { render as inkRender, type Instance, Box, useInput, useFocusManager, useApp } from 'ink';
import { withFullScreen } from 'fullscreen-ink';

export interface TuiRendererOptions {
  fullscreen?: boolean;
  exitOnCtrlC?: boolean;
  exitOnEscape?: boolean;
  clearOnExit?: boolean;
}

export interface RenderResult {
  instance: Instance;
  cleanup: () => void;
  waitUntilExit: () => Promise<void>;
}

/**
 * Main TuiRenderer class for managing terminal UI rendering
 */
export class TuiRenderer {
  private options: TuiRendererOptions;
  private instance: Instance | null = null;
  private fullscreenInstance: any = null;

  constructor(options: TuiRendererOptions = {}) {
    this.options = {
      fullscreen: false,
      exitOnCtrlC: true,
      exitOnEscape: false,
      clearOnExit: true,
      ...options,
    };
  }

  /**
   * Render a React component to the terminal
   */
  async render(component: React.ReactElement): Promise<RenderResult> {
    if (this.options.fullscreen) {
      // Use fullscreen-ink for fullscreen mode
      const FullscreenApp = withFullScreen(component);
      this.fullscreenInstance = FullscreenApp;
      await this.fullscreenInstance.start();
      
      return {
        instance: this.fullscreenInstance,
        cleanup: () => this.cleanup(),
        waitUntilExit: () => this.fullscreenInstance.waitUntilExit(),
      };
    } else {
      // Use regular ink render
      this.instance = inkRender(component);
      
      return {
        instance: this.instance,
        cleanup: () => this.cleanup(),
        waitUntilExit: () => this.instance!.waitUntilExit(),
      };
    }
  }

  /**
   * Cleanup and restore terminal
   */
  cleanup(): void {
    if (this.fullscreenInstance) {
      // Fullscreen cleanup is handled by fullscreen-ink
      this.fullscreenInstance = null;
    } else if (this.instance) {
      this.instance.unmount();
      if (this.options.clearOnExit) {
        this.instance.clear();
      }
      this.instance = null;
    }
  }
}

/**
 * Hook for managing fullscreen mode within components
 */
export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { exit } = useApp();

  const enterFullscreen = useCallback(() => {
    setIsFullscreen(true);
    // Hide cursor and clear screen
    process.stdout.write('\x1B[?25l'); // Hide cursor
    process.stdout.write('\x1B[2J\x1B[H'); // Clear screen and move to top
  }, []);

  const exitFullscreen = useCallback(() => {
    setIsFullscreen(false);
    // Show cursor
    process.stdout.write('\x1B[?25h');
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (isFullscreen) {
        process.stdout.write('\x1B[?25h'); // Show cursor
      }
    };
  }, [isFullscreen]);

  return {
    isFullscreen,
    enterFullscreen,
    exitFullscreen,
  };
}

/**
 * Enhanced focus management hook
 */
export function useFocus(id?: string) {
  const { focus, focusNext, focusPrevious } = useFocusManager();
  const [isFocused, setIsFocused] = useState(false);
  const focusRef = useRef<string | undefined>(id);

  useEffect(() => {
    if (id) {
      focusRef.current = id;
    }
  }, [id]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const focusSelf = useCallback(() => {
    if (focusRef.current) {
      focus(focusRef.current);
    }
  }, [focus]);

  return {
    isFocused,
    focusSelf,
    focusNext,
    focusPrevious,
    onFocus: handleFocus,
    onBlur: handleBlur,
  };
}

/**
 * Navigation utilities for keyboard handling
 */
export interface NavigationOptions {
  onUp?: () => void;
  onDown?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
  onEnter?: () => void;
  onEscape?: () => void;
  onTab?: () => void;
  onShiftTab?: () => void;
  onPageUp?: () => void;
  onPageDown?: () => void;
  onHome?: () => void;
  onEnd?: () => void;
  enabled?: boolean;
}

export function useNavigation(options: NavigationOptions = {}) {
  const { enabled = true } = options;
  const { focusNext, focusPrevious } = useFocusManager();

  useInput((input, key) => {
    if (!enabled) return;

    // Arrow keys
    if (key.upArrow && options.onUp) {
      options.onUp();
    } else if (key.downArrow && options.onDown) {
      options.onDown();
    } else if (key.leftArrow && options.onLeft) {
      options.onLeft();
    } else if (key.rightArrow && options.onRight) {
      options.onRight();
    }

    // Enter and Escape
    if (key.return && options.onEnter) {
      options.onEnter();
    }
    if (key.escape && options.onEscape) {
      options.onEscape();
    }

    // Tab navigation
    if (key.tab) {
      if (key.shift) {
        if (options.onShiftTab) {
          options.onShiftTab();
        } else {
          focusPrevious();
        }
      } else {
        if (options.onTab) {
          options.onTab();
        } else {
          focusNext();
        }
      }
    }

    // Page navigation
    if (key.pageUp && options.onPageUp) {
      options.onPageUp();
    }
    if (key.pageDown && options.onPageDown) {
      options.onPageDown();
    }

    // Home/End keys
    if (input === '\x1B[H' && options.onHome) {
      options.onHome();
    }
    if (input === '\x1B[F' && options.onEnd) {
      options.onEnd();
    }
  });
}

/**
 * Hook for handling terminal resize events
 */
export function useTerminalSize() {
  const [size, setSize] = useState({
    columns: process.stdout.columns || 80,
    rows: process.stdout.rows || 24,
  });

  useEffect(() => {
    const handleResize = () => {
      setSize({
        columns: process.stdout.columns || 80,
        rows: process.stdout.rows || 24,
      });
    };

    process.stdout.on('resize', handleResize);
    return () => {
      process.stdout.off('resize', handleResize);
    };
  }, []);

  return size;
}

/**
 * Utility component for creating focusable containers
 */
export interface FocusableBoxProps {
  id: string;
  children: React.ReactNode;
  onFocus?: () => void;
  onBlur?: () => void;
  borderStyle?: 'single' | 'double' | 'round' | 'bold' | 'singleDouble' | 'doubleSingle' | 'classic';
  borderColor?: string;
  focusBorderColor?: string;
  [key: string]: any;
}

export function FocusableBox({
  id,
  children,
  onFocus,
  onBlur,
  borderStyle = 'single',
  borderColor = 'gray',
  focusBorderColor = 'cyan',
  ...props
}: FocusableBoxProps) {
  const { isFocused, onFocus: handleFocus, onBlur: handleBlur } = useFocus(id);

  useEffect(() => {
    if (isFocused) {
      handleFocus();
      onFocus?.();
    } else {
      handleBlur();
      onBlur?.();
    }
  }, [isFocused, handleFocus, handleBlur, onFocus, onBlur]);

  return React.createElement(
    Box,
    {
      borderStyle,
      borderColor: isFocused ? focusBorderColor : borderColor,
      ...props
    },
    children
  );
}

/**
 * Utility function to create a simple TUI app
 */
export function createTuiApp(
  component: React.ReactElement,
  options?: TuiRendererOptions
): () => Promise<void> {
  return async () => {
    const renderer = new TuiRenderer(options);
    const { waitUntilExit, cleanup } = await renderer.render(component);

    try {
      await waitUntilExit();
    } finally {
      cleanup();
    }
  };
}

// Export default instance for convenience
const defaultRenderer = new TuiRenderer();
export default defaultRenderer;

// Re-export useful types from ink
export type { Instance } from 'ink';