# Phase 8: Notifications & Demo Polish - Context

**Gathered:** 2026-04-18
**Status:** Ready for research

<vision>
## How This Should Work

Phase 8 is the final phase before the 2026-05-02 pitch demo. The two halves — push notifications and demo seed data — are designed as one tightly woven experience: the seed world exists to make the notifications fire naturally on cue, and the notifications exist to prove the seeded marketplace is alive.

The target moment is a **scripted walkthrough**: a curated 3–5 minute demo path that a presenter can run reliably every time. A business posts or has already posted a listing, a consumer bids, an outbid notification fires, the auction ends, a win confirmation lands, and the seller sees item-sold. Every beat is rehearsed, predictable, and lands.

</vision>

<essential>
## What Must Be Nailed

- **All four notification types fire reliably and in sequence during the demo script** — outbid, auction-ending-soon, win confirmation, business-item-sold. No single hero notification; the full loop is the point.
- **The seed world is minimal and intentional** — just enough businesses and listings to run the script with zero distraction. Every seeded item has a purpose in the walkthrough.
- **Listing-state variety is present** so the feed looks believable mid-demo: fresh/just-listed, active-bidding, ending-soon (< 15 min), and sold/recently-cleared states all visible somewhere.
- **Scripted reliability over organic realism** — the demo must be reproducible on the day; nothing flaky, nothing that depends on chance timing.

</essential>

<boundaries>
## What's Out of Scope

- Rich "populated marketplace" scale — we are deliberately not seeding ~20+ listings across many neighborhoods. Minimal wins.
- Any functionality that doesn't serve the scripted demo path.
- Earlier-phase scope creep: auction mechanics, payments, fulfillment logic — all come from Phases 4/6/7 and are assumed working.

</boundaries>

<specifics>
## Specific Ideas

- Seeded listings should cover all four observable states (fresh, active bidding, ending-soon, sold) so the feed tells the whole story without the presenter having to explain what's not shown.
- Notifications need to be demo-triggerable on cue — the presenter should be able to cause each one to fire at the right moment, not hope it happens.

</specifics>

<notes>
## Additional Context

- This is the last phase before the 2026-05-02 demo target, so "polish" here specifically means demo-readiness, not general app polish.
- User interrupted before boundary and visual-specifics probes — items in `<boundaries>` and `<specifics>` above are derived from the scripted-walkthrough framing and minimal-seed decision, not explicitly enumerated by the user. Worth confirming during planning.

</notes>

---

*Phase: 08-notifications-demo-polish*
*Context gathered: 2026-04-18*
