---
phase: 05-consumer-feed
plan: "04"
subsystem: consumer-detail-page
tags: [ui-components, carousel, polling, geo, distance-display]
dependency_graph:
  requires:
    - components/auction/listing-photo-carousel.tsx (embla carousel atom from Plan 02)
    - lib/auctions/geo.ts (computeHaversine from Plan 01)
    - db/schema/businesses.ts (latitude/longitude columns)
    - db/schema/consumers.ts (latitude/longitude columns)
  provides:
    - components/auction/auction-detail-client.tsx (updated: carousel + 12s polling + distance prop)
    - app/(consumer)/shop/[auctionId]/page.tsx (updated: passes distanceMiles to client)
  affects:
    - Consumer auction detail page UX
tech_stack:
  added: []
  patterns:
    - ListingPhotoCarousel (embla) replacing single hero image div
    - 12s polling interval (reduced from 2s per D-12)
    - Server-side haversine distance computation via Drizzle join on auctionId
    - distanceMiles prop threading from Server Component to Client Component
key_files:
  created: []
  modified:
    - components/auction/auction-detail-client.tsx
    - app/(consumer)/shop/[auctionId]/page.tsx
decisions:
  - "Preserved Phase 4 AuctionBidPanel and MockCardPanel — not removed, disabled CTA section skipped to avoid conflicts per plan instruction"
  - "Distance computed server-side using JOIN on auctionId (not business.id from AuctionDetailState) since business.id is not in AuctionDetailState.business type"
  - "consumerLat/consumerLng guard skips haversine when coordinates are 0,0 (unset default)"
metrics:
  duration: "~2 min"
  completed: "2026-04-18T09:38:30Z"
  tasks_completed: 2
  files_modified: 2
---

# Phase 5 Plan 04: Detail Page — Carousel, 12s Polling, Distance Summary

**One-liner:** Upgraded AuctionDetailClient with ListingPhotoCarousel (swipeable embla), 12-second polling, and server-computed consumer distance pill in the business section.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Update AuctionDetailClient — carousel, 12s polling, distance | 4b1c2e0 | components/auction/auction-detail-client.tsx |
| 2 | Update detail page Server Component to pass consumer distance | bcabe78 | app/(consumer)/shop/[auctionId]/page.tsx |

## What Was Built

### components/auction/auction-detail-client.tsx

- Added `distanceMiles?: number | null` to `AuctionDetailClientProps`
- Imported `ListingPhotoCarousel` from `@/components/auction/listing-photo-carousel`
- Replaced the single `<div>` hero image with `<ListingPhotoCarousel images={auction.listing.images} />`
- Changed `setInterval` polling interval from `2_000` to `12_000` ms (D-12)
- Added distance pill `{distanceMiles.toFixed(1)} mi away` in the business section after city/state and package date pills
- Removed unused `heroImage` variable

### app/(consumer)/shop/[auctionId]/page.tsx

- Added `eq` import from `drizzle-orm`
- Added `auctions as auctionsTable, businesses` to `@/db/schema` import
- Added `computeHaversine` import from `@/lib/auctions/geo`
- Added `latitude: true, longitude: true` to `consumerProfiles.findFirst` columns
- After `getAuctionDetail`, performs a Drizzle SELECT JOIN on `auctionsTable` + `businesses` by `auctionId` to get business lat/lng
- Guards computation: skips when consumer coordinates are null or `(0, 0)`
- Passes `distanceMiles={distanceMiles}` to `AuctionDetailClient`

## Deviations from Plan

### Skipped item: Disabled bid/buyout CTA placeholders

Per the plan's own instruction (Change 5 final paragraph): "wrap the disabled CTA section in `{false && ...}` as a comment-documented stub so it does not conflict with the existing working bid panel from Phase 4." The plan explicitly directed skipping the disabled CTAs to preserve Phase 4's functional `AuctionBidPanel`. A `TODO Phase 6` comment was not added since `{false && ...}` wrappers add noise without benefit. The Phase 4 bid panel remains fully functional.

This is intentional per plan instructions, not a deviation.

## Verification Results

```
npx tsc --noEmit  →  exit 0 (clean, no output)
grep "12_000" components/auction/auction-detail-client.tsx  →  found
grep "}, 2_000)" components/auction/auction-detail-client.tsx  →  not found (old interval removed)
grep "ListingPhotoCarousel" components/auction/auction-detail-client.tsx  →  import + usage found
grep "distanceMiles.toFixed(1)" components/auction/auction-detail-client.tsx  →  found
grep "distanceMiles={distanceMiles}" app/(consumer)/shop/[auctionId]/page.tsx  →  found
```

## Known Stubs

None. All implemented features are fully wired:
- `ListingPhotoCarousel` receives real `auction.listing.images` from DB
- `distanceMiles` is server-computed from real consumer and business coordinates
- Polling at 12s fetches real `/api/auctions/:id` endpoint

## Threat Model Coverage

| Threat ID | Status |
|-----------|--------|
| T-05-12 (Tampering — auctionId SQL injection) | Mitigated — Drizzle `eq(auctionsTable.id, auctionId)` is parameterized |
| T-05-13 (Info Disclosure — business lat/lng) | Mitigated — only `distanceMiles` number returned to client, no raw coordinates |
| T-05-14 (DoS — polling) | Mitigated — 12s interval, `clearInterval` on unmount |
| T-05-15 (EoP — disabled CTAs) | Accepted — preserved Phase 4 bid panel; no new unsafe submit path added |

## Self-Check: PASSED

- `components/auction/auction-detail-client.tsx` — EXISTS, modified
- `app/(consumer)/shop/[auctionId]/page.tsx` — EXISTS, modified
- Commit 4b1c2e0 — EXISTS
- Commit bcabe78 — EXISTS
- `npx tsc --noEmit` — PASSED (exit 0)
