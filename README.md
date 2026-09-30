# Ratatouille

Ratatouille is a marketplace where grocery stores auction sealed, soon-to-expire stock to shoppers nearby.

It is a four-person team project from a two-day build. It has not launched publicly, and it has no users and no revenue. As of 2026-09-30 a small pilot with a few stores near Princeton is being prepared.

## Try it

**[https://ratatouille-xi.vercel.app/preview](https://ratatouille-xi.vercel.app/preview)** is a read-only view of the marketplace. Open it in any browser. No account is needed.

You can look at whatever stores have listed right now and open one item to see the details. You cannot bid, buy, or post anything from there. If no store has a listing running when you visit, you will see an empty page instead.

The real app, where you bid and where stores list, sits behind sign-in. Sign-in is Google-only. There is no allowlist in the code; whether a given Google account gets in depends on the OAuth app's settings in Google's console, which I have not opened up. The preview is the way in for a stranger.

## The problem

Grocery stores write off sealed food that is close to its date. The bet, still untested, is that shoppers nearby would buy it at a discount.

The match has to happen locally and before the clock runs out, and nobody knows the right price in advance. That is why I built it as an auction and not a coupon. The shoppers set the price.

## How it works

1. A store lists a sealed item with a reserve price, a buyout price, and an end time.
2. Shoppers nearby bid, or pay the buyout price to end it early.
3. The winner picks the item up in store with a pickup code. Payment in the app is Stripe test mode only, and in the current pilot build the shopper pays the store at the counter.

## Architecture

It is a Next.js App Router app on Neon Postgres with Drizzle. Stores and shoppers are separate roles, and each one gets its own part of the app after sign-in.

- Routing by role lives in [`proxy.ts`](proxy.ts). Sign-in is NextAuth v5 with database sessions, set up in [`auth.ts`](auth.ts) and [`lib/auth/`](lib/auth/).
- The auction engine (bid, buyout, cancel, close) is in [`lib/auctions/`](lib/auctions/).
- Payment settlement, in Stripe test mode, is in [`lib/payments/`](lib/payments/).
- Pickup codes, the store's pickup-verify page, and the delivery code are in [`lib/fulfillment/`](lib/fulfillment/).
- Web push notifications are in [`lib/push/`](lib/push/).
- The data model is in [`db/schema/`](db/schema/), with migrations in [`drizzle/`](drizzle/).

The hard part is closing an auction exactly once. Bids can arrive at the same moment an auction ends, and an overdue auction can be closed by any request that notices it, not only by a scheduled job.

So the close logic runs inside a database transaction that locks the auction and listing rows. The sweep that finds overdue auctions skips rows another request already holds. Two requests cannot both close the same auction. The code is in [`lib/auctions/service.ts`](lib/auctions/service.ts), and it is the part of this repo I would read first.

## Proof

69.5% of the surviving code on `main` is mine — 15,921 of 22,897 lines, by `git blame`.

The command, the raw output, and every other number in this README are in [`docs/METRICS.md`](docs/METRICS.md). It is measured on commit `bf4fa0c`, and anyone can re-run it on a clone.

There are no usage or traffic numbers, because nobody used it.

## My contribution

I am `ehfuzzz` (Ehfaz Zohaer). The proof number above is the short version: 69.5% of the surviving code on `main` is mine — 15,921 of 22,897 lines, by `git blame`. Here is what that code is, as the git record shows it.

- The project foundation and architecture.
- The Postgres data model, and 7 of the 8 committed migrations.
- NextAuth v5 sign-in and the split between business and consumer onboarding.
- The auction engine in `lib/auctions/service.ts` and `lib/auctions/queries.ts`: bid, buyout, cancel, close, and settlement. The two files are 796 and 866 lines. Raihan and MMahmud24 later added to `queries.ts`.
- The seller listing pipeline and the `/sell` desk. Raihan's OCR work and Sadat's UI pass later changed the listing composer.
- Fulfillment end to end: pickup codes, the store's verify page, and the delivery code. `lib/fulfillment/` is 1,887 lines, all in my commits.
- Web push notifications.
- The demo seed harness.
- The desktop shopper shell.

What I did not build:

- **Stripe payments and OCR** are Raihan Zaman's. I wrote the first OCR scaffold inside the listings pipeline and the commit that later disabled it; by `git blame` on the OCR and Gemini files, most of the surviving lines are his.
- **The consumer-feed geo-query, the photo carousel, and the vitest setup** are MMahmud24's.
- **The UI and theme revamp** is Sadat Ahmed's.

## Team

Commits are non-merge commits reachable from `origin/main`. Code lines are the lines each person still owns on `main`, by `git blame`. The basis and the commands are in [`docs/METRICS.md`](docs/METRICS.md). The commit counts come from `git log --no-merges --pretty=%an origin/main | sort | uniq -c | sort -rn`.

| Name | GitHub | Area | Commits | Code lines |
|---|---|---|---|---|
| Ehfaz Zohaer | `ehfuzzz` | Foundation, data model, auth, auction engine, seller desk, fulfillment, push, demo seed | 34 | 15,921 |
| Raihan Zaman | `raihanzaman` | Stripe payments, OCR | 47 | 3,270 |
| Sadat Ahmed | `Sadat246` | UI and theme revamp, landing page | 11 | 2,993 |
| MMahmud24 | `MMahmud24` | Consumer-feed geo-query, carousel, vitest setup | 26 | 713 |

Commit count and surviving lines measure different things. Raihan has the most commits and I have the most surviving lines. Neither column is a measure of how hard anyone worked.

## How this was built

Two days. There are 136 commits on 2026-04-18 and 2026-04-19, from four people.

It was AI-orchestrated, and I want that to be plain. The work was planned as documents in [`.planning/`](.planning/), which holds 110 plan and summary files. Coding agents then executed those plans, and the people whose names are on the commits merged the result. [`CODEX_PROMPT.md`](CODEX_PROMPT.md) is one of the prompts I gave an agent, for a cleanup pass. I do not want to oversell it, and I do not want to hide it.

Two more commits landed on 2026-09-30, to prepare a small store pilot: a fix to pickup-code verification and a pickup-only flag.

Some of it is switched off or fake, and I want that plain too: OCR and Gemini autofill are hard-disabled, and a mock-card path runs alongside Stripe test mode, so no real money moves anywhere. The table below gives the file and line for each.

## What's cut or disabled

| Feature | Status | Where |
|---|---|---|
| OCR | Turned off. The route returns 503 because `FEATURE_DISABLED = true`. | `app/api/listings/ocr/route.ts:9` |
| Gemini autofill | Turned off, same flag, same 503. | `app/api/listings/gemini-extract/route.ts:9` |
| AI autofill | Turned off, same flag, same 503. | `app/api/listings/ai-autofill/route.ts:9` |
| Mock-card path | A fake card flow that runs alongside Stripe test mode. No real money moves in either. | `app/api/consumer/mock-card/route.ts`, `components/auction/mock-card-panel.tsx` |
| Delivery | Hidden while `PILOT_PICKUP_ONLY = true`, so winners can only choose pickup. The delivery code is still there. | `lib/fulfillment/status.ts:12` |

## Two-minute demo

<!-- VIDEO_URL -->

The script for the recording is in [`docs/VIDEO-SCRIPT.md`](docs/VIDEO-SCRIPT.md).

## Run it locally

```bash
git clone https://github.com/Sadat246/ratatouille.git && cd ratatouille
npm install
cp .env.example .env
npm run dev
```

The full operator walkthrough (database, Stripe webhooks, demo paths, fulfillment, push) is in [`docs/RUNBOOK.md`](docs/RUNBOOK.md).
