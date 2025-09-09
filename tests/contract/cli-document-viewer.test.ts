#!/usr/bin/env bun
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { $ } from 'bun';
import { tmpdir } from 'os';
import { join } from 'path';
import { rm, mkdir } from 'fs/promises';

describe('CLI Contract: document-viewer', () => {
  let tmpDir: string;
  
  beforeAll(async () => {
    // Create temp directory for test documents
    tmpDir = join(tmpdir(), `specstar-test-document-viewer-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
    await mkdir(join(tmpDir, 'docs'), { recursive: true });
  });
  
  afterAll(async () => {
    // Clean up temp directory
    await rm(tmpDir, { recursive: true, force: true });
  });
  
  describe('Direct execution: specstar-document-viewer', () => {
    it('should display help with --help flag', async () => {
      const result = await $`specstar-document-viewer --help`.quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('Markdown document viewing');
      expect(result.stdout.toString()).toContain('Usage:');
      expect(result.stdout.toString()).toContain('Commands:');
      expect(result.stdout.toString()).toContain('view');
      expect(result.stdout.toString()).toContain('render');
      expect(result.stdout.toString()).toContain('search');
      expect(result.stdout.toString()).toContain('toc');
    });
    
    it('should display help with -h flag', async () => {
      const result = await $`specstar-document-viewer -h`.quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('Markdown document viewing');
    });
    
    it('should display version with --version flag', async () => {
      const result = await $`specstar-document-viewer --version`.quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toMatch(/\d+\.\d+\.\d+/);
    });
    
    it('should display version with -v flag', async () => {
      const result = await $`specstar-document-viewer -v`.quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toMatch(/\d+\.\d+\.\d+/);
    });
    
    describe('view command', () => {
      it('should view a markdown document', async () => {
        const docFile = join(tmpDir, 'docs', 'test.md');
        await Bun.write(docFile, `# Test Document
        
## Section 1
This is a test document.

### Subsection 1.1
- Item 1
- Item 2
- Item 3

## Section 2
More content here.

\`\`\`javascript
const hello = "world";
console.log(hello);
\`\`\`
        `);
        
        const result = await $`specstar-document-viewer view ${docFile}`.quiet().nothrow();
        
        expect(result.exitCode).toBe(0);
        expect(result.stdout.toString()).toContain('Test Document');
        expect(result.stdout.toString()).toContain('Section 1');
      });
      
      it('should error on non-existent file', async () => {
        const result = await $`specstar-document-viewer view /nonexistent/doc.md`.quiet().nothrow();
        
        expect(result.exitCode).not.toBe(0);
        expect(result.stderr.toString()).toContain('Error');
      });
      
      it('should support paging for long documents', async () => {
        const longDoc = join(tmpDir, 'docs', 'long.md');
        let content = '# Long Document\n\n';
        for (let i = 1; i <= 100; i++) {
          content += `## Section ${i}\nContent for section ${i}.\n\n`;
        }
        await Bun.write(longDoc, content);
        
        const result = await $`specstar-document-viewer view ${longDoc} --page 2 --page-size 10`.quiet().nothrow();
        
        expect(result.exitCode).toBe(0);
        expect(result.stdout.toString()).toContain('Page 2');
      });
    });
    
    describe('render command', () => {
      it('should render markdown to HTML', async () => {
        const mdFile = join(tmpDir, 'docs', 'render.md');
        const htmlFile = join(tmpDir, 'docs', 'render.html');
        
        await Bun.write(mdFile, `# Render Test
        
**Bold text** and *italic text*.

[Link](https://example.com)
        `);
        
        const result = await $`specstar-document-viewer render ${mdFile} --output ${htmlFile}`.quiet().nothrow();
        
        expect(result.exitCode).toBe(0);
        expect(result.stdout.toString()).toContain('Rendered to');
      });
      
      it('should render to terminal by default', async () => {
        const mdFile = join(tmpDir, 'docs', 'terminal.md');
        
        await Bun.write(mdFile, `# Terminal Render
        
- List item 1
- List item 2
        `);
        
        const result = await $`specstar-document-viewer render ${mdFile}`.quiet().nothrow();
        
        expect(result.exitCode).toBe(0);
        expect(result.stdout.toString()).toContain('Terminal Render');
        expect(result.stdout.toString()).toContain('List item');
      });
    });
    
    describe('search command', () => {
      it('should search within a document', async () => {
        const searchDoc = join(tmpDir, 'docs', 'search.md');
        await Bun.write(searchDoc, `# Search Document
        
## Introduction
This document contains searchable content.

## Main Content
The keyword appears here and also here.

## Conclusion
Final mention of the keyword.
        `);
        
        const result = await $`specstar-document-viewer search ${searchDoc} --query "keyword"`.quiet().nothrow();
        
        expect(result.exitCode).toBe(0);
        expect(result.stdout.toString()).toContain('2 matches found');
        expect(result.stdout.toString()).toContain('Main Content');
        expect(result.stdout.toString()).toContain('Conclusion');
      });
      
      it('should search across multiple documents', async () => {
        const doc1 = join(tmpDir, 'docs', 'multi1.md');
        const doc2 = join(tmpDir, 'docs', 'multi2.md');
        
        await Bun.write(doc1, '# Doc 1\nSearch term here.');
        await Bun.write(doc2, '# Doc 2\nAnother search term instance.');
        
        const result = await $`specstar-document-viewer search ${join(tmpDir, 'docs')} --query "search term" --recursive`.quiet().nothrow();
        
        expect(result.exitCode).toBe(0);
        expect(result.stdout.toString()).toContain('multi1.md');
        expect(result.stdout.toString()).toContain('multi2.md');
      });
      
      it('should handle no matches', async () => {
        const noMatchDoc = join(tmpDir, 'docs', 'nomatch.md');
        await Bun.write(noMatchDoc, '# No Match\nNothing to find here.');
        
        const result = await $`specstar-document-viewer search ${noMatchDoc} --query "nonexistent"`.quiet().nothrow();
        
        expect(result.exitCode).toBe(0);
        expect(result.stdout.toString()).toContain('No matches found');
      });
    });
    
    describe('toc command', () => {
      it('should generate table of contents', async () => {
        const tocDoc = join(tmpDir, 'docs', 'toc.md');
        await Bun.write(tocDoc, `# Main Title

## Chapter 1
### Section 1.1
#### Subsection 1.1.1
### Section 1.2

## Chapter 2
### Section 2.1
### Section 2.2
#### Subsection 2.2.1
#### Subsection 2.2.2

## Chapter 3
        `);
        
        const result = await $`specstar-document-viewer toc ${tocDoc}`.quiet().nothrow();
        
        expect(result.exitCode).toBe(0);
        expect(result.stdout.toString()).toContain('Table of Contents');
        expect(result.stdout.toString()).toContain('Chapter 1');
        expect(result.stdout.toString()).toContain('Section 1.1');
        expect(result.stdout.toString()).toContain('Chapter 2');
        expect(result.stdout.toString()).toContain('Chapter 3');
      });
      
      it('should support depth limit', async () => {
        const depthDoc = join(tmpDir, 'docs', 'depth.md');
        await Bun.write(depthDoc, `# Title
## Level 2
### Level 3
#### Level 4
##### Level 5
        `);
        
        const result = await $`specstar-document-viewer toc ${depthDoc} --max-depth 2`.quiet().nothrow();
        
        expect(result.exitCode).toBe(0);
        expect(result.stdout.toString()).toContain('Level 2');
        expect(result.stdout.toString()).not.toContain('Level 3');
        expect(result.stdout.toString()).not.toContain('Level 4');
      });
    });
  });
  
  describe('Via main CLI: specstar lib document-viewer', () => {
    it('should display help', async () => {
      const result = await $`specstar lib document-viewer --help`.quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('Markdown document viewing');
    });
    
    it('should display version', async () => {
      const result = await $`specstar lib document-viewer --version`.quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toMatch(/\d+\.\d+\.\d+/);
    });
    
    it('should execute view command', async () => {
      const docFile = join(tmpDir, 'docs', 'main-cli.md');
      await Bun.write(docFile, '# Main CLI Test\nContent here.');
      
      const result = await $`specstar lib document-viewer view ${docFile}`.quiet().nothrow();
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('Main CLI Test');
    });
  });
});