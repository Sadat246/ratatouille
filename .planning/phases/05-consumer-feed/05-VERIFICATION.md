---
phase: 05-consumer-feed
verified: 2026-04-18T06:05:00Z
status: human_needed
score: 13/14 must-haves verified
overrides_applied: 1
overrides:
  - must_have: "Bid and Buy Now CTAs are visible but disabled with 'Bidding opens in a future update' caption"
    reason: "The plan explicitly instructed skipping the disabled-CTA section to preserve Phase 4's fully functional AuctionBidPanel. The functional bid/buyout CTAs from Phase 4 are present, which exceeds the placeholder intent of D-09. No regression in user experience — consumers can actually bid."
    accepted_by: "plan-author (05-04-PLAN.md task note)"
    accepted_at: "2026-04-18T09:38:30Z"
human_verification:
  - test: "Open /shop on a mobile device (or Chrome DevTools mobile emulation). Scroll past 3 auction cards."
    expected: "PWA install banner slides up from bottom. Dismissing it stores a sessionStorage key and it does not re-appear within the same browser session."
    why_human: "beforeinstallprompt API and sessionStorage dismiss guard require a real browser session; untestable with vitest."
  - test: "Open any auction detail page (/shop/[auctionId]). Open Chrome DevTools Network tab. Wait 12-15 seconds."
    expected: "A fetch request to /api/auctions/[id] fires every ~12 seconds while the auction is active. When the page is closed/unmounted, no additional requests fire."
    why_human: "setInterval timing and cleanup-on-unmount require browser runtime observation; not unit-testable."
  - test: "On the auction detail page, verify the photo carousel is swipeable. Open a listing with multiple images."
    expected: "Photos swipe left/right. Dot indicators update to reflect current slide. Fallback gradient shows when no images are present."
    why_human: "Touch gesture and Embla carousel scroll behavior require device or DevTools touch emulation."
---

# Phase 5: Consumer Feed & Discovery Verification Report

**Phase Goal:** Consumers land on an endless-scroll feed of nearby active listings, filter/sort by distance and time-left, open a listing detail page, and install the PWA on their device.
**Verified:** 2026-04-18T06:05:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Feed API returns only auctions within 5 miles of the consumer's stored lat/lng | ✓ VERIFIED | `lib/auctions/queries.ts` — `FEED_RADIUS_MILES = 5.0`, bounding-box pre-filter + exact haversine WHERE clause `<= FEED_RADIUS_MILES` |
| 2 | Feed API accepts sortBy=ending_soon\|nearest\|lowest_price and returns results in the correct order | ✓ VERIFIED | `getAuctionFeed` dynamic ORDER BY; `app/api/auctions/feed/route.ts` VALID_SORT_BY whitelist; 8 vitest tests pass |
| 3 | Feed API accepts category filter params and returns only matching listings | ✓ VERIFIED | `inArray(listings.category, validCategories)` in queries.ts; `listingCategoryValues` whitelist in route.ts |
| 4 | Feed API returns offset-based pagination with hasMore + nextOffset | ✓ VERIFIED | route.ts: fetches `LIMIT+1`, returns `{ ok, items, nextOffset, hasMore }` |
| 5 | Consumer lat/lng is always read from the server-side DB profile, never from request params | ✓ VERIFIED | route.ts uses `db.query.consumerProfiles.findFirst`; no `searchParams.get("lat")` or `searchParams.get("lng")` present |
| 6 | FilterChipRow renders sort chips and category chips in a sticky horizontally-scrollable row | ✓ VERIFIED | `filter-chip-row.tsx` — `sticky top-0 z-20`, `role="toolbar"`, 3 sort options, All + 10 category chips from `listingCategoryValues` |
| 7 | FilterChipRow active chips show accent orange (#f75d36 bg + white text) | ✓ VERIFIED | `CHIP_ACTIVE = "...bg-[#f75d36]...text-white..."` in filter-chip-row.tsx |
| 8 | FeedCardSkeleton renders animate-pulse card matching AuctionCard layout | ✓ VERIFIED | `feed-card-skeleton.tsx` — `animate-pulse`, `aspect-[4/3]` photo, 3-col metrics, footer bar |
| 9 | ListingPhotoCarousel uses embla-carousel-react, renders images, includes dot indicators, shows gradient fallback | ✓ VERIFIED | `listing-photo-carousel.tsx` — `useEmblaCarousel`, `role="tablist"`, dot indicator buttons with `aria-selected`, gradient fallback on `images.length === 0` |
| 10 | InstallPromptBanner dismisses to sessionStorage, handles Android and iOS flows | ✓ VERIFIED | `install-prompt-banner.tsx` — `sessionStorage.getItem/setItem("pwa-install-dismissed")`, `beforeinstallprompt` listener, `isIos` branch, `fixed inset-x-0 bottom-[72px]` |
| 11 | Consumer lands on /shop and sees an endless-scroll feed of nearby active auctions with filter chips | ✓ VERIFIED | `shop/page.tsx` reads consumer lat/lng, calls `getAuctionFeed`, passes `initialItems` to `FeedClient`; `FeedClient` renders `FilterChipRow` + `AuctionCard` list + IntersectionObserver sentinel |
| 12 | Scroll to bottom loads more cards (IntersectionObserver infinite scroll) | ✓ VERIFIED | `feed-client.tsx` — two IntersectionObserver instances (`sentinelRef`, `installSentinelRef`); `loadMore` fetches `/api/auctions/feed?offset=...` |
| 13 | Detail page shows swipeable photo carousel and distance display in business section | ✓ VERIFIED | `auction-detail-client.tsx` — `<ListingPhotoCarousel images={auction.listing.images} />`, `{distanceMiles.toFixed(1)} mi away` pill in business section |
| 14 | Bid and Buy Now CTAs are visible but disabled with "Bidding opens in a future update" caption | ✓ VERIFIED (override) | Override applied — Phase 4's functional AuctionBidPanel is preserved instead. Plan 04 explicitly instructed this; functional CTAs exceed the placeholder intent of D-09. |

**Score:** 14/14 truths verified (13 direct + 1 override)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `lib/auctions/queries.ts` | getAuctionFeed with geo+filter+pagination, EARTH_RADIUS_MILES | ✓ VERIFIED | Contains `EARTH_RADIUS_MILES = 3959`, `FEED_RADIUS_MILES = 5.0`, `distanceMiles: number | null`, `.offset(offset)`, `least(1.0`, category filter, dynamic ORDER BY |
| `lib/auctions/geo.ts` | computeHaversine pure function | ✓ VERIFIED | Exports `computeHaversine(lat1, lng1, lat2, lng2): number` with `Math.min(1.0, inner)` guard |
| `lib/auctions/feed-utils.ts` | sortItems, filterByCategories utilities | ✓ VERIFIED | Exports both functions; `sortItems` covers ending_soon, nearest, lowest_price; `filterByCategories` returns all on empty array |
| `app/api/auctions/feed/route.ts` | Paginated feed route handler, exports GET | ✓ VERIFIED | Contains `searchParams.get("sortBy")`, `searchParams.getAll("category")`, `consumerProfiles.findFirst`, returns `{ ok, items, nextOffset, hasMore }` |
| `tests/lib/auctions/geo-queries.test.ts` | Haversine formula unit tests | ✓ VERIFIED | 4 tests — same point = 0, SF-Oakland ~8.3mi, SF-internal ~2.0mi, acos guard path |
| `tests/lib/auctions/feed-queries.test.ts` | Sort/filter logic unit tests | ✓ VERIFIED | 4 tests — ending_soon sort, lowest_price sort, dairy filter, empty categories returns all |
| `components/auction/filter-chip-row.tsx` | FilterChipRow component | ✓ VERIFIED | "use client", `role="toolbar"`, `aria-pressed`, `listingCategoryValues` import, `sticky top-0 z-20`, `#f75d36`, `min-h-[44px]` |
| `components/auction/feed-card-skeleton.tsx` | Skeleton loader card | ✓ VERIFIED | `animate-pulse`, `aspect-[4/3]`, 3-col metric grid, footer |
| `components/auction/listing-photo-carousel.tsx` | Embla carousel for listing photos | ✓ VERIFIED | `useEmblaCarousel`, `role="tablist"`, `aria-label="Photo N of M"`, `aspect-[4/3]`, gradient fallback `#fff5eb` |
| `components/pwa/install-prompt-banner.tsx` | PWA install prompt banner | ✓ VERIFIED | "use client", sessionStorage dismiss guard, `beforeinstallprompt`, iOS branch, `fixed inset-x-0 bottom-[72px]`, dismiss button with `aria-label` |
| `app/(consumer)/shop/page.tsx` | Server Component with geo-aware initial feed | ✓ VERIFIED | `latitude: true, longitude: true` in consumerProfiles columns, `FeedClient` import, no `SectionCard` or `shopperNotes` |
| `components/auction/feed-client.tsx` | Client component with infinite scroll + filter state | ✓ VERIFIED | "use client", `IntersectionObserver`, `sentinelRef`, `installSentinelRef`, `FilterChipRow` import, `FeedCardSkeleton` import, `InstallPromptBanner` import, "Nothing nearby right now" empty state, `setItems([])` on filter reset |
| `components/auction/auction-card.tsx` | Extended card with distanceMiles + categoryBadge | ✓ VERIFIED | `distanceMiles?: number | null`, `categoryBadge?: string | null`, `distanceMiles.toFixed(1)} mi away`, `absolute right-2 top-2`, `aria-hidden="true"`, `aspect-[4/3]` |
| `app/(consumer)/shop/[auctionId]/page.tsx` | Server Component passing consumer distance to detail client | ✓ VERIFIED | `latitude: true, longitude: true` columns, `computeHaversine` import, `businessGeo` variable, `distanceMiles={distanceMiles}` on AuctionDetailClient |
| `components/auction/auction-detail-client.tsx` | Detail client with carousel, 12s polling, distance display | ✓ VERIFIED | `ListingPhotoCarousel` import + usage, `12_000` interval (no `2_000`), `distanceMiles?: number | null` in props, distance pill rendered |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app/api/auctions/feed/route.ts` | `lib/auctions/queries.ts` | `getAuctionFeed({ lat, lng, sortBy, categories, limit, offset })` | ✓ WIRED | Import + call at line 53 of route.ts |
| `app/api/auctions/feed/route.ts` | `db.query.consumerProfiles` | `consumerProfiles.findFirst` (server-side lat/lng) | ✓ WIRED | Line 38 in route.ts reads from DB |
| `components/auction/filter-chip-row.tsx` | `lib/listings/categories.ts` | `listingCategoryValues + listingCategoryLabels` imports | ✓ WIRED | Line 3 of filter-chip-row.tsx |
| `components/auction/listing-photo-carousel.tsx` | `embla-carousel-react` | `useEmblaCarousel` hook | ✓ WIRED | Line 3 of listing-photo-carousel.tsx |
| `app/(consumer)/shop/page.tsx` | `components/auction/feed-client.tsx` | `FeedClient initialItems` + viewerUserId props | ✓ WIRED | Lines 52-55 of shop/page.tsx |
| `components/auction/feed-client.tsx` | `app/api/auctions/feed` | `fetch('/api/auctions/feed?offset=...&sortBy=...&category=...')` | ✓ WIRED | Line 50 of feed-client.tsx |
| `components/auction/feed-client.tsx` | `components/auction/auction-card.tsx` | `AuctionCard distanceMiles + categoryBadge props` | ✓ WIRED | Lines 163-199 of feed-client.tsx pass both props |
| `app/(consumer)/shop/[auctionId]/page.tsx` | `components/auction/auction-detail-client.tsx` | `AuctionDetailClient initialAuction + distanceMiles` | ✓ WIRED | Line 81 of detail page.tsx |
| `components/auction/auction-detail-client.tsx` | `components/auction/listing-photo-carousel.tsx` | `ListingPhotoCarousel images={auction.listing.images}` | ✓ WIRED | Line 149 of auction-detail-client.tsx |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `components/auction/feed-client.tsx` | `items: AuctionFeedItem[]` | `initialItems` from ShopPage (SSR) + `fetch /api/auctions/feed` on scroll/filter | `getAuctionFeed` queries `auctions` + `businesses` + `listingImages` tables with real haversine filter | ✓ FLOWING |
| `components/auction/auction-detail-client.tsx` | `auction: AuctionDetailState` | `initialAuction` from Server Component + `/api/auctions/:id` poll every 12s | `getAuctionDetail` joins auctions+listings+businesses+bids tables | ✓ FLOWING |
| `components/auction/listing-photo-carousel.tsx` | `images: string[]` | `auction.listing.images` from `getAuctionDetail` | `listingImages` table SELECT by listingId, ordered by sortOrder | ✓ FLOWING |
| `components/auction/auction-card.tsx` | `distanceMiles?: number` | `AuctionFeedItem.distanceMiles` from `getAuctionFeed` | Haversine SQL expression computed server-side from real business lat/lng | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| 8 vitest unit tests (haversine + sort/filter) | `npx vitest run tests/lib/auctions/` | 8 passed (2 test files, 300ms) | ✓ PASS |
| Feed route rejects unauthenticated requests | `authorizeApiRole("consumer")` guard at line 16 of route.ts | Code inspection confirms 401 returned when not ok | ✓ PASS |
| No lat/lng from request params (security) | `grep searchParams.get.*lat route.ts` | 0 matches | ✓ PASS |
| 12s polling (not 2s) | `grep 12_000 auction-detail-client.tsx` | Found at line 120; `2_000` not present | ✓ PASS |
| PWA install banner visible behavior | Requires browser with `beforeinstallprompt` | — | ? SKIP (needs human) |
| Photo carousel swipe behavior | Requires touch emulation | — | ? SKIP (needs human) |
| Polling cleanup on unmount | `clearInterval` at line 122 of detail client | Code inspection confirms `return () => window.clearInterval(timer)` | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| D-01 | 05-03 | Full-bleed product photo as primary visual anchor | ✓ SATISFIED | AuctionCard `aspect-[4/3] w-full` photo area; feed card shows image fills card top |
| D-02 | 05-03 | Card info: title, countdown, current bid, buyout, distance | ✓ SATISFIED | AuctionCard renders eyebrow, title, metrics (current/buyout/bids), distance pill, AuctionCountdown |
| D-03 | 05-02, 05-03 | Category badge overlaid on photo corner | ✓ SATISFIED | `categoryBadge` prop on AuctionCard, `absolute right-2 top-2` overlay span |
| D-04 | 05-02, 05-03 | Sticky horizontally-scrollable chip row | ✓ SATISFIED | FilterChipRow `sticky top-0 z-20`, `overflow-x-auto` |
| D-05 | 05-01, 05-03 | Three sort options: Ending soon, Nearest first, Lowest price | ✓ SATISFIED | SORT_OPTIONS array in FilterChipRow; VALID_SORT_BY in route; ORDER BY in queries |
| D-06 | 05-01, 05-03 | Category multi-select chips; All resets | ✓ SATISFIED | FilterChipRow toggle logic; `inArray` in feed query; `handleAllCategories` resets to `[]` |
| D-07 | 05-01 | Fixed 5-mile radius; friendly empty state when nothing nearby | ✓ SATISFIED | `FEED_RADIUS_MILES = 5.0`; "Nothing nearby right now" empty state in FeedClient |
| D-08 | 05-02, 05-04 | Listing detail: photo carousel (swipeable), auction details below | ✓ SATISFIED | `ListingPhotoCarousel` with Embla, dot indicators; live countdown, metrics in detail client |
| D-09 | 05-04 | Bid/buyout CTAs visible but disabled (placeholder) | ✓ SATISFIED (override) | Functional Phase 4 `AuctionBidPanel` present instead; exceeds placeholder intent; plan explicitly preserved this |
| D-10 | 05-04 | Auction info: live countdown, current bid, bid count, buyout | ✓ SATISFIED | `auction-detail-client.tsx` renders AuctionCountdown + current/reserve/buyout metrics + bid count badge |
| D-11 | 05-04 | Business section: store name, distance, pickup instructions | ✓ SATISFIED | Detail client shows business name, `formatLocationLabel`, pickup hours + instructions section, distance pill |
| D-12 | 05-04 | Live data refresh via polling every 10-15 seconds | ✓ SATISFIED | `setInterval(..., 12_000)` at line 120 of auction-detail-client.tsx; `clearInterval` on unmount |
| D-13 | 05-01 | Haversine on existing lat/lng columns (no PostGIS) | ✓ SATISFIED | `computeHaversine` in geo.ts; SQL `acos(least(1.0,...))` in queries.ts |
| D-14 | 05-02, 05-03 | PWA install prompt: value-first, after seeing content, dismissed = not shown again in session | ✓ SATISFIED (code) / ? NEEDS HUMAN (behavior) | InstallPromptBanner with sessionStorage dismiss guard; triggered after card #3 via IntersectionObserver sentinel; visual/timing verification needs human |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `components/auction/auction-card.tsx` | 86 | `style={{ backgroundImage: \`url(${imageUrl})\` }}` — unsanitised URL in CSS style attribute | ⚠️ Warning (per code review CR-01) | Potential XSS if a crafted URL is stored by a compromised seller; mitigated somewhat since URLs come from DB via seller upload, but protocol not enforced |
| `components/auction/listing-photo-carousel.tsx` | 41 | Same pattern — `style={{ backgroundImage: \`url(${url})\` }}` | ⚠️ Warning (per code review CR-01) | Same XSS vector |
| `components/auction/feed-client.tsx` | 19 | `_viewerUserId` — prop received but never used (prefixed to suppress lint) | ℹ️ Info (IN-01) | Dead API surface area; no functional impact |
| `components/auction/filter-chip-row.tsx` | 57,72,85 | `role="button"` on `<button>` elements — redundant ARIA role | ℹ️ Info (IN-03) | Redundant, not harmful |
| `components/auction/listing-photo-carousel.tsx` | 38,55 | Array index as React `key` on stable image list | ℹ️ Info (IN-04) | May cause incorrect DOM reuse if images array length changes during polling |

Note: Anti-patterns listed here are pre-existing findings from the 05-REVIEW.md code review. None constitute goal-blocking stubs — all core functionality is implemented and wired. The XSS findings (CR-01) are warnings about defensive hardening, not functional gaps.

### Human Verification Required

#### 1. PWA Install Banner (D-14)

**Test:** Open `/shop` on a mobile device or Chrome DevTools mobile emulation. Scroll past at least 3 auction cards.
**Expected:** The PWA install banner slides up from the bottom (above bottom nav). Dismiss it by tapping "x". Navigate away and back — the banner should NOT reappear within the same browser session (sessionStorage persists across SPA navigation).
**Why human:** The `beforeinstallprompt` event requires a real browser context that meets PWA installability criteria. `sessionStorage` dismiss behavior requires browser runtime.

#### 2. Detail Page Polling (D-12)

**Test:** Open any active auction detail page (`/shop/[auctionId]`). Open Chrome DevTools Network tab (filter by XHR/Fetch). Wait 25-30 seconds.
**Expected:** A fetch to `/api/auctions/[id]` fires approximately every 12 seconds while the page is open. Navigate back to `/shop` — no further fetches for that auction ID should appear.
**Why human:** `setInterval` timing and `clearInterval` cleanup-on-unmount require browser runtime observation; not verifiable with grep or vitest.

#### 3. Photo Carousel Swipe (D-08)

**Test:** Open an auction detail page that has multiple listing photos. On mobile (or DevTools touch emulation), swipe left and right through the photo area.
**Expected:** Photos swipe horizontally. The dot indicator at the bottom updates to highlight the current photo. For a listing with no images, a warm gradient placeholder fills the carousel area.
**Why human:** Embla carousel touch gesture and scroll snap behavior require device or touch emulation runtime.

### Gaps Summary

No blocking gaps. All 14 requirements (D-01 through D-14) are satisfied at the code level. The 1 override (D-09 disabled CTAs) is intentional and documented in the plan itself — the Phase 4 functional bid panel is preserved, which exceeds the Phase 5 placeholder requirement.

3 items require human verification before the phase can be marked fully passed:
- PWA install banner trigger and dismiss behavior (D-14)
- 12-second polling interval observed in browser (D-12)
- Photo carousel touch-swipe behavior (D-08)

The code-review-identified XSS warning (CR-01) regarding unsanitised `background-image` URLs is a security hardening concern. It does not block the consumer feed goal but should be addressed before production launch.

---

_Verified: 2026-04-18T06:05:00Z_
_Verifier: Claude (gsd-verifier)_
