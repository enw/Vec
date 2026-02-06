# Architecture Research

**Domain:** AI Personal Assistant Systems
**Researched:** 2026-02-05
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    EXPERIENCE LAYER                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │   CLI    │  │   TUI    │  │ Slack    │  │ Discord  │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
│       │             │             │             │           │
├───────┴─────────────┴─────────────┴─────────────┴───────────┤
│                  ORCHESTRATION LAYER                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Conversation Manager (state, routing, context)     │    │
│  └─────┬───────────────────────┬───────────────────────┘    │
│        │                       │                            │
│  ┌─────▼─────┐           ┌────▼─────────┐                  │
│  │  Model    │           │   Agent      │                  │
│  │  Router   │           │   Skills     │                  │
│  └─────┬─────┘           └────┬─────────┘                  │
├────────┴──────────────────────┴────────────────────────────┤
│                     CAPABILITY LAYER                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │  Tools  │  │  Memory │  │   RAG   │  │Security │        │
│  │  (MCP)  │  │ (Vector)│  │         │  │Guardrails│       │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘        │
├───────┴────────────┴────────────┴────────────┴──────────────┤
│                    PERSISTENCE LAYER                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │  Files   │  │  Vector  │  │   Git    │                   │
│  │  (Disk)  │  │   DB     │  │ (Version)│                   │
│  └──────────┘  └──────────┘  └──────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Experience Layer** | User interaction surface | CLI (inquirer), TUI (blessed/ink), Platform adapters (Slack SDK, Discord.js) |
| **Conversation Manager** | State management, thread tracking, context assembly | State machine (LangGraph-style), TypedDict state, checkpoint persistence |
| **Model Router** | LLM selection based on task complexity | Rule-based routing: simple queries → fast/cheap models, complex reasoning → powerful models |
| **Agent Skills** | Modular, reusable capabilities | SKILL.md packages, progressive disclosure, on-demand loading |
| **Tools (MCP)** | External system integration | Model Context Protocol servers, standardized tool definitions with JSON schemas |
| **Memory (Vector)** | Semantic search, context retrieval | Vector DB (Qdrant, Pinecone, or file-based embeddings), dual-layer: working + persistent |
| **RAG** | Knowledge grounding | Document chunking, embedding generation, similarity search |
| **Security/Guardrails** | Permission enforcement, validation | Role-based access control (RBAC), JIT provisioning, input/output filtering |
| **Persistence** | Durable storage | Files (markdown profiles, conversation logs), Vector DB, Git (versioning, audit trail) |

## Recommended Project Structure

```
src/
├── core/                  # Core orchestration
│   ├── conversation/      # Conversation state management
│   │   ├── manager.ts     # Conversation lifecycle
│   │   ├── state.ts       # State definitions (TypedDict-style)
│   │   └── checkpoint.ts  # State persistence
│   ├── routing/           # Model/agent routing logic
│   │   ├── router.ts      # Routing decisions
│   │   └── strategies.ts  # Routing strategies (cost, performance)
│   └── orchestrator.ts    # Main orchestration loop
├── agents/                # Agent skills and capabilities
│   ├── skills/            # Skill definitions (SKILL.md readers)
│   ├── registry.ts        # Skill loading and discovery
│   └── executor.ts        # Skill execution
├── memory/                # Memory subsystem
│   ├── working.ts         # Short-term/session memory
│   ├── persistent.ts      # Long-term memory (vector-backed)
│   ├── vector/            # Vector DB implementation
│   └── embeddings.ts      # Embedding generation
├── tools/                 # MCP tools and integrations
│   ├── mcp/               # MCP server implementations
│   │   ├── filesystem.ts  # File operations
│   │   ├── git.ts         # Git operations
│   │   └── web.ts         # Web access
│   ├── registry.ts        # Tool discovery and loading
│   └── executor.ts        # Tool invocation with validation
├── security/              # Security and guardrails
│   ├── permissions.ts     # Permission checking
│   ├── guardrails.ts      # Input/output filtering
│   └── audit.ts           # Audit logging
├── interfaces/            # User-facing interfaces
│   ├── cli/               # CLI implementation
│   ├── tui/               # TUI implementation
│   └── platforms/         # Platform bridges (Slack, Discord)
│       ├── slack/
│       └── discord/
├── storage/               # Persistence layer
│   ├── files.ts           # File-based storage
│   ├── profiles.ts        # Profile management (SOUL, USER, etc.)
│   └── versioning.ts      # Git integration
└── models/                # LLM client abstractions
    ├── client.ts          # Unified LLM client
    ├── providers/         # Provider-specific implementations
    └── streaming.ts       # Streaming response handling
```

### Structure Rationale

- **core/:** Central nervous system. State management, routing, orchestration. All requests flow through here.
- **agents/:** Skills are first-class citizens. Modular, discoverable, versioned independently.
- **memory/:** Explicit separation of working (session) vs persistent (long-term) memory. Vector operations isolated.
- **tools/:** MCP standard provides natural boundary. Tools are discoverable, validated, permission-checked.
- **security/:** Security is not an afterthought. Explicit layer for permissions, guardrails, audit.
- **interfaces/:** Experience layer is swappable. Core logic independent of interface.
- **storage/:** Local-first. Files are primary storage, git provides versioning, vector DB is secondary index.
- **models/:** Abstract LLM providers. Enables dynamic model switching without core changes.

## Architectural Patterns

### Pattern 1: Layered State Management (LangGraph-style)

**What:** TypedDict-based state that flows through processing graph. Nodes return partial updates, orchestrator merges.

**When to use:** Multi-step agent workflows, persistent conversation state, checkpoint/resume scenarios.

**Trade-offs:**
- ✅ Deterministic state transitions, easy debugging, checkpoint-friendly
- ❌ More verbose than stateless, requires state schema discipline

**Example:**
```typescript
// State definition
interface ConversationState {
  messages: Message[];
  context: Record<string, unknown>;
  toolOutputs: ToolOutput[];
  currentModel: string;
  threadId: string;
}

// Node returns partial update
async function processUserInput(state: ConversationState): Promise<Partial<ConversationState>> {
  const newMessage = await parseInput(state.messages[state.messages.length - 1]);
  return {
    messages: [...state.messages, newMessage],
    context: { ...state.context, lastProcessed: Date.now() }
  };
}

// Orchestrator merges
const nextState = { ...currentState, ...await processUserInput(currentState) };
```

### Pattern 2: Model Routing by Task Complexity

**What:** Route requests to different models based on complexity analysis. Simple → fast/cheap, complex → powerful/expensive.

**When to use:** Cost-sensitive deployments, multi-model access, varying task complexity.

**Trade-offs:**
- ✅ 60-70% cost reduction, faster responses for simple tasks
- ❌ Requires complexity heuristics, risk of mis-routing

**Example:**
```typescript
interface RouteStrategy {
  analyze(input: string, context: ConversationState): TaskComplexity;
  selectModel(complexity: TaskComplexity): ModelConfig;
}

class ComplexityRouter implements RouteStrategy {
  analyze(input: string, context: ConversationState): TaskComplexity {
    const hasMultipleSteps = /then|after|also|next/.test(input);
    const hasTools = context.availableTools.some(t => input.includes(t.name));
    const requiresReasoning = input.length > 200 || hasMultipleSteps;

    if (hasTools && requiresReasoning) return 'HIGH';
    if (hasTools || requiresReasoning) return 'MEDIUM';
    return 'LOW';
  }

  selectModel(complexity: TaskComplexity): ModelConfig {
    switch (complexity) {
      case 'LOW': return { provider: 'anthropic', model: 'claude-haiku-4' };
      case 'MEDIUM': return { provider: 'anthropic', model: 'claude-sonnet-4.5' };
      case 'HIGH': return { provider: 'anthropic', model: 'claude-opus-4.6' };
    }
  }
}
```

### Pattern 3: Progressive Skill Disclosure

**What:** Skills structured as SKILL.md with metadata, full instructions, supporting resources. Load progressively based on relevance.

**When to use:** Large skill catalogs, context window optimization, dynamic capability loading.

**Trade-offs:**
- ✅ Reduced token usage, faster initial load, modular skill management
- ❌ Requires skill authoring discipline, metadata must be accurate

**Example:**
```typescript
interface Skill {
  metadata: {
    name: string;
    description: string;
    tags: string[];
    version: string;
  };
  instructions: string;  // Full SKILL.md content
  resources: Record<string, string>;  // Supporting files
}

class SkillRegistry {
  private loaded = new Map<string, Skill>();

  async discover(): Promise<SkillMetadata[]> {
    // Load only metadata for all skills
    return this.scanSkillDirectory().map(path => this.parseMetadata(path));
  }

  async loadFull(skillName: string): Promise<Skill> {
    if (this.loaded.has(skillName)) return this.loaded.get(skillName)!;

    const skill = await this.parseFullSkill(skillName);
    this.loaded.set(skillName, skill);
    return skill;
  }

  selectRelevant(query: string, available: SkillMetadata[]): string[] {
    // Semantic similarity between query and skill descriptions
    return available
      .filter(s => this.similarity(query, s.description) > 0.7)
      .map(s => s.name);
  }
}
```

### Pattern 4: Dual-Layer Memory Architecture

**What:** Working memory (session-scoped, in-memory) + Persistent memory (cross-session, vector-backed).

**When to use:** All conversational agents requiring context retention.

**Trade-offs:**
- ✅ Clear separation of concerns, efficient session performance, cross-session continuity
- ❌ Requires synchronization logic, vector DB adds complexity

**Example:**
```typescript
interface MemorySystem {
  working: WorkingMemory;
  persistent: PersistentMemory;
}

class WorkingMemory {
  private state: Map<string, unknown> = new Map();

  set(key: string, value: unknown): void {
    this.state.set(key, value);
  }

  get(key: string): unknown {
    return this.state.get(key);
  }

  // Cleared at session end
  clear(): void {
    this.state.clear();
  }
}

class PersistentMemory {
  constructor(private vectorDB: VectorStore) {}

  async store(content: string, metadata: Record<string, unknown>): Promise<void> {
    const embedding = await this.embed(content);
    await this.vectorDB.insert({ embedding, content, metadata });
  }

  async recall(query: string, limit = 5): Promise<Memory[]> {
    const queryEmbedding = await this.embed(query);
    return this.vectorDB.search(queryEmbedding, limit);
  }

  // Persists across sessions
}
```

### Pattern 5: MCP-Based Tool Integration

**What:** Tools exposed via Model Context Protocol. Standardized discovery, invocation, validation.

**When to use:** External system integration, tool discoverability, cross-agent tool sharing.

**Trade-offs:**
- ✅ Standardized interface, portable across agents, built-in validation
- ❌ Additional layer of abstraction, MCP server management

**Example:**
```typescript
interface MCPTool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  outputSchema: JSONSchema;
}

class MCPToolExecutor {
  constructor(private servers: MCPServer[]) {}

  async discoverTools(): Promise<MCPTool[]> {
    const toolLists = await Promise.all(
      this.servers.map(s => s.listTools())
    );
    return toolLists.flat();
  }

  async executeTool(
    toolName: string,
    args: Record<string, unknown>,
    permissions: Permissions
  ): Promise<unknown> {
    // 1. Find tool definition
    const tool = await this.findTool(toolName);

    // 2. Validate input
    this.validateInput(args, tool.inputSchema);

    // 3. Check permissions
    if (!permissions.canExecute(toolName)) {
      throw new PermissionError(`Not authorized to execute ${toolName}`);
    }

    // 4. Execute via MCP server
    const server = this.findServerForTool(toolName);
    const result = await server.call(toolName, args);

    // 5. Validate output
    this.validateOutput(result, tool.outputSchema);

    return result;
  }
}
```

## Data Flow

### Request Flow

```
[User Input]
    ↓
[Interface Layer] → parse → [Conversation Manager]
    ↓
[State Checkpoint Load] ← (restore previous state if continuing)
    ↓
[Model Router] → analyze complexity → select model
    ↓
[Skill Registry] → match relevant skills → load instructions
    ↓
[Memory Recall] → query persistent memory → inject context
    ↓
[LLM Request] → streaming response → [Tool Invocations]
    ↓                                       ↓
[Response] ←─────────────────────── [MCP Tool Executor]
    ↓                                       ↓
[State Update] ← merge partial state ← [Guardrails/Validation]
    ↓
[State Checkpoint Save]
    ↓
[Memory Store] → embed new context → persist to vector DB
    ↓
[Interface Layer] → format → [User Output]
```

### State Management Flow

```
[State Store] (TypedDict-based)
    ↓ (read current state)
[Processing Nodes] → [Partial State Updates]
    ↓ (merge)
[Updated State] → [Checkpoint to Disk]
    ↓ (continue)
[Next Node] ← [Load State]
```

### Key Data Flows

1. **Conversation Thread:** User input → State load → Process → State save → Response. State includes message history, context, tool outputs, model selection.

2. **Memory Augmentation:** User query → Recall from vector DB → Inject into LLM context → Generate response → Store new context back to vector DB.

3. **Tool Execution:** LLM generates tool call → MCP registry lookup → Permission check → Execute via MCP server → Validate result → Return to LLM.

4. **Skill Loading:** Query analysis → Skill metadata matching → Progressive load full skill → Inject instructions into system prompt → Execute with skill context.

5. **Multi-Platform Routing:** Platform event (Slack message, Discord command) → Platform adapter → Normalize to internal format → Route to core conversation manager → Process → Format for platform → Send via platform adapter.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| **Single user (v0)** | In-process everything. File-based storage. No vector DB needed initially (linear search over markdown files). Single model, no routing. |
| **Multi-user local (v1)** | Workspace isolation per user. Vector DB for efficient memory recall. Model routing to optimize costs. Skill registry with lazy loading. |
| **Multi-platform (v1+)** | Platform adapters as separate processes. Message queue between adapters and core (Redis, RabbitMQ). Horizontal scaling of conversation managers. Shared vector DB across users. |
| **High concurrency** | Stateless conversation managers (state in external store). Caching layer for frequently accessed skills/profiles. LLM request batching/pooling. Rate limiting per user. |

### Scaling Priorities

1. **First bottleneck: Memory recall latency**
   - **Symptom:** Slow responses as conversation history grows
   - **Fix:** Introduce vector DB for semantic search. Limit working memory size (e.g., last 20 messages). Use memory summarization.

2. **Second bottleneck: LLM costs**
   - **Symptom:** High bills with heavy usage
   - **Fix:** Implement model routing. Cache common responses. Use streaming to feel faster without being faster.

3. **Third bottleneck: Concurrent users**
   - **Symptom:** Single-threaded conversation manager blocks
   - **Fix:** Multi-process architecture. State externalized to database. Message queue for platform events.

## Anti-Patterns

### Anti-Pattern 1: Monolithic Context Window Stuffing

**What people do:** Load entire conversation history, all skills, all memories into every LLM request.

**Why it's wrong:**
- Wastes tokens (directly costs money)
- Slower responses (more tokens to process)
- Hits context limits quickly
- Dilutes relevance (signal-to-noise ratio drops)

**Do this instead:**
- Progressive skill disclosure (load metadata first, full instructions only when relevant)
- Memory recall via vector search (top-k most relevant memories)
- Conversation summarization (compress old messages)
- Context budgeting (allocate token budget across context types)

### Anti-Pattern 2: Over-Privileged Tool Access

**What people do:** Give agent "admin" or "full access" permissions to all tools. Or use single service account for all agent operations.

**Why it's wrong:**
- Security nightmare (agent can delete databases, expose secrets)
- No audit trail (can't trace who requested what)
- Violates principle of least privilege
- AI agent privilege escalation is now a documented attack vector

**Do this instead:**
- Role-based access control (RBAC) per user
- Just-in-time (JIT) permission provisioning (grant only for specific task duration)
- Tool-level permission checks (each tool verifies permissions before execution)
- Audit logging (track all tool invocations with user context)

### Anti-Pattern 3: Stateless Conversation Handling

**What people do:** Treat each user message as independent. No state persistence. Rely entirely on LLM to "remember" via context window.

**Why it's wrong:**
- Can't resume conversations after restart
- Loses context when context window rotates
- No learning across sessions
- Can't track multi-step tasks

**Do this instead:**
- Checkpoint state to disk after each turn
- Use persistent memory (vector DB) for cross-session recall
- Track conversation threads explicitly
- Maintain working memory separate from LLM context

### Anti-Pattern 4: Single Model for All Tasks

**What people do:** Use most powerful model (e.g., GPT-4, Claude Opus) for everything, or use cheapest model for everything.

**Why it's wrong:**
- Most powerful: Wastes money on simple tasks (60-70% unnecessary cost)
- Cheapest: Poor quality on complex tasks (user frustration, task failure)
- One-size-fits-all ignores task diversity

**Do this instead:**
- Implement model routing based on task complexity
- Simple queries → fast, cheap models (Haiku, GPT-3.5)
- Complex reasoning → powerful models (Opus, GPT-4)
- Use heuristics: message length, tool requirements, conversation depth

### Anti-Pattern 5: Filesystem as Vector Database

**What people do:** Store embeddings as JSON files, do linear search over all embeddings for every recall.

**Why it's wrong:**
- O(n) search doesn't scale (slow with >1000 memories)
- No indexing (can't optimize search)
- Memory-intensive (load all embeddings into RAM)
- Re-embedding on every search (if not cached)

**Do this instead:**
- Use actual vector database (Qdrant, Pinecone, Weaviate, or even SQLite with vector extension)
- HNSW or IVF indexing for sub-linear search
- For small-scale (<10k vectors), file-based with cached embeddings + approximate search acceptable
- Start simple, migrate to vector DB when latency becomes noticeable

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **LLM Providers** | HTTP API (OpenAI, Anthropic, etc.) | Use unified client abstraction. Support streaming. Handle rate limits, retries. |
| **Vector DB** | Client library (Qdrant, Pinecone) | Connection pooling. Batch inserts for performance. Lazy initialization (defer until first use). |
| **Messaging Platforms** | Webhook + SDK (Slack, Discord) | Platform adapter pattern. Event normalization. Async processing (message queue). |
| **File System** | Node fs with async/await | Use workspace directories for isolation. Git for versioning. Watch for profile changes. |
| **Git** | CLI via child_process or isomorphic-git | Automatic commits for audit trail. Branch per user/session if multi-tenancy. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| **Interface ↔ Core** | Function calls (in-process) | Interface normalizes platform-specific events to internal format. Returns formatted responses. |
| **Core ↔ Memory** | Async function calls | Memory system is swappable. Interface: `store(content, metadata)`, `recall(query, limit)`. |
| **Core ↔ Tools** | MCP protocol (local or remote) | Tools can run in-process or as separate servers. MCP provides uniform interface. |
| **Core ↔ Models** | HTTP (streaming) | Model client handles provider differences. Returns async iterator for streaming. |
| **Platform Adapter ↔ Core** | Message queue (optional) | For multi-platform deployments. Enables horizontal scaling. In-process for single-user. |

## Sources

**AI Architecture Patterns:**
- [Choose a design pattern for your agentic AI system - Google Cloud](https://docs.cloud.google.com/architecture/choose-design-pattern-agentic-ai-system)
- [AI System Design Patterns for 2026](https://zenvanriel.nl/ai-engineer-blog/ai-system-design-patterns-2026/)
- [Agentic AI Design Patterns (2026 Edition)](https://medium.com/@dewasheesh.rana/agentic-ai-design-patterns-2026-ed-e3a5125162c5)
- [The 2026 Guide to AI Agent Architecture Components](https://procreator.design/blog/guide-to-ai-agent-architecture-components/)

**Conversational AI Systems:**
- [How to Build a Conversational AI Multi-Agent Bot](https://www.solulab.com/build-a-conversational-ai-multi-agent-bot/)
- [A Complete Guide to AI Agent Architecture in 2026 - Lindy](https://www.lindy.ai/blog/ai-agent-architecture)
- [Building AI Agents in 2026: Chatbots to Agentic Architectures](https://levelup.gitconnected.com/the-2026-roadmap-to-ai-agent-mastery-5e43756c0f26)

**State Management & Memory:**
- [The Architecture of Agent Memory: How LangGraph Really Works](https://dev.to/sreeni5018/the-architecture-of-agent-memory-how-langgraph-really-works-59ne)
- [Memory overview - LangChain Docs](https://docs.langchain.com/oss/python/langgraph/memory)
- [LangGraph Explained (2026 Edition)](https://medium.com/@dewasheesh.rana/langgraph-explained-2026-edition-ea8f725abff3)
- [Beyond Vector Databases: Architectures for True Long-Term AI Memory](https://vardhmanandroid2015.medium.com/beyond-vector-databases-architectures-for-true-long-term-ai-memory-0d4629d1a006)

**Agent Skills:**
- [Introducing HashiCorp Agent Skills](https://www.hashicorp.com/en/blog/introducing-hashicorp-agent-skills)
- [awesome-agent-skills - GitHub](https://github.com/skillmatic-ai/awesome-agent-skills)
- [Spring AI Agentic Patterns: Agent Skills](https://spring.io/blog/2026/01/13/spring-ai-generic-agent-skills/)
- [500 Lines vs. 50 Modules: What NanoClaw Gets Right](https://fumics.in/posts/2026-02-02-nanoclaw-agent-architecture)

**Model Context Protocol:**
- [Model Context Protocol Specification](https://modelcontextprotocol.io/specification/2025-11-25)
- [What is Model Context Protocol (MCP)](https://onereach.ai/blog/what-to-know-about-model-context-protocol/)
- [MCP Apps - Bringing UI Capabilities To MCP](http://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/)

**TypeScript Frameworks:**
- [Top 5 TypeScript AI Agent Frameworks (2026)](https://techwithibrahim.medium.com/top-5-typescript-ai-agent-frameworks-you-should-know-in-2026-5a2a0710f4a0)
- [Mastra - TypeScript AI Framework](https://mastra.ai/)
- [Introducing Agent Development Kit for TypeScript - Google](https://developers.googleblog.com/introducing-agent-development-kit-for-typescript-build-ai-agents-with-the-power-of-a-code-first-approach/)
- [OpenAI Agents SDK TypeScript](https://openai.github.io/openai-agents-js/)

**Security & Permissions:**
- [Access Control and Permission Management for AI Agents - Cerbos](https://www.cerbos.dev/blog/permission-management-for-ai-agents)
- [AI Agents Are Becoming Authorization Bypass Paths](https://thehackernews.com/2026/01/ai-agents-are-becoming-privilege.html)
- [What is Agentic AI Security? (2026)](https://www.strata.io/blog/agentic-identity/8-strategies-for-ai-agent-security-in-2025/)
- [Security for Production AI Agents in 2026](https://iain.so/security-for-production-ai-agents-in-2026)

**Platform Integration:**
- [Chatbot Architecture Best Practices (2026)](https://research.aimultiple.com/chatbot-architecture/)
- [24 Chatbot Best Practices (2026)](https://botpress.com/blog/chatbot-best-practices)

---
*Architecture research for: Vec - AI Personal Assistant*
*Researched: 2026-02-05*
