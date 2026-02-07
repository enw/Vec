# Phase 3: Memory System - Research

**Researched:** 2026-02-07
**Domain:** Conversation memory management, profile persistence, token-based context management
**Confidence:** HIGH

## Summary

Phase 3 implements persistent memory across sessions through profile files (SOUL.md, USER.md, IDENTITY.md, AGENTS.md, HEARTBEAT.md) and token-based conversation history management. The system is stateless per-invocation — each vec run reads from disk, operates, writes back. No long-running process exists to crash.

Key architectural constraints from user decisions: profiles use hybrid scope (USER.md/IDENTITY.md global, others per-workspace), token limits are hardcoded (~100k), summarization happens proactively as background task, and atomic writes + lockfiles ensure data integrity during concurrent access.

Standard stack centers on native Node.js file operations with proven libraries for atomic writes (write-file-atomic) and file locking (proper-lockfile). Token counting uses Anthropic's official countTokens API. Background summarization can use BullMQ+Redis for production-grade queue management or simple worker threads for lighter workloads.

**Primary recommendation:** Use write-file-atomic + proper-lockfile pattern with YAML frontmatter profiles. Implement token counting before every LLM call. Start with simple worker threads for summarization, migrate to BullMQ if scaling requires it.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Profile Structure & Lifecycle:**
- Create all profiles on first app launch from template .md files (show minimalist defaults with structure)
- Template files stored as .md files in repo (not embedded in code) for easy editing without recompiling
- Profiles live in workspace root (e.g., `~/.local/share/vec/workspaces/foo/SOUL.md` alongside `conversations.jsonl`)
- Hybrid profile scope:
  - **Global** (shared across all workspaces): `USER.md`, `IDENTITY.md`
  - **Per-workspace**: `SOUL.md`, `AGENTS.md`, `HEARTBEAT.md`
- Profile schemas must be versioned (include version field like `schema: v1`) for migration support across vec versions

**Thread Memory Boundaries:**
- Memory limited by **token count** (e.g., max 100k tokens) — efficient use of context window
- When limit reached: **summarize old message blocks** (replace old messages with summaries to preserve context)
- Token limit is **hardcoded** (not user-configurable) — simpler, one less config to manage
- Summarization happens **proactively as background task** when approaching limit — no latency during conversation

**Profile Content & Usage:**
- **SOUL.md**: Personality traits & communication style (how assistant talks, responds, behaves for this workspace)
- **USER.md**: Both technical preferences (languages, tools, patterns) AND work style (communication prefs, explanation depth)
- **HEARTBEAT.md**: Single current task agent is working on right now — ephemeral status for long-running tasks (NOT a log/journal)
- **HEARTBEAT.md updates**: At start/end of task + periodic check-ins during long tasks

**Architecture & Persistence:**
- **Core principle**: System is stateless per-invocation — no long-running process, each vec run reads from disk, operates, writes back
- **Concurrency**: Lockfile prevents concurrent access to same workspace (only one vec process per workspace at a time)
- **Abnormal termination**: Recovery validation on startup (verify profiles/state files valid, repair/recreate if corrupted)
- **Atomic writes**: Write to temp file, then atomic rename to actual file (standard safe pattern)

### Claude's Discretion

- Profile update mechanism (explicit commands vs assistant proposes/user approves)
- Profile file format (pure Markdown vs YAML frontmatter + Markdown)
- When to write profiles to disk (after every change, per conversation turn, or graceful shutdown)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

## Standard Stack

The established libraries/tools for memory system implementation:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| write-file-atomic | ^6.0.0 | Atomic file writes | npm's own tool, battle-tested, serializes concurrent writes automatically |
| proper-lockfile | ^4.1.2 | File-based locking | Works on network filesystems, uses mkdir (atomic), handles stale locks |
| @anthropic-ai/sdk | ^0.73.0 | Token counting API | Official SDK, countTokens() matches billing exactly |
| gray-matter | ^4.0.3 | YAML frontmatter parsing | De facto standard for Markdown+metadata, 4M+ weekly downloads |
| zod | ^4.3.6 | Schema validation | Already in project for config validation, versioned schema support |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| BullMQ | ^6.5.0 | Background job queue | Production: Redis-backed, persistent, retry logic, monitoring |
| Worker Threads | (Node.js native) | Background processing | Development/simple: No external deps, simpler setup |
| jsonrepair | ^3.13.2 | Corrupt JSON recovery | Validation failures on startup, repair malformed profile files |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| proper-lockfile | lockfile (npm) | lockfile deprecated, uses O_EXCL (fails on network FS) |
| BullMQ | Worker Threads only | Worker Threads simpler but no persistence across restarts |
| gray-matter | Parse manually | Reinventing wheel, no schema migration support |

**Installation:**
```bash
pnpm add write-file-atomic proper-lockfile gray-matter jsonrepair
# For production background processing:
pnpm add bullmq ioredis
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── memory/
│   ├── ProfileManager.ts      # Load/save profiles with locking
│   ├── TokenCounter.ts         # Wrapper around Anthropic countTokens
│   ├── MessageSummarizer.ts    # Background summarization logic
│   ├── profiles/               # Profile schemas & validation
│   │   ├── schemas.ts          # Zod schemas for each profile type
│   │   └── templates/          # Default .md templates
│   └── recovery.ts             # Corruption detection & repair
└── workspace/
    ├── WorkspaceManager.ts     # (existing) extend for profiles
    └── ConversationStore.ts    # (existing) extend for token tracking
```

### Pattern 1: Atomic Profile Updates with Locking
**What:** Acquire workspace lock, read profile, modify, write atomically, release lock
**When to use:** All profile read/write operations
**Example:**
```typescript
// Source: proper-lockfile + write-file-atomic patterns
import lock from 'proper-lockfile';
import writeFileAtomic from 'write-file-atomic';
import { readFile } from 'node:fs/promises';

async function updateProfile(workspacePath: string, updates: Partial<Profile>) {
  const lockPath = join(workspacePath, '.lock');

  // Acquire lock (throws if stale after 10s)
  const release = await lock.lock(workspacePath, {
    stale: 10000,        // 10s stale threshold
    update: 2000,        // Update mtime every 2s
    retries: {
      retries: 5,
      minTimeout: 100
    }
  });

  try {
    // Read current profile
    const profilePath = join(workspacePath, 'SOUL.md');
    const content = await readFile(profilePath, 'utf-8');
    const profile = parseProfile(content);

    // Modify
    const updated = { ...profile, ...updates };

    // Write atomically (temp file + rename)
    await writeFileAtomic(profilePath, serializeProfile(updated), 'utf-8');
  } finally {
    await release();
  }
}
```

### Pattern 2: Token-Aware Message Loading
**What:** Load conversation history but stop when approaching token limit
**When to use:** Every LLM call preparation
**Example:**
```typescript
// Source: Anthropic token counting API + sliding window pattern
import Anthropic from '@anthropic-ai/sdk';

const TOKEN_LIMIT = 100_000;
const BUFFER_TOKENS = 10_000; // Reserve for system prompt, profiles, response

async function loadConversationWithinLimit(
  store: ConversationStore,
  client: Anthropic,
  model: string
): Promise<Message[]> {
  const allMessages = await store.loadAll();
  const messages: Message[] = [];
  let tokenCount = 0;

  // Load from newest to oldest until limit
  for (let i = allMessages.length - 1; i >= 0; i--) {
    const msg = allMessages[i];

    // Count tokens for this message
    const { input_tokens } = await client.messages.countTokens({
      model,
      messages: [{ role: msg.role, content: msg.content }]
    });

    if (tokenCount + input_tokens > TOKEN_LIMIT - BUFFER_TOKENS) {
      break; // Hit limit
    }

    messages.unshift(msg);
    tokenCount += input_tokens;
  }

  return messages;
}
```

### Pattern 3: Profile Schema Versioning
**What:** YAML frontmatter with version field for migration support
**When to use:** All profile files
**Example:**
```typescript
// Source: Schema migration best practices + gray-matter
import matter from 'gray-matter';
import { z } from 'zod';

const SoulProfileSchemaV1 = z.object({
  schema: z.literal('v1'),
  personality: z.string(),
  communication_style: z.string(),
  behavior_traits: z.array(z.string())
});

function parseProfile(content: string): SoulProfile {
  const { data, content: body } = matter(content);
  const validated = SoulProfileSchemaV1.parse(data);

  // Future: if (validated.schema === 'v0') migrate to v1

  return { ...validated, content: body };
}

function serializeProfile(profile: SoulProfile): string {
  const { content, ...frontmatter } = profile;
  return matter.stringify(content, frontmatter);
}
```

**Example SOUL.md template:**
```markdown
---
schema: v1
personality: Professional and concise
communication_style: Direct, minimal fluff
behavior_traits:
  - Action-focused
  - Security-conscious
  - Asks before major changes
---

# Assistant Personality

This workspace's assistant is {personality} with {communication_style} communication.

## Key Behaviors
{behavior_traits as bullet list}
```

### Pattern 4: Background Summarization Queue
**What:** Proactive summarization when approaching token limit
**When to use:** After each conversation turn, check if >80% of limit
**Example:**
```typescript
// Source: BullMQ patterns for background tasks
import { Queue, Worker } from 'bullmq';

const summarizeQueue = new Queue('summarize', {
  connection: { host: 'localhost', port: 6379 }
});

// After each turn, check token count
async function checkAndQueueSummarization(
  workspaceName: string,
  currentTokens: number
) {
  const threshold = TOKEN_LIMIT * 0.8; // 80k tokens

  if (currentTokens > threshold) {
    await summarizeQueue.add('summarize-conversation', {
      workspace: workspaceName,
      currentTokens
    });
  }
}

// Separate worker process (or Worker Thread)
const worker = new Worker('summarize', async job => {
  const { workspace, currentTokens } = job.data;

  // Load old messages, summarize with LLM
  const summary = await summarizeOldMessages(workspace);

  // Replace old messages with summary in store
  await replaceWithSummary(workspace, summary);
}, { connection: { host: 'localhost', port: 6379 } });
```

### Pattern 5: Corrupted File Recovery
**What:** Validate on startup, repair if possible, recreate if not
**When to use:** WorkspaceManager.load() before opening workspace
**Example:**
```typescript
// Source: jsonrepair + validation patterns
import { jsonrepair } from 'jsonrepair';

async function validateAndRepair(workspacePath: string) {
  const profiles = ['SOUL.md', 'AGENTS.md', 'HEARTBEAT.md'];

  for (const filename of profiles) {
    const path = join(workspacePath, filename);

    try {
      const content = await readFile(path, 'utf-8');
      const { data } = matter(content);

      // Validate schema
      const schema = getSchemaForProfile(filename);
      schema.parse(data); // Throws if invalid
    } catch (err) {
      console.warn(`Profile ${filename} corrupted, attempting repair...`);

      // Try repairing YAML
      try {
        const repaired = repairYAML(content);
        await writeFileAtomic(path, repaired, 'utf-8');
      } catch {
        // Can't repair, recreate from template
        console.warn(`Recreating ${filename} from template`);
        const template = await loadTemplate(filename);
        await writeFileAtomic(path, template, 'utf-8');
      }
    }
  }
}
```

### Anti-Patterns to Avoid
- **Reading entire conversation on every render:** Load once per turn, cache in memory during session
- **Blocking on summarization:** Queue it as background task, don't wait for completion
- **Writing profiles on every message:** Batch updates, write on turn completion or graceful shutdown
- **Ignoring lock stale threshold:** If lock > 10s old, workspace likely crashed, safe to break lock
- **Re-counting tokens for same content:** Cache token counts per message, invalidate on content change

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic file writes | fs.writeFile + try/catch | write-file-atomic | Handles partial writes, concurrent access, temp file cleanup, fsync |
| File locking | Custom PID files | proper-lockfile | Handles stale locks, network FS, race conditions, cleanup on crash |
| YAML frontmatter | Regex parsing | gray-matter | Handles edge cases (--- in content, nested objects), consistent formatting |
| Token counting | Estimate by chars/4 | Anthropic countTokens API | Exact count, handles multimodal (images, PDFs), matches billing |
| Summarization prompts | Ad-hoc "summarize this" | Recursive summarization pattern | Research-backed, preserves key context, handles multi-hop reasoning |
| Corrupt JSON repair | Manual string manipulation | jsonrepair | Handles quotes, brackets, commas, null bytes, 50+ edge cases |
| Background jobs | setTimeout loops | BullMQ (or Worker Threads) | Persistence, retries, monitoring, job prioritization |

**Key insight:** File operations are deceptively complex. Edge cases (partial writes, concurrent access, corruption, network filesystems) make "simple" solutions unreliable. Use battle-tested libraries.

## Common Pitfalls

### Pitfall 1: Token Count Estimate Inaccuracy
**What goes wrong:** Using char_count/4 approximation leads to 10-30% error, causing sudden context overflow or wasted capacity
**Why it happens:** Tokenization varies wildly by content type (code vs prose, technical terms, special characters)
**How to avoid:** Always use Anthropic's countTokens API before LLM calls. Cache results per message.
**Warning signs:** Context overflow errors, or consistently using <70% of context window

### Pitfall 2: Lockfile Stale Detection Failure
**What goes wrong:** Process crashes while holding lock, next process blocks forever waiting
**Why it happens:** Not setting stale threshold, or not updating mtime during long operations
**How to avoid:** Set stale: 10000 (10s), update: 2000 (2s). Break stale locks automatically.
**Warning signs:** User reports "workspace frozen" after crash, ps shows no vec process but lock exists

### Pitfall 3: Summarization Context Loss
**What goes wrong:** Simple "summarize everything" loses critical details, breaks multi-turn reasoning
**Why it happens:** Traditional summarization compresses lossy, doesn't preserve semantic relationships
**How to avoid:** Use recursive summarization (root LLM plans, worker LLMs process chunks), preserve recent messages verbatim
**Warning signs:** User says "you forgot what we discussed earlier" despite summarization running

### Pitfall 4: Profile Write Amplification
**What goes wrong:** Writing profiles on every message creates disk I/O bottleneck, wears SSD
**Why it happens:** Eager persistence to avoid data loss, not batching updates
**How to avoid:** Write profiles on turn completion (user → assistant → done), graceful shutdown, or explicit save command
**Warning signs:** High disk I/O during conversation, noticeable latency on fast responses

### Pitfall 5: JSONL Partial Line Corruption
**What goes wrong:** Process killed mid-write leaves partial JSON line, loadAll() fails on entire history
**Why it happens:** appendFile() not atomic, no line-by-line error handling
**How to avoid:** Wrap each JSON.parse() in try/catch, skip corrupted lines with warning. Use write-file-atomic for critical files.
**Warning signs:** "SyntaxError: Unexpected end of JSON input" breaks entire conversation history

### Pitfall 6: Global vs Per-Workspace Path Confusion
**What goes wrong:** Reading USER.md from workspace dir instead of global data dir, creating duplicate profiles
**Why it happens:** Not distinguishing global ($XDG_DATA_HOME/vec/) from workspace ($XDG_DATA_HOME/vec/workspaces/foo/)
**How to avoid:** Define clear path helpers: getGlobalProfilePath(name), getWorkspaceProfilePath(workspace, name)
**Warning signs:** User edits global profile but changes not reflected in workspace, or vice versa

### Pitfall 7: Schema Version Migration Without Fallback
**What goes wrong:** New vec version can't read old profile format, loses all user config
**Why it happens:** Breaking schema changes without migration code or default fallback
**How to avoid:** Always check schema version on load, migrate if old version, recreate from template if unrecognized
**Warning signs:** "Invalid profile schema" errors after vec upgrade, profiles reset to defaults

## Code Examples

Verified patterns from official sources:

### Token Counting for Message Array
```typescript
// Source: https://platform.claude.com/docs/en/api/typescript/messages/count_tokens
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const response = await client.messages.countTokens({
  model: 'claude-sonnet-4-5',
  system: 'You are a helpful assistant',
  messages: [
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hi! How can I help?' },
    { role: 'user', content: 'Tell me about TypeScript' }
  ]
});

console.log(response.input_tokens); // e.g., 42
```

### Proper-Lockfile with Retry
```typescript
// Source: https://github.com/moxystudio/node-proper-lockfile
import lock from 'proper-lockfile';

// Lock with automatic retry on EBUSY
const release = await lock.lock('/path/to/workspace', {
  stale: 10000,           // Consider lock stale after 10s
  update: 2000,           // Update mtime every 2s to prove alive
  retries: {
    retries: 5,           // Retry up to 5 times
    minTimeout: 100,      // Wait 100ms between retries
    maxTimeout: 1000      // Max 1s wait
  }
});

try {
  // ... do work with workspace ...
} finally {
  await release();
}

// Check if locked (non-blocking)
const isLocked = await lock.check('/path/to/workspace');
```

### Write-File-Atomic with Chown
```typescript
// Source: https://github.com/npm/write-file-atomic
import writeFileAtomic from 'write-file-atomic';

// Atomic write with ownership and mode
await writeFileAtomic('/path/to/profile.md', content, {
  mode: 0o600,           // rw------- (owner only)
  chown: {
    uid: process.getuid(),
    gid: process.getgid()
  },
  fsync: true            // Force sync to disk
});
```

### Gray-Matter Profile Parsing
```typescript
// Source: https://github.com/jonschlinkert/gray-matter
import matter from 'gray-matter';

const content = `---
schema: v1
personality: Professional
---

# Assistant Profile
This is the profile content.`;

const { data, content: body } = matter(content);
console.log(data.schema);      // 'v1'
console.log(data.personality); // 'Professional'
console.log(body);              // '# Assistant Profile\n...'

// Serialize back
const output = matter.stringify(body, data);
```

### JSONL Line-by-Line Error Recovery
```typescript
// Source: JSONL best practices + error handling
import { readFile } from 'node:fs/promises';

async function loadMessagesWithRecovery(path: string): Promise<Message[]> {
  const content = await readFile(path, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  const messages: Message[] = [];

  for (let i = 0; i < lines.length; i++) {
    try {
      const msg = JSON.parse(lines[i]) as Message;
      messages.push(msg);
    } catch (err) {
      console.warn(`Skipping corrupted line ${i + 1}: ${err.message}`);
      // Continue processing remaining lines
    }
  }

  return messages;
}
```

### BullMQ Background Queue Setup
```typescript
// Source: https://docs.bullmq.io + https://oneuptime.com/blog/post/2026-01-06-nodejs-job-queue-bullmq-redis/view
import { Queue, Worker } from 'bullmq';

const connection = { host: 'localhost', port: 6379 };

// Producer: add job to queue
const queue = new Queue('summarize', { connection });

await queue.add('summarize-messages', {
  workspace: 'workspace-1',
  messageCount: 150,
  tokenCount: 85000
}, {
  priority: 1,           // Higher priority for closer to limit
  attempts: 3,           // Retry up to 3 times
  backoff: {
    type: 'exponential',
    delay: 1000
  }
});

// Consumer: process jobs
const worker = new Worker('summarize', async job => {
  console.log(`Processing job ${job.id}:`, job.data);

  const summary = await summarizeWorkspace(job.data.workspace);
  return { summary, reducedTokens: 50000 };
}, {
  connection,
  concurrency: 2         // Process 2 jobs at once
});

worker.on('completed', job => {
  console.log(`Job ${job.id} completed:`, job.returnvalue);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});
```

### Worker Threads (Simpler Alternative)
```typescript
// Source: https://nodejs.org/api/worker_threads.html + patterns
import { Worker } from 'node:worker_threads';

function summarizeInBackground(workspace: string) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./summarize-worker.js', {
      workerData: { workspace }
    });

    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', code => {
      if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
    });
  });
}

// In summarize-worker.js:
// const { workerData, parentPort } = require('worker_threads');
// const result = await summarizeMessages(workerData.workspace);
// parentPort.postMessage(result);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Sliding window (drop old) | Recursive summarization | 2024 (research published) | Preserves context across long sessions, 3x cheaper |
| char_count / 4 estimation | Official countTokens API | Nov 2024 (Anthropic launched) | Exact billing match, handles multimodal |
| Bull (old) | BullMQ | 2025+ (v6 stable) | Redis Streams, 5x faster, better monitoring |
| lockfile (npm) | proper-lockfile | 2023+ (lockfile deprecated) | Works on network FS, handles stale locks |
| Manual YAML parsing | gray-matter | Long-standing standard | Edge case handling, formatting preservation |

**Deprecated/outdated:**
- **Bull (not BullMQ):** Use BullMQ for new projects, Bull no longer maintained
- **lockfile package:** Deprecated, uses O_EXCL (fails on network filesystems)
- **tiktoken for Claude:** OpenAI tokenizer, doesn't match Claude's. Use Anthropic's countTokens.
- **Simple context truncation:** Loses semantic relationships. Use recursive summarization.

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal summarization trigger threshold**
   - What we know: 80% of token limit is common practice, prevents emergency summarization
   - What's unclear: Does this vary by conversation style (long monologues vs rapid back-and-forth)?
   - Recommendation: Start with 80k tokens (80% of 100k), add telemetry to measure hit rate, adjust if frequent overruns

2. **Profile write timing**
   - What we know: User decisions allow discretion on when to write profiles
   - What's unclear: Does writing on every turn create noticeable latency? Is batching worth complexity?
   - Recommendation: Start with per-turn writes (simple), add performance monitoring, switch to batching only if >100ms latency observed

3. **BullMQ vs Worker Threads for summarization**
   - What we know: BullMQ requires Redis (external dep), Worker Threads simpler but no persistence
   - What's unclear: Does summarization need persistence? If vec crashes during summarization, safe to retry next run?
   - Recommendation: Start with Worker Threads (simpler), migrate to BullMQ if: (a) need to surveil status across restarts, or (b) scaling to multiple concurrent workspaces

4. **Global profile storage location**
   - What we know: XDG spec supports $XDG_DATA_HOME for user data, $XDG_CONFIG_HOME for config
   - What's unclear: Are USER.md/IDENTITY.md "data" or "config"? Impacts where they're stored.
   - Recommendation: Treat as data (mutable, generated), store in $XDG_DATA_HOME/vec/profiles/ for consistency with workspace data

5. **YAML vs pure Markdown for profiles**
   - What we know: User decisions give discretion on format
   - What's unclear: YAML frontmatter more structured but harder to hand-edit. Pure Markdown simpler but harder to parse reliably.
   - Recommendation: Use YAML frontmatter (gray-matter). Structured data wins for versioning/migration, and gray-matter makes it easy.

## Sources

### Primary (HIGH confidence)
- [Token counting - Claude API Docs](https://platform.claude.com/docs/en/build-with-claude/token-counting) - Official Anthropic documentation
- [Count tokens in a Message - Claude API Reference](https://platform.claude.com/docs/en/api/typescript/messages/count_tokens) - TypeScript SDK reference
- [@anthropic-ai/sdk - npm](https://www.npmjs.com/package/@anthropic-ai/sdk) - Official SDK package
- [proper-lockfile - npm](https://www.npmjs.com/package/proper-lockfile) - File locking library
- [write-file-atomic - npm](https://www.npmjs.com/package/write-file-atomic) - Atomic file writes
- [gray-matter - npm](https://www.npmjs.com/package/gray-matter) - YAML frontmatter parsing
- [BullMQ Documentation](https://docs.bullmq.io) - Background job queue

### Secondary (MEDIUM confidence)
- [LLM Chat History Summarization Guide October 2025](https://mem0.ai/blog/llm-chat-history-summarization-guide-2025) - Summarization strategies
- [Recursively Summarizing Enables Long-Term Dialogue Memory](https://arxiv.org/abs/2308.15022) - Research paper on recursive summarization
- [How to Build a Job Queue in Node.js with BullMQ and Redis](https://oneuptime.com/blog/post/2026-01-06-nodejs-job-queue-bullmq-redis/view) - BullMQ tutorial Jan 2026
- [Understanding Node.js file locking - LogRocket](https://blog.logrocket.com/understanding-node-js-file-locking/) - File locking overview
- [Backward Compatibility in Schema Evolution: Guide](https://www.dataexpert.io/blog/backward-compatibility-schema-evolution-guide) - Schema versioning patterns
- [XDG Base Directory - ArchWiki](https://wiki.archlinux.org/title/XDG_Base_Directory) - XDG spec details

### Tertiary (LOW confidence)
- [Context Window Management Strategies](https://apxml.com/courses/langchain-production-llm/chapter-3-advanced-memory-management/context-window-management) - General LLM memory patterns
- [Astro Content Collections: Complete 2026 Guide](https://inhaq.com/blog/getting-started-with-astro-content-collections.html) - YAML frontmatter schema validation with Zod
- [jsonrepair - npm](https://www.npmjs.com/package/jsonrepair) - JSON corruption repair

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official libraries with wide adoption (write-file-atomic 10M+ weekly, proper-lockfile 4M+, gray-matter 4M+)
- Architecture: HIGH - Patterns verified from official docs (Anthropic, BullMQ) and battle-tested libraries
- Pitfalls: MEDIUM - Derived from library docs and community experience, not all vec-specific testing
- Summarization approach: MEDIUM - Research-backed but implementation requires validation with real workloads

**Research date:** 2026-02-07
**Valid until:** ~30 days (Feb 2026) - Stack stable, but check for BullMQ/Anthropic SDK updates
