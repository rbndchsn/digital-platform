# Tasks — PRD 0001 VERIFASSUR_X Assurance Platform (Release 1)

Source PRD: `0001-prd-verifassurx-platform.md` (Draft v0.2, 2026-10-06). Parent tasks map to the Release 1 milestones in PRD §13 (M1–M6, M6b) plus a foundation task (M0). Work top to bottom; each parent task ends in a deployable increment on the `dev` environment. v0.2 added sub-tasks 3.11–3.14, 5.11, 6.8, 11.8 and parent task 13.0 (Administration console).

Current state: no application code exists yet. The only related code in the workspace is `verra-v5-qa/` (a TypeScript Cloudflare Worker with `wrangler.toml`), whose wrangler and tsconfig conventions can be copied. The new monorepo root is `C:\Projects\MyPythonProjects\MyScripts\digital-platform\verifassurx\`; all paths below are relative to it.

## Relevant Files

### Root and tooling
- `package.json` - pnpm workspace root; scripts `dev`, `build`, `test`, `lint`, `typecheck`, `db:migrate`, `deploy:*`.
- `pnpm-workspace.yaml` - declares `apps/*` and `packages/*`.
- `turbo.json` - task pipeline (build depends on `^build`, test, lint).
- `tsconfig.base.json` - strict TypeScript shared config.
- `.github/workflows/ci.yml` - lint, typecheck, test, build on PR.
- `.github/workflows/deploy.yml` - migrate D1 and `wrangler deploy` to dev → staging → prod.
- `.eslintrc.cjs` - lint rules including the "no raw D1 outside packages/db" rule.

### apps/app (single Worker: API + web + auth + jobs)
- `apps/app/wrangler.toml` - Worker config: assets, D1, R2, KV, Queues, Cron, Workflows, Browser Rendering, Rate Limiting, environments `dev|staging|prod`.
- `apps/app/src/index.ts` - Worker entry: Hono app, static asset fallback, queue and scheduled handlers export.
- `apps/app/src/env.ts` - typed `Env` bindings.
- `apps/app/src/api/app.ts` - Hono API root under `/api/v1`, OpenAPI registry, error handler (RFC 9457), request id.
- `apps/app/src/api/middleware/auth.ts` - session or API-key resolution → `AuthContext`.
- `apps/app/src/api/middleware/org.ts` - active org resolution and membership check.
- `apps/app/src/api/middleware/ratelimit.ts` - Rate Limiting binding wrapper.
- `apps/app/src/api/routes/orgs.ts` - org, members, invitations.
- `apps/app/src/api/routes/projects.ts`
- `apps/app/src/api/routes/services.ts` - services, submit, triage, hold, next-action, timeline, log.
- `apps/app/src/api/routes/steps.ts` - step transitions.
- `apps/app/src/api/routes/approvals.ts` - approvals, agreement acceptance.
- `apps/app/src/api/routes/team.ts` - service team and COI.
- `apps/app/src/api/routes/documents.ts` - upload handshake, versions, download, check, download-all, evidence links.
- `apps/app/src/api/routes/findings.ts`
- `apps/app/src/api/routes/iterations.ts` - opinion iterations, decisions, issue.
- `apps/app/src/api/routes/statement.ts` - `/verify/:code` public page and `GET /services/:id/statement`.
- `apps/app/src/api/routes/inventories.ts`
- `apps/app/src/api/routes/emission-factors.ts`
- `apps/app/src/api/routes/decarb-units.ts`
- `apps/app/src/api/routes/dashboard.ts` - dashboard, notifications, preferences.
- `apps/app/src/api/routes/staff.ts` - triage, my-work, templates, clients, flags, interest.
- `apps/app/src/api/routes/features.ts` - effective flags and interest.
- `apps/app/src/api/routes/invoices.ts`
- `apps/app/src/api/routes/admin.ts` - ADMIN console (PRD §6.13): users, organisations, settings, announcements, global audit and auth events, COI register, break-glass, stats, data operations.
- `apps/app/src/api/routes/overrides.ts` - manager overrides (PRD §6.14): step override, service override, team reassign, planned dates.
- `apps/app/src/auth/better-auth.ts` - Better Auth instance (Drizzle D1 adapter, plugins).
- `apps/app/src/auth/access-jwt.ts` - Cloudflare Access JWT validation for `/staff/*`.
- `apps/app/src/jobs/queue.ts` - queue consumer dispatcher (email, hash, zip, pdf, notify).
- `apps/app/src/jobs/cron.ts` - reminders, digests, retention.
- `apps/app/src/jobs/issue-opinion.workflow.ts` - Cloudflare Workflow for issuance (PRD §8.6).
- `apps/app/src/services/r2.ts` - presigned PUT/GET via `aws4fetch`, immutable keys.
- `apps/app/src/services/email.ts` - Resend client and templates.
- `apps/app/src/services/pdf.ts` - Browser Rendering statement → PDF.
- `apps/app/src/services/notifications.ts` - create in-app notification + enqueue email by preference.
- `apps/app/src/web/main.tsx` - React entry.
- `apps/app/src/web/router.tsx` - TanStack Router route tree (client and staff).
- `apps/app/src/web/api/client.ts` - typed fetch client generated from OpenAPI.
- `apps/app/src/web/layouts/AppShell.tsx` - nav, org switcher, role badge, notifications bell.
- `apps/app/src/web/pages/...` - one folder per screen (see tasks).
- `apps/app/src/web/pages/admin/*` - Administration portal (`/admin/*`): dashboard, users and organisations, audit log, COI register, settings.
- `apps/app/src/web/components/...` - phase rail, status chip, action pill, document row, approval row, iteration accordion, gantt, kpi tiles, evidence chip, declared/verified pair, preview overlay.
- `apps/app/test/*.test.ts` - Vitest with `@cloudflare/vitest-pool-workers` against real bindings.
- `apps/app/e2e/*.spec.ts` - Playwright end-to-end flows.

### packages/schema (zod = API contract = forms = future MCP tools)
- `packages/schema/src/enums.ts` - every enumeration (roles, statuses, gases, categories, service types).
- `packages/schema/src/org.ts`, `project.ts`, `service.ts`, `step.ts`, `approval.ts`, `team.ts`, `document.ts`, `finding.ts`, `iteration.ts`, `statement.ts`, `inventory.ts`, `emission-factor.ts`, `decarb-unit.ts`, `emission-profile.ts`, `dashboard.ts`, `features.ts`, `invoice.ts`.
- `packages/schema/src/units.ts` - unit registry and conversions (kg↔t, per kg↔per t), GWP tables AR5/AR6.
- `packages/schema/src/units.test.ts` - conversion and GWP tests.
- `packages/schema/src/index.ts` - barrel export.

### packages/db (Drizzle)
- `packages/db/src/schema/*.ts` - one file per table group (identity, engagement, evidence, findings, opinions, ledger, platform).
- `packages/db/drizzle.config.ts` - D1 driver config.
- `packages/db/migrations/*.sql` - generated by `drizzle-kit`.
- `packages/db/src/repo/*.ts` - repository functions that take `AuthContext` and scope by `org_id`.
- `packages/db/src/repo/audit.ts` - append-only `audit_events` writer.
- `packages/db/src/seed/*.ts` - dev seed: verifier org, two client orgs, users, templates.
- `packages/db/test/*.test.ts` - repository scoping tests (cross-org read must fail).

### packages/workflow
- `packages/workflow/src/templates/*.json` - service-type templates (vcs_validation, vcs_verification, gs_validation, gs_verification, iso14064_1_inventory_verification, iso14067_product_verification, decarb_units_verification, design_change).
- `packages/workflow/src/template.schema.ts` - zod schema for template JSON.
- `packages/workflow/src/instantiate.ts` - template → phases/steps/slots/approvals rows.
- `packages/workflow/src/machines/service.ts`, `step.ts`, `finding.ts`, `iteration.ts`, `coi.ts`, `document.ts`, `record.ts` - transition functions returning new state + events.
- `packages/workflow/src/next-action.ts` - computes the single next action per service.
- `packages/workflow/src/policy.ts` - `can(ctx, action, resource)` RBAC + COI gate + separation of duties.
- `packages/workflow/src/compute/decarb.ts` - factors and units from two emission profiles.
- `packages/workflow/src/compute/inventory.ts` - per-gas tCO2e and totals.
- `packages/workflow/test/*.test.ts` - machine, policy, next-action and compute tests.

### packages/ui
- `packages/ui/src/tokens.css` - colour, spacing, status tokens; light and dark.
- `packages/ui/src/components/*` - shadcn-based primitives shared by pages.

### Notes
- Tests sit next to code or under `test/` per package; run all with `pnpm test`, one package with `pnpm --filter @vx/workflow test`.
- Use `pnpm wrangler d1 migrations apply vx-db --local` for local D1; `pnpm dev` runs the Worker with local bindings and Vite HMR.
- Every mutating API route must call the audit writer; a Vitest helper asserts an audit row exists after each route test.
- Follow `process-task-list.md`: one sub-task at a time, mark `[x]`, commit per parent task.

## Tasks

- [ ] 1.0 M0 — Monorepo, Cloudflare bindings, CI/CD
  - [ ] 1.1 Initialise pnpm workspace with `apps/app`, `apps/mcp` (placeholder README only), `packages/schema`, `packages/db`, `packages/workflow`, `packages/ui`; add Turborepo, strict `tsconfig.base.json`, ESLint + Prettier.
  - [ ] 1.2 Scaffold `apps/app` with Hono, Vite + React 19, and Workers Static Assets; `pnpm dev` serves the SPA and `/api/v1/health`.
  - [ ] 1.3 Write `wrangler.toml` with environments `dev|staging|prod`: D1 `vx-db`, R2 `vx-evidence` and `vx-exports` (EU location hint), KV `vx-cache`, Queues `vx-jobs` (producer + consumer), Cron triggers, Workflows binding `ISSUE_OPINION`, Browser Rendering, Rate Limiting bindings; custom domains `app.` and `api.` aliases.
  - [ ] 1.4 Create the Cloudflare resources for `dev` (D1, R2, KV, Queue) with `wrangler` and record IDs in `wrangler.toml`; add secrets placeholders (`BETTER_AUTH_SECRET`, `RESEND_API_KEY`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `ACCESS_AUD`).
  - [ ] 1.5 Set up Vitest with `@cloudflare/vitest-pool-workers` in `apps/app` and plain Vitest in packages; Playwright skeleton with one smoke test.
  - [ ] 1.6 GitHub Actions: `ci.yml` (install, lint, typecheck, test, build) and `deploy.yml` (apply D1 migrations then `wrangler deploy` per environment, manual approval for prod).
  - [ ] 1.7 Add ESLint rule forbidding `env.DB` access outside `packages/db`; add `README.md` with local setup steps.

- [ ] 2.0 M1a — Schema package and database
  - [ ] 2.1 Implement `packages/schema/src/enums.ts` with every enum from PRD §3.2, §8.5, §9.3 (roles, service types, statuses, gases, scope categories, slot categories, approval kinds, finding types, opinion types, flag states).
  - [ ] 2.2 Implement `units.ts`: mass units (kg, t), volume/count units, EF units (`kgCO2e/kg`, `tCO2e/t`, …), explicit conversion table, GWP tables AR5 and AR6 (100-yr) for CO2, CH4 (fossil and biogenic), N2O, SF6, NF3, common HFC/PFC entries; `units.test.ts` covering mismatch errors.
  - [ ] 2.3 Write zod schemas for every API resource (create/update/read shapes) in `packages/schema`, including `ServiceRequestCreate`, `InventoryLineWithGases`, `EmissionProfile`, `DecarbUnitRecord`, with `.openapi()` metadata.
  - [ ] 2.4 Implement Drizzle schema files for all tables in PRD §9.3 with common audit columns (`created_at, created_by, updated_at, updated_by, version, deleted_at`) and the indexes in §9.4; include Better Auth tables.
  - [ ] 2.5 Generate and apply the initial migration locally; add `db:migrate:local|dev|staging|prod` scripts.
  - [ ] 2.6 Implement the repository layer: `AuthContext` type, base `scoped(ctx)` helper injecting `org_id`, CRUD repos for orgs, memberships, projects, services, phases, steps, slots, approvals, team, COI, documents, versions, evidence links, findings, iterations, statements, inventories, lines, gases, emission factors, decarb records, profiles, notifications, flags, interest, invoices.
  - [ ] 2.7 Implement `repo/audit.ts` (append-only insert, no update/delete exported) and a `withAudit(ctx, fn)` helper that records before/after JSON.
  - [ ] 2.8 Write seed script: verifier org VERIFASSUR, two client orgs, one user per role, all eight workflow templates loaded from `packages/workflow/src/templates`.
  - [ ] 2.9 Repository tests: cross-org read returns nothing, optimistic concurrency conflict raises 409, audit row written on each mutation.

- [ ] 3.0 M1b — Authentication, organisations, authorisation
  - [ ] 3.1 Configure Better Auth in the Worker with the Drizzle D1 adapter; plugins `organization`, `twoFactor` (TOTP + recovery codes), `passkey`, `magicLink`; cookie `__Host-vx_session`, HttpOnly, Secure, SameSite=Lax; session cache in KV (5 min TTL).
  - [ ] 3.2 Mount `/auth/*` handlers in Hono; implement `middleware/auth.ts` resolving session → `AuthContext {userId, orgId, orgType, roles, serviceRoles}`; implement `middleware/org.ts` honouring `X-Org-Id` against memberships.
  - [ ] 3.3 Implement invitation flow: `POST /orgs/me/invitations` (token hash, 7-day expiry, email via Resend), accept-invite page creating the user and membership, single-use enforcement.
  - [ ] 3.4 Enforce MFA policy: verifier roles and client owner/admin must enrol TOTP or passkey before data access; others can defer 14 days (store `mfa_deferred_until`).
  - [ ] 3.5 Implement re-authentication guard (`requireRecentAuth(maxAgeMinutes)`) used later by agreement acceptance, iteration decisions, issuance and key revocation.
  - [ ] 3.6 Implement `packages/workflow/src/policy.ts` with the RBAC matrix from PRD §11.2, COI gate and separation-of-duties checks; unit tests per role and per denied case.
  - [ ] 3.7 Implement `auth/access-jwt.ts` validating the Cloudflare Access JWT (`CF_Authorization` cookie) on `/staff/*` and `/api/v1/staff/*`; configurable off for local dev.
  - [ ] 3.8 Add Turnstile verification on sign-in and magic-link request; add Rate Limiting on `/auth/*` (10/min per IP) and on `/api/v1/*` (600/min per session).
  - [ ] 3.9 Org routes: `GET/PATCH /orgs/me`, members list, role change, disable member; audit events for every auth and role event.
  - [ ] 3.10 Web: sign-in, magic link, MFA enrol/verify, passkey register, accept invitation, org switcher, account page (profile, MFA, passkeys); Playwright test for invite → sign-in → MFA → dashboard.
  - [ ] 3.11 ADMIN role (PRD §3.2): `platform_admin` as an org-level role on the verifier org; policy allow-list (`org.read`, every `*.read`, `admin.*`, flag management) and explicit denial of every engagement and record mutation; unit tests per denied action (step transition, approval, upload, finding, iteration, record verify, invoice).
  - [ ] 3.12 User lifecycle (FR-63/64/65): `users.last_sign_in_at`, `deactivated_at/by/reason`, `anonymised_at`; deactivate (disable memberships, revoke sessions, remove from active teams, reassignment summary, notify managers), reactivate, reset password, reset MFA and passkeys, force sign-out, anonymise after retention; never delete.
  - [ ] 3.13 Organisation lifecycle (FR-66): create with first admin invitation, rename, legal name and country, suspend (members cannot sign in) and unsuspend; `portfolio_manager_user_id` column (R2, no behaviour yet).
  - [ ] 3.14 Record every authentication event as `audit_events` `auth.*` rows (sign-in, failed sign-in, MFA, password reset, role change, force sign-out) for the ADMIN auth log (FR-68).

- [ ] 4.0 M1c — Web shell, design system, feature flags and previews
  - [ ] 4.1 Create `packages/ui` with Tailwind config, `tokens.css` (teal/green primary, status colours from PRD §7.4, dark mode), shadcn/ui setup, Inter font, lucide icons.
  - [ ] 4.2 Build shared components with stories/tests: `StatusChip`, `ActionPill` (blocking orange / info blue), `PhaseRail`, `DocumentRow`, `ApprovalRow`, `ProvenanceLine`, `DeclaredVerifiedPair`, `EvidenceChip`, `IterationAccordion`, `KpiTile` (donut, big number), `EmptyState`, `PreviewOverlay`, `ConfirmTyped` (destructive confirmation).
  - [ ] 4.3 Implement `AppShell` with the client navigation from PRD §7.1 and the staff navigation when `orgType = verifier`; role badge in header; notifications bell with unread count.
  - [ ] 4.4 Set up TanStack Router route tree for all client and staff screens (placeholder pages), TanStack Query client, and the OpenAPI-generated typed API client (`openapi-typescript` + `openapi-fetch`).
  - [ ] 4.5 Implement feature flags: `feature_flags` seed with every key from PRD §13, `GET /features` resolving defaults + org overrides, `POST /features/:key/interest`; `useFeature(key)` hook returning `hidden|preview|enabled`.
  - [ ] 4.6 Build preview pages for Integrations (API keys, MCP, webhooks, imports), AI assistant, e-signature, reports export, registry links, continuous assurance, dMRV, verifiable credentials, DPP export: real layout, greyed, "Coming" badge, explainer, "I'm interested" with optional note.
  - [ ] 4.7 Staff admin: `GET|PUT /staff/clients/:orgId/flags` and `GET /staff/feature-interest`; Clients page with flag editor and interest counts.
  - [ ] 4.8 Accessibility pass on shared components (keyboard, focus, text alternatives for colour); i18n scaffolding with English strings file.

- [ ] 5.0 M1d/M2a — Projects, request wizard, triage, workflow engine
  - [ ] 5.1 Write `template.schema.ts` and the eight service-type template JSON files with phases, steps, owner roles, planned durations, required/optional slots, approvals, gating flags and checklists (Contracting: CPF, desk review, technical scope, impartiality, team nomination, contract review, service agreement; Planning: audit plan; Execution: desk review, monitoring/data review, remote/onsite audit, reporting, final opinion, final submission).
  - [ ] 5.2 Implement `instantiate.ts` (template → phases, steps, slots, approvals rows with planned dates from durations) with tests; store `template_version` on the service.
  - [ ] 5.3 Implement state machines in `packages/workflow/src/machines` for service, step, COI, document version, record; each transition returns `{state, events[]}` or a typed error; full test matrix of allowed/forbidden transitions and phase gating.
  - [ ] 5.4 Implement `next-action.ts` returning `{party, role, action, entity, due}` for every service state; tests for each state including on-hold and blocked.
  - [ ] 5.5 Projects API and pages: list, create, detail, edit (country, programme, registry ID, owner).
  - [ ] 5.6 Services API: `POST /services` (draft), `PATCH` autosave, `POST /services/:id/submit` (draft → requested, generates CPF data from request), `GET /services/:id` aggregate (phases, steps, slots, team, next action, invoices), `POST /services/:id/renew`.
  - [ ] 5.7 Request wizard UI (5 steps, autosave, attachments via the upload handshake from task 7, review and submit); renewal entry point from a closed service.
  - [ ] 5.8 Staff triage: `GET /staff/triage`, `POST /services/:id/triage` (accept with template → instantiates workflow, status `contracting`; or decline with reason), triage page and "My Work" (`GET /staff/my-work`) with blocking pills and phase | step chips.
  - [ ] 5.9 Service hold/resume/cancel/close endpoints with reasons and audit; `GET /services/:id/next-action`; Service Overview page with phase rail, next-action banner, team contacts, key dates.
  - [ ] 5.10 Step transition endpoint `POST /services/:id/steps/:stepId/transition` with policy check, planned date edits by team leader, and the step detail page skeleton (header, status chip, role badge, slots area, approvals area, Close step).
  - [ ] 5.11 Manager overrides (FR-73, FR-74, FR-76): `stepOverride` machine in `packages/workflow` (complete / reopen / skip from any state, refused for `team_nomination` and `final_opinion` → completed); `POST /services/:id/steps/:stepId/override` and `POST /services/:id/override` with mandatory reason, audit events `step.overridden` / `service.overridden` carrying `reason`, notifications to the step owner party and client contact, next action recomputed; `PATCH /services/:id/steps/:stepId/plan` (`step.replanned`); "Override status" menu with reason dialog and editable planned dates on the step detail, override rows highlighted in the Service Log; tests.

- [ ] 6.0 M2b — Contracting: approvals, team nomination, COI, agreement, invoices
  - [ ] 6.1 Approvals API: list, `POST /services/:id/approvals/:id/decide` (technical scope and impartiality by manager; audit plan acceptance by client; contract review); block team nomination until both scope and impartiality approved.
  - [ ] 6.2 Team API: nominate members with service roles, remove, validation that the independent reviewer holds no other role; COI declare endpoint (clear / potential conflict + details) and manager decide endpoint; COI gate enforced in policy for every service action.
  - [ ] 6.3 Agreement acceptance: `POST /services/:id/agreement/accept` requiring recent auth; stores name, time, IP, document hash in `approvals.evidence_json`; status moves to `planning` when all Contracting steps are complete.
  - [ ] 6.4 Invoices API: finance create/update quote and invoice references with amounts and paid status; client read; "paid" shown on overview and past services.
  - [ ] 6.5 UI: step detail for Contracting steps (CPF form view, upload slots, approval rows with approver/date/tick), team & COI panel (staff), agreement acceptance dialog (client), quote/invoice card.
  - [ ] 6.6 Notifications for: request received, triaged, document requested, COI required, team assignment, approvals decided, agreement accepted, invoice added (uses task 11.1 service; stub until then).
  - [ ] 6.7 Playwright: request → triage → approvals → team + COI → agreement accepted → Planning open.
  - [ ] 6.8 Team reassignment (FR-75): `POST /services/:id/team/:memberId/reassign` `{to_user_id, reason}` keeping the service role, enforcing independent-reviewer exclusivity, creating the COI requirement for the new member, audit `team.reassigned`, notifications to both people; "Reassign" action on the team panel for managers.

- [ ] 7.0 M2c — Evidence vault
  - [ ] 7.1 Implement `services/r2.ts`: presigned PUT (15 min) and GET (5 min) with `aws4fetch`, immutable key scheme `org/{orgId}/doc/{documentId}/v{n}/{ulid}-{filename}`; fallback Worker-proxied upload for files < 100 MB.
  - [ ] 7.2 Upload handshake endpoints: `POST /documents/uploads` (validates slot, type allowlist, size ≤ 500 MB, returns URL) and `POST /documents/uploads/:key/complete` (creates document + version with `source`, enqueues `hash_check`).
  - [ ] 7.3 Queue job `hash_check`: streams the object, computes SHA-256, sniffs content type (magic bytes), compares to declared hash, sets `check_status = checked` or rejects with reason; notifies on mismatch.
  - [ ] 7.4 Version endpoints: new version handshake, list versions, soft delete (logged), download via signed GET; slot `current_document_id` and status updates; locking respected (`locked_at` blocks new versions).
  - [ ] 7.5 Verifier check endpoint `POST /document-versions/:id/check` (accepted / rejected with reason → slot re-opens, client notified).
  - [ ] 7.6 Evidence links API (`POST|DELETE /evidence-links`) with polymorphic entity validation and org scoping.
  - [ ] 7.7 Download-all: `POST /services/:id/download-all` enqueues `zip_bundle` (streams files into a zip in R2 `vx-exports` with `manifest.json` of names and hashes); `GET /jobs/:id` returns status and signed URL; lifecycle rule deletes exports after 7 days.
  - [ ] 7.8 UI: upload component (drag-drop, progress, hash computed client-side with Web Crypto), slot checklist with Required flags, Documents tab grouped by category with version history drawer and row actions, download-all button with job polling.
  - [ ] 7.9 Tests: handshake validation, scoping, hash mismatch rejection, locked document refusal, zip manifest contents.

- [ ] 8.0 M3a — Findings
  - [ ] 8.1 Findings machine and API: create (verifier, with type, severity, step, entity, assignee, due, blocking default by type), list with filters, detail, patch, transition (`responded` auto on client reply, `under_review`, `closed`, `withdrawn`).
  - [ ] 8.2 Responses API with attachments through evidence links; per-service sequential finding numbers.
  - [ ] 8.3 UI: findings table, thread view, raise-finding dialog (staff), respond composer (client), close/reopen (staff); link from a finding to its step or record.
  - [ ] 8.4 Notifications: raised, responded, closed; due-date reminder cron (daily) for open findings.
  - [ ] 8.5 Tests: blocking CAR prevents iteration manager approval (used by 9.4), status transitions by party.

- [ ] 9.0 M3b — Opinion iterations, issuance workflow, statement page
  - [ ] 9.1 Iteration machine and API: create (team leader), attach documents by role (report, findings report, opinion, calc check), submit for IR, IR decision with checklist JSON, manager decision with checklist JSON; `changes_requested` returns to draft and next submission increments `iteration_no`.
  - [ ] 9.2 Separation-of-duties checks in policy: IR user not on team in another role; approving manager not the team leader.
  - [ ] 9.3 Implement `issue-opinion.workflow.ts` (Cloudflare Workflow) per PRD §8.6: preconditions, lock versions, hash refresh fan-out, render statement HTML, Browser Rendering → PDF to R2, create `opinion_statements` with public code, write-back verified figures (task 10.9 hook), supersede older records, set service `issued`, notify; compensation on failure after lock.
  - [ ] 9.4 `POST /iterations/:id/issue` (manager, recent auth, blocked by open blocking findings) starting the workflow; `GET /services/:id/statement`.
  - [ ] 9.5 Statement HTML template: service details, opinion type, level of assurance, verified figures, signatories, document list with SHA-256, public code and QR; public route `GET /verify/:code` with Turnstile on repeated hits and `public_enabled` respected.
  - [ ] 9.6 UI: Opinion tab with iteration accordions (document bundle, IR decision, manager decision, banners), staff actions (create, submit for IR, decide, issue), issued statement card with KPI tiles and download links.
  - [ ] 9.7 Tests: full iteration cycle with changes requested, issuance workflow steps with mocked rendering, public page without login, locked documents refuse new versions.

- [ ] 10.0 M4 — Records: inventories, product emission factors, decarb_unit records, write-back
  - [ ] 10.1 Implement `compute/inventory.ts`: per-gas tCO2e from GWP set, line gross total, biogenic and removals kept separate, inventory totals by scope and category; tests including AR5 vs AR6 and HFC detail entries.
  - [ ] 10.2 Implement `compute/decarb.ts`: EF gross and EF removal per profile from reference volume, factors, reduction and removal units on attributed volume, biogenic delta, explicit unit normalisation with diagnostics (`unit_mismatch`, `negative_reduction`); tests for the milk example (3.4 → 3.0 tCO2e/t × 1,000,000 t = 400,000 units) and kg/t mismatch error.
  - [ ] 10.3 Inventories API: create, read aggregate, patch header, bulk `PUT` lines (draft only), line CRUD, gases nested, submit (freeze declared values, attach to service or create a request of type `iso14064_1_inventory_verification`, revision increments on later edits), compare by years.
  - [ ] 10.4 Verifier endpoints for verified values per line and totals with comments; declared vs verified diff in the read aggregate.
  - [ ] 10.5 Emission factors API: CRUD, submit (attach or create `iso14067_product_verification` request), verified value endpoint, history by product.
  - [ ] 10.6 `decarb_unit` records API: CRUD, `PUT /profiles/:kind` with gases, `GET /compute` (also computed and stored on every save), submit (requires justification if negative; attaches or creates `decarb_units_verification` request), verified units endpoint, portfolio by year and good.
  - [ ] 10.7 UI: Inventory editor (year header, scope tabs, line table with gas sub-rows, computed tCO2e, evidence chips, completeness bar, declared vs verified, submit), YoY comparison chart.
  - [ ] 10.8 UI: `decarb_unit` record editor (baseline / project two-column profiles, attributed volume, computed panel with unit diagnostics, evidence per figure, justification, submit), portfolio page; product emission factor list and editor.
  - [ ] 10.9 Write-back hook used by the issuance workflow: for the service's attached inventory, emission factors and decarb records, copy verified values, set `status = verified`, `assurance_ref = iteration id`, `verified_at`, and mark earlier verified records for the same key as `superseded` with `superseded_by_id`.
  - [ ] 10.10 Tests: submit freezes declared values, revision on edit, write-back and supersession, portfolio aggregates.

- [ ] 11.0 M5 — Notifications, email, timeline, Service Log, dashboards
  - [ ] 11.1 Notifications service: create in-app row, resolve user preference (immediate / digest / off), enqueue `send_email`; Resend templates (invite, magic link, blocking action, digest, opinion issued); `GET /notifications`, mark read, preferences endpoints and page.
  - [ ] 11.2 Cron: daily digest at 07:00 UTC per user timezone bucket, due-date reminders (findings, steps with planned end within 3 days), retention job stub.
  - [ ] 11.3 Timeline endpoint `GET /services/:id/timeline` building bars from planned and actual dates plus status events; Gantt component (Recharts or custom SVG) with planned outline vs actual fill, milestone ticks, legend, hover transitions.
  - [ ] 11.4 Service Log endpoint `GET /services/:id/log` with cursor pagination and type/actor filters; Service Log page with CSV export.
  - [ ] 11.5 Client dashboard endpoint and page: progress counters, "needs your action" (one next action per service ranked by due), latest notifications, records shortcuts; staff "My Work" polish.
  - [ ] 11.6 Past services table (filters, download-all per service) and Documents tab cross-service search (LIKE on title/filename).
  - [ ] 11.7 Product analytics events to Analytics Engine (request submitted, step closed, finding raised/closed, opinion issued, interest clicked); Sentry error tracking.
  - [ ] 11.8 `GET /admin/stats` (FR-71) computed from live data with year / client / service-type filters: engagements started / issued / closed per year, client, type and standard, staff member and role; revenue quoted / invoiced / paid / outstanding per year, client and type (ADMIN only); median cycle times request→contract and contract→issue; overdue steps; open blocking findings; COI pending; workload per staff member; client concentration. Tests against the seed.

- [ ] 12.0 M6 — Hardening, templates admin, pilot readiness
  - [ ] 12.1 Staff Templates admin: list, edit template JSON with schema validation and version bump; new services use the latest active version.
  - [ ] 12.2 Platform admin break-glass access with mandatory reason and audit event; GDPR export and deletion request handling scripts.
  - [ ] 12.3 Backups: nightly `wrangler d1 export` to R2 via scheduled job, R2 daily replication to a second bucket, documented restore runbook and a tested restore on staging.
  - [ ] 12.4 Security review: CSRF origin checks, cookie flags, signed URL lifetimes, rate limits, secret scanning and dependency audit in CI, WAF managed rules; fix findings.
  - [ ] 12.5 Performance: p95 API < 300 ms on the service aggregate with seeded data (3,000 services), KV caching of templates and flags, bundle size budget for the web app.
  - [ ] 12.6 End-to-end Playwright suite covering PRD user stories 1–16; accessibility audit (axe) on all pages.
  - [ ] 12.7 Staging environment with Cloudflare Access on staff routes, seed two pilot client orgs, onboarding guide, support mailbox, and feedback form; run the pilot checklist.
  - [ ] 12.8 Publish OpenAPI spec at `/api/v1/openapi.json` and Swagger UI at `/api/docs` (staff only) so Release 2 API and MCP work starts from the live contract.

- [ ] 13.0 M6b — Administration console (PRD §6.13, §7.1 `/admin/*`)
  - [ ] 13.1 `routes/admin.ts` skeleton behind `platform_admin` + `requireRecentAuth(15)`; Administration portal navigation (Dashboard, Users and organisations, Audit log, COI register, Settings); ADMIN lands on `/admin`; every engagement and record screen hides action controls and shows the "Platform administrator: read-only view" banner when the viewer is ADMIN.
  - [ ] 13.2 Users page: table across organisations (name, e-mail, org, role, status, MFA, last sign-in, open work) with filters; row actions wired to 3.12 (edit, change role, deactivate with typed confirmation and reassignment summary dialog, reactivate, reset password, reset MFA, force sign-out, anonymise); invite dialog.
  - [ ] 13.3 Organisations tab: create, rename, legal name and country, suspend / unsuspend with typed confirmation; per-org counts and flag states; read-only "Portfolio manager" column under the `portfolios` preview badge.
  - [ ] 13.4 Settings page: feature flag defaults (`PUT /admin/flags/defaults`), announcement banner CRUD rendered in the app shell for the chosen audience and window, maintenance mode (banner + mutation block for non-ADMIN during the window), notification templates editor, branding (name, logo upload to R2, primary colour), `platform_settings` row.
  - [ ] 13.5 Audit log page: `GET /admin/audit` with cursor pagination and org / actor / type / entity / date / text filters, auth-events view, CSV export job; COI register page from `GET /admin/coi-register` with filters and export.
  - [ ] 13.6 Break-glass (FR-70): `POST /admin/break-glass` grants session-scoped evidence access for one service, audit `admin.break_glass` with reason, each content read logged as `admin.break_glass_read`, managers notified; document rows for ADMIN show "Request access" until granted.
  - [ ] 13.7 Dashboard page on `GET /admin/stats` (11.8): KPI tiles, charts per year / client / type, cycle-time tiles, workload table, client concentration, money tiles; filters.
  - [ ] 13.8 Data operations (FR-72): `POST /admin/exports` (org export zip with records, document manifest and audit log; platform audit export) as queue jobs, `GET /admin/backups` (last D1 export, last R2 replication), `GET /admin/retention-report`, anonymisation trigger; audit events for each.
  - [ ] 13.9 Tests: policy denials for ADMIN on every engagement mutation; deactivation reassignment summary; stats against the seed; Playwright: ADMIN deactivates a user and finds it in the audit log, ADMIN opens an engagement and sees no action controls, manager overrides a step with a reason and the client's next action changes.
