#!/usr/bin/env bun
/**
 * File System Watcher with Debouncing
 * 
 * Provides robust file watching capabilities with:
 * - Configurable debounce delays
 * - Multiple file pattern support
 * - Efficient handling of rapid changes
 * - Cross-platform compatibility
 */

import { EventEmitter } from 'node:events';
import { watch, statSync } from 'node:fs';
import type { FSWatcher } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { join, relative, resolve, basename, dirname } from 'node:path';
import { minimatch } from 'minimatch';

// ============================================================================
// Type Definitions
// ============================================================================

export interface WatcherOptions {
  /** Paths to watch (files or directories) */
  paths: string[];
  
  /** Glob patterns to include (match files by pattern) */
  patterns?: string[];
  
  /** Glob patterns to exclude (skip matching paths) */
  ignore?: string[];
  
  /** Debounce delay in milliseconds (default: 50) */
  debounceDelay?: number;
  
  /** Whether to watch recursively (default: true) */
  recursive?: boolean;
  
  /** Whether to emit initial events for existing files (default: false) */
  emitInitial?: boolean;
  
  /** Maximum depth for recursive watching (default: unlimited) */
  maxDepth?: number;
  
  /** Whether to follow symbolic links (default: false) */
  followSymlinks?: boolean;
  
  /** Custom filter function */
  filter?: (path: string) => boolean;
}

export interface FileEvent {
  /** Event type */
  type: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';
  
  /** Absolute path to the file/directory */
  path: string;
  
  /** Relative path from watch root */
  relativePath: string;
  
  /** Timestamp of the event */
  timestamp: Date;
  
  /** File stats (if available) */
  stats?: FileStats;
  
  /** Previous stats (for change events) */
  previousStats?: FileStats;
}

export interface FileStats {
  size: number;
  mtime: Date;
  ctime: Date;
  isDirectory: boolean;
  isFile: boolean;
  isSymbolicLink: boolean;
}

export interface WatcherStats {
  /** Number of files being watched */
  fileCount: number;
  
  /** Number of directories being watched */
  directoryCount: number;
  
  /** Total events emitted */
  eventCount: number;
  
  /** Events currently in debounce queue */
  pendingEvents: number;
  
  /** Start time of watching */
  startTime: Date;
  
  /** Uptime in milliseconds */
  uptime: number;
}

// ============================================================================
// Main FileWatcher Implementation
// ============================================================================

export class FileWatcher extends EventEmitter {
  private options: Required<WatcherOptions>;
  private watchers: Map<string, FSWatcher> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private fileStats: Map<string, FileStats> = new Map();
  private eventQueue: Map<string, FileEvent> = new Map();
  private isRunning: boolean = false;
  private startTime?: Date;
  private eventCount: number = 0;
  private watchedPaths: Set<string> = new Set();
  private ignorePatterns: string[] = [];
  private includePatterns: string[] = [];

  constructor(options: WatcherOptions) {
    super();
    
    this.options = {
      paths: options.paths,
      patterns: options.patterns || ['**/*'],
      ignore: options.ignore || ['**/node_modules/**', '**/.git/**', '**/.DS_Store'],
      debounceDelay: options.debounceDelay ?? 50,
      recursive: options.recursive ?? true,
      emitInitial: options.emitInitial ?? false,
      maxDepth: options.maxDepth ?? Infinity,
      followSymlinks: options.followSymlinks ?? false,
      filter: options.filter || (() => true)
    };
    
    this.ignorePatterns = this.options.ignore;
    this.includePatterns = this.options.patterns;
  }

  /**
   * Start watching files
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }
    
    this.isRunning = true;
    this.startTime = new Date();
    
    // Normalize and validate paths
    const normalizedPaths = this.options.paths.map(p => resolve(p));
    
    // Set up watchers for each path
    for (const watchPath of normalizedPaths) {
      await this.setupWatcher(watchPath);
    }
    
    // Emit initial events if requested
    if (this.options.emitInitial) {
      await this.emitInitialEvents(normalizedPaths);
    }
    
    this.emit('ready');
  }

  /**
   * Stop watching files
   */
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
    
    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    
    // Clear event queue
    this.eventQueue.clear();
    
    // Clear watched paths
    this.watchedPaths.clear();
    
    this.emit('close');
  }

  /**
   * Add a new path to watch
   */
  async addPath(path: string): Promise<void> {
    if (!this.isRunning) {
      throw new Error('Watcher is not running');
    }
    
    const normalizedPath = resolve(path);
    if (!this.watchedPaths.has(normalizedPath)) {
      await this.setupWatcher(normalizedPath);
    }
  }

  /**
   * Remove a path from watching
   */
  removePath(path: string): void {
    const normalizedPath = resolve(path);
    const watcher = this.watchers.get(normalizedPath);
    
    if (watcher) {
      watcher.close();
      this.watchers.delete(normalizedPath);
      this.watchedPaths.delete(normalizedPath);
    }
  }

  /**
   * Get current watcher statistics
   */
  getStats(): WatcherStats {
    const now = new Date();
    const uptime = this.startTime ? now.getTime() - this.startTime.getTime() : 0;
    
    let fileCount = 0;
    let directoryCount = 0;
    
    for (const stats of this.fileStats.values()) {
      if (stats.isDirectory) {
        directoryCount++;
      } else if (stats.isFile) {
        fileCount++;
      }
    }
    
    return {
      fileCount,
      directoryCount,
      eventCount: this.eventCount,
      pendingEvents: this.eventQueue.size,
      startTime: this.startTime || now,
      uptime
    };
  }

  /**
   * Check if a path matches the watch patterns
   */
  private matchesPatterns(filePath: string): boolean {
    // Check custom filter first
    if (this.options.filter && !this.options.filter(filePath)) {
      return false;
    }
    
    // Check ignore patterns
    for (const pattern of this.ignorePatterns) {
      if (minimatch(filePath, pattern, { dot: true })) {
        return false;
      }
    }
    
    // Check include patterns
    for (const pattern of this.includePatterns) {
      if (minimatch(filePath, pattern, { dot: true })) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Set up a watcher for a specific path
   */
  private async setupWatcher(watchPath: string): Promise<void> {
    try {
      // Check if path exists
      const pathStats = await stat(watchPath);
      
      if (pathStats.isDirectory()) {
        // Watch directory
        await this.watchDirectory(watchPath);
      } else if (pathStats.isFile()) {
        // Watch single file
        await this.watchFile(watchPath);
      }
      
      this.watchedPaths.add(watchPath);
      
    } catch (error) {
      this.emit('error', new Error(`Failed to watch path ${watchPath}: ${error}`));
    }
  }

  /**
   * Watch a directory
   */
  private async watchDirectory(dirPath: string, depth: number = 0): Promise<void> {
    if (depth > this.options.maxDepth) {
      return;
    }
    
    // Create watcher for this directory
    const watcher = watch(
      dirPath,
      { recursive: false }, // We handle recursion manually for better control
      (eventType, filename) => {
        if (!filename || !this.isRunning) return;
        
        const fullPath = join(dirPath, filename);
        this.handleFileEvent(eventType, fullPath);
      }
    );
    
    this.watchers.set(dirPath, watcher);
    
    // Store directory stats
    const stats = await stat(dirPath);
    this.fileStats.set(dirPath, this.convertStats(stats));
    
    // Recursively watch subdirectories if needed
    if (this.options.recursive) {
      try {
        const entries = await readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const entryPath = join(dirPath, entry.name);
          
          // Skip if doesn't match patterns
          if (!this.matchesPatterns(entryPath)) {
            continue;
          }
          
          if (entry.isDirectory()) {
            // Recursively watch subdirectory
            await this.watchDirectory(entryPath, depth + 1);
          } else if (entry.isFile()) {
            // Store file stats
            const fileStats = await stat(entryPath);
            this.fileStats.set(entryPath, this.convertStats(fileStats));
          }
        }
      } catch (error) {
        this.emit('error', new Error(`Failed to read directory ${dirPath}: ${error}`));
      }
    }
  }

  /**
   * Watch a single file
   */
  private async watchFile(filePath: string): Promise<void> {
    const dirPath = dirname(filePath);
    const fileName = basename(filePath);
    
    // Watch the parent directory for changes to this file
    if (!this.watchers.has(dirPath)) {
      const watcher = watch(
        dirPath,
        { recursive: false },
        (eventType, filename) => {
          if (!filename || !this.isRunning) return;
          
          // Only handle events for our specific file
          if (filename === fileName) {
            const fullPath = join(dirPath, filename);
            this.handleFileEvent(eventType, fullPath);
          }
        }
      );
      
      this.watchers.set(dirPath, watcher);
    }
    
    // Store file stats
    try {
      const stats = await stat(filePath);
      this.fileStats.set(filePath, this.convertStats(stats));
    } catch {
      // File might not exist yet
    }
  }

  /**
   * Handle file system events
   */
  private handleFileEvent(eventType: string, filePath: string): void {
    // Check if path matches patterns
    if (!this.matchesPatterns(filePath)) {
      return;
    }
    
    // Debounce the event
    this.debounceEvent(filePath, async () => {
      try {
        const previousStats = this.fileStats.get(filePath);
        let currentStats: FileStats | undefined;
        let fileEventType: FileEvent['type'];
        
        try {
          // Try to get current stats
          const stats = statSync(filePath);
          currentStats = this.convertStats(stats);
          
          if (!previousStats) {
            // New file/directory
            fileEventType = stats.isDirectory() ? 'addDir' : 'add';
          } else {
            // Existing file/directory changed
            fileEventType = 'change';
          }
          
          // Update stored stats
          this.fileStats.set(filePath, currentStats);
          
        } catch {
          // File/directory was deleted
          if (previousStats) {
            fileEventType = previousStats.isDirectory ? 'unlinkDir' : 'unlink';
            this.fileStats.delete(filePath);
          } else {
            // Unknown event, skip
            return;
          }
        }
        
        // Find the watch root for relative path
        let watchRoot = '';
        for (const root of this.watchedPaths) {
          if (filePath.startsWith(root)) {
            watchRoot = root;
            break;
          }
        }
        
        // Create and emit the event
        const event: FileEvent = {
          type: fileEventType,
          path: filePath,
          relativePath: relative(watchRoot, filePath),
          timestamp: new Date(),
          stats: currentStats,
          previousStats
        };
        
        this.emitEvent(event);
        
        // Handle new directories
        if (fileEventType === 'addDir' && this.options.recursive) {
          await this.watchDirectory(filePath);
        }
        
      } catch (error) {
        this.emit('error', error);
      }
    });
  }

  /**
   * Debounce file events
   */
  private debounceEvent(path: string, callback: () => Promise<void>): void {
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

  /**
   * Emit a file event
   */
  private emitEvent(event: FileEvent): void {
    this.eventCount++;
    this.emit('all', event);
    this.emit(event.type, event);
  }

  /**
   * Emit initial events for existing files
   */
  private async emitInitialEvents(paths: string[]): Promise<void> {
    for (const watchPath of paths) {
      await this.scanPath(watchPath);
    }
  }

  /**
   * Recursively scan a path and emit events for existing files
   */
  private async scanPath(scanPath: string, depth: number = 0): Promise<void> {
    if (depth > this.options.maxDepth) {
      return;
    }
    
    try {
      const pathStats = await stat(scanPath);
      
      if (pathStats.isDirectory()) {
        // Emit addDir event
        if (this.matchesPatterns(scanPath)) {
          const event: FileEvent = {
            type: 'addDir',
            path: scanPath,
            relativePath: relative(process.cwd(), scanPath),
            timestamp: new Date(),
            stats: this.convertStats(pathStats)
          };
          this.emitEvent(event);
        }
        
        // Scan directory contents
        if (this.options.recursive) {
          const entries = await readdir(scanPath, { withFileTypes: true });
          
          for (const entry of entries) {
            const entryPath = join(scanPath, entry.name);
            await this.scanPath(entryPath, depth + 1);
          }
        }
      } else if (pathStats.isFile()) {
        // Emit add event
        if (this.matchesPatterns(scanPath)) {
          const event: FileEvent = {
            type: 'add',
            path: scanPath,
            relativePath: relative(process.cwd(), scanPath),
            timestamp: new Date(),
            stats: this.convertStats(pathStats)
          };
          this.emitEvent(event);
        }
      }
    } catch (error) {
      // Path might not exist or be inaccessible
      this.emit('error', new Error(`Failed to scan path ${scanPath}: ${error}`));
    }
  }

  /**
   * Convert Node.js Stats to FileStats
   */
  private convertStats(stats: any): FileStats {
    return {
      size: stats.size,
      mtime: stats.mtime,
      ctime: stats.ctime,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
      isSymbolicLink: stats.isSymbolicLink()
    };
  }

  /**
   * Batch process events (for optimization)
   */
  async processBatch(timeout: number = 100): Promise<FileEvent[]> {
    return new Promise((resolve) => {
      const events: FileEvent[] = [];
      
      // Collect events for the specified timeout
      const collector = (event: FileEvent) => {
        events.push(event);
      };
      
      this.on('all', collector);
      
      setTimeout(() => {
        this.off('all', collector);
        resolve(events);
      }, timeout);
    });
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a simple file watcher
 */
export function createWatcher(options: WatcherOptions): FileWatcher {
  return new FileWatcher(options);
}

/**
 * Watch a single path with default options
 */
export async function watchPath(
  path: string,
  callback: (event: FileEvent) => void
): Promise<FileWatcher> {
  const watcher = new FileWatcher({
    paths: [path],
    recursive: true
  });
  
  watcher.on('all', callback);
  await watcher.start();
  
  return watcher;
}

/**
 * Watch multiple paths with patterns
 */
export async function watchPatterns(
  paths: string[],
  patterns: string[],
  callback: (event: FileEvent) => void
): Promise<FileWatcher> {
  const watcher = new FileWatcher({
    paths,
    patterns,
    recursive: true
  });
  
  watcher.on('all', callback);
  await watcher.start();
  
  return watcher;
}

export default FileWatcher;