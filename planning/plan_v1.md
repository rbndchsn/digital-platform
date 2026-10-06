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

- [ ] **Step 0 — Repository bootstrap**
  - [ ] `git init` at the repo root, default branch `main`; `.gitignore` with `node_modules/`, `dist/`, `.env*`, `assets/sourceimages/`, `*.local`, `.DS_Store`, `Thumbs.db`.
  - [ ] Rename the empty `claude.md` to `CLAUDE.md` and write it: read `planning/plan_v1.md` first, the operating rules in §0.2, the Phase I constraints, and `cd demo` for all npm commands.
  - [ ] `README.md`: one-paragraph description, Phase I / Phase II, links to the planning files, placeholder for the live URL, local run instructions.
  - [ ] Add `LICENSE` decision: none for now (all rights reserved) — state it in README.
  - [ ] First commit, `git remote add origin https://github.com/rbndchsn/digital-platform.git`, push `main`.
  - Done when: the repo on GitHub shows `planning/`, `CLAUDE.md`, `README.md`, `.gitignore`, and `assets/sourceimages` is absent.

- [ ] **Step 1 — Scaffold the demo app and the deploy pipeline**
  - [ ] `npm create vite@latest demo -- --template react-ts`; set `"type": "module"`, strict TS, path alias `@/` → `src/`.
  - [ ] Install and configure Tailwind, shadcn/ui (init with the teal primary), lucide-react, Inter via `@fontsource-variable/inter`, TanStack Router (file routes plugin), TanStack Query, react-hook-form, zod, sonner, Recharts, date-fns.
  - [ ] Tooling: ESLint (typescript-eslint, react-hooks), Prettier, Vitest + @testing-library/react + jsdom, Playwright; scripts `dev`, `build`, `preview`, `lint`, `typecheck`, `test`, `test:e2e`.
  - [ ] `public/_redirects` with `/* /index.html 200`; `vite.config.ts` base `/` (Cloudflare) with an env switch for GitHub Pages base path.
  - [ ] `src/styles/tokens.css`: colour tokens from PRD §7.4 (primary teal, status colours, orange blocking, blue info), spacing, radius, dark-mode overrides under `[data-theme="dark"]` and `prefers-color-scheme`.
  - [ ] Placeholder home route renders "VERIFASSUR_X demo" with the theme toggle.
  - [ ] `.github/workflows/deploy.yml`: on push to `main` → install, lint, typecheck, test, build; job A deploys `demo/dist` to Cloudflare Pages if secrets exist; job B deploys to GitHub Pages (`actions/deploy-pages`) always. On pull requests → build only.
  - [ ] Enable GitHub Pages (source: GitHub Actions) with `gh api`; record both URLs in README.
  - Done when: the placeholder page is reachable on a public URL from a push to `main`.

- [ ] **Step 2 — Domain layer (pure TypeScript, tested)**
  - [ ] `domain/enums.ts`: every enumeration from PRD §3.2, §8.5, §9.3 (roles, service types, service/step/finding/iteration/COI/document/record statuses, gases, scope categories, slot categories, approval kinds, opinion types, flag states).
  - [ ] `domain/schemas/*.ts`: zod schemas for Organisation, User, Membership, Project, Service, Phase, Step, DocumentSlot, Approval, ServiceTeamMember, CoiDeclaration, Document, DocumentVersion, EvidenceLink, Finding, FindingResponse, OpinionIteration, OpinionStatement, Inventory, InventoryLine, InventoryLineGas, EmissionFactor, DecarbUnitRecord, EmissionProfile, EmissionProfileGas, Notification, Invoice, FeatureFlag, FeatureInterest, AuditEvent, Submission — field names exactly as PRD §9.3.
  - [ ] `domain/units.ts`: mass and EF units, conversion table, GWP tables AR5 and AR6 (100-yr); mismatches throw typed errors. Tests.
  - [ ] `domain/compute/inventory.ts`: per-gas tCO2e, line gross, biogenic and removals separate, totals by scope and category. Tests incl. AR5 vs AR6.
  - [ ] `domain/compute/decarb.ts`: EF gross/removal per profile, factors, reduction and removal units on attributed volume, biogenic delta, diagnostics (`unit_mismatch`, `negative_reduction`). Tests: milk example = 400,000 units; kg/t mismatch error.
  - [ ] `domain/workflow/templates/*.json` + `template.schema.ts`: the eight service-type templates (PRD FR-10) with phases, steps, owner roles, planned durations, required/optional slots, approvals, gating, checklists.
  - [ ] `domain/workflow/instantiate.ts`: template → phases, steps, slots, approvals with planned dates. Tests.
  - [ ] `domain/workflow/machines/{service,step,finding,iteration,coi,document,record}.ts`: transitions returning `{state, events[]}` or typed error; phase gating. Full allowed/forbidden test matrix.
  - [ ] `domain/workflow/next-action.ts`: single next action per service state. Tests per state.
  - [ ] `domain/policy.ts`: `can(ctx, action, resource)` with PRD §11.2 matrix, COI gate, separation of duties. Tests per role.
  - Done when: `npm run test` passes with ≥ 90 % line coverage on `src/domain`.

- [ ] **Step 3 — Mock backend and fixtures**
  - [ ] `mock/fixtures/` JSON authored to support the storyline in §2.4: orgs (VERIFASSUR, Northwind Dairy Cooperative, Solstice Renewables Ltd, one more), users for every persona, 3 projects, 8 services across statuses (requested, contracting, planning, execution, opinion_review, issued ×2, closed), instantiated phases/steps/slots, ~40 documents with versions and fake hashes, 6 findings in mixed states, iterations (one with changes requested), 1 issued statement, inventories 2024 (verified) and 2025 (submitted), 3 emission factors, 2 `decarb_unit` records (milk example and one wheat intervention), invoices, notifications, feature flags per PRD §13, audit events for history. Validate every fixture against the zod schemas in a test.
  - [ ] `mock/store.ts`: typed in-memory tables, `load(fixtures)`, `snapshot()` → sessionStorage on every write, `hydrate()` on boot, `reset()`.
  - [ ] `mock/latency.ts` and a "slow network" and "fail next call" toggle for the Demo panel.
  - [ ] `api/*.ts`: one module per PRD resource with the PRD operation names (`services.create`, `services.submit`, `services.triage`, `steps.transition`, `approvals.decide`, `team.nominate`, `coi.declare`, `documents.startUpload/completeUpload/check`, `findings.create/respond/transition`, `iterations.create/submitForIr/irDecide/managerDecide/issue`, `inventories.*`, `emissionFactors.*`, `decarbUnits.*`, `dashboard.get`, `notifications.*`, `features.*`, `invoices.*`, `staff.*`). Each mutation: policy check → domain transition → store write → audit event → notifications. Return shapes = zod read schemas.
  - [ ] `api/issuance.ts`: step-by-step issuance sequence emitting progress events (for the animation) and performing the record write-back and supersession.
  - [ ] Tests: storyline-critical flows run end to end through `api/*` (request → triage → approvals → COI → agreement → execution → finding → iteration → issue → records verified).
  - Done when: the full storyline can be executed in tests with no UI, and a reload within the same tab preserves state while a new tab starts from fixtures.

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
| `CLAUDE.md` | Agent entry point (to be written in step 0) |
| `README.md` | Repo overview and live URL (step 0) |
| `demo/` | Phase I app (step 1 onward) |

---

## 6. Progress log

| Date | Step | Commit | What changed | Deferred / notes |
|---|---|---|---|---|
| 2026-10-05 | — | — | Plan v1 written. Repo `rbndchsn/digital-platform` confirmed empty and public. Local folder not yet a git repo. | Awaiting answers to §7 before step 0 |

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
