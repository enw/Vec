# Roadmap: Vec

## Overview

Vec delivers a secure AI personal assistant with persistent memory across nine phases. Starting with security-first foundations (permission system, input validation), building core conversational capabilities (CLI/TUI, memory, workspaces), then extending with advanced intelligence (vector memory, model routing, skills, research, traceability). Every phase delivers observable user value while maintaining the core principle: your assistant remembers context without leaking sensitive data.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Security & Foundation** - Permission system and security guardrails
- [ ] **Phase 2: Core Interface** - CLI/TUI conversation manager
- [ ] **Phase 3: Memory System** - Thread memory and profile system
- [ ] **Phase 4: Workspace Management** - Isolation and git versioning
- [ ] **Phase 5: Vector Memory** - Semantic search over conversations
- [ ] **Phase 6: Model Switching** - Multi-model routing and cost optimization
- [ ] **Phase 7: Skills & Tools** - MCP integration and tool execution
- [ ] **Phase 8: Research Capabilities** - Wiggum-style research loops
- [ ] **Phase 9: Traceability** - Audit and provenance tracking

## Phase Details

### Phase 1: Security & Foundation
**Goal**: Prevent autonomous data leaks through permission-based action gates
**Depends on**: Nothing (first phase)
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04
**Success Criteria** (what must be TRUE):
  1. Assistant cannot perform sensitive operations without explicit user approval
  2. System classifies input sources as trusted (user commands) or untrusted (external content)
  3. Outbound data transfers are filtered for sensitive patterns (credentials, PII)
  4. User receives alerts when token usage exceeds 70-80% threshold
**Plans**: 6 plans

Plans:
- [ ] 01-01-PLAN.md — Project scaffolding, config system, audit logger
- [ ] 01-02-PLAN.md — Permission engine with hybrid approval flow (SEC-01)
- [ ] 01-03-PLAN.md — Input classification and validation (SEC-02)
- [ ] 01-04-PLAN.md — Egress filtering for sensitive data (SEC-03)
- [ ] 01-05-PLAN.md — Token usage monitoring with alerts (SEC-04)
- [ ] 01-06-PLAN.md — Integration wiring, facade, and test suite

### Phase 2: Core Interface
**Goal**: Users can converse with assistant through CLI/TUI with streaming responses
**Depends on**: Phase 1
**Requirements**: CORE-01, CORE-02, CORE-03, CORE-04, CORE-05
**Success Criteria** (what must be TRUE):
  1. User can start CLI/TUI and see conversation interface
  2. User can send messages and receive streaming responses
  3. User can stop conversation and restart in same workspace without losing context
  4. User can create new named workspaces (e.g., "project-planning")
  5. User can create new numbered workspaces (auto-increment)
**Plans**: TBD

Plans:
- [ ] 02-01: TBD

### Phase 3: Memory System
**Goal**: Assistant remembers conversation context and user preferences across sessions
**Depends on**: Phase 2
**Requirements**: MEM-01, MEM-02, MEM-03, MEM-04, MEM-05, MEM-06, MEM-07, MEM-08
**Success Criteria** (what must be TRUE):
  1. Assistant retains last X messages in thread (configurable) or all messages if configured
  2. SOUL.md profile defines assistant personality and is used in conversations
  3. AGENTS.md profile defines agent configurations and capabilities
  4. USER.md profile stores user preferences and context
  5. IDENTITY.md profile stores user identity information
  6. HEARTBEAT.md profile tracks daily check-ins and status
  7. All memory and state changes are explicitly written to disk
  8. Assistant recovers gracefully from crashes by loading persisted state
**Plans**: TBD

Plans:
- [ ] 03-01: TBD

### Phase 4: Workspace Management
**Goal**: Users can organize conversations in isolated workspaces with version control
**Depends on**: Phase 3
**Requirements**: WORK-01, WORK-02, WORK-03, WORK-04
**Success Criteria** (what must be TRUE):
  1. Each workspace exists in isolated .vec/workspace folder with independent state
  2. Git tracks all workspace changes automatically
  3. State changes trigger automatic git commits with meaningful messages
  4. User can switch between workspaces without losing context in either
**Plans**: TBD

Plans:
- [ ] 04-01: TBD

### Phase 5: Vector Memory
**Goal**: Assistant finds relevant context from past conversations using semantic search
**Depends on**: Phase 4
**Requirements**: VEC-01, VEC-02, VEC-03, VEC-04
**Success Criteria** (what must be TRUE):
  1. Vectra local vector database stores conversation embeddings
  2. User asks question and assistant retrieves semantically relevant past messages
  3. User can search knowledge/documents by meaning, not just keywords
  4. Assistant recalls relevant context from previous sessions automatically
**Plans**: TBD

Plans:
- [ ] 05-01: TBD

### Phase 6: Model Switching
**Goal**: Assistant routes tasks to optimal models, reducing costs by 60-70%
**Depends on**: Phase 5
**Requirements**: MODEL-01, MODEL-02, MODEL-03, MODEL-04, MODEL-05
**Success Criteria** (what must be TRUE):
  1. Assistant supports multiple LLM providers through Vercel AI SDK
  2. Simple tasks route to fast/cheap models (e.g., Haiku), complex to powerful ones (e.g., Opus)
  3. Assistant selects model automatically based on task complexity
  4. Total LLM costs decrease by 60-70% compared to single-model baseline
  5. User can override model selection manually when needed
**Plans**: TBD

Plans:
- [ ] 06-01: TBD

### Phase 7: Skills & Tools
**Goal**: Assistant executes tasks through MCP-integrated tools with permission control
**Depends on**: Phase 6
**Requirements**: SKILL-01, SKILL-02, SKILL-03, SKILL-04, SKILL-05, SKILL-06
**Success Criteria** (what must be TRUE):
  1. Skills.sh integrates with assistant for tool execution
  2. Assistant discovers and registers available MCP tools automatically
  3. Tool inputs validate against JSON schemas before execution
  4. Permission system controls which tools assistant can access
  5. Tool errors return structured error objects without crashing
  6. All tool calls log to audit trail for review
**Plans**: TBD

Plans:
- [ ] 07-01: TBD

### Phase 8: Research Capabilities
**Goal**: Assistant completes research tasks through iterative question-clarification loops
**Depends on**: Phase 7
**Requirements**: RES-01, RES-02, RES-03, RES-04, RES-05
**Success Criteria** (what must be TRUE):
  1. User assigns research task through dedicated interface
  2. Assistant asks clarifying questions until definition of done is clear
  3. Research loop iterates (research -> present findings -> refine -> repeat) until complete
  4. Long-running research tasks persist across sessions
  5. Research outputs save to workspace and are retrievable later
**Plans**: TBD

Plans:
- [ ] 08-01: TBD

### Phase 9: Traceability
**Goal**: Users can audit what assistant did, why, and where information came from
**Depends on**: Phase 8
**Requirements**: TRACE-01, TRACE-02, TRACE-03, TRACE-04
**Success Criteria** (what must be TRUE):
  1. Audit log records every action assistant takes (file writes, API calls, etc.)
  2. Reasoning chains show why assistant made specific decisions
  3. Data provenance tracks source of every piece of information used
  4. User can query trace history to understand assistant behavior
**Plans**: TBD

Plans:
- [ ] 09-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Security & Foundation | 0/6 | Planned | - |
| 2. Core Interface | 0/0 | Not started | - |
| 3. Memory System | 0/0 | Not started | - |
| 4. Workspace Management | 0/0 | Not started | - |
| 5. Vector Memory | 0/0 | Not started | - |
| 6. Model Switching | 0/0 | Not started | - |
| 7. Skills & Tools | 0/0 | Not started | - |
| 8. Research Capabilities | 0/0 | Not started | - |
| 9. Traceability | 0/0 | Not started | - |
