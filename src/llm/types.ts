import type { TokenUsageEvent } from '../types.js';

export interface LLMMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface StreamOptions {
  messages: LLMMessage[];
  model?: string;          // defaults to 'claude-sonnet-4-20250514'
  maxTokens?: number;      // defaults to 4096
  systemPrompt?: string;   // optional system message
  onChunk: (text: string) => void;  // called for each text delta
  signal?: AbortSignal;    // for cancellation
}

export interface StreamResult {
  content: string;         // full accumulated response
  cancelled: boolean;      // true if aborted mid-stream
  usage: TokenUsageEvent;  // token counts for budget tracking
  error?: string;          // error message if failed
}
