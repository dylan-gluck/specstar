import { describe, test, expect } from "bun:test";

import {
  linearIssueId,
  linearTeamId,
  prNumber,
  worktreePath,
  notionPageId,
  notionDatabaseId,
  sessionId,
  workflowId,
  workflowHandleId,
  generateSessionId,
  validateWorkerTransition,
  isValidWorkerTransition,
  validateSpecTransition,
  isValidSpecTransition,
  InvalidTransitionError,
  BADGE_PRIORITY,
  BADGES_BY_PRIORITY,
} from "../../src/types.js";

import type { WorkerStatus } from "../../src/contracts/session-pool.js";
import type { SpecStatus } from "../../src/contracts/notion.js";
import type { StatusBadge } from "../../src/contracts/enrichment.js";

// ---------------------------------------------------------------------------
// Branded constructors
// ---------------------------------------------------------------------------

describe("branded constructors", () => {
  test("linearIssueId returns input value", () => {
    expect(linearIssueId("abc")).toBe("abc");
  });

  test("linearTeamId returns input value", () => {
    expect(linearTeamId("team-1")).toBe("team-1");
  });

  test("prNumber returns input value", () => {
    expect(prNumber(42)).toBe(42);
  });

  test("worktreePath returns input value", () => {
    expect(worktreePath("/path")).toBe("/path");
  });

  test("notionPageId returns input value", () => {
    expect(notionPageId("np-1")).toBe("np-1");
  });

  test("notionDatabaseId returns input value", () => {
    expect(notionDatabaseId("nd-1")).toBe("nd-1");
  });

  test("sessionId returns input value", () => {
    expect(sessionId("s-12345678")).toBe("s-12345678");
  });

  test("workflowId returns input value", () => {
    expect(workflowId("wf-1")).toBe("wf-1");
  });

  test("workflowHandleId returns input value", () => {
    expect(workflowHandleId("wh-1")).toBe("wh-1");
  });
});

// ---------------------------------------------------------------------------
// generateSessionId
// ---------------------------------------------------------------------------

describe("generateSessionId", () => {
  test("starts with 's-'", () => {
    expect(generateSessionId().startsWith("s-")).toBe(true);
  });

  test("has exactly 10 characters", () => {
    expect(generateSessionId()).toHaveLength(10);
  });

  test("random chars are lowercase alphanumeric", () => {
    const id = generateSessionId();
    const random = id.slice(2);
    expect(random).toMatch(/^[a-z0-9]{8}$/);
  });

  test("two calls produce different IDs", () => {
    expect(generateSessionId()).not.toBe(generateSessionId());
  });
});

// ---------------------------------------------------------------------------
// validateWorkerTransition
// ---------------------------------------------------------------------------

describe("validateWorkerTransition", () => {
  const validTransitions: [WorkerStatus, WorkerStatus][] = [
    ["starting", "idle"],
    ["starting", "error"],
    ["starting", "shutdown"],
    ["idle", "working"],
    ["idle", "shutdown"],
    ["working", "idle"],
    ["working", "approval"],
    ["working", "error"],
    ["working", "shutdown"],
    ["approval", "working"],
    ["approval", "error"],
    ["approval", "shutdown"],
    ["error", "idle"],
    ["error", "shutdown"],
  ];

  for (const [from, to] of validTransitions) {
    test(`allows ${from} → ${to}`, () => {
      expect(() => validateWorkerTransition(from, to)).not.toThrow();
    });
  }

  const invalidTransitions: [WorkerStatus, WorkerStatus][] = [
    ["idle", "approval"],
    ["starting", "working"],
    ["shutdown", "idle"],
    ["error", "working"],
  ];

  for (const [from, to] of invalidTransitions) {
    test(`rejects ${from} → ${to}`, () => {
      expect(() => validateWorkerTransition(from, to)).toThrow(InvalidTransitionError);
    });
  }

  test("thrown error has correct properties", () => {
    try {
      validateWorkerTransition("idle" as WorkerStatus, "approval" as WorkerStatus);
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(InvalidTransitionError);
      const err = e as InvalidTransitionError;
      expect(err.from).toBe("idle");
      expect(err.to).toBe("approval");
      expect(err.machine).toBe("WorkerStatus");
      expect(err.message).toBe("Invalid WorkerStatus transition: idle -> approval");
    }
  });

  test("shutdown has no valid outgoing transitions", () => {
    const targets: WorkerStatus[] = ["starting", "idle", "working", "approval", "error", "shutdown"];
    for (const to of targets) {
      expect(() => validateWorkerTransition("shutdown" as WorkerStatus, to)).toThrow(InvalidTransitionError);
    }
  });
});

// ---------------------------------------------------------------------------
// isValidWorkerTransition
// ---------------------------------------------------------------------------

describe("isValidWorkerTransition", () => {
  test("returns true for valid transitions", () => {
    expect(isValidWorkerTransition("working" as WorkerStatus, "idle" as WorkerStatus)).toBe(true);
    expect(isValidWorkerTransition("idle" as WorkerStatus, "working" as WorkerStatus)).toBe(true);
  });

  test("returns false for invalid transitions", () => {
    expect(isValidWorkerTransition("idle" as WorkerStatus, "approval" as WorkerStatus)).toBe(false);
    expect(isValidWorkerTransition("shutdown" as WorkerStatus, "idle" as WorkerStatus)).toBe(false);
  });

  test("does not throw for invalid transitions", () => {
    expect(() => isValidWorkerTransition("shutdown" as WorkerStatus, "idle" as WorkerStatus)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// validateSpecTransition
// ---------------------------------------------------------------------------

describe("validateSpecTransition", () => {
  const validTransitions: [SpecStatus, SpecStatus][] = [
    ["draft", "pending"],
    ["pending", "approved"],
    ["pending", "denied"],
    ["approved", "draft"],
    ["denied", "draft"],
  ];

  for (const [from, to] of validTransitions) {
    test(`allows ${from} → ${to}`, () => {
      expect(() => validateSpecTransition(from, to)).not.toThrow();
    });
  }

  const invalidTransitions: [SpecStatus, SpecStatus][] = [
    ["draft", "approved"],
    ["draft", "denied"],
    ["pending", "draft"],
    ["approved", "pending"],
  ];

  for (const [from, to] of invalidTransitions) {
    test(`rejects ${from} → ${to}`, () => {
      expect(() => validateSpecTransition(from, to)).toThrow(InvalidTransitionError);
    });
  }

  test("thrown error has correct machine property", () => {
    try {
      validateSpecTransition("draft" as SpecStatus, "approved" as SpecStatus);
      expect.unreachable("should have thrown");
    } catch (e) {
      const err = e as InvalidTransitionError;
      expect(err.machine).toBe("SpecStatus");
      expect(err.from).toBe("draft");
      expect(err.to).toBe("approved");
    }
  });
});

// ---------------------------------------------------------------------------
// isValidSpecTransition
// ---------------------------------------------------------------------------

describe("isValidSpecTransition", () => {
  test("returns true for valid transitions", () => {
    expect(isValidSpecTransition("draft" as SpecStatus, "pending" as SpecStatus)).toBe(true);
  });

  test("returns false for invalid transitions", () => {
    expect(isValidSpecTransition("draft" as SpecStatus, "approved" as SpecStatus)).toBe(false);
  });

  test("does not throw for invalid transitions", () => {
    expect(() => isValidSpecTransition("approved" as SpecStatus, "pending" as SpecStatus)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// BADGE_PRIORITY
// ---------------------------------------------------------------------------

describe("BADGE_PRIORITY", () => {
  const expectedBadges: StatusBadge[] = [
    "apprvl", "error", "done", "wrkng", "review",
    "ci:fail", "spec", "idle", "draft", "ci:pass",
    "merged", "--",
  ];

  test("has entries for all 12 known badges", () => {
    expect(Object.keys(BADGE_PRIORITY)).toHaveLength(12);
    for (const badge of expectedBadges) {
      expect(BADGE_PRIORITY).toHaveProperty(badge);
    }
  });

  test("values are monotonically increasing from 0 to 11", () => {
    for (let i = 0; i < expectedBadges.length; i++) {
      expect(BADGE_PRIORITY[expectedBadges[i]]).toBe(i);
    }
  });
});

// ---------------------------------------------------------------------------
// BADGES_BY_PRIORITY
// ---------------------------------------------------------------------------

describe("BADGES_BY_PRIORITY", () => {
  test("has length 12", () => {
    expect(BADGES_BY_PRIORITY).toHaveLength(12);
  });

  test("order matches BADGE_PRIORITY (index i has priority i)", () => {
    for (let i = 0; i < BADGES_BY_PRIORITY.length; i++) {
      expect(BADGE_PRIORITY[BADGES_BY_PRIORITY[i]]).toBe(i);
    }
  });

  test("first element is most urgent (apprvl)", () => {
    expect(BADGES_BY_PRIORITY[0]).toBe("apprvl");
  });

  test("last element is least urgent (--)", () => {
    expect(BADGES_BY_PRIORITY[11]).toBe("--");
  });
});
