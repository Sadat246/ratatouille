# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-18)

**Core value:** Auctions actually clear at-risk inventory before expiry — bids land, winners pay, items get to buyers.
**Current focus:** Phase 6 — Payments (Stripe Test) [executing out-of-order ahead of Phase 5 per user direction]

## Current Position

Phase: 6 of 8 (Payments — Stripe Test)
Plan: 06-01 (Wave 1 foundation)
Status: Executing
Last activity: 2026-04-18 — Phase 6 execution started (out-of-order ahead of Phase 5 at user direction; Phase 6 deps on Phase 4, which is complete). 6 plans across 4 waves.

Progress: ███████░░░ 50%

## Performance Metrics

**Velocity:**
- Total plans completed: 13
- Average duration: Partially tracked
- Total execution time: 31 min recorded in Phase 1; later phases completed in the same session but did not capture per-plan timings

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundation | 3 | 31 min | 10 min |
| 2. Auth & Onboarding | 4 | Timing not captured | n/a |
| 3. Listing Creation | 3 | Timing not captured | n/a |
| 4. Auction Engine | 3 | Timing not captured | n/a |

**Recent Trend:**
- Last 5 plans: Timing not captured at plan granularity
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
- Phase 3 listing creation now runs through a single-screen seller desk with accepted-photo review before upload
- Listing drafts persist seller field state plus accepted photo blobs in IndexedDB by business membership
- Listing uploads use Cloudinary when configured with a local public-upload fallback, and OCR uses Vision when configured with manual-entry fallback states
- OCR remains advisory and publish still requires a seller-confirmed package date before the listing and auction rows are created
- Phase 4 now uses an interactive Neon transaction path for bids, buyouts, and auction finalization while the existing HTTP client remains the default read/auth path
- Auction close semantics now live in one shared service, with a 15-second server-started safety sweep and deterministic settlement snapshots
- Consumers now have persisted mock card-on-file state, and push subscriptions have a dedicated table for upcoming notification delivery
- The consumer shell now exposes real live-auction Home, My Bids, and Alerts routes, while detail pages poll the server every two seconds for authoritative state refresh
- Seller operations now live in dedicated Desk, Live, and Outcomes surfaces, and optional push delivery hooks fire only after auction commits succeed

### Deferred Issues

- Perform a manual phone-sized visual review if you want a human sign-off beyond the yolo run

### Pending Todos

- `npm audit` reports 4 moderate transitive vulnerabilities in the current dependency graph; not blocking current roadmap execution
- Rotate the Neon credentials that were pasted into chat and written to ignored local env files during setup
- Generate VAPID keys and configure `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, and `VAPID_PRIVATE_KEY` if you want browser push delivery to run outside graceful no-op mode

### Blockers/Concerns

- Local runtime verification still lacks real Google OAuth, Cloudinary, and Vision credentials, so third-party sign-in plus managed upload/OCR provider round-trips remain unproven until those secrets are configured
- Auction closing still relies on the single-process safety sweep plus request-triggered refreshes; a durable per-auction scheduler remains a future hardening path if deployment topology changes

## Session Continuity

Last session: 2026-04-18
Stopped at: Phase 4 complete; Phase 5 is ready for planning
Resume file: .planning/ROADMAP.md
