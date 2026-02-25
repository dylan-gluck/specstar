import type {
  GithubPR,
  GithubClient,
  CreatePROptions,
  PrNumber,
  GithubError,
} from "../../contracts/github.js";

// ---------------------------------------------------------------------------
// Typed error class wrapping GithubError discriminated union
// ---------------------------------------------------------------------------

class GithubClientError extends Error {
  readonly error: GithubError;
  constructor(error: GithubError) {
    super(error.message);
    this.name = "GithubClientError";
    this.error = error;
  }
}

// ---------------------------------------------------------------------------
// Ticket ID extraction from branch name
// ---------------------------------------------------------------------------

const TICKET_RE = /^([A-Z]+-\d+)/i;

function extractTicketId(headRef: string): string | undefined {
  // Try full branch name first
  const direct = TICKET_RE.exec(headRef);
  if (direct) return direct[1]!.toUpperCase();

  // Try after last `/` for patterns like `feature/AUTH-142-fix`
  const lastSlash = headRef.lastIndexOf("/");
  if (lastSlash !== -1) {
    const afterSlash = TICKET_RE.exec(headRef.slice(lastSlash + 1));
    if (afterSlash) return afterSlash[1]!.toUpperCase();
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// CI status derivation
// ---------------------------------------------------------------------------

interface StatusCheckRollupNode {
  readonly status?: string;
  readonly conclusion?: string | null;
  readonly state?: string;
}

function deriveCiStatus(
  rollup: readonly StatusCheckRollupNode[] | null | undefined,
): GithubPR["ciStatus"] {
  if (!rollup || rollup.length === 0) return "none";

  let hasPending = false;

  for (const check of rollup) {
    // CheckRun uses `status` + `conclusion`; StatusContext uses `state`
    const state = check.state?.toUpperCase();
    const status = check.status?.toUpperCase();
    const conclusion = check.conclusion?.toUpperCase();

    if (state === "FAILURE" || state === "ERROR") return "fail";
    if (conclusion === "FAILURE" || conclusion === "TIMED_OUT" || conclusion === "CANCELLED")
      return "fail";
    if (
      state === "PENDING" ||
      status === "IN_PROGRESS" ||
      status === "QUEUED" ||
      status === "WAITING" ||
      status === "PENDING"
    ) {
      hasPending = true;
    }
    if (!conclusion && status === "COMPLETED") {
      // completed with no conclusion — treat as pending
      hasPending = true;
    }
  }

  if (hasPending) return "pending";
  return "pass";
}

// ---------------------------------------------------------------------------
// gh JSON shape (what `gh pr list/view --json` returns)
// ---------------------------------------------------------------------------

interface GhPRJson {
  readonly number: number;
  readonly title: string;
  readonly author: { readonly login: string };
  readonly state: string;
  readonly headRefName: string;
  readonly url: string;
  readonly updatedAt: string;
  readonly statusCheckRollup: readonly StatusCheckRollupNode[] | null;
  readonly reviewDecision: string | null;
  readonly isDraft?: boolean;
}

// ---------------------------------------------------------------------------
// Map raw JSON to domain type
// ---------------------------------------------------------------------------

function mapPR(raw: GhPRJson): GithubPR {
  let state: GithubPR["state"];
  if (raw.isDraft) {
    state = "draft";
  } else {
    switch (raw.state) {
      case "OPEN":
        state = "open";
        break;
      case "CLOSED":
        state = "closed";
        break;
      case "MERGED":
        state = "merged";
        break;
      default:
        state = "open";
    }
  }

  let reviewDecision: GithubPR["reviewDecision"] = null;
  if (raw.reviewDecision) {
    const rd = raw.reviewDecision.toLowerCase();
    if (rd === "approved") reviewDecision = "approved";
    else if (rd === "changes_requested") reviewDecision = "changes_requested";
    else if (rd === "review_required") reviewDecision = "review_required";
  }

  return {
    number: raw.number as PrNumber,
    title: raw.title,
    author: raw.author.login,
    state,
    ciStatus: deriveCiStatus(raw.statusCheckRollup),
    reviewDecision,
    headRef: raw.headRefName,
    url: raw.url,
    updatedAt: raw.updatedAt,
    ticketId: extractTicketId(raw.headRefName),
  };
}

// ---------------------------------------------------------------------------
// Repo detection
// ---------------------------------------------------------------------------

async function detectRepo(): Promise<string> {
  const proc = Bun.spawn(["git", "remote", "get-url", "origin"], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    throw new GithubClientError({
      type: "github_not_found",
      resourceId: "origin",
      message: "Could not detect repository from git remote origin",
    });
  }

  return parseRepoFromUrl(stdout.trim());
}

function parseRepoFromUrl(remoteUrl: string): string {
  // SSH: git@github.com:owner/repo.git
  const sshMatch = /github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/.exec(remoteUrl);
  if (sshMatch) return sshMatch[1]!;

  // HTTPS: https://github.com/owner/repo.git
  const httpsMatch = /github\.com\/([^/]+\/[^/]+?)(?:\.git)?$/.exec(remoteUrl);
  if (httpsMatch) return httpsMatch[1]!;

  // Fallback: treat entire string as owner/repo
  return remoteUrl;
}

// ---------------------------------------------------------------------------
// gh runner
// ---------------------------------------------------------------------------

const PR_JSON_FIELDS =
  "number,title,author,state,headRefName,url,updatedAt,statusCheckRollup,reviewDecision,isDraft";

async function runGh(args: string[]): Promise<string> {
  let proc: ReturnType<typeof Bun.spawn>;

  try {
    proc = Bun.spawn(["gh", ...args], {
      stdout: "pipe",
      stderr: "pipe",
    });
  } catch (err: unknown) {
    // Bun.spawn throws if the binary is not found
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("ENOENT") || msg.includes("not found") || msg.includes("No such file")) {
      throw new GithubClientError({
        type: "github_cli_missing",
        message: "gh CLI is not installed or not in PATH",
      });
    }
    throw new GithubClientError({
      type: "github_network",
      cause: err,
      message: `Failed to spawn gh: ${msg}`,
    });
  }

  const stdout = await new Response(proc.stdout as ReadableStream).text();
  const stderr = await new Response(proc.stderr as ReadableStream).text();
  const exitCode = await proc.exited;

  if (exitCode === 0) return stdout;

  // Classify errors from stderr / exit code
  const lower = stderr.toLowerCase();

  if (
    lower.includes("not logged in") ||
    lower.includes("authentication") ||
    lower.includes("auth")
  ) {
    throw new GithubClientError({
      type: "github_auth",
      message: stderr.trim() || "GitHub authentication failed",
    });
  }

  if (lower.includes("not found") || lower.includes("could not resolve") || lower.includes("404")) {
    throw new GithubClientError({
      type: "github_not_found",
      resourceId: args.join(" "),
      message: stderr.trim() || "Resource not found",
    });
  }

  if (
    lower.includes("network") ||
    lower.includes("timeout") ||
    lower.includes("connection") ||
    lower.includes("socket")
  ) {
    throw new GithubClientError({
      type: "github_network",
      cause: new Error(stderr.trim()),
      message: stderr.trim() || "Network error communicating with GitHub",
    });
  }

  // Generic fallback — treat as network error
  throw new GithubClientError({
    type: "github_network",
    cause: new Error(stderr.trim()),
    message: `gh exited with code ${exitCode}: ${stderr.trim()}`,
  });
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export async function createGithubClient(repo?: string): Promise<GithubClient> {
  const resolvedRepo = repo ?? (await detectRepo());

  const client: GithubClient = {
    async listPRs(): Promise<readonly GithubPR[]> {
      const raw = await runGh([
        "pr",
        "list",
        "--repo",
        resolvedRepo,
        "--json",
        PR_JSON_FIELDS,
        "--limit",
        "100",
      ]);

      const trimmed = raw.trim();
      if (!trimmed || trimmed === "[]") return [];

      const parsed: GhPRJson[] = JSON.parse(trimmed);
      return parsed.map(mapPR);
    },

    async getPR(number: PrNumber): Promise<GithubPR> {
      const raw = await runGh([
        "pr",
        "view",
        String(number),
        "--repo",
        resolvedRepo,
        "--json",
        PR_JSON_FIELDS,
      ]);

      const parsed: GhPRJson = JSON.parse(raw.trim());
      return mapPR(parsed);
    },

    async createPR(opts: CreatePROptions): Promise<GithubPR> {
      const args = [
        "pr",
        "create",
        "--repo",
        resolvedRepo,
        "--title",
        opts.title,
        "--body",
        opts.body,
        "--head",
        opts.headBranch,
      ];

      if (opts.baseBranch) {
        args.push("--base", opts.baseBranch);
      }
      if (opts.draft) {
        args.push("--draft");
      }

      const raw = await runGh(args);

      // `gh pr create` returns the PR URL. Fetch the created PR.
      const url = raw.trim();
      const prNumMatch = /\/(\d+)$/.exec(url);
      if (prNumMatch) {
        return client.getPR(Number(prNumMatch[1]) as PrNumber);
      }

      // Fallback: list and find by head branch
      const prs = await client.listPRs();
      const found = prs.find((pr) => pr.headRef === opts.headBranch);
      if (found) return found;

      throw new GithubClientError({
        type: "github_not_found",
        resourceId: opts.headBranch,
        message: "Created PR but could not retrieve it",
      });
    },

    async comment(number: PrNumber, body: string): Promise<void> {
      await runGh(["pr", "comment", String(number), "--repo", resolvedRepo, "--body", body]);
    },

    async approvePR(number: PrNumber): Promise<void> {
      await runGh(["pr", "review", String(number), "--repo", resolvedRepo, "--approve"]);
    },
  };

  return client;
}
