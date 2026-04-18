# Phase 2: Auth & Onboarding - Context

**Gathered:** 2026-04-18
**Status:** Ready for research

<vision>
## How This Should Work

Auth is **role-first**: the entry point IS the role choice. From the Phase 1 home, "Shop deals" and "Sell inventory" lead to distinct sign-in routes (e.g., `/signin/consumer` and `/signin/business`). Each route runs its own Google OAuth flow. The account that comes back is unambiguously consumer OR business — **separate accounts per role**. If the same person wants both sides, they use different Google accounts. This keeps the v1 model clean and removes a whole class of "which mode am I in" UX problems.

After OAuth returns for a first-time user, they go through a **multi-step onboarding wizard with a progress indicator**, collecting the fields each role needs:

- **Business** — store name → geocoded street address → contact phone/email for pickup → open hours / pickup window.
- **Consumer** — location (zip or browser geolocation prompt) → display name (defaulting to Google name) → delivery address for Uber Direct later.

Once onboarding completes, each role lands on their Phase 1 shell placeholder:
- **Consumer → feed placeholder** (filled in by Phase 5)
- **Business → dashboard placeholder** (filled in by later phases)

Route protection is enforced everywhere: consumers can't reach business routes, businesses can't reach consumer routes.

</vision>

<essential>
## What Must Be Nailed

All three matter equally:

- **Role separation feels clean** — a consumer never accidentally sees business UI and vice versa. Middleware-enforced route protection, role-aware nav, no leakage across sides.
- **Onboarding data is reliable** — when the wizard finishes, the business address geocodes to real lat/lng and the consumer's location is captured correctly. Phases 5 (feed) and 7 (fulfillment) will trust this data without re-validating.
- **Sign-in is frictionless** — one Google click plus the minimum field set. No one abandons the wizard before landing in the app.

</essential>

<boundaries>
## What's Out of Scope

- **Business verification / KYC** — no document upload, no manual approval. Any Google account can claim a storefront for the demo.
- **Admin / moderator roles** — no admin panel, no support role. Just consumer vs business.
- **Edit-profile / change-role flows** — users can't edit their profile or switch roles post-onboarding. Revisit in a later phase if needed.
- **Business onboarding via non-OAuth identity** — Google-only per PROJECT.md.
- **Anything downstream of onboarding** — listing creation is Phase 3, feed is Phase 5, payments is Phase 6, fulfillment is Phase 7.

</boundaries>

<specifics>
## Specific Ideas

- **Multi-step wizard with progress** — classic step indicator UX (1/3, 2/3, 3/3). Feels thorough and guided, especially for the business side where there are more fields. Must still fit the Whatnot/Depop-ish aesthetic from Phase 1.
- **Two distinct sign-in routes** — `/signin/consumer` and `/signin/business` (or equivalent). Role never mixes.
- **Google defaults used where possible** — pre-fill display name from Google profile so consumers only confirm it.
- **Geocoding happens at onboarding, not later** — business street address resolves to lat/lng before the wizard finishes. Same for consumer location (zip → lat/lng or direct geo permission).

</specifics>

<notes>
## Additional Context

- Two Google accounts per person (one consumer, one business) is a deliberate simplification. The 14-day timeline doesn't have room for a dual-role account model — revisit post-demo.
- "Address geocodes cleanly" is an onboarding-time correctness concern because later phases depend on it:
  - Phase 5 feed uses business address for distance sort.
  - Phase 7 fulfillment uses business address for pickup and consumer delivery address for Uber Direct.
  Failing softly here cascades into two other phases.
- No demo-user seeding is specified here; seeded businesses land in Phase 8 (Demo Polish) and will likely bypass the wizard via direct DB seed rather than running the OAuth flow.
- Route protection pattern (middleware vs layout-level guard) is a research/planning decision.

</notes>

---

*Phase: 02-auth-onboarding*
*Context gathered: 2026-04-18*
