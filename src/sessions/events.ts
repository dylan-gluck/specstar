import type { SessionId, SessionNotification, WorkerEvent, MainToWorkerMessage } from "../types.js";

export type { WorkerEvent, MainToWorkerMessage, SessionNotification };

// ---------------------------------------------------------------------------
// Type guards & converters
// ---------------------------------------------------------------------------

export function isApprovalEvent(
  event: WorkerEvent,
): event is WorkerEvent & { readonly type: "approval_needed" } {
  return event.type === "approval_needed";
}

export function workerEventToNotification(
  event: WorkerEvent,
  sessionName: string,
): SessionNotification | undefined {
  const timestamp = new Date().toISOString();

  switch (event.type) {
    case "approval_needed":
      return {
        sessionId: event.sessionId,
        sessionName,
        kind: "approval_needed",
        message: `Tool call requires approval: ${event.toolName}`,
        timestamp,
        toolCall: { toolName: event.toolName, args: event.args },
      };
    case "error":
      return {
        sessionId: event.sessionId,
        sessionName,
        kind: "error",
        message: event.message,
        timestamp,
      };
    case "shutdown_complete":
      return {
        sessionId: event.sessionId,
        sessionName,
        kind: "completed",
        message: `Session "${sessionName}" completed`,
        timestamp,
      };
    default:
      return undefined;
  }
}

// ---------------------------------------------------------------------------
// Event aggregator
// ---------------------------------------------------------------------------

/** Notification key used for dedup: sessionId + kind. */
function notificationKey(sessionId: SessionId, kind: SessionNotification["kind"]): string {
  return `${sessionId}:${kind}`;
}

export class SessionEventAggregator {
  /** Map keyed by sessionId:kind for O(1) dedup lookup. */
  private readonly notifications = new Map<string, SessionNotification>();

  // -- Mutators -------------------------------------------------------------

  addNotification(notification: SessionNotification): void {
    const key = notificationKey(notification.sessionId, notification.kind);
    this.notifications.set(key, notification);
  }

  dismiss(sessionId: SessionId, kind: SessionNotification["kind"]): void {
    this.notifications.delete(notificationKey(sessionId, kind));
  }

  dismissAll(sessionId: SessionId): void {
    for (const key of this.notifications.keys()) {
      if (key.startsWith(`${sessionId}:`)) {
        this.notifications.delete(key);
      }
    }
  }

  clear(): void {
    this.notifications.clear();
  }

  // -- Queries --------------------------------------------------------------

  getNotifications(): readonly SessionNotification[] {
    const all = Array.from(this.notifications.values());

    // approval_needed first, then by timestamp descending
    return all.sort((a, b) => {
      const aApproval = a.kind === "approval_needed" ? 0 : 1;
      const bApproval = b.kind === "approval_needed" ? 0 : 1;
      if (aApproval !== bApproval) return aApproval - bApproval;
      // Most recent first
      return b.timestamp.localeCompare(a.timestamp);
    });
  }

  get count(): number {
    return this.notifications.size;
  }

  get approvalCount(): number {
    let n = 0;
    for (const v of this.notifications.values()) {
      if (v.kind === "approval_needed") n++;
    }
    return n;
  }
}
