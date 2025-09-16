import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";

interface LoadingSpinnerProps {
  message?: string;
  type?: 'dots' | 'line' | 'circle';
  color?: string;
}

export function LoadingSpinner({ 
  message = "Loading", 
  type = 'dots',
  color = 'cyan' 
}: LoadingSpinnerProps) {
  const [frame, setFrame] = useState(0);

  const spinners = {
    dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
    line: ['―', '\\', '|', '/'],
    circle: ['◐', '◓', '◑', '◒']
  };

  const frames = spinners[type];

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame(prev => (prev + 1) % frames.length);
    }, 80);

    return () => clearInterval(timer);
  }, [frames.length]);

  return (
    <Box>
      <Text color={color}>
        {frames[frame]} {message}
      </Text>
    </Box>
  );
}

interface LoadingOverlayProps {
  message?: string;
  submessage?: string;
}

export function LoadingOverlay({ 
  message = "Loading", 
  submessage 
}: LoadingOverlayProps) {
  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      flexGrow={1}
      borderStyle="round"
      borderColor="gray"
      padding={2}
    >
      <LoadingSpinner message={message} type="dots" />
      {submessage && (
        <Box marginTop={1}>
          <Text color="gray" dimColor>{submessage}</Text>
        </Box>
      )}
    </Box>
  );
}

interface ProgressBarProps {
  current: number;
  total: number;
  width?: number;
  showPercentage?: boolean;
  color?: string;
}

export function ProgressBar({
  current,
  total,
  width = 30,
  showPercentage = true,
  color = 'green'
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (current / total) * 100));
  const filled = Math.floor((percentage / 100) * width);
  const empty = width - filled;

  return (
    <Box>
      <Text>
        [
        <Text color={color}>{'█'.repeat(filled)}</Text>
        {'░'.repeat(empty)}
        ]
        {showPercentage && ` ${percentage.toFixed(0)}%`}
      </Text>
    </Box>
  );
}