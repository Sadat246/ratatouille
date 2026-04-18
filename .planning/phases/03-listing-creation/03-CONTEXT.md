# Phase 3: Listing Creation (Snap-to-List) - Context

**Gathered:** 2026-04-18
**Status:** Ready for research

<vision>
## How This Should Work

A shopkeeper standing behind a busy counter pulls out their phone, opens Ratatouille, and lists an at-risk item in under 60 seconds — between customers. The flow feels like a Depop/Vinted listing: a photo grid sits at the top, and a scrollable form (price, expiry, notes) lives underneath. One screen, no wizard, mobile-native.

Camera-forward but not flashy. They snap three photos in sequence — product, seal, expiry — with a one-tap "looks good?" confirm between each so a blurry shot doesn't break OCR. The expiry date pre-fills from the photo; they tap to confirm or edit. Pricing screen suggests reserve, buyout, and end-time as smart defaults — they accept or tweak. Title, optional notes, category from a fixed short list.

Hit publish, and instead of celebrating, the app asks: "Listed! Add another?" Because the realistic case is a shopkeeper clearing out four things at once, not listing one trophy item.

</vision>

<essential>
## What Must Be Nailed

- **Speed — listing in under 60 seconds.** If it takes longer than a minute, busy shopkeepers won't use it. Every interaction decision should be measured against the clock.

</essential>

<boundaries>
## What's Out of Scope

- **Bulk listing / multi-item upload** — one item at a time. No CSV import, no batch capture. The "add another" prompt is the bulk story for now.
- **Inventory/stock tracking** — each listing is one unit. No quantity field, no stock decrement.
- **Editing/deleting after publish** — not addressed in this phase; defer to later.
- **Barcode/product catalog lookup** — no auto-fill of product name from a barcode. Manual title entry only.

</boundaries>

<specifics>
## Specific Ideas

- **Reference: Depop / Vinted listing flow** — photo grid up top, form below scrolls. Single screen, marketplace-style.
- **Photo capture:** snap → quick "looks good?" confirm → next photo. Three photos: product, seal, expiry.
- **OCR:** auto-fill the expiry date, shopkeeper taps to confirm or edit.
- **OCR fallback:** if it can't read the date, gentle nudge — "couldn't read — type it" with a date picker. No blame, don't block the flow.
- **Pricing screen:** smart defaults for reserve, buyout, and end-time, all on one screen. Accept or tweak.
- **Listing fields beyond photos/price/expiry:** product title (free text), short description/notes (optional), category (fixed short list with an "Other" free-text fallback).
- **Drafts:** auto-save mid-flow. If a customer walks up, they can pick up later from a draft.
- **Post-publish:** "Listed! Add another?" — big button, optimized for clear-out runs.

</specifics>

<notes>
## Additional Context

The mental model the user keeps returning to: a shopkeeper between customers, phone in one hand, item in the other, 30 seconds to spare. Every design choice in this phase should be evaluated against that scenario, not against a leisurely browser-on-laptop flow.

The "add another" prompt and draft auto-save both reflect the same intuition: real-world use is bursty and interruptible, not a clean single-item flow.

Categories are fixed (8–10 options like Dairy, Bakery, Produce, Meat, Pantry, Frozen, Beverages, Prepared) so the consumer feed can filter cleanly later, but "Other" is allowed for edge cases without polluting the main list.

</notes>

---

*Phase: 03-listing-creation*
*Context gathered: 2026-04-18*
