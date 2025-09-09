# Specstar Quickstart Guide

Specstar is a Terminal UI for monitoring Claude Code sessions and viewing planning documents.

## Installation

### Prerequisites

- [Bun](https://bun.sh) runtime (v1.1+)
- Terminal with 256 color support
- macOS, Linux, or WSL on Windows

### Quick Install

```bash
# Clone the repository
git clone https://github.com/dylan-gluck/specstar.git
cd specstar

# Install dependencies
bun install

# Build the application
bun run build

# Install globally (optional)
bun run install:global
```

### Alternative: Run from source

```bash
# Run directly without building
bun run dev
```

## Usage

### Initialize in Your Project

Navigate to your project directory and initialize Specstar:

```bash
cd /path/to/your/project
specstar --init
```

This creates a `.specstar/` directory with:
- `settings.json` - Configuration file
- `sessions/` - Session data storage
- `hooks.ts` - Claude Code lifecycle hooks
- `logs/` - Application logs

### Launch the TUI

```bash
# Launch Specstar in the current directory
specstar

# Or run from source
bun run dev
```

### Keyboard Navigation

#### Global Commands
- `P` - Switch to Plan view
- `O` - Switch to Observe view
- `H` or `?` - Show help/welcome screen
- `Q` - Quit (from welcome screen)
- `R` - Recover from errors

#### Plan View
- `↑/↓` or `j/k` - Navigate file list
- `Enter` - Select file to view
- `Tab` - Toggle focus between file list and document viewer
- `Esc` - Return to file list

#### Observe View
- `↑/↓` - Navigate session list
- `Enter` - View session details
- `Space` - Toggle auto-refresh
- `F5` - Manual refresh

## Features

### Plan View
View and navigate your project's planning documents:
- Browse markdown files in `specs/` directory
- Syntax-highlighted markdown rendering
- Frontmatter metadata display
- Split pane interface

### Observe View
Monitor active Claude Code sessions:
- Real-time session tracking
- Event timeline visualization
- Tool usage statistics
- Error and warning highlights

### Error Handling
- Automatic error recovery with retry options
- Structured logging to `.specstar/logs/`
- Graceful handling of terminal resize events
- Development mode with detailed error traces

## Configuration

Edit `.specstar/settings.json` to customize:

```json
{
  "specsDirectory": "specs",
  "sessionsDirectory": ".specstar/sessions",
  "logLevel": "info",
  "autoRefresh": true,
  "refreshInterval": 1000,
  "theme": "default"
}
```

### Environment Variables

- `LOG_LEVEL` - Set logging verbosity (debug, info, warn, error)
- `NODE_ENV` - Set to "development" for detailed debugging

## Library CLIs

Specstar includes standalone CLI tools for specific tasks:

### Session Monitor
```bash
# Monitor sessions in real-time
dist/session-monitor watch

# List all sessions
dist/session-monitor list
```

### Document Viewer
```bash
# View a specific document
dist/document-viewer view specs/plan.md

# List all documents
dist/document-viewer list
```

### Config Manager
```bash
# Initialize configuration
dist/config-manager init

# Validate configuration
dist/config-manager validate
```

### Hook Integrator
```bash
# Test hooks
dist/hook-integrator test

# Run specific hook
dist/hook-integrator run onSessionStart
```

## Troubleshooting

### Terminal Issues

**Problem**: Colors not displaying correctly
```bash
# Check terminal color support
echo $TERM

# Set proper terminal type
export TERM=xterm-256color
```

**Problem**: UI not responding to resize
```bash
# Restart the application after resize
# The app automatically handles resize events
```

### Permission Issues

**Problem**: Cannot create .specstar directory
```bash
# Check write permissions
ls -la .

# Create directory manually if needed
mkdir -p .specstar
chmod 755 .specstar
```

### Build Issues

**Problem**: Build fails with module errors
```bash
# Clean and rebuild
bun run clean
bun install --force
bun run build
```

## Development

### Running Tests
```bash
# Run all tests
bun test

# Watch mode
bun test:watch

# Coverage report
bun test:coverage

# E2E tests
bun test:e2e
```

### Project Structure
```
specstar/
├── src/
│   ├── app.tsx           # Main application
│   ├── cli.tsx           # CLI entry point
│   ├── components/       # UI components
│   ├── views/           # View components
│   ├── lib/             # Core libraries
│   └── models/          # Data models
├── dist/                # Compiled binaries
├── specs/              # Planning documents
└── .specstar/          # Runtime data
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Run tests: `bun test`
4. Submit a pull request

## Examples

### Basic Usage
```bash
# Initialize and launch
cd my-project
specstar --init
specstar
```

### Advanced Configuration
```bash
# Enable debug logging
LOG_LEVEL=debug specstar

# Force reinitialize
specstar --init --force
```

## Support

- GitHub Issues: [github.com/yourusername/specstar/issues](https://github.com/yourusername/specstar/issues)
- Documentation: [github.com/yourusername/specstar/wiki](https://github.com/yourusername/specstar/wiki)

## License

MIT License - See LICENSE file for details
