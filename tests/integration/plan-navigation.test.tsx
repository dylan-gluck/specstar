#!/usr/bin/env bun
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import React from 'react';
import { render } from 'ink-testing-library';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import App from '../../src/app';
import PlanView from '../../src/views/plan-view';

describe('Plan View Navigation', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create temporary directory with test documents
    tempDir = await mkdtemp(join(tmpdir(), 'specstar-nav-test-'));
    
    // Create test planning documents
    const specsDir = join(tempDir, 'specs');
    await Bun.write(join(specsDir, 'overview.md'), '# Project Overview\n\nTest content for overview.');
    await Bun.write(join(specsDir, 'architecture.md'), '# Architecture\n\n## Components\n- Component A\n- Component B');
    await Bun.write(join(specsDir, 'roadmap.md'), '# Roadmap\n\n1. Phase 1\n2. Phase 2\n3. Phase 3');
    await Bun.write(join(specsDir, 'requirements.md'), '# Requirements\n\n## Functional\n## Non-functional');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test('should render Plan view with document list', () => {
    const { lastFrame } = render(<PlanView />);
    
    // Verify document list is rendered
    expect(lastFrame()).toContain('Documents');
    expect(lastFrame()).toContain('overview.md');
    expect(lastFrame()).toContain('architecture.md');
    expect(lastFrame()).toContain('roadmap.md');
    expect(lastFrame()).toContain('requirements.md');
  });

  test('should navigate between documents with arrow keys', () => {
    const { lastFrame, stdin } = render(<PlanView />);
    
    // Initial state - first document selected
    expect(lastFrame()).toContain('▶ overview.md');
    
    // Press down arrow
    stdin.write('\x1B[B'); // Down arrow
    expect(lastFrame()).toContain('▶ architecture.md');
    
    // Press down arrow again
    stdin.write('\x1B[B');
    expect(lastFrame()).toContain('▶ roadmap.md');
    
    // Press up arrow
    stdin.write('\x1B[A'); // Up arrow
    expect(lastFrame()).toContain('▶ architecture.md');
  });

  test('should wrap navigation at boundaries', () => {
    const { lastFrame, stdin } = render(<PlanView />);
    
    // Navigate to last document
    stdin.write('\x1B[B'); // Down
    stdin.write('\x1B[B'); // Down
    stdin.write('\x1B[B'); // Down
    expect(lastFrame()).toContain('▶ requirements.md');
    
    // Press down again - should wrap to first
    stdin.write('\x1B[B');
    expect(lastFrame()).toContain('▶ overview.md');
    
    // Press up - should wrap to last
    stdin.write('\x1B[A');
    expect(lastFrame()).toContain('▶ requirements.md');
  });

  test('should load document content on Enter key', async () => {
    const { lastFrame, stdin } = render(<PlanView />);
    
    // Select architecture.md
    stdin.write('\x1B[B'); // Down arrow
    expect(lastFrame()).toContain('▶ architecture.md');
    
    // Press Enter to load document
    stdin.write('\r'); // Enter key
    
    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify document content is displayed
    expect(lastFrame()).toContain('Architecture');
    expect(lastFrame()).toContain('Components');
    expect(lastFrame()).toContain('Component A');
  });

  test('should support vim-style navigation (j/k)', () => {
    const { lastFrame, stdin } = render(<PlanView />);
    
    // Press 'j' to move down
    stdin.write('j');
    expect(lastFrame()).toContain('▶ architecture.md');
    
    // Press 'j' again
    stdin.write('j');
    expect(lastFrame()).toContain('▶ roadmap.md');
    
    // Press 'k' to move up
    stdin.write('k');
    expect(lastFrame()).toContain('▶ architecture.md');
  });

  test('should scroll document content with Page Up/Down', async () => {
    const { lastFrame, stdin } = render(<PlanView />);
    
    // Create a long document
    const longContent = Array.from({ length: 100 }, (_, i) => `Line ${i + 1}`).join('\n');
    await Bun.write(join(tempDir, 'specs', 'long.md'), `# Long Document\n\n${longContent}`);
    
    // Navigate to long document
    stdin.write('\x1B[B'); // Down to navigate to long.md
    stdin.write('\x1B[B');
    stdin.write('\x1B[B');
    stdin.write('\x1B[B');
    stdin.write('\r'); // Enter to load
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Press Page Down
    stdin.write('\x1B[6~'); // Page Down
    expect(lastFrame()).not.toContain('Line 1');
    expect(lastFrame()).toContain('Line 30'); // Assuming ~30 lines per page
    
    // Press Page Up
    stdin.write('\x1B[5~'); // Page Up
    expect(lastFrame()).toContain('Line 1');
  });

  test('should search within documents with /', () => {
    const { lastFrame, stdin } = render(<PlanView />);
    
    // Load a document
    stdin.write('\x1B[B'); // Select architecture.md
    stdin.write('\r'); // Enter
    
    // Initiate search
    stdin.write('/');
    expect(lastFrame()).toContain('Search:');
    
    // Type search term
    stdin.write('Component');
    stdin.write('\r'); // Enter to search
    
    // Verify search results are highlighted
    expect(lastFrame()).toContain('Component'); // Should highlight matches
  });

  test('should switch focus between panes with Tab', () => {
    const { lastFrame, stdin } = render(<PlanView />);
    
    // Initial focus on document list
    expect(lastFrame()).toContain('▶ overview.md');
    
    // Load a document
    stdin.write('\r');
    
    // Press Tab to switch focus to content pane
    stdin.write('\t');
    
    // Verify focus indicator changed
    const frame = lastFrame();
    expect(frame).toContain('[Content]'); // Focus indicator
    
    // Press Tab again to return to document list
    stdin.write('\t');
    expect(lastFrame()).toContain('[Documents]'); // Focus indicator
  });

  test('should handle keyboard shortcuts for common actions', () => {
    const { lastFrame, stdin, rerender } = render(<PlanView />);
    
    // Press 'r' to refresh document list
    stdin.write('r');
    expect(lastFrame()).toContain('Refreshing...');
    
    // Press 'q' to return to main menu
    stdin.write('q');
    expect(lastFrame()).toContain('Main Menu'); // Should exit to main menu
    
    // Press '?' for help
    rerender(<PlanView />);
    stdin.write('?');
    expect(lastFrame()).toContain('Keyboard Shortcuts');
    expect(lastFrame()).toContain('↑/↓ or j/k - Navigate');
    expect(lastFrame()).toContain('Enter - Open document');
  });

  test('should maintain scroll position when switching documents', async () => {
    const { lastFrame, stdin } = render(<PlanView />);
    
    // Load first document and scroll down
    stdin.write('\r'); // Load overview.md
    await new Promise(resolve => setTimeout(resolve, 100));
    stdin.write('\x1B[6~'); // Page Down
    
    const scrolledPosition = lastFrame();
    
    // Switch to another document
    stdin.write('\t'); // Focus document list
    stdin.write('j'); // Select next document
    stdin.write('\r'); // Load it
    
    // Switch back to first document
    stdin.write('\t'); // Focus document list
    stdin.write('k'); // Select previous document
    stdin.write('\r'); // Load it
    
    // Verify scroll position was maintained
    expect(lastFrame()).toBe(scrolledPosition ?? '');
  });

  test('should handle rapid navigation without errors', () => {
    const { lastFrame, stdin } = render(<PlanView />);
    
    // Rapidly press navigation keys
    for (let i = 0; i < 20; i++) {
      stdin.write('j');
    }
    
    // Should handle gracefully without crashing
    expect(lastFrame()).toBeDefined();
    
    // Rapidly switch between documents
    for (let i = 0; i < 10; i++) {
      stdin.write('\r'); // Enter
      stdin.write('\t'); // Tab
    }
    
    expect(lastFrame()).toBeDefined();
  });
});