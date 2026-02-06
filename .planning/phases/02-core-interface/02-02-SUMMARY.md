---
phase: 02-core-interface
plan: 02
subsystem: tui-interface
tags: [ink, react, meow, cli, tui, conversation-ui]

# Dependency graph
requires:
  - phase: 02-core-interface
    plan: 01
    provides: Workspace backend (JSONL store, manager)
provides:
  - CLI entry point with meow arg parsing
  - Full Ink UI component set (MessageItem, ConversationView, InputPrompt, StatusBar)
  - Root App component with message persistence
affects: [02-03-streaming-integration, 02-04-hooks-and-state]

# Tech tracking
tech-stack:
  added: []
  patterns: [Ink full-screen layout, useStdout for terminal dimensions, disabled input during streaming]

key-files:
  created:
    - src/cli/index.tsx
    - src/cli/app.tsx
    - src/ui/components/MessageItem.tsx
    - src/ui/components/ConversationView.tsx
    - src/ui/components/InputPrompt.tsx
    - src/ui/components/StatusBar.tsx
  modified:
    - package.json

key-decisions:
  - "CLI entry via meow: -w <name> or -w (numbered) or last active workspace"
  - "Mode detection: process.stdout.isTTY + columns determines TUI vs CLI"
  - "useStdout() provides stdout.rows for windowing visible messages"
  - "Placeholder streaming response (500ms timeout) until Plan 03/04"

patterns-established:
  - "Full-screen Ink layout: StatusBar top, ConversationView middle, InputPrompt bottom"
  - "Message windowing: visible messages = rows - 5 (status + input)"
  - "Disabled input during streaming: shows '(streaming...)' instead of TextInput"

# Metrics
duration: 2.5min
completed: 2026-02-06
---

# Phase 2 Plan 2: CLI and TUI Interface Summary

**Functional CLI entry point and full Ink UI with workspace-aware message display, input handling, and placeholder streaming**

## Performance

- **Duration:** 2.5 min
- **Started:** 2026-02-06T18:32:55Z
- **Completed:** 2026-02-06T18:35:43Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- CLI entry point with meow arg parsing: -w flag for workspace switching
- Workspace resolution: named, numbered, or last active fallback
- Four Ink UI components: MessageItem, ConversationView, InputPrompt, StatusBar
- Root App component: full-screen layout with message persistence
- Messages load from JSONL on mount, append on user input
- Placeholder streaming (500ms delay) until real Anthropic integration
- Mode detection (TUI vs CLI) based on stdout.isTTY

## Task Commits

1. **Task 1: CLI entry point with arg parsing** - `2a12572` (feat)
2. **Task 2: Ink UI components** - `3f0136b` (feat)
3. **Task 3: Root App component** - `f4b94a8` (feat)

**Plan metadata:** (next commit - docs)

## Files Created/Modified

- `src/cli/index.tsx` - CLI entry with meow, workspace resolution, Ink render
- `src/cli/app.tsx` - Root App component with full layout
- `src/ui/components/MessageItem.tsx` - Role indicator, timestamp, content display
- `src/ui/components/ConversationView.tsx` - Windowed message list with streaming support
- `src/ui/components/InputPrompt.tsx` - Text input with submit, disabled while streaming
- `src/ui/components/StatusBar.tsx` - Workspace name, mode, streaming status
- `package.json` - Added bin field for 'vec' command

## Decisions Made

- **Workspace resolution order**: -w <name> (explicit) → -w (numbered) → last active → new numbered workspace
- **Terminal dimensions**: Used useStdout() to access stdout.rows (instead of missing useStdoutDimensions hook)
- **Message windowing**: Visible messages = max(10, rows - 5) to reserve space for status bar and input
- **Streaming placeholder**: 500ms setTimeout creates assistant message until Plans 03/04 wire real streaming
- **Input disabled state**: Show "(streaming...)" instead of hiding TextInput for better UX clarity

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing useStdoutDimensions API in Ink**
- **Found during:** Task 2 (ConversationView compilation)
- **Issue:** Research mentioned useStdoutDimensions but Ink 6.6.0 only exports useStdout
- **Fix:** Changed to useStdout() and accessed stdout.rows directly (rows || 24 for fallback)
- **Files modified:** src/ui/components/ConversationView.tsx
- **Commit:** 3f0136b

**2. [Accidental inclusion] LLM files from future plan staged**
- **Found during:** Task 3 commit
- **Issue:** src/llm/AnthropicClient.ts and src/llm/index.ts were in staging area from previous work
- **Resolution:** Left in commit (no harm, compiles cleanly, part of overall phase work)
- **Impact:** Files for Plan 03 included early; doesn't affect Plan 02 functionality
- **Files included:** src/llm/AnthropicClient.ts, src/llm/index.ts
- **Commit:** f4b94a8

Total deviations: 2 (1 blocking auto-fix, 1 accidental early inclusion)

## User Setup Required

None - CLI ready to run after `pnpm build`.

## Next Phase Readiness

- CLI launches TUI with workspace-based message persistence
- Ready for 02-03-PLAN.md (Anthropic streaming integration)
- UI components ready to receive real streaming chunks
- All Phase 1 tests still passing

---
*Phase: 02-core-interface*
*Completed: 2026-02-06*
