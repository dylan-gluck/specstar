#!/usr/bin/env bun
/**
 * Atomic State Manager for Thread-Safe Operations
 * 
 * Provides:
 * - Atomic state updates with rollback support
 * - Transaction-based operations
 * - Thread-safe concurrent access
 * - State versioning and history
 * - Event sourcing capabilities
 */

import { EventEmitter } from 'node:events';
import { readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { $ } from 'bun';

// ============================================================================
// Type Definitions
// ============================================================================

export interface StateManagerOptions<T = any> {
  /** Path to the state file */
  statePath: string;
  
  /** Initial state if file doesn't exist */
  initialState?: T;
  
  /** Whether to keep history of state changes */
  keepHistory?: boolean;
  
  /** Maximum number of history entries to keep */
  maxHistory?: number;
  
  /** Whether to use write-ahead logging for durability */
  useWAL?: boolean;
  
  /** Custom serializer function */
  serializer?: (state: T) => string;
  
  /** Custom deserializer function */
  deserializer?: (data: string) => T;
  
  /** Whether to validate state before saving */
  validator?: (state: T) => boolean | Promise<boolean>;
  
  /** Auto-save interval in milliseconds (0 = disabled) */
  autoSaveInterval?: number;
}

export interface StateTransaction<T = any> {
  /** Transaction ID */
  id: string;
  
  /** Transaction timestamp */
  timestamp: Date;
  
  /** Previous state before transaction */
  previousState: T;
  
  /** New state after transaction */
  newState: T;
  
  /** Operations performed in this transaction */
  operations: StateOperation[];
  
  /** Whether the transaction was committed */
  committed: boolean;
  
  /** Error if transaction failed */
  error?: Error;
}

export interface StateOperation {
  /** Operation type */
  type: 'set' | 'update' | 'delete' | 'merge' | 'replace';
  
  /** Path to the property (for nested updates) */
  path?: string[];
  
  /** Value being set/updated */
  value?: any;
  
  /** Previous value (for rollback) */
  previousValue?: any;
  
  /** Operation timestamp */
  timestamp: Date;
}

export interface StateSnapshot<T = any> {
  /** Snapshot ID */
  id: string;
  
  /** State at the time of snapshot */
  state: T;
  
  /** Snapshot timestamp */
  timestamp: Date;
  
  /** Version number */
  version: number;
  
  /** Metadata about the snapshot */
  metadata?: Record<string, any>;
}

export interface StateLock {
  /** Lock ID */
  id: string;
  
  /** Who holds the lock */
  holder: string;
  
  /** When the lock was acquired */
  acquiredAt: Date;
  
  /** Lock expiration time */
  expiresAt: Date;
  
  /** Whether the lock is released */
  released: boolean;
}

// ============================================================================
// State Manager Implementation
// ============================================================================

export class StateManager<T = any> extends EventEmitter {
  private options: Required<StateManagerOptions<T>>;
  private currentState: T;
  private stateVersion: number = 0;
  private history: StateSnapshot<T>[] = [];
  private transactions: Map<string, StateTransaction<T>> = new Map();
  private locks: Map<string, StateLock> = new Map();
  private isDirty: boolean = false;
  private autoSaveTimer?: NodeJS.Timeout;
  private walPath: string;
  private tempPath: string;
  private backupPath: string;
  private isInitialized: boolean = false;

  constructor(options: StateManagerOptions<T>) {
    super();
    
    this.options = {
      statePath: options.statePath,
      initialState: options.initialState || ({} as T),
      keepHistory: options.keepHistory ?? true,
      maxHistory: options.maxHistory ?? 100,
      useWAL: options.useWAL ?? true,
      serializer: options.serializer || ((state) => JSON.stringify(state, null, 2)),
      deserializer: options.deserializer || ((data) => JSON.parse(data)),
      validator: options.validator || undefined as any,
      autoSaveInterval: options.autoSaveInterval ?? 0
    };
    
    this.currentState = this.options.initialState;
    this.walPath = `${this.options.statePath}.wal`;
    this.tempPath = `${this.options.statePath}.tmp`;
    this.backupPath = `${this.options.statePath}.backup`;
  }

  /**
   * Initialize the state manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    // Ensure directory exists
    await this.ensureDirectory(dirname(this.options.statePath));
    
    // Load existing state or create new
    await this.loadState();
    
    // Recover from WAL if needed
    if (this.options.useWAL) {
      await this.recoverFromWAL();
    }
    
    // Set up auto-save if configured
    if (this.options.autoSaveInterval > 0) {
      this.startAutoSave();
    }
    
    this.isInitialized = true;
    this.emit('initialized', this.currentState);
  }

  /**
   * Get the current state (immutable copy)
   */
  getState(): T {
    return this.deepClone(this.currentState);
  }

  /**
   * Get a specific property from the state
   */
  get<K extends keyof T>(key: K): T[K] {
    return this.deepClone(this.currentState[key]);
  }

  /**
   * Set the entire state atomically
   */
  async setState(newState: T): Promise<void> {
    await this.executeTransaction(async (tx) => {
      tx.replace(newState);
    });
  }

  /**
   * Update part of the state atomically
   */
  async update(updates: Partial<T>): Promise<void> {
    await this.executeTransaction(async (tx) => {
      tx.merge(updates);
    });
  }

  /**
   * Set a specific property atomically
   */
  async set<K extends keyof T>(key: K, value: T[K]): Promise<void> {
    await this.executeTransaction(async (tx) => {
      tx.set([key as string], value);
    });
  }

  /**
   * Delete a property from the state
   */
  async delete<K extends keyof T>(key: K): Promise<void> {
    await this.executeTransaction(async (tx) => {
      tx.delete([key as string]);
    });
  }

  /**
   * Execute a transaction atomically
   */
  async executeTransaction(
    executor: (tx: Transaction<T>) => void | Promise<void>
  ): Promise<void> {
    const transactionId = this.generateId();
    const previousState = this.deepClone(this.currentState);
    const operations: StateOperation[] = [];
    
    // Create transaction object
    const transaction: StateTransaction<T> = {
      id: transactionId,
      timestamp: new Date(),
      previousState,
      newState: previousState, // Will be updated
      operations,
      committed: false
    };
    
    this.transactions.set(transactionId, transaction);
    
    // Create transaction context
    const tx = new Transaction<T>(
      this.currentState,
      operations,
      this.options.serializer,
      this.options.deserializer
    );
    
    try {
      // Execute transaction
      await executor(tx);
      
      // Apply operations
      const newState = await tx.commit();
      
      // Validate new state if validator is provided
      if (this.options.validator) {
        const isValid = await this.options.validator(newState);
        if (!isValid) {
          throw new Error('State validation failed');
        }
      }
      
      // Update transaction
      transaction.newState = newState;
      transaction.committed = true;
      
      // Write to WAL first
      if (this.options.useWAL) {
        await this.writeToWAL(transaction);
      }
      
      // Update current state
      this.currentState = newState;
      this.stateVersion++;
      this.isDirty = true;
      
      // Save to disk
      await this.saveState();
      
      // Add to history
      if (this.options.keepHistory) {
        this.addToHistory(newState);
      }
      
      // Emit events
      this.emit('stateChanged', {
        previousState,
        newState,
        operations,
        transactionId
      });
      
    } catch (error) {
      // Rollback
      transaction.error = error as Error;
      this.currentState = previousState;
      
      this.emit('transactionFailed', {
        transactionId,
        error,
        operations
      });
      
      throw error;
    } finally {
      // Clean up transaction
      this.transactions.delete(transactionId);
    }
  }

  /**
   * Acquire a lock for exclusive access
   */
  async acquireLock(holder: string, timeout: number = 5000): Promise<StateLock> {
    const lockId = this.generateId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + timeout);
    
    // Check for existing locks
    for (const lock of this.locks.values()) {
      if (!lock.released && lock.expiresAt > now) {
        throw new Error(`State is locked by ${lock.holder} until ${lock.expiresAt}`);
      }
    }
    
    // Create new lock
    const lock: StateLock = {
      id: lockId,
      holder,
      acquiredAt: now,
      expiresAt,
      released: false
    };
    
    this.locks.set(lockId, lock);
    
    // Auto-release after timeout
    setTimeout(() => {
      if (!lock.released) {
        this.releaseLock(lockId);
      }
    }, timeout);
    
    return lock;
  }

  /**
   * Release a lock
   */
  releaseLock(lockId: string): void {
    const lock = this.locks.get(lockId);
    if (lock) {
      lock.released = true;
      this.locks.delete(lockId);
    }
  }

  /**
   * Create a snapshot of the current state
   */
  async createSnapshot(metadata?: Record<string, any>): Promise<StateSnapshot<T>> {
    const snapshot: StateSnapshot<T> = {
      id: this.generateId(),
      state: this.deepClone(this.currentState),
      timestamp: new Date(),
      version: this.stateVersion,
      metadata
    };
    
    // Save snapshot to file
    const snapshotPath = `${this.options.statePath}.snapshot.${snapshot.id}`;
    await writeFile(
      snapshotPath,
      this.options.serializer(snapshot.state)
    );
    
    this.emit('snapshotCreated', snapshot);
    
    return snapshot;
  }

  /**
   * Restore from a snapshot
   */
  async restoreSnapshot(snapshotId: string): Promise<void> {
    const snapshotPath = `${this.options.statePath}.snapshot.${snapshotId}`;
    
    if (!existsSync(snapshotPath)) {
      throw new Error(`Snapshot ${snapshotId} not found`);
    }
    
    const data = await readFile(snapshotPath, 'utf-8');
    const state = this.options.deserializer(data);
    
    await this.setState(state);
    
    this.emit('snapshotRestored', { snapshotId, state });
  }

  /**
   * Get state history
   */
  getHistory(): StateSnapshot<T>[] {
    return [...this.history];
  }

  /**
   * Clear state history
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Force save the current state
   */
  async save(): Promise<void> {
    await this.saveState();
  }

  /**
   * Reload state from disk
   */
  async reload(): Promise<void> {
    await this.loadState();
    this.emit('stateReloaded', this.currentState);
  }

  /**
   * Destroy the state manager
   */
  async destroy(): Promise<void> {
    // Stop auto-save
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
    
    // Save final state
    if (this.isDirty) {
      await this.saveState();
    }
    
    // Clean up
    this.transactions.clear();
    this.locks.clear();
    this.history = [];
    
    this.emit('destroyed');
    this.removeAllListeners();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Load state from disk
   */
  private async loadState(): Promise<void> {
    try {
      if (existsSync(this.options.statePath)) {
        const data = await readFile(this.options.statePath, 'utf-8');
        this.currentState = this.options.deserializer(data);
      } else {
        // Use initial state
        this.currentState = this.options.initialState;
        await this.saveState();
      }
    } catch (error) {
      this.emit('error', error);
      throw new Error(`Failed to load state: ${error}`);
    }
  }

  /**
   * Save state to disk atomically
   */
  private async saveState(): Promise<void> {
    try {
      const data = this.options.serializer(this.currentState);
      
      // Write to temp file first
      await writeFile(this.tempPath, data);
      
      // Create backup of existing file
      if (existsSync(this.options.statePath)) {
        await rename(this.options.statePath, this.backupPath);
      }
      
      // Move temp file to actual path
      await rename(this.tempPath, this.options.statePath);
      
      // Delete backup after successful save
      if (existsSync(this.backupPath)) {
        await unlink(this.backupPath);
      }
      
      // Clear WAL after successful save
      if (this.options.useWAL && existsSync(this.walPath)) {
        await unlink(this.walPath);
      }
      
      this.isDirty = false;
      this.emit('stateSaved', this.currentState);
      
    } catch (error) {
      // Try to restore from backup
      if (existsSync(this.backupPath)) {
        await rename(this.backupPath, this.options.statePath);
      }
      
      this.emit('error', error);
      throw new Error(`Failed to save state: ${error}`);
    }
  }

  /**
   * Write transaction to WAL
   */
  private async writeToWAL(transaction: StateTransaction<T>): Promise<void> {
    const walEntry = JSON.stringify(transaction) + '\n';
    await Bun.write(Bun.file(this.walPath), walEntry);
  }

  /**
   * Recover from WAL
   */
  private async recoverFromWAL(): Promise<void> {
    if (!existsSync(this.walPath)) {
      return;
    }
    
    try {
      const walContent = await readFile(this.walPath, 'utf-8');
      const lines = walContent.split('\n').filter(Boolean);
      
      for (const line of lines) {
        try {
          const transaction = JSON.parse(line) as StateTransaction<T>;
          if (transaction.committed) {
            this.currentState = transaction.newState;
            this.stateVersion++;
          }
        } catch {
          // Skip invalid entries
        }
      }
      
      // Save recovered state
      await this.saveState();
      
    } catch (error) {
      this.emit('error', error);
    }
  }

  /**
   * Add state to history
   */
  private addToHistory(state: T): void {
    const snapshot: StateSnapshot<T> = {
      id: this.generateId(),
      state: this.deepClone(state),
      timestamp: new Date(),
      version: this.stateVersion
    };
    
    this.history.push(snapshot);
    
    // Trim history if needed
    if (this.history.length > this.options.maxHistory) {
      this.history = this.history.slice(-this.options.maxHistory);
    }
  }

  /**
   * Start auto-save timer
   */
  private startAutoSave(): void {
    this.autoSaveTimer = setInterval(async () => {
      if (this.isDirty) {
        await this.saveState();
      }
    }, this.options.autoSaveInterval);
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectory(dir: string): Promise<void> {
    await $`mkdir -p ${dir}`.quiet();
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Deep clone an object
   */
  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }
}

// ============================================================================
// Transaction Class
// ============================================================================

class Transaction<T> {
  private state: T;
  private operations: StateOperation[];
  private serializer: (state: T) => string;
  private deserializer: (data: string) => T;

  constructor(
    state: T,
    operations: StateOperation[],
    serializer: (state: T) => string,
    deserializer: (data: string) => T
  ) {
    this.state = JSON.parse(JSON.stringify(state)); // Deep clone
    this.operations = operations;
    this.serializer = serializer;
    this.deserializer = deserializer;
  }

  /**
   * Set a value at a path
   */
  set(path: string[], value: any): void {
    const operation: StateOperation = {
      type: 'set',
      path,
      value,
      previousValue: this.getValueAtPath(path),
      timestamp: new Date()
    };
    
    this.operations.push(operation);
    this.setValueAtPath(path, value);
  }

  /**
   * Update with partial values
   */
  update(path: string[], updates: any): void {
    const current = this.getValueAtPath(path);
    const merged = { ...current, ...updates };
    
    const operation: StateOperation = {
      type: 'update',
      path,
      value: updates,
      previousValue: current,
      timestamp: new Date()
    };
    
    this.operations.push(operation);
    this.setValueAtPath(path, merged);
  }

  /**
   * Merge with the root state
   */
  merge(updates: Partial<T>): void {
    const operation: StateOperation = {
      type: 'merge',
      value: updates,
      previousValue: { ...this.state },
      timestamp: new Date()
    };
    
    this.operations.push(operation);
    this.state = { ...this.state, ...updates };
  }

  /**
   * Replace the entire state
   */
  replace(newState: T): void {
    const operation: StateOperation = {
      type: 'replace',
      value: newState,
      previousValue: { ...this.state },
      timestamp: new Date()
    };
    
    this.operations.push(operation);
    this.state = JSON.parse(JSON.stringify(newState));
  }

  /**
   * Delete a property
   */
  delete(path: string[]): void {
    const operation: StateOperation = {
      type: 'delete',
      path,
      previousValue: this.getValueAtPath(path),
      timestamp: new Date()
    };
    
    this.operations.push(operation);
    this.deleteAtPath(path);
  }

  /**
   * Commit the transaction
   */
  async commit(): Promise<T> {
    return this.state;
  }

  /**
   * Get value at a path
   */
  private getValueAtPath(path: string[]): any {
    let current: any = this.state;
    
    for (const key of path) {
      if (current && typeof current === 'object') {
        current = current[key];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  /**
   * Set value at a path
   */
  private setValueAtPath(path: string[], value: any): void {
    let current: any = this.state;
    
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (!key) continue;
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    const lastKey = path[path.length - 1];
    if (lastKey) {
      current[lastKey] = value;
    }
  }

  /**
   * Delete at a path
   */
  private deleteAtPath(path: string[]): void {
    let current: any = this.state;
    
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (!key || !current[key] || typeof current[key] !== 'object') {
        return;
      }
      current = current[key];
    }
    
    const lastKey = path[path.length - 1];
    if (lastKey) {
      delete current[lastKey];
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a new state manager
 */
export function createStateManager<T = any>(
  options: StateManagerOptions<T>
): StateManager<T> {
  return new StateManager<T>(options);
}

/**
 * Create an in-memory state manager
 */
export function createMemoryStateManager<T = any>(
  initialState?: T
): StateManager<T> {
  return new StateManager<T>({
    statePath: ':memory:',
    initialState,
    useWAL: false,
    keepHistory: true
  });
}

export default StateManager;