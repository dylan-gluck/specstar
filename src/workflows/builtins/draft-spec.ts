import type { WorkflowDefinition } from "../../contracts/workflow.js";
import { workflowId } from "../../types.js";

export const draftSpec: WorkflowDefinition = {
  id: workflowId("draft-spec"),
  name: "Draft Spec",
  description: "Generate technical specification from issue requirements",
  sourcePath: "builtin://draft-spec",
  steps: [
    {
      id: "research",
      name: "Research Requirements",
      dependsOn: [],
      prompt:
        "Research the requirements for issue {{issueId}}. Review the issue description, related code, and existing patterns in the codebase.",
    },
    {
      id: "draft",
      name: "Draft Specification",
      dependsOn: ["research"],
      prompt:
        "Draft a technical specification for issue {{issueId}} including: overview, technical approach, data model changes, API changes, migration plan, testing strategy, and rollback plan.",
    },
  ],
};

export default draftSpec;
