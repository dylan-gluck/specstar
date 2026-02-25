import { describe, test, expect } from "bun:test";
import { createWorkflowEngine } from "../../../src/workflows/engine.js";
import { makeWorkflowDef, makeWorkflowStep } from "../../helpers.js";
import { workflowId } from "../../../src/types.js";
import type { WorkflowBridge } from "../../../src/workflows/bridge.js";
import type { WorkflowHandle, WorkflowProgressEvent } from "../../../src/workflows/types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const context = { cwd: "/tmp/test", variables: {} };

function noopBridge(): WorkflowBridge {
	return { async executeStep() {} };
}

function recordingBridge(): { bridge: WorkflowBridge; order: string[] } {
	const order: string[] = [];
	return {
		order,
		bridge: {
			async executeStep(step) {
				order.push(step.id);
			},
		},
	};
}

/** Await workflow completion via onProgress. */
async function awaitHandle(handle: WorkflowHandle): Promise<void> {
	if (handle.status === "completed") return;
	if (handle.status === "failed") throw new Error("Workflow already failed");
	return new Promise<void>((resolve, reject) => {
		const unsub = handle.onProgress((event: WorkflowProgressEvent) => {
			if (event.type === "workflow_completed") {
				unsub();
				resolve();
			}
			if (event.type === "workflow_failed") {
				unsub();
				reject(new Error("error" in event ? event.error : "workflow failed"));
			}
		});
	});
}

// ---------------------------------------------------------------------------
// Validation (tested indirectly via execute throwing)
// ---------------------------------------------------------------------------

describe("workflow engine validation", () => {
	test("rejects empty steps", async () => {
		const engine = createWorkflowEngine({ workflowDirs: [], bridge: noopBridge() });
		const def = makeWorkflowDef({ steps: [] });

		expect(() => engine.execute(def, context)).toThrow(/at least one step/i);
	});

	test("rejects cycles (A↔B)", async () => {
		const engine = createWorkflowEngine({ workflowDirs: [], bridge: noopBridge() });
		const def = makeWorkflowDef({
			steps: [
				makeWorkflowStep({ id: "a", dependsOn: ["b"] }),
				makeWorkflowStep({ id: "b", dependsOn: ["a"] }),
			],
		});

		expect(() => engine.execute(def, context)).toThrow(/circular dependency/i);
	});

	test("rejects missing dependency", async () => {
		const engine = createWorkflowEngine({ workflowDirs: [], bridge: noopBridge() });
		const def = makeWorkflowDef({
			steps: [makeWorkflowStep({ id: "a", dependsOn: ["nonexistent"] })],
		});

		expect(() => engine.execute(def, context)).toThrow(/unknown step/i);
	});

	test("accepts valid linear DAG (A→B→C)", async () => {
		const { bridge, order } = recordingBridge();
		const engine = createWorkflowEngine({ workflowDirs: [], bridge });
		const def = makeWorkflowDef({
			steps: [
				makeWorkflowStep({ id: "a", dependsOn: [] }),
				makeWorkflowStep({ id: "b", dependsOn: ["a"] }),
				makeWorkflowStep({ id: "c", dependsOn: ["b"] }),
			],
		});

		const handle = await engine.execute(def, context);
		await awaitHandle(handle);
		expect(handle.status).toBe("completed");
	});

	test("accepts valid diamond DAG", async () => {
		const { bridge } = recordingBridge();
		const engine = createWorkflowEngine({ workflowDirs: [], bridge });
		const def = makeWorkflowDef({
			steps: [
				makeWorkflowStep({ id: "a", dependsOn: [] }),
				makeWorkflowStep({ id: "b", dependsOn: ["a"] }),
				makeWorkflowStep({ id: "c", dependsOn: ["a"] }),
				makeWorkflowStep({ id: "d", dependsOn: ["b", "c"] }),
			],
		});

		const handle = await engine.execute(def, context);
		await awaitHandle(handle);
		expect(handle.status).toBe("completed");
	});
});

// ---------------------------------------------------------------------------
// Step execution order
// ---------------------------------------------------------------------------

describe("workflow engine execution order", () => {
	test("linear chain executes A, B, C in order", async () => {
		const { bridge, order } = recordingBridge();
		const engine = createWorkflowEngine({ workflowDirs: [], bridge });
		const def = makeWorkflowDef({
			steps: [
				makeWorkflowStep({ id: "a", dependsOn: [] }),
				makeWorkflowStep({ id: "b", dependsOn: ["a"] }),
				makeWorkflowStep({ id: "c", dependsOn: ["b"] }),
			],
		});

		const handle = await engine.execute(def, context);
		await awaitHandle(handle);

		expect(order).toEqual(["a", "b", "c"]);
	});

	test("diamond: A first, D last, B+C in between", async () => {
		const { bridge, order } = recordingBridge();
		const engine = createWorkflowEngine({ workflowDirs: [], bridge });
		const def = makeWorkflowDef({
			steps: [
				makeWorkflowStep({ id: "a", dependsOn: [] }),
				makeWorkflowStep({ id: "b", dependsOn: ["a"] }),
				makeWorkflowStep({ id: "c", dependsOn: ["a"] }),
				makeWorkflowStep({ id: "d", dependsOn: ["b", "c"] }),
			],
		});

		const handle = await engine.execute(def, context);
		await awaitHandle(handle);

		expect(order[0]).toBe("a");
		expect(order[3]).toBe("d");
		// B and C are in positions 1 and 2 in either order
		expect(order.slice(1, 3).sort()).toEqual(["b", "c"]);
	});

	test("single step workflow succeeds", async () => {
		const { bridge, order } = recordingBridge();
		const engine = createWorkflowEngine({ workflowDirs: [], bridge });
		const def = makeWorkflowDef({
			steps: [makeWorkflowStep({ id: "only", dependsOn: [] })],
		});

		const handle = await engine.execute(def, context);
		await awaitHandle(handle);

		expect(order).toEqual(["only"]);
		expect(handle.status).toBe("completed");
	});
});

// ---------------------------------------------------------------------------
// Step failure
// ---------------------------------------------------------------------------

describe("workflow engine step failure", () => {
	test("bridge error causes workflow failure", async () => {
		const bridge: WorkflowBridge = {
			async executeStep(step) {
				if (step.id === "b") throw new Error("step B exploded");
			},
		};
		const engine = createWorkflowEngine({ workflowDirs: [], bridge });
		const def = makeWorkflowDef({
			steps: [
				makeWorkflowStep({ id: "a", dependsOn: [] }),
				makeWorkflowStep({ id: "b", dependsOn: ["a"] }),
				makeWorkflowStep({ id: "c", dependsOn: ["b"] }),
			],
		});

		const handle = await engine.execute(def, context);

		await new Promise<void>((resolve) => {
			const unsub = handle.onProgress((event: WorkflowProgressEvent) => {
				if (event.type === "workflow_failed" || event.type === "workflow_completed") {
					unsub();
					resolve();
				}
			});
			if (handle.status === "failed" || handle.status === "completed") resolve();
		});

		expect(handle.status).toBe("failed");
	});

	test("step statuses reflect failure", async () => {
		const bridge: WorkflowBridge = {
			async executeStep(step) {
				if (step.id === "fail-step") throw new Error("boom");
			},
		};
		const engine = createWorkflowEngine({ workflowDirs: [], bridge });
		const def = makeWorkflowDef({
			steps: [makeWorkflowStep({ id: "fail-step", dependsOn: [] })],
		});

		const handle = await engine.execute(def, context);

		await new Promise<void>((resolve) => {
			const unsub = handle.onProgress((event: WorkflowProgressEvent) => {
				if (event.type === "workflow_failed") {
					unsub();
					resolve();
				}
			});
			if (handle.status === "failed") resolve();
		});

		expect(handle.status).toBe("failed");
		expect(handle.stepStatuses["fail-step"]?.status).toBe("failed");
		expect(handle.stepStatuses["fail-step"]?.error).toBe("boom");
	});
});

// ---------------------------------------------------------------------------
// Progress events
// ---------------------------------------------------------------------------

describe("workflow engine progress events", () => {
	test("emits step_started and step_completed for each step", async () => {
		const events: WorkflowProgressEvent[] = [];
		const engine = createWorkflowEngine({ workflowDirs: [], bridge: noopBridge() });
		const def = makeWorkflowDef({
			steps: [
				makeWorkflowStep({ id: "x", dependsOn: [] }),
				makeWorkflowStep({ id: "y", dependsOn: ["x"] }),
			],
		});

		const handle = await engine.execute(def, context);
		handle.onProgress((e) => events.push(e));
		await awaitHandle(handle);

		const types = events.map((e) => e.type);
		expect(types).toContain("step_started");
		expect(types).toContain("step_completed");
		expect(types).toContain("workflow_completed");
	});
});
