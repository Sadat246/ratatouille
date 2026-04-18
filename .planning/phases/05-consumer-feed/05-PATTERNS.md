# Phase 5: Consumer Feed & Discovery - Pattern Map

**Mapped:** 2026-04-18
**Files analyzed:** 9 new/modified files
**Analogs found:** 9 / 9

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `app/(consumer)/shop/page.tsx` | page (Server Component) | request-response | `app/(consumer)/shop/page.tsx` (existing — modify in place) | exact |
| `components/auction/feed-client.tsx` | component (client) | event-driven + request-response | `components/auction/auction-detail-client.tsx` | role-match |
| `components/auction/auction-card.tsx` | component | request-response | `components/auction/auction-card.tsx` (existing — extend props) | exact |
| `components/auction/filter-chip-row.tsx` | component (client) | event-driven | `components/nav/bottom-nav.tsx` | partial |
| `app/(consumer)/shop/[auctionId]/page.tsx` | page (Server Component) | request-response | `app/(consumer)/shop/[auctionId]/page.tsx` (existing — extend) | exact |
| `components/auction/auction-detail-client.tsx` | component (client) | event-driven + polling | `components/auction/auction-detail-client.tsx` (existing — modify interval) | exact |
| `app/api/auctions/feed/route.ts` | route handler | request-response | `app/api/auctions/feed/route.ts` (existing — extend params) | exact |
| `lib/auctions/queries.ts` | service/query | CRUD + transform | `lib/auctions/queries.ts` (existing — extend `getAuctionFeed`) | exact |
| `components/pwa/install-prompt-banner.tsx` | component (client) | event-driven | `components/pwa/install-card.tsx` | role-match |

---

## Pattern Assignments

### `app/(consumer)/shop/page.tsx` (page, Server Component, request-response)

**Analog:** `app/(consumer)/shop/page.tsx` (existing file — modify in place)

**Imports pattern** (lines 1–14):
```typescript
import { ConsumerShell } from "@/components/auction/consumer-shell";
import { AuctionCard } from "@/components/auction/auction-card";
import { db } from "@/db/client";
import { getAuctionFeed } from "@/lib/auctions/queries";
import { AUCTION_SWEEP_BATCH_SIZE } from "@/lib/auctions/pricing";
import { sweepOverdueAuctions } from "@/lib/auctions/service";
import { requireCompletedRole } from "@/lib/auth/onboarding";
```
Phase 5 adds: `FeedClient`, `FilterChipRow` imports. Remove direct AuctionCard loop — delegate to FeedClient.

**Auth + consumer profile pattern** (lines 22–33):
```typescript
const session = await requireCompletedRole("consumer");
const profile = await db.query.consumerProfiles.findFirst({
  columns: { city: true, state: true, locationLabel: true },
  where: (table, operators) => operators.eq(table.userId, session.user.id),
});
```
Phase 5 extension: also select `latitude` and `longitude` from `consumerProfiles` to pass to `FeedClient` as props.

**Feed query + sweep call** (lines 32–35):
```typescript
await sweepOverdueAuctions(AUCTION_SWEEP_BATCH_SIZE);
const auctions = await getAuctionFeed(24, session.user.id);
```
Phase 5: replace with `getAuctionFeed({ lat, lng, sortBy: "ending_soon", categories: [], limit: 13, offset: 0, viewerUserId })` using the extended signature.

**Empty state pattern** (lines 79–88):
```typescript
{auctions.length === 0 ? (
  <div className="rounded-[1.7rem] bg-white/92 p-5">
    <p className="text-base font-semibold text-[#221511]">
      No active auctions are live near this shopper yet.
    </p>
    <p className="mt-2 text-sm leading-6 text-[#664e42]">
      As soon as a seller publishes a lot, it will appear here...
    </p>
  </div>
) : (
  <div className="grid gap-4">{/* AuctionCard list */}</div>
)}
```
Phase 5: empty state copy changes to "Nothing nearby yet — try again soon." Pattern (rounded card, warm text palette) stays identical.

**Shell wrapper pattern** (lines 43–50):
```typescript
return (
  <ConsumerShell
    activeHref="/shop"
    badge="Live shopper lane"
    title="..."
    description="..."
    locationLabel={locationLabel}
  >
    {/* children */}
  </ConsumerShell>
);
```
Copy exactly. Phase 5 places `<FilterChipRow>` and `<FeedClient initialItems={...} consumerLat={...} consumerLng={...} />` as children instead of the current `<SectionCard>` blocks.

---

### `components/auction/feed-client.tsx` (component, client, event-driven + request-response)

**Analog:** `components/auction/auction-detail-client.tsx`

**"use client" + state declaration pattern** (lines 1–4, 74–76):
```typescript
"use client";

import { startTransition, useEffect, useEffectEvent, useState } from "react";
```
FeedClient uses `useEffect`, `useRef`, `useState`, `useCallback` — same module, different hooks. Use `useEffectEvent` only if the fetch callback closes over mutable state (it does: `sortBy`, `categories`, `offset`).

**Polling/interval cleanup pattern** (lines 110–121):
```typescript
useEffect(() => {
  if (auction.status !== "active" && auction.status !== "scheduled") {
    return undefined;
  }
  const timer = window.setInterval(() => {
    void refreshAuction();
  }, 2_000);
  return () => window.clearInterval(timer);
}, [auction.id, auction.status]);
```
FeedClient mirrors this for IntersectionObserver:
```typescript
useEffect(() => {
  if (!sentinelRef.current) return;
  const observer = new IntersectionObserver(
    ([entry]) => { if (entry.isIntersecting) void loadMore(); },
    { threshold: 0.1 },
  );
  observer.observe(sentinelRef.current);
  return () => observer.disconnect();
}, [loadMore]);
```
Cleanup pattern is identical: return a cleanup fn from `useEffect`.

**Fetch + error pattern** (lines 77–108):
```typescript
const refreshAuction = useEffectEvent(async () => {
  try {
    const response = await fetch(`/api/auctions/${auction.id}`, { cache: "no-store" });
    const data = (await response.json()) as { ok: true; auction: ... } | { ok: false; error: { message: string } };
    if (!response.ok || !data.ok) {
      setRefreshError(data.ok ? "Live refresh failed." : data.error.message);
      return;
    }
    startTransition(() => { setAuction(data.auction); });
    setRefreshError(null);
  } catch {
    setRefreshError("Live refresh failed. Pull to retry.");
  }
});
```
FeedClient's `loadMore` follows the same try/catch + `data.ok` guard pattern. Replace `setAuction` with `setItems((prev) => [...prev, ...data.items])`.

**Filter reset pattern** — new to Phase 5; no existing analog. Reference RESEARCH.md Pattern 3 (lines 358–366 in 05-RESEARCH.md).

---

### `components/auction/auction-card.tsx` (component, request-response)

**Analog:** `components/auction/auction-card.tsx` (existing — extend props, do NOT rebuild)

**Full existing component** (lines 1–127). New props to add to `AuctionCardProps`:
```typescript
distanceMiles?: number | null;    // "0.3 mi away" rendered in footerLines or new metric cell
categoryBadge?: string | null;    // overlaid on image corner per D-03
```

**Badge overlay pattern** — existing badge is top-right of text area (lines 70–76). Phase 5 needs a second small badge overlaid on the photo. Copy the pill style:
```typescript
<span
  className={`inline-flex h-fit items-center rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] ${badgeToneClasses[badge.tone]}`}
>
  {badge.label}
</span>
```
For the photo corner overlay, wrap the image `<div>` in a `relative` container and absolutely-position a smaller version of this pill.

**Image section** (lines 79–83):
```typescript
<div
  className="h-36 rounded-[1.6rem] border border-[#f4ddcf] bg-[linear-gradient(140deg,#fff5eb_0%,#ffe1c0_48%,#ffb87c_100%)]"
  style={imageUrl ? { backgroundImage: `url(${imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
/>
```
Phase 5: wrap in `<div className="relative">`, add category badge as absolute positioned chip.

**Metric cells pattern** (lines 84–98):
```typescript
<div className="grid grid-cols-3 gap-2">
  {metrics.map((metric) => (
    <div
      key={metric.label}
      className="rounded-[1.4rem] border border-[#f2ded0] bg-[rgba(255,249,244,0.9)] px-3 py-3"
    >
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[#9d6d56]">
        {metric.label}
      </p>
      <p className="mt-2 text-base font-semibold tracking-[-0.03em] text-[#23130e]">
        {metric.value}
      </p>
    </div>
  ))}
</div>
```
Distance becomes a 4th metric or a footer pill — use the `footerLines` pattern (lines 100–111) for distance: `"0.3 mi away"`.

---

### `components/auction/filter-chip-row.tsx` (component, client, event-driven)

**Analog:** `components/nav/bottom-nav.tsx` (active-state chip styling); `lib/listings/categories.ts` (category values)

**BottomNav active item pattern** for deriving chip active styles:
```typescript
// components/nav/bottom-nav.tsx — active vs inactive item styling pattern
// (file not read above; use the orange accent palette established in AuctionCard)
```

**Category values to use** (from `lib/listings/categories.ts`, lines 1–12):
```typescript
import { listingCategoryValues, listingCategoryLabels } from "@/lib/listings/categories";
// Values: "dairy" | "bakery" | "produce" | "meat" | "pantry" | "frozen" | "beverages" | "snacks" | "household" | "other"
```

**Chip style to copy from AuctionCard** (lines 101–109 of `auction-card.tsx`):
```typescript
// Inactive chip:
"rounded-full border border-[#ecd6c7] bg-[rgba(255,247,241,0.92)] px-3 py-1.5 text-xs font-medium text-[#725546]"
// Active chip (toggle on): replace bg with accent orange
"rounded-full border border-[#f87d4f] bg-[#f87d4f] px-3 py-1.5 text-xs font-semibold text-white"
```

**Props signature** (new component, no existing file):
```typescript
"use client";

type FilterChipRowProps = {
  sortBy: "ending_soon" | "nearest" | "lowest_price";
  onSortChange: (sortBy: "ending_soon" | "nearest" | "lowest_price") => void;
  selectedCategories: string[];
  onCategoryChange: (categories: string[]) => void;
};
```
Render as `<div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">` — hide scrollbar, sticky positioning handled by parent feed page.

---

### `app/(consumer)/shop/[auctionId]/page.tsx` (page, Server Component, request-response)

**Analog:** `app/(consumer)/shop/[auctionId]/page.tsx` (existing — extend for distance display)

**Full pattern** (lines 1–52). The only Phase 5 change is:
1. Also query `consumerProfiles.latitude` and `consumerProfiles.longitude` (already queried for `locationLabel`).
2. Pass `consumerLat` / `consumerLng` to `AuctionDetailClient` so it can display distance in the business section.

**Existing profile query** (lines 18–27):
```typescript
const [profile] = await Promise.all([
  db.query.consumerProfiles.findFirst({
    columns: { city: true, state: true, locationLabel: true },
    where: (table, operators) => operators.eq(table.userId, session.user.id),
  }),
  refreshAuctionIfOverdue(auctionId),
]);
```
Phase 5: add `latitude: true, longitude: true` to the `columns` object.

**notFound + getAuctionDetail pattern** (lines 30–33):
```typescript
const auction = await getAuctionDetail(auctionId, session.user.id);
if (!auction) { notFound(); }
```
Copy exactly. No changes.

---

### `components/auction/auction-detail-client.tsx` (component, client, polling)

**Analog:** `components/auction/auction-detail-client.tsx` (existing — two targeted changes)

**Polling interval change** (line 116):
```typescript
// BEFORE:
const timer = window.setInterval(() => { void refreshAuction(); }, 2_000);
// AFTER (Phase 5, D-12):
const timer = window.setInterval(() => { void refreshAuction(); }, 12_000);
```
Change `2_000` → `12_000`. That is the only change to the polling logic.

**Photo carousel addition** — new section after the hero image `<div>` (lines 146–157). Replace the single hero image div with a `<ListingPhotoCarousel images={auction.listing.images} />` component. The `images` array is already returned by `getAuctionDetail` (lines 302 in `lib/auctions/queries.ts`).

**`useEffectEvent` pattern** (lines 77–108) — copy exactly for any new async callbacks in FeedClient. Already correct; do not change.

**Distance display addition** to business section (lines 264–275):
```typescript
// After pickup section, add:
{distanceMiles !== null && distanceMiles !== undefined ? (
  <span className="rounded-full border border-[#ebd9ce] px-3 py-1.5 text-xs text-[#6e5142]">
    {distanceMiles.toFixed(1)} mi away
  </span>
) : null}
```
Add `distanceMiles?: number | null` to `AuctionDetailClientProps`.

---

### `app/api/auctions/feed/route.ts` (route handler, request-response)

**Analog:** `app/api/auctions/feed/route.ts` (existing — replace GET body)

**Auth pattern** (lines 10–17) — copy exactly:
```typescript
export const runtime = "nodejs";

export async function GET() {
  const authorization = await authorizeApiRole("consumer");
  if (!authorization.ok) {
    return NextResponse.json(authorization.body, { status: authorization.status });
  }
  // ...
}
```

**Single auction route handler error pattern** (`app/api/auctions/[auctionId]/route.ts`, lines 10–44):
```typescript
export async function GET(
  _request: Request,
  context: { params: Promise<{ auctionId: string }> },
) {
  const authorization = await authorizeApiRole("consumer");
  if (!authorization.ok) {
    return NextResponse.json(authorization.body, { status: authorization.status });
  }
  try {
    // ... business logic
    return NextResponse.json({ ok: true, auction });
  } catch (error) {
    return toAuctionErrorResponse(error);
  }
}
```
Phase 5 feed route: wrap body in try/catch matching this pattern. Return `{ ok: true, items, nextOffset, hasMore }`.

**Query param parsing pattern** (reference from RESEARCH.md Pattern 2):
```typescript
const { searchParams } = new URL(request.url);
const offset = Number(searchParams.get("offset") ?? "0");
const limit = 12;
const sortBy = (searchParams.get("sortBy") ?? "ending_soon") as SortBy;
const categories = searchParams.getAll("category");
```
Validate `sortBy` against `["ending_soon", "nearest", "lowest_price"]` before passing to query. Validate `categories` against `listingCategoryValues` from `@/lib/listings/categories`.

**Consumer profile lookup pattern** (from `app/(consumer)/shop/page.tsx`, lines 23–31):
```typescript
const profile = await db.query.consumerProfiles.findFirst({
  columns: { latitude: true, longitude: true },
  where: (table, operators) => operators.eq(table.userId, authorization.session.user.id),
});
if (!profile) {
  return NextResponse.json({ ok: false, error: "No profile" }, { status: 400 });
}
```
Read lat/lng from DB session — never from request params (security: prevents location spoofing per RESEARCH.md security section).

---

### `lib/auctions/queries.ts` (service/query, CRUD + transform)

**Analog:** `lib/auctions/queries.ts` (existing — extend `getAuctionFeed` function in place)

**Existing `getAuctionFeed` signature** (lines 68–71):
```typescript
export async function getAuctionFeed(
  limit = 24,
  viewerUserId?: string,
): Promise<AuctionFeedItem[]>
```
Phase 5: replace with:
```typescript
export async function getAuctionFeed(params: {
  limit?: number;
  offset?: number;
  viewerUserId?: string;
  lat?: number | null;
  lng?: number | null;
  sortBy?: "ending_soon" | "nearest" | "lowest_price";
  categories?: string[];
}): Promise<AuctionFeedItem[]>
```
Keep the existing call-site in `app/(consumer)/shop/page.tsx` working by treating all params optional with defaults.

**Existing Drizzle select pattern** (lines 73–100):
```typescript
const rows = await db
  .select({
    id: auctions.id,
    // ... flat column selection
    businessCity: businesses.city,
    businessState: businesses.state,
  })
  .from(auctions)
  .innerJoin(listings, eq(listings.id, auctions.listingId))
  .innerJoin(businesses, eq(businesses.id, auctions.businessId))
  .where(eq(auctions.status, "active"))
  .orderBy(asc(auctions.scheduledEndAt), desc(auctions.lastBidAt))
  .limit(limit);
```
Phase 5: add `distanceMiles` to select, extend `.where()` with bounding box + haversine clauses, replace `.orderBy()` with dynamic sort, add `.offset(offset)`.

**Haversine computed column pattern** (from RESEARCH.md Pattern 1 + Code Examples):
```typescript
import { sql, and, eq, gte, lte, asc, desc } from "drizzle-orm";

const EARTH_RADIUS_MILES = 3959;
const MILES_PER_LAT_DEGREE = 69.0;

const distanceMiles = sql<number>`
  ${EARTH_RADIUS_MILES} * acos(least(1.0,
    cos(radians(${consumerLat}))
    * cos(radians(${businesses.latitude}))
    * cos(radians(${businesses.longitude}) - radians(${consumerLng}))
    + sin(radians(${consumerLat}))
    * sin(radians(${businesses.latitude}))
  ))
`.as("distance_miles");
```
Add `distanceMiles` to the `.select({})` object. NOTE: `businesses.latitude` is `doublePrecision` and nullable per schema (`db/schema/businesses.ts` line 29) — guard with `IS NOT NULL` or handle null in WHERE.

**Bounding box WHERE pattern**:
```typescript
const latDelta = RADIUS_MILES / MILES_PER_LAT_DEGREE;
const lngDelta = RADIUS_MILES / (MILES_PER_LAT_DEGREE * Math.cos((consumerLat * Math.PI) / 180));
// Add to .where():
gte(businesses.latitude, consumerLat - latDelta),
lte(businesses.latitude, consumerLat + latDelta),
gte(businesses.longitude, consumerLng - lngDelta),
lte(businesses.longitude, consumerLng + lngDelta),
sql`3959 * acos(least(1.0,
  cos(radians(${consumerLat})) * cos(radians(${businesses.latitude}))
  * cos(radians(${businesses.longitude}) - radians(${consumerLng}))
  + sin(radians(${consumerLat})) * sin(radians(${businesses.latitude}))
)) <= ${RADIUS_MILES}`,
```

**Category filter pattern** (from `getSellerLiveAuctions`, lines 471–498 — uses `eq(auctions.businessId, ...)` + `eq(auctions.status, "active")` multi-condition AND):
```typescript
// Add to .where() when categories.length > 0:
inArray(listings.category, categories),
```
Use Drizzle's `inArray` (already imported in file, line 3) rather than raw SQL `ANY()`.

**`AuctionFeedItem` type extension** (lines 39–66) — add `distanceMiles: number | null` field to the type and to the returned object.

**Existing `getPrimaryImageUrls` helper** (lines 13–37) — unchanged, reuse as-is.

**Offset pagination** (add after `.limit()`):
```typescript
.offset(offset ?? 0)
```
`offset` is already a Drizzle method on the query builder — no raw SQL needed.

---

### `components/pwa/install-prompt-banner.tsx` (component, client, event-driven)

**Analog:** `components/pwa/install-card.tsx` (lines 1–144)

**BeforeInstallPromptEvent type** (lines 5–8 of `install-card.tsx`):
```typescript
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};
```
Copy exactly — same type, same file pattern.

**iOS detection** (lines 10–12):
```typescript
function isIosDevice(userAgent: string) {
  return /iphone|ipad|ipod/i.test(userAgent);
}
```
Copy exactly.

**Installed state + standalone check** (lines 18–35):
```typescript
const [installed, setInstalled] = useState(() => {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
});
const [isIos] = useState(() => {
  if (typeof navigator === "undefined") return false;
  return isIosDevice(navigator.userAgent);
});
```
Copy exactly. Banner adds one more guard: `sessionStorage.getItem("pwa-install-dismissed")` — if set, return null immediately.

**beforeinstallprompt listener pattern** (lines 37–69):
```typescript
useEffect(() => {
  const handleBeforeInstall = (event: Event) => {
    event.preventDefault();
    setPromptEvent(event as BeforeInstallPromptEvent);
  };
  const handleInstalled = () => { setInstalled(true); setPromptEvent(null); };
  window.addEventListener("beforeinstallprompt", handleBeforeInstall);
  window.addEventListener("appinstalled", handleInstalled);
  return () => {
    window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    window.removeEventListener("appinstalled", handleInstalled);
  };
}, []);
```
Copy exactly. Banner version skips `mediaQuery` listener (simpler).

**Install trigger** (lines 71–82):
```typescript
async function handleInstall() {
  if (!promptEvent) return;
  await promptEvent.prompt();
  const outcome = await promptEvent.userChoice;
  if (outcome.outcome === "accepted") { setInstalled(true); }
  setPromptEvent(null);
}
```
Copy exactly.

**Visual style from `install-card.tsx`** (lines 127–143):
```typescript
<section className="rounded-[2.2rem] border border-[#d8e7db] bg-[rgba(238,246,240,0.86)] p-5 shadow-[0_24px_80px_rgba(43,69,56,0.08)]">
```
Banner version is a narrower bottom-of-feed strip — use `rounded-[2rem] border border-[#d8e7db] bg-[rgba(238,246,240,0.86)] p-4` with a dismiss `×` button aligned right.

**Dismiss to sessionStorage** (new, no analog in existing code):
```typescript
const dismiss = () => {
  sessionStorage.setItem("pwa-install-dismissed", "1");
  setShow(false);
};
```

---

## Shared Patterns

### Authentication (Server Components)
**Source:** `lib/auth/onboarding.ts` + `app/(consumer)/shop/page.tsx` lines 22
**Apply to:** `app/(consumer)/shop/page.tsx`, `app/(consumer)/shop/[auctionId]/page.tsx`
```typescript
import { requireCompletedRole } from "@/lib/auth/onboarding";
const session = await requireCompletedRole("consumer");
```

### Authentication (Route Handlers)
**Source:** `lib/auth/api.ts` lines 63–112, `app/api/auctions/feed/route.ts` lines 10–17
**Apply to:** `app/api/auctions/feed/route.ts`
```typescript
import { authorizeApiRole } from "@/lib/auth/api";
const authorization = await authorizeApiRole("consumer");
if (!authorization.ok) {
  return NextResponse.json(authorization.body, { status: authorization.status });
}
// userId available at: authorization.session.user.id
```

### Route Handler Error Handling
**Source:** `app/api/auctions/[auctionId]/route.ts` lines 22–44
**Apply to:** `app/api/auctions/feed/route.ts`
```typescript
import { toAuctionErrorResponse } from "@/lib/auctions/http";
try {
  // ... business logic
  return NextResponse.json({ ok: true, ... });
} catch (error) {
  return toAuctionErrorResponse(error);
}
```

### Drizzle Query: `innerJoin` + multi-condition `and()` WHERE
**Source:** `lib/auctions/queries.ts` lines 73–100
**Apply to:** `lib/auctions/queries.ts` (extended `getAuctionFeed`)
```typescript
import { and, asc, desc, eq, inArray, gte, lte, sql } from "drizzle-orm";
db
  .select({ ... })
  .from(auctions)
  .innerJoin(listings, eq(listings.id, auctions.listingId))
  .innerJoin(businesses, eq(businesses.id, auctions.businessId))
  .where(and(
    eq(auctions.status, "active"),
    // additional conditions...
  ))
  .orderBy(asc(auctions.scheduledEndAt))
  .limit(limit)
  .offset(offset);
```

### Consumer Profile DB Lookup
**Source:** `app/(consumer)/shop/page.tsx` lines 23–31, `app/(consumer)/shop/[auctionId]/page.tsx` lines 18–27
**Apply to:** `app/api/auctions/feed/route.ts` (server-side lat/lng read)
```typescript
const profile = await db.query.consumerProfiles.findFirst({
  columns: { latitude: true, longitude: true, city: true, state: true },
  where: (table, operators) => operators.eq(table.userId, session.user.id),
});
```
`consumerProfiles.latitude` and `.longitude` are `doublePrecision().notNull()` — safe to use directly without null check beyond "is profile missing entirely."

### Warm Color Palette (Tailwind classes)
**Source:** `components/auction/auction-card.tsx` throughout, `components/auction/auction-detail-client.tsx`
**Apply to:** All new feed components
- Background cards: `bg-white/92 border border-white/70 rounded-[2rem] shadow-[0_24px_70px_rgba(64,34,20,0.1)]`
- Eyebrow text: `text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#aa5838]`
- Body text: `text-sm leading-7 text-[#705446]`
- Accent orange: `#f75d36` / `#f87d4f` (active states, countdown urgent)
- Pill inactive: `border-[#ecd6c7] bg-[rgba(255,247,241,0.92)] text-[#725546]`
- Metric cell: `rounded-[1.4rem] border border-[#f2ded0] bg-[rgba(255,249,244,0.9)] px-3 py-3`

### Polling Cleanup (useEffect + clearInterval)
**Source:** `components/auction/auction-detail-client.tsx` lines 110–121, `components/auction/auction-countdown.tsx` lines 59–69
**Apply to:** `components/auction/auction-detail-client.tsx` (interval change), `components/auction/feed-client.tsx` (IntersectionObserver cleanup)
```typescript
useEffect(() => {
  const timer = window.setInterval(callback, INTERVAL_MS);
  return () => window.clearInterval(timer);
}, [dependency]);
```

### `runtime = "nodejs"` for route handlers
**Source:** `app/api/auctions/feed/route.ts` line 8, `app/api/auctions/[auctionId]/route.ts` line 8
**Apply to:** `app/api/auctions/feed/route.ts` (already present — keep it)
```typescript
export const runtime = "nodejs";
```

---

## No Analog Found

All files have close analogs. No files require falling back to RESEARCH.md-only patterns.

| File | Note |
|---|---|
| `components/auction/filter-chip-row.tsx` | No existing chip row component; uses category values from `lib/listings/categories.ts` + pill styles from `auction-card.tsx` footerLines. Closest structural analog is `BottomNav` for active-state logic. |
| `components/auction/feed-client.tsx` | No existing infinite scroll component; IntersectionObserver logic is new but the fetch/state/cleanup patterns are directly from `AuctionDetailClient`. |

---

## Metadata

**Analog search scope:** `components/auction/`, `components/pwa/`, `components/nav/`, `app/(consumer)/shop/`, `app/api/auctions/`, `lib/auctions/`, `lib/listings/`, `lib/auth/`, `db/schema/`
**Files scanned:** 18
**Pattern extraction date:** 2026-04-18
