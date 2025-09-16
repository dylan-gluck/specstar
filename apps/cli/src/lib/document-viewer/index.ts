import { marked, type Tokens, type Token } from "marked";
import matter from "gray-matter";
import { highlight } from "cli-highlight";
import chalk from "chalk";

export interface DocumentViewerOptions {
  theme?: "light" | "dark";
  highlightSyntax?: boolean;
  maxWidth?: number;
  pageSize?: number;
}

export interface Document {
  path: string;
  content: string;
  frontmatter?: Record<string, any>;
  raw: string;
}

export interface RenderOptions {
  startLine?: number;
  endLine?: number;
  wrapText?: boolean;
}

// Custom terminal renderer that converts markdown to terminal-friendly output
class TerminalRenderer {
  private options: DocumentViewerOptions;

  constructor(options: DocumentViewerOptions) {
    this.options = options;
  }

  heading(token: Tokens.Heading): string {
    const styles = [
      chalk.bold.underline.cyan, // h1
      chalk.bold.yellow, // h2
      chalk.bold.green, // h3
      chalk.bold.blue, // h4
      chalk.bold.magenta, // h5
      chalk.bold.gray, // h6
    ];
    const style = styles[token.depth - 1] || chalk.bold;
    const prefix = "#".repeat(token.depth);
    return `\n${style(`${prefix} ${token.text}`)}\n`;
  }

  paragraph(token: Tokens.Paragraph): string {
    return `${this.parseInline(token.tokens)}\n`;
  }

  strong(token: Tokens.Strong): string {
    return chalk.bold(this.parseInline(token.tokens));
  }

  em(token: Tokens.Em): string {
    return chalk.italic(this.parseInline(token.tokens));
  }

  codespan(token: Tokens.Codespan): string {
    return chalk.bgGray.white(` ${token.text} `);
  }

  del(token: Tokens.Del): string {
    return chalk.strikethrough(this.parseInline(token.tokens));
  }

  link(token: Tokens.Link): string {
    const linkText = chalk.blue.underline(this.parseInline(token.tokens));
    const url = chalk.dim(`(${token.href})`);
    return `${linkText} ${url}`;
  }

  image(token: Tokens.Image): string {
    return chalk.dim(`[Image: ${token.text || token.title || token.href}]`);
  }

  text(token: Tokens.Text | Tokens.Escape): string {
    return token.text;
  }

  code(token: Tokens.Code): string {
    let highlighted = token.text;
    if (this.options.highlightSyntax && token.lang) {
      try {
        highlighted = highlight(token.text, { language: token.lang });
      } catch {
        // Fallback to unhighlighted
      }
    }
    const lines = highlighted.split("\n");
    const bordered = lines.map((line) => `  │ ${line}`).join("\n");
    const lang = token.lang ? chalk.dim(` (${token.lang})`) : "";
    return `\n  ┌─${lang}\n${bordered}\n  └─\n`;
  }

  list(token: Tokens.List): string {
    let result = "";
    for (const item of token.items) {
      result += this.listitem(item);
    }
    return `${result}\n`;
  }

  listitem(token: Tokens.ListItem): string {
    const bullet = token.task ? (token.checked ? "[✓]" : "[ ]") : "•";
    const content = this.parseInline(token.tokens);
    return `  ${bullet} ${content}\n`;
  }

  blockquote(token: Tokens.Blockquote): string {
    const content = this.parseTokens(token.tokens);
    const lines = content.split("\n").filter((line) => line);
    const quoted = lines.map((line) => chalk.dim(`│ ${line}`)).join("\n");
    return `\n${quoted}\n`;
  }

  hr(): string {
    const width = this.options.maxWidth || 80;
    return `\n${chalk.dim("─".repeat(width))}\n`;
  }

  table(token: Tokens.Table): string {
    let result = "\n";

    // Header row
    result += "│ ";
    for (const cell of token.header) {
      result += chalk.bold(this.parseInline(cell.tokens)) + " │ ";
    }
    result += "\n";

    // Separator
    result += "├─";
    for (let i = 0; i < token.header.length; i++) {
      result += "───────────├─";
    }
    result = result.slice(0, -2) + "┤\n";

    // Body rows
    for (const row of token.rows) {
      result += "│ ";
      for (const cell of row) {
        result += this.parseInline(cell.tokens) + " │ ";
      }
      result += "\n";
    }

    return result + "\n";
  }

  br(): string {
    return "\n";
  }

  html(token: Tokens.HTML): string {
    // Strip HTML tags for terminal display
    return token.text.replace(/<[^>]*>/g, "");
  }

  // Helper method to parse inline tokens
  private parseInline(tokens: Token[]): string {
    let result = "";
    for (const token of tokens) {
      switch (token.type) {
        case "text":
        case "escape":
          result += this.text(token as Tokens.Text);
          break;
        case "strong":
          result += this.strong(token as Tokens.Strong);
          break;
        case "em":
          result += this.em(token as Tokens.Em);
          break;
        case "codespan":
          result += this.codespan(token as Tokens.Codespan);
          break;
        case "del":
          result += this.del(token as Tokens.Del);
          break;
        case "link":
          result += this.link(token as Tokens.Link);
          break;
        case "image":
          result += this.image(token as Tokens.Image);
          break;
        case "br":
          result += this.br();
          break;
        case "html":
          result += this.html(token as Tokens.HTML);
          break;
        default:
          result += (token as any).text || "";
      }
    }
    return result;
  }

  // Helper method to parse block-level tokens
  private parseTokens(tokens: Token[]): string {
    let result = "";
    for (const token of tokens) {
      switch (token.type) {
        case "paragraph":
          result += this.paragraph(token as Tokens.Paragraph);
          break;
        case "heading":
          result += this.heading(token as Tokens.Heading);
          break;
        case "code":
          result += this.code(token as Tokens.Code);
          break;
        case "list":
          result += this.list(token as Tokens.List);
          break;
        case "blockquote":
          result += this.blockquote(token as Tokens.Blockquote);
          break;
        case "hr":
          result += this.hr();
          break;
        case "table":
          result += this.table(token as Tokens.Table);
          break;
        case "html":
          result += this.html(token as Tokens.HTML);
          break;
        case "text":
          result += this.text(token as Tokens.Text);
          break;
        default:
          // Fallback for any unhandled token types
          if ((token as any).tokens) {
            result += this.parseInline((token as any).tokens);
          } else if ((token as any).text) {
            result += (token as any).text;
          }
      }
    }
    return result;
  }

  render(tokens: Token[]): string {
    return this.parseTokens(tokens);
  }
}

export class DocumentViewer {
  private options: DocumentViewerOptions;
  private terminalRenderer: TerminalRenderer;

  constructor(options: DocumentViewerOptions = {}) {
    this.options = {
      theme: "dark",
      highlightSyntax: true,
      maxWidth: 80,
      pageSize: 30,
      ...options,
    };

    // Create terminal renderer
    this.terminalRenderer = new TerminalRenderer(this.options);
  }

  /**
   * Load and parse a markdown document from file
   */
  async loadDocument(path: string): Promise<Document> {
    try {
      const file = Bun.file(path);
      const raw = await file.text();

      // Parse frontmatter
      const { content, data } = this.extractFrontmatter(raw);

      return {
        path,
        content,
        frontmatter: Object.keys(data).length > 0 ? data : undefined,
        raw,
      };
    } catch (error) {
      throw new Error(
        `Failed to load document: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Extract YAML frontmatter from markdown content
   */
  extractFrontmatter(content: string): {
    content: string;
    data: Record<string, any>;
  } {
    const parsed = matter(content);
    return {
      content: parsed.content,
      data: parsed.data,
    };
  }

  /**
   * Render markdown to terminal-friendly format
   */
  renderMarkdown(content: string, options: RenderOptions = {}): string {
    const { startLine = 0, endLine, wrapText = true } = options;

    // Just apply syntax highlighting if enabled, no parsing
    let rendered = content;
    if (this.options.highlightSyntax) {
      rendered = this.applySyntaxHighlighting(content);
    }

    // Split into lines for pagination
    const lines = rendered.split("\n");
    const end = endLine ?? lines.length;
    const paginatedLines = lines.slice(startLine, end);

    // Wrap text if needed
    if (wrapText && this.options.maxWidth) {
      return paginatedLines
        .map((line) => this.wrapLine(line, this.options.maxWidth!))
        .join("\n");
    }

    return paginatedLines.join("\n");
  }

  /**
   * Apply simple syntax highlighting to markdown text
   */
  private applySyntaxHighlighting(content: string): string {
    const lines = content.split("\n");
    return lines.map(line => {
      // Headers (# ## ### etc)
      if (line.match(/^#{1,6}\s/)) {
        const level = (line.match(/^#+/) || [''])[0].length;
        const styles = [
          chalk.bold.cyan,     // h1
          chalk.bold.yellow,   // h2
          chalk.bold.green,    // h3
          chalk.bold.blue,     // h4
          chalk.bold.magenta,  // h5
          chalk.bold.gray,     // h6
        ];
        return (styles[level - 1] || chalk.bold)(line);
      }
      
      // Code blocks (indented with 4 spaces or tab)
      if (line.match(/^(\s{4}|\t)/)) {
        return chalk.gray(line);
      }
      
      // Blockquotes (> )
      if (line.match(/^>/)) {
        return chalk.dim(line);
      }
      
      // Lists (- * + or 1. 2. etc)
      if (line.match(/^[\s]*[-*+]\s/) || line.match(/^[\s]*\d+\.\s/)) {
        return line.replace(/^([\s]*[-*+\d.]+)(\s)/, (match, bullet, space) => 
          chalk.yellow(bullet) + space
        );
      }
      
      // Horizontal rules (--- or *** or ___)
      if (line.match(/^[-*_]{3,}$/)) {
        return chalk.dim(line);
      }
      
      // Inline code `code`
      line = line.replace(/`([^`]+)`/g, (match, code) => 
        chalk.bgGray.white(` ${code} `)
      );
      
      // Bold **text** or __text__
      line = line.replace(/(\*\*|__)([^*_]+)\1/g, (match, delim, text) => 
        chalk.bold(delim + text + delim)
      );
      
      // Italic *text* or _text_
      line = line.replace(/([*_])([^*_]+)\1/g, (match, delim, text) => 
        chalk.italic(delim + text + delim)
      );
      
      // Links [text](url)
      line = line.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => 
        chalk.blue.underline(`[${text}]`) + chalk.dim(`(${url})`)
      );
      
      return line;
    }).join("\n");
  }

  /**
   * Syntax highlight code blocks
   */
  highlightCode(code: string, language?: string): string {
    if (!this.options.highlightSyntax) {
      return code;
    }

    try {
      // cli-highlight has a simpler API
      const highlighted = language
        ? highlight(code, { language })
        : highlight(code);
      return highlighted;
    } catch (error) {
      // Fallback to unhighlighted code if highlighting fails
      return code;
    }
  }

  /**
   * Get paginated content
   */
  paginate(
    content: string,
    page: number = 1
  ): { content: string; totalPages: number; currentPage: number } {
    const lines = content.split("\n");
    const pageSize = this.options.pageSize || 30;
    const totalPages = Math.ceil(lines.length / pageSize);
    const currentPage = Math.max(1, Math.min(page, totalPages));

    const startLine = (currentPage - 1) * pageSize;
    const endLine = startLine + pageSize;

    return {
      content: lines.slice(startLine, endLine).join("\n"),
      totalPages,
      currentPage,
    };
  }

  /**
   * Wrap a line to fit within maxWidth
   */
  private wrapLine(line: string, maxWidth: number): string {
    if (line.length <= maxWidth) {
      return line;
    }

    const words = line.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      if (currentLine.length + word.length + 1 <= maxWidth) {
        currentLine += (currentLine ? " " : "") + word;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.join("\n");
  }

  /**
   * Search for text within a document
   */
  search(
    content: string,
    query: string,
    caseSensitive: boolean = false
  ): number[] {
    const lines = content.split("\n");
    const matches: number[] = [];
    const searchQuery = caseSensitive ? query : query.toLowerCase();

    lines.forEach((line, index) => {
      const searchLine = caseSensitive ? line : line.toLowerCase();
      if (searchLine.includes(searchQuery)) {
        matches.push(index + 1); // 1-indexed line numbers
      }
    });

    return matches;
  }

  /**
   * Get table of contents from markdown headers
   */
  extractTableOfContents(
    content: string
  ): Array<{ level: number; text: string; line: number }> {
    const lines = content.split("\n");
    const toc: Array<{ level: number; text: string; line: number }> = [];

    lines.forEach((line, index) => {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match && match[1] && match[2]) {
        toc.push({
          level: match[1].length,
          text: match[2],
          line: index + 1,
        });
      }
    });

    return toc;
  }

  /**
   * Format frontmatter for display
   */
  formatFrontmatter(frontmatter: Record<string, any>): string {
    const lines: string[] = [chalk.dim("───── Frontmatter ─────")];

    for (const [key, value] of Object.entries(frontmatter)) {
      const formattedKey = chalk.cyan(key + ":");
      const formattedValue =
        typeof value === "object"
          ? JSON.stringify(value, null, 2)
          : String(value);
      lines.push(`${formattedKey} ${formattedValue}`);
    }

    lines.push(chalk.dim("───────────────────────"));
    return lines.join("\n");
  }
}

export default DocumentViewer;
