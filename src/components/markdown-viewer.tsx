import { useState, useEffect } from "react";
import { Text, Box, useInput, useFocus } from "ink";
import { DocumentViewer } from "../lib/document-viewer";
import chalk from "chalk";

type MarkdownViewerProps = {
  id?: string;
  filePath?: string;
  content?: string;
  title?: string;
  scrollable?: boolean;
};

export function MarkdownViewer({
  id = "markdown-viewer",
  filePath,
  content: staticContent,
  title,
  scrollable = true,
}: MarkdownViewerProps) {
  const [content, setContent] = useState<string>(staticContent || "");
  const [renderedContent, setRenderedContent] = useState<string>("");
  const [frontmatter, setFrontmatter] = useState<Record<string, any> | null>(
    null,
  );
  const [scrollOffset, setScrollOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewer] = useState(
    () =>
      new DocumentViewer({
        theme: "dark",
        highlightSyntax: true,
        maxWidth: 80,
        pageSize: 20,
      }),
  );

  const { isFocused } = useFocus({ id, autoFocus: false });

  // Load file content if path is provided
  useEffect(() => {
    if (filePath) {
      loadFile();
    } else if (staticContent) {
      processContent(staticContent);
    }
  }, [filePath, staticContent]);

  const loadFile = async () => {
    if (!filePath) return;

    setLoading(true);
    setError(null);

    try {
      const doc = await viewer.loadDocument(filePath);
      setContent(doc.content);
      setFrontmatter(doc.frontmatter || null);
      processContent(doc.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load file");
      setContent("");
      setRenderedContent("");
    } finally {
      setLoading(false);
    }
  };

  const processContent = (markdown: string) => {
    try {
      // Extract frontmatter if not already done
      if (!frontmatter) {
        const { content: bodyContent, data } =
          viewer.extractFrontmatter(markdown);
        if (Object.keys(data).length > 0) {
          setFrontmatter(data);
          markdown = bodyContent;
        }
      }

      // Render markdown to terminal format
      const rendered = viewer.renderMarkdown(markdown, {
        wrapText: true,
      });
      setRenderedContent(rendered);
      setScrollOffset(0);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to render markdown",
      );
      setRenderedContent("");
    }
  };

  // Handle scrolling
  useInput((input, key) => {
    if (!isFocused || !scrollable) return;

    const lines = renderedContent.split("\n");
    const viewportHeight =
      frontmatter && Object.keys(frontmatter).length > 0 ? 14 : 18;
    const maxOffset = Math.max(0, lines.length - viewportHeight);

    if (key.upArrow || input === "k") {
      setScrollOffset(Math.max(0, scrollOffset - 1));
    }
    if (key.downArrow || input === "j") {
      setScrollOffset(Math.min(maxOffset, scrollOffset + 1));
    }
    if (key.pageUp || input === "u") {
      setScrollOffset(Math.max(0, scrollOffset - 10));
    }
    if (key.pageDown || input === "d") {
      setScrollOffset(Math.min(maxOffset, scrollOffset + 10));
    }
    if (input === "g") {
      setScrollOffset(0); // Go to top
    }
    if (input === "G") {
      setScrollOffset(maxOffset); // Go to bottom
    }
  });

  // Get visible content based on scroll offset
  const getVisibleContent = () => {
    if (!renderedContent) return "";

    const lines = renderedContent.split("\n");
    // Account for frontmatter display if present
    const viewportHeight =
      frontmatter && Object.keys(frontmatter).length > 0 ? 14 : 18;
    const visibleLines = lines.slice(
      scrollOffset,
      scrollOffset + viewportHeight,
    );

    // Ensure we don't have empty space at the bottom
    if (visibleLines.length < viewportHeight) {
      const padding = viewportHeight - visibleLines.length;
      for (let i = 0; i < padding; i++) {
        visibleLines.push("");
      }
    }

    return visibleLines.join("\n");
  };

  const displayTitle =
    title || (filePath ? filePath.split("/").pop() : "Markdown Viewer");
  const lines = renderedContent.split("\n");
  const totalLines = lines.length;
  const viewportHeight =
    frontmatter && Object.keys(frontmatter).length > 0 ? 14 : 18;
  const currentLine = Math.min(scrollOffset + 1, totalLines);
  const endLine = Math.min(scrollOffset + viewportHeight, totalLines);

  return (
    <Box
      borderStyle="classic"
      borderColor={isFocused ? "green" : "gray"}
      flexGrow={1}
      paddingX={1}
      flexDirection="column"
      overflow="hidden"
    >
      {/* Header */}
      <Box
        backgroundColor="gray"
        width="100%"
        height={1}
        justifyContent="space-between"
        paddingX={1}
      >
        <Text color="black" bold>
          {displayTitle}
        </Text>
        <Text color="black">
          {loading
            ? "loading..."
            : error
              ? "error"
              : `${currentLine}-${endLine}/${totalLines}`}
        </Text>
      </Box>

      {/* Content area with fixed height */}
      <Box
        flexDirection="column"
        flexGrow={1}
        overflow="hidden"
        marginTop={1}
      >
        {/* Frontmatter display (if present, included in scrollable area) */}
        {frontmatter &&
          Object.keys(frontmatter).length > 0 &&
          !loading &&
          !error && (
            <>
              <Text color="cyan" dimColor>
                ── Frontmatter ──
              </Text>
              {Object.entries(frontmatter)
                .slice(0, 3)
                .map(([key, value], index) => (
                  <Box key={`${key}-${index}`}>
                    <Text color="yellow">{key}:</Text>
                    <Text> {String(value).substring(0, 50)}</Text>
                  </Box>
                ))}
              <Text color="cyan" dimColor>
                ─────────────────
              </Text>
              <Text> </Text>
            </>
          )}

        {/* Main content */}
        {loading && <Text color="gray">Loading document...</Text>}
        {error && (
          <Box flexGrow={1} flexDirection="column">
            <Text color="red">Error: {error}</Text>
          </Box>
        )}
        {!loading && !error && !renderedContent && (
          <Text color="gray">No content to display</Text>
        )}
        {!loading && !error && renderedContent && (
          <Text wrap="truncate-end">{getVisibleContent()}</Text>
        )}
      </Box>

      {/* Footer with controls */}
      {isFocused && scrollable && (
        <Box height={1} marginTop={1}>
          <Text color="gray" dimColor>
            ↑↓/jk Navigate • PgUp/PgDn/ud Page • g/G Top/Bottom
          </Text>
        </Box>
      )}
    </Box>
  );
}
