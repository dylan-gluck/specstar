import { useState } from "react";
import { Text, Box, useInput } from "ink";
import FocusBox from "./focus-box";

export type File = {
  name: string;
};

type FileListProps = {
  id: string;
  title: string;
  files: File[];
};

export function FileList({ id, title, files }: FileListProps) {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  useInput((input, key) => {
    if (key.upArrow && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
    if (key.downArrow && selectedIndex < files.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  });

  return (
    <FocusBox id={id} title={title}>
      {files &&
        files.map((file, index) => (
          <FileItem
            key={file.name}
            name={file.name}
            selected={selectedIndex === index}
          />
        ))}
    </FocusBox>
  );
}

function FileItem({ name, selected }: { name: string; selected: boolean }) {
  return (
    <Box backgroundColor={selected ? "green" : undefined}>
      <Text color={selected ? "white" : undefined} key={name}>
        {name}
      </Text>
    </Box>
  );
}
