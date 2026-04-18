---
phase: 05-consumer-feed
plan: "02"
subsystem: consumer-feed-ui-atoms
tags: [ui-components, embla-carousel, pwa, filter-chips, skeleton-loader]
dependency_graph:
  requires:
    - lib/listings/categories.ts
    - components/pwa/install-card.tsx (reference pattern)
  provides:
    - components/auction/filter-chip-row.tsx
    - components/auction/feed-card-skeleton.tsx
    - components/auction/listing-photo-carousel.tsx
    - components/pwa/install-prompt-banner.tsx
  affects:
    - Wave 2 plans (05-03 feed page composition, 05-04 detail page)
tech_stack:
  added:
    - embla-carousel-react@8.6.0
  patterns:
    - embla-carousel-react useEmblaCarousel hook for swipeable photo carousel
    - sessionStorage dismiss guard for non-intrusive PWA install prompt
    - IntersectionObserver-ready sentinel pattern for install banner
    - animate-pulse skeleton matching AuctionCard layout
key_files:
  created:
    - components/auction/filter-chip-row.tsx
    - components/auction/feed-card-skeleton.tsx
    - components/auction/listing-photo-carousel.tsx
    - components/pwa/install-prompt-banner.tsx
  modified:
    - package.json (embla-carousel-react added)
    - package-lock.json
decisions:
  - "Used BeforeInstallPromptEvent type and isIosDevice function verbatim from install-card.tsx for consistency"
  - "Carousel uses loop:false + align:start as specified in UI-SPEC.md"
  - "InstallPromptBanner triggers show via prop (ready for FeedClient sentinel integration in Wave 2)"
metrics:
  duration: "~2 min"
  completed: "2026-04-18"
  tasks_completed: 2
  files_created: 4
  files_modified: 2
---

# Phase 5 Plan 02: UI Atoms (Filter Chips, Skeleton, Carousel, Install Banner) Summary

**One-liner:** Four pure-UI atom components — FilterChipRow, FeedCardSkeleton, ListingPhotoCarousel, InstallPromptBanner — plus embla-carousel-react, all TypeScript-clean and ready for Wave 2 feed composition.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Install embla-carousel-react and build FilterChipRow + FeedCardSkeleton | 3bc80c8 | package.json, filter-chip-row.tsx, feed-card-skeleton.tsx |
| 2 | Build ListingPhotoCarousel and InstallPromptBanner | 10825de | listing-photo-carousel.tsx, install-prompt-banner.tsx |

## Component Descriptions

### FilterChipRow (`components/auction/filter-chip-row.tsx`)
- Sticky horizontally-scrollable chip row (`sticky top-0 z-20`) with `role="toolbar" aria-label="Filter and sort"`
- Sort chips: Ending soon (default), Nearest first, Lowest price — single-select with `aria-pressed`
- Category chips: All (resets) + 10 categories from `listingCategoryValues` — multi-select toggle
- Active chip style: `bg-[#f75d36] text-white border-[#f75d36]`; inactive: warm pill style
- All chips have `min-h-[44px]` touch targets

### FeedCardSkeleton (`components/auction/feed-card-skeleton.tsx`)
- `animate-pulse` skeleton matching AuctionCard layout
- `aspect-[4/3]` photo placeholder, eyebrow/title bars, 3-col metric grid, footer bar
- Skeleton fill color: `bg-[#f2ded0]`

### ListingPhotoCarousel (`components/auction/listing-photo-carousel.tsx`)
- Uses `useEmblaCarousel({ loop: false, align: "start" })` with touch-pan enabled
- Renders up to N images (typically 3) with dot indicators (`role="tablist"`, `role="tab"`, `aria-selected`)
- Gradient fallback when `images.length === 0`: `bg-[linear-gradient(140deg,#fff5eb_0%,#ffe1c0_48%,#ffb87c_100%)]`
- Active dot: `bg-[#f75d36]`, inactive: `bg-[#dfc9b6]`

### InstallPromptBanner (`components/pwa/install-prompt-banner.tsx`)
- Fixed above bottom nav: `fixed inset-x-0 bottom-[72px] z-20`
- Session dismiss guard via `sessionStorage.getItem/setItem("pwa-install-dismissed")`
- Android/Chrome: shows "Save Ratatouille..." copy + "Add to Home Screen" CTA using `beforeinstallprompt`
- iOS Safari: shows share-sheet instructions, no install button
- Slide-up entry animation: `translate-y-full` → `translate-y-0` over 200ms
- Already-installed guard: `window.matchMedia("(display-mode: standalone)").matches`
- Dismiss × button with `aria-label="Dismiss install prompt"`

## Deviations from Plan

None - plan executed exactly as written.

## Threat Model Coverage

| Threat ID | Status |
|-----------|--------|
| T-05-07 (DoS - InstallPromptBanner) | Mitigated: sessionStorage dismiss guard prevents repeated shows; `setPromptEvent` only updates reference on repeated `beforeinstallprompt` fires |
| T-05-06 (FilterChipRow tampering) | Accepted: pure client UI, server validates category/sort values |
| T-05-08 (ListingPhotoCarousel info disclosure) | Accepted: renders existing server-returned URLs only |

## Known Stubs

None — all components are pure UI atoms that accept props and emit callbacks. No data sources needed at this layer; data wiring occurs in Wave 2 plans (05-03, 05-04).

## Self-Check: PASSED

- `components/auction/filter-chip-row.tsx` — EXISTS
- `components/auction/feed-card-skeleton.tsx` — EXISTS
- `components/auction/listing-photo-carousel.tsx` — EXISTS
- `components/pwa/install-prompt-banner.tsx` — EXISTS
- Commit 3bc80c8 — EXISTS
- Commit 10825de — EXISTS
- `npx tsc --noEmit` — PASSED (no output = clean)
