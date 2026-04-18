# Phase 7: Fulfillment - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-18
**Phase:** 7-fulfillment
**Areas discussed:** Uber Direct integration depth, Fulfillment choice UX, Pickup code mechanics, Business fulfillment dashboard, Consumer delivery tracking, Failed/cancelled delivery

---

## Uber Direct Integration Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Real sandbox API calls | Actual Uber Direct sandbox, deliveryQuoteId + deliveryReferenceId | ✓ |
| Simulated / stubbed flow | Fake API responses, hardcoded quotes | |

**Fallback if credentials unavailable:**

| Option | Selected |
|--------|----------|
| Stub silently — UI looks real, API calls skipped | ✓ |
| Block on real credentials | |
| Remove delivery option from demo | |

---

## Fulfillment Choice UX

**Choice location:**

| Option | Selected |
|--------|----------|
| Post-payment confirmation screen | ✓ |
| Separate fulfillment page, linked from order history | |
| Included in bid/buyout flow before payment | |

**Delivery address:**

| Option | Selected |
|--------|----------|
| Consumer's onboarding address, pre-filled and editable | ✓ |
| Consumer's onboarding address, not editable | |
| Fresh address entry every time | |

---

## Pickup Code Mechanics

**Format:**

| Option | Selected |
|--------|----------|
| 6-digit numeric | ✓ |
| 4-digit numeric | |
| 6-character alphanumeric | |

**Business verification:**

| Option | Selected |
|--------|----------|
| Type into dashboard | ✓ |
| QR code scan | |
| You decide | |

**Expiry:**

| Option | Selected |
|--------|----------|
| Expires when listing's item expiry passes | |
| Fixed 48-hour expiry from payment | ✓ |
| No expiry | |

---

## Business Fulfillment Dashboard

**Layout:**

| Option | Selected |
|--------|----------|
| Simple list with status + code-entry form | ✓ |
| Dedicated fulfillment page per order | |
| You decide | |

**Status labels shown:**

| Option | Selected |
|--------|----------|
| Pending pickup / Pending delivery / Picked up / Delivered | ✓ |
| Just 'Action needed' vs 'Done' | |
| Full 9-state schema enum | |

---

## Consumer Delivery Tracking

| Option | Description | Selected |
|--------|-------------|----------|
| Uber Direct tracking link | "Track your delivery" button with Uber's URL | ✓ |
| Status badge only | No live tracking link | |
| Embed Uber tracking iframe | Embedded page inside app | |

---

## Failed / Cancelled Delivery

| Option | Description | Selected |
|--------|-------------|----------|
| Notify both parties, offer pickup as fallback | No auto-refund, consumer contacts store | ✓ |
| Auto-refund the consumer | Triggers Stripe refund | |
| Mark as failed, no action | Silent failure | |

---

## Claude's Discretion

- Uber Direct sandbox API auth (API key vs OAuth)
- Webhook endpoint for Uber Direct events, status mapping
- Pickup code collision handling
- Consumer order history page design

## Deferred Ideas

- Auto-refund on failed delivery (v1.1)
- Alternative delivery providers
- Business cancellation of fulfillment
- Consumer cancellation post-fulfillment
- Delivery instructions / notes field
- QR code pickup verification (v1.1)
