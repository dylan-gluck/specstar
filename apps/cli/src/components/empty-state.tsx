import React from "react";
import { Box, Text } from "ink";

export function EmptyState() {
  return (
    <Box
      borderStyle="classic"
      borderColor="gray"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      flexGrow={1}
    >
      <Text color="gray" bold>
        No Session Selected
      </Text>
      <Text color="gray">
        Select a session from the left panel to view details
      </Text>
    </Box>
  );
}