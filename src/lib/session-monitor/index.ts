#!/usr/bin/env bun
import { EventEmitter } from 'node:events';
import { watch } from 'node:fs';
import type { FSWatcher } from 'node:fs';
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

// Session data structures - matching actual .specstar/sessions/*/state.json
export interface SessionData {
  // Legacy properties (for compatibility)
  id?: string;
  startTime?: string;
  endTime?: string;
  status?: string;
  project?: string;
  user?: string;
  
  // Current properties
  session_id: string;
  session_title: string;
  session_active: boolean;
  created_at: string;
  updated_at: string;
  agents: string[];
  agents_history: Array<{
    name: string;
    started_at: string;
    completed_at?: string;
  }>;
  files: {
    new: string[];
    edited: string[];
    read: string[];
  };
  tools_used: Record<string, number>;
  errors: Array<{
    timestamp: string;
    type: string;
    message: string;
    context?: any;
  }>;
  prompts: Array<{
    timestamp: string;
    prompt: string;
  }>;
  notifications?: Array<{
    timestamp: string;
    message: string;
  }>;
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
  filesRead: number;
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

    // Sort by created_at time and return the most recent
    return activeSessions.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0] || null;
  }

  // Get historical session data
  async getSessionHistory(): Promise<SessionData[]> {
    const history: SessionData[] = [];
    
    try {
      // Read session directories from .specstar/sessions/*
      const sessionDirs = await readdir(this.options.sessionPath);
      
      for (const dir of sessionDirs) {
        const stateFile = join(this.options.sessionPath, dir, 'state.json');
        
        try {
          const content = await readFile(stateFile, 'utf-8');
          const session = JSON.parse(content) as SessionData;
          history.push(session);
        } catch (error) {
          // Skip invalid session directories
        }
      }
    } catch (error) {
      // Directory might not exist yet
      if ((error as any).code !== 'ENOENT') {
        console.error('Failed to read session history:', error);
      }
    }

    return history.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  // Get all active sessions
  getActiveSessions(): SessionData[] {
    return Array.from(this.sessions.values()).filter(
      session => session.session_active === true
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

    const startTime = new Date(session.created_at).getTime();
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Map from actual session data structure
    const filesCreated = session.files?.new?.length ?? 0;
    const filesModified = session.files?.edited?.length ?? 0;
    const filesDeleted = 0; // Not tracked in current structure
    const filesRead = session.files?.read?.length ?? 0;

    // Calculate command stats from tools_used
    const commandsExecuted = Object.values(session.tools_used || {}).reduce((sum, count) => sum + count, 0);
    const commandsSucceeded = commandsExecuted - (session.errors?.length ?? 0);
    const commandsFailed = session.errors?.length ?? 0;

    return {
      duration,
      filesCreated,
      filesModified,
      filesDeleted,
      filesRead,
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
          
          const sessionTime = session.updated_at 
            ? new Date(session.updated_at).getTime()
            : new Date(session.created_at).getTime();
          
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
    // Scan for existing session state files in .specstar/sessions/*/state.json
    try {
      const sessionDirs = await readdir(this.options.sessionPath);
      
      for (const dir of sessionDirs) {
        const stateFile = join(this.options.sessionPath, dir, 'state.json');
        try {
          await this.processSessionFile(stateFile);
        } catch (error) {
          // Skip invalid session directories
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
    // Watch the sessions directory for changes in state.json files
    const watcher = watch(
      this.options.sessionPath,
      { recursive: true },
      (eventType, filename) => {
        if (!filename || !this.isRunning) return;
        
        // Only process state.json files
        if (!filename.endsWith('state.json')) return;

        const fullPath = join(this.options.sessionPath, filename);
        
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

    this.watchers.set(this.options.sessionPath, watcher);
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
      
      // Ensure the data has required session fields (updated for actual structure)
      if (!sessionData.session_id || !sessionData.created_at) {
        // Not a valid session file, skip it
        return;
      }

      // Get previous version of this session
      const previousSession = this.sessions.get(sessionData.session_id);
      
      // Update session in memory
      this.sessions.set(sessionData.session_id, sessionData);

      // Detect and emit various events
      if (!previousSession) {
        // New session started
        this.handleSessionStart(sessionData);
      } else {
        // Check for changes
        this.detectChanges(previousSession, sessionData);
        
        // Check if session ended (session_active changed from true to false)
        if (previousSession.session_active && !sessionData.session_active) {
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
      id: session.session_id,
      endTime: session.updated_at,
      status: 'completed'
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
    // Detect file changes - check all file arrays
    const oldNewFiles = oldSession.files?.new?.length || 0;
    const newNewFiles = newSession.files?.new?.length || 0;
    const oldEditedFiles = oldSession.files?.edited?.length || 0;
    const newEditedFiles = newSession.files?.edited?.length || 0;
    const oldReadFiles = oldSession.files?.read?.length || 0;
    const newReadFiles = newSession.files?.read?.length || 0;
    
    if (newNewFiles > oldNewFiles || newEditedFiles > oldEditedFiles || newReadFiles > oldReadFiles) {
      // Files have been added/edited/read
      const event: SessionEvent = {
        type: 'file_change',
        timestamp: new Date().toISOString(),
        data: {
          new: newSession.files?.new || [],
          edited: newSession.files?.edited || [],
          read: newSession.files?.read || []
        }
      };

      this.emit('fileChange', event.data);
      this.emitToStream(event);

      // Trigger hook if available
      if (this.hookIntegrator) {
        (this.hookIntegrator as any).onFileChange?.(event.data);
      }
    }

    // Detect tool usage changes (instead of commands)
    const oldTools = Object.values(oldSession.tools_used || {}).reduce((sum, v) => sum + v, 0);
    const newTools = Object.values(newSession.tools_used || {}).reduce((sum, v) => sum + v, 0);
    
    if (newTools > oldTools) {
      // New tools used - emit as command event
      const event: SessionEvent = {
        type: 'command',
        timestamp: new Date().toISOString(),
        data: {
          tools_used: newSession.tools_used,
          count: newTools
        }
      };

      this.emit('command', event.data);
      this.emitToStream(event);
    }
  }

  private async saveSessionToHistory(session: SessionData): Promise<void> {
    try {
      // Session history is already saved by hooks in .specstar/sessions/<id>/state.json
      // We don't need to duplicate it
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