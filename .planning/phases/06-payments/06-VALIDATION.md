---
phase: 6
slug: payments
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-18
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

> **Source:** Validation Architecture section of `06-RESEARCH.md`. Prior phases shipped without a unit-test framework; this phase follows that precedent and uses Stripe-CLI-driven smoke tests + type-check/lint as the automated sampling surface. A full test harness (vitest + Playwright) is deferred to a post-demo v1.1 hardening phase.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None installed (matches prior phases). Smoke tests are CLI-driven via `stripe trigger …` + manual browser walk-through. |
| **Config file** | none — planner should NOT introduce a test harness in Phase 6 (see Wave 0 Gaps). |
| **Quick run command** | `npx tsc --noEmit && npm run lint` |
| **Full suite command** | `npm run build` (compiles + type-checks every route) + the Stripe-CLI smoke-test list below |
| **Estimated runtime** | ~30 s (tsc + lint + build) — Stripe-CLI smoke tests are interactive, ~5 min to walk through |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit && npm run lint` (quick)
- **After every plan wave:** Run `npm run build` + walk the Stripe-CLI smoke list for any newly-added behavior
- **Before `/gsd-verify-work`:** Full happy-path end-to-end smoke (SetupIntent → bid → auction close → off-session PI → webhook → settlement row correct) must pass
- **Max feedback latency:** ~30 s for type/lint/build; smoke tests are out-of-loop and run at wave/phase gates

---

## Per-Task Verification Map

> Populated by `/gsd-plan-phase` when tasks are finalized. Each task gets one row. `Automated Command` column holds `npx tsc --noEmit`, `npm run lint`, or `npm run build` by default; Stripe-CLI commands appear only when listed under Manual-Only Verifications below.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| _(to be filled by planner)_ | | | | | | | | | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Add `stripe`, `@stripe/stripe-js`, `@stripe/react-stripe-js` deps at pinned versions from RESEARCH Standard Stack
- [ ] Add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to `.env.example` with obtain-from-dashboard comment
- [ ] Drizzle: add `stripeCustomerId` + `stripePaymentMethodId` columns (consumer-profile table) and new `stripe_webhook_events` table, then run `npm run db:generate && npm run db:migrate`
- [ ] Document Stripe CLI forwarding in `README.md`: `stripe listen --forward-to localhost:3000/api/webhooks/stripe --events payment_intent.succeeded,payment_intent.payment_failed,payment_intent.canceled,setup_intent.succeeded`

*Explicitly NOT in Wave 0: installing vitest/playwright. Deferred to post-demo v1.1.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| First-bid triggers SetupIntent + inline card modal | D-01 / D-03 | No test framework; requires live Stripe Elements iframe | Open auction as new consumer → click bid → card form renders inline with iframe origin `js.stripe.com` |
| `setup_intent.succeeded` persists `stripeCustomerId` + `stripePaymentMethodId` | D-01 (webhook) | Webhook delivery | `stripe trigger setup_intent.succeeded` → verify consumer-profile row updated via `npm run db:studio` |
| Buyout creates PI + captures immediately | D-05 | Requires live dashboard + cron | Buyout a test auction → confirm `settlements.paymentStatus = 'captured'` within 3 s |
| Off-session winning-bid PI fires at auction close | D-06 | Requires auction cron + saved PaymentMethod | Let an auction close naturally with a winner → Stripe Dashboard shows PI with `off_session=true` and our `settlementId` in metadata |
| Failed winner → next-highest bidder succeeds | D-10 | Requires two bidders + failing card | Set up two bidders; give winner card `4000 0000 0000 9995` (insufficient_funds) → verify runner-up's PI succeeds and `settlements` rewritten |
| All four webhook events route correctly | D-12 | Webhook delivery | `stripe trigger payment_intent.succeeded` / `payment_intent.payment_failed` / `payment_intent.canceled` / `setup_intent.succeeded` → verify each handler fires via logs + DB state |
| Invalid webhook signature → 400 | D-13 | Requires crafted payload | Send a payload with wrong signature → webhook endpoint returns 400 |
| `error_on_requires_action: true` prevents 3DS park (no double-charge) | D-06 / D-10 (safety) | Requires 3DS card | Give winner card `4000 0027 6000 3184` (requires_authentication) → PI fails fast, fallback bidder engaged, no duplicate capture on Stripe Dashboard |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify (type/lint/build) or a Wave 0 dependency
- [ ] Sampling continuity: no 3 consecutive tasks without at least a type-check sample
- [ ] Wave 0 covers all MISSING references (deps, env vars, schema migration, webhook dedup table)
- [ ] No watch-mode flags (smoke tests are one-shot CLI triggers)
- [ ] Feedback latency < 30 s for automated samples
- [ ] `nyquist_compliant: true` set in frontmatter before `/gsd-verify-work`

**Approval:** pending
