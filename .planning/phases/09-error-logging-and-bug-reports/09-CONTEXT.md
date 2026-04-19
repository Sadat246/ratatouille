# Phase 9: Error Logging & Bug Reports - Context

**Gathered:** 2026-04-18
**Status:** Ready for research

<vision>
## How This Should Work

Ratatouille quietly watches what every user is doing in the background. As shoppers and sellers move through the app, the client keeps a rolling buffer of their recent actions — pages they visited, buttons they tapped, forms they submitted, and any errors or failed outcomes that came back from the server. Nothing flashy; it just hums along so that when something does go wrong, we already have the trail.

In the bottom-right corner of every screen (consumer and seller, signed-in or not) there's a small Intercom-style chat bubble. When someone hits a bug, they tap it and a little panel slides up. The panel does a two-step confirm: first it shows them what it captured — a DOM screenshot of the current screen and the last ~10 actions they took — so they can see exactly what's being sent. Then they type a short description of what went wrong and submit.

On submit, the whole package is written as a Markdown file into our database. The report reads top-to-bottom like a tiny incident write-up: who, when, where, what they were doing, what they saw, what the system did. Importantly, it's shaped to be read by an LLM, not a dashboard.

From the repo, a small CLI exposes exactly two things: `list` (show open report IDs with a one-line summary) and `get <id>` (print the full Markdown). That's the LLM's loop — list, pick one, get it, go read the code, fix it. No admin UI, no alerts, no automation on top. The Markdown IS the interface.

</vision>

<essential>
## What Must Be Nailed

- **LLM-friendly CLI surface** — the CLI (`list` + `get <id>`) is the marquee feature of this phase. The reports it returns must be structured, complete, and directly actionable: an LLM should be able to read one report and know exactly which file/route/flow to investigate next.
- **Rich action trail, automatically** — every navigation, interactive click/tap, form submit/API call, and error/failed outcome goes into the ring buffer without developers having to remember to instrument anything new. If the buffer is thin, the reports are useless.
- **Two-step confirm with a real preview** — the report panel must show the user the screenshot and the recent-actions list before submit, so they understand what they're sending. Trust and transparency, not just a text box.
- **Always-visible, unobtrusive bubble** — the floating button is present on every route for every user type (including signed-out), styled like an Intercom chat bubble, but quiet enough not to interfere with the existing consumer/seller shells.

</essential>

<boundaries>
## What's Out of Scope

- **Auto-fixing / auto-PRs** — Phase 9 only surfaces reports. It does not try to patch code, open PRs, or run agent loops. Humans (or LLMs invoked separately) drive the fix.
- **In-app admin triage UI** — no dashboard for browsing, assigning, commenting on, or closing reports inside the app. The CLI is the only read surface.
- **Real-time alerting** — no Slack pings, no emails, no push notifications when a report lands. Pull-only, async.
- **Third-party telemetry providers** — no Sentry, PostHog, LogRocket, Datadog, or similar SaaS. Logging and storage stay inside this repo's stack (Postgres + Next.js).
- **Status / resolution workflow beyond the minimum** — no `status` command, no assignees, no tags, no dedup/merge. A report is a static Markdown file; if we want workflow later, that's a future phase.
- **Search across reports** — `list` + `get` is the whole CLI. No `search`, no querying, no filters. Let the LLM (or `grep`) do that against the raw files if needed.

</boundaries>

<specifics>
## Specific Ideas

- **Bubble style:** Intercom-style — round icon button, bottom-right, expands upward into a small card panel. Branded to Ratatouille colors, respects mobile safe-area insets.
- **Screenshot method:** html2canvas-style DOM snapshot (no permission prompt, works inline). Accept the tradeoff that iframes/canvas/video may not render perfectly — we're optimizing for "one click, always works" over pixel fidelity.
- **Report format:** Markdown, with a consistent header (id, timestamp, user role, URL, viewport) and sections for description, last N actions, and an embedded/linked screenshot.
- **Who can report:** everyone, always — signed-in shoppers, signed-in sellers, and signed-out visitors. The widget appears on every page.
- **Action buffer:** ring buffer of the last ~10 events covering navigation, clicks/taps, form submits + API call outcomes, and client-side errors/failed outcomes.
- **CLI verbs:** exactly two — `list` (IDs + one-line summaries of open reports) and `get <id>` (full Markdown to stdout). Designed to be piped into an LLM or a terminal.

</specifics>

<notes>
## Additional Context

- Ratatouille is aiming at a pitch demo on 2026-05-02. Phase 9 does not need to be a hardened production feature; it needs to produce clean, high-signal Markdown reports that the team (and Claude/Codex) can use to harden the rest of the app before the demo.
- The user explicitly chose "LLM-friendly CLI" as the single most important pillar of this phase. When tradeoffs arise during planning, bias toward whatever makes the Markdown reports more structured and the CLI more agent-ergonomic — even at the cost of a fancier widget or richer telemetry.
- The repo already has privacy-sensitive data flowing through it (Stripe, geocoded addresses, Uber Direct recipient info). PII scrubbing in the action buffer and the DOM snapshot is assumed to be a hard requirement, even though the user didn't call it out explicitly — flag this during research.
- The widget needing to live on *every* route (consumer + seller + signed-out) means it should be mounted at the root shell level, not per-page.

</notes>

---

*Phase: 09-error-logging-and-bug-reports*
*Context gathered: 2026-04-18*
