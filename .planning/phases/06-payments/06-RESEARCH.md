# Phase 6: Payments (Stripe Test) - Research

**Researched:** 2026-04-18
**Domain:** Stripe test-mode payments on Next.js 16 App Router (SetupIntent + off-session PaymentIntent, webhook handler, Drizzle/Postgres)
**Confidence:** HIGH on SDK stack, webhook shape, off-session flow; MEDIUM on schema-integration micro-details (where `stripeCustomerId` lives)

## Summary

Stripe's current (2026) canonical flow for this use case is **SetupIntent → PaymentMethod attached to Customer → off-session PaymentIntent with `confirm: true`**. The client uses the **Payment Element** (not the legacy Card Element) with `stripe.confirmSetup({ elements, redirect: 'if_required' })` so card-only flows never leave the page. The server uses **`stripe@22.0.2`** (Node, pinned API `2026-03-25.dahlia`, instantiated with `new Stripe(...)` — v22 dropped call-as-function syntax).

For the auction-settlement path, off-session confirmation (`off_session: true, confirm: true`) does the whole auth+capture in one server call. This is the correct shape for Phase 6: winner is not present, there's no UI to route to, and we accept the "hard decline" outcomes (insufficient_funds, authentication_required, card_declined) as terminal — we fall through to the next bidder rather than prompting the absent winner. Set **`error_on_requires_action: true`** on these PaymentIntents so 3DS-required cards fail fast instead of stranding us in `requires_action`.

Webhooks in Next.js 16 App Router require `request.text()` (not `request.json()`) to preserve the raw body for `stripe.webhooks.constructEvent`. `export const runtime = 'nodejs'` is required to prevent edge runtime from re-encoding the body. The App Router no longer needs the `bodyParser: false` page-router config. Webhook handler must be **idempotent** by `event.id` (persist processed event IDs) — Stripe delivers at-least-once.

**Primary recommendation:** Use `stripe@22.0.2` + `@stripe/stripe-js@9.2.0` + `@stripe/react-stripe-js@6.2.0`. SetupIntent + Payment Element for card entry, off-session PaymentIntent (with `error_on_requires_action: true` + per-attempt idempotency key) for auction settlement and buyout, App Router route handler at `app/api/webhooks/stripe/route.ts` with `runtime = 'nodejs'` and `request.text()`, event-ID-based idempotency in a new `stripe_webhook_events` table.

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Card Entry & Saving**
- **D-01:** Card entry is gated at the first bid — a consumer cannot place their first bid without adding a card. The card is saved to a Stripe Customer object via a **SetupIntent** flow.
- **D-02:** After the first bid, the saved PaymentMethod is used automatically for all future bids on that account — no re-entry.
- **D-03:** Card form is embedded **inline on the bid page using Stripe Elements** (Stripe.js + Payment Element or Card Element). Consumer never leaves the app. PCI handled by Stripe — no raw card data touches the server.

**Payment Timing (Bids vs Buyouts)**
- **D-04:** Regular bids do NOT hold funds. No PaymentIntent is created at bid time. Only the **winning bid** at auction settlement triggers a charge.
- **D-05:** **Buyout = immediate charge.** When a consumer taps "Buy now", the auction closes instantly and a PaymentIntent is created and captured on the spot. No settlement delay.
- **D-06:** Settlement trigger: the **Phase 4 auction close path** calls the Stripe charge API inline as part of auction close — auction ends → winner determined → charge fires. Stripe webhook confirms async result.

**Commission & Settlement Math**
- **D-07:** Platform take rate: **10%** of gross sale amount. `platformFeeCents = round(grossAmountCents × 0.10)`; `sellerNetAmountCents = grossAmountCents - platformFeeCents`.
- **D-08:** Commission split is **simulated in the DB only** — no Stripe Connect, no actual transfers to sellers.
- **D-09:** Currency: USD only.

**Failed Payment Recovery**
- **D-10:** If the winner's card fails at settlement, fall through **all bidders in descending bid order** until one succeeds or the list is exhausted. On all-fail: `settlement.status = 'failed'`, listing marked unsold.
- **D-11:** No manual retry UI in Phase 6 — failed auction is a terminal state for v1.

**Webhook Event Handling**
- **D-12:** Route handler at `/api/webhooks/stripe` processes: `setup_intent.succeeded`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`.
- **D-13:** Webhook signature verification via `stripe.webhooks.constructEvent()` using `STRIPE_WEBHOOK_SECRET`; raw body preserved.

### Claude's Discretion
- Stripe Customer object strategy: one per user, created lazily on first-bid card entry.
- SetupIntent vs PaymentMethod attachment approach for card saving — pick current best practice.
- Idempotency key strategy for PaymentIntents to prevent double charges on retry.
- Error handling for Stripe API failures (timeouts, rate limits) during settlement.

### Deferred Ideas (OUT OF SCOPE)
- Stripe Connect live mode / real seller payouts — deferred to v1.1.
- Refund/dispute endpoint in app — v1 handles disputes manually via Stripe dashboard.
- Partial refunds — out of scope.
- Payment method management (add/remove cards) — defer.
- International currencies — USD only for demo.
- Manual settlement retry UI for businesses — failed auction is terminal in v1.

## Project Constraints (from codebase)

No project-level `CLAUDE.md` exists. Constraints extracted from `.planning/PROJECT.md`:
- **Stripe test mode only** (no real money, no live keys, no KYC). [CITED: .planning/PROJECT.md]
- **Free-tier infra only** — Vercel + Neon. Route handlers must run on Vercel Node.js runtime (Edge cannot do the Stripe SDK Node build reliably, and we already use `runtime = 'nodejs'` elsewhere). [VERIFIED: app/api/auctions/[auctionId]/bid/route.ts exports `runtime = "nodejs"`]
- **Sealed items, single currency (USD)**, integer cents throughout. [VERIFIED: db/schema/payments.ts defaults `currency` to `'usd'`]
- Demo target 2026-05-02 — scope must bend to fit.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Publishable key + Elements UI | Browser / Client | — | Stripe.js must run in-browser; publishable key is public by design |
| SetupIntent creation | API / Backend (Server Action or Route Handler) | — | Secret key + Customer ID only ever on server |
| PaymentMethod attachment to Customer | API / Backend (via `setup_intent.succeeded` webhook OR `confirmSetup` return) | — | Stripe auto-attaches when SetupIntent has `customer` set; we don't manually attach |
| Off-session PaymentIntent creation + confirmation | API / Backend (auction-close service) | — | Winner is not present; all SCA/3DS is bypassed via `error_on_requires_action` |
| Buyout PaymentIntent (on-session, but we skip confirmCardPayment because the card is already saved) | API / Backend (Server Action called from buyout button) | Browser (optimistic UI only) | Saved card + `off_session: false` + `confirm: true` — user is there but we don't re-prompt |
| Webhook signature verification + event dispatch | API / Backend (Route Handler) | — | Must verify signature against raw body; only secret key can decode |
| Fallback-bidder loop on payment failure | API / Backend (invoked from `payment_intent.payment_failed` webhook) | — | Must be idempotent; keyed on settlement + attempt |
| Settlement math (gross/fee/net) | Database / Storage (already lives in `settlements` row, written by auction service) | API / Backend | Integer cents in Postgres; `platformFeeCents` already on row from Phase 4 |
| Idempotency-key storage (webhook dedup) | Database / Storage (new `stripe_webhook_events` table) | — | Prevents replay double-processing; unique index on Stripe event id |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `stripe` | `^22.0.2` (pinned API `2026-03-25.dahlia`) | Server-side Stripe SDK: Customers, SetupIntents, PaymentIntents, Webhook signature verify | Official Stripe Node SDK. v22 released 2026-04-16 is the current latest. [VERIFIED: `npm view stripe version` → 22.0.2, release date 2026-04-16] [CITED: github.com/stripe/stripe-node CHANGELOG] |
| `@stripe/stripe-js` | `^9.2.0` | Browser Stripe.js loader (`loadStripe`) | Official browser SDK; pairs with current `react-stripe-js` major. [VERIFIED: `npm view @stripe/stripe-js version` → 9.2.0] |
| `@stripe/react-stripe-js` | `^6.2.0` | `<Elements>` provider, `<PaymentElement>`, `useStripe`, `useElements` hooks | Official React wrapper. Peer deps: React `>=16.8.0 <20.0.0` — compatible with our React 19.2.4. [VERIFIED: `npm view @stripe/react-stripe-js peerDependencies`] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `server-only` | already installed | Guard server Stripe client from client bundle | Import at top of `lib/stripe/client.ts`; pattern already used in `lib/auctions/service.ts` |
| `zod` | already installed | Validate webhook event payloads after `constructEvent` returns the typed event (belt-and-suspenders; the SDK types are already strong) | Only if an unknown-shape event arrives; optional |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Payment Element | legacy Card Element + `confirmCardSetup` / `confirmCardPayment` | Card Element still works, but `PaymentElement` + `confirmSetup` / `confirmPayment` is the canonical 2026 API; Card Element is being treated as legacy for new integrations. We chose PaymentElement. [CITED: docs.stripe.com/payments/save-and-reuse?platform=web] |
| Stripe Node SDK directly | `@stripe/next-stripe`, Theo's t3-stripe, etc. | Wrappers add abstraction tax we don't need for the small surface area here (4 API methods: Customers.create, SetupIntents.create, PaymentIntents.create, webhooks.constructEvent). Use SDK directly. |
| `automatic_payment_methods: { enabled: true }` | explicit `payment_method_types: ['card']` | `automatic_payment_methods` is on by default in the latest API and opens the door to wallets (Apple Pay, Google Pay) with zero code change. No downside for card-only demo either. Use automatic. [CITED: docs.stripe.com/payments/save-and-reuse] |
| Off-session PI with `error_on_requires_action: true` | `off_session: true` without the flag | Without the flag, a card that requests 3DS parks the PI in `requires_action` and we'd have to route the absent winner through authentication — there is no way to do that in this auction flow. Setting the flag makes these fail fast, so the fallback-bidder loop triggers. [CITED: docs.stripe.com/payments/save-card-without-authentication] |

**Installation:**
```bash
npm install stripe@^22.0.2 @stripe/stripe-js@^9.2.0 @stripe/react-stripe-js@^6.2.0
```

**Version verification (2026-04-18):**
- `stripe`: `22.0.2` published 2026-04-16 [VERIFIED: `npm view stripe time.22.0.2` → `2026-04-16T15:00:12.081Z`]
- `@stripe/stripe-js`: `9.2.0` [VERIFIED: `npm view @stripe/stripe-js version`]
- `@stripe/react-stripe-js`: `6.2.0` [VERIFIED: `npm view @stripe/react-stripe-js version`]

## Phase Requirements

No formal REQ-IDs were provided to the researcher; research support is keyed to CONTEXT.md decision IDs:

| Decision | Research Support |
|----------|------------------|
| D-01 (card at first-bid via SetupIntent) | "SetupIntent + Payment Element" pattern in Code Examples §1–§3 |
| D-02 (saved PaymentMethod reused) | SetupIntent auto-attaches PaymentMethod when `customer` is set; later PIs use `customer` + `payment_method` only |
| D-03 (inline Stripe Elements, no redirect) | `stripe.confirmSetup({elements, redirect: 'if_required'})` keeps card flow on-page (§2) |
| D-04 (bids don't hold funds) | No PaymentIntent created at bid time — only the mock card gate is checked (already built in Phase 4) |
| D-05 (buyout = immediate charge) | On-session PaymentIntent with saved PaymentMethod (§5) |
| D-06 (settlement inline in auction close) | `closeAuctionWithWinner` in `lib/auctions/service.ts` is the integration point; Stripe call happens after DB commit (see Pitfall §5) |
| D-07/D-08 (commission math in settlements row only) | Already implemented in `lib/auctions/pricing.ts::getSettlementAmounts` — Phase 6 only needs to switch the 15% to 10% (bps 1000 instead of 1500) or accept the existing number. [See Open Question §2] |
| D-10 (fallback bidder loop) | Fallback pattern in Architecture §Pattern 4 |
| D-12 (webhook events) | Event→handler map in Architecture §Webhook Handler |
| D-13 (raw body + constructEvent) | Webhook raw-body pattern in Code Examples §6 |

## Architecture Patterns

### System Architecture Diagram

```
 ┌───────────────────────────────────────────────────────────────────────────┐
 │                               BROWSER                                      │
 │                                                                           │
 │   Bid Page (PWA)                                                          │
 │      │                                                                    │
 │      │  first bid detected (no saved card)                                │
 │      ▼                                                                    │
 │   <Elements clientSecret=…> ← fetched from Server Action                  │
 │   <PaymentElement />                                                      │
 │      │                                                                    │
 │      │  stripe.confirmSetup({redirect:'if_required'})                     │
 │      └──────────────────────────────────┐                                 │
 │                                         │  (card tokenized → Stripe)      │
 └─────────────────────────────────────────┼─────────────────────────────────┘
                                           │
                                           ▼
               ┌───────────────────────────────────────────────┐
               │              STRIPE API (test)                │
               │  - Customer.create  (lazy, first card)        │
               │  - SetupIntent.create  → client_secret        │
               │  - PaymentMethod auto-attaches to Customer    │
               │  - PaymentIntent.create (off_session/confirm) │
               └──────────┬───────────────────────────┬────────┘
                          │ (async events, signed)    │ (sync response)
                          ▼                           │
 ┌───────────────────────────────────────────────────────────────────────────┐
 │                             NEXT.JS APP (server)                          │
 │                                                                           │
 │   Server Actions (bid page)            Auction close service              │
 │     - createSetupIntent()                - closeAuctionWithWinner()       │
 │       → Customer (lazy)                  - tryChargeWinner()              │
 │       → SetupIntent                      - PI.create(off_session:true,   │
 │                                                      error_on_requires_  │
 │                                                      action:true)        │
 │                                              │                           │
 │   Webhook route handler ◄───────────────────┘ (async)                    │
 │     app/api/webhooks/stripe/route.ts                                      │
 │       runtime = 'nodejs'                                                  │
 │       1. body = await req.text()                                          │
 │       2. constructEvent(body, sig, secret)                                │
 │       3. dedupe by event.id (stripe_webhook_events table)                 │
 │       4. dispatch by event.type:                                          │
 │            setup_intent.succeeded    → mark card-on-file                  │
 │            payment_intent.succeeded  → settlement.paymentStatus=captured  │
 │                                         → create fulfillment              │
 │            payment_intent.payment_failed → run fallback-bidder loop       │
 │            payment_intent.canceled   → mark settlement voided             │
 │       5. return 200 quickly; defer heavy work                             │
 │                                                                           │
 │   Drizzle / Postgres                                                      │
 │     - consumers.stripeCustomerId (NEW col)                                │
 │     - consumers.stripePaymentMethodId (NEW col)                           │
 │     - settlements (processor='stripe', processorIntentId=pi_…)            │
 │     - stripe_webhook_events (NEW table: event_id PK, type, received_at)   │
 └───────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure
```
app/
├── api/
│   └── webhooks/
│       └── stripe/
│           └── route.ts           # POST handler, signature verify, dispatch
│
├── (consumer)/
│   └── shop/
│       └── auctions/
│           └── [id]/
│               └── add-card/
│                   └── page.tsx   # (or a modal on the detail page)
│
lib/
└── payments/
    ├── stripe.ts                  # singleton `new Stripe(...)`, typed, server-only
    ├── customers.ts               # getOrCreateStripeCustomer(userId)
    ├── setup-intents.ts           # createSetupIntent(userId) → client_secret
    ├── payment-intents.ts         # chargeWinner({settlementId, amount, customer, pm})
    ├── fallback.ts                # runFallbackBidderLoop(auctionId)
    ├── webhook-handlers/
    │   ├── index.ts               # dispatch map
    │   ├── setup-intent-succeeded.ts
    │   ├── payment-intent-succeeded.ts
    │   ├── payment-intent-payment-failed.ts
    │   └── payment-intent-canceled.ts
    └── idempotency.ts             # buildIdempotencyKey(), rememberEvent(), wasEventProcessed()
```

### Pattern 1: Single Stripe client, server-only
```typescript
// lib/payments/stripe.ts
// Source: https://github.com/stripe/stripe-node/blob/master/README.md
import "server-only";
import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  throw new Error("STRIPE_SECRET_KEY is required");
}

export const stripe = new Stripe(secretKey, {
  // No apiVersion override: v22 pins to `2026-03-25.dahlia`. Leaving unset
  // gets the SDK's pinned version which matches its TypeScript types.
  maxNetworkRetries: 2, // default 1; bump for auction settlement resilience
  appInfo: { name: "ratatouille", version: "0.1.0" },
});
```
**What:** Singleton Stripe client. Server-only enforcement prevents the secret key from ever leaking into a client bundle. **When to use:** Every server-side Stripe call.

### Pattern 2: Lazy Customer creation + SetupIntent (first-bid card gate)
```typescript
// lib/payments/customers.ts
import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { consumerProfiles } from "@/db/schema";
import { stripe } from "./stripe";

export async function getOrCreateStripeCustomer(params: {
  userId: string;
  email: string;
}) {
  const profile = await db.query.consumerProfiles.findFirst({
    columns: { id: true, stripeCustomerId: true },
    where: (t, { eq }) => eq(t.userId, params.userId),
  });
  if (!profile) throw new Error("consumer profile required");
  if (profile.stripeCustomerId) return profile.stripeCustomerId;

  const customer = await stripe.customers.create(
    { email: params.email, metadata: { userId: params.userId } },
    { idempotencyKey: `customer:${params.userId}` },
  );

  await db.update(consumerProfiles)
    .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
    .where(eq(consumerProfiles.userId, params.userId));

  return customer.id;
}
```

```typescript
// lib/payments/setup-intents.ts
import "server-only";
import { stripe } from "./stripe";
import { getOrCreateStripeCustomer } from "./customers";

export async function createSetupIntentForConsumer(params: {
  userId: string;
  email: string;
}) {
  const customerId = await getOrCreateStripeCustomer(params);

  const setupIntent = await stripe.setupIntents.create(
    {
      customer: customerId,
      // automatic_payment_methods is on by default in the pinned API, but
      // being explicit is cheap and future-proofs against default changes.
      automatic_payment_methods: { enabled: true },
      // Ensures the resulting PaymentMethod can be used off-session at
      // settlement time without re-authentication.
      usage: "off_session",
      metadata: { userId: params.userId },
    },
    { idempotencyKey: `setup_intent:${params.userId}:${Date.now()}` },
  );

  return {
    clientSecret: setupIntent.client_secret!,
    setupIntentId: setupIntent.id,
    customerId,
  };
}
```

### Pattern 3: Payment Element on the bid page
```tsx
// components/payments/add-card-form.tsx
// Source: https://docs.stripe.com/payments/save-and-reuse?platform=web
"use client";
import { Elements, PaymentElement, useStripe, useElements }
  from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useState } from "react";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export function AddCardForm({ clientSecret, onSaved }: {
  clientSecret: string;
  onSaved: () => void;
}) {
  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <InnerForm onSaved={onSaved} />
    </Elements>
  );
}

function InnerForm({ onSaved }: { onSaved: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    const { error } = await stripe.confirmSetup({
      elements,
      // Card flows resolve synchronously when redirect:'if_required'.
      redirect: "if_required",
      confirmParams: {
        // Required even when not used for card-only flow; Stripe validates it.
        return_url: `${window.location.origin}/shop/cards/return`,
      },
    });
    if (error) {
      setError(error.message ?? "Could not save card");
      setBusy(false);
      return;
    }
    // SetupIntent succeeded; webhook will persist stripePaymentMethodId.
    // For UI responsiveness we also optimistically mark "saving…".
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={!stripe || busy}>
        {busy ? "Saving…" : "Save card & place bid"}
      </button>
    </form>
  );
}
```

### Pattern 4: Off-session charge at auction settlement (with idempotency + fallback)
```typescript
// lib/payments/payment-intents.ts
// Source: https://docs.stripe.com/payments/save-card-without-authentication
import "server-only";
import Stripe from "stripe";
import { stripe } from "./stripe";

export type ChargeOutcome =
  | { kind: "captured"; paymentIntentId: string }
  | { kind: "failed"; paymentIntentId: string | null; code: string; decline: string | null }
  | { kind: "requires_action"; paymentIntentId: string }; // should not happen with error_on_requires_action

export async function chargeBidderOffSession(params: {
  settlementId: string;
  attemptNumber: number; // 1 for winner, 2+ for fallbacks
  amountCents: number;
  currency: string; // 'usd'
  stripeCustomerId: string;
  stripePaymentMethodId: string;
  bidderUserId: string;
  auctionId: string;
}): Promise<ChargeOutcome> {
  try {
    const pi = await stripe.paymentIntents.create(
      {
        amount: params.amountCents,
        currency: params.currency,
        customer: params.stripeCustomerId,
        payment_method: params.stripePaymentMethodId,
        confirm: true,
        off_session: true,
        // Forces a fast-fail instead of parking the PI in requires_action.
        error_on_requires_action: true,
        // Not needed because off_session=true, but keeps us card-only:
        payment_method_types: ["card"],
        metadata: {
          settlementId: params.settlementId,
          attemptNumber: String(params.attemptNumber),
          auctionId: params.auctionId,
          bidderUserId: params.bidderUserId,
        },
      },
      {
        // Per-attempt idempotency: a timeout/retry of THIS attempt returns
        // the same PI; a fresh attempt (next bidder) gets a fresh key and
        // therefore a fresh PI. Never reuse a key across bidders.
        idempotencyKey:
          `pi:${params.settlementId}:attempt:${params.attemptNumber}`,
      },
    );

    if (pi.status === "succeeded") {
      return { kind: "captured", paymentIntentId: pi.id };
    }
    if (pi.status === "requires_action") {
      // Should be unreachable because error_on_requires_action is set, but
      // guard anyway.
      return { kind: "requires_action", paymentIntentId: pi.id };
    }
    return {
      kind: "failed",
      paymentIntentId: pi.id,
      code: pi.last_payment_error?.code ?? "unknown",
      decline: pi.last_payment_error?.decline_code ?? null,
    };
  } catch (err) {
    if (err instanceof Stripe.errors.StripeCardError) {
      // 402: card declined (insufficient_funds, authentication_required,
      // card_declined, expired_card, etc.). This is the expected failure
      // mode that triggers the fallback-bidder loop.
      return {
        kind: "failed",
        paymentIntentId: err.payment_intent?.id ?? null,
        code: err.code ?? "card_error",
        decline: err.decline_code ?? null,
      };
    }
    // StripeRateLimitError, StripeConnectionError, StripeAPIError — these
    // are infrastructure issues, not card failures. The caller should
    // retry the same attemptNumber (same idempotency key), not fall
    // through to the next bidder.
    throw err;
  }
}
```

```typescript
// lib/payments/fallback.ts (sketch — planner fills details)
import "server-only";
import { chargeBidderOffSession } from "./payment-intents";

export async function runFallbackBidderLoop(auctionId: string) {
  // 1. Load settlement row, auction row, and all bids for this auction
  //    ordered by amount_cents DESC, placed_at ASC.
  // 2. For each bidder in order:
  //    a. Skip bidders without stripeCustomerId/stripePaymentMethodId
  //       (shouldn't exist — first-bid gate ensures one — but guard anyway).
  //    b. attemptNumber++; call chargeBidderOffSession(...) with amount =
  //       bid.amountCents and the platform-fee math recomputed for that
  //       amount via getSettlementAmounts(amountCents).
  //    c. On captured: update settlements row with new buyer/amount/PI id,
  //       set paymentStatus='capture_requested' (webhook flips to 'captured').
  //       Return.
  //    d. On failed (card error): log attempt, continue to next bidder.
  //    e. On infra error: rethrow — upstream job runner retries.
  // 3. If no bidder succeeded: settlements.status='failed',
  //    listings.status='expired' (or a new 'unsold' variant — see
  //    Open Questions).
}
```

### Pattern 5: Buyout (user present, but we don't re-prompt — card is already saved)
Buyout is simpler than settlement because:
- The consumer is actively tapping a button — we can block-UI through the PI.
- But we do NOT want to re-collect the card; it's already saved.

Create a server-side PaymentIntent with the saved card. Because the user IS on-session, leave `off_session: false` (default). If a card happens to require 3DS, the server returns `requires_action` and the client side can call `stripe.handleNextAction(clientSecret)` — but for US test cards in demo scope this won't fire. Safest recipe for the demo:

```typescript
const pi = await stripe.paymentIntents.create(
  {
    amount: buyoutAmountCents,
    currency: "usd",
    customer: stripeCustomerId,
    payment_method: stripePaymentMethodId,
    confirm: true,
    // on_session implicit; no error_on_requires_action because user IS here
    payment_method_types: ["card"],
    metadata: { auctionId, kind: "buyout", settlementId },
  },
  { idempotencyKey: `pi:buyout:${auctionId}:${userId}` },
);
if (pi.status === "requires_action" && pi.client_secret) {
  // Return client_secret to the caller; client does stripe.handleNextAction().
}
```

### Pattern 6: Webhook route handler (App Router, raw body, event-ID dedup)
```typescript
// app/api/webhooks/stripe/route.ts
// Source: docs.stripe.com/webhooks/best-practices +
//         github.com/stripe/stripe-node README
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/payments/stripe";
import {
  markEventProcessed,
  wasEventProcessed,
} from "@/lib/payments/idempotency";
import { handleSetupIntentSucceeded } from "@/lib/payments/webhook-handlers/setup-intent-succeeded";
import { handlePaymentIntentSucceeded } from "@/lib/payments/webhook-handlers/payment-intent-succeeded";
import { handlePaymentIntentFailed } from "@/lib/payments/webhook-handlers/payment-intent-payment-failed";
import { handlePaymentIntentCanceled } from "@/lib/payments/webhook-handlers/payment-intent-canceled";

// CRITICAL: 'nodejs' runtime is required so the platform doesn't re-encode
// the body. Edge will (silently) re-serialize and break signature verification.
export const runtime = "nodejs";
// The body must be read raw. The App Router does not re-parse by default,
// but we also want to prevent route-segment caching.
export const dynamic = "force-dynamic";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing stripe-signature" }, { status: 400 });
  }

  // CRITICAL: use .text(), not .json(). constructEvent needs byte-identical
  // raw body. Using .json() will cause signature verification to fail.
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    return NextResponse.json(
      { error: `signature verify failed: ${(err as Error).message}` },
      { status: 400 },
    );
  }

  // Idempotency gate: return 200 fast if we've already processed this event.
  // Stripe delivers at-least-once.
  if (await wasEventProcessed(event.id)) {
    return NextResponse.json({ received: true, deduped: true });
  }

  try {
    switch (event.type) {
      case "setup_intent.succeeded":
        await handleSetupIntentSucceeded(event.data.object as Stripe.SetupIntent);
        break;
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      case "payment_intent.canceled":
        await handlePaymentIntentCanceled(event.data.object as Stripe.PaymentIntent);
        break;
      default:
        // Ignore. Stripe sends many event types; only listen to ours.
    }
    await markEventProcessed(event.id, event.type);
  } catch (err) {
    // Log but return 500 so Stripe retries — DO NOT markEventProcessed on failure.
    console.error("[stripe webhook] handler error", event.id, event.type, err);
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
```

```typescript
// lib/payments/idempotency.ts
import "server-only";
import { db } from "@/db/client";
import { stripeWebhookEvents } from "@/db/schema"; // NEW table

export async function wasEventProcessed(eventId: string) {
  const row = await db.query.stripeWebhookEvents.findFirst({
    where: (t, { eq }) => eq(t.eventId, eventId),
    columns: { eventId: true },
  });
  return Boolean(row);
}

export async function markEventProcessed(eventId: string, eventType: string) {
  await db.insert(stripeWebhookEvents).values({
    eventId,
    eventType,
    processedAt: new Date(),
  }).onConflictDoNothing({ target: stripeWebhookEvents.eventId });
}
```

### Anti-Patterns to Avoid
- **`await request.json()` in the webhook route.** Silently breaks signature verification. Always `await request.text()`. [CITED: docs.stripe.com/webhooks/signature]
- **Running the webhook handler on `runtime = 'edge'`.** Edge runtimes have historically re-encoded request bodies; this breaks signature verification even if you use `.text()`. Pin to `'nodejs'`.
- **Stripe call inside the Postgres transaction that writes the settlement row.** External HTTP inside a DB transaction extends lock duration and, on Stripe timeout, rolls back our DB state while Stripe may have already created the PI. See Pitfall 1.
- **Using the same `idempotencyKey` across different bidders' attempts.** Stripe caches the original response — attempt 2 would silently return attempt 1's result and we'd never try the next bidder. Key must include `attemptNumber` or bidder id.
- **Reading `stripePaymentMethodId` from `data.object.payment_method` on the `setup_intent.succeeded` event and ignoring that the field can be a string or an object** depending on expand params. Coerce defensively.
- **Accepting `amount` from the client.** Never. Always look up `settlement.grossAmountCents` server-side. (Already enforced by auction service architecture.)
- **Trusting client-reported success.** `stripe.confirmSetup` returning no `error` is not the same as the SetupIntent being attached to the Customer. Wait for `setup_intent.succeeded` webhook (or retrieve the SetupIntent server-side) before flipping "card on file" server-side. Optimistically flip UI only.
- **Hand-rolling a signature verifier.** Always use `stripe.webhooks.constructEvent`. [CITED: docs.stripe.com/webhooks/signature]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Webhook signature verification | Custom HMAC-SHA256 check against `stripe-signature` header | `stripe.webhooks.constructEvent(rawBody, sig, secret)` | Handles timestamp tolerance, multiple signatures, and algorithm selection correctly. [CITED: docs.stripe.com/webhooks/signature] |
| Idempotent PaymentIntent creation | Custom "did we already charge this?" SQL check before calling Stripe | `idempotencyKey` on the request options object | Stripe guarantees that two requests with the same key return the same result (including failure) for 24h. The SQL check still races. [CITED: docs.stripe.com/api/idempotent_requests] |
| Webhook replay / duplicate protection | Timestamp-window checks, nonce headers | Unique index on `stripe_webhook_events.event_id` + early-return | Stripe explicitly says to dedupe by `event.id`. [CITED: docs.stripe.com/webhooks/best-practices "Handle duplicate events"] |
| Network retry for Stripe API calls | Custom exponential-backoff retry wrapper | `maxNetworkRetries` in Stripe config (default 1, set to 2–3 for settlement) | SDK adds idempotency keys automatically for retries. [CITED: github.com/stripe/stripe-node README "Network retries"] |
| Stripe Customer dedup | Query Stripe by email on every first-card | Cache `stripeCustomerId` on the consumer profile + idempotency-key the create | Stripe allows multiple customers per email; the app is the source of truth. |
| PCI card data handling | Any DOM code that touches card numbers, even for masking | Stripe Elements (iframe-hosted by Stripe) | Raw card data must never touch our origin. [CITED: docs.stripe.com/payments/elements] |
| 3DS/SCA flow | Custom redirect/challenge handling | `stripe.confirmSetup`/`confirmPayment` with a `return_url` | Stripe.js handles iframe challenge, polling, and status parameters on the return URL. |
| Off-session authentication decision | Custom logic around when to require 3DS | `off_session: true, error_on_requires_action: true` | Fails fast on 3DS-required cards; lets us cascade to next bidder. [CITED: docs.stripe.com/payments/save-card-without-authentication] |

**Key insight:** The Stripe SDK + Elements absorb almost all of the subtlety. Our code only has to glue it to our DB. The two places we *must* own custom logic are (a) the fallback-bidder loop (business logic), and (b) the webhook-event dedup table (platform-agnostic durability).

## Runtime State Inventory

Phase 6 is *not* a rename/refactor/migration phase — it adds new feature code. No prior Stripe state exists in the codebase (no collections, keys, task-scheduler registrations, or build artifacts to reconcile).

The one pre-existing runtime state that interacts with Phase 6 is the `consumerProfiles.hasMockCardOnFile` / `mockCardBrand` / `mockCardLast4` columns set by `POST /api/consumer/mock-card`. Phase 6 should:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `consumer_profiles.has_mock_card_on_file`, `mock_card_brand`, `mock_card_last4`, `mock_card_added_at` (set by `/api/consumer/mock-card`) | Keep columns for now as the "gate" signal; Phase 6 adds real `stripe_customer_id` / `stripe_payment_method_id` columns alongside and drives the mock flags from real Stripe state on `setup_intent.succeeded`. Existing Phase 4 callers (`hasMockCardOnFile()` in `lib/auctions/pricing.ts`) can stay unchanged — we just set the flags in response to real Stripe events now. [VERIFIED: db/schema/consumers.ts + app/api/consumer/mock-card/route.ts] |
| Live service config | Stripe Dashboard webhook endpoint, API keys | Must be registered in Stripe Dashboard (test mode): webhook endpoint URL + the four event types in D-12. Endpoint signing secret pasted into `STRIPE_WEBHOOK_SECRET`. |
| OS-registered state | None | None — no task scheduler / systemd / pm2 entries. |
| Secrets/env vars | `STRIPE_SECRET_KEY` (new), `STRIPE_WEBHOOK_SECRET` (new), `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (new). The `NEXT_PUBLIC_` prefix is required for the browser. Add all three to `.env.example`. | Code edit — add to `.env.example`. |
| Build artifacts | None | None. |

## Common Pitfalls

### Pitfall 1: Stripe API call inside the Postgres transaction
**What goes wrong:** If the Stripe `paymentIntents.create` call happens inside the same interactive Postgres transaction that `closeAuctionWithWinner` uses, a Stripe timeout will roll back the settlement insert, but Stripe may have *already* created the PaymentIntent — and the winner was already flipped in our DB (or worse, wasn't). Lock contention also balloons (our current Phase 4 service uses `FOR UPDATE` on `auctions` + `listings`).
**Why it happens:** Natural instinct to "do it all atomically".
**How to avoid:**
- Phase 4 `closeAuctionWithWinner` already commits the settlement row synchronously at auction close with `paymentStatus = 'pending_authorization'`. Phase 6 should keep that exactly as-is.
- After the DB transaction returns, Phase 6 triggers a **separate** call to `chargeBidderOffSession(...)` (or the fallback loop if we want to centralize it), then updates `settlements.processorIntentId` and `paymentStatus='capture_requested'` in a **second** transaction.
- On Stripe error, the settlement row stays in `pending_authorization` and the fallback loop (triggered by the webhook or directly) takes over.
**Warning signs:** Any diff that puts `stripe.paymentIntents.create` inside a Drizzle `.transaction(async (tx) => ...)` block.

### Pitfall 2: `request.json()` in the webhook route
**What goes wrong:** `constructEvent` fails with `No signatures found matching the expected signature for payload`. The response parses and re-serializes the body, changing whitespace/ordering, which breaks the HMAC.
**Why it happens:** Muscle memory from other route handlers.
**How to avoid:** Always `const rawBody = await request.text();`. Never touch `.json()`, `.formData()`, or `.arrayBuffer()` before `constructEvent`. (Actually `.arrayBuffer()` also works — it's byte-identical — but `.text()` matches all current Stripe docs.)
**Warning signs:** Webhook returning 400 with "signatures don't match" in test, succeeding in local `stripe listen --forward-to` curls only, or working in one environment and not another. [CITED: docs.stripe.com/webhooks/signature]

### Pitfall 3: `runtime = 'edge'` on the webhook route
**What goes wrong:** Some edge runtimes (historically Vercel's) re-encode request bodies for HTTP/2 or gzip handling, which also breaks signature verification.
**Why it happens:** A well-meaning "let's run webhook handlers at the edge for speed" PR.
**How to avoid:** `export const runtime = 'nodejs'`. This codebase already uses `runtime = 'nodejs'` consistently; match that. [CITED: existing `app/api/auctions/[auctionId]/bid/route.ts`]

### Pitfall 4: Reusing the same `idempotencyKey` across bidders
**What goes wrong:** The second bidder's PaymentIntent request hits Stripe with the idempotency key used by the first bidder. Stripe returns the *first bidder's* original response (often a 402 card_declined) and we falsely "fall through" to a third bidder when the second one never actually got charged.
**Why it happens:** A reasonable but wrong attempt at "one settlement = one key".
**How to avoid:** The key must include both the settlement and the attempt number (or bidder id). `pi:${settlementId}:attempt:${attemptNumber}` or `pi:${settlementId}:${bidderUserId}`. Document this invariant in code comments.
**Warning signs:** Two attempts returning identical `paymentIntentId`s.

### Pitfall 5: Trusting `setup_intent.payment_method` on the SetupIntent response
**What goes wrong:** Immediately after `confirmSetup` resolves without error, the SetupIntent object's `payment_method` field may be populated but has not yet been attached to the Customer (attachment is part of the status→`succeeded` transition). Charging off-session 50ms later can 400.
**Why it happens:** Race between client-side `confirmSetup` and Stripe's internal attach.
**How to avoid:** Don't act on "card is saved" from the client return value alone. Wait for the `setup_intent.succeeded` webhook to persist `stripePaymentMethodId` and `stripeCustomerId` to the consumer profile. UI can optimistically show "card saved" while the webhook lands (usually <1s in test mode), but bids that rely on the saved card should check the DB-persisted state.

### Pitfall 6: Forgetting `error_on_requires_action: true` off-session
**What goes wrong:** An off-session PaymentIntent for a card that requires 3DS parks in status `requires_action`. Our code reads `pi.status !== 'succeeded'` as "failed" and moves to the next bidder, but Stripe still holds the original attempt open — and may eventually capture it if the customer somehow authenticates (e.g., in a push notification two hours later). Result: **two bidders charged** for one auction.
**Why it happens:** Off-session docs mostly show the flag on or omit it; it's easy to skip.
**How to avoid:** Always set `error_on_requires_action: true` on off-session PIs. Stripe then responds with a `StripeCardError` (`code: 'authentication_required'`), the PI is in `requires_payment_method`, and our fallback-bidder logic runs cleanly. [CITED: docs.stripe.com/payments/save-card-without-authentication]
**Warning signs:** A settlement row where the previous winner's PI is `requires_action` while the next fallback winner's PI is `succeeded`.

### Pitfall 7: Returning 2xx before writing our DB state
**What goes wrong:** We receive `payment_intent.succeeded`, kick off the fulfillment-creation in a fire-and-forget promise, and return 200. The promise fails silently (DB hiccup) and the fulfillment never gets created. Stripe does not retry because we returned 200.
**Why it happens:** "Return 2xx quickly" is misread as "return 2xx immediately".
**How to avoid:** Return 2xx after the **synchronous** DB writes for that event complete (settlement status flip + fulfillment insert). Truly-heavy deferred work (emails, push) can be queued, but the state change itself must be durable before the 2xx. This is compatible with Stripe's "respond quickly" guidance — webhook handlers that take up to ~5s are fine; Stripe's timeout is generous. [CITED: docs.stripe.com/webhooks/best-practices]
**Warning signs:** Intermittent "settlement.paymentStatus=captured but no fulfillment row" reports.

### Pitfall 8: Putting `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` secret where the secret key belongs (or vice versa)
**What goes wrong:** Either the publishable key gets prefixed `NEXT_PUBLIC_` and ends up in the browser bundle (fine and intended) OR the secret key accidentally gets prefixed `NEXT_PUBLIC_` and ends up in the browser bundle (catastrophic — immediate key rotation required).
**Why it happens:** Copy-paste between the two names.
**How to avoid:** Enforce in code: `lib/payments/stripe.ts` imports `server-only` and reads `STRIPE_SECRET_KEY`; the publishable key is read only inside `"use client"` files via `process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. Add `.env.example` entries with comments reminding which goes where.

## Code Examples

All patterns live in §Architecture Patterns above. Summary of canonical snippets by problem:

| Problem | See |
|---------|-----|
| Create Stripe client (server) | Pattern 1 |
| Lazy Customer create | Pattern 2 |
| Create SetupIntent | Pattern 2 |
| Payment Element UI | Pattern 3 |
| Off-session PaymentIntent (settlement/fallback) | Pattern 4 |
| On-session PaymentIntent with saved card (buyout) | Pattern 5 |
| Webhook route handler | Pattern 6 |
| Event-ID dedup | Pattern 6 (`lib/payments/idempotency.ts`) |

## State of the Art

| Old Approach | Current Approach (2026) | When Changed | Impact |
|--------------|-------------------------|--------------|--------|
| `Stripe(key)` call-as-function | `new Stripe(key)` | stripe-node v22 (2026-04-02) | Our code must use `new`. [CITED: stripe-node CHANGELOG 22.0.0] |
| Card Element + `confirmCardSetup` / `confirmCardPayment` | Payment Element + `confirmSetup` / `confirmPayment` with `redirect: 'if_required'` | Over 2023–2025; Payment Element is canonical for all new integrations in current docs | Use Payment Element. Card Element still compiles but is treated as legacy. [CITED: docs.stripe.com/payments/save-and-reuse?platform=web] |
| Explicit `payment_method_types: ['card']` | `automatic_payment_methods: { enabled: true }` (on by default) | Gradual since 2022; on-by-default in pinned `2026-03-25.dahlia` | Specifying `payment_method_types` still works but locks out Apple Pay / Google Pay on Elements without extra config. Prefer default. [CITED: docs.stripe.com/payments/save-and-reuse] |
| Next.js page-router `export const config = { api: { bodyParser: false } }` | App Router: just use `request.text()`; no config needed | Next.js 13 App Router | Page router config is dead for App Router webhooks. [CITED: makerkit.dev/blog + community consensus, MEDIUM confidence — verified by current Stripe docs example targeting App Router] |
| Manual SetupIntent `usage` defaulting to `off_session` implicit | Explicit `usage: 'off_session'` recommended | API changed over 2023 | Always set `usage: 'off_session'` on SetupIntents whose PaymentMethod will be used at auction settlement. [CITED: docs.stripe.com/api/setup_intents] |

**Deprecated/outdated:**
- `stripe.paymentIntents.confirm(pi, {...})` with a plain API key as second arg — removed in v22. [CITED: stripe-node CHANGELOG 22.0.0]
- Callbacks on stripe-node methods (v22 dropped them; async/await only).
- `Stripe.errors.StripeError` as a *type* — use `typeof Stripe.errors.StripeError` or `Stripe.ErrorType`. [CITED: stripe-node CHANGELOG 22.0.0]
- `Stripe.StripeContext` (type) — use `Stripe.StripeContextType`. [CITED: stripe-node CHANGELOG 22.0.0]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Vercel's Node.js runtime preserves raw request bodies byte-identical when `runtime = 'nodejs'` is set on App Router route handlers | Common Pitfalls §3, Pattern 6 | Webhook 400s in production only. Verifiable by sending a test event from Stripe Dashboard to the deployed preview URL. |
| A2 | `@stripe/react-stripe-js@6.2.0` works with React 19.2.4 in practice (peer range allows it but we haven't seen an integration run) | Standard Stack | A peer-dep warning + possible runtime incompatibility. Mitigation: pin versions and verify on a throwaway branch before wiring into Phase 6 plans. |
| A3 | The existing Phase 4 settlement row (`paymentStatus = 'pending_authorization'`) can be advanced by Phase 6 without schema changes to the status enum | Pattern 4 | Would require a migration. The enum already includes `pending_authorization`, `authorized`, `capture_requested`, `captured`, `failed`, `refunded`, `not_required` — covers the full lifecycle. [VERIFIED: db/schema/payments.ts] — downgrading A3 to near-verified. |
| A4 | Platform fee of 10% (D-07) overrides the existing `AUCTION_PLATFORM_FEE_BPS = 1_500` (15%) constant written by Phase 4 | Open Questions §2 | Either the constant gets changed or the context is wrong. See Open Questions. |
| A5 | No project-level `CLAUDE.md` exists | Project Constraints | We've treated PROJECT.md as the authoritative constraint list. [VERIFIED: `ls CLAUDE.md` returns "No such file or directory"] — downgrading A5 to verified. |

Claims A1 and A4 are the only items here that need planner/discuss-phase confirmation before locking plans.

## Open Questions

1. **Where does `stripeCustomerId` live?**
   - What we know: consumer profile table (`consumerProfiles`) is the natural home — it's already the row that holds `hasMockCardOnFile`, `mockCardBrand`, `mockCardLast4`. Users table is shared with businesses and shouldn't hold consumer payment state.
   - What's unclear: whether to keep mock-card columns for a grace period or replace them outright.
   - **Recommendation:** Add `stripeCustomerId TEXT` and `stripePaymentMethodId TEXT` to `consumerProfiles`. Keep `hasMockCardOnFile` and its companions — set them in `setup_intent.succeeded` webhook so Phase 4's existing gate (`lib/auctions/pricing.ts::hasMockCardOnFile`) keeps working unchanged. Document that mock-card direct-toggle via `POST /api/consumer/mock-card` becomes a demo-only/dev shortcut.

2. **Platform fee: 10% (D-07) vs 15% (Phase 4's hardcoded `AUCTION_PLATFORM_FEE_BPS = 1_500`)**
   - What we know: `lib/auctions/pricing.ts` currently hard-codes 15% = 1500 bps. CONTEXT.md D-07 locks 10%.
   - What's unclear: whether Phase 4 was right and CONTEXT.md is stale, or vice versa.
   - **Recommendation:** Treat CONTEXT.md as authoritative (it's newer). Phase 6 PLAN should include a task to change `AUCTION_PLATFORM_FEE_BPS` to `1_000`. Ensure no existing seeded/sample rows assume 15%.

3. **Where does the Phase 6 payment call fire from — the auction `closeAuctionWithWinner` path, a webhook, or a job queue?**
   - What we know: CONTEXT.md D-06 says "the Phase 4 auction cron job (Inngest/Trigger.dev) calls the Stripe charge API inline as part of auction close". But looking at the code, Phase 4 shipped with `sweepOverdueAuctions` (polling sweep every 15s via `AUCTION_SWEEP_INTERVAL_MS`), not Inngest/Trigger.dev. [VERIFIED: lib/auctions/pricing.ts `AUCTION_SWEEP_INTERVAL_MS`]
   - What's unclear: whether the phase-6 charge should be issued from inside `sweepOverdueAuctions` / `refreshAuctionIfOverdue`, or moved to a post-commit hook.
   - **Recommendation:** Trigger the charge from a post-transaction hook inside `closeAuctionWithWinner` — call `chargeBidderOffSession` AFTER `tx.commit()` (i.e., after the `.transaction(async (tx) => {...})` returns). Do not hold the DB transaction open for the Stripe call (Pitfall 1). On infra error, leave the settlement in `pending_authorization` so the next sweep tick or a one-shot recovery job can retry.

4. **Buyout path — user sees "Processing…" for how long?**
   - What we know: Buyout is on-session, single PaymentIntent, saved card. In practice Stripe returns in <2s for test-mode card confirmation.
   - What's unclear: whether to block on server-side confirmation or return the client_secret and let the client poll/confirm.
   - **Recommendation:** Server confirms synchronously; route handler returns 200 after `paymentIntents.create({confirm: true})` resolves with `status: 'succeeded'`. If status is `requires_action` (rare in US test), return the client_secret for `stripe.handleNextAction`. Timeouts handled by SDK `maxNetworkRetries: 2`.

5. **Fallback loop trigger — direct call after initial failure, or via webhook?**
   - What we know: `payment_intent.payment_failed` webhook fires on off-session failures. A direct call inside the close path (when `chargeBidderOffSession` returns `kind: 'failed'`) would also work and arrives first.
   - **Recommendation:** Run the fallback loop **directly** from the settlement path (fire-and-forget after commit), keyed on the settlement id so concurrent webhook deliveries for the same settlement no-op. The `payment_intent.payment_failed` webhook becomes the durability net — if the direct loop was interrupted (process died), the webhook re-triggers it. Both paths are idempotent because they fan out via `runFallbackBidderLoop(settlementId)` which must be SERIALIZABLE (select-for-update on the settlement row before incrementing `attemptNumber`).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `stripe` npm package | server + client | ✗ (not yet installed) | — | `npm install` step in PLAN |
| `@stripe/stripe-js` npm package | client | ✗ | — | same |
| `@stripe/react-stripe-js` npm package | client | ✗ | — | same |
| `STRIPE_SECRET_KEY` env var (test mode, starts `sk_test_`) | server | ✗ (not in `.env.example`) | — | Demo cannot run without this. Add to `.env.example` + Vercel project envs. |
| `STRIPE_WEBHOOK_SECRET` env var (starts `whsec_`) | server (webhook) | ✗ | — | Register endpoint in Stripe Dashboard and copy signing secret. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` env var (starts `pk_test_`) | client | ✗ | — | Exposed to browser — add to `.env.example`. |
| Stripe CLI (for local webhook forwarding during dev) | dev only | ✗ (not verifiable in sandbox) | — | Optional; `stripe listen --forward-to localhost:3000/api/webhooks/stripe` is the canonical local dev loop. Not required for prod. |
| Node `>=18` | stripe-node v22 peer | ✓ | n/a | project already on Next 16 / Node 18+. [VERIFIED: `npm view stripe engines` → `{ node: '>=18' }`] |
| Neon Postgres (for new `stripe_webhook_events` table) | webhook idempotency | ✓ | already in use | none needed |

**Missing dependencies with no fallback:** The three env vars above. Demo cannot run without them. Planner should include a PLAN task "add Stripe env vars to `.env.example` + document obtaining test keys from `https://dashboard.stripe.com/test/apikeys`".

**Missing dependencies with fallback:** None.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | **None detected in current codebase** — `package.json` has no test runner. |
| Config file | none — see Wave 0 |
| Quick run command | TBD (see Wave 0) |
| Full suite command | TBD (see Wave 0) |

Prior phases shipped without a test framework (confirmed by absence of `jest`, `vitest`, `mocha`, `playwright`, or any `test`/`spec` scripts in `package.json` and no `tests/`/`__tests__/` directories at the repo root). Phase-1 through -4 relied on runtime smoke testing via the Next.js dev server and manual verification.

### Phase Requirements → Test Map
Because no framework is in place and the demo deadline is 2026-05-02 (~14 days), **the proportionate recommendation is manual smoke tests via Stripe CLI + UI**, not introducing a full test harness in Phase 6.

| Req | Behavior | Test Type | Command / Check |
|-----|----------|-----------|-----------------|
| D-01 | First bid triggers SetupIntent + card modal | manual-smoke | Open auction as new consumer → click bid → card form appears inline |
| D-01 (webhook) | `setup_intent.succeeded` persists `stripeCustomerId` + `stripePaymentMethodId` | CLI-driven | `stripe trigger setup_intent.succeeded` with customer metadata; verify DB row updated |
| D-03 | Card flow uses Elements (PCI off-origin) | manual-visual | Browser devtools → inspect card input iframe → origin `js.stripe.com` |
| D-05 | Buyout creates PI + captures immediately | manual-smoke | Buyout on a test auction → verify settlements.paymentStatus = captured within 3s |
| D-06 | Winning-bid PI fires off-session at close | manual-smoke | Let an auction close naturally → verify PI in Stripe Dashboard with `off_session=true` and our `settlementId` in metadata |
| D-10 | Winner card fails → next bidder tried | CLI-driven | Set up two bidders, give winner the `4000 0000 0000 9995` (insufficient_funds) card → verify runner-up's PI succeeds |
| D-12 | All four event types route correctly | CLI-driven | `stripe trigger payment_intent.succeeded` / `payment_intent.payment_failed` / `payment_intent.canceled` / `setup_intent.succeeded` and verify handlers fire via logs + DB |
| D-13 | Invalid signature → 400 | CLI-driven | Send a payload with wrong signature → expect 400 |

### Sampling Rate
- **Per task commit:** Type-check + lint (existing: `npx tsc --noEmit`, `npm run lint`). No test runner to sample.
- **Per wave merge:** Run through the smoke-test list above.
- **Phase gate:** Full smoke suite + happy-path end-to-end demo (SetupIntent → bid → close → capture → settlement row correct) before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] Decide whether to introduce a test framework (vitest is the natural fit for Next 16 + React 19) now or defer. Given the demo deadline, **recommendation: defer, smoke-test only**. Document the gap for a post-demo v1.1 hardening phase.
- [ ] Stripe CLI documented in `README.md` as the local webhook forwarding tool: `stripe listen --forward-to localhost:3000/api/webhooks/stripe --events payment_intent.succeeded,payment_intent.payment_failed,payment_intent.canceled,setup_intent.succeeded`.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Auth.js v5 session already required for Server Actions (`authorizeApiRole('consumer')` pattern). Webhook endpoint is the only route that must NOT require auth (Stripe signs, doesn't auth). |
| V3 Session Management | partial | Auth.js-managed sessions unchanged. No new session mechanisms introduced. |
| V4 Access Control | yes | SetupIntent creation requires authenticated consumer; PaymentIntent creation only happens server-side (never from client); webhook handler enforces Stripe signature as its sole auth. |
| V5 Input Validation | yes | All amounts read from DB (`settlements.grossAmountCents`), never from client request bodies. Webhook payload validated by `constructEvent` (signature+schema). |
| V6 Cryptography | yes | **NEVER hand-roll HMAC signature checks** — use `stripe.webhooks.constructEvent`. TLS required by Stripe for webhook delivery (Vercel provides). |
| V7 Error Handling | yes | Catch `Stripe.errors.StripeCardError` (402 — card problem) distinctly from `StripeAPIError`/`StripeRateLimitError`/`StripeConnectionError` (infra). Don't leak raw error messages to clients. |
| V8 Data Protection | yes | **PCI:** raw card data NEVER touches our origin — Stripe Elements is iframe-hosted by Stripe. Only `pm_…` and `cus_…` IDs in our DB. `.gitignore` already excludes `.env.local`. |
| V9 Communications | yes | `STRIPE_SECRET_KEY` must never be in `NEXT_PUBLIC_*` var; `server-only` import guards. |
| V12 Files | no | No file uploads in this phase. |
| V14 Configuration | yes | Three new env vars. Document required vs optional in `.env.example`. |

### Known Threat Patterns for Stripe + Next.js App Router

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Forged webhook (attacker hits `/api/webhooks/stripe` with a fake payload) | Spoofing | `stripe.webhooks.constructEvent` with `STRIPE_WEBHOOK_SECRET`; reject unsigned/bad-signature with 400 |
| Webhook replay (attacker captures+replays a real signed payload) | Tampering | Event-id dedup via unique index on `stripe_webhook_events.event_id`; Stripe signatures also carry a 5-minute default timestamp tolerance (`constructEvent` enforces) |
| Amount tampering (client sends `amount=1` for a $100 auction) | Tampering | Amount always read server-side from `settlements.grossAmountCents`; never trust request body amount |
| Publishable-key-as-secret-key mistake | Information Disclosure | `server-only` import in `lib/payments/stripe.ts`; never prefix secret with `NEXT_PUBLIC_` |
| Double-charge on retry | Tampering / Repudiation | Stripe `IdempotencyKey` per attempt; our own event-id dedup; unique constraint `settlements_auction_unique` |
| Race: two sweeps process the same closed auction | Tampering | Phase 4 already uses `SELECT … FOR UPDATE SKIP LOCKED` in `sweepOverdueAuctions` — Phase 6 piggy-backs safely. Fallback loop must also lock the settlement row. |
| 3DS bypass → "zombie PI" charging absent winner hours later | Tampering / Repudiation | `off_session: true, error_on_requires_action: true` forces fast-fail; never allow `requires_action` to linger on off-session PIs |
| Webhook handler runs on edge runtime → body re-encoded → signature bypass-or-fail inconsistency | Tampering | Pin `runtime = 'nodejs'` |
| Card-data exposure via custom DOM | Information Disclosure / PCI | Use Stripe Elements only; never implement our own `<input type="text">` for PAN |
| `logging error.message` (with PAN) | Information Disclosure | Stripe error messages don't contain PAN (by design), but never log full PaymentMethod objects at the ERROR level — they contain `card.last4`, `card.brand`, BIN info |
| Webhook endpoint behind middleware (Auth.js) → Stripe gets 401/302 | Denial of Service (of webhook path) | Exclude `/api/webhooks/*` from any route-protection middleware/proxy. [VERIFIED: current `proxy.ts` needs review by planner to confirm webhook path is uncovered — see Pattern 6 note] |

## Sources

### Primary (HIGH confidence)
- [stripe-node v22.0.2 CHANGELOG](https://raw.githubusercontent.com/stripe/stripe-node/master/CHANGELOG.md) — v22 breaking changes, pinned API version `2026-03-25.dahlia`, constructor shape
- [stripe-node README](https://raw.githubusercontent.com/stripe/stripe-node/master/README.md) — network retries, telemetry, webhook signing, idempotency
- [docs.stripe.com/payments/save-and-reuse?platform=web](https://docs.stripe.com/payments/save-and-reuse?platform=web) — SetupIntent + Payment Element canonical flow
- [docs.stripe.com/payments/save-card-without-authentication](https://docs.stripe.com/payments/save-card-without-authentication) — off-session PaymentIntent with `error_on_requires_action: true`; failure handling
- [docs.stripe.com/webhooks/best-practices](https://docs.stripe.com/webhooks/best-practices) — duplicate handling by event.id, respond 2xx quickly, async queue
- [docs.stripe.com/api/idempotent_requests](https://docs.stripe.com/api/idempotent_requests) — `Idempotency-Key` header, 24h caching, parameter equality rule
- [docs.stripe.com/webhooks/signature](https://docs.stripe.com/webhooks/signature) — raw body requirement, `constructEvent` usage
- `npm view stripe` / `npm view @stripe/stripe-js` / `npm view @stripe/react-stripe-js` (2026-04-18) — current versions + peer ranges
- Local codebase reads: `db/schema/payments.ts`, `db/schema/consumers.ts`, `db/schema/auctions.ts`, `db/schema/fulfillment.ts`, `lib/auctions/service.ts`, `lib/auctions/pricing.ts`, `app/api/auctions/[auctionId]/bid/route.ts`, `app/api/consumer/mock-card/route.ts`, `package.json`, `next.config.ts`, `.env.example`, `.planning/config.json`

### Secondary (MEDIUM confidence)
- WebSearch results on "Next.js 16 App Router + Stripe webhook" cross-verified with Stripe's own docs. App Router `request.text()` pattern is consistent across all current sources.
- WebSearch on "off-session PaymentIntent authentication_required" cross-verified with `docs.stripe.com/payments/save-card-without-authentication` and `docs.stripe.com/payments/save-and-reuse`.

### Tertiary (LOW confidence)
- No claim in this document rests on a tertiary source.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — npm registry verified; peer deps read directly; release dates in 2026-04 window.
- Architecture: HIGH — mirrors Stripe's own canonical docs; integration points are simple (one route handler, one service module).
- Pitfalls: HIGH — each pitfall cross-checked against Stripe docs or community consensus; no pitfall relies on single-source.
- Environment: HIGH — three env vars, documented clearly.
- Validation: MEDIUM — no existing test framework; the research recommendation (smoke-tests) is pragmatic but not evidence-based against a test suite.
- Security: HIGH — ASVS categories mapped, each threat pattern has a cited mitigation.

**Research date:** 2026-04-18
**Valid until:** 2026-05-15 (Stripe releases move fast; re-verify SDK version if Phase 6 work slips past that date — stripe-node had v21→v22 major inside 2 weeks)
