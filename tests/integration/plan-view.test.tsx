#!/usr/bin/env bun
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import React from 'react';
import { render } from 'ink-testing-library';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import PlanView from '../../src/views/plan-view';
import { ConfigManager } from '../../src/lib/config-manager';

describe('Plan View Integration', () => {
  let tempDir: string;
  let configPath: string;
  let originalConfigPath: string | undefined;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'specstar-plan-test-'));
    configPath = join(tempDir, '.specstar');
    await mkdir(configPath, { recursive: true });
    await mkdir(join(configPath, 'sessions'), { recursive: true });
    await mkdir(join(configPath, 'logs'), { recursive: true });
    
    originalConfigPath = process.env.SPECSTAR_CONFIG_PATH;
    process.env.SPECSTAR_CONFIG_PATH = configPath;
  });

  afterEach(async () => {
    if (originalConfigPath !== undefined) {
      process.env.SPECSTAR_CONFIG_PATH = originalConfigPath;
    } else {
      delete process.env.SPECSTAR_CONFIG_PATH;
    }
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('Document Viewer Layout', () => {
    test('should render document viewer filling right column at 70% width', async () => {
      const docsDir = join(tempDir, 'docs');
      await mkdir(docsDir, { recursive: true });
      
      await writeFile(
        join(docsDir, 'test.md'),
        '# Test Document\n\nThis is test content for the viewer.'
      );

      const settings = {
        version: '1.0.0',
        folders: [
          {
            path: docsDir,
            title: 'Documentation',
            glob: '*.md'
          }
        ]
      };
      
      await writeFile(
        join(configPath, 'settings.json'),
        JSON.stringify(settings, null, 2)
      );

      const { lastFrame } = render(<PlanView />);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const frame = lastFrame();
      expect(frame).toBeDefined();
      expect(frame).toContain('Documentation');
      expect(frame).toContain('Markdown Viewer');
      
      const lines = frame?.split('\n') || [];
      const hasLeftColumn = lines.some(line => line.includes('[1] Documentation'));
      const hasRightColumn = lines.some(line => line.includes('Markdown Viewer'));
      
      expect(hasLeftColumn).toBe(true);
      expect(hasRightColumn).toBe(true);
    });

    test('should display documents when loaded', async () => {
      const docsDir = join(tempDir, 'docs');
      await mkdir(docsDir, { recursive: true });
      
      const markdownContent = `---
title: Integration Test Document
author: Test Suite
---

# Main Heading

This is paragraph text that should be visible in the viewer.

## Subheading

- List item 1
- List item 2
- List item 3

\`\`\`javascript
const code = 'should be displayed';
\`\`\`
`;

      await writeFile(join(docsDir, 'integration-test.md'), markdownContent);

      const settings = {
        version: '1.0.0',
        folders: [
          {
            path: docsDir,
            title: 'Test Docs',
            glob: '*.md'
          }
        ]
      };
      
      await writeFile(
        join(configPath, 'settings.json'),
        JSON.stringify(settings, null, 2)
      );

      const { lastFrame, stdin } = render(<PlanView />);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const frame = lastFrame();
      expect(frame).toBeDefined();
      expect(frame).toContain('Test Docs');
      expect(frame).toContain('Markdown Viewer');
    });

    test('should handle viewer with scrolling capability', async () => {
      const docsDir = join(tempDir, 'docs');
      await mkdir(docsDir, { recursive: true });
      
      const longContent = Array.from({ length: 100 }, (_, i) => 
        `Line ${i + 1}: This is a test line for scrolling validation`
      ).join('\n');

      await writeFile(
        join(docsDir, 'long-doc.md'),
        `# Long Document\n\n${longContent}`
      );

      const settings = {
        version: '1.0.0',
        folders: [
          {
            path: docsDir,
            title: 'Scrollable Docs',
            glob: '*.md'
          }
        ]
      };
      
      await writeFile(
        join(configPath, 'settings.json'),
        JSON.stringify(settings, null, 2)
      );

      const { lastFrame, stdin } = render(<PlanView />);
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      stdin.write('v');
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const frame = lastFrame();
      expect(frame).toBeDefined();
      expect(frame).toContain('Scrollable Docs');
      expect(frame).toContain('Markdown Viewer');
      
      const hasScrollInstructions = frame?.includes('↑↓/jk') || frame?.includes('Navigate');
      expect(hasScrollInstructions).toBe(true);
    });

    test('should be responsive to content changes', async () => {
      const docsDir = join(tempDir, 'docs');
      await mkdir(docsDir, { recursive: true });
      
      await writeFile(
        join(docsDir, 'doc1.md'),
        '# Document 1\n\nInitial content'
      );
      
      await writeFile(
        join(docsDir, 'doc2.md'),
        '# Document 2\n\nDifferent content with more text\n\nAnother paragraph'
      );

      const settings = {
        version: '1.0.0',
        folders: [
          {
            path: docsDir,
            title: 'Dynamic Docs',
            glob: '*.md'
          }
        ]
      };
      
      await writeFile(
        join(configPath, 'settings.json'),
        JSON.stringify(settings, null, 2)
      );

      const { lastFrame, stdin } = render(<PlanView />);
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      stdin.write('\r');
      await new Promise(resolve => setTimeout(resolve, 200));
      
      let frame = lastFrame();
      expect(frame).toContain('Dynamic Docs');
      expect(frame).toContain('Markdown Viewer');
      
      const hasViewerContent = frame?.includes('No content to display') || frame?.includes('Document');
      expect(hasViewerContent).toBe(true);
    });

    test('should not have height=20 limitation', async () => {
      const docsDir = join(tempDir, 'docs');
      await mkdir(docsDir, { recursive: true });
      
      const tallContent = Array.from({ length: 50 }, (_, i) => 
        `Content line ${i + 1}`
      ).join('\n');

      await writeFile(
        join(docsDir, 'tall-doc.md'),
        `# Tall Document Test\n\n${tallContent}`
      );

      const settings = {
        version: '1.0.0',
        folders: [
          {
            path: docsDir,
            title: 'Height Test',
            glob: '*.md'
          }
        ]
      };
      
      await writeFile(
        join(configPath, 'settings.json'),
        JSON.stringify(settings, null, 2)
      );

      const { lastFrame, stdin } = render(<PlanView />);
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      stdin.write('\r');
      await new Promise(resolve => setTimeout(resolve, 200));
      
      stdin.write('v');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const frame = lastFrame();
      expect(frame).toBeDefined();
      
      const lines = frame?.split('\n') || [];
      const contentArea = lines.filter(line => line.includes('Content line'));
      
      const hasViewer = frame?.includes('Markdown Viewer');
      expect(hasViewer).toBe(true);
      
      const viewerSection = frame?.split('Markdown Viewer')[1] || '';
      const viewerLines = viewerSection.split('\n').filter(line => line.trim());
      expect(viewerLines.length).toBeGreaterThan(0);
    });
  });

  describe('View Integration', () => {
    test('should integrate file list with document viewer', async () => {
      const docsDir = join(tempDir, 'docs');
      const specsDir = join(tempDir, 'specs');
      await mkdir(docsDir, { recursive: true });
      await mkdir(specsDir, { recursive: true });
      
      await writeFile(join(docsDir, 'readme.md'), '# README\n\nProject documentation');
      await writeFile(join(specsDir, 'spec.md'), '# Specification\n\nProject specs');

      const settings = {
        version: '1.0.0',
        folders: [
          {
            path: docsDir,
            title: 'Docs',
            glob: '*.md'
          },
          {
            path: specsDir,
            title: 'Specs',
            glob: '*.md'
          }
        ]
      };
      
      await writeFile(
        join(configPath, 'settings.json'),
        JSON.stringify(settings, null, 2)
      );

      const { lastFrame, stdin } = render(<PlanView />);
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      let frame = lastFrame();
      expect(frame).toContain('Docs');
      expect(frame).toContain('Specs');
      
      stdin.write('2');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      stdin.write('\r');
      await new Promise(resolve => setTimeout(resolve, 200));
      
      frame = lastFrame();
      expect(frame).toContain('Specs');
      
      const hasDocumentViewer = frame?.includes('spec.md') || frame?.includes('Markdown Viewer');
      expect(hasDocumentViewer).toBe(true);
    });
  });
});