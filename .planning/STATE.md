# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-18)

**Core value:** Auctions actually clear at-risk inventory before expiry — bids land, winners pay, items get to buyers.
**Current focus:** Phase 2 — Auth & Onboarding

## Current Position

Phase: 2 of 8 (Auth & Onboarding)
Plan: Not planned yet
Status: Ready for planning
Last activity: 2026-04-18 — Completed Phase 1 foundation and hosted Neon migration

Progress: ███░░░░░░░ 38%

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: 10 min
- Total execution time: 31 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundation | 3 | 31 min | 10 min |

**Recent Trend:**
- Last 5 plans: 11 min, 11 min, 9 min
- Trend: Stable

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Phase 1 foundation stack is Next.js App Router + Neon + Drizzle
- Runtime uses `DATABASE_URL`, while migrations prefer `DATABASE_URL_UNPOOLED` when a direct Neon connection is available
- Turbopack root is pinned to the repository to avoid parent-workspace inference
- Core marketplace tables are split by domain module instead of one schema file
- Money is modeled in integer cents and lifecycle state is modeled with enums across auctions, settlements, and fulfillment
- Phase 1 shell uses server-first routes with small client-only PWA helpers
- PWA icons are generated through an app route, and the service worker stays navigation-only with no-store headers
- The live Vercel project now has Neon environment variables attached, and the initial migration is applied on hosted Postgres

### Deferred Issues

- Research and plan Phase 2 auth and onboarding
- Perform a manual phone-sized visual review if you want a human sign-off beyond the yolo run

### Pending Todos

- `npm audit` reports 4 moderate transitive vulnerabilities in the current dependency graph; not blocking for Phase 1 execution
- Rotate the Neon credentials that were pasted into chat and written to ignored local env files during setup

### Blockers/Concerns

None currently.

## Session Continuity

Last session: 2026-04-18
Stopped at: Phase 7 context gathered
Resume file: .planning/phases/07-fulfillment/07-CONTEXT.md
