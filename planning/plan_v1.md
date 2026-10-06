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
| **Phase I.5 — ADMIN, overrides, rollups** | PRD v0.2 and demo v0.2: platform administrator persona and Administration console, manager overrides with reason, money rollups, portfolios preview. Steps 15–20 in §3.1. | **Done, v0.2-demo** |
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

- [x] **Step 4 — App shell, mock auth, demo panel, flags**
  - [x] `/sign-in`: realistic e-mail/password form, passkey and magic-link buttons, fake MFA step (any six digits), all non-functional and bypassed; persona picker "Demo: enter as…" grouped by client orgs and VERIFASSUR; sign-out; org switcher in the sidebar footer; `AuthProvider`/`useMe`; `_app` layout route guard redirects to `/sign-in` and staff personas to `/staff`.
  - [x] `AppShell`: client and staff navigation per PRD §7.1 (`shell/nav.ts`), "Soon" marker on preview entries, role badge, notifications bell with unread count and dropdown that marks read and navigates, theme toggle, account menu, mobile drawer, presenter-notes banner.
  - [x] Components: `StatusChip`, `ActionPill`, `PhaseRail`, `KpiNumber/KpiDonut/KpiBars`, `EmptyState`, `PageHeader` (breadcrumbs), `ProvenanceLine` + `Hash`, `ShowDontDoDialog` (the "show, don't do" pattern with Back to demo / Simulate), `ConfirmTyped`, `PreviewOverlay` + `InterestButton` + `ComingBadge` + `useFeature`, UI primitives (button, card, badge, input/textarea/select/field, dialog, dropdown, tabs, switch, checkbox, progress, tooltip, avatar, skeleton, alert, table). `DocumentRow`, `ApprovalRow`, `DeclaredVerifiedPair`, `EvidenceChip`, `IterationAccordion` and `DataTable` are built with the screens that need them (steps 7, 10, 11).
  - [x] `DemoPanel` (floating "Demo" button, Ctrl+.): storyline chapter links that switch persona and navigate, persona grid, slow network, fail next call, presenter notes, theme, reset with typed confirmation.
  - [x] Feature flags: `useFeature`, preview overlay with interest capture; Integrations page already real (API keys, MCP, webhooks, import in preview; "further out" cards); Account and Organisation pages functional with show-don't-do dialogs for passkey and invitations.
  - [x] Playwright smoke tests: persona enters the client portal; verifier lands on `/staff`. `scripts/screenshot.mjs` captures key screens from the build.
  - Done when: a presenter can sign in as any persona, navigate every nav entry (pages may be placeholders), and reset the demo. ✔

- [x] **Step 5 — Client home, engagements lists, projects**
  - [x] Client Home: progress bars (ongoing vs completed this year), latest notifications, "Needs your action" cards with the orange pill and due date, "Waiting on VERIFASSUR" list, verified-records tiles (latest verified scopes with statement link, verified decarb_units) and shortcuts.
  - [x] Engagements: Ongoing / Past / Drafts tabs with search and type filter; shared `ServiceTable` (status, phase | step chip, next action, team leader; past: period, issued, paid); renewal picker on the Past tab creates a pre-filled draft and opens the wizard.
  - [x] Projects list with a functional "New project" dialog; project detail with programme, country, registry ID, ongoing and past engagements, "Request work on this project".
  - Done when: storyline chapter 1 runs without a dead click. ✔ (download-all lives on the service workspace, step 7)

- [x] **Step 6 — Request wizard and renewal**
  - [x] 5-step wizard (Project → Service type & standard → Scope & period → Attachments → Review & submit) with per-step validation, draft created on leaving step 2 and updated on every subsequent step ("Draft … autosaved" badge), resume from Engagements › Drafts via `?draft=`, project pre-selection via `?project=`, inline "New project", a side panel listing the documents the chosen template will require, and the generated pre-engagement form on the review step.
  - [x] Attachments use the shared `UploadDialog` ("show, don't do": drop zone, inert Choose file / Choose folder, editable recorded filename, animated progress, Simulate upload).
  - [x] Submit → `requested`, CPF data on the service, notification to the verifier manager, appears in the triage queue (verified by the api storyline test; the triage screen itself is step 8).
  - [x] "Renew" (Engagements › Past) drafts from the closed service and opens the wizard at the scope step.
  - [x] Playwright `wizard.spec.ts` runs chapter 2 in Chromium. `Field` now wraps its control in the label (accessible names).
  - Done when: chapter 2 runs; a submitted request is visible in `/staff/triage`. ✔ (queue UI in step 8)

- [x] **Step 7 — Service workspace (client and staff views)**
  - [x] Layout route with header (reference, status, client, team role badge, statement link), next-action banner (orange when it is on the viewer), tabs (Overview, Phases, Documents, Findings, Timeline, Opinion, Service Log) and a staff Actions menu (hold / resume / cancel / close with typed confirmation). A nominated verifier whose COI is pending sees the declaration card instead of the workspace.
  - [x] Overview: phase rail with expandable steps and status chips, where-it-stands card, team with roles and COI chips, quote/invoice card, at-a-glance counts, download-all (manifest dialog).
  - [x] Step detail: header (phase › step, status, current-step badge), owner/planned/actual, Start / Close / Hold / Resume / Reopen for verifier roles with gating reasons, required and supporting slots with party-aware Upload / Re-upload / Request-from-client, document rows (view, download, replace, delete, version history, accept/reject with reason), approval rows (manager approve/reject with comment; client accept audit plan; client agreement acceptance with typed name, read confirmation and document hash), team nomination panel (nominate dialog with workload and IR exclusivity, COI approve/reject, remove), checklist, Opinion-tab hint on the final-opinion step.
  - [x] Documents tab: grouped (Service reporting, Phase, Contract, Supporting) with counts, slot context, search, supporting upload, download-all, version history, row actions.
  - [x] Timeline: SVG Gantt with month axis, planned outline vs actual fill, completion ticks, today line, hover card with transitions and timestamps, legend.
  - [x] Service Log: newest first, type and text filters, client-side CSV export.
  - [x] Playwright `workspace.spec.ts`: chapter 5 (re-upload → accept → log → timeline) and the chapter 3 COI gate.
  - Done when: chapters 5 and 9 run; every action writes to the Service Log. ✔

- [x] **Step 8 — Staff workflow: triage, team, COI, approvals, transitions**
  - [x] `/staff` My Work: progress bars, outstanding COI alert, notifications, work queue (project, service, team role, next-action pill, phase | step, status), ongoing by client, triage preview. Triage queue with request details (scope, sites, products, interventions, materiality, contact, attachments, workflow summary), Accept into Contracting (instantiated template already on the service; starts the first step) or Decline with reason. All services with client/type/search filters. Finance table with add quote/invoice and mark paid.
  - [x] Approvals UI (technical scope, impartiality, contract review), team nomination dialog with IR exclusivity and workload, COI declaration gate, manager COI decision closing the nomination step, locked-service state — all delivered in step 7's step detail.
  - [x] Client agreement acceptance dialog (read confirmation, typed name, document hash, recorded IP/time; Contracting completes → Planning) — step 7.
  - [x] Hold / resume / cancel / close in the workspace Actions menu — step 7.
  - [x] Playwright `staff.spec.ts`: triage accept + request document, audit-plan acceptance (chapter 4), COI approval, finance mark paid.
  - Done when: chapters 3 and 4 run end to end across persona switches. ✔

- [x] **Step 9 — Findings**
  - [x] Findings tab: table (number, type badge, title, severity, responses, step, assignee, due with overdue, status), blocking banner, raise-finding dialog for verifier roles (type, severity, title, description, step, client assignee, due date).
  - [x] Thread view: finding header with blocking badge, description, chat-style thread (verifier left, client right) with attachments, client respond composer with "Attach evidence" (upload dialog → linked to the response), verifier comment / mark under review / close / withdraw / reopen.
  - [x] Blocking CAR prevents manager approval (api rule; surfaced in the opinion tab in step 10 and in the next-action label).
  - [x] Playwright `findings.spec.ts` runs chapter 6 across the two personas.
  - Done when: chapter 6 runs and the finding appears in the Service Log and notifications. ✔

- [x] **Step 10 — Opinion iterations, issuance, statement, public verify**
  - [x] Opinion tab: statement card when issued (code, type, assurance level, figures tiles, locked documents with hashes, signatories, PDF show-don't-do, public page link, client toggle for public visibility); iteration accordions with status banner, wording, figures, document groups by role (team leader bundle, independent review with checklist and comment, manager checklist); role-aware actions (prepare iteration with suggested figures from attached records, submit for IR, independent review dialog with checklist, manager approval dialog disabled while CARs are open, issue).
  - [x] `IssuanceDialog`: confirm → animated PRD §8.6 steps → success with code and "Open public statement".
  - [x] `/verify/:code`: public page without a session with lookup box, genuine banner, QR-like code pattern, verified figures, document hashes, signatories; not-found state.
  - [x] Write-back is performed by the api on issuance; the Records screens (step 11) display Verified / Superseded with the assurance link.
  - [x] Playwright `opinion.spec.ts` runs chapter 8 across three personas and checks the public page.
  - Done when: chapter 8 runs; a new tab on `/verify/{code}` works from the seeded issued statement. ✔

- [x] **Step 11 — Records: inventory, product emission factors, decarb_unit records**
  - [x] Inventories list with stacked year chart by scope, change versus previous verified year, evidence completeness, assurance links, "New inventory" (copy last year's lines). Editor: KPI tiles (gross, biogenic separate, removals separate, completeness), Scope 1/2/3 tabs with declared/verified subtotals, lines with per-gas detail, evidence chips (link existing document or upload), declared vs verified pair, add/edit line dialog with the shared `GasEditor` (live tCO2e, GWP shown, species selection, custom GWP for "other"), verifier "Verified value" dialog, submit (attach to engagement or create a request), reopen as new revision.
  - [x] Product emission factors: cards with declared vs verified, evidence, history, assurance link; editor; submit.
  - [x] `decarb_unit` portfolio: KPI totals, declared vs verified by year chart, table with factor, attributed volume, units, status and assurance; "New record" dialog (good, supply shed, intervention, layer, baseline method, attributed volume and unit, period). Editor: baseline and project profile cards (read-only gas table, gross, biogenic, removals, reference volume, EF gross/removal) with profile dialog; computed panel (factor, reduction units with formula, removal units, biogenic delta, diagnostics, declared vs verified, negative-reduction justification); evidence; "What if…" recompute that refuses a unit mismatch; submit with blockers.
  - [x] Playwright `records.spec.ts` runs chapter 7 including the L-vs-t refusal and the kg recompute (= 400 units).
  - Done when: chapter 7 runs, including the deliberate unit-mismatch error and its fix. ✔

- [x] **Step 12 — Future features in preview**
  - [x] Integrations: API keys, MCP server (tool list), webhooks, spreadsheet import in `PreviewOverlay` with "I'm interested" (step 4); "further out" cards now link to their preview pages.
  - [x] Generic `/preview/$key` page with tailored mock layouts (AI assistant with proposed slots and completeness check, e-signature sessions, report exports, registry connectors, continuous assurance, generic connected-sources mock for dMRV/VC/DPP/agents), always greyed with the Coming badge and interest capture. Entry points: "AI assistant" on the Documents tab, "Export reports" on GHG inventories, "See the preview" on the Integrations page.
  - [x] Staff Clients page: per-client stats, feature state matrix editable by managers (hidden / preview / enabled per client, with interest counts), interest signals list with notes. Staff Templates page: read-only template browser (phases, steps, owners, durations, slots, approvals, checklists) with a show-don't-do "Edit template" dialog.
  - [x] Playwright `previews.spec.ts` runs chapter 10.
  - Done when: chapter 10 runs and the interest record shows on the staff page. ✔

- [x] **Step 13 — Investor polish**
  - [x] `demo/DEMO_SCRIPT.md`: ten chapters with exact clicks, persona switches, what to say, recovery tips.
  - [x] Skeletons and empty states on every list and detail; error toasts via "Fail next call"; keyboard-complete dialogs and focus rings; **axe audit clean** (no serious/critical WCAG 2.1 AA violations on 24 pages, `e2e/a11y.spec.ts`) after fixing contrast tokens, unlabeled selects, navigation tabs, progress names, the inert preview overlay and scrollable tables; dark mode and tablet (820 px) checked via screenshot variants.
  - [x] Performance: initial load ≈ 210 kB gzipped (app + api/domain/fixtures), chart library lazy on records pages, all chunks ≈ 460 kB gzipped; route-level code splitting via the router plugin.
  - [x] `e2e/storyline.spec.ts` plays all ten chapters in one session; CI now installs Chromium and runs the full Playwright suite (16 tests) on every push.
  - [x] 27 light screenshots plus dark variants in `assets/demo-screenshots/`, embedded in README.
  - Done when: a non-technical presenter can run the script start to finish on the live URL without help. ✔ (verified by the storyline test and the script walkthrough)

- [x] **Step 14 — Release and Phase II handover**
  - [x] Tag `v0.1-demo`; README rewritten with live URL, storyline, screenshots, how the mock works, known limitations.
  - [x] `planning/phase2-handover.md`: what carries over unchanged, what is replaced, decisions to keep, gaps, first steps.
  - Done when: both files are committed and the tag is pushed. ✔

### 3.1 Phase I.5 — ADMIN, manager overrides, rollups (v0.2-demo)

Brief: `planning/next-session-prompt.md` (2026-10-06). Decisions taken while executing are in §8. Same bookkeeping as Phase I.

- [x] **Step 15 — PRD v0.2 (before any demo code)**
  - [x] `0001-prd-verifassurx-platform.md` bumped to Draft v0.2: §3.2 ADMIN as platform administrator with can / cannot lists and manager override powers; §4 stories 17–23; §5.1/5.2 scope; §6.13 Administration (FR-63–72, exact KPI list in FR-71), §6.14 Manager overrides (FR-73–77), §6.15 Portfolios (FR-78, R2, flag `portfolios`); §7.1 Administration portal `/admin/*`, §7.2 screens, §7.3 read-only ADMIN and override rules; §9.3 users / organisations / audit_events columns, `platform_settings`, `announcements`; §10.2 `/admin/*`, override, plan and reassign endpoints and the front-end mapping; §11.2 ADMIN column and override rows, §11.3 re-authentication and break-glass; §13 M6b, §14 metrics, §15 risks.
  - [x] `tasks-0001-prd-verifassurx-platform.md`: sub-tasks 3.11–3.14, 5.11, 6.8, 11.8 and parent task 13.0 "M6b — Administration console"; relevant files for `routes/admin.ts`, `routes/overrides.ts`, `pages/admin/*`.
  - Done when: both planning files are committed before any code changes. ✔

- [x] **Step 16 — Domain and policy**
  - [x] `enums.ts`: `platform_admin` added to `VERIFIER_ROLES` (org-level role, §8 D1); `STEP_OVERRIDE_ACTIONS`, `SERVICE_OVERRIDE_ACTIONS`, `OVERRIDE_REASON_MIN_LENGTH`, announcement enums, new notification types (`ADMIN_ACTIONS` lives in `policy.ts` because it is typed against `Action`; the `portfolios` flag is a fixture row, step 17).
  - [x] Schemas: `User` gains `last_sign_in_at`, `deactivated_at`, `deactivated_by`, `deactivation_reason`, `anonymised_at` and loses `platform_role`; `Organisation` gains `suspended_at`, `suspended_reason`, `portfolio_manager_user_id`; `AuditEvent` gains `reason`; new `PlatformSettings`, `Announcement`.
  - [x] `policy.ts`: ADMIN branch first (allow-list `ADMIN_ACTIONS`, every other action denied with a "platform administrator" reason, no org restriction on reads); `admin.*` denied to everyone else; manager gains `step.override`, `service.override`, `team.reassign`, `step.plan_dates` (team leader also `step.plan_dates`); `isPlatformAdmin`. Tests: 37 denied actions for ADMIN, allow-list, membership-only recognition, nobody else gets `admin.*`, override grants per role.
  - [x] `machines.ts`: `applyStepOverride` (complete | reopen | skip from any state, event `step.overridden`, same-state refused, `team_nomination` / `final_opinion` never forced to completed); tests. `next-action.test.ts`: an override of the desk-review step moves the next action off the rejected client slot and reopening brings it back.
  - [x] `api/core.ts` derives `platformRole` from the membership and refuses deactivated users; `audit()` writes `reason`; fixtures carry the new columns.
  - Done when: typecheck, lint, vitest pass. ✔ 77 tests.

- [x] **Step 17 — Mock api and fixtures**
  - [x] Fixtures: Sam Okafor (`usr_sam`, platform administrator, VERIFASSUR, role `platform_admin`); deterministic `last_sign_in_at` on every user and one `auth.signed_in` event each (plus a failed sign-in and a flag-default change for the auth and admin logs); `portfolio_manager_user_id = usr_helena` on the three client orgs; `portfolios` flag; `platformSettings` row (branding, four notification templates, retention 10 years) and one inactive `announcements` row (Sam publishes it in chapter 11); store schema 2, session carries `breakGlassServiceIds`.
  - [x] `api/admin.ts`: users (list with filters and open-work count / update / changeRole / deactivate → reassignment summary and manager notifications / reactivate / resetPassword / resetMfa / forceSignOut / anonymise / invite), orgs (list / create / update / suspend / unsuspend), settings (get / update / listFlagDefaults / setFlagDefault), announcements (list / create / update / remove / `activeAnnouncementsSync` for the shell), `auditLog` with org / actor / type / date / text / auth-only filters and `auditCsv`, `coiRegister`, `stats` (every FR-71 KPI with year / client / type filters; `money` only for ADMIN, per currency), `breakGlass` + `canReadEvidenceContentSync` + `logBreakGlassRead`.
  - [x] `api/services.ts`: `overrideStep`, `overrideService`, `replanStep`; `api/steps.ts`: `overrideStepInternal`, `requireReason`; `api/team.ts`: `reassign` (IR exclusivity kept, COI required for the new member) and ADMIN excluded from nomination candidates; audit events `step.overridden`, `service.overridden`, `team.reassigned`, `step.replanned` carry `reason`; notifications `step_overridden`, `service_overridden`, `team_reassigned`, `account_changed`. `api/auth.ts`: `auth.signed_in` / `auth.signed_out` / `auth.refused` events, `last_sign_in_at`, deactivated users and suspended organisations cannot sign in, personas carry `disabled`, `Me.isAdmin`. ADMIN sees every service in `services.list`.
  - [x] `api/records.ts`: `setVerifiedEmissionFactor` (immutable once verified).
  - [x] `storyline.test.ts` chapters 11 (Sam: stats with money, deactivate Pieter with summary, audit and auth logs, announcement, flag default, COI register, break-glass, nine forbidden engagement mutations, managers refused on `admin.*`) and 12 (Helena: reason validation, override complete → next action moves, reopen, impartiality refused, reassign Priya → Jonas with COI required, service hold / resume by override, replan, team leader refused).
  - Done when: all unit tests pass. ✔ 80 tests.

- [x] **Step 18 — Administration UI**
  - [x] `nav.ts` `ADMIN_NAV` (Administration portal + read-only views); `/admin` layout route guards on `isAdmin`; ADMIN lands on `/admin` from `/` and `/staff`; shell shows "Administration portal", a "Read-only on engagements" badge, the announcement banner and the maintenance banner for everyone in the audience; engagement layout shows the "Platform administrator: read-only view" banner with the break-glass request; `useServicePermissions` returns `readOnly` and no powers for ADMIN; Actions menu, finance, records and request-from-client controls hidden; document rows show "Content closed" until break-glass and log each read.
  - [x] `/admin` dashboard (engagement, attention and money tiles, per-year and per-client charts, cycle times, by type, workload, per client, overdue steps, blocking findings, COI pending, concentration; year / client / type filters); `/admin/users` (users table with filters, invite, edit, change role, deactivate with typed confirmation and reason → reassignment summary dialog, reactivate, reset password / MFA / force sign-out / anonymise as show-don't-do; Organisations tab with create / edit / suspend / unsuspend and the Portfolio manager column under `ComingBadge`); `/admin/audit` (all / authentication views, org / type / date / text filters, override highlighting, CSV); `/admin/coi` (KPIs, filters, CSV); `/admin/settings` (flag defaults functional, announcement CRUD with live switch, maintenance / branding / templates / data operations as show-don't-do whose Simulate applies and logs).
  - [x] Step detail: "Override status" menu (force complete / reopen / skip, disabled where impossible) with the shared `ReasonDialog`, "Completed by override" badge and alert, "Planned dates" dialog (manager and team leader), "Reassign" on the team panel; service Actions menu gains override entries (return to execution, close with reason); verified-value dialogs on emission factors and decarb records for verifier roles, never for ADMIN; Service Log highlights overrides and offers a "Manager overrides" filter; staff Clients page lets ADMIN set per-client flags and shows the Portfolio manager column.
  - [x] Sign-in grid and demo panel show Sam Okafor and grey out deactivated personas; chapters 11 and 12 in `demo.CHAPTERS`; `scripts/screenshot.mjs` entries 28–31 added for the visual check.
  - Done when: typecheck, lint, vitest, build and the existing Playwright suite pass. ✔ 80 unit tests, 16 Playwright tests, probe clean on 19 pages.

- [x] **Step 19 — Tests, screenshots, docs**
  - [x] `e2e/admin.spec.ts` (Sam: dashboard with money, deactivate Pieter with reason and typed confirmation → reassignment summary, audit and auth log, announcement goes live; Sam on an engagement sees no action control, break-glass opens content and is logged, records and finance read-only) and `e2e/override.spec.ts` (Helena forces the desk review with a reason, "Completed by override", Service Log override filter, Ingrid's re-upload action gone, override in the ADMIN audit log; reassign Priya → Jonas with COI pending, force-complete disabled on team nomination); chapters 11–12 in `e2e/storyline.spec.ts` (Claire deactivated, Solstice desk review overridden); nine `/admin/*` and ADMIN engagement pages in `e2e/a11y.spec.ts`, axe clean.
  - [x] `scripts/screenshot.mjs` 28–31 captured (plus 27 refreshed for the Portfolio manager column and a dark variant of 28); 28 and 31 embedded in README.
  - [x] `DEMO_SCRIPT.md` chapters 11 and 12 with the chapter table; README v0.2 paragraph, phase row, role-enforcement note; `phase2-handover.md` admin api and override endpoints, decisions to keep, new gaps.
  - [x] Fix found by the new spec: document rows now read the break-glass grant through a query so the grant re-renders them; the audit page's "Overrides" filter no longer reaches the api as a prefix.
  - Done when: every unit and Playwright test passes locally. ✔ 80 unit tests, 21 Playwright tests.

- [x] **Step 20 — Release v0.2-demo**
  - [x] All steps ticked, progress log rows with commit hashes, relevant files updated; tag `v0.2-demo` pushed; CI green including Playwright (run recorded in §6); live site shows Sam Okafor in the sign-in grid.
  - Done when: https://rbndchsn.github.io/digital-platform/ serves the v0.2 build. ✔ **Phase I.5 complete.**

### 3.2 Phase I.6 — Accreditation-grade controls (PRD v0.3, v0.3-demo)

Brief: PRD v0.3 (C1–C10) and `planning/prd-v0.3-report.md` §4, approved by Luc on 2026-10-06 ("Do it all"). Decisions taken while executing are in §8 (D25 onward). Same bookkeeping as Phase I.

- [x] **Step 21 — Domain (PRD v0.3)**
  - [x] `enums.ts`: `not_applicable` level of assurance, `REVIEW_STATUSES`, `ASSURANCE_STATUSES`, `STATEMENT_STATUSES`, post-issuance triggers / outcomes, materiality bases and statuses, misstatement enums, case enums, qualification kinds, rotation scopes, check results, service status `in_revision`, override action `change_assurance_level`, new notification types and evidence entity types.
  - [x] Schemas: `Service` (`level_of_assurance`, `assurance_level_locked_at`, `triage_check_json`, scope `sector_scopes` / `technical_areas`), `Step.non_overridable`, `ServiceTeamMember.removed_at`, `CoiDeclaration.reconfirmed_for_iteration_id`, `InventoryLine` review status + adjusted values (no `verified_*`), records `level_of_assurance` + `assurance_status`, `OpinionIteration` aggregation / warning / acknowledgements / `revision_of_statement_id`, `OpinionStatement` status / superseded / withdrawn / materiality; new `MaterialitySetting`, `Misstatement`, `PostIssuanceEvent`, `RecordAssuranceHistory`, `Case`, `CaseNote`, `CompetenceProfile`, `CompetenceQualification`, `NominationCheck`, `LegacyEngagement` (`schemas/governance.ts`); `PlatformSettings.complaint_targets_json`.
  - [x] `template.schema.ts`: per-step `non_overridable`; template `assurance`, `materiality_defaults`, `competence_requirements`, `rotation_rules`, `complaint_targets`, `blocking_finding_types`, `retention_years`, `last_edit_reason`; `validateTemplate` (protected approvals, team nomination and the opinion step must be `non_overridable`; assurance defaults consistent). `templates/index.ts`: the six protected steps are locked in every template; per-type assurance applicability, materiality defaults, competence requirements and rotation rules; IR and manager checklists carry the `materiality` consistency item. `instantiate.ts` copies `non_overridable`.
  - [x] `machines.ts`: `applyStepOverride` reads `non_overridable` (typed error `step_non_overridable`; hard-coded keys removed); service `open_revision` / `revision_to_opinion_review`; iteration `return_to_ir`; statement, post-issuance, case, misstatement and materiality machines; COI `reconfirm`; record `withdraw` from `verified`.
  - [x] New pure modules: `workflow/involved-set.ts`, `compute/materiality.ts`, `workflow/competence.ts`, `workflow/rotation.ts`, each with a test file.
  - [x] `policy.ts`: v0.3 actions; resolution order gains the involved set (`decision_maker_conflict`) for the manager decision, issue, revision and withdrawal decisions and case handling / assignment / decision; `own_profile` refusal; `Decision.code`; ADMIN allow-list gains `case.read_all` and `competence.read`. `next-action.ts`: `in_revision` leads to the revision iteration.
  - [x] Compile-level follow-through so the step stands on its own: `api/involved.ts` (involved set, eligibility, verified-value edit consequences), `api/materiality.ts`, `api/records.ts` (line review, verified totals, write-back to statements with history, withdrawal), `api/iterations.ts` (eligibility refusal with audit event, acknowledgement, aggregation snapshot, statements list, revision issuance, public page semantics), `api/services.ts` (`change_assurance_level`), `api/approvals.ts` (acceptance locks the level), store schema 3 with the new tables, fixtures carrying the new columns, Marc Lefèvre seeded, inventory editor rewritten around review status, `components/assurance-badge.tsx`.
  - Done when: typecheck, lint, vitest pass with the new unit tests. ✔ 113 tests, build green.

- [ ] **Step 22 — Mock api and fixtures**
  - [ ] Fixtures: second decision-capable manager Marc Lefèvre; competence profiles for all staff (one expiring lead qualification); templates with `non_overridable`; Northwind PCF 2025 service in opinion review with a materiality warning; Northwind PCF 2024 statement **withdrawn** (EF records show "assurance withdrawn"); Northwind FY2023 statement **superseded** by a revision; an appeal under investigation and an overdue complaint; legacy engagements for rotation history; `record.verified_value_edited` history events; `assurance_ref` now points to statements; store schema 3.
  - [ ] Api: `materiality.ts`, `post-issuance.ts`, `cases.ts`, `competence.ts` (profiles, nomination and rotation checks, legacy history); `iterations.ts` eligibility, acknowledgement, return-to-IR, aggregation snapshot, statements list, revision issuance (supersede, re-point records, history); `records.ts` line review status, verified totals, `issued_immutable`, write-back with level of assurance and history; `team.ts` checks on nominate / reassign; `services.ts` `change_assurance_level`, timeline milestones and override markers; `staff.ts` template edit with reason and validation; `admin.ts` v0.3 statistics; notifications for every new decision point.
  - [ ] `storyline.test.ts` chapters 13–16; policy, machines, fixtures tests updated.
  - Done when: all unit tests pass.

- [ ] **Step 23 — UI part A: opinion, materiality, records, public page**
  - [ ] Opinion tab: aggregation panel, inconsistency warning with acknowledgement comment in the IR and manager dialogs, eligibility notice (`decision_maker_conflict`), statement status chip and level-of-assurance badge, post-issuance events list and dialog, client "Appeal this decision".
  - [ ] Materiality panel and misstatement register on the service (Planning / Execution), proposals from adjusted lines; inventory editor line review status instead of per-line verified values; EF and decarb editors keep verified values with `issued_immutable`; assurance badge and status on every record card, portfolio and the client home; assurance history drawer.
  - [ ] Public `/verify/{code}`: level of assurance, materiality line, superseded / withdrawn banners that survive the client opt-out.
  - [ ] Request wizard and CPF: level of assurance; service header badge; service override "Change level of assurance".
  - Done when: typecheck, lint, vitest, build pass and the existing Playwright suite passes.

- [ ] **Step 24 — UI part B: complaints, competence, rotation, templates, timeline, admin**
  - [ ] Complaints and appeals: client Organisation tab (raise, follow), staff register (`/staff/cases`) with targets, handler assignment outside the involved set, notes, decision with actions; "Appeal this decision" entry points.
  - [ ] Competence page (`/staff/competence`), team panel with competence summary, rotation history and check results, override-with-reason on warnings, IR hard block; triage card shows the VVB rotation history.
  - [ ] Template editor: `non_overridable` lock toggle with reason, materiality defaults, competence requirements, rotation rules, complaint targets (functional save as a new version).
  - [ ] Timeline rewritten (`components/timeline.tsx`): collapsible phases, transition ticks with tooltips, milestones, override markers, week sub-axis, keyboard navigation and table view.
  - [ ] Admin dashboard tiles for refusals, warnings, cases, expiring qualifications, revisions; Service Log filters; nav entries; demo panel chapters 13–16; Service overview shows the level of assurance.
  - Done when: typecheck, lint, vitest, build pass; probe clean on every page.

- [ ] **Step 25 — Tests, screenshots, docs, release v0.3-demo**
  - [ ] Playwright `governance.spec.ts` (chapters 13–16), storyline chapters 13–16, a11y on the new pages; screenshots 32–38; `DEMO_SCRIPT.md`, README, `phase2-handover.md`; tag `v0.3-demo`; CI green; live site shows Marc Lefèvre.
  - Done when: every unit and Playwright test passes and the live URL serves v0.3.

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
| `demo/src/lib/cn.ts`, `format.ts`, `query.tsx`, `auth.tsx`, `theme.ts` | Class merge, formatting, query client + `useAppMutation`, session context, theme |
| `demo/src/components/ui/*` | UI primitives (shadcn-style on Radix) |
| `demo/src/components/*.tsx` | Domain components: status chip, action pill, phase rail, KPI tiles, empty state, page header, provenance, show-don't-do dialog, typed confirm, preview overlay, placeholder |
| `demo/src/components/shell/*` | App shell, nav config, notifications bell, demo panel |
| `demo/src/routes/__root.tsx`, `_app.tsx`, `sign-in.tsx`, `verify.$code.tsx` | Providers, guarded layout, sign-in, public statement route |
| `demo/src/routes/_app/**` | One file per screen; placeholders until their step |
| `demo/scripts/screenshot.mjs` | Screenshot capture from the production build (`SHOTS=02,05` filters) |
| `demo/scripts/probe.mjs` | Loads pages as a persona and prints console/page errors |
| `demo/src/components/service-table.tsx` | Shared engagements table (ongoing/past/drafts) |
| `demo/src/components/upload-dialog.tsx` | Show-don't-do upload dialog backed by `documents.simulateUpload` |
| `demo/src/components/stepper.tsx` | Wizard progress header |
| `demo/e2e/wizard.spec.ts` | Chapter 2 in the browser |
| `demo/e2e/workspace.spec.ts`, `helpers.ts` | Chapters 3 (COI gate) and 5 in the browser; `enterAs` helper |
| `demo/src/lib/service-hooks.ts` | Query hooks for service, documents, findings, iterations, statement, timeline |
| `demo/src/components/document-row.tsx` | Document row, version history, preview and reject dialogs |
| `demo/src/components/approval-row.tsx` | Approval row, decide dialog, agreement acceptance dialog |
| `demo/src/components/gantt.tsx` | SVG Gantt |
| `demo/src/components/download-all.tsx`, `coi-declare.tsx` | Download-all dialog; COI declaration card |
| `demo/src/features/service/step-detail.tsx` | Step detail, slot groups, team panel, nominate dialog, `useServicePermissions` |
| `demo/src/routes/_app/engagements/$serviceId.tsx` + `$serviceId/*` | Workspace layout and tabs; findings list/thread; opinion tab |
| `demo/src/components/issuance-dialog.tsx`, `nav-tabs.tsx`, `evidence-chips.tsx`, `declared-verified.tsx` | Issuance animation, navigation tabs, evidence chips with link dialog, declared/verified pair |
| `demo/src/features/records/*` | Gas editor, submit-for-verification dialog |
| `demo/src/routes/_app/records/**` | Inventories, emission factors, decarb_units screens |
| `demo/src/routes/_app/staff/*`, `preview.$key.tsx` | Staff pages; generic preview page |
| `demo/e2e/*.spec.ts` | Chapter tests, a11y audit, full storyline |
| `demo/DEMO_SCRIPT.md` | Presenter script (12 chapters) |
| `planning/phase2-handover.md` | Handover to the real platform |
| `assets/demo-screenshots/` | Screenshots (light + dark variants; 28–31 are the v0.2 admin and override screens) |
| `planning/next-session-prompt.md` | Brief that drove Phase I.5 (steps 15–20) |
| `demo/src/api/admin.ts` | Administration console api: users, organisations, settings, announcements, global audit, COI register, FR-71 stats with ADMIN-only money, break-glass, data operations |
| `demo/src/components/reason-dialog.tsx` | Mandatory-reason dialog (optional typed phrase) used by overrides, deactivation, suspension, break-glass |
| `demo/src/routes/_app/admin.tsx`, `admin/*.tsx` | Administration portal: layout guard, dashboard, users and organisations, audit log, COI register, settings |
| `demo/e2e/admin.spec.ts`, `override.spec.ts` | Chapters 11 and 12 in the browser |
| `planning/prd-v0.3-report.md` | PRD v0.3 impact map, QA table, inconsistencies, demo proposals (Phase I.6 brief) |
| `demo/src/domain/schemas/governance.ts` | Cases, case notes, competence profiles and qualifications (PRD v0.3) |
| `demo/src/domain/workflow/involved-set.ts` | Involved set derived from team rows and verified-value edit events (FR-79) |
| `demo/src/domain/compute/materiality.ts` | Threshold, gross / net aggregation, consistency warning, misstatement proposal (FR-84–87) |
| `demo/src/domain/workflow/competence.ts`, `rotation.ts` | Nomination checks: qualifications with the IR hard block; consecutive-engagement rotation rules |
| `demo/src/api/involved.ts` | Involved set, eligibility, consequences of a verified-value edit (return to IR, `issued_immutable`) |
| `demo/src/api/materiality.ts` | Materiality setting, misstatement register, aggregation panel |
| `demo/src/components/assurance-badge.tsx` | Level-of-assurance badge and assurance history (FR-83) |

---

## 6. Progress log

| Date | Step | Commit | What changed | Deferred / notes |
|---|---|---|---|---|
| 2026-10-05 | — | — | Plan v1 written. Repo `rbndchsn/digital-platform` confirmed empty and public. Local folder not yet a git repo. | User answered "go, make all decisions"; §2.2 updated with the "show, don't do" dialog rule |
| 2026-10-05 | 0 | 3d11574 | Repo initialised, planning docs, CLAUDE.md, README, .gitignore pushed to `main`. | — |
| 2026-10-05 | 1 | a3134a2 | `demo/` scaffolded: Vite 8, React 19, TS 6, Tailwind 4, TanStack Router, tokens, tests, Playwright, deploy workflow; GitHub Pages enabled. CI run 37409270913 green; https://rbndchsn.github.io/digital-platform/ returns 200. | Cloudflare Pages job skipped until repo secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` exist |
| 2026-10-05 | 2 | 21ad0c7 | Domain layer: enums, zod schemas, units + GWP, inventory and decarb compute, 8 workflow templates, instantiate, 7 state machines, next-action, policy. 46 unit tests. | Schema coverage counted in step 3 via fixture validation |
| 2026-10-06 | 3 | 7f72cac | Mock backend: store with sessionStorage snapshot, latency toggles, programmatic seed for the whole storyline, 15 api modules, fixture validation and end-to-end storyline tests. 69 tests. | Storyline §2.4 adjusted: the opinion chapter (8) runs on the insetting service `svc_nw_decarb_2025`, the evidence and findings chapters (5, 6) on the inventory service `svc_nw_inv_2025` |
| 2026-10-06 | 4 | c27b0b7 | App shell, sign-in with persona picker, navigation for both portals, notifications bell, demo panel, UI primitives and domain components, feature previews, Integrations/Account/Organisation pages, placeholder routes for every nav entry, Playwright smoke tests in Chromium. | Lint reports 5 fast-refresh warnings (hooks exported next to components); harmless, left as warnings |
| 2026-10-06 | 5 | a92c47a | Client home, engagements lists (ongoing/past/drafts, renewal), projects list/detail with create dialog, shared service table. | Fixed Button `asChild` slotting; added `scripts/probe.mjs` to surface runtime errors per page |
| 2026-10-06 | 6 | e8b6074 | Request wizard with autosave/resume/renewal, upload dialog, stepper, wizard e2e test. | React Hooks v7 forbids setState in effects: dialogs derive defaults, the wizard mounts with initial values |
| 2026-10-06 | 7 | e3ca156 | Service workspace: layout, overview, step detail with slots/approvals/team/COI, documents, Gantt, Service Log; document and approval rows; COI gate; workspace e2e tests. | Step 8 items already present where natural (step transitions, approvals, team nomination, agreement acceptance); step 8 adds the staff pages |
| 2026-10-06 | 8 | 08dd57d | Staff pages: My Work, triage queue, all services, finance; staff e2e tests. | — |
| 2026-10-06 | 9 | 9b1eda5 | Findings list and thread with attachments and transitions; findings e2e test. | — |
| 2026-10-06 | 10 | 95f643c | Opinion tab, review/approval dialogs, animated issuance, statement card, public verification page; opinion e2e test. | QR is a deterministic decorative pattern; Phase II renders a real QR |
| 2026-10-06 | 11 | e22aa0e | Records: inventories (list, chart, editor with gas editor and evidence), product emission factors, decarb_units portfolio and editor with what-if; records e2e test. | — |
| 2026-10-06 | 12 | 7826d53 | Preview pages for future features, staff Clients (flag matrix, interest signals) and Templates pages; previews e2e test. | — |
| 2026-10-06 | 13–14 | 821b542 (tag v0.1-demo) | Demo script, axe audit and fixes, full-storyline test, CI runs Playwright, screenshot set, README, Phase II handover. **Phase I complete.** | Cloudflare Pages deploy waits for the two repository secrets; GitHub Pages is live |
| 2026-10-06 | 15 | 28044ce | PRD v0.2: ADMIN platform administrator, manager overrides, Administration console, portfolios; task list 3.11–3.14, 5.11, 6.8, 11.8, 13.0. | Decisions D1–D10 in §8 |
| 2026-10-06 | 16 | c27ad8e | Domain: `platform_admin` org role, user / org / audit columns, `PlatformSettings` and `Announcement` schemas, ADMIN allow-list and override actions in policy, `applyStepOverride`, tests (77). | — |
| 2026-10-06 | 17 | 64a004e | Mock api: `api/admin.ts`, overrides and reassign, audited sign-ins, Sam Okafor and platform fixtures, storyline chapters 11–12. 80 tests. | Chapter 12 resumes the Solstice service to whatever status it had (planning in the api storyline, execution in the browser storyline) |
| 2026-10-06 | 18 | c38a1fc | Administration portal (`/admin/*`), read-only ADMIN everywhere with break-glass, manager override / reassign / replan controls, verified-value dialogs for EFs and decarb records, announcement and maintenance banners, Sam in the persona grid and demo panel. | Screenshot entries 28–31 added one step early for the visual check |
| 2026-10-06 | 19 | 68fd36d | Playwright `admin.spec.ts` and `override.spec.ts`, storyline chapters 11–12, axe on the admin pages, screenshots 27–31, DEMO_SCRIPT chapters 11–12, README, handover. 80 unit tests, 21 Playwright tests. | Break-glass re-render and audit "Overrides" filter fixed |
| 2026-10-06 | 20 | 9fe4d8f (tag v0.2-demo) | Plan bookkeeping, tag `v0.2-demo`, CI and live site confirmed. **Phase I.5 complete.** | Cloudflare Pages job still dormant (no secrets), GitHub Pages is the live demo |
| 2026-10-06 | — | 0f1b485 | PRD v0.3 (C1–C10), plan §8 D11–D24, `prd-v0.3-report.md`. | Demo untouched; proposals approved by Luc afterwards |
| 2026-10-06 | 21 | (this commit) | Domain for PRD v0.3: enums, schemas, template schema and data with `non_overridable`, machines, involved set, materiality, competence, rotation, policy, next action; compile-level api/fixture/UI follow-through; store schema 3. 113 tests. | Richer api behaviour, seed storyline and UI land in steps 22–24 |

---

## 8. Decisions taken in Phase I.5 (2026-10-06, no questions asked per the brief)

- **D1 — `platform_admin` is an org-level role on the verifier org**, stored in `memberships.role`; `users.platform_role` is removed. One source of truth; the persona grid, org switcher and role badge work unchanged; Better Auth's organization plugin stores roles on memberships in Phase II. `AuthContext.platformRole` is derived from that membership.
- **D2 — ADMIN allow-list in policy**: `org.read`, `project.read`, `service.read`, `document.read`, `record.read`, `invoice.read`, `staff.clients`, `staff.templates`, `org.manage_flags`, `feature.interest`, `admin.users`, `admin.orgs`, `admin.settings`, `admin.audit`, `admin.coi_register`, `admin.stats`, `admin.break_glass`. Everything else is denied before any other rule runs, with no org restriction on reads. ADMIN does not get `staff.triage_queue` (the triage page is a work queue with accept / decline controls; the admin dashboard shows the count instead).
- **D3 — Reads of evidence content by ADMIN** (preview / download dialogs) are gated by break-glass per service for the session; metadata, versions and hashes are always visible. The grant lives in the session state, not in a table.
- **D4 — Step override** is a separate machine (`applyStepOverride`) so the audit event type `step.overridden` is distinguishable; `team_nomination` and `final_opinion` cannot be overridden to `completed` (G5). Reason minimum 10 characters, validated in the api. Override to `completed` bypasses required slots and approvals and then auto-starts the next step through the existing `startFirstStep`.
- **D5 — Service override** reuses the service machine for `hold | resume | cancel | close | return_to_execution` and only differs by the mandatory reason, the `service.overridden` event and both-party notification. `step.plan_dates` is granted to the manager and the team leader (PRD FR-37 already lets the team leader plan).
- **D6 — Deactivation** sets `users.status = disabled`, disables memberships, sets team rows to `removed`, returns the reassignment summary and notifies the verifier managers (and client admins for a client user). Reactivation restores memberships only. The signed-in ADMIN cannot deactivate themselves. Anonymisation, password / MFA resets, force sign-out, exports, backups and the retention report are show-don't-do dialogs whose Simulate writes the audit event.
- **D7 — Money rollups** are computed in `admin.stats` and returned only when the caller is ADMIN; finance keeps the per-engagement Finance page; the staff Clients page keeps no money.
- **D8 — Portfolios**: flag `portfolios` (preview, horizon next, area platform); `portfolio_manager_user_id = usr_helena` on the three client orgs; read-only column on the staff Clients page under `ComingBadge`; no scoping anywhere.
- **D9 — Sign-in audit**: `auth.signed_in` events are written on every persona sign-in and `last_sign_in_at` is updated, so the ADMIN auth log and "last sign-in" column are live in the demo. Suspended organisations and disabled users cannot sign in (persona cards show them greyed).
- **D10 — Store snapshot schema bumped to 2**: new tables (`platformSettings`, `announcements`) and user columns make old `sessionStorage` snapshots incompatible; a tab with a v1 snapshot silently reseeds.

### PRD v0.3 decisions (2026-10-06, accreditation-grade controls C1–C10; PRD only, demo unchanged)

- **D11 — Involved set is scoped per issuance cycle (service level), not per iteration.** Everyone with a verifier service role in the cycle, everyone with a `record.verified_value_edited` event on a record attached to the service in the cycle, and the IR decider. Derived from `service_team` and `audit_events` at request time, never stored. Refuses `iteration.manager_decide`, `iteration.issue`, `statement.revise_decide`, `statement.withdraw_decide`, and case handling with the typed error `decision_maker_conflict`. Per-iteration scoping would let an editor decide the next iteration after a request-changes loop (PRD FR-79, §3.3, §16 assumption 10).
- **D12 — Approving the audit plan and materiality does not join the involved set.** Oversight, not verification work; the alternative needs a third manager per service. Recorded as PRD §16 assumption 8.
- **D13 — Operating assumption: two decision-capable managers at all times.** PRD §16 assumption 7. The demo must seed a second `verifier_manager` beside Helena Brandt before any decision-separation chapter is shown.
- **D14 — `non_overridable` is a per-step template attribute** copied to `steps.non_overridable`; refuses override to `completed | skipped` (`step_non_overridable`), reopen always allowed. Template validation requires every protected approval kind (`technical_scope`, `impartiality`, `contract`, `agreement_acceptance`, `iteration_ir`, `iteration_manager`) to sit in a `non_overridable` step, because those approvals live inside steps. Replaces the v0.2 hard-coded keys of D4 in the PRD; the demo's `applyStepOverride` keeps D4 until the demo is updated.
- **D15 — Level of assurance is template-governed.** `assurance.applies` and `assurance.default` per template; validation templates (`vcs_validation`, `gs_validation`, `design_change`) store `not_applicable`. Captured in the wizard, confirmed on the CPF, locked at agreement acceptance. Changing it after lock is a `service.override` with action `change_assurance_level` that reopens the agreement slot for an amended agreement (re-acceptance, not an override of the agreement step) and resets materiality to `draft`.
- **D16 — `assurance_ref` now points to `opinion_statements.id`**, not the iteration, because statements are what get superseded or withdrawn. Records also store `level_of_assurance` and `assurance_status`; `record_assurance_history` keeps every write-back, supersession and withdrawal so the portfolio can show history without reading the audit log.
- **D17 — Inventory lines lose `verified_*` columns** in favour of `review_status` (`not_reviewed | accepted | adjusted | not_individually_tested`) plus `adjusted_*` values; verified figures exist only at assertion level (`inventories.verified_totals_json`, EF `verified_value`, decarb record verified units).
- **D18 — Materiality has a template-defaulted `assertion_base`** (e.g. `total_gross_tco2e`, `per_scope`, `scope2_market`, `ef_value`, `reduction_units`) recorded with the threshold; it is approved with the existing `audit_plan` approval. Misstatements are proposed by the system from adjusted-vs-declared differences and confirmed by a human. The consistency check is a warning with mandatory acknowledgement comment by IR and decision-maker, never a block.
- **D19 — Revision re-confirms COI** (`approved → declared`) and runs the full chain with a fresh involved set that includes everyone from the original cycle. Withdrawal sets records to `withdrawn` (the existing record state, now defined as "assurance withdrawn"); nothing is deleted. Public `/verify/{code}` never disappears and the banner survives a client opt-out. External notification (programme, registry) is recorded, not sent.
- **D20 — Involved set of a decision = decision actor + involved set of the service (if any)**, used by complaints and appeals so an appeal against a declined request (no team) still excludes the triaging manager. An appeal never suspends the appealed decision.
- **D21 — A user cannot edit their own competence profile.** Managers maintain each other's; ADMIN reads only. IR qualification is a hard block; all other competence gaps warn and are overridable with a reason counted in the override statistics.
- **D22 — Rotation history counts `issued | closed` services only** (cancelled excluded), via `renewed_from_service_id`, same project and same client, plus manager-entered `legacy_engagements`. Role-level rules check at nomination and reassignment; the `vvb` rule checks at triage and can only warn.
- **D23 — Timeline is a custom read-only SVG/CSS-grid component with a table-view twin;** Recharts stays for KPI charts only. The demo's `components/gantt.tsx` is already pure SVG and meets the planned/actual, today-line and month-axis parts of FR-37; it lacks collapsible phases, transition ticks with event tooltips, milestones, override markers, week axis, keyboard navigation and the table view.
- **D24 — C10 deferred.** Governance views for an impartiality-committee role are an open item in PRD §16 only; no role, screen or RBAC row added.

### Phase I.6 decisions (2026-10-06, demo implementation of PRD v0.3)

- **D25 — Materiality approval is a manager action of its own (`materiality.approve`)**, not folded into the demo's audit-plan acceptance, because in the demo the audit plan is accepted by the client (`approval.decide:audit_plan` is a client action since Phase I). The PRD's "approved together with the audit plan" maps to Phase II's `audit_plan` approval row; the demo keeps the two decisions side by side on the Planning step so the separation is visible.
- **D26 — Involved set spans the whole service history.** Since no verified figure can change after issuance (`issued_immutable`) and a revision includes everyone from the original cycle (PRD FR-89), the "current cycle" of FR-79 is the whole service: every team row ever, every `record.verified_value_edited` actor, every IR decider. Simpler, stricter, and exactly what an assessor would expect.
- **D27 — Verified-value edits are one audit event type, `record.verified_value_edited`**, with `entity_type` telling the record kind (`inventory_line`, `inventory`, `emission_factor`, `decarb_unit_record`). The former `inventory.line_verified`, `emission_factor.verified_value` and `decarb_record.verified_values` events are gone, so the involved set has a single source.
- **D28 — Public page semantics.** `getPublicStatement` returns a statement for any existing code; `hidden = !public_enabled || status === 'withdrawn'` strips figures and hashes while the superseded / withdrawn banner always renders (PRD FR-36). The current statement of a service is the issued one, else the most recent one.
- **D29 — A line review or a verified total is recorded through `records.reviewLine` / `records.setVerifiedTotals`** (`PATCH /inventory-lines/:id/review`, `PATCH /inventories/:id/verified-totals`); the response carries `involvedSetJoined`, `iterationReturnedToIr` and `misstatementProposed` so the UI can tell the editor what just happened.
- **D30 — Decision refusals are audited by the api (`iteration.decision_refused`)** and notify the eligible managers; the UI additionally disables the control from `eligibilitySync`, so a refused attempt can only come from a stale screen or a direct api call.

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
