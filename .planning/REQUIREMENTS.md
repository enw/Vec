# Requirements: Vec

**Defined:** 2026-02-05
**Core Value:** Your personal assistant remembers context across sessions without leaking your sensitive data.

## v0 Requirements (Foundation)

### Security & Permissions

- [x] **SEC-01**: Permission system prevents autonomous data leaks
- [x] **SEC-02**: Input validation and classification (trusted vs untrusted sources)
- [x] **SEC-03**: Egress filtering for sensitive data
- [x] **SEC-04**: Token usage monitoring (70-80% threshold alerts)

### Core Interface

- [ ] **CORE-01**: CLI/TUI interface using Ink framework
- [ ] **CORE-02**: Conversation manager with streaming responses
- [ ] **CORE-03**: Single agent conversation support
- [ ] **CORE-04**: Start/stop/restart in same workspace (state persistence)
- [ ] **CORE-05**: Create new named or numbered workspaces

### Memory & Profiles

- [ ] **MEM-01**: Thread memory (configurable: last X messages or all)
- [ ] **MEM-02**: SOUL.md profile (assistant identity/personality)
- [ ] **MEM-03**: AGENTS.md profile (agent configurations)
- [ ] **MEM-04**: USER.md profile (user context/preferences)
- [ ] **MEM-05**: IDENTITY.md profile (user identity)
- [ ] **MEM-06**: HEARTBEAT.md profile (daily check-ins/status)
- [ ] **MEM-07**: Memory and state explicitly written to disk
- [ ] **MEM-08**: Graceful state recovery on restart

### Workspace Management

- [ ] **WORK-01**: Workspace isolation in .vec/workspace folders
- [ ] **WORK-02**: Git versioning for workspace tracking
- [ ] **WORK-03**: Automated commits on state changes
- [ ] **WORK-04**: Workspace switching support

## v1 Requirements

### Vector Memory

- [ ] **VEC-01**: Vectra integration for local vector storage
- [ ] **VEC-02**: Semantic search over conversation history
- [ ] **VEC-03**: Semantic search over knowledge/documents
- [ ] **VEC-04**: Cross-session memory retrieval

### Dynamic Model Switching

- [ ] **MODEL-01**: Multi-model provider support (Vercel AI SDK)
- [ ] **MODEL-02**: Task complexity heuristics
- [ ] **MODEL-03**: Automatic model routing based on task
- [ ] **MODEL-04**: Cost optimization (60-70% reduction target)
- [ ] **MODEL-05**: Manual model override capability

### Skills & Tools

- [ ] **SKILL-01**: skills.sh integration
- [ ] **SKILL-02**: MCP (Model Context Protocol) support
- [ ] **SKILL-03**: Tool discovery and registration
- [ ] **SKILL-04**: Tool execution with schema validation
- [ ] **SKILL-05**: Permission-based tool access control
- [ ] **SKILL-06**: Tool error handling and recovery

### Research Capabilities

- [ ] **RES-01**: Research task assignment interface
- [ ] **RES-02**: Follow-up question generation until DoD clear
- [ ] **RES-03**: Wiggum-style iterative research loop
- [ ] **RES-04**: Long-running task support
- [ ] **RES-05**: Research output persistence and retrieval

### Traceability

- [ ] **TRACE-01**: Action audit log (what the assistant did)
- [ ] **TRACE-02**: Reasoning chain tracking (why decisions were made)
- [ ] **TRACE-03**: Data provenance (where information came from)
- [ ] **TRACE-04**: Query-able trace history

## v2 Requirements (Deferred)

### Messaging Platforms

- **MSG-01**: WhatsApp integration (whatsapp-web.js)
- **MSG-02**: Signal integration (signal-sdk)
- **MSG-03**: Delta Chat integration (deltachat-node)
- **MSG-04**: Message normalization layer
- **MSG-05**: Platform-agnostic conversation routing

### Web Interface

- **WEB-01**: Web-based chat interface
- **WEB-02**: Workspace management UI
- **WEB-03**: Profile editor
- **WEB-04**: Trace/audit log viewer
- **WEB-05**: WebSocket origin validation

### Advanced Intelligence

- **NET-01**: Network tracking (contacts, relationships)
- **NET-02**: Context from network graph
- **PRIOR-01**: Prioritization assistance
- **PRIOR-02**: Task urgency/importance scoring
- **MULTI-01**: Multi-agent orchestration
- **MULTI-02**: Agent coordination protocols
- **RAG-01**: Agentic RAG (cross-validation, adaptation)
- **FINETUNE-01**: Collect interaction data for fine-tuning
- **FINETUNE-02**: Fine-tune lower-end LLMs for function-calling
- **FINETUNE-03**: Fine-tune lower-end LLMs for instruction-following

## Out of Scope

| Feature | Reason |
|---------|--------|
| Autonomous actions without permission | OpenClaw's critical flaw - leaked passwords when left running overnight |
| Broad system permissions without user control | Security-first principle - all access explicitly granted |
| Cloud-based vector storage | Local-first constraint - data stays on user's machine |
| Real-time collaboration | Single-user focus for v0-v2 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEC-01 | Phase 1 | Complete |
| SEC-02 | Phase 1 | Complete |
| SEC-03 | Phase 1 | Complete |
| SEC-04 | Phase 1 | Complete |
| CORE-01 | Phase 2 | Pending |
| CORE-02 | Phase 2 | Pending |
| CORE-03 | Phase 2 | Pending |
| CORE-04 | Phase 2 | Pending |
| CORE-05 | Phase 2 | Pending |
| MEM-01 | Phase 3 | Pending |
| MEM-02 | Phase 3 | Pending |
| MEM-03 | Phase 3 | Pending |
| MEM-04 | Phase 3 | Pending |
| MEM-05 | Phase 3 | Pending |
| MEM-06 | Phase 3 | Pending |
| MEM-07 | Phase 3 | Pending |
| MEM-08 | Phase 3 | Pending |
| WORK-01 | Phase 4 | Pending |
| WORK-02 | Phase 4 | Pending |
| WORK-03 | Phase 4 | Pending |
| WORK-04 | Phase 4 | Pending |
| VEC-01 | Phase 5 | Pending |
| VEC-02 | Phase 5 | Pending |
| VEC-03 | Phase 5 | Pending |
| VEC-04 | Phase 5 | Pending |
| MODEL-01 | Phase 6 | Pending |
| MODEL-02 | Phase 6 | Pending |
| MODEL-03 | Phase 6 | Pending |
| MODEL-04 | Phase 6 | Pending |
| MODEL-05 | Phase 6 | Pending |
| SKILL-01 | Phase 7 | Pending |
| SKILL-02 | Phase 7 | Pending |
| SKILL-03 | Phase 7 | Pending |
| SKILL-04 | Phase 7 | Pending |
| SKILL-05 | Phase 7 | Pending |
| SKILL-06 | Phase 7 | Pending |
| RES-01 | Phase 8 | Pending |
| RES-02 | Phase 8 | Pending |
| RES-03 | Phase 8 | Pending |
| RES-04 | Phase 8 | Pending |
| RES-05 | Phase 8 | Pending |
| TRACE-01 | Phase 9 | Pending |
| TRACE-02 | Phase 9 | Pending |
| TRACE-03 | Phase 9 | Pending |
| TRACE-04 | Phase 9 | Pending |

**Coverage:**
- v0 requirements: 22 total, 22 mapped ✓
- v1 requirements: 21 total, 21 mapped ✓
- v2 requirements: 17 total (deferred to future roadmap)
- **Total mapped: 43/43 requirements (100% coverage)**

---
*Requirements defined: 2026-02-05*
*Last updated: 2026-02-06 after roadmap creation*
