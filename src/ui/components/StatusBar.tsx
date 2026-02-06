import React from 'react';
import { Box, Text } from 'ink';

interface StatusBarProps {
  workspaceName: string;
  mode: 'tui' | 'cli';
  isStreaming: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({ workspaceName, mode, isStreaming }) => {
  const statusText = isStreaming ? 'Streaming...' : 'Ready';

  return (
    <Box borderStyle="single" paddingX={1}>
      <Text>[{workspaceName}]</Text>
      <Text> | </Text>
      <Text>{mode.toUpperCase()}</Text>
      <Text> | </Text>
      <Text color={isStreaming ? 'yellow' : 'green'}>{statusText}</Text>
    </Box>
  );
};
