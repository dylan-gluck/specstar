import { DocumentViewer } from "../../src/lib/document-viewer";

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
  }
  
  return sections.join("\n");
};

console.log("Document Viewer Performance Metrics");
console.log("=====================================\n");

const viewer = new DocumentViewer({
  theme: "dark",
  highlightSyntax: true,
  maxWidth: 80,
  pageSize: 20,
});

const smallDoc = generateLargeMarkdown(100);
const mediumDoc = generateLargeMarkdown(500);
const largeDoc = generateLargeMarkdown(1000);
const hugeDoc = generateLargeMarkdown(2000);

const testRender = (label: string, document: string) => {
  const startTime = performance.now();
  const rendered = viewer.renderMarkdown(document, { wrapText: true });
  const renderTime = performance.now() - startTime;
  
  console.log(`${label}:`);
  console.log(`  Lines: ${document.split("\n").length}`);
  console.log(`  Render Time: ${renderTime.toFixed(2)}ms`);
  console.log(`  Output Size: ${rendered.length} chars`);
  console.log(`  Performance: ${renderTime < 100 ? "✓ PASS" : "✗ FAIL"} (<100ms target)`);
  console.log("");
  
  return renderTime;
};

testRender("Small Document (100 lines)", smallDoc);
testRender("Medium Document (500 lines)", mediumDoc);
testRender("Large Document (1000 lines)", largeDoc);
testRender("Huge Document (2000 lines)", hugeDoc);

console.log("\nMemory Usage Test");
console.log("-----------------");
if (global.gc) global.gc();
const initialMemory = process.memoryUsage().heapUsed;

for (let i = 0; i < 10; i++) {
  viewer.renderMarkdown(largeDoc, { wrapText: true });
}

if (global.gc) global.gc();
const finalMemory = process.memoryUsage().heapUsed;
const memoryIncrease = (finalMemory - initialMemory) / (1024 * 1024);

console.log(`Initial Memory: ${(initialMemory / 1024 / 1024).toFixed(2)} MB`);
console.log(`Final Memory: ${(finalMemory / 1024 / 1024).toFixed(2)} MB`);
console.log(`Memory Increase: ${memoryIncrease.toFixed(2)} MB`);
console.log(`Memory Test: ${memoryIncrease < 5 ? "✓ PASS" : "✗ FAIL"} (<5MB target)\n`);

console.log("\nFrontmatter Extraction Test");
console.log("----------------------------");
const docWithFrontmatter = `---
title: Performance Test
author: Test Suite
date: 2024-01-01
---

${mediumDoc}`;

const fmStartTime = performance.now();
const { content, data } = viewer.extractFrontmatter(docWithFrontmatter);
const fmTime = performance.now() - fmStartTime;

console.log(`Extraction Time: ${fmTime.toFixed(2)}ms`);
console.log(`Frontmatter Keys: ${Object.keys(data).length}`);
console.log(`Performance: ${fmTime < 10 ? "✓ PASS" : "✗ FAIL"} (<10ms target)\n`);

console.log("\nSyntax Highlighting Test");
console.log("------------------------");
const codeHeavyDoc = Array(50)
  .fill(0)
  .map((_, i) => `
\`\`\`javascript
function example${i}() {
  const data = { id: ${i}, value: 'test' };
  return data;
}
\`\`\`
`).join("\n");

const hlStartTime = performance.now();
viewer.renderMarkdown(codeHeavyDoc, { wrapText: true });
const hlTime = performance.now() - hlStartTime;

console.log(`Render Time with Highlighting: ${hlTime.toFixed(2)}ms`);
console.log(`Performance: ${hlTime < 150 ? "✓ PASS" : "✗ FAIL"} (<150ms target)\n`);

console.log("=====================================");
console.log("Overall Performance Validation: ✓ COMPLETE");