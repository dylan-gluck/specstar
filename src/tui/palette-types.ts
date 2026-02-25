/**
 * Shared types for the command palette system.
 *
 * All command modules (linear, github, notion, session, workflow) export
 * functions that return `PaletteCommand[]`. The command palette component
 * aggregates and filters them based on the current `PaletteContext`.
 *
 * @module tui/palette-types
 */

import type { EnrichedIssue, UnlinkedItem, WorkerSession } from "../types.js";
import type { SessionPoolWithHandles } from "../sessions/pool.js";
import type { ResolvedTheme } from "./theme.js";

// ---------------------------------------------------------------------------
// Command categories
// ---------------------------------------------------------------------------

export type PaletteCategory = "Issue" | "Session" | "PR" | "Spec" | "Worktree" | "Global";

// ---------------------------------------------------------------------------
// Palette command
// ---------------------------------------------------------------------------

/** A single action available in the command palette. */
export interface PaletteCommand {
  /** Unique identifier (e.g. "linear.capture-issue"). */
  readonly id: string;
  /** Display label in the palette list. */
  readonly label: string;
  /** Category for grouping. */
  readonly category: PaletteCategory;
  /** Short description shown below the label. */
  readonly description: string;
  /** Keyboard shortcut hint (display only, not bound here). */
  readonly shortcut?: string;
  /**
   * Whether this command is visible in the current context.
   * Returns true if the command should be shown.
   */
  readonly isVisible: (ctx: PaletteContext) => boolean;
  /**
   * Execute the command. Returns a promise that resolves when done.
   */
  readonly execute: (ctx: PaletteContext) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Palette context — the state snapshot provided to every command
// ---------------------------------------------------------------------------

/** Context provided to palette commands for visibility checks and execution. */
export interface PaletteContext {
  /** The currently selected enriched issue, if any. */
  readonly selectedIssue: EnrichedIssue | undefined;
  /** The currently selected unlinked item, if any. */
  readonly selectedUnlinked: UnlinkedItem | undefined;
  /** All active sessions. */
  readonly sessions: readonly WorkerSession[];
  /** Session pool for spawning/destroying sessions. */
  readonly pool: SessionPoolWithHandles;
  /** Toast notification callbacks. */
  readonly toast: {
    success: (msg: string) => void;
    error: (msg: string) => void;
    warning: (msg: string) => void;
    info: (msg: string) => void;
  };
  /** Prompt user for text input. Returns undefined if cancelled. */
  readonly promptInput: (label: string, placeholder?: string) => Promise<string | undefined>;
  /** Refresh all integration data. */
  readonly refreshAll: () => Promise<void>;
  /** Refresh specific integration data. */
  readonly refreshLinear: () => Promise<void>;
  readonly refreshGithub: () => Promise<void>;
  readonly refreshNotion: () => Promise<void>;
  /** Current git branch name. */
  readonly currentBranch: string | undefined;
  /** Theme for UI rendering. */
  readonly theme: ResolvedTheme;
  /** Start a workflow by ID. */
  readonly startWorkflow?: (workflowId: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Fuzzy match utility
// ---------------------------------------------------------------------------

/**
 * Simple fuzzy match: checks if all characters of the query appear in order
 * within the target string (case-insensitive). Returns match score (lower = better)
 * or -1 if no match.
 */
export function fuzzyMatch(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  if (q.length === 0) return 0;
  if (q.length > t.length) return -1;

  let qi = 0;
  let score = 0;
  let lastMatchIdx = -1;

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      // Bonus for consecutive matches
      if (lastMatchIdx === ti - 1) {
        score += 0;
      } else {
        score += ti - (lastMatchIdx === -1 ? 0 : lastMatchIdx);
      }
      lastMatchIdx = ti;
      qi++;
    }
  }

  // All query chars matched?
  return qi === q.length ? score : -1;
}
