# Phase 2: Auth & Onboarding - Research

**Researched:** 2026-04-18  
**Domain:** Google OAuth, role-first onboarding, and route protection in a Next.js 16 App Router app with Drizzle/Postgres  
**Confidence:** MEDIUM

## Summary

Phase 2 is not just "add Google login." The implementation quality hinges on three separate concerns working together: modern Next.js/Auth.js integration, a role-first onboarding model that keeps business and consumer accounts cleanly separated, and reliable onboarding-time location capture that later feed and fulfillment phases can trust.

The strongest self-hosted stack for this roadmap is **Auth.js + Google provider + Drizzle adapter + database-backed app data + layered server-side authorization**. The main ecosystem wrinkle is versioning: as of 2026-04-18, the official Auth.js docs for Next.js tell you to install `next-auth@beta` and use the v5 `auth.ts` / `auth()` / `proxy.ts` pattern, while the stable npm line is still v4.24.14. For a greenfield Next.js 16 App Router app, the v5 beta line matches the current docs and framework model best, but that choice should be explicit in planning.

For this product's constraints, the cleanest role model is: **one Google account maps to one app account and one role in v1**. Do not try to build dual-role switching or account linking now. Use two public sign-in entry points, but the same Google provider. The role choice belongs in the app flow, not in separate OAuth infrastructure. After sign-in, complete onboarding in a wizard that writes role-specific data transactionally and then routes the user to the correct shell.

For location capture, do not rely on raw free-text geocoding or on browser geolocation alone. The expert pattern is an interactive address selection flow for business addresses, followed by geocoding of the confirmed selection. For consumers, browser geolocation is an optional shortcut, not a requirement; manual zip/address entry must remain available.

**Primary recommendation:** Use Auth.js v5 beta on purpose with a single Google provider, route-level role intent, server-side onboarding writes, database-backed role persistence, and address autocomplete plus confirmed geocoding instead of hand-rolled location parsing.

## Standard Stack

The established stack for this phase:

### Core

| Library / Service | Version | Purpose | Why Standard |
| --- | --- | --- | --- |
| Next.js | 16.2.4 | App framework, routing, Server Components, `proxy.ts` | Matches the Phase 1 foundation recommendation and current Next.js auth guidance. |
| `next-auth` | 5.0.0-beta.31 | Auth.js for Next.js | Current official docs path for Next.js App Router, `auth.ts`, `auth()`, and `proxy.ts`. |
| `next-auth` stable fallback | 4.24.14 | Stable fallback if beta is rejected | Still the latest stable npm line, but uses an older API surface than the current docs. |
| `@auth/drizzle-adapter` | 1.11.2 | Auth.js adapter for Drizzle-backed auth tables | Keeps auth state inside the Postgres/Drizzle stack already chosen in Phase 1. |
| `drizzle-orm` | 0.45.2 | Typed ORM / schema layer | Already the foundation recommendation; avoids mixing ORMs in Phase 2. |
| Google provider | Bundled in `next-auth` | OAuth / OIDC login | Lowest-friction sign-in for both roles and directly called out in the roadmap. |

### Supporting

| Library / Service | Version | Purpose | When to Use |
| --- | --- | --- | --- |
| `zod` | 4.3.6 | Server- and form-side validation | Validate onboarding steps and guard server actions. |
| `react-hook-form` | 7.72.1 | Wizard form state | Best fit if the onboarding flow is a true client-side stepper. |
| `@hookform/resolvers` | 5.2.2 | RHF + Zod bridge | Use if RHF is chosen for the wizard. |
| `@mapbox/search-js-react` | 1.5.1 | Address autocomplete for web forms | Best fit if you want a free-tier-friendly, web-first address entry flow. |
| Google Places API + Geocoding API | Current service | Address autocomplete + confirmed geocode | Better fit if later phases will already commit to Google Maps APIs. |
| Browser Geolocation API | Web platform | Optional consumer location shortcut | Useful only as a convenience path, never as the sole onboarding path. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
| --- | --- | --- |
| Auth.js + Drizzle | Better Auth | Modern and Next.js 16-compatible, but changes the roadmap assumption and auth stack midstream. |
| Auth.js + Drizzle | Clerk | Faster drop-in auth UI and hosted identity, but adds vendor lock-in and moves user management outside the planned Postgres-first stack. |
| Auth.js + Neon | Supabase Auth | Strong if auth + DB both live on Supabase, but weaker fit because Phase 1 already pointed to Neon + Drizzle. |
| Auth.js / Better Auth | Lucia | No longer a drop-in auth library; the current site is guidance/resources, not the standard stack for this phase. |
| Mapbox Address Autofill | Google Places + Geocoding | Google is stronger if you already want the Maps ecosystem later, but requires billing setup and more platform surface area. |
| Google Places + Geocoding | Mapbox Search JS | Simpler web autofill package and friendlier free usage for a demo, but not as tightly aligned with Google's broader location APIs. |

### Installation

```bash
npm install next-auth@beta @auth/drizzle-adapter drizzle-orm
npm install zod react-hook-form @hookform/resolvers
npm install @mapbox/search-js-react
```

**Version note:** The recommendation above is for the current Auth.js docs path. If planning chooses stable `next-auth` v4 instead, use v4-specific examples throughout the phase and do not mix v5 `auth.ts` / `auth()` patterns into the implementation.

## Architecture Patterns

### Recommended Project Structure

```text
app/
  (public)/                  # Landing page and role-first entry points
  (auth)/signin/
    business/                # Starts Google sign-in for business intent
    consumer/                # Starts Google sign-in for consumer intent
  (onboarding)/
    business/                # Business wizard
    consumer/                # Consumer wizard
  (business)/                # Protected business area
  (consumer)/                # Protected consumer area
  api/auth/[...nextauth]/    # Auth route handler
components/
  auth/                      # Buttons, auth cards, account-conflict UI
  onboarding/                # Wizard steps and progress UI
db/
  schema/                    # Auth tables plus app user/profile tables
lib/
  auth/                      # Auth config and role helpers
  dal/                       # Secure server-side authz / role checks
  geo/                       # Address normalization + geocoding adapters
```

### Pattern 1: Role Intent Comes From the Route, Not Separate Google Apps

**What:** Keep one Google provider and two app entry routes. Each route starts the same provider sign-in flow, but uses a different `redirectTo` target. Persist the actual role during onboarding, not inside custom OAuth provider wiring.

**When to use:** When both roles use the same identity provider and same scope set, but the product wants a clean role-first experience.

**Why this is the recommended pattern here:**  
- Google provider docs assume a single callback route.  
- Auth.js already supports provider-specific sign-in plus `redirectTo`.  
- The product explicitly wants separate accounts per role, not a complicated account-linking model.  

**Implementation guidance (inference from Auth.js login + Google provider docs):**
- `/signin/business` should start Google auth and redirect into the business onboarding route.
- `/signin/consumer` should do the same for the consumer onboarding route.
- If a signed-in account already has the opposite role, block the flow and instruct the user to use a different Google account.
- Do not create duplicate Google OAuth apps unless the roles truly need different scopes or branding, which this phase does not.

**Example:**

```tsx
import { signIn } from "@/auth";

export function BusinessGoogleButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("google", { redirectTo: "/onboarding/business" });
      }}
    >
      <button type="submit">Continue with Google</button>
    </form>
  );
}
```

### Pattern 2: Split Authentication From Onboarding Completion

**What:** Let OAuth create or resolve the base user identity, then collect role-specific onboarding data in a separate wizard. The first successful onboarding write sets the role and creates any role-specific rows.

**When to use:** When the identity provider cannot provide the domain fields the app actually needs, such as store address, pickup hours, or consumer delivery data.

**Why it fits this product:** The phase context requires geocoded addresses, contact details, and role-specific flows that Google alone will not supply.

**Recommended flow:**
1. User signs in with Google.
2. If the account has no role yet, redirect to the role-specific onboarding wizard.
3. On final submit, write the role and the role-specific profile data in one transaction.
4. Mark onboarding complete and redirect to the correct shell.

**Example:**

```ts
type BusinessOnboardingInput = {
  storeName: string;
  addressLine1: string;
  city: string;
  region: string;
  postalCode: string;
  contactPhone: string;
  contactEmail: string;
  pickupHours: string;
};

export async function completeBusinessOnboarding(userId: string, input: BusinessOnboardingInput) {
  const place = await geocodeConfirmedAddress(input);

  return db.transaction(async (tx) => {
    const business = await tx.insert(businesses).values({
      name: input.storeName,
      addressLine1: input.addressLine1,
      city: input.city,
      region: input.region,
      postalCode: input.postalCode,
      latitude: place.latitude,
      longitude: place.longitude,
      contactPhone: input.contactPhone,
      contactEmail: input.contactEmail,
      pickupHours: input.pickupHours,
    }).returning();

    await tx.update(users).set({
      role: "business",
      onboardingCompletedAt: new Date(),
    }).where(eq(users.id, userId));

    await tx.insert(businessMemberships).values({
      businessId: business[0].id,
      userId,
      role: "owner",
    });
  });
}
```

### Pattern 3: Layered Authorization, Not Proxy-Only Authorization

**What:** Use `proxy.ts` only for fast, optimistic redirects. Perform the real session and role checks in server-side helpers, route handlers, and server actions close to the data.

**When to use:** Always.

**Why this is the standard pattern now:** Both Next.js and Auth.js explicitly warn against treating proxy/middleware as the only line of defense.

**Recommended split for this app:**
- `proxy.ts`: coarse redirect for clearly protected route groups.
- DAL helper such as `requireSession()` or `requireRole("business")`: secure check in pages, layouts, server actions, and route handlers.
- UI logic: uses session data for presentation only, never as the final authorization boundary.

**Example:**

```ts
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export async function requireRole(expectedRole: "business" | "consumer") {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin/consumer");
  }

  if (session.user.role !== expectedRole) {
    redirect(session.user.role === "business" ? "/business" : "/consumer");
  }

  return session;
}
```

### Pattern 4: Address Capture Should Be Interactive and Confirmed

**What:** Treat location capture as a small pipeline, not a plain text input:
1. User enters an address or postal code.
2. UI offers interactive suggestions.
3. User confirms a specific result.
4. App geocodes the confirmed result and stores lat/lng plus the normalized address.

**When to use:** Business onboarding always. Consumer onboarding if you collect a real delivery address now.

**Why this is the expert pattern:** Google explicitly recommends Place Autocomplete for real-time, ambiguous user input. Mapbox's address autofill is built for the same use case. Public Nominatim explicitly forbids client-side autocomplete on the shared service.

**Store these fields, not just lat/lng:**
- Raw input
- Normalized address components
- Latitude / longitude
- Geocode provider
- Provider place identifier if available
- Geocoded timestamp

### Anti-Patterns to Avoid

- **Two separate Google provider configs for consumer vs business:** This adds auth complexity without solving the real role problem.
- **Proxy-only protection:** Fast redirects are helpful, but sensitive reads and writes must still verify the session server-side.
- **Free-text geocoding on every keystroke:** It is less accurate than autocomplete for user input and wastes quota.
- **Geolocation as a hard dependency:** Browser permission denial or HTTPS issues will break onboarding if there is no manual fallback.
- **Dual-role account switching in v1:** The phase context explicitly says separate accounts per role to avoid UX and model complexity.
- **Storing only a role flag and skipping onboarding state:** You need to know whether a user is merely authenticated or actually onboarded.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don’t Build | Use Instead | Why |
| --- | --- | --- | --- |
| OAuth / OIDC / CSRF / cookie rotation | Custom Google auth flow and session cookies | Auth.js, Better Auth, or Clerk | Security-sensitive edge cases are already solved. |
| Auth adapter tables | Custom account/session/token schema guessed from examples | Official Auth.js adapter schema for Drizzle | Avoids subtle adapter breakage and migration churn. |
| Role switching / account linking in v1 | A multi-role account mode switcher | One account = one role, separate Google accounts | Matches the product simplification and avoids a whole class of bugs. |
| Route protection | Client-only checks or proxy-only checks | Server-side role helpers plus optional proxy redirects | Keeps authz close to the data and works across pages, actions, and APIs. |
| Address autocomplete | Raw geocoder calls from each keystroke | Mapbox Address Autofill or Google Places Autocomplete | Better latency, better disambiguation, fewer bad coordinates. |
| Public OSM autocomplete | Client autocomplete against the public Nominatim endpoint | A commercial autocomplete provider or your own hosted geocoder | Public Nominatim forbids autocomplete and has strict shared-capacity limits. |
| Consumer location capture | Forced exact-location prompt | Optional geolocation shortcut plus zip/address fallback | Permission denial is common and geolocation only works in secure contexts. |
| Google refresh-token handling | Offline access flow during Phase 2 | Defer until a later phase actually needs Google APIs | Extra consent friction now buys nothing for this roadmap. |

**Key insight:** The dangerous temptation in this phase is not just "write auth yourself." It is also "write just enough auth/geo glue to get through onboarding." That is where hidden edge cases pile up fastest.

## Common Pitfalls

### Pitfall 1: Mixing Auth.js v5 docs with v4 packages

**What goes wrong:** You copy current Auth.js examples using `auth.ts`, `auth()`, and `proxy.ts`, but the project installs stable `next-auth` v4 and the APIs do not line up.

**Why it happens:** The official docs for Next.js currently install `next-auth@beta`, while npm `latest` is still v4.

**How to avoid:** Decide during planning whether Phase 2 is using the v5 beta line or the v4 stable line. Pin that choice and use matching examples throughout the phase.

**Warning signs:** Missing exports, route handler examples that do not compile, or protection examples that still reference old middleware helpers.

### Pitfall 2: Treating proxy as the security boundary

**What goes wrong:** Protected pages look secure in navigation flows, but sensitive data reads or writes are reachable because the final server-side checks are missing.

**Why it happens:** Proxy feels centralized and convenient.

**How to avoid:** Use proxy only for optimistic filtering. Put authoritative checks in server components, DAL helpers, route handlers, and server actions.

**Warning signs:** Business-only actions trust client state, or API handlers assume proxy already validated the request.

### Pitfall 3: Overloading OAuth with role logic

**What goes wrong:** The implementation duplicates Google providers, invents custom state handling, or creates separate Google Cloud configs just to express app-level role intent.

**Why it happens:** Teams try to encode product roles inside provider setup instead of in their own onboarding flow.

**How to avoid:** Keep a single Google provider. Use separate public entry routes plus role-specific `redirectTo`, then persist the role during onboarding.

**Warning signs:** Provider config grows conditionals for `consumer` vs `business`, or the app needs different callback routes for the same Google scopes.

### Pitfall 4: Bad address data from non-interactive capture

**What goes wrong:** Business records get wrong or low-confidence coordinates, which later breaks distance sort and fulfillment.

**Why it happens:** Free-text geocoding is used on partial or misspelled input, or public Nominatim is treated like an autocomplete backend.

**How to avoid:** Use interactive address suggestions, then geocode the confirmed selection. Persist both the normalized address and lat/lng.

**Warning signs:** Geocoder returns multiple weak matches, coordinates land at city centroids, or address corrections happen manually after onboarding.

### Pitfall 5: Forcing browser geolocation during onboarding

**What goes wrong:** Users who deny the prompt cannot proceed, or onboarding breaks in environments where precise location is unavailable.

**Why it happens:** Geolocation is mistaken for required identity data.

**How to avoid:** Ask for location only as a convenience path and always provide manual zip/address entry. For consumers, exact location can be refined later if needed.

**Warning signs:** The first onboarding step is a permission prompt, or non-HTTPS environments behave inconsistently during development.

### Pitfall 6: Wide proxy matchers with database session lookups on every request

**What goes wrong:** Navigation and prefetching create more auth overhead than expected, especially if proxy is doing full session resolution everywhere.

**Why it happens:** Database-backed sessions are convenient, but Next.js proxy runs on every matched route.

**How to avoid:** Keep proxy matchers narrow, or keep proxy logic lightweight. Continue to rely on secure server-side checks for the final authorization decision.

**Warning signs:** Prefetch-heavy routes feel slower than they should, or auth/database logs show repeated session lookups for static navigation.

## Code Examples

Verified patterns adapted from official sources:

### Role-Specific Sign-In Start

```tsx
import { signIn } from "@/auth";

export function ConsumerGoogleButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("google", { redirectTo: "/onboarding/consumer" });
      }}
    >
      <button type="submit">Continue as shopper</button>
    </form>
  );
}
```

**Source:** https://authjs.dev/getting-started/session-management/login and https://authjs.dev/getting-started/providers/google

### Auth.js + Drizzle Adapter Setup

```ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db/client";

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [Google],
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      session.user.role = user.role;
      return session;
    },
  },
});
```

**Source:** https://authjs.dev/getting-started/adapters/drizzle?framework=next-js and https://authjs.dev/guides/role-based-access-control

### Lightweight Protected Route Check

```ts
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export async function requireSession() {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin/consumer");
  }

  return session;
}
```

**Source:** https://authjs.dev/getting-started/session-management/protecting and https://nextjs.org/docs/app/guides/authentication

### Business Address Capture Pipeline

```ts
type AddressCandidate = {
  label: string;
  providerPlaceId: string;
};

export async function confirmBusinessAddress(candidate: AddressCandidate) {
  const normalized = await geocodeFromConfirmedPlaceId(candidate.providerPlaceId);

  return {
    rawLabel: candidate.label,
    normalizedAddress: normalized.address,
    latitude: normalized.latitude,
    longitude: normalized.longitude,
    provider: normalized.provider,
    providerPlaceId: normalized.placeId,
    geocodedAt: new Date(),
  };
}
```

**Source:** https://developers.google.com/maps/documentation/geocoding/best-practices and https://docs.mapbox.com/mapbox-search-js/guides/autofill/

## State of the Art (2026)

What's changed recently:

| Old Approach | Current Approach | When Changed | Impact |
| --- | --- | --- | --- |
| `middleware.ts` for new projects | `proxy.ts` | Next.js 16 | New auth examples and route-protection files should use `proxy.ts`. |
| Scattered server auth helpers | Unified `auth()` calls from a root auth config | Auth.js v5 docs | Cleaner server-side auth usage across pages, route handlers, and proxy. |
| `@next-auth/*-adapter` package scope | `@auth/*-adapter` package scope | Auth.js v5 migration path | Adapter imports and install commands changed. |
| Generic geocode-on-input flows | Interactive autocomplete + confirmed geocode | Current Google/Mapbox guidance | Better latency and accuracy for onboarding addresses. |
| Lucia as a go-to auth package | Lucia as auth guidance/resources | Current official Lucia site | Not a primary implementation candidate for this phase anymore. |

**New tools/patterns to consider:**
- **Auth.js v5 beta on purpose:** Best match for current Next.js 16 App Router docs, but beta status must be accepted explicitly.
- **Mapbox Address Autofill:** Strong low-friction address-entry option for a web-first demo.
- **Node-runtime proxy in Next.js 16:** Makes full session validation possible there, but Next.js still recommends keeping proxy checks lightweight.

**Deprecated/outdated for this phase:**
- **Using `middleware.ts` examples as the default reference:** For a new Next.js 16 app, use `proxy.ts`.
- **Relying on public Nominatim for autocomplete:** The public policy forbids it.
- **Requesting Google offline access during basic sign-in:** Not needed unless later phases truly call Google APIs.

## Open Questions

1. **Should Phase 2 use Auth.js v5 beta or stable v4?**
   - What we know: The current official Next.js docs for Auth.js install `next-auth@beta` and use the v5 API shape. Stable npm is still v4.24.14.
   - What's unclear: Whether the project values "matches current docs" more than "avoid beta in a demo app."
   - Recommendation: Plan assuming v5 beta unless the user explicitly prefers stable-only dependencies. If v4 is chosen, treat that as a stack decision and use v4-specific docs throughout the phase.

2. **Which address provider should back onboarding?**
   - What we know: Google recommends Places Autocomplete for user input plus Geocoding for final coordinates. Mapbox offers a React/web autofill package and free usage for small web flows. Public Nominatim is unsuitable for client autocomplete.
   - What's unclear: Whether later phases will benefit enough from the Google Maps ecosystem to justify billing setup now.
   - Recommendation: For the fastest free-tier-friendly implementation, plan around Mapbox for Phase 2. Revisit Google only if later routing/delivery phases already need it.

3. **Should session strategy stay database-backed or switch to JWT for lighter proxy behavior?**
   - What we know: Auth.js defaults to database sessions when using an adapter. JWT sessions make lightweight proxy logic easier, but role changes are not reflected until the token is refreshed or reissued.
   - What's unclear: Whether the project wants the simplest onboarding-complete role refresh, or the leanest proxy/runtime path.
   - Recommendation: Use database sessions for the app logic in this phase, keep proxy narrow/lightweight, and optimize later only if traffic or latency makes it necessary.

## Sources

### Primary (HIGH confidence)

- https://authjs.dev/getting-started/installation?framework=next-js - current Next.js install path, `auth.ts`, `proxy.ts`, `AUTH_SECRET`
- https://authjs.dev/getting-started/providers/google - Google provider setup, callback URL, env vars, refresh-token caveat, `email_verified`
- https://authjs.dev/getting-started/adapters/drizzle?framework=next-js - Drizzle adapter install, setup, custom tables, session-table note
- https://authjs.dev/guides/role-based-access-control - role persistence patterns and using role data in the session
- https://authjs.dev/getting-started/session-management/protecting - page/API protection and `proxy.ts` guidance
- https://authjs.dev/getting-started/session-management/login - provider-specific sign-in and `redirectTo`
- https://authjs.dev/getting-started/migrating-to-v5 - v5 API changes, adapter scope changes, environment variable notes, session strategy notes
- https://nextjs.org/docs/app/guides/authentication - optimistic vs secure authorization checks, DAL recommendation, proxy guidance
- https://nextjs.org/docs/app/api-reference/file-conventions/proxy - `proxy.ts`, matcher behavior, Node runtime
- https://developers.google.com/maps/documentation/geocoding/best-practices - autocomplete vs geocoding guidance for user-entered addresses
- https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API - secure-context and permission requirements for browser geolocation
- https://operations.osmfoundation.org/policies/nominatim/ - public Nominatim usage limits and autocomplete prohibition

### Secondary (MEDIUM confidence, verified against official sources)

- https://docs.mapbox.com/mapbox-search-js/guides/autofill/ - address autofill capability and React/web positioning
- https://www.mapbox.com/pricing - current free usage for address autofill and temporary geocoding
- https://better-auth.com/docs/integrations/next - Better Auth's Next.js 16 compatibility and proxy guidance
- https://clerk.com/nextjs-authentication - Clerk positioning and prebuilt UI / hosted auth tradeoff
- https://supabase.com/docs/guides/auth/quickstarts/nextjs - Supabase Auth fit if the stack changes to Supabase
- https://lucia-auth.com/ - current Lucia positioning as auth guidance/resources, not the default drop-in stack
- Versions verified via npm registry on 2026-04-18:
  - `next-auth@beta` -> `5.0.0-beta.31`
  - `next-auth` -> `4.24.14`
  - `@auth/drizzle-adapter` -> `1.11.2`
  - `drizzle-orm` -> `0.45.2`
  - `next` -> `16.2.4`
  - `zod` -> `4.3.6`
  - `react-hook-form` -> `7.72.1`
  - `@hookform/resolvers` -> `5.2.2`
  - `@mapbox/search-js-react` -> `1.5.1`

### Tertiary (LOW confidence - validate during implementation)

- None needed for the primary recommendation.

## Metadata

**Research scope:**
- Core technology: Auth.js with Google OAuth in Next.js 16 App Router
- Ecosystem: Drizzle adapter, session strategy, role persistence, onboarding forms, address capture services
- Patterns: role-first sign-in, post-auth onboarding, layered authorization, confirmed geocoding
- Pitfalls: version drift, proxy-only authz, location capture mistakes, overcomplicated role models

**Confidence breakdown:**
- Standard stack: `MEDIUM` - strong official guidance, but the primary Auth.js path still depends on a beta release
- Architecture: `HIGH` - patterns are well-supported by official docs and fit the project constraints tightly
- Pitfalls: `HIGH` - directly supported by Next.js, Auth.js, Google, MDN, and OSM policy guidance
- Code examples: `MEDIUM` - adapted from official patterns, but the final implementation details still depend on the v5-vs-v4 decision and schema planning

**Research notes:**
- Context7 was not available in this workspace during this run, so research used official documentation, authoritative package metadata, and targeted web-discovered official sources instead.
- The role-entry recommendation is an implementation inference from the official Auth.js login + Google provider model and the project's own phase context.

**Research date:** 2026-04-18  
**Valid until:** 2026-05-02

---
*Phase: 02-auth-onboarding*  
*Research completed: 2026-04-18*  
*Ready for planning: yes*
