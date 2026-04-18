# Phase 6: Payments (Stripe Test) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-18
**Phase:** 6-payments
**Areas discussed:** Card entry timing, Stripe Connect vs simulated split, Platform commission rate, Outbid fund release, Failed payment recovery, Webhook handling, Consumer card-entry UI, Settlement trigger timing

---

## Card Entry Timing

| Option | Description | Selected |
|--------|-------------|----------|
| At bid time — card auth'd on every bid | PaymentIntent per bid, hold funds, cancel on outbid | |
| At win time — card entered after auction closes | No hold during bidding, winner pays after | |
| At onboarding — card saved during signup | Card collected in Phase 2 onboarding | |
| **User's custom answer** | Card required before first bid; saved for future bids | ✓ |

**User's choice:** Card entry gated at first bid (must add card to place first bid), card saved via SetupIntent for all future bids. No re-entry needed after that.

---

## Funds Holding Model

| Option | Description | Selected |
|--------|-------------|----------|
| Each bid holds funds | PaymentIntent (capture_method: manual) per bid | |
| Only winning bid charges card | No hold during bidding; charge only at settlement | ✓ |

**Notes:** Outbid fund release area becomes moot — nothing is held to release during active bidding.

---

## Stripe Connect vs Simulated Split

| Option | Description | Selected |
|--------|-------------|----------|
| Simulated in DB only | Math recorded in settlements table, no actual transfers | ✓ |
| Stripe Connect (test mode) | Real connected accounts, platform_fee_amount on intents | |

---

## Platform Commission Rate

| Option | Selected |
|--------|----------|
| 10% | ✓ |
| 15% | |
| Custom rate | |

---

## Buyout Payment Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Immediately at buyout — charge fires on the spot | Auction closes + card charged in one action | ✓ |
| At settlement like bids | Buyout treated as winning bid, fires in settlement pass | |

---

## Failed Payment Recovery

| Option | Description | Selected |
|--------|-------------|----------|
| Mark auction failed, no retry | Simple terminal state | |
| Retry once, then fail | One automatic 30-min retry | |
| Fall to next-highest bidder | Try all bidders descending | |

**Fallback depth:**

| Option | Selected |
|--------|----------|
| Next 2 bidders, then fail | |
| All bidders in descending order | ✓ |
| Just the next bidder | |

---

## Webhook Events

| Event | Selected |
|-------|----------|
| payment_intent.succeeded | ✓ |
| payment_intent.payment_failed | ✓ |
| setup_intent.succeeded | ✓ |
| payment_intent.canceled | ✓ |

---

## Consumer Card-Entry UI

| Option | Description | Selected |
|--------|-------------|----------|
| Inline via Stripe Elements | Embedded card form, consumer stays in app | ✓ |
| Stripe-hosted Checkout page | Redirect to Stripe; consumer leaves app | |
| You decide | Claude picks | |

---

## Settlement Trigger

| Option | Description | Selected |
|--------|-------------|----------|
| Auction cron job triggers payment directly | Phase 4 cron calls Stripe inline at auction close | ✓ |
| Separate payment worker | Auction emits event; payment worker processes async | |
| You decide | Claude picks | |

---

## Claude's Discretion

- Stripe Customer object strategy (one per user, lazy creation)
- SetupIntent vs direct PaymentMethod attachment for card saving
- Idempotency key strategy for PaymentIntents
- Error handling for Stripe API failures during settlement

## Deferred Ideas

- Stripe Connect live mode / real seller payouts
- In-app refund/dispute endpoint
- Partial refunds
- Payment method management UI
- International currencies
- Manual settlement retry UI
