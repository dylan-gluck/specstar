/**
 * Base16 semantic theme mapping with ANSI fallback and hex override support.
 *
 * Maps 12 semantic color roles to base16 terminal palette slots by default.
 * Users can override individual roles with hex colors in their config.
 *
 * @module tui/theme
 */

import type { ThemeConfig, StatusBadge } from "../types.js";

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
// ANSI escape code helpers
// ---------------------------------------------------------------------------

/** Standard ANSI foreground color (0-7 -> 30-37, 8-15 -> 90-97). */
function ansiStandard(n: number): string {
  if (n < 8) return `\x1b[${30 + n}m`;
  return `\x1b[${90 + (n - 8)}m`;
}

/** Extended 256-color ANSI foreground. */
function ansiExtended(n: number): string {
  return `\x1b[38;5;${n}m`;
}

// ---------------------------------------------------------------------------
// Default ANSI color mapping (base16 slots)
// ---------------------------------------------------------------------------

/**
 * Default theme using ANSI color codes mapped to base16 terminal palette.
 *
 * | Semantic Role      | Base16 | ANSI |
 * | background         | base00 | 0    |
 * | backgroundAlt      | base01 | 18   |
 * | selection          | base02 | 19   |
 * | muted              | base03 | 8    |
 * | foreground         | base05 | 7    |
 * | foregroundBright   | base06 | 15   |
 * | error              | base08 | 1    |
 * | warning            | base09 | 3    |
 * | success            | base0B | 2    |
 * | info               | base0D | 4    |
 * | accent             | base0E | 5    |
 * | secondary          | base0C | 6    |
 */
export const DEFAULT_THEME: ResolvedTheme = {
  background: ansiStandard(0),
  backgroundAlt: ansiExtended(18),
  selection: ansiExtended(19),
  muted: ansiStandard(8),
  foreground: ansiStandard(7),
  foregroundBright: ansiStandard(15),
  error: ansiStandard(1),
  warning: ansiStandard(3),
  success: ansiStandard(2),
  info: ansiStandard(4),
  accent: ansiStandard(5),
  secondary: ansiStandard(6),
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
 * - If `config` is absent or empty, all colors resolve to ANSI defaults.
 * - If a role has a hex override (e.g. `"#ff5555"`), that value is used as-is.
 * - Otherwise the ANSI default for that role is used.
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
