---
phase: 01-security-and-foundation
plan: 03
subsystem: validation
tags: [zod, input-validation, branded-types, sanitization, security]

# Dependency graph
requires:
  - phase: 01-01
    provides: Branded types (TrustedInput, UntrustedInput), InputSource enum, audit logging
provides:
  - Input classifier that brands input by source (USER_COMMAND trusted, others untrusted)
  - Runtime metadata tracking via ClassifiedInput interface
  - Zod schemas for all input types with security constraints
  - Sanitization functions that promote untrusted → trusted after validation
  - Type-safe promotion guards (asTrusted/asUntrusted)
affects: [01-04, 01-05, 01-06, file operations, network operations, any external input handling]

# Tech tracking
tech-stack:
  added: []
  patterns: [input classification by source, validation-based trust promotion, runtime trust metadata]

key-files:
  created: [src/validation/classifier.ts, src/validation/schemas.ts, src/validation/sanitizer.ts, src/validation/index.ts]
  modified: []

key-decisions:
  - "ClassifiedInput interface provides runtime trust metadata (branded types are compile-time only)"
  - "sanitizeAndTrust() is THE canonical function for promoting untrusted to trusted"
  - "USER_COMMAND is only trusted source - all external input (files, network, env) untrusted by default"
  - "Null byte protection in file paths prevents injection attacks"
  - "Length limits on all schemas prevent DoS attacks"

patterns-established:
  - "All external input must be classified with classifyInput(input, source)"
  - "Trust promotion requires Zod validation via sanitizeAndTrust()"
  - "Convenience functions (sanitizeFileContent, sanitizeFilePath) for common cases"

# Metrics
duration: 1.3min
completed: 2026-02-06
---

# Phase 01 Plan 03: Input Classification and Validation Summary

**Zod-validated input classifier with branded types - classifies by source, validates at trust boundaries, promotes untrusted → trusted only after validation**

## Performance

- **Duration:** 1.3 min
- **Started:** 2026-02-06T13:36:38Z
- **Completed:** 2026-02-06T13:37:56Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Input classifier correctly brands USER_COMMAND as trusted, all external sources as untrusted
- Runtime ClassifiedInput interface tracks trust status (branded types alone insufficient)
- Zod schemas enforce security constraints: null byte prevention, length limits, content validation
- sanitizeAndTrust() provides single canonical path for untrusted → trusted promotion

## Task Commits

Each task was committed atomically:

1. **Task 1: Input classifier with branded types** - `6dc1902` (feat)
2. **Task 2: Validation schemas and sanitizer** - `184119d` (feat)

## Files Created/Modified
- `src/validation/classifier.ts` - classifyInput() brands by source, asTrusted()/asUntrusted() guards
- `src/validation/schemas.ts` - Zod schemas for commands, files, network responses, env vars
- `src/validation/sanitizer.ts` - sanitize(), safeSanitize(), sanitizeAndTrust() for trust promotion
- `src/validation/index.ts` - Re-exports all validation functions

## Decisions Made

**ClassifiedInput interface for runtime metadata:**
- Branded types provide compile-time safety but no runtime tracking
- ClassifiedInput wraps value with source and trusted flag for runtime checks
- Avoids complexity of WeakSet tracking or Symbol properties

**Zod issues vs errors:**
- Fixed logging to use `result.error.issues` (Zod API) instead of `.errors`
- Caught during compilation, fixed before commit

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**TypeScript compilation error in safeSanitize():**
- **Issue:** Used `result.error.errors` instead of Zod's actual API `result.error.issues`
- **Resolution:** Changed to correct property name, compilation passed
- **Committed in:** 184119d (Task 2 commit)

Standard API usage correction, not a deviation from plan scope.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Plans 04-06 (Egress controls, secret scanning, token monitoring):**
- Input validation system ready to classify all external content
- Trust boundaries enforced via Zod schemas at validation points
- Sanitization functions available for file operations and network calls

**Validation checks:**
- ✓ TypeScript compiles with zero errors
- ✓ classifyInput(_, USER_COMMAND) returns trusted classification
- ✓ classifyInput(_, FILE_CONTENT) returns untrusted classification
- ✓ sanitizeAndTrust() validates with schema before promoting to TrustedInput
- ✓ File path schema prevents null byte injection
- ✓ All schemas enforce length limits for DoS prevention

---
*Phase: 01-security-and-foundation*
*Completed: 2026-02-06*
