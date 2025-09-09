#!/usr/bin/env bun

/**
 * Document Viewer Demo
 * 
 * This script demonstrates the DocumentViewer library capabilities:
 * - Loading markdown documents
 * - Extracting frontmatter
 * - Rendering markdown to terminal format
 * - Syntax highlighting code blocks
 * - Pagination support
 * - Table of contents extraction
 * 
 * Usage: bun run examples/document-viewer-demo.ts [markdown-file]
 */

import { DocumentViewer } from '../src/lib/document-viewer';
import { join } from 'path';

// Create a sample markdown document if no file is provided
const sampleMarkdown = `---
title: DocumentViewer Demo
author: Specstar Team
date: 2024-01-01
tags:
  - demo
  - documentation
  - terminal
---

# DocumentViewer Library Demo

Welcome to the **DocumentViewer** library demonstration! This library provides powerful markdown rendering capabilities for terminal applications.

## Features

### Markdown Rendering
The library converts standard markdown to beautifully formatted terminal output with:
- **Bold** and *italic* text
- \`inline code\` snippets
- Headers at multiple levels
- Lists and nested lists
- Tables with proper alignment
- Blockquotes
- Horizontal rules

### Code Highlighting
\`\`\`javascript
// JavaScript code with syntax highlighting
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log(fibonacci(10)); // Output: 55
\`\`\`

\`\`\`typescript
// TypeScript example
interface User {
  id: number;
  name: string;
  email: string;
}

class UserService {
  private users: User[] = [];
  
  addUser(user: User): void {
    this.users.push(user);
  }
  
  getUser(id: number): User | undefined {
    return this.users.find(u => u.id === id);
  }
}
\`\`\`

### Lists

#### Unordered Lists
- First item
- Second item
  - Nested item 1
  - Nested item 2
- Third item

#### Ordered Lists
1. Step one
2. Step two
3. Step three

### Tables

| Feature | Status | Description |
|---------|--------|-------------|
| Markdown Parsing | ✅ | Full CommonMark support |
| Syntax Highlighting | ✅ | Multiple language support |
| Pagination | ✅ | Large document handling |
| Frontmatter | ✅ | YAML metadata extraction |
| Search | ✅ | Find text within documents |

### Blockquotes

> "The best way to predict the future is to invent it."
> 
> — Alan Kay

### Links and References

Check out the [Specstar repository](https://github.com/example/specstar) for more information.

---

## Usage Example

\`\`\`typescript
import { DocumentViewer } from '@specstar/document-viewer';

const viewer = new DocumentViewer({
  theme: 'dark',
  highlightSyntax: true,
  maxWidth: 80,
  pageSize: 30
});

// Load a document
const doc = await viewer.loadDocument('README.md');

// Render to terminal
const rendered = viewer.renderMarkdown(doc.content);
console.log(rendered);

// Extract table of contents
const toc = viewer.extractTableOfContents(doc.content);
console.log('Table of Contents:', toc);
\`\`\`

---

*Thank you for exploring the DocumentViewer library!*
`;

async function demo() {
  // Get file path from command line or use sample
  const args = process.argv.slice(2);
  let markdownContent: string;
  let filePath: string;

  if (args[0]) {
    filePath = args[0];
    const file = Bun.file(filePath);
    markdownContent = await file.text();
  } else {
    // Create a temporary file with sample content
    filePath = join(import.meta.dir, 'sample-demo.md');
    await Bun.write(filePath, sampleMarkdown);
    markdownContent = sampleMarkdown;
  }

  // Create viewer with options
  const viewer = new DocumentViewer({
    theme: 'dark',
    highlightSyntax: true,
    maxWidth: 100,
    pageSize: 25
  });

  console.log('\n' + '═'.repeat(100));
  console.log('  DOCUMENT VIEWER DEMO');
  console.log('═'.repeat(100) + '\n');

  // Load and parse document
  console.log('Loading document:', filePath);
  const doc = await viewer.loadDocument(filePath);
  
  // Display frontmatter if present
  if (doc.frontmatter) {
    console.log('\n' + viewer.formatFrontmatter(doc.frontmatter));
  }

  // Extract and display table of contents
  const toc = viewer.extractTableOfContents(doc.content);
  if (toc.length > 0) {
    console.log('\n' + '─'.repeat(50));
    console.log('TABLE OF CONTENTS:');
    console.log('─'.repeat(50));
    toc.forEach(item => {
      const indent = '  '.repeat(item.level - 1);
      console.log(`${indent}${item.level}. ${item.text} (line ${item.line})`);
    });
  }

  // Render the document
  console.log('\n' + '─'.repeat(50));
  console.log('RENDERED DOCUMENT:');
  console.log('─'.repeat(50));
  
  const rendered = viewer.renderMarkdown(doc.content);
  
  // Demonstrate pagination
  const paginated = viewer.paginate(rendered, 1);
  console.log(paginated.content);
  
  if (paginated.totalPages > 1) {
    console.log('\n' + '─'.repeat(50));
    console.log(`Page ${paginated.currentPage} of ${paginated.totalPages}`);
    console.log('(Showing first page only in demo)');
  }

  // Demonstrate search
  console.log('\n' + '─'.repeat(50));
  console.log('SEARCH DEMONSTRATION:');
  console.log('─'.repeat(50));
  
  const searchTerm = 'library';
  const matches = viewer.search(doc.content, searchTerm);
  console.log(`Found "${searchTerm}" on lines: ${matches.join(', ')}`);

  // Clean up temporary file if created
  if (!args[0]) {
    await Bun.$`rm -f ${filePath}`.quiet();
  }

  console.log('\n' + '═'.repeat(100));
  console.log('  END OF DEMO');
  console.log('═'.repeat(100) + '\n');
}

// Run the demo
demo().catch(console.error);