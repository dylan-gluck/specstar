import { useEffect } from "react";
import { Box, useInput, useApp, useFocusManager } from "ink";
import { type File, FileList } from "../components/file-list";
import { MarkdownViewer } from "../components/markdown-viewer";

export default function PlanView() {
  const { exit } = useApp();

  const { focus } = useFocusManager();

  useInput((input) => {
    if (input === "1") {
      focus("1");
    }

    if (input === "2") {
      focus("2");
    }

    if (input === "3") {
      focus("3");
    }

    if (input === "q") {
      exit();
    }
  });

  useEffect(() => {
    focus("1");
  }, []);

  const filesDocs: File[] = [
    { name: "project-plan.md" },
    { name: "prd.md" },
    { name: "new-front-end.md" },
    { name: "new-back-end.md" },
  ];

  const filesSpecs: File[] = [
    { name: "spec-001.md" },
    { name: "spec-002.md" },
    { name: "spec-003.md" },
    { name: "spec-004.md" },
  ];

  const filesTemplates: File[] = [
    { name: "plan-template.md" },
    { name: "spec-template.md" },
    { name: "task-template.md" },
  ];

  return (
    <Box flexGrow={1} marginTop={2} marginX={1} gap={1}>
      <Box width="30%" flexGrow={1} flexDirection="column">
        <FileList id="1" title="Docs" files={filesDocs} />
        <FileList id="2" title="Specs" files={filesSpecs} />
        <FileList id="3" title="Templates" files={filesTemplates} />
      </Box>
      <Box width="70%" flexGrow={1} flexDirection="column">
        <MarkdownViewer />
      </Box>
    </Box>
  );
}
