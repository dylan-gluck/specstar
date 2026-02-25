import type { WorkflowDefinition } from "../../../specs/001-issue-centric-tui/contracts/workflow.js";
import { workflowId } from "../../types.js";

export const refineIssue: WorkflowDefinition = {
  id: workflowId("refine-issue"),
  name: "Refine Issue",
  description: "Codebase-aware ticket refinement with technical analysis",
  sourcePath: "builtin://refine-issue",
  steps: [
    {
      id: "analyze",
      name: "Analyze Codebase Context",
      dependsOn: [],
      prompt:
        "Analyze the codebase to understand the technical context for issue {{issueId}}. Identify relevant files, dependencies, and potential impact areas.",
    },
    {
      id: "refine",
      name: "Refine Issue Details",
      dependsOn: ["analyze"],
      prompt:
        "Based on the codebase analysis, refine issue {{issueId}} with: detailed technical description, implementation approach, affected files list, estimated complexity, and acceptance criteria.",
    },
  ],
};

export default refineIssue;
