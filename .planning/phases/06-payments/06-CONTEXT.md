# Phase 6: Payments (Stripe Test) - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 6 wires Stripe test-mode payments into the auction flow: card saved at first bid (SetupIntent), winning-bid/buyout PaymentIntent fired at settlement, commission split recorded in the settlements table. No real money, no Stripe Connect, no KYC. Refund disputes are handled manually (out of scope for v1). Fulfillment (Phase 7) starts after payment captures.

</domain>

<decisions>
## Implementation Decisions

### Card Entry & Saving
- **D-01:** Card entry is gated at the first bid — a consumer cannot place their first bid without adding a card. The card is saved to a Stripe Customer object via a **SetupIntent** flow.
- **D-02:** After the first bid, the saved PaymentMethod is used automatically for all future bids on that account — no re-entry.
- **D-03:** Card form is embedded **inline on the bid page using Stripe Elements** (Stripe.js + Payment Element or Card Element). Consumer never leaves the app. PCI handled by Stripe — no raw card data touches the server.

### Payment Timing (Bids vs Buyouts)
- **D-04:** Regular bids do NOT hold funds. No PaymentIntent is created at bid time. Only the **winning bid** at auction settlement triggers a charge.
- **D-05:** **Buyout = immediate charge.** When a consumer taps "Buy now", the auction closes instantly and a PaymentIntent is created and captured on the spot. No settlement delay.
- **D-06:** Settlement trigger: the **Phase 4 auction cron job** (Inngest/Trigger.dev) calls the Stripe charge API inline as part of auction close — auction ends → winner determined → charge fires. Stripe webhook confirms async result.

### Commission & Settlement Math
- **D-07:** Platform take rate: **10%** of gross sale amount.
  - `platformFeeCents = round(grossAmountCents × 0.10)`
  - `sellerNetAmountCents = grossAmountCents - platformFeeCents`
- **D-08:** Commission split is **simulated in the DB only** — no Stripe Connect, no actual transfers to sellers. The settlements table records the math; the pitch demo shows the split without needing live payouts.
- **D-09:** Currency: USD only (matches existing schema default).

### Failed Payment Recovery
- **D-10:** If the winner's card fails at settlement, the system falls through **all bidders in descending bid order** until one succeeds or the list is exhausted.
  - Each attempt: create PaymentIntent for next-highest bidder → if captured → that bidder is the new winner, settlements record updated.
  - If all fail: `settlement.status = 'failed'`, listing marked unsold, business notified.
- **D-11:** No manual retry UI in Phase 6 — failed auction is a terminal state for v1. Retry/dispute resolution is v1.1.

### Webhook Event Handling
- **D-12:** Phase 6 handles these Stripe webhook events in a Next.js route handler (`/api/webhooks/stripe`):
  - `setup_intent.succeeded` — card saved; update consumer's Stripe customer record in DB
  - `payment_intent.succeeded` — payment captured; advance `settlement.paymentStatus = 'captured'`, trigger fulfillment creation
  - `payment_intent.payment_failed` — charge failed; trigger next-bidder fallback or mark settlement failed
  - `payment_intent.canceled` — intent voided; update settlement status accordingly
- **D-13:** Webhook signature verification via `stripe.webhooks.constructEvent()` using `STRIPE_WEBHOOK_SECRET` env var — raw body must be preserved (Next.js config needed).

### Claude's Discretion
- Stripe Customer object strategy: one Stripe Customer per user, created lazily on first-bid card entry.
- SetupIntent vs PaymentMethod attachment approach for card saving — Claude picks the current Stripe best practice.
- Idempotency key strategy for PaymentIntents to prevent double charges on retry.
- Error handling for Stripe API failures (timeouts, rate limits) during settlement.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Schema
- `db/schema/payments.ts` — settlements table (paymentStatus enum, processorIntentId, grossAmountCents, platformFeeCents, sellerNetAmountCents, processor field)
- `db/schema/auctions.ts` — bids table (amountCents, status enum, consumerUserId) — used for fallback bidder ordering
- `db/schema/fulfillment.ts` — fulfillments created after settlement.paymentStatus reaches 'captured'

### Phase Context
- `.planning/phases/02-auth-onboarding/02-CONTEXT.md` — consumer users and their stored location; Stripe Customer will be linked to user record
- `.planning/phases/04-*/04-CONTEXT.md` — auction cron/settlement trigger (Phase 4 owns auction close; Phase 6 hooks into it) — read when Phase 4 context exists
- `.planning/ROADMAP.md` — Phase 6 goal and research topics (Payment Intents vs Setup Intents, Stripe Connect vs simulated payouts, webhook handling)

### Project
- `.planning/PROJECT.md` — constraints: Stripe test mode only, free-tier infra, no real money, commission modeled in settlement schema

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `db/schema/payments.ts` — settlements table already models the full payment lifecycle; `processorIntentId` stores Stripe PaymentIntent/SetupIntent ID; `paymentStatus` enum covers the full auth→capture path
- `db/schema/auctions.ts` — bids ordered by `amountCents DESC` gives fallback bidder order; `consumerUserId` links each bid to a Stripe Customer
- `db/client.ts` — Drizzle client for server-side settlement updates from webhook handlers

### Established Patterns
- Next.js App Router route handlers — webhook endpoint at `/api/webhooks/stripe` follows the existing route handler pattern
- Server-side only for payment logic — no payment API calls from client components; all Stripe server calls go through route handlers or Server Actions

### Integration Points
- Phase 4 auction cron: calls a payment service function at auction close → PaymentIntent created for winner → webhook confirms
- Phase 7 fulfillment: triggered by `settlement.paymentStatus = 'captured'` — fulfillments record created with `status = 'pending_choice'`
- Consumer user record: needs a `stripeCustomerId` field (may require a schema addition or use the `processor` / `processorIntentId` fields — planner to verify)

</code_context>

<specifics>
## Specific Ideas

- **First-bid gate UX:** When a consumer tries to bid for the first time, a modal/sheet appears with the Stripe Elements card form. After card saved, the original bid is placed automatically — no double tap.
- **Buyout immediacy:** Buyout tap → optimistic UI "Processing..." → PaymentIntent created + captured → auction closed → success screen. No intermediate state.
- **Test card surface in demo:** Stripe test cards (4242 4242 4242 4242) should work end-to-end for demo purposes. No real card needed.
- **Commission display:** The business dashboard (future phase) should surface `platformFeeCents` and `sellerNetAmountCents` from the settlements table so the demo can show the commission split visually.

</specifics>

<deferred>
## Deferred Ideas

- Stripe Connect live mode / real seller payouts — deferred to post-demo v1.1 (adds KYC, Connect onboarding, compliance burden)
- Refund/dispute endpoint in app — v1 handles disputes manually via Stripe dashboard; no in-app refund flow for v1
- Partial refunds — out of scope; sealed item auction is all-or-nothing
- Payment method management (add/remove cards) — not discussed; consumer can't manage saved cards in Phase 6; defer to later
- International currencies — USD only for demo; multi-currency is v2
- Manual settlement retry UI for businesses — failed auction is terminal in v1; retry is v1.1

</deferred>

---

*Phase: 06-payments*
*Context gathered: 2026-04-18*
