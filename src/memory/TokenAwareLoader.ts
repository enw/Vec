import type { Message } from '../workspace/types.js';
import type { ConversationStore } from '../workspace/ConversationStore.js';
import type { TokenCounter } from './TokenCounter.js';
import { TOKEN_LIMIT, BUFFER_TOKENS } from './TokenCounter.js';

interface LoadOptions {
  systemPrompt?: string;
  reserveTokens?: number;
}

interface LoadResult {
  messages: Message[];
  tokenCount: number;
  totalMessages: number;
  loadedMessages: number;
}

interface TokenStats {
  totalTokens: number;
  messageCount: number;
  budgetUsed: number; // as percentage (0-1)
}

export class TokenAwareLoader {
  private counter: TokenCounter;
  private store: ConversationStore;

  constructor(options: { counter: TokenCounter; store: ConversationStore }) {
    this.counter = options.counter;
    this.store = options.store;
  }

  async loadWithinBudget(options?: LoadOptions): Promise<LoadResult> {
    const allMessages = await this.store.loadAll();
    const totalMessages = allMessages.length;

    // Calculate available budget
    let budget = TOKEN_LIMIT - BUFFER_TOKENS;

    if (options?.systemPrompt) {
      const systemTokens = await this.counter.countSystemPrompt(options.systemPrompt);
      budget -= systemTokens;
    }

    if (options?.reserveTokens) {
      budget -= options.reserveTokens;
    }

    // Load from newest to oldest
    const messages: Message[] = [];
    let tokenCount = 0;

    for (let i = allMessages.length - 1; i >= 0; i--) {
      const msg = allMessages[i];

      // Count tokens for this message
      const msgTokens = await this.counter.countMessage({
        id: msg.id,
        role: msg.role,
        content: msg.content,
      });

      // Check if adding this message would exceed budget
      if (tokenCount + msgTokens > budget) {
        break;
      }

      messages.unshift(msg); // Add to front (chronological order)
      tokenCount += msgTokens;
    }

    return {
      messages,
      tokenCount,
      totalMessages,
      loadedMessages: messages.length,
    };
  }

  async shouldSummarize(): Promise<boolean> {
    const allMessages = await this.store.loadAll();
    const totalTokens = await this.counter.countMessages(
      allMessages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
      }))
    );

    // 80% threshold per research
    return totalTokens > TOKEN_LIMIT * 0.8;
  }

  async getTokenStats(): Promise<TokenStats> {
    const allMessages = await this.store.loadAll();
    const totalTokens = await this.counter.countMessages(
      allMessages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
      }))
    );

    return {
      totalTokens,
      messageCount: allMessages.length,
      budgetUsed: totalTokens / TOKEN_LIMIT,
    };
  }
}
