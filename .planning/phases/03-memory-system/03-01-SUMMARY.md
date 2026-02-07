---
phase: 03-memory-system
plan: 01
subsystem: memory
tags: [zod, gray-matter, proper-lockfile, write-file-atomic, yaml, profiles]

# Dependency graph
requires:
  - phase: 01-security-and-foundation
    provides: TypeScript setup, security infrastructure
  - phase: 02-core-interface
    provides: XDG-compliant workspace paths
provides:
  - Profile schemas with v1 versioning (SOUL, AGENTS, USER, IDENTITY, HEARTBEAT)
  - ProfileManager with atomic writes and file locking
  - Template .md files with YAML frontmatter
  - Path resolution for global vs workspace profiles
affects: [03-02, 03-03, memory-integration, workspace-initialization]

# Tech tracking
tech-stack:
  added: [gray-matter, proper-lockfile, write-file-atomic, @types/proper-lockfile, @types/write-file-atomic]
  patterns: [YAML frontmatter with schema versioning, atomic file writes with locking, template resolution via import.meta.url]

key-files:
  created:
    - src/memory/profiles/schemas.ts
    - src/memory/ProfileManager.ts
    - src/memory/index.ts
    - src/memory/profiles/templates/SOUL.md
    - src/memory/profiles/templates/AGENTS.md
    - src/memory/profiles/templates/USER.md
    - src/memory/profiles/templates/IDENTITY.md
    - src/memory/profiles/templates/HEARTBEAT.md
  modified:
    - src/workspace/paths.ts
    - package.json

key-decisions:
  - "YAML frontmatter for profiles (gray-matter) over pure Markdown for structured versioning"
  - "Template files as .md in repo (not embedded strings) for easy editing"
  - "Global profiles ($XDG_DATA_HOME/vec/profiles/) vs workspace profiles ($XDG_DATA_HOME/vec/workspaces/{name}/)"
  - "proper-lockfile for directory locking with stale detection (10s threshold)"
  - "import.meta.url template resolution for dist compatibility"

patterns-established:
  - "Profile schema versioning with z.literal('v1') for migration support"
  - "PROFILE_SCOPE constant maps ProfileType to 'global' or 'workspace'"
  - "ProfileManager.ensureProfile() idempotent - creates from template if missing"
  - "Lock on parent directory during writes with retry logic"
  - "Template resolution via fileURLToPath(import.meta.url) for both dev and dist"

# Metrics
duration: 2min
completed: 2026-02-07
---

# Phase 3 Plan 1: Memory System Foundation Summary

**Profile schemas with v1 versioning, ProfileManager with atomic writes/locking, and 5 YAML frontmatter templates for SOUL/AGENTS/USER/IDENTITY/HEARTBEAT**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-07T17:15:22Z
- **Completed:** 2026-02-07T17:17:39Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- Zod schemas for all 5 profile types with schema:v1 versioning
- ProfileManager class handling load/save/validate/ensure operations
- Atomic writes with proper-lockfile (stale detection, retry logic)
- Template .md files stored as actual files in repo (not embedded in code)
- Path helpers distinguish global ($XDG_DATA_HOME/vec/profiles/) from workspace profiles

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and create profile schemas** - `2f343cf` (feat)
2. **Task 2: Create ProfileManager with atomic writes and locking** - `40db4e3` (feat)

## Files Created/Modified

- `src/memory/profiles/schemas.ts` - Zod schemas for 5 profile types with PROFILE_SCOPE/PROFILE_FILENAME constants
- `src/memory/ProfileManager.ts` - Load/save/validate/ensure profiles with locking and atomic writes
- `src/memory/index.ts` - Barrel export for ProfileManager and schemas
- `src/memory/profiles/templates/SOUL.md` - Default workspace personality template
- `src/memory/profiles/templates/AGENTS.md` - Default agent configuration template
- `src/memory/profiles/templates/USER.md` - Default user preferences template
- `src/memory/profiles/templates/IDENTITY.md` - Default user identity template
- `src/memory/profiles/templates/HEARTBEAT.md` - Default task status template
- `src/workspace/paths.ts` - Added getGlobalProfilesDir/getGlobalProfilePath/getWorkspaceProfilePath helpers
- `package.json` - Added dependencies: gray-matter, proper-lockfile, write-file-atomic, type definitions

## Decisions Made

1. **YAML frontmatter over pure Markdown** - Structured data with gray-matter enables versioning/migration while staying human-editable
2. **Template files as .md in repo** - Can edit templates without recompiling, clearer than embedded strings
3. **Global vs workspace profile split** - USER.md/IDENTITY.md global (shared across workspaces), others per-workspace
4. **proper-lockfile for concurrency** - Handles stale locks (10s threshold), network filesystems, race conditions
5. **import.meta.url for template resolution** - Works in both dev (ts) and dist (js) without CWD dependency

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed missing type definitions**
- **Found during:** Task 2 (TypeScript compilation)
- **Issue:** proper-lockfile and write-file-atomic lack built-in types, causing TS7016 errors
- **Fix:** Installed @types/proper-lockfile and @types/write-file-atomic
- **Files modified:** package.json, pnpm-lock.yaml
- **Verification:** npx tsc --noEmit passes with no errors
- **Committed in:** 40db4e3 (Task 2 commit)

**2. [Rule 3 - Blocking] Removed premature exports from index.ts**
- **Found during:** Task 2 (TypeScript compilation)
- **Issue:** src/memory/index.ts had exports for TokenCounter/TokenAwareLoader (don't exist yet, likely from future plan)
- **Fix:** Removed those export lines
- **Files modified:** src/memory/index.ts
- **Verification:** Build succeeds
- **Committed in:** 40db4e3 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both required for compilation. No scope creep.

## Issues Encountered

None - plan executed smoothly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for:**
- Plan 03-02: Token counting and conversation memory management (uses ProfileManager for HEARTBEAT updates)
- Plan 03-03: Profile integration into TUI (loads SOUL/USER profiles for system prompt)

**Blockers:** None

**Notes:**
- ProfileManager tested with quick verification script (load/save/validate all profiles)
- Global profiles resolve to $XDG_DATA_HOME/vec/profiles/ as decided in research
- Workspace profiles resolve to $XDG_DATA_HOME/vec/workspaces/{name}/
- Template resolution uses import.meta.url so dist/ build can find templates

## Self-Check: PASSED

All files created and all commits verified.

---
*Phase: 03-memory-system*
*Completed: 2026-02-07*
