/**
 * Configuration loading for Specstar.
 *
 * Implements the file discovery chain, merging strategy, defaults,
 * and env var overrides per the config contract.
 *
 * @module config
 */

import type {
  SpecstarConfig,
  SessionsConfig,
  SpecstarKeybindings,
  LinearConfig,
  GithubConfig,
  NotionConfig,
  ThemeConfig,
} from "./types.js";

export type { SpecstarConfig };

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_SESSIONS_CONFIG: SessionsConfig = {
  model: "claude-sonnet",
  thinkingLevel: "high" as const,
  maxConcurrent: 8,
  worktreeBase: "../worktrees",
};

export const DEFAULT_KEYBINDINGS: SpecstarKeybindings = {
  togglePane: "tab",
  openCommandPalette: "/",
  refreshAll: "ctrl+r",
  quit: "ctrl+q",
  selectUp: "up",
  selectDown: "down",
  primaryAction: "enter",
  tabNext: "right",
  tabPrev: "left",
  approve: "a",
  deny: "x",
  newSession: "n",
  comment: "c",
  openExternal: "e",
  refreshCard: "r",
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Build the ordered list of candidate config file paths.
 * Lowest priority first so later entries override earlier ones when merging.
 */
function discoverPaths(cwd: string): string[] {
  const paths: string[] = [];

  // 4. Project-level (lowest priority — merged first, overridden by everything)
  paths.push(resolve(cwd, ".specstar.json"));

  const home = process.env["HOME"];

  const xdg = process.env["XDG_CONFIG_HOME"];
  if (xdg) {
    paths.push(join(xdg, "specstar", "config.json"));
  } else if (home) {
    paths.push(join(home, ".config", "specstar", "config.json"));
  }

  if (home) {
    // 3. ~/.specstar.json
    paths.push(join(home, ".specstar.json"));
  }

  // 1. Explicit env var (highest priority — merged last)
  const explicit = process.env["SPECSTAR_CONFIG_FILE"];
  if (explicit) {
    paths.push(resolve(explicit));
  }

  return paths;
}

/** Try to read and parse a JSON file. Returns undefined on any failure. */
function tryReadJson(path: string): Record<string, unknown> | undefined {
  try {
    if (!existsSync(path)) return undefined;
    const raw = readFileSync(path, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      console.warn(`[specstar:config] Skipping ${path}: not a JSON object`);
      return undefined;
    }
    return parsed as Record<string, unknown>;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[specstar:config] Skipping ${path}: ${msg}`);
    return undefined;
  }
}

/**
 * Shallow-merge two values with array concatenation.
 *
 * - Plain objects: keys from `b` override keys in `a` (one level deep).
 * - Arrays: concatenated (`a` then `b`).
 * - Primitives: `b` wins.
 */
function shallowMerge(a: unknown, b: unknown): unknown {
  if (Array.isArray(a) && Array.isArray(b)) {
    return [...a, ...b];
  }
  if (
    a !== null &&
    b !== null &&
    typeof a === "object" &&
    typeof b === "object" &&
    !Array.isArray(a) &&
    !Array.isArray(b)
  ) {
    return { ...a, ...b };
  }
  return b;
}

/** Merge partial config `b` onto `a` using the shallow-merge strategy. */
function mergeConfigs(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...a };
  for (const key of Object.keys(b)) {
    const existing = result[key];
    const incoming = b[key];
    if (existing !== undefined && incoming !== undefined) {
      result[key] = shallowMerge(existing, incoming);
    } else if (incoming !== undefined) {
      result[key] = incoming;
    }
  }
  return result;
}

/** Apply env-var overrides for API keys. */
function applyEnvOverrides(config: Record<string, unknown>): void {
  const linearKey = process.env["SPECSTAR_LINEAR_API_KEY"];
  if (linearKey) {
    const existing =
      config["linear"] != null && typeof config["linear"] === "object"
        ? (config["linear"] as Record<string, unknown>)
        : {};
    config["linear"] = { ...existing, apiKey: linearKey };
  }

  const notionKey = process.env["SPECSTAR_NOTION_API_KEY"];
  if (notionKey) {
    const existing =
      config["notion"] != null && typeof config["notion"] === "object"
        ? (config["notion"] as Record<string, unknown>)
        : {};
    config["notion"] = { ...existing, apiKey: notionKey };
  }
}

/** Ensure required fields have values by applying defaults. */
function applyDefaults(raw: Record<string, unknown>): SpecstarConfig {
  const sessions = shallowMerge(DEFAULT_SESSIONS_CONFIG, raw["sessions"] ?? {}) as SessionsConfig;

  const keybindings = shallowMerge(
    DEFAULT_KEYBINDINGS,
    raw["keybindings"] ?? {},
  ) as SpecstarKeybindings;

  const workflowDirs = Array.isArray(raw["workflowDirs"])
    ? (raw["workflowDirs"] as readonly string[])
    : [];

  return {
    ...(raw["$schema"] != null ? { $schema: String(raw["$schema"]) } : {}),
    ...(raw["linear"] != null ? { linear: raw["linear"] as LinearConfig } : {}),
    ...(raw["github"] != null ? { github: raw["github"] as GithubConfig } : {}),
    ...(raw["notion"] != null ? { notion: raw["notion"] as NotionConfig } : {}),
    ...(raw["theme"] != null ? { theme: raw["theme"] as ThemeConfig } : {}),
    sessions,
    keybindings,
    workflowDirs,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Load and merge Specstar configuration from the discovery chain.
 *
 * @param cwd - Working directory for project-level config lookup. Defaults to `process.cwd()`.
 * @returns Fully merged configuration with defaults applied.
 */
export function loadConfig(cwd?: string): SpecstarConfig {
  const workdir = cwd ?? process.cwd();
  const paths = discoverPaths(workdir);

  let merged: Record<string, unknown> = {};

  for (const p of paths) {
    const data = tryReadJson(p);
    if (data) {
      merged = mergeConfigs(merged, data);
    }
  }

  applyEnvOverrides(merged);
  return applyDefaults(merged);
}
