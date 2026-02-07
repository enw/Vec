import Anthropic from '@anthropic-ai/sdk';
import { createHash } from 'node:crypto';

export const TOKEN_LIMIT = 100_000;
export const BUFFER_TOKENS = 10_000;

interface TokenCountMessage {
  id: string;
  role: string;
  content: string;
}

export class TokenCounter {
  private client: Anthropic;
  private model: string;
  private cache: Map<string, number>;

  constructor(options?: { client?: Anthropic; model?: string }) {
    this.client = options?.client || new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    this.model = options?.model || 'claude-sonnet-4-20250514';
    this.cache = new Map();
  }

  async countMessage(message: TokenCountMessage): Promise<number> {
    // Check cache first
    if (this.cache.has(message.id)) {
      return this.cache.get(message.id)!;
    }

    // Fallback to estimation if no API key
    if (!process.env.ANTHROPIC_API_KEY && !this.client) {
      console.warn('TokenCounter: No API key, falling back to char/4 estimate');
      const estimate = Math.ceil(message.content.length / 4);
      this.cache.set(message.id, estimate);
      return estimate;
    }

    try {
      const response = await this.client.messages.countTokens({
        model: this.model,
        messages: [{ role: message.role as 'user' | 'assistant', content: message.content }],
      });

      const count = response.input_tokens;
      this.cache.set(message.id, count);
      return count;
    } catch (error) {
      // Fallback on API errors
      console.warn('TokenCounter: API call failed, falling back to char/4 estimate:', error);
      const estimate = Math.ceil(message.content.length / 4);
      this.cache.set(message.id, estimate);
      return estimate;
    }
  }

  async countMessages(messages: TokenCountMessage[]): Promise<number> {
    let total = 0;
    for (const message of messages) {
      total += await this.countMessage(message);
    }
    return total;
  }

  async countSystemPrompt(systemPrompt: string): Promise<number> {
    // Cache key: hash of content
    const hash = createHash('sha256').update(systemPrompt).digest('hex');

    if (this.cache.has(hash)) {
      return this.cache.get(hash)!;
    }

    // Fallback to estimation if no API key
    if (!process.env.ANTHROPIC_API_KEY && !this.client) {
      console.warn('TokenCounter: No API key, falling back to char/4 estimate');
      const estimate = Math.ceil(systemPrompt.length / 4);
      this.cache.set(hash, estimate);
      return estimate;
    }

    try {
      const response = await this.client.messages.countTokens({
        model: this.model,
        system: systemPrompt,
        messages: [{ role: 'user', content: 'test' }], // Required but not counted
      });

      // Subtract the test message tokens (rough estimate)
      const count = Math.max(0, response.input_tokens - 10);
      this.cache.set(hash, count);
      return count;
    } catch (error) {
      console.warn('TokenCounter: API call failed, falling back to char/4 estimate:', error);
      const estimate = Math.ceil(systemPrompt.length / 4);
      this.cache.set(hash, estimate);
      return estimate;
    }
  }

  clearCache(): void {
    this.cache.clear();
  }
}
