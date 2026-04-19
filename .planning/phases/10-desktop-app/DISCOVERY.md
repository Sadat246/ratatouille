# Phase 10 Discovery: Desktop Layout Strategy

**Date:** 2026-04-19
**Phase:** 10-desktop-app

## Scope

Determine how to turn the existing phone-first marketplace into a desktop-first browser experience without introducing a second app runtime or duplicating routes.

## Findings

### 1. The current app already has a shared shell abstraction

- Both shopper and seller pages flow through the same narrow shell frame.
- The shell is hard-capped to mobile widths and always renders a fixed bottom navigation.
- This means desktop work should start by changing shared shell behavior, not by forking routes.

### 2. Shopper home is structurally mobile-first

- The shopper feed uses a single-column card stack and a horizontal sticky chip row.
- Auction cards are card-complete for mobile, but they rely on the surrounding layout to become a desktop marketplace.
- The install prompt is positioned like a mobile bottom sheet and will interfere with a larger-screen workspace if left unchanged.

### 3. Seller pages mostly need layout promotion, not new data paths

- Seller Desk, Live, Fulfillment, and Outcomes already share the seller shell and card primitives.
- The biggest gap is page composition: they read as stacked mobile sections instead of a left-nav workstation with wider content zones.
- This makes seller desktop work a strong second plan after the shared shell foundation lands.

### 4. No new runtime or library is required

- The app already uses Next.js, App Router, Tailwind v4 utilities, and route-level server rendering.
- Phase 10 can stay entirely inside existing layout/component patterns.
- There is no evidence that Electron, Tauri, or another shell is needed for the requested outcome.

## Constraints

- Mobile behavior must remain intact, especially the fixed bottom navigation and compact feed/list flows.
- Existing route structure and data fetching should stay unchanged.
- Desktop should be additive: larger breakpoints get sidebar/workspace behavior while mobile keeps the current tap-first experience.
- There is already unrelated local work in progress elsewhere in the tree, so phase execution should avoid broad refactors that increase merge risk.

## Recommended Plan Split

### 10-01

Shared responsive shell + shopper marketplace desktop layout:

- desktop-aware shell chrome
- shopper home grid/filter redesign
- shopper-wide spacing/card polish for large screens

### 10-02

Seller workstation desktop conversion:

- seller sidebar/admin shell polish
- desk/live/fulfillment/outcomes layout promotion
- seller list/board density upgrades

## Decision

Proceed with two autonomous plans. Execute 10-01 first because it establishes the responsive shell primitives and proves the desktop direction on the shopper lane without touching the seller workflow at the same time.
