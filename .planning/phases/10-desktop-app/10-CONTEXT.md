# Phase 10: Desktop App - Context

**Gathered:** 2026-04-19
**Status:** Ready for research

<vision>
## How This Should Work

Ratatouille today is a phone-first PWA. Phase 10 reworks the same product into a desktop-native experience that runs in a browser — not a wrapped Electron/Tauri app, not a stretched mobile layout. When someone opens `ratatouille-xi.vercel.app` on a laptop or monitor, the app should look and behave like it was designed for that screen.

Both lanes get first-class desktop treatment:

- **Seller side** feels like a Shopify admin: a calm sidebar (Listings / Live Auctions / Fulfillment / Outcomes / Demo Tools), one focused workspace at a time, generous breathing room. The store operator can leave it open all day without it feeling like a phone screen pinned to a giant monitor.
- **Shopper side** feels like an eBay grid: a multi-column card layout of nearby auctions, a left filter rail (categories, distance, ending-soon), sort/category pills along the top. Built for scanning lots of auctions at once.

Critically — this is still the same Next.js app, same routes, same data. Desktop is a layout/responsive concern, not a separate codebase.

</vision>

<essential>
## What Must Be Nailed

- **Both lanes feel desktop-first.** Neither the seller console nor the shopper feed should feel like a phone screen stretched out. Density, spacing, and interactions are tuned for a large screen + mouse.
- **Seller workstation = Shopify-admin pattern.** Sidebar nav + single focused workspace + clear context per page.
- **Shopper feed = eBay grid pattern.** Multi-column auction cards with a persistent filter rail and top sort/category pills.

</essential>

<boundaries>
## What's Out of Scope

- **Native shell (Electron / Tauri / installable .dmg/.exe).** This phase is browser-only — "desktop" means responsive layouts on big screens.
- **Offline mode.** No local caching of listings/bids for offline use; still requires network.
- **Keyboard shortcuts / command palette.** No j/k navigation, cmd+k palette, or other power-user hotkeys this phase. Mouse-first.
- **Multi-window / pop-out.** No detaching auction detail or fulfillment into separate browser windows.

</boundaries>

<specifics>
## Specific Ideas

- Visual language: open to standard approaches — implementation chooses whether to keep the warm cream/orange/brown palette throughout or to neutralize the seller side.
- Reference patterns named explicitly:
  - **Shopify admin** for the seller console (sidebar + focused workspace).
  - **eBay** for the shopper grid (filter rail + sort pills + dense card grid).

</specifics>

<notes>
## Additional Context

The current build is heavily mobile-tuned: bottom-nav bars, single-column feeds, full-bleed photo cards, install-prompt banners. Phase 10 is the first time the app gets treated as a real responsive product instead of a phone-only PWA. The mobile experience must continue to work — desktop is additive, not a replacement.

</notes>

---

*Phase: 10-desktop-app*
*Context gathered: 2026-04-19*
