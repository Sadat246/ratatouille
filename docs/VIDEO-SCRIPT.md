# Video script: the two-minute demo

A shot-by-shot script for a recording of 120 seconds or less: five timed scenes, each with the screen, the exact click path, the spoken line, and the on-screen caption. Every code claim below was checked against `bf4fa0c` (`main` after PR #8, the pilot fixes). Every number is a row in [`METRICS.md`](./METRICS.md).

The voice is the owner's (Ehfaz Zohaer, `ehfuzzz`): plain words, no sales language, honest about what is switched off.

## Scene table

| # | Duration | Screen | Required caption |
|---|---|---|---|
| 1 | 10 s | `/` (signed out) | Ratatouille: live auctions for sealed grocery items before they expire |
| 2 | 30 s | `/sell` (seller profile) | OCR/AI autofill is disabled in this build — fields entered manually |
| 3 | 35 s | `/shop`, `/shop/<auctionId>`, `/shop/bids`, seller's `/sell/demo` | Feed sorted by ending-soonest · competitor outbid triggered from the seller's demo controls |
| 4 | 25 s | `/shop/orders?focus=<auctionId>`, then `/sell/fulfillment` | Stripe test mode · pickup only in this build (delivery hidden by a pilot flag) |
| 5 | 20 s | Static architecture card | The card text in Scene 5 |
| | **120 s** | | |

The durations sum to exactly 120 s, so there is no slack. Use hard cuts only (no title cards, no fades) and trim dead air. If the edit runs long, cut from the silent parts of Scene 2's photo capture first.

## Setup (before recording)

**Where to record.** Run the app locally (`npm run dev`, `http://localhost:3000`) against a database that is **not** the production database the Phase-13 pilot is using. Scene 3 needs the demo controls (`DEMO_MODE_ENABLED=1`), and "Reset ambient world" / "Prepare hero auction" write `[Demo …]` listings into whatever database the app points at. Seeded listings in the pilot's live feed would sit next to real stores. Check `DATABASE_URL` points at a scratch database or Neon branch before you click anything. Do not set `DEMO_MODE_ENABLED` on the production deployment.

**Environment switches the script depends on** (names only; never open `.env` on camera):

| Variable | Needed for |
|---|---|
| `DEMO_MODE_ENABLED=1` | The seller's **Demo** nav link and `/sell/demo` (Scene 3 outbid). Without it `/sell/demo` is a 404. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (a `pk_test_` key), `STRIPE_SECRET_KEY` (an `sk_test_` key), `STRIPE_WEBHOOK_SECRET` with `stripe listen --forward-to localhost:3000/api/webhooks/stripe` running | The Scene 4 caption "Stripe test mode". With no `STRIPE_SECRET_KEY` the app takes the dev-mock capture path (`lib/payments/auction-trigger.ts:103-108`, processor `dev_mock`) and shows "Turn on reserving" instead of a Stripe card form. That recording would make the caption false, so do not record that way. |
| `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Optional. Only for the push beat in Scene 3. If any are missing, cut the push beat (see Scene 3). |

**Two browser profiles, plus one signed-out window.**

- **Profile A (normal window): the seller.** Signed in with a throwaway Google account that has a business role and a made-up store name.
- **Profile B (incognito or a second Chrome profile): the shopper.** Signed in with a second throwaway Google account that has a consumer role. **Give it a display name** (for example "Demo Shopper"). The seller's Pickups page prints `name || email` for the buyer (`components/fulfillment/seller-fulfillment-list.tsx`), and the "Open fulfillments" list below it always prints the buyer's email (`app/(business)/sell/fulfillment/page.tsx`).
- **Scene 1 must be recorded signed out.** `/` redirects any signed-in, onboarded user to their role home (`app/page.tsx`). Record Scene 1 first, in a fresh incognito window, before profile B signs in.
- Sign-in is Google-only, so each profile needs its own Google account.

**State to have ready.**

1. Shopper (profile B) has a Stripe test card already saved (`4242 4242 4242 4242`, any future expiry, any CVC, per the README's demo walk-through), so the bid panel is unlocked. Card entry is not filmed.
2. Shopper has no open orders, and the seller's Pickups page has no open pickups, so each shows only what this take creates.
3. Seller has a real sealed item in hand with a printed date on it, for the webcam capture in Scene 2.
4. After Scene 2 is recorded, and **before** Scene 3: on the seller's `/sell/demo`, click **Reset ambient world**, then **Prepare hero auction**. That gives the feed several live cards plus one hero auction (reserve $14.00, buyout $24.00; `lib/demo/service.ts:510-511`). The hero listing's title starts with "[Demo Hero]". That is fine, because the Scene 3 caption says the outbid is triggered from the demo controls. The listing published in Scene 2 stays live.
5. Do not click the feed's **Nearest** tab. The distance is hard-coded to `null` (`lib/auctions/queries.ts:121`).

**What must never be on screen.**

- Any real email address: the account menu, the browser's profile chip, the Google account chooser, the buyer email in **Open fulfillments** on `/sell/fulfillment` (keep that section scrolled out of frame).
- A teammate's account menu, or any teammate's account at all.
- Stripe keys, `.env`, the terminal running `stripe listen` (it prints a `whsec_` secret), the Stripe Dashboard's API keys page, and DevTools network tabs with headers. Keep the terminal and editor off the recorded display, and record the browser window only.
- Landing-page cards below the hero. The "Local pickup" card says "Geo-filtered by where you already are" and step 02 says "sorted by urgency and distance" (`app/page.tsx`). The feed is sorted by ending-soonest and has no location filter, so do not scroll there.

---

## Scene 1: the problem (10 s)

- **Screen:** `http://localhost:3000/` in the signed-out window. Hero: "Sealed grocery deals, ending soon."
- **Click path:**
  1. 0:00 Load `/`. The hero is already in frame.
  2. 0:00-0:10 Hold on the hero. No clicks and no scrolling (see the landing-page warning above).
- **Spoken line (about 22 words):** "Stores throw away sealed food as its date gets close. Ratatouille auctions it off so they get some of that margin back."
- **On-screen caption:** `Ratatouille: live auctions for sealed grocery items before they expire`

## Scene 2: the seller lists an item (30 s)

- **Screen:** profile A, `/sell`, the **Snap to list** card.
- **Click path:**
  1. 0:00 Sign-in is already done. Land on `/sell` and scroll to **Snap to list**.
  2. 0:02 On **Product photo**, click **Capture**. The camera modal opens ("Use your webcam, then take the shot."). Click **Take photo**, then **Looks good**.
  3. 0:08 **Seal photo**: **Capture**, **Take photo**, **Looks good**.
  4. 0:13 **Package-date photo**: **Capture** (aim at the printed date), **Take photo**, **Looks good**. The slot shows an OCR panel saying it is unavailable. Leave it on screen for a second. That panel is the honest evidence.
  5. 0:18 Type the **Product title**, pick a **Category**, then type **Reserve price** and **Buyout price** (buyout above the reserve), and pick the **Package date** by hand. The **Auction ends** field is pre-suggested, so leave it.
  6. 0:26 Click **Publish listing**. The banner reads "Listed. The desk is reset and ready for another item."
- **Editing note:** the three captures plus the typing take longer than 30 s live. Jump-cut the waits (upload spinners, typing) so on-screen time is 30 s. Every step above is real and in order.
- **Spoken line (about 38 words):** "I'm the store: three photos, then I type the title, both prices, and the date myself, because the app's date-reading and autofill are switched off in this build. Publish, and the auction is live."
- **On-screen caption:** `OCR/AI autofill is disabled in this build — fields entered manually`
- **Code check:** the three routes `app/api/listings/ocr/route.ts`, `gemini-extract/route.ts`, and `ai-autofill/route.ts` each set `const FEATURE_DISABLED: boolean = true;` at line 9 and return 503 (METRICS rows "Disabled feature: OCR / Gemini extract / AI autofill"). The composer's static copy still says "Vision OCR reads the package-date image; Gemini fills listing fields" (`components/listing/listing-composer.tsx`). The caption is there so that text does not mislead the viewer.

## Scene 3: the shopper bids, gets outbid, reserves it (35 s)

- **Screen:** profile B, `/shop` then `/shop/<auctionId>` then `/shop/bids`, cutting to profile A's `/sell/demo` for the outbid.
- **Click path:**
  1. 0:00 Profile B on `/shop`. The feed is on the **Ending Soon** tab (the default, `components/buyer/buyer-feed.tsx`). Scroll the cards once.
  2. 0:05 Click the hero card ("[Demo Hero] …"). The detail page `/shop/<auctionId>` opens with the current bid, a countdown, and **Bid controls**.
  3. 0:09 Click **Place $14.00 bid** (the label is the minimum next bid). The panel says "Bid accepted by the server." and "You are currently leading."
  4. 0:14 Cut to profile A, **Demo** nav link (`/sell/demo`), click **Inject competitor outbid**. The message reads "Competitor outbid injected through the real auction service." It is enabled only after the shopper has led, which step 3 did.
  5. 0:19 Cut back to profile B. **Push beat, if `VAPID_*` is configured:** show the "You were outbid" notification (`lib/push/notify-shared.ts`), then click it. **If it is not configured, cut the push beat** and say so in the spoken line below. Then open **My Bids** (`/shop/bids`) and show the row marked outbid.
  6. 0:26 Go back to the auction page. Click **Reserve it for $24.00**. The label is the buyout button. The panel says "Buyout accepted by the server." and the browser redirects to `/shop/orders?focus=<auctionId>`. That page is where Scene 4 starts.
- **Spoken line, no-push version (about 46 words):** "Now I'm a shopper, and the feed is sorted by ending-soonest. I bid, a seeded competitor outbids me through the real bid code, and I use 'Reserve it', which is the fixed buyout price. Push alerts need keys I never set up, so I'm skipping that part."
- **Spoken line, push version:** replace the last sentence with "My phone gets the outbid alert."
- **Never say** "geo-sorted", "nearby", or "sorted by distance". Distance is `null` for every row (`lib/auctions/queries.ts:121`, "no geo filter").
- **On-screen caption:** `Feed sorted by ending-soonest · competitor outbid triggered from the seller's demo controls`
- **Code check:** the button label is `Reserve it for ${formatCurrency(buyoutPriceCents)}` (`components/auction/auction-bid-panel.tsx:144`). The mock-card gate now reads "Turn on reserving" (`components/auction/mock-card-panel.tsx:99,124`). With a Stripe publishable key set, that panel returns `null` (`mock-card-panel.tsx:28-29`) and the Stripe card form takes over, which is why the shopper's test card is pre-saved. The word "reserve" means two things on this page: the auction's reserve price ("Reserve $14.00") and the **Reserve it** button, which is the buyout. Say "reserve price" and "Reserve it" exactly, and do not say "reserve" alone.

## Scene 4: close, settlement, pickup (25 s)

- **Screen:** profile B at `/shop/orders?focus=<auctionId>`, then profile A at `/sell/fulfillment` (nav link **Pickups**).
- **Click path:**
  1. 0:00 Profile B arrives from the **Reserve it** redirect. The order card (highlighted by `focus`) shows **Store pickup** and a **Pickup code** box with the 8-character code shown 4+4 (for example `K7P3 X9MQ`; `formatPickupCode` in `lib/fulfillment/pickup-code.ts`). There is **no "Get it delivered" section**, only **Pickup in store**.
  2. 0:06 Click **Pick up in store**. The card says "Pickup selected. Your code is ready." and the badge reads "Ready for pickup".
  3. 0:10 Cut to profile A. Click **Pickups** in the seller nav (`/sell/fulfillment`). The **Verify a pickup** card ("Type the code from the student's phone.") lists the order.
  4. 0:13 Type the code into the **K7P3 X9MQ** field. Spaces and case do not matter (`normalizePickupCodeInput`). Click **Verify**. The card says "Pickup verified." and the badge reads "Picked up".
  5. 0:20-0:25 Hold on the verified card. **Do not scroll down** to **Open fulfillments**, which prints the buyer's email.
- **Spoken line (about 42 words):** "The buyout closed the auction and set up my order in Stripe test mode, so no real money moved. Delivery is hidden in this pilot, so it's pickup only: I show the store my code, and they type it in to verify."
- **On-screen caption:** `Stripe test mode · pickup only in this build (delivery hidden by a pilot flag)`
- **Code check (pickup-only adjustment):**
  - `export const PILOT_PICKUP_ONLY = true;` at `lib/fulfillment/status.ts:12`, with `canChooseDelivery` returning `false` while it is set (`status.ts:14-15`). `lib/fulfillment/queries.ts:191` feeds that into each order.
  - `components/fulfillment/consumer-fulfillment-card.tsx:279` renders the **Get it delivered** section only when `item.canChooseDelivery`, so it does not appear.
  - `components/fulfillment/seller-fulfillment-list.tsx:114` shows **Verify pickup** for `pending_choice` rows when `PILOT_PICKUP_ONLY`, and `verifyPickupForBusiness` (`lib/fulfillment/service.ts:739`) treats the store's verification as the pickup choice. That is why step 3 works even if the shopper skipped step 2.
  - The seller nav has a **Pickups** link to `/sell/fulfillment` (`components/auction/seller-shell.tsx:23`).
  - Pickup code: `PICKUP_CODE_LENGTH = 8` (`lib/fulfillment/pickup-code.ts`).
- **There is no Uber Direct beat.** The flag hides delivery, so the script does not show the sandbox stub, and the caption says so instead. When `PILOT_PICKUP_ONLY` is flipped to `false`, this scene needs rewriting (the old caption was "Stripe test mode · Uber Direct sandbox stub").
- **Copy to be aware of.** The detail page in Scene 3 says "Nothing is charged in the app" (`components/buyer/listing-detail-client.tsx:354`), which is pilot wording. With Stripe test keys set, the close does create a test-mode charge (`lib/payments/auction-trigger.ts`, `chargeBuyout`). The spoken line above says only "Stripe test mode" and "no real money moved", both true. Do not read that on-screen sentence aloud.

## Scene 5: architecture card (20 s)

- **Screen:** a static card (slide or image). No app footage.
- **Click path:** none. Fade-free cut from Scene 4, hold 20 s.
- **Card text:**

  > **69.5% of the surviving code on `main`, 15,921 of 22,897 lines**
  > is mine, by `git blame`, measured on `bf4fa0c`. Commands are in `docs/METRICS.md`.
  >
  > **Repo scale:** 199 code files · 17 pages · 26 API routes · 16 tables · 8 migrations · 28 tests in 6 files
  >
  > **Auction close:** a bid or a buyout locks the auction row inside a database transaction (`for update`, `lib/auctions/service.ts:105`). The overdue sweep skips rows another request already holds (`skip locked`, `lib/auctions/service.ts:762`). There is no scheduler: an overdue auction is closed by whichever request next loads the feed or the auction page.
  >
  > **What I owned:** 34 commits, 7 of the 8 migrations, both commits to `lib/fulfillment/`.
  > **What teammates owned:** Raihan Zaman, 47 commits and 3,270 surviving lines. Sadat Ahmed, 11 commits and 2,993 lines. MMahmud24, 26 commits and 713 lines.
  >
  > **How it was built:** two days (136 commits on 2026-04-18 and 2026-04-19), four people, AI-orchestrated: plans written as documents in `.planning/`, coding agents writing the code, the people on the commits reviewing it.
  > **Separate from the two days:** 2 commits on 2026-09-30, the pilot fixes (PR #8).
  >
  > Off in this build: OCR and AI autofill (503), delivery (pilot flag). Push alerts need `VAPID_*` keys that were never set up.

- **Spoken line (about 43 words):** "69.5% of the surviving code on main is mine, 15,921 of 22,897 lines, by git blame. Four of us built this in two days with AI coding agents working from written plans, and two more commits on September 30 are the pilot fixes."
- **On-screen caption:** the card text above is the caption. Set the proof line exactly as `69.5% of the surviving code on `main`, 15,921 of 22,897 lines` (with `main` in monospace).
- **Why the card omits the line count.** `METRICS.md` has two line counts on purpose (22,897 by `git blame`, 22,889 by `wc -l`; see the note under its table). Putting both on one card would look like a mistake, so the card uses file count only.
- **Delete the push sentence** in the last card line if `VAPID_*` is configured in the recording profile and Scene 3 used the push version.

## Number index (every figure on screen or spoken)

| Figure in this script | `METRICS.md` row |
|---|---|
| 69.5%, 15,921 of 22,897 lines | "Surviving-line share, `ehfuzzz` (proof number)" |
| 3,270 / 2,993 / 713 surviving lines | "Surviving lines" rows for Raihan Zaman, Sadat Ahmed, MMahmud24 |
| 34 / 47 / 11 / 26 commits | "Commits" rows for `ehfuzzz`, Raihan Zaman, Sadat Ahmed, MMahmud24 (non-merge) |
| Two days, 136 commits | "Build span" |
| 2 commits on 2026-09-30, PR #8 | "Commits after the build span" |
| 199 code files | "Code lines" (22,889 lines in 199 files; only the file count is used) |
| 17 pages / 26 API routes / 16 tables / 8 migrations | "Pages" / "API routes" / "DB tables" / "Migrations" |
| 7 of the 8 migrations | "Migrations" (`ehfuzzz` added 7) |
| both commits to `lib/fulfillment/` | "`lib/fulfillment/` size and authors" |
| 28 tests in 6 files | "Tests" |
| 8-character pickup code | not a METRICS row (a code constant, `PICKUP_CODE_LENGTH = 8`; cited above) |
| $14.00 reserve / $24.00 buyout | not a METRICS row (demo-seed constants, `lib/demo/service.ts:510-511`; shown live in the app, never spoken as a claim) |
| `bf4fa0c` | the commit every METRICS row was measured on |
