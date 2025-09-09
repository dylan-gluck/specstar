import { useState, useEffect } from "react";
import { Box, useInput, useApp, useFocusManager, Text } from "ink";
import { type File, FileList } from "../components/file-list";
import { MarkdownViewer } from "../components/markdown-viewer";
import { LoadingOverlay } from "../components/loading-spinner";
import { Logger } from "../lib/logger/index";
import { join } from "node:path";

export default function PlanView() {
  const { exit } = useApp();
  const { focus } = useFocusManager();
  const logger = new Logger('PlanView');
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activePane, setActivePane] = useState<'docs' | 'specs' | 'templates' | 'viewer'>('specs');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  // Directory paths - using project root
  const projectRoot = process.cwd();
  const specsDir = join(projectRoot, 'specs');
  const docsDir = join(projectRoot, 'docs');
  const templatesDir = join(projectRoot, 'templates');

  useInput((input) => {
    // Pane navigation
    if (input === "1") {
      setActivePane('docs');
      focus("1");
    }
    if (input === "2") {
      setActivePane('specs');
      focus("2");
    }
    if (input === "3") {
      setActivePane('templates');
      focus("3");
    }
    if (input === "4" || input === "v") {
      setActivePane('viewer');
      focus("markdown-viewer");
    }

    // Exit
    if (input === "q") {
      exit();
    }
  });

  useEffect(() => {
    // Focus on specs by default
    focus("2");
  }, []);

  const handleFileSelect = async (file: File) => {
    const timer = logger.startTimer(`Loading ${file.name}`);
    
    try {
      setIsLoading(true);
      setLoadingMessage(`Loading ${file.name}...`);
      
      // Simulate async loading (in real app, this would be file processing)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      setSelectedFile(file);
      // Auto-switch to viewer when file is selected
      setActivePane('viewer');
      focus("markdown-viewer");
      
      logger.info('File selected', { 
        fileName: file.name, 
        path: file.path 
      });
    } catch (error) {
      logger.error('Failed to select file', error as Error, { file });
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
      timer();
    }
  };

  // Static files for docs (can be replaced with dynamic loading)
  const filesDocs: File[] = [
    { name: "README.md", path: join(docsDir, "README.md") },
    { name: "project-plan.md", path: join(docsDir, "project-plan.md") },
    { name: "prd.md", path: join(docsDir, "prd.md") },
    { name: "architecture.md", path: join(docsDir, "architecture.md") },
  ];

  // Static files for templates (can be replaced with dynamic loading)
  const filesTemplates: File[] = [
    { name: "plan-template.md", path: join(templatesDir, "plan-template.md") },
    { name: "spec-template.md", path: join(templatesDir, "spec-template.md") },
    { name: "task-template.md", path: join(templatesDir, "task-template.md") },
  ];

  // Show loading overlay when needed
  if (isLoading) {
    return (
      <LoadingOverlay 
        message={loadingMessage || "Loading..."} 
        submessage="Please wait"
      />
    );
  }

  return (
    <Box flexGrow={1} flexDirection="column">
      {/* Header */}
      <Box marginTop={1} marginX={1} marginBottom={1}>
        <Text bold color="cyan">Specstar Plan View</Text>
        {selectedFile && (
          <Text color="gray"> - {selectedFile.name}</Text>
        )}
      </Box>

      {/* Main content */}
      <Box flexGrow={1} marginX={1} gap={1}>
        {/* Left column - File Lists */}
        <Box width="30%" flexGrow={1} flexDirection="column">
          <FileList 
            id="1" 
            title="Docs" 
            files={filesDocs}
            onSelect={handleFileSelect}
          />
          <FileList 
            id="2" 
            title="Specs" 
            directory={specsDir}
            pattern={/\.(md|txt)$/}
            onSelect={handleFileSelect}
          />
          <FileList 
            id="3" 
            title="Templates" 
            files={filesTemplates}
            onSelect={handleFileSelect}
          />
        </Box>
        
        {/* Right column - Markdown Viewer */}
        <Box width="70%" flexGrow={1} flexDirection="column">
          <MarkdownViewer 
            id="markdown-viewer"
            filePath={selectedFile?.path}
            title={selectedFile?.name}
            scrollable={true}
          />
        </Box>
      </Box>

      {/* Footer */}
      <Box marginTop={1} marginX={1}>
        <Text color="gray" dimColor>
          [1-3] Select List • [4/V] View Document • [Q] Quit
        </Text>
      </Box>
    </Box>
  );
}