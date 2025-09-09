/**
 * Document Model
 * Represents markdown documents with frontmatter and metadata
 */

import matter from 'gray-matter';

export interface DocumentFrontmatter {
  title?: string;
  description?: string;
  author?: string;
  date?: string;
  tags?: string[];
  category?: string;
  priority?: number;
  status?: 'draft' | 'review' | 'published' | 'archived';
  [key: string]: unknown;
}

export interface DocumentMetadata {
  path: string;
  size: number;
  created: string;
  modified: string;
  wordCount: number;
  lineCount: number;
  readingTime: number; // in minutes
  hasCode: boolean;
  hasTables: boolean;
  hasImages: boolean;
  headings: Array<{
    level: number;
    text: string;
    line: number;
  }>;
}

export interface Document {
  path: string;
  content: string;
  frontmatter: DocumentFrontmatter;
  metadata: DocumentMetadata;
  raw?: string; // Original content with frontmatter
}

/**
 * Validation functions
 */
export function isValidFrontmatter(fm: unknown): fm is DocumentFrontmatter {
  if (typeof fm !== 'object' || fm === null) return false;
  const f = fm as Record<string, unknown>;
  
  const validStatuses = ['draft', 'review', 'published', 'archived'];
  
  return (
    (f.title === undefined || typeof f.title === 'string') &&
    (f.description === undefined || typeof f.description === 'string') &&
    (f.author === undefined || typeof f.author === 'string') &&
    (f.date === undefined || typeof f.date === 'string') &&
    (f.tags === undefined || (Array.isArray(f.tags) && f.tags.every(t => typeof t === 'string'))) &&
    (f.category === undefined || typeof f.category === 'string') &&
    (f.priority === undefined || typeof f.priority === 'number') &&
    (f.status === undefined || validStatuses.includes(f.status as string))
  );
}

export function isValidMetadata(meta: unknown): meta is DocumentMetadata {
  if (typeof meta !== 'object' || meta === null) return false;
  const m = meta as Record<string, unknown>;
  
  return (
    typeof m.path === 'string' &&
    typeof m.size === 'number' &&
    typeof m.created === 'string' &&
    typeof m.modified === 'string' &&
    typeof m.wordCount === 'number' &&
    typeof m.lineCount === 'number' &&
    typeof m.readingTime === 'number' &&
    typeof m.hasCode === 'boolean' &&
    typeof m.hasTables === 'boolean' &&
    typeof m.hasImages === 'boolean' &&
    Array.isArray(m.headings) &&
    m.headings.every((h: unknown) => {
      if (typeof h !== 'object' || h === null) return false;
      const heading = h as Record<string, unknown>;
      return (
        typeof heading.level === 'number' &&
        typeof heading.text === 'string' &&
        typeof heading.line === 'number'
      );
    })
  );
}

export function isValidDocument(doc: unknown): doc is Document {
  if (typeof doc !== 'object' || doc === null) return false;
  const d = doc as Record<string, unknown>;
  
  return (
    typeof d.path === 'string' &&
    typeof d.content === 'string' &&
    isValidFrontmatter(d.frontmatter) &&
    isValidMetadata(d.metadata) &&
    (d.raw === undefined || typeof d.raw === 'string')
  );
}

/**
 * Parsing functions
 */
export function parseFrontmatter(content: string): { data: DocumentFrontmatter; content: string } {
  const parsed = matter(content);
  return {
    data: parsed.data as DocumentFrontmatter,
    content: parsed.content
  };
}

export function extractMetadata(path: string, content: string): DocumentMetadata {
  const lines = content.split('\n');
  const words = content.split(/\s+/).filter(w => w.length > 0);
  
  // Extract headings
  const headings: DocumentMetadata['headings'] = [];
  lines.forEach((line, index) => {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      headings.push({
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
        line: index + 1
      });
    }
  });
  
  // Check for code blocks
  const hasCode = /```[\s\S]*?```/.test(content) || /`[^`]+`/.test(content);
  
  // Check for tables
  const hasTables = /\|.*\|/.test(content) && /\|[-:]+\|/.test(content);
  
  // Check for images
  const hasImages = /!\[.*?\]\(.*?\)/.test(content) || /<img\s+.*?>/i.test(content);
  
  // Calculate reading time (average 200 words per minute)
  const readingTime = Math.ceil(words.length / 200);
  
  return {
    path,
    size: new Blob([content]).size,
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    wordCount: words.length,
    lineCount: lines.length,
    readingTime,
    hasCode,
    hasTables,
    hasImages,
    headings
  };
}

/**
 * Factory functions
 */
export function createDocument(params: {
  path: string;
  content: string;
  frontmatter?: DocumentFrontmatter;
  includeRaw?: boolean;
}): Document {
  const { data: parsedFrontmatter, content: bodyContent } = parseFrontmatter(params.content);
  const frontmatter = { ...parsedFrontmatter, ...params.frontmatter };
  const metadata = extractMetadata(params.path, bodyContent);
  
  return {
    path: params.path,
    content: bodyContent,
    frontmatter,
    metadata,
    ...(params.includeRaw ? { raw: params.content } : {})
  };
}

export async function createDocumentFromFile(
  path: string,
  includeRaw = false
): Promise<Document> {
  const file = Bun.file(path);
  const content = await file.text();
  const stats = await file.stat();
  
  const doc = createDocument({ path, content, includeRaw });
  
  // Update metadata with actual file stats
  doc.metadata.created = stats.birthtime.toISOString();
  doc.metadata.modified = stats.mtime.toISOString();
  doc.metadata.size = stats.size;
  
  return doc;
}

/**
 * Serialization/Deserialization
 */
export function serializeDocument(doc: Document): string {
  return JSON.stringify(doc, null, 2);
}

export function deserializeDocument(data: string): Document {
  const parsed = JSON.parse(data);
  if (!isValidDocument(parsed)) {
    throw new Error('Invalid document data');
  }
  return parsed;
}

/**
 * Document operations
 */
export function updateFrontmatter(
  doc: Document,
  frontmatter: Partial<DocumentFrontmatter>
): Document {
  return {
    ...doc,
    frontmatter: {
      ...doc.frontmatter,
      ...frontmatter
    }
  };
}

export function updateContent(doc: Document, content: string): Document {
  const metadata = extractMetadata(doc.path, content);
  return {
    ...doc,
    content,
    metadata: {
      ...metadata,
      created: doc.metadata.created // Preserve original creation date
    }
  };
}

export function addTag(doc: Document, tag: string): Document {
  const tags = doc.frontmatter.tags || [];
  if (!tags.includes(tag)) {
    return updateFrontmatter(doc, { tags: [...tags, tag] });
  }
  return doc;
}

export function removeTag(doc: Document, tag: string): Document {
  const tags = doc.frontmatter.tags || [];
  return updateFrontmatter(doc, { tags: tags.filter(t => t !== tag) });
}

export function setStatus(
  doc: Document,
  status: DocumentFrontmatter['status']
): Document {
  return updateFrontmatter(doc, { status });
}

/**
 * Document utilities
 */
export function getTableOfContents(doc: Document): Array<{
  level: number;
  text: string;
  anchor: string;
}> {
  return doc.metadata.headings.map(heading => ({
    level: heading.level,
    text: heading.text,
    anchor: heading.text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
  }));
}

export function searchInDocument(
  doc: Document,
  query: string,
  caseSensitive = false
): Array<{ line: number; text: string; match: string }> {
  const lines = doc.content.split('\n');
  const results: Array<{ line: number; text: string; match: string }> = [];
  const searchQuery = caseSensitive ? query : query.toLowerCase();
  
  lines.forEach((line, index) => {
    const searchLine = caseSensitive ? line : line.toLowerCase();
    if (searchLine.includes(searchQuery)) {
      results.push({
        line: index + 1,
        text: line,
        match: query
      });
    }
  });
  
  return results;
}

export function extractCodeBlocks(doc: Document): Array<{
  language: string;
  code: string;
  line: number;
}> {
  const codeBlocks: Array<{ language: string; code: string; line: number }> = [];
  const lines = doc.content.split('\n');
  let inCodeBlock = false;
  let currentBlock = { language: '', code: '', line: 0 };
  
  lines.forEach((line, index) => {
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        currentBlock = {
          language: line.slice(3).trim() || 'plaintext',
          code: '',
          line: index + 1
        };
      } else {
        inCodeBlock = false;
        codeBlocks.push(currentBlock);
      }
    } else if (inCodeBlock) {
      currentBlock.code += (currentBlock.code ? '\n' : '') + line;
    }
  });
  
  return codeBlocks;
}

/**
 * Default values
 */
export const DEFAULT_DOCUMENT: Document = {
  path: '',
  content: '',
  frontmatter: {},
  metadata: {
    path: '',
    size: 0,
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    wordCount: 0,
    lineCount: 0,
    readingTime: 0,
    hasCode: false,
    hasTables: false,
    hasImages: false,
    headings: []
  }
};