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
- [x] **Phase 2: Auth & Onboarding** — Google OAuth for business and consumer roles
- [x] **Phase 3: Listing Creation (Snap-to-List)** — 3-photo capture, OCR expiry, reserve/buyout/end-time
- [x] **Phase 4: Auction Engine** — Bidding, buyout, timed settlement, commission modeling
- [x] **Phase 5: Consumer Feed & Discovery** — Endless-scroll geo-filtered feed, listing detail, PWA install
- [x] **Phase 6: Payments (Stripe Test)** — Stripe test-mode auth/capture for bids, buyouts, settlement *(code complete 2026-04-18; awaiting user-supplied secrets for MV walk-through)*
- [x] **Phase 7: Fulfillment** — Pickup codes + Uber Direct delivery *(code complete 2026-04-18; live Uber/Stripe walkthrough still requires user-supplied secrets)*
- [ ] **Phase 8: Notifications & Demo Polish** — Push notifications + deterministic demo tooling *(implementation landed 2026-04-18; final human walkthrough still pending with VAPID-enabled browsers)*
- [x] **Phase 9: Error Logging & Bug Reports** — User action/outcome telemetry + floating bottom-right bug-report widget (support-chat style: screenshot + last 10 actions + description) persisted as LLM-retrievable Markdown *(implemented 2026-04-18; local widget/build verification plus CLI `list`/`get` smoke path complete)*

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
**Plans**:
- 02-01 — Auth foundation and onboarding state — Complete
- 02-02 — Consumer sign-in and onboarding lane — Complete
- 02-03 — Business sign-in and onboarding lane — Complete
- 02-04 — Route protection and shell enforcement — Complete

### Phase 3: Listing Creation (Snap-to-List)
**Goal**: A signed-in business can create a listing with 3 photos (product, seal, expiry), auto-extract the expiry date via OCR, and set reserve price, buyout price, and auction end time.
**Depends on**: Phase 2
**Research**: Likely (camera capture + OCR pipeline)
**Research topics**: PWA camera capture patterns (getUserMedia vs input[capture]), image upload + storage on free tier, OCR options for expiry dates (Tesseract.js client-side vs server-side vs Google Vision API free tier), date-parsing heuristics for printed expiry formats, validation that end-time precedes expiry
**Plans**:
- 03-01 — Listing model and publish boundary — Complete
- 03-02 — Capture and OCR plumbing — Complete
- 03-03 — Seller listing desk — Complete

### Phase 4: Auction Engine
**Goal**: Listings go live as timed auctions where consumers can bid above reserve or buy out instantly; auctions end on schedule with a winner (or no sale), and platform commission is correctly modeled in settlement records.
**Depends on**: Phase 3
**Research**: Likely (time-driven settlement + bid concurrency)
**Research topics**: scheduled-task options on Vercel (cron jobs, Inngest, Trigger.dev) for auction end settlement, race-safe bid handling in Postgres (row locks / transactions), buyout-wins-immediately semantics, commission calculation placement in schema and settlement flow
**Plans**:
- 04-01 — Auction engine foundation, settlement service, and bid APIs — Complete
- 04-02 — Consumer bidding feed, detail, and My Bids lanes — Complete
- 04-03 — Seller auction board, push notifications, and phase completion — Complete

### Phase 5: Consumer Feed & Discovery
**Goal**: Consumers land on an endless-scroll feed of nearby active listings, filter/sort by distance and time-left, open a listing detail page, and install the PWA on their device.
**Depends on**: Phase 4
**Research**: Likely (geo filtering + PWA install UX)
**Research topics**: geo query approaches on Postgres free tiers (PostGIS vs haversine on lat/lng), endless-scroll + pagination patterns in Next.js App Router, listing-detail design for auctions (live time-left, current bid), PWA installability checklist and install-prompt UX
**Plans**: 4 plans

Plans:
- [x] 05-01-PLAN.md — Geo query layer: extend getAuctionFeed with haversine + pagination, update feed route handler, vitest + unit tests — Complete
- [x] 05-02-PLAN.md — New UI atoms: FilterChipRow, FeedCardSkeleton, ListingPhotoCarousel, InstallPromptBanner — Complete
- [x] 05-03-PLAN.md — Feed page composition: FeedClient infinite scroll + chips, extend AuctionCard, wire shop/page.tsx — Complete
- [x] 05-04-PLAN.md — Detail page: photo carousel + polling interval change + distance display — Complete

### Phase 6: Payments (Stripe Test)
**Goal**: Bids hold funds and buyouts/winning bids capture funds via Stripe in test mode, with commission split modeled in the settlement record (no real money).
**Depends on**: Phase 4
**Research**: Complete (see `phases/06-payments/06-RESEARCH.md`)
**Research topics**: current Stripe test-mode flows for card-save then off-session capture at auction close, SetupIntent + Payment Element vs PaymentIntent auth/capture for held bids, simulated commission split in settlement records (no Stripe Connect), webhook handling in Next.js route handlers (raw body, signature verify, idempotency)
**Plans**:
- 06-01 — Foundation: Stripe SDK install, env vars, schema (stripeCustomerId/stripePaymentMethodId on consumer_profiles + stripe_webhook_events table), Drizzle migration, platform fee correction (15%→10%), Stripe CLI docs (wave 1)
- 06-02 — Server Stripe services: stripe singleton, getOrCreateStripeCustomer, createSetupIntentForConsumer, chargeBidderOffSession + chargeBuyout, webhook idempotency helpers, runFallbackBidderLoop (wave 2, depends on 06-01)
- 06-03 — Webhook route + 4 handlers: /api/webhooks/stripe with signature verify + dedup, setup_intent.succeeded / payment_intent.succeeded / payment_intent.payment_failed / payment_intent.canceled handlers (wave 3, depends on 06-02)
- 06-04 — SetupIntent API + inline Payment Element UI: /api/consumer/setup-intent, StripeCardSetup component wired into AuctionBidPanel, MockCardPanel gated by env (wave 3, depends on 06-02)
- 06-05 — Settlement trigger: post-commit charge dispatch (`triggerAuctionPaymentIfCloseResult`) wired into buyoutAuction, refreshAuctionIfOverdue, sweepOverdueAuctions — OUTSIDE Drizzle transactions; routes to chargeBuyout or chargeBidderOffSession and invokes runFallbackBidderLoop on failure (wave 3, depends on 06-02)
- 06-06 — Demo walk-through docs: end-to-end README section covering first-bid SetupIntent, auction close → off-session capture, fallback bidder, buyout, and seller outcomes verification (wave 4, depends on 06-01..06-05)

### Phase 7: Fulfillment
**Goal**: After a sale clears, the buyer can choose in-store pickup (with a verification code) or Uber Direct delivery, and the business sees the corresponding fulfillment state.
**Depends on**: Phase 6
**Research**: Complete (see `phases/07-fulfillment/07-RESEARCH.md`)
**Research topics**: Uber Direct API onboarding + sandbox availability, delivery request lifecycle and webhooks, pickup-code generation + business-side verification UX, fulfillment state machine for both paths
**Plans**:
- 07-01 — Fulfillment backend foundation, consumer APIs, and Uber webhook handling — Complete
- 07-02 — Consumer Orders lane for pickup and delivery choice — Complete
- 07-03 — Seller Fulfillment lane, pickup verification, docs, and phase closeout — Complete

### Phase 8: Notifications & Demo Polish
**Goal**: Push notifications fire for outbid, auction-ending-soon, win confirmation, and business-item-sold events, and the app exposes a tiny deterministic demo world plus scripted controls so the pitch flow can be reset and replayed on cue.
**Depends on**: Phase 7
**Research**: Likely (Web Push for PWAs)
**Research topics**: Web Push + VAPID setup for Next.js PWAs, cross-browser push support (iOS Safari caveats), trigger points wired to auction engine events, seed-data strategy that exercises every UI state
**Plans**:
- 08-01 — Notification backend completion: ending-soon dedup state, push builder refactor, runtime sweep — Complete
- 08-02 — Deterministic demo prep services and guarded internal operator endpoints — Complete
- 08-03 — Seller demo tools surface and navigation polish — Implemented; human verify checkpoint pending
- 08-04 — Demo runbook, walkthrough verification, and phase closeout — Runbook and tracker closeout complete; final walkthrough approval pending

### Phase 9: Error Logging & Bug Reports
**Goal**: Comprehensive user-action/outcome telemetry across consumer + seller surfaces, plus a small floating bottom-right bug-report button (support-chat-widget style — fixed position, always visible, expands on click into a small panel) that captures a screenshot of the current screen, the user's last 10 actions, and a short user-supplied description, persists the report as a Markdown file in the database, and exposes a CLI for Claude/Codex/other LLMs to list and retrieve reports.
**Depends on**: Phase 8
**Research**: Complete (see `phases/09-error-logging-and-bug-reports/DISCOVERY.md`)
**Research topics**: action-log buffer design (ring buffer of last N events, PII scrubbing), floating support-chat-style widget patterns (fixed-position FAB + expandable panel, z-index + mobile safe-area handling, shell integration so it appears on every consumer/seller route), DOM/canvas screenshot options in a PWA (html2canvas vs native MediaDevices/getDisplayMedia), storage format for bug-report Markdown (Postgres text column vs bytea vs blob), CLI surface shape for LLM consumption (list/get/search), privacy + auth gating for report retrieval
**Plans**:
- 09-01 — Bug report schema, Markdown persistence service, and anonymous-or-signed-in submission API — Complete
- 09-02 — Global action trail capture, screenshot preview, and floating report widget — Complete
- 09-03 — LLM-facing CLI, operator docs, and phase verification — Complete

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | Complete | 2026-04-18 |
| 2. Auth & Onboarding | 4/4 | Complete | 2026-04-18 |
| 3. Listing Creation | 3/3 | Complete | 2026-04-18 |
| 4. Auction Engine | 3/3 | Complete | 2026-04-18 |
| 5. Consumer Feed & Discovery | 4/4 | Complete | 2026-04-18 |
| 6. Payments (Stripe Test) | 6/6 | Code complete (awaiting user UAT) | 2026-04-18 |
| 7. Fulfillment | 3/3 | Code complete (awaiting live Uber/Stripe UAT) | 2026-04-18 |
| 8. Notifications & Demo Polish | 2/4 complete (+2 pending verify) | Implementation complete; awaiting human walkthrough | - |
| 9. Error Logging & Bug Reports | 3/3 | Complete | 2026-04-18 |
