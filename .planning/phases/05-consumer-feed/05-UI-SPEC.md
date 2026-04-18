---
phase: 5
phase_name: Consumer Feed & Discovery
status: draft
date: 2026-04-18
---

# UI-SPEC: Phase 5 — Consumer Feed & Discovery

## Overview

Visual and interaction contract for the consumer discovery surface: an endless-scroll geo-filtered feed, filter/sort chip row, listing detail page with photo carousel, and a non-intrusive PWA install prompt. Bid/buyout CTAs are placeholder-only (visible, disabled) in this phase.

---

## Design System

**Tool:** None (no shadcn / components.json). Custom Tailwind CSS v4 utility-first system.
**Registry:** Not applicable.

### Detected Tokens (from `app/globals.css` + existing components)

| Token | Value | Role |
|-------|-------|------|
| `--canvas` | `#f5e8d5` | Page background warm sand |
| `--canvas-strong` | `#edd6be` | Pressed/hover surface |
| `--ink` | `#21140f` | Primary text |
| `--muted` | `#5d4738` | Secondary text |
| `--accent` | `#f75d36` | Warm orange — primary CTA, active nav, urgent countdown |
| `--accent-deep` | `#9f3a20` | Pressed accent state |
| `--leaf` | `#234d3d` | Green semantic — success, install prompt, "leading" badge |
| `--leaf-soft` | `#dceadf` | Green tinted surface |
| `--paper` | `rgba(255,248,239,0.8)` | Card background (translucent white) |

**Background gradient (html level):**
`radial-gradient(circle at top, rgba(255,239,204,0.82), transparent 36%), radial-gradient(circle at 85% 15%, rgba(247,93,54,0.15), transparent 24%), linear-gradient(180deg,#f9efdf 0%,#f3e1cd 58%,#edd4be 100%)`

**Fonts:**
- Display/Headings: Space Grotesk (`var(--font-display)`), `letter-spacing: -0.03em`
- Body: Manrope (`var(--font-body)`)

---

## Spacing Scale

8-point grid. All spacing uses multiples of 4px.

| Step | px | Tailwind class | Usage |
|------|----|---------------|-------|
| 1 | 4px | `p-1` / `gap-1` | Tight chip internals |
| 2 | 8px | `p-2` / `gap-2` | Chip gaps, metric grid gaps |
| 3 | 12px | `px-3 py-3` | Card metric cells, chip padding |
| 4 | 16px | `p-4` / `gap-4` | Card outer padding, section gaps |
| 5 | 20px | `p-5` | Detail page section padding |
| 6 | 24px | `gap-6` | Feed column gap |
| 8 | 32px | `pb-32` | Bottom nav safe-area clearance |

**Touch targets:** All tappable elements minimum 44px tall (chips: `py-2.5` = ~42px → acceptable at `min-h-[44px]`; nav items: `py-2` + icon + label = ~52px, compliant).

---

## Typography

### Scale (4 sizes)

| Role | Size | Weight | Line Height | Class |
|------|------|--------|-------------|-------|
| Card title / section heading | 20px (`text-xl`) | 600 semibold | 1.2 | `text-xl font-semibold tracking-[-0.04em]` |
| Detail page hero title | fluid `clamp(2.2rem,8vw,3.5rem)` | 600 semibold | 0.94 | `text-[clamp(2.2rem,8vw,3.5rem)] leading-[0.94] font-semibold tracking-[-0.05em]` |
| Body / description | 14px (`text-sm`) | 400 regular | 1.75 (`leading-7`) | `text-sm leading-7 text-[--muted]` |
| Eyebrow / badge label | 10.9px (`text-[0.68rem]`) | 600 semibold | n/a (single line) | `text-[0.68rem] font-semibold uppercase tracking-[0.24em]` |

### Weights (2 declared)

- **Regular (400):** Body text, secondary labels, footer pills
- **Semibold (600):** All headings, badges, metric values, CTAs, nav labels

### Font families

- Headings (`h1–h6`): Space Grotesk, `letter-spacing: -0.03em` (set globally in `globals.css`)
- Body: Manrope

---

## Color Contract

### 60 / 30 / 10 Split

| Allocation | Color | Elements |
|------------|-------|---------|
| 60% Dominant surface | `#f5e8d5` canvas gradient (html background) | Page background, overall warm sand tone |
| 30% Secondary surfaces | `rgba(255,248,239,0.8)` paper / `bg-white/92` | Cards, sections, bottom nav, chip row backdrop |
| 10% Accent | `#f75d36` (`--accent`) | Active nav item, urgent countdown pill, primary CTA buttons (bid/buyout placeholders), category badge on selected state |

### Accent Reserved For

The accent color (`#f75d36`) is used ONLY on:
1. Active bottom nav tab pill background
2. Countdown pill when `<= 10 seconds` remaining (urgent state, with `animate-pulse`)
3. Primary CTA buttons (bid/buyout — disabled in this phase, styled as `opacity-50 cursor-not-allowed`)
4. Selected state of sort/category filter chips
5. Focus ring on interactive elements (via `ring-[#f75d36]`)

### Semantic Second Color (Leaf / Green)

| Color | Usage |
|-------|-------|
| `#234d3d` (`--leaf`) | Install app button background, "You're leading" badge background, PWA install prompt accent |
| `#dceadf` (`--leaf-soft`) | Green section backgrounds (pickup section, install card) |
| `#216348` | Green badge text (bid count, success states) |

### State Colors

| State | Color | Usage |
|-------|-------|-------|
| Destructive / error | `#b3431b` | Error text only (e.g. polling failure notice) |
| Ending soon (10s–60s) | `#fff0dc` bg / `#ad5415` text | Countdown pill |
| Urgent (<10s) | `#f75d36` bg / white text + `animate-pulse` | Countdown pill |
| Sold / ended | `border-[#d7d9e0] bg-[#f5f6f9] text-[#566074]` (slate badge) | Card badge tone |
| Skeleton loader | `bg-[#f2ded0]` with `animate-pulse` | Loading placeholders |

---

## Component Inventory

### New Components (to build)

| Component | Path | Type | Purpose |
|-----------|------|------|---------|
| `FeedClient` | `components/auction/feed-client.tsx` | `"use client"` | Infinite scroll state, chip state, item accumulation, sentinel observer |
| `FilterChipRow` | `components/auction/filter-chip-row.tsx` | `"use client"` | Sticky horizontal sort + category chips |
| `FeedCardSkeleton` | `components/auction/feed-card-skeleton.tsx` | Server-safe | `animate-pulse` skeleton for pagination loading state |
| `ListingPhotoCarousel` | `components/auction/listing-photo-carousel.tsx` | `"use client"` | Embla carousel for 3 product photos on detail page |
| `InstallPromptBanner` | `components/pwa/install-prompt-banner.tsx` | `"use client"` | Value-first install nudge shown after feed scrolled past 3 cards |

### Existing Components (extend, not rebuild)

| Component | Path | Extension Needed |
|-----------|------|-----------------|
| `AuctionCard` | `components/auction/auction-card.tsx` | Add `distanceMiles?: number` and `categoryBadge?: string` props. Overlay category badge on photo corner. Distance shown as footer pill "X.X mi away". |
| `AuctionDetailClient` | `components/auction/auction-detail-client.tsx` | Add `ListingPhotoCarousel` above hero text. Change polling interval from `2_000` to `12_000` ms. |
| `AuctionCountdown` | `components/auction/auction-countdown.tsx` | No changes. Reuse as-is on feed cards and detail page. |
| `InstallCard` | `components/pwa/install-card.tsx` | No changes. Reference implementation for `InstallPromptBanner`. |
| `BottomNav` | `components/nav/bottom-nav.tsx` | No changes. Feed occupies the "spark" icon tab. |

---

## Feed Card Anatomy

```
┌─────────────────────────────────────────────┐
│ [EYEBROW: store name]         [BADGE chip]  │  ← 10.9px semibold uppercase
│ Product Title                               │  ← 20px semibold tracking-tight
│ ┌─────────────────────────────────────────┐ │
│ │   FULL-BLEED PRODUCT PHOTO              │ │  ← aspect-[4/3], rounded-[1.6rem]
│ │                            [Dairy]      │ │  ← category badge: top-right overlay
│ └─────────────────────────────────────────┘ │
│ ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│ │  BID     │ │ BUYOUT   │ │  DISTANCE    │ │  ← 3-col metric grid
│ │ $4.50    │ │ $12.00   │ │  0.3 mi away │ │
│ └──────────┘ └──────────┘ └──────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ Tap in for live detail     [2h 14m left]│ │  ← countdown pill (AuctionCountdown)
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**Card container:** `rounded-[2rem] border border-white/70 bg-white/92 shadow-[0_24px_70px_rgba(64,34,20,0.1)]`

**Photo area:** `aspect-[4/3] rounded-[1.6rem]` with `bg-cover bg-center`. Fallback: `bg-[linear-gradient(140deg,#fff5eb_0%,#ffe1c0_48%,#ffb87c_100%)]`

**Category badge (photo overlay):**
- Position: `absolute top-2 right-2`
- Style: `rounded-full bg-[rgba(255,248,239,0.88)] border border-white/60 px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[#705446] backdrop-blur-sm`
- Parent photo div: `relative`

**Sold / expired card:** Apply `opacity-60 pointer-events-none` to the entire card link. Add `badge: { label: "Ended", tone: "slate" }`. Do NOT remove from feed between scroll pages — grey in place until next filter change resets.

---

## Filter Chip Row Anatomy

```
[All] [Ending soon ▼] [Nearest first] [Lowest price]  |  [Dairy] [Bakery] [Produce] ...
←────────────────── horizontally scrollable, sticky ──────────────────────────────→
```

**Container:** `sticky top-0 z-20 -mx-4 px-4 py-2 backdrop-blur-md bg-[rgba(245,232,213,0.85)] border-b border-white/40`

**Scroll wrapper:** `flex gap-2 overflow-x-auto scrollbar-none pb-1`

**Chip (unselected):** `inline-flex items-center rounded-full border border-[#edd6be] bg-[rgba(255,248,239,0.88)] px-3.5 py-2 text-xs font-semibold text-[#705446] whitespace-nowrap transition-colors`

**Chip (selected/active):** Replace border/bg/text with: `border-[#f75d36] bg-[#f75d36] text-white`

**Divider between sort and category chips:** `w-px h-5 bg-[#dfc9b6] self-center mx-1 flex-shrink-0`

**Sort chips (single-select):** "Ending soon" (default), "Nearest first", "Lowest price". Selecting one deselects the others.

**Category chips (multi-select):** "All" (default/reset), then: Dairy, Bakery, Produce, Meat, Pantry, Frozen, Beverages, Snacks, Household, Other. Tapping "All" deselects all individual categories. Tapping a category while "All" is active deselects "All" and selects only that category.

**Actual category enum values from schema:** `dairy`, `bakery`, `produce`, `meat`, `pantry`, `frozen`, `beverages`, `snacks`, `household`, `other`

**Display labels (capitalize first letter):** Dairy, Bakery, Produce, Meat, Pantry, Frozen, Beverages, Snacks, Household, Other

---

## Listing Detail Page Anatomy

```
┌──────────────────────────────────────────────┐
│ ← back                           [2h 14m left]│  ← header row
│                                               │
│ ┌───────────────────────────────────────────┐ │
│ │  PHOTO CAROUSEL (swipeable)               │ │  ← aspect-[4/3], rounded-[2rem]
│ │  [● ○ ○]  (dot indicators)               │ │
│ └───────────────────────────────────────────┘ │
│                                               │
│ [STORE NAME]                                  │  ← 10.9px eyebrow
│ Product Title                                 │  ← fluid heading clamp
│                                               │
│ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│ │ Current  │ │ Reserve  │ │  Buyout      │  │  ← 3-col metric
│ │ $4.50    │ │ $3.00    │ │  $12.00      │  │
│ └──────────┘ └──────────┘ └──────────────┘  │
│                                               │
│ ┌──────────────────────────────────────────┐ │
│ │ [Live] [5 bids] description text...      │ │  ← info section
│ │ [📍 City, State] [Exp: Apr 2026]         │ │
│ └──────────────────────────────────────────┘ │
│                                               │
│ ┌──────────────────────────────────────────┐ │
│ │ [Place Bid — disabled]  [Buy Now — disabled]│ ← CTA placeholder section
│ └──────────────────────────────────────────┘ │
│                                               │
│ ┌──────────────────────────────────────────┐ │
│ │ PICKUP FLOW                              │ │  ← leaf-tinted section
│ │ Store pickup instructions...             │ │
│ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

**Photo Carousel:** `embla-carousel-react@8.6.0`. Container: `overflow-hidden rounded-[2rem]`. Slide: `flex-[0_0_100%] aspect-[4/3]`. Loop: false. Align: start. Touch pan enabled.

**Dot indicators:** `flex gap-1.5 justify-center mt-2`. Dot: `w-1.5 h-1.5 rounded-full`. Active dot: `bg-[#f75d36]`, inactive: `bg-[#dfc9b6]`.

**No-image fallback (carousel):** Render a single slide with `bg-[linear-gradient(140deg,#fff5eb,#ffe1c0,#ffb87c)]`.

**Bid CTA (disabled placeholder):**
- Container: `grid grid-cols-2 gap-3 p-4 rounded-[2rem] border border-white/70 bg-white/92`
- "Place Bid" button: `rounded-full bg-[#f75d36] opacity-50 cursor-not-allowed px-5 py-3.5 text-sm font-semibold text-white`
- "Buy Now" button: `rounded-full bg-[#234d3d] opacity-50 cursor-not-allowed px-5 py-3.5 text-sm font-semibold text-white`
- Label beneath: `text-xs text-center text-[#9d7b6e] mt-1` — "Bidding opens in a future update"

**Polling interval:** 12 000 ms (change from current 2 000 ms in `AuctionDetailClient`).

---

## Empty State

**Trigger:** Feed query returns 0 results (no active auctions within 5 miles, or no results for selected category filter).

**Container:** `flex flex-col items-center justify-center gap-4 py-16 px-6 text-center`

**Illustration:** SVG bowl/plate icon using accent palette — `w-16 h-16 text-[#dfc9b6]`. No third-party illustration library.

**Heading:** "Nothing nearby right now" — `text-xl font-semibold tracking-[-0.04em] text-[#22130e]`

**Body:** "Active deals show up here when local stores list items. Check back soon — inventory moves fast." — `text-sm leading-7 text-[#705446] max-w-[28ch]`

**When category filter is active, variant copy:** "No [Category] deals nearby. Try All or another category." — same style, "All" is a tappable inline link with accent color.

---

## Skeleton / Loading States

**Feed initial load:** Render 4 `FeedCardSkeleton` components in a single-column list. Each skeleton mirrors the card height (approx 320px).

**Skeleton card spec:**
```
animate-pulse overflow-hidden rounded-[2rem] border border-white/70 bg-white/92 p-4
  ├── h-3 w-1/3 rounded-full bg-[#f2ded0]   ← eyebrow
  ├── h-5 w-2/3 rounded-full bg-[#f2ded0] mt-2  ← title
  ├── aspect-[4/3] rounded-[1.6rem] bg-[#f2ded0] mt-3  ← photo
  └── grid grid-cols-3 gap-2 mt-3
      └── (×3) h-14 rounded-[1.4rem] bg-[#f2ded0]   ← metrics
```

**Infinite scroll loading indicator (bottom of list):** Three `FeedCardSkeleton` components with `opacity-60`. Do not use a spinner.

**Photo carousel loading (detail page, before image loads):** The gradient fallback (`bg-[linear-gradient(140deg,#fff5eb,#ffe1c0,#ffb87c)]`) serves as the loading state. No separate skeleton needed.

---

## PWA Install Prompt

**Placement:** Bottom-sheet style banner, fixed above bottom nav. Appears after user has scrolled past card #3 in the feed (IntersectionObserver on a sentinel after the 3rd card).

**Dismiss behavior:** `sessionStorage.setItem("pwa-install-dismissed", "1")`. Not shown again in the session. Not shown if `window.matchMedia("(display-mode: standalone)").matches`.

**Container:** `fixed bottom-[72px] inset-x-0 z-20 px-4`
**Card:** `rounded-[1.6rem] border border-[#d8e7db] bg-[rgba(238,246,240,0.96)] p-4 shadow-[0_16px_60px_rgba(43,69,56,0.14)] backdrop-blur-sm`

**Android/Chrome (beforeinstallprompt available):**
- Copy: "Save Ratatouille to your home screen for instant deal access."
- CTA: "Add to Home Screen" — `rounded-full bg-[#234d3d] px-4 py-2.5 text-sm font-semibold text-white`
- Dismiss: "×" icon button, top-right of card

**iOS Safari (no beforeinstallprompt):**
- Copy: "Open in Safari, tap Share, then Add to Home Screen."
- No install button (Safari handles it natively)
- Dismiss: same "×" button

**Already installed:** Do not render. Guard: `window.matchMedia("(display-mode: standalone)").matches`

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Feed page title (h1, screen-reader only) | "Nearby Deals" |
| Feed eyebrow (store name area) | `{businessName}` (dynamic) |
| Card footer CTA line | "Tap in for live detail and actions" |
| Distance pill | "0.3 mi away" / "1.2 mi away" (1 decimal, always "mi") |
| No consumer location | "— mi away" (em dash, no distance shown) |
| Sort chip labels | "Ending soon", "Nearest first", "Lowest price" |
| Category chip labels | "All", "Dairy", "Bakery", "Produce", "Meat", "Pantry", "Frozen", "Beverages", "Snacks", "Household", "Other" |
| Empty state heading | "Nothing nearby right now" |
| Empty state body | "Active deals show up here when local stores list items. Check back soon — inventory moves fast." |
| Empty state (filtered) | "No [Category] deals nearby. Try All or another category." |
| Bid CTA label (disabled) | "Place Bid" |
| Buyout CTA label (disabled) | "Buy Now" |
| Below disabled CTAs | "Bidding opens in a future update" |
| Polling error | "Live refresh failed. Pull to retry." |
| Install prompt (Android) | "Save Ratatouille to your home screen for instant deal access." |
| Install prompt CTA (Android) | "Add to Home Screen" |
| Install prompt (iOS) | "Open in Safari, tap Share, then Add to Home Screen." |
| Install prompt dismiss | "×" (aria-label: "Dismiss install prompt") |
| Photo carousel dots (aria) | aria-label: "Photo 1 of 3", "Photo 2 of 3", "Photo 3 of 3" |
| Back navigation (detail) | "← Back" (or `aria-label="Back to feed"` on icon-only) |

**Destructive actions:** None in this phase. No confirmation flows needed.

---

## Layout & Navigation

**Feed page route:** `/shop` — occupies the "spark" icon tab in `BottomNav`.

**Detail page route:** `/shop/[auctionId]`

**Page structure (feed):**
```
<ShellFrame>                           ← existing consumer shell
  <header>                             ← app wordmark + "Shop deals" label
  <FilterChipRow />                    ← sticky, z-20
  <main class="px-4 pb-32">           ← pb-32 clears bottom nav + install banner
    <FeedClient initialItems={...} />  ← client wrapper
      <div class="grid gap-4">         ← single column on mobile
        {items.map(<AuctionCard />)}
        <InstallPromptSentinel />      ← after card #3, triggers banner show
        <div ref={sentinelRef} class="h-1" />  ← infinite scroll trigger
        {isLoading && <FeedCardSkeleton />×3}
      </div>
  </main>
  <BottomNav />
  <InstallPromptBanner />              ← fixed above nav
</ShellFrame>
```

**Page structure (detail):**
```
<div class="min-h-screen pb-28">
  <div class="sticky top-0 z-10 ..."> ← back nav + countdown badge
  <div class="px-4 grid gap-4">
    <ListingPhotoCarousel />
    <AuctionDetailClient />            ← extended with carousel already inside
  </div>
</div>
```

**Scroll axis:** Page-level scroll (`html`/`body`), not a nested overflow container. Required for IntersectionObserver sentinel to work correctly.

**Max content width:** `max-w-md mx-auto` on feed and detail containers. Centers on tablet/desktop while keeping mobile-first layout.

---

## Motion & Transition

- **Card hover (desktop):** `transition-transform hover:-translate-y-0.5` (already on AuctionCard)
- **Chip selection:** `transition-colors` (100ms) — no layout shift
- **Skeleton pulse:** `animate-pulse` (Tailwind built-in, 2s ease-in-out infinite)
- **Urgent countdown:** `animate-pulse` on the pill only
- **Install banner entry:** `transition-transform translate-y-0` from `translate-y-full` — 200ms ease-out slide-up. Only plays once on first show.
- **Carousel:** Embla handles swipe momentum natively. No additional CSS transitions on carousel.

**No reduced-motion override needed** for this phase (animations are all subtle pulses or single small transforms). Add `@media (prefers-reduced-motion: reduce)` to disable `animate-pulse` in a future polish pass.

---

## Accessibility

- All interactive chips: `role="button"` with `aria-pressed` (selected state)
- Filter chip row: `role="toolbar" aria-label="Filter and sort"` on the scrollable container
- AuctionCountdown: wraps in `aria-live="polite"` region so screen readers announce time updates without interruption
- Category badge on photo: `aria-hidden="true"` (decorative, info duplicated in card text)
- Disabled CTAs: `disabled` attribute + `aria-disabled="true"` + `title="Bidding opens in a future update"`
- Back navigation: `aria-label="Back to feed"` on the back button
- Photo carousel dots: `role="tablist"`, each dot: `role="tab" aria-label="Photo N of M" aria-selected={active}`
- Install prompt dismiss: `aria-label="Dismiss install prompt"` on the × button
- Bottom nav active item: `aria-current="page"` already implemented

---

## Registry Safety Gate

**No third-party registries declared.** Only `embla-carousel-react` (npm, official package) is added.

| Package | Source | Vetting |
|---------|--------|---------|
| `embla-carousel-react@8.6.0` | npm registry (npmjs.com) | Official npm package — no registry vetting gate required |

---

## Sources

| Decision | Source |
|----------|--------|
| Color tokens | `app/globals.css` (detected) |
| Card border radius `rounded-[2rem]` | `components/auction/auction-card.tsx` (detected) |
| Typography scale | `components/auction/auction-card.tsx` + `auction-detail-client.tsx` (detected) |
| Font families | `app/layout.tsx` (detected: Space Grotesk display, Manrope body) |
| Accent color `#f75d36` | `app/globals.css` + `components/nav/bottom-nav.tsx` (detected) |
| Category chip values | `05-RESEARCH.md` → `lib/listings/categories.ts` (verified against schema) |
| Feed card layout (D-01–D-03) | `05-CONTEXT.md` decisions |
| Filter row (D-04–D-06) | `05-CONTEXT.md` decisions |
| Detail page layout (D-08–D-12) | `05-CONTEXT.md` decisions |
| PWA install placement (D-14) | Claude's discretion — value-first after card #3 |
| Embla carousel | `05-RESEARCH.md` Pattern 4 |
| Polling 12 000 ms | `05-CONTEXT.md` D-12 (10–15s spec) |
| Skeleton pattern | `05-RESEARCH.md` Code Examples |
| Bottom nav | `components/nav/bottom-nav.tsx` (detected) |
