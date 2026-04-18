# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-18)

**Core value:** Auctions actually clear at-risk inventory before expiry — bids land, winners pay, items get to buyers.
**Current focus:** Phase 8 — Notifications & Demo Polish (implementation is in place; next step is the real human walkthrough with VAPID-enabled seller/shopper browsers)

## Current Position

Phase: 8 of 8 (Notifications & Demo Polish)
Plan: Human walkthrough pending after 08-02..08-04 implementation
Status: Human verification needed
Last activity: 2026-04-18 — Plans 08-02 through 08-04 landed: deterministic demo prep services, guarded operator endpoints, seller-side demo tools, and the Phase 8 runbook are all in place; only the real walkthrough approval remains.

Progress: █████████▓ 98%

## Performance Metrics

**Velocity:**
- Total plans completed: 28
- Average duration: Partially tracked
- Total execution time: 31 min recorded in Phase 1; later phases completed in the same session but did not capture per-plan timings

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundation | 3 | 31 min | 10 min |
| 2. Auth & Onboarding | 4 | Timing not captured | n/a |
| 3. Listing Creation | 3 | Timing not captured | n/a |
| 4. Auction Engine | 3 | Timing not captured | n/a |
| 5. Consumer Feed & Discovery | 4 | Timing not captured | n/a |
| 6. Payments (Stripe Test) | 6 | Timing not captured | n/a |
| 7. Fulfillment | 3 | Timing not captured | n/a |
| 8. Notifications & Demo Polish | 2 | 22 min | 11 min |

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
- Phase 6 Stripe integration is server-only (`import "server-only"` + memoized Proxy singleton); off-session charges use `off_session: true, confirm: true, error_on_requires_action: true` to fail fast instead of parking for 3DS
- Platform fee corrected from 15% to 10% (D-07) — existing `getSettlementAmounts` flows the new constant through all settlements
- Stripe calls are never issued inside Drizzle transactions; direct post-commit path marks `paymentStatus='capture_requested'` and the webhook flips it to `'captured'`
- Fallback bidder loop is called from both the direct post-commit path (fast) and the `payment_intent.payment_failed` webhook (durability net) — settlement row FOR UPDATE serializes them
- First-bid card gate uses inline Stripe Payment Element; `MockCardPanel` is retained as a demo fallback when `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is unset
- Phase 7 fulfillment rows are initialized on payment capture with pickup-first defaults: 6-digit code, 48-hour expiry, and buyer-facing recipient data
- Buyers now finish paid wins from a dedicated Orders lane, where they can switch to pickup, request delivery quotes, confirm delivery, and follow tracking links
- Uber Direct uses OAuth client credentials with `eats.deliveries`, self-serve customer endpoints, signed raw-body webhooks, and a silent local stub fallback when Uber credentials are absent
- Sellers now have a dedicated Fulfillment lane where pickup codes can be verified in-app and delivery progress is visible without using the outcomes screen
- Phase 8 now persists `endingSoonNotifiedAt` directly on auctions so the server sweep can emit the ending-soon beat exactly once per auction without a broader notification-event ledger
- Auction push payload construction now lives in a pure shared module, letting notification routing stay testable without booting env-bound database clients
- Demo tooling is gated behind `DEMO_MODE_ENABLED`, with optional `DEMO_CONTROL_TOKEN` access for curl/VM-driven operator flows while real seller session auth remains the default path
- The scripted demo now runs through a seller-only in-app control lane plus lightweight shopper alert guidance instead of exposing a general admin surface or cross-role shortcuts
- Phase 8 is not marked complete until a human verifies the push/browser walkthrough, especially the iPhone/iPad Home Screen constraint and the one-shot ending-soon beat

### Deferred Issues

- Perform the real Phase 8 browser walkthrough with VAPID enabled before calling the product demo-ready
- Perform a manual phone-sized visual review if you want a human sign-off beyond the yolo run

### Pending Todos

- `npm audit` reports 4 moderate transitive vulnerabilities in the current dependency graph; not blocking current roadmap execution
- Rotate the Neon credentials that were pasted into chat and written to ignored local env files during setup
- Generate VAPID keys and configure `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, and `VAPID_PRIVATE_KEY` if you want browser push delivery to run outside graceful no-op mode
- **Phase 6 UAT:** add `DATABASE_URL(_UNPOOLED)` + `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to `.env.local`, run `npm run db:migrate` (applies `drizzle/0004_conscious_gressill.sql`), then walk MV-1..MV-8 in README `## Demo walk-through`
- **Phase 6 nice-to-have:** `/consumer/card-return` page referenced by `confirmSetup` only on 3DS-required cards (not hit by test card 4242); stub for future hardening
- **Phase 6 nice-to-have:** `setup_intent.succeeded` handler currently sets `hasMockCardOnFile=true` with placeholder `mockCardBrand`/`mockCardLast4`; can be enriched with real PaymentMethod metadata in a follow-up
- **Phase 7 UAT:** add `UBER_DIRECT_CLIENT_ID`, `UBER_DIRECT_CLIENT_SECRET`, `UBER_DIRECT_CUSTOMER_ID`, and `UBER_DIRECT_WEBHOOK_SIGNING_KEY`, then walk the README fulfillment demo for both pickup and delivery. Confirm a real webhook can advance `delivery_requested` → `out_for_delivery`/`delivered` and that seller pickup verification marks the settlement completed.
- **Phase 8 UAT:** set `DEMO_MODE_ENABLED=1`, configure the VAPID env vars, opt a seller and shopper browser into alerts, then walk the README Phase 8 runbook end to end. On iPhone/iPad, verify the shopper is using the installed Home Screen web app before expecting push delivery.

### Blockers/Concerns

- Local runtime verification still lacks real Google OAuth, Cloudinary, and Vision credentials, so third-party sign-in plus managed upload/OCR provider round-trips remain unproven until those secrets are configured
- Local/runtime verification still lacks real Uber Direct credentials, so quote/create/webhook round-trips are currently proven only through the built-in stub path
- Auction closing still relies on the single-process safety sweep plus request-triggered refreshes; a durable per-auction scheduler remains a future hardening path if deployment topology changes
- Phase 8 implementation is ready, but the final demo claim still depends on a human walkthrough confirming push delivery in real browsers and the iOS Home Screen constraint

## Session Continuity

Last session: 2026-04-18
Stopped at: Phase 8 implementation complete through Plans 08-02..08-04. Phase 6 remains `human_needed` until live Stripe MV walk-through; Phase 7 awaits live Uber/Stripe UAT; Phase 8 now awaits the real seller/shopper walkthrough before it can be marked complete.
Resume file: .planning/ROADMAP.md
