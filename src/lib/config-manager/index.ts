import { join, dirname } from "path";
import { homedir } from "os";

// Type definitions for hooks
export interface SessionContext {
  sessionId: string;
  projectPath: string;
  startTime: Date;
  endTime?: Date;
  metadata?: Record<string, any>;
}

export interface FileChangeEvent {
  type: 'create' | 'modify' | 'delete';
  path: string;
  timestamp: Date;
  sessionId: string;
  content?: string;
}

export interface ConfigManagerOptions {
  configPath?: string;
}

export interface FolderConfig {
  title: string;
  path: string;
}

export interface SpecstarConfig {
  version: string;
  startPage?: 'plan' | 'observe' | 'help';
  folders?: FolderConfig[];
  theme?: 'light' | 'dark';
  autoStart?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export interface InitOptions {
  force?: boolean;
  updateClaudeSettings?: boolean;
  claudeSettingsPath?: string;
}

export interface ClaudeCodeSettings {
  version?: string;
  hooks?: {
    specstar?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

// Default configuration
const DEFAULT_CONFIG: SpecstarConfig = {
  version: '1.0.0',
  startPage: 'plan',
  folders: [
    {
      title: 'Docs',
      path: 'docs'
    },
    {
      title: 'Specs',
      path: 'specs'
    },
    {
      title: 'Templates',
      path: 'templates'
    }
  ],
  theme: 'dark',
  autoStart: false,
  logLevel: 'info'
};

// Default hooks.ts template
const DEFAULT_HOOKS_TEMPLATE = `/**
 * Specstar Hooks Configuration
 * 
 * This file defines lifecycle hooks for Claude Code sessions.
 * Each hook receives a context object with session information.
 */

import type { SessionContext, FileChangeEvent } from 'specstar';

/**
 * Called before a new Claude Code session starts
 */
export async function beforeSession(context: SessionContext): Promise<void> {
  console.log('Starting session:', context.sessionId);
  // Add your custom logic here
}

/**
 * Called after a Claude Code session ends
 */
export async function afterSession(context: SessionContext): Promise<void> {
  console.log('Session ended:', context.sessionId);
  // Add your custom logic here
}

/**
 * Called when files are changed during a session
 */
export async function onFileChange(event: FileChangeEvent): Promise<void> {
  console.log('File changed:', event.path);
  // Add your custom logic here
}
`;

export class ConfigManager {
  private configPath: string;
  private specstarDir: string;
  
  constructor(options?: ConfigManagerOptions) {
    // Default to .specstar in current working directory
    this.specstarDir = options?.configPath || join(process.cwd(), '.specstar');
    this.configPath = join(this.specstarDir, 'settings.json');
  }

  /**
   * Initialize a new .specstar directory with default configuration
   */
  async init(projectPath: string, options?: InitOptions): Promise<void> {
    const targetDir = join(projectPath, '.specstar');
    const settingsPath = join(targetDir, 'settings.json');
    const sessionsDir = join(targetDir, 'sessions');
    const hooksPath = join(targetDir, 'hooks.ts');
    
    try {
      // Check if .specstar already exists by checking for settings.json
      const existingConfig = await Bun.file(settingsPath).exists();
      if (existingConfig && !options?.force) {
        throw new Error(`.specstar directory already exists at ${targetDir}. Use --force to overwrite.`);
      }
      
      // Create .specstar directory structure
      await this.createDirectory(targetDir);
      await this.createDirectory(sessionsDir);
      
      // Create default settings.json
      const config = { ...DEFAULT_CONFIG };
      await Bun.write(settingsPath, JSON.stringify(config, null, 2));
      
      // Create default hooks.ts using the comprehensive template
      const templatePath = join(dirname(import.meta.url.replace('file://', '')), 'templates', 'hooks.ts');
      let hooksTemplate = DEFAULT_HOOKS_TEMPLATE;
      
      try {
        // Try to use the comprehensive template if available
        const templateFile = Bun.file(templatePath);
        if (await templateFile.exists()) {
          hooksTemplate = await templateFile.text();
        }
      } catch {
        // Fall back to embedded template
      }
      
      await Bun.write(hooksPath, hooksTemplate);
      
      // Create .gitignore to exclude sessions
      const gitignorePath = join(targetDir, '.gitignore');
      await Bun.write(gitignorePath, 'sessions/\nlogs/\n*.log\n*.tmp\n');
      
      // Update Claude Code settings.json if requested
      if (options?.updateClaudeSettings !== false) {
        await this.updateClaudeCodeSettings(projectPath, hooksPath, options?.claudeSettingsPath);
      }
      
    } catch (error) {
      if (error instanceof Error && !error.message.includes('already exists')) {
        throw new Error(`Failed to initialize .specstar: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Load configuration from settings.json
   */
  async load(): Promise<SpecstarConfig> {
    try {
      const file = Bun.file(this.configPath);
      
      // Check if config file exists
      if (!await file.exists()) {
        throw new Error(`Configuration file not found at ${this.configPath}. Run 'specstar --init' to initialize.`);
      }
      
      const configText = await file.text();
      const config = JSON.parse(configText);
      
      // Validate the loaded configuration
      if (!this.validate(config)) {
        throw new Error('Invalid configuration format');
      }
      
      return config;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to load configuration: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Save configuration to settings.json
   */
  async save(config: SpecstarConfig): Promise<void> {
    try {
      // Validate configuration before saving
      if (!this.validate(config)) {
        throw new Error('Invalid configuration format');
      }
      
      // Ensure directory exists
      await this.createDirectory(this.specstarDir);
      
      // Write configuration file
      await Bun.write(this.configPath, JSON.stringify(config, null, 2));
      
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to save configuration: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Validate configuration against schema
   */
  validate(config: any): config is SpecstarConfig {
    // Check if config is an object
    if (!config || typeof config !== 'object') {
      return false;
    }
    
    // Required field: version
    if (typeof config.version !== 'string' || !config.version) {
      return false;
    }
    
    // Optional field: startPage
    if (config.startPage !== undefined && 
        !['plan', 'observe', 'help'].includes(config.startPage)) {
      return false;
    }
    
    // Optional field: folders (array of folder configs)
    if (config.folders !== undefined) {
      if (!Array.isArray(config.folders)) {
        return false;
      }
      if (!config.folders.every((folder: any) => 
        folder && typeof folder === 'object' &&
        typeof folder.title === 'string' &&
        typeof folder.path === 'string'
      )) {
        return false;
      }
    }
    
    // Optional field: theme
    if (config.theme !== undefined) {
      if (config.theme !== 'light' && config.theme !== 'dark') {
        return false;
      }
    }
    
    // Optional field: autoStart
    if (config.autoStart !== undefined && typeof config.autoStart !== 'boolean') {
      return false;
    }
    
    // Optional field: logLevel
    if (config.logLevel !== undefined) {
      const validLevels = ['debug', 'info', 'warn', 'error'];
      if (!validLevels.includes(config.logLevel)) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Get the path to the .specstar directory
   */
  getSpecstarDir(): string {
    return this.specstarDir;
  }
  
  /**
   * Get the path to the sessions directory
   */
  getSessionsDir(): string {
    return join(this.specstarDir, 'sessions');
  }
  
  /**
   * Get the path to the hooks file
   */
  getHooksPath(): string {
    return join(this.specstarDir, 'hooks.ts');
  }
  
  /**
   * Update Claude Code settings.json to include Specstar hooks
   * ONLY updates .claude/settings.json in the project directory
   */
  async updateClaudeCodeSettings(
    projectPath: string,
    hooksPath: string,
    customSettingsPath?: string
  ): Promise<void> {
    try {
      // ONLY update .claude/settings.json in the project directory
      const claudeDir = join(projectPath, '.claude');
      const settingsPath = join(claudeDir, 'settings.json');
      
      // Create .claude directory if it doesn't exist
      await this.createDirectory(claudeDir);
      
      // Load existing settings or create new
      let settings: ClaudeCodeSettings = {};
      try {
        const file = Bun.file(settingsPath);
        if (await file.exists()) {
          const content = await file.text();
          settings = JSON.parse(content);
          
          // Create backup of existing settings
          const backupPath = join(claudeDir, 'settings.backup.json');
          await Bun.write(backupPath, content);
          console.log(`📋 Created backup at: ${backupPath}`);
        }
      } catch (error) {
        // Settings file doesn't exist or is invalid, start fresh
        console.log('📝 Creating new Claude Code settings.json');
      }
      
      // Add the exact hooks configuration from docs/specstar-hooks.md
      settings.hooks = {
        "Notification": [
          {
            "hooks": [
              {
                "command": `bun run $CLAUDE_PROJECT_DIR/.specstar/hooks.ts notification`,
                "type": "command"
              }
            ]
          }
        ],
        "PostToolUse": [
          {
            "hooks": [
              {
                "command": `bun run $CLAUDE_PROJECT_DIR/.specstar/hooks.ts post_tool_use`,
                "type": "command"
              }
            ]
          }
        ],
        "PreCompact": [
          {
            "hooks": [
              {
                "command": `bun run $CLAUDE_PROJECT_DIR/.specstar/hooks.ts pre_compact`,
                "type": "command"
              }
            ]
          }
        ],
        "PreToolUse": [
          {
            "hooks": [
              {
                "command": `bun run $CLAUDE_PROJECT_DIR/.specstar/hooks.ts pre_tool_use`,
                "type": "command"
              }
            ]
          }
        ],
        "SessionEnd": [
          {
            "hooks": [
              {
                "command": `bun run $CLAUDE_PROJECT_DIR/.specstar/hooks.ts session_end`,
                "type": "command"
              }
            ]
          }
        ],
        "SessionStart": [
          {
            "hooks": [
              {
                "command": `bun run $CLAUDE_PROJECT_DIR/.specstar/hooks.ts session_start`,
                "type": "command"
              }
            ]
          }
        ],
        "Stop": [
          {
            "hooks": [
              {
                "command": `bun run $CLAUDE_PROJECT_DIR/.specstar/hooks.ts stop`,
                "type": "command"
              }
            ]
          }
        ],
        "SubagentStop": [
          {
            "hooks": [
              {
                "command": `bun run $CLAUDE_PROJECT_DIR/.specstar/hooks.ts subagent_stop`,
                "type": "command"
              }
            ]
          }
        ],
        "UserPromptSubmit": [
          {
            "hooks": [
              {
                "command": `bun run $CLAUDE_PROJECT_DIR/.specstar/hooks.ts user_prompt_submit`,
                "type": "command"
              }
            ]
          }
        ]
      };
      
      // Write updated settings
      await Bun.write(settingsPath, JSON.stringify(settings, null, 2));
      
      console.log(`✅ Updated Claude Code settings at: ${settingsPath}`);
      console.log(`   Hooks configured for all 9 Claude Code events`);
      console.log(`   Using hooks script: $CLAUDE_PROJECT_DIR/.specstar/hooks.ts`);
      
    } catch (error) {
      // Don't fail initialization if Claude settings update fails
      console.warn('⚠️  Could not update Claude Code settings:', error);
      console.warn('   You can manually add the hooks to .claude/settings.json in your project.');
    }
  }
  
  /**
   * Helper method to create a directory
   */
  private async createDirectory(path: string): Promise<void> {
    // Use Bun's $ shell API to create directory
    const { $ } = await import('bun');
    await $`mkdir -p ${path}`.quiet();
  }
}

export default ConfigManager;