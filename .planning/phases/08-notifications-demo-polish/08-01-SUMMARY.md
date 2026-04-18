# Phase 8 Plan 01: Notification Backend Summary

**One-shot ending-soon delivery now rides alongside the auction sweep, while consumer win and seller item-sold payloads are normalized through tested push builders.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-18T20:34:30Z
- **Completed:** 2026-04-18T20:42:23Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments
- Added persisted ending-soon dedup state directly to auctions and generated the next Drizzle migration.
- Refactored auction notification payload generation into shared, testable builders covering outbid, ending-soon, consumer win, and seller item-sold beats.
- Extended the existing server-side auction sweep so ending-soon notifications run automatically beside overdue auction settlement.

## Files Created/Modified
- `db/schema/auctions.ts` - Added `endingSoonNotifiedAt` to persist the one-shot ending-soon beat.
- `lib/auctions/pricing.ts` - Added the shared ending-soon timing window constant.
- `lib/auctions/sweeper.ts` - Runs ending-soon notification work after the overdue-auction close sweep.
- `lib/push/notify.ts` - Added runtime ending-soon selection/dispatch and consumes the new shared builders.
- `lib/push/notify-shared.ts` - Pure notification payload and routing builders for push behavior.
- `tests/lib/push/notify.test.ts` - Covers recipient routing, payload shape, and ending-soon gating behavior.
- `vitest.config.ts` - Adds a test alias for `server-only`.
- `tests/support/server-only.ts` - No-op stub used by Vitest.
- `drizzle/0006_open_nightmare.sql` - Migration for `ending_soon_notified_at`.
- `drizzle/meta/0006_snapshot.json` - Snapshot for the new migration.
- `drizzle/meta/_journal.json` - Registers migration `0006_open_nightmare`.

## Decisions Made
- Used a narrow `endingSoonNotifiedAt` timestamp on auctions instead of introducing a broader notification ledger; Phase 8 only needed durable one-shot dedup for the ending-soon beat.
- Normalized final seller outcome pushes to the explicit "Item sold" beat so the shipped payloads now match the roadmap language rather than auction-engine implementation detail.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Stubbed `server-only` in the Vitest resolver**
- **Found during:** Task 2 (Implement tested push helpers)
- **Issue:** The new notification tests failed immediately because `server-only` throws under the Node test runner.
- **Fix:** Added a Vitest alias to a no-op support module so server-only imports do not crash test-only module loading.
- **Files modified:** `vitest.config.ts`, `tests/support/server-only.ts`
- **Verification:** `npm run test`, `npm run lint`

**2. [Rule 3 - Blocking] Split pure notification builders away from env-bound DB imports**
- **Found during:** Task 2 (Implement tested push helpers)
- **Issue:** Importing the original notification module in tests also booted the database client, which failed without `DATABASE_URL`.
- **Fix:** Extracted pure payload/routing logic into `lib/push/notify-shared.ts` and kept runtime DB selection inside the server-only notification entrypoint.
- **Files modified:** `lib/push/notify.ts`, `lib/push/notify-shared.ts`, `tests/lib/push/notify.test.ts`
- **Verification:** `npm run test`, `npm run lint`

---

**Total deviations:** 2 auto-fixed (2 blocking), 0 deferred
**Impact on plan:** Both deviations were harness-level blockers needed to make the planned notification tests executable. No feature scope changed.

## Issues Encountered
- The first ending-soon implementation briefly marked auctions as notified and then re-checked the updated row, which would have suppressed every send. The runtime loop was corrected before closeout and re-verified with lint plus tests.

## Next Phase Readiness
- The notification backend now exposes the missing ending-soon beat and provides a deterministic server hook that the demo tooling can trigger in the next plan.
- VAPID env setup is still required for real browser delivery, but the backend behavior now degrades safely when those values are absent.

---
*Phase: 08-notifications-demo-polish*
*Completed: 2026-04-18*
