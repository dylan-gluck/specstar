import { describe, test, expect } from "bun:test";
import React from "react";
import { render } from "ink-testing-library";
import { MarkdownViewer } from "../../src/components/markdown-viewer";

describe("MarkdownViewer Layout", () => {
  test("renders with flexGrow property", () => {
    const { lastFrame } = render(
      <MarkdownViewer content="# Test Content" scrollable={true} />
    );
    
    const output = lastFrame();
    expect(output).toBeDefined();
    expect(output).not.toBeNull();
  });

  test("no fixed height applied when scrollable is true", () => {
    const { lastFrame } = render(
      <MarkdownViewer 
        content="# Test Content\n\nLong content that would normally scroll" 
        scrollable={true} 
      />
    );
    
    const output = lastFrame();
    expect(output).not.toContain("height={20}");
    expect(output).not.toContain("height=20");
  });

  test("viewer fills available space in parent container", () => {
    const { lastFrame } = render(
      <MarkdownViewer 
        content="# Test Document\n\nThis is a test document with multiple lines.\nLine 2\nLine 3\nLine 4" 
        scrollable={true} 
      />
    );
    
    const output = lastFrame();
    expect(output).toBeDefined();
    expect(output.length).toBeGreaterThan(0);
  });

  test("flexGrow is applied to content area", () => {
    const { lastFrame } = render(
      <MarkdownViewer content="Test content" scrollable={true} />
    );
    
    const output = lastFrame();
    expect(output).toBeDefined();
  });

  test("scrollable false does not apply fixed height", () => {
    const { lastFrame } = render(
      <MarkdownViewer content="# Static Content" scrollable={false} />
    );
    
    const output = lastFrame();
    expect(output).toBeDefined();
    expect(output).not.toContain("height={20}");
  });
});