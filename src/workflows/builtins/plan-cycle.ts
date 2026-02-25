import type { WorkflowDefinition } from "../../contracts/workflow.js";
import { workflowId } from "../../types.js";

export const planCycle: WorkflowDefinition = {
  id: workflowId("plan-cycle"),
  name: "Plan Cycle",
  description: "Cycle planning and capacity estimation",
  sourcePath: "builtin://plan-cycle",
  steps: [
    {
      id: "assess",
      name: "Assess Current State",
      dependsOn: [],
      prompt:
        "Assess the current state of all open issues. Categorize by priority, estimate complexity, and identify blockers.",
    },
    {
      id: "plan",
      name: "Generate Cycle Plan",
      dependsOn: ["assess"],
      prompt:
        "Based on the assessment, generate a cycle plan that: prioritizes issues by impact, groups related work, identifies parallelizable tasks, and estimates capacity needed.",
    },
    {
      id: "report",
      name: "Create Summary Report",
      dependsOn: ["plan"],
      prompt:
        "Create a summary report of the cycle plan including: sprint goals, issue assignments, risk areas, and success metrics.",
    },
  ],
};

export default planCycle;
