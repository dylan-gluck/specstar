import { Text, Box } from "ink";

export function MarkdownViewer() {
  return (
    <Box
      borderStyle="doubleSingle"
      borderColor="gray"
      flexGrow={1}
      paddingX={1}
      flexDirection="column"
    >
      <Box
        backgroundColor="gray"
        width="100%"
        flexGrow={0}
        justifyContent="space-between"
        paddingX={1}
      >
        <Text color="black" bold>
          Document-title.md
        </Text>
        <Text color="black">preview</Text>
      </Box>
    </Box>
  );
}
