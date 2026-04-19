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

## Fulfillment setup and demo

Phase 7 adds dual-path fulfillment after payment capture: buyers can choose
pickup or delivery from the Orders lane, and sellers manage handoff from the
Fulfillment lane.

### Uber Direct configuration

Set these env vars when you want live Uber Direct quotes, delivery creation,
and signed webhook processing:

- `UBER_DIRECT_CLIENT_ID`
- `UBER_DIRECT_CLIENT_SECRET`
- `UBER_DIRECT_CUSTOMER_ID`
- `UBER_DIRECT_WEBHOOK_SIGNING_KEY`

When those credentials are present, the app requests an OAuth access token with
the `eats.deliveries` scope, creates quotes and deliveries against the
self-serve customer endpoints, and expects Uber Direct to POST status updates to
`/api/webhooks/uber-direct`.

If the Uber Direct credentials are absent, the fulfillment flow stays usable:
quote requests return a deterministic local stub, delivery confirmation stores a
demo tracking URL, and the UI still exercises the full Orders/Fulfillment handoff
without contacting Uber. That fallback is intentional for demos and local
development.

### Demo path: pickup

1. Complete a paid sale so a fulfillment row exists. Buyout works immediately;
   auction-winner fulfillment appears after the Stripe success webhook lands.
2. Sign in as the buyer and open the Orders lane.
3. On the order card, use `Pickup in store`. The card updates to show a 6-digit
   pickup code and its expiry.
4. Sign in as the seller and open the Fulfillment lane.
5. Enter the buyer's 6-digit code into `Verify pickup`.
6. Successful verification marks the handoff complete: the fulfillment moves to
   `picked_up`, and the linked settlement is closed out as completed.

### Demo path: delivery

1. From the buyer's Orders lane, fill in recipient name, phone, and delivery
   address.
2. Use `Get delivery quote`, then `Start delivery`.
3. With live Uber credentials, the quote and delivery come from Uber Direct and
   the order stores the real delivery reference plus tracking URL. Without those
   credentials, the app returns a stub quote and a demo tracking URL so the rest
   of the flow still works.
4. The buyer sees the tracking link from Orders, and the seller sees the same
   delivery state from the Fulfillment lane.
5. Uber Direct webhook deliveries to `/api/webhooks/uber-direct` advance the
   fulfillment status without regressing newer states if events arrive out of
   order.

### Failure and manual fallback

If delivery fails, both buyer and seller surfaces call that out clearly and
direct the handoff back to manual pickup coordination. The failure state is
terminal for the automated delivery flow until store staff arrange the next step
offline.

## Phase 8 demo runbook

Phase 8 adds deterministic demo prep plus the missing notification beats for the
scripted pitch flow. Do not edit database rows by hand for this demo. Use the
in-app demo tools or the guarded internal endpoints below so the app stays on
its real auction, payment, fulfillment, and push paths.

### One-time VAPID setup

Generate VAPID keys once and reuse them across local and hosted runs:

```bash
npx web-push generate-vapid-keys --json
```

Copy the generated values into your env file or deployment config:

- `VAPID_SUBJECT`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`

### Demo-control env

Enable the scripted controls with:

- `DEMO_MODE_ENABLED=1`
- `DEMO_CONTROL_TOKEN=<random secret>` if you want curl or VM-triggered access

Generate the optional token with:

```bash
openssl rand -hex 24
```

### Push prerequisites

- Desktop browsers: open the seller desk or shopper alerts lane and tap the
  alert opt-in button directly from the page.
- iPhone/iPad: the shopper or seller must install the app to the Home Screen,
  open that installed web app, and then grant notification permission from a
  tap-driven opt-in flow. Push will not work from a normal Safari tab.
- If VAPID env vars are missing, the app still runs but browser push becomes a
  graceful no-op.

### Preferred operator flow (in-app)

1. Start the app with `npm run dev`, or open the target deployment with the
   Phase 8 env vars configured.
2. Sign in as the seller in one browser/app session and as a shopper in another.
3. In the seller session:
   - Open `/sell`
   - Enable seller alerts if you want to demo the ending-soon and item-sold
     push beats
   - Open `/sell/demo`
4. In the shopper session:
   - Open `/shop/alerts`
   - Add a mock card or save a Stripe test card if needed
   - Enable shopper alerts
5. Back in the seller demo tools:
   - `Reset ambient world`
   - `Prepare hero auction`
6. In the shopper session:
   - Open the prepared hero auction from the feed
   - Place one real bid
7. Back in the seller demo tools:
   - `Inject competitor outbid`
8. In the shopper session:
   - Confirm the outbid notification lands
   - Open the hero auction or My Bids and place one more bid so the shopper is
     leading again before the close beat
9. Back in the seller demo tools:
   - `Trigger ending soon`
   - Confirm the seller-side ending-soon beat lands exactly once
10. Back in the seller demo tools:
    - `Force close now`
11. Verify the finish:
    - Shopper receives the win notification and sees the order in `/shop/orders`
    - Seller receives the item-sold beat and sees the finished result in
      `/sell/outcomes`

### Curl / VM fallback

If you need to drive the demo from a terminal instead of the in-app controls,
use the guarded internal endpoints. When calling with a bearer or `x-demo-token`
header instead of a signed-in seller session, include a real seller user id.

Replace `<base-url>` with `http://localhost:3000` or the deployed origin:

```bash
curl -X POST <base-url>/api/internal/demo/seed \
  -H "x-demo-token: $DEMO_CONTROL_TOKEN" \
  -H "content-type: application/json" \
  -d '{"sellerUserId":"<seller-user-id>"}'
```

```bash
curl -X POST <base-url>/api/internal/demo/hero \
  -H "x-demo-token: $DEMO_CONTROL_TOKEN" \
  -H "content-type: application/json" \
  -d '{"sellerUserId":"<seller-user-id>"}'
```

```bash
curl "<base-url>/api/internal/demo/hero?sellerUserId=<seller-user-id>" \
  -H "x-demo-token: $DEMO_CONTROL_TOKEN"
```

```bash
curl -X POST <base-url>/api/internal/demo/hero/outbid \
  -H "x-demo-token: $DEMO_CONTROL_TOKEN" \
  -H "content-type: application/json" \
  -d '{"auctionId":"<auction-id>","sellerUserId":"<seller-user-id>"}'
```

```bash
curl -X POST <base-url>/api/internal/demo/hero/ending-soon \
  -H "x-demo-token: $DEMO_CONTROL_TOKEN" \
  -H "content-type: application/json" \
  -d '{"auctionId":"<auction-id>"}'
```

```bash
curl -X POST <base-url>/api/internal/demo/hero/close \
  -H "x-demo-token: $DEMO_CONTROL_TOKEN" \
  -H "content-type: application/json" \
  -d '{"auctionId":"<auction-id>"}'
```

### Production troubleshooting on the VM

Production runs on a single Google Compute Engine VM with the app, web, Redis,
Postgres, and Neo4j containers on the same Docker network. If the demo misbehaves
in production, inspect the VM logs first instead of guessing from the browser.

SSH into the VM:

```bash
gcloud compute ssh mile-buy-club-api --zone=us-central1-a
```

Useful checks once connected:

```bash
docker ps
docker logs mile-buy-club-api-app --tail 200
docker logs mile-buy-club-web --tail 200
docker logs mile-buy-club-postgres --tail 200
```

For direct database inspection:

```bash
docker exec -it mile-buy-club-postgres psql -U mbc -d milebuyclub
```

