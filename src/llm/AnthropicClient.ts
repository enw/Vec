import Anthropic from '@anthropic-ai/sdk';
import type { StreamOptions, StreamResult } from './types.js';
import type { TokenUsageEvent } from '../types.js';

export class AnthropicClient {
  private client: Anthropic;

  constructor(options?: { apiKey?: string }) {
    this.client = new Anthropic({
      apiKey: options?.apiKey,
    });
  }

  async stream(options: StreamOptions): Promise<StreamResult> {
    const model = options.model || 'claude-sonnet-4-20250514';
    const maxTokens = options.maxTokens || 4096;

    let fullContent = '';
    let cancelled = false;
    let abortHandler: (() => void) | null = null;

    try {
      const stream = this.client.messages.stream({
        model,
        max_tokens: maxTokens,
        messages: options.messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        ...(options.systemPrompt && { system: options.systemPrompt }),
      });

      // Handle cancellation
      if (options.signal) {
        abortHandler = () => {
          cancelled = true;
          stream.controller.abort();
        };
        options.signal.addEventListener('abort', abortHandler);
      }

      // Accumulate text chunks
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          const text = event.delta.text;
          fullContent += text;
          options.onChunk(text);
        }
      }

      // Clean up abort handler
      if (options.signal && abortHandler) {
        options.signal.removeEventListener('abort', abortHandler);
      }

      // Get final message for usage stats
      const finalMsg = await stream.finalMessage();
      const usage: TokenUsageEvent = {
        model,
        promptTokens: finalMsg.usage.input_tokens,
        completionTokens: finalMsg.usage.output_tokens,
        totalTokens: finalMsg.usage.input_tokens + finalMsg.usage.output_tokens,
        timestamp: new Date().toISOString(),
      };

      return {
        content: fullContent,
        cancelled,
        usage,
      };

    } catch (error) {
      // Clean up abort handler on error
      if (options.signal && abortHandler) {
        options.signal.removeEventListener('abort', abortHandler);
      }

      // Handle cancellation separately (not an error)
      if (cancelled) {
        return {
          content: fullContent,
          cancelled: true,
          usage: {
            model,
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            timestamp: new Date().toISOString(),
          },
        };
      }

      // Handle specific Anthropic errors
      if (error instanceof Anthropic.AuthenticationError) {
        return {
          content: fullContent,
          cancelled: false,
          usage: {
            model,
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            timestamp: new Date().toISOString(),
          },
          error: 'Invalid API key. Set ANTHROPIC_API_KEY environment variable.',
        };
      }

      if (error instanceof Anthropic.RateLimitError) {
        return {
          content: fullContent,
          cancelled: false,
          usage: {
            model,
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            timestamp: new Date().toISOString(),
          },
          error: 'Rate limited. Please wait and try again.',
        };
      }

      if (error instanceof Anthropic.APIError) {
        return {
          content: fullContent,
          cancelled: false,
          usage: {
            model,
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            timestamp: new Date().toISOString(),
          },
          error: error.message,
        };
      }

      // Network or other errors
      return {
        content: fullContent,
        cancelled: false,
        usage: {
          model,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          timestamp: new Date().toISOString(),
        },
        error: 'Network error. Check your connection.',
      };
    }
  }
}
