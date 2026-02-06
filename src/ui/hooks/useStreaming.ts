import { useState, useRef, useCallback } from 'react';
import type { AnthropicClient } from '../../llm/AnthropicClient.js';
import type { LLMMessage, StreamResult } from '../../llm/types.js';

interface UseStreamingOptions {
  client: AnthropicClient;
  onComplete: (result: StreamResult) => void;
}

export function useStreaming({ client, onComplete }: UseStreamingOptions) {
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [currentChunk, setCurrentChunk] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const send = useCallback(async (messages: LLMMessage[]) => {
    // Reset state
    setIsStreaming(true);
    setCurrentChunk('');
    setError(null);

    // Create new abort controller
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const result = await client.stream({
        messages,
        onChunk: (text) => {
          setCurrentChunk(prev => prev + text);
        },
        signal: controller.signal,
      });

      // Call completion handler
      onComplete(result);

      // Reset state
      setIsStreaming(false);
      setCurrentChunk('');
      setError(result.error || null);
    } catch (err) {
      setIsStreaming(false);
      setError((err as Error).message);
      setCurrentChunk('');
    }
  }, [client, onComplete]);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    isStreaming,
    currentChunk,
    error,
    send,
    cancel,
  };
}
