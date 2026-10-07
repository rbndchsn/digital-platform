# VERIFASSUR_X — investor demo script

Sixteen chapters, about 35 minutes (chapters 1–10 are the core product, 11–12 the platform administrator and manager overrides, 13–16 the accreditation-grade controls of PRD v0.3: materiality and decision separation, revision and withdrawal, complaints and appeals, competence and rotation). Everything you click does what the real platform would do; nothing leaves the browser. Progress is kept in this tab only: **reload is safe, closing the tab resets**. The floating **Demo** button (or `Ctrl+.`) switches persona, jumps to a chapter, slows the network, makes the next action fail, or resets.

Before you start: open the live URL, press `Ctrl+.`, click **Reset demo**, then close the panel. Use a 1440-px-wide window.

| # | Chapter | Persona | Start at |
|---|---|---|---|
| 1 | Client home | Ingrid Vos (client admin, Northwind) | `/` |
| 2 | Request work | Ingrid | Home → **Request work** |
| 3 | Triage, scope, impartiality, team | Helena Brandt (manager) | `/staff` |
| 4 | Contracting to planning | Amina Wanjiru (client admin, Solstice) | `/engagements/svc_sol_ver_2025` |
| 5 | Evidence vault | Ingrid, then Priya Natarajan (auditor) | `/engagements/svc_nw_inv_2025` |
| 6 | Findings | Pieter de Jong (site manager), then Priya | `/engagements/svc_nw_inv_2025/findings` |
| 7 | Records | Ingrid | `/records/decarb-units/dcu_nw_milk_2025` |
| 8 | Opinion | Marcus Oyelaran, Tomas Lindqvist, Helena | `/engagements/svc_nw_decarb_2025/opinion` |
| 9 | Timeline and Service Log | Ingrid | `/engagements/svc_nw_decarb_2025/timeline` |
| 10 | The future, in preview | Ingrid, then Helena | `/integrations` |
| 11 | Administration | Sam Okafor (platform administrator) | `/admin` |
| 12 | Manager override | Helena, then Ingrid | `/engagements/svc_nw_inv_2025/phases` |
| 13 | Materiality and decision separation | Tomas, Helena, then Marc Lefèvre (manager) | `/engagements/svc_nw_pcf_2025/opinion` |
| 14 | Revision and withdrawal | Ingrid, Helena, Marc, the team | `/engagements/svc_nw_pcf_2024/opinion` |
| 15 | Complaints and appeals | Ingrid, Helena, Marc | `/organisation?tab=cases` |
| 16 | Competence and rotation | Helena | `/engagements/svc_atlas_decarb_2025/phases` |

---

## 1. Client home — "one place, one next action" (2 min)

Sign in as **Ingrid Vos** from the persona grid (the e-mail form is decorative; any 6-digit MFA code works).

Say: *A client company logs in and sees three things: what is running, what is blocking them, and what has been verified.*

- Point at **My progress** (2 ongoing, 1 completed this year) and the **notifications**.
- **Needs your action**: one card, orange pill, due date. *Orange means "it's on you"; blue means "we are working on it".*
- **Waiting on VERIFASSUR**: the insetting engagement is in opinion review.
- **Verified records**: Scope 1/2/3 of the last verified year with the public statement code, and verified decarb_units.

## 2. Request work — "a request becomes a structured engagement" (2 min)

Click **Request work**.

- Step 1 pick **Northwind product footprints**. Step 2 pick **Product carbon footprint verification (ISO 14067)**; note the right panel listing the documents this template will require.
- Step 3 leave the dates, type a scope summary ("Cradle-to-gate PCF of whey protein concentrate 80"). *The draft is autosaved; you can leave and come back from Engagements › Drafts.*
- Step 4 **Add attachment** → **Simulate upload**. *The real dialog opens your file picker and hashes the file in the browser; the demo records the metadata only.*
- Step 5 shows the **generated pre-engagement form**. Tick the confirmation, **Submit request**.

## 3. Verifier triage, scope, impartiality, team (3 min)

`Ctrl+.` → enter as **Helena Brandt**.

- **My work** shows VERIFASSUR's load, a **COI declaration outstanding** alert, and the **triage queue** with the request you just submitted plus the Atlas sourdough request.
- Open **Triage queue** → on the Atlas sourdough card say *we see scope, period, materiality, contact, and the workflow the template will instantiate* → **Accept into Contracting**.
- You land on the step detail. The first step waits for the client's pre-engagement form: click **Request from client** → **Send request**.
- Now the governance part: go to `/engagements/svc_atlas_decarb_2025/phases`. The **Team nomination** step shows Marcus (COI cleared), Priya (COI pending), Tomas (declared, awaiting approval). Click **Approve** on Tomas. *Every member declares conflicts before the service even opens for them; the independent reviewer cannot hold another role.*
- Optional: enter as **Priya Natarajan** and open the same engagement: she sees the **COI declaration** instead of the workspace. Submit it, switch back to Helena, approve it, and the nomination step closes itself.

## 4. Contracting to planning — click-to-accept with a hash (2 min)

Enter as **Amina Wanjiru**, open `/engagements/svc_sol_ver_2025`.

- The banner says **Needs you: Accept the audit plan**. Click it → **Accept plan** → **Approve**. The service moves to **Execution**.
- Open the **Phases** tab → **Contracting › V&V service agreement**: the approval row shows who accepted the agreement, when, from which IP, and the **document hash**. *That is what makes an in-platform acceptance defensible.*
- Overview tab: quote and invoice with paid status; finance keeps invoicing in their own system.

## 5. Evidence vault (2 min)

Enter as **Ingrid Vos**, open `/engagements/svc_nw_inv_2025`.

- Click the orange pill **Re-upload Activity data samples**. The slot is **Rejected** with the auditor's reason.
- **Re-upload corrected version** → **Simulate upload**. The slot turns **Submitted**, version 2, new hash, provenance line.
- Enter as **Priya Natarajan**, open the same step, click **Accept**. *Every version is immutable; nothing is ever overwritten.*
- Show the **Documents** tab (grouped, counts, version history in the ⋯ menu) and **Download all** (manifest with hashes).

## 6. Findings (2 min)

Enter as **Pieter de Jong** → `/engagements/svc_nw_inv_2025/findings`.

- The banner: **1 blocking finding open** — *a corrective action request blocks the opinion until closed.*
- Open **CAR #2** → **Attach evidence** → **Simulate upload** → write a response → **Respond**.
- Enter as **Priya Natarajan**, open the same finding → **Mark under review** → **Close finding**. Back on the list the blocking banner is gone.

## 7. Records — inventory and decarb_units (3 min)

Enter as **Ingrid Vos** → `/records/inventories`.

- Three years, verified totals by scope, change versus previous year, evidence completeness. Open **2025**: Scope tabs, lines per gas with GWP, **biogenic CO2 and removals reported separately**, evidence chips, declared vs verified.
- Go to `/records/decarb-units/dcu_nw_milk_2025`. Say: *A decarb_unit is one tonne CO2e between a baseline and a project outcome in the value chain, computed on the volume Northwind actually bought.*
- Baseline 3.400 tCO2e/t, project 3.000, attributed 1,000,000 t → **400,000 reduction units**. Biogenic delta is reported, not counted.
- **What if…**: change the unit to **L** → **Recompute** → **Unit mismatch** refused. Change to **kg** → 400 units. *Units are explicit; a kg/t slip can never inflate a claim by a thousand.*

## 8. Opinion — review, approval, issuance (4 min)

Enter as **Marcus Oyelaran** → `/engagements/svc_nw_decarb_2025/opinion`.

- Iteration 1 was **returned by the independent reviewer** with a comment. Click **Prepare iteration 2**: the figures are proposed from the attached record; create it, then **Submit for independent review**.
- Enter as **Tomas Lindqvist** → same page → **Independent review**: the Approve button stays disabled until every checklist item is ticked. Tick all, approve.
- Enter as **Helena Brandt** → **Manager approval** (would be disabled if a CAR were open) → tick, approve → **Issue opinion** → **Issue opinion** again in the dialog. Watch the eight steps complete: lock, hash, render, code, write-back, status, notify.
- Click **Open public statement**: a page anyone can check, with figures, document hashes and the code. Back in the app the record under Records › decarb_units is now **Verified** with the statement link.

## 9. Timeline and Service Log (1 min)

Enter as **Ingrid Vos** → `/engagements/svc_nw_decarb_2025/timeline`.

- Planned (outline) versus actual (filled), today line, hover a row for its transitions.
- **Service Log**: everything you just did, with who and when, filterable, exportable. *Append-only; this is what an accreditation body audits.*

## 10. The future, in preview (1 min)

Still as Ingrid → **Integrations**.

- API keys, MCP server, webhooks and import are visible, greyed, with **I'm interested**. Click it on **MCP server**, add a note, register.
- Enter as **Helena Brandt** → **Clients**: the interest signal is there, and managers can switch any feature from preview to enabled per client. Point at the **Portfolio manager** column under its "Coming" badge. *The product tells its roadmap and measures demand before we build.*

## 11. Administration — "sees everything, changes nothing" (3 min)

`Ctrl+.` → enter as **Sam Okafor** (Platform administrator). He lands on the **Administration dashboard**.

Say: *Platform administration is separated from assurance decisions. Sam sees the whole firm, including the money, and cannot touch a single engagement.*

- Top row: engagements started, issued, closed, ongoing. Second row: overdue steps, open blocking findings, COI declarations pending, manager overrides. **Revenue** tiles (quoted, invoiced, paid, outstanding) carry the badge *Platform administrator only*; finance keeps invoicing per engagement. Scroll: per year, per client with concentration, cycle times, by service type and standard, workload per staff member.
- **Users and organisations**: every person across every organisation with role, MFA, last sign-in and open work. On **Pieter de Jong** open the row menu → **Deactivate**: type a reason and the word `deactivate`. *Deactivate, never delete.* The **reassignment summary** lists his team roles and the open CAR to hand to the manager, who was notified. Show **Reset password**, **Reset MFA**, **Force sign-out** (Back to demo / Simulate) and the **Organisations** tab (create, suspend, Portfolio manager under "Coming").
- **Audit log**: the deactivation is there with Sam's name and the reason; switch to **Authentication events**; filter **Overrides** later in chapter 12; **Export CSV**.
- **COI register**: every conflict-of-interest declaration across engagements. *This is what the accreditation body asks for.*
- **Settings**: switch the prepared **Scheduled maintenance** announcement to **Live**: the banner appears at the top for everyone. Feature flag defaults are live; maintenance mode, branding, templates and data operations open realistic dialogs with Simulate.
- Open `/engagements/svc_nw_inv_2025/phases` as Sam: the **read-only banner**; no Close step, no Upload, no Accept, no Actions menu. Document rows say **Content closed**. Click **Break-glass access**, type a reason: content opens for this session and the request is in the audit log, managers notified.

## 12. Manager override — "unblock with a reason, never silently" (2 min)

`Ctrl+.` → enter as **Helena Brandt** → `/engagements/svc_nw_inv_2025/phases`. The current step is **Desk review**, stuck on the client's rejected activity data.

Say: *Rules can be too rigid for an edge case. The manager can override, but only with a reason, only in the log, and never the impartiality or issuance gates.*

- Click **Override status** → **Force complete**. The button stays disabled until the reason has ten characters. Type why ("Evidence reviewed off-platform during the site visit…") and confirm. The step shows **Completed by override** with Helena's name and reason; the next step started.
- **Service Log** → filter **Manager overrides**: the row is highlighted and carries the reason. Optional: **Planned dates** on a step, **Reassign** on the team panel of `/engagements/svc_atlas_decarb_2025/phases` (Priya → Jonas: the competence check warns because Jonas holds no qualification, and the reassignment reason doubles as the override reason; Jonas must then declare conflicts). Note the **Non-overridable** lock on **Team nomination**: *Force complete* and *Skip* are greyed with "Cannot be completed or skipped by override". The lock is a template attribute (`non_overridable`), not a rule in the code: the same lock protects impartiality, the agreement, independent review and issuance, and a refused attempt is itself logged.
- Enter as **Ingrid Vos**: her home no longer asks for the re-upload; the next action moved on.

## 13. Materiality and decision separation — "the platform shows, people decide" (4 min)

`Ctrl+.` → chapter 13 enters as **Tomas Lindqvist** on the Opinion tab of the **Gouda product footprint 2025**.

Say: *Two accreditation controls at once. First, materiality: the threshold is set in Planning and every difference the team finds is aggregated against it. Second, decision separation: whoever did verification work cannot take the final decision.*

- Iteration 1 carries the **aggregation panel**: a 0.5 kgCO2e/kg understatement of the Gouda factor, gross and net, against materiality of 5 % (0.445 kgCO2e/kg). The gauge is red and an **inconsistency warning** says the draft opinion is unqualified while the aggregate exceeds materiality. *This is a warning, never a block.*
- **Independent review**: the materiality checklist item is greyed until the **acknowledgement comment** is written. Write it ("the verified figure corrects the understatement…"), tick everything, approve.
- Enter as **Helena Brandt** on the same page: **Manager decision** is disabled and the notice says why: *she entered the verified value on this factor*, so she is in the **involved set**; the eligible decision-maker is **Marc Lefèvre**. Nothing is hidden; the refusal is logged.
- Enter as **Marc Lefèvre** → **Manager decision**: the same warning and acknowledgement, approve, **Issue opinion**. The statement card shows **Limited assurance**, the materiality line and *inconsistency warning acknowledged by the reviewer and the decision-maker*.
- Optional: the **Misstatement register** link above the iterations (confirm, dismiss with a reason, mark corrected, raise from a finding) and the **Service Log** filter **Decisions and refusals**: Marc's decision is recorded as taken *outside the involved set*; a refusal event (`iteration.decision_refused`) only appears when someone attempts the decision through the api, because the screen disables the control first.

## 14. Revision and withdrawal — "a statement is never deleted" (4 min)

`Ctrl+.` → chapter 14 enters as **Helena Brandt** on the Opinion tab of the **2024 product footprints**.

- The statement card reads **Statement withdrawn**, the public reason category *Error in the statement*, the decision by Marc. Open the **Public page**: the red banner, no figures, no hashes; the code still resolves. Under **Records › Product emission factors** both 2024 factors show **Assurance withdrawn**, declared-only values, and the former verified value in the **Assurance history** drawer.
- `/engagements/svc_nw_decarb_2024/opinion`: the **Statement history** shows the 2024 decarb_units opinion **Superseded** by a revision (88,000 units on 880,000 t) with the replacement code; its public page shows the amber banner with the link.
- A live one: on the decarb_units 2025 opinion issued in chapter 8, **Open post-issuance event** (trigger, description, evidence picker). Enter as **Marc Lefèvre** → **Decide** → **Revise the opinion** with a reason. The service turns **In revision**, the Opinion tab carries **Under review**, and every team member gets the **Re-confirm your conflict-of-interest declaration** card. Marcus, Priya, Tomas and Ana re-confirm, Helena approves them on the Team nomination step, Marcus prepares iteration 3 (labelled *revision of* the code), Tomas reviews, Marc decides and issues: the old statement reads **Superseded**, the record points to the new code, and the history keeps both.

## 15. Complaints and appeals — "handled outside the involved set" (3 min)

`Ctrl+.` → chapter 15 enters as **Ingrid Vos** on **Organisation › Complaints and appeals**.

- Her **appeal** against the rejection of the activity data pack is **Under investigation**, handler **Marc Lefèvre**, with the stage dates and targets. She sees the handler's message, not the internal note. **Raise a complaint** files a new case with its acknowledgement and decision targets from the template.
- Enter as **Helena Brandt** → **Complaints and appeals** (verifier portal): the queue with kind, stage, targets and the overdue pill on the Solstice complaint. Open the appeal → **Assign handler**: **Priya Natarajan**, who rejected the document, is *not offered*; the dialog names the involved set.
- Enter as **Marc Lefèvre** → open the appeal → **Decide**: outcome *upheld*, the summary the client will read, the reason for the audit log, and the action *return the rejected version for a fresh check*. **Close case**. Back as Ingrid, the outcome summary is on her case. *An appeal never suspends the decision appealed against; ADMIN reads the register, including notes, and changes nothing.*

## 16. Competence and rotation — "nominate with evidence" (3 min)

`Ctrl+.` → chapter 16 enters as **Helena Brandt** on the Atlas decarb_units Team nomination step.

- The team panel shows each member's **qualifications** with validity, the **rotation** line (prior engagements for this client), the **stored check** of the nomination with the **soil-carbon coverage warning overridden** and its reason, and the **team coverage** summary.
- **Nominate** → pick **Technical expert** for **Jonas Weber**: the check runs live; Jonas holds no qualification, so the warnings appear in amber with an **Override reason** field and the Nominate button stays disabled until it is written. Pick **Independent reviewer** for Helena: a red **block**, no reason lifts it. Clear it, nominate Jonas with the reason; the Service Log carries `team.check_overridden`.
- **Competence** page: every verifier with qualifications, scopes, areas, programmes, validity; **Priya's technical-expert certificate expires in 45 days** (filter *Expiring within 90 days*). **Run expiry reminders** sends the 90 / 30 / 7-day notifications. Open **Helena's own profile**: *a user never edits their own profile*; try **Add qualification** and the refusal is shown. Open Jonas's profile instead and add his verifier qualification with a simulated certificate upload. **Legacy engagements** at the bottom feed the rotation counts.
- **Triage queue**: the Atlas sourdough request shows the **VVB rotation history** (warn only; accepting with a warning asks the manager to confirm they considered it). **Templates**: the manager edits the locks, materiality defaults, competence requirements, rotation rules and complaint targets with a reason; every save is a new version.

---

## Recovery tips

- **Something looks stuck**: reload the page; progress is kept in the tab.
- **Start over**: `Ctrl+.` → **Reset demo** (type `reset`).
- **Show error handling**: `Ctrl+.` → **Fail next call**, then click any action; the toast explains and nothing is corrupted.
- **Slow room network**: irrelevant, nothing leaves the browser. **Slow network** in the panel only exaggerates the mock latency.
- **Wrong persona**: `Ctrl+.` → pick another; the storyline links switch persona and page in one click.
