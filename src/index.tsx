/**
 * CLI entry point for Specstar.
 *
 * Parses arguments, loads configuration, initializes the database,
 * and renders the root App component.
 *
 * @module index
 */

import { render } from "@opentui/solid";
import { loadConfig } from "./config.js";
import { initDatabase } from "./db.js";
import { App } from "./app.js";

const VERSION = "0.1.0";

const HELP = `Specstar - Issue-Centric TUI

Usage: specstar [options]

Options:
  --config <path>  Config file path override
  --help, -h       Show this help
  --version, -v    Show version
`;

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "--help" || arg === "-h") {
    console.log(HELP);
    process.exit(0);
  }
  if (arg === "--version" || arg === "-v") {
    console.log(VERSION);
    process.exit(0);
  }
  if (arg === "--config" && i + 1 < args.length) {
    process.env["SPECSTAR_CONFIG_FILE"] = args[i + 1];
    i++; // skip value
  }
}

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

const config = loadConfig();
const db = initDatabase();

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

function shutdown() {
  try {
    db.close();
  } catch {
    // best-effort
  }
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

render(() => <App config={config} db={db} />);
