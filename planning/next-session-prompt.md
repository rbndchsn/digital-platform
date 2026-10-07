# Prompt for the next session — Phase I.6 UI: finish PRD v0.3 in the demo (steps 23–25, release v0.3-demo)

Copy everything below the line into a new Claude Code chat opened in `C:\Projects\MyPythonProjects\MyScripts\digital-platform`.

---

We are continuing the VERIFASSUR_X project in `C:\Projects\MyPythonProjects\MyScripts\digital-platform` (public GitHub repo `rbndchsn/digital-platform`, branch `main`, live demo at https://rbndchsn.github.io/digital-platform/). Phase II (the real Cloudflare platform) is NOT started and must not be started. Do not create `verifassurx/`.

## Where we are

PRD v0.3 (`planning/0001-prd-verifassurx-platform.md`, changes C1–C10, FR-79 to FR-98 plus modified FRs) is approved. Plan steps 21 and 22 are done and pushed: the **domain layer, the mock api and the seed data for every v0.3 requirement exist and are tested** (120 unit tests, storyline chapters 13–16 in `demo/src/api/storyline.test.ts`). **The UI is not done.** An audit on 2026-10-06 found:

- Five api modules are never imported by any page: `demo/src/api/materiality.ts`, `post-issuance.ts`, `cases.ts`, `competence.ts`, `involved.ts`.
- The only v0.3 screen wired end to end is the inventory line review status in `demo/src/routes/_app/records/inventories/$inventoryId.tsx`.
- Playwright, screenshots, `demo/DEMO_SCRIPT.md` and the root `README.md` have zero v0.3 content.
- Three things are **broken on the live build because the seed is ahead of the UI**:
  1. `demo/src/routes/verify.$code.tsx` shows a green "Genuine VERIFASSUR opinion" header for the withdrawn PCF 2024 statement and ignores `status`, `supersededByCode`, `withdrawnByName`, `hidden` returned by `iterations.getPublicStatement`.
  2. On `svc_nw_pcf_2025` (seeded materiality warning) the IR and manager decision dialogs in `opinion.tsx` throw, because `ReviewDialog` never passes the `materialityAck` argument that `iterations.irDecide` / `managerDecide` now require.
  3. Nominating or reassigning a candidate who triggers a competence or rotation warning fails with an error toast, because `NominateDialog` / `ReassignDialog` in `demo/src/features/service/step-detail.tsx` have no override-reason field and never pass `overrideReason`.

Your job is plan steps **23, 24 and 25** in `planning/plan_v1.md` §3.2, finishing with tag `v0.3-demo` live.

## Read first, in this order
1. `CLAUDE.md` (repo root).
2. `planning/plan_v1.md` — §0.2 operating rules, §3.2 steps 23–25 (the checklist you must satisfy), §8 decisions D11–D34 (binding; do not reopen).
3. `planning/0001-prd-verifassurx-platform.md` — §3.2 roles, §6.16–§6.22 (or wherever FR-79 to FR-98 live), §7.2 screens, §7.4 components, §11.2 RBAC. The screens section is your spec.
4. `planning/prd-v0.3-report.md` §4 (demo impact list, approved).
5. The api you are wiring: `demo/src/api/iterations.ts` (`IterationView.decision`, `.aggregation`, `materialityAck`, `listStatements`, `getPublicStatement`), `materiality.ts`, `post-issuance.ts`, `cases.ts`, `competence.ts`, `team.ts` (`candidates` returns `qualificationSummary` / `competenceOverall`; `nominate` / `reassign` take `overrideReason`; `checksForTeamSync`), `services.ts` (`timeline` returns `milestones[]` and per-row `transitions[]` with `actorName` / `override`; `triageCheck`; `overrideService` with `change_assurance_level`; `createDraft({levelOfAssurance})`), `records.ts` (`assuranceView`, `efView`, `decarbView`), `staff.ts` (`updateTemplate`), `admin.ts` (`governance` block), `demo.ts` (chapters 13–16).
6. The pages you are changing: `demo/src/routes/_app/engagements/$serviceId/opinion.tsx`, `$serviceId.tsx`, `$serviceId/index.tsx`, `$serviceId/timeline.tsx`, `demo/src/components/gantt.tsx`, `demo/src/features/service/step-detail.tsx`, `demo/src/routes/_app/engagements/new.tsx`, `demo/src/routes/verify.$code.tsx`, `demo/src/routes/_app/organisation.tsx`, `demo/src/routes/_app/staff/triage.tsx`, `demo/src/routes/_app/staff/templates.tsx`, `demo/src/routes/_app/admin/index.tsx`, the three records index pages and the two records detail pages, `demo/src/components/shell/nav.ts`, `demo/src/components/status-chip.tsx`, `demo/src/components/assurance-badge.tsx`.
7. `demo/e2e/helpers.ts`, `demo/e2e/storyline.spec.ts`, `demo/scripts/screenshot.mjs`, `demo/DEMO_SCRIPT.md`.

## Rules that must not be weakened (from the PRD and plan §8)
- ADMIN (Sam Okafor) reads everything and changes nothing on engagements or records. No new action buttons for ADMIN anywhere.
- "Verify only, no registry."
- G5: impartiality approval, technical scope approval, contract acceptance, team nomination, independent review and the final opinion are `non_overridable`. The UI reads `step.non_overridable`; it never hard-codes step keys.
- The platform shows, people decide. Materiality warnings are warnings with a mandatory acknowledgement comment, never blocks. The involved-set refusal (`decision_maker_conflict`) IS a block.
- Pages import `@/api/*` only, never `@/mock/*` or the store. Domain logic stays in `demo/src/domain/`.
- No backend, no secrets, no external calls, no `localStorage` / IndexedDB. `sessionStorage` only. Fictional data only. `assets/sourceimages/` stays git-ignored.
- External actions (e-mail, signing, exports, programme notification) stay show-don't-do dialogs with "Back to demo" and "Simulate".

## Step 23 — UI part A: opinion, materiality, records, public page

Do the three live breakages first (23.0), then the rest. Commit per sub-step if the step runs long; every commit must be green.

**23.0 Fix what the seed already exposes**
- `verify.$code.tsx`: render the `status` of the statement. `issued` keeps the current layout plus a level-of-assurance badge and a materiality line (threshold % and absolute, basis). `superseded` shows an amber banner with the supersession date and a link to the replacement code. `withdrawn` shows a red banner with the withdrawal date and the public reason category label (`WITHDRAWAL_PUBLIC_CATEGORY_LABELS`), and no "Genuine opinion" header. When `hidden` is true the figures and hashes are not shown, but the banner always is (FR-36, D28).
- `opinion.tsx` `ReviewDialog`: when `it.aggregation.warning` is set, show the inconsistency warning banner (aggregate gross and net vs threshold, draft opinion type) and a required "Acknowledgement comment" textarea; pass it as `materialityAck` to `irDecide` / `managerDecide`. The materiality checklist item cannot be ticked without the comment. Without a warning the dialog is unchanged.
- `step-detail.tsx` `NominateDialog` and `ReassignDialog`: show `qualificationSummary` and `competenceOverall` per candidate; after selecting a candidate run `competence.checkCandidate` (dry run) and list the results (red = block, amber = warning, green = pass; coverage line; rotation history line). Warnings reveal a required "Override reason" field; on reassign the mandatory reassignment reason doubles as the override reason (D31). Blocks disable the confirm button and name the rule. Pass `overrideReason` to `team.nominate` / `team.reassign`.

**23.1 Opinion tab (`opinion.tsx`)**
- Aggregation panel per iteration: gross and net uncorrected misstatements, as % of the assertion, against the threshold with a simple gauge; corrected count; qualitative misstatements listed separately; snapshot note when the iteration was submitted for IR.
- Eligibility notice: read `IterationView.decision`. Disable "Manager approval" / "Issue" when `code === 'decision_maker_conflict'` and show why (which action put the user in the involved set) and who is eligible. Remove the v0.2 heuristic `perms.isManager && isTl`.
- Remove the per-iteration level-of-assurance picker; the level is a service attribute (FR-81). Show it as `AssuranceBadge` in the service header and on the statement card.
- Statement card: status chip (Issued / Superseded / Withdrawn), level badge, materiality line, misstatement summary, "superseded by" / "revision of" links. Use `iterations.listStatements` for the history.
- Post-issuance: manager button "Open post-issuance event" (trigger, description, evidence picker as show-don't-do, optional linked case). Events list with status. Decision dialog (revise / withdraw) with the eligibility notice; withdrawal asks for reason and public category; "Record external notification" is a show-don't-do dialog whose Simulate calls `postIssuance.recordExternalNotification`. "Under review" marker on the tab when an event is open.
- Client: "Appeal this decision" button on the issued statement, which creates a case via `cases.create` (kind appeal, linked statement) and links to the Organisation cases tab (built in step 24; link may land on the tab route now).

**23.2 Materiality and misstatements on the service**
- Materiality panel on the Planning phase (audit-plan step) in `step-detail.tsx` or the Phases page: assertion base, threshold %, computed absolute with unit (`compute/materiality.assertionUnit`), basis and note, qualitative considerations, template default hint, change dialog with reason for the team leader, "Approve materiality" for an eligible manager (D25). Status chip draft / approved.
- Misstatement register, reachable from the Phases page (Execution) and the Opinion tab: table with direction, amount, nature, source (line / finding / manual), corrected flag, status; team leader actions confirm, dismiss with reason, mark corrected; "Add misstatement" dialog; "Raise from finding" entry on the finding page.
- Inventory editor: a banner when a line review proposes a misstatement, with a link to the register. The toast alone is not enough.
- EF editor and decarb record editor: keep verified values; show `issued_immutable` as a disabled state with explanation after issuance; show the involved-set consequence as a persistent inline note, not only a toast.

**23.3 Records**
- `AssuranceBadge` next to the status chip on every record card and detail page: three portfolio index pages, `decarb-units/$recordId.tsx` (which currently has no assurance block), `emission-factors.tsx` history. States: verified with level, under review (open post-issuance event or revision), assurance withdrawn, superseded (with dates).
- `AssuranceHistory` drawer on each record detail page.
- Client home: level badge where records or statements are listed.

**23.4 Level of assurance in the request flow**
- `new.tsx` wizard: level of assurance field (limited / reasonable / not applicable per template `assurance.applies`), replacing the v0.2 `scope.materiality_pct`; pass `levelOfAssurance` to `services.createDraft`. Show it on the CPF / overview page.
- Service header: badge; lock indicator once `assurance_level_locked_at` is set.
- Service override menu in `$serviceId.tsx`: add "Change level of assurance" (reason required) calling `overrideService(…, 'change_assurance_level')`, manager only.
- `status-chip.tsx`: add the `in_revision` tone.

Done when: `npx tsc -b --noEmit`, `npx eslint .`, `npx vitest run`, `npx vite build` pass and `npx playwright test` passes with the existing suite (adjust selectors that broke because of the picker removal or new badges; do not weaken assertions).

## Step 24 — UI part B: complaints, competence, rotation, templates, timeline, admin

**24.1 Complaints and appeals**
- Client `organisation.tsx`: new "Complaints and appeals" tab (`?tab=cases`, the demo panel already links there): list of own cases with stage, dates, outcome; "Raise a complaint" dialog (`cases.create` kind complaint, optional linked service); follow / withdraw actions; notes shown are the client-visible ones only.
- Staff register `/staff/cases` (new route, nav entry in `nav.ts` for verifier roles; ADMIN sees it read-only via `case.read_all`): queue with filters (kind, stage, overdue), acknowledgement and decision targets, overdue flag; detail drawer with acknowledge, assign handler (candidates from `cases.handlerCandidates`, which already excludes the involved set; show why others are excluded), start investigation, internal notes, decide with outcome and actions (including "open post-issuance event"), close; "Set targets".
- "Appeal this decision" entry points for the client: declined request (triage outcome), rejected document, closed finding outcome, issued opinion (built in 23.1).
- `public_complaints` preview: make the preview list include non-integration flags or add a `/preview/public_complaints` card so the flag renders as a preview page (FR-93, R2).

**24.2 Competence and rotation**
- `/staff/competence` (new route, nav entry; managers edit others' profiles, every verifier reads own, ADMIN reads): table of staff with qualifications, kinds, sector scopes, technical areas, programmes, languages, validity and expiry with status colour; profile drawer with add / edit / remove qualification (manager only, never on own profile — surface the `own_profile` refusal), evidence upload as show-don't-do; "Expiring within 90 days" filter; a "Run expiry reminders" demo button calling `competence.expiryRemindersSync`.
- Team panel (`step-detail.tsx`): competence summary per team member, team coverage of the service's sector scopes and technical areas, rotation history line per member (`competence.rotationHistory`), stored check results from `team.checksForTeamSync` with override markers and reasons.
- Legacy engagements: a small "Add legacy engagement" dialog for managers on the competence page or the client page (`competence.addLegacy`), listing `competence.listLegacy`.
- `triage.tsx`: call `services.triageCheck` and show the VVB rotation history and result on the triage card; record the result with the triage decision.

**24.3 Template editor (`staff/templates.tsx`)**
- Replace the show-don't-do editor with a functional one for the manager: per-step `non_overridable` lock toggle, materiality defaults, competence requirements (per role, per team), rotation rules, complaint targets, retention years. Save requires a reason and calls `staff.updateTemplate`, which creates a new active version (D34); show the version history. Step detail shows a lock icon and "Cannot be completed or skipped by override" on locked steps, read from `step.non_overridable`. Delete the hard-coded keys in `step-detail.tsx`.
- When an override is refused on a locked step, the api must write a `step.override_refused` audit event so the admin counter stops reading zero; add it in `api/steps.ts` with a unit test.

**24.4 Timeline (`components/gantt.tsx` → rename to `components/timeline.tsx`)**
- Keep SVG. Add: collapsible phase rows; planned outline vs actual fill (exists); one tick per transition with a tooltip listing actor, UTC time and local time on hover; today line (exists); milestones for agreement, issuance, revision and withdrawal from `TimelineView.milestones`; distinct override markers; month axis plus week sub-axis under 120 days; keyboard focus on rows and markers with a visible focus ring; a "Table view" toggle rendering the same data as a table. Lock icon on `nonOverridable` rows.

**24.5 Admin and shell**
- `admin/index.tsx`: tiles and small charts from the `governance` block: override refusals on locked steps, decision refusals (`decision_maker_conflict`), materiality warnings raised and acknowledged, statements revised and withdrawn, open and overdue cases, qualifications expiring, competence and rotation warnings overridden, decisions with no eligible manager.
- Service Log filters for the new event families (materiality, post-issuance, cases, competence, team checks).
- `nav.ts`: Cases and Competence entries; ADMIN read-only variants.
- Service overview shows level of assurance and materiality.
- Demo panel chapters 13–16: verify each deep link lands on a screen that shows the chapter's subject; fix links.

Done when: typecheck, lint, vitest, build pass; `npx playwright test` passes; axe clean on every new page (add them to `e2e/a11y.spec.ts`).

## Step 25 — Tests, screenshots, docs, release v0.3-demo
- `e2e/governance.spec.ts`: chapter 13 (Helena is refused on PCF 2025 with the reason shown, Marc acknowledges the warning and issues), chapter 14 (withdrawn PCF 2024 public page shows the banner; open a revision on the 2025 decarb statement, run COI, IR and decision, old statement reads Superseded), chapter 15 (client raises an appeal, Marc is assigned, Priya is not offered, decision recorded), chapter 16 (nomination warning requires a reason, IR hard block, own-profile refusal). Extend `e2e/storyline.spec.ts` to sixteen chapters.
- `scripts/screenshot.mjs`: add 32–38 (opinion aggregation panel and warning, misstatement register, withdrawn public page, cases register, competence page, nomination check list, new timeline). Regenerate; embed two in README.
- `demo/DEMO_SCRIPT.md`: chapters 13–16, update chapter 12's "Force complete is disabled on Team nomination" to the `non_overridable` wording. Root `README.md`: sixteen chapters, Marc Lefèvre, v0.3 controls. `planning/phase2-handover.md`: add the v0.3 api surface to the carry-over table.
- `plan_v1.md`: tick 23–25, progress-log rows with hashes (also replace the "(this commit)" placeholder in the step 22 row with `9a84f2f`), relevant files §5, any new decisions as D35 onward in §8.
- Tag `v0.3-demo`, push with tags, confirm CI green and the live URL shows Marc Lefèvre in the sign-in grid and the withdrawn banner on the PCF 2024 code.

## Operating rules (repeated because they matter)
- Run all npm/npx commands from the **PowerShell** tool (`cd demo` first); the Git Bash tool cannot spawn `node` from npm scripts on this machine. Git works from either; commit with a message file (`git commit -F`) to avoid quoting issues; end commit messages with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- After every step (or sub-step commit): `npx tsc -b --noEmit`, `npx eslint .`, `npx vitest run`, `npx vite build`, then `npx playwright test` when UI changed. Tick the step, add the progress-log row, commit with a conventional message naming the step, push to `main`.
- Playwright: text matching is case-insensitive substring; use `exact: true` or `.first()` when the next-action pill repeats a button label; `enterAs` in `e2e/helpers.ts` signs out first.
- Do not change the domain or api unless the UI genuinely needs it; when you do, add or extend a unit test and note it in the progress log.
- Do not ask me questions. Decide, write the decision in `plan_v1.md` §8 (D35 onward), and finish all three steps. Report at the end with the live URL, the tag, test counts (unit and Playwright), screenshots added, and anything you decided or left out.
