import { join } from "node:path";

export interface FolderConfig {
  title: string;
  path: string;
}

export interface SpecstarSettings {
  version: string;
  sessionPath: string;
  startPage: 'plan' | 'observe' | 'help';
  folders: FolderConfig[];
  theme: string;
  autoStart: boolean;
  logLevel: string;
}

export async function loadSettings(): Promise<SpecstarSettings> {
  const settingsPath = join(process.cwd(), '.specstar', 'settings.json');
  
  try {
    const file = Bun.file(settingsPath);
    
    if (await file.exists()) {
      const content = await file.text();
      const loadedSettings = JSON.parse(content);
      // Ensure startPage defaults to 'plan' if not set
      return {
        ...loadedSettings,
        startPage: loadedSettings.startPage || 'plan'
      } as SpecstarSettings;
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
  
  // Return default settings if file doesn't exist or fails to load
  return {
    version: "1.0.0",
    sessionPath: ".specstar/sessions",
    startPage: "plan",
    folders: [
      {
        title: "Docs",
        path: "docs"
      },
      {
        title: "Specs",
        path: "specs"
      },
      {
        title: "Templates",
        path: "templates"
      }
    ],
    theme: "dark",
    autoStart: false,
    logLevel: "info"
  };
}

export async function loadFolderFiles(folderPath: string): Promise<Array<{ name: string; path: string }>> {
  const fullPath = join(process.cwd(), folderPath);
  const files: Array<{ name: string; path: string }> = [];
  
  try {
    // Use Bun.glob to find markdown files
    const glob = new Bun.Glob(`${folderPath}/**/*.{md,mdx,txt}`);
    
    for await (const file of glob.scan({ cwd: process.cwd() })) {
      const fileName = file.split('/').pop() || file;
      files.push({
        name: fileName,
        path: join(process.cwd(), file)
      });
    }
  } catch (error) {
    console.error(`Failed to load files from ${folderPath}:`, error);
  }
  
  return files;
}