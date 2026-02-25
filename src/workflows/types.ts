/**
 * Workflow types — re-exports contract types and adds runtime helpers.
 *
 * @module workflows/types
 */

// ---------------------------------------------------------------------------
// Re-exports from contract
// ---------------------------------------------------------------------------

export type {
  WorkflowId,
  WorkflowHandleId,
  WorkflowStatus,
  WorkflowDefinition,
  WorkflowStep,
  WorkflowContext,
  WorkflowHandle,
  WorkflowStepStatus,
  WorkflowProgressEvent,
  WorkflowError,
  WorkflowNotFoundError,
  WorkflowValidationError,
  WorkflowExecutionError,
  WorkflowEngine,
} from "../contracts/workflow.js";

// ---------------------------------------------------------------------------
// YAML schema (for future YAML-based workflow definitions)
// ---------------------------------------------------------------------------

/** Parsed shape of a workflow YAML file before validation. */
export interface WorkflowYAML {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly steps: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly depends_on?: readonly string[];
    readonly prompt: string;
    readonly model?: string;
  }>;
}
