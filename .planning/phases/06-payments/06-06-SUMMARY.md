---
phase: 06-payments
plan: 06
subsystem: payments
tags: [docs, readme, phase-6-demo, walk-through]
requirements: [D-01, D-02, D-03, D-04, D-05, D-06, D-07, D-08, D-10, D-12]
dependency_graph:
  requires:
    - "Plan 06-01 (Stripe deps + .env.example + `## Stripe webhooks (local development)` README section)"
    - "Plan 06-02 (chargeBuyout, chargeBidderOffSession, runFallbackBidderLoop — symbols referenced by name)"
    - "Plan 06-03 (webhook terminal states: payment_intent.succeeded → captured + fulfillment; payment_intent.payment_failed → fallback)"
    - "Plan 06-04 (StripeCardSetup + AuctionBidPanel first-bid gating; MockCardPanel hidden when publishable key set)"
    - "Plan 06-05 (triggerAuctionPaymentIfCloseResult post-commit wiring in buyoutAuction / refreshAuctionIfOverdue / sweepOverdueAuctions)"
  provides:
    - "README.md::## Demo walk-through — reviewer-facing end-to-end runbook covering MV-1..MV-8"
  affects:
    - "Phase 6 reviewer UX: the README alone is sufficient to reach a captured test-mode PaymentIntent, observe the fallback loop, buy out an auction, and verify the 10%/90% commission split on /sell/outcomes"
tech_stack:
  added: []
  patterns:
    - "Docs-only artifact — no source/schema/env/dep changes; only README.md modified"
    - "Symbol-anchored walk-through — every narrative step cites real identifiers (triggerAuctionPaymentIfCloseResult, runFallbackBidderLoop, chargeBidderOffSession, chargeBuyout, sweepOverdueAuctions, buyoutAuction, stripe_webhook_events, consumer_profiles, settlements, fulfillments) so a future grep-based audit can detect drift"
    - "Appended strictly after the Plan 06-01 `## Stripe webhooks (local development)` section (last H2 in the file); no pre-existing content modified"
    - "CRLF line endings preserved (file-native convention); trailing newline preserved"
key_files:
  created: []
  modified:
    - "README.md (+107 lines, -0 lines — one new H2 `## Demo walk-through` + five H3 sub-sections)"
decisions:
  - "Anchored the walk-through to real symbol names from Plans 06-02/06-03/06-05 so a reviewer can grep from README to implementation — matches plan's `key_links` must-have"
  - "Explicitly called out `/sell/outcomes` as the commission-split verification surface (no new UI needed — SellerOutcomesList already renders grossAmountCents / platformFeeCents / sellerNetAmountCents / settlementStatus / settlementPaymentStatus)"
  - "Referenced `npm run db:studio` for DB state verification rather than introducing a bespoke diagnostic UI"
  - "Did NOT duplicate the Stripe CLI forwarding command or env var list (lives in Plan 06-01's `## Stripe webhooks (local development)` section); instead referenced it by heading"
  - "Wrote test card numbers with spaces (e.g. `4242 4242 4242 4242`) matching stripe.com/docs/testing — preserves copy-paste from the Stripe docs into the Payment Element"
  - "Documented the `error_on_requires_action: true` fail-fast behavior AND the rationale (a parked 3DS PI could be completed by the shopper later, after we've already charged the next bidder) — core double-charge safety net from Plan 06-02"
  - "Surfaced idempotency key patterns `pi:{settlementId}:attempt:{n}` (winning bid) and `pi:buyout:{settlementId}` (buyout) so a reviewer can trace from Stripe Dashboard back into the code"
metrics:
  duration: "~2 min (single sequential executor, docs-only task)"
  tasks_completed: 1
  files_changed: 1
  completed_date: "2026-04-18"
---

# Phase 06 Plan 06: Phase 6 Demo Walk-through Summary

Close Phase 6 with a docs-only deliverable. Append a `## Demo walk-through` section to `README.md` that lets a reviewer reproduce all 8 Manual-Only Verifications (MV-1..MV-8) from `06-VALIDATION.md` end-to-end without reading PLAN, CONTEXT, or RESEARCH files. Anchors each narrative step to real symbols from Plans 06-02/06-03/06-05 (`triggerAuctionPaymentIfCloseResult`, `runFallbackBidderLoop`, `chargeBidderOffSession`, `chargeBuyout`, `sweepOverdueAuctions`, `buyoutAuction`) and to the real verification surfaces (`/sell/outcomes`, `npm run db:studio`, `stripe_webhook_events`). No code changes. Zero new env vars, zero new deps, zero schema changes.

## Tasks

### Task 1 — Append `## Demo walk-through` section to `README.md`

- Appended a single new H2 (`## Demo walk-through`) at the end of `README.md`, strictly AFTER the `## Stripe webhooks (local development)` section added by Plan 06-01 Task 7.
- Five H3 sub-sections, narrative order Happy → Failure A → Failure B → Buyout → Dashboard:
  1. `### Happy path: first bid → auction close → capture` — 8 numbered steps covering MV-1 (first-bid SetupIntent with card `4242 4242 4242 4242`), MV-2 (saved-card reuse on second bid, no modal), MV-3 (natural close → `sweepOverdueAuctions` → post-commit `triggerAuctionPaymentIfCloseResult` → `chargeBidderOffSession` with `off_session: true` + `error_on_requires_action: true` + `kind=auction_winner` → `payment_intent.succeeded` webhook → `settlements.payment_status = 'captured'` + `fulfillments` row with `mode = 'pickup'`), MV-6 (commission split on `/sell/outcomes`: 10% platform fee, 90% seller net — D-07), and MV-8 (duplicate webhook dedup via `stripe_webhook_events` idempotency table).
  2. `### Failure path A: insufficient funds → fallback bidder` — 5 numbered steps covering MV-4: high bidder with card `4000 0000 0000 9995`, `payment_intent.payment_failed` webhook invokes `runFallbackBidderLoop(settlementId)`, settlement rewrite (`buyer_user_id` + `gross_amount_cents` + `platform_fee_cents` + `seller_net_amount_cents` recomputed), runner-up charged off-session with `attemptNumber = 2`, `/sell/outcomes` reflects runner-up's bid. References `SELECT … FOR UPDATE` lock in the fallback loop that serializes concurrent entries from the webhook path and the direct post-commit path.
  3. `### Failure path B: authentication required → fail-fast (no 3DS park)` — 4 numbered steps covering MV-7: high bidder with card `4000 0027 6000 3184`, `chargeBidderOffSession` with `error_on_requires_action: true` fails synchronously with `StripeCardError`, `triggerAuctionPaymentIfCloseResult` catches failed outcome and invokes `runFallbackBidderLoop`. Documents the core double-charge safety net rationale (a parked PI could be completed by the shopper after we've already charged the next bidder). No-runner-up terminal state: listing `expired` + settlement `payment_status='failed'`.
  4. `### Buyout path` — 3 numbered steps covering MV-5: Buy now creates **on-session** PaymentIntent (no `off_session: true`, no `error_on_requires_action: true` — 3DS permitted) with metadata `kind=buyout` and idempotency key `pi:buyout:{settlementId}`. `buyoutAuction` closes the auction synchronously; `payment_intent.succeeded` webhook flips settlement to `captured` and creates fulfillment within ~1s. A failed buyout is NOT rerouted to runners-up (D-05) — settlement marked `voided` / `failed`.
  5. `### What to verify on the Stripe Dashboard` — 4 bullet assertions on PI metadata shape (`settlementId`, `auctionId`, `bidderUserId`, `attemptNumber`, `kind`), idempotency cache behavior (`pi:{settlementId}:attempt:{n}` returns cached PI on retry), and live-mode safety trip ("If you see a live-mode charge, stop the demo — an env var is wrong").
- Opening paragraph names the prerequisites by heading (`## Stripe webhooks (local development)` section above, env vars `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` / `STRIPE_WEBHOOK_SECRET`, `stripe listen` command) without duplicating the full command — avoids drift.
- Test-mode safety disclaimer ("No real money is ever charged — Stripe is in test mode.") immediately under the H2 opening paragraph (mitigates T-06-25 from the plan's threat model).
- Every inline identifier uses single-backtick code spans: env var names, DB columns, function names, test card numbers (with spaces), metadata keys, file paths, route paths. No fenced code blocks inside the walk-through (plan forbade wrapping numbered steps in code).
- No existing README content modified — `git diff --stat README.md` shows `107 insertions(+)` with zero deletions.
- CRLF line endings preserved (file-native convention — confirmed via `tail -c 20 README.md | xxd` showing `0d 0a` line terminators on both sides of the edit).
- File ends with a final `\n` after the last line (preserves pre-edit convention).
- **Commit:** `1fa51b0`

## MV Coverage Map (1:1 trace to `06-VALIDATION.md` Manual-Only Verifications)

| MV ID | Behavior                                                                   | README Location                                                           | Key symbols / anchors surfaced                                                                              |
| ----- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| MV-1  | First bid triggers SetupIntent + Payment Element; card `4242` attaches     | Happy path steps 1–4                                                      | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `js.stripe.com` iframe, `setup_intent.succeeded` webhook              |
| MV-2  | Second bid by same user reuses saved card (no modal)                       | Happy path step 5                                                         | decision D-02 referenced inline                                                                             |
| MV-3  | Natural close → off-session PI → `captured` + fulfillment row              | Happy path steps 6–7                                                      | `sweepOverdueAuctions`, `triggerAuctionPaymentIfCloseResult`, `chargeBidderOffSession`, `off_session: true`, `error_on_requires_action: true`, `kind=auction_winner`, `settlements.payment_status`, `fulfillments`, `mode = 'pickup'`, D-10 |
| MV-4  | Failed winner (card `9995`) → fallback loop runs                           | Failure path A                                                            | `payment_intent.payment_failed`, `runFallbackBidderLoop(settlementId)`, `SELECT … FOR UPDATE` settlement lock, `attemptNumber = 2`, settlement field rewrite, D-06 |
| MV-5  | Buyout fires on-session PI; captured immediately                           | Buyout path                                                               | `buyoutAuction`, `kind=buyout`, `pi:buyout:{settlementId}`, on-session semantics, D-05 no-runner-up policy |
| MV-6  | `/sell/outcomes` shows 10% fee + 90% net                                   | Happy path step 8 + Failure path A step 5 + Dashboard section             | `/sell/outcomes`, `10% platform fee`, `90% of gross`, D-07                                                  |
| MV-7  | `requires_action` card (`3184`) off-session fails fast, not parked         | Failure path B                                                            | `4000 0027 6000 3184`, `error_on_requires_action: true`, `StripeCardError`, double-charge safety rationale  |
| MV-8  | Duplicate webhook delivery dedups (no second fulfillment insert)           | Happy path step 7 ("Re-delivery of the same event is a no-op")            | `stripe_webhook_events` idempotency table                                                                   |

All 8 MV items from `06-VALIDATION.md` are covered; plan's `must_haves.truths` for commission-split verification via `/sell/outcomes` is anchored in Happy path step 8 (and again in the Dashboard section for the idempotency key behavior).

## Deviations from Plan

None. The plan specified exact markdown content verbatim inside its `<action>` block; the append reproduces that content 1:1 with no additions, removals, or reorderings. No Rule 1 / Rule 2 / Rule 3 auto-fixes were needed — the plan's markdown was syntactically correct, the existing README structure matched the plan's assumptions (five pre-existing H2s ending with `## Stripe webhooks (local development)`), and the grep acceptance criteria all passed on the first write.

### Authentication Gates

None. Docs-only task — no external services contacted, no credentials required.

## Verification

All automated checks from `<verify>` block passed:

- `grep -q "^## Demo walk-through$" README.md` ✓
- `grep -q "^### Happy path: first bid → auction close → capture$" README.md` ✓
- `grep -q "^### Failure path A: insufficient funds → fallback bidder$" README.md` ✓
- `grep -q "^### Failure path B: authentication required → fail-fast" README.md` ✓
- `grep -q "^### Buyout path$" README.md` ✓
- `grep -q "^### What to verify on the Stripe Dashboard$" README.md` ✓
- `grep -q "4242 4242 4242 4242" README.md` ✓
- `grep -q "4000 0000 0000 9995" README.md` ✓
- `grep -q "4000 0027 6000 3184" README.md` ✓
- `grep -q "runFallbackBidderLoop" README.md` ✓
- `grep -q "chargeBidderOffSession" README.md` ✓
- `grep -q "triggerAuctionPaymentIfCloseResult" README.md` ✓
- `grep -q "off_session = true" README.md` ✓
- `grep -q "kind = auction_winner" README.md` ✓
- `grep -q "kind = buyout" README.md` ✓
- `grep -q "pi:{settlementId}:attempt:{n}" README.md` ✓
- `grep -q "pi:buyout:{settlementId}" README.md` ✓
- `grep -q "/sell/outcomes" README.md` ✓
- `grep -q "npm run db:studio" README.md` ✓
- `grep -q "stripe_webhook_events" README.md` ✓
- `grep -q "error_on_requires_action: true" README.md` ✓
- `grep -q "10% platform fee" README.md` ✓

Structural checks from the `<verification>` block:

- `grep -n "^## " README.md` → 5 H2s; `## Demo walk-through` is the LAST H2 in the file (line 74). The pre-existing `## Stack`, `## Local development`, `## Database workflow`, `## Stripe webhooks (local development)` sections remain byte-identical.
- `grep -c '^## ' README.md` = **5** (was 4; +1 new H2) ✓
- `grep -c '^### ' README.md` increased by exactly **5** (five new H3s: Happy path, Failure A, Failure B, Buyout, Dashboard) ✓
- `grep -q "## Stripe webhooks (local development)"` → present (Plan 06-01 section untouched) ✓
- `grep -q "## Database workflow"` → present (pre-existing section untouched) ✓
- `git diff --stat README.md` → `107 insertions(+)`, zero deletions ✓
- `grep -c '^```' README.md` = **12** (even — all fences balanced; the plan's fenced blocks live in the earlier `## Local development`, `## Database workflow`, and `## Stripe webhooks (local development)` sections — the walk-through itself uses only inline code spans) ✓
- Trailing-byte check: `tail -c 20 README.md | xxd` shows `v var..  is wrong...` ending with `0d 0a` (CRLF + final newline preserved) ✓

No runtime smoke tests were executed in this plan — the walk-through is the script for runtime smoke; it is `/gsd-verify-work` and manual reviewer validation that drive MV-1..MV-8 through the real Stripe Dashboard.

## Commits

| Task | Type | Hash    | Message                                             |
| ---- | ---- | ------- | --------------------------------------------------- |
| 1    | docs | 1fa51b0 | add Phase 6 demo walk-through to README             |

Baseline: `54e4397 docs(06-05): record plan summary` (end of Plan 06-05, end of Wave 3).

## Known Stubs

None. The walk-through references only shipped code paths from Plans 06-01 through 06-05; every symbol cited by name exists in the codebase at the baseline commit (`triggerAuctionPaymentIfCloseResult` in `lib/payments/auction-trigger.ts`, `runFallbackBidderLoop` in `lib/payments/fallback.ts`, `chargeBidderOffSession` / `chargeBuyout` in `lib/payments/payment-intents.ts`, `sweepOverdueAuctions` / `buyoutAuction` / `refreshAuctionIfOverdue` in `lib/auctions/service.ts`, `stripe_webhook_events` table in `db/schema/payments.ts`).

## Threat Flags

None new. Plan's own threat register (T-06-24 info disclosure, T-06-25 production confusion, T-06-26 doc drift) is mitigated in the delivered section:

- **T-06-24 (info disclosure)** → mitigated: only env var **names** shown (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`); no secret values, no prod URLs. Test cards are publicly documented on stripe.com/docs/testing.
- **T-06-25 (production confusion)** → mitigated: opening paragraph explicitly states "No real money is ever charged — Stripe is in test mode." and the Dashboard section closes with "If you see a live-mode charge, stop the demo — an env var is wrong."
- **T-06-26 (stale after code change)** → accepted upstream by the plan; this summary anchors each walk-through step to concrete symbols so `gsd-docs-update` (or a future grep-based audit) can detect drift between README and the live codebase.

## Self-Check: PASSED

**Files verified present:**

- FOUND: `README.md` (modified — `## Demo walk-through` section confirmed via `grep -q "^## Demo walk-through$" README.md`)
- FOUND: `.planning/phases/06-payments/06-06-SUMMARY.md` (this file)

**Commits verified in git log:**

- FOUND: `1fa51b0` (Task 1 — `docs(06-06): add Phase 6 demo walk-through to README`)
- Will append (final metadata commit): `docs(06-06): record plan summary`

All 1 plan task committed atomically on top of `54e4397` (end of Plan 06-05 / Wave 3). Every `<success_criteria>` checkbox from the execution prompt is satisfied; all 22 grep markers from the `<verify>` block return the expected match; `## Demo walk-through` is the last H2 in the file (confirmed via `grep -n "^## " README.md`). MV-1..MV-8 from `06-VALIDATION.md` are covered 1:1 in the new section (see MV Coverage Map table above).
