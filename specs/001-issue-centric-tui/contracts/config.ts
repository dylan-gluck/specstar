/**
 * Application configuration contract.
 *
 * Defines the shape of `config.json`. This type is the single source of truth
 * for both runtime validation and JSON Schema generation.
 *
 * Schema generation:
 *   npx ts-json-schema-generator --path contracts/config.ts --type SpecstarConfig \
 *     --tsconfig tsconfig.json -o specstar.schema.json
 *
 * Format: JSON (not YAML). Config files include a `$schema` field for editor
 * autocompletion.
 *
 * File discovery (highest priority first):
 *   1. $SPECSTAR_CONFIG_FILE — explicit path override
 *   2. $XDG_CONFIG_HOME/specstar/config.json (default: ~/.config/specstar/config.json)
 *   3. ~/.specstar.json
 *   4. .specstar.json in cwd (project-level)
 *
 * Merge strategy: project-level merges onto global. Nested objects shallow-merged;
 * arrays concatenated.
 *
 * @version 1.0.0
 */

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

/**
 * Semantic color roles mapped to base16 terminal slots by default.
 *
 * When absent or empty, all colors resolve to the terminal's current base16
 * palette via ANSI color codes (colors 0-15). Override individual roles with
 * hex color values (e.g., "#ff5555") for a custom theme.
 */
export interface ThemeConfig {
  /** Primary background. Default: terminal base00 (ANSI 0). */
  readonly background?: string;
  /** Panels, selected items. Default: terminal base01 (ANSI 18). */
  readonly backgroundAlt?: string;
  /** Active selection highlight. Default: terminal base02 (ANSI 19). */
  readonly selection?: string;
  /** Inactive text, comments. Default: terminal base03 (ANSI 8). */
  readonly muted?: string;
  /** Primary text. Default: terminal base05 (ANSI 7). */
  readonly foreground?: string;
  /** Headings, emphasis. Default: terminal base06 (ANSI 15). */
  readonly foregroundBright?: string;
  /** Errors, apprvl/error badges. Default: terminal base08 (ANSI 1). */
  readonly error?: string;
  /** Warnings, ci:fail badge. Default: terminal base09 (ANSI 3). */
  readonly warning?: string;
  /** Success, done/ci:pass badges. Default: terminal base0B (ANSI 2). */
  readonly success?: string;
  /** Information, links. Default: terminal base0D (ANSI 4). */
  readonly info?: string;
  /** Active elements, focused borders. Default: terminal base0E (ANSI 5). */
  readonly accent?: string;
  /** Secondary accent, spec badge. Default: terminal base0C (ANSI 6). */
  readonly secondary?: string;
}

// ---------------------------------------------------------------------------
// Integration configs
// ---------------------------------------------------------------------------

export interface LinearConfig {
  readonly apiKey: string;
  readonly teamId: string;
  readonly assignedToMe: boolean;
  /** Filter issues by Linear state names. */
  readonly states?: readonly string[];
  /** Use a saved Linear filter by ID instead of state filtering. */
  readonly filter?: string;
  /** Polling interval in seconds. @default 30 */
  readonly refreshInterval: number;
}

export interface GithubConfig {
  /** "owner/repo" format. Auto-detected from git remote if omitted. */
  readonly repo?: string;
  /** Polling interval in seconds. @default 30 */
  readonly refreshInterval: number;
}

export interface NotionConfig {
  readonly apiKey: string;
  readonly databaseId: string;
  /** Polling interval in seconds. @default 60 */
  readonly refreshInterval: number;
}

export interface SessionsConfig {
  readonly model: string;
  readonly thinkingLevel: "none" | "low" | "medium" | "high";
  readonly maxConcurrent: number;
  /** Base directory for worktree creation. @default "../worktrees" */
  readonly worktreeBase: string;
}

// ---------------------------------------------------------------------------
// Keybindings
// ---------------------------------------------------------------------------

/**
 * User-customizable keyboard bindings.
 *
 * All bindings are configurable via the JSON settings file. Defaults are
 * documented in the generated JSON Schema.
 */
export interface SpecstarKeybindings {
  /** Toggle focus between left and right pane. @default "tab" */
  readonly togglePane: string;
  /** Open command palette. @default "/" */
  readonly openCommandPalette: string;
  /** Refresh all integration data. @default "ctrl+r" */
  readonly refreshAll: string;
  /** Quit application. @default "ctrl+q" */
  readonly quit: string;
  /** Move selection up. @default "up" */
  readonly selectUp: string;
  /** Move selection down. @default "down" */
  readonly selectDown: string;
  /** Primary action (enter detail, open overlay). @default "enter" */
  readonly primaryAction: string;
  /** Switch to next detail tab. @default "right" */
  readonly tabNext: string;
  /** Switch to previous detail tab. @default "left" */
  readonly tabPrev: string;
  /** Approve (session tool call, spec, PR). @default "a" */
  readonly approve: string;
  /** Deny (spec). @default "x" */
  readonly deny: string;
  /** Start new session. @default "n" */
  readonly newSession: string;
  /** Comment (on PR). @default "c" */
  readonly comment: string;
  /** Open in external browser. @default "e" */
  readonly openExternal: string;
  /** Refresh current view data. @default "r" */
  readonly refreshCard: string;
}

// ---------------------------------------------------------------------------
// Root config
// ---------------------------------------------------------------------------

/**
 * Root application configuration.
 *
 * Loaded from `config.json`. Validated against the generated JSON Schema.
 * The `$schema` field enables editor autocompletion.
 */
export interface SpecstarConfig {
  /**
   * JSON Schema reference for editor autocompletion.
   * Generated by ts-json-schema-generator from this type.
   */
  readonly $schema?: string;
  readonly linear?: LinearConfig;
  readonly github?: GithubConfig;
  readonly notion?: NotionConfig;
  readonly sessions: SessionsConfig;
  readonly keybindings: SpecstarKeybindings;
  /**
   * Theme overrides. When absent, the terminal's base16 palette is used.
   * Individual semantic colors can be overridden with hex values.
   */
  readonly theme?: ThemeConfig;
  /** Directories to scan for workflow definition files. */
  readonly workflowDirs: readonly string[];
}
