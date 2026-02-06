# Vec

## What This Is

A secure personal assistant with persistent memory accessible through messaging platforms. Inspired by OpenClaw but designed with security-first principles, better memory architecture, and extensible capabilities. v0 is a CLI/TUI agent for conversations in isolated workspaces; v1+ adds messaging integration, research, and advanced features.

## Core Value

Your personal assistant remembers context across sessions without leaking your sensitive data.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**v0 - Conversational Foundation:**
- [ ] CLI/TUI chat interface with single agent
- [ ] Thread memory (configurable: last X messages or all messages)
- [ ] Profile system (SOUL.md, AGENTS.md, USER.md, IDENTITY.md, HEARTBEAT.md)
- [ ] Stop and restart conversations in same workspace (persist state to disk)
- [ ] Create new named or numbered workspaces
- [ ] Memory and state explicitly written to disk
- [ ] Git versioning for workspace tracking
- [ ] Permission system preventing autonomous data leaks

**v1 - Extended Capabilities (deferred):**
- [ ] Messaging platform integration (WhatsApp, Signal, Delta Chat)
- [ ] Web interface
- [ ] Research tasks with wiggum-style loop (ask questions, clarify DoD, iterate to completion)
- [ ] Vector memory (Mastra-inspired: vector search over conversations/knowledge)
- [ ] Dynamic model switching (guided by prompts/task complexity)
- [ ] Skills integration via skills.sh
- [ ] Full traceability (actions, reasoning, data provenance)
- [ ] Task execution capabilities
- [ ] Network tracking
- [ ] Prioritization assistance

### Out of Scope

- Autonomous actions without explicit permission — OpenClaw leaked passwords when left running overnight; Vec requires user approval for sensitive operations
- Broad system permissions without user control — all access must be explicitly granted

## Context

Inspired by OpenClaw's messaging-based AI assistant approach and markdown memory structure (SOUL.md, AGENTS.md, USER.md, IDENTITY.md, HEARTBEAT.md, daily memory). OpenClaw had security vulnerabilities where autonomous operation led to data leaks. Vec addresses this with permission-based design.

Wiggum-style execution (Ralph loop from ghuntley.com/loop): iterative agent approach where orchestrator assigns goals, agent loops through tasks one at a time, returns work for refinement, treating code as malleable clay.

Logo concept: hand with an eye on it.

## Constraints

- **Tech stack**: TypeScript + pnpm — required for development
- **Security**: Permission-based actions, no autonomous data leaks — core design principle
- **Local-first**: Data and state stored locally on disk — privacy and user control

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| TypeScript + pnpm | Modern tooling, type safety, efficient package management | — Pending |
| Markdown-based profiles | Inspired by OpenClaw's approach, human-readable, version-controllable | — Pending |
| Git for workspace versioning | Built-in change tracking, familiar developer tooling | — Pending |
| Permission system for sensitive ops | Prevent OpenClaw-style data leaks from autonomous actions | — Pending |
| CLI/TUI for v0 | Simplest interface, fastest path to working prototype | — Pending |
| Workspace isolation (.vec/workspace) | Clean separation of contexts, easy to manage multiple projects | — Pending |

---
*Last updated: 2026-02-05 after initialization*
