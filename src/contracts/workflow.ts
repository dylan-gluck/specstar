/**
 * Workflow engine contract.
 *
 * Discovers, validates, and executes workflow definitions.
 * Bridges to the omp swarm extension for multi-agent pipeline orchestration.
 *
 * Discovery directories (in priority order):
 *   1. `.specstar/workflows/`
 *   2. `~/.omp/agent/workflows/`
 *   3. `.omp/workflows/`
 *   4. Additional directories from `config.workflowDirs`
 *
 * @version 1.0.0
 */

// ---------------------------------------------------------------------------
// Branded types
// ---------------------------------------------------------------------------

/** Opaque workflow definition ID. */
export type WorkflowId = string & { readonly __brand: "WorkflowId" };

/** Opaque handle ID for a running workflow execution. */
export type WorkflowHandleId = string & { readonly __brand: "WorkflowHandleId" };

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

/** Workflow execution status. */
export type WorkflowStatus = "pending" | "running" | "completed" | "failed" | "aborted";

/** A discovered workflow definition parsed from YAML. */
export interface WorkflowDefinition {
  readonly id: WorkflowId;
  readonly name: string;
  readonly description: string;
  /** Filesystem path to the source YAML file. */
  readonly sourcePath: string;
  /** Ordered step definitions forming the pipeline. */
  readonly steps: readonly WorkflowStep[];
}

/** A single step in a workflow pipeline. */
export interface WorkflowStep {
  readonly id: string;
  readonly name: string;
  /** Step IDs this step depends on (forms a DAG). */
  readonly dependsOn: readonly string[];
  /** Prompt template for the agent session. */
  readonly prompt: string;
  /** Optional model override for this step. */
  readonly model?: string;
}

/** Runtime context provided when executing a workflow. */
export interface WorkflowContext {
  /** Working directory for all workflow sessions. */
  readonly cwd: string;
  /** Issue identifier for context injection (e.g. "AUTH-142"). */
  readonly issueId?: string;
  /** Arbitrary key-value pairs available to prompt templates. */
  readonly variables: Readonly<Record<string, string>>;
}

/** Handle to a running or completed workflow execution. */
export interface WorkflowHandle {
  readonly id: WorkflowHandleId;
  readonly workflowId: WorkflowId;
  readonly status: WorkflowStatus;
  /** Per-step status map. */
  readonly stepStatuses: Readonly<Record<string, WorkflowStepStatus>>;
  /** Abort the workflow. Running steps are cancelled. */
  abort(): Promise<void>;
  /**
   * Subscribe to progress updates.
   * @returns Unsubscribe function.
   */
  onProgress(callback: (event: WorkflowProgressEvent) => void): () => void;
}

/** Status of an individual workflow step. */
export interface WorkflowStepStatus {
  readonly stepId: string;
  readonly status: WorkflowStatus;
  /** ISO-8601 timestamp when the step started, if applicable. */
  readonly startedAt?: string;
  /** ISO-8601 timestamp when the step ended, if applicable. */
  readonly completedAt?: string;
  /** Error message if the step failed. */
  readonly error?: string;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/** Progress event emitted during workflow execution. */
export type WorkflowProgressEvent =
  | { readonly type: "step_started"; readonly stepId: string }
  | { readonly type: "step_completed"; readonly stepId: string }
  | { readonly type: "step_failed"; readonly stepId: string; readonly error: string }
  | { readonly type: "workflow_completed"; readonly workflowId: WorkflowId }
  | { readonly type: "workflow_failed"; readonly workflowId: WorkflowId; readonly error: string }
  | { readonly type: "workflow_aborted"; readonly workflowId: WorkflowId };

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type WorkflowError =
  | WorkflowNotFoundError
  | WorkflowValidationError
  | WorkflowExecutionError;

export interface WorkflowNotFoundError {
  readonly type: "workflow_not_found";
  readonly workflowId: string;
  readonly message: string;
}

export interface WorkflowValidationError {
  readonly type: "workflow_validation";
  /** Specific validation failures. */
  readonly issues: readonly string[];
  readonly message: string;
}

export interface WorkflowExecutionError {
  readonly type: "workflow_execution";
  readonly workflowId: string;
  readonly stepId?: string;
  readonly cause: unknown;
  readonly message: string;
}

// ---------------------------------------------------------------------------
// Service interface
// ---------------------------------------------------------------------------

/** Workflow discovery and execution engine. */
export interface WorkflowEngine {
  /** Discover available workflows from standard directories. */
  discover(): readonly WorkflowDefinition[];

  /**
   * Execute a workflow definition with the given context.
   * Builds a dependency graph, computes execution waves, and runs
   * steps via the session pool.
   */
  execute(def: WorkflowDefinition, context: WorkflowContext): Promise<WorkflowHandle>;
}
