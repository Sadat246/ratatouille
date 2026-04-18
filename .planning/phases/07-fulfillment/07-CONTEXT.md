# Phase 7: Fulfillment - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 7 delivers the post-payment fulfillment loop: buyer chooses pickup or Uber Direct delivery on the payment confirmation screen, business sees and manages pending fulfillments from their dashboard, and each path reaches a terminal state (picked_up or delivered). Both paths must be demo-ready. Refunds for failed deliveries are out of scope (Phase 6 deferred refunds to v1.1).

</domain>

<decisions>
## Implementation Decisions

### Uber Direct Integration
- **D-01:** Use the **real Uber Direct sandbox API** — actual quote requests, delivery creation, webhook status updates. Schema fields `deliveryQuoteId` and `deliveryReferenceId` are for this purpose.
- **D-02:** **Fallback if sandbox credentials aren't available in time:** stub the Uber Direct calls silently — UI shows the full delivery UX (quote, confirm, tracking link, status badges) using hardcoded sandbox-like responses. Indistinguishable in a pitch demo. Researcher should document the sandbox onboarding path and flag timeline risk.
- **D-03:** Uber Direct tracking URL surfaced as a prominent "Track your delivery" button/link on the consumer's order page. No custom tracking UI or iframe.

### Fulfillment Choice UX
- **D-04:** Fulfillment choice happens on the **post-payment confirmation screen** — immediately after payment succeeds, the consumer is presented with two cards: "Pickup in store" and "Get it delivered." They pick right away while still engaged.
- **D-05:** **Delivery address:** consumer's onboarding address (Phase 2) is pre-filled and editable on the confirmation screen. Consumer can update before confirming delivery.

### Pickup Code Mechanics
- **D-06:** Pickup code format: **6-digit numeric** (e.g. "482 619"). Easy to read aloud, fast for business staff to type.
- **D-07:** Business verification: staff **types the 6 digits** into a code-entry field in their dashboard. On match → `fulfillment.status = 'picked_up'`. No QR scanner required.
- **D-08:** Pickup code expiry: **48 hours from payment capture**. Code becomes invalid after 48h regardless of item expiry date. Simple, predictable.
- **D-09:** Pickup code generated server-side at fulfillment creation (crypto-random 6-digit integer), stored in `fulfillments.pickupCode`, expiry stored in `fulfillments.pickupCodeExpiresAt`.

### Business Fulfillment Dashboard
- **D-10:** Business dashboard shows a **simple list** of pending and recent fulfillments: item name, buyer display name, mode (Pickup / Delivery), status badge.
  - Pickup rows: inline code-entry field + "Verify" button.
  - Delivery rows: Uber Direct status badge (Pending / Out for delivery / Delivered / Failed).
- **D-11:** Business sees **four status labels**: "Pending pickup", "Pending delivery", "Picked up", "Delivered". Not the full 9-state schema enum — business UI maps multiple schema statuses to these four readable labels.

### Consumer Delivery Tracking
- **D-12:** Consumer order page shows a prominent **"Track your delivery"** button linking to the Uber Direct tracking URL (returned when delivery is created and stored in `fulfillments.deliveryReferenceId` or a separate tracking URL field — planner to confirm schema).
- **D-13:** Consumer also sees a status badge synced from Uber webhooks: Pending → Out for delivery → Delivered / Failed.

### Failed / Cancelled Delivery
- **D-14:** If Uber Direct fails or cancels the delivery: `fulfillment.status = 'failed'`.
  - Consumer notified: "Delivery couldn't be completed — contact the store to arrange pickup."
  - Business notified: fulfillment appears in their dashboard as failed with store contact info.
  - **No automatic refund in Phase 7** — refund handling deferred to v1.1 per Phase 6 decisions.
  - Consumer retains the option to arrange pickup manually (no system enforcement).

### Claude's Discretion
- Uber Direct sandbox API endpoint structure and auth (API key vs OAuth) — researcher to document, planner to decide implementation.
- Webhook endpoint for Uber Direct delivery events (`/api/webhooks/uber-direct`) — Claude designs the event handling and status mapping.
- Pickup code collision handling (two codes identical in the same window) — Claude handles with appropriate uniqueness check.
- Consumer "order history" page design (list of all their won auctions and fulfillment status) — Claude decides layout consistent with Phase 1 aesthetic.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Schema
- `db/schema/fulfillment.ts` — fulfillments table (mode enum, full fulfillmentStatus state machine, pickupCode, pickupCodeExpiresAt, recipientName, recipientPhone, deliveryQuoteId, deliveryReferenceId, deliveryProvider enum)
- `db/schema/payments.ts` — settlements table (settlement.status = 'ready_for_fulfillment' triggers fulfillment creation; links buyer, business, winning bid)
- `db/schema/identity.ts` — consumer user record (delivery address captured at onboarding in Phase 2)

### Phase Context
- `.planning/phases/02-auth-onboarding/02-CONTEXT.md` — consumer delivery address and business pickupInstructions captured at onboarding; both used directly in Phase 7
- `.planning/phases/06-payments/06-CONTEXT.md` — settlement triggers: payment_intent.succeeded → fulfillment created with status 'pending_choice'; no auto-refund in v1 applies to failed delivery too
- `.planning/ROADMAP.md` — Phase 7 goal and research topics (Uber Direct API onboarding, sandbox availability, delivery request lifecycle and webhooks, pickup code UX, fulfillment state machine)

### Project
- `.planning/PROJECT.md` — constraints: both pickup AND Uber Direct must work (non-negotiable for demo); 14-day timeline; free-tier infra

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `db/schema/fulfillment.ts` — fulfillments schema fully models both paths; state machine already thought through at schema level
- `db/schema/payments.ts` — `settlement.status` transitions drive fulfillment creation; `settlement.buyerUserId` and `settlement.businessId` identify the parties
- `db/client.ts` — Drizzle client for server-side fulfillment status updates from webhook handlers

### Established Patterns
- Next.js App Router route handlers — Uber Direct webhook endpoint follows same pattern as Stripe webhook handler from Phase 6
- Server-side webhook handling — raw body preservation pattern already established in Phase 6 for Stripe; same approach for Uber Direct
- Mobile-first UI (Phase 1) — post-payment confirmation screen and business dashboard are both phone-first surfaces

### Integration Points
- Phase 6 Stripe webhook `payment_intent.succeeded` → creates `fulfillments` record with `status = 'pending_choice'` → Phase 7 picks up from there
- Phase 8 Push Notifications — Phase 8 will hook into fulfillment status transitions (delivery picked_up, delivered) — Phase 7 should emit events or have a notification trigger point
- Business dashboard (stubs from Phase 1/2) — fulfillment list is the primary business-side feature surfaced in Phase 7; integrates into existing business shell

</code_context>

<specifics>
## Specific Ideas

- Post-payment screen should feel celebratory ("You got it!") then immediately useful ("How do you want to get it?"). Two clear cards: Pickup (with store name + pickup instructions preview) and Delivery (with address pre-fill).
- Business code-entry UX: large digit input, clear "Verify pickup" CTA, immediate visual confirmation when code matches. Counter staff shouldn't have to hunt for it.
- Uber Direct fallback stub: if credentials unavailable, the stub should return a realistic-looking tracking URL (e.g. a Uber-formatted but fake URL) so the "Track delivery" button appears functional in a demo.
- The `fulfillments.deliveryProvider` enum has `none` and `uber_direct` — pickup rows use `none`, delivery rows use `uber_direct`.

</specifics>

<deferred>
## Deferred Ideas

- Auto-refund on failed delivery — deferred to v1.1 (Phase 6 excluded refunds; same applies here)
- Alternative delivery providers (DoorDash, Instacart) — Uber Direct only in v1; multi-provider is v2
- Business ability to cancel a fulfillment — not discussed; terminal state handling deferred
- Consumer cancellation after fulfillment starts — out of scope for demo
- Delivery instructions / special notes field — consumer can't add notes to delivery address in v1
- QR code pickup verification — typed code only for v1; QR scanning is a UX improvement for v1.1

</deferred>

---

*Phase: 07-fulfillment*
*Context gathered: 2026-04-18*
