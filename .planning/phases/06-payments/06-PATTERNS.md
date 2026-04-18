# Phase 6: Payments (Stripe Test) - Pattern Map

**Mapped:** 2026-04-18
**Files analyzed:** 20 (17 new, 3 modified + schema/env/readme/migration)
**Analogs found:** 20 / 20 (every new file has a live analog; no pure greenfield)

## File Classification

| New / Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---------------------|------|-----------|----------------|---------------|
| `db/schema/stripe-webhook-events.ts` (NEW) | schema (table def) | DB write | `db/schema/push.ts` | exact (append-only event log w/ unique index) |
| `db/schema/consumers.ts` (MOD: add `stripeCustomerId`, `stripePaymentMethodId`) | schema column | DB write | `db/schema/consumers.ts` (existing `mockCardBrand` / `mockCardLast4` cols) | exact (same table, same nullable-text-col shape) |
| `db/schema/index.ts` (MOD: export `stripeWebhookEvents`) | barrel | — | `db/schema/index.ts` (existing `pushSubscriptions` wiring) | exact |
| `drizzle/0004_*.sql` (NEW, generated) | migration | DDL | `drizzle/0003_magical_toad.sql` (added `push_subscriptions` + ALTER `consumer_profiles`) | exact |
| `lib/payments/stripe.ts` (NEW) | service singleton | external-client init | `lib/push/vapid.ts` | role-match (server-only env-driven SDK configurator) |
| `lib/payments/customers.ts` (NEW) | service | DB read + external API write | `lib/push/subscriptions.ts` | role-match (server-only DB wrapper) |
| `lib/payments/setup-intents.ts` (NEW) | service | external API call | `lib/push/subscriptions.ts` / `lib/push/notify.ts` | role-match |
| `lib/payments/payment-intents.ts` (NEW, `chargeBidderOffSession`) | service | external API call + typed outcome | `lib/push/notify.ts` (`sendNotificationToUsers` try/catch + statusCode typing) | role-match |
| `lib/payments/fallback.ts` (NEW, `runFallbackBidderLoop`) | service | DB tx + external API loop | `lib/auctions/service.ts` (`sweepOverdueAuctions`, `closeAuctionWithWinner`) | exact (Drizzle `FOR UPDATE` + per-row commit pattern) |
| `lib/payments/idempotency.ts` (NEW) | service (dedup) | DB read + insert-on-conflict | `lib/push/subscriptions.ts` (`upsertPushSubscription.onConflictDoUpdate`) | exact |
| `lib/payments/webhook-handlers/index.ts` (NEW, dispatch map) | service (router) | — | `lib/push/notify.ts` (`switch (result.action)` in `notifyAuctionMutation`) | role-match |
| `lib/payments/webhook-handlers/setup-intent-succeeded.ts` (NEW) | service (handler) | DB write | `lib/push/subscriptions.ts::upsertPushSubscription` | role-match |
| `lib/payments/webhook-handlers/payment-intent-succeeded.ts` (NEW) | service (handler) | DB write + downstream insert | `lib/auctions/service.ts::closeAuctionWithWinner` (multi-table update + fulfillment chain) | role-match |
| `lib/payments/webhook-handlers/payment-intent-payment-failed.ts` (NEW) | service (handler) | triggers fallback | `lib/auctions/service.ts::refreshAuctionIfOverdue` (dispatch → service fn) | role-match |
| `lib/payments/webhook-handlers/payment-intent-canceled.ts` (NEW) | service (handler) | DB update | `app/api/consumer/mock-card/route.ts` (simple `db.update(...).set(...).where(...)`) | role-match |
| `app/api/webhooks/stripe/route.ts` (NEW) | route handler | request → verify → dispatch | `app/api/consumer/mock-card/route.ts` + `app/api/auctions/[auctionId]/bid/route.ts` | role-match (POST + `runtime = 'nodejs'`; **omit** `authorizeApiRole` — signature IS the auth) |
| `app/api/payments/setup-intent/route.ts` (NEW, returns clientSecret) | route handler | POST request/response | `app/api/consumer/mock-card/route.ts` (POST w/ `authorizeApiRole('consumer')`) | exact |
| `components/payments/add-card-form.tsx` (NEW, Stripe Elements) | client component | form submit → fetch → external SDK | `components/auction/mock-card-panel.tsx` (`"use client"`, fetch to `/api/consumer/mock-card`, useState feedback/error) | role-match |
| `lib/auctions/service.ts` (MOD: fire `chargeBidderOffSession` POST-commit in `buyoutAuction` / from a sweep trigger; NOT inside tx) | service mod | DB tx → external post-commit | `lib/auctions/service.ts::placeBid` (`await notifyAuctionMutation(result)` **after** `transaction(...)` returns) | exact |
| `lib/auctions/pricing.ts` (MOD: `AUCTION_PLATFORM_FEE_BPS` 1500 → 1000) | constant | — | `lib/auctions/pricing.ts` (self — one-line const change) | exact |
| `.env.example` (MOD: add 3 Stripe vars) | config doc | — | `.env.example` (existing `VAPID_*` block) | exact (three-var optional block w/ comment header) |
| `README.md` (MOD: Stripe CLI dev-loop) | doc | — | `README.md` (existing "Database workflow" block) | exact (H2 section + fenced bash) |

---

## Pattern Assignments

### `db/schema/stripe-webhook-events.ts` (schema, DB write)

**Analog:** `db/schema/push.ts` — same shape as a per-user unique-endpoint log table; `stripeWebhookEvents` is an idempotency log keyed on `event_id`.

**Full file excerpt** (copy structure verbatim, swap user FK for plain text PK):

```1:38:db/schema/push.ts
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./identity";

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    expirationTime: timestamp("expiration_time", {
      withTimezone: true,
      mode: "date",
    }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("push_subscriptions_endpoint_unique").on(table.endpoint),
    index("push_subscriptions_user_idx").on(table.userId),
  ],
);
```

**Copy / adapt:**
- Copy imports verbatim (`index`, `pgTable`, `text`, `timestamp`, `uniqueIndex`, `uuid`).
- Drop `users` import and the `userId` FK — webhook events aren't user-scoped.
- Replace body with: `id: uuid().defaultRandom().primaryKey()`, `eventId: text("event_id").notNull()`, `eventType: text("event_type").notNull()`, `processedAt: timestamp("processed_at", { withTimezone: true }).defaultNow().notNull()`.
- Keep the `uniqueIndex(...).on(table.eventId)` pattern — it is the mechanism `markEventProcessed` relies on via `onConflictDoNothing`.

---

### `db/schema/consumers.ts` (MOD — add `stripeCustomerId`, `stripePaymentMethodId`)

**Analog:** the existing mock-card columns in the same file — identical shape (optional text, nullable, no FK).

**Excerpt to mirror** (lines 47–53):

```47:53:db/schema/consumers.ts
    hasMockCardOnFile: boolean("has_mock_card_on_file").notNull().default(false),
    mockCardBrand: text("mock_card_brand"),
    mockCardLast4: text("mock_card_last4"),
    mockCardAddedAt: timestamp("mock_card_added_at", {
      withTimezone: true,
      mode: "date",
    }),
```

**Copy / adapt:**
- Add directly below the mock-card block:
  ```
  stripeCustomerId: text("stripe_customer_id"),
  stripePaymentMethodId: text("stripe_payment_method_id"),
  ```
- Do **not** remove the mock-card columns — RESEARCH Open Question §1 recommendation: keep them and flip them from the `setup_intent.succeeded` webhook so the Phase 4 gate (`hasMockCardOnFile(profile)` in `lib/auctions/pricing.ts`) keeps functioning unchanged.
- Do not add unique index — Stripe Customer ids are already globally unique and the `consumer_profiles_user_unique` index on `userId` already enforces 1:1.

---

### `db/schema/index.ts` (MOD)

**Analog:** the existing `pushSubscriptions` wiring in the same file.

```1:34:db/schema/index.ts
export * from "./identity";
export * from "./businesses";
export * from "./consumers";
export * from "./listings";
export * from "./auctions";
export * from "./payments";
export * from "./fulfillment";
export * from "./push";

import { bids, auctions } from "./auctions";
import { businesses, businessMemberships } from "./businesses";
import { consumerProfiles } from "./consumers";
import { fulfillments } from "./fulfillment";
import { accounts, sessions, users, verificationTokens } from "./identity";
import { listingImages, listings } from "./listings";
import { settlements } from "./payments";
import { pushSubscriptions } from "./push";

export const schema = {
  users,
  accounts,
  sessions,
  verificationTokens,
  businesses,
  businessMemberships,
  consumerProfiles,
  listings,
  listingImages,
  auctions,
  bids,
  settlements,
  fulfillments,
  pushSubscriptions,
};
```

**Copy / adapt:** Add `export * from "./stripe-webhook-events";`, add `import { stripeWebhookEvents } from "./stripe-webhook-events";`, add `stripeWebhookEvents,` to the `schema` object. This is what makes `db.query.stripeWebhookEvents.findFirst(...)` work in `lib/payments/idempotency.ts`.

---

### `drizzle/0004_*.sql` (NEW, generated by `npm run db:generate`)

**Analog:** `drizzle/0003_magical_toad.sql` — shows the exact shape Drizzle emits for (a) a new table with unique index + FK, and (b) `ALTER TABLE ADD COLUMN` for the consumer profile columns.

**Excerpt to expect the generator to produce:**

```1:25:drizzle/0003_magical_toad.sql
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"expiration_time" timestamp with time zone,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auctions" ADD COLUMN "current_bid_amount_cents" integer;--> statement-breakpoint
```

**Copy / adapt:** Do not hand-write. Run `npm run db:generate` after editing `db/schema/consumers.ts` + creating `db/schema/stripe-webhook-events.ts`. Expected output: `CREATE TABLE "stripe_webhook_events"` (id, event_id, event_type, processed_at) + `CREATE UNIQUE INDEX` on `event_id` + `ALTER TABLE "consumer_profiles" ADD COLUMN "stripe_customer_id" text` + `ADD COLUMN "stripe_payment_method_id" text`. Commit the emitted SQL unedited.

---

### `lib/payments/stripe.ts` (service singleton)

**Analog:** `lib/push/vapid.ts` — single-file server-only module that reads env vars, lazily instantiates an external SDK client, and exports one accessor.

```1:37:lib/push/vapid.ts
import "server-only";

import webpush from "web-push";

import { getOptionalEnv } from "@/lib/env";

type VapidConfig = {
  subject: string;
  publicKey: string;
  privateKey: string;
};

let configured = false;

export function getVapidConfig(): VapidConfig | null {
  const subject = getOptionalEnv("VAPID_SUBJECT");
  const publicKey = getOptionalEnv("VAPID_PUBLIC_KEY");
  const privateKey = getOptionalEnv("VAPID_PRIVATE_KEY");

  if (!subject || !publicKey || !privateKey) {
    return null;
  }

  return {
    subject,
    publicKey,
    privateKey,
  };
}
```

**Copy / adapt:**
- Keep `import "server-only";` at top — **mandatory** (prevents the secret key from being bundled into any client component).
- Swap `getOptionalEnv` → `getRequiredEnv("STRIPE_SECRET_KEY")` — Stripe is not optional at runtime, and the existing `db/client.ts` already uses `getRequiredEnv` (see below).
- Construct singleton: `export const stripe = new Stripe(getRequiredEnv("STRIPE_SECRET_KEY"), { maxNetworkRetries: 2, appInfo: { name: "ratatouille", version: "0.1.0" } });` — **do not** call as a function (`Stripe(key)` was removed in v22; use `new`).
- Do NOT override `apiVersion` — let the v22 SDK pin to `2026-03-25.dahlia` so SDK types match server responses (RESEARCH Pattern 1).

**Cross-reference for required-env style:**

```1:8:db/client.ts
import "server-only";

import { drizzle } from "drizzle-orm/neon-http";

import { schema } from "@/db/schema";
import { getRequiredEnv } from "@/lib/env";

export const db = drizzle(getRequiredEnv("DATABASE_URL"), { schema });
```

Mirror this exact import order: `"server-only"` → SDK → `@/db/schema` or `@/db/client` (as needed) → `@/lib/env`.

---

### `lib/payments/customers.ts` (service: `getOrCreateStripeCustomer`)

**Analog:** `lib/push/subscriptions.ts` — server-only, Drizzle read-then-write, exports plain async functions.

**Imports & shape to mirror** (lines 1–8 + 34–65):

```1:8:lib/push/subscriptions.ts
import "server-only";

import { eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db/client";
import { pushSubscriptions } from "@/db/schema";
```

```34:65:lib/push/subscriptions.ts
export async function upsertPushSubscription({
  userId,
  subscription,
  userAgent,
}: {
  userId: string;
  subscription: BrowserPushSubscription;
  userAgent?: string | null;
}) {
  await db
    .insert(pushSubscriptions)
    .values({
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      expirationTime: toExpirationDate(subscription.expirationTime),
      userAgent: userAgent ?? null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        userId,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        expirationTime: toExpirationDate(subscription.expirationTime),
        userAgent: userAgent ?? null,
        updatedAt: new Date(),
      },
    });
}
```

**Copy / adapt:**
- Keep the `import "server-only";` / destructured-object-arg / `db.query.<table>.findFirst({ columns, where })` pattern verbatim.
- Function body: look up `consumerProfiles` by `userId`; if `stripeCustomerId` present return it; else call `stripe.customers.create({ email, metadata: { userId } }, { idempotencyKey: \`customer:\${userId}\` })` and `db.update(consumerProfiles).set({ stripeCustomerId, updatedAt: new Date() }).where(eq(consumerProfiles.userId, userId))` — the `mock-card-panel` route below demonstrates the exact `db.update(...).set(...).where(eq(...)).returning(...)` shape on `consumerProfiles`.

**Update shape reference** (from `app/api/consumer/mock-card/route.ts` lines 102–111):

```102:111:app/api/consumer/mock-card/route.ts
  const [profile] = await db
    .update(consumerProfiles)
    .set(updateValues)
    .where(eq(consumerProfiles.userId, authorization.session.user.id))
    .returning({
      hasMockCardOnFile: consumerProfiles.hasMockCardOnFile,
      mockCardBrand: consumerProfiles.mockCardBrand,
      mockCardLast4: consumerProfiles.mockCardLast4,
      mockCardAddedAt: consumerProfiles.mockCardAddedAt,
    });
```

---

### `lib/payments/setup-intents.ts` (service)

**Analog:** same file as `customers.ts` (`lib/push/subscriptions.ts`) — one-liner server wrapper around an SDK call.

**Copy / adapt:**
- Header:
  ```
  import "server-only";
  import { stripe } from "./stripe";
  import { getOrCreateStripeCustomer } from "./customers";
  ```
- Body: `await stripe.setupIntents.create({ customer, automatic_payment_methods: { enabled: true }, usage: "off_session", metadata: { userId } }, { idempotencyKey: \`setup_intent:\${userId}:\${Date.now()}\` })`.
- Return `{ clientSecret: setupIntent.client_secret!, setupIntentId: setupIntent.id, customerId }`. The non-null assertion is safe here — SetupIntent always returns a client_secret on create.
- No DB write — the `setup_intent.succeeded` webhook handler persists `stripePaymentMethodId` (RESEARCH Pitfall §5).

---

### `lib/payments/payment-intents.ts` (service: `chargeBidderOffSession`)

**Analog:** `lib/push/notify.ts` — wraps an external-API call with `try/catch` + typed-status discrimination, exactly what we need for StripeCardError vs infra error.

**Shape to mirror** (lines 30–61):

```30:61:lib/push/notify.ts
  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          JSON.stringify(payload),
        );
      } catch (error) {
        const statusCode =
          typeof error === "object" &&
          error !== null &&
          "statusCode" in error &&
          typeof error.statusCode === "number"
            ? error.statusCode
            : null;

        if (statusCode === 404 || statusCode === 410) {
          await deletePushSubscriptionByEndpoint(subscription.endpoint);
          return;
        }

        console.error("push notification failed", error);
      }
    }),
  );
```

**Copy / adapt:**
- Mirror the **"catch, narrow-by-type, branch into recoverable vs log"** structure. Here, recoverable = `Stripe.errors.StripeCardError` (→ return `{ kind: "failed", code, decline }`); non-recoverable = `StripeRateLimitError | StripeConnectionError | StripeAPIError` (→ rethrow, caller's sweep retries).
- Export a discriminated-union `ChargeOutcome` type like RESEARCH Pattern 4 shows.
- Idempotency key: `pi:${settlementId}:attempt:${attemptNumber}` — **never** omit `attemptNumber` (RESEARCH Pitfall §4).
- Always pass `error_on_requires_action: true` on off-session PIs (RESEARCH Pitfall §6).
- Do NOT log full `PaymentMethod` objects at ERROR — only log `pi.id`, `code`, `decline_code`. (RESEARCH Security Domain row "Information Disclosure / PCI".)

---

### `lib/payments/fallback.ts` (service: `runFallbackBidderLoop`)

**Analog:** `lib/auctions/service.ts::sweepOverdueAuctions` + `closeAuctionWithWinner`. These already implement the canonical "select FOR UPDATE, iterate, do per-row external work inside the tx boundary correctly" pattern.

**Excerpt — lock + iterate** (lines 726–768):

```726:768:lib/auctions/service.ts
export async function sweepOverdueAuctions(limit = 12) {
  const results = await getInteractiveDb().transaction(async (tx) => {
    const overdueAuctionIds = await tx.execute(sql<{ id: string }>`
      select a.id
      from auctions a
      inner join listings l on l.id = a.listing_id
      where a.status in ('active', 'scheduled')
        and (
          a.scheduled_end_at <= now()
          or (l.expires_at is not null and l.expires_at <= now())
        )
      for update of a, l skip locked
      limit ${limit}
    `);

    const closedAuctions: AuctionMutationResult[] = [];
    const now = new Date();

    for (const row of overdueAuctionIds.rows as Array<{ id: string }>) {
      const lockedAuction = await lockAuction(tx, row.id);

      if (!lockedAuction) {
        continue;
      }

      if (lockedAuction.status === "closed" || lockedAuction.status === "cancelled") {
        continue;
      }

      const terminalState = await closeAuctionIfDue(tx, lockedAuction, now);

      if (terminalState) {
        closedAuctions.push(terminalState);
      }
    }

    return closedAuctions;
  });

  await Promise.all(results.map((result) => notifyAuctionMutation(result)));

  return results;
}
```

**Excerpt — settlement write** (lines 205–225):

```205:225:lib/auctions/service.ts
  const settlementAmounts = getSettlementAmounts(amountCents);

  await tx.insert(settlements).values({
    auctionId: auction.id,
    listingId: auction.listingId,
    businessId: auction.businessId,
    buyerUserId: winningBidUserId,
    winningBidId,
    status: "pending",
    paymentStatus: "pending_authorization",
    grossAmountCents: settlementAmounts.grossAmountCents,
    platformFeeCents: settlementAmounts.platformFeeCents,
    sellerNetAmountCents: settlementAmounts.sellerNetAmountCents,
    currency: auction.listingCurrency,
    createdAt: endedAt,
    updatedAt: endedAt,
  }).onConflictDoNothing({
    target: settlements.auctionId,
  });
```

**Copy / adapt:**
- Use `getInteractiveDb().transaction(async (tx) => { ... })` for the **lock + book-keep** step (select bids FOR UPDATE ordered by `amount_cents DESC, placed_at ASC`, record attempt number on the settlement row).
- **Do NOT** call `stripe.paymentIntents.create` inside this transaction (RESEARCH Pitfall §1, explicitly). The loop is: open tx → lock settlement + read next bidder → commit tx → call `chargeBidderOffSession` outside the tx → open a second tx to write the outcome → repeat. Mirror the `sweepOverdueAuctions` → `notifyAuctionMutation` split (note line 765: notification happens **after** the `transaction(...)` closure returns).
- Use `for update ... skip locked` (line 737) so parallel sweep ticks don't race on the same settlement.
- On final failure: `db.update(settlements).set({ status: 'failed', paymentStatus: 'failed', updatedAt: now })` + `db.update(listings).set({ status: 'expired' })`. This mirrors `closeAuctionWithoutWinner` (lines 262–294).

---

### `lib/payments/idempotency.ts` (service: `wasEventProcessed` + `markEventProcessed`)

**Analog:** `lib/push/subscriptions.ts` — same `insert().onConflict…` shape; RESEARCH Pattern 6 already sketched the exact 12-line implementation.

**Copy / adapt:**
- Header: `import "server-only"; import { db } from "@/db/client"; import { stripeWebhookEvents } from "@/db/schema";`.
- `wasEventProcessed`: mirror the `db.query.<table>.findFirst({ columns, where })` pattern from `app/api/consumer/mock-card/route.ts` lines 42–50.
- `markEventProcessed`: `db.insert(stripeWebhookEvents).values({ eventId, eventType, processedAt: new Date() }).onConflictDoNothing({ target: stripeWebhookEvents.eventId })` — identical to the auctions-service `onConflictDoNothing({ target: settlements.auctionId })` at line 222 above.

---

### `lib/payments/webhook-handlers/index.ts` (dispatch map)

**Analog:** `lib/push/notify.ts::notifyAuctionMutation` — a `switch` on a discriminant, each branch an async action, with an implicit default of "ignore".

**Shape to mirror** (lines 97–194 condensed):

```106:124:lib/push/notify.ts
  switch (result.action) {
    case "bid_accepted": {
      await Promise.all([
        result.outbidUserId
          ? sendNotificationToUsers([result.outbidUserId], {
              title: "You were outbid",
              body: `${context.listingTitle} just moved to ${saleAmount}.`,
              url: `/shop/${context.id}`,
              tag: `auction:${context.id}:outbid`,
            })
          : Promise.resolve(),
        sendNotificationToUsers(context.sellerUserIds, {
          title: "New high bid",
          body: `${context.listingTitle} is now at ${saleAmount} across ${context.bidCount} bids.`,
          url: "/sell/auctions",
          tag: `auction:${context.id}:seller-high-bid`,
        }),
      ]);
      return;
    }
```

**Copy / adapt:** The dispatch map file is purely glue — re-export the four handler modules and provide a `dispatchWebhookEvent(event: Stripe.Event)` that `switch (event.type) { case "setup_intent.succeeded": ...; case "payment_intent.succeeded": ...; case "payment_intent.payment_failed": ...; case "payment_intent.canceled": ...; default: return; }` — this shape matches the RESEARCH Pattern 6 route handler's inlined switch, just factored out into a module.

---

### `lib/payments/webhook-handlers/setup-intent-succeeded.ts`

**Analog:** `lib/push/subscriptions.ts::upsertPushSubscription` — single DB write keyed on external id, tolerant of duplicates.

**Copy / adapt:**
- Read `setupIntent.customer` (can be string or `Stripe.Customer`; coerce with `typeof x === "string" ? x : x?.id`) — RESEARCH Anti-patterns block, bullet 5.
- Read `setupIntent.payment_method` with the same defensive coercion.
- `db.update(consumerProfiles).set({ stripeCustomerId, stripePaymentMethodId, hasMockCardOnFile: true, mockCardBrand: 'Stripe test', mockCardLast4: '****', mockCardAddedAt: new Date(), updatedAt: new Date() }).where(eq(consumerProfiles.stripeCustomerId, customerId))` — the last-4/brand can be populated later by expanding the PaymentMethod; for Phase 6 demo, stamping the flag is sufficient to satisfy the existing Phase 4 `hasMockCardOnFile` gate.
- Mirror the `[profile] = await db.update(...).returning({...})` shape from `app/api/consumer/mock-card/route.ts` lines 102–111 if you need a post-update read.

---

### `lib/payments/webhook-handlers/payment-intent-succeeded.ts`

**Analog:** `lib/auctions/service.ts::closeAuctionWithWinner` — multi-table update pattern where one event-driven transition updates a parent row (`auctions`/`settlements`) and spawns a child row (`settlements`/`fulfillments`).

**Excerpt — transition pattern** (lines 226–246):

```226:246:lib/auctions/service.ts
  await tx
    .update(auctions)
    .set({
      status: "closed",
      result,
      currentBidAmountCents: amountCents,
      currentLeaderBidId: winningBidId,
      currentLeaderUserId: winningBidUserId,
      winningBidId,
      endedAt,
      updatedAt: endedAt,
    })
    .where(eq(auctions.id, auction.id));

  await tx
    .update(listings)
    .set({
      status: "sold",
      updatedAt: endedAt,
    })
    .where(eq(listings.id, auction.listingId));
```

**Copy / adapt:**
- Read `settlementId` from `paymentIntent.metadata.settlementId` (we set it when creating the PI — RESEARCH Pattern 4, lines 411–416).
- Open `getInteractiveDb().transaction(async (tx) => { ... })`:
  1. `tx.update(settlements).set({ paymentStatus: 'captured', processor: 'stripe', processorIntentId: paymentIntent.id, capturedAt: new Date(), status: 'ready_for_fulfillment', updatedAt: new Date() }).where(eq(settlements.id, settlementId))`.
  2. `tx.insert(fulfillments).values({ settlementId, listingId, mode: 'pickup', status: 'pending_choice', createdAt: now, updatedAt: now }).onConflictDoNothing({ target: fulfillments.settlementId })` — uses the existing `fulfillments_settlement_unique` index for idempotency (handler may fire twice).
- Return 2xx only **after** the tx commits (RESEARCH Pitfall §7).

---

### `lib/payments/webhook-handlers/payment-intent-payment-failed.ts`

**Analog:** `lib/auctions/service.ts::refreshAuctionIfOverdue` — a thin entry point that delegates into a self-contained service function.

**Excerpt** (lines 697–724):

```697:724:lib/auctions/service.ts
export async function refreshAuctionIfOverdue(auctionId: string) {
  const result = await getInteractiveDb().transaction(async (tx) => {
    const now = new Date();
    const lockedAuction = await lockAuction(tx, auctionId);

    if (!lockedAuction) {
      return null;
    }

    if (lockedAuction.status === "closed" || lockedAuction.status === "cancelled") {
      return null;
    }

    const terminalState = await closeAuctionIfDue(tx, lockedAuction, now);

    if (terminalState) {
      return terminalState;
    }

    return activateAuctionIfReady(tx, lockedAuction, now).then(() => null);
  });

  if (result) {
    await notifyAuctionMutation(result);
  }

  return result;
}
```

**Copy / adapt:**
- Extract `settlementId = paymentIntent.metadata.settlementId` and `attemptNumber = Number(paymentIntent.metadata.attemptNumber ?? '1')`.
- Guard: if the settlement is already `captured` or `failed`, return (idempotent no-op — event may be a late retry for an attempt we already cascaded past).
- Call `runFallbackBidderLoop(settlementId)` — the webhook is the **durability net** for the direct post-commit call from the close path (RESEARCH Open Question §5). Both paths must be idempotent; the `FOR UPDATE SKIP LOCKED` in the fallback loop enforces it.

---

### `lib/payments/webhook-handlers/payment-intent-canceled.ts`

**Analog:** `app/api/consumer/mock-card/route.ts` — simplest Drizzle update in the codebase.

**Excerpt** (lines 85–111):

```85:111:app/api/consumer/mock-card/route.ts
  const now = new Date();
  const updateValues = payload.data.enabled
    ? {
        hasMockCardOnFile: true,
        mockCardBrand: payload.data.brand ?? "Visa",
        mockCardLast4: payload.data.last4 ?? "4242",
        mockCardAddedAt: now,
        updatedAt: now,
      }
    : {
        hasMockCardOnFile: false,
        mockCardBrand: null,
        mockCardLast4: null,
        mockCardAddedAt: null,
        updatedAt: now,
      };

  const [profile] = await db
    .update(consumerProfiles)
    .set(updateValues)
    .where(eq(consumerProfiles.userId, authorization.session.user.id))
    .returning({
      hasMockCardOnFile: consumerProfiles.hasMockCardOnFile,
      mockCardBrand: consumerProfiles.mockCardBrand,
      mockCardLast4: consumerProfiles.mockCardLast4,
      mockCardAddedAt: consumerProfiles.mockCardAddedAt,
    });
```

**Copy / adapt:** `await db.update(settlements).set({ paymentStatus: 'failed', status: 'voided', processorIntentId: paymentIntent.id, updatedAt: new Date() }).where(eq(settlements.id, settlementId))`. Look up `settlementId` from `paymentIntent.metadata.settlementId`.

---

### `app/api/webhooks/stripe/route.ts` (route handler — **unauthenticated**, raw body)

**Primary analog — `runtime = 'nodejs'` POST handler:**

```1:20:app/api/auctions/[auctionId]/bid/route.ts
import { NextResponse } from "next/server";

import { authorizeApiRole } from "@/lib/auth/api";
import { jsonAuctionError, toAuctionErrorResponse } from "@/lib/auctions/http";
import { getAuctionDetail } from "@/lib/auctions/queries";
import { placeBid } from "@/lib/auctions/service";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ auctionId: string }> },
) {
  const authorization = await authorizeApiRole("consumer");

  if (!authorization.ok) {
    return NextResponse.json(authorization.body, {
      status: authorization.status,
    });
  }
```

**Secondary analog — POST handler that reads the request body and builds explicit error responses:**

```59:87:app/api/push/subscribe/route.ts
  try {
    const subscription = parsePushSubscription(await request.json());

    await upsertPushSubscription({
      userId: authorization.session.user.id,
      subscription,
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({
      ok: true,
      subscribed: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonAuctionError(
        "INVALID_PUSH_SUBSCRIPTION",
        error.issues[0]?.message ?? "Provide a valid push subscription.",
        400,
      );
    }

    console.error("push subscribe failed", error);
    return jsonAuctionError(
      "PUSH_SUBSCRIBE_FAILED",
      "The push subscription could not be saved.",
      500,
    );
  }
```

**Copy / adapt — this is the single most important file in the phase:**
- Keep `export const runtime = "nodejs";` **verbatim** (RESEARCH Pitfall §3). Edge runtime will break signature verification.
- Add `export const dynamic = "force-dynamic";` (RESEARCH Pattern 6 line 535) — the bid/push handlers don't need it, but a webhook must.
- **Remove** the `authorizeApiRole(...)` block entirely — Stripe authenticates via signature, not session. The existing `proxy.ts` matcher `matcher: ["/((?!api|...)*)"]` (lines 97–99) already excludes `/api/*` from Auth.js middleware, so no further exclusion work is needed.
- Body read: `const rawBody = await request.text();` — **never** `.json()` (RESEARCH Pitfall §2).
- Wrap `stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)` in try/catch → 400 on verification failure. Pattern mirrors the `z.ZodError` branch in `push/subscribe`.
- Dedup gate + dispatch via `handlers/index.ts`; on handler throw, return 500 (let Stripe retry) — do not call `markEventProcessed`. Mirror the `console.error("push ... failed", error);` style from `push/subscribe/route.ts` line 81 for log consistency.
- Response: `NextResponse.json({ received: true })` or `{ received: true, deduped: true }` — match the repo's `ok: true`/object-return convention even though Stripe only inspects status code.

---

### `app/api/payments/setup-intent/route.ts` (authenticated POST returning `clientSecret`)

**Analog:** `app/api/consumer/mock-card/route.ts` — POST gated by `authorizeApiRole('consumer')`, reads from / writes to `consumer_profiles`, returns JSON.

**Excerpt — full POST shape** (lines 66–125):

```66:85:app/api/consumer/mock-card/route.ts
export async function POST(request: Request) {
  const authorization = await authorizeApiRole("consumer");

  if (!authorization.ok) {
    return NextResponse.json(authorization.body, {
      status: authorization.status,
    });
  }

  const payload = mockCardSchema.safeParse(await request.json().catch(() => null));

  if (!payload.success) {
    return jsonAuctionError(
      "INVALID_MOCK_CARD_REQUEST",
      payload.error.issues[0]?.message ?? "Provide a valid mock-card payload.",
      400,
    );
  }

  const now = new Date();
```

**Copy / adapt:**
- Imports: `authorizeApiRole`, `jsonAuctionError`, `createSetupIntentForConsumer` (new), `NextResponse`.
- `export const runtime = "nodejs";` (match bid/mock-card files).
- Require session user's `email` — pass it through to `getOrCreateStripeCustomer`. `session.user.email` is already populated by Auth.js (see `lib/auth/api.ts` type).
- Return `NextResponse.json({ ok: true, clientSecret, setupIntentId })`.
- Error handling: try/catch around `createSetupIntentForConsumer`; on any error → `jsonAuctionError("STRIPE_SETUP_INTENT_FAILED", "Could not start card setup.", 500)`. Do NOT leak `(err as Error).message` to the client — log it.

---

### `components/payments/add-card-form.tsx` (client component, Stripe Elements)

**Analog:** `components/auction/mock-card-panel.tsx` — the existing card-gate UI. It's a `"use client"` component that POSTs to a server route, shows optimistic state via `useState` + `useTransition`, and renders `feedback` / `error` strings.

**Full file shape to mirror — imports + state + submit:**

```1:40:components/auction/mock-card-panel.tsx
"use client";

import { useState, useTransition } from "react";

type MockCardSnapshot = {
  enabled: boolean;
  brand: string | null;
  last4: string | null;
  addedAt?: Date | string | null;
};

type MockCardPanelProps = {
  initialMockCard: MockCardSnapshot;
  onChange?: (mockCard: MockCardSnapshot) => void;
  variant?: "compact" | "full";
};

export function MockCardPanel({
  initialMockCard,
  onChange,
  variant = "full",
}: MockCardPanelProps) {
  const [mockCard, setMockCard] = useState(initialMockCard);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startPendingTransition] = useTransition();

  async function updateMockCard(enabled: boolean) {
    setError(null);
    setFeedback(null);

    try {
      const response = await fetch("/api/consumer/mock-card", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ enabled }),
      });
```

**Copy / adapt — follow RESEARCH Pattern 3 structure, layered over the above:**
- Keep `"use client"` directive at top.
- Keep `useState` / `useTransition` for `busy`, `error`, `feedback` — same three pieces of state the mock-card panel uses.
- Replace the `fetch("/api/consumer/mock-card", ...)` call with a **two-step** flow: (1) `fetch("/api/payments/setup-intent", { method: "POST" })` → get `clientSecret`; (2) wrap children in `<Elements stripe={stripePromise} options={{ clientSecret }}>` and render `<PaymentElement />` + call `stripe.confirmSetup({ elements, redirect: "if_required", confirmParams: { return_url: \`${window.location.origin}/shop/cards/return\` } })` on submit.
- Handle Stripe errors via `setError(error.message ?? "Could not save card")` — exact same UX as the `setError("The mock card request failed...")` branch at line 73.
- `loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)` at module-top, outside the component, **only** in `"use client"` files (RESEARCH Pitfall §8).
- Reuse existing Tailwind class vocabulary from the analog (`rounded-[1.9rem]`, `border-[#ffd7c7]`, `text-[0.68rem] font-semibold uppercase tracking-[0.24em]`) so the new modal visually matches.

---

### `lib/auctions/service.ts` (MOD — fire charge post-commit)

**Analog: the file itself.** Look at how `placeBid` and `buyoutAuction` already fire `notifyAuctionMutation(result)` **after** `transaction(...)` returns:

```524:529:lib/auctions/service.ts
  });

  await notifyAuctionMutation(result);

  return result;
}
```

**Copy / adapt:**
- In `buyoutAuction` (line 531) and inside `sweepOverdueAuctions`/`refreshAuctionIfOverdue` for `auction_closed` results, add a sibling call **after** `notifyAuctionMutation(result)`:
  ```
  if (result.action === "auction_bought_out" || result.action === "auction_closed") {
    await triggerAuctionPaymentIfCloseResult(result); // new import from @/lib/payments/...
  }
  ```
- `triggerAuctionPaymentIfCloseResult` lives in `lib/payments/` (new) — it looks up the settlement by `auctionId`, reads `stripeCustomerId` / `stripePaymentMethodId` from the buyer's `consumerProfiles` row, and calls `chargeBidderOffSession`. On failure it kicks the fallback loop.
- **Do not** move the Stripe call inside the `.transaction(async (tx) => {...})` block — RESEARCH Pitfall §1 explicitly forbids it. The `transaction(...)` closure at line 402/538/727 ends before the Stripe call.
- Keep `sweepOverdueAuctions` result-array pattern (lines 765: `await Promise.all(results.map((result) => notifyAuctionMutation(result)))`) — run payments in `Promise.all` the same way so a slow Stripe API doesn't serialize the whole sweep.

---

### `lib/auctions/pricing.ts` (MOD — 1500 bps → 1000 bps)

**Analog: line 4, the constant itself.**

```1:32:lib/auctions/pricing.ts
import "server-only";

export const AUCTION_BID_INCREMENT_CENTS = 50;
export const AUCTION_PLATFORM_FEE_BPS = 1_500;
export const AUCTION_SWEEP_INTERVAL_MS = 15_000;
export const AUCTION_SWEEP_BATCH_SIZE = 12;

export function getNextBidAmountCents({
  currentBidAmountCents,
  reservePriceCents,
}: {
  currentBidAmountCents: number | null;
  reservePriceCents: number;
}) {
  if (currentBidAmountCents === null) {
    return reservePriceCents;
  }

  return currentBidAmountCents + AUCTION_BID_INCREMENT_CENTS;
}

export function getSettlementAmounts(grossAmountCents: number) {
  const platformFeeCents = Math.round(
    (grossAmountCents * AUCTION_PLATFORM_FEE_BPS) / 10_000,
  );

  return {
    grossAmountCents,
    platformFeeCents,
    sellerNetAmountCents: grossAmountCents - platformFeeCents,
  };
}
```

**Copy / adapt:** Change **only** `1_500` → `1_000`. `getSettlementAmounts` is already called from `closeAuctionWithWinner` (line 206) — the new fee flows through automatically. Do not alter the function signature (it's also consumed by `PLAN.md` fallback-loop recompute logic).

---

### `.env.example` (MOD — add three Stripe vars)

**Analog: the existing VAPID block (lines 34–37) — same "three optional env vars under a commented H2" shape.**

```34:37:.env.example
# --- Web Push / VAPID (optional; alerts degrade gracefully when unset) ---
VAPID_SUBJECT=mailto:alerts@example.com
VAPID_PUBLIC_KEY=replace-with-vapid-public-key
VAPID_PRIVATE_KEY=replace-with-vapid-private-key
```

**Copy / adapt:** Append at EOF:

```bash
# --- Stripe (required for Phase 6 payments; obtain from https://dashboard.stripe.com/test/apikeys) ---
# Server-only secret key (starts sk_test_). Must NEVER be prefixed NEXT_PUBLIC_.
STRIPE_SECRET_KEY=sk_test_replace-with-test-mode-secret-key
# Webhook signing secret (starts whsec_). From the Stripe Dashboard webhook endpoint settings.
STRIPE_WEBHOOK_SECRET=whsec_replace-with-webhook-signing-secret
# Browser publishable key (starts pk_test_). Intentionally NEXT_PUBLIC_ — exposed to clients.
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_replace-with-test-mode-publishable-key
```

Follow the existing style: comment header with `---`, lowercase `replace-with-...` placeholders, one-line inline comments above secret-vs-public distinctions (RESEARCH Pitfall §8).

---

### `README.md` (MOD — Stripe CLI dev-loop)

**Analog: the existing "Database workflow" section (lines 33–49).**

```33:49:README.md
## Database workflow

Generate SQL migrations from the schema:

\`\`\`bash
npm run db:generate
\`\`\`

Apply migrations to the configured database:

\`\`\`bash
npm run db:migrate
\`\`\`

If your Postgres provider exposes separate pooled and direct URLs, keep the
runtime on `DATABASE_URL` and place the direct connection in
`DATABASE_URL_UNPOOLED` so migrations can run without a pooler in the middle.
```

**Copy / adapt:** Append a new `## Stripe webhooks (local development)` section with the exact three-step shape: prose → fenced `bash` block → trailing prose caveat. The canonical command from RESEARCH Validation §Wave 0: `stripe listen --forward-to localhost:3000/api/webhooks/stripe --events payment_intent.succeeded,payment_intent.payment_failed,payment_intent.canceled,setup_intent.succeeded`. Add caveat that the Stripe CLI's printed `whsec_...` value overrides `STRIPE_WEBHOOK_SECRET` during local forwarding.

---

## Shared Patterns

### Server-only guard (applied to ALL new files under `lib/payments/`)

**Source:** `lib/push/vapid.ts` line 1, `db/client.ts` line 1, `lib/auctions/service.ts` line 1.

```1:1:lib/push/vapid.ts
import "server-only";
```

**Rationale:** Prevents the Stripe secret key (or any server-side module that touches it transitively) from being bundled into a client component. The codebase already enforces this on every server-only module; Phase 6 MUST follow the rule because the Stripe secret is strictly more sensitive than any existing secret (RESEARCH Security Domain §V9 / Pitfall §8).

### API-role authorization (applied to `app/api/payments/setup-intent/route.ts` — **NOT** `app/api/webhooks/stripe/route.ts`)

**Source:** `lib/auth/api.ts` + usage in `app/api/auctions/[auctionId]/bid/route.ts` lines 14–20.

```14:20:app/api/auctions/[auctionId]/bid/route.ts
  const authorization = await authorizeApiRole("consumer");

  if (!authorization.ok) {
    return NextResponse.json(authorization.body, {
      status: authorization.status,
    });
  }
```

**Apply to:** Every Phase 6 consumer-facing route handler (setup-intent creation, potential future buyout confirmation endpoint).

**Do NOT apply to:** `app/api/webhooks/stripe/route.ts`. Stripe cannot send a session cookie. The webhook is authenticated by HMAC signature via `stripe.webhooks.constructEvent` — that IS the access control (RESEARCH Security Domain §V4 "webhook endpoint enforces Stripe signature as its sole auth").

### JSON error response shape

**Source:** `lib/auctions/http.ts::jsonAuctionError` / `toAuctionErrorResponse`.

```7:24:lib/auctions/http.ts
export function jsonAuctionError(
  code: string,
  message: string,
  status: number,
) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message,
      },
    },
    {
      status,
    },
  );
}
```

**Apply to:** `app/api/payments/setup-intent/route.ts` — reuse `jsonAuctionError` directly (it's not auction-specific despite the name; all route handlers in the repo use this shape). The webhook route does **not** need this — Stripe only looks at HTTP status, not response body.

### `runtime = 'nodejs'` + POST handler boilerplate

**Source:** `app/api/auctions/[auctionId]/bid/route.ts` line 8, `app/api/consumer/mock-card/route.ts` line 11, `app/api/push/subscribe/route.ts` line 14.

```8:8:app/api/auctions/[auctionId]/bid/route.ts
export const runtime = "nodejs";
```

**Apply to:** Every new route handler in Phase 6 (both webhook and setup-intent routes). The webhook route additionally needs `export const dynamic = "force-dynamic";` (RESEARCH Pattern 6).

### Drizzle `db.query.<table>.findFirst({ columns, where })` read shape

**Source:** `app/api/consumer/mock-card/route.ts` lines 42–50.

```42:50:app/api/consumer/mock-card/route.ts
  const profile = await db.query.consumerProfiles.findFirst({
    columns: {
      hasMockCardOnFile: true,
      mockCardBrand: true,
      mockCardLast4: true,
      mockCardAddedAt: true,
    },
    where: (table, operators) => operators.eq(table.userId, authorization.session.user.id),
  });
```

**Apply to:** `lib/payments/customers.ts` (read `stripeCustomerId`), `lib/payments/idempotency.ts::wasEventProcessed`, every webhook handler that needs to load a settlement or consumer profile by id.

### Interactive-tx + external call split (Pitfall §1 mitigation)

**Source:** `lib/auctions/service.ts::placeBid` lines 402→524 (tx returns) + 526 (`notifyAuctionMutation` fires outside tx).

```402:529:lib/auctions/service.ts
  const result = await getInteractiveDb().transaction(async (tx) => {
    // ...all DB work...
    return { /*...*/ } satisfies AuctionMutationResult;
  });

  await notifyAuctionMutation(result);

  return result;
}
```

**Apply to:** Every place in `lib/payments/` or `lib/auctions/service.ts` that combines DB writes with a Stripe API call. The Stripe call lives **outside** the `transaction(...)` closure. Same rule as today — we're just reusing an already-established pattern.

---

## No Analog Found

None. Every Phase 6 new file has a direct or close analog listed above. The only file with an arguable "partial-only" analog is `app/api/webhooks/stripe/route.ts` — the codebase has no prior webhook endpoint that skips auth and preserves raw body. Its closest structural analog is `app/api/auctions/[auctionId]/bid/route.ts` (for `runtime = 'nodejs'` + POST boilerplate) + `app/api/push/subscribe/route.ts` (for body-read try/catch + typed-error branching); RESEARCH Pattern 6 supplies the raw-body + `constructEvent` specifics that no existing file demonstrates.

---

## Metadata

**Analog search scope:** `db/schema/`, `db/client.ts`, `db/interactive.ts`, `app/api/**/route.ts`, `lib/**/*.ts`, `components/auction/*.tsx`, `proxy.ts`, `.env.example`, `README.md`, `drizzle/*.sql`.
**Files scanned:** 25.
**Pattern extraction date:** 2026-04-18.

---

## PATTERN MAPPING COMPLETE

**Phase:** 6 - payments
**Files classified:** 22 (17 new, 5 modified incl. schema barrel / .env / README / auctions service / pricing constant)
**Analogs found:** 22 / 22

### Coverage
- Files with exact analog: 12 (schema files, migration, consumer-mod, idempotency, pricing const, setup-intent route, env, readme, service post-commit hook, etc.)
- Files with role-match analog: 10 (stripe.ts, customers.ts, setup-intents.ts, payment-intents.ts, webhook-handlers/*, add-card-form.tsx, webhook route)
- Files with no analog: 0

### Key Patterns Identified
- **Every server-only module starts with `import "server-only";`** — enforced in `db/client.ts`, `lib/push/vapid.ts`, `lib/auctions/service.ts`, `lib/auth/api.ts`. Phase 6 MUST preserve this for secret-key safety.
- **Route handlers all use `export const runtime = "nodejs";`** — no edge handlers exist; the webhook route additionally needs `dynamic = "force-dynamic"`.
- **Consumer-facing routes gate on `authorizeApiRole("consumer")` returning `{ok, session} | {ok:false, status, body}`** — reused in every `/api/consumer/*` and `/api/auctions/*` POST. The webhook route is the exception: signature IS the auth.
- **External I/O lives strictly outside DB transactions** — `placeBid`, `buyoutAuction`, `sweepOverdueAuctions` all return from `getInteractiveDb().transaction(...)` before calling `notifyAuctionMutation`. Phase 6 MUST mirror this for the Stripe call (RESEARCH Pitfall §1).
- **`onConflictDoNothing` / `onConflictDoUpdate` are the idiomatic idempotency primitives** — already used for settlements (`target: settlements.auctionId`) and push subscriptions (`target: pushSubscriptions.endpoint`). The new `stripe_webhook_events.event_id` unique index follows the same shape.
- **Error-response JSON shape is universal:** `{ ok: false, error: { code, message } }` via `jsonAuctionError`.
- **Drizzle schema files always import from `drizzle-orm/pg-core`**, define `pgTable` with a second-arg callback returning an array of indexes, and are re-exported through `db/schema/index.ts` both as a namespace (`export *`) and as a member of the `schema` object passed to `drizzle(...)`.

### File Created
`.planning/phases/06-payments/06-PATTERNS.md`

### Ready for Planning
Pattern mapping complete. Planner can now reference analog patterns in PLAN.md files — every new Phase 6 file has a line-numbered excerpt showing the exact shape to copy.
