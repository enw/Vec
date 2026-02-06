# Project Research Summary

**Project:** Vec AI Personal Assistant
**Domain:** AI Personal Assistant with Messaging Integration
**Researched:** 2026-02-05
**Confidence:** HIGH

## Executive Summary

Vec is an AI personal assistant that integrates with messaging platforms (WhatsApp, Signal, Delta Chat) to provide conversational task automation with permission-based safety guardrails. Expert implementations emphasize local-first architecture, TypeScript for production stability, streaming-first LLM integration, and explicit permission gates for autonomous actions. The recommended approach uses Vercel AI SDK + Mastra for agent workflows, Vectra for local vector memory, message platform SDKs for integration, and a monorepo structure with Turborepo.

The critical differentiator vs competitors like OpenClaw is Vec's permission-based action gates — preventing autonomous data leaks while maintaining proactive capability. Research shows 48% of practitioners believe autonomous AI is the #1 attack vector in 2026, and OpenClaw's overnight credential leaks validate this concern. Vec addresses this by requiring explicit approval for sensitive operations while allowing safe autonomous actions.

Key risks include prompt injection via untrusted content (the "lethal trifecta"), memory poisoning through persistent context, and context window overflow in long conversations. Mitigation requires input classification (trusted vs untrusted), memory validation before persistence, and hierarchical memory with summarization. The roadmap must prioritize security foundations (permission system, input validation) before advanced features (multi-agent, agentic RAG).

## Key Findings

### Recommended Stack

TypeScript production ecosystem optimized for AI agents with streaming and local-first architecture. Core choices: TypeScript 5.x (type safety prevents agent logic errors), pnpm 9.x (fastest installs, workspace support), Node.js 22.x LTS (required by messaging SDKs), Vitest 2.x (10-20x faster than Jest). Turborepo provides build orchestration with tactical quick wins for caching.

**Core technologies:**
- **Vercel AI SDK 6.x**: LLM integration — streaming-first, 25+ providers, minimal abstraction, TypeScript-native
- **Mastra**: Agent workflows — integrated RAG + vector memory, observability built-in, TypeScript-first
- **Vectra**: Local vector DB — file-based persistence, zero infrastructure, sub-millisecond latency, perfect for local-first
- **whatsapp-web.js 1.34.x**: WhatsApp integration — most mature SDK, TypeScript support, 123+ releases
- **signal-sdk**: Signal integration — comprehensive TypeScript SDK, JSON-RPC communication, enterprise-grade error handling
- **deltachat-node 1.155.x**: Delta Chat integration — official Node.js bindings, email-based messaging
- **Ink 5.x**: CLI/TUI framework — React-like API for terminal UIs, full TypeScript support
- **zod 3.x**: Runtime validation — required for LLM structured outputs, validate at boundaries

### Expected Features

Table stakes (must have): Natural language understanding, conversational memory, multi-turn conversations, task execution, multi-platform integration, model flexibility, privacy controls. Users expect assistants to DO things (execute tasks), not just chat. Missing task execution = "fancy toy" status.

**Must have (table stakes):**
- Message platform integration (WhatsApp/Signal/Delta Chat) — users expect multi-platform access
- Conversation memory — users assume assistant remembers context within session
- Task execution framework — core value proposition, not just chat
- Multi-model support — 37% of enterprises use 5+ models in production, single-model = vendor lock-in
- Basic permission system — required for safe autonomous operation

**Should have (competitive):**
- Permission-based action gates — VEC's core differentiator, prevents OpenClaw-style leaks
- Proactive monitoring with guardrails — heartbeat-style awareness without autonomous execution
- Local-first architecture — privacy + sovereignty differentiator
- Hierarchical memory system — beyond basic session memory, contextual recall
- Skills-based extensibility — MCP protocol integration for custom capabilities

**Defer (v2+):**
- Multi-agent orchestration — complex coordination overhead, defer until single-agent proven
- Agentic RAG — defer until basic RAG + vector memory validated
- Semantic caching — defer until cost optimization needed at scale
- Voice interface — defer until text-based patterns proven

### Architecture Approach

Standard AI personal assistant architecture uses layered system: Experience Layer (CLI/TUI/Platform adapters) → Orchestration Layer (Conversation Manager, Model Router, Agent Skills) → Capability Layer (Tools/MCP, Memory/Vector, RAG, Security/Guardrails) → Persistence Layer (Files, Vector DB, Git). Core patterns include LangGraph-style state management (TypedDict-based state with checkpoint persistence), model routing by task complexity (60-70% cost reduction), progressive skill disclosure (load metadata first, full instructions on-demand), dual-layer memory (working session + persistent vector), and MCP-based tool integration.

**Major components:**
1. **Conversation Manager** — state management, thread tracking, context assembly using TypedDict state with checkpointing
2. **Model Router** — LLM selection based on task complexity (simple → Haiku, complex → Opus)
3. **Agent Skills** — modular SKILL.md packages, progressive disclosure, on-demand loading
4. **Memory System** — dual-layer: working memory (session-scoped) + persistent memory (vector-backed, cross-session)
5. **MCP Tools** — standardized tool integration with JSON schemas, permission checks, validation
6. **Security/Guardrails** — RBAC permissions, JIT provisioning, input/output filtering, audit logging

### Critical Pitfalls

1. **Autonomous Action Without Permission Gates** — OpenClaw leaked passwords overnight due to unrestricted file system access. Avoid by classifying operations by risk level, requiring explicit approval for HIGH-risk operations (file writes, credentials, deletions), implementing approval queues, and defaulting to ask-first with opt-in autonomous execution per tool category. Must address in v0 (MVP) — permission system is foundational architecture.

2. **The Lethal Trifecta (Data + Untrusted Input + Exfiltration)** — Attacker embeds malicious instructions in documents/websites that agent reads, causing credential leaks to attacker-controlled endpoints. Avoid by separating trusted (user commands) from untrusted (web scraping, documents) input channels, restricting outbound network calls (whitelist domains, require approval), implementing egress filtering to detect sensitive data patterns, and using structured tool inputs (JSON schemas). Address in v0 (MVP) before web/document access.

3. **Memory Poisoning via Persistent Context** — Malicious instructions injected into long-term memory persist across sessions, causing agent to "learn" to leak data or bypass security. Avoid by validating memory writes (detect instruction-like patterns), separating user preferences (safe) from operational instructions (dangerous), implementing memory integrity (hash/sign entries), providing memory review UI, and time-bounding memory with expiration. Address in v0 if implementing thread memory.

4. **Context Window Management Failure** — System prompt + history + docs + tools exceed context window, causing model to drop security constraints or crash. Avoid by monitoring token usage, triggering summarization at 70-80% capacity, prioritizing token budget (system prompt > recent messages > tool outputs > history), using hierarchical memory (detailed recent + summarized older), and testing with long conversations. Address in v0 (basic tracking), v1+ (advanced summarization).

5. **Tool Calling Without Output Validation** — Agent calls tools with malformed inputs, misinterprets outputs, causes cascading failures leading to destructive actions. Avoid by strict schema validation (reject malformed inputs before execution), structured tool outputs (JSON not prose), tool result validation (verify output matches expected schema), error handling (tools return error objects), and tool call logging for audit trail. Address in v0 (MVP) before multi-tool workflows.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation (v0 MVP)
**Rationale:** Security-first foundation required before any autonomous capabilities. Permission system and input validation must be architectural from day one, not bolted on later.
**Delivers:** CLI/TUI interface, conversation manager with state management, basic permission system with risk classification, input validation (trusted vs untrusted), conversation memory (thread-based), LLM integration with streaming
**Addresses:**
- Natural language understanding (table stakes)
- Conversation memory (table stakes)
- Basic permission system (differentiator, critical for safety)
**Avoids:**
- Autonomous action without permission gates (Critical Pitfall #1)
- Input classification before external content (Critical Pitfall #2)
- Memory validation infrastructure (Critical Pitfall #3)

### Phase 2: Core Capabilities (v1)
**Rationale:** Build on security foundation to deliver core value proposition: task execution via messaging platforms with safe autonomous operation.
**Delivers:** Message platform integration (WhatsApp/Signal/Delta Chat), task execution framework with MCP tools, permission approval queues, multi-model support, vector memory (Vectra), model routing by complexity
**Uses:**
- whatsapp-web.js, signal-sdk, deltachat-node (messaging SDKs)
- Vectra (local vector DB)
- MCP protocol (tool integration)
- Vercel AI SDK (multi-provider support)
**Implements:**
- Dual-layer memory architecture (working + persistent)
- MCP-based tool integration with validation
- Model router for cost optimization
**Avoids:**
- Tool calling without validation (Critical Pitfall #5)
- Context window overflow with basic tracking (Critical Pitfall #4)

### Phase 3: Extensibility (v1.x)
**Rationale:** Enable user customization and advanced capabilities once core is stable and security-proven.
**Delivers:** Skills/plugins system (MCP-based), dynamic model routing (intelligent per-task selection), research task loops (Wiggum-style multi-round), network context tracking, proactive monitoring with guardrails
**Implements:**
- Progressive skill disclosure pattern
- Advanced model routing strategies (cost/quality optimization)
- Hierarchical memory with summarization
**Avoids:**
- Credential exposure in skills marketplace (Critical Pitfall #7 — requires skill vetting, sandboxing)

### Phase 4: Advanced Intelligence (v2+)
**Rationale:** Defer complex coordination patterns until simpler agent workflows proven in production.
**Delivers:** Multi-agent orchestration, agentic RAG (cross-validation, adaptive retrieval), semantic caching, voice interface
**Implements:**
- Multi-agent coordination with human checkpoints
- Advanced RAG with source cross-checking

### Phase Ordering Rationale

- **Security before features**: Permission system (Phase 1) must exist before task execution (Phase 2). Input validation before web access. Research shows autonomous AI is top attack vector in 2026.
- **Foundation before scale**: Single-model conversation (Phase 1) before multi-model routing (Phase 2). Basic memory before hierarchical (Phase 3). Proven patterns before advanced.
- **Integration dependencies**: Messaging platforms (Phase 2) depend on conversation manager (Phase 1). Skills system (Phase 3) depends on tool framework (Phase 2).
- **Avoid pitfalls early**: Phase 1 addresses Critical Pitfalls #1-3 (autonomous actions, input validation, memory poisoning) before they can manifest. Phase 2 addresses #4-5 (context overflow, tool validation).

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Message Platforms):** Complex integration, three different SDKs with varying maturity levels, WhatsApp Puppeteer dependency, Signal Java runtime requirement, Delta Chat email infrastructure
- **Phase 3 (Skills System):** MCP protocol implementation details, skill sandboxing architecture, marketplace security patterns need validation
- **Phase 4 (Multi-Agent):** Sparse TypeScript examples for agent orchestration, most documentation Python-focused, coordination patterns need research

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Well-documented LangGraph-style state management, standard CLI/TUI patterns with Ink, established LLM streaming patterns
- **Phase 2 (Vector Memory):** Vectra has clear documentation, dual-layer memory is standard pattern, embedding generation well-understood

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Official docs + Context7 for all core technologies; TypeScript AI agent patterns well-established in 2026 |
| Features | HIGH | Multiple sources agree on table stakes (task execution, multi-platform, memory) and competitive differentiators (permissions, local-first); OpenClaw analysis provides clear anti-pattern |
| Architecture | HIGH | Standard patterns documented across multiple frameworks (LangGraph, Mastra, Vercel AI SDK); component boundaries well-defined; integration points clear |
| Pitfalls | HIGH | Real-world incidents documented (OpenClaw CVE-2026-25253, credential leaks); security research from multiple authoritative sources (Kaspersky, OWASP ASI Top 10); recovery strategies validated |

**Overall confidence:** HIGH

### Gaps to Address

Research was comprehensive, but these need validation during implementation:

- **Message platform authentication**: WhatsApp Puppeteer session management, Signal Java runtime integration, Delta Chat email credentials — specific auth flows need hands-on validation
- **MCP server performance**: Latency characteristics for in-process vs remote MCP servers at scale — benchmark during Phase 2
- **Vector DB migration path**: Vectra is file-based; migration strategy to production vector DB if scaling beyond local-first needs planning
- **Skills marketplace security**: Static analysis tooling for credential detection in third-party skills (7.1% of OpenClaw skills exposed credentials) — specific tools need evaluation in Phase 3
- **TUI accessibility**: Ink's screen reader compatibility needs validation (research flagged "text mode lie" accessibility issues with modern TUIs) — test with screen readers in Phase 1

## Sources

### Primary (HIGH confidence)
- Official documentation: Vercel AI SDK, Mastra, Vectra, whatsapp-web.js, signal-sdk, deltachat-node
- Security advisories: CVE-2026-25253 (OpenClaw RCE), OWASP ASI Top 10 for Agentic AI
- Architecture patterns: LangGraph memory architecture (official docs), MCP specification (2025-11-25)
- Performance data: Vitest vs Jest benchmarks, Turborepo caching statistics

### Secondary (MEDIUM confidence)
- Industry analysis: 10 Best AI Personal Assistants 2026 (Dume.ai), AI Personal Assistant Guide (Kairntech)
- Technology comparisons: LangChain vs Vercel AI SDK (Strapi), Turborepo vs Nx (Aviator)
- Security research: AI Agents as Authorization Bypass (The Hacker News), Agentic AI Security (Kaspersky)
- Feature surveys: 37% enterprises using 5+ models (IDC), 48% view autonomous AI as #1 attack vector (Palo Alto Networks)

### Tertiary (LOW confidence)
- Community reports: OpenClaw ClawHub 7.1% credential exposure rate, 341 malicious skills in 3 days (needs validation)
- Performance claims: 60-70% cost reduction via model routing (needs benchmarking with actual usage)
- Accessibility concerns: TUI screen reader compatibility (single source, needs hands-on testing)

---
*Research completed: 2026-02-05*
*Ready for roadmap: yes*
