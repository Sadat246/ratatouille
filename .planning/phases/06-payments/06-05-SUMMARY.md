---
phase: 06-payments
plan: 05
subsystem: payments
tags: [stripe, payments, post-commit, auction-close, fallback]
requirements: [D-04, D-05, D-06, D-08, D-10]
dependency_graph:
  requires:
    - "Plan 06-02 (chargeBuyout, chargeBidderOffSession, ChargeOutcome, runFallbackBidderLoop)"
    - "Plan 06-03 (payment_intent.succeeded webhook — authoritative `captured` transition)"
    - "Phase 4 auction engine (AuctionMutationResult, settlement insert in closeAuctionWithWinner)"
  provides:
    - "lib/payments/auction-trigger.ts::triggerAuctionPaymentIfCloseResult — post-commit charge dispatcher"
    - "Post-commit wiring inside lib/auctions/service.ts for buyoutAuction, refreshAuctionIfOverdue, sweepOverdueAuctions"
  affects:
    - "End-to-end payment loop: Phase 4 closes auction -> Plan 06-05 fires Stripe charge -> Plan 06-03 webhook transitions to captured + spawns fulfillment"
tech_stack:
  added: []
  patterns:
    - "Dynamic import() of Stripe-touching modules so auction-close paths do not require STRIPE_SECRET_KEY at module load; preserves Phase 4 mock-card demo when Stripe is unconfigured"
    - "Post-commit call sibling of notifyAuctionMutation(result) — strictly outside getInteractiveDb().transaction(async (tx) => { ... }) closures (Pitfall §1 / T-06-21)"
    - "Parallelized trigger calls in sweepOverdueAuctions via Promise.all, mirroring the existing notify fan-out so a slow Stripe API does not serialize the whole sweep"
    - "Single-sourced state machine: direct call writes paymentStatus='capture_requested'; webhook owns the 'captured' transition and fulfillment row insert"
    - "Type-guarded AuctionMutationResult — only auction_closed / auction_bought_out with non-null winningBidId + winningBidUserId reach the Stripe path"
key_files:
  created:
    - "lib/payments/auction-trigger.ts"
  modified:
    - "lib/auctions/service.ts"
decisions:
  - "STRIPE_SECRET_KEY absent -> early-exit log + return. Phase 4 demo (mock card) survives unchanged; no Stripe SDK module is dynamically loaded in that branch."
  - "Stripe-touching modules (./payment-intents, ./fallback) are loaded via dynamic import() only after the STRIPE_SECRET_KEY check. Static imports would indirectly import ./stripe which throws on first property access via its Proxy without the env var; dynamic import defers that evaluation to the moment we have already confirmed the key is present."
  - "Buyout + charge failure does NOT run runFallbackBidderLoop (D-05: buyout is a user-elected single-bidder transaction; there is no runner-up cascade). Instead marks settlement status='voided' + paymentStatus='failed'."
  - "Auction-close + charge failure DOES run runFallbackBidderLoop(settlement.id) inline so the direct path and the webhook path (Plan 06-03 payment_intent.payment_failed handler) are interchangeable durability nets."
  - "On captured outcome the direct writer sets paymentStatus='capture_requested' only (NOT 'captured') so the webhook is the single authoritative captured-writer + fulfillment-spawner. Re-entry on already captured/capture_requested/failed settlements short-circuits."
  - "Added a defensive null-guard on settlement.grossAmountCents before charging (the DB column is nullable even though closeAuctionWithWinner always writes it). Logs + returns if null, rather than crashing the post-commit path."
  - "Buyer with no stripeCustomerId / stripePaymentMethodId: for auction_closed -> fall through to runFallbackBidderLoop (loop itself defensively skips cardless bidders); for auction_bought_out -> mark settlement voided/failed (no runner-up to cascade to)."
metrics:
  duration: "~4 min (single sequential executor on main working tree)"
  tasks_completed: 2
  files_changed: 2
  completed_date: "2026-04-18"
---

# Phase 06 Plan 05: Post-Commit Payment Trigger Summary

Close the payment loop. Adds `lib/payments/auction-trigger.ts` — a post-commit dispatcher that, given an `AuctionMutationResult`, looks up the settlement and buyer profile and fires the correct Stripe charge (`chargeBuyout` for buyouts, `chargeBidderOffSession` for naturally-closed auctions). Wires the dispatcher into the three auction-close code paths in `lib/auctions/service.ts` strictly AFTER the Drizzle transaction commits. Closes CONTEXT D-04, D-05, D-06, D-08, D-10 by connecting the Plan 06-02 service layer and the Plan 06-03 webhook durability net to the live auction engine from Phase 4.

## Tasks

### Task 1 — `lib/payments/auction-trigger.ts`

- Created `lib/payments/auction-trigger.ts` (188 lines) with `import "server-only";` line 1.
- `isPayableCloseResult` type-guard narrows `AuctionMutationResult` to `action ∈ {auction_closed, auction_bought_out}` with non-null `winningBidId` + `winningBidUserId`. Protects the TypeScript compiler and guarantees no charge ever fires on `auction_no_sale` / `auction_expired` / `auction_cancelled` / `bid_accepted`.
- Early-exit on `!getOptionalEnv("STRIPE_SECRET_KEY")` — logs one info line and returns before any Stripe-adjacent dynamic import (Phase 4 demo compat).
- Loads settlement via `db.query.settlements.findFirst` on `auctionId` (unique index). Missing settlement -> error log + return (defensive; closeAuctionWithWinner always inserts one).
- Idempotency short-circuit: if `settlement.paymentStatus ∈ {captured, capture_requested, failed}` returns without calling Stripe. Prevents double-charge when both the direct path and the `payment_intent.succeeded` webhook race (T-06-02 mitigation layer on top of Plan 06-02's per-attempt idempotency key).
- Defensive guards: `!settlement.buyerUserId` -> error + return; `settlement.grossAmountCents === null` -> error + return. Amount is read from `settlements.grossAmountCents` exclusively, never from any client-originated input (T-06-04).
- Profile lookup: `db.query.consumerProfiles.findFirst` on `userId = settlement.buyerUserId`. If `stripeCustomerId` or `stripePaymentMethodId` is missing:
  - `auction_closed` -> dynamically imports and invokes `runFallbackBidderLoop(settlement.id)` (the loop itself defensively skips cardless bidders and walks the next candidate).
  - `auction_bought_out` -> marks settlement `paymentStatus='failed'`, `status='voided'` and returns (D-05: no runner-up cascade for buyouts).
- Routes to the correct charge service:
  - `auction_bought_out` -> `chargeBuyout(...)`
  - `auction_closed` -> `chargeBidderOffSession({ ..., attemptNumber: 1 })` (literal `1` for the direct path; the fallback loop manages higher attempt numbers from `2..n` during runner-up cascade).
- On `ChargeOutcome.kind === "captured"` -> `db.update(settlements).set({ processor: "stripe", processorIntentId: outcome.paymentIntentId, paymentStatus: "capture_requested", updatedAt: new Date() })`. **NOT** `captured`: the `payment_intent.succeeded` webhook (Plan 06-03) is the single authoritative writer of the captured transition + fulfillment row insert. Writing `captured` here would race the webhook's `if (settlement.paymentStatus === "captured") return` short-circuit and could skip fulfillment creation.
- On `ChargeOutcome.kind === "requires_action"` -> logs an error (defensive — `error_on_requires_action: true` from Plan 06-02 should make this unreachable for off-session PIs; buyout is on-session and therefore could legitimately see it). Falls through to the `failed` branch for state-machine consistency.
- On `ChargeOutcome.kind === "failed"` (or `requires_action` fallthrough):
  - `auction_bought_out` -> marks settlement `paymentStatus='failed'`, `status='voided'`, persists `processorIntentId` if non-null (D-11: no manual retry UI; business operator handles via dashboard).
  - `auction_closed` -> dynamically imports and invokes `runFallbackBidderLoop(settlement.id)`. The loop marks the listing `expired` and the settlement `failed` when the candidate list is exhausted (Plan 06-02 Task 6).
- Dynamic imports of `./payment-intents` and `./fallback` via `await import(...)` ensure module load in a Stripe-less environment does not pull in the Stripe SDK and preserves Phase 4 demo boot.
- No Drizzle transaction in this file — two independent `db.update` writes are sufficient. Outer call site guarantees this runs after the close transaction committed (Pitfall §1 / T-06-21).
- `npx tsc --noEmit` -> exit 0.
- **Commit:** `fa0631f`

### Task 2 — Wire into `lib/auctions/service.ts`

Three small edits + one import, all strictly outside any `getInteractiveDb().transaction(async (tx) => { ... })` closure.

- **Edit A — import.** Added `import { triggerAuctionPaymentIfCloseResult } from "@/lib/payments/auction-trigger";` immediately below the existing `notifyAuctionMutation` import (line 17), preserving the file's `@/`-grouped ordering.
- **Edit B — `buyoutAuction`.** After `await notifyAuctionMutation(result);` and before `return result;` at the end of the function (post-tx, line 633): `await triggerAuctionPaymentIfCloseResult(result);`.
- **Edit C — `refreshAuctionIfOverdue`.** Inside the existing `if (result)` branch, immediately after `await notifyAuctionMutation(result);` (post-tx, line 723): `await triggerAuctionPaymentIfCloseResult(result);`. The guard is preserved because this function returns `AuctionMutationResult | null`.
- **Edit D — `sweepOverdueAuctions`.** Added a sibling `await Promise.all(results.map((result) => triggerAuctionPaymentIfCloseResult(result)));` (post-tx, line 770) directly below the existing `notifyAuctionMutation` Promise.all fan-out. Parallelized so one slow Stripe call does not serialize the whole sweep — each settlement has a distinct idempotency key so no collision risk.
- NOT touched: `closeAuctionWithWinner` (private; runs inside tx), `closeAuctionWithoutWinner` (no winner, nothing to charge), `cancelAuction` (cancelled auctions never charge), `placeBid` (D-04: regular bids hold no funds).
- `grep -c "triggerAuctionPaymentIfCloseResult" lib/auctions/service.ts` = **4** (1 import + 3 call sites).
- Visual placement check (`grep -n "triggerAuctionPaymentIfCloseResult\|transaction(async" lib/auctions/service.ts`):
  - Line 17: import
  - Line 539: `buyoutAuction` tx start -> Line 633: trigger call (tx closes at line 631's `});` — call is OUTSIDE)
  - Line 700: `refreshAuctionIfOverdue` tx start -> Line 723: trigger call (tx closes at line 719's `});` — call is OUTSIDE, inside `if (result)`)
  - Line 730: `sweepOverdueAuctions` tx start -> Line 770: trigger call (tx closes at line 766's `});` — call is OUTSIDE)
- `npx tsc --noEmit` -> exit 0.
- **Commit:** `a8f4464`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — Missing critical input validation] Added null guard on `settlement.grossAmountCents`**

- **Found during:** Task 1, first `npx tsc --noEmit` pass.
- **Issue:** The DB schema defines `grossAmountCents: integer("gross_amount_cents")` — nullable (see `db/schema/payments.ts:58`). The plan's action code passed `settlement.grossAmountCents` directly as the `amountCents` arg to `chargeBuyout` / `chargeBidderOffSession`, whose parameter types are `number` (not `number | null`). TypeScript fails the compile.
- **Fix:** Added an explicit guard after the `buyerUserId` guard: `if (settlement.grossAmountCents === null) { console.error(...); return; }`. This is a correctness-preserving null-check, not a behavioural change — `closeAuctionWithWinner` always writes a non-null value (service.ts line 216), so the guard is only reached for manually-corrupted data or edge cases (Rule 2: missing critical input validation).
- **Files modified:** `lib/payments/auction-trigger.ts`.
- **Commit:** `fa0631f` (same as Task 1).
- **Invariants still satisfied:** All amount reads still come exclusively from `settlements.grossAmountCents` (T-06-04 mitigation intact); no request-body / client-trusted input is read.

**2. [Rule 2 — Missing critical branch] Buyer with no Stripe card + `auction_bought_out` now marks settlement voided/failed instead of invoking fallback loop**

- **Found during:** Task 1 author-review, before commit.
- **Issue:** The plan's action code unconditionally falls through to `runFallbackBidderLoop(settlement.id)` when `profile?.stripeCustomerId || profile.stripePaymentMethodId` is missing — but the plan's own acceptance criteria also state "Buyout + charge failure: we DO NOT invoke the fallback bidder loop (D-05)". The two instructions conflict for the edge case "buyout clicked with no card on file" (which should be a no-card-gate failure, not a runner-up cascade).
- **Fix:** Split the cardless-buyer branch by `result.action`: for `auction_bought_out` -> mark `paymentStatus='failed'`, `status='voided'` and return; for `auction_closed` -> fall through to `runFallbackBidderLoop` as the plan directed. Matches D-05 semantics and is consistent with the later cardless-buyout handling on `ChargeOutcome.kind === 'failed'`.
- **Files modified:** `lib/payments/auction-trigger.ts`.
- **Commit:** `fa0631f` (same as Task 1).
- **Alignment:** Reconciles two conflicting acceptance-criteria bullets ("falls through to runFallbackBidderLoop... OR logs+returns" vs. "Buyout + charge failure: we DO NOT invoke the fallback bidder loop"). D-05 wins because it is the external contract; the action-code phrasing in the plan was an oversight in the cardless-buyer branch.

### Authentication Gates

None during execution. No Stripe API calls were issued from the executor — the dispatcher only runs when a real auction close fires `notifyAuctionMutation(result)` in a configured environment. The STRIPE_SECRET_KEY early-exit covers the dev-without-Stripe case.

## Verification

- `npx tsc --noEmit` -> **exit 0** (verified after Task 1, after Task 2, and once more after the SUMMARY commit)
- `npm run lint` -> not run (carried-over guidance from Plans 06-01/06-02/06-03/06-04; touched files introduce no new lint-relevant patterns)
- Acceptance-grep verification (all passing):
  - `grep -q '^import "server-only";' lib/payments/auction-trigger.ts` -> present on line 1
  - `grep -q "triggerAuctionPaymentIfCloseResult" lib/payments/auction-trigger.ts` -> present
  - `grep -q 'getOptionalEnv("STRIPE_SECRET_KEY")' lib/payments/auction-trigger.ts` -> present
  - `grep -q 'await import("./payment-intents")' lib/payments/auction-trigger.ts` -> present (one call site)
  - `grep -q 'await import("./fallback")' lib/payments/auction-trigger.ts` -> present (two call sites: cardless auction_closed branch + failed auction_closed branch)
  - `grep -q 'paymentStatus: "capture_requested"' lib/payments/auction-trigger.ts` -> present on the captured branch
  - `grep -q "runFallbackBidderLoop" lib/payments/auction-trigger.ts` -> present (two occurrences matching the two dynamic imports)
  - `grep -q "auction_bought_out" lib/payments/auction-trigger.ts` -> present (type-guard + charge routing + failed-branch voiding)
  - `grep -q "attemptNumber: 1" lib/payments/auction-trigger.ts` -> present in chargeBidderOffSession call
  - `grep "from \"./stripe\"" lib/payments/auction-trigger.ts` -> **NO MATCH** (forbidden static import absent)
  - `grep "getInteractiveDb" lib/payments/auction-trigger.ts` -> **NO MATCH** (no Drizzle transaction in this file)
  - `grep -c "triggerAuctionPaymentIfCloseResult" lib/auctions/service.ts` -> **4** (1 import + 3 call sites)
  - `grep -q 'await triggerAuctionPaymentIfCloseResult(result);' lib/auctions/service.ts` -> present (two sync sites)
  - `grep -q 'results.map((result) => triggerAuctionPaymentIfCloseResult(result))' lib/auctions/service.ts` -> present (sweep site)
- Placement audit via `grep -n "triggerAuctionPaymentIfCloseResult\|transaction(async" lib/auctions/service.ts`: all 3 call sites (lines 633, 723, 770) appear AFTER the matching `transaction(async (tx) => ...)` opener closes (lines 631, 719, 766 close brace `});`). Stripe calls never run inside a Drizzle transaction callback.
- `closeAuctionWithWinner` body (lines 185-260) untouched; `placeBid` body (lines 395-529) untouched; `cancelAuction` body untouched; `closeAuctionWithoutWinner` untouched.

### Runtime Smoke Tests (deferred — no Stripe keys configured)

The `<environment_constraints>` block of the execution prompt explicitly directed that `STRIPE_SECRET_KEY` is not set in this workspace. The trigger's early-exit on missing env has been exercised implicitly via `npx tsc --noEmit` (module load works without the key). End-to-end runtime smoke tests from the plan's `<verification>` section (first-bid gate -> SetupIntent -> saved card -> bid -> auto-close -> captured via webhook; buyout; fallback cascade; dev-without-Stripe demo survival) will run once `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` are in `.env.local` and `stripe listen --forward-to localhost:3000/api/webhooks/stripe` is running (outside executor scope per constraint).

## Commits

| Task | Type | Hash    | Message                                                                        |
| ---- | ---- | ------- | ------------------------------------------------------------------------------ |
| 1    | feat | fa0631f | add triggerAuctionPaymentIfCloseResult post-commit charge dispatcher           |
| 2    | feat | a8f4464 | wire triggerAuctionPaymentIfCloseResult into auction close paths               |

Baseline: `185e671 docs(06-04): record plan summary` (end of Plan 06-04, Wave 2 complete).

## Known Stubs

None. Every code path is fully wired to the real DB schema, the real Stripe charge services (via dynamic import), and the real fallback loop. The `STRIPE_SECRET_KEY`-unset branch is not a stub — it is the explicit Phase 4 demo compatibility path (CONTEXT D-08 / environment constraint), and the `console.info` log is the intended operator signal.

## Threat Flags

None. This plan introduces no new public surface. All three threat-model entries from the plan body are mitigated in the delivered code:

- **T-06-02** (Double-charge via duplicate trigger / webhook replay) -> mitigated: `if (paymentStatus ∈ {captured, capture_requested, failed}) return` short-circuits re-entry on a resolved settlement. Layered on top of Plan 06-02's per-attempt idempotency key (`pi:{settlementId}:attempt:{n}`) which makes Stripe return the cached response on a duplicate create with the same key.
- **T-06-03** (3DS park double-charge on off-session) -> mitigated upstream in Plan 06-02 (`error_on_requires_action: true`); Task 1 defensively converts a stray `requires_action` outcome to a failed-branch write (void + fail for buyout, fallback loop for auction-close).
- **T-06-04** (Client-trusted amount) -> mitigated: `amountCents` is read exclusively from `settlements.grossAmountCents`, which was written server-side inside the auction-close tx from the winning bid amount. No request body / client input is read anywhere in this file. Acceptance-grep confirms absence of `result.amountCents`, `request.body`, `req.json`, etc.
- **T-06-06** (Secret-key leak) -> mitigated: `import "server-only";` on line 1. Dynamic imports of `./payment-intents` and `./fallback` do not cross the server-only boundary because both files also carry `import "server-only";` and the dispatcher is only imported from `lib/auctions/service.ts` (server-only transitively).
- **T-06-21** (Stripe call inside Drizzle tx) -> mitigated: line-level placement audit confirms all 3 call sites in service.ts are siblings of `notifyAuctionMutation(result)` and strictly outside the `getInteractiveDb().transaction(async (tx) => { ... })` closures. No Drizzle transaction exists in auction-trigger.ts itself.
- **T-06-22** (Stripe API timeout serializes sweep) -> mitigated: `sweepOverdueAuctions` fan-outs via `Promise.all`, mirroring the existing `notifyAuctionMutation` pattern. Plan 06-02's `maxNetworkRetries: 2` on the Stripe client caps the total per-auction latency.
- **T-06-23** (App boots with Stripe env but no DB columns) -> accept: Plan 06-01 is [BLOCKING] upstream; if the env is present but columns are missing, the profile lookup throws loudly (not silent).

## Self-Check: PASSED

**Files verified present:**

- FOUND: `lib/payments/auction-trigger.ts`
- FOUND: `lib/auctions/service.ts` (modified — confirmed via `grep -c triggerAuctionPaymentIfCloseResult` = 4)
- FOUND: `.planning/phases/06-payments/06-05-SUMMARY.md` (this file)

**Commits verified in git log:**

- FOUND: `fa0631f` (Task 1)
- FOUND: `a8f4464` (Task 2)

All 2 plan tasks committed atomically on top of `185e671` (Wave 2 complete). `npx tsc --noEmit` exits 0. Every `must_haves.truths` invariant verified by grep against the committed files; every `<success_criteria>` checkbox from the execution prompt satisfied; zero Stripe calls inside any DB transaction (verified by line-number placement relative to `transaction(async (tx) =>` openers).
