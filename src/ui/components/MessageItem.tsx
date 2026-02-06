import React from 'react';
import { Box, Text } from 'ink';
import type { Message } from '../../workspace/index.js';

interface MessageItemProps {
  message: Message;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const roleIndicator = isUser ? '> ' : '< ';
  const roleColor = isUser ? 'cyan' : 'green';

  const timestamp = new Date(message.timestamp);
  const timeStr = timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <Box marginBottom={0}>
      <Text bold color={roleColor}>{roleIndicator}</Text>
      <Text dimColor>[{timeStr}] </Text>
      <Text>{message.content}</Text>
      {message.cancelled && <Text color="yellow"> [cancelled]</Text>}
    </Box>
  );
};
