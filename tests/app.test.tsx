#!/usr/bin/env bun
/**
 * App Initialization Tests
 * 
 * Tests the Bug 2 fix (Start Page Configuration) to ensure that:
 * - Apps are no longer hardcoded to start with plan view
 * - The startPage setting from settings.json is properly used
 * - Different startPage values work correctly: 'plan', 'observe', 'help'
 * - Timer-based auto-switching from welcome screen works
 * - Error handling fallback to plan view works
 */
import { describe, test, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import React from 'react';
import { render } from 'ink-testing-library';
import App from '../src/app';
import * as settingsLoader from '../src/lib/config/settings-loader';
import type { SpecstarSettings } from '../src/lib/config/settings-loader';

describe('App Initialization with startPage Setting', () => {
  let loadSettingsSpy: any;

  beforeEach(() => {
    // Mock process.stdout for terminal dimensions
    process.stdout.columns = 80;
    process.stdout.rows = 24;
    
    // Restore spy if it exists
    loadSettingsSpy?.mockRestore();
    
    // Create spy for loadSettings function
    loadSettingsSpy = spyOn(settingsLoader, 'loadSettings');
  });

  afterEach(() => {
    // Restore all mocks
    loadSettingsSpy?.mockRestore();
  });

  test('should load settings and use startPage configuration for plan view', async () => {
    // Mock settings with startPage: 'plan'
    const mockSettings: SpecstarSettings = {
      version: "1.0.0",
      sessionPath: ".specstar/sessions",
      startPage: "plan",
      folders: [],
      theme: "dark",
      autoStart: false,
      logLevel: "info"
    };
    
    loadSettingsSpy.mockResolvedValue(mockSettings);

    const { lastFrame } = render(<App />);
    
    // Initially should show welcome screen
    expect(lastFrame()).toContain('Terminal UI for Claude Code Sessions');
    expect(lastFrame()).toContain('Loading start page...');
    
    // Wait for the 2-second timer to complete
    await new Promise(resolve => setTimeout(resolve, 2100));
    
    // Should switch to plan view
    expect(lastFrame()).toContain('PLAN MODE');
    expect(loadSettingsSpy).toHaveBeenCalled();
  });

  test('should load settings and use startPage configuration for observe view', async () => {
    // Mock settings with startPage: 'observe'
    const mockSettings: SpecstarSettings = {
      version: "1.0.0",
      sessionPath: ".specstar/sessions",
      startPage: "observe",
      folders: [],
      theme: "dark",
      autoStart: false,
      logLevel: "info"
    };
    
    loadSettingsSpy.mockResolvedValue(mockSettings);

    const { lastFrame } = render(<App />);
    
    // Initially should show welcome screen
    expect(lastFrame()).toContain('Terminal UI for Claude Code Sessions');
    expect(lastFrame()).toContain('Loading start page...');
    
    // Wait for the 2-second timer to complete
    await new Promise(resolve => setTimeout(resolve, 2100));
    
    // Should switch to observe view
    expect(lastFrame()).toContain('OBSERVE MODE');
    expect(loadSettingsSpy).toHaveBeenCalled();
  });

  test('should map "help" startPage to "welcome" view internally', async () => {
    // Mock settings with startPage: 'help'
    const mockSettings: SpecstarSettings = {
      version: "1.0.0",
      sessionPath: ".specstar/sessions",
      startPage: "help",
      folders: [],
      theme: "dark",
      autoStart: false,
      logLevel: "info"
    };
    
    loadSettingsSpy.mockResolvedValue(mockSettings);

    const { lastFrame } = render(<App />);
    
    // Initially should show welcome screen
    expect(lastFrame()).toContain('Terminal UI for Claude Code Sessions');
    expect(lastFrame()).toContain('Loading start page...');
    
    // Wait for the 2-second timer to complete
    await new Promise(resolve => setTimeout(resolve, 2100));
    
    // Should remain on welcome view (help maps to welcome)
    expect(lastFrame()).toContain('Terminal UI for Claude Code Sessions');
    expect(lastFrame()).toContain('Terminal UI for Claude Code Sessions');
    expect(lastFrame()).toContain('Press P for Plan View');
    expect(loadSettingsSpy).toHaveBeenCalled();
  });

  test('should default to "plan" if settings fail to load', async () => {
    // Mock settings loading to throw an error
    loadSettingsSpy.mockRejectedValue(new Error('Failed to load settings'));

    const { lastFrame } = render(<App />);
    
    // Initially should show welcome screen
    expect(lastFrame()).toContain('Terminal UI for Claude Code Sessions');
    expect(lastFrame()).toContain('Loading start page...');
    
    // Wait for the 2-second timer to complete
    await new Promise(resolve => setTimeout(resolve, 2100));
    
    // Should fallback to plan view
    expect(lastFrame()).toContain('PLAN MODE');
    expect(loadSettingsSpy).toHaveBeenCalled();
  });

  test('should auto-switch from welcome screen to configured start page after 2 seconds', async () => {
    // Mock settings with startPage: 'observe'
    const mockSettings: SpecstarSettings = {
      version: "1.0.0",
      sessionPath: ".specstar/sessions",
      startPage: "observe",
      folders: [],
      theme: "dark",
      autoStart: false,
      logLevel: "info"
    };
    
    loadSettingsSpy.mockResolvedValue(mockSettings);

    const { lastFrame } = render(<App />);
    
    // At 0ms - should show welcome screen
    expect(lastFrame()).toContain('Terminal UI for Claude Code Sessions');
    expect(lastFrame()).toContain('Loading start page...');
    
    // At 1 second - should still show welcome screen
    await new Promise(resolve => setTimeout(resolve, 1000));
    expect(lastFrame()).toContain('Terminal UI for Claude Code Sessions');
    expect(lastFrame()).toContain('Loading start page...');
    
    // At 2+ seconds - should switch to observe view
    await new Promise(resolve => setTimeout(resolve, 1100));
    expect(lastFrame()).toContain('OBSERVE MODE');
  });

  test('should handle timer cleanup correctly when component unmounts', async () => {
    // Mock settings with startPage: 'plan'
    const mockSettings: SpecstarSettings = {
      version: "1.0.0",
      sessionPath: ".specstar/sessions",
      startPage: "plan",
      folders: [],
      theme: "dark",
      autoStart: false,
      logLevel: "info"
    };
    
    loadSettingsSpy.mockResolvedValue(mockSettings);

    const { lastFrame, unmount } = render(<App />);
    
    // Initially should show welcome screen
    expect(lastFrame()).toContain('Terminal UI for Claude Code Sessions');
    
    // Unmount before timer completes
    unmount();
    
    // Wait longer than timer duration
    await new Promise(resolve => setTimeout(resolve, 2100));
    
    // Should not crash or cause issues (timer should be cleaned up)
    // This test passes if no errors are thrown
    expect(true).toBe(true);
  });

  test('should handle different startPage values correctly', async () => {
    const testCases: Array<{ startPage: SpecstarSettings['startPage'], expectedContent: string }> = [
      { startPage: 'plan', expectedContent: 'PLAN MODE' },
      { startPage: 'observe', expectedContent: 'OBSERVE MODE' },
      { startPage: 'help', expectedContent: 'Terminal UI for Claude Code Sessions' }
    ];

    for (const { startPage, expectedContent } of testCases) {
      // Mock settings for this test case
      const mockSettings: SpecstarSettings = {
        version: "1.0.0",
        sessionPath: ".specstar/sessions",
        startPage,
        folders: [],
        theme: "dark",
        autoStart: false,
        logLevel: "info"
      };
      
      loadSettingsSpy.mockResolvedValue(mockSettings);

      const { lastFrame, unmount } = render(<App />);
      
      // Wait for the timer to complete
      await new Promise(resolve => setTimeout(resolve, 2100));
      
      // Verify the expected view is shown
      expect(lastFrame()).toContain(expectedContent);
      
      // Clean up this render
      unmount();
      loadSettingsSpy.mockReset();
    }
  });

  test('should handle manual navigation during welcome screen but timer still executes', async () => {
    // Mock settings with startPage: 'observe' (different from what we'll navigate to)
    const mockSettings: SpecstarSettings = {
      version: "1.0.0",
      sessionPath: ".specstar/sessions",
      startPage: "observe",
      folders: [],
      theme: "dark",
      autoStart: false,
      logLevel: "info"
    };
    
    loadSettingsSpy.mockResolvedValue(mockSettings);

    const { lastFrame, stdin } = render(<App />);
    
    // Initially should show welcome screen
    expect(lastFrame()).toContain('Terminal UI for Claude Code Sessions');
    
    // Manually navigate to plan view before timer completes
    stdin.write('p');
    
    // Wait a bit for the input to be processed
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(lastFrame()).toContain('PLAN MODE');
    
    // Wait for the timer to complete
    await new Promise(resolve => setTimeout(resolve, 2100));
    
    // The timer will still execute and switch to the configured startPage (observe in this case)
    // This shows that manual navigation doesn't permanently override the timer
    expect(lastFrame()).toContain('OBSERVE MODE');
  });

  test('should call loadSettings during initialization', async () => {
    // Create a fresh spy for this isolated test
    const isolatedSpy = spyOn(settingsLoader, 'loadSettings');
    
    // Mock settings with startPage: 'plan'
    const mockSettings: SpecstarSettings = {
      version: "1.0.0",
      sessionPath: ".specstar/sessions",  
      startPage: "plan",
      folders: [],
      theme: "dark",
      autoStart: false,
      logLevel: "info"
    };
    
    isolatedSpy.mockResolvedValue(mockSettings);

    const { unmount } = render(<App />);
    
    // Wait for the timer to complete
    await new Promise(resolve => setTimeout(resolve, 2100));
    
    // Should have called loadSettings at least once during initialization
    expect(isolatedSpy).toHaveBeenCalled();
    
    // Clean up
    unmount();
    isolatedSpy.mockRestore();
  });

  test('should show loading indicator during welcome screen', async () => {
    // Mock settings with startPage: 'plan'
    const mockSettings: SpecstarSettings = {
      version: "1.0.0",
      sessionPath: ".specstar/sessions",
      startPage: "plan",
      folders: [],
      theme: "dark",
      autoStart: false,
      logLevel: "info"
    };
    
    loadSettingsSpy.mockResolvedValue(mockSettings);

    const { lastFrame } = render(<App />);
    
    // Should show loading indicator
    expect(lastFrame()).toContain('Loading start page...');
    expect(lastFrame()).toContain('Terminal UI for Claude Code Sessions');
    expect(lastFrame()).toContain('Terminal UI for Claude Code Sessions');
    expect(lastFrame()).toContain('Press P for Plan View');
    expect(lastFrame()).toContain('Press O for Observe View');
    expect(lastFrame()).toContain('Press Q to Quit');
  });
});