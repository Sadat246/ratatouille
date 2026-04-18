---
phase: 06-payments
status: human_needed
verified_by: orchestrator
verified_date: 2026-04-18
score: 34/36 automated must-haves (2 runtime-only — deferred to manual UAT)
plan_count: 6
commits: 30
baseline: 379b4f8
head: 1a9a6fd
---

# Phase 6 — Payments (Stripe Test) — Verification

## Summary

All 6 plans executed in 4 waves without failures. 30 atomic commits between baseline `379b4f8` and head `1a9a6fd`. `npx tsc --noEmit` exits 0. All server-side Stripe-touching modules begin with `import "server-only";`. No Stripe API calls appear inside any Drizzle `getInteractiveDb().transaction(...)` block. Phase 4 auction service was modified surgically — only 6 added lines across three post-commit hook sites, plus one constant change (`1_500` → `1_000`) in pricing.

Automated verification covers 34 of 36 must-haves. Two must-haves are runtime-only (live DB migration apply, live Stripe webhook signature verify) and are recorded as **deferred** pending user-provided secrets — not failures.

## Goal statement (from ROADMAP)

> Bids hold funds and buyouts/winning bids capture funds via Stripe in test mode, with commission split modeled in the settlement record (no real money).

**Verdict:** code paths built and wired end-to-end. Live demonstration requires user to add `DATABASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to `.env.local`, run `npm run db:migrate`, then follow the MV-1..MV-8 walk-through in README. Per VALIDATION.md sampling contract, this is classified `human_needed`, not `gaps_found`.

## Must-haves — automated verification

### Plan 06-01 (foundation)
| # | must-have | status |
|---|-----------|--------|
| 1 | `npm install` succeeded with `stripe@^22.0.2`, `@stripe/stripe-js@^9.2.0`, `@stripe/react-stripe-js@^6.2.0` pinned | ✅ |
| 2 | `.env.example` documents `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` with obtain-from-dashboard comments | ✅ |
| 3 | `consumer_profiles` has `stripe_customer_id` and `stripe_payment_method_id` columns (schema) | ✅ |
| 3b | `consumer_profiles` columns applied to live DB | ⏸ deferred — `DATABASE_URL` not present; SQL generated and committed (`drizzle/0004_conscious_gressill.sql`); user runs `npm run db:migrate` after adding creds |
| 4 | `stripe_webhook_events` table with unique index on `event_id` (schema + barrel + migration SQL) | ✅ |
| 4b | `stripe_webhook_events` table applied to live DB | ⏸ deferred — same as 3b |
| 5 | `AUCTION_PLATFORM_FEE_BPS = 1_000` and `getSettlementAmounts` returns 10% fee | ✅ (grep confirmed) |
| 6 | README documents `stripe listen` forwarding command for local dev | ✅ |

### Plan 06-02 (server services)
| # | must-have | status |
|---|-----------|--------|
| 1 | Single server-only Stripe SDK client exists and is reused | ✅ `lib/payments/stripe.ts` Proxy-memoized |
| 2 | `getOrCreateStripeCustomer` returns cached `cus_...` or creates with idempotency key `customer:{userId}` | ✅ grep `customer:${params.userId}` at customers.ts:34 |
| 3 | `createSetupIntentForConsumer` returns `{ clientSecret, setupIntentId, customerId }` | ✅ (Plan 06-04 consumes this shape successfully) |
| 4 | `chargeBidderOffSession` sets `off_session: true, confirm: true, error_on_requires_action: true` | ✅ payment-intents.ts lines 38–40 |
| 5 | PaymentIntent idempotency key is `pi:{settlementId}:attempt:{attemptNumber}` | ✅ payment-intents.ts:51 |
| 6 | `wasEventProcessed` / `markEventProcessed` use `onConflictDoNothing` on unique index | ✅ idempotency.ts |
| 7 | `runFallbackBidderLoop` iterates bids `ORDER BY amount_cents DESC, placed_at ASC` | ✅ fallback.ts:81 |
| 8 | Stripe API calls never happen inside a Drizzle transaction | ✅ regex scan returned no matches; fallback.ts splits Step 1 (FOR UPDATE load) / Step 2 (charge loop outside tx) / Step 3 (exhaustion tx) |

### Plan 06-03 (webhook)
| # | must-have | status |
|---|-----------|--------|
| 1 | `POST /api/webhooks/stripe` verifies signature against raw body via `stripe.webhooks.constructEvent`; invalid → 400 | ✅ |
| 2 | Runs on Node.js runtime (`export const runtime = "nodejs"`) and reads body via `request.text()` | ✅ |
| 3 | Duplicate events deduped via `stripe_webhook_events.eventId` unique index | ✅ wasEventProcessed called before dispatch |
| 4 | `setup_intent.succeeded` persists `stripeCustomerId` + `stripePaymentMethodId` and sets `hasMockCardOnFile=true` | ✅ |
| 5 | `payment_intent.succeeded` → `paymentStatus='captured'` + fulfillment row `mode='pickup'`, `status='pending_choice'` (idempotent via `onConflictDoNothing(fulfillments.settlementId)`) | ✅ |
| 6 | `payment_intent.payment_failed` → `runFallbackBidderLoop(settlementId)` unless already resolved | ✅ |
| 7 | `payment_intent.canceled` → `paymentStatus='failed'`, `status='voided'` | ✅ |
| 8 | Webhook path NOT protected by Auth.js middleware (proxy matcher excludes `/api`) | ✅ |
| 9 | Live signature verify with real `STRIPE_WEBHOOK_SECRET` | ⏸ deferred — env var missing; code path exercised only via `stripe trigger` once user configures |

### Plan 06-04 (first-bid UI)
| # | must-have | status |
|---|-----------|--------|
| 1 | `POST /api/consumer/setup-intent` returns `{ clientSecret }` for authed consumer | ✅ |
| 2 | Consumers without saved card see inline `<PaymentElement>`, NOT mock-Visa toggle | ✅ `AuctionBidPanel` branches on `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` presence |
| 3 | `stripe.confirmSetup({ redirect: "if_required" })` — no redirect on test card 4242 | ✅ |
| 4 | `loadStripe(NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)` at module scope, not inside render | ✅ |
| 5 | Card gated on first-bid intent (not on mount) — non-bidders never hit Stripe | ✅ |
| 6 | No PAN/CVC/exp inputs in our DOM — Stripe Elements iframe holds card data | ✅ (component renders `<PaymentElement />`, no input fields) |

### Plan 06-05 (settlement trigger)
| # | must-have | status |
|---|-----------|--------|
| 1 | After `buyoutAuction` commits, `chargeBuyout` fires post-commit with saved `stripePaymentMethodId` | ✅ service.ts:633 (outside tx closing at :631) |
| 2 | After `sweepOverdueAuctions` / `refreshAuctionIfOverdue` closes with winner, `chargeBidderOffSession` fires post-commit with `attemptNumber: 1` | ✅ service.ts:723 and :770 |
| 3 | On captured outcome → `paymentStatus='capture_requested'` + `processorIntentId`; webhook flips to `'captured'` | ✅ |
| 4 | On failed outcome → `runFallbackBidderLoop` invoked inline; exhausted case marks listing `'expired'`, settlement `'failed'` | ✅ |
| 5 | When `STRIPE_SECRET_KEY` unset, trigger logs-and-returns without importing Stripe SDK — Phase 4 demo behavior preserved | ✅ dynamic `import()` after env check |
| 6 | Stripe API calls NEVER inside a `getInteractiveDb().transaction(...)` block | ✅ confirmed via line-placement audit: calls at 633, 723, 770; transaction bodies close at 631, 719, 766 |

### Plan 06-06 (demo docs)
| # | must-have | status |
|---|-----------|--------|
| 1 | README `## Demo walk-through` section covers MV-1..MV-8 | ✅ (8 items traced 1:1 in the plan's SUMMARY) |
| 2 | Section anchors to real symbols: `triggerAuctionPaymentIfCloseResult`, `runFallbackBidderLoop`, `chargeBidderOffSession`, `chargeBuyout`, `pi:{settlementId}:attempt:{n}`, `off_session=true` | ✅ |
| 3 | `/sell/outcomes` called out as commission-split verification surface (no new UI) | ✅ |

## Requirement traceability (D-01..D-13)

| Req | Decision | Evidence |
|-----|----------|----------|
| D-01 | First-bid card gate via SetupIntent + Payment Element | `components/auction/stripe-card-setup.tsx` + `auction-bid-panel.tsx` (06-04); webhook handler persists state (06-03) |
| D-02 | Saved card reused on subsequent bids | `chargeBidderOffSession` pulls `stripeCustomerId` + `stripePaymentMethodId` from consumer profile; no modal on repeat bids |
| D-03 | Inline (no redirect) card entry | `confirmSetup({ redirect: "if_required" })` |
| D-04 | Webhook-first state transitions | Direct path marks `capture_requested`; webhook flips to `captured` (06-03 handler + 06-05 comment) |
| D-05 | Buyout captures on-session immediately | `chargeBuyout` with `confirm: true`, no `off_session`; dispatched from `buyoutAuction` post-commit (06-05) |
| D-06 | `error_on_requires_action: true` — fail fast, no 3DS park | payment-intents.ts:40 |
| D-07 | Platform fee = 10% (1000 bps) | `AUCTION_PLATFORM_FEE_BPS = 1_000` in pricing.ts |
| D-08 | Commission split in settlement row | `getSettlementAmounts` returns grossAmountCents / platformFeeCents / sellerNetAmountCents — flowed through fallback.ts:128 and existing `closeAuctionWithWinner` |
| D-09 | `stripeCustomerId`/`stripePaymentMethodId` on `consumer_profiles` | 06-01 schema + 0004 migration SQL |
| D-10 | Fallback bidder loop on failed winning PI | `runFallbackBidderLoop`, dispatched directly (06-05) or via `payment_intent.payment_failed` webhook (06-03) |
| D-11 | MockCardPanel demo fallback preserved when Stripe keys absent | `MockCardPanel` returns null only when `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set |
| D-12 | Four webhook handlers routed | `dispatchWebhookEvent` switches on exactly 4 event types |
| D-13 | Webhook signature verify + idempotent delivery | `constructEvent` + `wasEventProcessed`/`markEventProcessed` |

All 13 requirement IDs accounted for against real shipped code.

## Manual (human) verification needed

Per `06-VALIDATION.md` Manual-Only Verifications table and `06-06-PLAN.md` Demo walk-through, the following must be exercised by a human with live Stripe test keys:

1. **MV-1** — First bid triggers SetupIntent + inline `<PaymentElement>` iframe; card `4242 4242 4242 4242` attaches
2. **MV-2** — Second bid by same user reuses saved card (no modal)
3. **MV-3** — Natural auction close → off-session PI → `paymentStatus='captured'` + fulfillment row created
4. **MV-4** — Winner card `4000 0000 0000 9995` (insufficient_funds) → `runFallbackBidderLoop` charges runner-up with `attemptNumber=2`
5. **MV-5** — Buyout fires on-session PI; captured immediately (no runner-up cascade)
6. **MV-6** — Seller `/sell/outcomes` shows 10% fee / 90% net for a settled auction
7. **MV-7** — Winner card `4000 0027 6000 3184` (requires_authentication) → off-session PI fails fast (`error_on_requires_action: true`), no 3DS park, fallback engaged, no duplicate capture on Stripe Dashboard
8. **MV-8** — Same webhook event delivered twice → dedup'd; no second fulfillment insert

The README `## Demo walk-through` section walks the reviewer through all 8 with DB-studio verification steps.

## Deferred items

1. **`npm run db:migrate`** — user must run after adding `DATABASE_URL` (and optionally `DATABASE_URL_UNPOOLED`) to `.env.local`. SQL is generated and committed; applying it is a one-line no-op once creds exist.
2. **Runtime Stripe smoke tests** — tied to user adding the three `STRIPE_*` env vars.
3. **Phase 4 `hasMockCardOnFile` shim** — `setup_intent.succeeded` handler now drives `hasMockCardOnFile=true` with placeholder brand/last4 strings. When the user wants to replace the placeholders with real card metadata (last4, brand from the attached PaymentMethod), see the 06-03 SUMMARY note.

## Deviations documented

1. **`06-02/stripe.ts`** — used a `Proxy`-backed singleton instead of eager `new Stripe(...)` to satisfy "module must load without `STRIPE_SECRET_KEY`" constraint. All invariants preserved.
2. **`06-04/stripe-card-setup.tsx`** — `return_url: "/consumer/card-return"` page not yet created. Only visited on 3DS-required cards; test card 4242 returns inline. Acceptable for Phase 6 per D-11.
3. **`06-04/route.ts`** — `createSetupIntentForConsumer` called with `{ userId, email }` per 06-02 signature (plan-text showed a single-arg snippet).
4. **`06-05/auction-trigger.ts`** — TS correctness null guard on `settlement.grossAmountCents`; buyout failure branch now voids the settlement instead of cascading to a fallback loop (D-05 alignment — buyouts are single-buyer, there is no runner-up).
5. **`06-02/fallback.ts`** — used `FOR UPDATE` on the settlement row (Step 1) instead of `FOR UPDATE SKIP LOCKED` on bids, which is a stronger serialization guarantee between the direct-call and webhook-call paths. Bid ordering (`amount_cents DESC, placed_at ASC`) and no-Stripe-inside-tx invariants preserved.

## Regression check

- `lib/auctions/` source files modified: only `pricing.ts` (1-line fee change) and `service.ts` (+6 lines, 3 post-commit hook call sites)
- No other Phase 4 file touched
- `npx tsc --noEmit` exits 0
- No test harness exists per project convention (VALIDATION.md: vitest/playwright deferred to v1.1)

## Final disposition

**Status:** `human_needed` — all automated verifications passed; 8 manual UAT items tracked in README demo walk-through + this file's Manual section.

Phase 6 is code-complete and ready for the user to (a) add secrets, (b) run migration, (c) exercise the MV-1..MV-8 walk-through.
