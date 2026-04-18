# Phase 5: Consumer Feed & Discovery - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-18
**Phase:** 5-consumer-feed
**Areas discussed:** Feed card design, Filter & sort UX, Listing detail page

---

## Feed Card Design

| Option | Description | Selected |
|--------|-------------|----------|
| Product photo, full-bleed | Image fills card top, text overlays below. Depop/Whatnot energy. | ✓ |
| Product photo, thumbnail left | Smaller square image left, details stack right. Higher density. | |
| You decide | Claude picks layout matching Phase 1 aesthetic. | |

**Card info (multi-select):**

| Option | Selected |
|--------|----------|
| Product title | ✓ |
| Time-left countdown | ✓ |
| Current bid / buyout price | ✓ |
| Distance from consumer | ✓ |

**Category badge:**

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, small badge on photo corner | Category chip overlaid on image. | ✓ |
| Yes, text below title | Category as text line under title. | |
| No badges on cards | Cleaner look, category only in filter UI. | |

**Notes:** Full-bleed photo with all four info items and a corner category badge. Consistent with Whatnot/Depop direction from Phase 1.

---

## Filter & Sort UX

| Option | Description | Selected |
|--------|-------------|----------|
| Sticky chip row under header | Horizontally scrollable, always visible, no extra tap. | ✓ |
| Filter icon → bottom sheet | Icon opens sheet; feed stays clean but needs extra tap. | |
| You decide | Claude picks for mobile one-handed use. | |

**Sort options:**

| Option | Selected |
|--------|----------|
| Ending soon + Nearest | |
| Ending soon only | |
| Ending soon + Nearest + Lowest price | ✓ |

**Category filtering:**

| Option | Selected |
|--------|----------|
| Multi-select chips | ✓ |
| Single-select chips | |

**Distance radius:**

| Option | Selected |
|--------|----------|
| Fixed 5-mile default (not adjustable) | ✓ |
| Adjustable radius slider | |
| You decide | |

**Notes:** Three sort modes cover the three consumer motivations. Multi-select category chips match Phase 3's fixed category list. Fixed 5-mile radius keeps demo scope tight.

---

## Listing Detail Page

**Layout:**

| Option | Selected |
|--------|----------|
| Photo carousel top, details + auction below | ✓ |
| Full-screen photo with drag-up sheet | |
| You decide | |

**Bid/buyout CTA:**

| Option | Selected |
|--------|----------|
| Placeholder CTA only (disabled, coming soon) | ✓ |
| Real bid form, no payment | |
| You decide | |

**Auction info (multi-select):**

| Option | Selected |
|--------|----------|
| Live countdown timer | ✓ |
| Current highest bid | ✓ |
| Bid count | ✓ |
| Buyout price | ✓ |

**Business info:**

| Option | Selected |
|--------|----------|
| Store name + distance + pickup instructions | ✓ |
| Store name only | |
| No business info | |

**Live data refresh:**

| Option | Selected |
|--------|----------|
| Poll every 10–15 seconds | ✓ |
| Poll every 30 seconds | |
| Real-time WebSockets/SSE | |

**PWA install prompt:**

| Option | Selected |
|--------|----------|
| Feed, after scrolling past 3 cards | |
| Banner at top on first visit | |
| You decide | ✓ |

**Notes:** Detail page is information-rich but scoped to discovery only. Bid CTAs are placeholders — Phase 4 auction engine and Phase 6 payments activate them. Polling at 10–15s is pragmatic for a pitch demo.

---

## Claude's Discretion

- Geo filtering: haversine on existing lat/lng columns (no PostGIS needed).
- PWA install prompt: Claude decides placement and timing (value-first, non-intrusive).
- Infinite scroll pagination mechanics: cursor vs offset, App Router pattern.
- Empty state design (no nearby listings).
- Sold/expired listing treatment.

## Deferred Ideas

- Adjustable distance radius slider
- Real-time WebSocket/SSE bid updates
- Bid history list on detail page
- Consumer profile / bid history page
- Search by product name
