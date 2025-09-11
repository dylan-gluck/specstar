import { describe, it, expect, beforeEach } from "bun:test";
import React from "react";
import { render } from "ink-testing-library";
import { MarkdownViewer } from "../../src/components/markdown-viewer";
import { DocumentViewer } from "../../src/lib/document-viewer";
import fs from "fs/promises";
import path from "path";

const generateLargeMarkdown = (lines: number): string => {
  const sections = [];
  const sectionCount = Math.floor(lines / 50);
  
  for (let i = 0; i < sectionCount; i++) {
    sections.push(`# Section ${i + 1}`);
    sections.push("");
    sections.push(`This is paragraph ${i + 1} with some content.`);
    sections.push("");
    sections.push("## Subsection");
    sections.push("");
    
    for (let j = 0; j < 5; j++) {
      sections.push(`- List item ${j + 1}`);
    }
    sections.push("");
    
    sections.push("```javascript");
    sections.push("const example = {");
    sections.push(`  id: ${i},`);
    sections.push(`  name: 'Item ${i}',`);
    sections.push("  process: () => console.log('Processing...')");
    sections.push("};");
    sections.push("```");
    sections.push("");
    
    sections.push(`> Blockquote ${i + 1}: This is an important note.`);
    sections.push("");
    
    const tableRows = [];
    tableRows.push("| Column A | Column B | Column C |");
    tableRows.push("|----------|----------|----------|");
    for (let k = 0; k < 5; k++) {
      tableRows.push(`| Value ${k} | Data ${k} | Info ${k} |`);
    }
    sections.push(...tableRows);
    sections.push("");
  }
  
  return sections.join("\n");
};

describe("Document Viewer Performance", () => {
  let largeDocument: string;
  let hugeDocument: string;
  let memoryBaseline: number;

  beforeEach(() => {
    largeDocument = generateLargeMarkdown(500);
    hugeDocument = generateLargeMarkdown(2000);
    if (global.gc) global.gc();
    memoryBaseline = process.memoryUsage().heapUsed;
  });

  it("should render large documents within 100ms", async () => {
    const startTime = performance.now();
    
    const { lastFrame, rerender } = render(
      <MarkdownViewer content={largeDocument} scrollable={true} />
    );
    
    await new Promise(resolve => setTimeout(resolve, 10));
    rerender(<MarkdownViewer content={largeDocument} scrollable={true} />);
    
    const renderTime = performance.now() - startTime;
    
    expect(renderTime).toBeLessThan(100);
    const frame = lastFrame();
    expect(frame).toBeDefined();
    expect(frame.length).toBeGreaterThan(0);
  });

  it("should handle huge documents efficiently", () => {
    const startTime = performance.now();
    
    const { lastFrame } = render(
      <MarkdownViewer content={hugeDocument} scrollable={true} />
    );
    
    const renderTime = performance.now() - startTime;
    
    expect(renderTime).toBeLessThan(200);
    expect(lastFrame()).toBeDefined();
  });

  it("should maintain constant memory during scrolling", () => {
    const { stdin, lastFrame } = render(
      <MarkdownViewer content={largeDocument} scrollable={true} id="perf-test" />
    );
    
    const initialMemory = process.memoryUsage().heapUsed;
    
    for (let i = 0; i < 20; i++) {
      stdin.write("j");
    }
    
    for (let i = 0; i < 20; i++) {
      stdin.write("k");
    }
    
    stdin.write("G");
    stdin.write("g");
    
    if (global.gc) global.gc();
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;
    const memoryIncreaseMB = memoryIncrease / (1024 * 1024);
    
    expect(memoryIncreaseMB).toBeLessThan(5);
  });

  it("should process markdown efficiently", () => {
    const viewer = new DocumentViewer({
      theme: "dark",
      highlightSyntax: true,
      maxWidth: 80,
    });
    
    const startTime = performance.now();
    const rendered = viewer.renderMarkdown(largeDocument, { wrapText: true });
    const processTime = performance.now() - startTime;
    
    expect(processTime).toBeLessThan(50);
    expect(rendered).toBeDefined();
    expect(rendered.length).toBeGreaterThan(0);
  });

  it("should handle rapid scroll events without lag", () => {
    const { stdin, lastFrame } = render(
      <MarkdownViewer content={largeDocument} scrollable={true} id="scroll-test" />
    );
    
    const startTime = performance.now();
    
    for (let i = 0; i < 50; i++) {
      stdin.write(i % 2 === 0 ? "j" : "k");
    }
    
    const scrollTime = performance.now() - startTime;
    const averageScrollTime = scrollTime / 50;
    
    expect(averageScrollTime).toBeLessThan(10);
    expect(lastFrame()).toBeDefined();
  });

  it("should efficiently extract and render frontmatter", () => {
    const documentWithFrontmatter = `---
title: Performance Test Document
author: Test Suite
date: 2024-01-01
tags: [performance, testing, validation]
---

${largeDocument}`;
    
    const viewer = new DocumentViewer({
      theme: "dark",
      highlightSyntax: true,
    });
    
    const startTime = performance.now();
    const { content, data } = viewer.extractFrontmatter(documentWithFrontmatter);
    const extractTime = performance.now() - startTime;
    
    expect(extractTime).toBeLessThan(10);
    expect(data.title).toBe("Performance Test Document");
    expect(content).not.toContain("title:");
  });

  it("should cache rendered content effectively", () => {
    const viewer = new DocumentViewer({
      theme: "dark",
      highlightSyntax: true,
      maxWidth: 80,
    });
    
    const firstRenderStart = performance.now();
    const firstRender = viewer.renderMarkdown(largeDocument, { wrapText: true });
    const firstRenderTime = performance.now() - firstRenderStart;
    
    const secondRenderStart = performance.now();
    const secondRender = viewer.renderMarkdown(largeDocument, { wrapText: true });
    const secondRenderTime = performance.now() - secondRenderStart;
    
    expect(secondRenderTime).toBeLessThanOrEqual(firstRenderTime);
    expect(firstRender).toBe(secondRender);
  });

  it("should handle syntax highlighting without performance degradation", () => {
    const codeHeavyDocument = Array(100)
      .fill(0)
      .map((_, i) => `
\`\`\`javascript
function complexFunction${i}() {
  const data = {
    id: ${i},
    process: async () => {
      const result = await fetch('/api/data');
      return result.json();
    }
  };
  return data;
}
\`\`\`
`)
      .join("\n");
    
    const viewer = new DocumentViewer({
      theme: "dark",
      highlightSyntax: true,
    });
    
    const startTime = performance.now();
    const rendered = viewer.renderMarkdown(codeHeavyDocument, { wrapText: true });
    const renderTime = performance.now() - startTime;
    
    expect(renderTime).toBeLessThan(150);
    expect(rendered).toContain("function");
  });

  it("should paginate large documents efficiently", () => {
    const viewer = new DocumentViewer({
      theme: "dark",
      pageSize: 20,
    });
    
    const startTime = performance.now();
    const rendered = viewer.renderMarkdown(hugeDocument, {
      startLine: 0,
      endLine: 20,
      wrapText: true,
    });
    const paginationTime = performance.now() - startTime;
    
    expect(paginationTime).toBeLessThan(50);
    expect(rendered.split("\n").length).toBeGreaterThan(0);
  });

  it("should measure complete render cycle performance", async () => {
    const metrics = {
      renderTimes: [] as number[],
      memoryUsage: [] as number[],
    };
    
    for (let i = 0; i < 10; i++) {
      const startTime = performance.now();
      
      const { unmount } = render(
        <MarkdownViewer 
          content={largeDocument} 
          scrollable={true} 
          id={`cycle-${i}`}
        />
      );
      
      const renderTime = performance.now() - startTime;
      metrics.renderTimes.push(renderTime);
      
      if (global.gc) global.gc();
      metrics.memoryUsage.push(process.memoryUsage().heapUsed);
      
      unmount();
    }
    
    const avgRenderTime = 
      metrics.renderTimes.reduce((a, b) => a + b, 0) / metrics.renderTimes.length;
    const maxRenderTime = Math.max(...metrics.renderTimes);
    
    expect(avgRenderTime).toBeLessThan(100);
    expect(maxRenderTime).toBeLessThan(150);
    
    const memoryVariance = Math.max(...metrics.memoryUsage) - Math.min(...metrics.memoryUsage);
    const memoryVarianceMB = memoryVariance / (1024 * 1024);
    
    expect(memoryVarianceMB).toBeLessThan(10);
  });
});