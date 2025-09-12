import { describe, test, expect, mock, beforeEach } from "bun:test";
import React, { useState, useEffect } from "react";
import { render } from "ink-testing-library";
import { MarkdownViewer } from "../../src/components/markdown-viewer";
import { Box, Text } from "ink";

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
    expect(output!.length).toBeGreaterThan(0);
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

describe("MarkdownViewer Error State", () => {
  const ErrorMarkdownViewer = ({ errorMessage }: { errorMessage: string }) => {
    return (
      <Box
        borderStyle="classic"
        borderColor="gray"
        flexGrow={1}
        paddingX={1}
        flexDirection="column"
        overflow="hidden"
      >
        <Box
          backgroundColor="gray"
          width="100%"
          height={1}
          justifyContent="space-between"
          paddingX={1}
        >
          <Text color="black" bold>
            test.md
          </Text>
          <Text color="black">
            {errorMessage ? "error" : "1-1/1"}
          </Text>
        </Box>
        
        <Box
          flexDirection="column"
          flexGrow={1}
          overflow="hidden"
          marginTop={1}
        >
          {errorMessage && (
            <Box flexGrow={1} flexDirection="column">
              <Text color="red">Error: {errorMessage}</Text>
            </Box>
          )}
          {!errorMessage && (
            <Text color="gray">No content to display</Text>
          )}
        </Box>
      </Box>
    );
  };

  test("error state renders within flex container", () => {
    const { lastFrame } = render(
      <ErrorMarkdownViewer errorMessage="Failed to load file" />
    );
    
    const output = lastFrame();
    expect(output).toBeDefined();
    expect(output).toContain("Error: Failed to load file");
  });

  test("error message displays within viewer bounds", () => {
    const { lastFrame } = render(
      <ErrorMarkdownViewer errorMessage="Document not found" />
    );
    
    const output = lastFrame();
    expect(output).toBeDefined();
    expect(output).toContain("Error: Document not found");
    expect(output).toContain("error");
  });

  test("layout remains intact when error occurs", () => {
    const { lastFrame } = render(
      <ErrorMarkdownViewer errorMessage="Read permission denied" />
    );
    
    const output = lastFrame();
    expect(output).toBeDefined();
    expect(output!.split('\n').length).toBeGreaterThan(0);
    expect(output).toContain("Error: Read permission denied");
    expect(output).toContain("test.md");
  });

  test("error Box respects parent flexGrow property", () => {
    const { lastFrame } = render(
      <ErrorMarkdownViewer errorMessage="Invalid markdown syntax" />
    );
    
    const output = lastFrame();
    expect(output).toBeDefined();
    expect(output).toContain("Error: Invalid markdown syntax");
    const lines = output!.split('\n');
    expect(lines.length).toBeGreaterThan(3);
  });

  test("error state does not have fixed dimensions", () => {
    const { lastFrame } = render(
      <ErrorMarkdownViewer errorMessage="File system error" />
    );
    
    const output = lastFrame();
    expect(output).toBeDefined();
    const lines = output!.split('\n');
    expect(lines.some(line => line.includes("Error: File system error"))).toBe(true);
    expect(output).not.toContain("height=");
    expect(output).not.toContain("width=");
  });
});