import { describe, test, expect, beforeEach } from "bun:test";
import {
  isApprovalEvent,
  workerEventToNotification,
  SessionEventAggregator,
} from "../../src/sessions/events.js";
import { sessionId } from "../../src/types.js";
import { makeNotification } from "../helpers.js";
import type { WorkerEvent } from "../../src/contracts/session-pool.js";

const sid = sessionId("s-test1234");
const sid2 = sessionId("s-test5678");

// ---------------------------------------------------------------------------
// isApprovalEvent
// ---------------------------------------------------------------------------

describe("isApprovalEvent", () => {
  test("returns true for approval_needed event", () => {
    const event: WorkerEvent = {
      type: "approval_needed",
      sessionId: sid,
      toolName: "bash",
      args: "{}",
    } as const;
    expect(isApprovalEvent(event)).toBe(true);
  });

  test.each([
    {
      type: "status_changed",
      sessionId: sid,
      status: "working",
    } as const,
    {
      type: "activity",
      sessionId: sid,
      lastActivityAt: "2026-02-25T10:00:00.000Z",
      tokenCount: 100,
    } as const,
    {
      type: "notification",
      sessionId: sid,
      notification: makeNotification(),
    } as const,
    {
      type: "error",
      sessionId: sid,
      message: "boom",
    } as const,
    {
      type: "shutdown_complete",
      sessionId: sid,
    } as const,
  ] satisfies WorkerEvent[])("returns false for $type event", (event) => {
    expect(isApprovalEvent(event)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// workerEventToNotification
// ---------------------------------------------------------------------------

describe("workerEventToNotification", () => {
  const sessionName = "auth-142";

  test("approval_needed → notification with kind and toolCall", () => {
    const event: WorkerEvent = {
      type: "approval_needed",
      sessionId: sid,
      toolName: "bash",
      args: '{"cmd":"rm -rf /"}',
    };
    const n = workerEventToNotification(event, sessionName);
    expect(n).toBeDefined();
    expect(n!.kind).toBe("approval_needed");
    expect(n!.sessionId).toBe(sid);
    expect(n!.sessionName).toBe(sessionName);
    expect(n!.message).toContain("bash");
    expect(n!.toolCall).toEqual({
      toolName: "bash",
      args: '{"cmd":"rm -rf /"}',
    });
    expect(n!.timestamp).toBeTruthy();
  });

  test("error → notification with kind error and event message", () => {
    const event: WorkerEvent = {
      type: "error",
      sessionId: sid,
      message: "something broke",
    };
    const n = workerEventToNotification(event, sessionName);
    expect(n).toBeDefined();
    expect(n!.kind).toBe("error");
    expect(n!.message).toBe("something broke");
    expect(n!.sessionName).toBe(sessionName);
  });

  test("shutdown_complete → notification with kind completed", () => {
    const event: WorkerEvent = {
      type: "shutdown_complete",
      sessionId: sid,
    };
    const n = workerEventToNotification(event, sessionName);
    expect(n).toBeDefined();
    expect(n!.kind).toBe("completed");
    expect(n!.message).toContain(sessionName);
    expect(n!.sessionName).toBe(sessionName);
  });

  test("status_changed → undefined", () => {
    const event: WorkerEvent = {
      type: "status_changed",
      sessionId: sid,
      status: "working",
    } as WorkerEvent;
    expect(workerEventToNotification(event, sessionName)).toBeUndefined();
  });

  test("activity → undefined", () => {
    const event: WorkerEvent = {
      type: "activity",
      sessionId: sid,
      lastActivityAt: "2026-02-25T10:00:00.000Z",
      tokenCount: 50,
    };
    expect(workerEventToNotification(event, sessionName)).toBeUndefined();
  });

  test("sessionName is propagated to notification", () => {
    const event: WorkerEvent = {
      type: "error",
      sessionId: sid,
      message: "oops",
    };
    const customName = "my-custom-session";
    const n = workerEventToNotification(event, customName);
    expect(n!.sessionName).toBe(customName);
  });
});

// ---------------------------------------------------------------------------
// SessionEventAggregator
// ---------------------------------------------------------------------------

describe("SessionEventAggregator", () => {
  let agg: SessionEventAggregator;

  beforeEach(() => {
    agg = new SessionEventAggregator();
  });

  // -- empty state ----------------------------------------------------------

  test("empty aggregator has count=0", () => {
    expect(agg.count).toBe(0);
  });

  test("empty aggregator has approvalCount=0", () => {
    expect(agg.approvalCount).toBe(0);
  });

  test("empty aggregator getNotifications returns []", () => {
    expect(agg.getNotifications()).toEqual([]);
  });

  // -- addNotification ------------------------------------------------------

  test("addNotification makes it retrievable", () => {
    const n = makeNotification();
    agg.addNotification(n);
    expect(agg.count).toBe(1);
    expect(agg.getNotifications()).toEqual([n]);
  });

  // -- dedup ----------------------------------------------------------------

  test("adding two notifications with same sessionId+kind overwrites (latest kept)", () => {
    const n1 = makeNotification({
      sessionId: sid,
      kind: "error",
      message: "first",
      timestamp: "2026-02-25T10:00:00.000Z",
    });
    const n2 = makeNotification({
      sessionId: sid,
      kind: "error",
      message: "second",
      timestamp: "2026-02-25T11:00:00.000Z",
    });
    agg.addNotification(n1);
    agg.addNotification(n2);
    expect(agg.count).toBe(1);
    expect(agg.getNotifications()[0].message).toBe("second");
  });

  test("different kinds for same session are not deduped", () => {
    agg.addNotification(makeNotification({ sessionId: sid, kind: "error" }));
    agg.addNotification(
      makeNotification({ sessionId: sid, kind: "approval_needed" }),
    );
    expect(agg.count).toBe(2);
  });

  // -- dismiss --------------------------------------------------------------

  test("dismiss removes by sessionId+kind", () => {
    agg.addNotification(makeNotification({ sessionId: sid, kind: "error" }));
    agg.addNotification(
      makeNotification({ sessionId: sid, kind: "approval_needed" }),
    );
    agg.dismiss(sid, "error");
    expect(agg.count).toBe(1);
    expect(agg.getNotifications()[0].kind).toBe("approval_needed");
  });

  // -- dismissAll -----------------------------------------------------------

  test("dismissAll removes all notifications for a sessionId", () => {
    agg.addNotification(makeNotification({ sessionId: sid, kind: "error" }));
    agg.addNotification(
      makeNotification({ sessionId: sid, kind: "approval_needed" }),
    );
    agg.addNotification(
      makeNotification({ sessionId: sid2, kind: "error" }),
    );
    agg.dismissAll(sid);
    expect(agg.count).toBe(1);
    expect(agg.getNotifications()[0].sessionId).toBe(sid2);
  });

  test("dismissAll with non-existent sessionId is a no-op", () => {
    agg.addNotification(makeNotification({ sessionId: sid, kind: "error" }));
    agg.dismissAll(sessionId("s-nonexist0"));
    expect(agg.count).toBe(1);
  });

  // -- clear ----------------------------------------------------------------

  test("clear empties all notifications", () => {
    agg.addNotification(makeNotification({ sessionId: sid, kind: "error" }));
    agg.addNotification(
      makeNotification({ sessionId: sid2, kind: "approval_needed" }),
    );
    agg.clear();
    expect(agg.count).toBe(0);
    expect(agg.getNotifications()).toEqual([]);
  });

  // -- getNotifications sort order ------------------------------------------

  test("approvals sort first, then by timestamp descending", () => {
    const error1 = makeNotification({
      sessionId: sid,
      kind: "error",
      timestamp: "2026-02-25T12:00:00.000Z",
    });
    const approval = makeNotification({
      sessionId: sid2,
      kind: "approval_needed",
      timestamp: "2026-02-25T10:00:00.000Z",
    });
    const error2 = makeNotification({
      sessionId: sid2,
      kind: "error",
      timestamp: "2026-02-25T11:00:00.000Z",
    });

    agg.addNotification(error1);
    agg.addNotification(error2);
    agg.addNotification(approval);

    const result = agg.getNotifications();
    expect(result[0].kind).toBe("approval_needed");
    // errors sorted by timestamp descending: error1 (12:00) before error2 (11:00)
    expect(result[1].timestamp).toBe("2026-02-25T12:00:00.000Z");
    expect(result[2].timestamp).toBe("2026-02-25T11:00:00.000Z");
  });

  // -- count ----------------------------------------------------------------

  test("count reflects add and dismiss", () => {
    agg.addNotification(makeNotification({ sessionId: sid, kind: "error" }));
    agg.addNotification(
      makeNotification({ sessionId: sid, kind: "approval_needed" }),
    );
    expect(agg.count).toBe(2);
    agg.dismiss(sid, "error");
    expect(agg.count).toBe(1);
  });

  // -- approvalCount --------------------------------------------------------

  test("approvalCount counts only approval_needed kind", () => {
    agg.addNotification(
      makeNotification({ sessionId: sid, kind: "approval_needed" }),
    );
    agg.addNotification(makeNotification({ sessionId: sid, kind: "error" }));
    agg.addNotification(
      makeNotification({ sessionId: sid2, kind: "approval_needed" }),
    );
    expect(agg.approvalCount).toBe(2);
  });
});
