/**
 * Workflow engine — discovers, validates, and executes workflow definitions.
 *
 * Discovery scans directories in priority order for TypeScript modules that
 * default-export a WorkflowDefinition. YAML support is a future TODO requiring
 * a parser dependency.
 *
 * Execution builds a dependency DAG, computes topological waves, and runs
 * steps in parallel within each wave via the workflow bridge.
 *
 * @module workflows/engine
 */

import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import type {
  WorkflowDefinition,
  WorkflowContext,
  WorkflowHandle,
  WorkflowHandleId,
  WorkflowStatus,
  WorkflowStepStatus,
  WorkflowProgressEvent,
  WorkflowValidationError,
  WorkflowEngine,
} from "./types.js";
import { workflowHandleId } from "../types.js";
import type { WorkflowBridge } from "./bridge.js";

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export interface WorkflowEngineConfig {
  readonly workflowDirs: readonly string[];
  readonly bridge: WorkflowBridge;
}

export function createWorkflowEngine(config: WorkflowEngineConfig): WorkflowEngine {
  const { bridge } = config;

  // -------------------------------------------------------------------------
  // discover
  // -------------------------------------------------------------------------

  function discover(): readonly WorkflowDefinition[] {
    const home = process.env["HOME"] ?? Bun.env["HOME"] ?? "";
    const dirs: string[] = [
      resolve(".specstar/workflows"),
      home ? resolve(home, ".omp/agent/workflows") : "",
      resolve(".omp/workflows"),
      ...config.workflowDirs.map((d) => resolve(d)),
    ].filter(Boolean);

    const definitions: WorkflowDefinition[] = [];
    const seenIds = new Set<string>();

    for (const dir of dirs) {
      if (!existsSync(dir)) continue;

      let entries: string[];
      try {
        // Synchronous discovery — readdir is async but we need sync for the contract.
        // Use Bun.spawnSync to list files, or just wrap around readdirSync.
        const { readdirSync } = require("node:fs");
        entries = (readdirSync(dir) as string[]).filter(
          (f: string) => f.endsWith(".ts") || f.endsWith(".js"),
        );
      } catch {
        continue;
      }

      for (const entry of entries) {
        const fullPath = join(dir, entry);
        try {
          // Dynamic import requires async — but discover() is sync per contract.
          // Use require() for .js, but .ts needs Bun's loader.
          // Bun supports require() for .ts files at runtime.
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const mod = require(fullPath) as { default?: WorkflowDefinition };
          const def = mod.default;
          if (!def || !def.id || !def.name || !def.steps) continue;
          if (seenIds.has(def.id)) continue; // first-seen wins (priority order)
          seenIds.add(def.id);
          definitions.push(def);
        } catch {
          // Skip invalid modules silently — discovery should not crash.
          continue;
        }
      }
    }

    return definitions;
  }

  // -------------------------------------------------------------------------
  // execute
  // -------------------------------------------------------------------------

  async function execute(
    def: WorkflowDefinition,
    context: WorkflowContext,
  ): Promise<WorkflowHandle> {
    validate(def);

    const waves = computeWaves(def);
    const handleId = generateHandleId();
    const listeners: Array<(event: WorkflowProgressEvent) => void> = [];
    let aborted = false;

    const stepStatuses: Record<string, WorkflowStepStatus> = {};
    for (const step of def.steps) {
      stepStatuses[step.id] = { stepId: step.id, status: "pending" };
    }

    let overallStatus: WorkflowStatus = "running";

    function emit(event: WorkflowProgressEvent): void {
      for (const cb of listeners) {
        try {
          cb(event);
        } catch {
          // Listener errors must not crash the engine.
        }
      }
    }

    function updateStep(
      stepId: string,
      status: WorkflowStatus,
      extra?: { error?: string; startedAt?: string; completedAt?: string },
    ): void {
      stepStatuses[stepId] = {
        ...stepStatuses[stepId]!,
        status,
        ...extra,
      };
    }

    // Build a step-id → step lookup.
    const stepMap = new Map(def.steps.map((s) => [s.id, s]));

    // Run waves sequentially, steps within a wave in parallel.
    const execution = (async () => {
      try {
        for (const wave of waves) {
          if (aborted) break;

          const promises = wave.map(async (stepId) => {
            if (aborted) return;
            const step = stepMap.get(stepId)!;
            const now = new Date().toISOString();

            updateStep(stepId, "running", { startedAt: now });
            emit({ type: "step_started", stepId });

            try {
              await bridge.executeStep(step, context);
              if (aborted) return;
              updateStep(stepId, "completed", { completedAt: new Date().toISOString() });
              emit({ type: "step_completed", stepId });
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              updateStep(stepId, "failed", {
                completedAt: new Date().toISOString(),
                error: message,
              });
              emit({ type: "step_failed", stepId, error: message });
              throw err;
            }
          });

          await Promise.all(promises);
        }

        if (aborted) {
          // Don't emit again — abort() already emitted workflow_aborted
        } else {
          overallStatus = "completed";
          emit({ type: "workflow_completed", workflowId: def.id });
        }
      } catch (err) {
        if (aborted) {
          // Step failed because of abort — don't override with "failed"
          // abort() already emitted workflow_aborted
        } else {
          overallStatus = "failed";
          const message = err instanceof Error ? err.message : String(err);
          emit({ type: "workflow_failed", workflowId: def.id, error: message });
        }
      }
    })();

    // Deliberately not awaited — the handle lets callers observe progress.
    void execution;

    const handle: WorkflowHandle = {
      get id() {
        return handleId;
      },
      get workflowId() {
        return def.id;
      },
      get status() {
        return overallStatus;
      },
      get stepStatuses() {
        return { ...stepStatuses };
      },
      async abort() {
        if (aborted || overallStatus === "completed" || overallStatus === "failed") return;
        aborted = true;
        overallStatus = "aborted";
        emit({ type: "workflow_aborted", workflowId: def.id });
      },
      onProgress(callback: (event: WorkflowProgressEvent) => void) {
        listeners.push(callback);
        return () => {
          const idx = listeners.indexOf(callback);
          if (idx >= 0) listeners.splice(idx, 1);
        };
      },
    };

    return handle;
  }

  return { discover, execute };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validate(def: WorkflowDefinition): void {
  const issues: string[] = [];

  if (!def.id) issues.push("Workflow id must be non-empty.");
  if (!def.name) issues.push("Workflow name must be non-empty.");
  if (!def.steps.length) issues.push("Workflow must have at least one step.");

  const stepIds = new Set<string>();
  for (const step of def.steps) {
    if (stepIds.has(step.id)) {
      issues.push(`Duplicate step id: "${step.id}".`);
    }
    stepIds.add(step.id);
  }

  for (const step of def.steps) {
    if (typeof step.id !== "string" || !step.id) {
      issues.push("Each step must have a non-empty string id.");
      continue;
    }
    if (!Array.isArray(step.dependsOn)) {
      issues.push(`Step "${step.id}": dependsOn must be an array`);
      continue;
    }
    for (const dep of step.dependsOn) {
      if (!stepIds.has(dep)) {
        issues.push(`Step "${step.id}" depends on unknown step "${dep}".`);
      }
    }
  }

  // Cycle detection via topological sort attempt.
  if (issues.length === 0) {
    try {
      computeWaves(def);
    } catch {
      issues.push("Circular dependency detected in step graph.");
    }
  }

  if (issues.length > 0) {
    const error: WorkflowValidationError = {
      type: "workflow_validation",
      issues,
      message: `Workflow "${def.id}" validation failed: ${issues.join(" ")}`,
    };
    throw error;
  }
}

// ---------------------------------------------------------------------------
// DAG: topological sort into parallel waves
// ---------------------------------------------------------------------------

/**
 * Compute execution waves via Kahn's algorithm. Each wave is a set of step
 * IDs whose dependencies have all been satisfied. Steps within a wave run
 * in parallel.
 *
 * Throws if the graph contains a cycle.
 */
function computeWaves(def: WorkflowDefinition): string[][] {
  const inDegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const step of def.steps) {
    const deps = Array.isArray(step.dependsOn) ? step.dependsOn : [];
    inDegree.set(step.id, deps.length);
    for (const dep of deps) {
      const list = dependents.get(dep) ?? [];
      list.push(step.id);
      dependents.set(dep, list);
    }
  }

  const waves: string[][] = [];
  let remaining = def.steps.length;

  while (remaining > 0) {
    const wave: string[] = [];
    for (const [id, degree] of inDegree) {
      if (degree === 0) wave.push(id);
    }

    if (wave.length === 0) {
      throw new Error("Circular dependency in workflow step graph.");
    }

    for (const id of wave) {
      inDegree.delete(id);
      for (const dep of dependents.get(id) ?? []) {
        inDegree.set(dep, (inDegree.get(dep) ?? 1) - 1);
      }
    }

    remaining -= wave.length;
    waves.push(wave);
  }

  return waves;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateHandleId(): WorkflowHandleId {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "wh-";
  for (let i = 0; i < 8; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return workflowHandleId(result);
}
