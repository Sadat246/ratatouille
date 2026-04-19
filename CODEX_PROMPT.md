# Codex prompt — Ratatouille phase 5 cleanup

You are working in the Next.js 16 / App Router repo at the project root. Phase 5 (Consumer Feed & Discovery) just landed and is on `main`. Build passes (`npm run build`), tests pass (`npm test`), TypeScript is clean. But there are real correctness/security issues flagged by the in-tree code review and two lint errors blocking a clean `npm run lint`. Your job is to fix them, end-to-end, and leave the tree green.

Do not refactor outside the scope below. Don't introduce new dependencies. Keep changes minimal and consistent with existing patterns. After each fix, re-run the relevant check.

## Required reading before you start

- `.planning/phases/05-consumer-feed/05-REVIEW.md` — the full review, with file/line references and suggested fixes for every item below
- `.planning/STATE.md` — current project state and decisions
- `package.json` — script names

## Tasks (in order)

### 1. Fix CR-01 (CRITICAL — XSS via inline `background-image`)
Image URLs are interpolated verbatim into `style={{ backgroundImage: \`url(${url})\` }}`. Apply the review's preferred fix in **both** locations:

- `components/auction/auction-card.tsx:87` — replace the `background-image` div with an `<img>` tag. Keep the gradient placeholder when `imageUrl` is falsy. Preserve existing classes (`aspect-[4/3] w-full rounded-[1.6rem] object-cover border border-[#f4ddcf]`) and `aria-hidden="true"`.
- `components/auction/listing-photo-carousel.tsx:41` — same treatment for each carousel slide. Preserve sizing/rounding so the carousel still snaps correctly.

### 2. Fix the two ESLint `react-hooks/set-state-in-effect` errors
Both errors are blocking `npm run lint`. Don't suppress them — refactor the effects.

- `components/auction/feed-client.tsx:108-115` — the "reset on filter/sort change" effect. The right pattern is the `useRef`-guarded `loadMore` from review item WR-01: lift the in-flight guard into a `isLoadingRef`, drop `isLoading` from `loadMore`'s dep array, and inline the reset (set state + call loader) into a stable handler triggered by `sortBy`/`categories` changes. Make sure the existing infinite-scroll behavior still works after the refactor.
- `components/pwa/install-prompt-banner.tsx:30` — the iOS detection effect calls `setIsIos` and `setShow` synchronously. Initialize from a lazy `useState` initializer (or compute once with `useSyncExternalStore`/`useMemo` against `navigator`) instead of `useEffect`. Remember this is a client component, but `navigator` is undefined during SSR, so guard with `typeof navigator !== "undefined"`.

### 3. Fix the unused-import lint warning
- `lib/auctions/queries.ts:6` — `consumerProfiles` is imported but never used. Remove the import.

### 4. Apply the remaining review warnings

- **WR-01** is folded into task 2.
- **WR-02** — `app/(consumer)/shop/[auctionId]/page.tsx:51-65` issues a redundant DB query for business lat/lng. Extend the `AuctionDetail` type and `getAuctionDetail` query in `lib/auctions/queries.ts` to include `businessLatitude` / `businessLongitude` (decimal columns on the `businesses` table — match the existing column names from the schema). Then drop the secondary `db.select` call in the page and read lat/lng off the auction object.
- **WR-03** — add the missing `nearest` sort test to `tests/lib/auctions/feed-queries.test.ts`. Cover: items with finite `distanceMiles` sort ascending, and items with `null` `distanceMiles` go to the end (the `Infinity` fallback in `lib/auctions/feed-utils.ts`).
- **WR-04** — `lib/auctions/queries.ts:364-368` and `:526` — replace `Number(stats.myTopBidAmountCents)` with the existing `toNumber` helper (defined at line 16-18 of the same file). Mirror the null-guard pattern already there.
- **WR-05** — `sweepOverdueAuctions` runs synchronously on every feed page load. In `app/api/auctions/feed/route.ts:51`, change to fire-and-forget (`void sweepOverdueAuctions(...)`) so paginated requests aren't blocked. Leave the call on the server-rendered `app/(consumer)/shop/page.tsx:22` as-is (initial render only).

### 5. Apply the info items

- **IN-01** — drop the unused `viewerUserId` prop from `FeedClientProps` in `components/auction/feed-client.tsx`, and from the `<FeedClient>` call site in `app/(consumer)/shop/page.tsx`.
- **IN-02** — `SortBy` is duplicated in four files. Export it from `lib/auctions/queries.ts` (already exported there) and import everywhere else: `lib/auctions/feed-utils.ts`, `components/auction/filter-chip-row.tsx`, `components/auction/feed-client.tsx`. Remove the local redefinitions.
- **IN-03** — remove `role="button"` from the `<button>` elements in `components/auction/filter-chip-row.tsx` (lines 57, 72, 85).
- **IN-04** — `components/auction/listing-photo-carousel.tsx` lines 38 and 55: use the image URL as the React `key` instead of the array index.

## Verification — must pass before you stop

Run each, in order, from the repo root:

```bash
npm run lint        # zero errors, zero warnings
npx tsc --noEmit    # clean
npm test            # all passing, including the new nearest sort test
npm run build       # clean production build
```

If any step fails, read the error, fix it, and re-run. Don't skip steps. Don't disable lint rules to make them pass.

## Notes

- The repo uses Next.js 16 / React 19 — keep client/server boundaries explicit (`"use client"` at top of client components).
- Money is in integer cents. Distances are in miles, computed via the existing `computeHaversine` in `lib/auctions/geo.ts`.
- Don't touch `.planning/` files — those are records of work already done.
- Don't commit unless the user asks. Just leave the tree clean and report what changed.
