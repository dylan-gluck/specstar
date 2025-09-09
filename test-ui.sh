#!/usr/bin/env bash

# Test script for Specstar TUI
echo "Testing Specstar TUI..."
echo ""
echo "This script will run the TUI in the current terminal."
echo "Make sure you're in an interactive terminal (not piped output)."
echo ""
echo "Controls:"
echo "  - P: Plan View"
echo "  - O: Observe View"
echo "  - Q: Quit"
echo "  - 1-3: Select file lists"
echo "  - Arrow keys: Navigate"
echo "  - Enter: Select file"
echo ""
echo "Press Enter to start..."
read

# Run the TUI
exec bun run src/cli.tsx