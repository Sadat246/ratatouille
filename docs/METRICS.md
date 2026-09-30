# Metrics

Every number in `README.md` and `docs/VIDEO-SCRIPT.md` has a row here, with the command that produces it, the commit it was measured on, and the branch. Clone `https://github.com/Sadat246/ratatouille.git`, stay in the clone root, and run the command from the table. Every git command names `origin/main` explicitly, so the result does not depend on uncommitted files or on which branch is checked out. The figures below were measured against `origin/main` = `bf4fa0c`. If `main` has moved since, substitute `bf4fa0c` for `origin/main` in each command to get the same values. `npx vitest run`, `npx tsc --noEmit`, and `npx eslint .` read the checked-out tree instead, so run them after `git checkout bf4fa0c`. Raw outputs are pasted in the Reproduction log at the bottom (labels C1 to C29).

PR #8 (merged 2026-09-30, commit `5981091` plus merge `bf4fa0c`, both authored `ehfuzzz`) is included in every figure. It added the pilot fixes: pickup-code verification, a seller pickup-verify page at `/sell/fulfillment`, the `PILOT_PICKUP_ONLY` flag that hides delivery, "Reserve it" wording in place of mock-card wording, and two fulfillment test files. Measured against `dbec3d3`, it touches 17 files (+197 / -46). Figures published before it, including the `15,754 / 22,746` blame count and the 136-commit total, are out of date.

**Measured on: 2026-09-30, `bf4fa0c` (`origin/main`). Branch: `main`.** That applies to every row unless it says otherwise.

## Proof number

**69.5% of the surviving code on `main` is mine — 15,921 of 22,897 lines, by `git blame`.** ("Mine" is `ehfuzzz`, Ehfaz Zohaer.) (15,921 / 22,897 = 69.53%. State it as 69.5%, never 69% or 70%. The README, the video script, and this file must carry the same two counts.)

Command C1, verbatim from the plan (§1a). It reads `git ls-tree` and `git blame` only, so it is read-only:

```bash
git ls-tree -r --name-only origin/main | grep -E '\.(ts|tsx|css|sql)$' \
  | while read f; do git blame --line-porcelain -w origin/main -- "$f" | grep "^author "; done \
  | sort | uniq -c | sort -rn
```

Output (raw, from C1):

```
15921 author ehfuzzz
3270 author Raihan Zaman
2993 author Sadat Ahmed
 713 author MMahmud24
```

15,921 + 3,270 + 2,993 + 713 = 22,897.

## Table

| Claim | Value | Command | Measured on | Branch |
|---|---|---|---|---|
| Surviving-line share, `ehfuzzz` (proof number) | **15,921 / 22,897 = 69.53%** | C1 (block above) | 2026-09-30 · `bf4fa0c` | `main` |
| Surviving lines, Raihan Zaman | 3,270 (14.28%) | C1 | 2026-09-30 · `bf4fa0c` | `main` |
| Surviving lines, Sadat Ahmed | 2,993 (13.07%) | C1 | 2026-09-30 · `bf4fa0c` | `main` |
| Surviving lines, MMahmud24 | 713 (3.11%) | C1 | 2026-09-30 · `bf4fa0c` | `main` |
| Commits, `ehfuzzz` (non-merge) | 34 | `git log --no-merges --pretty=%an origin/main \| sort \| uniq -c \| sort -rn` | 2026-09-30 · `bf4fa0c` | `main` |
| Commits, Raihan Zaman (non-merge) | 47 | same as above (C2) | 2026-09-30 · `bf4fa0c` | `main` |
| Commits, MMahmud24 (non-merge) | 26 | same as above (C2) | 2026-09-30 · `bf4fa0c` | `main` |
| Commits, Sadat Ahmed (non-merge) | 11 | same as above (C2) | 2026-09-30 · `bf4fa0c` | `main` |
| Merge commits | 20 | `git log --merges --pretty=%h origin/main \| wc -l` | 2026-09-30 · `bf4fa0c` | `main` |
| Total commits | 138 (34 + 47 + 26 + 11 = 118 non-merge, plus 20 merges) | `git rev-list --count origin/main` | 2026-09-30 · `bf4fa0c` | `main` |
| Build span | Two days, 2026-04-18 (91 commits) and 2026-04-19 (45 commits) = 136 commits | `git log --date=short --pretty=%ad origin/main \| sort \| uniq -c` | 2026-09-30 · `bf4fa0c` | `main` |
| Commits after the build span | 2 on 2026-09-30: PR #8 (`5981091`) and its merge (`bf4fa0c`) | `git log --date=short --pretty='%h %ad %an %s' dbec3d3..origin/main` | 2026-09-30 · `bf4fa0c` | `main` |
| Code lines (tracked `.ts`/`.tsx`/`.css`/`.sql`) | 22,889 lines in 199 files | `git ls-tree -r --name-only origin/main \| grep -E '\.(ts\|tsx\|css\|sql)$' \| while read f; do git show "origin/main:$f"; done \| wc -l` and `git ls-tree -r --name-only origin/main \| grep -cE '\.(ts\|tsx\|css\|sql)$'` (C8, C9) | 2026-09-30 · `bf4fa0c` | `main` |
| Pages | 17 | `git ls-tree -r --name-only origin/main app \| grep -c '/page\.tsx$'` | 2026-09-30 · `bf4fa0c` | `main` |
| API routes | 26 | `git ls-tree -r --name-only origin/main app/api \| grep -c '/route\.ts'` | 2026-09-30 · `bf4fa0c` | `main` |
| DB tables | 16 | `git grep -h "pgTable(" origin/main -- db/schema \| wc -l` | 2026-09-30 · `bf4fa0c` | `main` |
| Migrations | 8 (`0000` to `0007`); `ehfuzzz` added 7, Raihan Zaman added `0004` | `git ls-tree -r --name-only origin/main drizzle \| grep -c '^drizzle/[0-9].*\.sql$'`; authorship from C22 | 2026-09-30 · `bf4fa0c` | `main` |
| Test files | 6 | `git ls-tree -r --name-only origin/main tests \| grep -E '\.test\.tsx?$'` | 2026-09-30 · `bf4fa0c` | `main` |
| Tests | 28 passing, 6 files (observed) | `npx vitest run` (C15; run on the `bf4fa0c` checkout) | 2026-09-30 · `bf4fa0c` | `portfolio-readiness` checkout at `bf4fa0c` |
| `.planning` documents | 110 `.md` files | `git ls-tree -r --name-only origin/main .planning \| grep -c '\.md$'` | 2026-09-30 · `bf4fa0c` | `main` |
| Disabled feature: OCR | `POST /api/listings/ocr` returns 503 (`FEATURE_DISABLED = true`) | `git grep -n "FEATURE_DISABLED: boolean = true" origin/main -- app/api` (C17) | 2026-09-30 · `bf4fa0c` | `main` |
| Disabled feature: Gemini extract | `POST /api/listings/gemini-extract` returns 503 (same flag) | C17 | 2026-09-30 · `bf4fa0c` | `main` |
| Disabled feature: AI autofill | `POST /api/listings/ai-autofill` returns 503 (same flag) | C17 | 2026-09-30 · `bf4fa0c` | `main` |
| Pilot flag: delivery hidden | `PILOT_PICKUP_ONLY = true` in `lib/fulfillment/status.ts` | `git grep -n "export const PILOT_PICKUP_ONLY" origin/main -- lib` (C18) | 2026-09-30 · `bf4fa0c` | `main` |
| `lib/fulfillment/` size and authors | 1,887 lines in 8 files; 2 non-merge commits, both `ehfuzzz` | C19, C20 | 2026-09-30 · `bf4fa0c` | `main` |
| Auction engine size | `lib/auctions/service.ts` 796 lines, `lib/auctions/queries.ts` 866 lines | C21 | 2026-09-30 · `bf4fa0c` | `main` |
| Bug-report subsystem | Not present: 0 files under `app components lib db tests` mention it (not claimed) | C23 (the command is in the log; its regex alternation does not survive a Markdown table cell) | 2026-09-30 · `bf4fa0c` | `main` |
| `.mailmap` | Absent, deliberately | `ls .mailmap` (C26) | 2026-09-30 · `bf4fa0c` | `portfolio-readiness` checkout at `bf4fa0c` |
| `tsc --noEmit` | exit 0, no output | `npx tsc --noEmit` (C27; needs `node_modules`) | 2026-09-30 · `bf4fa0c` | `portfolio-readiness` checkout at `bf4fa0c` |
| `eslint .` | **Not clean: 9 problems (8 errors, 1 warning)** in tracked files from earlier phases (`react-hooks/purity`, `react-hooks/set-state-in-effect`, `react-hooks/refs`, one unused import) | `npx eslint .` (C28 shows the summary line; C28 output is truncated to it) | 2026-09-30 · `bf4fa0c` | `portfolio-readiness` checkout at `bf4fa0c` |
| `next build` | exit 0. `/preview` prerendered as the empty state (ISR, 60 s); `/preview/[auctionId]` rendered per request | `npm run build` (needs `DATABASE_URL` at build time; the Vercel project has it) | 2026-09-30 · `bf4fa0c` | `portfolio-readiness` checkout at `bf4fa0c` |

The two line counts differ by 8 (22,897 blamed, 22,889 by `wc -l`). Blame counts a last line that has no trailing newline, and `wc -l` does not. 8 of the 199 files end without a newline (C29).

## Why the counts differ from `git shortlog --all`

The four commit counts in this file are 34, 47, 26, and 11. They are not the ones `git shortlog -sn --all` prints (42, 58, 29, 16, plus 2 under the name `Sadat`; see C24). The basis used here is:

- `--no-merges`, so merge commits are not credited to whoever clicked merge.
- Reachable from `origin/main` only, so the unmerged branches (`ocr`, `ocr2`, `newocr`, `mahin1`, `auction`, and the `ui-*` branches) do not count. A stranger who clones `main` never sees those commits.
- No `.mailmap`. `%an` is the author name and does not use a mailmap, and all four people show up under one name each on `main`, so no identity merging is needed.

```bash
git log --no-merges --pretty=%an origin/main | sort | uniq -c | sort -rn
```

Commits that exist only on branches are excluded on purpose, because they are not in the repository a stranger clones. `--all` also counts merge commits, which inflates the totals. The 138 total reconciles: 47 + 34 + 26 + 11 + 20 = 138.

## Reproduction log

Raw output of each command, run on 2026-09-30 in a clean worktree at `bf4fa0c`, the commands exactly as written above. Two caveats on the run. `C3` and the rows that use `wc -l` print leading spaces. And `C24` is a live `--all` view, so its numbers depend on which branches your clone has fetched; it is the contrast case, not a published figure.

### C1

```
$ git ls-tree -r --name-only origin/main | grep -E '\.(ts|tsx|css|sql)$' \
  | while read f; do git blame --line-porcelain -w origin/main -- "$f" | grep "^author "; done \
  | sort | uniq -c | sort -rn
15921 author ehfuzzz
3270 author Raihan Zaman
2993 author Sadat Ahmed
 713 author MMahmud24
```

### C2

```
$ git log --no-merges --pretty=%an origin/main | sort | uniq -c | sort -rn
  47 Raihan Zaman
  34 ehfuzzz
  26 MMahmud24
  11 Sadat Ahmed
```

### C3

```
$ git log --merges --pretty=%h origin/main | wc -l
      20
```

### C4

```
$ git rev-list --count origin/main
138
```

### C5

```
$ git log --date=short --pretty=%ad origin/main | sort | uniq -c
  91 2026-04-18
  45 2026-04-19
   2 2026-09-30
```

### C6

```
$ git log --date=short --pretty='%h %ad %an %s' dbec3d3..origin/main
bf4fa0c 2026-09-30 ehfuzzz Merge pull request #8 from Sadat246/pilot-fixes
5981091 2026-09-30 ehfuzzz Pilot fixes: pickup-code verification, seller verify page, pickup-only, reserve wording
```

### C7

```
$ git diff --shortstat dbec3d3 origin/main
 17 files changed, 197 insertions(+), 46 deletions(-)
```

### C8

```
$ git ls-tree -r --name-only origin/main | grep -E '\.(ts|tsx|css|sql)$' | while read f; do git show "origin/main:$f"; done | wc -l
   22889
```

### C9

```
$ git ls-tree -r --name-only origin/main | grep -cE '\.(ts|tsx|css|sql)$'
199
```

### C10

```
$ git ls-tree -r --name-only origin/main app | grep -c '/page\.tsx$'
17
```

### C11

```
$ git ls-tree -r --name-only origin/main app/api | grep -c '/route\.ts'
26
```

### C12

```
$ git grep -h "pgTable(" origin/main -- db/schema | wc -l
      16
```

### C13

```
$ git ls-tree -r --name-only origin/main drizzle | grep -c '^drizzle/[0-9].*\.sql$'
8
```

### C14

```
$ git ls-tree -r --name-only origin/main tests | grep -E '\.test\.tsx?$'
tests/lib/auctions/feed-queries.test.ts
tests/lib/auctions/geo-queries.test.ts
tests/lib/demo/service.test.ts
tests/lib/fulfillment/pickup-code.test.ts
tests/lib/fulfillment/verify-pickup.test.ts
tests/lib/push/notify.test.ts
```

### C15

```
$ npx vitest run
 RUN  v4.1.4 /Users/ehfuzzz/Desktop/ratatouille-portfolio
 Test Files  6 passed (6)
      Tests  28 passed (28)
   Start at  16:35:59
   Duration  795ms (transform 542ms, setup 0ms, import 1.10s, tests 56ms, environment 1ms)
```

### C16

```
$ git ls-tree -r --name-only origin/main .planning | grep -c '\.md$'
110
```

### C17

```
$ git grep -n "FEATURE_DISABLED: boolean = true" origin/main -- app/api
origin/main:app/api/listings/ai-autofill/route.ts:9:const FEATURE_DISABLED: boolean = true;
origin/main:app/api/listings/gemini-extract/route.ts:9:const FEATURE_DISABLED: boolean = true;
origin/main:app/api/listings/ocr/route.ts:9:const FEATURE_DISABLED: boolean = true;
```

### C18

```
$ git grep -n "export const PILOT_PICKUP_ONLY" origin/main -- lib
origin/main:lib/fulfillment/status.ts:12:export const PILOT_PICKUP_ONLY = true;
```

### C19

```
$ git ls-tree -r --name-only origin/main lib/fulfillment | while read f; do git show "origin/main:$f"; done | wc -l
    1887
```

### C20

```
$ git log --no-merges --pretty=%an origin/main -- lib/fulfillment | sort | uniq -c
   2 ehfuzzz
```

### C21

```
$ for f in lib/auctions/service.ts lib/auctions/queries.ts; do printf '%s ' "$f"; git show "origin/main:$f" | wc -l; done
lib/auctions/service.ts      796
lib/auctions/queries.ts      866
```

### C22

```
$ for f in $(git ls-tree -r --name-only origin/main drizzle | grep '^drizzle/[0-9].*\.sql$'); do printf '%s ' "$f"; git log --diff-filter=A --pretty=%an -1 origin/main -- "$f"; done
drizzle/0000_black_mephisto.sql ehfuzzz
drizzle/0001_rich_fabian_cortez.sql ehfuzzz
drizzle/0002_ancient_zaran.sql ehfuzzz
drizzle/0003_magical_toad.sql ehfuzzz
drizzle/0004_conscious_gressill.sql Raihan Zaman
drizzle/0005_dashing_sebastian_shaw.sql ehfuzzz
drizzle/0006_open_nightmare.sql ehfuzzz
drizzle/0007_tiresome_marvel_apes.sql ehfuzzz
```

### C23

```
$ git grep -l -i "bugReport\|bug-report\|bug_report" origin/main -- app components lib db tests | wc -l
       0
```

### C24

```
$ git shortlog -sn --all
    58	Raihan Zaman
    42	ehfuzzz
    29	MMahmud24
    16	Sadat Ahmed
     2	Sadat
```

### C25

```
$ git shortlog -sn --no-merges origin/main
    47	Raihan Zaman
    34	ehfuzzz
    26	MMahmud24
    11	Sadat Ahmed
```

### C26

```
$ ls .mailmap 2>&1
ls: .mailmap: No such file or directory
```

### C27

```
$ npx tsc --noEmit; echo "exit=$?"
exit=0
```

### C28

```
$ npx eslint . 2>&1 | tail -2
✖ 9 problems (8 errors, 1 warning)
```

### C29

```
$ git ls-tree -r --name-only origin/main | grep -E '\.(ts|tsx|css|sql)$' | while read f; do [ -n "$(git show "origin/main:$f" | tail -c1)" ] && echo "$f"; done | wc -l
       8
```
