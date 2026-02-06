import React from 'react';
import { Box, Text, useStdout } from 'ink';
import Spinner from 'ink-spinner';
import { MessageItem } from './MessageItem.js';
import type { Message } from '../../workspace/index.js';

interface ConversationViewProps {
  messages: Message[];
  streamingContent?: string;
}

export const ConversationView: React.FC<ConversationViewProps> = ({ messages, streamingContent }) => {
  const { stdout } = useStdout();
  const rows = stdout.rows || 24;

  // Reserve rows for status bar (3 rows with border) + input area (2 rows)
  const availableRows = Math.max(10, rows - 5);

  // Window visible messages to fit terminal
  const visibleMessages = messages.slice(-availableRows);

  if (messages.length === 0 && !streamingContent) {
    return (
      <Box flexDirection="column" flexGrow={1}>
        <Text dimColor>No messages yet. Type a message to begin.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" flexGrow={1}>
      {visibleMessages.map((msg) => (
        <MessageItem key={msg.id} message={msg} />
      ))}
      {streamingContent && (
        <Box>
          <Text bold color="green">{'< '}</Text>
          <Spinner type="dots" />
          <Text> {streamingContent}</Text>
        </Box>
      )}
    </Box>
  );
};
