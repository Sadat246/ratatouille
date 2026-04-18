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
