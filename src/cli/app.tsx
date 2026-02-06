import React, { useState, useEffect } from 'react';
import { Box } from 'ink';
import { StatusBar } from '../ui/components/StatusBar.js';
import { ConversationView } from '../ui/components/ConversationView.js';
import { InputPrompt } from '../ui/components/InputPrompt.js';
import { ConversationStore } from '../workspace/index.js';
import type { Message } from '../workspace/index.js';

interface AppProps {
  workspaceName: string;
  workspacePath: string;
}

export const App: React.FC<AppProps> = ({ workspaceName, workspacePath }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [store] = useState(() => new ConversationStore(workspacePath));

  // Mode detection
  const mode: 'tui' | 'cli' = (process.stdout.isTTY && process.stdout.columns) ? 'tui' : 'cli';

  // Load messages on mount
  useEffect(() => {
    const loadMessages = async () => {
      const loaded = await store.loadAll();
      setMessages(loaded);
    };
    loadMessages();
  }, [store]);

  const handleSubmit = async (text: string) => {
    // Create user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    // Append to state and store
    setMessages((prev) => [...prev, userMessage]);
    await store.append(userMessage);

    // Start streaming (placeholder for now)
    setIsStreaming(true);
    setStreamingContent('');

    // Placeholder response after 500ms
    setTimeout(async () => {
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Streaming not yet connected. See Plan 03/04.',
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      await store.append(assistantMessage);
      setIsStreaming(false);
      setStreamingContent('');
    }, 500);
  };

  return (
    <Box flexDirection="column" height="100%">
      <StatusBar workspaceName={workspaceName} mode={mode} isStreaming={isStreaming} />
      <ConversationView messages={messages} streamingContent={streamingContent} />
      <InputPrompt onSubmit={handleSubmit} disabled={isStreaming} />
    </Box>
  );
};
