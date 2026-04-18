# Ratatouille

## What This Is

A PWA that helps grocery and corner stores sell soon-to-expire sealed goods through timed auctions with a buyout option, so businesses recapture margin on inventory that would otherwise be written off and consumers get sealed food at a discount. Shoppers discover nearby listings in an endless-scroll feed, bid or buy outright, and either pick up in-store or get Uber Direct delivery.

## Core Value

Auctions actually clear at-risk inventory before expiry — bids land, winners pay, items get to buyers.

## Requirements

### Validated

(None yet — ship to validate)

### Active

<!-- v1 = 2-week pitch demo. All items are hypotheses until the demo proves them out. -->

- [ ] Business onboarding via Google OAuth (grocery / corner stores)
- [ ] Consumer onboarding via Google OAuth
- [ ] Snap-to-list capture: 3 photos per listing — product, intact seal, expiry date
- [ ] OCR expiry extraction from photo (wave-the-camera flow)
- [ ] Business sets reserve price, buyout price, and auction end time (must end before expiry)
- [ ] Timed auction with reserve + instant buyout (hybrid)
- [ ] Consumer PWA with endless-scroll, geo-filtered "all nearby" feed
- [ ] Bidding and buy-it-now flows
- [ ] Stripe integration in test mode (no real money)
- [ ] Platform % commission modeled in schema and settlement flow
- [ ] Fulfillment: in-store pickup with code OR Uber Direct delivery (buyer chooses)
- [ ] Push notifications: outbid, auction ending soon, win confirmation, business-item-sold
- [ ] Seeded demo data: multiple fake businesses with ~20+ listings so the PWA feels populated

### Out of Scope

- Disputes system — v1 handles disputes manually over email; full system is v1.1+
- Bulk / POS import — snap-to-list only for v1; bulk listing and POS integrations defer to v1.1
- Forecasting engine — v1 is manual listing; predictive "should I list this?" model is v2
- Supplier auto-ordering (openclaw browser automation) — deferred; tangential to core auction flow
- "Logical" pricing ceilings / decay rules — market decides, bids above retail are allowed
- Real money payments — Stripe stays in test mode through demo
- Public launch / open signups — v1 is a pitch demo, not a live marketplace
- Native mobile apps — PWA only in v1
- Prepared / cooked food — platform only accepts sealed, unopened items (legal + food safety)

## Context

- Greenfield project. Directory was empty at initialization (2026-04-18).
- Solo builder (user) + Claude as implementer. No other collaborators.
- Target outcome: working end-to-end demo for a pitch on or around 2026-05-02.
- "Sealed items only" is both a product rule and a fraud-prevention posture — the 3-photo requirement (product / intact seal / expiry) exists so buyers can visually verify tamper-free condition.
- Consumers are expected to be price-sensitive shoppers near participating stores; no demographic targeting beyond that for v1.

## Constraints

- **Tech stack**: Next.js + Postgres — user specified this combo for speed and free-tier deploy.
- **Timeline**: ~14 days; target demo 2026-05-02 — scope must bend to fit, not the other way around.
- **Budget**: Free-tier only (e.g., Vercel + Neon/Supabase) — no paid infra commitments for v1.
- **Payments**: Stripe test mode only — avoids payments compliance burden for a demo.
- **Product rule**: Items must be sealed and unopened — no cooked or prepared food ever, enforced at listing time via the seal photo.
- **Fulfillment**: Both pickup and Uber Direct must work in v1 — user confirmed this is non-negotiable for the demo story.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| PWA over native apps | Installable, cross-platform, one codebase, fits free-tier + 14-day budget | — Pending |
| Next.js + Postgres | User preference; full-stack JS simplifies single-dev workflow | — Pending |
| Google OAuth for both sides | Lowest-friction sign-in for demo; no password storage | — Pending |
| Timed auction + buyout hybrid | Flexibility — bidders who want to guarantee a win can buyout; others can bid | — Pending |
| Businesses first | Supply side must exist before demand; PWA seeded with fake listings for demo | — Pending |
| 3 required photos (product/seal/expiry) | Tamper verification + expiry OCR source + product identification in one step | — Pending |
| Stripe test mode (no real money) | Removes KYC, payouts, and compliance from 2-week critical path | — Pending |
| Forecasting deferred to v2 | Need transactional data before ML is useful; keeps v1 focused on clearing the core loop | — Pending |
| Bulk / POS import deferred to v1.1 | Each POS (Square, Clover, Shopify) is its own integration; snap-to-list covers the demo | — Pending |
| Disputes handled manually in v1 | Edge-case handling would dominate 14-day scope; email handoff is acceptable for demo | — Pending |
| Pricing ceilings NOT enforced | User decided market dictates price; no artificial caps or decay in v1 | — Pending |
| Seeded demo data (fake businesses) | Pitch needs a populated feed; onboarding a real pilot business is v1.1 | — Pending |

---
*Last updated: 2026-04-18 after initialization*
