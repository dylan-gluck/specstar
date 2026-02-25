/**
 * Base16 semantic theme mapping with hex color defaults and override support.
 *
 * Maps 12 semantic color roles to base16 terminal palette slots by default.
 * Users can override individual roles with hex colors in their config.
 *
 * @module tui/theme
 */

import type { ThemeConfig, StatusBadge } from "../types.js";
import { SyntaxStyle } from "@opentui/core";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The 12 semantic color role names. */
export type SemanticColor =
  | "background"
  | "backgroundAlt"
  | "selection"
  | "muted"
  | "foreground"
  | "foregroundBright"
  | "error"
  | "warning"
  | "success"
  | "info"
  | "accent"
  | "secondary";

/** A fully resolved theme where every role has a concrete color value. */
export interface ResolvedTheme {
  readonly background: string;
  readonly backgroundAlt: string;
  readonly selection: string;
  readonly muted: string;
  readonly foreground: string;
  readonly foregroundBright: string;
  readonly error: string;
  readonly warning: string;
  readonly success: string;
  readonly info: string;
  readonly accent: string;
  readonly secondary: string;
}

// ---------------------------------------------------------------------------
// Default hex color mapping (Base16 Default Dark palette)
// ---------------------------------------------------------------------------

/**
 * Default theme using Base16 Default Dark hex colors.
 *
 * | Semantic Role      | Base16 | Hex     |
 * | background         | base00 | #181818 |
 * | backgroundAlt      | base01 | #282828 |
 * | selection          | base02 | #383838 |
 * | muted              | base03 | #585858 |
 * | foreground         | base05 | #d8d8d8 |
 * | foregroundBright   | base06 | #f8f8f8 |
 * | error              | base08 | #ab4642 |
 * | warning            | base09 | #f7ca88 |
 * | success            | base0B | #a1b56c |
 * | info               | base0D | #7cafc2 |
 * | accent             | base0E | #ba8baf |
 * | secondary          | base0C | #86c1b9 |
 */
export const DEFAULT_THEME: ResolvedTheme = {
  background: "#181818",
  backgroundAlt: "#282828",
  selection: "#383838",
  muted: "#585858",
  foreground: "#d8d8d8",
  foregroundBright: "#f8f8f8",
  error: "#ab4642",
  warning: "#f7ca88",
  success: "#a1b56c",
  info: "#7cafc2",
  accent: "#ba8baf",
  secondary: "#86c1b9",
};

// ---------------------------------------------------------------------------
// Theme resolution
// ---------------------------------------------------------------------------

const SEMANTIC_KEYS: readonly SemanticColor[] = [
  "background",
  "backgroundAlt",
  "selection",
  "muted",
  "foreground",
  "foregroundBright",
  "error",
  "warning",
  "success",
  "info",
  "accent",
  "secondary",
] as const;

/**
 * Resolve a theme configuration into concrete color values.
 *
 * - If `config` is absent or empty, all colors resolve to hex defaults.
 * - If a role has a hex override (e.g. `"#ff5555"`), that value is used as-is.
 * - Otherwise the hex default for that role is used.
 */
export function resolveTheme(config?: ThemeConfig): ResolvedTheme {
  if (!config) return DEFAULT_THEME;

  const result: Record<string, string> = {};
  for (const key of SEMANTIC_KEYS) {
    const override = config[key];
    result[key] = override ?? DEFAULT_THEME[key];
  }
  return result as unknown as ResolvedTheme;
}

// ---------------------------------------------------------------------------
// Badge color mapping
// ---------------------------------------------------------------------------

/**
 * Map a status badge to its display color from the resolved theme.
 *
 * | Badge           | Theme Color |
 * | apprvl, error   | error       |
 * | ci:fail         | warning     |
 * | done, ci:pass   | success     |
 * | wrkng           | accent      |
 * | review          | info        |
 * | spec            | secondary   |
 * | idle, draft     | muted       |
 * | merged          | success     |
 * | --              | muted       |
 */
export function badgeColor(badge: StatusBadge, theme: ResolvedTheme): string {
  switch (badge) {
    case "apprvl":
    case "error":
      return theme.error;
    case "ci:fail":
      return theme.warning;
    case "done":
    case "ci:pass":
    case "merged":
      return theme.success;
    case "wrkng":
      return theme.accent;
    case "review":
      return theme.info;
    case "spec":
      return theme.secondary;
    case "idle":
    case "draft":
    case "--":
      return theme.muted;
  }
}

// ---------------------------------------------------------------------------
// Syntax highlighting style
// ---------------------------------------------------------------------------

/**
 * Create a default SyntaxStyle instance for markdown/code rendering.
 * Call once at app startup and share across components.
 */
export function createDefaultSyntaxStyle(): SyntaxStyle {
  return SyntaxStyle.create();
}

export type { SyntaxStyle };
