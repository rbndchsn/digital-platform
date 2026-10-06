# CLAUDE.md — digital-platform (VERIFASSUR_X)

Start here: **read `planning/plan_v1.md` first**, then the files it lists in its §0.1, in that order.

## What this repo is
- `planning/` — brainstorming, PRD, Phase II task list, and `plan_v1.md` (the execution plan).
- `demo/` — **Phase I**: a static, clickable mock of the VERIFASSUR_X assurance platform for investor demos. No backend. State lives in memory and `sessionStorage` only.
- `verifassurx/` — **Phase II** (real Cloudflare platform). Not started. Do not create it unless the plan says so.

## Operating rules (summary of plan_v1.md §0.2)
1. Work one plan step at a time; find the next unchecked step in `planning/plan_v1.md` §3.
2. After each step: `cd demo` then `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` must pass.
3. Tick the step, add a row to the Progress log (§6), update Relevant files (§5), commit with a conventional message naming the step, push to `main`.
4. Phase I constraints: no backend, no secrets, no external calls, no `localStorage`/IndexedDB. External actions (file pickers, downloads, e-mail, signing, APIs) open realistic dialogs that are non-functional, each with "Back to demo" and "Simulate" buttons.
5. Domain logic lives in `demo/src/domain/` as pure, tested TypeScript with PRD field names; pages call `demo/src/api/*` only, never the store.
6. All data is fictional. `assets/sourceimages/` is third-party and git-ignored; never commit it.

## Environment
Windows 11, PowerShell, Node 22, npm 10 (no pnpm). GitHub CLI authenticated. Remote: https://github.com/rbndchsn/digital-platform (public).
