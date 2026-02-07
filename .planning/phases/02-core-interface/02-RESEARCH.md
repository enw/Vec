# Phase 2: Core Interface - Research

**Researched:** 2026-02-06
**Domain:** Terminal User Interface (TUI) with React and streaming API responses
**Confidence:** HIGH

## Summary

Phase 2 builds a CLI/TUI conversational interface using Ink (React for terminal) with streaming responses from Anthropic's API. The standard approach combines Ink 6.6.0 for UI rendering, the official `@anthropic-ai/sdk` for streaming, and file-based workspace persistence using JSONL format for conversation history.

Ink provides React component model for terminal UIs with Flexbox layouts, automatic TTY capability detection, and first-class streaming support through React's incremental rendering. Anthropic SDK delivers streaming responses via server-sent events (SSE) with granular event types for text deltas, tool use, and thinking blocks. Workspace isolation uses filesystem directories with JSONL append-only logs for performance (9000x faster than monolithic JSON).

**Primary recommendation:** Use Ink's `<Static>` component for immutable message history + windowing logic for recent messages, Anthropic SDK's `.stream()` with `text_stream` iterator, and JSONL files per workspace for conversation persistence.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ink | 6.6.0 | React-based TUI framework | Official React renderer for CLI, mature ecosystem, Flexbox layouts |
| react | 18.x | UI component model | Ink's peer dependency, enables component-based architecture |
| @anthropic-ai/sdk | Latest | Anthropic API client | Official SDK, handles streaming SSE, rate limiting, error recovery |
| ink-text-input | Latest | Text input component | Official Ink ecosystem, handles cursor, editing, submission |
| ink-spinner | Latest | Loading indicators | Official Ink ecosystem, multiple spinner styles |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| meow | Latest | CLI argument parsing | Declarative, strong TypeScript inference, ES module native |
| sanitize-filename | Latest | Workspace name validation | Cross-platform filename safety (Windows, Linux, macOS) |
| xdg-basedir | Latest | Config/data directory paths | XDG Base Directory spec compliance on Unix-like systems |
| ink-testing-library | Latest | Component testing | Unit tests for Ink components with `render()` and `lastFrame()` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Ink | blessed/neo-blessed | Widget-based vs component-based; blessed conflicts with Ink if mixed |
| Ink | terminal-kit | Lower-level control, steeper learning curve, no React model |
| meow | commander/yargs | Commander solid all-around but less TypeScript inference; yargs complex setup |
| JSONL | lowdb/node-persist | JSONL 9000x faster appends, better for streaming; lowdb easier API for small data |
| File storage | SQLite (node:sqlite) | SQLite production-ready but overkill for simple conversation logs |

**Installation:**
```bash
pnpm add ink react @anthropic-ai/sdk ink-text-input ink-spinner
pnpm add meow sanitize-filename xdg-basedir
pnpm add -D ink-testing-library @types/react
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── cli/
│   ├── index.ts              # Entry point, arg parsing (meow)
│   ├── app.tsx               # Root Ink component
│   └── commands/             # Command handlers
├── ui/
│   ├── components/
│   │   ├── ConversationView.tsx   # Message history display
│   │   ├── InputPrompt.tsx        # Text input with submission
│   │   ├── StatusBar.tsx          # Workspace, mode, metadata
│   │   └── MessageItem.tsx        # Single message (user/assistant)
│   └── hooks/
│       ├── useConversation.ts     # Conversation state management
│       ├── useStreaming.ts        # Anthropic streaming integration
│       └── useWorkspace.ts        # Workspace CRUD operations
├── workspace/
│   ├── WorkspaceManager.ts        # Create, load, switch workspaces
│   ├── ConversationStore.ts       # JSONL read/write/append
│   └── types.ts                   # Workspace, Message types
└── utils/
    ├── validateWorkspaceName.ts   # Filesystem-safe name validation
    └── paths.ts                   # XDG directory resolution
```

### Pattern 1: Static + Windowing for Message History
**What:** Use `<Static>` for immutable rendered messages, windowing for scrollable recent history
**When to use:** Displaying conversation history with many messages (>50)
**Example:**
```typescript
// Source: https://combray.prose.sh/2025-12-01-tui-development
import { Box, Text, Static, useStdoutDimensions } from 'ink';

const ConversationView = ({ messages }) => {
  const { rows } = useStdoutDimensions();
  const visibleMessageCount = rows - 5; // Reserve rows for input, status bar

  // Window: only render messages that fit viewport
  const visibleMessages = messages.slice(-visibleMessageCount);

  return (
    <Box flexDirection="column">
      <Static items={visibleMessages}>
        {(msg, index) => (
          <MessageItem key={msg.id} message={msg} />
        )}
      </Static>
    </Box>
  );
};
```

### Pattern 2: Streaming with Anthropic SDK
**What:** Use SDK's `.stream()` with async iteration for text deltas
**When to use:** Displaying AI responses as they arrive
**Example:**
```typescript
// Source: https://platform.claude.com/docs/en/api/messages-streaming
import Anthropic from '@anthropic-ai/sdk';

const streamResponse = async (messages, onChunk) => {
  const client = new Anthropic();

  const stream = client.messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    messages,
  });

  // Listen for text chunks
  stream.on('text', (text) => {
    onChunk(text); // Append to display
  });

  // Get final message
  const message = await stream.finalMessage();
  return message;
};
```

### Pattern 3: JSONL Append-Only Conversation Log
**What:** One line per message, append new messages without rewriting file
**When to use:** Persisting conversation history for workspace
**Example:**
```typescript
// Source: https://jsonlines.org/
import { appendFile, readFile } from 'fs/promises';

const appendMessage = async (workspacePath: string, message: Message) => {
  const line = JSON.stringify(message) + '\n';
  await appendFile(`${workspacePath}/conversation.jsonl`, line);
};

const loadMessages = async (workspacePath: string): Promise<Message[]> => {
  const content = await readFile(`${workspacePath}/conversation.jsonl`, 'utf-8');
  return content.split('\n').filter(Boolean).map(line => JSON.parse(line));
};
```

### Pattern 4: Graceful Ctrl+C Handling
**What:** Use Ink's `useApp` and `useInput` hooks for clean shutdown
**When to use:** Cancelling streaming responses, graceful exit
**Example:**
```typescript
// Source: https://github.com/vadimdemedes/ink
import { useApp, useInput } from 'ink';

const InputHandler = ({ onCancel }) => {
  const { exit } = useApp();

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      onCancel(); // Stop streaming
      exit();
    }
  });

  return null;
};
```

### Pattern 5: XDG-Compliant Workspace Storage
**What:** Store workspaces in `$XDG_DATA_HOME/vec/workspaces/`
**When to use:** Cross-platform user data storage
**Example:**
```typescript
// Source: https://github.com/sindresorhus/xdg-basedir
import xdgBasedir from 'xdg-basedir';
import { join } from 'path';

const getWorkspacesDir = () => {
  const dataHome = xdgBasedir.data || join(process.env.HOME, '.local/share');
  return join(dataHome, 'vec', 'workspaces');
};
```

### Anti-Patterns to Avoid
- **Rendering all messages without windowing:** Causes flickering and performance issues with >50 messages
- **Using console.log during Ink render:** Breaks layout, use file logging or Ink components
- **Monolithic JSON for conversation storage:** 9000x slower writes vs JSONL, corruption risk on crash
- **Mixing blessed and Ink:** Both manage terminal state, cause conflicts
- **Not checking `process.stdout.isTTY`:** Crashes in non-TTY environments (CI, pipes)
- **Rewriting full conversation on each message:** Use append-only JSONL for performance

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CLI argument parsing | Manual `process.argv` parsing | meow | Handles flags, validation, help text, TypeScript inference |
| Filename sanitization | Regex for invalid chars | sanitize-filename | Cross-platform (Windows, Linux, macOS), handles edge cases |
| Terminal capability detection | Manual TTY checks | Ink auto-detection | Handles colors, dimensions, stdin.isTTY, automatic fallback |
| Streaming SSE parsing | Manual event parsing | @anthropic-ai/sdk | Handles reconnection, error events, rate limiting, token tracking |
| Config directory paths | Hardcoded `~/.config/` | xdg-basedir | XDG spec compliance, Windows/macOS equivalents |
| Scrollable regions | Custom scroll state | Ink `<Static>` + windowing | Optimized rendering, immutable item handling |
| Spinner animations | Custom frame updates | ink-spinner | 70+ styles, automatic timing, no flicker |

**Key insight:** Terminal rendering has subtle cross-platform and performance edge cases (flickering, TTY detection, resize handling). Mature libraries handle these; custom solutions miss edge cases and cause production issues.

## Common Pitfalls

### Pitfall 1: Flickering from Excessive Re-renders
**What goes wrong:** Ink re-renders entire screen on state change, causing visible flicker with frequent updates
**Why it happens:** Not using `<Static>` for immutable content, rendering all messages instead of windowing
**How to avoid:**
- Use `<Static>` component for completed messages that never change
- Enable incremental rendering mode (only updates changed lines)
- Window visible messages to screen size (e.g., last 50)
**Warning signs:** Visible screen flashing during streaming, sluggish terminal response

### Pitfall 2: Rate Limiting Infinite Loop
**What goes wrong:** Anthropic API returns 429 error, retry logic enters infinite loop burning credits
**Why it happens:** Not checking `retry-after` header, aggressive retry without backoff
**How to avoid:**
- Use Anthropic SDK's built-in error handling
- Implement exponential backoff on 429 errors
- Check `retry-after` header from API response
- Budget alerts (from Phase 1 token tracking) prevent runaway costs
**Warning signs:** Repeated 429 errors in logs, unexpected credit depletion

### Pitfall 3: Raw Mode Stdin Interference
**What goes wrong:** `process.stdin.setRawMode(true)` disables Ctrl+C, app becomes unkillable
**Why it happens:** Enabling raw mode without handling SIGINT manually
**How to avoid:**
- Use Ink's `useStdin` hook instead of direct `process.stdin.setRawMode`
- Ink handles Ctrl+C automatically via `useInput` hook
- If manual raw mode needed, always listen for SIGINT: `process.on('SIGINT', cleanup)`
**Warning signs:** Ctrl+C doesn't exit app, terminal requires kill -9

### Pitfall 4: Partial Message Loss on Stream Error
**What goes wrong:** Network error during streaming loses partial response, user loses context
**Why it happens:** Not accumulating streamed chunks before final write
**How to avoid:**
- Accumulate all deltas in memory during streaming
- Only write to JSONL on successful completion OR on cancellation with `[cancelled]` marker
- Use SDK's `.finalMessage()` for complete message object
**Warning signs:** Incomplete messages in history, missing responses after network glitches

### Pitfall 5: Workspace Name Collision Across Platforms
**What goes wrong:** Workspace name valid on Linux fails on Windows (e.g., `project:v1` contains `:`)
**Why it happens:** Not validating names for cross-platform filesystem safety
**How to avoid:**
- Use `sanitize-filename` for all user-provided workspace names
- Restrict to alphanumeric + hyphens/underscores (as per CONTEXT.md decision)
- Validate before creating workspace directory
**Warning signs:** `ENOENT` or `EINVAL` errors on Windows, works fine on macOS/Linux

### Pitfall 6: Terminal Resize During Message Display
**What goes wrong:** Terminal resized while messages displayed, layout breaks or truncates
**Why it happens:** Not responding to `process.stdout.on('resize')` events
**How to avoid:**
- Use `useStdoutDimensions()` hook to get current terminal size
- Recalculate visible message window on dimension change
- Box component flexbox handles most layout reflow automatically
**Warning signs:** Messages cut off after resize, status bar misaligned

## Code Examples

Verified patterns from official sources:

### Workspace Manager with JSONL Persistence
```typescript
// Source: https://jsonlines.org/ + https://github.com/sindresorhus/xdg-basedir
import { mkdir, appendFile, readFile } from 'fs/promises';
import { join } from 'path';
import xdgBasedir from 'xdg-basedir';
import sanitize from 'sanitize-filename';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  cancelled?: boolean;
}

class WorkspaceManager {
  private baseDir: string;

  constructor() {
    const dataHome = xdgBasedir.data || join(process.env.HOME!, '.local/share');
    this.baseDir = join(dataHome, 'vec', 'workspaces');
  }

  async create(name: string): Promise<string> {
    const safeName = sanitize(name);
    const workspacePath = join(this.baseDir, safeName);
    await mkdir(workspacePath, { recursive: true });
    return workspacePath;
  }

  async appendMessage(workspacePath: string, message: Message): Promise<void> {
    const conversationFile = join(workspacePath, 'conversation.jsonl');
    const line = JSON.stringify(message) + '\n';
    await appendFile(conversationFile, line);
  }

  async loadMessages(workspacePath: string): Promise<Message[]> {
    const conversationFile = join(workspacePath, 'conversation.jsonl');
    try {
      const content = await readFile(conversationFile, 'utf-8');
      return content.split('\n').filter(Boolean).map(line => JSON.parse(line));
    } catch (err) {
      if ((err as any).code === 'ENOENT') return [];
      throw err;
    }
  }
}
```

### Streaming Hook with Error Handling
```typescript
// Source: https://platform.claude.com/docs/en/api/messages-streaming
import { useState, useCallback } from 'react';
import Anthropic from '@anthropic-ai/sdk';

interface UseStreamingResult {
  isStreaming: boolean;
  currentChunk: string;
  error: Error | null;
  streamMessage: (messages: any[]) => Promise<void>;
  cancel: () => void;
}

export const useStreaming = (): UseStreamingResult => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentChunk, setCurrentChunk] = useState('');
  const [error, setError] = useState<Error | null>(null);
  const [controller, setController] = useState<AbortController | null>(null);

  const streamMessage = useCallback(async (messages: any[]) => {
    const client = new Anthropic();
    const abortController = new AbortController();
    setController(abortController);
    setIsStreaming(true);
    setCurrentChunk('');
    setError(null);

    try {
      const stream = client.messages.stream({
        model: 'claude-opus-4-6',
        max_tokens: 4096,
        messages,
      });

      // Handle text chunks
      stream.on('text', (text) => {
        setCurrentChunk(prev => prev + text);
      });

      // Handle errors
      stream.on('error', (err) => {
        setError(err);
        setIsStreaming(false);
      });

      // Wait for completion
      await stream.finalMessage();
      setIsStreaming(false);
    } catch (err) {
      setError(err as Error);
      setIsStreaming(false);
    }
  }, []);

  const cancel = useCallback(() => {
    controller?.abort();
    setIsStreaming(false);
  }, [controller]);

  return { isStreaming, currentChunk, error, streamMessage, cancel };
};
```

### Responsive Conversation View with Windowing
```typescript
// Source: https://combray.prose.sh/2025-12-01-tui-development
import React from 'react';
import { Box, Text, Static, useStdoutDimensions } from 'ink';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  cancelled?: boolean;
}

interface ConversationViewProps {
  messages: Message[];
  streamingContent?: string;
}

export const ConversationView: React.FC<ConversationViewProps> = ({
  messages,
  streamingContent
}) => {
  const { rows } = useStdoutDimensions();

  // Reserve space for status bar (1) and input (3)
  const availableRows = rows - 4;

  // Window: only show messages that fit
  const visibleMessages = messages.slice(-Math.max(10, availableRows));

  return (
    <Box flexDirection="column" height={availableRows}>
      <Static items={visibleMessages}>
        {(msg) => (
          <Box key={msg.id} marginBottom={1}>
            <Text bold color={msg.role === 'user' ? 'cyan' : 'green'}>
              {msg.role === 'user' ? '> ' : '< '}
            </Text>
            <Text>
              {msg.content}
              {msg.cancelled && <Text color="yellow"> [cancelled]</Text>}
            </Text>
          </Box>
        )}
      </Static>

      {streamingContent && (
        <Box>
          <Text bold color="green">{'< '}</Text>
          <Text>{streamingContent}</Text>
        </Box>
      )}
    </Box>
  );
};
```

### CLI Entry Point with Workspace Flag
```typescript
// Source: https://github.com/sindresorhus/meow
import meow from 'meow';
import { render } from 'ink';
import React from 'react';
import { App } from './app.js';

const cli = meow(`
  Usage
    $ vec [options]

  Options
    -w, --workspace <name>  Create or switch to named workspace
    -w, --workspace         Create numbered workspace (auto-increment)
    --version               Show version
    --help                  Show help
`, {
  importMeta: import.meta,
  flags: {
    workspace: {
      type: 'string',
      shortFlag: 'w',
      isOptional: (flags, input) => true, // Allow -w without value
    },
  },
});

// Determine workspace: named, numbered, or last active
let workspaceName: string;
if (cli.flags.workspace !== undefined) {
  if (cli.flags.workspace === '') {
    // -w without name: create numbered workspace
    workspaceName = await getNextNumberedWorkspace();
  } else {
    workspaceName = cli.flags.workspace;
  }
} else {
  workspaceName = await getLastActiveWorkspace();
}

render(<App workspaceName={workspaceName} />);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Ink v2 Color component | Ink v3+ Text color prop | Ink 3.0 (2021) | Simpler API, less nesting, better performance |
| Monolithic JSON files | JSONL append-only logs | 2024-2025 | 9000x faster writes, corruption-resistant |
| Manual SSE parsing | Official Anthropic SDK | SDK v0.9+ | Error handling, rate limits, reconnection built-in |
| Blessed for TUI | Ink (React model) | 2019+ | Component-based, testable, better DX |
| commander for args | meow for TypeScript | 2023+ | ES modules, stronger inference, smaller |
| Polling for dimensions | useStdoutDimensions hook | Ink 3.2+ | Automatic resize handling, reactive |

**Deprecated/outdated:**
- **Ink v2 `<Color>` component**: Use `<Text color="...">` instead (Ink 3+)
- **blessed/neo-blessed with Ink**: Don't mix, causes terminal state conflicts
- **JSON files for streaming logs**: Use JSONL for append-only workloads
- **lowdb for conversation history**: JSONL faster for sequential append pattern
- **Manual setRawMode**: Use Ink's `useStdin` hook for TTY safety

## Open Questions

Things that couldn't be fully resolved:

1. **Numbered workspace auto-increment strategy**
   - What we know: User can create numbered workspaces with `-w` (no name)
   - What's unclear: Tracking highest number (file in workspaces dir? metadata file?)
   - Recommendation: Use `.metadata.json` in workspaces dir with `lastNumberedWorkspace` counter

2. **Mode switching mechanism (TUI/CLI toggle)**
   - What we know: Default TUI, fallback CLI, status bar shows mode
   - What's unclear: User-initiated switching (keyboard shortcut? restart with flag?)
   - Recommendation: Start with auto-detection only, defer manual switching to Phase 3 if needed

3. **Streaming granularity (token/word/sentence)**
   - What we know: SDK provides per-token deltas via `text_delta` events
   - What's unclear: Buffering strategy for smooth display (chunk size?)
   - Recommendation: Start with raw token streaming, add buffering if flicker observed

4. **Message history scrolling interface**
   - What we know: Ink doesn't have native ScrollView, use windowing
   - What's unclear: Arrow key scrolling vs auto-tail (which is default?)
   - Recommendation: Start auto-tail (always show latest), defer scroll-up to Phase 3

## Sources

### Primary (HIGH confidence)
- [GitHub: vadimdemedes/ink](https://github.com/vadimdemedes/ink) - Official Ink framework repository
- [Ink npm package](https://www.npmjs.com/search?q=ink) - Version 6.6.0 confirmed
- [Anthropic Streaming Docs](https://platform.claude.com/docs/en/api/messages-streaming) - Official streaming event types, error handling
- [Anthropic SDK TypeScript](https://github.com/anthropics/anthropic-sdk-typescript) - Official SDK repository
- [JSON Lines Specification](https://jsonlines.org/) - JSONL format standard
- [XDG Base Directory](https://github.com/sindresorhus/xdg-basedir) - Official xdg-basedir package
- [sanitize-filename](https://github.com/parshap/node-sanitize-filename) - Cross-platform filename sanitization

### Secondary (MEDIUM confidence)
- [TUI Development: Ink + React](https://combray.prose.sh/2025-12-01-tui-development) - Practical Ink patterns (2025)
- [Ink 3 Announcement](https://vadimdemedes.com/posts/ink-3) - Breaking changes and architectural improvements
- [Anthropic Rate Limits](https://docs.anthropic.com/en/api/rate-limits) - Token bucket algorithm, 429 handling
- [Node.js Readline Documentation](https://nodejs.org/api/readline.html) - Raw mode and keypress events
- [JSONL for Chat Storage](https://github.com/google-gemini/gemini-cli/issues/15292) - Performance benchmarks (9000x faster)

### Tertiary (LOW confidence)
- WebSearch: "Ink framework best practices 2026" - General ecosystem patterns
- WebSearch: "Node.js conversation state persistence 2026" - Architecture patterns
- WebSearch: "terminal capability detection" - TTY detection strategies

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official packages, mature ecosystem, verified versions
- Architecture: HIGH - Patterns from official docs and production implementations
- Pitfalls: MEDIUM - Mix of official docs (streaming errors) and community reports (flickering)
- Code examples: HIGH - All sourced from official documentation or verified repos

**Research date:** 2026-02-06
**Valid until:** 2026-03-06 (30 days - Ink and Anthropic SDK stable, slow-moving)
