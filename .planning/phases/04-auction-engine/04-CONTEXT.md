# Phase 4: Auction Engine - Context

**Gathered:** 2026-04-18
**Status:** Ready for research

<vision>
## How This Should Work

The auction experience feels **fast & live — eBay-last-minute energy**, not calm Etsy-browsing. When a consumer opens a listing with an active auction, the current bid is right there, the timer is ticking, and the "you're winning / you're outbid" state is obvious at a glance. Place a bid, feel the tension.

Buyout sits alongside bidding as an **equal, first-class option** — some people will bid, some will buyout, both feel like legitimate paths. The auction isn't de-emphasizing one in favor of the other.

The **closing moment** is theatrical but clean: final 10 seconds gets a big countdown with a visual pulse/flash, then hard cutoff at zero — winner announced instantly, no anti-snipe extensions. Decisive.

The **"you won"** experience is warm but low-key — a congrats with clear next steps ("pick up by [time]"), not confetti. Winning a discounted bag of groceries should feel satisfying, not theatrical.

For the **seller**, it's hands-off but well-informed. They list the item and walk away. They get notifications at meaningful beats (first bid, each new high bid, ending soon, final outcome). The marketplace is working on their expiring inventory in the background.

**Commission** is invisible to consumers (they just see the sale price) and clear to sellers (they see price, commission, payout broken out).

</vision>

<essential>
## What Must Be Nailed

All three are equally load-bearing for this phase — none is optional:

- **Auctions clear on time with the correct winner.** The core contract: timer ends, system picks the right winner (or no-sale), settlement record is correct. This is the backbone.
- **The live bidding experience feels thrilling.** Real-time bid updates, obvious "you're winning/outbid" states, dramatic 10-second close. The feel is what makes this marketplace distinctive.
- **Buyout and bid both work cleanly end-to-end.** Either path terminates the auction correctly with the right settlement state. No half-built second option.

</essential>

<boundaries>
## What's Out of Scope

- **Real money / Stripe payments.** That's Phase 6. This phase writes a settlement record — no actual holds, captures, or transfers. Bidding gate is a **mock "card added" flag** (real Stripe integration waits for Phase 6).
- **Fulfillment (pickup codes, delivery).** That's Phase 7. A won auction ends at "winner recorded."
- **Full push notifications.** Phase 8 still owns most push work. **Exception: outbid push notifications land in Phase 4** (core to the live bidding feel). Ending-soon and won notifications stay in Phase 8.
- **Anti-snipe extensions.** Hard cutoff instead — no last-second timer extensions.
- **Auto-bid / proxy bidding.** Every bid is a manual tap. Keeps the live feel; simpler scope.
- **Scheduled auction starts.** Auctions go live the moment they're listed. No "upcoming" state.
- **Shill-bidding / multi-account abuse detection.** Flagged as a Trust & Safety follow-up for later. Phase 4 uses honor system.
- **Bid retraction.** Bids are binding once placed.
- **Duration minimums or maximums.** Handled by seed/demo data later, not auction rules.
- **Tie-breaking logic.** Impossible by design — bids must be strictly above current.
- **Anti-abuse blocking of same-business bidding.** Deferred to Trust & Safety.

</boundaries>

<specifics>
## Specific Ideas

**Reserve price behavior:**
- Reserve = **starting/minimum bid**. Bids can't be placed below reserve.
- If no one bids at all → no sale.
- If any bids happen → highest bidder wins, regardless of whether bid reached any internal target. Reserve is the floor, not a secret threshold.

**Buyout behavior:**
- Buyout and bidding are presented as equal paths.
- Buyout must be strictly greater than reserve — validated at listing creation (Phase 3).

**Bid increments:**
- Fixed increments ($0.25 or $0.50 steps). Bidders pick "current + increment." Predictable, prevents penny wars.

**Bidder identity:**
- Anonymous — consumers just see "current bid: $4.50." No names, no initials, no avatars. You're competing with a number.

**Who can bid:**
- Consumers only, **with a card on file** (mock flag this phase; real Stripe Setup Intent comes Phase 6).
- Businesses can't bid on any listing in this phase.

**Commission:**
- 15% of sale price.
- Invisible to consumers in UI; sellers see price/commission/payout broken out explicitly.

**Seller cancellation:**
- Seller can cancel their own live auction **at any point**, including after bids. Active bidders get notified; held funds (once Phase 6 lands) release.

**Expiry vs auction end collision:**
- Normally prevented at listing creation (end_time < expiry). As a runtime safeguard, if a listing somehow reaches its product expiry with an auction still running → **auto-cancel, no winner** (expired product shouldn't be sold).

**Auction end UX:**
- Final 10 seconds: big numeric countdown + visual pulse/flash. Hard cutoff at zero.
- Just-ended auctions are removed from the feed immediately. Detail page stays reachable and shows the ended state.
- Public sale-price visibility: anyone visiting an ended listing sees **"sold for $X"**. Transparent.

**Post-end settlement state:**
- Phase 4 also models a **settlement state machine** (won / paid / abandoned). Initialized at "won, awaiting payment" — later phases transition it.

**Win moment:**
- Warm, not theatrical. "Congrats — pick up by [time]" style. Shifts attention quickly to next step.

**My Bids:**
- Dedicated tab in bottom nav. First-class nav destination — active bids are always one tap away with status (winning/outbid) and time-left per auction.

**Empty state:**
- Listings with zero bids use neutral framing: "Starting bid: $X." No "be the first to bid!" prompts.

**Seller notification beats (all four):**
- First bid placed
- Every new high bid (granular; accept the noise)
- Ending soon (e.g., 10 min left)
- Final outcome (won / no sale)

</specifics>

<notes>
## Additional Context

**Scope shift from roadmap:** Outbid push notifications pull forward from Phase 8 into Phase 4 (core to the "fast & live" bidding feel). The rest of push (ending-soon, won, business-item-sold) stays in Phase 8. Worth flagging during research — Web Push/VAPID infrastructure will need to land here, not just Phase 8.

**Dependency to resolve:** The "consumer must have a card on file to bid" gate creates a Stripe dependency that formally belongs to Phase 6. Phase 4 handles it with a **mock "card added" boolean flag** so the gate exists conceptually without real Stripe wiring. Real Setup Intents land in Phase 6 and swap in behind the same gate.

**Why this phase matters:** Phase 4 is where the marketplace actually starts clearing at-risk inventory — the project's core value prop. Previous phases set up the stage; this is the engine that makes "auctions actually clear" real.

**Demo target:** 2026-05-02. The full auction arc (list → bid → close → winner recorded) has to be demo-able by then, but real money and real delivery don't need to be.

</notes>

---

*Phase: 04-auction-engine*
*Context gathered: 2026-04-18*
