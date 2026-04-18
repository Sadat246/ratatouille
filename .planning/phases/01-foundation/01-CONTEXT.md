# Phase 1: Foundation - Context

**Gathered:** 2026-04-18
**Status:** Ready for research

<vision>
## How This Should Work

Phase 1 "done" is a **branded PWA shell** deployed on free-tier infra. You open the URL on a phone, and it already feels like a real product — not a Next.js starter screenshot. You can add it to your home screen. You see the Ratatouille wordmark, a commerce-first layout with Whatnot/Depop energy (bold accent, rounded cards, product-forward spacing), and a mobile-first bottom nav.

The landing page is a **single home with a role pivot** — two prominent CTAs, "Shop deals" and "Sell inventory," that enter the consumer and business shells respectively. Both shells exist as stubs with shared layout primitives; their actual content lands in later phases. (Once Phase 2 adds auth, signed-in users can bypass the home and auto-route by role, but Phase 1 just wires up the structure.)

Under the hood, the **full core data schema already exists** — users, businesses, listings, auctions, bids, settlements, fulfillments — with migrations that run cleanly. Later phases fill these tables in; none has to rework the data model.

Shipping this phase means: push to main → it's live, it looks like a product, and the data backbone is in place.

</vision>

<essential>
## What Must Be Nailed

- **Branded shell looks real** — a pitch screenshot of the shell should already read as "a product," not a Next.js starter. Typography, color, card shapes, nav polish all matter even though features are empty.
- **Full core schema upfront** — all domain tables and migrations exist. No Phase 4 surprise where the auction table doesn't have the right column.
- **Deploy pipeline works** — push to main lands on the live URL with Postgres attached. This is table stakes for every phase that follows.

</essential>

<boundaries>
## What's Out of Scope

- **Any real auth** — Google OAuth is Phase 2. If dev needs a session, stub it.
- **Any listing / auction / bid UI** — tables exist, no pages to create or view their content yet.
- **Photo upload / OCR plumbing** — image storage setup waits for Phase 3 when it's actually used.
- **Stripe / Uber Direct / push-notification keys** — don't wire these up, not even as env var placeholders. Add them when their phase arrives.

</boundaries>

<specifics>
## Specific Ideas

- **Aesthetic: Whatnot / Depop-ish** — bold accent color, rounded cards, product-forward spacing. "Live marketplace" energy, not enterprise.
- **Mobile-first with bottom nav** — design for phones primarily; bottom tab bar, thumb-reach, generous touch targets. Desktop works but isn't the priority.
- **Shared layout + split shells** — one layout primitive serving both sides; distinct consumer vs business shell experiences stubbed out (not unified pages).
- **Brand details (color, logo, wordmark): not decided** — builder's call within the commerce-first + Whatnot-ish direction. User will react to whatever is picked.

</specifics>

<notes>
## Additional Context

- Timeline is tight: ~14 days total, pitch demo ~2026-05-02. Phase 1 must land fast and clean because everything else depends on it.
- "Branded shell looks real" matters because the pitch audience sees the shell first. A polished-looking empty app pitches better than a feature-rich Next.js default.
- Full schema upfront is a deliberate bet against rework. The user prefers "set the foundation once" over iterative schema evolution during the 14-day build.
- Deploy target is free-tier only (Vercel + Neon or Supabase) per PROJECT.md constraints — provider choice is a research decision.

</notes>

---

*Phase: 01-foundation*
*Context gathered: 2026-04-18*
