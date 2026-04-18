# Phase 4: Auction Engine - Research

**Researched:** 2026-04-18  
**Domain:** Real-time auction execution on Next.js + Neon/Postgres with durable close scheduling, race-safe bidding, managed realtime fan-out, and Web Push notifications  
**Confidence:** MEDIUM

## Summary

Phase 4 is not one problem. It is four separate systems that must agree on truth: a race-safe bid write path, a durable way to close auctions at exact deadlines, a live-update channel for open auctions, and a push channel for outbid notifications when the app is not open. The expert pattern is not to solve all of that inside Next.js request handlers alone. The standard stack is: **Postgres as the source of truth, a durable workflow/scheduler for auction close events, a managed realtime provider for live fan-out, and native Web Push for background notifications**.

The biggest repo-specific finding is that the current database client path is optimized for simple queries, not for the interactive locked transactions that a bid engine needs. The app currently uses Drizzle's Neon HTTP driver, while Drizzle's current Neon guidance says HTTP is best for single non-interactive transactions and recommends the WebSocket-based driver when session or interactive transaction support is needed. For this phase, that is not an implementation detail, it is architecture. If the bid path keeps the current driver shape unchanged, the plan will be fighting the stack.

The second major finding is that **Vercel Cron is the wrong default for this project on a free-tier deployment**. Current Vercel docs say Hobby cron jobs can only run once per day and only with hourly precision, which makes them unusable for minute-sensitive auction settlement. The strongest default for this repo is therefore still: **interactive Postgres writes via Neon WebSockets, Inngest for per-auction delayed close execution, Ably for live auction updates, and `web-push` + the existing service worker for outbid notifications**. The first-party Vercel options are materially more viable than they were a few months ago because Workflow is available on all plans and includes a real Hobby allotment, and Queues recently added longer delays in a changelog update, but both still require explicit tradeoff decisions rather than being assumed defaults.

**Primary recommendation:** Use **interactive Postgres transactions + Inngest delayed close jobs + Ably channels + native Web Push**, with a small safety sweep for overdue auctions and all close paths funneled through one idempotent settlement function.

## Standard Stack

The established stack for this phase:

### Core

| Library / Platform | Version | Purpose | Why Standard |
| --- | --- | --- | --- |
| PostgreSQL row locks + transactions | Current docs | Canonical bid and settlement consistency | `FOR UPDATE` remains the standard primitive for single-record write coordination under contention. |
| `@neondatabase/serverless` via `drizzle-orm/neon-serverless` | 1.1.0 | Interactive Neon write path for bids/buyouts/closes | Drizzle's Neon docs explicitly separate fast HTTP querying from session/interactive transaction support. |
| `inngest` | 4.2.4 | Durable per-auction close execution | Official docs support delayed execution, retries, and idempotent event handling across redeploys and serverless restarts. |
| `ably` | 2.21.0 | Managed realtime fan-out for live bidding state | Official docs cover pub/sub, message history, token auth, channel security boundaries, and React hooks in the JS SDK. |
| `web-push` | 3.6.7 | Server-side Web Push delivery with VAPID | Implements protocol details and payload encryption that should not be hand-rolled. |
| Push API + Service Worker Notification APIs | Web platform | Browser push subscription and background notification display | MDN marks both as broadly available and tied to secure-context/service-worker execution. |

### Supporting

| Library / Platform | Version | Purpose | When to Use |
| --- | --- | --- | --- |
| `workflow` | 4.2.4 | First-party Vercel durable workflow alternative | Use if you want to stay inside Vercel primitives and accept Beta risk. |
| `@vercel/queue` | 0.1.6 | Lower-level durable queueing on Vercel | Use only if you need queue control directly; Vercel recommends Workflow for multi-step stateful flows. |
| `@trigger.dev/sdk` | 4.4.4 | Durable task/workflow alternative | Strong option if you prefer hosted long-running tasks and can live with schedule-count limits on free tier. |
| `@trigger.dev/react-hooks` | 4.4.4 | Trigger.dev run subscriptions in React | Useful if Trigger.dev becomes the scheduler and you want task-status subscriptions in the UI. |
| `@upstash/qstash` | 2.10.1 | Lightweight delayed callbacks / queues | Good for simple retries or callbacks, but less ergonomic than workflow engines for auction lifecycle state. |
| `ws` | 8.20.0 | Node WebSocket constructor for Neon serverless driver | Required by Drizzle's current Neon guidance when using the WebSocket driver in Node.js. |
| `bufferutil` | 4.1.0 | Optional WebSocket performance helper for Node.js | Installed alongside `ws` in Drizzle's Neon Node guidance. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
| --- | --- | --- |
| Inngest delayed jobs | Vercel Workflow | Fewer vendors, native Vercel observability, and current docs show included Hobby usage, but Workflow is still Beta. |
| Inngest delayed jobs | Vercel Queues | Now more plausible for short auction windows, but it is lower-level than Workflow and current official sources conflict on max delay/TTL (`24h` in docs/API references vs `7 days` in the Apr 1, 2026 changelog). |
| Inngest delayed jobs | Trigger.dev scheduled tasks | Viable on current limits (`10` schedules free, `100` on Hobby, `14` day run TTL), but it adds another workflow vendor without a clear advantage over Inngest for this demo. |
| Inngest delayed jobs | Upstash QStash schedules | Lighter-weight and simple, but the free plan also caps active schedules at 10 and messages at 1,000/day. |
| Any durable scheduler | Vercel Cron | Not viable here on Hobby because current Vercel docs cap it at once per day with hourly precision. |
| Ably | Another Vercel-recommended provider such as Pusher or Supabase Realtime | Viable, but Ably's official docs surface the clearest combination of channels, history, token auth, push support, and React hooks for this use case. |

### Installation

Recommended additions for the primary stack:

```bash
npm install inngest ably web-push ws bufferutil
```

Optional alternatives:

```bash
npm install workflow @vercel/queue
npm install @trigger.dev/sdk @trigger.dev/react-hooks
npm install @upstash/qstash
npm install pg
```

## Architecture Patterns

### Recommended Project Structure

```text
app/
  api/
    auctions/
      [auctionId]/
        bid/                 # authenticated bid mutation
        buyout/              # buyout terminal mutation
        cancel/              # seller cancellation mutation
    push/
      subscribe/             # PushSubscription registration/update
    inngest/                 # durable workflow endpoint if Inngest is chosen
components/
  auction/
    countdown/               # server-authoritative end-time UX
    bid-panel/               # bid increment / buyout controls
    live-state/              # realtime status adapters
lib/
  auctions/
    bidding.ts               # locked write path
    settlement.ts            # idempotent close/cancel/buyout finalizer
    pricing.ts               # increment + fee helpers
    scheduler.ts             # close scheduling / unscheduling
    realtime.ts              # channel names + token auth helpers
    queries.ts               # detail/feed/my-bids read models
  push/
    vapid.ts                 # VAPID config
    subscriptions.ts         # persistence and dedupe
    notify.ts                # outbid send helpers
  db/
    client.ts                # existing general-purpose DB client
    interactive.ts           # websocket/pg client for locked writes
```

### Pattern 1: One Canonical Auction Row, One Short Interactive Transaction

**What:** Treat the auction row as the coordination point for every state-changing operation: bid, buyout, seller cancel, settlement close, and expiry cancel. Lock it, validate it, write the bid/outcome, and commit. The database is the only source of truth; realtime events are post-commit side effects.

**When to use:** Always for writes that can change the leading bid, winner, close state, or payout snapshot.

**Why this is the recommended pattern here:**
- PostgreSQL row-level locks are built for exactly this type of contention and only block writers/lockers on the same row.
- The current schema already has auction, bid, and settlement tables plus uniqueness constraints that support idempotent closes.
- Drizzle's current Neon guidance says the HTTP driver is optimized for non-interactive work; this phase needs an interactive path.

**Recommended flow:**
1. Start an interactive transaction.
2. `SELECT ... FOR UPDATE` the target auction row.
3. Validate actor, auction status, end time, amount, reserve/increment, and mock card-on-file gate.
4. Insert the bid or terminal outcome.
5. Update any denormalized auction winner snapshot if you add one.
6. If terminal, create or confirm the settlement snapshot inside the same transaction.
7. Commit.
8. Publish realtime events and push notifications after commit.

**Example:**

```ts
// Pattern synthesized from PostgreSQL locking docs + Drizzle Neon guidance.
await db.transaction(async (tx) => {
  const auction = await tx.execute(sql`
    select *
    from auctions
    where id = ${auctionId}
    for update
  `);

  // validate status, end time, actor, increments, buyout rules
  // insert bid or write terminal outcome
  // create settlement snapshot if the auction is closing
});
```

### Pattern 2: Schedule Once, Sweep Rarely, Finalize Idempotently

**What:** When an auction becomes active, schedule exactly one close event for its end timestamp. Separately, run a coarse safety sweep that claims any overdue active auctions and closes them through the same finalizer. Both paths must call the same idempotent close function.

**When to use:** Always. Durable delayed execution should be the main path; sweep should be the backstop.

**Why this is the expert pattern:**
- Durable workflow engines already solve delayed execution, retries, and redeploy survival.
- A sweep protects you from missed scheduled events, deploy mistakes, or operational drift.
- PostgreSQL explicitly documents `SKIP LOCKED` as appropriate for queue-like consumers, which is what the sweep is.

**Recommended behavior:**
- Primary path: enqueue per-auction close at `scheduledEndAt`.
- Safety path: every minute or few minutes, scan overdue active auctions with a worker.
- Finalizer path: if the auction is already closed or a settlement already exists, exit cleanly.

**Example:**

```ts
// Source pattern: Inngest delayed functions + PostgreSQL queue-style locking.
await inngest.send({
  name: "auction/close.requested",
  data: { auctionId },
  ts: scheduledEndAt.getTime(),
});
```

```sql
select id
from auctions
where status = 'active'
  and scheduled_end_at <= now()
for update skip locked
limit 50;
```

### Pattern 3: Realtime Channels After Commit, Scoped by Audience

**What:** Publish committed auction state to a public auction channel and private user channels after the database transaction succeeds. Use the public channel for anonymous bid/price/timer state and private channels for outbid/win events.

**When to use:** For live detail pages, My Bids, and seller-side auction monitoring.

**Why it fits this product:**
- Vercel's current WebSocket guidance points users to managed realtime providers rather than native Vercel sockets.
- Ably channels are explicitly both the security and scalability boundary.
- Ably recommends using message names for event types rather than multiplying channels unnecessarily.

**Recommended channel model:**
- `auction:{auctionId}` for public state events such as `bid.accepted`, `auction.closed`, `auction.cancelled`.
- `user:{userId}` for private events such as `auction.outbid`, `auction.won`.
- Use token auth only; Ably's docs explicitly say not to expose basic auth keys in the client.

**Example:**

```ts
// Source pattern: Ably channel model + token-auth guidance.
await ably.channels.get(`auction:${auctionId}`).publish("bid.accepted", {
  amountCents,
  endsAt: scheduledEndAt.toISOString(),
});

await ably.channels.get(`user:${previousLeaderId}`).publish("auction.outbid", {
  auctionId,
  amountCents,
});
```

### Pattern 4: Write Settlement as an Immutable Close Snapshot

**What:** At the moment an auction closes or buyout wins, write the settlement row with gross amount, platform fee, seller net, buyer, winning bid, and payment/settlement status snapshot for later phases.

**When to use:** On every terminal sale outcome.

**Why this is the recommended pattern here:**
- Settlement data should not depend on recomputing historical state later.
- The current schema already includes one settlement per auction/listing plus fee/net columns.
- Phase 6 payments and Phase 7 fulfillment will be easier if close-time economics are already frozen.

**Recommended behavior:**
- Compute fee and seller net inside the close transaction.
- Record terminal auction outcome on the auction row.
- Record payment/settlement status on the settlement row.
- Keep sale math in integer cents only.

**Example:**

```ts
const grossAmountCents = winningBid.amountCents;
const platformFeeCents = Math.round(grossAmountCents * 0.15);
const sellerNetAmountCents = grossAmountCents - platformFeeCents;
```

### Pattern 5: Server Time Decides; Client Time Animates

**What:** The UI may animate countdowns locally, but bid acceptance and close state must be validated against server/database time, not the browser clock.

**When to use:** Always for countdown, buyout, and "bid still allowed?" checks.

**Why this matters here:**
- The product wants a dramatic last 10 seconds, but a visually compelling countdown does not remove the need for a server-authoritative close boundary.
- Client clocks drift, tabs suspend, and mobile PWAs resume unpredictably.

**Recommended behavior:**
- Send authoritative `scheduledEndAt` from the server.
- Reconcile on every mutation response.
- Let the client show `00:00` only as UX; the server still decides whether the bid wins or is rejected.

### Anti-Patterns to Avoid

- **Using Vercel Cron Hobby for settlement:** current limits make it fundamentally wrong for this use case.
- **Keeping the current Neon HTTP write path for locked multi-step bidding logic:** wrong transaction model for the hot path.
- **Calling Ably or push providers inside the DB transaction:** increases lock time and deadlock risk.
- **Treating realtime provider state as canonical:** the database, not channel history, decides winners.
- **Using `SKIP LOCKED` for normal bid reads:** PostgreSQL documents it as a queue-consumer tool, not a general read pattern.
- **Trusting the client countdown to determine close acceptance:** leads to edge-case inconsistencies at the most visible moment.
- **Computing commission only in UI or reports:** creates future drift and makes Phase 6/7 harder.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
| --- | --- | --- | --- |
| Auction-close scheduling | Custom cron polling or timer state in app memory | Inngest, Vercel Workflow, Trigger.dev, or QStash | Delays, retries, redeploy survival, and observability are already solved. |
| Realtime transport on Vercel | A bespoke WebSocket server inside Vercel Functions | Ably or another Vercel-recommended realtime provider | Vercel's own guidance points to external providers for realtime communication. |
| Push protocol + payload encryption | Manual VAPID/header/encryption implementation | `web-push` + browser Push API | Web Push protocol details and encryption are easy to get wrong and already packaged. |
| Cross-request locking with status flags | App-level "isProcessing" booleans in tables or memory | PostgreSQL row locks, and advisory locks only when truly needed | Built-in database primitives are safer and clean up correctly when used transactionally. |
| Auction math with JS floats | Decimal math in the UI | Integer cents persisted in the database | Prevents rounding drift and fee mismatches. |
| Notification fan-out inside the hot transaction | Synchronous provider calls while holding locks | Post-commit publish/send helpers | External I/O should not extend DB lock duration. |

**Key insight:** The dangerous hand-rolled parts in this phase are not the UI widgets. They are scheduling, locking, realtime transport, push delivery, and fee accounting.

## Common Pitfalls

### Pitfall 1: Choosing Periodic Cron for Per-Auction Deadlines

**What goes wrong:** Auctions do not close on time, or they close in lumpy batches.

**Why it happens:** Cron feels like "scheduled work," but auction deadlines are record-level deadlines, not a once-per-hour maintenance task. On Hobby, current Vercel cron limits are especially incompatible.

**How to avoid:** Schedule one close event per auction and keep a separate sweep as a backstop only.

**Warning signs:** Auctions remain active past zero, or settlement only happens when a sweep or request happens.

### Pitfall 2: Discovering Too Late That the Write Path Needs Interactive Transactions

**What goes wrong:** The bid engine becomes awkward or unsafe because the chosen DB client path is optimized for fast HTTP queries rather than locked multi-step writes.

**Why it happens:** The current repo already works with `neon-http`, so it is easy to assume it is good enough for everything.

**How to avoid:** Create an explicit interactive write-path client before planning the bid mutation details.

**Warning signs:** You cannot express the lock/validate/write sequence cleanly, or concurrent test bids produce inconsistent winners.

### Pitfall 3: Holding Auction Locks While Doing Network Work

**What goes wrong:** Under contention, bidding requests block each other, deadlocks appear, or the last-second UX feels laggy.

**Why it happens:** PostgreSQL waits on conflicting row locks until release, and deadlocks are possible if lock order is inconsistent or transactions stay open too long.

**How to avoid:** Keep transactions short and pure-DB. Publish realtime events, push notifications, and analytics only after commit.

**Warning signs:** Slow bid responses under load, deadlock retries, or blocked requests in logs.

### Pitfall 4: Non-Idempotent Settlement

**What goes wrong:** A retried close job creates duplicate state changes, duplicate seller notifications, or multiple "you won" experiences.

**Why it happens:** Durable schedulers retry on failure by design. If close logic is not idempotent, reliability features become duplication bugs.

**How to avoid:** Use unique DB constraints, workflow/task idempotency, and an early return when the auction is already terminal or a settlement already exists.

**Warning signs:** Duplicate terminal events, repeated notifications, or settlement rows that should have been impossible.

### Pitfall 5: Realtime Channels Become Either Leaky or Expensive

**What goes wrong:** Private bidder state leaks onto public channels, or channel count explodes because every event type gets its own channel.

**Why it happens:** Teams often treat channels as event types instead of audience boundaries.

**How to avoid:** Scope channels by audience (`auction:*`, `user:*`) and use message names for event types.

**Warning signs:** Channel ACLs are hard to reason about, or every UI widget wants a new channel.

### Pitfall 6: Outbid Push Exists on Paper but Not in the Background

**What goes wrong:** Notifications appear only while the tab is open, or subscriptions get recorded under the wrong user/session.

**Why it happens:** Push requires authenticated subscription registration, service-worker support, secure context, and `showNotification()` wiring. MDN also explicitly warns about CSRF/XSRF for PushManager subscriptions.

**How to avoid:** Treat push subscription as an authenticated mutation with CSRF protection, then add `push` and `notificationclick` handlers to the service worker.

**Warning signs:** Background notifications never appear, or devices get notifications for the wrong account.

## Code Examples

Verified patterns from official sources and adapted to this phase:

### Schedule an Auction Close for the Exact End Timestamp

```ts
// Source: https://www.inngest.com/docs/guides/delayed-functions
await inngest.send({
  name: "auction/close.requested",
  data: { auctionId },
  ts: scheduledEndAt.getTime(),
});
```

### Claim Overdue Auctions Safely in a Sweep Worker

```sql
-- Source rationale:
-- https://www.postgresql.org/docs/current/sql-select.html
select id
from auctions
where status = 'active'
  and scheduled_end_at <= now()
for update skip locked
limit 50;
```

### Subscribe the Browser for Outbid Push Notifications

```ts
// Sources:
// https://github.com/web-push-libs/web-push
// https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification
const registration = await navigator.serviceWorker.ready;

const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: vapidPublicKey,
});

await fetch("/api/push/subscribe", {
  method: "POST",
  body: JSON.stringify(subscription),
  headers: { "content-type": "application/json" },
});
```

### Publish Live State to a Single Auction Channel

```ts
// Sources:
// https://ably.com/docs/channels
// https://ably.com/docs/getting-started/react-hooks
await ably.channels.get(`auction:${auctionId}`).publish("bid.accepted", {
  amountCents,
  endsAt: scheduledEndAt.toISOString(),
});
```

## State of the Art (2025-2026)

What's changed recently:

| Old Assumption | Current Reality | When Changed / Verified | Impact |
| --- | --- | --- | --- |
| "Vercel Cron is the obvious way to close auctions on Vercel" | Current Vercel docs say Hobby cron is once per day with hourly precision | Verified March 4, 2026 docs | Free-tier Vercel cron is not acceptable for this phase. |
| "Third-party schedulers are the only durable option on Vercel" | Vercel now has Workflow and Queues as first-party durable primitives | Verified February 27, 2026 docs | There is now a native option, but it is still Beta and should be evaluated explicitly. |
| "Vercel Workflow is probably too immature or too constrained for Hobby" | Current Workflow docs show Beta on all plans with included Hobby usage (`50,000` steps and `720` GB-hours storage) | Verified February 27, 2026 docs | Workflow is a real contender now if reducing vendors matters more than Beta risk. |
| "Vercel Queues can only cover sub-day delays" | Official sources now conflict: main docs/API refs still describe `24h` max retention by default, while the Apr 1, 2026 Vercel changelog announces `7`-day max TTL and delivery delay | Verified February-April 2026 official sources | Direct Queues are more viable for grocery-style auction durations, but the feature needs implementation-time verification because Vercel's docs are currently lagging each other. |
| "Neon HTTP is the universal default for a serverless Postgres app" | Drizzle currently recommends WebSocket-based Neon when session/interactive transactions are needed | Verified current Drizzle Neon docs | The auction write path should probably not use the current client unchanged. |
| "Web Push for PWAs is still too niche to pull forward" | MDN marks Push API and service-worker notifications as broadly available since March 2023 | Verified MDN pages updated in 2025 | Pulling outbid push into Phase 4 is feasible, though still worth manual device testing. |

**New tools/patterns to consider:**
- **Vercel Workflow:** new first-party durable workflow option on all Vercel plans, with resumable steps, sleeps, hooks, and queue-backed execution.
- **Vercel Queues:** lower-level durable queueing primitive now available if you want direct control rather than workflow orchestration, with recently expanded delay/TTL support called out in the Vercel changelog.
- **Trigger.dev Realtime:** if Trigger.dev is chosen for task orchestration, its current platform also exposes React hooks for subscribed run updates.

**Deprecated/outdated for this phase:**
- **Vercel Hobby cron as an auction closer:** the documented precision/interval limits make it effectively the wrong tool.
- **"Just use the current DB client for everything":** current Drizzle/Neon guidance makes that assumption outdated for lock-heavy write paths.

## Open Questions

1. **Should the scheduler default be Inngest or Vercel Workflow?**
   - What we know: Both are viable on Hobby from current official docs. Inngest gives durable delays up to seven days on free and avoids betting on Vercel Beta primitives; Workflow gives fewer vendors plus included Hobby usage and native Vercel observability.
   - What's unclear: Whether this project values vendor minimization more than avoiding Beta risk.
   - Recommendation: Decide this explicitly during planning. Default to Inngest for lower platform-risk; choose Workflow only if the same-vendor ergonomics are worth the Beta tradeoff.

2. **What is the maximum auction duration in v1?**
   - What we know: Inngest free delays are limited to seven days. Vercel Workflow does not present the same duration constraint in the reviewed docs. Vercel Queues may now cover up to seven days according to the Apr 1, 2026 changelog, but the main docs/API references still need to catch up.
   - What's unclear: The roadmap and phase context do not set an auction-duration cap.
   - Recommendation: Cap v1 auctions at `<= 7 days` unless product requirements force something longer. That matches the soon-to-expire grocery use case and keeps all scheduler options on the table.

3. **What is the fee-rounding policy for 15% commission on odd-cent totals?**
   - What we know: Money is modeled in integer cents, and some sale prices will create half-cent fees.
   - What's unclear: Whether the product wants `round`, `floor`, or another deterministic rule.
   - Recommendation: Lock the rule during planning and persist both fee and seller net at close so later phases never recompute it.

4. **Should cancelled/no-sale outcomes create settlement rows or live only on the auction row?**
   - What we know: The current schema already has unique settlement constraints, and the phase context wants a settlement lifecycle.
   - What's unclear: Whether "settlement" should mean only successful sales or all terminal auction outcomes.
   - Recommendation: Decide before implementation. Default lean: settlement rows for successful sales only, unless reporting requirements argue for a unified ledger of all terminal outcomes.

5. **Where do mock card-on-file state and push subscriptions live?**
   - What we know: The current consumer profile schema does not include either.
   - What's unclear: Whether they should be booleans on the user/profile row or separate tables.
   - Recommendation: Model them explicitly during planning rather than slipping them into unrelated tables ad hoc.

6. **Does the app want denormalized current-bid snapshots on the auction row?**
   - What we know: The current schema stores bids and winning bid linkage, but not an explicit current-bid amount or leader snapshot.
   - What's unclear: Whether feed/detail performance in later phases should come from joins/subqueries or snapshot columns.
   - Recommendation: Decide in planning based on expected demo volume; for a pitch demo, a small amount of denormalization may be worth the simpler reads.

## Sources

### Primary (HIGH confidence)

- PostgreSQL explicit locking docs: https://www.postgresql.org/docs/current/explicit-locking.html
- PostgreSQL `SELECT` locking-clause docs: https://www.postgresql.org/docs/current/sql-select.html
- Drizzle Neon connection guide: https://orm.drizzle.team/docs/connect-neon
- Vercel Cron docs: https://vercel.com/docs/cron-jobs
- Vercel Cron usage/pricing docs: https://vercel.com/docs/cron-jobs/usage-and-pricing
- Vercel WebSocket guidance: https://vercel.com/kb/guide/do-vercel-serverless-functions-support-websocket-connections
- Vercel Workflow docs: https://vercel.com/docs/workflow
- Vercel Queues docs: https://vercel.com/docs/queues
- Vercel Queues 7-day TTL changelog: https://vercel.com/changelog/queues-now-supports-7-day-ttl
- Inngest functions overview: https://www.inngest.com/docs/learn/inngest-functions
- Inngest delayed functions: https://www.inngest.com/docs/guides/delayed-functions
- Inngest errors/retries: https://www.inngest.com/docs/guides/error-handling
- Inngest idempotency: https://www.inngest.com/docs/guides/handling-idempotency
- Inngest pricing: https://www.inngest.com/pricing
- Ably Pub/Sub basics: https://ably.com/docs/basics
- Ably channel concepts: https://ably.com/docs/channels
- Ably React hooks: https://ably.com/docs/getting-started/react-hooks
- Trigger.dev tasks overview: https://trigger.dev/docs/tasks/overview
- Trigger.dev scheduled tasks: https://trigger.dev/docs/tasks/scheduled
- Trigger.dev concurrency/queues: https://trigger.dev/docs/queue-concurrency
- Trigger.dev idempotency: https://trigger.dev/docs/idempotency
- Trigger.dev limits: https://trigger.dev/docs/limits
- Trigger.dev pricing: https://trigger.dev/pricing
- Trigger.dev realtime overview: https://trigger.dev/docs/realtime/overview
- Upstash QStash schedules: https://upstash.com/docs/qstash/features/schedules
- Upstash QStash Next.js quickstart: https://upstash.com/docs/qstash/quickstarts/vercel-nextjs
- Upstash QStash pricing: https://upstash.com/pricing/qstash
- MDN Push API: https://developer.mozilla.org/en-US/docs/Web/API/Push_API
- MDN `showNotification()` docs: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification
- `web-push` official repository: https://github.com/web-push-libs/web-push

### Secondary (MEDIUM confidence)

- None. Search-discovered findings used in this document were all cross-verified against official documentation before inclusion.

### Tertiary (LOW confidence - needs validation)

- None.

## Metadata

**Research scope:**
- Core technology: Postgres locking/transactions, durable scheduling, managed realtime, Web Push
- Ecosystem: Inngest, Vercel Workflow/Queues, Trigger.dev, Upstash QStash, Ably, `web-push`
- Patterns: interactive transaction design, delayed close scheduling, safety sweeps, post-commit side effects, channel scoping
- Pitfalls: cron fit, driver fit, deadlocks, non-idempotent settlement, channel design, push registration security

**Confidence breakdown:**
- Standard stack: HIGH - driven mostly by current official docs and pricing/limits pages
- Architecture: MEDIUM - synthesis from official primitives plus local schema/service-worker context
- Pitfalls: HIGH - directly supported by lock semantics, scheduler limits, and official push/auth guidance
- Code examples: HIGH - adapted from official docs and verified against current platform guidance

**Current repo implications identified during research:**
- The existing DB client uses `drizzle-orm/neon-http`, which is not the recommended default for the interactive bid path.
- Listing publish already creates auction rows as `active` with `scheduledStartAt = now`, so Phase 4 does not need a separate "activate auction later" pipeline unless product scope changes.
- The existing service worker is navigation-only and currently lacks push event handling.
- The current consumer-side schema still lacks both a mock card-on-file flag and push-subscription persistence.
- The current schema already provides a useful base with `auctions`, `bids`, and unique `settlements`.

**Research gap note:**
- Context7 was requested by the workflow but is not available in this environment. Official docs plus cross-verified web discovery were used instead.

**Research date:** 2026-04-18  
**Valid until:** 2026-05-02 (fast-moving vendor/pricing/beta landscape, aligned with the demo deadline)

---

*Phase: 04-auction-engine*  
*Research completed: 2026-04-18*  
*Ready for planning: yes*
