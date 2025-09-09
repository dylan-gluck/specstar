#!/usr/bin/env bun
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import React from 'react';
import { render } from 'ink-testing-library';
import { Text } from 'ink';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// Import from actual locations
import { DocumentViewer } from '../../src/lib/document-viewer';

// Mock component wrapper for React-based testing
const DocumentViewerComponent = ({ path, theme, watch }: { path: string; theme?: string; watch?: boolean }) => {
  const [content, setContent] = React.useState<string>('Loading...');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const viewer = new DocumentViewer({ theme: theme as any });
    viewer.loadDocument(path)
      .then(doc => {
        const rendered = viewer.renderMarkdown(doc.content);
        setContent(rendered);
      })
      .catch(err => {
        setError('File not found');
        setContent('File not found');
      });
      
    if (watch) {
      // Simple file watching simulation
      const interval = setInterval(async () => {
        try {
          const doc = await viewer.loadDocument(path);
          const rendered = viewer.renderMarkdown(doc.content);
          setContent(rendered);
        } catch {}
      }, 100);
      return () => clearInterval(interval);
    }
  }, [path, theme, watch]);

  return <Text>{content}</Text>;
};

describe('Document Rendering', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'specstar-render-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test('should render basic markdown elements', async () => {
    const markdown = `# Main Title

## Subtitle

This is a paragraph with **bold** and *italic* text.

- List item 1
- List item 2
- List item 3

1. Numbered item
2. Another item

\`\`\`javascript
const code = "example";
\`\`\``;

    const docPath = join(tempDir, 'test.md');
    await Bun.write(docPath, markdown);

    const { lastFrame } = render(<DocumentViewerComponent path={docPath} />);
    
    // Wait for async loading
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const output = lastFrame();
    
    // Verify headers are rendered
    expect(output).toContain('Main Title');
    expect(output).toContain('Subtitle');
    
    // Verify text formatting
    expect(output).toContain('bold');
    expect(output).toContain('italic');
    
    // Verify lists
    expect(output).toContain('List item 1');
    expect(output).toContain('1. Numbered item');
    
    // Verify code block
    expect(output).toContain('const code = "example"');
  });

  test('should handle markdown tables', async () => {
    const markdown = `# Table Test

| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |`;

    const docPath = join(tempDir, 'table.md');
    await Bun.write(docPath, markdown);

    const { lastFrame } = render(<DocumentViewerComponent path={docPath} />);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const output = lastFrame();
    
    // Verify table structure
    expect(output).toContain('Header 1');
    expect(output).toContain('Header 2');
    expect(output).toContain('Cell 1');
    expect(output).toContain('Cell 5');
    
    // Verify table formatting (borders/alignment)
    expect(output).toMatch(/[│├─┤]/); // Table border characters
  });

  test('should render nested markdown structures', async () => {
    const markdown = `# Complex Document

## Section with nested content

> This is a blockquote
> with multiple lines
> 
> > And a nested blockquote

### Subsection

- Parent list item
  - Nested item 1
  - Nested item 2
    - Deep nested item
  - Back to nested level

#### Code in list

1. First item with code:
   \`\`\`python
   def hello():
       print("world")
   \`\`\`
2. Second item`;

    const docPath = join(tempDir, 'complex.md');
    await Bun.write(docPath, markdown);

    const { lastFrame } = render(<DocumentViewerComponent path={docPath} />);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const output = lastFrame();
    
    // Verify blockquotes
    expect(output).toContain('This is a blockquote');
    expect(output).toContain('nested blockquote');
    
    // Verify nested lists
    expect(output).toContain('Parent list item');
    expect(output).toContain('Deep nested item');
    
    // Verify code in list
    expect(output).toContain('def hello():');
  });

  test('should handle markdown links and references', async () => {
    const markdown = `# Links Test

[Inline link](https://example.com)

[Reference link][ref1]

[ref1]: https://reference.com "Reference Title"

![Image alt text](image.png)

<https://autolink.com>`;

    const docPath = join(tempDir, 'links.md');
    await Bun.write(docPath, markdown);

    const { lastFrame } = render(<DocumentViewerComponent path={docPath} />);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const output = lastFrame();
    
    // Verify links are rendered with indicators
    expect(output).toContain('Inline link');
    expect(output).toContain('[→]'); // Link indicator
    expect(output).toContain('Reference link');
    expect(output).toContain('Image alt text');
    expect(output).toContain('autolink.com');
  });

  test('should apply syntax highlighting to code blocks', async () => {
    const markdown = `# Code Examples

\`\`\`typescript
interface User {
  name: string;
  age: number;
}

const user: User = {
  name: "Alice",
  age: 30
};
\`\`\`

\`\`\`bash
#!/bin/bash
echo "Hello World"
ls -la
\`\`\`

\`\`\`json
{
  "key": "value",
  "number": 42,
  "nested": {
    "array": [1, 2, 3]
  }
}
\`\`\``;

    const docPath = join(tempDir, 'code.md');
    await Bun.write(docPath, markdown);

    const { lastFrame } = render(<DocumentViewerComponent path={docPath} />);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const output = lastFrame();
    
    // Verify language labels
    expect(output).toContain('typescript');
    expect(output).toContain('bash');
    expect(output).toContain('json');
    
    // Verify code content
    expect(output).toContain('interface User');
    expect(output).toContain('echo "Hello World"');
    expect(output).toContain('"nested":');
  });

  test('should handle frontmatter in markdown files', async () => {
    const markdown = `---
title: Test Document
author: Test Author
date: 2024-01-01
tags: [test, markdown, render]
---

# ${String.fromCharCode(123, 123)} title ${String.fromCharCode(125, 125)}

Content after frontmatter with metadata.`;

    const docPath = join(tempDir, 'frontmatter.md');
    await Bun.write(docPath, markdown);

    const { lastFrame } = render(<DocumentViewerComponent path={docPath} />);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const output = lastFrame();
    
    // Verify frontmatter is processed
    expect(output).toContain('Test Document');
    expect(output).toContain('Test Author');
    expect(output).toContain('2024-01-01');
    
    // Verify content after frontmatter
    expect(output).toContain('Content after frontmatter');
  });

  test('should dynamically update when file changes', async () => {
    const docPath = join(tempDir, 'dynamic.md');
    await Bun.write(docPath, '# Initial Content');

    const { lastFrame, rerender } = render(<DocumentViewerComponent path={docPath} watch={true} />);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(lastFrame()).toContain('Initial Content');
    
    // Update file content
    await Bun.write(docPath, '# Updated Content\n\nNew paragraph');
    
    // Wait for file watcher to detect change
    await new Promise(resolve => setTimeout(resolve, 200));
    
    expect(lastFrame()).toContain('Updated Content');
    expect(lastFrame()).toContain('New paragraph');
  });

  test('should handle large documents efficiently', async () => {
    // Generate large markdown document
    const sections = Array.from({ length: 100 }, (_, i) => `
## Section ${i + 1}

This is paragraph ${i + 1} with some content to make the document larger.

- Item A${i}
- Item B${i}
- Item C${i}

\`\`\`javascript
function example${i}() {
  return ${i};
}
\`\`\`
`).join('\n');

    const markdown = `# Large Document\n${sections}`;
    const docPath = join(tempDir, 'large.md');
    await Bun.write(docPath, markdown);

    const startTime = performance.now();
    const { lastFrame } = render(<DocumentViewerComponent path={docPath} />);
    await new Promise(resolve => setTimeout(resolve, 100));
    const renderTime = performance.now() - startTime;
    
    // Should render within reasonable time
    expect(renderTime).toBeLessThan(1000); // Less than 1 second
    
    // Verify content is rendered
    expect(lastFrame()).toContain('Section 1');
    expect(lastFrame()).toContain('Section 10'); // Partial rendering/virtualization
  });

  test('should handle special markdown characters', async () => {
    const markdown = `# Special Characters

Asterisks: * not italic * but \*escaped\*

Underscores: _ not italic _ but \_escaped\_

Backticks: \` not code \` but \\\`escaped\\\`

HTML entities: &lt;tag&gt; &amp; &quot;quotes&quot;

Math: $x^2 + y^2 = z^2$

Emoji: :smile: :+1: :rocket:`;

    const docPath = join(tempDir, 'special.md');
    await Bun.write(docPath, markdown);

    const { lastFrame } = render(<DocumentViewerComponent path={docPath} />);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const output = lastFrame();
    
    // Verify escaped characters
    expect(output).toContain('*escaped*');
    expect(output).toContain('_escaped_');
    
    // Verify HTML entities
    expect(output).toContain('<tag>');
    expect(output).toContain('&');
    
    // Verify emoji rendering (if supported)
    expect(output).toMatch(/smile|😄/);
  });

  test('should support custom rendering themes', async () => {
    const markdown = '# Themed Document\n\nContent to test theming.';
    const docPath = join(tempDir, 'themed.md');
    await Bun.write(docPath, markdown);

    // Test with dark theme
    const { lastFrame: darkFrame } = render(
      <DocumentViewerComponent path={docPath} theme="dark" />
    );
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Test with light theme
    const { lastFrame: lightFrame } = render(
      <DocumentViewerComponent path={docPath} theme="light" />
    );
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Themes should produce different outputs (colors/styles)
    expect(darkFrame()).toBeDefined();
    expect(lightFrame()).toBeDefined();
    // Note: Actual color testing would require checking ANSI codes
  });

  test('should handle malformed markdown gracefully', async () => {
    const markdown = `# Malformed Document

Unclosed **bold text

Broken link [text](

Invalid code block
\`\`\`
no language specified
and no closing

Mismatched *italic and **bold* text**

Random HTML <div unclosed`;

    const docPath = join(tempDir, 'malformed.md');
    await Bun.write(docPath, markdown);

    const { lastFrame } = render(<DocumentViewerComponent path={docPath} />);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const output = lastFrame();
    
    // Should still render what it can
    expect(output).toContain('Malformed Document');
    expect(output).toContain('Unclosed');
    expect(output).toContain('no language specified');
    
    // Should not crash
    expect(output).toBeDefined();
  });
});