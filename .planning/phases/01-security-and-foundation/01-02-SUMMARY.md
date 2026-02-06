---
phase: 01-security-and-foundation
plan: 02
subsystem: security
tags: [permission-engine, security, minimatch, audit, glob-patterns]

# Dependency graph
requires:
  - phase: 01-01
    provides: Config system, audit logger, shared types
provides:
  - Permission engine with rule-based approval flow
  - Glob pattern matching for permission rules
  - User prompt interface for interactive approval
  - Automatic rule persistence after approval
affects: [01-03, 01-04, 01-05, 01-06]

# Tech tracking
tech-stack:
  added: []
  patterns: [hybrid approval flow, glob-based rule matching, default auto-deny]

key-files:
  created: [src/permission/rules.ts, src/permission/engine.ts, src/permission/prompts.ts, src/permission/index.ts]
  modified: []

key-decisions:
  - "Default prompt function auto-denies for safe non-interactive behavior"
  - "Hybrid approval flow: check rules first, prompt if no match, offer rule creation"
  - "Glob patterns for flexible rule matching (e.g., /tmp/* matches all temp files)"

patterns-established:
  - "PermissionEngine as central gate for all sensitive operations"
  - "ApprovalResponse with createRule flag for optional rule persistence"
  - "Two-level verbosity (minimal/detailed) for permission prompts"

# Metrics
duration: 1.8min
completed: 2026-02-06
---

# Phase 01 Plan 02: Permission Engine Summary

**Hybrid approval flow with glob-based rule matching, user prompts, and automatic rule persistence**

## Performance

- **Duration:** 1.8 min
- **Started:** 2026-02-06T13:49:20Z
- **Completed:** 2026-02-06T13:51:07Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Permission engine blocks operations without matching rule or explicit user approval
- Glob patterns enable flexible rules (e.g., "/tmp/*" matches all temp files)
- Approved permissions can be persisted as rules for future auto-approval
- All permission decisions audit-logged via Pino

## Task Commits

Each task was committed atomically:

1. **Task 1: Rule matching and storage** - `ec15504` (feat)
2. **Task 2: Permission engine with hybrid approval flow** - `b828c8a` (feat)

## Files Created/Modified
- `src/permission/rules.ts` - matchRule() with glob patterns, addRule() with UUID generation, removeRule(), isExpired()
- `src/permission/engine.ts` - PermissionEngine class with check/checkOrThrow, PermissionDeniedError, createPermissionEngine() helper
- `src/permission/prompts.ts` - ApprovalResponse interface, PermissionPromptFn type, defaultPromptFn (auto-deny), formatPermissionPrompt()
- `src/permission/index.ts` - Re-exports for all permission system components

## Decisions Made
- **defaultPromptFn auto-denies** - Safe default for non-interactive contexts; consumers inject custom prompts for interactive use
- **formatPermissionPrompt with verbosity levels** - Supports minimal ("Allow X on Y? [y/N/r]") and detailed (with risk assessment)
- **Rule pattern from user or exact target** - If user doesn't specify pattern when creating rule, use exact target as pattern

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed without blockers.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Plan 03 (Input validation/trust boundaries):**
- Permission engine operational and ready to gate file operations
- Rule persistence integrated with config system
- Audit logging captures all permission decisions

**Validation checks:**
- ✓ TypeScript compiles with zero errors
- ✓ PermissionEngine can be instantiated with default config
- ✓ check() returns false with no rules and default (auto-deny) prompt
- ✓ Rules can be added with glob patterns and matched against targets
- ✓ All permission decisions produce audit log entries via Pino

---
*Phase: 01-security-and-foundation*
*Completed: 2026-02-06*
