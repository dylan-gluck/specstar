#!/usr/bin/env bun
import { EventEmitter } from 'node:events';
import { watch, FSWatcher } from 'node:fs';
import { readFile, readdir, mkdir, unlink } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { Readable } from 'node:stream';
import type { HookIntegrator } from '../hook-integrator';

// Core interfaces for session monitoring
export interface SessionMonitorOptions {
  sessionPath: string;  // Path to store session history
  claudePath?: string;  // Path to Claude Code session files
  pollingInterval?: number;  // Polling interval in ms (default: 100)
  debounceDelay?: number;  // Debounce delay for file changes (default: 50)
}

// Session data structures
export interface SessionData {
  id: string;
  startTime: string;
  endTime?: string;
  status?: 'active' | 'completed' | 'error';
  user?: string;
  project?: string;
  files?: FileChange[];
  commands?: CommandExecution[];
  agents?: any[];
  timestamp?: string;
}

export interface FileChange {
  path: string;
  action: 'created' | 'modified' | 'deleted';
  timestamp?: string;
}

export interface CommandExecution {
  command: string;
  timestamp?: string;
  exitCode?: number;
  output?: string;
}

export interface SessionStats {
  duration: number;
  filesCreated: number;
  filesModified: number;
  filesDeleted: number;
  commandsExecuted: number;
  commandsSucceeded: number;
  commandsFailed: number;
}

export interface SessionEvent {
  type: 'session_start' | 'session_end' | 'file_change' | 'command' | 'error';
  timestamp: string;
  data: any;
}

// Main SessionMonitor implementation
export class SessionMonitor extends EventEmitter {
  private options: Required<SessionMonitorOptions>;
  private watchers: Map<string, FSWatcher> = new Map();
  private sessions: Map<string, SessionData> = new Map();
  private hookIntegrator?: HookIntegrator;
  private isRunning: boolean = false;
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private lastFileContents: Map<string, string> = new Map();
  private eventStream?: Readable;
  private streamListeners: Set<(event: SessionEvent) => void> = new Set();

  constructor(options: SessionMonitorOptions) {
    super();
    this.options = {
      sessionPath: options.sessionPath,
      claudePath: options.claudePath || join(process.cwd(), '.claude'),
      pollingInterval: options.pollingInterval ?? 100,
      debounceDelay: options.debounceDelay ?? 50
    };
  }

  // Start monitoring session files
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Ensure directories exist
    await this.ensureDirectories();

    // Set up file watchers first
    this.setupWatchers();
    
    // Then do initial scan for existing sessions
    await this.scanForSessions();
  }

  // Stop monitoring
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // Clear all watchers
    for (const [path, watcher] of this.watchers) {
      watcher.close();
    }
    this.watchers.clear();

    // Clear debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    // Clear event stream
    if (this.eventStream) {
      this.eventStream.destroy();
      this.eventStream = undefined;
    }
  }

  // Register callback for session updates
  onUpdate(callback: (data: SessionData) => void): void {
    this.on('update', callback);
  }

  // Get current session data
  getCurrentSession(): SessionData | null {
    // Return the most recently started active session
    const activeSessions = this.getActiveSessions();
    if (activeSessions.length === 0) {
      return null;
    }

    // Sort by start time and return the most recent
    return activeSessions.sort((a, b) => 
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    )[0];
  }

  // Get historical session data
  async getSessionHistory(): Promise<SessionData[]> {
    const history: SessionData[] = [];
    
    try {
      const files = await readdir(this.options.sessionPath);
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        try {
          const content = await readFile(join(this.options.sessionPath, file), 'utf-8');
          const session = JSON.parse(content) as SessionData;
          history.push(session);
        } catch (error) {
          // Skip corrupted files
          console.error(`Failed to read session file ${file}:`, error);
        }
      }
    } catch (error) {
      // Directory might not exist yet
      if ((error as any).code !== 'ENOENT') {
        console.error('Failed to read session history:', error);
      }
    }

    return history.sort((a, b) => 
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
  }

  // Get all active sessions
  getActiveSessions(): SessionData[] {
    return Array.from(this.sessions.values()).filter(
      session => !session.endTime && session.status !== 'completed'
    );
  }

  // Set hook integrator for lifecycle events
  setHookIntegrator(integrator: HookIntegrator): void {
    this.hookIntegrator = integrator;
  }

  // Get session statistics
  getSessionStats(sessionId: string): SessionStats | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    const startTime = new Date(session.startTime).getTime();
    const endTime = session.endTime ? new Date(session.endTime).getTime() : Date.now();
    const duration = endTime - startTime;

    const filesCreated = session.files?.filter(f => f.action === 'created').length ?? 0;
    const filesModified = session.files?.filter(f => f.action === 'modified').length ?? 0;
    const filesDeleted = session.files?.filter(f => f.action === 'deleted').length ?? 0;

    const commandsExecuted = session.commands?.length ?? 0;
    const commandsSucceeded = session.commands?.filter(c => c.exitCode === 0).length ?? 0;
    const commandsFailed = commandsExecuted - commandsSucceeded;

    return {
      duration,
      filesCreated,
      filesModified,
      filesDeleted,
      commandsExecuted,
      commandsSucceeded,
      commandsFailed
    };
  }

  // Stream session events in real-time
  streamEvents(): Readable {
    if (!this.eventStream) {
      this.eventStream = new Readable({
        read() {},
        objectMode: true
      });

      // Forward events to stream
      const streamHandler = (event: SessionEvent) => {
        this.eventStream?.push(event);
      };

      this.streamListeners.add(streamHandler);
    }

    return this.eventStream;
  }

  // Clean up old session files
  async cleanupOldSessions(daysToKeep: number): Promise<void> {
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);

    try {
      const files = await readdir(this.options.sessionPath);
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const filePath = join(this.options.sessionPath, file);
        
        try {
          const content = await readFile(filePath, 'utf-8');
          const session = JSON.parse(content) as SessionData;
          
          const sessionTime = session.endTime 
            ? new Date(session.endTime).getTime()
            : new Date(session.startTime).getTime();
          
          if (sessionTime < cutoffTime) {
            await unlink(filePath);
          }
        } catch (error) {
          console.error(`Failed to process session file ${file}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old sessions:', error);
    }
  }

  // Private helper methods

  private async ensureDirectories(): Promise<void> {
    // Ensure session history directory exists
    await mkdir(this.options.sessionPath, { recursive: true });
    
    // Ensure Claude directory exists (parent might create it)
    await mkdir(this.options.claudePath, { recursive: true });
  }

  private async scanForSessions(): Promise<void> {
    // Scan for existing Claude session files
    try {
      const files = await readdir(this.options.claudePath);
      
      for (const file of files) {
        // Process any JSON file that might be a session
        if (file.endsWith('.json')) {
          await this.processSessionFile(join(this.options.claudePath, file));
        }
      }
    } catch (error) {
      // Directory might not exist yet, which is fine
      if ((error as any).code !== 'ENOENT') {
        console.error('Failed to scan for sessions:', error);
      }
    }
  }

  private setupWatchers(): void {
    // Watch the Claude directory for session files
    const watcher = watch(
      this.options.claudePath,
      { recursive: false },
      (eventType, filename) => {
        if (!filename || !this.isRunning) return;
        
        // Only process JSON files
        if (!filename.endsWith('.json')) return;

        const fullPath = join(this.options.claudePath, filename);
        
        // Process file immediately without debouncing for new files
        // but debounce for changes to existing files
        if (eventType === 'rename') {
          // New file created, process immediately
          this.processSessionFile(fullPath).catch(error => {
            console.error(`Failed to process new file ${fullPath}:`, error);
          });
        } else {
          // File changed, debounce
          this.debounceFileChange(fullPath, async () => {
            await this.processSessionFile(fullPath);
          });
        }
      }
    );

    this.watchers.set(this.options.claudePath, watcher);
  }

  private debounceFileChange(path: string, callback: () => Promise<void>): void {
    // Clear existing timer for this path
    const existingTimer = this.debounceTimers.get(path);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new debounced timer
    const timer = setTimeout(async () => {
      this.debounceTimers.delete(path);
      await callback();
    }, this.options.debounceDelay);

    this.debounceTimers.set(path, timer);
  }

  private async processSessionFile(filePath: string): Promise<void> {
    try {
      // Read and parse the session file
      const content = await readFile(filePath, 'utf-8');
      
      // Check if content has changed
      const lastContent = this.lastFileContents.get(filePath);
      if (lastContent === content) {
        return; // No changes
      }
      this.lastFileContents.set(filePath, content);

      let sessionData: SessionData;
      try {
        sessionData = JSON.parse(content);
      } catch (parseError) {
        // Emit error for corrupted JSON
        const errorEvent: SessionEvent = {
          type: 'error',
          timestamp: new Date().toISOString(),
          data: {
            type: 'parse_error',
            message: `Failed to parse JSON: ${parseError}`,
            file: filePath
          }
        };
        
        this.emit('error', errorEvent.data);
        this.emitToStream(errorEvent);
        return;
      }
      
      // Ensure the data has required session fields
      if (!sessionData.id || !sessionData.startTime) {
        // Not a valid session file, skip it
        return;
      }

      // Get previous version of this session
      const previousSession = this.sessions.get(sessionData.id);
      
      // Update session in memory
      this.sessions.set(sessionData.id, sessionData);

      // Detect and emit various events
      if (!previousSession) {
        // New session started
        this.handleSessionStart(sessionData);
      } else {
        // Check for changes
        this.detectChanges(previousSession, sessionData);
        
        // Check if session ended
        if (!previousSession.endTime && sessionData.endTime) {
          this.handleSessionEnd(sessionData);
        }
      }

      // Save to history
      await this.saveSessionToHistory(sessionData);

      // Emit general update event
      this.emit('update', sessionData);

    } catch (error) {
      // File might have been deleted or is inaccessible
      if ((error as any).code !== 'ENOENT') {
        console.error(`Failed to process session file ${filePath}:`, error);
      }
    }
  }

  private handleSessionStart(session: SessionData): void {
    const event: SessionEvent = {
      type: 'session_start',
      timestamp: new Date().toISOString(),
      data: session
    };

    this.emit('sessionStart', session);
    this.emitToStream(event);

    // Trigger hook if available
    if (this.hookIntegrator) {
      (this.hookIntegrator as any).onSessionStart?.(session);
    }
  }

  private handleSessionEnd(session: SessionData): void {
    const endData = {
      id: session.id,
      endTime: session.endTime,
      status: session.status || 'completed'
    };

    const event: SessionEvent = {
      type: 'session_end',
      timestamp: new Date().toISOString(),
      data: endData
    };

    this.emit('sessionEnd', endData);
    this.emitToStream(event);

    // Trigger hook if available
    if (this.hookIntegrator) {
      (this.hookIntegrator as any).onSessionEnd?.(session);
    }
  }

  private detectChanges(oldSession: SessionData, newSession: SessionData): void {
    // Detect file changes
    const oldFiles = oldSession.files || [];
    const newFiles = newSession.files || [];
    
    if (newFiles.length > oldFiles.length) {
      // New files added
      const addedFiles = newFiles.slice(oldFiles.length);
      for (const file of addedFiles) {
        const event: SessionEvent = {
          type: 'file_change',
          timestamp: new Date().toISOString(),
          data: file
        };

        this.emit('fileChange', file);
        this.emitToStream(event);

        // Trigger hook if available
        if (this.hookIntegrator) {
          (this.hookIntegrator as any).onFileChange?.(file);
        }
      }
    }

    // Detect command executions
    const oldCommands = oldSession.commands || [];
    const newCommands = newSession.commands || [];
    
    if (newCommands.length > oldCommands.length) {
      // New commands executed
      const addedCommands = newCommands.slice(oldCommands.length);
      for (const command of addedCommands) {
        const event: SessionEvent = {
          type: 'command',
          timestamp: new Date().toISOString(),
          data: command
        };

        this.emit('command', command);
        this.emitToStream(event);
      }
    }
  }

  private async saveSessionToHistory(session: SessionData): Promise<void> {
    try {
      const historyFile = join(this.options.sessionPath, `${session.id}.json`);
      await Bun.write(historyFile, JSON.stringify(session, null, 2));
    } catch (error) {
      console.error(`Failed to save session ${session.id} to history:`, error);
    }
  }

  private emitToStream(event: SessionEvent): void {
    for (const listener of this.streamListeners) {
      listener(event);
    }
  }
}

export default SessionMonitor;