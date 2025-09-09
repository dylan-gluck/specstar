import { useState, useEffect } from "react";
import { Text, Box, useInput, useFocus } from "ink";
import { readdir } from "node:fs/promises";
import { join, basename } from "node:path";
import FocusBox from "./focus-box";

export type File = {
  name: string;
  path: string;
  isDirectory?: boolean;
};

type FileListProps = {
  id: string;
  title: string;
  files?: File[];
  directory?: string;
  pattern?: RegExp;
  onSelect?: (file: File) => void;
};

export function FileList({ id, title, files: staticFiles, directory, pattern, onSelect }: FileListProps) {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [files, setFiles] = useState<File[]>(staticFiles || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isFocused } = useFocus({ id });

  // Load files from directory if specified
  useEffect(() => {
    if (directory && !staticFiles) {
      loadFiles();
    }
  }, [directory, pattern]);

  const loadFiles = async () => {
    if (!directory) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const entries = await readdir(directory, { withFileTypes: true });
      const loadedFiles: File[] = entries
        .filter(entry => {
          // Filter by pattern if provided
          if (pattern && !pattern.test(entry.name)) {
            return false;
          }
          // Only show files and directories
          return entry.isFile() || entry.isDirectory();
        })
        .map(entry => ({
          name: entry.name,
          path: join(directory, entry.name),
          isDirectory: entry.isDirectory()
        }))
        .sort((a, b) => {
          // Directories first, then alphabetical
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        });
      
      setFiles(loadedFiles);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  useInput((input, key) => {
    if (!isFocused) return;
    
    if (key.upArrow && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
    if (key.downArrow && selectedIndex < files.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
    if (key.return && files[selectedIndex] && onSelect) {
      onSelect(files[selectedIndex]);
    }
    // Add 'r' to refresh directory listing
    if (input === 'r' && directory) {
      loadFiles();
    }
  });

  return (
    <FocusBox id={id} title={title}>
      {loading && <Text color="gray">Loading...</Text>}
      {error && <Text color="red">Error: {error}</Text>}
      {!loading && !error && files.length === 0 && (
        <Text color="gray">No files found</Text>
      )}
      {!loading && !error && files.map((file, index) => (
        <FileItem
          key={file.path || file.name}
          file={file}
          selected={isFocused && selectedIndex === index}
        />
      ))}
      {isFocused && files.length > 0 && (
        <Box marginTop={1}>
          <Text color="gray" dimColor>
            ↑↓ Navigate • Enter Select • R Refresh
          </Text>
        </Box>
      )}
    </FocusBox>
  );
}

function FileItem({ file, selected }: { file: File; selected: boolean }) {
  // Use prefix indicators instead of emojis
  const prefix = file.isDirectory ? '● ' : '  ';
  const displayName = `${prefix}${file.name}`;
  
  return (
    <Box backgroundColor={undefined}>
      <Text color={selected ? "green" : undefined}>
        {displayName}
      </Text>
    </Box>
  );
}
