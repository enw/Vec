---
phase: 03-memory-system
plan: 02
type: execute
subsystem: memory
tags: [token-counting, anthropic-api, conversation-management, memory-bounds]

requires:
  - 02-01: ConversationStore for JSONL message persistence
  - 02-04: AnthropicClient for API integration

provides:
  - TokenCounter: Per-message token counting with caching
  - TokenAwareLoader: Budget-constrained message loading
  - Memory bounds: Hardcoded 100k token limit enforcement

affects:
  - 03-03: Thread memory integration will consume these APIs
  - 03-04: Summarization will trigger at 80% threshold

tech-stack:
  added:
    - "@anthropic-ai/sdk": "countTokens API for exact token counts"
  patterns:
    - "Cache-aside pattern": Per-message ID caching
    - "Offline fallback": char/4 estimate when API unavailable
    - "Newest-first loading": Prioritize recent context

key-files:
  created:
    - src/memory/TokenCounter.ts
    - src/memory/TokenAwareLoader.ts
    - tests/token-counter.test.ts
    - tests/token-loader.test.ts
  modified:
    - src/memory/index.ts

decisions:
  - id: token-limit-hardcoded
    choice: 100k token limit hardcoded (not configurable)
    rationale: User constraint - simpler, one less config to manage
  - id: buffer-tokens
    choice: 10k token buffer for system prompt and response
    rationale: Prevents context overflow, reserves space for profiles
  - id: cache-by-id
    choice: Cache tokens by message ID (not content hash)
    rationale: Messages are immutable in JSONL, ID is stable identifier
  - id: summarize-threshold
    choice: 80% of token limit triggers summarization
    rationale: Research-backed (03-RESEARCH.md), allows proactive background task

metrics:
  duration: 2.5min
  completed: 2026-02-07
---

# Phase 03 Plan 02: Token Counting and Aware Loading Summary

**One-liner:** Anthropic countTokens API wrapper with per-message caching and newest-first bounded message loading at hardcoded 100k token limit.

## What Was Built

### TokenCounter Class
- Wraps `client.messages.countTokens()` from Anthropic SDK
- Per-message caching by ID (Map<string, number>)
- System prompt caching by content hash (SHA-256)
- Offline fallback: char/4 estimate when API unavailable
- Exports TOKEN_LIMIT (100k) and BUFFER_TOKENS (10k) constants

**Key methods:**
- `countMessage(message)`: Count single message, cache by ID
- `countMessages(messages[])`: Sum counts for array (sequential)
- `countSystemPrompt(systemPrompt)`: Count system tokens, cache by hash
- `clearCache()`: Clear entire cache

### TokenAwareLoader Class
- Loads conversation history within token budget
- Newest-first iteration (most recent messages prioritized)
- Accounts for system prompt and reserved tokens
- Returns messages in chronological order (re-reversed)

**Key methods:**
- `loadWithinBudget(options?)`: Load messages within 90k budget (100k - 10k buffer)
  - Options: systemPrompt, reserveTokens
  - Returns: messages[], tokenCount, totalMessages, loadedMessages
- `shouldSummarize()`: Returns true if total > 80k tokens
- `getTokenStats()`: Returns totalTokens, messageCount, budgetUsed (%)

### Test Coverage
- 11 tests for TokenCounter (caching, fallback, API mocking)
- 12 tests for TokenAwareLoader (budget scenarios, ordering, stats)
- All tests pass with mocked Anthropic client

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 76ee194 | TokenCounter with caching and offline fallback |
| 2 | 08cee80 | TokenAwareLoader with bounded loading and stats |

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

**1. Token limit hardcoded at 100k**
- Per user constraint: simpler, one less config
- BUFFER_TOKENS = 10k reserves space for system prompt + response
- Effective budget: 90k tokens for conversation history

**2. Cache by message ID, not content**
- Messages in JSONL are immutable
- ID is stable identifier (never changes)
- Content hash would be redundant

**3. Summarization threshold at 80%**
- Research-backed (03-RESEARCH.md Pattern 4)
- Triggers at 80k tokens (80% of 100k limit)
- Allows proactive background task before hitting limit

**4. Offline fallback to char/4 estimate**
- Enables testing without API key
- Graceful degradation for development
- Production should always use real API (exact billing match)

## Integration Points

**Consumed by:**
- Plan 03-03: Thread memory will use TokenAwareLoader.loadWithinBudget()
- Plan 03-04: Summarization will check shouldSummarize() trigger

**Dependencies:**
- ConversationStore (02-01): Provides loadAll() for message history
- AnthropicClient (02-04): Client instance for countTokens API

**Exports:**
- `src/memory/index.ts` re-exports TokenCounter, TokenAwareLoader, constants

## Technical Highlights

**1. Cache-aside pattern**
```typescript
// Check cache first, populate on miss
if (this.cache.has(message.id)) {
  return this.cache.get(message.id)!;
}
const count = await this.client.messages.countTokens(...);
this.cache.set(message.id, count);
```

**2. Newest-first loading**
```typescript
// Iterate from end to start (newest first)
for (let i = allMessages.length - 1; i >= 0; i--) {
  if (tokenCount + msgTokens > budget) break;
  messages.unshift(msg); // Maintain chronological order
}
```

**3. Budget accounting**
```typescript
let budget = TOKEN_LIMIT - BUFFER_TOKENS;  // 90k
if (systemPrompt) budget -= systemTokens;
if (reserveTokens) budget -= reserveTokens;
// Load until budget exhausted
```

## Next Phase Readiness

**Ready for 03-03 (Thread Memory):**
- TokenAwareLoader.loadWithinBudget() API stable
- Token counting accurate (Anthropic official API)
- Caching prevents redundant API calls

**Ready for 03-04 (Summarization):**
- shouldSummarize() threshold detection works
- getTokenStats() provides usage metrics
- 80% threshold aligns with research

**No blockers.**

## Self-Check: PASSED

Created files verified:
- src/memory/TokenCounter.ts exists
- src/memory/TokenAwareLoader.ts exists
- tests/token-counter.test.ts exists
- tests/token-loader.test.ts exists

Commits verified:
- 76ee194 exists (TokenCounter)
- 08cee80 exists (TokenAwareLoader)

All claims validated.
