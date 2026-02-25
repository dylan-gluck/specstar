import type {
  LinearClient,
  LinearIssue,
  LinearIssueId,
  LinearTeamId,
  LinearFilter,
  LinearIssueUpdate,
  LinearState,
  LinearError,
} from "../../contracts/linear.js";

const ENDPOINT = "https://api.linear.app/graphql";

// ---------------------------------------------------------------------------
// GraphQL fragments & queries
// ---------------------------------------------------------------------------

const ISSUE_FIELDS = `
  id
  identifier
  title
  description
  state { id name type }
  priority
  assignee { name }
  branchName
  url
  updatedAt
`;

const ISSUES_QUERY = `
query Issues($teamId: String!, $filter: IssueFilter, $first: Int!) {
  team(id: $teamId) {
    issues(filter: $filter, first: $first) {
      nodes { ${ISSUE_FIELDS} }
    }
  }
}`;

const ISSUE_QUERY = `
query Issue($id: String!) {
  issue(id: $id) { ${ISSUE_FIELDS} }
}`;

const STATES_QUERY = `
query States($teamId: String!) {
  team(id: $teamId) {
    states { nodes { id name type } }
  }
}`;

const UPDATE_ISSUE_MUTATION = `
mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
  issueUpdate(id: $id, input: $input) {
    success
    issue { id }
  }
}`;

const ADD_COMMENT_MUTATION = `
mutation AddComment($issueId: String!, $body: String!) {
  commentCreate(input: { issueId: $issueId, body: $body }) {
    success
    comment { id }
  }
}`;

// ---------------------------------------------------------------------------
// Response mapping
// ---------------------------------------------------------------------------

interface RawIssue {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  state: { id: string; name: string; type: string };
  priority: number;
  assignee: { name: string } | null;
  branchName: string | null;
  url: string;
  updatedAt: string;
}

function mapIssue(raw: RawIssue): LinearIssue {
  return {
    id: raw.id as LinearIssueId,
    identifier: raw.identifier,
    title: raw.title,
    description: raw.description ?? undefined,
    state: raw.state as LinearState,
    priority: raw.priority as LinearIssue["priority"],
    assignee: raw.assignee ?? undefined,
    branch: raw.branchName ?? undefined,
    url: raw.url,
    updatedAt: raw.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

class LinearApiError extends Error {
  constructor(public readonly linear: LinearError) {
    super(linear.message);
    this.name = "LinearApiError";
  }
}

function throwLinearError(status: number, headers: Headers, body: string): never {
  if (status === 401) {
    throw new LinearApiError({
      type: "linear_auth",
      message: `Authentication failed: ${body}`,
    });
  }
  if (status === 404) {
    throw new LinearApiError({
      type: "linear_not_found",
      resourceId: "",
      message: `Resource not found: ${body}`,
    });
  }
  if (status === 429) {
    const retryAfter = headers.get("Retry-After");
    throw new LinearApiError({
      type: "linear_rate_limit",
      retryAfterSeconds: retryAfter ? Number(retryAfter) : 60,
      message: "Rate limited by Linear API",
    });
  }
  // Treat other HTTP errors as network errors
  throw new LinearApiError({
    type: "linear_network",
    cause: new Error(`HTTP ${status}: ${body}`),
    message: `Linear API request failed with status ${status}`,
  });
}

function handleGraphQLErrors(data: {
  errors?: Array<{ message: string; extensions?: { code?: string } }>;
}): void {
  if (!data.errors || data.errors.length === 0) return;

  const first = data.errors[0]!;
  const code = first.extensions?.code;

  if (code === "AUTHENTICATION_ERROR" || code === "FORBIDDEN") {
    throw new LinearApiError({
      type: "linear_auth",
      message: first.message,
    });
  }
  if (code === "NOT_FOUND") {
    throw new LinearApiError({
      type: "linear_not_found",
      resourceId: "",
      message: first.message,
    });
  }

  // Generic GraphQL error -> network bucket
  throw new LinearApiError({
    type: "linear_network",
    cause: data.errors,
    message: first.message,
  });
}

// ---------------------------------------------------------------------------
// Client implementation
// ---------------------------------------------------------------------------

async function gql(
  apiKey: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify({ query, variables }),
    });
  } catch (err) {
    throw new LinearApiError({
      type: "linear_network",
      cause: err,
      message: err instanceof Error ? err.message : "Network request failed",
    });
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throwLinearError(response.status, response.headers, body);
  }

  const json = (await response.json()) as {
    data?: Record<string, unknown>;
    errors?: Array<{ message: string; extensions?: { code?: string } }>;
  };
  handleGraphQLErrors(json);

  return json.data as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createLinearClient(apiKey: string, teamId: string): LinearClient {
  const defaultTeamId = teamId as LinearTeamId;

  return {
    async getIssues(filter?: LinearFilter): Promise<readonly LinearIssue[]> {
      const resolvedTeamId = filter?.teamId ?? defaultTeamId;

      // Build Linear IssueFilter
      const issueFilter: Record<string, unknown> = {};

      if (filter?.assigneeId) {
        issueFilter.assignee =
          filter.assigneeId === "me" ? { isMe: { eq: true } } : { id: { eq: filter.assigneeId } };
      }

      if (filter?.stateTypes && filter.stateTypes.length > 0) {
        issueFilter.state = { type: { in: filter.stateTypes } };
      }

      const data = await gql(apiKey, ISSUES_QUERY, {
        teamId: resolvedTeamId,
        filter: Object.keys(issueFilter).length > 0 ? issueFilter : undefined,
        first: 200,
      });

      const team = data.team as { issues: { nodes: RawIssue[] } } | null;
      if (!team) return [];

      return team.issues.nodes.map(mapIssue);
    },

    async getIssue(id: LinearIssueId): Promise<LinearIssue> {
      const data = await gql(apiKey, ISSUE_QUERY, { id });
      const raw = data.issue as RawIssue | null;
      if (!raw) {
        throw new LinearApiError({
          type: "linear_not_found",
          resourceId: id,
          message: `Issue ${id} not found`,
        });
      }
      return mapIssue(raw);
    },

    async getStates(tid: LinearTeamId): Promise<readonly LinearState[]> {
      const data = await gql(apiKey, STATES_QUERY, { teamId: tid });
      const team = data.team as {
        states: { nodes: Array<{ id: string; name: string; type: string }> };
      } | null;
      if (!team) return [];
      return team.states.nodes as LinearState[];
    },

    async updateIssue(id: LinearIssueId, input: LinearIssueUpdate): Promise<void> {
      const data = await gql(apiKey, UPDATE_ISSUE_MUTATION, { id, input });
      const result = data.issueUpdate as { success: boolean } | null;
      if (!result?.success) {
        throw new LinearApiError({
          type: "linear_not_found",
          resourceId: id,
          message: `Failed to update issue ${id}`,
        });
      }
    },

    async addComment(issueId: LinearIssueId, body: string): Promise<void> {
      const data = await gql(apiKey, ADD_COMMENT_MUTATION, { issueId, body });
      const result = data.commentCreate as { success: boolean } | null;
      if (!result?.success) {
        throw new LinearApiError({
          type: "linear_not_found",
          resourceId: issueId,
          message: `Failed to add comment to issue ${issueId}`,
        });
      }
    },
  };
}
