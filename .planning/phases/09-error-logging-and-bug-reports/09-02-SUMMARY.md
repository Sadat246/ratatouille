# Phase 9 Plan 02: Client Telemetry And Widget Summary

**Phase 9 now has a global client action buffer, on-demand screenshot capture with redaction, and a root-mounted floating bug-report widget that is available across the entire app.**

## Performance

- **Duration:** 11 min
- **Started:** 2026-04-18T23:00:00Z
- **Completed:** 2026-04-18T23:11:00Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments
- Added a global client runtime that automatically tracks the last ten high-signal events: initial page view, router transitions, click/tap intents, form submits, same-origin mutation/API outcomes, window errors, and unhandled promise rejections.
- Added an on-demand screenshot helper built on `html2canvas` with viewport-only capture, widget exclusion, form-field redaction, and graceful fallback when capture is unavailable.
- Added a warm, support-style floating bug-report widget mounted from the root layout so it appears on signed-out, onboarding, shopper, and seller routes without touching the already-dirty shell files.
- Added tests for the pure client-side telemetry helpers and verified that the new widget path passes lint, tests, and production build.

## Files Created/Modified
- `package.json` / `package-lock.json` - Added the explicit `html2canvas` dependency for screenshot capture.
- `instrumentation-client.ts` - Bootstraps bug-report telemetry before hydration and records router transitions.
- `lib/bug-reports/client-runtime.ts` - Global ring buffer, event listeners, and request-tracking logic.
- `lib/bug-reports/screenshot.ts` - Viewport capture and clone-time redaction helper.
- `components/bug-report/report-widget.tsx` - Floating bubble, preview card, action list, description field, and submit flow.
- `app/layout.tsx` - Root mount point for the widget.
- `app/globals.css` - Shared form-font inheritance needed by the new report panel.
- `tests/lib/bug-reports/runtime.test.ts` - Coverage for buffer truncation and request-filter logic.

## Decisions Made
- Kept screenshot capture on-demand and dynamically imported so the app does not pay the `html2canvas` cost at startup.
- Froze the preview payload at capture time instead of streaming live actions into the panel, so users review the exact snapshot that will be submitted.
- Filtered request tracking to same-origin API/mutation-style traffic and explicitly excluded the bug-report submission endpoint itself to avoid recursive noise.
- Mounted the widget from the root layout rather than the seller/shopper shells to keep the integration additive and compatible with the dirty local worktree.

## Deviations from Plan

- The first widget implementation used `useEffectEvent` for open/refresh/submit flows, but the repo’s current React lint rules treat those callbacks as effect-only helpers. The component was refactored to plain event handlers so lint stayed green without changing repo-wide rules.

## Issues Encountered

- No build or test failures remained after the widget handler refactor. The only unresolved risk is visual QA: the terminal build confirms the route tree and compile path, but no live browser click-through was performed from this session.

## Verification

- `npm test`
- `npm run lint`
- `npm run build`

## Next Phase Readiness

- The terminal-facing retrieval loop is the only remaining product surface for Phase 9.
- The backend report format and the widget payload are stable enough to add the CLI and operator docs next.

---
*Phase: 09-error-logging-and-bug-reports*
*Completed: 2026-04-18*
