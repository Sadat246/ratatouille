# Phase 1: Foundation - Research

**Researched:** 2026-04-18
**Domain:** Next.js 16 App Router foundation on Vercel with serverless Postgres and an installable PWA shell
**Confidence:** HIGH

## Summary

Phase 1 is not really “pick any Next.js starter and add Postgres.” The current expert pattern for this stack is a server-first App Router app deployed on Vercel, with database access kept on the server, migrations treated as first-class artifacts, and PWA installability implemented with the platform features Next.js now exposes directly instead of an old plugin-heavy setup.

For this specific roadmap, the best fit is **Vercel + Neon + Drizzle + native Next.js PWA primitives**. That combination matches the current Vercel ecosystem, minimizes free-tier friction, keeps schema work reviewable, and avoids paying complexity up front for platform surface area Phase 1 does not need. Supabase is still a valid alternative, but it is a better choice when you already know you want to center Auth, Storage, Realtime, and platform tooling around Supabase itself. The roadmap currently points the opposite way: Auth.js later, storage later, notifications later.

**Primary recommendation (inference from the sources below):** scaffold with the current `create-next-app` defaults, deploy to Vercel, attach Neon through the Marketplace, use Drizzle for schema and SQL migration generation, and ship a **minimal PWA baseline** now: manifest, icons, HTTPS, theme metadata, bottom-nav shell, and a conservative service worker. Defer real offline/runtime caching complexity until a later phase proves it is needed.

## Standard Stack

The established stack for this phase:

### Core

| Library / Service | Version | Purpose | Why Standard |
| --- | --- | --- | --- |
| Next.js | 16.2.4 | Full-stack React framework | App Router, Server Components, Route Handlers, Server Actions, and first-party PWA guidance all live here now. |
| React | 19.2.5 | UI runtime | Current baseline for Next.js 16. |
| Vercel | Current platform | Hosting / previews / env management | Zero-config deploy path for Next.js, preview deployments, and native database integrations. |
| Neon Postgres | Current service | Serverless Postgres | Best current Vercel-native fit for a Postgres-only free-tier foundation. |
| Drizzle ORM | 0.45.2 | Typed schema + query layer | Lightweight, SQL-first, and has direct Neon support. |
| Drizzle Kit | 0.31.10 | Migration generation / application | Generates SQL migrations from schema definitions and fits reviewable deploy workflows. |

### Supporting

| Library / Service | Version | Purpose | When to Use |
| --- | --- | --- | --- |
| `@neondatabase/serverless` | 1.1.0 | HTTP / WebSocket database transport | Default runtime transport when talking to Neon from Next.js server code. |
| Tailwind CSS | 4.2.2 | Styling system | Fastest path to a branded mobile-first shell without hand-writing a full CSS system first. |
| `@vercel/functions` | Current package | Connection pool lifecycle helpers | Only needed if you choose raw `pg` or Prisma-style pooled TCP connections on Vercel. |
| Serwist | Current project | Offline/runtime caching framework | Only if later phases require real offline behavior or advanced cache routing. Not required for Phase 1 installability. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
| --- | --- | --- |
| Neon | Supabase | Better if you knowingly want database + auth + storage + realtime from one vendor. Worse fit for this phase because the free plan allows only two active projects and adds platform surface area the roadmap is not using yet. |
| Drizzle | Prisma ORM + Prisma Postgres | Stronger full-ORM ergonomics, but heavier client/codegen and more runtime/deploy moving parts unless you fully commit to Prisma’s database stack. |
| Native manifest + minimal service worker | Serwist | Better offline/runtime caching control, but extra setup and currently requires webpack configuration in Next.js. |
| Marketplace integration | Manual env wiring | More control, less convenience. Not worth it for a two-week solo demo foundation. |

### Installation

```bash
npm create next-app@latest
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit
```

## Architecture Patterns

### Recommended Project Structure

```text
app/
  (marketing)/          # Landing page and role pivot
  (consumer)/           # Consumer shell stubs
  (business)/           # Business shell stubs
  api/                  # Route Handlers for webhooks / machine endpoints
  manifest.ts           # PWA manifest
  layout.tsx            # Shared root layout
  globals.css           # Global tokens and base styles
components/
  brand/                # Wordmark, icons, tokens
  nav/                  # Bottom nav and shell navigation
  shell/                # Shared shell primitives
db/
  schema/               # Table definitions by domain
  queries/              # Reusable server-side query modules
  migrations/           # Generated SQL migrations
lib/
  env/                  # Environment parsing / access
  pwa/                  # Service worker registration helpers
  utils/                # Non-domain utilities
public/
  icons/                # PWA icons and static assets
  sw.js                 # Conservative service worker baseline
```

### Pattern 1: Server-First App Router

**What:** Keep layouts and pages as Server Components by default. Fetch data on the server, stream the result, and add Client Components only where interactivity or browser APIs are needed.

**When to use:** Almost everywhere in this app. The landing page, consumer shell, business shell, and later authenticated pages should all start server-first.

**Why it is the standard pattern now:** Next.js documents layouts and pages as Server Components by default, and specifically recommends Client Components only for state, event handlers, lifecycle logic, custom hooks, or browser-only APIs.

**Example:**

```tsx
import { getShellCounts } from "@/db/queries/shell";
import { BusinessShell } from "@/components/shell/business-shell";

export default async function BusinessHomePage() {
  const counts = await getShellCounts();
  return <BusinessShell counts={counts} />;
}
```

### Pattern 2: Database Access Behind a Server-Only Boundary

**What:** Centralize database initialization and queries in server-only modules instead of letting components construct database clients ad hoc.

**When to use:** Immediately, even in Phase 1. This becomes more important once auth, auctions, and payments arrive.

**Why it is the standard pattern now:** Server Components are meant to fetch near the source, but the source itself should still live behind a narrow boundary so connection details, retries, and migrations do not leak through the app tree.

**Example:**

```ts
import "server-only";
import { drizzle } from "drizzle-orm/neon-http";

export const db = drizzle(process.env.DATABASE_URL!);
```

### Pattern 3: Migration-First Schema Workflow

**What:** Treat the schema as a source-controlled artifact, generate SQL migrations from it, and apply those migrations consistently in dev, preview, and production.

**When to use:** For the full Phase 1 schema, especially because the project wants all core tables present up front.

**Why it is the standard pattern now:** The modern stack is not “change the ORM model and hope prod matches.” Drizzle’s documented flow is schema definition -> SQL generation -> migration application. That produces reviewable SQL and avoids silent drift.

**Example:**

```ts
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

### Pattern 4: Minimal PWA Baseline First

**What:** Ship installability and shell polish first. Do not treat Phase 1 as an offline-first caching project.

**When to use:** Right now. The roadmap only needs a branded shell that can be installed.

**Why it is the standard pattern now:** Next.js now documents manifest support directly in App Router, and current installation guidance no longer requires building a full offline story before the app can behave like an installable product.

**Example:**

```ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ratatouille",
    short_name: "Ratatouille",
    start_url: "/",
    display: "standalone",
    background_color: "#f7efe2",
    theme_color: "#ff5a36",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
```

### Anti-Patterns to Avoid

- **Static export for a database-backed app:** `output: "export"` removes the runtime assumptions later phases need for database access, auth, payments, and webhooks.
- **Root-level `"use client"`:** This bloats the bundle, pushes data access toward the browser, and fights the App Router model.
- **Ad hoc SQL migrations in scripts or startup hooks:** This makes preview/prod drift much more likely.
- **Heavy offline caching from day one:** Service workers are easy to get wrong and stale build assets are a common failure mode.
- **Manual environment duplication across preview and production:** Marketplace integrations exist precisely to avoid this class of mistake.

## Don't Hand-Roll

Problems that look simple but have better existing solutions:

| Problem | Don’t Build | Use Instead | Why |
| --- | --- | --- | --- |
| Database connection lifecycle | A custom pool / retry / reconnect wrapper | Neon pooled connections or the Neon serverless driver; `attachDatabasePool` only if you deliberately use raw `pg` | Serverless connection behavior is subtle and easy to exhaust accidentally. |
| Schema migrations | Manual SQL snippets or “run this once” scripts | Drizzle `generate` + `migrate` workflow | Produces reviewable SQL and consistent deploy behavior. |
| Preview database cloning | Homegrown scripts to copy data into preview envs | Neon’s Vercel integration with preview branches | Environment injection and branch cleanup are already solved. |
| Cross-browser install prompt UX | A custom install flow around `beforeinstallprompt` | Native browser install UI plus a lightweight iOS-specific instruction banner | `beforeinstallprompt` is explicitly not cross-browser and does not work on Safari iOS. |
| Advanced cache routing | Bespoke `fetch` handlers in a custom service worker | Defer it; if needed later, use Serwist / Workbox patterns | Cache invalidation bugs are expensive and hard to spot early. |
| Authentication groundwork in Phase 1 | Placeholder auth/session tables and flows | Wait for the Auth.js phase | The roadmap already intends to research auth separately; guessing now creates rework. |

**Key insight:** The biggest Phase 1 risk is not “missing a library.” It is accidentally building infrastructure now that later phases will have to unwind.

## Common Pitfalls

### Pitfall 1: Treating PWA as “offline-first from day one”

**What goes wrong:** Too much time goes into service-worker strategy, route precaching, and stale asset bugs instead of shipping the shell and deployment pipeline.

**Why it happens:** Older PWA advice often assumes installability and offline are inseparable. Current platform guidance is more nuanced.

**How to avoid:** Phase 1 should ship manifest, icons, HTTPS, and a conservative service worker. Save advanced offline logic for later.

**Warning signs:** Install works, but updates look stuck; users see stale UI after deploys; navigation fails after a new release because old assets were cached aggressively.

### Pitfall 2: Choosing static export because it sounds simpler

**What goes wrong:** The app paints like a website, but the foundation cannot support Route Handlers, Server Actions, database-backed mutations, or the later auth/payment work without architectural reset.

**Why it happens:** “PWA” is mistaken for “static site.”

**How to avoid:** Deploy as a full-stack Next.js app on Vercel. Use the runtime you will actually need in later phases.

**Warning signs:** You start moving server logic to third-party APIs early just to work around your own deployment mode.

### Pitfall 3: Pulling too much into Client Components

**What goes wrong:** Bundle size grows, shell performance drops, and secrets or DB access boundaries become blurry.

**Why it happens:** Teams coming from SPA patterns put `"use client"` at the top of entire route trees.

**How to avoid:** Keep the shell server-rendered. Use Client Components only for interactive islands such as bottom-nav state, install hints, and form interactions.

**Warning signs:** Layouts, top-level pages, or data modules need browser APIs even though most of their UI is static.

### Pitfall 4: Using raw TCP database clients in serverless code without a clear pooling strategy

**What goes wrong:** Connection limits are hit under bursty traffic or preview deploys, and debugging is noisy because the issue looks random.

**Why it happens:** Traditional Node/Postgres mental models do not map cleanly to serverless runtimes.

**How to avoid:** Prefer Neon’s serverless driver or pooled connections. If you intentionally use raw `pg`, use Vercel’s documented pool attachment helpers.

**Warning signs:** Intermittent connection errors, hanging local previews, or “too many connections” during bursts.

### Pitfall 5: Choosing Supabase because it includes “everything”

**What goes wrong:** Foundation work absorbs auth/storage/realtime platform concerns that are not needed yet, while the free plan is less flexible for multiple active projects.

**Why it happens:** Supabase is a very good platform, but Phase 1 only needs Postgres plus a clean deploy story.

**How to avoid:** Use Supabase only if you are intentionally committing the next phases to its wider platform surface. Otherwise, keep Phase 1 lean with a Postgres-first provider.

**Warning signs:** Research keeps drifting into RLS, storage buckets, Edge Functions, or Supabase Auth setup even though the phase scope explicitly excludes them.

### Pitfall 6: Using stale Next.js caching assumptions

**What goes wrong:** The shell behaves differently than expected because the team assumes older default caching behavior that no longer matches the current docs.

**Why it happens:** A lot of older examples teach “Next caches by default” without the newer explicit caching and revalidation model.

**How to avoid:** Be explicit about what should be static, what should be fresh, and what should be tagged for revalidation later.

**Warning signs:** Developers are surprised that fresh data is not refreshing or that static shell output is being reused.

## Code Examples

Verified patterns derived from current official sources:

### App Router Manifest

```ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ratatouille",
    short_name: "Ratatouille",
    start_url: "/",
    display: "standalone",
    background_color: "#f7efe2",
    theme_color: "#ff5a36",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
```

Source: [Next.js PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps)

### Conservative Service Worker Headers

```ts
const nextConfig = {
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
```

Source: [Next.js PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps)

### Neon + Drizzle Server Initialization

```ts
import "server-only";
import { drizzle } from "drizzle-orm/neon-http";

export const db = drizzle(process.env.DATABASE_URL!);
```

Source: [Drizzle Neon connection guide](https://orm.drizzle.team/docs/connect-neon)

## State of the Art (2024-2026)

What changed recently enough to matter:

| Old Approach | Current Approach | When Changed | Impact |
| --- | --- | --- | --- |
| Vercel Postgres as the default Vercel database story | Vercel now points new projects to Marketplace Postgres integrations; old Vercel Postgres was migrated to Neon | Transition completed in late 2024; Vercel docs updated in 2025 | Do not start a new project from stale `@vercel/postgres` mental models. |
| PWA setup in Next.js mostly via third-party plugins | Next.js now has an official App Router PWA guide and built-in manifest support | Official guide current as of March 2026 | A plugin is no longer the first step for basic installability. |
| Implicit App Router caching assumptions | Current guidance makes caching more explicit through `fetch` options, revalidation APIs, and cache tagging | Next.js 15-16 era docs | Planning should assume freshness is explicit, not magical. |
| Turbopack as optional | `create-next-app` now enables Turbopack by default | Current CLI defaults in 2026 | If you need webpack-only tooling such as Serwist, opt into webpack intentionally instead of discovering this mid-build. |
| “All-in-one backend platform” as the automatic answer for Next.js apps | Many teams are again using lean Postgres + separate best-of-breed services when auth/storage/realtime are not needed immediately | Ecosystem drift across 2024-2026 | For this roadmap, a lean DB-first foundation is lower risk than platform consolidation up front. |

**New tools / patterns to consider:**

- **Native Vercel Marketplace database integrations:** better env handling and less bootstrap friction than manual setup.
- **Neon preview branching:** very strong fit for Vercel previews if the solo workflow ends up using PRs actively.
- **Explicit Next.js caching APIs:** useful later for feed/detail pages, but not necessary to overuse in Phase 1.

**Deprecated / outdated for this phase:**

- **Starting from Vercel Postgres-specific guides:** outdated for new projects.
- **Assuming PWA requires a plugin first:** no longer true for manifest/installability.
- **Assuming old fetch caching defaults:** unreliable with the current App Router guidance.

## Open Questions

1. **Should preview database branching be enabled from day one?**
   - What we know: Neon integrates cleanly with Vercel previews and supports preview branches automatically.
   - What’s unclear: Whether a solo two-week sprint will actually benefit from branch-per-preview complexity.
   - Recommendation: Use the integration, but keep the workflow simple. Do not build planning assumptions around heavy preview-branch usage yet.

2. **Does Phase 1 really need a service worker, or only installability?**
   - What we know: Installability and add-to-home-screen can be achieved without building a full offline system first.
   - What’s unclear: Whether the roadmap’s “service-worker baseline” means “file exists” or “offline shell works.”
   - Recommendation: Create a minimal service worker with conservative headers and no ambitious caching logic.

3. **How much future platform consolidation is actually intended?**
   - What we know: The roadmap currently points toward Auth.js, Stripe, Uber Direct, and later notification work, not an all-in Supabase platform plan.
   - What’s unclear: Whether the project might later want Supabase Storage or Realtime strongly enough to justify choosing Supabase now.
   - Recommendation: Stay with Neon unless planning explicitly decides to centralize later phases on Supabase features.

## Sources

### Primary (HIGH confidence)

- Context7 was **not available in this Codex session** (no MCP resources were exposed), so official docs were used as the primary replacement source set.
- [Next.js `create-next-app` CLI](https://nextjs.org/docs/app/api-reference/cli/create-next-app) - current scaffold defaults, App Router, Tailwind, Turbopack defaults.
- [Next.js PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps) - manifest support, service worker guidance, installability notes, security headers, Serwist note.
- [Next.js Server and Client Components guide](https://nextjs.org/docs/app/getting-started/server-and-client-components) - server-first rendering model and client-boundary guidance.
- [Next.js Backend-for-Frontend guide](https://nextjs.org/docs/app/guides/backend-for-frontend) - route handlers, payload validation, and runtime caveats.
- [Next.js caching guide](https://nextjs.org/docs/app/getting-started/caching) - current caching and revalidation model.
- [Vercel Next.js docs](https://vercel.com/docs/frameworks/full-stack/nextjs) - deployment path and integrations model.
- [Vercel Postgres docs](https://vercel.com/docs/postgres) - Vercel Postgres deprecation and Marketplace integration direction.
- [Neon pricing](https://neon.com/pricing) - free-tier limits and included features.
- [Neon + Vercel integration overview](https://neon.com/docs/guides/vercel-overview) - integration modes, preview branching, env management.
- [Connecting Neon to your stack](https://neon.com/docs/get-started-with-neon/connect-neon) - pooled vs direct connections and Next.js examples.
- [Drizzle + Neon connection guide](https://orm.drizzle.team/docs/connect-neon) - Neon HTTP/WebSocket drivers and serverless guidance.
- [Drizzle + Neon tutorial](https://orm.drizzle.team/docs/tutorials/drizzle-nextjs-neon) - practical integration pattern.
- [Drizzle `generate`](https://orm.drizzle.team/docs/drizzle-kit-generate) and [Drizzle `migrate`](https://orm.drizzle.team/docs/drizzle-kit-migrate) - migration workflow.
- [Supabase billing](https://supabase.com/docs/guides/platform/billing-on-supabase) - free plan active-project limits and database quota.
- [Supabase Vercel Marketplace docs](https://supabase.com/docs/guides/integrations/vercel-marketplace) - environment sync and integration behavior.
- [Supabase branching usage docs](https://supabase.com/docs/guides/platform/manage-your-usage/branching) - branching cost model.

### Secondary (MEDIUM confidence)

- npm registry lookups on 2026-04-18 for current package versions:
  - [Next.js](https://www.npmjs.com/package/next)
  - [React](https://www.npmjs.com/package/react)
  - [Drizzle ORM](https://www.npmjs.com/package/drizzle-orm)
  - [Drizzle Kit](https://www.npmjs.com/package/drizzle-kit)
  - [Neon serverless driver](https://www.npmjs.com/package/@neondatabase/serverless)
  - [Prisma](https://www.npmjs.com/package/prisma)
  - [Prisma Client](https://www.npmjs.com/package/@prisma/client)
  - [Tailwind CSS](https://www.npmjs.com/package/tailwindcss)

### Tertiary (LOW confidence - none used for critical claims)

- None. Critical recommendations were kept anchored to official docs and current package registries.

## Metadata

**Research scope:**

- Core technology: Next.js 16 App Router foundation for a mobile-first marketplace shell
- Ecosystem: Vercel deployment, Neon vs Supabase, Drizzle vs Prisma, PWA baseline tooling
- Patterns: server-first rendering, migration-first schema workflow, provider-managed previews, minimal PWA baseline
- Pitfalls: static export misuse, client-boundary sprawl, service-worker overreach, free-tier/provider mismatch, serverless connection handling

**Confidence breakdown:**

- Standard stack: **HIGH** - official docs across Next.js, Vercel, Neon, Drizzle, and Supabase align.
- Architecture: **HIGH** - rooted in current Next.js App Router guidance and Vercel deployment docs.
- Pitfalls: **MEDIUM-HIGH** - mostly official, with some synthesis across sources.
- Code examples: **HIGH** - derived directly from official documented patterns.

**Research date:** 2026-04-18
**Valid until:** 2026-05-18

---

*Phase: 01-foundation*
*Research completed: 2026-04-18*
*Ready for planning: yes*
