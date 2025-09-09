/**
 * Atomic Write Utility
 * 
 * Provides atomic file write operations using the temp file + rename pattern
 * to prevent corruption during concurrent access.
 */

import { writeFileSync, renameSync, existsSync, readFileSync } from 'fs';
import { randomBytes } from 'crypto';
import { dirname } from 'path';
import { mkdirSync } from 'fs';

export interface AtomicWriteOptions {
  encoding?: BufferEncoding;
  mode?: number;
  ensureDir?: boolean;
}

/**
 * Atomically writes data to a file by writing to a temp file then renaming.
 * This prevents partial writes from being visible and handles concurrent access.
 */
export function atomicWriteFile(
  filepath: string,
  data: string | Buffer,
  options: AtomicWriteOptions = {}
): void {
  const { encoding = 'utf8', mode = 0o644, ensureDir = true } = options;
  
  // Ensure directory exists
  if (ensureDir) {
    const dir = dirname(filepath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
  
  // Generate unique temp filename
  const tempFile = `${filepath}.${randomBytes(8).toString('hex')}.tmp`;
  
  try {
    // Write to temp file
    writeFileSync(tempFile, data, { encoding, mode });
    
    // Atomic rename (this is atomic on most filesystems)
    renameSync(tempFile, filepath);
  } catch (error) {
    // Clean up temp file if it exists
    try {
      if (existsSync(tempFile)) {
        require('fs').unlinkSync(tempFile);
      }
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}

/**
 * Atomically updates a JSON file, preserving structure and preventing corruption.
 */
export function atomicUpdateJSON<T = any>(
  filepath: string,
  updater: (data: T) => T,
  defaultValue: T,
  options: AtomicWriteOptions = {}
): T {
  let currentData: T;
  
  // Read existing data or use default
  if (existsSync(filepath)) {
    try {
      const content = readFileSync(filepath, 'utf8');
      currentData = JSON.parse(content);
    } catch (error) {
      console.error(`Failed to parse JSON from ${filepath}, using default:`, error);
      currentData = defaultValue;
    }
  } else {
    currentData = defaultValue;
  }
  
  // Apply update
  const updatedData = updater(currentData);
  
  // Write atomically with pretty formatting
  atomicWriteFile(
    filepath,
    JSON.stringify(updatedData, null, 2),
    options
  );
  
  return updatedData;
}

/**
 * Creates an atomic writer instance for repeated writes to the same file.
 */
export class AtomicWriter {
  constructor(
    private filepath: string,
    private options: AtomicWriteOptions = {}
  ) {}
  
  write(data: string | Buffer): void {
    atomicWriteFile(this.filepath, data, this.options);
  }
  
  writeJSON(data: any): void {
    this.write(JSON.stringify(data, null, 2));
  }
  
  updateJSON<T = any>(updater: (data: T) => T, defaultValue: T): T {
    return atomicUpdateJSON(this.filepath, updater, defaultValue, this.options);
  }
}

// Re-export for convenience
export { AtomicWriter as default };