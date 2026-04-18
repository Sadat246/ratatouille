# Ratatouille

Mobile-first marketplace foundation for auctioning sealed, soon-to-expire goods.

## Stack

- Next.js App Router
- React
- Tailwind CSS
- Drizzle ORM
- Neon Postgres

## Local development

1. Install dependencies:

```bash
npm install
```

2. Create a local env file from the example:

```bash
cp .env.example .env
```

3. Start the app:

```bash
npm run dev
```

## Database workflow

Generate SQL migrations from the schema:

```bash
npm run db:generate
```

Apply migrations to the configured database:

```bash
npm run db:migrate
```

If your Postgres provider exposes separate pooled and direct URLs, keep the
runtime on `DATABASE_URL` and place the direct connection in
`DATABASE_URL_UNPOOLED` so migrations can run without a pooler in the middle.

## Stripe webhooks (local development)

Phase 6 payments use Stripe test-mode webhooks. For local development, forward
signed webhook events from Stripe to the local Next.js dev server with the
Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe \
  --events setup_intent.succeeded,payment_intent.succeeded,payment_intent.payment_failed,payment_intent.canceled
```

The command prints a `whsec_...` signing secret on startup. Set that value as
`STRIPE_WEBHOOK_SECRET` in `.env.local` — it OVERRIDES the dashboard webhook
endpoint's secret while the CLI is running, so signatures verify against the
locally-forwarded stream. Install the CLI from https://stripe.com/docs/stripe-cli
if it is not already on the path.

Test cards: use `4242 4242 4242 4242` for happy-path captures,
`4000 0000 0000 9995` to force an `insufficient_funds` decline (exercises the
fallback-bidder loop), and `4000 0027 6000 3184` for `requires_authentication`
(verifies `error_on_requires_action: true` fails fast instead of parking the
PaymentIntent).

## Demo walk-through

End-to-end Phase 6 happy path, then two failure paths, then what to verify on
the Stripe Dashboard. Assumes you've completed the setup in the
`## Stripe webhooks (local development)` section above — `STRIPE_SECRET_KEY`,
`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, and `STRIPE_WEBHOOK_SECRET` are in
`.env.local`, and `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
is running in a side terminal (the CLI-provided `whsec_...` value overrides
any dashboard webhook secret while it runs).

No real money is ever charged — Stripe is in test mode.

### Happy path: first bid → auction close → capture

1. `npm run dev`. Sign in as a fresh consumer via Google OAuth and finish
   onboarding. With `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` set, the mock card
   panel is hidden — the real Stripe flow takes over.
2. Open any active auction on the consumer feed.
3. Tap Bid. The inline Stripe Payment Element appears (iframe origin
   `js.stripe.com`). Enter card `4242 4242 4242 4242`, any future expiry,
   any CVC, any ZIP. Tap Save card.
4. The bid panel unlocks optimistically and submits the original bid. The
   `setup_intent.succeeded` webhook lands within ~1 s and persists
   `stripeCustomerId` + `stripePaymentMethodId` on the consumer profile.
   Verify with `npm run db:studio` — `consumer_profiles` row now carries
   both columns plus `has_mock_card_on_file = true`.
5. Place another bid on the same (or any other) auction. No card prompt
   appears — the saved card is reused. (Matches decision D-02.)
6. Wait for the auction to close, or shorten its `ends_at` in the DB. The
   15-second sweep (`sweepOverdueAuctions` in `lib/auctions/service.ts`)
   closes the auction, writes a `settlements` row with
   `payment_status = 'pending_authorization'`, and — strictly AFTER the
   Drizzle transaction commits — calls `triggerAuctionPaymentIfCloseResult`
   which invokes `chargeBidderOffSession` with `off_session: true`,
   `error_on_requires_action: true`, and metadata
   `kind=auction_winner`.
7. The `payment_intent.succeeded` webhook lands. `settlements.payment_status`
   flips to `captured`, and a `fulfillments` row is inserted with
   `mode = 'pickup'` (from decision D-10). Re-delivery of the same event
   (use `stripe events resend evt_...`) is a no-op — see the
   `stripe_webhook_events` idempotency table.
8. Sign out, sign in as the seller, open `/sell/outcomes`. The auction is
   listed with sale price, a 10% platform fee, and the seller's net
   (90% of gross). Decision D-07.

### Failure path A: insufficient funds → fallback bidder

1. Seed two consumers. Give the high bidder card `4000 0000 0000 9995`
   (insufficient_funds) via the first-bid flow. Give the runner-up card
   `4242 4242 4242 4242`.
2. Let the high bidder win the auction.
3. When the sweep closes the auction, the off-session PaymentIntent for
   the winner fails. The `payment_intent.payment_failed` webhook (and the
   direct call in `triggerAuctionPaymentIfCloseResult`) both invoke
   `runFallbackBidderLoop(settlementId)` — the first to arrive wins;
   the other is a no-op because the settlement lock (`SELECT … FOR UPDATE`)
   inside the loop serializes them.
4. The loop rewrites `settlements.buyer_user_id` to the runner-up,
   recomputes `gross_amount_cents` / `platform_fee_cents` /
   `seller_net_amount_cents` from the runner-up's bid, and charges them
   off-session with `attemptNumber = 2`. The runner-up's card captures
   and fulfillment is created.
5. `/sell/outcomes` now reflects the runner-up's bid as the sale price.
   Decision D-06.

### Failure path B: authentication required → fail-fast (no 3DS park)

1. Seed a high bidder with card `4000 0027 6000 3184`
   (authentication_required). Let them win.
2. When the sweep closes the auction, `chargeBidderOffSession` creates the
   PaymentIntent with `error_on_requires_action: true`. Stripe does NOT
   park the PI in `requires_action` — it fails synchronously with
   `StripeCardError`.
3. `triggerAuctionPaymentIfCloseResult` catches the `failed` outcome and
   calls `runFallbackBidderLoop` — same as Failure path A. This is the
   core double-charge safety net: a parked PI could be completed by the
   shopper later, after we've already charged the next bidder.
4. If there is no runner-up with a saved card, the loop marks the listing
   `expired` and the settlement `payment_status='failed'`.

### Buyout path

1. On any active auction, tap Buy now. A PaymentIntent is created
   **on-session** (no `off_session: true`, no
   `error_on_requires_action: true` — 3DS is permitted) with metadata
   `kind=buyout` and idempotency key `pi:buyout:{settlementId}`.
2. The charge captures immediately while the shopper is on-page.
   `buyoutAuction` closes the auction synchronously; the
   `payment_intent.succeeded` webhook flips the settlement to `captured`
   and creates the fulfillment row within ~1 s.
3. A buyout whose charge fails is NOT rerouted to runners-up — only the
   person who clicked Buy now gets that seat. The settlement is marked
   `voided` / `failed` (decision D-05).

### What to verify on the Stripe Dashboard

- Every winning-bid PaymentIntent shows `off_session = true` and metadata
  containing `settlementId`, `auctionId`, `bidderUserId`, `attemptNumber`,
  and `kind = auction_winner`.
- Buyout PaymentIntents carry `kind = buyout` and do NOT have
  `off_session = true`.
- Retrying a failed attempt with the same `{settlementId, attemptNumber}`
  returns the cached PaymentIntent (idempotency key
  `pi:{settlementId}:attempt:{n}`) rather than creating a duplicate.
- No live-mode charges exist. If you see one, stop the demo — an env var
  is wrong.
