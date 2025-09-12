import { useState, useEffect } from "react";
import { Text, Box, useInput, useFocus, useStdout } from "ink";
import SyntaxHighlight from "ink-syntax-highlight";

type DocumentViewerProps = {
  id?: string;
  filePath?: string;
  content?: string;
  title?: string;
  scrollable?: boolean;
};

// Detect language from file extension
const getLanguageFromPath = (path: string): string | undefined => {
  if (!path) return undefined;
  const ext = path.split('.').pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'cs': 'csharp',
    'php': 'php',
    'swift': 'swift',
    'kt': 'kotlin',
    'scala': 'scala',
    'r': 'r',
    'sql': 'sql',
    'sh': 'bash',
    'bash': 'bash',
    'zsh': 'bash',
    'fish': 'bash',
    'ps1': 'powershell',
    'yml': 'yaml',
    'yaml': 'yaml',
    'json': 'json',
    'xml': 'xml',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'scss',
    'less': 'less',
    'md': 'markdown',
    'markdown': 'markdown',
    'vue': 'vue',
    'svelte': 'svelte',
  };
  return langMap[ext || ''];
};

export function DocumentViewer({
  id = "document-viewer",
  filePath,
  content: staticContent,
  title,
  scrollable = true,
}: DocumentViewerProps) {
  const [content, setContent] = useState<string>(staticContent || "");
  const [scrollOffset, setScrollOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language] = useState<string | undefined>(getLanguageFromPath(filePath || ""));

  const { isFocused } = useFocus({ id, autoFocus: false });
  const { stdout } = useStdout();
  const [dimensions, setDimensions] = useState({ columns: 80, rows: 24 });

  // Get terminal dimensions
  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        columns: stdout.columns || 80,
        rows: stdout.rows || 24,
      });
    };

    updateDimensions();
    stdout.on("resize", updateDimensions);
    return () => {
      stdout.off("resize", updateDimensions);
    };
  }, [stdout]);

  // Load file content if path is provided
  useEffect(() => {
    if (filePath) {
      loadFile();
    } else if (staticContent) {
      setContent(staticContent);
    }
  }, [filePath, staticContent]);

  const loadFile = async () => {
    if (!filePath) return;

    setLoading(true);
    setError(null);

    try {
      const file = Bun.file(filePath);
      const text = await file.text();
      setContent(text);
      setScrollOffset(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load file");
      setContent("");
    } finally {
      setLoading(false);
    }
  };

  // Calculate available viewport height based on actual terminal dimensions
  const calculateViewportHeight = () => {
    // Account for:
    // - Border (2 lines top and bottom)
    // - Header (1 line)
    // - Footer when focused (1 line)
    // - Margin/padding (2 lines)
    let reservedLines = 6; // border + header + margins
    if (isFocused && scrollable) reservedLines += 1; // footer
    return Math.max(1, dimensions.rows - reservedLines);
  };

  // Handle scrolling
  useInput((input, key) => {
    if (!isFocused || !scrollable) return;

    const lines = content.split("\n");
    const viewportHeight = calculateViewportHeight();
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
    if (!content) return "";

    const lines = content.split("\n");
    const viewportHeight = calculateViewportHeight();
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
    title || (filePath ? filePath.split("/").pop() : "Document Viewer");
  const lines = content.split("\n");
  const totalLines = lines.length;
  const viewportHeight = calculateViewportHeight();
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

      <Box flexDirection="column" flexGrow={1} overflow="hidden" marginTop={1}>
        {/* Main content */}
        {loading && <Text color="gray">Loading document...</Text>}
        {error && (
          <Box flexGrow={1} flexDirection="column">
            <Text color="red">Error: {error}</Text>
          </Box>
        )}
        {!loading && !error && !content && (
          <Text color="gray">No content to display</Text>
        )}
        {!loading && !error && content && (
          <SyntaxHighlight 
            code={getVisibleContent()} 
            language={language}
          />
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