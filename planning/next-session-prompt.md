# Prompt for the next session — ADMIN persona, manager overrides, rollups (Phase I demo, v0.2)

Copy everything below the line into a new Claude Code chat opened in `C:\Projects\MyPythonProjects\MyScripts\digital-platform`.

---

We are continuing the VERIFASSUR_X project in `C:\Projects\MyPythonProjects\MyScripts\digital-platform` (public GitHub repo `rbndchsn/digital-platform`, branch `main`). Phase I, the clickable investor demo in `demo/`, is complete and tagged `v0.1-demo`, live at https://rbndchsn.github.io/digital-platform/. Phase II (the real Cloudflare platform) is NOT started and must not be started. Do not create `verifassurx/`.

## Read first, in this order
1. `CLAUDE.md` (repo root) — operating rules.
2. `planning/plan_v1.md` — the execution plan; all 15 steps of Phase I are ticked. You will add a new section "Phase I.5 — ADMIN, manager overrides, rollups" with steps 15–20 and keep the same bookkeeping (tick steps, progress log rows with commit hashes, relevant files).
3. `planning/0001-prd-verifassurx-platform.md` — the PRD. You will amend it FIRST (see task 1) before touching the demo.
4. `planning/brainstorming.md` §3.10–3.12 — binding decisions (verify-only, decarb_unit definition, client self-entry, future-exposed principle).
5. `planning/phase2-handover.md` and `demo/DEMO_SCRIPT.md` — update both at the end.
6. Skim `demo/src/domain/policy.ts`, `demo/src/domain/enums.ts`, `demo/src/api/core.ts`, `demo/src/api/dashboard.ts`, `demo/src/api/staff.ts`, `demo/src/mock/fixtures/base.ts`, `demo/src/components/shell/nav.ts`, `demo/src/routes/_app/staff/*` — this is where the work lands.

## Decisions already made (do not reopen, do not ask)
- **ADMIN is an administrator of the digital platform, not a manager of clients, projects or staff.** ADMIN can see everything and change nothing that is engagement or record data. ADMIN never opens, completes or reopens a step, never approves, reviews, uploads, edits declared or verified figures, never changes a service status. Best practice: platform administration is separated from assurance decisions.
- **The manager role already exists (`verifier_manager`, persona Helena Brandt). Do not create a new manager role.** Extend the manager's powers to change work data: override a step status (complete, reopen, skip) and a service status (hold, resume, cancel, close — the last four exist) with a **mandatory reason**, reassign team roles, change planned dates, edit verified figures on inventory lines, emission factors and decarb records (already allowed via `record.verify`; make sure the UI exposes it for the manager). Every override is written to the Service Log and notifies the affected users; the next action recomputes accordingly.
- **New persona: Sam Okafor, Platform administrator, at VERIFASSUR**, org role `platform_admin` (org-level role on the verifier org; the existing `platform_role` on `users` can be used or replaced — pick one, keep the schema consistent). Add Sam to the sign-in persona grid and the demo panel.
- **Only ADMIN sees money rollups** (quoted, invoiced, paid, outstanding, by year/client/service type). Finance keeps managing quotes and invoices per engagement as today. Managers do not see firm-wide revenue rollups.
- **Deactivate, never delete, users and members.** Deactivation reassigns or flags their open work (COI pending, assigned findings, team roles) for the manager; a separate "anonymise after retention period" action exists as a show-don't-do dialog. Client-admin "Invite member" stays as it is.
- **Portfolios (senior managers owning a handful of clients and their auditors)**: add to the PRD as a Release 2 feature behind flag `portfolios` (preview). In the demo show a read-only "Portfolio manager" column on the staff Clients page (all clients → Helena) under the `ComingBadge` for `portfolios`. Do not scope My Work or triage by portfolio yet.
- Hosting: GitHub Pages remains the live demo. Leave the Cloudflare Pages job in `.github/workflows/deploy.yml` exactly as it is (dormant until secrets exist). Do not ask about it.
- Everything else in `brainstorming.md` §3.10–3.12 and the PRD stands. Keep the "show, don't do" pattern (realistic dialog, Back to demo, Simulate) for password resets, MFA resets, exports, anonymisation and any external action.

## Tasks, in order (one plan step each; commit and push after each; do not ask questions, decide and note the decision in plan_v1.md)

### Step 15 — PRD amendment (do this before any demo code)
Amend `planning/0001-prd-verifassurx-platform.md` in place (bump to Draft v0.2, date today):
- §3.2 roles: widen `platform_admin` into **ADMIN (platform administrator)** with the scope above; add explicit "cannot" list. Add the manager override powers to `verifier_manager`.
- §4 user stories: add ADMIN stories (see whole picture; manage users and organisations; platform settings; governance views; rollups; data operations) and a manager override story.
- §6 functional requirements: add a new block "6.13 Administration" (FR-63 onward) covering: user management (invite, rename, change email/title/role, deactivate/reactivate with reassignment summary, reset password, reset MFA and passkeys, force sign-out, last sign-in), organisation management (create, rename, suspend, country, legal name), platform settings (feature flag defaults and per-client states — already FR-58/59 — plus notification templates, announcement banner, maintenance mode, branding), global audit log and auth-event log with export, COI register across engagements, break-glass evidence access with reason, rollups and statistics (define the exact KPIs: engagements started/issued/closed per year, per client, per service type and standard, per staff member and role; revenue quoted/invoiced/paid/outstanding per year and client; request→contract and contract→issue cycle times; overdue steps; open blocking findings; COI pending; workload per staff; client concentration), data export/backup/retention/anonymisation. Add "6.14 Manager overrides" (step status override with reason, service status override, team reassignment, planned date changes, verified figure edits) and "6.15 Portfolios (R2)". State that every ADMIN action and manager override is an audit event with actor, reason and before/after.
- §7.1 information architecture: add an **Administration portal** (same app, `/admin/*`): Dashboard, Users and organisations, Audit log, COI register, Settings. §7.2 add the screens. §7.3 add the rule "ADMIN actions are read-only on engagement data; the UI shows no engagement action buttons to ADMIN".
- §9.3 data model: add `user_deactivations` (or fields on `users`: `deactivated_at`, `deactivated_by`, `reason`), `platform_settings`, `announcements`; add `override_reason` to the relevant audit events; add `portfolio_manager_user_id` on `organisations` (R2).
- §10.2 API: add `/admin/*` endpoints (users, orgs, settings, audit, coi-register, stats) and `POST /services/:id/steps/:stepId/override`, `POST /services/:id/team/:memberId/reassign`.
- §11.2 RBAC matrix: add the ADMIN column (read everything; manage users/orgs/settings; no engagement or record mutations) and the manager override rows. §11.3: ADMIN actions require recent re-authentication; break-glass is logged.
- §13 release plan and §14 metrics: ADMIN console in R1; portfolios in R2.
- Update `planning/tasks-0001-prd-verifassurx-platform.md` with matching sub-tasks under the existing parent tasks (3.0 auth/orgs, 5.0/6.0 workflow, 11.0 dashboards) and a new parent task "13.0 M6b — Administration console".
Commit: `docs(prd): v0.2 — ADMIN platform administrator, manager overrides, rollups, portfolios`.

### Step 16 — Domain and policy
- `enums.ts`: add `platform_admin` to the verifier org roles (or keep `platform_role`; decide and document), add `ADMIN_ACTIONS`; add `user` statuses `active | disabled` already exist — add `deactivated_at`, `deactivated_by`, `deactivation_reason` to the `User` schema; add `PlatformSettings` and `Announcement` schemas; add `portfolio_manager_user_id` to `Organisation`.
- `policy.ts`: ADMIN decision branch: allowed = `org.read`, `admin.users`, `admin.orgs`, `admin.settings`, `admin.audit`, `admin.coi_register`, `admin.stats`, `admin.break_glass`, `service.read`, `document.read`, `record.read`, `invoice.read`, `feature.*`; denied = every mutation on services, steps, approvals, team, COI decisions, documents, findings, iterations, records. Manager gains `step.override`, `service.override`, `team.reassign`, `step.plan_dates`. Unit tests: ADMIN cannot transition a step, approve, upload, verify figures or issue; manager override allowed with reason; ADMIN can deactivate a user; nobody else can.
- `machines.ts`: `step.override` applies `complete | reopen | skip` from any state with a reason (separate from the normal machine so the audit event is distinguishable).
- `next-action.ts`: unchanged, but add a test that an override recomputes the next action.

### Step 17 — Mock api and fixtures
- Fixtures: add Sam Okafor (`usr_sam`, `sam.okafor@verifassur.example`, "Platform administrator"); set `portfolio_manager_user_id = usr_helena` on the three client orgs; platform settings and one announcement row.
- `api/admin.ts`: `users.list/update/deactivate/reactivate/resetPassword/resetMfa/forceSignOut/anonymise`, `orgs.list/create/update/suspend`, `settings.get/update`, `announcements.*`, `audit.list` (global, filters: org, actor, type, date, search; CSV export), `coiRegister.list`, `stats.get` (all KPIs in FR-6.13, computed from the store; money only when the caller is ADMIN), `breakGlass.open(serviceId, reason)`.
- `api/services.ts` / `steps.ts`: `overrideStep(serviceId, stepId, action, reason)` and `overrideService(...)` for managers; audit events `step.overridden` / `service.overridden` with reason; notifications to the step owner party and client contact; `team.reassign`.
- Deactivation: sets status disabled, records reason, removes the user from active team rows (status `removed`), clears their session if signed in, writes an audit event, and returns a "reassignment summary" (services, roles, open findings) the UI shows to the ADMIN with a hint to tell the manager.
- Extend `api/storyline.test.ts` with chapter 11 (ADMIN) and chapter 12 (manager override): Sam sees stats and deactivates a user; Helena overrides a step with a reason and the client's next action changes; Sam cannot call a mutating engagement api (expect `forbidden`).

### Step 18 — Administration UI
- `nav.ts`: an **Administration portal** nav for ADMIN only: Dashboard `/admin`, Users and organisations `/admin/users`, Audit log `/admin/audit`, COI register `/admin/coi`, Settings `/admin/settings`. ADMIN lands on `/admin`. ADMIN also sees the existing read-only pages (All services, Clients, Templates, Finance read-only) but no action buttons anywhere (reuse `useServicePermissions`).
- `/admin` Dashboard: KPI tiles and Recharts charts for the FR-6.13 KPIs with year/client/type filters; money tiles only here.
- `/admin/users`: table of every user across orgs (name, email, org, role, status, MFA, last sign-in, open work), filters, row actions as show-don't-do or functional: rename/edit, change role (functional), deactivate (functional, typed confirm, shows reassignment summary), reactivate, reset password / reset MFA / force sign-out (show-don't-do with Simulate → audit event), anonymise (show-don't-do). Organisations tab: create/rename/suspend (functional) and the read-only Portfolio manager column with `ComingBadge` for `portfolios`.
- `/admin/audit`: global log with filters and CSV export; `/admin/coi`: register across engagements; `/admin/settings`: feature flag defaults (functional), announcement banner (functional: shows in the app shell for everyone), notification templates / maintenance mode / branding (show-don't-do).
- Manager overrides in the existing step detail: an "Override status" menu (complete / reopen / skip) requiring a reason, visible only to managers; "Reassign" on the team panel; editable planned dates. Verified-figure editing for the manager on inventory lines, emission factors and decarb records (dialogs exist for verifier roles; make sure the manager sees them).
- Update `demo-panel.tsx` chapters: add 11 "Administration" (Sam) and 12 "Manager override" (Helena).

### Step 19 — Tests, screenshots, docs
- Playwright: `e2e/admin.spec.ts` (Sam: dashboard, deactivate Pieter de Jong with reason, see him in the audit log; Sam opens an engagement and sees no action buttons) and `e2e/override.spec.ts` (Helena overrides "Desk review" to complete with a reason; Ingrid's home no longer shows the re-upload action; Service Log shows the override with the reason). Add both chapters to `e2e/storyline.spec.ts` and the `/admin/*` pages to `e2e/a11y.spec.ts`. All 69+ unit tests and all Playwright tests must pass; axe must stay clean.
- `scripts/screenshot.mjs`: add `28-admin-dashboard`, `29-admin-users`, `30-admin-audit`, `31-manager-override`; regenerate and embed two of them in README.
- `demo/DEMO_SCRIPT.md`: chapters 11 and 12. `README.md`: mention the ADMIN persona and manager overrides. `planning/phase2-handover.md`: add the admin api and the override endpoints to the carry-over table.

### Step 20 — Release
- Tick everything in `plan_v1.md`, progress log rows with commit hashes, relevant files updated. Tag `v0.2-demo`, push with tags, confirm CI (including the Playwright job) is green and https://rbndchsn.github.io/digital-platform/ serves the new build (sign-in grid shows Sam Okafor).

## Operating rules (unchanged from CLAUDE.md, repeated because they matter)
- Run all npm/npx commands from the **PowerShell** tool (`cd demo`); the Git Bash tool cannot spawn `node` from npm scripts on this machine. Git commands work from either; commit with a message file (`git commit -F`) to avoid quoting issues, and end commit messages with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- After every step: `npx tsc -b --noEmit`, `npx eslint .`, `npx vitest run`, `npx vite build`, then `npx playwright test` when UI changed; tick the step; add the progress-log row; commit; push.
- No backend, no secrets, no localStorage; sessionStorage only. Fictional data only; `assets/sourceimages/` stays git-ignored.
- Pages import `@/api/*` only, never `@/mock/*`.
- Playwright selectors: text matching is case-insensitive substring; use `exact: true` or `.first()` when the next-action pill repeats a button label; `enterAs` in `e2e/helpers.ts` signs out first.
- Do not ask me questions. Make the decisions, write them in `plan_v1.md`, and finish all six steps. Report at the end with the live URL, the tag, test counts, and anything you decided or left out.
