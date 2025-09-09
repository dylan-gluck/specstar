/**
 * Session Watcher
 * 
 * Provides debounced file watching for session files with content comparison
 * to prevent duplicate processing.
 */

import { EventEmitter } from 'node:events';
import { watch, existsSync, readFileSync } from 'node:fs';
import type { FSWatcher } from 'node:fs';
import { join } from 'node:path';

export interface WatcherOptions {
  debounceDelay?: number;
  compareContent?: boolean;
}

export interface FileChangeEvent {
  path: string;
  type: 'change' | 'rename';
  content?: string;
}

export class SessionWatcher extends EventEmitter {
  private watcher: FSWatcher | null = null;
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private lastContents: Map<string, string> = new Map();
  private options: Required<WatcherOptions>;
  private directory: string;
  
  constructor(directory: string, options: WatcherOptions = {}) {
    super();
    this.directory = directory;
    this.options = {
      debounceDelay: options.debounceDelay ?? 100,
      compareContent: options.compareContent ?? true
    };
  }
  
  /**
   * Start watching the directory for changes
   */
  async start(): Promise<void> {
    this.watch(this.directory);
  }
  
  /**
   * Start watching a directory for changes
   */
  watch(directory: string): void {
    if (this.watcher) {
      this.stop();
    }
    
    if (!existsSync(directory)) {
      throw new Error(`Directory does not exist: ${directory}`);
    }
    
    this.watcher = watch(directory, { recursive: true }, (eventType, filename) => {
      if (!filename) return;
      
      const fullPath = join(directory, filename);
      
      // Clear existing debounce timer for this file
      const existingTimer = this.debounceTimers.get(fullPath);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }
      
      // Set new debounce timer
      const timer = setTimeout(() => {
        this.handleFileChange(fullPath, eventType as 'change' | 'rename');
        this.debounceTimers.delete(fullPath);
      }, this.options.debounceDelay);
      
      this.debounceTimers.set(fullPath, timer);
    });
    
    this.watcher.on('error', (error) => {
      this.emit('error', error);
    });
  }
  
  /**
   * Stop watching
   */
  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    
    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    this.lastContents.clear();
  }
  
  /**
   * Handle a debounced file change
   */
  private handleFileChange(path: string, eventType: 'change' | 'rename'): void {
    // Skip if file doesn't exist (deleted)
    if (!existsSync(path)) {
      this.lastContents.delete(path);
      this.emit('error', new Error(`File deleted: ${path}`));
      return;
    }
    
    // Skip non-JSON files
    if (!path.endsWith('.json')) {
      return;
    }
    
    // Read file content
    let content: string;
    try {
      content = readFileSync(path, 'utf8');
    } catch (error) {
      this.emit('error', error);
      return;
    }
    
    // Check if this is a new session (wasn't tracked before)
    const isNewSession = !this.lastContents.has(path);
    
    // Compare content if enabled
    if (this.options.compareContent && !isNewSession) {
      const lastContent = this.lastContents.get(path);
      if (lastContent === content) {
        // Content hasn't changed, skip
        return;
      }
    }
    
    // Store content for future comparison
    if (this.options.compareContent) {
      this.lastContents.set(path, content);
    }
    
    // Try to parse as JSON and emit as SessionData
    try {
      const data = JSON.parse(content);
      
      if (isNewSession) {
        this.emit('new-session', data);
      } else {
        this.emit('change', data);
      }
    } catch (error) {
      // If JSON parsing fails, emit error
      this.emit('error', new Error(`Failed to parse JSON from ${path}: ${error}`));
    }
  }
  
  /**
   * Get the number of pending debounced changes
   */
  getPendingCount(): number {
    return this.debounceTimers.size;
  }
  
  /**
   * Check if watcher is active
   */
  isWatching(): boolean {
    return this.watcher !== null;
  }
}

export default SessionWatcher;