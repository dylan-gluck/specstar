/**
 * Session pool — manages a bounded set of concurrent agent sessions.
 *
 * Implements the {@link SessionPool} contract interface. Each session runs in
 * its own Bun Worker via {@link WorkerSessionHandle}.
 *
 * @module sessions/pool
 */

import type {
  SessionId,
  WorkerSession,
  WorkerSessionOptions,
  SessionNotification,
  SessionPool,
  SessionPoolListener,
  SessionPoolAtCapacityError,
  SessionNotFoundError,
  SessionSpawnError,
} from "../types.js";
import { generateSessionId } from "../types.js";
import { WorkerSessionHandle } from "./worker.js";
import { SessionEventAggregator, workerEventToNotification } from "./events.js";

// ---------------------------------------------------------------------------
// Pool factory
// ---------------------------------------------------------------------------

export interface SessionPoolConfig {
  readonly maxConcurrent: number;
}

/**
 * Extended pool that includes the internal `getHandle` method not part of the
 * public contract but needed by TUI code to send prompts/approvals.
 */
export interface SessionPoolWithHandles extends SessionPool {
  getHandle(id: SessionId): WorkerSessionHandle | undefined;
}

export function createSessionPool(config: SessionPoolConfig): SessionPoolWithHandles {
  const handles = new Map<SessionId, WorkerSessionHandle>();
  const unsubs = new Map<SessionId, () => void>();
  const aggregator = new SessionEventAggregator();
  const listeners = new Set<SessionPoolListener>();

  // -- Helpers ---------------------------------------------------------------

  function notifyListeners(fn: (listener: SessionPoolListener) => void): void {
    for (const listener of listeners) {
      try {
        fn(listener);
      } catch {
        // Listener errors must not break the pool.
      }
    }
  }

  // -- SessionPool implementation --------------------------------------------

  async function spawn(options: WorkerSessionOptions): Promise<WorkerSession> {
    if (handles.size >= config.maxConcurrent) {
      throw {
        type: "session_pool_at_capacity",
        currentCount: handles.size,
        maxCount: config.maxConcurrent,
        message: `Cannot spawn session: pool is at capacity (${handles.size}/${config.maxConcurrent})`,
      } satisfies SessionPoolAtCapacityError;
    }

    const id = generateSessionId();
    let handle: WorkerSessionHandle;

    try {
      handle = new WorkerSessionHandle(id, options);
    } catch (cause) {
      throw {
        type: "session_spawn",
        cause,
        message:
          cause instanceof Error ? cause.message : `Failed to spawn session: ${String(cause)}`,
      } satisfies SessionSpawnError;
    }

    handles.set(id, handle);

    // Subscribe to worker events.
    const unsubEvent = handle.onEvent((event) => {
      // Every event refreshes the session snapshot for listeners.
      notifyListeners((l) => l.onSessionUpdated?.(handle.toSession()));

      // Certain events produce notifications.
      if (
        event.type === "approval_needed" ||
        event.type === "error" ||
        event.type === "shutdown_complete"
      ) {
        const notification = workerEventToNotification(event, handle.name);
        if (notification) {
          aggregator.addNotification(notification);
          notifyListeners((l) => l.onNotification?.(notification));
        }
      }

      // Auto-remove when the session shuts down.
      if (event.type === "shutdown_complete") {
        handles.delete(id);
        unsubs.get(id)?.();
        unsubs.delete(id);
        notifyListeners((l) => l.onSessionRemoved?.(id));
      }
    });

    unsubs.set(id, unsubEvent);

    notifyListeners((l) => l.onSessionAdded?.(handle.toSession()));

    return handle.toSession();
  }

  async function destroy(id: SessionId): Promise<void> {
    const handle = handles.get(id);
    if (!handle) {
      throw {
        type: "session_not_found",
        sessionId: id,
        message: `Session "${id}" not found`,
      } satisfies SessionNotFoundError;
    }

    // Unsubscribe from events before dispose to prevent the
    // shutdown_complete handler from racing with our cleanup below.
    unsubs.get(id)?.();
    unsubs.delete(id);

    await handle.dispose();

    handles.delete(id);
    aggregator.dismissAll(id);

    notifyListeners((l) => l.onSessionRemoved?.(id));
  }

  function list(): readonly WorkerSession[] {
    return Array.from(handles.values())
      .map((h) => h.toSession())
      .sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
  }

  function getNotifications(): readonly SessionNotification[] {
    return aggregator.getNotifications();
  }

  function dismiss(sessionId: SessionId, kind: SessionNotification["kind"]): void {
    aggregator.dismiss(sessionId, kind);
  }

  async function shutdownAll(): Promise<void> {
    // Unsubscribe all event handlers first to avoid interleaving cleanup.
    for (const unsub of unsubs.values()) {
      unsub();
    }
    unsubs.clear();

    await Promise.allSettled(Array.from(handles.values()).map((h) => h.dispose()));

    handles.clear();
    aggregator.clear();
  }

  function subscribe(listener: SessionPoolListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function getHandle(id: SessionId): WorkerSessionHandle | undefined {
    return handles.get(id);
  }

  return {
    spawn,
    destroy,
    list,
    getNotifications,
    dismiss,
    shutdownAll,
    subscribe,
    getHandle,
    get size() {
      return handles.size;
    },
  };
}
