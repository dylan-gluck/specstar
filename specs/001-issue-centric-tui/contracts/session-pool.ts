/**
 * Session pool contract.
 *
 * Manages a pool of agent worker sessions running in Bun Workers.
 * Each session is an actor with isolated state, communicating via
 * `postMessage`/`onmessage` (Constitution Principle V).
 *
 * Status transitions:
 *   starting -> idle -> working -> idle (loop)
 *                    -> approval -> working (on approve/reject)
 *                    -> error
 *   any      -> shutdown
 *
 * @version 1.0.0
 */

// ---------------------------------------------------------------------------
// Branded types
// ---------------------------------------------------------------------------

/** Opaque session identifier, format: `s-<random8>`. */
export type SessionId = string & { readonly __brand: "SessionId" };

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

/**
 * Worker session status.
 * Transitions are enforced; invalid transitions MUST throw.
 */
export type WorkerStatus = "starting" | "idle" | "working" | "approval" | "error" | "shutdown";

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

/** Configuration for spawning a new worker session. */
export interface WorkerSessionOptions {
  /** Working directory for the agent session. */
  readonly cwd: string;
  /** Human-readable session name. */
  readonly name: string;
  /** Files to inject into the agent's context. */
  readonly contextFiles?: ReadonlyArray<{ readonly path: string; readonly content: string }>;
  /** If provided, sent as the first prompt immediately after creation. */
  readonly initialPrompt?: string;
  /** Model override. */
  readonly model?: string;
  /** Thinking level override. */
  readonly thinkingLevel?: string;
  /** Criteria the agent uses to determine when work is complete. */
  readonly completionCriteria?: string;
}

/** A running worker session handle. */
export interface WorkerSession {
  readonly id: SessionId;
  readonly name: string;
  readonly status: WorkerStatus;
  readonly cwd: string;
  /** ISO-8601 timestamp of session creation. */
  readonly startedAt: string;
  /** ISO-8601 timestamp of last status change or message. */
  readonly lastActivityAt: string;
  /** Cumulative token usage across all turns. */
  readonly tokenCount: number;
}

/** Notification surfaced from a worker session to the UI. */
export interface SessionNotification {
  readonly sessionId: SessionId;
  readonly sessionName: string;
  /** Discriminator for notification handling and display. */
  readonly kind: "approval_needed" | "error" | "completed";
  readonly message: string;
  /** ISO-8601 timestamp. */
  readonly timestamp: string;
  /** Approval-only: details of the tool call awaiting decision. */
  readonly toolCall?: {
    readonly toolName: string;
    readonly args: string;
  };
}

// ---------------------------------------------------------------------------
// Worker events (worker -> main thread, JSON-serializable)
// ---------------------------------------------------------------------------

/**
 * Discriminated union of messages posted from a Worker to the main thread.
 * All payloads MUST be JSON-serializable (Constitution: immutable events).
 */
export type WorkerEvent =
  | {
      readonly type: "status_changed";
      readonly sessionId: SessionId;
      readonly status: WorkerStatus;
    }
  | {
      readonly type: "activity";
      readonly sessionId: SessionId;
      readonly lastActivityAt: string;
      readonly tokenCount: number;
    }
  | {
      readonly type: "approval_needed";
      readonly sessionId: SessionId;
      readonly toolName: string;
      readonly args: string;
    }
  | {
      readonly type: "notification";
      readonly sessionId: SessionId;
      readonly notification: SessionNotification;
    }
  | {
      readonly type: "error";
      readonly sessionId: SessionId;
      readonly message: string;
      readonly stack?: string;
    }
  | { readonly type: "shutdown_complete"; readonly sessionId: SessionId };

/**
 * Messages posted from the main thread to a Worker.
 */
export type MainToWorkerMessage =
  | { readonly type: "prompt"; readonly text: string }
  | { readonly type: "approve" }
  | { readonly type: "reject"; readonly reason?: string }
  | { readonly type: "abort" }
  | { readonly type: "shutdown" };

// ---------------------------------------------------------------------------
// Listener
// ---------------------------------------------------------------------------

/** Callback for session pool state changes. */
export interface SessionPoolListener {
  onSessionAdded?(session: WorkerSession): void;
  onSessionRemoved?(sessionId: SessionId): void;
  onSessionUpdated?(session: WorkerSession): void;
  onNotification?(notification: SessionNotification): void;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type SessionPoolError =
  | SessionPoolAtCapacityError
  | SessionNotFoundError
  | SessionSpawnError;

export interface SessionPoolAtCapacityError {
  readonly type: "session_pool_at_capacity";
  readonly currentCount: number;
  readonly maxCount: number;
  readonly message: string;
}

export interface SessionNotFoundError {
  readonly type: "session_not_found";
  readonly sessionId: string;
  readonly message: string;
}

export interface SessionSpawnError {
  readonly type: "session_spawn";
  readonly cause: unknown;
  readonly message: string;
}

// ---------------------------------------------------------------------------
// Service interface
// ---------------------------------------------------------------------------

/** Session pool management contract. */
export interface SessionPool {
  /**
   * Create a new worker session.
   * Throws `SessionPoolAtCapacityError` if at the configured limit.
   */
  spawn(options: WorkerSessionOptions): Promise<WorkerSession>;

  /** Shutdown and remove a session. */
  destroy(id: SessionId): Promise<void>;

  /** Get all sessions sorted by last activity (most recent first). */
  list(): readonly WorkerSession[];

  /**
   * Get aggregated notifications across all sessions.
   * Sorted by timestamp, approval-needed notifications float to top.
   */
  getNotifications(): readonly SessionNotification[];

  /** Dismiss a notification by session and kind. */
  dismiss(sessionId: SessionId, kind: SessionNotification["kind"]): void;

  /** Shutdown all sessions gracefully, then clear the pool. */
  shutdownAll(): Promise<void>;

  /**
   * Subscribe to pool change events.
   * @returns Unsubscribe function.
   */
  subscribe(listener: SessionPoolListener): () => void;

  /** Current session count. */
  readonly size: number;
}
