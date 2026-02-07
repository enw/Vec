# Phase 3: Memory System - Context

**Gathered:** 2026-02-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Assistant remembers conversation context and user preferences across sessions through profile files (SOUL.md, USER.md, IDENTITY.md, AGENTS.md, HEARTBEAT.md) and thread memory management. The system provides persistent memory and context awareness without requiring long-running processes. Vector search (Phase 5) and workspace isolation/versioning (Phase 4) are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Profile Structure & Lifecycle
- Create all profiles on first app launch from template .md files (show minimalist defaults with structure)
- Template files stored as .md files in repo (not embedded in code) for easy editing without recompiling
- Profiles live in workspace root (e.g., `~/.local/share/vec/workspaces/foo/SOUL.md` alongside `conversations.jsonl`)
- Hybrid profile scope:
  - **Global** (shared across all workspaces): `USER.md`, `IDENTITY.md`
  - **Per-workspace**: `SOUL.md`, `AGENTS.md`, `HEARTBEAT.md`
- Profile schemas must be versioned (include version field like `schema: v1`) for migration support across vec versions

### Thread Memory Boundaries
- Memory limited by **token count** (e.g., max 100k tokens) — efficient use of context window
- When limit reached: **summarize old message blocks** (replace old messages with summaries to preserve context)
- Token limit is **hardcoded** (not user-configurable) — simpler, one less config to manage
- Summarization happens **proactively as background task** when approaching limit — no latency during conversation

### Profile Content & Usage
- **SOUL.md**: Personality traits & communication style (how assistant talks, responds, behaves for this workspace)
- **USER.md**: Both technical preferences (languages, tools, patterns) AND work style (communication prefs, explanation depth)
- **HEARTBEAT.md**: Single current task agent is working on right now — ephemeral status for long-running tasks (NOT a log/journal)
- **HEARTBEAT.md updates**: At start/end of task + periodic check-ins during long tasks

### Architecture & Persistence
- **Core principle**: System is stateless per-invocation — no long-running process, each vec run reads from disk, operates, writes back
- **Concurrency**: Lockfile prevents concurrent access to same workspace (only one vec process per workspace at a time)
- **Abnormal termination**: Recovery validation on startup (verify profiles/state files valid, repair/recreate if corrupted)
- **Atomic writes**: Write to temp file, then atomic rename to actual file (standard safe pattern)

### Claude's Discretion
- Profile update mechanism (explicit commands vs assistant proposes/user approves)
- Profile file format (pure Markdown vs YAML frontmatter + Markdown)
- When to write profiles to disk (after every change, per conversation turn, or graceful shutdown)

</decisions>

<specifics>
## Specific Ideas

- HEARTBEAT.md is for **long-running tasks** — real-time status of what agent is actively working on
- System must be **super resilient** — not a single persistent app, flexible architecture
- Future webview for status will be separate running process, but core vec is invocation-based
- No persistent process to crash — filesystem is source of truth

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-memory-system*
*Context gathered: 2026-02-06*
