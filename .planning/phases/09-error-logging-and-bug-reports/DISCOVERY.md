# Phase 9 Discovery: Error Logging & Bug Reports

**Date:** 2026-04-18  
**Status:** Complete

## Inputs Reviewed

- Existing planning context and roadmap for Phase 9
- Current stack and architecture (Next.js 16.2.4, React 19.2.4, Drizzle, Neon/Postgres)
- Current shell/layout mount points and API/service patterns
- Official Next.js `instrumentation-client` docs (current as of 2026-03-31)
- Official html2canvas docs and configuration/FAQ pages
- Current `html2canvas` npm version (`1.4.1`)

## Findings

### 1. Global action capture can be added without per-component instrumentation

Next.js 16 supports a root-level `instrumentation-client` file that runs before hydration and exposes a router-transition hook. That gives Phase 9 a clean place to initialize lightweight global telemetry without scattering hooks across pages.

Practical implication:

- Use a singleton client runtime for a rolling ring buffer
- Register early listeners for navigation, uncaught errors, and unhandled rejections
- Keep startup work light and move screenshot capture to an on-demand dynamic import

### 2. Screenshot capture should be viewport-only and explicitly redacted

html2canvas is the right fit for the phase because it works in-page without permissions, but its tradeoffs are clear:

- It renders the DOM, not a native screenshot
- Cross-origin images/iframes can be omitted or taint capture
- Large canvases can fail on constrained devices, especially iOS

Practical implication:

- Capture only the visible viewport, not the full document
- Use `useCORS`, `ignoreElements`, and `onclone`
- Exclude the widget itself from capture
- Blank form controls and any element marked with a redaction attribute before rendering
- Export a compressed image payload to keep database rows manageable

### 3. The report record should be optimized for CLI retrieval, not dashboarding

The phase context makes the CLI the marquee outcome. The database record therefore needs:

- A short public-facing report ID that is easier than a raw UUID for `list` and `get`
- A one-line summary precomputed for terminal listing
- Full Markdown stored as text for direct CLI output
- Screenshot payload stored alongside the report but not inlined into CLI output, so `get` stays readable for humans and LLMs

Practical implication:

- Store the canonical Markdown in a text column
- Store the screenshot payload separately in the same row
- Generate the CLI summary from route, role, description, and the most severe captured outcome

### 4. Privacy needs to be designed into both the action trail and the screenshot path

The repo already handles addresses, fulfillment data, and Stripe-related flows. The buffer therefore cannot capture raw field values or request bodies by default.

Practical implication:

- Action events should record metadata only: route, target label, form/action name, API path, status code, and sanitized error text
- Do not record freeform input values, request payloads, or response bodies
- Screenshot redaction should default to blanking interactive fields and allow explicit opt-in redaction markers for high-risk surfaces

### 5. The global widget belongs at the root layout, not inside consumer/seller shells

Phase 9 requires availability on seller, shopper, onboarding, auth, and signed-out routes. The existing root layout is the one shared mount point. The seller/shopper shells are not universal and some are already dirty in the local worktree.

Practical implication:

- Mount the widget once from the root layout
- Keep positioning high enough to clear the mobile bottom nav while still feeling like a support bubble
- Avoid modifying existing dirty shell files unless absolutely necessary

## Decisions

- Use a root-level client instrumentation bootstrap plus a shared client runtime singleton
- Use html2canvas via dynamic import for on-demand screenshot capture
- Persist reports in Postgres as immutable rows with a public report ID, Markdown body, and separate screenshot payload
- Accept anonymous and signed-in submissions through one Node-runtime endpoint; enrich with session role/user when available
- Implement the CLI as a plain Node `.mjs` script using existing dependencies so it can run without a local app server

## Risks To Manage

- html2canvas will not perfectly reproduce cross-origin or iframe-heavy content; the report UI should make capture failures visible and still allow a no-screenshot submission path
- Early fetch patching can add noise if it records framework internals; track only same-origin API or mutation-shaped requests
- Screenshot payload size can grow quickly on desktop; cap scale and export with compression
- The worktree already contains unrelated local changes, so implementation should avoid touching dirty files where a clean alternative exists

## Recommended Plan Split

### 09-01
Backend foundation: schema, Markdown builder, public ID generation, submission API, and server-side tests.

### 09-02
Client runtime: global ring buffer, screenshot capture/redaction, floating widget, preview/submit flow, and root mounting.

### 09-03
CLI + docs + hardening: `list`/`get` terminal interface, package script, README coverage, end-to-end verification, and planning-state closeout.
