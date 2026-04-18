# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-18)

**Core value:** Auctions actually clear at-risk inventory before expiry — bids land, winners pay, items get to buyers.
**Current focus:** Phase 3 — Listing Creation

## Current Position

Phase: 3 of 8 (Listing Creation)
Plan: Not started
Status: Ready to plan
Last activity: 2026-04-18 — Phase 2 complete, transitioned to Phase 3

Progress: ███░░░░░░░ 25%

## Performance Metrics

**Velocity:**
- Total plans completed: 7
- Average duration: Partially tracked
- Total execution time: 31 min recorded in Phase 1; Phase 2 completed in the same session but did not capture per-plan timings

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundation | 3 | 31 min | 10 min |
| 2. Auth & Onboarding | 4 | Timing not captured | n/a |

**Recent Trend:**
- Last 5 plans: Phase 2 timing not captured at plan granularity
- Trend: Unclear

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
- Phase 2 auth uses Auth.js v5 beta with the Drizzle adapter and a single Google provider
- The main user table now carries role and onboarding state, while consumer-only data lives in a dedicated consumer profile table
- Public auth now resolves through role-specific entry pages plus a shared callback handoff
- Consumer onboarding persists shopper location and delivery data through a dedicated multi-step wizard and server action
- Business onboarding now creates geocoded storefront data, unique slugs, and owner memberships transactionally
- Protected shopper and seller shells are now enforced through proxy redirects plus server-side role checks

### Deferred Issues

- Perform a manual phone-sized visual review if you want a human sign-off beyond the yolo run

### Pending Todos

- `npm audit` reports 4 moderate transitive vulnerabilities in the current dependency graph; not blocking current roadmap execution
- Rotate the Neon credentials that were pasted into chat and written to ignored local env files during setup

### Blockers/Concerns

- Local runtime verification still lacks real Google OAuth and Mapbox credentials, so third-party sign-in and geocoding round-trips remain unproven until those secrets are configured

## Session Continuity

Last session: 2026-04-18
Stopped at: Phase 2 complete; Phase 3 is ready for planning
Resume file: .planning/ROADMAP.md
