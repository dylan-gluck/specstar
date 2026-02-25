import type {
  NotionClient,
  NotionSpec,
  NotionPageId,
  NotionDatabaseId,
  NotionError,
  SpecStatus,
} from "../../contracts/notion.js";

// ---------------------------------------------------------------------------
// Notion REST API base
// ---------------------------------------------------------------------------

const API_BASE = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";
const NOTION_BLOCK_LIMIT = 100;

// ---------------------------------------------------------------------------
// Internal Notion API response shapes (minimal)
// ---------------------------------------------------------------------------

interface NotionRichText {
  plain_text: string;
}

interface NotionProperty {
  id: string;
  type: string;
  title?: NotionRichText[];
  rich_text?: NotionRichText[];
  select?: { name: string } | null;
  relation?: { id: string }[];
  url?: string | null;
  [key: string]: unknown;
}

interface NotionPage {
  id: string;
  url: string;
  last_edited_time: string;
  properties: Record<string, NotionProperty>;
}

interface NotionBlock {
  id: string;
  type: string;
  has_children: boolean;
  [key: string]: unknown;
}

interface NotionBlockText {
  rich_text: NotionRichText[];
}

interface NotionCodeBlock extends NotionBlockText {
  language: string;
}

interface NotionTodoBlock extends NotionBlockText {
  checked: boolean;
}

interface NotionQueryResponse {
  results: NotionPage[];
  has_more: boolean;
  next_cursor: string | null;
}

interface NotionBlockChildrenResponse {
  results: NotionBlock[];
  has_more: boolean;
  next_cursor: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function headers(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };
}

async function notionFetch(
  apiKey: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const url = `${API_BASE}${path}`;
  try {
    const res = await fetch(url, {
      ...init,
      headers: { ...headers(apiKey), ...(init.headers as Record<string, string> | undefined) },
    });
    if (!res.ok) {
      throw await mapHttpError(res, path);
    }
    return res;
  } catch (err) {
    if (isNotionError(err)) throw err;
    throw {
      type: "notion_network",
      cause: err,
      message: err instanceof Error ? err.message : "Network error",
    } satisfies NotionError;
  }
}

function isNotionError(err: unknown): err is NotionError {
  return (
    typeof err === "object" &&
    err !== null &&
    "type" in err &&
    typeof (err as { type: unknown }).type === "string" &&
    (err as { type: string }).type.startsWith("notion_")
  );
}

async function mapHttpError(res: Response, path: string): Promise<NotionError> {
  const body = await res.text().catch(() => "");
  switch (res.status) {
    case 401:
      return { type: "notion_auth", message: `Unauthorized: ${body}` };
    case 404: {
      // Extract page/block id from path
      const idMatch = path.match(/\/(?:pages|blocks|databases)\/([^/]+)/);
      return {
        type: "notion_not_found",
        pageId: idMatch?.[1] ?? "",
        message: `Not found: ${path}`,
      };
    }
    case 429: {
      const retryAfter = res.headers.get("Retry-After");
      return {
        type: "notion_rate_limit",
        retryAfterSeconds: retryAfter ? Number(retryAfter) : 60,
        message: "Rate limited by Notion API",
      };
    }
    default:
      return { type: "notion_network", cause: null, message: `HTTP ${res.status}: ${body}` };
  }
}

// ---------------------------------------------------------------------------
// Property extraction helpers
// ---------------------------------------------------------------------------

/** Find a property by checking multiple possible names (case-insensitive). */
function findProperty(
  properties: Record<string, NotionProperty>,
  ...names: string[]
): NotionProperty | undefined {
  const lowerNames = names.map((n) => n.toLowerCase());
  for (const [key, val] of Object.entries(properties)) {
    if (lowerNames.includes(key.toLowerCase())) return val;
  }
  return undefined;
}

function extractTitle(properties: Record<string, NotionProperty>): string {
  for (const prop of Object.values(properties)) {
    if (prop.type === "title" && prop.title) {
      return prop.title.map((t) => t.plain_text).join("");
    }
  }
  return "";
}

function extractIssueId(properties: Record<string, NotionProperty>): string {
  const prop = findProperty(properties, "Issue ID", "Linear Issue", "IssueId", "Issue");
  if (!prop) return "";
  if (prop.type === "rich_text" && prop.rich_text) {
    return prop.rich_text.map((t) => t.plain_text).join("");
  }
  if (prop.type === "relation" && prop.relation && prop.relation.length > 0) {
    return prop.relation[0]?.id ?? "";
  }
  return "";
}

function extractStatus(properties: Record<string, NotionProperty>): SpecStatus {
  const prop = findProperty(properties, "Status");
  if (prop?.type === "select" && prop.select?.name) {
    const name = prop.select.name.toLowerCase();
    if (name === "draft" || name === "pending" || name === "approved" || name === "denied") {
      return name;
    }
  }
  return "draft";
}

function pageToSpec(page: NotionPage): NotionSpec {
  return {
    id: page.id as NotionPageId,
    issueId: extractIssueId(page.properties),
    title: extractTitle(page.properties),
    status: extractStatus(page.properties),
    url: page.url,
    updatedAt: page.last_edited_time,
  };
}

// ---------------------------------------------------------------------------
// Block <-> Markdown
// ---------------------------------------------------------------------------

function richTextToPlain(rt: NotionRichText[] | undefined): string {
  if (!rt) return "";
  return rt.map((t) => t.plain_text).join("");
}

function blockToMarkdown(block: NotionBlock): string {
  const type = block.type;
  const data = block[type] as Record<string, unknown> | undefined;
  if (!data) return "";

  const text = richTextToPlain(data.rich_text as NotionRichText[] | undefined);

  switch (type) {
    case "paragraph":
      return text;
    case "heading_1":
      return `# ${text}`;
    case "heading_2":
      return `## ${text}`;
    case "heading_3":
      return `### ${text}`;
    case "bulleted_list_item":
      return `- ${text}`;
    case "numbered_list_item":
      return `1. ${text}`;
    case "code": {
      const lang = (data as unknown as NotionCodeBlock).language ?? "";
      return `\`\`\`${lang}\n${text}\n\`\`\``;
    }
    case "to_do": {
      const checked = (data as unknown as NotionTodoBlock).checked;
      return checked ? `- [x] ${text}` : `- [ ] ${text}`;
    }
    case "divider":
      return "---";
    default:
      return text;
  }
}

function blocksToMarkdown(blocks: NotionBlock[]): string {
  return blocks.map(blockToMarkdown).join("\n\n");
}

// ---------------------------------------------------------------------------
// Markdown -> Notion blocks (simple)
// ---------------------------------------------------------------------------

interface NotionBlockInput {
  object: "block";
  type: string;
  [key: string]: unknown;
}

function richTextInput(text: string): {
  rich_text: Array<{ type: "text"; text: { content: string } }>;
} {
  return { rich_text: [{ type: "text", text: { content: text } }] };
}

function markdownToBlocks(markdown: string): NotionBlockInput[] {
  const blocks: NotionBlockInput[] = [];
  const lines = markdown.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;

    // Fenced code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.startsWith("```")) {
        codeLines.push(lines[i]!);
        i++;
      }
      i++; // skip closing ```
      blocks.push({
        object: "block",
        type: "code",
        code: { ...richTextInput(codeLines.join("\n")), language: lang || "plain text" },
      });
      continue;
    }

    // Divider
    if (/^---+$/.test(line.trim())) {
      blocks.push({ object: "block", type: "divider", divider: {} });
      i++;
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,3})\s+(.*)/);
    if (headingMatch) {
      const level = headingMatch[1]!.length as 1 | 2 | 3;
      const text = headingMatch[2]!;
      const type = `heading_${level}` as const;
      blocks.push({ object: "block", type, [type]: richTextInput(text) });
      i++;
      continue;
    }

    // Todo
    const todoMatch = line.match(/^- \[([ xX])\]\s*(.*)/);
    if (todoMatch) {
      const checked = todoMatch[1] !== " ";
      blocks.push({
        object: "block",
        type: "to_do",
        to_do: { ...richTextInput(todoMatch[2]!), checked },
      });
      i++;
      continue;
    }

    // Bulleted list
    if (line.startsWith("- ")) {
      blocks.push({
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: richTextInput(line.slice(2)),
      });
      i++;
      continue;
    }

    // Numbered list
    const numMatch = line.match(/^\d+\.\s+(.*)/);
    if (numMatch) {
      blocks.push({
        object: "block",
        type: "numbered_list_item",
        numbered_list_item: richTextInput(numMatch[1]!),
      });
      i++;
      continue;
    }

    // Empty line -> skip
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph
    blocks.push({
      object: "block",
      type: "paragraph",
      paragraph: richTextInput(line),
    });
    i++;
  }

  return blocks;
}

// ---------------------------------------------------------------------------
// Client implementation
// ---------------------------------------------------------------------------

export function createNotionClient(apiKey: string, databaseId: string): NotionClient {
  const defaultDbId = databaseId as NotionDatabaseId;

  return {
    async listSpecs(dbId: NotionDatabaseId): Promise<readonly NotionSpec[]> {
      const specs: NotionSpec[] = [];
      let cursor: string | null = null;
      let hasMore = true;

      while (hasMore) {
        const body: Record<string, unknown> = {};
        if (cursor) body.start_cursor = cursor;

        const res = await notionFetch(apiKey, `/databases/${dbId}/query`, {
          method: "POST",
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as NotionQueryResponse;
        for (const page of data.results) {
          specs.push(pageToSpec(page));
        }
        hasMore = data.has_more;
        cursor = data.next_cursor;
      }

      return specs;
    },

    async getSpec(pageId: NotionPageId): Promise<NotionSpec> {
      // Fetch page metadata
      const pageRes = await notionFetch(apiKey, `/pages/${pageId}`, { method: "GET" });
      const page = (await pageRes.json()) as NotionPage;
      const spec = pageToSpec(page);

      // Fetch content blocks
      const contentBlocks: NotionBlock[] = [];
      let cursor: string | null = null;
      let hasMore = true;

      while (hasMore) {
        const path = `/blocks/${pageId}/children${cursor ? `?start_cursor=${cursor}` : ""}`;
        const blocksRes = await notionFetch(apiKey, path, { method: "GET" });
        const data = (await blocksRes.json()) as NotionBlockChildrenResponse;
        contentBlocks.push(...data.results);
        hasMore = data.has_more;
        cursor = data.next_cursor;
      }

      return {
        ...spec,
        content: blocksToMarkdown(contentBlocks),
      };
    },

    async createSpec(issueId: string, title: string, content: string): Promise<NotionSpec> {
      const allChildren = markdownToBlocks(content);
      const firstChunk = allChildren.slice(0, NOTION_BLOCK_LIMIT);
      const body = {
        parent: { database_id: defaultDbId },
        properties: {
          title: { title: [{ type: "text", text: { content: title } }] },
          "Issue ID": { rich_text: [{ type: "text", text: { content: issueId } }] },
          Status: { select: { name: "draft" } },
        },
        children: firstChunk,
      };

      const res = await notionFetch(apiKey, "/pages", {
        method: "POST",
        body: JSON.stringify(body),
      });
      const page = (await res.json()) as NotionPage;

      // Append remaining blocks in chunks
      for (let i = NOTION_BLOCK_LIMIT; i < allChildren.length; i += NOTION_BLOCK_LIMIT) {
        const chunk = allChildren.slice(i, i + NOTION_BLOCK_LIMIT);
        await notionFetch(apiKey, `/blocks/${page.id}/children`, {
          method: "PATCH",
          body: JSON.stringify({ children: chunk }),
        });
      }

      return {
        ...pageToSpec(page),
        content,
      };
    },

    async updateSpec(pageId: NotionPageId, content: string): Promise<void> {
      // Fetch existing block IDs before any mutations
      const existingBlockIds: string[] = [];
      let cursor: string | null = null;
      let hasMore = true;

      while (hasMore) {
        const path = `/blocks/${pageId}/children${cursor ? `?start_cursor=${cursor}` : ""}`;
        const blocksRes = await notionFetch(apiKey, path, { method: "GET" });
        const data = (await blocksRes.json()) as NotionBlockChildrenResponse;
        for (const block of data.results) {
          existingBlockIds.push(block.id);
        }
        hasMore = data.has_more;
        cursor = data.next_cursor;
      }

      // Append new content blocks first (preserves old content on failure)
      const children = markdownToBlocks(content);
      for (let i = 0; i < children.length; i += NOTION_BLOCK_LIMIT) {
        const chunk = children.slice(i, i + NOTION_BLOCK_LIMIT);
        await notionFetch(apiKey, `/blocks/${pageId}/children`, {
          method: "PATCH",
          body: JSON.stringify({ children: chunk }),
        });
      }

      // Delete old blocks (best-effort: content is safely duplicated if this fails)
      for (const blockId of existingBlockIds) {
        try {
          await notionFetch(apiKey, `/blocks/${blockId}`, { method: "DELETE" });
        } catch {
          // Old block deletion is best-effort; content is preserved
        }
      }
    },

    async setSpecStatus(pageId: NotionPageId, status: SpecStatus): Promise<void> {
      await notionFetch(apiKey, `/pages/${pageId}`, {
        method: "PATCH",
        body: JSON.stringify({
          properties: {
            Status: { select: { name: status } },
          },
        }),
      });
    },
  };
}
