import type {
  Worktree,
  WorktreePath,
  WorktreeManager,
  WorktreeError,
} from "../../../specs/001-issue-centric-tui/contracts/github.js";

import { worktreePath } from "../../types.js";

// ---------------------------------------------------------------------------
// Typed error class wrapping WorktreeError discriminated union
// ---------------------------------------------------------------------------

class WorktreeManagerError extends Error {
  readonly error: WorktreeError;
  constructor(error: WorktreeError) {
    super(error.message);
    this.name = "WorktreeManagerError";
    this.error = error;
  }
}

// ---------------------------------------------------------------------------
// Git CLI helper
// ---------------------------------------------------------------------------

async function runGit(args: string[]): Promise<string> {
  let proc: ReturnType<typeof Bun.spawn>;

  try {
    proc = Bun.spawn(["git", ...args], {
      stdout: "pipe",
      stderr: "pipe",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new WorktreeManagerError({
      type: "worktree_git",
      cause: err,
      message: `Failed to spawn git: ${msg}`,
    });
  }

  const stdout = await new Response(proc.stdout as ReadableStream).text();
  const stderr = await new Response(proc.stderr as ReadableStream).text();
  const exitCode = await proc.exited;

  if (exitCode === 0) return stdout;

  const lower = stderr.toLowerCase();

  if (
    lower.includes("already checked out") ||
    lower.includes("is already a worktree") ||
    lower.includes("already exists")
  ) {
    // Extract branch name from stderr if possible, fallback to args
    const branchMatch = /branch '([^']+)'/.exec(stderr) ?? /'([^']+)'/.exec(stderr);
    const branch = branchMatch?.[1] ?? args.join(" ");
    throw new WorktreeManagerError({
      type: "worktree_branch_exists",
      branch,
      message: stderr.trim() || `Branch already exists as worktree`,
    });
  }

  if (
    lower.includes("not a working tree") ||
    lower.includes("no such file") ||
    lower.includes("is not a valid path") ||
    lower.includes("does not exist") ||
    lower.includes("not a git working tree")
  ) {
    const pathMatch = /'([^']+)'/.exec(stderr);
    throw new WorktreeManagerError({
      type: "worktree_not_found",
      path: pathMatch?.[1] ?? args.join(" "),
      message: stderr.trim() || "Worktree path not found",
    });
  }

  throw new WorktreeManagerError({
    type: "worktree_git",
    cause: new Error(stderr.trim()),
    message: stderr.trim() || `git ${args[0]} failed with exit code ${exitCode}`,
  });
}

// ---------------------------------------------------------------------------
// Porcelain parser
// ---------------------------------------------------------------------------

interface PorcelainEntry {
  path: string;
  head: string;
  branch: string;
}

function parsePorcelain(output: string): PorcelainEntry[] {
  const entries: PorcelainEntry[] = [];
  // Entries are separated by blank lines; each entry has key-value lines
  const blocks = output.split(/\n\n+/).filter((b) => b.trim().length > 0);

  for (const block of blocks) {
    let path = "";
    let head = "";
    let branch = "";

    for (const line of block.split("\n")) {
      if (line.startsWith("worktree ")) {
        path = line.slice("worktree ".length);
      } else if (line.startsWith("HEAD ")) {
        head = line.slice("HEAD ".length);
      } else if (line.startsWith("branch ")) {
        // Strip refs/heads/ prefix
        const raw = line.slice("branch ".length);
        branch = raw.startsWith("refs/heads/") ? raw.slice("refs/heads/".length) : raw;
      }
    }

    if (path) {
      entries.push({ path, head, branch });
    }
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Dirty check
// ---------------------------------------------------------------------------

async function isDirty(path: string): Promise<boolean> {
  const output = await runGit(["-C", path, "status", "--porcelain"]);
  return output.trim().length > 0;
}

// ---------------------------------------------------------------------------
// Branch name sanitization for directory names
// ---------------------------------------------------------------------------

function sanitizeBranchForDir(branch: string): string {
  return branch.replace(/\//g, "-");
}

// ---------------------------------------------------------------------------
// Ensure directory exists
// ---------------------------------------------------------------------------

import { mkdir } from "node:fs/promises";

async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

import { join } from "node:path";

export function createWorktreeManager(worktreeBase: string): WorktreeManager {
  return {
    async list(): Promise<readonly Worktree[]> {
      const raw = await runGit(["worktree", "list", "--porcelain"]);
      const entries = parsePorcelain(raw);

      const worktrees: Worktree[] = [];
      for (const entry of entries) {
        const dirty = await isDirty(entry.path);
        worktrees.push({
          path: worktreePath(entry.path),
          branch: entry.branch,
          commit: entry.head,
          dirty,
        });
      }

      return worktrees;
    },

    async create(branch: string, baseBranch?: string): Promise<Worktree> {
      await ensureDir(worktreeBase);

      const dirName = sanitizeBranchForDir(branch);
      const wtPath = join(worktreeBase, dirName);

      try {
        // Try creating a new branch in a new worktree
        const args = ["worktree", "add", wtPath, "-b", branch];
        if (baseBranch) args.push(baseBranch);
        await runGit(args);
      } catch (err: unknown) {
        if (err instanceof WorktreeManagerError && err.error.type === "worktree_branch_exists") {
          // Branch already exists; try checking out existing branch
          await runGit(["worktree", "add", wtPath, branch]);
        } else {
          throw err;
        }
      }

      // Read back the created worktree's state
      try {
        const dirty = await isDirty(wtPath);
        const logOutput = await runGit(["-C", wtPath, "log", "-1", "--format=%H"]);
        const branchOutput = await runGit(["-C", wtPath, "rev-parse", "--abbrev-ref", "HEAD"]);

        return {
          path: worktreePath(wtPath),
          branch: branchOutput.trim(),
          commit: logOutput.trim(),
          dirty,
        };
      } catch (err) {
        try {
          await runGit(["worktree", "remove", "--force", wtPath]);
        } catch {
          // Best-effort cleanup
        }
        throw err;
      }
    },

    async remove(path: WorktreePath): Promise<void> {
      await runGit(["worktree", "remove", path, "--force"]);
    },

    async sync(path: WorktreePath): Promise<void> {
      await runGit(["-C", path, "pull", "--rebase"]);
    },
  };
}
