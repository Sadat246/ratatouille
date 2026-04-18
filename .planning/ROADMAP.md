# Roadmap: Ratatouille

## Overview

Ratatouille is a PWA marketplace where grocery and corner stores auction soon-to-expire sealed goods to nearby shoppers. The build arcs from a working Next.js + Postgres foundation through role-based Google auth, snap-to-list capture with OCR, a timed auction engine with buyout, a geo-filtered consumer feed, Stripe test-mode payments, dual-path fulfillment (pickup + Uber Direct), and finally push notifications plus seeded demo data — all targeting an end-to-end pitch demo around 2026-05-02.

## Domain Expertise

None (no relevant expertise skills installed).

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** — Next.js + Postgres scaffold, schema, deploy pipeline, PWA shell
- [ ] **Phase 2: Auth & Onboarding** — Google OAuth for business and consumer roles
- [ ] **Phase 3: Listing Creation (Snap-to-List)** — 3-photo capture, OCR expiry, reserve/buyout/end-time
- [ ] **Phase 4: Auction Engine** — Bidding, buyout, timed settlement, commission modeling
- [ ] **Phase 5: Consumer Feed & Discovery** — Endless-scroll geo-filtered feed, listing detail, PWA install
- [ ] **Phase 6: Payments (Stripe Test)** — Stripe test-mode auth/capture for bids, buyouts, settlement
- [ ] **Phase 7: Fulfillment** — Pickup codes + Uber Direct delivery
- [ ] **Phase 8: Notifications & Demo Polish** — Push notifications + seeded demo data

## Phase Details

### Phase 1: Foundation
**Goal**: Deployable Next.js + Postgres app with core schema, baseline PWA manifest, and free-tier deploy pipeline working end-to-end.
**Depends on**: Nothing (first phase)
**Research**: Likely (free-tier deploy + Postgres provider selection)
**Research topics**: Next.js App Router patterns for this stack, Postgres host choice (Neon vs Supabase) on free tier, Vercel deploy config, PWA manifest + service-worker baseline, initial schema for users/businesses/listings/auctions/bids
**Plans**:
- 01-01 — Bootstrap foundation and toolchain — Complete
- 01-02 — Core schema and migrations — Complete
- 01-03 — Branded shell, PWA baseline, and deployment — Complete

### Phase 2: Auth & Onboarding
**Goal**: Users can sign in with Google as either a business or a consumer, with role persisted and protected routes enforced.
**Depends on**: Phase 1
**Research**: Likely (auth library + role model)
**Research topics**: Auth.js (NextAuth) v5 patterns with Google provider, role-selection flow at first sign-in, session/role persistence in Postgres, middleware-based route protection for business vs consumer areas
**Plans**: TBD

### Phase 3: Listing Creation (Snap-to-List)
**Goal**: A signed-in business can create a listing with 3 photos (product, seal, expiry), auto-extract the expiry date via OCR, and set reserve price, buyout price, and auction end time.
**Depends on**: Phase 2
**Research**: Likely (camera capture + OCR pipeline)
**Research topics**: PWA camera capture patterns (getUserMedia vs input[capture]), image upload + storage on free tier, OCR options for expiry dates (Tesseract.js client-side vs server-side vs Google Vision API free tier), date-parsing heuristics for printed expiry formats, validation that end-time precedes expiry
**Plans**: TBD

### Phase 4: Auction Engine
**Goal**: Listings go live as timed auctions where consumers can bid above reserve or buy out instantly; auctions end on schedule with a winner (or no sale), and platform commission is correctly modeled in settlement records.
**Depends on**: Phase 3
**Research**: Likely (time-driven settlement + bid concurrency)
**Research topics**: scheduled-task options on Vercel (cron jobs, Inngest, Trigger.dev) for auction end settlement, race-safe bid handling in Postgres (row locks / transactions), buyout-wins-immediately semantics, commission calculation placement in schema and settlement flow
**Plans**: TBD

### Phase 5: Consumer Feed & Discovery
**Goal**: Consumers land on an endless-scroll feed of nearby active listings, filter/sort by distance and time-left, open a listing detail page, and install the PWA on their device.
**Depends on**: Phase 4
**Research**: Likely (geo filtering + PWA install UX)
**Research topics**: geo query approaches on Postgres free tiers (PostGIS vs haversine on lat/lng), endless-scroll + pagination patterns in Next.js App Router, listing-detail design for auctions (live time-left, current bid), PWA installability checklist and install-prompt UX
**Plans**: TBD

### Phase 6: Payments (Stripe Test)
**Goal**: Bids hold funds and buyouts/winning bids capture funds via Stripe in test mode, with commission split modeled in the settlement record (no real money).
**Depends on**: Phase 4
**Research**: Likely (external API — current Stripe patterns)
**Research topics**: current Stripe test-mode flows for auth-then-capture on auctions, Payment Intents vs Setup Intents for held bids, Stripe Connect or simulated seller payouts for commission split in test mode, webhook handling in Next.js route handlers
**Plans**: TBD

### Phase 7: Fulfillment
**Goal**: After a sale clears, the buyer can choose in-store pickup (with a verification code) or Uber Direct delivery, and the business sees the corresponding fulfillment state.
**Depends on**: Phase 6
**Research**: Likely (external API — Uber Direct)
**Research topics**: Uber Direct API onboarding + sandbox availability, delivery request lifecycle and webhooks, pickup-code generation + business-side verification UX, fulfillment state machine for both paths
**Plans**: TBD

### Phase 8: Notifications & Demo Polish
**Goal**: Push notifications fire for outbid, auction-ending-soon, win confirmation, and business-item-sold events, and the app is seeded with multiple fake businesses plus ~20+ listings so the demo feels populated.
**Depends on**: Phase 7
**Research**: Likely (Web Push for PWAs)
**Research topics**: Web Push + VAPID setup for Next.js PWAs, cross-browser push support (iOS Safari caveats), trigger points wired to auction engine events, seed-data strategy that exercises every UI state
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | Complete | 2026-04-18 |
| 2. Auth & Onboarding | 0/TBD | Not started | - |
| 3. Listing Creation | 0/TBD | Not started | - |
| 4. Auction Engine | 0/TBD | Not started | - |
| 5. Consumer Feed & Discovery | 0/TBD | Not started | - |
| 6. Payments (Stripe Test) | 0/TBD | Not started | - |
| 7. Fulfillment | 0/TBD | Not started | - |
| 8. Notifications & Demo Polish | 0/TBD | Not started | - |
