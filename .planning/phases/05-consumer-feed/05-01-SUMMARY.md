---
phase: 05-consumer-feed
plan: "01"
subsystem: data-layer
tags: [geo-query, pagination, sort, filter, vitest, unit-tests]
dependency_graph:
  requires:
    - db/schema/businesses.ts (latitude/longitude columns)
    - db/schema/consumers.ts (latitude/longitude notNull)
    - lib/listings/categories.ts (listingCategoryValues enum)
    - lib/auth/api.ts (authorizeApiRole)
  provides:
    - lib/auctions/queries.ts (getAuctionFeed with geo+filter+pagination)
    - lib/auctions/geo.ts (computeHaversine pure function)
    - lib/auctions/feed-utils.ts (sortItems, filterByCategories)
    - app/api/auctions/feed/route.ts (paginated feed route handler)
  affects:
    - app/(consumer)/shop/page.tsx (backward-compat preserved)
tech_stack:
  added:
    - vitest@^4.1.4 (devDependency)
    - "@vitejs/plugin-react@^6.0.1" (devDependency)
  patterns:
    - Haversine bounding box pre-filter + exact distance WHERE (PostgreSQL cos/sin/acos/radians)
    - LEAST(1.0, ...) acos domain guard
    - Offset-based pagination with hasMore detection (fetch N+1)
    - Drizzle sql<number> computed column with .as() alias
    - Dynamic ORDER BY via runtime enum dispatch
key_files:
  created:
    - lib/auctions/geo.ts
    - lib/auctions/feed-utils.ts
    - vitest.config.ts
    - tests/lib/auctions/geo-queries.test.ts
    - tests/lib/auctions/feed-queries.test.ts
  modified:
    - lib/auctions/queries.ts
    - app/api/auctions/feed/route.ts
    - package.json
decisions:
  - Used spherical law of cosines (not haversine formula variant) matching the SQL expression in the query layer — same formula in both JS utility and PostgreSQL
  - Backward compat preserved: getAuctionFeed(24, userId) number-first call still works via typeof params check
  - validCategories cast to ListingCategory[] to satisfy Drizzle inArray enum column overload
  - Feed route fixed at LIMIT=12 server-side; client cannot request unlimited rows (T-05-04 DoS mitigation)
metrics:
  duration: "~4 min"
  completed: "2026-04-18T09:31:20Z"
  tasks_completed: 2
  files_modified: 8
---

# Phase 5 Plan 01: Geo-Query Data Layer Summary

Upgraded `getAuctionFeed` with haversine distance filtering (5-mile radius), three-way dynamic sort, category multi-select, and offset pagination — plus vitest infrastructure and 8 unit tests for the geo formula and filter logic.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Install vitest and write geo + feed filter unit tests | a5d3f87 | vitest.config.ts, package.json, lib/auctions/geo.ts, lib/auctions/feed-utils.ts, tests/lib/auctions/geo-queries.test.ts, tests/lib/auctions/feed-queries.test.ts |
| 2 | Extend getAuctionFeed + update feed route handler | 7e0de50 | lib/auctions/queries.ts, app/api/auctions/feed/route.ts, tests/lib/auctions/feed-queries.test.ts |

## What Was Built

### lib/auctions/geo.ts
Pure `computeHaversine(lat1, lng1, lat2, lng2): number` using the spherical law of cosines with `Math.min(1.0, inner)` guard. Used by unit tests; mirrors the SQL expression in the query.

### lib/auctions/feed-utils.ts
Pure utility functions `sortItems(items, sortBy)` and `filterByCategories(items, categories)` for client-side optimistic use and unit testing.

### lib/auctions/queries.ts — getAuctionFeed overhaul
- New params object signature: `{ lat, lng, sortBy, categories, limit, offset, viewerUserId }`
- Backward-compat: `getAuctionFeed(24, userId)` still works
- Bounding box pre-filter (gte/lte on lat/lng) eliminates distant rows cheaply before exact haversine
- Exact haversine WHERE clause: `EARTH_RADIUS_MILES * acos(least(1.0, ...)) <= FEED_RADIUS_MILES`
- Dynamic ORDER BY: `ending_soon` → `scheduledEndAt asc`, `nearest` → `distanceMiles asc`, `lowest_price` → `reservePriceCents asc`
- Category filter: `inArray(listings.category, validCategories)` after enum whitelist validation
- `distanceMiles: number | null` added to `AuctionFeedItem` type
- NULL guard: only businesses with geocoded lat/lng included

### app/api/auctions/feed/route.ts — full replacement
- Reads consumer lat/lng from `db.query.consumerProfiles` keyed on session user ID (never from request params — T-05-01)
- Validates `sortBy` against `VALID_SORT_BY` whitelist (T-05-02)
- Validates `categories` against `listingCategoryValues` (T-05-03)
- Clamps `offset` with `Math.max(0, ...)` (T-05-04)
- Returns `{ ok: true, items, nextOffset, hasMore }` shape
- Fixed `LIMIT = 12` server-side; fetches `LIMIT + 1` to detect hasMore

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test expectations for SF-to-Oakland distance were incorrect**
- **Found during:** Task 1 RED phase
- **Issue:** Plan specified ~10.9 miles for SF (37.7749, -122.4194) to Oakland (37.8044, -122.2712), but the spherical law of cosines formula (used in both the plan's SQL and the JS implementation) computes ~8.3 miles for those coordinates. The plan's 10.9-mile figure corresponds to different coordinates or a different formula.
- **Fix:** Updated test assertions to match the actual computed value (~8.3 ± 0.5 miles). The formula is correct; the expected value in the plan was wrong. The geo-filter logic is unaffected — 8.3 miles is still correctly outside the 5-mile radius.
- **Files modified:** tests/lib/auctions/geo-queries.test.ts
- **Commit:** a5d3f87

**2. [Rule 1 - Bug] TypeScript type error on inArray with string[] vs enum column**
- **Found during:** Task 2 tsc verification
- **Issue:** Drizzle's `inArray` overload requires `ListingCategory[]` when used with a PgEnumColumn; passing `string[]` fails type checking.
- **Fix:** Cast `validCategories` as `ListingCategory[]` after whitelist filter.
- **Files modified:** lib/auctions/queries.ts
- **Commit:** 7e0de50

**3. [Rule 1 - Bug] Test helper used spread overrides that clobbered typed Date fields**
- **Found during:** Task 2 tsc verification
- **Issue:** The `makeItem` helper spread `overrides` at the end, which overwrote `scheduledEndAt: Date` with a string, causing TS2322.
- **Fix:** Rewrote helper to use a plain opts object with no spread, converting strings to Date explicitly.
- **Files modified:** tests/lib/auctions/feed-queries.test.ts
- **Commit:** 7e0de50

## Verification Results

```
vitest run tests/lib/auctions/  →  8 passed (8)
npx tsc --noEmit               →  exit 0 (clean)
```

## Known Stubs

None. This plan is purely data-layer — no UI components, no placeholder values.

## Threat Flags

All threat mitigations from plan's threat model applied:

| Mitigation | Location | Status |
|-----------|----------|--------|
| T-05-01: lat/lng from DB only | app/api/auctions/feed/route.ts | Applied — consumerProfiles.findFirst, no searchParams lat/lng |
| T-05-02: sortBy whitelist | app/api/auctions/feed/route.ts | Applied — VALID_SORT_BY array check |
| T-05-03: category whitelist | app/api/auctions/feed/route.ts + queries.ts | Applied — listingCategoryValues filter |
| T-05-04: offset clamping | app/api/auctions/feed/route.ts | Applied — Math.max(0, ...) |
| T-05-05: active-only | lib/auctions/queries.ts | Applied — eq(auctions.status, "active") |

## Self-Check: PASSED
