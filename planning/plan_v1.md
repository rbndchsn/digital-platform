# plan_v1.md — VERIFASSUR_X: Phase I mock platform (investor demo), Phase II real platform

Version 1.0 · 2026-10-05 · Repo: https://github.com/rbndchsn/digital-platform (public, currently empty)

---

## 0. Instructions for whoever executes this plan (human or AI agent)

### 0.1 Read these files first, in this order
1. `planning/plan_v1.md` — this file. Check the **Progress log** (§6) to find the next unchecked step.
2. `planning/brainstorming.md` — what the reference platform does, the decisions made (verify-only, `decarb_unit` definition, client self-entry, future-exposed principle). Sections 3.10–3.12 are binding.
3. `planning/0001-prd-verifassurx-platform.md` — the target product. Phase I must look and behave like this PRD's Release 1 (§5.1, §7 UX, §8.5 state machines, §9 data model, §11.2 RBAC). Use its field names and enumerations verbatim so Phase II can reuse the code.
4. `planning/tasks-0001-prd-verifassurx-platform.md` — Phase II task list. Reference only; do not execute it in Phase I.
5. `assets/sourceimages/*.png` — 16 reference screenshots (view them with a vision model). They define the visual patterns: phase rail, status chips, action pills, document rows, approval rows, iteration accordions, Gantt, KPI tiles. These images are third-party material and are **git-ignored**; never commit them to the public repo.
6. `CLAUDE.md` at the repo root — short pointer to this plan and the operating rules below.

### 0.2 Operating rules
- **One step at a time.** Take the first unchecked step in §3. Do not start the next step until the current one meets its "Done when" line.
- **After every step**, in this order:
  1. Run `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` inside `demo/`. All must pass.
  2. Tick the step's checkbox in §3 (`[ ]` → `[x]`) and tick every sub-item you completed.
  3. Add a row to the **Progress log** (§6): date, step, commit hash, one line of what changed, anything deferred.
  4. Update **Relevant files** (§5) with every file created or changed and a one-line purpose.
  5. Commit with a conventional message that names the step, e.g. `feat(demo): step 7 service workspace — overview, step detail, documents` and push to `main`. End the message with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` when an AI agent authored it.
  6. If the step changed the deployed demo, confirm the live URL still loads after the deploy workflow finishes.
- **If a step reveals missing work**, add a new sub-item under the right step (or a new step at the end of the phase) rather than doing it silently.
- **Phase I constraints (never break these):**
  - No real backend, no database, no server-side code, no external API calls, no secrets in the repo.
  - State lives in memory and in `sessionStorage` only, so it disappears when the browser tab is closed. Never use `localStorage` or IndexedDB for demo state. A "Reset demo" control restores the seed data.
  - Domain logic (state machines, next-action, RBAC, GHG and `decarb_unit` computations, zod schemas) is written as pure TypeScript in `demo/src/domain/` with unit tests, because Phase II lifts it unchanged into `packages/workflow` and `packages/schema`.
  - The mock service layer in `demo/src/api/` exposes the same operations as the PRD endpoints (§10.2), returning promises with simulated latency. Phase II replaces the implementation with `fetch`; pages must not import the store directly.
  - All names, companies, people and numbers in fixtures are fictional. Do not reuse names from the reference screenshots or real registries' project IDs.
- **Environment:** Windows 11, PowerShell, Node 22, npm 10 (pnpm is not installed; use npm). `gh` CLI is authenticated as `rbndchsn`. Local dev: `cd demo; npm run dev`.
- **Definition of done for Phase I:** every item in §3 is ticked, the demo is live on its public URL, `demo/DEMO_SCRIPT.md` walks an investor through the storyline in §2.4 without any dead click, and the Phase II handover note (§3 step 14) is written.

---

## 1. What we are building

| Phase | Deliverable | Status |
|---|---|---|
| **Phase I — Mock platform** | A static, clickable front end that looks and behaves like the Release 1 platform in the PRD. Every button does what the real one would (navigates, validates, changes state, shows toasts and notifications), driven by an in-browser mock backend seeded from JSON. Used to show investors the product. No persistence beyond the tab. | **This plan, now** |
| **Phase II — Real platform** | The Cloudflare implementation described in the PRD and the task list (Workers, D1, R2, Better Auth…). Reuses Phase I's UI components, domain logic and schemas. | Later, see §4 |

---

## 2. Phase I design decisions (made; change only with a note in §6)

### 2.1 Stack
- **Vite + React 19 + TypeScript**, single app in `demo/`. Same UI stack as the PRD so components carry over: **Tailwind CSS + shadcn/ui** (Radix), **lucide-react** icons, **Inter** font, **TanStack Router** (file-based routes), **TanStack Query** (even against the mock layer, so Phase II is a drop-in), **react-hook-form + zod**, **Recharts** for KPI tiles, custom SVG for the Gantt, **sonner** for toasts, **Vitest + Testing Library** for tests, **Playwright** for the demo storyline test.
- Light and dark mode from day one. Desktop-first, tablet usable.

### 2.2 Mock backend strategy ("real domain, fake persistence")
```
demo/src/
├── domain/        pure TS: enums, zod schemas, units+GWP, compute, state machines, next-action, policy   (→ Phase II packages)
├── mock/
│   ├── fixtures/  JSON seed: orgs, users, projects, services, phases, steps, slots, documents, findings,
│   │              iterations, statements, inventories, emission factors, decarb records, notifications,
│   │              invoices, feature flags, templates
│   ├── store.ts   in-memory tables keyed by id; load from fixtures; persist snapshot to sessionStorage on change
│   ├── latency.ts simulated 200–500 ms delay; optional failure toggle for demoing error states
│   └── reset.ts   wipe sessionStorage, reload fixtures
├── api/           one module per PRD resource (services.ts, documents.ts, findings.ts, …) with the PRD's
│                  operation names; implemented against mock/store + domain transitions; emits audit events
│                  and notifications exactly as the real backend would
├── auth/          mock session: persona picker, fake MFA, org switcher, AuthContext identical to PRD §11
├── components/    design-system components (PhaseRail, StatusChip, ActionPill, DocumentRow, ApprovalRow,
│                  ProvenanceLine, DeclaredVerifiedPair, EvidenceChip, IterationAccordion, Gantt, KpiTile,
│                  EmptyState, PreviewOverlay, ConfirmTyped, DemoPanel)
├── routes/        TanStack file routes mirroring PRD §7.1 (client and /staff)
└── features/      page-level modules per screen
```
- **"Show, don't do" dialogs (user decision 2026-10-05).** Any action that would touch the outside world (choose a local file, download, open a PDF, send an email, sign, pay, call an API, connect a registry) opens the **real-looking dialog** with the real buttons and fields, but the buttons do not perform the external action. Every such dialog has a visible **"Back to demo"** exit and a **"Simulate"** button that records the outcome in the session (e.g. "Monitoring Plan v2 uploaded by you, just now") so the platform visibly progresses. Rule: the user must always be able to see what *would* happen and then return without being stuck.
- **Uploads**: the upload dialog shows drop zone, "Choose file" and "Choose folder" buttons, file-type and size rules, progress bar; "Simulate upload" creates a document version with a plausible fictional filename, size and hash. No real file is read.
- **Auth**: the sign-in page looks real (email, password, MFA code, passkey button, "forgot password") but any input is accepted; a persona picker sits under it ("Demo: enter as…"). Nothing is validated.
- **Progress persists for the session only**: every change is written to `sessionStorage`, so the demo keeps the presenter's progress across page reloads and route changes, and starts clean in a new tab or after "Reset demo".
- **Issuance**: the "issue opinion" action runs the PRD §8.6 steps as an animated progress sequence (lock → hash → render → statement → write-back → notify), each step visibly completing, then opens the statement page.
- **Audit trail and notifications** are generated by the same transition functions that Phase II will use, so the Service Log and the bell fill up as the demo user acts.
- **Feature flags** come from a fixture; preview pages render greyed with "Coming" and an "I'm interested" button that writes an interest record visible on the staff Clients page.

### 2.3 Mock authentication
- `/sign-in` shows a **persona picker** instead of a password form: pick a user card (name, org, role). A fake MFA screen accepts any 6 digits. The picked persona sets `AuthContext {userId, orgId, orgType, roles, serviceRoles}`.
- Personas (fixtures): Client admin, Client contributor and Client viewer at **Northwind Dairy Cooperative**; Client admin at **Solstice Renewables Ltd**; Verifier manager, Team leader, Auditor and Independent reviewer at **VERIFASSUR**.
- A **Demo panel** (floating button) lets the presenter switch persona instantly, jump to storyline chapters, toggle "slow network", and reset the demo.

### 2.4 Investor storyline (fixtures must support every chapter)
1. **Client home** (Northwind, client admin): two ongoing services, one completed and paid, one blocking action ("Upload Monitoring Plan — due in 3 days"), notifications.
2. **Request work**: start a new request for a 2025 product emission factor verification (ISO 14067), 5-step wizard, submit. It appears in the verifier triage queue.
3. **Verifier triage** (switch persona to manager): accept the request, approve technical scope and impartiality, nominate team; the team leader declares COI; the service unlocks.
4. **Contracting to Planning**: client accepts the service agreement in-platform (name, time, hash recorded); quote and invoice reference visible.
5. **Ongoing engagement** (2025 corporate GHG inventory verification, in Execution): phase rail, step detail with required slots, upload a document, verifier rejects a version with a reason, client re-uploads.
6. **Findings**: auditor raises a CAR, client responds with an attachment, auditor closes it.
7. **Records**: the inventory editor with Scope 1/2/3, per-gas lines, biogenic and removals separate, evidence chips, declared vs verified; the `decarb_unit` record for milk (3.4 → 3.0 tCO2e per t, 1,000,000 t attributed → 400,000 units) with the computed panel and a unit-mismatch error demo.
8. **Opinion**: team leader submits iteration 1, IR requests changes, iteration 2 approved by IR and manager, manager issues; animated issuance; statement page with hashes and QR; public `/verify/{code}` page opened in a new tab; records now show "Verified" with the assurance link.
9. **Timeline and Service Log**: Gantt planned vs actual; log of everything the presenter just did.
10. **Future**: Integrations page with API keys, MCP and webhooks in preview; "I'm interested" clicked; staff Clients page shows the interest signal. Close on the dashboard with year-over-year verified totals.

### 2.5 Hosting and repository
- Repo root = `C:\Projects\MyPythonProjects\MyScripts\digital-platform` pushed to `rbndchsn/digital-platform`, branch `main`.
- Layout:
  ```
  digital-platform/
  ├── CLAUDE.md              pointer to planning/plan_v1.md + operating rules
  ├── README.md              what this is, live demo URL, how to run
  ├── .gitignore             node_modules, dist, .env*, assets/sourceimages/
  ├── planning/              brainstorming.md, PRD, tasks, plan_v1.md
  ├── assets/                sourceimages/ (ignored), demo-screenshots/ (ours, committed later)
  ├── demo/                  Phase I app
  └── verifassurx/           Phase II monorepo (created in Phase II only)
  ```
- **Hosting decision: Cloudflare Pages** (the user's platform preference), deployed by GitHub Actions with `wrangler pages deploy demo/dist` on every push to `main`, preview deployments for pull requests. Requires two GitHub secrets the repo owner creates: `CLOUDFLARE_API_TOKEN` (Pages: Edit) and `CLOUDFLARE_ACCOUNT_ID`. Until those exist, the workflow also publishes to **GitHub Pages** as a fallback so the demo is never without a URL. SPA routing handled by `_redirects` (`/* /index.html 200`).
- The repo is public: no third-party images, no real client names, no credentials.

---

## 3. Phase I steps

Tick sub-items as you go; tick the step only when its "Done when" holds.

- [x] **Step 0 — Repository bootstrap**
  - [x] `git init` at the repo root, default branch `main`; `.gitignore` with `node_modules/`, `dist/`, `.env*`, `assets/sourceimages/`, `*.local`, `.DS_Store`, `Thumbs.db`.
  - [x] Rename the empty `claude.md` to `CLAUDE.md` and write it: read `planning/plan_v1.md` first, the operating rules in §0.2, the Phase I constraints, and `cd demo` for all npm commands.
  - [x] `README.md`: one-paragraph description, Phase I / Phase II, links to the planning files, placeholder for the live URL, local run instructions.
  - [x] Add `LICENSE` decision: none for now (all rights reserved) — state it in README.
  - [x] First commit, `git remote add origin https://github.com/rbndchsn/digital-platform.git`, push `main`.
  - Done when: the repo on GitHub shows `planning/`, `CLAUDE.md`, `README.md`, `.gitignore`, and `assets/sourceimages` is absent.

- [x] **Step 1 — Scaffold the demo app and the deploy pipeline**
  - [x] Scaffolded by hand (create-vite needs an interactive terminal): `"type": "module"`, strict TS, path alias `@/` → `src/`.
  - [x] Installed Tailwind v4, Radix primitives (`radix-ui`), lucide-react, Inter via `@fontsource-variable/inter`, TanStack Router (file routes plugin + CLI), TanStack Query, react-hook-form, zod, sonner, Recharts, date-fns. shadcn-style components are hand-written in step 4 (the shadcn CLI is interactive).
  - [x] Tooling: ESLint 10 (typescript-eslint, react-hooks, import restriction so pages never import the mock store), Prettier, Vitest 5 + Testing Library + jsdom, Playwright; scripts `dev`, `build`, `build:ghpages`, `preview`, `lint`, `typecheck`, `test`, `test:e2e`, `routes:gen`.
  - [x] `public/_redirects` with `/* /index.html 200`; `vite.config.ts` base `/` with `VITE_BASE` switch for GitHub Pages; `scripts/gh-pages-404.mjs` for deep links.
  - [x] `src/styles/tokens.css` with PRD §7.4 colours, status colours, dark mode via `prefers-color-scheme` and `[data-theme]`; `globals.css` maps them to Tailwind theme colours.
  - [x] Placeholder home route renders "VERIFASSUR_X" with a session-scoped theme toggle; unit test and Playwright smoke test.
  - [x] `.github/workflows/deploy.yml`: check job (lint, typecheck, test, build) → Cloudflare Pages job (only when secrets exist) and GitHub Pages job (always).
  - [x] GitHub Pages enabled (build type: workflow) → https://rbndchsn.github.io/digital-platform/ recorded in README.
  - Done when: the placeholder page is reachable on a public URL from a push to `main`.
  - Note: run npm commands from PowerShell; the Git Bash tool cannot spawn `node` from npm scripts on this machine. TypeScript 6 rejects `baseUrl`, so only `paths` is used.

- [x] **Step 2 — Domain layer (pure TypeScript, tested)**
  - [x] `domain/enums.ts`: every enumeration from PRD §3.2, §8.5, §9.3 plus labels (service types, programmes, scope categories, gases, finding types).
  - [x] `domain/schemas/*.ts`: zod schemas for all PRD §9.3 entities, grouped as common, identity, engagement, evidence, findings, opinions, ledger, platform; field names as in the PRD.
  - [x] `domain/units.ts`: good units (kg, t, L, m3, kWh, MWh, unit), CO2e units, EF unit parsing, base-unit normalisation, dimension check, GWP AR5/AR6 tables incl. HFC/PFC species and fossil CH4; `UnitError`. Tests.
  - [x] `domain/compute/inventory.ts`: per-gas tCO2e, line gross, totals by scope/category with biogenic and removals separate, YoY change. Tests incl. AR5 vs AR6.
  - [x] `domain/compute/decarb.ts`: profile EFs, factors, reduction/removal units on attributed volume, biogenic delta, diagnostics (`negative_reduction`, `volume_exceeds_reference`, `gwp_set_differs`); `UnitError` on mismatch. Tests: milk example = 400,000 units; kg/L mismatch throws.
  - [x] `domain/workflow/templates/index.ts` + `template.schema.ts`: eight service-type templates built as data (shared Contracting/Planning, per-type Execution slots) and validated by zod. Decision: built in TS rather than raw JSON files for maintainability; still pure data.
  - [x] `domain/workflow/instantiate.ts`: template → phases, steps, slots, approvals with UTC planned dates. Tests.
  - [x] `domain/workflow/machines.ts`: service, step (+ phase gating, derived phase status), finding, iteration, COI, document version, record machines with `TransitionError`. Test matrix.
  - [x] `domain/workflow/next-action.ts`: single next action per service state, with `isActionForViewer`. Tests across contracting, COI, agreement, findings, iterations.
  - [x] `domain/policy.ts`: `decide/can/assertCan` with PRD §11.2 matrix, cross-org isolation, COI gate, separation of duties, locked documents. Tests per role.
  - Done when: `npm run test` passes with ≥ 90 % line coverage on `src/domain`. **Result:** 46 tests at step 2; after step 3's fixture validation, `src/domain` line coverage is 98.5 % (compute 96 %, workflow 90 %, policy 96 %).

- [x] **Step 3 — Mock backend and fixtures**
  - [x] Seed built programmatically from the real templates (`mock/fixtures/base.ts`, `scenario.ts`, `records.ts`, `index.ts`) rather than hand-written JSON, so every service has consistent phases, steps, slots, documents, approvals, team, COI, findings, iterations, invoices, notifications and ~600 audit events. Decision: TS builders, deterministic ids, dates relative to "today" so the demo always looks current. Contents: 4 orgs (VERIFASSUR, Northwind Dairy Cooperative, Solstice Renewables Ltd, Atlas Foods Group), 11 personas, 6 projects, 10 services (4 closed and paid, 1 execution with a rejected upload and an open CAR, 1 opinion review with iteration 1 returned, 1 planning awaiting audit-plan acceptance, 1 contracting with a COI pending, 1 requested, 1 for the wizard), inventories 2023/2024/2025 with per-gas lines, 4 product EFs, 3 `decarb_unit` records (milk 2024 verified, milk 2025 = 400,000 units, Atlas wheat with removals), 16 feature flags. `fixtures.test.ts` validates every row against the zod schemas, checks referential integrity and asserts each storyline precondition.
  - [x] `mock/store.ts`: typed tables, sessionStorage snapshot on every write (microtask-batched), hydrate on boot, `reset()`; `mock/clock.ts`, `mock/ids.ts`, `mock/snapshot.ts`.
  - [x] `mock/latency.ts` with slow-network and fail-next-call toggles.
  - [x] `api/*`: `auth`, `services` (list/get/createDraft/updateDraft/submit/renew/triage/hold/resume/cancel/close/transitionStep/timeline/log), `projects`, `approvals` (decide, acceptAgreement with typed name + hash, auto-complete of satisfied steps), `team` (candidates, nominate with IR exclusivity, declareCoi, decideCoi), `documents` (simulateUpload, check, removeVersion, evidence links, downloadAll manifest), `findings`, `iterations` (create with suggested figures, attach, submitForIr, irDecide, managerDecide, issue with progress callback, statements, public lookup), `records` (inventories, lines, submit → attach or create request, verified values, YoY compare; emission factors; decarb records, profiles, preview compute, portfolio; write-back on issuance), `notifications`, `features`, `invoices`, `dashboard` (client and staff), `staff`, `demo`. Every mutation: policy → machine → store → audit → notifications.
  - [x] Issuance sequence lives in `api/iterations.ts` (`issue` + `ISSUANCE_STEPS`) and performs write-back and supersession via `records.writeBackVerifiedRecords`.
  - [x] `api/storyline.test.ts` runs all ten chapters end to end through the api with no UI, including the negative cases (IR cannot approve without the checklist, team leader cannot approve their own opinion, wrong typed name rejected, kg/L mismatch rejected, auditor locked out until COI declared).
  - Done when: the full storyline can be executed in tests with no UI (✔ 69 tests), and a reload within the same tab preserves state while a new tab starts from fixtures (✔ by construction of `Store`; verified in the browser in step 4).

- [ ] **Step 4 — App shell, mock auth, demo panel, flags**
  - [ ] `/sign-in` persona picker, fake MFA screen, sign-out, org switcher for multi-org users; `AuthContext` provider; route guards (client vs `/staff`).
  - [ ] `AppShell`: client navigation and staff navigation per PRD §7.1, role badge, notifications bell with unread count and dropdown, theme toggle, breadcrumbs.
  - [ ] Design-system components with tests: `StatusChip`, `ActionPill`, `PhaseRail`, `DocumentRow`, `ApprovalRow`, `ProvenanceLine`, `DeclaredVerifiedPair`, `EvidenceChip`, `IterationAccordion`, `KpiTile` (donut, big number), `EmptyState`, `PreviewOverlay`, `ConfirmTyped`, `DataTable` (sort, filter, cursor-less pagination).
  - [ ] `DemoPanel`: persona switch, storyline chapter jump links, slow network, fail next call, reset demo, "presenter notes" toggle.
  - [ ] `useFeature(key)` hook, `/features` mock, `PreviewOverlay` wiring, interest capture.
  - Done when: a presenter can sign in as any persona, navigate every nav entry (pages may be placeholders), and reset the demo.

- [ ] **Step 5 — Client home, engagements lists, projects**
  - [ ] Client Home: progress bars (ongoing vs completed this year), "Needs your action" cards (one next action per service, orange pill, due), latest notifications, records shortcuts.
  - [ ] Engagements: Ongoing list (status, phase | step chip, next action, team leader), Past table (filters, paid status, opinion type, download-all mock), Requests drafts.
  - [ ] Projects list and detail (programme, country, registry ID, services under it).
  - Done when: storyline chapter 1 runs without a dead click.

- [ ] **Step 6 — Request wizard and renewal**
  - [ ] 5-step wizard (Project → Service type & standard → Scope & period → Attachments → Review & submit) with zod validation per step, autosave to the store as a draft, resume from Requests.
  - [ ] Submit → status `requested`, CPF generated, notification to verifier manager, appears in staff triage.
  - [ ] "Renew" from a closed service pre-fills the wizard.
  - Done when: chapter 2 runs; a submitted request is visible in `/staff/triage`.

- [ ] **Step 7 — Service workspace (client and staff views)**
  - [ ] Overview: phase rail with expandable steps and status chips, next-action banner, team contacts with roles, key dates, quote/invoice card, download-all.
  - [ ] Step detail: header (phase › step, status chip, role badge), required/optional slots with upload (file picker, client-side SHA-256, progress, metadata only), slot status, submitted-by/date, rejected-with-reason state, approvals rows, supporting documents, staff "Close step" / "Request document" / "Accept / Reject version".
  - [ ] Documents tab: grouped by category with counts, (Required) flags, version history drawer, row actions (view mock, download mock, replace, delete with typed confirmation).
  - [ ] Timeline: Gantt (SVG) with planned outline vs actual fill, milestone ticks, legend, hover transitions with timestamps.
  - [ ] Service Log: reverse-chronological events, type and actor filters, CSV export (client-side).
  - Done when: chapters 5 and 9 run; every action writes to the Service Log.

- [ ] **Step 8 — Staff workflow: triage, team, COI, approvals, transitions**
  - [ ] `/staff` My Work (by service role, blocking pills, phase | step) and Triage queue.
  - [ ] Triage accept (choose template → instantiate workflow → `contracting`) or decline with reason.
  - [ ] Approvals UI for technical scope, impartiality, contract review; team nomination dialog with role validation (IR exclusivity); COI declaration screen shown to a nominated member on first open; manager COI decision; locked-service state until approved.
  - [ ] Client agreement acceptance dialog (re-auth mock, name, time, hash recorded; Contracting completes → Planning opens).
  - [ ] Hold / resume / cancel / close with reasons.
  - Done when: chapters 3 and 4 run end to end across persona switches.

- [ ] **Step 9 — Findings**
  - [ ] Findings tab table, raise-finding dialog (staff), thread view with responses and attachments, respond (client), under review / close / reopen / withdraw (staff), due-date badges.
  - [ ] Blocking CAR prevents manager approval of an iteration (surfaced as a clear message).
  - Done when: chapter 6 runs and the finding appears in the Service Log and notifications.

- [ ] **Step 10 — Opinion iterations, issuance, statement, public verify**
  - [ ] Opinion tab: iteration accordions (bundle by document role, IR decision, manager decision, banners), staff actions (create iteration, attach documents, submit for IR, IR decide with checklist, manager decide with checklist, issue).
  - [ ] Animated issuance sequence per PRD §8.6 with each step completing; then statement card with verification code, hashes, QR (client-side generated), verified figures tiles, PDF "download" mock.
  - [ ] Public route `/verify/:code` rendered without a session (statement summary, hashes, opinion type, issuer).
  - [ ] Write-back visible in Records: status Verified, assurance link opens the opinion; earlier record Superseded.
  - Done when: chapter 8 runs; a new tab on `/verify/{code}` works from the seeded issued statement.

- [ ] **Step 11 — Records: inventory, product emission factors, decarb_unit records**
  - [ ] Inventory editor: year header (GWP set, consolidation), Scope 1 / 2 / 3 tabs, line table with gas sub-rows, computed tCO2e, biogenic and removals columns, evidence chips (link to a document), completeness bar, declared vs verified columns (staff can enter verified), submit for verification (attach to service or create request), revision notice after edits. YoY chart by scope.
  - [ ] Product emission factors: list, editor, history by year, submit.
  - [ ] `decarb_unit` record editor: baseline / project profiles side by side (gas rows, biogenic, removals, reference volume and unit), baseline method, intervention, attributed volume and unit, computed panel (factors, reduction units, removal units, biogenic delta) with diagnostics, negative-reduction justification, evidence per figure, submit; portfolio page by year and good with status chips and assurance links.
  - Done when: chapter 7 runs, including the deliberate unit-mismatch error and its fix.

- [ ] **Step 12 — Future features in preview**
  - [ ] Integrations: API keys, MCP server (sample tool list and a sample call transcript), webhooks, spreadsheet import — all in `PreviewOverlay` with "I'm interested".
  - [ ] AI evidence assistant, e-signature, reports export (ISO 14064-1, ESRS E1), registry links, continuous assurance, dMRV, verifiable credentials, digital product passport — each a real-looking page in preview.
  - [ ] Staff Clients page: flags per client (editable in demo), interest signals table.
  - Done when: chapter 10 runs and the interest record shows on the staff page.

- [ ] **Step 13 — Investor polish**
  - [ ] `demo/DEMO_SCRIPT.md`: the ten chapters with exact clicks, persona switches, what to say, and recovery tips (reset, fail-next-call demo).
  - [ ] Loading skeletons, empty states, error toasts with the "fail next call" toggle, keyboard navigation, focus states, axe audit clean on all pages, dark mode checked on every page, tablet layout checked.
  - [ ] Performance: production bundle < 600 kB gzipped total, route-level code splitting, first render < 1.5 s on a laptop.
  - [ ] Playwright test that plays the whole storyline; runs in CI.
  - [ ] Screenshots of every key screen saved to `assets/demo-screenshots/` and embedded in README.
  - Done when: a non-technical presenter can run the script start to finish on the live URL without help.

- [ ] **Step 14 — Release and Phase II handover**
  - [ ] Tag `v0.1-demo`; README updated with live URL, storyline summary, screenshots, known limitations (no persistence, mock auth).
  - [ ] `planning/phase2-handover.md`: what carries over unchanged (`domain/`, `components/`, route structure, fixtures as test seeds), what is replaced (`mock/`, `api/` implementation, `auth/`), and the mapping to the Phase II task list steps.
  - Done when: both files are committed and the tag is pushed.

---

## 4. Phase II outline (not started; detailed in the PRD and the task list)

1. Create `verifassurx/` monorepo per PRD §8.3 and run `tasks-0001-prd-verifassurx-platform.md` task 1.0 onward.
2. Lift `demo/src/domain` into `packages/workflow` and `packages/schema`; lift `demo/src/components` into `packages/ui`; keep fixtures as seed and test data.
3. Replace `demo/src/api` implementations with `fetch` against the Workers API; replace mock auth with Better Auth.
4. Keep the demo deployable as a sales tool from the same repo (`demo/`) until the real platform has a sandbox tenant.

---

## 5. Relevant files (keep current)

| File | Purpose |
|---|---|
| `planning/plan_v1.md` | This plan |
| `planning/brainstorming.md` | Analysis of the reference platform and binding decisions |
| `planning/0001-prd-verifassurx-platform.md` | Target product definition |
| `planning/tasks-0001-prd-verifassurx-platform.md` | Phase II task list |
| `CLAUDE.md` | Agent entry point and operating rules summary |
| `README.md` | Repo overview, live URLs, local run |
| `.github/workflows/deploy.yml` | CI checks, Cloudflare Pages deploy (when secrets exist), GitHub Pages deploy |
| `demo/package.json` | Scripts: dev, build, build:ghpages, lint, typecheck, test, test:e2e, routes:gen |
| `demo/vite.config.ts` | Vite + React + Tailwind + TanStack Router plugin, `@/` alias, Vitest config, `VITE_BASE` |
| `demo/eslint.config.js` | Lint rules incl. ban on importing `@/mock/*` from pages/components |
| `demo/src/main.tsx` | App entry, router with base path |
| `demo/src/routes/__root.tsx`, `index.tsx` | Root layout and placeholder home |
| `demo/src/styles/tokens.css`, `globals.css` | Design tokens (light/dark) and Tailwind theme mapping |
| `demo/src/lib/theme.ts` | Session-scoped theme hook |
| `demo/scripts/gh-pages-404.mjs` | Copies index.html to 404.html for GitHub Pages deep links |
| `demo/e2e/smoke.spec.ts` | Playwright smoke test |
| `demo/src/domain/enums.ts` | All enumerations and labels |
| `demo/src/domain/schemas/*.ts` | zod schemas per entity group; `index.ts` barrel |
| `demo/src/domain/units.ts` | Units, EF unit parsing, base conversion, GWP tables, `UnitError` |
| `demo/src/domain/compute/inventory.ts` | Per-gas tCO2e, totals, YoY |
| `demo/src/domain/compute/decarb.ts` | Emission profiles, decarb factors, units, diagnostics |
| `demo/src/domain/workflow/template.schema.ts` | zod schema for workflow templates |
| `demo/src/domain/workflow/templates/index.ts` | The eight service-type templates (data) |
| `demo/src/domain/workflow/instantiate.ts` | Template → phases/steps/slots/approvals |
| `demo/src/domain/workflow/machines.ts` | State machines and phase gating |
| `demo/src/domain/workflow/next-action.ts` | Single next action per service |
| `demo/src/domain/policy.ts` | RBAC policy `decide/can/assertCan` |
| `demo/src/domain/index.ts` | Domain barrel export |
| `demo/src/mock/store.ts` | In-memory tables, sessionStorage snapshot, reset |
| `demo/src/mock/clock.ts`, `ids.ts`, `latency.ts`, `snapshot.ts` | Time helpers, deterministic ids and fake hashes, simulated network, snapshot builder |
| `demo/src/mock/fixtures/base.ts` | Orgs, personas, memberships, projects, feature flags |
| `demo/src/mock/fixtures/scenario.ts` | Scenario builder: create/advance services, documents, team, COI, findings, iterations, issuance, invoices |
| `demo/src/mock/fixtures/records.ts` | Inventories, emission factors, decarb_unit records with evidence |
| `demo/src/mock/fixtures/index.ts` | `buildSeed()` assembling the storyline; `SVC` ids |
| `demo/src/mock/fixtures/fixtures.test.ts` | Schema validation, integrity and storyline preconditions |
| `demo/src/api/core.ts` | Auth context, authorize, call wrapper, audit, notify, ids, errors |
| `demo/src/api/*.ts` | One module per resource (see step 3); `index.ts` barrel |
| `demo/src/api/storyline.test.ts` | End-to-end storyline through the api |

---

## 6. Progress log

| Date | Step | Commit | What changed | Deferred / notes |
|---|---|---|---|---|
| 2026-10-05 | — | — | Plan v1 written. Repo `rbndchsn/digital-platform` confirmed empty and public. Local folder not yet a git repo. | User answered "go, make all decisions"; §2.2 updated with the "show, don't do" dialog rule |
| 2026-10-05 | 0 | 3d11574 | Repo initialised, planning docs, CLAUDE.md, README, .gitignore pushed to `main`. | — |
| 2026-10-05 | 1 | a3134a2 | `demo/` scaffolded: Vite 8, React 19, TS 6, Tailwind 4, TanStack Router, tokens, tests, Playwright, deploy workflow; GitHub Pages enabled. CI run 37409270913 green; https://rbndchsn.github.io/digital-platform/ returns 200. | Cloudflare Pages job skipped until repo secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` exist |
| 2026-10-05 | 2 | 21ad0c7 | Domain layer: enums, zod schemas, units + GWP, inventory and decarb compute, 8 workflow templates, instantiate, 7 state machines, next-action, policy. 46 unit tests. | Schema coverage counted in step 3 via fixture validation |
| 2026-10-06 | 3 | (this commit) | Mock backend: store with sessionStorage snapshot, latency toggles, programmatic seed for the whole storyline, 15 api modules, fixture validation and end-to-end storyline tests. 69 tests. | Storyline §2.4 adjusted: the opinion chapter (8) runs on the insetting service `svc_nw_decarb_2025`, the evidence and findings chapters (5, 6) on the inventory service `svc_nw_inv_2025` |

---

## 7. Open questions and assumptions (answer, then start step 0)

Assumptions I will proceed on unless told otherwise:
- A1 The repo stays **public**, so the reference screenshots are git-ignored and all demo data is fictional. The product name shown in the demo is "VERIFASSUR_X".
- A2 Hosting is **Cloudflare Pages** through GitHub Actions, with GitHub Pages as a fallback until the Cloudflare secrets are added to the repo.
- A3 The demo includes **both** the client portal and the verifier (staff) portal, because the investor story needs the handoffs between them.
- A4 English only for Phase I.
- A5 npm, not pnpm, for Phase I (pnpm is not installed).

Questions:
- Q1 Do you have brand assets (logo, colours, font) for VERIFASSUR_X, or should the demo use the teal palette from the PRD with a placeholder wordmark?
- Q2 Should the demo expose a visible "Demo" badge and the presenter panel to everyone who opens the URL, or hide the panel behind a keyboard shortcut?
- Q3 Any investor-specific emphasis (for example the `decarb_units` ledger over the engagement workflow) that should change the storyline order in §2.4?
