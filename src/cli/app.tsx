import React, { useState, useEffect, useCallback } from 'react';
import { Box, useInput, useApp } from 'ink';
import { StatusBar } from '../ui/components/StatusBar.js';
import { ConversationView } from '../ui/components/ConversationView.js';
import { InputPrompt } from '../ui/components/InputPrompt.js';
import { ConversationStore } from '../workspace/index.js';
import { AnthropicClient } from '../llm/AnthropicClient.js';
import { SecurityManager } from '../security.js';
import { useConversation } from '../ui/hooks/useConversation.js';
import { useStreaming } from '../ui/hooks/useStreaming.js';
import type { Message } from '../workspace/index.js';
import type { LLMMessage, StreamResult } from '../llm/types.js';

interface AppProps {
  workspaceName: string;
  workspacePath: string;
}

export const App: React.FC<AppProps> = ({ workspaceName, workspacePath }) => {
  const { exit } = useApp();

  // Check for API key
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  // Initialize services on mount
  const [store] = useState(() => new ConversationStore(workspacePath));
  const [client] = useState(() => {
    if (!process.env.ANTHROPIC_API_KEY) {
      setApiKeyError('Set ANTHROPIC_API_KEY environment variable to start chatting.');
      return null;
    }
    return new AnthropicClient();
  });
  const [security] = useState<SecurityManager | null>(() => {
    const sm = new SecurityManager();
    sm.init().catch((err) => {
      console.warn('SecurityManager init failed, token tracking disabled:', err.message);
    });
    return sm;
  });

  // Mode detection
  const mode: 'tui' | 'cli' = (process.stdout.isTTY && process.stdout.columns) ? 'tui' : 'cli';

  // Handle stream completion
  const onComplete = useCallback(async (result: StreamResult) => {
    // Create assistant message
    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: result.error || result.content,
      timestamp: Date.now(),
      cancelled: result.cancelled,
    };

    // Persist message
    await conversation.addMessage(assistantMessage);

    // Track tokens if available
    if (result.usage && security && !result.error && !result.cancelled) {
      try {
        security.trackTokens(result.usage);
      } catch (err) {
        // Token tracking failed but don't block user
        console.warn('Token tracking failed:', (err as Error).message);
      }
    }
  }, [security]);

  // Use hooks
  const conversation = useConversation({ store });
  const streaming = client ? useStreaming({ client, onComplete }) : null;

  // Ctrl+C handling
  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      if (streaming?.isStreaming) {
        // Cancel streaming
        streaming.cancel();
      } else {
        // Exit app
        exit();
      }
    }
  });

  const handleSubmit = async (text: string) => {
    if (!client || !streaming) {
      return; // API key not set
    }

    // Create user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    // Persist user message
    await conversation.addMessage(userMessage);

    // Build LLM message array
    const llmMessages: LLMMessage[] = conversation.messages
      .concat([userMessage])
      .map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

    // Send to streaming
    streaming.send(llmMessages);
  };

  return (
    <Box flexDirection="column" height="100%">
      <StatusBar workspaceName={workspaceName} mode={mode} isStreaming={streaming?.isStreaming || false} />
      {apiKeyError ? (
        <ConversationView messages={[]} streamingContent={undefined} />
      ) : (
        <ConversationView
          messages={conversation.messages}
          streamingContent={streaming?.isStreaming ? streaming.currentChunk : undefined}
        />
      )}
      <InputPrompt onSubmit={handleSubmit} disabled={streaming?.isStreaming || !!apiKeyError} />
    </Box>
  );
};
