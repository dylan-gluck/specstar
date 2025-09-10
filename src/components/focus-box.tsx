import { Text, Box, useFocus } from "ink";
import chalk from "chalk";

export default function FocusBox({
  id,
  title,
  children,
  ...rest
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  const { isFocused } = useFocus({ id });

  return (
    <Box
      borderStyle="classic"
      borderColor={isFocused ? "green" : "gray"}
      flexGrow={isFocused ? 1 : 0}
      paddingX={1}
      flexDirection="column"
      {...rest}
    >
      <Text>
        [{id}] {isFocused ? chalk.green(title) : title}
      </Text>
      {isFocused ? children : null}
    </Box>
  );
}
