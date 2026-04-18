# Phase 5: Consumer Feed & Discovery - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 5 delivers the consumer-facing discovery surface: an endless-scroll, geo-filtered feed of nearby active auctions with filtering/sorting chips, a listing detail page with live auction data, and PWA install prompt UX. Bidding and payments are NOT wired up in this phase — bid/buyout CTAs appear as placeholders only. The auction engine (Phase 4) and payments (Phase 6) supply that functionality.

</domain>

<decisions>
## Implementation Decisions

### Feed Card Design
- **D-01:** Full-bleed product photo as the primary visual anchor — image fills card top, text below. Depop/Whatnot energy consistent with Phase 1 aesthetic.
- **D-02:** Card info below photo: product title, time-left countdown (e.g. "2h 14m left"), current bid / buyout price in dollars, distance from consumer (e.g. "0.3 mi away").
- **D-03:** Category badge overlaid on the photo corner — small chip, scannable at a glance, minimal real estate cost.

### Filter & Sort UX
- **D-04:** Sticky horizontally-scrollable chip row under the header — always visible, no extra tap. Whatnot-style.
- **D-05:** Three sort options: "Ending soon" (default), "Nearest first", "Lowest price".
- **D-06:** Category filtering via multi-select chips — tap to toggle on/off; "All" chip deselects all. Consumers can combine categories (e.g. Dairy + Bakery).
- **D-07:** Distance radius is a fixed 5-mile default — not adjustable in the feed. If nothing nearby, show a friendly empty state.

### Listing Detail Page
- **D-08:** Layout: photo carousel top (swipeable through product/seal/expiry photos), then scrollable auction details below — title, current bid, countdown, business info, description. Depop-style.
- **D-09:** Bid/buyout CTAs are placeholder-only in this phase — visible but disabled, no active bid submission. Real bid flow lands in Phase 4/6.
- **D-10:** Auction info displayed: live countdown timer, current highest bid, bid count, buyout price (if set).
- **D-11:** Business section shows: store name, distance from consumer, pickup instructions (from business onboarding data).
- **D-12:** Live data refresh via polling every 10–15 seconds on the detail page. No WebSockets/SSE — simple interval fetch is sufficient for the demo.

### Geo Filtering
- **D-13 (Claude's Discretion):** Use haversine calculation on existing `businesses.latitude` / `businesses.longitude` columns (doublePrecision). No PostGIS extension needed — schema already supports this without changes.

### PWA Install Prompt
- **D-14 (Claude's Discretion):** Claude decides placement and timing — lean toward value-first (after user has seen feed content) rather than aggressive upfront banners. Dismissed = not shown again in session.

### Claude's Discretion
- Geo filtering: haversine on existing lat/lng columns (D-13).
- PWA install prompt: placement and timing chosen to feel non-intrusive, after user has seen value (D-14).
- Infinite scroll pagination mechanics: cursor-based vs offset, Next.js App Router Server Component + client scroll trigger pattern — Claude picks what fits the stack cleanly.
- Empty state design (no nearby listings): friendly illustration or message — Claude decides copy and visual.
- Sold/expired listing treatment on feed and detail: greyed-out card or removed from feed — Claude decides.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Schema
- `db/schema/listings.ts` — listing fields (status enum, reservePriceCents, buyoutPriceCents, expiresAt, title, description)
- `db/schema/auctions.ts` — auction fields (scheduledEndAt, status, result, winningBidId), bids table (amountCents, status)
- `db/schema/businesses.ts` — business fields (latitude, longitude, name, pickupInstructions, addressLine1, city)

### Phase Context (prior decisions)
- `.planning/phases/01-foundation/01-CONTEXT.md` — aesthetic direction (Whatnot/Depop, bold accent, rounded cards, mobile-first bottom nav)
- `.planning/phases/02-auth-onboarding/02-CONTEXT.md` — consumer lat/lng captured at onboarding; delivery address stored
- `.planning/phases/03-listing-creation/03-CONTEXT.md` — fixed category list (Dairy, Bakery, Produce, Meat, Pantry, Frozen, Beverages, Prepared + Other)

### Project
- `.planning/PROJECT.md` — constraints (free-tier infra, Next.js + Postgres, PWA only, 14-day timeline)
- `.planning/ROADMAP.md` — Phase 5 goal and research topics (geo query, endless-scroll patterns, PWA installability)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `db/schema/listings.ts` + `db/schema/auctions.ts` + `db/schema/businesses.ts` — all data needed for the feed already modeled; queries join these tables
- `db/client.ts` — Drizzle client ready for server-side queries in Next.js App Router route handlers or Server Components

### Established Patterns
- Next.js App Router (confirmed by project setup) — Server Components for initial feed render, client components for scroll trigger and polling
- Tailwind CSS (from Phase 1 bootstrap) — utility-first styling consistent with existing layout
- Drizzle ORM — query builder for haversine distance calculation and auction joins

### Integration Points
- Consumer's lat/lng from `users` table (captured in Phase 2 onboarding) — needed for haversine distance sort/filter
- `listings.status = 'active'` + `auctions.status = 'active'` — the join condition that defines "nearby active auctions" for the feed
- Bottom nav from Phase 1 shell — feed likely occupies the "Shop" tab in the consumer nav

</code_context>

<specifics>
## Specific Ideas

- The feed is the consumer home — it IS the "Shop deals" destination from Phase 1's role pivot.
- Chip row pattern: similar to Whatnot's category chips or Depop's filter bar. Always visible, no friction.
- Category chips should use the exact fixed list from Phase 3: Dairy, Bakery, Produce, Meat, Pantry, Frozen, Beverages, Prepared (+ "All" to reset).
- "Ending soon" as default sort aligns with the urgency-first pitch narrative — bids convert when time pressure is real.
- Three sort modes (ending soon / nearest / lowest price) cover the three core consumer motivations: urgency, convenience, value.
- Photo carousel on detail: swipe through product → seal → expiry photos. Same three photos captured at listing time.

</specifics>

<deferred>
## Deferred Ideas

- Adjustable distance radius slider — fixed 5-mile default is sufficient for demo; add in v1.1 if real stores need broader reach.
- Real-time WebSocket/SSE bid updates — polling at 10–15s is good enough for the demo pitch.
- Bid history list on detail page — not discussed; defer to Phase 4 or later.
- Consumer profile / bid history page — Phase 5 is discovery-only; personal history is a post-demo feature.
- Search by product name — full-text search is a separate phase or v1.1 feature.

</deferred>

---

*Phase: 05-consumer-feed*
*Context gathered: 2026-04-18*
