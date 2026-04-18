# Phase 5: Consumer Feed & Discovery - Research

**Researched:** 2026-04-18
**Domain:** Next.js App Router infinite scroll, geo-distance queries, PWA install, React countdown timers, Embla Carousel
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01–D-03:** Full-bleed product photo cards; info below (title, countdown, bid/buyout, distance); category badge overlaid on photo corner.
- **D-04–D-07:** Sticky horizontal chip row; three sort options (Ending soon default, Nearest first, Lowest price); multi-select category chips; fixed 5-mile radius.
- **D-08–D-12:** Detail page: photo carousel + scrollable details, bid/buyout CTAs are placeholder-only (disabled), auction info (countdown, bid count, buyout), business section (name, distance, pickup instructions), polling every 10–15 seconds.

### Claude's Discretion
- Geo filtering: haversine on existing lat/lng columns (D-13) — no PostGIS.
- PWA install prompt: placement and timing (D-14) — value-first, after feed content is visible.
- Infinite scroll mechanics: cursor-based vs offset, scroll trigger pattern.
- Empty state design (no nearby listings).
- Sold/expired listing treatment on feed and detail.

### Deferred Ideas (OUT OF SCOPE)
- Adjustable distance radius slider.
- Real-time WebSocket/SSE bid updates.
- Bid history list on detail page.
- Consumer profile / bid history page.
- Search by product name.
</user_constraints>

---

## Summary

Phase 5 builds on a well-established codebase. The core auction display infrastructure already exists — `AuctionCard`, `AuctionCountdown`, `AuctionDetailClient`, `InstallCard`, and `PwaBoot` are all production-ready in the repo. The primary work is **upgrading the existing flat feed** (`/shop` page and `getAuctionFeed` query) to support geo-distance filtering, multi-column sorting, category chips, and infinite scroll pagination.

The standard pattern for this stack is: Server Component renders the initial page with first batch of items, a Client Component wrapper handles IntersectionObserver scroll detection and calls either a Server Action or a route handler to load more. Given that the project already has route handlers (`/api/auctions/feed`), the route handler approach is lower friction and avoids Server Action caveats with `useFormState`. For the haversine query, PostgreSQL has native `cos`/`sin`/`acos`/`radians` functions — no extension needed. Bounding box pre-filter is the standard optimization: narrow candidates by lat/lng range (index scan), then compute exact haversine only on the resulting rows.

The `AuctionCountdown` component already solves the hydration mismatch problem correctly — it initialises `useState(() => Date.now())` client-side so no server date is ever rendered. The polling pattern in `AuctionDetailClient` uses `useEffectEvent` (React 19 stable) to avoid stale closures, which is the correct approach for this React version. Both patterns are reference-worthy for any new components in this phase.

**Primary recommendation:** Extend the existing `getAuctionFeed` query to accept `{ lat, lng, sortBy, categories, cursor }` params, add an offset-based pagination API route, and wrap the feed page in a thin client scroll trigger component. Do not add new libraries beyond `embla-carousel-react` for the detail page photo carousel.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Feed initial render | Frontend Server (SSR) | — | Server Component fetches first page, avoids client waterfall |
| Infinite scroll trigger | Browser / Client | — | IntersectionObserver is browser API; must be client component |
| Haversine distance filter | Database / Storage | API / Backend | SQL does the math; route handler orchestrates |
| Sort/category state | Browser / Client | API / Backend | URL params or client state drive re-fetch |
| Photo carousel | Browser / Client | — | Touch events require client component |
| Auction detail polling | Browser / Client | API / Backend | setInterval in client component; route handler serves data |
| PWA install prompt | Browser / Client | — | beforeinstallprompt is browser event; client component only |
| Countdown timer | Browser / Client | — | setInterval must run client-side to avoid hydration mismatch |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js (App Router) | 16.2.4 (installed) | SSR + route handlers | Already in project |
| Drizzle ORM | 0.45.2 (installed) | DB queries with `sql` template | Already in project |
| date-fns | 4.1.0 (installed) | Duration formatting, date math | Already in project; `formatDistanceToNow` + manual formatting |
| React 19 | 19.2.4 (installed) | `useEffectEvent` for stale-closure-free polling | Already in project |
| Tailwind CSS v4 | installed | Utility classes, `aspect-[4/3]`, `animate-pulse` skeleton | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| embla-carousel-react | 8.6.0 (latest) | Swipeable photo carousel on listing detail | Only on detail page; 3-image product/seal/expiry carousel |
| react-intersection-observer | 10.0.3 (latest) | IntersectionObserver hook for scroll trigger | Optional wrapper; can also use raw `new IntersectionObserver` in `useEffect` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| embla-carousel-react | swiper, keen-slider | Embla is lightest (~4 KB), zero dependencies, matches existing project minimalism |
| react-intersection-observer | Raw IntersectionObserver in useEffect | Library adds 2 KB but simplifies cleanup; raw API is fine for single use case |
| Route handler for pagination | Server Action | Route handler is already established pattern in this repo (`/api/auctions/feed`); Server Actions add Form/transition complexity for paginated fetching |

**Installation (new library only):**
```bash
npm install embla-carousel-react
```

**Version verification:** [VERIFIED: npm registry] — embla-carousel-react@8.6.0 confirmed as latest.

---

## Architecture Patterns

### System Architecture Diagram

```
Consumer Browser
   │
   ├─ GET /shop (Server Component)
   │    ├─ reads session → consumerProfiles (lat/lng)
   │    ├─ calls getAuctionFeed({ lat, lng, sortBy, categories, limit, cursor })
   │    │    └─ Postgres query: bounding box WHERE + haversine SELECT + ORDER BY + LIMIT
   │    └─ renders <FeedPage initialItems={...} totalCount={...} />
   │
   ├─ <FeedPage> (Client Component)
   │    ├─ state: items[], cursor, hasMore, isLoading
   │    ├─ renders <FilterChipRow> (sticky, sorts + categories)
   │    ├─ renders <AuctionCard> list
   │    ├─ renders <div ref={sentinelRef}> (scroll trigger)
   │    └─ IntersectionObserver fires → fetch /api/auctions/feed?cursor=...&sortBy=...&categories=...
   │
   ├─ GET /api/auctions/feed (Route Handler)
   │    ├─ parse: cursor, sortBy, categories, lat, lng (from session)
   │    └─ returns { items, nextCursor, hasMore }
   │
   └─ GET /shop/[auctionId] (Server Component → AuctionDetailClient)
        ├─ initial data: getAuctionDetail(auctionId, userId)
        ├─ <AuctionDetailClient> polls /api/auctions/:id every 12s
        └─ <EmblaCarousel> for product/seal/expiry photos
```

### Recommended Project Structure

```
app/
├── (consumer)/
│   └── shop/
│       ├── page.tsx                  # Server Component — initial feed render
│       ├── [auctionId]/
│       │   └── page.tsx              # Server Component — detail initial render
├── api/
│   └── auctions/
│       ├── feed/
│       │   └── route.ts              # GET — paginated feed (extend existing)
│       └── [auctionId]/
│           └── route.ts              # GET — single auction detail (already exists)
components/
├── auction/
│   ├── feed-client.tsx               # "use client" — scroll trigger, chip state, item accumulation
│   ├── auction-card.tsx              # Already exists — extend with category badge, distance chip
│   ├── auction-countdown.tsx         # Already exists — no changes needed
│   ├── auction-detail-client.tsx     # Already exists — add EmblaCarousel for images
│   ├── filter-chip-row.tsx           # "use client" — sticky horizontal chips
│   └── feed-card-skeleton.tsx        # Skeleton loader for pagination loading state
├── pwa/
│   ├── install-card.tsx              # Already exists
│   └── install-prompt-banner.tsx     # New: bottom-of-feed value-first install nudge
lib/
└── auctions/
    └── queries.ts                    # Extend getAuctionFeed with geo + filter params
```

### Pattern 1: Haversine Geo-Filter with Bounding Box Pre-Filter

**What:** SQL that first eliminates candidates with a cheap bounding box check (index-friendly), then computes exact haversine distance only for the survivors. Returns distance as a selected column for sorting and display.

**When to use:** Any feed query that needs "within 5 miles of consumer."

```typescript
// Source: [VERIFIED: Drizzle ORM docs /drizzle-team/drizzle-orm-docs — sql template]
// Source: [CITED: https://www.plumislandmedia.net/mysql/haversine-mysql-nearest-loc/]
import { sql, and, eq, gte, lte, asc, desc } from "drizzle-orm";
import { businesses, auctions, listings } from "@/db/schema";

const RADIUS_MILES = 5.0;
const LAT_DEGREE_MILES = 69.0; // 1 degree latitude ≈ 69 miles

function auctionFeedWithGeo(params: {
  consumerLat: number;
  consumerLng: number;
  sortBy: "ending_soon" | "nearest" | "lowest_price";
  categories: string[];   // empty = all
  limit: number;
  cursor?: string;        // auctionId for offset-style cursor
}) {
  const { consumerLat, consumerLng, sortBy, categories, limit } = params;

  // Bounding box values (fast WHERE — uses sequential scan but eliminates ~99% of rows)
  const latMin = consumerLat - RADIUS_MILES / LAT_DEGREE_MILES;
  const latMax = consumerLat + RADIUS_MILES / LAT_DEGREE_MILES;
  const lngDelta = RADIUS_MILES / (LAT_DEGREE_MILES * Math.cos((consumerLat * Math.PI) / 180));
  const lngMin = consumerLng - lngDelta;
  const lngMax = consumerLng + lngDelta;

  // Haversine distance in miles as a computed column
  const distanceMiles = sql<number>`
    3959 * acos(least(1.0,
      cos(radians(${consumerLat}))
      * cos(radians(${businesses.latitude}))
      * cos(radians(${businesses.longitude}) - radians(${consumerLng}))
      + sin(radians(${consumerLat}))
      * sin(radians(${businesses.latitude}))
    ))
  `.as("distance_miles");

  // Earth radius 3959 = statute miles; use 6371 for km
  // LEAST(1.0, ...) prevents acos domain error from floating point imprecision

  const orderBy =
    sortBy === "nearest"
      ? asc(distanceMiles)
      : sortBy === "lowest_price"
        ? asc(auctions.reservePriceCents)
        : asc(auctions.scheduledEndAt); // ending_soon default

  return db
    .select({
      id: auctions.id,
      // ... other fields
      distanceMiles,
    })
    .from(auctions)
    .innerJoin(listings, eq(listings.id, auctions.listingId))
    .innerJoin(businesses, eq(businesses.id, auctions.businessId))
    .where(
      and(
        eq(auctions.status, "active"),
        // Bounding box pre-filter
        gte(businesses.latitude, latMin),
        lte(businesses.latitude, latMax),
        gte(businesses.longitude, lngMin),
        lte(businesses.longitude, lngMax),
        // Exact haversine filter — only rows passing bbox reach this
        sql`3959 * acos(least(1.0,
          cos(radians(${consumerLat}))
          * cos(radians(${businesses.latitude}))
          * cos(radians(${businesses.longitude}) - radians(${consumerLng}))
          + sin(radians(${consumerLat}))
          * sin(radians(${businesses.latitude}))
        )) <= ${RADIUS_MILES}`,
        // Category filter (skip when empty)
        categories.length > 0 ? sql`${listings.category} = ANY(${categories})` : undefined,
      ),
    )
    .orderBy(orderBy)
    .limit(limit);
}
```

**Key notes:**
- PostgreSQL has native `cos`, `sin`, `acos`, `radians` — no extension required. [VERIFIED: PostgreSQL math functions are built-in]
- `LEAST(1.0, ...)` prevents `acos` domain error when floating point produces a value slightly above 1.0. This is a known pitfall.
- Earth radius: 3959 for miles, 6371 for km.
- The bounding box pre-filter uses `gte`/`lte` operators on `businesses.latitude` and `businesses.longitude`. These columns currently have no index. For a demo with ~50 businesses this is fine; for production, add a composite index on `(latitude, longitude)`.
- Repeating the haversine expression in WHERE is required in PostgreSQL — you cannot reference a SELECT alias in WHERE. [CITED: PostgreSQL docs]
- Drizzle's `sql<number>` with `.as('alias')` for the computed column is the established pattern. [VERIFIED: Drizzle docs /drizzle-team/drizzle-orm-docs]

### Pattern 2: Offset-Based Infinite Scroll (route handler)

**What:** Simple offset pagination (page × limit). Simpler than cursor-based for sorted feeds where sort column values can change between loads. Acceptable for demo with small datasets.

**When to use:** Feed where sort order may shift between page loads (auction end times change). Cursor-based is better for append-only data; offset is fine here.

```typescript
// Route handler: /api/auctions/feed/route.ts
// Source: [ASSUMED] — standard Next.js App Router route handler pattern

export async function GET(request: Request) {
  const authorization = await authorizeApiRole("consumer");
  if (!authorization.ok) {
    return NextResponse.json(authorization.body, { status: authorization.status });
  }

  const { searchParams } = new URL(request.url);
  const offset = Number(searchParams.get("offset") ?? "0");
  const limit = 12;
  const sortBy = (searchParams.get("sortBy") ?? "ending_soon") as SortBy;
  const categories = searchParams.getAll("category");

  const profile = await getConsumerProfile(authorization.userId);
  if (!profile) {
    return NextResponse.json({ ok: false, error: "No profile" }, { status: 400 });
  }

  const items = await getAuctionFeed({
    lat: profile.latitude,
    lng: profile.longitude,
    sortBy,
    categories,
    limit: limit + 1,  // fetch one extra to detect hasMore
    offset,
  });

  const hasMore = items.length > limit;
  return NextResponse.json({
    ok: true,
    items: items.slice(0, limit),
    nextOffset: hasMore ? offset + limit : null,
    hasMore,
  });
}
```

### Pattern 3: Client Scroll Trigger (FeedClient)

**What:** Client component that renders the server-fetched initial list, observes a sentinel div at the bottom, and appends more items on intersection.

**When to use:** Standard App Router infinite scroll pattern.

```typescript
// Source: [CITED: https://blog.logrocket.com/implementing-infinite-scroll-next-js-server-actions/]
// Modified: uses route handler instead of Server Action
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { AuctionFeedItem } from "@/lib/auctions/queries";

export function FeedClient({
  initialItems,
  consumerLat,
  consumerLng,
}: {
  initialItems: AuctionFeedItem[];
  consumerLat: number | null;
  consumerLng: number | null;
}) {
  const [items, setItems] = useState(initialItems);
  const [offset, setOffset] = useState(initialItems.length);
  const [hasMore, setHasMore] = useState(initialItems.length >= 12);
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState<"ending_soon" | "nearest" | "lowest_price">("ending_soon");
  const [categories, setCategories] = useState<string[]>([]);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);

    const params = new URLSearchParams({
      offset: String(offset),
      sortBy,
      ...(categories.length > 0 && { category: categories }),
    });

    const res = await fetch(`/api/auctions/feed?${params}`);
    const data = await res.json();

    if (data.ok) {
      setItems((prev) => [...prev, ...data.items]);
      setOffset((prev) => prev + data.items.length);
      setHasMore(data.hasMore);
    }
    setIsLoading(false);
  }, [isLoading, hasMore, offset, sortBy, categories]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) void loadMore(); },
      { threshold: 0.1 },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loadMore]);

  // Reset on filter change
  useEffect(() => {
    setOffset(0);
    setHasMore(true);
    setItems([]);
    void loadMore();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, categories]);

  // ... render chips, items, sentinel, skeleton
}
```

**Note on filter reset:** When sortBy or categories change, the offset must reset to 0 and item list must be cleared. This is the most common bug with client-side infinite scroll + filters.

### Pattern 4: Embla Carousel for Photo Carousel

**What:** Lightweight swipe carousel for the 3 listing photos (product/seal/expiry) on the detail page.

```typescript
// Source: [VERIFIED: Context7 /davidjerleke/embla-carousel]
"use client";

import useEmblaCarousel from "embla-carousel-react";

export function ListingPhotoCarousel({ images }: { images: string[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });

  return (
    <div className="overflow-hidden rounded-[2rem]" ref={emblaRef}>
      <div className="flex">
        {images.map((url, i) => (
          <div
            key={i}
            className="relative min-w-0 flex-[0_0_100%]"
          >
            <div
              className="aspect-[4/3] w-full rounded-[2rem] bg-cover bg-center"
              style={{ backgroundImage: `url(${url})` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Note:** Embla is a pure client component — works fine in App Router when wrapped with `"use client"`. No SSR issue because it renders nothing on server beyond the container.

### Pattern 5: Countdown Timer (existing — no changes needed)

The existing `AuctionCountdown` component (`components/auction/auction-countdown.tsx`) already handles:
- Client-only `Date.now()` via `useState(() => Date.now())` initializer — no hydration mismatch
- `setInterval` cleanup in `useEffect` return
- Urgent/ending-soon visual states
- `formatRemaining` covering seconds/minutes/hours/days

**No new countdown component is needed.** Reuse `AuctionCountdown` on feed cards.

### Pattern 6: Polling in AuctionDetailClient (existing — verify interval)

The existing `AuctionDetailClient` polls at 2s (`window.setInterval(..., 2_000)`). The phase spec says 10–15s. Update the interval to `12_000` ms. The `useEffectEvent` pattern (React 19 stable) is already used — this avoids stale closure on `auction.id`.

### Anti-Patterns to Avoid

- **Putting haversine in a Postgres HAVING clause:** PostgreSQL does not allow referencing SELECT aliases in HAVING or WHERE. Repeat the expression. [CITED: PostgreSQL docs]
- **Sorting by the `distanceMiles` alias in `orderBy`:** Drizzle's `asc(distanceMiles)` after `.as()` works, but only when `distanceMiles` is defined in the same `select` call. Do not reference it via string name.
- **Initialising countdown with `new Date()` on server render:** Will cause hydration mismatch. Always use `useState(() => Date.now())` on client.
- **Not resetting offset on filter change:** The most common infinite scroll bug. Changing sort or category without resetting `offset` to 0 will skip items or duplicate them.
- **Using Server Actions for pagination polling:** Server Actions in Next.js 15 add form state overhead. Route handlers are simpler for GET requests with query params.
- **Firing IntersectionObserver on every frame:** Use `threshold: 0.1` and check `isLoading` guard to prevent duplicate requests when the sentinel stays in view.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Photo swipe carousel | Custom touch handler with `touchstart`/`touchend` | `embla-carousel-react` | Touch velocity, momentum, edge bounce, RTL — 100+ edge cases |
| Countdown formatting | Custom time math | Existing `AuctionCountdown` component (already in repo) | Already handles all tiers, urgency states, hydration safety |
| IntersectionObserver polling loop | Custom scroll event listener | `new IntersectionObserver` (native) or `react-intersection-observer` | Scroll events fire ~60fps; IntersectionObserver is async/passive |
| PWA install detection | Custom UA sniffing | `window.matchMedia("(display-mode: standalone)")` + `beforeinstallprompt` | Already implemented in `InstallCard` component |
| Distance formatting | Custom lat/lng math in React | Compute in the SQL query, return as `distanceMiles` field | Single source of truth; no re-computation in components |

**Key insight:** The auction display and PWA infrastructure is already built. Phase 5 is primarily a query upgrade (add geo + filters) and a UI composition (sticky chips, scroll trigger, photo carousel). Avoid re-building what exists.

---

## Common Pitfalls

### Pitfall 1: Haversine `acos` domain error
**What goes wrong:** `acos` throws when its argument exceeds 1.0 due to floating point imprecision. Query returns an error for businesses at exactly the consumer's location.
**Why it happens:** `cos(a) * cos(b) * cos(c-d) + sin(a) * sin(b)` can evaluate to 1.0000000001 on 64-bit float.
**How to avoid:** Wrap with `LEAST(1.0, ...)` — `3959 * acos(LEAST(1.0, <expression>))`.
**Warning signs:** SQL error `ERROR: input is out of range for function acos`.

### Pitfall 2: Filter reset missing on sort/category change
**What goes wrong:** User taps "Nearest first", sees items from previous page-2 appearing before correct first-page items.
**Why it happens:** `offset` state not reset when sort changes; API still uses old offset.
**How to avoid:** In the `FeedClient`, any change to `sortBy` or `categories` must set `items = []`, `offset = 0`, `hasMore = true` before fetching.
**Warning signs:** Duplicate items appear, or items skip when switching sort.

### Pitfall 3: Hydration mismatch with distance display
**What goes wrong:** Server renders "? mi away" (no consumer lat/lng at render time), client renders "0.3 mi away" → React hydration error.
**Why it happens:** Consumer's location is read from their DB profile, which requires auth session. If the location field is missing (null), and client/server render different fallbacks.
**How to avoid:** Server Component reads consumer profile and passes `distanceMiles` as a prop to the card. If distance is null, render nothing or "— mi away" on both server and client.
**Warning signs:** Next.js hydration error in console referencing `AuctionCard` distance text.

### Pitfall 4: `beforeinstallprompt` not firing (Chrome on iOS)
**What goes wrong:** `beforeinstallprompt` event never fires on Chrome for iOS or Safari. The install button stays hidden forever.
**Why it happens:** `beforeinstallprompt` is Chromium-only on Android/desktop. iOS Safari uses a manual "Add to Home Screen" flow. Chrome on iOS is built on WebKit, not Blink, so it also lacks `beforeinstallprompt`. [VERIFIED: MDN docs]
**How to avoid:** The existing `InstallCard` already handles this correctly — it has a separate `isIos` branch that shows manual instructions. The new install prompt banner should follow the same pattern.
**Warning signs:** Install prompt never shows on iPhone even when app is installable.

### Pitfall 5: Infinite scroll sentinel never intersects
**What goes wrong:** User scrolls to bottom, nothing loads. IntersectionObserver callback never fires.
**Why it happens:** Sentinel `<div>` has zero height, or is inside a flex parent with `overflow: hidden`, or is inside a container that doesn't scroll (wrong element observed).
**How to avoid:** Give the sentinel `h-1` minimum height. Ensure the scroll container is `overflow-y: auto` on `html` or `body`, not a nested `div`. In Next.js App Router, the page itself scrolls on `html`/`body`.
**Warning signs:** Observer fires immediately on mount (element is above fold) or never fires.

### Pitfall 6: Polling interval not cleared on navigation
**What goes wrong:** User navigates from detail page back to feed; polling interval continues running, making requests every 12s to a now-unmounted component.
**Why it happens:** `useEffect` cleanup not returning `clearInterval`.
**How to avoid:** `return () => clearInterval(timer)` in the `useEffect` that sets up polling. The existing `AuctionDetailClient` already does this correctly. Any new polling code must mirror the same cleanup.
**Warning signs:** Network tab shows requests to `/api/auctions/:id` continuing after navigating away.

---

## Code Examples

### Haversine Distance Query (PostgreSQL + Drizzle)
```typescript
// Source: [CITED: https://www.plumislandmedia.net/mysql/haversine-mysql-nearest-loc/] adapted for Drizzle
// [VERIFIED: Drizzle sql template pattern — /drizzle-team/drizzle-orm-docs]
import { sql, and, gte, lte } from "drizzle-orm";

const EARTH_RADIUS_MILES = 3959;
const MILES_PER_LAT_DEGREE = 69.0;

function buildDistanceMiles(lat: number, lng: number) {
  return sql<number>`
    ${EARTH_RADIUS_MILES} * acos(least(1.0,
      cos(radians(${lat}))
      * cos(radians(${businesses.latitude}))
      * cos(radians(${businesses.longitude}) - radians(${lng}))
      + sin(radians(${lat}))
      * sin(radians(${businesses.latitude}))
    ))
  `.as("distance_miles");
}

function buildBoundingBoxFilter(lat: number, lng: number, radiusMiles: number) {
  const latDelta = radiusMiles / MILES_PER_LAT_DEGREE;
  const lngDelta = radiusMiles / (MILES_PER_LAT_DEGREE * Math.cos((lat * Math.PI) / 180));
  return and(
    gte(businesses.latitude, lat - latDelta),
    lte(businesses.latitude, lat + latDelta),
    gte(businesses.longitude, lng - lngDelta),
    lte(businesses.longitude, lng + lngDelta),
  );
}
```

### Embla Carousel (minimal, Tailwind-styled)
```typescript
// Source: [VERIFIED: Context7 /davidjerleke/embla-carousel — react usage]
"use client";
import useEmblaCarousel from "embla-carousel-react";

export function PhotoCarousel({ urls }: { urls: string[] }) {
  const [emblaRef] = useEmblaCarousel({ loop: false, align: "start" });

  if (urls.length === 0) return (
    <div className="aspect-[4/3] rounded-[2rem] bg-[linear-gradient(140deg,#fff5eb,#ffe1c0,#ffb87c)]" />
  );

  return (
    <div className="overflow-hidden rounded-[2rem]" ref={emblaRef}>
      <div className="flex touch-pan-y">
        {urls.map((url, i) => (
          <div key={i} className="min-w-0 flex-[0_0_100%]">
            <div
              className="aspect-[4/3] bg-cover bg-center"
              style={{ backgroundImage: `url(${url})` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Feed Card Skeleton
```typescript
// Source: [CITED: https://tailwindcss.com/docs/aspect-ratio] + [CITED: skeleton animate-pulse pattern]
export function AuctionCardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-[2rem] border border-white/70 bg-white/92 p-4 shadow-[0_24px_70px_rgba(64,34,20,0.1)]">
      <div className="h-5 w-2/3 rounded-full bg-[#f2ded0]" />
      <div className="mt-2 h-7 w-1/2 rounded-full bg-[#f2ded0]" />
      <div className="mt-4 aspect-[4/3] rounded-[1.6rem] bg-[#f2ded0]" />
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-14 rounded-[1.4rem] bg-[#f2ded0]" />
        ))}
      </div>
    </div>
  );
}
```

### PWA Install Banner (value-first, session-dismissed)
```typescript
// Source: [ASSUMED] — extends existing InstallCard pattern
// Shown after 3 cards are visible; dismissed via sessionStorage
"use client";
import { useEffect, useState } from "react";

export function InstallPromptBanner() {
  const [show, setShow] = useState(false);
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("pwa-install-dismissed")) return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    setShow(true);

    const handlePrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handlePrompt);
    return () => window.removeEventListener("beforeinstallprompt", handlePrompt);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem("pwa-install-dismissed", "1");
    setShow(false);
  };

  if (!show) return null;
  // render banner with install button (Chrome) or iOS instructions
}
```

---

## Existing Code to Reuse (Critical)

The following components and patterns are already production-quality in the repo and MUST be reused, not rebuilt:

| Asset | Path | Reuse In |
|-------|------|----------|
| `AuctionCountdown` | `components/auction/auction-countdown.tsx` | Feed cards (prop already exists on AuctionCard) |
| `AuctionCard` | `components/auction/auction-card.tsx` | Feed list — extend props: add `distanceMiles`, `categoryBadge` |
| `AuctionDetailClient` | `components/auction/auction-detail-client.tsx` | Detail page — add `PhotoCarousel`, change polling from 2s to 12s |
| `InstallCard` | `components/pwa/install-card.tsx` | Already on settings page; reference for install banner |
| `PwaBoot` | `components/pwa/pwa-boot.tsx` | Already in root layout — SW registered |
| `getAuctionFeed` | `lib/auctions/queries.ts` | Extend with `{ lat, lng, sortBy, categories, limit, offset }` params |
| `getAuctionDetail` | `lib/auctions/queries.ts` | No changes — already returns `listing.images[]` |
| `/api/auctions/feed` | `app/api/auctions/feed/route.ts` | Extend to accept filter/pagination params |

**Key insight from existing AuctionDetailClient:** The polling is at 2s currently, not 10–15s as the phase spec requires. Phase 5 should change this to 12s.

---

## Category Chip Reality Check

The `lib/listings/categories.ts` defines the actual category enum values. The CONTEXT.md mentions "Prepared" as a category, but the actual schema has `snacks` and `household` instead. The real values are:

`dairy`, `bakery`, `produce`, `meat`, `pantry`, `frozen`, `beverages`, `snacks`, `household`, `other`

[VERIFIED: `db/schema/listings.ts` imports `listingCategoryValues` from `lib/listings/categories.ts`]

Use these exact values for the category filter chips, not the CONTEXT.md list.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `useEffect` + `useState` for polling (stale closure) | `useEffectEvent` (React 19 stable) | React 19.2 (2025) | No stale closure on async callback in setInterval |
| `@tanstack/react-query` for infinite scroll | Route handler + manual `useEffect` state | — | React Query is valid but adds 30 KB; manual pattern is 0 KB for this use case |
| `suppressHydrationWarning` for countdown | `useState(() => Date.now())` in client component | — | No warning suppression needed when rendered client-side only |
| PostGIS for distance | Haversine in plain SQL (built-in pg functions) | — | No extension; works on Neon serverless |

**Deprecated/outdated:**
- `next-pwa` package: Injects a full Workbox service worker. This project has a hand-written `sw.js` already. Do NOT install `next-pwa` — it would override the existing service worker.
- `getServerSideProps`: App Router uses Server Components + Server Actions. No `getServerSideProps`.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Offset pagination is acceptable for this feed (small dataset, demo scale) | Architecture Patterns | Low — demo has ~20 auctions; cursor-based would be needed for production |
| A2 | Changing polling interval from 2s to 12s won't break Phase 4's bidding UX | Existing Code to Reuse | Low — Phase 6 (bidding) is not yet built; polling interval can be tuned then |
| A3 | `react-intersection-observer` is optional (raw IntersectionObserver is sufficient) | Standard Stack | Low — either works; raw API has no dependency overhead |
| A4 | PWA install banner at bottom of feed (after ~3 cards) is appropriate placement | Code Examples | Low — user can adjust; this is Claude's discretion per D-14 |

---

## Open Questions

1. **Distance display when consumer has no location**
   - What we know: `consumer_profiles.latitude/longitude` are `NOT NULL` (schema constraint) — all profiles have coordinates.
   - What's unclear: What if the consumer was onboarded before geocoding and has `0, 0`?
   - Recommendation: Check for `(lat === 0 && lng === 0)` as sentinel; show "— mi away" if so.

2. **Image URL format for `next/image` optimization**
   - What we know: Images are stored as URLs in `listing_images.image_url`; storage provider enum exists (`local`, Cloudinary, etc.).
   - What's unclear: Are production images Cloudinary URLs that would benefit from `next/image` with a Cloudinary loader?
   - Recommendation: Use standard `<img>` with `object-cover` for now; Phase 5 is about feed UX, not image CDN optimization. Add Cloudinary loader if URLs confirm Cloudinary in testing.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js runtime | ✓ | 22.13.1 | — |
| Next.js | App Router, route handlers | ✓ | 16.2.4 | — |
| PostgreSQL (Neon) | Geo query (cos/sin/acos/radians) | ✓ | Neon serverless (PG 16) | — |
| embla-carousel-react | Photo carousel | ✗ (not installed) | 8.6.0 (latest) | Manual `<img>` static gallery (no swipe) |
| react-intersection-observer | Optional scroll trigger | ✗ (not installed) | 10.0.3 | Raw IntersectionObserver API (no fallback needed) |

**Missing dependencies with no fallback:** None blocking. `embla-carousel-react` must be installed; the fallback (static images) is acceptable but degrades the D-08 photo carousel requirement.

**Missing dependencies with fallback:**
- `react-intersection-observer`: not needed; raw API is equivalent.

---

## Validation Architecture

> `workflow.nyquist_validation` not present in config.json — treating as enabled.

### Test Framework

No test configuration detected in the project. [VERIFIED: no `jest.config.*`, `vitest.config.*`, `pytest.ini`, or `__tests__/` directory found]

| Property | Value |
|----------|-------|
| Framework | None detected — Wave 0 must add test infrastructure if validation is required |
| Config file | None |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements → Test Map

| Req | Behavior | Test Type | Notes |
|-----|----------|-----------|-------|
| D-07 | 5-mile geo filter returns only nearby businesses | unit (query) | Test haversine SQL logic with mock lat/lng values |
| D-05 | Ending soon sort returns auction with earliest `scheduledEndAt` first | unit (query) | |
| D-06 | Category filter with `["dairy"]` returns only dairy listings | unit (query) | |
| D-12 | Detail polling fires every 12s | manual / integration | setInterval timing is impractical to unit test |
| D-08 | Photo carousel swipes through 3 images | manual (mobile) | Touch gesture testing requires device |

### Wave 0 Gaps

No existing test infrastructure. If tests are required, Wave 0 must:
- [ ] Install test framework (vitest recommended for Next.js App Router)
- [ ] Create `tests/lib/auctions/geo-queries.test.ts` for haversine formula unit tests
- [ ] Create `tests/lib/auctions/feed-queries.test.ts` for sort/filter logic

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Auth.js v5 session — `requireCompletedRole("consumer")` already in place |
| V3 Session Management | yes | Auth.js handles; session checked on every route handler via `authorizeApiRole` |
| V4 Access Control | yes | Consumer lat/lng read from server-side session profile, not query param — prevents spoofing |
| V5 Input Validation | yes | `sortBy` and `categories` query params from client — must validate against enum before passing to SQL |
| V6 Cryptography | no | No new crypto operations |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Consumer passes arbitrary lat/lng to manipulate feed | Tampering | Read lat/lng from server-side `consumer_profiles` (DB), not from request params |
| Category param injection into SQL `ANY()` array | Tampering | Validate `categories` array against `listingCategoryValues` enum before query |
| Excessive polling DoS (client fires every frame) | DoS | `isLoading` guard in `loadMore`; IntersectionObserver threshold prevents rapid-fire |

---

## Sources

### Primary (HIGH confidence)
- `/drizzle-team/drizzle-orm-docs` (Context7) — `sql` template, computed columns, cursor pagination patterns
- `/davidjerleke/embla-carousel` (Context7) — React installation, `useEmblaCarousel` hook usage
- Codebase: `components/auction/`, `lib/auctions/queries.ts`, `components/pwa/` — existing patterns verified by direct file reads

### Secondary (MEDIUM confidence)
- [MDN — beforeinstallprompt](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event) — iOS Safari does not support `beforeinstallprompt`; Chrome-only
- [plumislandmedia.net — Haversine bounding box](https://www.plumislandmedia.net/mysql/haversine-mysql-nearest-loc/) — bounding box WHERE clause optimization, 69 miles/degree constant
- [LogRocket — Infinite scroll Next.js Server Actions](https://blog.logrocket.com/implementing-infinite-scroll-next-js-server-actions/) — IntersectionObserver + Server Action / route handler pattern

### Tertiary (LOW confidence)
- WebSearch results on React 19 `useEffectEvent` for polling — confirmed by existing codebase usage

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified via npm registry and existing package.json
- Architecture: HIGH — patterns derived from existing codebase code, not speculation
- Haversine query: HIGH — PostgreSQL native functions verified; formula from authoritative source
- PWA install: HIGH — MDN docs confirm iOS Safari limitation; existing InstallCard already handles it
- Pitfalls: HIGH — filter reset and acos domain error are documented/observed patterns

**Research date:** 2026-04-18
**Valid until:** 2026-05-18 (stable libraries; Next.js 16 still current)
