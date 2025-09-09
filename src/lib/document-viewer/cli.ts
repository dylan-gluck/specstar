#!/usr/bin/env bun

import meow from 'meow';
import { DocumentViewer } from './index.js';
import type { Document } from './index.js';
import chalk from 'chalk';
import { join } from 'path';
import readline from 'readline';

const cli = meow(`
  Usage
    $ document-viewer <command> [file] [options]

  Commands
    view <file>          View a markdown document
    render <file>        Render markdown to terminal format
    search <file> <q>    Search for text in a document
    toc <file>           Display table of contents

  Options
    --theme <theme>      Color theme: light or dark (default: dark)
    --no-syntax          Disable syntax highlighting
    --width <n>          Maximum line width (default: 80)
    --page <n>           Page number for pagination
    --page-size <n>      Lines per page (default: 30)
    --no-wrap            Disable text wrapping
    --case-sensitive     Case-sensitive search
    --line <n>           Jump to specific line number
    --start <n>          Start line for rendering
    --end <n>            End line for rendering
    --json               Output in JSON format
    --interactive, -i    Interactive mode for viewing
    --help               Show this help message
    --version            Show version

  Examples
    $ document-viewer view README.md
    $ document-viewer view doc.md --page 2
    $ document-viewer view doc.md --interactive
    $ document-viewer render doc.md --start 10 --end 50
    $ document-viewer search README.md "installation" --case-sensitive
    $ document-viewer toc GUIDE.md
`, {
  importMeta: import.meta,
  flags: {
    theme: {
      type: 'string',
      default: 'dark',
      choices: ['light', 'dark']
    },
    syntax: {
      type: 'boolean',
      default: true
    },
    width: {
      type: 'number',
      default: 80
    },
    page: {
      type: 'number',
      default: 1
    },
    pageSize: {
      type: 'number',
      default: 30
    },
    wrap: {
      type: 'boolean',
      default: true
    },
    caseSensitive: {
      type: 'boolean',
      default: false
    },
    line: {
      type: 'number'
    },
    start: {
      type: 'number'
    },
    end: {
      type: 'number'
    },
    json: {
      type: 'boolean',
      default: false
    },
    interactive: {
      type: 'boolean',
      alias: 'i',
      default: false
    },
    help: {
      type: 'boolean',
      alias: 'h'
    },
    version: {
      type: 'boolean',
      alias: 'v'
    }
  }
});

// Helper function to print output
function output(data: any, jsonFormat: boolean = false) {
  if (jsonFormat) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(data);
  }
}

// Helper function to print error and exit
function error(message: string, code: number = 1): never {
  console.error(`Error: ${message}`);
  process.exit(code);
}

// Interactive viewer mode
async function interactiveView(viewer: DocumentViewer, document: Document) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  let currentPage = 1;
  let searchQuery = '';
  let searchResults: number[] = [];
  let searchIndex = 0;

  const renderPage = () => {
    console.clear();
    
    // Show frontmatter if present
    if (document.frontmatter && currentPage === 1) {
      console.log(viewer.formatFrontmatter(document.frontmatter));
      console.log();
    }
    
    // Get paginated content
    const { content, totalPages, currentPage: page } = viewer.paginate(
      viewer.renderMarkdown(document.content),
      currentPage
    );
    
    console.log(content);
    console.log();
    console.log(chalk.dim('─'.repeat(cli.flags.width)));
    console.log(
      chalk.dim(`Page ${page}/${totalPages} | `) +
      chalk.cyan('Commands: ') +
      'n)ext p)rev f)irst l)ast s)earch t)oc g)oto q)uit'
    );
    
    if (searchQuery) {
      console.log(chalk.yellow(`Search: "${searchQuery}" (${searchResults.length} results)`));
    }
  };

  const handleCommand = async (input: string) => {
    const cmd = input.toLowerCase().trim();
    
    switch (cmd[0]) {
      case 'n': // next
        currentPage++;
        renderPage();
        break;
        
      case 'p': // prev
        currentPage = Math.max(1, currentPage - 1);
        renderPage();
        break;
        
      case 'f': // first
        currentPage = 1;
        renderPage();
        break;
        
      case 'l': // last
        const { totalPages } = viewer.paginate(viewer.renderMarkdown(document.content), 1);
        currentPage = totalPages;
        renderPage();
        break;
        
      case 's': // search
        rl.question('Search for: ', (query) => {
          searchQuery = query;
          searchResults = viewer.search(document.content, query, cli.flags.caseSensitive);
          searchIndex = 0;
          
          if (searchResults.length > 0) {
            // Jump to first result
            const firstResultLine = searchResults[0];
            if (firstResultLine !== undefined) {
              currentPage = Math.ceil(firstResultLine / cli.flags.pageSize);
            }
            console.log(chalk.green(`Found ${searchResults.length} results. Press Enter to see next.`));
          } else {
            console.log(chalk.red('No results found.'));
          }
          
          renderPage();
          rl.prompt();
        });
        return;
        
      case 't': // table of contents
        console.clear();
        const toc = viewer.extractTableOfContents(document.content);
        console.log(chalk.bold.cyan('Table of Contents:'));
        console.log();
        
        for (const entry of toc) {
          const indent = '  '.repeat(entry.level - 1);
          const marker = entry.level === 1 ? '■' : entry.level === 2 ? '▪' : '·';
          console.log(`${indent}${marker} ${entry.text} ${chalk.dim(`(line ${entry.line})`)}`);
        }
        
        console.log();
        console.log(chalk.dim('Press Enter to return...'));
        
        rl.once('line', () => {
          renderPage();
          rl.prompt();
        });
        return;
        
      case 'g': // goto
        rl.question('Go to page: ', (pageStr) => {
          const page = parseInt(pageStr, 10);
          if (!isNaN(page)) {
            currentPage = page;
            renderPage();
          }
          rl.prompt();
        });
        return;
        
      case 'q': // quit
        rl.close();
        process.exit(0);
        break;
        
      case '':
        // Enter key - if searching, go to next result
        if (searchResults.length > 0) {
          searchIndex = (searchIndex + 1) % searchResults.length;
          const resultLine = searchResults[searchIndex];
          if (resultLine !== undefined) {
            currentPage = Math.ceil(resultLine / cli.flags.pageSize);
          }
          renderPage();
        }
        break;
        
      default:
        console.log(chalk.red(`Unknown command: ${cmd}`));
        break;
    }
    
    rl.prompt();
  };

  // Initial render
  renderPage();

  // Set up command prompt
  rl.setPrompt('> ');
  rl.prompt();

  rl.on('line', handleCommand);
  
  // Handle Ctrl+C
  rl.on('SIGINT', () => {
    console.log('\nExiting...');
    rl.close();
    process.exit(0);
  });
}

// Main CLI logic
async function main() {
  const command = cli.input[0];
  const filePath = cli.input[1];

  const viewer = new DocumentViewer({
    theme: cli.flags.theme as 'light' | 'dark',
    highlightSyntax: cli.flags.syntax,
    maxWidth: cli.flags.width,
    pageSize: cli.flags.pageSize
  });

  try {
    switch (command) {
      case 'view': {
        if (!filePath) {
          error('File path is required for view command');
        }

        const document = await viewer.loadDocument(filePath);

        if (cli.flags.interactive) {
          // Interactive mode
          await interactiveView(viewer, document);
        } else {
          // Static view mode
          if (document.frontmatter && !cli.flags.json) {
            console.log(viewer.formatFrontmatter(document.frontmatter));
            console.log();
          }

          if (cli.flags.line) {
            // Jump to specific line
            const pageWithLine = Math.ceil(cli.flags.line / cli.flags.pageSize);
            const { content } = viewer.paginate(
              viewer.renderMarkdown(document.content),
              pageWithLine
            );
            output(content, false);
          } else {
            // Show specific page
            const { content, totalPages, currentPage } = viewer.paginate(
              viewer.renderMarkdown(document.content),
              cli.flags.page
            );

            if (cli.flags.json) {
              output({
                content,
                currentPage,
                totalPages,
                frontmatter: document.frontmatter
              }, true);
            } else {
              output(content, false);
              console.log();
              console.log(chalk.dim(`Page ${currentPage} of ${totalPages}`));
            }
          }
        }
        break;
      }

      case 'render': {
        if (!filePath) {
          error('File path is required for render command');
        }

        const document = await viewer.loadDocument(filePath);
        const rendered = viewer.renderMarkdown(document.content, {
          startLine: cli.flags.start,
          endLine: cli.flags.end,
          wrapText: cli.flags.wrap
        });

        if (cli.flags.json) {
          output({
            rendered,
            frontmatter: document.frontmatter,
            lines: rendered.split('\n').length
          }, true);
        } else {
          output(rendered, false);
        }
        break;
      }

      case 'search': {
        const query = cli.input[2];
        
        if (!filePath) {
          error('File path is required for search command');
        }
        
        if (!query) {
          error('Search query is required');
        }

        const document = await viewer.loadDocument(filePath);
        const results = viewer.search(
          document.content,
          query,
          cli.flags.caseSensitive
        );

        if (cli.flags.json) {
          output({
            query,
            results,
            count: results.length,
            caseSensitive: cli.flags.caseSensitive
          }, true);
        } else {
          if (results.length === 0) {
            console.log(chalk.yellow(`No results found for "${query}"`));
          } else {
            console.log(chalk.green(`Found ${results.length} result(s) for "${query}":`));
            console.log();
            
            // Show context around each result
            const lines = document.content.split('\n');
            for (const lineNum of results.slice(0, 10)) {
              const lineIndex = lineNum - 1;
              const line = lines[lineIndex];
              
              if (!line) continue;
              
              // Show line with context
              if (lineIndex > 0) {
                console.log(chalk.dim(`${lineNum - 1}: ${lines[lineIndex - 1]}`));
              }
              
              // Highlight the matching line
              const regex = new RegExp(
                query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
                cli.flags.caseSensitive ? 'g' : 'gi'
              );
              const highlighted = line.replace(regex, chalk.bgYellow.black('$&'));
              console.log(chalk.cyan(`${lineNum}: `) + highlighted);
              
              if (lineIndex < lines.length - 1) {
                console.log(chalk.dim(`${lineNum + 1}: ${lines[lineIndex + 1]}`));
              }
              
              console.log(chalk.dim('─'.repeat(cli.flags.width)));
            }
            
            if (results.length > 10) {
              console.log(chalk.dim(`... and ${results.length - 10} more results`));
            }
          }
        }
        break;
      }

      case 'toc': {
        if (!filePath) {
          error('File path is required for toc command');
        }

        const document = await viewer.loadDocument(filePath);
        const toc = viewer.extractTableOfContents(document.content);

        if (cli.flags.json) {
          output(toc, true);
        } else {
          if (toc.length === 0) {
            console.log('No headers found in document');
          } else {
            console.log(chalk.bold.cyan('Table of Contents:'));
            console.log();
            
            for (const entry of toc) {
              const indent = '  '.repeat(entry.level - 1);
              const marker = entry.level === 1 ? '■' : entry.level === 2 ? '▪' : '·';
              const lineInfo = chalk.dim(`line ${entry.line}`);
              console.log(`${indent}${marker} ${entry.text} (${lineInfo})`);
            }
          }
        }
        break;
      }

      default: {
        if (command) {
          error(`Unknown command: ${command}`);
        }
        cli.showHelp();
        break;
      }
    }
  } catch (err) {
    if (err instanceof Error) {
      error(err.message);
    } else {
      error('An unexpected error occurred');
    }
  }
}

// Export for library usage
export { DocumentViewer, cli };

// Run if executed directly
if (import.meta.main) {
  main();
}