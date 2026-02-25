import type { WorkflowDefinition } from "../../../specs/001-issue-centric-tui/contracts/workflow.js";
import { workflowId } from "../../types.js";

export const captureIssue: WorkflowDefinition = {
  id: workflowId("capture-issue"),
  name: "Capture Issue",
  description: "Quick issue capture from natural language description",
  sourcePath: "builtin://capture-issue",
  steps: [
    {
      id: "capture",
      name: "Capture and Create Issue",
      dependsOn: [],
      prompt:
        "Create a new Linear issue based on this description: {{description}}. Extract a clear title, detailed description with acceptance criteria, and suggest appropriate labels.",
    },
  ],
};

export default captureIssue;
