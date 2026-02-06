# Stack Research

**Domain:** AI Personal Assistant with Messaging Integration
**Researched:** 2026-02-05
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **TypeScript** | 5.x | Type-safe language | Industry standard for production AI apps; prevents runtime errors in agent logic; excellent IDE support |
| **pnpm** | 9.x | Package manager | Fastest install times; workspace support for monorepo; hard links save disk space; first-class TypeScript support |
| **Node.js** | 22.x LTS | Runtime | Required by messaging SDKs (Signal, WhatsApp, Delta Chat); ecosystem standard for TypeScript AI agents |
| **Vitest** | 2.x | Testing framework | 10-20x faster than Jest; native ESM/TypeScript; zero config; Vite-powered; modern standard for TS projects |

### AI Agent Framework

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Vercel AI SDK** | 6.x | LLM integration & streaming | Streaming-first architecture; 25+ model providers; minimal abstraction; edge-compatible; TypeScript-native; best DX for chat UIs |
| **Mastra** | Latest | Agent workflows & memory | Built by Gatsby team; integrated RAG + vector memory; TypeScript-first; observability built-in; "Python trains, TypeScript ships" philosophy matches Vec's production focus |

### Vector Storage & Memory

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Vectra** | Latest | Local vector database | File-based persistence; zero infrastructure; Pinecone-compatible filtering; sub-millisecond latency; perfect for local-first architecture |
| **LocalDocumentIndex** | (via Vectra) | Document chunking & retrieval | Handles chunking + embeddings automatically; hybrid BM25 + semantic search; language-agnostic index format |

### Messaging Platform SDKs

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **whatsapp-web.js** | 1.34.x | WhatsApp integration | Most mature WhatsApp SDK; TypeScript support (.d.ts included); Puppeteer-based (battle-tested); 123+ releases; active maintenance |
| **signal-sdk** | Latest | Signal integration | Comprehensive TypeScript SDK; JSON-RPC communication; signal-cli binaries included; bot framework built-in; enterprise-grade error handling |
| **deltachat-node** | 1.155.x | Delta Chat integration | Official Node.js bindings; TypeScript support; moved to core repo (deltachat-core-rust/node); email-based messaging |

### Monorepo & Build Tools

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Turborepo** | 2.x | Build orchestration | Fastest incremental builds; perfect pnpm integration; Vercel-backed; 10-minute setup; tactical quick wins for caching |
| **TypeScript Project References** | (built-in) | Incremental compilation | Handles monorepo type checking; guarantees performance for large codebases; native TS feature |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **Ink** | 5.x | CLI/TUI framework | For v0 CLI/TUI; React-like API; full TypeScript support; modern approach to terminal apps |
| **zod** | 3.x | Runtime validation | Validate at boundaries (user input, external APIs); schema-first TypeScript; required for LLM structured outputs |
| **tsx** | Latest | TypeScript execution | Fast TS/TSX execution in Node; replacement for ts-node; dev server for rapid iteration |
| **simple-git** | 3.x | Git operations | For workspace versioning; TypeScript-friendly; programmatic git commands |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| **ESLint** | Linting | Configure once, share across workspace; TypeScript parser included |
| **Prettier** | Code formatting | Enforces consistent style; integrates with ESLint |
| **Changesets** | Version management | Monorepo versioning; automates changelogs; integrates with pnpm workspaces |

## Installation

```bash
# Core
pnpm add @ai-sdk/openai ai
pnpm add @mastra/core
pnpm add vectra
pnpm add whatsapp-web.js signal-sdk deltachat-node
pnpm add zod simple-git

# Supporting
pnpm add ink react
pnpm add tsx

# Dev dependencies
pnpm add -D typescript vitest
pnpm add -D @types/node
pnpm add -D eslint prettier
pnpm add -D turbo
pnpm add -D @changesets/cli
```

## Alternatives Considered

| Category | Recommended | Alternative | When to Use Alternative |
|----------|-------------|-------------|-------------------------|
| AI Framework | Vercel AI SDK + Mastra | LangChain JS | If you need extensive RAG orchestration or have existing Python LangChain workflows; 101.2kB bundle blocks edge deployment |
| AI Framework | Vercel AI SDK + Mastra | OpenAI Agents SDK | If building multi-agent workflows exclusively with OpenAI models; less provider flexibility |
| Vector DB | Vectra | Chroma/Weaviate | If you need production-scale vector search or network-based serving; Vectra is perfect for local-first |
| Testing | Vitest | Jest | Only if locked into legacy systems or React Native; Jest has larger ecosystem but slower performance |
| Build Tool | Turborepo | Nx | If you need advanced plugin system or 7x faster builds; Nx requires more upfront investment vs Turborepo's quick wins |
| TUI Framework | Ink | Blessed | If you need complex widgets or mouse events; Blessed is mature but less modern than React-like Ink |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| LangChain JS (alone) | 101.2kB bundle; edge runtime incompatible; complex abstractions for simple use cases | Vercel AI SDK for streaming + Mastra for workflows |
| ts-node | Slow execution; being replaced by modern alternatives | tsx (5-10x faster) |
| Yarn v1 | Deprecated; slower than pnpm | pnpm (faster, better workspace support) |
| npm workspaces (alone) | No build orchestration; slower than pnpm | pnpm + Turborepo |
| Pinecone/cloud vector DBs | Contradicts local-first architecture; requires API keys; network dependency | Vectra (file-based, local) |
| Custom git wrapper | Reinventing wheel; error-prone | simple-git (battle-tested) |

## Stack Patterns by Variant

**If building primarily for WhatsApp:**
- Use whatsapp-web.js as primary interface
- Consider Baileys as alternative (more lightweight, no Puppeteer)
- WhatsApp Business API requires paid account; avoid unless enterprise use case

**If prioritizing security/privacy:**
- Signal + Delta Chat first (E2E encrypted by default)
- WhatsApp second (E2E but owned by Meta)
- Delta Chat uses email infrastructure (more decentralized)

**If building complex agent workflows:**
- Mastra for workflow orchestration + memory
- Vercel AI SDK for model provider flexibility
- Consider adding LangGraph (from LangChain team) for state machine patterns

**If targeting CLI-only (v0):**
- Skip messaging SDKs initially
- Focus on Ink TUI + Vectra memory
- Add messaging in v1+

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Vercel AI SDK 6.x | Mastra latest | Mastra uses AI SDK under the hood; @ai-sdk/langchain supports modern LangChain |
| whatsapp-web.js 1.34.x | Node.js 18+ | Requires Puppeteer; Chromium dependency |
| signal-sdk | Node.js 18+ | Requires Java Runtime for signal-cli backend (included) |
| deltachat-node 1.155.x | Node.js 20+ | Now part of deltachat-core-rust; install from GitHub |
| Vectra | Any embedding provider | Provider-agnostic; works with OpenAI, local models, etc. |
| Turborepo 2.x | pnpm 9.x | Turborepo + pnpm is the fastest combo; official integration |
| Vitest 2.x | Vite 5.x | Built on Vite; shares config |

## Security Considerations

| Component | Risk | Mitigation |
|-----------|------|------------|
| Messaging SDKs | Credentials in plaintext | Use env vars; encrypt session storage; skills.sh-style permissions |
| LLM outputs | Injection attacks | Validate with zod at boundaries; sanitize inputs/outputs with Mastra guardrails |
| File system access | Unrestricted writes | Sandbox bash tools (Claude Code pattern); restrict to workspace directories |
| Vector embeddings | PII leakage | Hash/anonymize before embedding; local-only storage with Vectra |
| Tool execution | Arbitrary code | Permission-based execution (skills.sh model); explicit user approval for sensitive ops |

## Performance Benchmarks (Informal)

- **Vitest vs Jest:** 10-20x faster in watch mode (18.7s → 1.8s reported)
- **pnpm vs npm:** 2-3x faster installs
- **Turborepo:** 50-90% faster builds with cache hits
- **Vectra:** Sub-millisecond to low-millisecond latency for small/medium datasets
- **Vercel AI SDK:** Streaming-first; 20-line implementation vs 100+ with raw APIs

## Sources

**HIGH Confidence (Official Docs & Context7):**
- [Vercel AI SDK](https://ai-sdk.dev/docs/introduction) — Official documentation
- [Mastra AI](https://mastra.ai/) — Official website and features
- [Vectra GitHub](https://github.com/Stevenic/vectra) — Repository and documentation
- [OpenAI Agents SDK](https://github.com/openai/openai-agents-js) — Official repository
- [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) — Latest stable v1.34.6
- [signal-sdk](https://github.com/benoitpetit/signal-sdk) — TypeScript SDK repository
- [deltachat-node](https://js.delta.chat/) — Official docs v1.155.5

**MEDIUM Confidence (WebSearch + Multiple Sources):**
- [TypeScript AI Agent Frameworks 2026](https://techwithibrahim.medium.com/top-5-typescript-ai-agent-frameworks-you-should-know-in-2026-5a2a0710f4a0)
- [LangChain vs Vercel AI SDK 2026](https://strapi.io/blog/langchain-vs-vercel-ai-sdk-vs-openai-sdk-comparison-guide)
- [Vitest vs Jest 2025 Comparison](https://medium.com/@ruverd/jest-vs-vitest-which-test-runner-should-you-use-in-2025-5c85e4f2bda9)
- [Turborepo vs Nx Monorepo Tools](https://www.aviator.co/blog/monorepo-tools/)
- [Mastra RAG Pipeline Guide](https://medium.com/@amitbishnoi.brw/building-a-retrieval-augmented-generation-rag-pipeline-with-mastra-ai-a-typescript-developers-52c1d20db5d7)

**LOW Confidence (Single Source, Needs Validation):**
- skills.sh implementation details — Directory exists but integration patterns need validation
- Specific performance benchmarks — Based on community reports, not official testing

---
*Stack research for: Vec AI Personal Assistant*
*Researched: 2026-02-05*
