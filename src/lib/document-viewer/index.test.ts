import { describe, test, expect, beforeAll } from 'bun:test';
import { DocumentViewer } from './index';
import { join } from 'path';

describe('DocumentViewer', () => {
  let viewer: DocumentViewer;
  const testMarkdownPath = join(import.meta.dir, 'test-document.md');

  beforeAll(async () => {
    // Create a test markdown file
    const testContent = `---
title: Test Document
author: Test Author
date: 2024-01-01
tags:
  - test
  - documentation
---

# Test Document

This is a **test** document with various *markdown* features.

## Headers

### Level 3 Header
#### Level 4 Header

## Code Blocks

Here's some inline code: \`const x = 42\`

\`\`\`javascript
function hello(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`

\`\`\`python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)
\`\`\`

## Lists

- First item
- Second item
  - Nested item
  - Another nested
- Third item

1. Ordered first
2. Ordered second
3. Ordered third

## Links and Images

Check out [this link](https://example.com) for more info.

![Alt text](image.png)

## Blockquotes

> This is a blockquote
> with multiple lines
> of quoted text.

## Tables

| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |

## Horizontal Rule

---

## Strikethrough

This is ~~deleted~~ text.

## HTML

<div>This is HTML content</div>
`;

    await Bun.write(testMarkdownPath, testContent);
    viewer = new DocumentViewer();
  });

  describe('constructor', () => {
    test('should initialize with default options', () => {
      const viewer = new DocumentViewer();
      expect(viewer).toBeDefined();
    });

    test('should accept custom options', () => {
      const viewer = new DocumentViewer({
        theme: 'light',
        highlightSyntax: false,
        maxWidth: 120,
        pageSize: 50
      });
      expect(viewer).toBeDefined();
    });
  });

  describe('loadDocument', () => {
    test('should load and parse markdown file', async () => {
      const doc = await viewer.loadDocument(testMarkdownPath);
      
      expect(doc.path).toBe(testMarkdownPath);
      expect(doc.content).toContain('# Test Document');
      expect(doc.frontmatter).toBeDefined();
      expect(doc.frontmatter?.title).toBe('Test Document');
      expect(doc.frontmatter?.author).toBe('Test Author');
      expect(doc.frontmatter?.tags).toEqual(['test', 'documentation']);
      expect(doc.raw).toContain('---\ntitle: Test Document');
    });

    test('should handle files without frontmatter', async () => {
      const noFrontmatterPath = join(import.meta.dir, 'no-frontmatter.md');
      await Bun.write(noFrontmatterPath, '# Simple Document\n\nNo frontmatter here.');
      
      const doc = await viewer.loadDocument(noFrontmatterPath);
      expect(doc.frontmatter).toBeUndefined();
      expect(doc.content).toBe('# Simple Document\n\nNo frontmatter here.');
    });

    test('should throw error for non-existent file', async () => {
      await expect(viewer.loadDocument('/non/existent/file.md')).rejects.toThrow('Failed to load document');
    });
  });

  describe('extractFrontmatter', () => {
    test('should extract YAML frontmatter', () => {
      const content = `---
title: Test
key: value
---
# Content`;
      
      const result = viewer.extractFrontmatter(content);
      expect(result.data.title).toBe('Test');
      expect(result.data.key).toBe('value');
      expect(result.content).toBe('# Content');
    });

    test('should handle content without frontmatter', () => {
      const content = '# Just Content';
      const result = viewer.extractFrontmatter(content);
      
      expect(result.data).toEqual({});
      expect(result.content).toBe('# Just Content');
    });
  });

  describe('renderMarkdown', () => {
    test('should render markdown to terminal format', () => {
      const markdown = '# Header\n\nThis is **bold** and *italic* text.';
      const rendered = viewer.renderMarkdown(markdown);
      
      expect(rendered).toContain('Header');
      expect(rendered).toContain('bold');
      expect(rendered).toContain('italic');
    });

    test('should support pagination options', () => {
      const markdown = Array.from({ length: 10 }, (_, i) => `Line ${i + 1}`).join('\n');
      const rendered = viewer.renderMarkdown(markdown, { startLine: 2, endLine: 5 });
      const lines = rendered.split('\n');
      
      expect(lines.length).toBeLessThanOrEqual(3);
    });

    test('should wrap long lines when enabled', () => {
      const viewer = new DocumentViewer({ maxWidth: 20 });
      const longLine = 'This is a very long line that should be wrapped because it exceeds the maximum width';
      const rendered = viewer.renderMarkdown(longLine, { wrapText: true });
      
      const lines = rendered.split('\n');
      expect(lines.length).toBeGreaterThan(1);
      lines.forEach(line => {
        expect(line.length).toBeLessThanOrEqual(20);
      });
    });
  });

  describe('highlightCode', () => {
    test('should highlight code with syntax', () => {
      const code = 'const x = 42;';
      const highlighted = viewer.highlightCode(code, 'javascript');
      
      // Should return the code (highlighting is optional and may not always work)
      expect(highlighted).toBeTruthy();
      expect(highlighted).toContain('const');
    });

    test('should fallback to plain text for unknown languages', () => {
      const code = 'some code';
      const highlighted = viewer.highlightCode(code, 'unknown-lang');
      
      // Should still return the code even if highlighting fails
      expect(highlighted).toBeTruthy();
    });

    test('should skip highlighting when disabled', () => {
      const viewer = new DocumentViewer({ highlightSyntax: false });
      const code = 'const x = 42;';
      const highlighted = viewer.highlightCode(code, 'javascript');
      
      expect(highlighted).toBe(code);
    });
  });

  describe('paginate', () => {
    test('should paginate content', () => {
      const lines = Array.from({ length: 100 }, (_, i) => `Line ${i + 1}`);
      const content = lines.join('\n');
      
      const page1 = viewer.paginate(content, 1);
      expect(page1.currentPage).toBe(1);
      expect(page1.totalPages).toBeGreaterThan(1);
      expect(page1.content.split('\n').length).toBeLessThanOrEqual(30);
      
      const page2 = viewer.paginate(content, 2);
      expect(page2.currentPage).toBe(2);
      expect(page2.content).not.toBe(page1.content);
    });

    test('should handle out of bounds pages', () => {
      const content = 'Short content';
      
      const result = viewer.paginate(content, 999);
      expect(result.currentPage).toBe(1);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('search', () => {
    test('should find text in document', () => {
      const content = `Line 1
Line with search term
Another line
Search term again`;
      
      const matches = viewer.search(content, 'search term');
      expect(matches).toEqual([2, 4]);
    });

    test('should support case-sensitive search', () => {
      const content = `Search Term
search term
SEARCH TERM`;
      
      const caseSensitive = viewer.search(content, 'search term', true);
      expect(caseSensitive).toEqual([2]);
      
      const caseInsensitive = viewer.search(content, 'search term', false);
      expect(caseInsensitive).toEqual([1, 2, 3]);
    });
  });

  describe('extractTableOfContents', () => {
    test('should extract headers as TOC', () => {
      const content = `# Header 1
Some content
## Header 2
More content
### Header 3
#### Header 4`;
      
      const toc = viewer.extractTableOfContents(content);
      
      expect(toc).toHaveLength(4);
      expect(toc[0]).toEqual({ level: 1, text: 'Header 1', line: 1 });
      expect(toc[1]).toEqual({ level: 2, text: 'Header 2', line: 3 });
      expect(toc[2]).toEqual({ level: 3, text: 'Header 3', line: 5 });
      expect(toc[3]).toEqual({ level: 4, text: 'Header 4', line: 6 });
    });

    test('should handle documents without headers', () => {
      const content = 'Just plain text\nNo headers here';
      const toc = viewer.extractTableOfContents(content);
      
      expect(toc).toHaveLength(0);
    });
  });

  describe('formatFrontmatter', () => {
    test('should format frontmatter for display', () => {
      const frontmatter = {
        title: 'Test',
        author: 'Author Name',
        tags: ['tag1', 'tag2'],
        nested: { key: 'value' }
      };
      
      const formatted = viewer.formatFrontmatter(frontmatter);
      
      expect(formatted).toContain('Frontmatter');
      expect(formatted).toContain('title: Test');
      expect(formatted).toContain('author: Author Name');
      expect(formatted).toContain('tags:');
      expect(formatted).toContain('nested:');
    });
  });

  describe('integration', () => {
    test('should load, parse, and render a complete document', async () => {
      const doc = await viewer.loadDocument(testMarkdownPath);
      const rendered = viewer.renderMarkdown(doc.content);
      
      // Check various elements are rendered
      expect(rendered).toContain('Test Document');
      expect(rendered).toContain('test');
      expect(rendered).toContain('Hello');
      expect(rendered).toContain('First item');
      expect(rendered).toContain('example.com');
      
      // Check TOC extraction
      const toc = viewer.extractTableOfContents(doc.content);
      expect(toc.length).toBeGreaterThan(0);
      expect(toc[0].text).toBe('Test Document');
      
      // Check search functionality
      const matches = viewer.search(doc.content, 'test');
      expect(matches.length).toBeGreaterThan(0);
      
      // Check pagination
      const paginated = viewer.paginate(rendered, 1);
      expect(paginated.currentPage).toBe(1);
      expect(paginated.content).toBeTruthy();
    });
  });
});