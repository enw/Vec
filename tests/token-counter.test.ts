import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TokenCounter, TOKEN_LIMIT, BUFFER_TOKENS } from '../src/memory/TokenCounter.js';
import Anthropic from '@anthropic-ai/sdk';

describe('TokenCounter', () => {
  let mockClient: Anthropic;
  let counter: TokenCounter;

  beforeEach(() => {
    // Create mock Anthropic client
    mockClient = {
      messages: {
        countTokens: vi.fn(),
      },
    } as unknown as Anthropic;

    counter = new TokenCounter({ client: mockClient });
  });

  describe('countMessage', () => {
    it('returns token count from API', async () => {
      const mockCountTokens = mockClient.messages.countTokens as ReturnType<typeof vi.fn>;
      mockCountTokens.mockResolvedValue({ input_tokens: 42 });

      const result = await counter.countMessage({
        id: 'msg-1',
        role: 'user',
        content: 'Hello world',
      });

      expect(result).toBe(42);
      expect(mockCountTokens).toHaveBeenCalledWith({
        model: 'claude-sonnet-4-20250514',
        messages: [{ role: 'user', content: 'Hello world' }],
      });
    });

    it('caches token count by message ID', async () => {
      const mockCountTokens = mockClient.messages.countTokens as ReturnType<typeof vi.fn>;
      mockCountTokens.mockResolvedValue({ input_tokens: 42 });

      // First call - should hit API
      await counter.countMessage({ id: 'msg-1', role: 'user', content: 'Hello' });

      // Second call with same ID - should use cache
      const result = await counter.countMessage({ id: 'msg-1', role: 'user', content: 'Different content' });

      expect(result).toBe(42);
      expect(mockCountTokens).toHaveBeenCalledTimes(1); // Only called once
    });

    it('falls back to char/4 estimate when API fails', async () => {
      const mockCountTokens = mockClient.messages.countTokens as ReturnType<typeof vi.fn>;
      mockCountTokens.mockRejectedValue(new Error('API error'));

      const result = await counter.countMessage({
        id: 'msg-1',
        role: 'user',
        content: 'Hello world', // 11 chars -> 3 tokens
      });

      expect(result).toBe(3); // ceil(11/4) = 3
    });
  });

  describe('countMessages', () => {
    it('sums token counts for multiple messages', async () => {
      const mockCountTokens = mockClient.messages.countTokens as ReturnType<typeof vi.fn>;
      mockCountTokens
        .mockResolvedValueOnce({ input_tokens: 10 })
        .mockResolvedValueOnce({ input_tokens: 20 })
        .mockResolvedValueOnce({ input_tokens: 30 });

      const result = await counter.countMessages([
        { id: 'msg-1', role: 'user', content: 'First' },
        { id: 'msg-2', role: 'assistant', content: 'Second' },
        { id: 'msg-3', role: 'user', content: 'Third' },
      ]);

      expect(result).toBe(60);
    });

    it('uses cached counts when available', async () => {
      const mockCountTokens = mockClient.messages.countTokens as ReturnType<typeof vi.fn>;
      mockCountTokens.mockResolvedValue({ input_tokens: 10 });

      // First call caches both messages
      await counter.countMessages([
        { id: 'msg-1', role: 'user', content: 'First' },
        { id: 'msg-2', role: 'user', content: 'Second' },
      ]);

      // Second call should use cache
      const result = await counter.countMessages([
        { id: 'msg-1', role: 'user', content: 'First' },
        { id: 'msg-2', role: 'user', content: 'Second' },
      ]);

      expect(result).toBe(20);
      expect(mockCountTokens).toHaveBeenCalledTimes(2); // Only first call
    });
  });

  describe('countSystemPrompt', () => {
    it('counts system prompt tokens', async () => {
      const mockCountTokens = mockClient.messages.countTokens as ReturnType<typeof vi.fn>;
      mockCountTokens.mockResolvedValue({ input_tokens: 50 }); // Includes test message

      const result = await counter.countSystemPrompt('You are a helpful assistant');

      expect(result).toBeGreaterThanOrEqual(0); // Subtracts test message tokens
      expect(mockCountTokens).toHaveBeenCalledWith({
        model: 'claude-sonnet-4-20250514',
        system: 'You are a helpful assistant',
        messages: [{ role: 'user', content: 'test' }],
      });
    });

    it('caches by content hash', async () => {
      const mockCountTokens = mockClient.messages.countTokens as ReturnType<typeof vi.fn>;
      mockCountTokens.mockResolvedValue({ input_tokens: 50 });

      await counter.countSystemPrompt('Same prompt');
      const result = await counter.countSystemPrompt('Same prompt');

      expect(mockCountTokens).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearCache', () => {
    it('clears cached counts', async () => {
      const mockCountTokens = mockClient.messages.countTokens as ReturnType<typeof vi.fn>;
      mockCountTokens.mockResolvedValue({ input_tokens: 42 });

      await counter.countMessage({ id: 'msg-1', role: 'user', content: 'Hello' });
      counter.clearCache();
      await counter.countMessage({ id: 'msg-1', role: 'user', content: 'Hello' });

      expect(mockCountTokens).toHaveBeenCalledTimes(2); // Called again after cache clear
    });
  });

  describe('offline fallback', () => {
    it('uses char/4 estimate when no API key provided', async () => {
      // Create counter without API key
      const offlineCounter = new TokenCounter({
        client: undefined as unknown as Anthropic
      });

      const result = await offlineCounter.countMessage({
        id: 'msg-1',
        role: 'user',
        content: 'This is a test message with 40 chars!', // 40 chars -> 10 tokens
      });

      expect(result).toBe(10); // ceil(40/4) = 10
    });
  });

  describe('constants', () => {
    it('exports TOKEN_LIMIT as 100k', () => {
      expect(TOKEN_LIMIT).toBe(100_000);
    });

    it('exports BUFFER_TOKENS as 10k', () => {
      expect(BUFFER_TOKENS).toBe(10_000);
    });
  });
});
