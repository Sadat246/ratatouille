# Phase 7: Fulfillment - Research

**Researched:** 2026-04-18
**Domain:** Uber Direct API + pickup-code UX + Next.js post-payment flow
**Confidence:** MEDIUM (Uber Direct API documented from SDK source + official docs; sandbox onboarding timeline is LOW due to limited developer-experience data)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Use the real Uber Direct sandbox API — actual quote requests, delivery creation, webhook status updates.
- **D-02:** Fallback if sandbox credentials unavailable: stub Uber Direct calls silently — UI shows full delivery UX with hardcoded sandbox-like responses. Indistinguishable in a pitch demo.
- **D-03:** Uber Direct tracking URL surfaced as a prominent "Track your delivery" button/link. No custom tracking UI or iframe.
- **D-04:** Fulfillment choice on the post-payment confirmation screen — two cards immediately after payment succeeds.
- **D-05:** Consumer's onboarding address pre-filled and editable before confirming delivery.
- **D-06:** Pickup code format: 6-digit numeric (e.g. "482 619").
- **D-07:** Business staff types 6 digits into dashboard → fulfillment.status = 'picked_up'.
- **D-08:** Pickup code expires 48 hours from payment capture.
- **D-09:** Code generated server-side with crypto.randomInt, stored in fulfillments.pickupCode + fulfillments.pickupCodeExpiresAt.
- **D-10:** Business dashboard shows simple list: item name, buyer display name, mode, status badge. Pickup rows: inline code-entry + Verify button. Delivery rows: Uber Direct status badge.
- **D-11:** Four business-facing status labels: "Pending pickup", "Pending delivery", "Picked up", "Delivered".
- **D-12:** Consumer order page shows "Track your delivery" button linking to Uber Direct tracking_url.
- **D-13:** Consumer sees status badge synced from Uber webhooks.
- **D-14:** Failed delivery → fulfillment.status = 'failed'. No auto-refund. Consumer retains option to arrange pickup manually.

### Claude's Discretion
- Uber Direct sandbox API endpoint structure and auth — researcher to document; planner to decide implementation.
- Webhook endpoint for Uber Direct delivery events (`/api/webhooks/uber-direct`) — Claude designs event handling and status mapping.
- Pickup code collision handling — Claude handles with appropriate uniqueness check.
- Consumer "order history" page design — Claude decides layout consistent with Phase 1 aesthetic.

### Deferred Ideas (OUT OF SCOPE)
- Auto-refund on failed delivery (v1.1)
- Alternative delivery providers (DoorDash, Instacart) — Uber Direct only
- Business ability to cancel a fulfillment
- Consumer cancellation after fulfillment starts
- Delivery instructions / special notes field
- QR code pickup verification — typed code only for v1
</user_constraints>

---

## Summary

Phase 7 adds the post-payment fulfillment loop to the Ratatouille auction platform. After `payment_intent.succeeded` fires and a `fulfillments` record is created with `status = 'pending_choice'`, the consumer lands on a confirmation screen where they choose pickup or delivery. The schema and existing Phase 6 webhook handler already wire this up — Phase 7 only needs to build the UI and the Uber Direct integration layer.

**Uber Direct uses OAuth 2.0 client credentials (not API key).** Credentials come from the Uber Direct Dashboard (`direct.uber.com`). The official SDK (`uber-direct` npm, v0.1.8) wraps auth + delivery CRUD and is the right library to use. **Critical risk: Uber Direct account creation is gated — "currently available only in select regions" — and requires billing info. The sandbox self-serve signup may not be accessible without an Uber account manager contact.** Plan for the D-02 fallback stub as the default path; treat live sandbox as a bonus.

Webhook signature verification uses HMAC-SHA256 over the raw request body with the signing key from the dashboard, delivered in the `x-uber-signature` header (mirroring Stripe's `stripe-signature` pattern already in the codebase).

**Primary recommendation:** Build the stub layer first (D-02 is fast and demo-safe), then wire the real SDK against it once credentials arrive. Both paths share the same route handler; a single `UBER_DIRECT_ENABLED` env flag switches behavior.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Fulfillment choice UI (pickup vs delivery) | Frontend (Next.js page) | — | Pure UI — reads fulfillment record, posts consumer's choice |
| Delivery quote fetch | API route handler | Uber Direct external | Quote requires server credentials; never exposed to browser |
| Delivery creation | API route handler | Uber Direct external | Same — credentials must stay server-side |
| Webhook event processing | API route handler (`/api/webhooks/uber-direct`) | Database | Follows Stripe webhook pattern; raw body + HMAC verify |
| Pickup code generation | API route handler (fulfillment creation) | Database | crypto.randomInt is Node.js only; collision check is a DB query |
| Pickup code verification | API route handler | Database | Business submits code → server validates → writes status |
| Business fulfillment dashboard | Frontend (Next.js page) | API route | Read fulfillments scoped to businessId; server-rendered list |
| Consumer order/tracking page | Frontend (Next.js page) | API route | Read fulfillment + tracking_url; link to Uber tracking page |
| Fulfillment status sync from Uber | API route handler (webhook) | Database | Uber pushes status; handler updates fulfillments.status |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `uber-direct` | 0.1.8 | Official Uber Direct JS SDK — auth, quote, delivery CRUD | Zero-dependency, TypeScript, maintained by Uber |
| `crypto` (Node built-in) | — | `crypto.randomInt(0, 999999)` for pickup code generation | Already in runtime; no additional dependency |
| Drizzle ORM | (existing) | All DB writes for fulfillment status transitions | Already the project ORM |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `next/headers` (cookies) | (existing Next.js) | Pass payment success context to confirmation screen | Avoids sensitive data in URL; sets a short-lived HttpOnly cookie |
| `@/lib/env` (existing) | — | `hasEnv('UBER_DIRECT_CLIENT_ID', ...)` to gate stub vs real | Already provides `hasEnv()` helper |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `uber-direct` SDK | Raw `fetch` to Uber REST API | SDK handles token caching (30-day tokens), URL construction, and type safety; raw fetch is fine but adds boilerplate |
| HttpOnly cookie for confirmation context | opaque `fulfillmentId` in query param | Cookie avoids leaking settlementId; query param with fulfillmentId only (not settlementId) is also safe — planner to decide |

**Installation:**
```bash
npm install uber-direct
```

**Version verification:** [VERIFIED: npm registry — uber-direct@0.1.8, last publish 2024-10-24]

---

## Architecture Patterns

### System Architecture Diagram

```
Stripe webhook (payment_intent.succeeded)
    │
    ▼
/api/webhooks/stripe   [EXISTING]
    │  creates fulfillments row: status=pending_choice
    ▼
Stripe redirects consumer to /consumer/order/[fulfillmentId]
    │
    ▼
Confirmation Screen (server component reads fulfillment)
    │
    ├─── Consumer picks PICKUP
    │       │
    │       ▼
    │    POST /api/fulfillment/[id]/choose-pickup
    │       │  generates pickupCode, sets status=awaiting_business
    │       ▼
    │    Business Dashboard (/business/fulfillments)
    │       │  staff types code → POST /api/fulfillment/[id]/verify-pickup
    │       ▼
    │    fulfillment.status = picked_up  ──► Phase 8 notification hook
    │
    └─── Consumer picks DELIVERY
            │
            ▼
         POST /api/fulfillment/[id]/choose-delivery
            │  (real: Uber SDK createQuote + createDelivery)
            │  (stub: hardcoded response with fake tracking URL)
            │  stores deliveryReferenceId + tracking_url in fulfillments
            │  sets status=delivery_requested
            ▼
         Uber Direct (external)
            │  fires webhooks to /api/webhooks/uber-direct
            ▼
         /api/webhooks/uber-direct  [NEW — mirrors Stripe pattern]
            │  HMAC-SHA256 verify (x-uber-signature header)
            │  maps Uber status → schema status
            │  pickup          → out_for_delivery
            │  delivered       → delivered + deliveredAt=now
            │  canceled        → failed
            ▼
         Consumer tracking page + Business dashboard update
            │
            ▼
         Phase 8 notification hooks (delivered / failed)
```

### Recommended Project Structure
```
lib/
├── fulfillment/
│   ├── uber-direct.ts      # SDK client factory + stub fallback
│   ├── pickup-code.ts      # generateUniquePickupCode()
│   └── status-map.ts       # Uber webhook status → schema enum map
app/
├── api/
│   ├── fulfillment/
│   │   └── [id]/
│   │       ├── choose-pickup/route.ts
│   │       ├── choose-delivery/route.ts
│   │       └── verify-pickup/route.ts
│   └── webhooks/
│       └── uber-direct/route.ts
├── (consumer)/
│   └── order/[fulfillmentId]/page.tsx   # confirmation + tracking
└── (business)/
    └── fulfillments/page.tsx            # business dashboard
```

---

## Uber Direct API — Complete Reference

> This section is the primary output the planner needs. All claims marked HIGH are verified from the official SDK source code or Uber Developer documentation.

### Authentication [VERIFIED: github.com/uber/uber-direct-sdk/src/auth/index.ts]

**Token endpoint (production + sandbox share the same login URL):**
```
POST https://login.uber.com/oauth/v2/token
Content-Type: application/x-www-form-urlencoded

client_id=<CLIENT_ID>
&client_secret=<CLIENT_SECRET>
&grant_type=client_credentials
&scope=eats.deliveries
```

**Response:**
```json
{ "access_token": "...", "expires_in": 2592000, "token_type": "Bearer" }
```

Token lifetime: 30 days. Cache and reuse — do NOT fetch per-request. [VERIFIED: developer.uber.com/docs/deliveries/guides/authentication]

**Using the token:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Required environment variables:**
```
UBER_DIRECT_CLIENT_ID=...
UBER_DIRECT_CLIENT_SECRET=...
UBER_DIRECT_CUSTOMER_ID=...   # from Developer tab in direct.uber.com dashboard
```

### Sandbox vs Production [VERIFIED: developer.uber.com/docs/deliveries/get-started]

The same `https://api.uber.com` base URL is used for both sandbox and production. The sandbox is distinguished by:
1. Credentials obtained from the sandbox account (a separate account created at `direct.uber.com`)
2. The `testSpecifications.roboCourierSpecification.mode: 'auto'` field on delivery create requests — this triggers an automated robo-courier in sandbox so deliveries progress through all status states automatically

**There is no separate `test-api.uber.com` domain for Uber Direct.** (The sandbox subdomain in Uber docs applies to the Riders/Eats products, not DaaS.) [CITED: github.com/uber/uber-direct-sdk — single base URL]

### API Base URL [VERIFIED: github.com/uber/uber-direct-sdk/src/deliveries/index.ts]
```
https://api.uber.com/v1/customers/{UBER_DIRECT_CUSTOMER_ID}
```

### Endpoint: Create Delivery Quote [VERIFIED: SDK source + developer docs]
```
POST https://api.uber.com/v1/customers/{customer_id}/delivery_quotes
```

**Request body (minimum required):**
```json
{
  "pickup_address": "{\"street_address\":[\"425 Market St\"],\"city\":\"San Francisco\",\"state\":\"CA\",\"zip_code\":\"94105\",\"country\":\"US\"}",
  "dropoff_address": "{\"street_address\":[\"201 3rd St\"],\"city\":\"San Francisco\",\"state\":\"CA\",\"zip_code\":\"94103\",\"country\":\"US\"}"
}
```

Note: Addresses are JSON-stringified objects, not plain strings. [CITED: developer.uber.com — address format guidance]

**Key response fields:**
- `id` — quote ID to pass as `quote_id` when creating delivery
- `fee` — delivery fee in cents
- `currency_code` — ISO 4217

### Endpoint: Create Delivery [VERIFIED: SDK source + developer.uber.com/docs/deliveries/direct/api/v1/post-eats-deliveries-orders]

> Note: Two endpoint conventions exist in Uber's docs. The SDK uses `/v1/customers/{id}/deliveries`. The Uber Eats-integrated path uses `/v1/eats/deliveries/orders`. **Use the SDK's path** (`/v1/customers/{id}/deliveries`) when using the `uber-direct` npm package.

```
POST https://api.uber.com/v1/customers/{customer_id}/deliveries
```

**Request body (required fields for Ratatouille):**
```json
{
  "pickup_name": "Ratatouille Store Name",
  "pickup_address": "<JSON-stringified address>",
  "pickup_phone_number": "+14155551212",
  "dropoff_name": "Buyer Name",
  "dropoff_address": "<JSON-stringified address from consumer profile>",
  "dropoff_phone_number": "+14155551212",
  "manifest_items": [
    {
      "name": "Item name from listing",
      "quantity": 1,
      "size": "small",
      "price": 1000
    }
  ],
  "external_order_id": "<fulfillment.id — for idempotency>",
  "testSpecifications": {
    "roboCourierSpecification": { "mode": "auto" }
  }
}
```

`testSpecifications` block MUST be included in sandbox; omit in production.

**Key response fields:**
```json
{
  "id": "del_abc123",          // store in fulfillments.deliveryReferenceId
  "tracking_url": "https://...", // store in a new column OR use deliveryReferenceId to link
  "status": "pending",
  "fee": { "total": 599, "currency_code": "USD" }
}
```

**Schema note:** The existing schema has `deliveryReferenceId text` but no `trackingUrl` column. The planner MUST add a `trackingUrl text` column to the fulfillments table (Drizzle migration required). The `tracking_url` from the create-delivery response is what consumers use for D-12. [VERIFIED: delivery response field is `tracking_url` from SDK samples]

### Endpoint: Get Delivery Status [VERIFIED: developer.uber.com/docs/deliveries/direct/api/v1/get-eats-deliveries-orders-orderid]
```
GET https://api.uber.com/v1/customers/{customer_id}/deliveries/{delivery_id}
```

**Response status values (for status polling fallback, if needed):**
`pending` | `pickup` | `pickup_complete` | `dropoff` | `delivered` | `canceled` | `returned`

### Endpoint: Cancel Delivery [VERIFIED: SDK source]
```
POST https://api.uber.com/v1/customers/{customer_id}/deliveries/{delivery_id}/cancel
```

---

## Uber Direct Webhooks — Complete Reference

### Registration [VERIFIED: developer.uber.com/docs/deliveries/guides/webhooks]

Register at `direct.uber.com` → Developer → Webhooks tab → Create Webhook.
- Select event types: `event.delivery_status` (required), `event.courier_update` (optional)
- Enter your HTTPS endpoint URL (e.g., `https://your-app.vercel.app/api/webhooks/uber-direct`)
- Dashboard gives you a **signing key** — store as `UBER_DIRECT_WEBHOOK_SECRET`

### Signature Verification [VERIFIED: developer.uber.com/docs/deliveries/guides/webhooks]

**Header:** `x-uber-signature` (also `x-postmates-signature` for backward compat — check both)
**Algorithm:** HMAC-SHA256
**Input:** Raw request body as UTF-8 string
**Key:** Signing key from dashboard (UTF-8 string)

```typescript
import { createHmac } from "crypto";

function verifyUberSignature(rawBody: string, signature: string, secret: string): boolean {
  const computed = createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");
  return computed === signature;
}
```

**Critical:** Preserve raw body (same pattern as Stripe in this codebase — use `request.text()`).

### Webhook Event Types [VERIFIED: developer.uber.com/docs/deliveries/guides/webhooks]

| Event | When | Ratatouille Use |
|-------|------|----------------|
| `event.delivery_status` | Any status change | Primary — maps to fulfillment.status |
| `event.courier_update` | Location updates | Ignore in v1 (no real-time tracking map) |
| `event.refund_request` | Refund initiated | Ignore in v1 (refunds deferred) |

### Delivery Status Event Payload [VERIFIED: developer.uber.com/docs/deliveries/daas/api/webhook-event-deliverystatus]

```json
{
  "kind": "event.delivery_status",
  "delivery_id": "del_abc123",
  "status": "pickup",
  "customer_id": "...",
  "live_mode": true,
  "data": {
    "id": "del_abc123",
    "status": "...",
    "tracking_url": "https://...",
    "courier": { "location": { "lat": ..., "lng": ... } },
    "pickup_eta": 8,
    "dropoff_eta": 22
  }
}
```

### Uber Status → Ratatouille Schema Status Map

| Uber `status` value | Ratatouille `fulfillmentStatus` | Phase 8 hook? |
|---------------------|--------------------------------|---------------|
| `pending` | `delivery_requested` | No |
| `pickup` | `out_for_delivery` | No |
| `pickup_complete` | `out_for_delivery` | No (intermediate) |
| `dropoff` | `out_for_delivery` | No |
| `delivered` | `delivered` + set `deliveredAt` | YES — "your item arrived" |
| `canceled` | `failed` | YES — "delivery couldn't complete" |
| `returned` | `failed` | YES — "delivery couldn't complete" |

### Retry Policy [VERIFIED: developer.uber.com/docs/deliveries/guides/webhooks]

Uber retries with exponential backoff: 10s → 30s → 60s → 120s (4 attempts total). Return 200 quickly to prevent retries. Use the existing idempotency pattern: store `delivery_id + status` in a webhook events table (or check for duplicate processing via fulfillment.status).

---

## Uber Direct Sandbox Onboarding — TIMELINE RISK ASSESSMENT

### Process [VERIFIED: developer.uber.com/docs/deliveries/get-started]

1. Visit `direct.uber.com` and create an account using an Uber login
2. Accept Uber Direct Terms of Use + API Terms
3. Add billing information (credit card required for account creation)
4. Receive three credentials from the Developer tab: Customer ID, Client ID, Client Secret

### Critical Risk Flag

**"The Create Account process is currently available only in select regions."** [VERIFIED: developer.uber.com/docs/deliveries/get-started]

This means:
- If you're in a supported region (US, Canada, major EU cities, Australia) and can log in with an Uber account: **self-serve signup should take < 30 minutes** — primarily account setup + accepting T&Cs.
- If you're outside supported regions: **you need an Uber account manager** — no timeline guarantee.
- Production access (beyond sandbox) requires a **pilot run with real store locations** and Uber team monitoring — out of scope for this demo.

**For the 2026-05-02 demo, the realistic risk is:**
- Region in scope: LOW risk — sandbox credentials available same day via self-serve.
- Region out of scope: HIGH risk — cannot get sandbox in time; D-02 stub becomes the ONLY path.

**Recommendation:** Implement the D-02 stub layer first (it's fast and 100% demo-safe). Attempt sandbox signup immediately. If credentials arrive before demo — swap `UBER_DIRECT_ENABLED=true`. If not — demo works perfectly on the stub.

### Stub Implementation [CITED: D-02 decision]

```typescript
// lib/fulfillment/uber-direct.ts
import { hasEnv } from "@/lib/env";

const UBER_ENABLED = hasEnv(
  "UBER_DIRECT_CLIENT_ID",
  "UBER_DIRECT_CLIENT_SECRET",
  "UBER_DIRECT_CUSTOMER_ID"
);

export async function createDelivery(params: DeliveryParams): Promise<DeliveryResult> {
  if (!UBER_ENABLED) {
    return {
      deliveryReferenceId: `stub_del_${Date.now()}`,
      trackingUrl: "https://www.ubereats.com/orders/stub-demo-delivery-id",
      initialStatus: "pending",
    };
  }
  // Real SDK call
  const client = createDeliveriesClient(await getAccessToken());
  const result = await client.createDelivery({ ...params, testSpecifications: { roboCourierSpecification: { mode: "auto" } } });
  return {
    deliveryReferenceId: result.id,
    trackingUrl: result.tracking_url,
    initialStatus: result.status,
  };
}
```

---

## Pickup Code Mechanics

### Generation [VERIFIED: D-09 decision + Node.js crypto docs]

```typescript
// lib/fulfillment/pickup-code.ts
import { randomInt } from "crypto";

/** Returns zero-padded 6-digit string, e.g. "048 619" */
export function generatePickupCode(): string {
  const n = randomInt(0, 1_000_000); // 0–999999 inclusive
  return n.toString().padStart(6, "0");
}
```

### Uniqueness Strategy [VERIFIED: Postgres docs + query design]

A 6-digit code has 1,000,000 possible values. The uniqueness window is **active fulfillments** (status = 'awaiting_business' or 'ready_for_pickup'). In a demo context with < 100 concurrent fulfillments, collision probability is negligible (< 0.01%).

**Strategy: retry loop with uniqueness check.** Do not add a DB unique constraint on `pickupCode` — codes should be reusable across time (after expiry or terminal status). The check is:

```typescript
export async function generateUniquePickupCode(db: Database): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generatePickupCode();
    const conflict = await db.query.fulfillments.findFirst({
      where: (t, { eq, and, inArray }) =>
        and(
          eq(t.pickupCode, code),
          inArray(t.status, ["awaiting_business", "ready_for_pickup"])
        ),
    });
    if (!conflict) return code;
  }
  throw new Error("Could not generate unique pickup code after 10 attempts");
}
```

This is safe up to ~100,000 concurrent active fulfillments before retry loops become non-trivial. For a demo with < 50 concurrent auctions, no DB-level constraint is needed.

**Verification endpoint security:** The verify-pickup route must:
1. Check `fulfillment.pickupCodeExpiresAt > now()`
2. Check `fulfillment.status` is in an active state (not already `picked_up`)
3. Use constant-time comparison if storing hashed codes (overkill for demo; plain compare is fine)

---

## Fulfillment State Machine

### Pickup Path

```
pending_choice
    │ consumer picks PICKUP
    ▼
awaiting_business  ←──── pickupCode + pickupCodeExpiresAt set
    │ (optional intermediate state — schema has ready_for_pickup too)
    │ business staff types code → verify-pickup API
    ▼
picked_up  [TERMINAL]
    │
    └──► Phase 8: push notification to consumer ("Item picked up!")
```

Note: The schema has `awaiting_business` and `ready_for_pickup` — for v1, go directly from `awaiting_business` to `picked_up`. The planner may choose to omit `ready_for_pickup` or use it if the business has a "mark ready" step.

### Delivery Path

```
pending_choice
    │ consumer picks DELIVERY (submits address)
    ▼
delivery_requested  ←──── deliveryReferenceId + trackingUrl set
    │ (Uber webhook: status=pickup or pickup_complete or dropoff)
    ▼
out_for_delivery
    │ (Uber webhook: status=delivered)
    ▼
delivered  [TERMINAL]  ←──── deliveredAt set
    │
    └──► Phase 8: push notification to consumer

    OR

    │ (Uber webhook: status=canceled or returned)
    ▼
failed  [TERMINAL]
    │
    └──► Phase 8: push notification to consumer ("Delivery couldn't complete")
```

### Business UI Label Map (D-11)

| Schema status | Business-facing label | Fulfillment mode |
|---------------|----------------------|-----------------|
| `pending_choice` | (hidden — consumer hasn't chosen yet) | any |
| `awaiting_business` | "Pending pickup" | pickup |
| `ready_for_pickup` | "Pending pickup" | pickup |
| `picked_up` | "Picked up" | pickup |
| `delivery_requested` | "Pending delivery" | delivery |
| `out_for_delivery` | "Pending delivery" | delivery |
| `delivered` | "Delivered" | delivery |
| `failed` | "Failed" | any |
| `cancelled` | "Cancelled" | any |

### Phase 8 Notification Hook Points

| Event | Notify | Message |
|-------|--------|---------|
| `picked_up` | consumer | "Your item has been picked up!" |
| `delivered` | consumer | "Your delivery arrived!" |
| `failed` (delivery) | consumer | "Delivery couldn't be completed — contact the store" |
| `delivery_requested` | business | "New delivery request for [item]" |
| `awaiting_business` | business | "New pickup request for [item] — code: [XXX XXX]" |

Phase 7 should call a `notifyFulfillmentStatusChange(fulfillmentId, newStatus)` stub that Phase 8 will implement. This keeps Phase 7 self-contained and Phase 8 hookable.

---

## Post-Payment Redirect Pattern

### Problem
After Stripe payment succeeds, the consumer must land on the fulfillment choice screen. The fulfillment record ID needs to be passed to the confirmation page without leaking `settlementId` (internal FK) in the URL.

### Solution: fulfillmentId in URL (safe to expose)

The `fulfillments.id` (UUID) is safe in a URL param — it's opaque, non-sequential, and reveals no financial information. The page server-component fetches fulfillment by ID and verifies the requesting user owns it via `settlement.buyerUserId`.

```
Payment succeeds → Stripe redirects to /consumer/order/{fulfillmentId}?new=1
                   (fulfillmentId stored in Stripe PaymentIntent metadata)
```

**Where to store fulfillmentId in Stripe metadata:** The Phase 6 `payment_intent.succeeded` handler creates the fulfillment row and returns the new ID. However, the fulfillmentId is only known AFTER the webhook fires, so it cannot be in the PaymentIntent metadata at creation time.

**Better pattern:** The confirmation page route is `/consumer/order/[settlementId]` where settlementId IS in the metadata. The page server-component does:
```typescript
const settlement = await db.query.settlements.findFirst({
  where: eq(settlements.id, params.settlementId),
  with: { fulfillment: true }
});
// verify settlement.buyerUserId === session.user.id
// render based on fulfillment.status
```

settlementId is a UUID (opaque) — safe to expose in URLs. [CITED: Next.js App Router + Auth.js session pattern]

**Alternatively:** Stripe's `success_url` can include `{CHECKOUT_SESSION_ID}` but for PaymentIntents, the redirect after `confirmPayment()` in the client can include a `return_url` with the settlementId baked in at SetupIntent/PaymentIntent creation time.

**Planner decision:** Use `/consumer/order/[settlementId]` — the server component verifies ownership via `settlement.buyerUserId`. This avoids any cookie complexity.

### Stripe to Fulfillment Page Redirect [ASSUMED]

The Phase 6 `StripeCardSetup` component confirms payment on the client and redirects. The simplest v1 pattern:

```typescript
// After confirmPayment() resolves on client
// settlementId is stored in React state / already known from the bid context
router.push(`/consumer/order/${settlementId}?confirmed=1`);
```

The `?confirmed=1` param triggers a celebratory toast ("You got it!") on first render, then is removed from the URL.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Uber Direct API auth | Custom OAuth flow | `uber-direct` SDK `getAccessToken()` | Token caching, scope handling, error handling all included |
| Uber webhook HMAC verify | Custom crypto impl | Node built-in `createHmac('sha256', ...)` | Already used for Stripe pattern; consistent |
| Pickup code generation | UUID or timestamp-based codes | `crypto.randomInt(0, 1_000_000)` | Simple, cryptographically random, human-readable |
| Delivery status state machine | Complex branching logic | Map table (Uber status → schema enum) | Uber has ~8 statuses; a lookup map is exhaustive and testable |
| Consumer address pre-fill | Re-prompt for address | Read from `consumer_profiles.deliveryAddress` (Phase 2) | Address was captured at onboarding; editable on confirmation screen |

**Key insight:** The Uber Direct SDK (`uber-direct`) is zero-dependency, TypeScript-native, and maintained by Uber engineers. Use it rather than hand-rolling the REST calls.

---

## Common Pitfalls

### Pitfall 1: Raw Body Consumed Before HMAC Verification
**What goes wrong:** Calling `request.json()` before computing the HMAC signature invalidates the verification — body stream is consumed.
**Why it happens:** Same issue as Stripe webhooks; easy to forget.
**How to avoid:** Always `const rawBody = await request.text()` first, then `JSON.parse(rawBody)`.
**Warning signs:** HMAC verification fails with valid test events.

### Pitfall 2: Uber Direct Account Unavailable in Region
**What goes wrong:** `direct.uber.com` signup blocked — "not available in your region" — sandbox credentials never obtained.
**Why it happens:** Uber Direct launch is geographically staged.
**How to avoid:** Implement D-02 stub layer FIRST. Use `UBER_DIRECT_ENABLED` env flag.
**Warning signs:** Signup form at direct.uber.com says "contact account manager".

### Pitfall 3: Delivery Created Without `testSpecifications` in Sandbox
**What goes wrong:** Delivery gets stuck in `pending` forever — no robo-courier to advance it.
**Why it happens:** Sandbox requires `testSpecifications.roboCourierSpecification.mode: 'auto'` to simulate delivery progression.
**How to avoid:** Gate on `process.env.NODE_ENV !== 'production'` or a separate `UBER_SANDBOX` flag.
**Warning signs:** Delivery status never advances from `pending` in testing.

### Pitfall 4: Pickup Code Expiry Not Checked on Verify
**What goes wrong:** Business staff verifies a code 49h after purchase — code is expired but still matches.
**Why it happens:** Forgot to check `pickupCodeExpiresAt < now()`.
**How to avoid:** Verify endpoint checks both code match AND expiry. Return 410 Gone if expired.

### Pitfall 5: Missing `trackingUrl` Column in Schema
**What goes wrong:** `delivery.tracking_url` from Uber has nowhere to store; planner omits Drizzle migration.
**Why it happens:** Existing schema has `deliveryReferenceId` and `deliveryQuoteId` but no `trackingUrl`.
**How to avoid:** Migration in Wave 0 of plan adds `tracking_url text` to fulfillments table.

### Pitfall 6: Webhook Events Processed Multiple Times
**What goes wrong:** Uber retries on your 200 response being delayed → duplicate status writes.
**Why it happens:** Same as Stripe dedup issue. Uber retries up to 4 times.
**How to avoid:** Check if `fulfillment.status` is already at or past the incoming status before writing. Idempotent update: `WHERE id = $1 AND status != 'delivered'`.

### Pitfall 7: Address Format for Uber API
**What goes wrong:** Passing address as plain string → Uber rejects or misroutes.
**Why it happens:** Uber requires addresses as JSON-stringified objects with `street_address` (array), `city`, `state`, `zip_code`, `country`.
**How to avoid:** Helper function `formatUberAddress(profile.deliveryAddress)` that constructs the object and JSON.stringifies it.

---

## Code Examples

### Uber Direct Client Factory (with stub fallback)
```typescript
// lib/fulfillment/uber-direct.ts
// Source: github.com/uber/uber-direct-sdk
import "server-only";
import { getAccessToken } from "uber-direct/auth";
import { createDeliveriesClient } from "uber-direct/deliveries";
import { hasEnv } from "@/lib/env";

export const UBER_DIRECT_ENABLED = hasEnv(
  "UBER_DIRECT_CLIENT_ID",
  "UBER_DIRECT_CLIENT_SECRET",
  "UBER_DIRECT_CUSTOMER_ID"
);

export async function getDeliveriesClient() {
  if (!UBER_DIRECT_ENABLED) throw new Error("Uber Direct not configured");
  const token = await getAccessToken();
  return createDeliveriesClient(token);
}
```

### Create Delivery (real + stub)
```typescript
// Source: github.com/uber/uber-direct-sdk-samples
export async function createUberDelivery(params: {
  pickupName: string;
  pickupAddress: string; // pre-formatted JSON string
  pickupPhone: string;
  dropoffName: string;
  dropoffAddress: string;
  dropoffPhone: string;
  itemName: string;
  itemPriceCents: number;
  externalOrderId: string; // fulfillment.id for idempotency
}): Promise<{ deliveryReferenceId: string; trackingUrl: string }> {
  if (!UBER_DIRECT_ENABLED) {
    return {
      deliveryReferenceId: `stub_del_${Date.now()}`,
      trackingUrl: "https://www.ubereats.com/orders/stub-demo-delivery",
    };
  }

  const client = await getDeliveriesClient();
  const result = await client.createDelivery({
    pickup_name: params.pickupName,
    pickup_address: params.pickupAddress,
    pickup_phone_number: params.pickupPhone,
    dropoff_name: params.dropoffName,
    dropoff_address: params.dropoffAddress,
    dropoff_phone_number: params.dropoffPhone,
    manifest_items: [{
      name: params.itemName,
      quantity: 1,
      size: "small",
      price: params.itemPriceCents,
    }],
    external_order_id: params.externalOrderId,
    // Include in sandbox; omit (or gate) in production:
    testSpecifications: { roboCourierSpecification: { mode: "auto" } },
  });

  return {
    deliveryReferenceId: result.id,
    trackingUrl: result.tracking_url,
  };
}
```

### Webhook Route Handler Pattern
```typescript
// app/api/webhooks/uber-direct/route.ts
// Source: mirrors app/api/webhooks/stripe/route.ts (Phase 6 pattern)
import { createHmac } from "crypto";
import { NextResponse } from "next/server";
import { getRequiredEnv } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UBER_STATUS_MAP: Record<string, string> = {
  pending: "delivery_requested",
  pickup: "out_for_delivery",
  pickup_complete: "out_for_delivery",
  dropoff: "out_for_delivery",
  delivered: "delivered",
  canceled: "failed",
  returned: "failed",
};

export async function POST(request: Request) {
  const signature = request.headers.get("x-uber-signature")
    ?? request.headers.get("x-postmates-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();
  const secret = getRequiredEnv("UBER_DIRECT_WEBHOOK_SECRET");

  const computed = createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");

  if (computed !== signature) {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(rawBody);
  if (event.kind !== "event.delivery_status") {
    return NextResponse.json({ received: true, skipped: true });
  }

  const uberStatus: string = event.status;
  const schemaStatus = UBER_STATUS_MAP[uberStatus];
  if (!schemaStatus) {
    return NextResponse.json({ received: true, unmapped: uberStatus });
  }

  // Update fulfillment by deliveryReferenceId
  // ... db update logic
  return NextResponse.json({ received: true });
}
```

### Pickup Code Generation with Uniqueness Check
```typescript
// lib/fulfillment/pickup-code.ts
import { randomInt } from "crypto";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { fulfillments } from "@/db/schema";

export async function generateUniquePickupCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const conflict = await db.query.fulfillments.findFirst({
      columns: { id: true },
      where: and(
        eq(fulfillments.pickupCode, code),
        inArray(fulfillments.status, ["awaiting_business", "ready_for_pickup"])
      ),
    });
    if (!conflict) return code;
  }
  throw new Error("pickup code generation exhausted 10 attempts");
}

/** Format for display: "482 619" */
export function formatPickupCode(code: string): string {
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}
```

---

## Schema Migration Required

The current `fulfillments` table is missing one field needed for D-12:

```typescript
// Add to db/schema/fulfillment.ts
trackingUrl: text("tracking_url"),  // Uber Direct order_tracking_url
```

This requires a Drizzle migration. Include as Wave 0 task in the plan.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `uber-direct` npm package | Uber Direct integration | Not installed yet | 0.1.8 | D-02 stub (no package needed) |
| Uber Direct sandbox account | Real API calls | Unknown — requires signup | — | D-02 stub |
| `UBER_DIRECT_WEBHOOK_SECRET` | Webhook verification | Unknown | — | Skip webhook in stub mode |
| Node.js `crypto` | Pickup code + HMAC | ✓ | Built-in | — |

**Missing with fallback:**
- Uber Direct sandbox credentials → D-02 stub makes all missing credentials non-blocking. The stub must be built first regardless.

**Missing without fallback:**
- None — all blocking dependencies have a stub path.

---

## Validation Architecture

> `workflow.nyquist_validation` not explicitly set to false in config.json — including this section.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (detected from existing phase plans) |
| Config file | `vitest.config.ts` (existing) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Behavior | Test Type | Automated Command | Notes |
|----------|-----------|-------------------|-------|
| `generateUniquePickupCode()` returns 6-digit string | unit | `vitest run lib/fulfillment/pickup-code` | Pure function, fast |
| Pickup code uniqueness retry logic | unit | same | Mock DB to simulate conflicts |
| `formatPickupCode("482619")` → "482 619" | unit | same | Trivial |
| `verifyUberSignature()` accepts valid HMAC | unit | `vitest run lib/fulfillment` | No network needed |
| `UBER_STATUS_MAP` covers all known Uber statuses | unit | same | Exhaustive map test |
| `formatUberAddress()` produces valid JSON string | unit | same | Input/output test |
| Pickup verification rejects expired code | unit | mock `Date.now()` | — |
| Pickup verification rejects already-picked-up fulfillment | unit | mock DB | — |

### Wave 0 Gaps
- [ ] `lib/fulfillment/pickup-code.test.ts` — covers code generation + formatting + uniqueness retry
- [ ] `lib/fulfillment/uber-direct.test.ts` — covers stub path + address formatting + status map
- [ ] Schema migration file for `tracking_url` column

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No (session already managed by Auth.js) | Auth.js (existing) |
| V4 Access Control | Yes | Server components/route handlers verify `session.user.id === settlement.buyerUserId` or `session.user.businessId === settlement.businessId` |
| V5 Input Validation | Yes | Validate pickup code is exactly 6 digits before DB query; validate fulfillmentId is a UUID |
| V6 Cryptography | Yes — pickup code + HMAC | Node `crypto.randomInt` (not Math.random); HMAC-SHA256 for webhook |

### Known Threat Patterns

| Pattern | STRIDE | Mitigation |
|---------|--------|-----------|
| Pickup code brute-force (business endpoint) | Elevation of Privilege | Rate-limit verify-pickup to 5 attempts per fulfillmentId per minute (simple in-memory counter sufficient for demo) |
| Replayed Uber webhook | Spoofing | HMAC verification; idempotent status updates |
| Consumer accessing another user's fulfillment | Elevation of Privilege | Always verify `settlement.buyerUserId === session.user.id` in route handler |
| Business accessing another business's fulfillments | Elevation of Privilege | Filter dashboard query by `settlement.businessId === session.user.businessId` |
| Uber API credentials in client bundle | Information Disclosure | All Uber calls are in `lib/fulfillment/uber-direct.ts` with `"server-only"` guard |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Settlement UUID is safe to expose in `/consumer/order/[settlementId]` URL | Post-Payment Redirect | Low risk — UUID is opaque; verify route enforces ownership |
| A2 | Uber Direct sandbox credentials available via self-serve for US region | Timeline Risk | High — demo depends on D-02 stub as fallback; mitigated |
| A3 | `testSpecifications.roboCourierSpecification.mode: 'auto'` advances delivery through all sandbox statuses automatically | Uber Direct API | Low — documented in SDK samples; would mean manual webhook testing needed if wrong |
| A4 | Vitest is the test framework (inferred from prior phase plan patterns) | Validation | Low — check vitest.config.ts exists |
| A5 | Phase 6 `StripeCardSetup` component can be updated to redirect to `/consumer/order/{settlementId}` after payment | Post-payment flow | Low — this is the natural Stripe return_url |

---

## Open Questions

1. **Does the Phase 6 `StripeCardSetup` component's `return_url` / `confirmPayment` redirect include the settlementId?**
   - What we know: Phase 6 is code-complete; the settlement exists at time of Stripe confirmation.
   - What's unclear: Whether settlementId is passed to the client component and can be included in the redirect URL.
   - Recommendation: Planner reads Phase 6 client component; add settlementId prop if not present.

2. **Is `consumer_profiles.deliveryAddress` a structured field (lat/lng, city, zip) or a freeform string?**
   - What we know: Phase 2 captured delivery address at onboarding.
   - What's unclear: Exact column type — if it's freeform, the `formatUberAddress()` helper needs a parser.
   - Recommendation: Planner reads `db/schema/identity.ts` consumer_profiles; if freeform, add structured address fields in migration.

3. **Should fulfillment webhook events use the existing `stripe_webhook_events` idempotency table or a separate `uber_webhook_events` table?**
   - What we know: The idempotency table in Phase 6 stores Stripe event IDs.
   - Recommendation: Create `uber_direct_webhook_events` table (separate concern, separate provider). Schema mirrors `stripeWebhookEvents`.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Uber Rush (deprecated 2018) | Uber Direct (DaaS) | Uber Direct is the correct product; Rush is dead |
| Postmates Platform API | Uber Direct (Postmates acquired 2020) | `x-postmates-signature` header still supported for backward compat |
| Custom delivery tracking iframe | `tracking_url` link button | D-03 decision; avoids iframe CSP issues |

---

## Sources

### Primary (HIGH confidence)
- `github.com/uber/uber-direct-sdk` — SDK source for auth endpoint URL, deliveries API base URL, all methods
- `developer.uber.com/docs/deliveries/guides/authentication` — OAuth 2.0 client_credentials flow, token lifetime
- `developer.uber.com/docs/deliveries/guides/webhooks` — event types, HMAC-SHA256 signature verification, `x-uber-signature` header
- `developer.uber.com/docs/deliveries/daas/api/webhook-event-deliverystatus` — delivery status payload + all status values
- `developer.uber.com/docs/deliveries/direct/api/v1/get-eats-deliveries-orders-orderid` — GET delivery response fields
- npm registry — `uber-direct@0.1.8`, published 2024-10-24 [VERIFIED]

### Secondary (MEDIUM confidence)
- `developer.uber.com/docs/deliveries/get-started` — sandbox onboarding process, "select regions" restriction, customer ID
- `developer.uber.com/docs/deliveries/direct/api/v1/post-eats-deliveries-orders` — create delivery request/response field names

### Tertiary (LOW confidence)
- Developer experience for Uber Direct signup timeline — no reliable third-party data found; assessed from docs + regional restriction note
- `testSpecifications.roboCourierSpecification.mode: 'auto'` behavior in sandbox — documented in SDK README/samples but not in official API docs

---

## Metadata

**Confidence breakdown:**
- Uber Direct API endpoints + auth: HIGH — SDK source code verified
- Webhook signature mechanism: HIGH — official docs
- Uber Direct sandbox onboarding timeline: LOW — no developer experience data; "select regions" caveat is documented
- Pickup code collision strategy: HIGH — standard Postgres pattern
- Next.js post-payment redirect: MEDIUM — pattern inferred from Auth.js + Next.js redirect docs; Phase 6 code not fully audited

**Research date:** 2026-04-18
**Valid until:** 2026-05-18 (Uber Direct API is stable; sandbox onboarding policy could change)
