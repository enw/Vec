import { useState, useEffect, useCallback } from 'react';
import type { Message } from '../../workspace/types.js';
import type { ConversationStore } from '../../workspace/ConversationStore.js';

interface UseConversationOptions {
  store: ConversationStore;
}

export function useConversation({ store }: UseConversationOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Load messages on mount
  useEffect(() => {
    const loadMessages = async () => {
      const loaded = await store.loadAll();
      setMessages(loaded);
      setLoading(false);
    };
    loadMessages();
  }, [store]);

  // Add message to state and persist
  const addMessage = useCallback(async (message: Message) => {
    setMessages(prev => [...prev, message]);
    await store.append(message);
  }, [store]);

  // Update last message content (for streaming - does NOT persist)
  const updateLastMessage = useCallback((content: string) => {
    setMessages(prev => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      updated[updated.length - 1] = { ...updated[updated.length - 1], content };
      return updated;
    });
  }, []);

  return {
    messages,
    loading,
    addMessage,
    updateLastMessage,
  };
}
