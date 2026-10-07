# Phase II handover — from the demo to the real platform

Date: 2026-10-06 · Demo tag: `v0.3-demo` (v0.1-demo plus the ADMIN console and manager overrides of PRD v0.2, plus the accreditation-grade controls of PRD v0.3) · Target: the PRD (`0001-prd-verifassurx-platform.md`) and the task list (`tasks-0001-prd-verifassurx-platform.md`).

## 1. What carries over unchanged

| Demo location | Phase II location | Notes |
|---|---|---|
| `demo/src/domain/enums.ts`, `schemas/*` | `packages/schema` | zod schemas are the API contract; add `.openapi()` metadata and they become the OpenAPI spec and the MCP tool inputs. |
| `demo/src/domain/units.ts`, `compute/*` | `packages/schema` or `packages/workflow` | GWP tables, unit normalisation, inventory and decarb arithmetic. 100 % of the unit tests move with them. |
| `demo/src/domain/workflow/*` (templates, instantiate, machines, next-action) | `packages/workflow` | Templates become rows in `workflow_templates` (seed from `templates/index.ts`); machines and next-action run unchanged in the Worker. |
| `demo/src/domain/policy.ts` | `packages/workflow/policy.ts` | Same `decide/can/assertCan`; only the construction of `AuthContext` changes (from the Better Auth session + D1 instead of the mock store). `ADMIN_ACTIONS` is the complete allow-list of the platform administrator; `applyStepOverride` in `machines.ts` is the manager override. |
| `demo/src/api/admin.ts` (operation names and view shapes) | `apps/app/src/api/routes/admin.ts` (task 13.0) | `listUsers / updateUser / changeRole / deactivateUser → ReassignmentSummary / reactivateUser / resetPassword / resetMfa / forceSignOut / anonymiseUser / inviteUser`, `listOrgs / createOrg / updateOrg / suspendOrg / unsuspendOrg`, `getSettings / updateSettings / listFlagDefaults / setFlagDefault`, announcements CRUD, `auditLog` + `auditCsv`, `coiRegister`, `stats` (FR-71, money only for ADMIN), `breakGlass`, `dataOperation`. Map 1:1 to PRD §10.2 `/admin/*`. |
| `services.overrideStep / overrideService / replanStep`, `team.reassign` | `apps/app/src/api/routes/overrides.ts` (tasks 5.11, 6.8) | `POST /services/:id/steps/:stepId/override`, `POST /services/:id/override`, `PATCH /services/:id/steps/:stepId/plan`, `POST /services/:id/team/:memberId/reassign`; `requireReason` (10 characters) becomes a zod refinement; audit events `step.overridden`, `service.overridden`, `team.reassigned`, `step.replanned` carry `reason`. |
| `demo/src/domain/workflow/involved-set.ts`, `compute/materiality.ts`, `workflow/competence.ts`, `workflow/rotation.ts` | `packages/workflow` | PRD v0.3 pure modules: the involved set (FR-79, computed from `service_team` and `audit_events`, cached per request, never stored), materiality aggregation and the consistency warning (FR-84–87), competence and rotation checks (FR-96, FR-98). `validateTemplate` in `template.schema.ts` is the server-side check of `PATCH /staff/templates`. |
| `demo/src/api/involved.ts`, `materiality.ts`, `post-issuance.ts`, `cases.ts`, `competence.ts` (operation names and view shapes) | `apps/app/src/api/routes/*` | `involvedSet / eligibility` → `GET /services/:id/involved-set`, `GET /services/:id/eligibility?action=`; `materiality.get / set / approve`, `list / create / confirm / dismiss / markCorrected / aggregate` → materiality and misstatement endpoints; `postIssuance.list / open / decideEvent / recordExternalNotification`; `cases.listMine / create / withdrawCase / addNote / listAll / acknowledge / handlerCandidates / assign / startInvestigation / decideCase / close / setTargets`; `competence.listProfiles / getProfile / updateProfile / upsertQualification / removeQualification / rotationHistory / listLegacy / addLegacy / checkCandidate`; `team.nominate / reassign` take `overrideReason` and return the check; `services.triageCheck`, `overrideService(change_assurance_level)`, `records.reviewLine / setVerifiedTotals / assuranceHistory`, `iterations.listStatements / getPublicStatement`, `staff.updateTemplate`. The typed error codes (`decision_maker_conflict`, `acknowledgement_required`, `competence_block`, `rotation_block`, `override_reason_required`, `step_non_overridable`, `issued_immutable`, `own_profile`) become problem-detail codes. Cron stand-ins `cases.overdueSweepSync` and `competence.expiryRemindersSync` become Cron Triggers. |
| `demo/src/components/*`, `components/ui/*`, `styles/tokens.css` | `packages/ui` | Design system and domain components, incl. `timeline.tsx` (SVG, keyboard, table view), `assurance-badge.tsx`, `eligibility-notice.tsx`, `check-results.tsx`, `appeal-button.tsx`. Keep the contrast-safe tokens (axe clean). |
| `demo/src/routes/**` | `apps/app/src/web/routes` | Route tree and screens. Pages only call `@/api/*`, so they keep working once the api layer talks to the Worker. |
| `demo/src/mock/fixtures/*` | `packages/db/src/seed` and test fixtures | The storyline seed becomes the staging/pilot seed and the e2e fixture. Replace deterministic ids with ULIDs at insert time. |
| `demo/e2e/*` | `apps/app/e2e` | Chapter tests, the full storyline and the axe audit run against the real app; `enterAs` becomes a real sign-in helper. |
| `demo/DEMO_SCRIPT.md` | Sales material | Keep in sync with the product. |

## 2. What is replaced

| Demo | Phase II |
|---|---|
| `demo/src/mock/store.ts` (in-memory + sessionStorage) | D1 via Drizzle with the repository layer scoped by `org_id`. |
| `demo/src/api/*` implementations | Thin `fetch` clients generated from OpenAPI (`openapi-fetch`), same function names. Validation, policy, machines, audit and notifications move server-side into the Hono routes. |
| `demo/src/api/auth.ts` persona picker | Better Auth: invitation sign-up, password + magic link, TOTP, passkeys, org switching; Cloudflare Access on `/staff/*`. |
| `documents.simulateUpload` | Presigned PUT to R2, client-side SHA-256, `complete` call, queue job for hashing/sniffing. |
| `iterations.issue` (synchronous with progress callback) | Cloudflare Workflow `issueOpinion` with the same eight steps; the UI polls the workflow status to drive the same animation. |
| `audit`/`notify` helpers in `api/core.ts` | `audit_events` append-only table and Queue-driven e-mail (Resend) + in-app notifications. |
| `scripts/probe.mjs`, `screenshot.mjs` | Keep as dev tools against `wrangler dev`. |
| Preview pages' interest capture | Same `feature_interest` table; the Clients page already matches PRD FR-59. |

## 3. Decisions taken in the demo that Phase II should keep

- Templates built as data in TypeScript with zod validation (not hand-written JSON); the eight service types share Contracting/Planning and differ in Execution slots.
- The next action is computed, never stored; one per service; `isActionForViewer` decides the orange/blue pill.
- Auto-completion of satisfied steps (all required slots accepted + approvals approved) and auto-start of the next sequential step keep the workflow moving without manual closes; `team_nomination` and `final_opinion` are never auto-completed.
- Separation of duties enforced in policy (IR exclusivity; the team leader cannot approve or issue their own opinion) and surfaced in the UI with disabled buttons and explanations.
- Records: declared and verified values side by side; write-back and supersession on issuance; biogenic CO2 and removals never netted; units explicit with `UnitError` on mismatch.
- "Show, don't do" dialogs name exactly what the real platform does; reuse the copy for the real dialogs.
- The platform administrator is an org-level role (`platform_admin` on the verifier org, `memberships.role`), resolved first in the policy and denied every engagement or record mutation; engagement screens render no action control for it (`useServicePermissions().readOnly`). Evidence content needs a break-glass grant per service and session (`admin.break_glass`, `admin.break_glass_read`); in Phase II keep the grant in the session record, not in a table.
- Manager overrides are distinct actions (`step.override`, `service.override`, `team.reassign`, `step.plan_dates`) with distinct audit events and a mandatory reason; `team_nomination` and `final_opinion` can never be forced to completed. Users and organisations are deactivated or suspended, never deleted; deactivation returns a reassignment summary and notifies the managers.
- Money rollups exist only in `admin.stats` for the platform administrator; Finance stays per engagement.
- Sign-ins write `auth.signed_in` audit events and `users.last_sign_in_at`; the ADMIN "Authentication events" view reads the same table.
- PRD v0.3 (plan_v1 §8 D25–D39): the involved set spans the whole service history (D26) and is derived at request time; a refused decision is audited (`iteration.decision_refused`) and the UI disables the control from `eligibility` with the reasons and the eligible managers; materiality approval is its own manager action in the demo (D25) and maps to the `audit_plan` approval row in Phase II; `non_overridable` is a step attribute copied from the template and a refused override is audited (`step.override_refused`); verified-value edits are one event type (`record.verified_value_edited`, D27) and are immutable after issuance; a revision re-confirms every COI and runs the chain again with a fresh involved set (D32); withdrawn and superseded codes keep resolving publicly with a banner (D28); nomination checks run before the team row is saved and the reassignment reason doubles as the override reason (D31); template edits create a new active version (D34).

## 4. Gaps to close in Phase II (not in the demo)

- Real file storage, virus scanning, retention and download links; real PDF rendering of the statement; real QR.
- E-mail delivery and digests; notification preferences persisted per user.
- Spreadsheet import, REST API with API keys, MCP server, webhooks (Release 2 of the PRD).
- Multi-tenant data isolation enforced in the repository layer and covered by cross-org tests (the demo enforces it in `policy.ts` and the api guards).
- Re-authentication for agreement acceptance, issuance and every ADMIN mutation (`requireRecentAuth(15)`); real password / MFA / passkey resets and session revocation; maintenance mode actually blocking mutations; real exports, backups and the retention job; anonymisation gated by the retention date (the demo only records the events).
- Portfolios (R2, flag `portfolios`): `organisations.portfolio_manager_user_id` exists and is shown read-only; scoping of My Work, triage and rollups by portfolio is not built.
- Public complaint form `/complaints` behind Turnstile (R2, flag `public_complaints`): a preview page only; external cases with a status token are not built. The "under review" badge on records is derived from the record and statement state (D36), not from a stored flag; evidence attached to a post-issuance event is a list of version ids without a vault picker.
- i18n (French), mobile layouts beyond read-only.

## 5. First steps

1. Create `verifassurx/` per PRD §8.3 and run task 1.0 of the task list (monorepo, wrangler, CI).
2. Move `demo/src/domain` into `packages/schema` and `packages/workflow`; run the moved tests.
3. Generate the Drizzle schema from PRD §9.3 (the zod schemas are the source of field names) and seed from the demo fixtures.
4. Implement `apps/app/src/api/*` routes resource by resource, starting with auth, services and documents; swap the demo's `api/*` implementations for `fetch` as each resource lands, keeping the pages untouched.
5. Keep `demo/` deployable as the sales tool until a staging tenant of the real platform exists.
