# Phase 8 Plan 02: Deterministic Demo Services Summary

**A deterministic ambient demo world, a repeatable hero-auction service, and guarded internal endpoints now reset and drive the Phase 8 walkthrough without manual SQL edits.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-04-18T20:42:30Z
- **Completed:** 2026-04-18T20:56:12Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments
- Added a shared demo-service layer that can reseed a tiny ambient world, prepare a hero auction under a real seller membership, inject a competitor bid, trigger ending-soon, and force the close path.
- Added a server-only runtime repository that rebuilds the ambient world idempotently and reuses the real auction, notification, settlement, and fulfillment paths instead of shortcutting rows into impossible states.
- Added guarded internal endpoints plus env wiring so demo prep can be driven from a seller session, local curl commands, or the production VM with an explicit demo token.
- Extended automated coverage to prove reseed idempotence, seller-scoped hero prep, competitor bidding through the real bid dependency, and force-close behavior through the shared overdue-auction path.

## Files Created/Modified
- `.env.example` - Documents the demo-mode toggle and optional control token.
- `lib/demo/config.ts` - Centralizes demo-mode env checks and stable prefixes.
- `lib/demo/service-shared.ts` - Pure demo blueprint and orchestration layer.
- `lib/demo/service.ts` - Server-only runtime repository for ambient data replacement and hero-auction control.
- `lib/demo/auth.ts` - Guards demo endpoints behind demo mode plus session/token authorization.
- `app/api/internal/demo/seed/route.ts` - Ambient-world reseed endpoint.
- `app/api/internal/demo/hero/route.ts` - Hero-auction prepare/status endpoint.
- `app/api/internal/demo/hero/outbid/route.ts` - Competitor outbid trigger endpoint.
- `app/api/internal/demo/hero/ending-soon/route.ts` - Ending-soon trigger endpoint.
- `app/api/internal/demo/hero/close/route.ts` - Force-close trigger endpoint.
- `tests/lib/demo/service.test.ts` - Coverage for idempotence, seller scope, outbid injection, and close-path reuse.

## Decisions Made
- Kept the ambient demo accounts as data-only background actors while anchoring the interactive hero flow to a real seller membership, preserving the existing Google-only auth model.
- Allowed the operator endpoints to authorize either through a signed-in seller session or an explicit demo token so the same tooling works in-app, from local terminals, and from the single production VM.
- Kept the seeded world intentionally tiny: two businesses, two ambient shoppers, and four purposeful states instead of a broad fake marketplace.

## Deviations from Plan

None - plan executed as specified.

## Issues Encountered

None beyond normal implementation work. The demo-service unit tests passed once the shared runtime split from Plan 08-01 was already in place.

## Next Phase Readiness

- The backend contract for demo prep and scripted triggers is stable and fully wired for the seller-facing control surface.
- Demo mode still needs the UI layer and a real browser walkthrough before Phase 8 can be called complete.

---
*Phase: 08-notifications-demo-polish*
*Completed: 2026-04-18*
