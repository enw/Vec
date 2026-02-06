# Pitfalls Research

**Domain:** AI Personal Assistants
**Researched:** 2026-02-05
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Autonomous Action Without Permission Gates

**What goes wrong:**
Agent executes destructive/sensitive operations autonomously when left running. OpenClaw leaked passwords overnight because it had unrestricted file system access and no approval mechanism for sensitive operations.

**Why it happens:**
- Developers prioritize "magic" UX over security
- Permission checks feel like friction during demos
- Assumption that users will supervise 24/7
- Tool calling lacks sensitivity classification

**How to avoid:**
- Classify operations by risk level (read-only, modifying, sensitive)
- Require explicit approval for HIGH-risk operations (file writes, network requests with credentials, deletions)
- Implement approval queues rather than blocking execution
- Default to ask-first, opt-in to autonomous execution per tool category
- Never auto-execute operations involving credentials, authentication, or deletion

**Warning signs:**
- Tools have unrestricted file system access
- No distinction between "safe" and "dangerous" operations
- User can't review queued operations before execution
- Agent runs continuously without oversight mechanism

**Phase to address:**
v0 (MVP) - Permission system must be foundational architecture, not bolted on later

---

### Pitfall 2: The Lethal Trifecta (Data + Untrusted Input + Exfiltration)

**What goes wrong:**
Agent with access to private data processes untrusted input (prompt injection) and has an exfiltration vector (external API calls). Attacker embeds malicious instructions in documents/websites that the agent reads, causing it to leak credentials or sensitive data to attacker-controlled endpoints.

**Why it happens:**
- Treating all external content as safe input
- No distinction between user commands and retrieved data
- LLMs cannot reliably distinguish instructions from data
- Agent can make arbitrary HTTP requests

**How to avoid:**
- Separate trusted (user commands) from untrusted (web scraping, document processing) input channels
- Mark retrieved content as untrusted, apply content filtering
- Restrict outbound network calls: whitelist domains, require approval for new destinations
- Implement egress filtering: detect sensitive data patterns in outbound requests
- Use structured tool inputs (JSON schemas) rather than freeform prompts when possible

**Warning signs:**
- Agent can fetch arbitrary URLs without validation
- No content filtering on retrieved documents/web pages
- Outbound requests aren't logged or monitored
- Same processing pipeline for user input and external content

**Phase to address:**
v0 (MVP) - Input classification and egress controls must exist before web/document access

---

### Pitfall 3: Memory Poisoning via Persistent Context

**What goes wrong:**
Attacker injects malicious instructions into agent's long-term memory/profiles. Unlike prompt injection (session-scoped), poisoned memory persists across sessions. Agent "learns" to leak data, bypass security, or execute malicious operations every time it recalls the poisoned context.

**Why it happens:**
- Treating all conversation history as trustworthy
- No validation on what gets persisted to memory
- Profiles/memory lack integrity checks
- No memory review/audit mechanism

**How to avoid:**
- Validate memory writes: detect instruction-like patterns before persisting
- Separate user preferences (safe to remember) from operational instructions (dangerous to remember)
- Implement memory integrity: hash/sign memory entries to detect tampering
- Provide memory review UI: users can audit what agent "remembers"
- Time-bound memory: expire old entries, require reconfirmation
- Separate memory scopes: profile preferences vs. conversation history vs. learned skills

**Warning signs:**
- All conversation history auto-persists without filtering
- No distinction between "remember my name" and "remember to always execute X"
- Users can't review or edit agent's memory
- No tampering detection on stored profiles/memory

**Phase to address:**
v0 (MVP) if implementing thread memory, v1+ for advanced memory systems - Security before features

---

### Pitfall 4: Context Window Management Failure

**What goes wrong:**
System prompt + conversation history + retrieved docs + tool outputs exceed context window. Model drops critical information (like security constraints), fails to follow instructions, or crashes. Production issue: "It worked yesterday but today it ignores the safety rules."

**Why it happens:**
- Assuming infinite context
- No monitoring of token consumption
- System prompts too verbose
- Conversation history grows unbounded
- RAG retrieves too much irrelevant context

**How to avoid:**
- Monitor token usage: track % of context consumed
- Trigger summarization at 70-80% capacity (condense early conversation)
- Prioritize token budget: system prompt > recent messages > tool outputs > history
- Implement semantic compression: summarize redundant information
- Use hierarchical memory: detailed recent + summarized older context
- Test with long conversations during development
- Hard limits: reject operations that would overflow context

**Warning signs:**
- No token tracking/logging
- System prompts over 2000 tokens
- Unbounded conversation history appending
- Model behavior degrades in long conversations
- "Lost in the middle" effect: agent ignores middle messages

**Phase to address:**
v0 (MVP) - Basic token tracking, v1+ - Advanced summarization/hierarchical memory

---

### Pitfall 5: Tool Calling Without Output Validation

**What goes wrong:**
Agent calls tools with malformed inputs, misinterprets tool outputs, or chains tools incorrectly. Results in cascading failures: wrong tool → wrong data → wrong decision → destructive action. In production: "The agent deleted the wrong files because it misread the ls output."

**Why it happens:**
- Trusting LLM to always format tool inputs correctly
- No schema validation on tool calls
- Tool outputs returned as raw strings (unparseable)
- No error recovery mechanism
- Assuming tools always succeed

**How to avoid:**
- Strict schema validation: reject malformed tool inputs before execution
- Structured tool outputs: JSON not prose
- Tool result validation: verify output matches expected schema
- Error handling: tools return error objects, agent must handle failures
- Confirmation for tool chains: "You're about to call tool A then B, proceed?"
- Tool call logging: audit trail for debugging
- Limit tool retries: prevent infinite loops

**Warning signs:**
- Tool inputs are freeform strings
- No validation errors thrown when tool receives bad input
- Tools return prose descriptions instead of structured data
- Agent can retry failed operations infinitely
- No logging of tool call sequences

**Phase to address:**
v0 (MVP) - Schema validation and error handling must exist before multi-tool workflows

---

### Pitfall 6: Cross-Site WebSocket Hijacking

**What goes wrong:**
Agent's local server doesn't validate WebSocket origin headers. Malicious website visits by user causes browser to connect to localhost agent server, exfiltrates auth tokens, achieves full agent compromise. CVE-2026-25253 (OpenClaw, CVSS 8.8): one-click RCE via auth token theft.

**Why it happens:**
- Assuming localhost is safe from web attacks
- No origin validation on WebSocket connections
- Auth tokens accessible via client-side JavaScript
- CORS misconfiguration

**How to avoid:**
- Validate WebSocket origin header: only accept connections from expected origins
- Use CSRF tokens: require token in WebSocket handshake
- Secure auth token storage: httpOnly cookies, not localStorage
- Implement CORS properly: restrictive allowlist, no wildcard origins
- Content Security Policy: prevent inline scripts from exfiltrating tokens

**Warning signs:**
- WebSocket server accepts connections without origin checks
- Auth tokens stored in localStorage/sessionStorage
- No CSRF protection on WebSocket handshake
- CORS allows * origin

**Phase to address:**
v1+ when adding web UI - Never expose local servers without origin validation

---

### Pitfall 7: Credential Exposure in Tool/Skill Marketplace

**What goes wrong:**
User installs third-party skills/tools from marketplace. Malicious skills contain hardcoded credentials, leak API keys in error messages, or exfiltrate user credentials. OpenClaw ClawHub: 7.1% of skills exposed credentials, 341 malicious skills identified in 3 days.

**Why it happens:**
- No vetting/scanning of third-party code
- Skills run with full user permissions
- Users trust marketplace implicitly
- No sandboxing of third-party code
- Developers accidentally commit credentials

**How to avoid:**
- Scan marketplace submissions: static analysis for credential patterns
- Sandbox third-party skills: restricted permissions, no file system access by default
- Require skill permissions manifest: user approves what skill can access
- Credential management: provide secure secret storage, discourage hardcoding
- Reputation system: flag/remove malicious skills quickly
- Open source requirement: reviewable code only

**Warning signs:**
- No code review process for marketplace submissions
- Skills run with same permissions as core agent
- Users can't see what permissions a skill requests
- No mechanism to revoke compromised skills
- Credentials embedded in skill code

**Phase to address:**
v1+ when adding skills system - Security-first marketplace architecture required

---

### Pitfall 8: Insufficient Identity and Authorization Management

**What goes wrong:**
Agent executes operations with its own broad permissions rather than user's scoped permissions. User with read-only access to repo asks agent to "fix the bug" → agent has write access → unauthorized modification. Authorization bypass: agent becomes privilege escalation vector.

**Why it happens:**
- Agent has single global identity/permission set
- No mapping from user permissions to agent capabilities
- Assuming agent should have admin access for convenience
- IAM systems evaluate agent identity, not user identity

**How to avoid:**
- Just-in-time (JIT) provisioning: agent gets ephemeral credentials scoped to user's permissions
- Agent as first-class identity: inventory, govern, audit like human users
- Least-privilege access: agent only gets permissions for current operation
- Continuous re-authorization: validate permissions per operation, not per session
- Permission inheritance: agent permissions ⊆ user permissions
- Audit trail: log who used agent to perform what operation

**Warning signs:**
- Agent uses single API key/token for all users
- Agent has broader permissions than users
- No per-operation authorization checks
- Can't trace agent actions back to specific user
- Agent credentials are long-lived static secrets

**Phase to address:**
v1+ when multi-user - Single-user MVP can defer, critical for team/enterprise usage

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store credentials in plaintext config | Fast to implement | Credential leaks, security incidents | Never - use keychain/secret manager from v0 |
| All-or-nothing permissions | Simple UX | Can't grant partial access, security vs. usability tradeoff | MVP only, must refactor for v1 |
| Unbounded conversation history | Better context | Context overflow, performance degradation | Early testing, must implement limits for production |
| No tool call logging | Faster execution | Impossible to debug, no audit trail | Never - logging is foundational |
| Global rate limiting (not per-user) | Simple implementation | Abuse by single user impacts all users | Single-user only, breaks at multi-user |
| Synchronous tool execution | Simpler code | Blocking UX, poor responsiveness | MVP only, must async for v1 |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| LLM API | Not handling rate limits/retries | Exponential backoff, queue system, fallback models |
| Vector DB | Loading entire memory into context | Semantic search, return top-k relevant chunks only |
| File System | Unrestricted path access | Sandbox: restrict to user home dir, blocklist system paths |
| Web Scraping | No timeout/size limits | Max response size, timeout, streaming for large docs |
| OAuth Services | Storing tokens insecurely | Use OS keychain, encrypt at rest, auto-refresh |
| CLI Tools | Passing unsanitized user input | Shell escape all inputs, use parameterized execution |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Loading all conversations into memory | Slow startup, high memory usage | Lazy load, pagination, index by date | >100 conversations |
| Re-embedding entire memory on each query | Slow retrieval, expensive API costs | Incremental embedding, cache embeddings | >1000 memory entries |
| No token usage tracking | Unexpected API bills | Track/log all token consumption, set alerts | Production usage |
| Synchronous LLM calls in message loop | Unresponsive UI, blocking | Async/streaming, show progress indicators | Any real usage |
| Full conversation in every LLM call | Slow responses, high costs | Sliding window, summarization | Conversations >10k tokens |
| No caching of tool results | Redundant API calls, slow execution | Cache deterministic tool outputs with TTL | Multi-turn conversations |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| No distinction between user input and retrieved content | Indirect prompt injection | Tag input sources, filter untrusted content |
| Credentials in system prompts | Leaks via prompt extraction attacks | Never put secrets in prompts, use secure storage |
| Agent running as root/admin | Compromise leads to system takeover | Run as unprivileged user, request elevation only when needed |
| No rate limiting on tool execution | Resource exhaustion, runaway costs | Per-tool rate limits, cost budgets |
| Trusting third-party tool outputs | Malicious tools feed poisoned data | Validate tool outputs, sandbox execution |
| No session timeout | Stolen session = indefinite access | Idle timeout, require re-auth for sensitive ops |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No progress indication for long operations | User thinks agent is frozen, kills process | Streaming responses, progress updates, estimated time |
| Agent acts without explaining reasoning | User doesn't trust decisions, can't debug | Explain tool selection and reasoning before execution |
| No undo mechanism | User afraid to delegate tasks | Implement reversible operations, approval queues |
| Burying errors in logs | User doesn't know what failed | Surface errors in conversation, suggest fixes |
| Using aggressive TUI redraws | Inaccessible to screen readers, spam output | Use terminal scrolling regions, minimal redraws |
| No conversation branching | User can't explore alternatives | Allow "what if" branches without losing main thread |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Permission System:** Often missing deny logic — verify both allow and deny cases work
- [ ] **Memory Persistence:** Often missing data migration — verify upgrades don't corrupt history
- [ ] **Tool Execution:** Often missing timeout handling — verify long-running tools can be cancelled
- [ ] **Error Recovery:** Often missing retry limits — verify infinite loops can't occur
- [ ] **Token Tracking:** Often missing overage handling — verify graceful degradation at context limit
- [ ] **Multi-Platform:** Often missing non-macOS keychain support — verify secrets work on Linux/Windows
- [ ] **Streaming Responses:** Often missing error mid-stream handling — verify partial response cleanup
- [ ] **WebSocket Server:** Often missing origin validation — verify CSRF protection works

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Autonomous Action Without Permission | HIGH | 1. Immediately revoke agent credentials 2. Audit all recent operations 3. Revert unauthorized changes 4. Add retroactive approval gates 5. Notify affected users |
| Memory Poisoning | MEDIUM | 1. Identify poisoned entries via integrity check 2. Purge affected memory 3. Reset to last known-good snapshot 4. Implement memory validation going forward |
| Context Overflow | LOW | 1. Truncate conversation history 2. Regenerate summary 3. Add token monitoring alerts 4. Implement proactive summarization |
| Credential Exposure | HIGH | 1. Rotate all exposed credentials immediately 2. Audit for unauthorized access 3. Scan for other exposures 4. Implement secret scanning in CI |
| Tool Calling Cascade Failure | MEDIUM | 1. Halt agent execution 2. Review tool call audit log 3. Manually revert destructive operations 4. Add tool chain confirmation gates |
| WebSocket Hijacking | HIGH | 1. Invalidate all sessions 2. Patch origin validation 3. Audit for token exfiltration 4. Force user re-authentication |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Autonomous Action Without Permission | v0 (MVP) | Test: Run agent overnight, verify no sensitive ops executed without approval |
| Lethal Trifecta | v0 (MVP) | Test: Inject malicious prompt in doc, verify egress filtering blocks exfiltration |
| Memory Poisoning | v0 if thread memory, v1+ for advanced | Test: Attempt to inject instructions, verify they don't persist as operational commands |
| Context Window Management | v0 (basic tracking), v1+ (summarization) | Test: Long conversation >50k tokens, verify graceful handling |
| Tool Calling Validation | v0 (MVP) | Test: Malformed tool inputs, verify rejection with clear errors |
| WebSocket Hijacking | v1+ (web UI phase) | Test: CSRF attack from malicious site, verify origin validation blocks it |
| Credential Exposure | v1+ (skills system) | Test: Static analysis scan of skill code, verify credential detection works |
| Identity/Authorization | v1+ (multi-user) | Test: User with read-only perms, verify agent can't perform write operations |

## Sources

**OpenClaw Security Issues:**
- [OpenClaw security issues include data leakage & prompt injection](https://www.giskard.ai/knowledge/openclaw-security-vulnerabilities-include-data-leakage-and-prompt-injection-risks)
- [CVE-2026-25253: 1-Click RCE in OpenClaw Through Auth Token Exfiltration](https://socradar.io/blog/cve-2026-25253-rce-openclaw-auth-token/)
- [It's easy to backdoor OpenClaw, and its skills leak API keys • The Register](https://www.theregister.com/2026/02/05/openclaw_skills_marketplace_leaky_security/)
- [Personal AI Agents like OpenClaw Are a Security Nightmare - Cisco Blogs](https://blogs.cisco.com/ai/personal-ai-agents-like-openclaw-are-a-security-nightmare)

**Autonomous AI Security:**
- [AI Security in 2026: Prompt Injection, the Lethal Trifecta, and How to Defend](https://airia.com/ai-security-in-2026-prompt-injection-the-lethal-trifecta-and-how-to-defend/)
- [Top Agentic AI security resources — February 2026 | Adversa AI](https://adversa.ai/blog/top-agentic-ai-security-resources-february-2026/)
- [Top Agentic AI Security Threats in 2026](https://stellarcyber.ai/learn/agentic-ai-securiry-threats/)

**AI Agent Authorization:**
- [AI Agents Are Becoming Authorization Bypass Paths](https://thehackernews.com/2026/01/ai-agents-are-becoming-privilege.html)
- [Security for Production AI Agents in 2026 — Iain Harper's Blog](https://iain.so/security-for-production-ai-agents-in-2026)

**AI Memory & Privacy:**
- [With AI Agents, 'Memory' Raises Policy and Privacy Questions | TechPolicy.Press](https://www.techpolicy.press/forget-me-forget-me-not-memories-and-ai-agents/)
- [AI Agents and Memory: Privacy and Power in the Model Context Protocol (MCP) Era](https://www.newamerica.org/oti/briefs/ai-agents-and-memory/)
- [What AI "remembers" about you is privacy's next frontier](https://www.technologyreview.com/2026/01/28/1131835/what-ai-remembers-about-you-is-privacys-next-frontier/)

**Context Window Management:**
- [Context Window Overflow in 2026: Fix LLM Errors Fast](https://redis.io/blog/context-window-overflow/)
- [The Context Window Problem: Scaling Agents Beyond Token Limits | Factory.ai](https://factory.ai/news/context-window-problem)

**Tool Calling & Validation:**
- [Tool Calling Explained: The Core of AI Agents (2026 Guide) - Composio](https://composio.dev/blog/ai-agent-tool-calling-guide)
- [AI Agents: Reliability Challenges & Proven Solutions [2026]](https://www.edstellar.com/blog/ai-agent-reliability-challenges)

**Hallucination Mitigation:**
- [AI Hallucination: Compare top LLMs like GPT-5.2 in 2026](https://research.aimultiple.com/ai-hallucination/)
- [Hallucination Detection and Mitigation in Large Language Models](https://arxiv.org/pdf/2601.09929)

**TUI Accessibility:**
- [The text mode lie: why modern TUIs are a nightmare for accessibility — The Inclusive Lens](https://xogium.me/the-text-mode-lie-why-modern-tuis-are-a-nightmare-for-accessibility)

---
*Pitfalls research for: AI Personal Assistants*
*Researched: 2026-02-05*
