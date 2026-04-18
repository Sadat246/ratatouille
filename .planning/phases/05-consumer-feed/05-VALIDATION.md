---
phase: 5
slug: consumer-feed
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-18
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None detected — Wave 0 must add vitest if tests required |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit` (fast type check)
- **After every plan wave:** Run `npx vitest run` (if Wave 0 installs vitest)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Secure Behavior | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------------|-----------|-------------------|--------|
| 5-geo-filter | feed-query | 1 | D-07 | Haversine filter enforces 5-mile radius — no listings beyond boundary returned | unit | `npx vitest run tests/lib/auctions/geo-queries.test.ts` | ⬜ pending |
| 5-sort-ending-soon | feed-query | 1 | D-05 | Sort by scheduledEndAt ASC returns nearest-ending first | unit | `npx vitest run tests/lib/auctions/feed-queries.test.ts` | ⬜ pending |
| 5-category-filter | feed-query | 1 | D-06 | Category filter with `["dairy"]` returns only dairy listings | unit | `npx vitest run tests/lib/auctions/feed-queries.test.ts` | ⬜ pending |
| 5-detail-polling | detail-page | 2 | D-12 | Polling interval set to 12,000ms | manual | — | ⬜ pending |
| 5-carousel | detail-page | 2 | D-08 | Photo carousel renders 3 images and swipes | manual (mobile) | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/lib/auctions/geo-queries.test.ts` — unit tests for haversine SQL formula (D-07)
- [ ] `tests/lib/auctions/feed-queries.test.ts` — unit tests for sort/filter query logic (D-05, D-06)
- [ ] Install `vitest` dev dependency if not already present

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Detail polling fires every 12s | D-12 | setInterval timing impractical to unit test | Open detail page in browser, watch Network tab — confirm fetch fires every ~12s |
| Photo carousel swipes through 3 images | D-08 | Touch gesture requires device/emulator | Open listing detail on mobile or DevTools mobile emulation, swipe through all 3 photos |
| PWA install prompt appears after scroll | D-14 | Browser install prompt API untestable in vitest | Scroll past card #3 in feed, confirm install banner appears; dismiss, confirm not shown again in session |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
