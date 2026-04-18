# Phase 8 Discovery

**Generated:** 2026-04-18
**Discovery depth:** Level 2 (standard)

## Discovery Assessment

- **Roadmap flag:** Research: Likely
- **Why discovery was required:** Phase 8 combines browser push constraints, runtime scheduling, and demo-world orchestration. The repo already has partial push support, but not the missing ending-soon behavior or the deterministic demo controls the context requires.
- **Existing codebase patterns:** Strong partial match. The codebase already has `web-push`, VAPID env wiring, subscription persistence, a service-worker push handler, an authenticated subscription route, a consumer/seller opt-in panel, and post-commit outbid / win / seller-close notifications.
- **Missing pieces:** one-shot ending-soon delivery, persisted dedup state for that beat, deterministic demo seeding, and a repeatable operator flow for driving the walkthrough without manual SQL edits.

## Existing Repo Findings

- Push plumbing already exists and should be reused, not replaced:
  - VAPID env loading and `web-push` configuration are present.
  - The service worker already handles `push` and `notificationclick`.
  - Browser subscriptions are already stored per user and cleaned up on `404` / `410`.
- Auction runtime already has a Node-side sweep loop started from instrumentation. That pattern is the right home for ending-soon work; Phase 8 does not need a separate scheduling product.
- Outbid push already shipped in the auction engine, and close-path consumer/seller notifications already exist. Phase 8 should finish the missing beats and normalize the payload names/copy to match the roadmap.
- There is no seed or script pattern in the repo today. Demo prep will need fresh utilities rather than extending an existing seeding framework.
- Auth remains Google-only. A broad demo-login bypass would add risk this late in the project. Ambient fake accounts can exist only as data; the interactive seller/consumer walkthrough should stay anchored to real signed-in accounts.

## External Verification

- Web Push on iPhone/iPad is available for **Home Screen web apps**, not arbitrary in-browser tabs, and the permission request must happen in direct response to user interaction. Source: [WebKit: Web Push for Web Apps on iOS and iPadOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).
- Standards-based Web Push still relies on an active service worker, `PushManager.subscribe()`, and service-worker-side push handling plus `showNotification()`. Source: [MDN Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API).
- Notification permission requests should be tied to a user gesture; background or surprise prompting is explicitly discouraged. Source: [MDN Using the Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API/Using_the_Notifications_API).
- VAPID keys are meant to be generated once and reused, not regenerated per deploy or per notification. Source: [web-push README](https://github.com/web-push-libs/web-push).

## Recommendations

1. **Reuse the current push stack.**
   Keep `web-push`, the existing service worker, and the current subscription route/panel. Do not add a second notification provider or browser-specific codepath.

2. **Finish Phase 8 by extending the server runtime, not the client.**
   Ending-soon should come from a Node-side sweep similar to the existing auction-close sweep. Do not rely on client timers, open tabs, or feed polling to decide when a notification fires.

3. **Persist only the minimum new notification state.**
   The only clearly missing one-shot beat is ending-soon. A focused per-auction marker is preferable to a broad notification-event system unless execution uncovers a real need for a generic ledger.

4. **Use deterministic demo helpers, not manual DB edits.**
   Demo prep should be idempotent and rerunnable: ambient fake businesses/listings for feed believability, plus a hero auction path that can be recreated under a real seller account for the scripted walkthrough.

5. **Prefer guarded internal tools over auth bypass.**
   The safest late-phase demo control is a seller-only or secret-guarded internal surface that can prepare a hero auction, inject a competitor bid, run the ending-soon sweep immediately, and force the close sweep. Do not add general password/demo auth just for seeded users.

6. **Treat iOS push as an explicit runbook concern.**
   The final demo docs should call out that iPhone/iPad push requires the app to be installed to the Home Screen, with notification permission granted from a tap-driven flow. This is a verification/documentation issue, not something to hide in implementation.

7. **Keep the seed world intentionally small.**
   The roadmap says "~20+" listings, but the phase context is newer and explicitly narrows scope to a minimal, purposeful world. Planning should follow the context: a few businesses and just enough listing states to tell the story.

## Plan-Shaping Consequences

- **Plan 01:** notification backend completion and runtime sweep
- **Plan 02:** deterministic demo prep services and guarded operator endpoints
- **Plan 03:** seller-side demo control surface and navigation
- **Plan 04:** runbook, full walkthrough verification, and phase closeout

## Assumptions

- The interactive walkthrough will use real seller/consumer Google accounts already available to the presenter.
- Fake seeded users/businesses are ambient data only unless a guarded demo control explicitly uses them for behind-the-scenes trigger actions.
- Production troubleshooting, if needed during execution, will use the existing single-VM Docker logs rather than guessing from local behavior.
