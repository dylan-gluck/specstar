/**
 * Settings Model
 * Application configuration and user preferences
 */

export interface ThemeSettings {
  primaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  borderStyle?: 'single' | 'double' | 'round' | 'bold' | 'none';
  syntax?: 'monokai' | 'github' | 'dracula' | 'nord' | 'auto';
}

export interface HookSettings {
  enabled: boolean;
  path?: string;
  onSessionStart?: boolean;
  onSessionEnd?: boolean;
  onFileChange?: boolean;
  onCommand?: boolean;
  onError?: boolean;
}

export enum LogLevel {
  None = 'none',
  Error = 'error',
  Warn = 'warn',
  Info = 'info',
  Debug = 'debug',
  Verbose = 'verbose'
}

export interface Settings {
  version: string;
  sessionPath: string;
  hooks: HookSettings;
  theme: ThemeSettings;
  autoStart: boolean;
  logLevel: LogLevel;
  watchInterval?: number;
  maxSessionHistory?: number;
  enableNotifications?: boolean;
  keybindings?: Record<string, string>;
  plugins?: Array<{
    name: string;
    enabled: boolean;
    config?: Record<string, unknown>;
  }>;
}

/**
 * Validation functions
 */
export function isValidThemeSettings(theme: unknown): theme is ThemeSettings {
  if (typeof theme !== 'object' || theme === null) return false;
  const t = theme as Record<string, unknown>;
  
  const validBorderStyles = ['single', 'double', 'round', 'bold', 'none'];
  const validSyntaxThemes = ['monokai', 'github', 'dracula', 'nord', 'auto'];
  
  return (
    (t.primaryColor === undefined || typeof t.primaryColor === 'string') &&
    (t.accentColor === undefined || typeof t.accentColor === 'string') &&
    (t.backgroundColor === undefined || typeof t.backgroundColor === 'string') &&
    (t.textColor === undefined || typeof t.textColor === 'string') &&
    (t.borderStyle === undefined || validBorderStyles.includes(t.borderStyle as string)) &&
    (t.syntax === undefined || validSyntaxThemes.includes(t.syntax as string))
  );
}

export function isValidHookSettings(hooks: unknown): hooks is HookSettings {
  if (typeof hooks !== 'object' || hooks === null) return false;
  const h = hooks as Record<string, unknown>;
  
  return (
    typeof h.enabled === 'boolean' &&
    (h.path === undefined || typeof h.path === 'string') &&
    (h.onSessionStart === undefined || typeof h.onSessionStart === 'boolean') &&
    (h.onSessionEnd === undefined || typeof h.onSessionEnd === 'boolean') &&
    (h.onFileChange === undefined || typeof h.onFileChange === 'boolean') &&
    (h.onCommand === undefined || typeof h.onCommand === 'boolean') &&
    (h.onError === undefined || typeof h.onError === 'boolean')
  );
}

export function isValidSettings(settings: unknown): settings is Settings {
  if (typeof settings !== 'object' || settings === null) return false;
  const s = settings as Record<string, unknown>;
  
  return (
    typeof s.version === 'string' &&
    typeof s.sessionPath === 'string' &&
    isValidHookSettings(s.hooks) &&
    isValidThemeSettings(s.theme) &&
    typeof s.autoStart === 'boolean' &&
    Object.values(LogLevel).includes(s.logLevel as LogLevel) &&
    (s.watchInterval === undefined || typeof s.watchInterval === 'number') &&
    (s.maxSessionHistory === undefined || typeof s.maxSessionHistory === 'number') &&
    (s.enableNotifications === undefined || typeof s.enableNotifications === 'boolean') &&
    (s.keybindings === undefined || typeof s.keybindings === 'object') &&
    (s.plugins === undefined || Array.isArray(s.plugins))
  );
}

/**
 * Factory functions
 */
export function createThemeSettings(params?: Partial<ThemeSettings>): ThemeSettings {
  return {
    primaryColor: params?.primaryColor || '#00ff00',
    accentColor: params?.accentColor || '#0099ff',
    backgroundColor: params?.backgroundColor || '#000000',
    textColor: params?.textColor || '#ffffff',
    borderStyle: params?.borderStyle || 'single',
    syntax: params?.syntax || 'auto'
  };
}

export function createHookSettings(params?: Partial<HookSettings>): HookSettings {
  return {
    enabled: params?.enabled ?? false,
    path: params?.path || '.specstar/hooks.ts',
    onSessionStart: params?.onSessionStart ?? true,
    onSessionEnd: params?.onSessionEnd ?? true,
    onFileChange: params?.onFileChange ?? false,
    onCommand: params?.onCommand ?? false,
    onError: params?.onError ?? true
  };
}

export function createSettings(params?: Partial<Settings>): Settings {
  return {
    version: params?.version || '1.0.0',
    sessionPath: params?.sessionPath || '.specstar/sessions',
    hooks: params?.hooks || createHookSettings(),
    theme: params?.theme || createThemeSettings(),
    autoStart: params?.autoStart ?? false,
    logLevel: params?.logLevel || LogLevel.Info,
    watchInterval: params?.watchInterval || 1000,
    maxSessionHistory: params?.maxSessionHistory || 50,
    enableNotifications: params?.enableNotifications ?? false,
    keybindings: params?.keybindings || getDefaultKeybindings(),
    plugins: params?.plugins || []
  };
}

/**
 * Serialization/Deserialization
 */
export function serializeSettings(settings: Settings): string {
  return JSON.stringify(settings, null, 2);
}

export function deserializeSettings(data: string): Settings {
  const parsed = JSON.parse(data);
  if (!isValidSettings(parsed)) {
    throw new Error('Invalid settings data');
  }
  return parsed;
}

/**
 * Settings operations
 */
export function updateTheme(settings: Settings, theme: Partial<ThemeSettings>): Settings {
  return {
    ...settings,
    theme: {
      ...settings.theme,
      ...theme
    }
  };
}

export function updateHooks(settings: Settings, hooks: Partial<HookSettings>): Settings {
  return {
    ...settings,
    hooks: {
      ...settings.hooks,
      ...hooks
    }
  };
}

export function setLogLevel(settings: Settings, logLevel: LogLevel): Settings {
  return {
    ...settings,
    logLevel
  };
}

export function addPlugin(
  settings: Settings,
  plugin: { name: string; enabled: boolean; config?: Record<string, unknown> }
): Settings {
  return {
    ...settings,
    plugins: [...(settings.plugins || []), plugin]
  };
}

export function removePlugin(settings: Settings, pluginName: string): Settings {
  return {
    ...settings,
    plugins: settings.plugins?.filter(p => p.name !== pluginName) || []
  };
}

export function updateKeybinding(settings: Settings, key: string, command: string): Settings {
  return {
    ...settings,
    keybindings: {
      ...settings.keybindings,
      [key]: command
    }
  };
}

/**
 * Settings validation and migration
 */
export function validateSettings(settings: unknown): settings is Settings {
  return isValidSettings(settings);
}

export function migrateSettings(oldSettings: Record<string, unknown>): Settings {
  // Handle migration from older versions
  const version = oldSettings.version as string || '0.0.0';
  
  // Create new settings with defaults
  const newSettings = createSettings();
  
  // Copy over valid properties
  if (typeof oldSettings.sessionPath === 'string') {
    newSettings.sessionPath = oldSettings.sessionPath;
  }
  
  if (typeof oldSettings.autoStart === 'boolean') {
    newSettings.autoStart = oldSettings.autoStart;
  }
  
  if (isValidHookSettings(oldSettings.hooks)) {
    newSettings.hooks = oldSettings.hooks;
  }
  
  if (isValidThemeSettings(oldSettings.theme)) {
    newSettings.theme = oldSettings.theme;
  }
  
  if (Object.values(LogLevel).includes(oldSettings.logLevel as LogLevel)) {
    newSettings.logLevel = oldSettings.logLevel as LogLevel;
  }
  
  return newSettings;
}

/**
 * Default keybindings
 */
function getDefaultKeybindings(): Record<string, string> {
  return {
    'ctrl+c': 'quit',
    'q': 'quit',
    'tab': 'switchView',
    'up': 'focusPrevious',
    'down': 'focusNext',
    'left': 'navigateBack',
    'right': 'navigateForward',
    'enter': 'select',
    'space': 'toggleExpand',
    '/': 'search',
    'r': 'refresh',
    'h': 'toggleHelp',
    'l': 'toggleLog',
    's': 'toggleSettings'
  };
}

/**
 * Default settings
 */
export const DEFAULT_SETTINGS: Settings = createSettings();