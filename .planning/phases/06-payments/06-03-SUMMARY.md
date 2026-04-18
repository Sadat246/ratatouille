---
phase: 06-payments
plan: 03
subsystem: payments
tags: [stripe, webhooks, idempotency, signature-verify, fulfillment]
requirements: [D-01, D-04, D-05, D-06, D-10, D-12, D-13]
dependency_graph:
  requires:
    - "Plan 06-01 (stripe_webhook_events table + unique index; consumer_profiles.stripe_customer_id / stripe_payment_method_id columns)"
    - "Plan 06-02 (stripe singleton, wasEventProcessed/markEventProcessed, runFallbackBidderLoop)"
  provides:
    - "POST /api/webhooks/stripe — unauthenticated, signature-verified, deduped Stripe webhook ingress"
    - "dispatchWebhookEvent(event) routing map for exactly four CONTEXT D-12 event types"
    - "handleSetupIntentSucceeded — persists stripeCustomerId + stripePaymentMethodId on consumer_profiles, flips hasMockCardOnFile=true"
    - "handlePaymentIntentSucceeded — flips settlements.paymentStatus=captured + status=ready_for_fulfillment, inserts fulfillment row (mode=pickup, status=pending_choice) idempotently via onConflictDoNothing"
    - "handlePaymentIntentFailed — guards on already-resolved settlements and triggers runFallbackBidderLoop (durability net for Plan 06-05's direct call)"
    - "handlePaymentIntentCanceled — flips settlement to voided/failed"
  affects:
    - "Plan 06-04 (SetupIntent route): user's first-bid SetupIntent completes → this webhook persists their card-on-file state"
    - "Plan 06-05 (close → charge → fallback): direct fallback call is the fast path; this webhook is the recovery net if the direct call is interrupted (process crash, pod restart)"
    - "Phase 4 card-gate (`hasMockCardOnFile(profile)`): keeps working because handleSetupIntentSucceeded sets both mockCardBrand and mockCardLast4 to non-empty placeholders"
tech_stack:
  added: []
  patterns:
    - "Raw-body signature verification: await request.text() + stripe.webhooks.constructEvent(rawBody, signature, secret) — Edge re-encodes the body, so runtime=nodejs is mandatory"
    - "At-least-once webhook delivery: wasEventProcessed gate BEFORE dispatch; markEventProcessed AFTER dispatch succeeds; unique index on stripe_webhook_events.event_id is the race-safe source of truth"
    - "Idempotent child-row insert: fulfillments insert uses onConflictDoNothing({target: fulfillments.settlementId}) so redelivered payment_intent.succeeded events never duplicate the fulfillment row"
    - "Row-locked state-machine transitions: payment-intent-succeeded handler runs SELECT FOR UPDATE on settlement inside getInteractiveDb().transaction, short-circuiting on paymentStatus='captured' for redeliveries"
    - "Defensive type coercion for SetupIntent.customer / .payment_method (string | expandable-object | null): coerceId helper handles all three shapes per Stripe SDK contract"
key_files:
  created:
    - "app/api/webhooks/stripe/route.ts"
    - "lib/payments/webhook-handlers/index.ts"
    - "lib/payments/webhook-handlers/setup-intent-succeeded.ts"
    - "lib/payments/webhook-handlers/payment-intent-succeeded.ts"
    - "lib/payments/webhook-handlers/payment-intent-payment-failed.ts"
    - "lib/payments/webhook-handlers/payment-intent-canceled.ts"
  modified: []
decisions:
  - "STRIPE_WEBHOOK_SECRET is read via getRequiredEnv INSIDE the POST handler (not at module scope as the plan specified). Required by environment constraint — no .env.local exists in this workspace, so a module-level getRequiredEnv call would crash Next.js `next build`'s page-data collection when it evaluates the webhook route module. Missing secret surfaces as a clean 500 at request time instead of breaking build. See Deviations."
  - "payment-intent-payment-failed handler treats status='failed' and status='voided' as terminal (not just paymentStatus) so late Stripe retries after the fallback loop exhausts don't re-enter the loop even if paymentStatus drifted"
  - "fulfillment row created by payment-intent-succeeded uses onConflictDoNothing({target: fulfillments.settlementId}) — the fulfillments_settlement_unique index from Phase 4 makes this atomic-safe under concurrent delivery"
  - "dispatchWebhookEvent default case is a silent return (no log, no throw). Per Stripe best practice, returning 200 on unlisted event types stops Stripe from retrying events we don't care about"
metrics:
  duration: "~4 min (single sequential executor on main working tree)"
  tasks_completed: 3
  files_changed: 6
  completed_date: "2026-04-18"
---

# Phase 06 Plan 03: Stripe Webhook Ingestion Summary

Build the Stripe webhook endpoint and its four event handlers. The endpoint lives at `POST /api/webhooks/stripe`, is unauthenticated (signature verification IS the access control), runs on the Node.js runtime, verifies HMAC signatures against the raw request body, dedups redelivered events by `event.id`, and dispatches into four handlers that own exactly one state-machine transition each: `setup_intent.succeeded` → persist card-on-file, `payment_intent.succeeded` → capture settlement + spawn fulfillment, `payment_intent.payment_failed` → re-enter fallback loop (durability net for Plan 06-05's direct call), `payment_intent.canceled` → void settlement. Completes CONTEXT D-04, D-05, D-06, and the D-12 event surface contract.

## Tasks

### Task 1 — Four event handler modules under `lib/payments/webhook-handlers/`

- Created `setup-intent-succeeded.ts`, `payment-intent-succeeded.ts`, `payment-intent-payment-failed.ts`, `payment-intent-canceled.ts`. Each opens with `import "server-only";`.
- `handleSetupIntentSucceeded` uses a `coerceId` helper to defensively unwrap `setupIntent.customer` and `setupIntent.payment_method` (both are `string | Stripe.Customer | Stripe.PaymentMethod | null` depending on expansion; never assumed `string`). Target row matched on `stripeCustomerId` (deterministic because `getOrCreateStripeCustomer` already planted it pre-SetupIntent). Unconditionally sets `mockCardBrand: "Card on file"`, `mockCardLast4: "****"`, `mockCardAddedAt: now`, `hasMockCardOnFile: true` so Phase 4's `hasMockCardOnFile(profile)` gate keeps evaluating truthy.
- `handlePaymentIntentSucceeded` runs inside `getInteractiveDb().transaction` with a raw `SELECT … FOR UPDATE` on the settlement row. Short-circuits when `paymentStatus === "captured"` (late redelivery). On the transition, writes `status: "ready_for_fulfillment"`, `paymentStatus: "captured"`, `processor: "stripe"`, `processorIntentId: paymentIntent.id`, `capturedAt: now`, then inserts the fulfillment row with `.onConflictDoNothing({ target: fulfillments.settlementId })`.
- `handlePaymentIntentFailed` guards on `paymentStatus ∈ {captured, failed}` AND `status ∈ {completed, failed, voided}` before calling `runFallbackBidderLoop(settlementId)`. Prevents late Stripe retries from re-entering a loop that already exhausted.
- `handlePaymentIntentCanceled` flips `status: "voided"` + `paymentStatus: "failed"` + writes `processor: "stripe"`, `processorIntentId` on the settlement.
- All four handlers read `paymentIntent.metadata?.settlementId` / `setupIntent.customer|payment_method` defensively; missing fields log and return (no throw).
- `npx tsc --noEmit` → exit 0.
- **Commit:** `82a4fb5`

### Task 2 — Dispatch index for webhook handlers

- Created `lib/payments/webhook-handlers/index.ts` with `import "server-only";` line 1.
- `dispatchWebhookEvent(event: Stripe.Event)` switches over `event.type` and matches exactly the four CONTEXT D-12 types: `setup_intent.succeeded`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`.
- `event.data.object` narrowed via `as Stripe.SetupIntent | Stripe.PaymentIntent` (safe — Stripe's typing contract guarantees shape matches `event.type`; each handler still validates inner fields).
- `default: return;` — no log, no throw. Returning 200 on unlisted events stops Stripe retries per the "Handle duplicate events" best practice.
- `npx tsc --noEmit` → exit 0.
- **Commit:** `b4b8b37`

### Task 3 — Unauthenticated webhook POST route with signature verify + dedup

- Created `app/api/webhooks/stripe/route.ts`.
- `export const runtime = "nodejs"` + `export const dynamic = "force-dynamic"` — mandatory; Edge runtime re-encodes request bodies and breaks HMAC verification (T-06-01 mitigation).
- Body read via `await request.text()` before any parsing. Never `.json()` / `.formData()` / `.arrayBuffer()`.
- Missing `stripe-signature` header → 400. `stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)` wrapped in `try/catch` → 400 on throw.
- `wasEventProcessed(event.id)` checked BEFORE `dispatchWebhookEvent` — duplicates return 200 with `{received: true, deduped: true}` and handlers never run.
- `markEventProcessed(event.id, event.type)` called ONLY AFTER `dispatchWebhookEvent` returns — handler throws do not mark processed, route returns 500, Stripe retries per backoff. T-06-13 mitigation.
- No `authorizeApiRole` call; `proxy.ts` matcher `[/((?!api|_next/static|…).*)]` already excludes `/api/*` from Auth.js (no edits required). T-06-14 already mitigated upstream.
- Logs only `event.id`, `event.type`, sanitized error messages. Never logs `rawBody` (T-06-15 / PCI).
- Typecheck + acceptance-grep verification (`runtime = "nodejs"`, `dynamic = "force-dynamic"`, `await request.text()`, `stripe.webhooks.constructEvent`, `wasEventProcessed`, `markEventProcessed`, `deduped: true`, no `authorizeApiRole`, no `request.json()`) all pass.
- **Commit:** `c9c215c`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking environment constraint] `STRIPE_WEBHOOK_SECRET` read moved from module scope into the POST handler**

- **Found during:** Task 3, after writing the route and running `npm run build` to verify Next.js route collection.
- **Plan prescribed:** `const webhookSecret = getRequiredEnv("STRIPE_WEBHOOK_SECRET");` at module top.
- **Issue:** `getRequiredEnv` throws synchronously when the env var is missing. `next build` evaluates every route module during page-data collection (worker processes import the built module). With no `.env.local` in this workspace, a module-top evaluation would crash build with `Missing required environment variable: STRIPE_WEBHOOK_SECRET` — preventing compile verification of the entire phase.
- **Fix:** Read `getRequiredEnv("STRIPE_WEBHOOK_SECRET")` inside `POST(request)` wrapped in try/catch that returns HTTP 500 `{error: "webhook secret not configured"}` when unset. Module evaluation now succeeds; valid requests in a configured environment see identical behaviour; misconfigured environments surface a clean 500 per-request instead of a build-time crash.
- **User constraint alignment:** The execution prompt's `<environment_constraints>` section explicitly directed: _"Use `getRequiredEnv("STRIPE_WEBHOOK_SECRET")` INSIDE the request handler, NOT at module top. The handler will return 500 at runtime if the env var is missing, but the module must load and typecheck cleanly."_ This deviation implements that constraint.
- **Invariants still satisfied:**
  - `getRequiredEnv` is still the reader (not `getOptionalEnv`, not `process.env` direct access) — the "reads via lib/env" acceptance criterion holds.
  - Signature verification failure still returns 400 (the 500 path is strictly missing-env, which is operator misconfiguration, not a malicious request).
  - All other invariants (runtime=nodejs, raw body, dedup before dispatch, mark after dispatch, no auth gate) preserved exactly.
- **Files modified:** `app/api/webhooks/stripe/route.ts`.
- **Commit:** `c9c215c`.
- **Acceptance-criteria diff:** Plan text "Reads `STRIPE_WEBHOOK_SECRET` via `getRequiredEnv` at module scope" vs. actual "inside the handler". Location diff only; reader function and failure semantics are unchanged. Documented here per deviation protocol.

### Deferred Items

**1. [Environment] `npm run build` fails in unrelated page `/api/auth/[...nextauth]`**

- **Found during:** Task 3 verification (`npm run build`).
- **Symptom:** Next.js Turbopack "Compiled successfully in 21.8s" + "Finished TypeScript in 11.0s" both pass, then page-data collection crashes on `Missing required environment variable: DATABASE_URL` inside the NextAuth route module.
- **Why deferred:** The NextAuth route (shipped in Phase 2/3 auth code — NOT touched by this plan) reads `DATABASE_URL` at module load via a transitive `db/client.ts` import. Same root cause as the deferred migration apply from Plan 06-01: this workspace has no `.env.local`. Per the execution prompt: _"If `npm run build` fails with an unrelated error (e.g. from Phase 4 code you didn't touch), note it in SUMMARY and continue — do NOT try to 'fix' other phases' code."_
- **What was verified:** The new webhook route module itself compiled successfully (Turbopack "Compiled successfully" phase covers all TypeScript compilation including new files). `npx tsc --noEmit` exits 0 independently. Grep-based acceptance checks all pass. The build-time crash is strictly in pre-existing auth code whose env dependency predates Phase 6.
- **Risk:** Zero risk to this plan's correctness; real risk is that `next build` will not produce a runnable bundle until `DATABASE_URL` is set — which is the same risk already carried across Plans 06-01 and 06-02.
- **Not a Rule 4 (architectural) deviation:** No code added or changed in unrelated modules; strictly a shared-environment state.

### Authentication Gates

None during execution. No Stripe API calls issued from executor context (the webhook will only run in response to real Stripe deliveries in a configured environment).

## Verification

- `npx tsc --noEmit` → **exit 0** (verified after each of Task 1, Task 2, Task 3, and once more after the SUMMARY commit)
- `npm run build` → partial pass (Turbopack compile + TypeScript pass; page-data collection crashes in unrelated `/api/auth/[...nextauth]` per Deferred Item 1 above)
- `npm run lint` → **not run** (carried-over guidance from Plans 06-01/06-02; touched files introduce no new lint-relevant patterns)
- Acceptance-grep verification for Task 3 route file (all passing):
  - `export const runtime = "nodejs"` — present
  - `export const dynamic = "force-dynamic"` — present
  - `await request.text()` — present (no `.json()` / `.formData()` / `.arrayBuffer()` anywhere in the file)
  - `stripe.webhooks.constructEvent` — present, wrapped in try/catch → 400
  - `authorizeApiRole` — NOT present (webhook must be unauthenticated)
  - `wasEventProcessed` — present BEFORE `dispatchWebhookEvent`
  - `markEventProcessed` — present AFTER `dispatchWebhookEvent`
  - `deduped: true` — present in the dedup short-circuit response
- Acceptance-grep verification for Task 1 handlers:
  - `coerceId` present in `setup-intent-succeeded.ts`
  - `for update` present in `payment-intent-succeeded.ts`
  - `runFallbackBidderLoop` present in `payment-intent-payment-failed.ts`
  - `status: "voided"` present in `payment-intent-canceled.ts`
  - `onConflictDoNothing({ target: fulfillments.settlementId })` present in `payment-intent-succeeded.ts`
- Acceptance-grep verification for Task 2 dispatch:
  - `dispatchWebhookEvent` exported
  - All four `case "…"` lines for the CONTEXT D-12 event types present
  - `default: return` (silent) present
- `proxy.ts` line 98 matcher re-inspected: `["/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|pwa-icon).*)"]` — `(?!api)` negative lookahead confirms `/api/*` (including `/api/webhooks/stripe`) is excluded from Auth.js. No proxy.ts edits made.

### Runtime Smoke Tests (deferred — no Stripe keys configured)

The `<environment_constraints>` block of the execution prompt explicitly directed NOT to run `stripe listen` or `stripe trigger`. These will be run by the user (or the Plan 06-05 verification step) once `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are in `.env.local`:

- `stripe listen --forward-to localhost:3000/api/webhooks/stripe` — expect quiet startup (no 400/500 noise)
- `stripe trigger setup_intent.succeeded` — expect consumer_profiles row updated
- `stripe trigger payment_intent.succeeded` — expect settlements flipped + fulfillments row
- Negative: `curl -X POST localhost:3000/api/webhooks/stripe -d '{}' -H 'content-type: application/json'` (no signature) → 400
- Duplicate delivery: second trigger of the same event → 200 `{deduped: true}`

## Commits

| Task | Type | Hash    | Message |
| ---- | ---- | ------- | ------- |
| 1    | feat | 82a4fb5 | add four Stripe webhook event handlers |
| 2    | feat | b4b8b37 | add dispatchWebhookEvent routing map for Stripe events |
| 3    | feat | c9c215c | add unauthenticated Stripe webhook POST route |

Baseline: `d71387a docs(06-02): record plan summary`

## Known Stubs

None. Every handler is fully wired to the real database schema and the real Stripe SDK. The placeholder values `mockCardBrand: "Card on file"` and `mockCardLast4: "****"` in `setup-intent-succeeded.ts` are intentional demo-scope choices documented in the plan's Task 1 body ("For demo simplicity, unconditionally set both — the user will re-attach rarely") and directly satisfy Phase 4's `hasMockCardOnFile(profile)` gate which only checks truthiness of both fields. Future work (post-v1) to show real card brand/last4 would read them from `paymentMethod.card.brand` / `paymentMethod.card.last4` after retrieving the PaymentMethod from Stripe — not a stub blocking v1.

## Threat Flags

None. This plan's new surface is exactly one public POST endpoint, which is covered by the existing `<threat_model>` block in `06-03-PLAN.md`. Concrete coverage delivered:

- **T-06-01** (Spoofing / forged webhook) → mitigated: `stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)`; invalid signature → 400; `runtime = "nodejs"` preserves raw-byte integrity.
- **T-06-02** (Webhook replay / double-process) → mitigated: `wasEventProcessed` gate BEFORE dispatch; `markEventProcessed` uses the Plan 06-01 unique index with `onConflictDoNothing` (race-safe). Stripe's 5-minute timestamp tolerance enforced inside `constructEvent`.
- **T-06-13** (Silent 200 on handler error) → mitigated: handler throws propagate as 500 AND skip `markEventProcessed` → Stripe retries.
- **T-06-14** (DoS / webhook behind session check) → mitigated upstream: `proxy.ts` matcher already excludes `/api`; re-verified, no edits.
- **T-06-15** (PCI/email leak in logs) → mitigated: only `event.id`, `event.type`, and sanitized error messages logged; `rawBody` never logged; handlers log only ID fields.
- **T-06-03** (3DS park double-charge) → mitigated upstream in Plan 06-02 via `error_on_requires_action: true`; `payment-intent-payment-failed` treats any stuck state defensively as terminal failure → fallback.
- **T-06-16** (Duplicate fulfillment row) → mitigated: `.onConflictDoNothing({ target: fulfillments.settlementId })` + the `fulfillments_settlement_unique` index.

## Self-Check: PASSED

**Files verified present:**

- FOUND: `app/api/webhooks/stripe/route.ts`
- FOUND: `lib/payments/webhook-handlers/index.ts`
- FOUND: `lib/payments/webhook-handlers/setup-intent-succeeded.ts`
- FOUND: `lib/payments/webhook-handlers/payment-intent-succeeded.ts`
- FOUND: `lib/payments/webhook-handlers/payment-intent-payment-failed.ts`
- FOUND: `lib/payments/webhook-handlers/payment-intent-canceled.ts`
- FOUND: `.planning/phases/06-payments/06-03-SUMMARY.md` (this file)

**Commits verified in git log:**

- FOUND: 82a4fb5 (Task 1)
- FOUND: b4b8b37 (Task 2)
- FOUND: c9c215c (Task 3)

All 3 plan tasks committed atomically on top of `d71387a` (Wave 2 complete). `npx tsc --noEmit` exits 0. Every `must_haves.truths` invariant verified by grep against the committed files. One documented Rule 3 environment deviation (webhook secret read moved inside handler per explicit user constraint) and one deferred pre-existing build-time env dependency (`/api/auth/[...nextauth]` → `DATABASE_URL`).
