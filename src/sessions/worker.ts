/**
 * Main-thread handle for a single agent session running in a Bun Worker.
 *
 * All communication with the worker is via structured {@link WorkerEvent}
 * (worker -> main) and {@link MainToWorkerMessage} (main -> worker) messages.
 * No mutable state is shared across the thread boundary.
 *
 * @module sessions/worker
 */

import type {
  SessionId,
  WorkerStatus,
  WorkerSession,
  WorkerSessionOptions,
  WorkerEvent,
  MainToWorkerMessage,
} from "../types.js";
import { validateWorkerTransition, isValidWorkerTransition } from "../types.js";

/** Initialization message sent to the worker as its first message. */
export interface WorkerInitMessage {
  readonly type: "init";
  readonly sessionId: SessionId;
  readonly options: WorkerSessionOptions;
}

type EventHandler = (event: WorkerEvent) => void;

const SHUTDOWN_TIMEOUT_MS = 5_000;

/**
 * Main-thread handle wrapping a Bun Worker that runs an agent session.
 *
 * Lifecycle: construct -> (events flow) -> dispose().
 * After dispose(), the handle is inert — all send methods are no-ops.
 */
export class WorkerSessionHandle {
  readonly id: SessionId;
  readonly name: string;
  readonly cwd: string;
  readonly startedAt: string;

  private _status: WorkerStatus = "starting";
  private _lastActivityAt: string;
  private _tokenCount = 0;
  private _worker: Worker | null;
  private _handlers = new Set<EventHandler>();
  private _disposed = false;

  constructor(id: SessionId, options: WorkerSessionOptions) {
    this.id = id;
    this.name = options.name;
    this.cwd = options.cwd;
    this.startedAt = new Date().toISOString();
    this._lastActivityAt = this.startedAt;

    try {
      this._worker = new Worker(new URL("./worker-entry.ts", import.meta.url).href);
    } catch (err) {
      this._status = "error";
      this._worker = null;
      const message = err instanceof Error ? err.message : String(err);
      this._emit({
        type: "error",
        sessionId: this.id,
        message: `Worker creation failed: ${message}`,
        stack: err instanceof Error ? err.stack : undefined,
      });
      return;
    }

    this._worker.onmessage = (evt: MessageEvent<WorkerEvent>) => {
      this._handleWorkerEvent(evt.data);
    };

    this._worker.onerror = (evt: ErrorEvent) => {
      this._status = "error";
      this._emit({
        type: "error",
        sessionId: this.id,
        message: evt.message ?? "Worker crashed with unknown error",
      });
    };

    // Send init message to the worker.
    const initMsg: WorkerInitMessage = {
      type: "init",
      sessionId: this.id,
      options,
    };
    this._worker.postMessage(initMsg);
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  get status(): WorkerStatus {
    return this._status;
  }

  get lastActivityAt(): string {
    return this._lastActivityAt;
  }

  get tokenCount(): number {
    return this._tokenCount;
  }

  // ---------------------------------------------------------------------------
  // Communication (main -> worker)
  // ---------------------------------------------------------------------------

  sendPrompt(text: string): void {
    this._post({ type: "prompt", text });
  }

  sendApproval(): void {
    this._post({ type: "approve" });
  }

  sendRejection(reason?: string): void {
    this._post({ type: "reject", reason });
  }

  sendAbort(): void {
    this._post({ type: "abort" });
  }

  sendShutdown(): void {
    this._post({ type: "shutdown" });
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Gracefully shut down the worker.
   *
   * Sends a shutdown message and waits up to 5 s for `shutdown_complete`.
   * If the timeout elapses the worker is forcibly terminated.
   * Idempotent — calling dispose() on an already-disposed handle is a no-op.
   */
  async dispose(): Promise<void> {
    if (this._disposed) return;
    this._disposed = true;

    if (this._status === "shutdown" || !this._worker) {
      this._terminateWorker();
      return;
    }

    this.sendShutdown();

    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        unsub();
        this._terminateWorker();
        resolve();
      }, SHUTDOWN_TIMEOUT_MS);

      const unsub = this.onEvent((event) => {
        if (event.type === "shutdown_complete") {
          clearTimeout(timer);
          unsub();
          this._terminateWorker();
          resolve();
        }
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Snapshot
  // ---------------------------------------------------------------------------

  /** Returns a plain object conforming to the {@link WorkerSession} contract. */
  toSession(): WorkerSession {
    return {
      id: this.id,
      name: this.name,
      status: this._status,
      cwd: this.cwd,
      startedAt: this.startedAt,
      lastActivityAt: this._lastActivityAt,
      tokenCount: this._tokenCount,
    };
  }

  // ---------------------------------------------------------------------------
  // Event subscription
  // ---------------------------------------------------------------------------

  /**
   * Register a handler for all {@link WorkerEvent}s from this session.
   * @returns Unsubscribe function.
   */
  onEvent(handler: EventHandler): () => void {
    this._handlers.add(handler);
    return () => {
      this._handlers.delete(handler);
    };
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private _post(msg: MainToWorkerMessage): void {
    this._worker?.postMessage(msg);
  }

  private _emit(event: WorkerEvent): void {
    for (const handler of this._handlers) {
      try {
        handler(event);
      } catch {
        // Handlers must not throw into the handle's event loop.
      }
    }
  }

  private _handleWorkerEvent(event: WorkerEvent): void {
    switch (event.type) {
      case "status_changed": {
        if (isValidWorkerTransition(this._status, event.status)) {
          validateWorkerTransition(this._status, event.status);
          this._status = event.status;
        } else {
          console.warn(
            `[WorkerSessionHandle ${this.id}] Invalid transition: ${this._status} -> ${event.status} — forwarding event anyway`,
          );
        }
        this._lastActivityAt = new Date().toISOString();
        break;
      }
      case "activity": {
        this._lastActivityAt = event.lastActivityAt;
        this._tokenCount = event.tokenCount;
        break;
      }
      case "approval_needed": {
        if (this._status === "working") {
          this._status = "approval";
          this._lastActivityAt = new Date().toISOString();
        }
        break;
      }
      case "error": {
        if (isValidWorkerTransition(this._status, "error")) {
          this._status = "error";
        }
        this._lastActivityAt = new Date().toISOString();
        break;
      }
      case "shutdown_complete": {
        this._status = "shutdown";
        this._lastActivityAt = new Date().toISOString();
        break;
      }
    }

    this._emit(event);
  }

  private _terminateWorker(): void {
    if (this._worker) {
      this._worker.terminate();
      this._worker = null;
    }
  }
}
