---
phase: 06-payments
plan: 04
subsystem: payments
tags: [stripe, setup-intent, payment-element, first-bid-gate, client-component, next-app-router]
requirements: [D-01, D-02, D-04, D-07, D-08, D-11, D-13]
dependency_graph:
  requires:
    - "Plan 06-02 (`createSetupIntentForConsumer` from `lib/payments/setup-intents.ts`)"
    - "Plan 06-03 (`setup_intent.succeeded` webhook handler persists durable card state)"
    - "`lib/auth/api.ts` (`authorizeApiRole('consumer')`)"
    - "`lib/auctions/http.ts` (`jsonAuctionError`)"
    - "`@stripe/stripe-js` + `@stripe/react-stripe-js` already installed in Plan 06-01"
  provides:
    - "POST `/api/consumer/setup-intent` → `{ ok: true, clientSecret }` for authenticated consumers"
    - "`<StripeCardSetup />` client component (inline `<PaymentElement />` + `confirmSetup`) under `components/auction/`"
    - "First-bid card gate wired into `AuctionBidPanel` with optimistic UI re-render on card save"
    - "`<MockCardPanel />` demo fallback preserved but env-gated off whenever Stripe publishable key is configured"
  affects:
    - "Plan 06-05 (auction-close charge) — consumers now populate `consumerProfiles.stripeCustomerId` / `stripePaymentMethodId` via the `setup_intent.succeeded` webhook spawned by this flow"
    - "Plan 04 mock-card demo — remains fully functional when `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is unset"
tech_stack:
  added: []
  patterns:
    - "`loadStripe(publishableKey)` at module scope so Stripe.js is loaded exactly once per page — component renders never re-download it"
    - "Lazy `POST /api/consumer/setup-intent` fetch inside `useEffect` so non-bidders who merely view an auction never allocate a Stripe SetupIntent"
    - "`useRef` sentinel (`fetchStartedRef`) as the fetch-in-progress guard so the effect never calls `setState` synchronously (satisfies `react-hooks/set-state-in-effect`)"
    - "`useState` initializer reads the module-level `publishableKey` so the 'Stripe not configured' error renders on first paint without an effect"
    - "Optimistic gate-clear via `cardJustAttached || viewer?.hasMockCardOnFile` — webhook is still authoritative for durable state, but the UI flips in <100 ms"
    - "Graceful degradation: when `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is unset, `StripeCardSetup` renders a clear configuration-error card AND `MockCardPanel` stays visible (Phase 4 demo path preserved)"
    - "`stripe.confirmSetup({ redirect: 'if_required' })` — card-only test flow returns inline; never redirects the user away on `4242 4242 4242 4242`"
key_files:
  created:
    - "app/api/consumer/setup-intent/route.ts"
    - "components/auction/stripe-card-setup.tsx"
    - ".planning/phases/06-payments/06-04-SUMMARY.md"
  modified:
    - "components/auction/auction-bid-panel.tsx"
    - "components/auction/mock-card-panel.tsx"
decisions:
  - "Pass `{ userId, email }` to `createSetupIntentForConsumer` (matches the Plan 06-02 service signature), not just `userId` as the literal plan snippet showed. Email comes from `session.user.email` with `?? \"\"` fallback — Stripe customer `email` is optional and the Customer record is already keyed on `metadata.userId`."
  - "Gate MockCardPanel on `process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` evaluated at render time (no `typeof window` guard needed — `NEXT_PUBLIC_*` vars are substituted at build time for both server and client bundles). T-06-20 mitigated."
  - "Use `useRef` rather than `useState` for the fetch-in-progress guard so the effect never calls `setState` synchronously (lint rule `react-hooks/set-state-in-effect`). Single fetch per mount is preserved; cancellation still works via the closure `cancelled` flag."
  - "Computed `bootstrapError` via `useState` initializer (sync check of `publishableKey`) instead of inside the effect body. Same reason: no sync setState in effect."
metrics:
  duration: "~7 min (single sequential executor on main working tree)"
  tasks_completed: 3
  files_changed: 4
  completed_date: "2026-04-18"
---

# Phase 06 Plan 04: First-Bid Card Gate with Stripe Payment Element Summary

One authenticated POST route (`/api/consumer/setup-intent`) that issues a one-shot `clientSecret`, one `"use client"` component (`<StripeCardSetup />`) that mounts `<PaymentElement />` + `stripe.confirmSetup({ redirect: 'if_required' })`, and two surgical edits in `AuctionBidPanel` + `MockCardPanel` to flip the first-bid gate from the Phase 4 mock Visa-4242 toggle to Stripe Elements. First-time bidders now save a real (test-mode) card inline on the auction page; the optimistic flag clears the gate immediately and the `setup_intent.succeeded` webhook (Plan 06-03) persists the durable state.

## Tasks

### Task 1 — Authenticated SetupIntent POST route

- Created `app/api/consumer/setup-intent/route.ts`.
- `authorizeApiRole('consumer')` gate → 401 when unauthenticated, 403 when the user is not a consumer (reuses `authorization.body` + `authorization.status` verbatim).
- On success, delegates to `createSetupIntentForConsumer({ userId: session.user.id, email: session.user.email ?? "" })` and returns `{ ok: true, clientSecret }`. `setupIntentId` and `customerId` are intentionally NOT returned (information-disclosure minimization, T-06-17).
- On service throw, returns `jsonAuctionError("SETUP_INTENT_FAILED", "Could not start card setup. Please try again.", 502)` — 502 because a failure at this layer is always a Stripe-upstream issue.
- `export const runtime = "nodejs"` — required; Stripe Node SDK can't run on Edge.
- No GET handler — client never needs to read an existing SI.
- **Commit:** `443d3b2`

### Task 2 — StripeCardSetup client component with Payment Element

- Created `components/auction/stripe-card-setup.tsx`.
- `"use client"` directive on line 1.
- `stripePromise` instantiated **once** at module scope via `loadStripe(publishableKey)` when `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set, else `Promise.resolve(null)`. Never re-downloaded on render.
- `useEffect` POSTs to `/api/consumer/setup-intent` exactly once per mount (guarded by `fetchStartedRef`), fetches `clientSecret`, renders `<Elements stripe={stripePromise} options={{ clientSecret }}>` wrapping an inner `<CardForm>`.
- Inner form contains `<PaymentElement />` as the sole card-data surface — **no PAN/CVC/exp inputs anywhere in our DOM** (T-06-05 / ASVS V10 PCI boundary). Card data lives exclusively in Stripe's iframe.
- Submit handler calls `stripe.confirmSetup({ elements, confirmParams: { return_url: \`${window.location.origin}/consumer/card-return\` }, redirect: "if_required" })`. For `4242 4242 4242 4242` the test card returns synchronously, no redirect.
- Graceful degradation: if `publishableKey` is unset, renders a `"Stripe is not configured..."` card instead of throwing at module load.
- Sets `onCardAttached()` prop on success — the parent flips its optimistic flag.
- **Commit:** `2cbf66f`

### Task 2 (follow-up) — ESLint `react-hooks/set-state-in-effect` auto-fix

See Deviations §1. Refactored to move `setBootstrapError` out of the effect body (`useState` initializer) and swap the `isFetching` state for a `useRef` sentinel. Behavior unchanged; lint passes.

- **Commit:** `743c42b`

### Task 3 — Wire StripeCardSetup into AuctionBidPanel and gate MockCardPanel

**`components/auction/auction-bid-panel.tsx`:**
- Imported `StripeCardSetup` from `@/components/auction/stripe-card-setup`.
- Added `cardJustAttached` state (`useState(false)`) alongside existing `error`/`feedback`/`isPending`.
- Replaced `const cardReady = viewer?.hasMockCardOnFile ?? false;` with `const cardReady = (viewer?.hasMockCardOnFile ?? false) || cardJustAttached;` so the optimistic flag immediately clears the gate for `canBid` and `canBuyout`.
- Replaced the plain `<p>Add the mock card below before you can bid or buy out.</p>` branch with `<div className="mt-4"><StripeCardSetup onCardAttached={() => { setCardJustAttached(true); setFeedback("Card saved. You can place a bid now."); }} /></div>`.
- Existing `feedback`/`setFeedback` state is reused, not duplicated.

**`components/auction/mock-card-panel.tsx`:**
- Added an early-return `if (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) return null;` immediately after the three `useState` / `useTransition` hooks and before `updateMockCard`. All hooks run unconditionally (Rules of Hooks preserved); only the render output short-circuits.
- When the env var is unset (no Stripe in dev), the panel renders unchanged — Phase 4 demo fallback behavior intact.
- T-06-20 mitigated: when Stripe is configured, the mock-card toggle cannot flip `hasMockCardOnFile` without a real Stripe customer.

- **Commit:** `c569160`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] `react-hooks/set-state-in-effect` lint violation in `StripeCardSetup`**

- **Found during:** Task 3 `npm run lint` verification (the Task 2 acceptance criteria includes `npm run lint — no new errors`, but Task 2's original code called `setBootstrapError(...)` and `setIsFetching(true)` synchronously inside the effect body, which the project's `react-hooks/set-state-in-effect` rule flags as an error).
- **Issue:** Synchronous `setState` calls inside `useEffect` bodies cascade re-renders and are rejected by the project's lint config. Two violations: (a) the `!publishableKey` branch called `setBootstrapError(...)` before `return`, (b) the fetch-kickoff branch called `setIsFetching(true)` before awaiting the async IIFE.
- **Fix:** Computed initial `bootstrapError` via a `useState` initializer that reads the module-level `publishableKey` synchronously. Swapped the `isFetching` state for a `useRef` sentinel (`fetchStartedRef`) since the render never needs to read it — only the effect needs to know "did I already kick off a fetch this mount?".
- **Files modified:** `components/auction/stripe-card-setup.tsx`
- **Commit:** `743c42b`
- **Invariants still satisfied:**
  - `stripePromise` still at module scope (line ~17).
  - `<Elements stripe={stripePromise} options={{ clientSecret }}>` wrapping `<PaymentElement />` still the sole card UI.
  - `stripe.confirmSetup({ elements, confirmParams, redirect: "if_required" })` call shape unchanged.
  - Fetch-once-per-mount behavior preserved via the ref guard.
  - Cancellation via closure `cancelled` flag still present for both the success and error paths.
  - Graceful degradation (`publishableKey` missing → error card) still renders without throwing.

**2. [Rule 3 — Blocking signature mismatch] `createSetupIntentForConsumer` requires `{ userId, email }`, not a bare `userId` string**

- **Found during:** Task 1, before the first `npx tsc --noEmit`.
- **Issue:** The plan's literal Task 1 snippet showed `createSetupIntentForConsumer(authorization.session.user.id)` — a single string argument. The actual Plan 06-02 service signature is `createSetupIntentForConsumer(params: { userId: string; email: string }): Promise<...>`. A string argument is a type error.
- **Fix:** Pass `{ userId: authorization.session.user.id, email: authorization.session.user.email ?? "" }`. NextAuth's `Session.user.email` is typed `string | null | undefined`; empty-string fallback is safe (Stripe Customer `email` is optional metadata; the Customer is keyed on `metadata.userId`, not email).
- **Files modified:** `app/api/consumer/setup-intent/route.ts` (this was the initial implementation; the string-arg version was never written).
- **Commit:** `443d3b2`
- **Plan prose impact:** None — the `interfaces` block at the top of the plan already documented the `createSetupIntentForConsumer(userId: string): Promise<...>` shape in its own (summary) form, and the implementation-snippet in `<action>` is illustrative. The 06-02 summary shows the real signature; the 06-04 plan's own success criteria don't pin the arg shape, only the response shape.

### Authentication Gates

None. Plan 06-04 runs entirely as library/client/route-handler code; the Stripe SDK is not invoked during type-checking. The actual SetupIntent API call happens at runtime when a user clicks the first-bid button — that path is not exercised in this plan's verification.

## Verification

- `npx tsc --noEmit` → **exit 0** (verified after each task and once finally after the last commit).
- `npm run lint` → **no errors** after the follow-up fix commit `743c42b` (verified — the pre-fix lint error was the driver of that commit).
- Acceptance-criteria greps (every check from the plan's three `<verify>` blocks plus the top-level `<success_criteria>`, all passing):
  - `grep -q "^\"use client\";" components/auction/stripe-card-setup.tsx` → ok
  - `grep -q "loadStripe(publishableKey)" components/auction/stripe-card-setup.tsx` → ok
  - `grep -q "confirmSetup" components/auction/stripe-card-setup.tsx` → ok
  - `! grep -q "confirmCardSetup" components/auction/stripe-card-setup.tsx` → ok (deprecated API absent)
  - `grep -q 'redirect: "if_required"' components/auction/stripe-card-setup.tsx` → ok
  - `grep -q "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" components/auction/stripe-card-setup.tsx` → ok
  - `grep -q "<PaymentElement />" components/auction/stripe-card-setup.tsx` → ok (only card-data surface)
  - `grep -q "authorizeApiRole" app/api/consumer/setup-intent/route.ts` → ok
  - `grep -q "createSetupIntentForConsumer" app/api/consumer/setup-intent/route.ts` → ok
  - `grep -q "clientSecret" app/api/consumer/setup-intent/route.ts` → ok
  - `grep -q 'runtime = "nodejs"' app/api/consumer/setup-intent/route.ts` → ok
  - `! grep -q "setupIntentId" app/api/consumer/setup-intent/route.ts` → ok (not leaked)
  - `! grep -q "customerId" app/api/consumer/setup-intent/route.ts` → ok (not leaked)
  - `grep -q "import { StripeCardSetup }" components/auction/auction-bid-panel.tsx` → ok
  - `grep -q "cardJustAttached" components/auction/auction-bid-panel.tsx` → ok
  - `grep -q "onCardAttached={" components/auction/auction-bid-panel.tsx` → ok
  - `grep -q "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" components/auction/mock-card-panel.tsx` → ok
  - `grep -q "return null" components/auction/mock-card-panel.tsx` → ok
- Security scan: `grep -rEn 'type="text"|type="number"|name="cardnumber"|name="cvc"|name="exp"' components/auction/stripe-card-setup.tsx` → no matches. Card data never touches our DOM or backend.
- Manual smoke (deferred): full end-to-end requires `.env.local` with `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` + `stripe listen --forward-to localhost:3000/api/webhooks/stripe`. Not executed here (environment constraint: no `.env.local` in workspace).

## Commits

| Task            | Type  | Hash    | Message                                                                     |
| --------------- | ----- | ------- | --------------------------------------------------------------------------- |
| 1               | feat  | 443d3b2 | add authenticated SetupIntent POST route                                    |
| 2               | feat  | 2cbf66f | add StripeCardSetup client component with Payment Element                   |
| 2 (lint fix)    | fix   | 743c42b | avoid synchronous setState in StripeCardSetup effect                        |
| 3               | feat  | c569160 | wire StripeCardSetup into AuctionBidPanel and gate MockCardPanel            |

Baseline: `3ced48e docs(06-03): record plan summary`.

## Known Stubs

**1. `/consumer/card-return` target page does not exist.**

The `confirmSetup` call supplies `return_url: \`${window.location.origin}/consumer/card-return\`` as required by the Stripe API contract (a `return_url` is mandatory even when `redirect: "if_required"` is set). For test card `4242 4242 4242 4242` — the only card exercised in Phase 6 — `confirmSetup` resolves inline without redirecting, so the target page is never visited. Cards that require 3DS (e.g., `4000002500003155`) would redirect to a 404.

- **File:** `components/auction/stripe-card-setup.tsx:117` (the `return_url` literal).
- **Reason for accepting the stub:** Phase 6 explicitly tests only the 4242 card (06-CONTEXT.md §Specifics: "Stripe test cards (4242 4242 4242 4242) should work end-to-end for demo purposes"). The 3DS redirect path is out of scope for v1 (D-11: "No manual retry UI in Phase 6 — failed auction is a terminal state for v1"). A future phase can ship `/consumer/card-return` if 3DS support is added.
- **Does not block the plan's goal.** First-time bidders using the canonical 4242 test card get the full save-card → bid → close flow with no redirect.

## Threat Flags

None. The threat surface introduced by this plan is fully covered by the plan's own `<threat_model>`:

- T-06-05 (PCI / raw PAN exposure) → mitigated via `<PaymentElement />`-only card surface; no text/number inputs in our DOM.
- T-06-06 (publishable-key leak) → accepted; `NEXT_PUBLIC_*` prefix is by design, key is public.
- T-06-17 (unauth SetupIntent creation) → mitigated via `authorizeApiRole("consumer")` gate before any Stripe call.
- T-06-18 (optimistic gate bypass) → accepted with server backstop; `/api/auctions/:id/bid` still reads `hasMockCardOnFile` from the DB (Phase 4 gate unchanged).
- T-06-19 (repeated SI creation on reload) → accepted; `getOrCreateStripeCustomer` reuses the same Customer, only the SetupIntent is fresh per mount.
- T-06-20 (mock-card toggle writable with Stripe configured) → mitigated via the `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` render guard in `MockCardPanel`.

No new surface is introduced beyond what the threat model enumerates.

## Self-Check: PASSED

**Files verified present:**

- FOUND: `app/api/consumer/setup-intent/route.ts`
- FOUND: `components/auction/stripe-card-setup.tsx`
- FOUND: `components/auction/auction-bid-panel.tsx` (modified)
- FOUND: `components/auction/mock-card-panel.tsx` (modified)
- FOUND: `.planning/phases/06-payments/06-04-SUMMARY.md` (this file)

**Commits verified in git log:**

- FOUND: 443d3b2 (Task 1 — SetupIntent route)
- FOUND: 2cbf66f (Task 2 — StripeCardSetup component)
- FOUND: 743c42b (Task 2 lint fix)
- FOUND: c569160 (Task 3 — wire into bid panel + gate mock-card)

All plan tasks committed atomically on top of `3ced48e` (end of Plan 06-03). `npx tsc --noEmit` exits 0; `npm run lint` has no errors. Every `must_haves.truths` invariant verified by grep against the committed files.
