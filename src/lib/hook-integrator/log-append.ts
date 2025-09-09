/**
 * Log Append Utility
 * 
 * Provides atomic append operations for JSON log files.
 * Maintains append-only logs with proper formatting and error recovery.
 */

import { existsSync, readFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { atomicWriteFile } from './atomic-write';

export interface LogEntry {
  timestamp: string;
  [key: string]: any;
}

export interface LogAppendOptions {
  maxEntries?: number;
  ensureDir?: boolean;
  prettify?: boolean;
}

/**
 * Atomically appends an entry to a JSON log file.
 * The log file is a JSON array of entries.
 */
export function appendToLog(
  logPath: string,
  entry: LogEntry | Omit<LogEntry, 'timestamp'>,
  options: LogAppendOptions = {}
): void {
  const { maxEntries = 10000, ensureDir = true, prettify = true } = options;
  
  // Ensure entry has timestamp
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    ...entry
  };
  
  // Ensure directory exists
  if (ensureDir) {
    const dir = dirname(logPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
  
  // Read existing log entries
  let entries: LogEntry[] = [];
  if (existsSync(logPath)) {
    try {
      const content = readFileSync(logPath, 'utf8').trim();
      if (content) {
        entries = JSON.parse(content);
        if (!Array.isArray(entries)) {
          console.error(`Log file ${logPath} is not an array, resetting`);
          entries = [];
        }
      }
    } catch (error) {
      console.error(`Failed to parse log file ${logPath}, starting fresh:`, error);
      entries = [];
    }
  }
  
  // Append new entry
  entries.push(logEntry);
  
  // Trim if exceeds max entries (keep most recent)
  if (entries.length > maxEntries) {
    entries = entries.slice(-maxEntries);
  }
  
  // Write atomically
  const jsonContent = prettify 
    ? JSON.stringify(entries, null, 2)
    : JSON.stringify(entries);
    
  atomicWriteFile(logPath, jsonContent);
}

/**
 * Reads all entries from a log file.
 */
export function readLog(logPath: string): LogEntry[] {
  if (!existsSync(logPath)) {
    return [];
  }
  
  try {
    const content = readFileSync(logPath, 'utf8').trim();
    if (!content) return [];
    
    const entries = JSON.parse(content);
    if (!Array.isArray(entries)) {
      console.error(`Log file ${logPath} is not an array`);
      return [];
    }
    
    return entries;
  } catch (error) {
    console.error(`Failed to read log file ${logPath}:`, error);
    return [];
  }
}

/**
 * Creates a logger instance for repeated appends to the same log file.
 */
export class Logger {
  constructor(
    private logPath: string,
    private options: LogAppendOptions = {}
  ) {}
  
  append(entry: Omit<LogEntry, 'timestamp'>): void {
    appendToLog(this.logPath, entry, this.options);
  }
  
  read(): LogEntry[] {
    return readLog(this.logPath);
  }
  
  clear(): void {
    atomicWriteFile(this.logPath, '[]');
  }
  
  /**
   * Reads log entries within a time range.
   */
  readRange(startTime: Date, endTime: Date = new Date()): LogEntry[] {
    const entries = this.read();
    return entries.filter(entry => {
      const entryTime = new Date(entry.timestamp);
      return entryTime >= startTime && entryTime <= endTime;
    });
  }
  
  /**
   * Reads the most recent N entries.
   */
  readLast(count: number): LogEntry[] {
    const entries = this.read();
    return entries.slice(-count);
  }
}

// Re-export for convenience
export { Logger as default };