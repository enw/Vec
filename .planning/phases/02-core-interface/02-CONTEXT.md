# Phase 2: Core Interface - Context

**Gathered:** 2026-02-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Users converse with assistant through CLI/TUI interface with streaming responses. Users can start conversations, receive real-time streaming responses, and manage isolated workspaces (named or numbered). Context persists within workspaces across sessions.

</domain>

<decisions>
## Implementation Decisions

### Interface Mode & Switching
- Default to TUI (full-screen interface) on launch
- Auto-fallback to CLI if terminal lacks capabilities (colors, dimensions)
- Status bar shows current mode and workspace
- Mode switching mechanism: Claude's discretion

### Conversation Display
- Always show timestamps on messages
- All conversation history visible and scrollable (no arbitrary limits)
- User vs assistant visual distinction: Claude's discretion
- Long message handling: Claude's discretion

### Streaming Behavior
- Streaming granularity (token vs word vs sentence): Claude's discretion
- Ctrl+C cancels streaming response
- Cancelled responses kept as partial messages with '[cancelled]' marker
- Spinner/loading indicator while waiting for first token

### Workspace Invocation
- Create/switch workspace via launch flag: `vec -w workspace-name`
- Workspace naming: filesystem-safe only (alphanumeric + hyphens/underscores, no spaces)
- Numbered workspaces created via `vec -w` (no name argument)
- Default behavior when no flag: resume last active workspace

### Claude's Discretion
- Mode switching mechanism (launch flag, keyboard shortcut, or both)
- User vs assistant message visual distinction
- Long message display strategy
- Streaming granularity (token/word/sentence)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for TUI frameworks and streaming implementations.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-core-interface*
*Context gathered: 2026-02-06*
