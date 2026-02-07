import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TokenAwareLoader } from '../src/memory/TokenAwareLoader.js';
import { TokenCounter, TOKEN_LIMIT } from '../src/memory/TokenCounter.js';
import type { ConversationStore } from '../src/workspace/ConversationStore.js';
import type { Message } from '../src/workspace/types.js';

describe('TokenAwareLoader', () => {
  let mockStore: ConversationStore;
  let mockCounter: TokenCounter;
  let loader: TokenAwareLoader;

  beforeEach(() => {
    // Mock ConversationStore
    mockStore = {
      loadAll: vi.fn(),
    } as unknown as ConversationStore;

    // Mock TokenCounter
    mockCounter = {
      countMessage: vi.fn(),
      countSystemPrompt: vi.fn(),
      countMessages: vi.fn(),
    } as unknown as TokenCounter;

    loader = new TokenAwareLoader({ counter: mockCounter, store: mockStore });
  });

  describe('loadWithinBudget', () => {
    it('loads all messages when under budget', async () => {
      const messages: Message[] = [
        { id: '1', role: 'user', content: 'First', timestamp: 1000 },
        { id: '2', role: 'assistant', content: 'Second', timestamp: 2000 },
        { id: '3', role: 'user', content: 'Third', timestamp: 3000 },
      ];

      (mockStore.loadAll as ReturnType<typeof vi.fn>).mockResolvedValue(messages);
      (mockCounter.countMessage as ReturnType<typeof vi.fn>).mockResolvedValue(1000); // Each message 1k tokens

      const result = await loader.loadWithinBudget();

      expect(result.messages).toEqual(messages);
      expect(result.loadedMessages).toBe(3);
      expect(result.totalMessages).toBe(3);
      expect(result.tokenCount).toBe(3000);
    });

    it('loads only recent messages when exceeding budget', async () => {
      const messages: Message[] = Array.from({ length: 10 }, (_, i) => ({
        id: `msg-${i}`,
        role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
        content: `Message ${i}`,
        timestamp: i * 1000,
      }));

      (mockStore.loadAll as ReturnType<typeof vi.fn>).mockResolvedValue(messages);
      (mockCounter.countMessage as ReturnType<typeof vi.fn>).mockResolvedValue(20_000); // Each message 20k tokens

      const result = await loader.loadWithinBudget();

      // Budget = 100k - 10k buffer = 90k
      // Each message = 20k tokens
      // Should load last 4 messages (80k tokens)
      expect(result.loadedMessages).toBe(4);
      expect(result.totalMessages).toBe(10);
      expect(result.messages[0].id).toBe('msg-6'); // Most recent 4 messages
      expect(result.messages[3].id).toBe('msg-9');
    });

    it('reserves space for system prompt', async () => {
      const messages: Message[] = [
        { id: '1', role: 'user', content: 'Test', timestamp: 1000 },
      ];

      (mockStore.loadAll as ReturnType<typeof vi.fn>).mockResolvedValue(messages);
      (mockCounter.countSystemPrompt as ReturnType<typeof vi.fn>).mockResolvedValue(5000);
      (mockCounter.countMessage as ReturnType<typeof vi.fn>).mockResolvedValue(1000);

      const result = await loader.loadWithinBudget({
        systemPrompt: 'You are helpful',
      });

      // Should have accounted for 5k system prompt tokens
      expect(mockCounter.countSystemPrompt).toHaveBeenCalledWith('You are helpful');
      expect(result.messages).toHaveLength(1);
    });

    it('reserves additional tokens when specified', async () => {
      const messages: Message[] = Array.from({ length: 5 }, (_, i) => ({
        id: `msg-${i}`,
        role: 'user' as const,
        content: `Message ${i}`,
        timestamp: i * 1000,
      }));

      (mockStore.loadAll as ReturnType<typeof vi.fn>).mockResolvedValue(messages);
      (mockCounter.countMessage as ReturnType<typeof vi.fn>).mockResolvedValue(20_000);

      const result = await loader.loadWithinBudget({
        reserveTokens: 30_000,
      });

      // Budget = 100k - 10k buffer - 30k reserve = 60k
      // Each message = 20k
      // Should load last 3 messages
      expect(result.loadedMessages).toBe(3);
    });

    it('returns empty array when conversation is empty', async () => {
      (mockStore.loadAll as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await loader.loadWithinBudget();

      expect(result.messages).toEqual([]);
      expect(result.loadedMessages).toBe(0);
      expect(result.totalMessages).toBe(0);
      expect(result.tokenCount).toBe(0);
    });

    it('maintains chronological order of loaded messages', async () => {
      const messages: Message[] = [
        { id: '1', role: 'user', content: 'First', timestamp: 1000 },
        { id: '2', role: 'assistant', content: 'Second', timestamp: 2000 },
        { id: '3', role: 'user', content: 'Third', timestamp: 3000 },
      ];

      (mockStore.loadAll as ReturnType<typeof vi.fn>).mockResolvedValue(messages);
      (mockCounter.countMessage as ReturnType<typeof vi.fn>).mockResolvedValue(1000);

      const result = await loader.loadWithinBudget();

      // Should be in chronological order (oldest first)
      expect(result.messages[0].id).toBe('1');
      expect(result.messages[1].id).toBe('2');
      expect(result.messages[2].id).toBe('3');
    });
  });

  describe('shouldSummarize', () => {
    it('returns true when total tokens exceed 80% of limit', async () => {
      const messages: Message[] = [
        { id: '1', role: 'user', content: 'Message', timestamp: 1000 },
      ];

      (mockStore.loadAll as ReturnType<typeof vi.fn>).mockResolvedValue(messages);
      (mockCounter.countMessages as ReturnType<typeof vi.fn>).mockResolvedValue(85_000); // 85k > 80k threshold

      const result = await loader.shouldSummarize();

      expect(result).toBe(true);
    });

    it('returns false when total tokens below 80% of limit', async () => {
      const messages: Message[] = [
        { id: '1', role: 'user', content: 'Message', timestamp: 1000 },
      ];

      (mockStore.loadAll as ReturnType<typeof vi.fn>).mockResolvedValue(messages);
      (mockCounter.countMessages as ReturnType<typeof vi.fn>).mockResolvedValue(50_000); // 50k < 80k threshold

      const result = await loader.shouldSummarize();

      expect(result).toBe(false);
    });

    it('returns false for empty conversation', async () => {
      (mockStore.loadAll as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockCounter.countMessages as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      const result = await loader.shouldSummarize();

      expect(result).toBe(false);
    });
  });

  describe('getTokenStats', () => {
    it('returns token statistics', async () => {
      const messages: Message[] = Array.from({ length: 5 }, (_, i) => ({
        id: `msg-${i}`,
        role: 'user' as const,
        content: `Message ${i}`,
        timestamp: i * 1000,
      }));

      (mockStore.loadAll as ReturnType<typeof vi.fn>).mockResolvedValue(messages);
      (mockCounter.countMessages as ReturnType<typeof vi.fn>).mockResolvedValue(60_000);

      const stats = await loader.getTokenStats();

      expect(stats.totalTokens).toBe(60_000);
      expect(stats.messageCount).toBe(5);
      expect(stats.budgetUsed).toBe(0.6); // 60k / 100k = 60%
    });

    it('calculates budget usage correctly', async () => {
      (mockStore.loadAll as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: '1', role: 'user', content: 'Test', timestamp: 1000 },
      ]);
      (mockCounter.countMessages as ReturnType<typeof vi.fn>).mockResolvedValue(25_000);

      const stats = await loader.getTokenStats();

      expect(stats.budgetUsed).toBe(0.25); // 25k / 100k = 25%
    });

    it('returns zero stats for empty conversation', async () => {
      (mockStore.loadAll as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockCounter.countMessages as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      const stats = await loader.getTokenStats();

      expect(stats.totalTokens).toBe(0);
      expect(stats.messageCount).toBe(0);
      expect(stats.budgetUsed).toBe(0);
    });
  });
});
