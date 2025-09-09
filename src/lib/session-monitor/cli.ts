#!/usr/bin/env bun

import meow from 'meow';
import { SessionMonitor } from './index.js';
import type { SessionData, SessionStats } from './index.js';
import { join } from 'path';
import { homedir } from 'os';

const cli = meow(`
  Usage
    $ session-monitor <command> [options]

  Commands
    watch [path]         Watch for session changes in real-time
    list                 List all sessions (active and historical)
    replay <id>          Replay a specific session
    export [id]          Export session data (all or specific session)

  Options
    --session-path, -s   Path to session storage (default: .specstar/sessions)
    --claude-path, -c    Path to Claude Code sessions (default: .claude)
    --json               Output in JSON format
    --active             Show only active sessions
    --limit <n>          Limit number of results
    --days <n>           Clean up sessions older than n days
    --follow, -f         Follow mode for watch command
    --stats              Include statistics in output
    --help               Show this help message
    --version            Show version

  Examples
    $ session-monitor watch
    $ session-monitor watch --follow
    $ session-monitor list --active
    $ session-monitor list --limit 10 --json
    $ session-monitor replay abc123
    $ session-monitor export --json > sessions.json
    $ session-monitor export abc123 --stats
`, {
  importMeta: import.meta,
  flags: {
    sessionPath: {
      type: 'string',
      alias: 's',
      default: '.specstar/sessions'
    },
    claudePath: {
      type: 'string',
      alias: 'c',
      default: '.claude'
    },
    json: {
      type: 'boolean',
      default: false
    },
    active: {
      type: 'boolean',
      default: false
    },
    limit: {
      type: 'number'
    },
    days: {
      type: 'number'
    },
    follow: {
      type: 'boolean',
      alias: 'f',
      default: false
    },
    stats: {
      type: 'boolean',
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

// Helper function to format duration
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

// Helper function to format session for display
function formatSession(session: SessionData, stats?: SessionStats): string {
  const lines: string[] = [];
  
  lines.push(`Session ID: ${session.id}`);
  lines.push(`Start Time: ${new Date(session.startTime).toLocaleString()}`);
  
  if (session.endTime) {
    lines.push(`End Time: ${new Date(session.endTime).toLocaleString()}`);
  } else {
    lines.push(`Status: ${session.status || 'active'}`);
  }
  
  if (session.project) {
    lines.push(`Project: ${session.project}`);
  }
  
  if (session.user) {
    lines.push(`User: ${session.user}`);
  }
  
  if (stats) {
    lines.push('');
    lines.push('Statistics:');
    lines.push(`  Duration: ${formatDuration(stats.duration)}`);
    lines.push(`  Files: ${stats.filesCreated} created, ${stats.filesModified} modified, ${stats.filesDeleted} deleted`);
    lines.push(`  Commands: ${stats.commandsExecuted} executed (${stats.commandsSucceeded} succeeded, ${stats.commandsFailed} failed)`);
  }
  
  if (session.files && session.files.length > 0) {
    lines.push('');
    lines.push(`Files Changed (${session.files.length}):`);
    const recentFiles = session.files.slice(-5);
    for (const file of recentFiles) {
      lines.push(`  ${file.action}: ${file.path}`);
    }
    if (session.files.length > 5) {
      lines.push(`  ... and ${session.files.length - 5} more`);
    }
  }
  
  if (session.commands && session.commands.length > 0) {
    lines.push('');
    lines.push(`Commands Executed (${session.commands.length}):`);
    const recentCommands = session.commands.slice(-5);
    for (const cmd of recentCommands) {
      const status = cmd.exitCode === 0 ? '✓' : '✗';
      lines.push(`  ${status} ${cmd.command}`);
    }
    if (session.commands.length > 5) {
      lines.push(`  ... and ${session.commands.length - 5} more`);
    }
  }
  
  return lines.join('\n');
}

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

// Main CLI logic
async function main() {
  const command = cli.input[0];
  const monitor = new SessionMonitor({
    sessionPath: cli.flags.sessionPath,
    claudePath: cli.flags.claudePath
  });

  try {
    switch (command) {
      case 'watch': {
        await monitor.start();
        
        console.log('Watching for session changes...');
        console.log(`Session path: ${cli.flags.sessionPath}`);
        console.log(`Claude path: ${cli.flags.claudePath}`);
        console.log('');
        
        // Set up event handlers
        monitor.on('sessionStart', (session: SessionData) => {
          console.log(`[${new Date().toLocaleTimeString()}] Session started: ${session.id}`);
          if (!cli.flags.json) {
            console.log(`  Project: ${session.project || 'unknown'}`);
            console.log(`  User: ${session.user || 'unknown'}`);
          } else {
            output({ event: 'session_start', session }, true);
          }
        });
        
        monitor.on('sessionEnd', (data: any) => {
          console.log(`[${new Date().toLocaleTimeString()}] Session ended: ${data.id}`);
          if (cli.flags.json) {
            output({ event: 'session_end', data }, true);
          }
        });
        
        monitor.on('fileChange', (file: any) => {
          if (!cli.flags.json) {
            console.log(`[${new Date().toLocaleTimeString()}] File ${file.action}: ${file.path}`);
          } else {
            output({ event: 'file_change', file }, true);
          }
        });
        
        monitor.on('command', (cmd: any) => {
          if (!cli.flags.json) {
            const status = cmd.exitCode === 0 ? '✓' : '✗';
            console.log(`[${new Date().toLocaleTimeString()}] Command ${status}: ${cmd.command}`);
          } else {
            output({ event: 'command', command: cmd }, true);
          }
        });
        
        monitor.on('error', (err: any) => {
          console.error(`[${new Date().toLocaleTimeString()}] Error:`, err);
        });
        
        // Keep process running
        if (cli.flags.follow) {
          // In follow mode, keep running indefinitely
          await new Promise(() => {});
        } else {
          // Otherwise, run for a short time then exit
          await new Promise(resolve => setTimeout(resolve, 5000));
          await monitor.stop();
          console.log('\nStopped watching.');
        }
        break;
      }

      case 'list': {
        await monitor.start();
        
        let sessions: SessionData[];
        
        if (cli.flags.active) {
          sessions = monitor.getActiveSessions();
        } else {
          sessions = await monitor.getSessionHistory();
        }
        
        // Apply limit if specified
        if (cli.flags.limit) {
          sessions = sessions.slice(0, cli.flags.limit);
        }
        
        // Clean up old sessions if requested
        if (cli.flags.days) {
          await monitor.cleanupOldSessions(cli.flags.days);
          console.log(`Cleaned up sessions older than ${cli.flags.days} days\n`);
        }
        
        if (cli.flags.json) {
          // Include stats if requested
          if (cli.flags.stats) {
            const sessionsWithStats = sessions.map(session => ({
              ...session,
              stats: monitor.getSessionStats(session.id)
            }));
            output(sessionsWithStats, true);
          } else {
            output(sessions, true);
          }
        } else {
          if (sessions.length === 0) {
            console.log(cli.flags.active ? 'No active sessions' : 'No sessions found');
          } else {
            console.log(`Found ${sessions.length} ${cli.flags.active ? 'active' : ''} session(s):\n`);
            
            for (const session of sessions) {
              const stats = cli.flags.stats ? monitor.getSessionStats(session.id) : undefined;
              console.log(formatSession(session, stats));
              console.log('---');
            }
          }
        }
        
        await monitor.stop();
        break;
      }

      case 'replay': {
        const sessionId = cli.input[1];
        if (!sessionId) {
          error('Session ID is required for replay command');
        }
        
        await monitor.start();
        const history = await monitor.getSessionHistory();
        const session = history.find(s => s.id === sessionId);
        
        if (!session) {
          error(`Session ${sessionId} not found`);
        }
        
        console.log(`Replaying session ${sessionId}...\n`);
        
        // Simulate replay by showing events in order
        const events: Array<{ type: string; time: string; data: any }> = [];
        
        // Add start event
        events.push({
          type: 'start',
          time: session.startTime,
          data: { project: session.project, user: session.user }
        });
        
        // Add file events
        if (session.files) {
          for (const file of session.files) {
            events.push({
              type: 'file',
              time: file.timestamp || session.startTime,
              data: file
            });
          }
        }
        
        // Add command events
        if (session.commands) {
          for (const cmd of session.commands) {
            events.push({
              type: 'command',
              time: cmd.timestamp || session.startTime,
              data: cmd
            });
          }
        }
        
        // Add end event
        if (session.endTime) {
          events.push({
            type: 'end',
            time: session.endTime,
            data: { status: session.status }
          });
        }
        
        // Sort events by time
        events.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
        
        // Display events
        if (cli.flags.json) {
          output(events, true);
        } else {
          for (const event of events) {
            const time = new Date(event.time).toLocaleTimeString();
            
            switch (event.type) {
              case 'start':
                console.log(`[${time}] Session started`);
                if (event.data.project) console.log(`  Project: ${event.data.project}`);
                if (event.data.user) console.log(`  User: ${event.data.user}`);
                break;
              
              case 'file':
                console.log(`[${time}] File ${event.data.action}: ${event.data.path}`);
                break;
              
              case 'command':
                const status = event.data.exitCode === 0 ? '✓' : '✗';
                console.log(`[${time}] Command ${status}: ${event.data.command}`);
                if (event.data.output && !cli.flags.json) {
                  const outputLines = event.data.output.split('\n').slice(0, 3);
                  for (const line of outputLines) {
                    console.log(`    ${line}`);
                  }
                }
                break;
              
              case 'end':
                console.log(`[${time}] Session ended (${event.data.status || 'completed'})`);
                break;
            }
          }
          
          // Show statistics
          if (cli.flags.stats) {
            const stats = monitor.getSessionStats(sessionId);
            if (stats) {
              console.log('\nSession Statistics:');
              console.log(`  Duration: ${formatDuration(stats.duration)}`);
              console.log(`  Files: ${stats.filesCreated} created, ${stats.filesModified} modified, ${stats.filesDeleted} deleted`);
              console.log(`  Commands: ${stats.commandsExecuted} executed (${stats.commandsSucceeded} succeeded, ${stats.commandsFailed} failed)`);
            }
          }
        }
        
        await monitor.stop();
        break;
      }

      case 'export': {
        const sessionId = cli.input[1];
        
        await monitor.start();
        const history = await monitor.getSessionHistory();
        
        if (sessionId) {
          // Export specific session
          const session = history.find(s => s.id === sessionId);
          
          if (!session) {
            error(`Session ${sessionId} not found`);
          }
          
          if (cli.flags.stats) {
            const stats = monitor.getSessionStats(sessionId);
            const sessionWithStats = { ...session, stats };
            output(sessionWithStats, cli.flags.json);
          } else {
            output(session, cli.flags.json);
          }
        } else {
          // Export all sessions
          if (cli.flags.stats) {
            const sessionsWithStats = history.map(session => ({
              ...session,
              stats: monitor.getSessionStats(session.id)
            }));
            output(sessionsWithStats, cli.flags.json);
          } else {
            output(history, cli.flags.json);
          }
        }
        
        await monitor.stop();
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
export { SessionMonitor, cli };

// Run if executed directly
if (import.meta.main) {
  main();
}