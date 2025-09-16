import { useState, useEffect } from "react";
import { Box, useInput, useApp, useFocusManager, Text } from "ink";
import { type File, FileList } from "../components/file-list";
import { DocumentViewer } from "../components/document-viewer";
import { LoadingOverlay } from "../components/loading-spinner";
import { Logger } from "../lib/logger/index";
import { ConfigManager, type FolderConfig } from "../lib/config-manager";
import { join } from "node:path";

export default function PlanView() {
  const { exit } = useApp();
  const { focus } = useFocusManager();
  const logger = new Logger("PlanView");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activePane, setActivePane] = useState<string>("1");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [folders, setFolders] = useState<FolderConfig[]>([]);
  const [folderFiles, setFolderFiles] = useState<Record<string, File[]>>({});

  useInput((input) => {
    // Pane navigation for numbered folders
    const folderIndex = parseInt(input) - 1;
    if (folderIndex >= 0 && folderIndex < folders.length) {
      setActivePane(input);
      focus(input);
    }

    // Viewer pane
    if (input === "v") {
      setActivePane("viewer");
      focus("document-viewer");
    }

    // Exit
    if (input === "q") {
      exit();
    }
  });

  useEffect(() => {
    // Load settings and folder files on mount
    const loadConfiguration = async () => {
      setIsLoading(true);
      setLoadingMessage("Loading configuration...");

      try {
        const configManager = new ConfigManager();
        const settings = await configManager.load();
        setFolders(settings.folders || []);

        // Load files for each folder
        const files: Record<string, File[]> = {};
        for (const folder of (settings.folders || [])) {
          setLoadingMessage(`Loading ${folder.title}...`);
          files[folder.path] = await configManager.loadFolderFiles(folder);
        }
        setFolderFiles(files);

        // Focus on first folder by default
        if (settings.folders && settings.folders.length > 0) {
          setActivePane("1");
          focus("1");
        }
      } catch (error) {
        logger.error("Failed to load configuration", error as Error);
      } finally {
        setIsLoading(false);
        setLoadingMessage("");
      }
    };

    loadConfiguration();
  }, []);

  const handleFileSelect = async (file: File) => {
    const timer = logger.startTimer(`Loading ${file.name}`);

    try {
      setIsLoading(true);
      setLoadingMessage(`Loading ${file.name}...`);

      // Simulate async loading (in real app, this would be file processing)
      await new Promise((resolve) => setTimeout(resolve, 100));

      setSelectedFile(file);
      // Auto-switch to viewer when file is selected
      setActivePane("viewer");

      // Delay focus switch slightly to ensure the viewer is rendered
      setTimeout(() => {
        focus("document-viewer");
      }, 50);

      logger.info("File selected", {
        fileName: file.name,
        path: file.path,
      });
    } catch (error) {
      logger.error("Failed to select file", error as Error, { file });
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
      timer();
    }
  };

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
      {/* Main content */}
      <Box flexGrow={1} gap={1}>
        {/* Left column - File Lists */}
        <Box flexBasis="30%" minWidth={30} flexGrow={1} flexDirection="column">
          {folders.map((folder, index) => (
            <FileList
              key={`${folder.path}-${index}`}
              id={String(index + 1)}
              title={folder.title}
              files={folderFiles[folder.path] || []}
              onSelect={handleFileSelect}
            />
          ))}
        </Box>

        {/* Right column - Document Viewer */}
        <Box flexBasis="70%" flexGrow={1} flexDirection="column">
          <DocumentViewer
            id="document-viewer"
            filePath={selectedFile?.path}
            title={selectedFile?.name}
            scrollable={true}
          />
        </Box>
      </Box>

      {/* Footer */}
      <Box>
        <Text color="gray" dimColor>
          {activePane === "viewer" ? (
            <>↑↓/jk Scroll • [1-{folders.length}] Back to List • [Q] Quit</>
          ) : (
            <>
              {folders.length > 0 && `[1-${folders.length}] Select List • `}
              [Enter] Open File • [V] View Document • [Q] Quit
            </>
          )}
        </Text>
      </Box>
    </Box>
  );
}
