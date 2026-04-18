---
phase: 05-consumer-feed
reviewed: 2026-04-18T00:00:00Z
depth: standard
files_reviewed: 16
files_reviewed_list:
  - lib/auctions/queries.ts
  - lib/auctions/geo.ts
  - lib/auctions/feed-utils.ts
  - app/api/auctions/feed/route.ts
  - vitest.config.ts
  - tests/lib/auctions/geo-queries.test.ts
  - tests/lib/auctions/feed-queries.test.ts
  - components/auction/filter-chip-row.tsx
  - components/auction/feed-card-skeleton.tsx
  - components/auction/listing-photo-carousel.tsx
  - components/pwa/install-prompt-banner.tsx
  - app/(consumer)/shop/page.tsx
  - components/auction/feed-client.tsx
  - components/auction/auction-card.tsx
  - components/auction/auction-detail-client.tsx
  - app/(consumer)/shop/[auctionId]/page.tsx
findings:
  critical: 1
  warning: 5
  info: 4
  total: 10
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-04-18T00:00:00Z
**Depth:** standard
**Files Reviewed:** 16
**Status:** issues_found

## Summary

This phase introduces the consumer feed and discovery experience: a geo-filtered auction feed with infinite scroll, filter/sort chips, a detail page with live polling, a photo carousel, and a PWA install prompt. The overall architecture is clean — the API route correctly reads coordinates from the database rather than trusting request params, the haversine guard is solid, and the server/client split is well-structured.

Three areas require attention before shipping:

1. **Critical — XSS via unsanitised image URL in CSS `background-image`** in both `AuctionCard` and `AuctionDetailClient`. Image URLs come from the database, but they are injected verbatim into a `style` attribute without sanitisation.
2. **Several warnings** around stale-closure bugs in the infinite-scroll `useEffect`, a redundant database round-trip on the detail page, a missing `"nearest"` sort test, and an unchecked `Number()` cast that can silently produce `NaN`.
3. **Info items** including a dead `_viewerUserId` prop, duplicate `SortBy` type definitions, a redundant `role="button"` on `<button>` elements, and array index keys on stable lists.

---

## Critical Issues

### CR-01: XSS via unescaped image URL in inline `background-image` style

**File:** `components/auction/auction-card.tsx:87`
**Issue:** The `imageUrl` prop is placed directly into a CSS `style` attribute as `url(${imageUrl})` without sanitisation. If an attacker can store a crafted URL such as `); expression(alert(1)) //` or a `javascript:` URI in the database (e.g., via a compromised seller account or a bug elsewhere in the upload pipeline), it will be rendered verbatim in the browser. The same pattern appears in `components/auction/auction-detail-client.tsx` — images are passed as an array through `ListingPhotoCarousel` and rendered via `style={{ backgroundImage: \`url(${url})\` }}` at line 41 of `listing-photo-carousel.tsx`.

**Fix:** Use an `<img>` tag (or Next.js `<Image>`) instead of `background-image`. If you must keep the CSS approach, sanitise the URL by rejecting anything that is not an `http`/`https` URL before injecting it:

```tsx
// Preferred — replaces the bg-image div in AuctionCard:
{imageUrl ? (
  <img
    src={imageUrl}
    alt=""
    aria-hidden="true"
    className="aspect-[4/3] w-full rounded-[1.6rem] object-cover border border-[#f4ddcf]"
  />
) : (
  <div className="aspect-[4/3] w-full rounded-[1.6rem] border border-[#f4ddcf] bg-[linear-gradient(140deg,#fff5eb_0%,#ffe1c0_48%,#ffb87c_100%)]" />
)}

// OR — minimal sanitiser if you keep the inline style:
function safeImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return undefined;
    return url;
  } catch {
    return undefined;
  }
}
```

The same fix must be applied to `components/auction/listing-photo-carousel.tsx:41`.

---

## Warnings

### WR-01: Stale closure — `isLoading` captured in `loadMore` prevents concurrent-safe pagination

**File:** `components/auction/feed-client.tsx:31-75`
**Issue:** `loadMore` is wrapped in `useCallback` with `[isLoading]` as its only dependency. This means a new `loadMore` reference is created every time `isLoading` changes. The infinite-scroll `useEffect` (line 78) lists `loadMore` in its deps via the eslint-disable comment but re-observes a new sentinel every time `isLoading` flips. More importantly, the guard `if (isLoading) return;` inside `loadMore` reads a stale closure value of `isLoading` rather than using a ref, so rapid intersection events can bypass it and fire multiple concurrent loads.

**Fix:** Use a `useRef` guard instead of relying on the state variable inside the callback:

```tsx
const isLoadingRef = useRef(false);

const loadMore = useCallback(async (...) => {
  if (isLoadingRef.current) return;
  isLoadingRef.current = true;
  setIsLoading(true);
  try {
    // ... fetch ...
  } finally {
    isLoadingRef.current = false;
    setIsLoading(false);
  }
}, []); // stable reference — no isLoading dependency needed
```

---

### WR-02: Redundant database query on auction detail page — business geo already fetched by `getAuctionDetail`

**File:** `app/(consumer)/shop/[auctionId]/page.tsx:51-65`
**Issue:** `getAuctionDetail` already joins the `businesses` table and returns business `city`/`state`. However the page issues a second, separate DB query to fetch `businesses.latitude` and `businesses.longitude` for the haversine calculation. The `getAuctionDetail` return type (`AuctionDetail`) does not include lat/lng, so the extra query is necessary given the current API shape. But the double join on the same row is wasteful and adds latency on the hot detail-page path.

**Fix:** Extend the `AuctionDetail` type and `getAuctionDetail` query to include `businessLatitude` and `businessLongitude`, then remove the secondary `db.select` call in the page:

```ts
// In lib/auctions/queries.ts — add to AuctionDetail type:
business: {
  ...
  latitude: number | null;
  longitude: number | null;
};

// In getAuctionDetail select object:
businessLatitude: businesses.latitude,
businessLongitude: businesses.longitude,

// In app/(consumer)/shop/[auctionId]/page.tsx — replace the extra db query:
const { lat: bizLat, lng: bizLng } = {
  lat: auction.business.latitude,
  lng: auction.business.longitude,
};
if (consumerLat != null && consumerLng != null && bizLat != null && bizLng != null) {
  distanceMiles = computeHaversine(consumerLat, consumerLng, bizLat, bizLng);
}
```

---

### WR-03: `sortItems("nearest", ...)` has no test coverage

**File:** `tests/lib/auctions/feed-queries.test.ts:68-83`
**Issue:** The test suite covers `ending_soon` and `lowest_price` sort modes but omits `nearest`. The `nearest` branch in `feed-utils.ts` uses a `Infinity` fallback for null `distanceMiles`, which is the most complex logic in that function. A regression there (e.g., inverting the comparator) would go undetected.

**Fix:** Add a test:

```ts
it('Test 9: sortBy "nearest" puts closest distanceMiles first, nulls last', () => {
  const items = [item1, item2, item3]; // distanceMiles: 1.5, 3.2, 0.4
  const sorted = sortItems(items, "nearest");
  expect(sorted[0].id).toBe("c"); // 0.4 mi
  expect(sorted[1].id).toBe("a"); // 1.5 mi
  expect(sorted[2].id).toBe("b"); // 3.2 mi
});
```

---

### WR-04: Silent `NaN` from `Number()` when DB aggregate returns a string

**File:** `lib/auctions/queries.ts:364-368`
**Issue:** The `stats.myTopBidAmountCents` value comes from a raw SQL `max()` aggregate. Drizzle types it as `number | null` but some database drivers return aggregates as strings at runtime. The null-check at line 366 correctly guards the `null` case, but `Number("some-non-numeric-string")` would silently produce `NaN` rather than crashing. This is the same pattern used in `getMyBidAuctions` (line 526). While unlikely to trigger today, it is the same class of defect as the existing `toNumber` helper was introduced to solve (line 16-18), yet `toNumber` is not used here.

**Fix:** Use the existing `toNumber` helper or add an explicit `isNaN` guard:

```ts
myTopBidAmountCents:
  stats?.myTopBidAmountCents == null
    ? null
    : toNumber(stats.myTopBidAmountCents) || null,
```

The same fix applies to `getMyBidAuctions` line 526.

---

### WR-05: `sweepOverdueAuctions` called on every feed page load, including the server-rendered shop page

**File:** `app/(consumer)/shop/page.tsx:22` and `app/api/auctions/feed/route.ts:51`
**Issue:** `sweepOverdueAuctions` is awaited synchronously on both the server-rendered shop page and on every paginated API call. This means every page load and every infinite-scroll fetch triggers a DB write sweep. If `AUCTION_SWEEP_BATCH_SIZE` is large, this adds measurable latency to every consumer request. Calling the sweep from the API route (which is hit on every page-turn) is particularly aggressive.

**Fix:** Move the sweep to a background job (cron or edge function). If it must stay inline, call it only from the initial server render (`shop/page.tsx`) — not from the paginated API route — and fire it in a non-blocking way:

```ts
// In route.ts — fire-and-forget, don't block the response:
void sweepOverdueAuctions(AUCTION_SWEEP_BATCH_SIZE);
// ... then immediately proceed to getAuctionFeed
```

---

## Info

### IN-01: Dead prop — `viewerUserId` is received but unused in `FeedClient`

**File:** `components/auction/feed-client.tsx:19`
**Issue:** The `viewerUserId` prop is destructured as `_viewerUserId` (prefixed to suppress the unused-var lint warning), meaning it is accepted but never used. The feed API route derives the viewer identity from the session, not from this prop, so there is no functional gap. But it adds dead surface area to the public component API.

**Fix:** Remove the prop from `FeedClientProps` and from the `ShopPage` call site, or use it (e.g., to highlight winning cards client-side without a re-fetch).

---

### IN-02: Duplicate `SortBy` type defined in three separate files

**File:** `lib/auctions/queries.ts:10`, `lib/auctions/feed-utils.ts:3`, `components/auction/filter-chip-row.tsx:5`, `components/auction/feed-client.tsx:12`
**Issue:** The `SortBy` / `SortByOption` type is independently defined in four places. They are identical today but will drift if a new sort option is added.

**Fix:** Export `SortBy` from `lib/auctions/queries.ts` (it is already exported there) and import it everywhere else. Remove the local redefinitions.

---

### IN-03: Redundant `role="button"` on `<button>` elements

**File:** `components/auction/filter-chip-row.tsx:57, 72, 85`
**Issue:** All chip `<button>` elements carry an explicit `role="button"` attribute. A `<button>` element already has an implicit ARIA role of `button`; the explicit attribute is redundant and can confuse screen-reader heuristics.

**Fix:** Remove all `role="button"` attributes from the `<button>` elements in this file.

---

### IN-04: Array index used as `key` on a stable rendered list in `ListingPhotoCarousel`

**File:** `components/auction/listing-photo-carousel.tsx:38, 55`
**Issue:** Both the slide `<div>` elements (line 38) and the dot navigation buttons (line 55) use the array index as the React `key`. If the `images` array can change in length (e.g., after a re-render triggered by the live-polling refresh in `AuctionDetailClient`), React may reuse DOM nodes incorrectly. The image URL itself is a stable, unique identity.

**Fix:** Use the image URL as the key:

```tsx
{images.map((url, i) => (
  <div key={url} className="min-w-0 flex-[0_0_100%]">
    ...
  </div>
))}
```

---

_Reviewed: 2026-04-18T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
