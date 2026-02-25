/**
 * Bridge between workflow steps and the session pool.
 *
 * Translates a WorkflowStep + WorkflowContext into a spawned agent session,
 * interpolating prompt templates with context variables.
 *
 * @module workflows/bridge
 */

import type { WorkflowStep, WorkflowContext } from "./types.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface BridgeConfig {
  readonly spawnSession: (options: {
    readonly cwd: string;
    readonly name: string;
    readonly initialPrompt: string;
    readonly model?: string;
  }) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Bridge
// ---------------------------------------------------------------------------

export interface WorkflowBridge {
  executeStep(step: WorkflowStep, context: WorkflowContext): Promise<void>;
}

export function createWorkflowBridge(config: BridgeConfig): WorkflowBridge {
  return {
    async executeStep(step: WorkflowStep, context: WorkflowContext): Promise<void> {
      const prompt = interpolatePrompt(step.prompt, context);
      await config.spawnSession({
        cwd: context.cwd,
        name: `workflow:${step.name}`,
        initialPrompt: prompt,
        model: step.model,
      });
    },
  };
}

// ---------------------------------------------------------------------------
// Template interpolation
// ---------------------------------------------------------------------------

/**
 * Replace `{{key}}` placeholders in a prompt template with values from the
 * workflow context. Supports `{{issueId}}` and any key in `context.variables`.
 *
 * Unmatched placeholders are left as-is so downstream agents can still see
 * what was expected.
 */
function interpolatePrompt(template: string, context: WorkflowContext): string {
  let result = template;

  if (context.issueId) {
    result = result.replaceAll("{{issueId}}", context.issueId);
  }

  for (const [key, value] of Object.entries(context.variables)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }

  return result;
}
