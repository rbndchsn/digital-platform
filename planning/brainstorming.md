# VERIFASSUR_X Digital Platform — Brainstorming Notes

Date: 2026-10-05
Source material: 16 UI screenshots in `../assets/sourceimages/` (`verifplat.png` … `verifplat16.png`; the timestamped `Screenshot 2026-10-03 *.png` files are duplicates of the same images).

---

## 0. Executive summary

The screenshots come from **two different products** that together describe what VERIFASSUR_X should offer:

| Images | What it is | Who uses it | Core object |
|---|---|---|---|
| 1–11 | A **validation / verification service-delivery platform** for a VVB (Validation & Verification Body). Branded TÜV SÜD, working on Verra VCS and Gold Standard carbon projects. | VVB staff (Manager, Team Leader, Auditor, Independent Reviewer, Project Coordinator) and the Client | A **Service** (one engagement: validation, verification, design change) moving through Contracting → Planning → Execution |
| 12–16 | A **decarbonisation-unit (impact-unit) ledger** for supply-chain interventions (insetting, Scope 3). "1 impact unit = 1 tonne CO2e". | Corporate sustainability teams, suppliers, buyers, verifiers | An **Impact Unit** (one verified tCO2e reduction/removal tied to a good, supply shed, year, intervention) that can be **transferred** and **claimed** |

**Proposal in one sentence:** VERIFASSUR_X = a client portal where a company (1) requests and follows third-party assurance engagements end-to-end with full evidence and audit trail, and (2) keeps its verified GHG inventory, product emission factors and `decarb_units` as a living, assurance-backed ledger that feeds the next engagement.

---

## 1. Image-by-image observations

### Product A — VVB service-workflow platform (TÜV SÜD style)

**verifplat.png — Contracting phase, Pre-engagement**
- Top navigation tabs: **Phases | Documents | Timeline | Projects | Service Log**.
- Left rail: three macro-phases with status chips: **Contracting** (COMPLETED), **Planning** (IN PROGRESS), **Execution** (IN PROGRESS). Execution expands into sub-steps: Monitoring Report (Completed), Remote/Onsite Audit (Completed), Reporting (Completed), Final Opinion (Active), Final Submission (Active).
- Main pane for step "Pre-engagement of Activities" (status In Progress):
  - **Client Pre-engagement Form (CPF)** — file `CPF V2.pdf`, status *Submitted*, link "see the full list of files" (versioning).
  - **Form Approvals**: *Technical Scope* → Approved; *Impartiality Risk* → Approved. These are internal VVB gates (competence and conflict-of-interest checks, ISO 17029 / ISO 14065 requirements).
  - **Supporting Documents**: `PDD V3.pdf` (Project Design Document), `ERCS V3.pdf` (Emission Reduction Calculation Sheet), each with "Last uploaded on <date> by <user>".

**verifplat2.png — Marketing composite: Final Opinion, project page, monitoring report**
- "Final Opinion Issued" screen with **Team Role: Team Leader** shown top-right (role-aware UI).
- Banner: "A new iteration has been created by [Manager]" → opinions are **iterated**; each iteration is a reviewable bundle.
- Sub-tabs: *Independent Review Opinion* | *Final Opinion Review*.
- "Iteration 2" → "VVB Final Service Documents (4)" uploaded by Team Leader, "Approved by Manager", plus a "Manager Checklist" (IR Checklist.pdf).
- Project header: "GreenHorizon Renewable Energy Access Initiative – Isiolo County, Kenya", description, **Service Standard**, **Service Type: Verification**, "Projects assigned to the service: 1 project". Breadcrumb: My Projects > project.
- Monitoring Report panel: "Your Intermediary Verification Report has been submitted by VVB with total reductions of 3200 tons of CO2e, please check Verra website for Credit Issuance details." Button **"Log in to Verra to select new Intermediary Monitoring Report"** → direct registry integration (Verra Project Hub).
- Data card: "Solar Energy Production — Monitoring period 01/03/2025–01/06/2025, Project ID VCS 66177203, total 84,466 kWh. Note: draft values excluding flagged data…" → the platform ingests **monitoring data** and flags anomalies before the report is finalised.

**verifplat3.png — Contracting as seen by a Manager**
- Same step, **Team Role: Manager**. Planning and Execution are *PENDING* (sequential gating).
- CPF row now shows **Submitted by: Henry Morgan**, **Submission Date 29/01/2026 (UTC)**, download icon, and button "Upload Client Pre-engagement Form".
- Form approvals show **Approved by: SC Manager**, date, green tick.
- "Upload Documents" button on Supporting Documents. Required items are labelled **(Required)** in red.

**verifplat4.png — Composite with KPI widgets**
- Donut: **2,468 tCO2 — Estimated Emissions Reduction**.
- Big number: **3,182,300 kWh — Total Energy Generated**.
- Same Final Opinion / Iteration 2 / Monitoring Report content as above. Shows that quantitative outcomes of the verification are surfaced as dashboard KPIs.

**verifplat5.png / verifplat9.png — Home dashboard ("My Progress", "Latest Notifications", "My Work")**
- **My Progress (Q1 2026)**: horizontal bars — Ongoing Services 8, Completed Services 4.
- **Latest Notifications (Today)**: "COI for VCS12435 pending — John Smith assigned the Auditor role to you"; "VCS143511 has been completed — Ryan Jones completed and closed Service"; "VCS424512 changed Status — CPF has been accepted by Nicholas Reiner". Link "View All Notifications".
- **My Work** list — columns: Project ID, Service Name (e.g. "VCS55341 Micro-Scale Voluntary Action", "GS34621 Reforestation Rift Valley", "VCS41233 Carbon-Removal Action"), Team Role (Team Leader / Auditor / Independent Reviewer), an **action pill** (COI pending, Planning phase open, Review pending — orange = blocking me, blue = informational), and the **current Phase | Step** chip (Contracting | Team Nomination; Planning | Audit Plan; Execution | Reporting).
- Takeaway: the home page is a personal to-do queue driven by workflow state and role assignment.

**verifplat6.png — Documents tab + Contracting sub-steps**
- "Execution Status" collapsible, then **All documents (6)** grouped by category:
  - *Service Reporting*: Final Opinion (`Final Opinion.xls`), Team Leader Findings (`Findings Report 3.xls`).
  - *Phase Documents (3)*: Project Design Document (Required) `PDD2.xls`, Baseline Survey Report `BSR.xls`, Monitoring Plan `Mp3.xls`, Environmental Impact Assessment `EIA3.xls`.
  - Row actions: edit (pencil), download (cloud), view (page), delete (red bin).
- Right card shows **Contracting sub-steps**: Pre-engagement Form (Completed), Desk Review (Open), Team Nomination (Completed), Contract Review (Completed), V&V Service Agreement (Completed).

**verifplat7.png — Project card and Contracting forms**
- Project "Clean Cooking Access Program in Uganda": **Verification Standard: Verra Standard**, **Service Type: Design Change**, **Owner: UVD Admin**, description with "Expand description".
- Stacked form cards for Contracting: **CPF**, **Team nomination**, **Contract Review** (Status / Approver), **MSA Form** (Master Service Agreement) with Approver and document icon.

**verifplat8.png — Iteration approved (TÜV SÜD logo)**
- Green banner "Iteration has been approved."
- Iteration 1 → **VVB Final Service Documents (4)**: `Post-Audit Findings.pdf`, `Verification Report.pdf`, `IR Report.pdf` (Independent Review), `IR Checklist.pdf`; button "Download All Documents". Plus **Manager Checklist** (`Manager Checklist.pdf`) with upload + download icons.
- Confirms the deliverable bundle of a verification: findings, verification report/opinion, independent-review report and checklists.

**verifplat10.png — Timeline (Gantt) + step modal + document iterations**
- **Timeline tab**: rows = Contracting › Pre-engagement of activities, Review of the CPF, Team nomination, MSA Approval; Planning › Audit Plan; Execution › Desk Review, Remote/Onsite Audit, Reporting, Final Opinion Issued. Months Sep 24 → May. Bars with check marks at milestones; grey dots for not-started.
- Hover tooltip on "Contracting": **Planned 23/12/2023 12:32, On-Hold 24/12/2023 12:13, In-Progress 25/12/2023 10:45** → every status transition is time-stamped.
- Legend: Not started/Open, In Progress, Complete/Close, Planned, (more).
- **Step modal** "Pre-engagement of Activities": Team Role "Team Leader, Auditor, Financial Expert and 5 more"; Client Pre-engagement Form row (Status, Approver James Morgan, Date 27/02/2025); buttons **Cancel / Close Step**; "Secondary Button" placeholder (design-system artefact).
- Left card: **Iteration 1 / Iteration 1 / Iteration 2** accordions → "Required Documents": Independent Review (`IR Report.pdf`, `IR Checklist.pdf`), Final Review (`Final Report V3 – Signed.ppt`); "Supporting Documents (3)": Project Design Document (`PDD V3.ppt` by Client), Emission Reduction Calculation Sheet (`ERCS V3.ppt` by Client). Note "by Client" → clients upload directly.
- Right card: Execution sub-steps all "Active": Desk Review, Remote/Onsite Audit, Reporting, Final Opinion.

**verifplat11.png — Services portfolio and past services**
- "My Work" (as before) and a **Filter** control.
- Current services table: Type (Verification / Validation Verification), Area (Kenya, Gabon), Team Role, Status (In Progress), Phase chip (Contracting).
- **Past services** table: Project ID, Service Name, Type, Area (Cameroon, Kenya, Gabon), Standard (Verra VCS, Gold Standard), Team Role, **Contract (month.year)**; link "View All Past Services".
- Phase Documents card with Required flags and row actions.

### Product B — Impact-unit / `decarb_units` ledger (supply-chain insetting)

**verifplat12.png — Dashboard: Portfolio and Claims**
- Left icon rail (dashboard, portfolio, claims, inventory, transfers, documents).
- **Portfolio** table: Commodity (Soybean, Milk) → *Impact Units (absolute reduction/removal in tonnes CO2e)* (2,355.49; 515.44) → stacked bar **Reserved / Available / Claimed** with percentages (e.g. 42.36 % / 53.34 % / 4.30 %).
- **Claims** table: Good (Soft Cheese, Soybean oil), Supply Shed ("Milk, holstein, US"; "Soybean, yellow, US"), Amount of Good (tonnes), Impact Units (tCO2e), Status (**Validated**).

**verifplat13.png — Impact Unit details**
- Header: year, good ("Cocoa — Cocoa, Default, Côte d'Ivoire"), ID `A0004-3565-2.b`, Status **Approved**.
- **Impact Unit** block: Impacted good (Cocoa bean), Amount of impacted good, Impact units (100 tCO2e), Impact factor (reduction per good: 61.28), Impact Type (Reduction), Impact layer ((1.a) Raw-material production), Year (2025), Impact ID (89-3560).
- **Value Chain** block: Supply shed ("Domestic Heifer, AU, QLD"), Intervention Type (Default), Intervention Layer ((1.a) Raw-material production), Intervention ID (89), Impacted Operations (expandable).
- Actions: **Transfer** and **Claim**. Callout: "1 impact unit equals 1 tonne of CO2e".
- Second card (Milk, US, 2023): Impact Unit Status, Amount, Impact units, Impact Layer, Impact Type, **Transferable**, Impact factor.

**verifplat14.png — Claim details (A-24123-3)**
- Tabs: **Impact Unit and Claim** | **Inventory Integration** (→ links the claim into the corporate GHG inventory, i.e. Scope 3 accounting).
- Impact Unit details: Impacted good (Wheat), Supply shed (Wheat, organic, US), Year 2025, Impact layer of intervention ((1a) Raw-material production), Amount of impacted good (2000 tons), …, Verification Type.
- **Claim details**: Impact layer of claim ((5b) Market, Retailer processing), Reporting good (Wheat grain), **Mass balance factor 60 %**, **Emission allocation factor 50 %**, Amount of impacted good in reporting good (1200 tons), **Amount of Impact Units on reporting good 724 tCO2e**.
- Logic: units created upstream (layer 1a) are allocated downstream (layer 5b) through mass-balance and allocation factors; the claimable quantity is derived, not typed in.

**verifplat15.png — Edit Impact + co-product split**
- **Edit Impact** form: Supply Shed*, Good*, Impact Layer*, Year*, **Verification Type*** (value "Unverified Intervention" → units carry a verification status; unverified vs verified is a first-class attribute).
- **Make claimable as co-product**: Co-product (Bran), Emission allocation factor "5 out of 50 %", Mass balance factor "10 out of 80 %" → budget-style allocation: the remaining allocatable share is tracked so the sum never exceeds 100 %.

**verifplat16.png — Intervention analytics + approved claim**
- Chart "Intervention activity combination: Tillage reduction, Cover cropping — Emissions delta per operation (tCO2e)": Field emissions −99.86, Planting −10.55, Tillage −1.23, one operation +18.6 (emission increase flagged with ↑). Log-scale axis. Legend: affected operations.
- Claim card (Wheat, organic, US, 2025): Claim Status **Approved by <user> on 24/10/2023 10:28**; Amount of verified good 2000 t; Associated emissions 1000 tCO2e; **Emission factor of reporting good 0.50 tCO2e** (= product emission factor); **Claimed on behalf of: McDonalds**; Reporting Good: Bread; Claim Type: Allocated; EAF 50 %; MBF 60 %.

---

## 2. What the example platforms are doing (synthesis)

### 2.1 Product A — the assurance engagement engine

**Core logic: a state machine per Service.**

```
Service (one engagement)
 ├── Contracting
 │    ├── Pre-engagement Form (CPF)         ← client submits, VVB reviews
 │    ├── Review of the CPF / Desk Review   ← technical scope + impartiality (COI) approvals
 │    ├── Team Nomination                   ← roles assigned; each member confirms COI
 │    ├── Contract Review
 │    └── MSA / V&V Service Agreement       ← signed → phase closes
 ├── Planning
 │    └── Audit Plan                        ← sampling, site visit plan, schedule
 └── Execution
      ├── Desk Review
      ├── Monitoring Report (data ingestion, registry link)
      ├── Remote / Onsite Audit
      ├── Reporting (findings: CARs / CLs / FARs)
      ├── Final Opinion  (iterations: TL draft → Independent Review → Manager approval)
      └── Final Submission (to registry / to client)
```

Each step has: status (Not started/Open → Planned → In Progress → On-Hold → Complete/Closed), required documents, approvals with approver + timestamp, and an owner role. Phases are gated (Planning is *PENDING* until Contracting completes).

**Key design patterns observed**
1. **Role-aware views.** The same step renders differently for Manager vs Team Leader vs Client (upload buttons, approver fields). "Team Role" is always displayed.
2. **Everything is a versioned, attributed document.** "Last uploaded on <date> by <user>", "see the full list of files", Required flags, download-all.
3. **Iterations for opinions.** The final opinion is not a single file; it is iteration N = {final service documents, independent review, checklists} with an approval banner.
4. **Independent review and impartiality as explicit gates.** COI pending blocks work; Technical Scope and Impartiality Risk have named approvers. This is what makes the workflow accreditation-grade (ISO 14065 / 17029).
5. **Immutable audit trail.** "Service Log" tab + time-stamped status transitions in the Gantt tooltip.
6. **Personal work queue.** Home = My Progress counters + notifications + My Work with the single next action per service.
7. **Registry integration.** Direct hand-off to Verra Project Hub for monitoring reports and credit issuance; results pulled back as KPIs (tCO2e, kWh).
8. **Portfolio memory.** Past services table (standard, type, area, contract date) → the client's assurance history in one place.

**Value add for the client company**
- One place to see *what I owe the verifier* (Required uploads, open findings) and *what the verifier owes me* (opinion, report, timeline).
- Predictability: Gantt with planned vs actual, phase gating, no e-mail ping-pong.
- Evidence vault with provenance; reusable from year to year.
- Trust signals: independent review, impartiality approvals, signed opinions, download-all bundles.

### 2.2 Product B — the `decarb_units` ledger

**Core object: an Impact Unit (= 1 tCO2e reduction or removal) with full provenance:**

```
decarb_unit
  id, year, status (Unverified | Verified | Approved | Reserved | Claimed | Retired)
  impact_type       (Reduction | Removal)
  impacted_good     (Cocoa bean, Wheat, Milk …)
  supply_shed       (good, variety/system, country, region)
  intervention      (type, id, layer e.g. 1.a Raw-material production, activity combo)
  amount_good       (tonnes of good impacted)
  impact_factor     (tCO2e reduction per tonne of good)
  quantity          (tCO2e)  = amount_good × impact_factor
  transferable      (bool)
  verification      (verifier, engagement/service id, date)   ← the link to Product A
```

**Operations**
- **Create** from an intervention (field data → emissions delta per operation chart).
- **Transfer** between value-chain actors (supplier → brand).
- **Allocate** to a downstream *reporting good* via mass-balance factor × emission-allocation factor, with co-product splits that cannot exceed 100 %.
- **Claim** on behalf of a company at a chosen value-chain layer (e.g. 5b Market/Retail), producing a claim record with status (Validated/Approved, by whom, when).
- **Inventory Integration**: push the claim into the corporate GHG inventory (Scope 3 category) → the product emission factor of the reporting good (e.g. 0.50 tCO2e/t bread) becomes a verified, traceable number.
- **Portfolio view**: per commodity, totals and Reserved / Available / Claimed split.

**Value add**
- Turns verification outputs into **re-usable, auditable assets** instead of a PDF.
- Prevents double counting through status, allocation budgets and claim layers.
- Gives sustainability teams verified product emission factors and year-on-year inventory tracking tied to the evidence that produced them.

---

## 3. What VERIFASSUR_X should offer (proposal)

### 3.1 Positioning

> **VERIFASSUR_X — the assurance workspace for the carbon economy.**
> Request, run and archive validation/verification engagements, and keep your verified GHG inventory, product emission factors and `decarb_units` in one assurance-backed ledger.

Two tightly linked halves:
- **Engage** (from Product A): the engagement workflow, evidence vault, Gantt, findings, opinions, audit trail.
- **Ledger** (from Product B): organisation inventory (yearly GHG inventory per scope/category), product emission factors, `decarb_units` with transfer/allocate/claim, and registry links.

The link: every number in the Ledger carries an `assurance_ref` pointing at the engagement, opinion iteration and evidence that verified it. Every engagement, when closed, writes its verified results back into the Ledger.

### 3.2 Personas and portals

| Persona | Portal | Needs |
|---|---|---|
| **Client admin / sustainability lead** | Client portal | request work, see past/ongoing engagements, upload evidence, track findings, download opinions, maintain inventory & `decarb_units` |
| **Client contributor** (site manager, data owner) | Client portal (restricted) | upload evidence for assigned requests, answer findings |
| **Client viewer** (CFO, board, investor) | Client portal (read-only) | dashboards, downloads of signed opinions |
| **VERIFASSUR Manager** | Verifier portal | triage requests, quote/contract, nominate team, approve COI, approve opinion iterations |
| **Team Leader** | Verifier portal | plan audit, run execution steps, raise findings, draft opinion |
| **Auditor / Technical expert** | Verifier portal | assigned steps, evidence review, findings |
| **Independent Reviewer** | Verifier portal | review opinion iteration, checklist, sign-off |
| **Registry / standard body** (Verra, GS, ISO 14064-1 programme, CORSIA…) | API / export | receive verified reports and statements |

### 3.3 Client-side journey (the user's three asks)

1. **Request work** — "New request" wizard: service type (Validation / Verification / Design change / GHG inventory ISO 14064-3 verification / Product carbon footprint ISO 14067 / `decarb_units` certification), standard, scope (organisation, sites, period), boundary, materiality, deadlines, attach existing documents (PDD, ERCS, inventory workbook). Generates a **Pre-engagement Form (CPF)** automatically from the Ledger (reuse last year's data), submits to VERIFASSUR for feasibility + COI + quote → e-signature of the service agreement closes Contracting.
2. **Ongoing work** — per engagement: phase stepper, required-uploads checklist, open findings (CAR / CL / FAR) with reply threads, Gantt (planned vs actual), notifications, team contacts, current step owner. Home shows "what is blocking me" first.
3. **Past paid work** — archive table (standard, type, period, scope, contract date, invoice/paid status, opinion type), download-all bundles, signed opinion PDFs with verification hash/QR, link to the Ledger values that each engagement verified.

### 3.4 Module map

```
VERIFASSUR_X
├── 1. Identity & Organisations      SSO, multi-tenant orgs, roles, invitations, COI declarations
├── 2. Engagements (Service engine)  phases/steps state machine, gating, iterations, approvals
├── 3. Evidence Vault                versioned files, provenance, Required flags, retention, hash
├── 4. Findings & Communications     CAR/CL/FAR lifecycle, threaded responses, due dates
├── 5. Planning & Timeline           Gantt, planned vs actual, on-hold reasons, site-visit plan
├── 6. Opinions & Reports            opinion iterations, independent review, checklists, e-sign
├── 7. Ledger: GHG Inventory         org → years → scopes/categories → activity data → factors
├── 8. Ledger: Product Emission Factors   per product/good, boundary, year, assurance_ref
├── 9. Ledger: decarb_units          create / transfer / allocate / claim / retire, portfolio
├── 10. Dashboards & KPIs            tCO2e verified, reductions, energy, coverage, progress
├── 11. Integrations & Ingestion     REST API + MCP server (client SaaS → platform), spreadsheet import, Verra/Gold Standard registries, e-signature, accounting/invoicing
├── 12. Service Log / Audit trail    immutable event log for everything above
└── 13. Admin & Billing              quotes, invoices, paid status, SLAs, templates per standard
```

### 3.5 Workflow template (default), configurable per standard

```
CONTRACTING
  Request intake → CPF generation → Feasibility & technical scope approval
  → Impartiality / COI approval (per team member) → Team nomination
  → Quote → Contract / MSA review → Service agreement signed
PLANNING
  Audit plan (risk & materiality, sampling, sites, schedule) → Client acceptance of plan
EXECUTION
  Desk review of evidence → Data request list / Required uploads
  → Remote / on-site audit (interview log, site evidence)
  → Findings (CAR / CL / FAR) ↔ client responses → closure
  → Reporting (verification report, calculation checks)
  → Opinion iteration N: Team Leader draft → Independent Review → Manager approval
  → Final submission: signed opinion → client + registry → Ledger write-back
CLOSE-OUT
  Invoice / paid → archive → next-cycle reminder (surveillance, annual re-verification)
```

Templates should exist for: Verra VCS validation/verification, Gold Standard, ISO 14064-1 organisational inventory (verification to ISO 14064-3), ISO 14067 product footprint, supply-chain intervention (`decarb_units`) certification, CORSIA, and "custom".

### 3.6 Data model (first cut)

```
Organisation(id, name, type: client|verifier, settings)
User(id, org_id, roles[], coi_declarations[])
Project(id, client_org_id, name, description, standard, registry_id, country, owner)
Service(id, project_id, type, standard, status, phase, contract_date, paid_status, team[])
Phase(id, service_id, name, order, status, planned_start/end, actual_start/end)
Step(id, phase_id, name, status, owner_role, required_docs[], approvals[], iteration_no)
StatusEvent(id, entity, entity_id, from, to, by, at, reason)        # feeds Service Log + Gantt
Document(id, service_id, step_id?, category, name, version, uploaded_by, at, hash, required)
Approval(id, step_id, kind: technical_scope|impartiality|plan|opinion, by, at, decision)
Finding(id, service_id, type: CAR|CL|FAR, severity, text, raised_by, due, status, thread[])
OpinionIteration(id, service_id, no, documents[], ir_reviewer, ir_decision, manager_decision)
Inventory(id, org_id, year, boundary, gwp_set, consolidation_approach, declared_totals, verified_totals?, assurance_ref?)
InventoryLine(id, inventory_id, scope: 1|2|3, category, activity, quantity, unit, ef_id?,
              gases[{gas, tonnes_gas, gwp, tco2e}], biogenic_co2_t, removals_tco2e,
              declared_tco2e, verified_tco2e?, evidence[], source: manual|import|api|mcp, submitted_by, version)
Submission(id, org_id, entity, entity_id, source, api_client_id?, payload_hash, at)   # provenance of machine-entered data
ApiClient(id, org_id, name, scopes[], key_hash, created_at, last_used)                # per-client-org API / MCP credentials
EmissionFactor(id, org_id?, good/product, boundary, year, value, unit, source, assurance_ref?)
DecarbUnit(id, org_id, year, impact_type, good, supply_shed, intervention_id, amount_good,
           impact_factor, quantity_tco2e, status, transferable, assurance_ref)
Transfer(id, unit_id, from_org, to_org, qty, at, status)
Allocation(id, unit_id, reporting_good, layer, mass_balance_factor, allocation_factor, qty)
Claim(id, allocation_id, claimed_by_org, on_behalf_of, layer, status, approved_by, at, inventory_line_id?)
Notification(id, user_id, kind, entity, text, read)
```

### 3.7 Architecture sketch

- **Frontend**: single SPA with two portals (client / verifier) sharing a component library. Patterns to copy from the examples: left phase rail with status chips, top tabs (Phases | Documents | Timeline | Projects | Service Log), role badge on every screen, action pills (blocking vs informational), document rows with provenance, iteration accordions, Gantt with hover timestamps, KPI tiles (donut tCO2e, big-number energy).
- **Backend**: API service (FastAPI fits the workspace) with a **workflow engine** (template-driven phases/steps, gating rules, approvals) and an **event store** (every state change is an event → Service Log, Gantt actuals, notifications).
- **Storage**: relational DB (Postgres; SQLite for prototype) + object storage for evidence (versioned, hashed, virus-scanned, retention policy).
- **Ledger integrity**: append-only tables for `decarb_units` status changes, transfers and claims; double-counting guards (allocation sums ≤ 100 %, unit status transitions, one claim per unit-layer).
- **Integrations**: registry connectors (Verra Project Hub, Gold Standard), e-signature, e-mail/notifications, optional data ingestion (meters, ERP exports) with anomaly flags like the "excluding flagged data" note.
- **Security/compliance**: tenant isolation, RBAC with COI enforcement (a user with an unresolved COI cannot open the service), full audit trail, document hash on signed opinions for third-party verification.

### 3.8 Differentiators to aim for (beyond the examples)

1. **Client-first**, not auditor-first: the examples are built around the VVB's "My Work". VERIFASSUR_X should lead with the client's "what do I need to do / what did I get / what did it cost".
2. **Ledger write-back**: verified totals, emission factors and `decarb_units` become structured data, not just a PDF.
3. **Year-over-year continuity**: next year's request is pre-filled from last year's scope, evidence list and findings; recurring surveillance reminders.
4. **Evidence intelligence** (later): auto-classify uploads against the required-document list, flag missing items, extract key figures from ERCS/inventory workbooks for the auditor's desk review.
5. **Transparency artefacts**: public verification statement page with QR/hash so stakeholders can check an opinion is genuine.
6. **Pricing & paid status** visible to the client (quote → invoice → paid) inside the engagement.

### 3.9 Suggested MVP cut

| Phase | Scope |
|---|---|
| **MVP 1 (client portal + engagement engine)** | Orgs/users/roles; Project & Service; fixed 3-phase template with the steps above; Required uploads + evidence vault with versions; findings with replies; opinion iteration with independent review and manager approval; Service Log; home dashboard (progress, notifications, My Work); past services table with paid status. |
| **MVP 2 (timeline + ledger basics)** | Gantt (planned vs actual from events); client self-entry of GHG Inventory by year / scope / category / gas with evidence per line and declared vs verified totals; product emission factors; spreadsheet template import; KPI tiles. |
| **MVP 3 (decarb_units)** | Client entry of baseline and project emission profiles (per gas, removals and biogenic separate), attributed volume, computed reduction/removal units; verified record and portfolio by year, good and status; year-over-year comparison. |
| **MVP 4 (API + MCP ingestion)** | Public REST API over the same schemas (requests, inventory, decarb_unit records, evidence, findings, opinions); API keys per client org; **MCP server** so a client's carbon-accounting SaaS or agent can submit data and respond to findings; submission provenance in the audit trail. |
| **MVP 5 (ecosystem)** | Registry connectors (Verra, Gold Standard), e-signature, anomaly flagging on ingested data, public verification statement page with hash/QR. |

### 3.10 Decision log

- **2026-10-05 — Verify only, no registry.** VERIFASSUR_X does not issue, serialise, transfer, retire or claim `decarb_units`. The Ledger modules (7, 8, 9) become a **verified data record**: each row is a statement of what was verified (quantity, good, supply shed, year, intervention, product emission factor, inventory totals) with an `assurance_ref` to the opinion iteration and evidence. Consequences:
  - Drop `Transfer`, `Allocation` and `Claim` as transactional entities. Keep them only as *descriptive attributes* of what was verified (e.g. the allocation factors the client used), when the service scope covers a claim.
  - No custody chain, no serial numbers, no cross-tenant double-counting engine. Double-counting checks are an auditor activity recorded as findings, not a system guarantee.
  - External registry IDs (Verra, Gold Standard, buyer platforms) are reference fields on the Project / Service, with optional later connectors.
  - MVP 3 shrinks to: "verified `decarb_units` record" table and portfolio view by year, good and status (Verified / Superseded), plus year-over-year comparison.
- **2026-10-05 — Client enters structured data; evidence is uploaded; API/MCP ingestion is the roadmap.** The client (not the auditor) enters the GHG inventory **per scope, per category and per gas**, the product emission factors and the `decarb_unit` baseline/project profiles directly in the platform, and attaches evidence files to each figure. The platform is not a calculation engine: it logs declared values, checks arithmetic and unit consistency, and tracks which figures are evidenced. Consequences:
  - The data model is the public contract from day one: every form the client fills has a JSON schema, and the same schema is what the API accepts later.
  - **Ingestion channels, in order:** (1) web forms, (2) spreadsheet template import (CSV/XLSX mapped to the schema), (3) REST API with API keys per client org, (4) **MCP server** exposing tools such as `create_verification_request`, `submit_inventory`, `submit_decarb_unit_record`, `upload_evidence`, `get_findings`, `respond_to_finding`, `get_opinion`, so a client's carbon-accounting SaaS or an AI agent inside it can push data and react to findings without a human re-keying anything.
  - Every submitted value carries `source: manual | import | api | mcp`, `submitted_by` (user or API client), timestamp and version → this is part of the audit trail and lets the auditor see what was machine-generated.
  - Auditor-side entry is reserved for *verified* values (the opinion figures), which may differ from the client's declared values; both are kept.

### 3.11 `decarb_unit` definition (agreed 2026-10-05)

A `decarb_unit` is the **delta between a baseline and a project outcome inside a value chain** (insetting), i.e. the same construction as a carbon credit but without a registry and claimed within the buyer's Scope 3 rather than sold.

Worked example (milk): baseline intensity 3.4 kgCO2e/kg milk → after the insetting project the farm produces at 3.0 kgCO2e/kg → decarb factor = 0.4 kgCO2e/kg. On 10,000 t of milk that is 4,000 tCO2e = 4,000 `decarb_units`.

Two levels are always stored together:

| Level | Formula | Role |
|---|---|---|
| **Decarb factor** (intensity delta) | `EF_baseline − EF_project` (per unit of good) | feeds the verified product emission factor; comparable per good; basis for downstream allocation |
| **`decarb_units`** (absolute delta) | `decarb_factor × volume_project`, or `tCO2e_baseline − tCO2e_project` at facility level | countable, summable; 1 unit = 1 tCO2e reduction or removal; what goes into a buyer's inventory |

Rules (confirmed 2026-10-05):
- **Volume = the client's attributed (purchased) volume**, not the supplier's total output. Example: farm EF goes 3.4 → 3.0 tCO2e/t; the client buys 1,000,000 t → 3.4 × 1M − 3.0 × 1M = **400,000 `decarb_units`**. The farm-level "before vs after" total is stored as context for the auditor; the units are always computed on the attributed volume. Allocation of a supplier's improvement across several buyers is an auditor check (finding), not a system rule (verify-only).
- **The platform does not define the baseline.** The baseline is what the supplier/farm was doing before the intervention; sometimes a counterfactual. The method is a declared attribute (`historical | counterfactual | other`) and an auditor concern. The platform simply **logs the baseline emissions and the project emissions**, each as an emission profile.
- **Emission profile = per-GHG breakdown.** Each of baseline and project is entered gas by gas (CO2, CH4, N2O, HFCs, PFCs, SF6, NF3, other) in tonnes of gas, with the GWP set (AR5 / AR6, 100-yr) used to convert to tCO2e. **Removals** and **biogenic CO2** are separate lines and are never netted into the gross total (GHG Protocol / ISO 14064-1 convention).
- **Two pools of `decarb_units`:** *reduction units* from the gross-emissions delta, *removal units* from the removals delta. Biogenic deltas are reported but excluded from units unless the service scope explicitly includes them. Removals carry permanence/reversal treatment.
- **Units are explicit and converted.** EF unit (kgCO2e/kg, tCO2e/t …) and volume unit (kg, t, L, units …) are stored and normalised before multiplication; 1 `decarb_unit` = 1 tCO2e.
- Reference methodology: **ISO 14064-2** (baseline vs project scenario) verified under **ISO 14064-3**; align with GHG Protocol Land Sector & Removals Guidance and Value Change Initiative insetting guidance.
- Verify-only (see 3.10): VERIFASSUR_X verifies the two profiles, the attributed volume and the declared method, and records the resulting `decarb_units`; it does not issue, transfer or claim them.

Revised records:

```
EmissionProfile(
  period_start, period_end, boundary,
  gwp_set: AR5 | AR6,
  gases: [{gas: CO2|CH4|N2O|HFC|PFC|SF6|NF3|other, tonnes_gas, gwp, tco2e}],
  gross_tco2e          = Σ gases.tco2e            # fossil/anthropogenic, in the total
  biogenic_co2_t       # reported separately, NOT in gross
  removals_tco2e       # reported separately, NOT netted
  reference_volume, volume_unit                   # supplier output used to derive the EF
  ef_gross   = gross_tco2e / reference_volume     # e.g. tCO2e per t of good
  ef_removal = removals_tco2e / reference_volume
  evidence[]                                      # documents backing the numbers
)

DecarbUnitRecord(
  id, org_id (client), service_id, assurance_ref,
  good, supply_shed, supplier/facility_id, intervention: {type, activities[], layer, start_date},
  baseline_method: historical | counterfactual | other,
  baseline: EmissionProfile,
  project:  EmissionProfile,
  attributed_volume, volume_unit,                 # what the client purchased / is attributed
  decarb_factor_gross    = baseline.ef_gross   − project.ef_gross,
  decarb_factor_removal  = project.ef_removal  − baseline.ef_removal,
  reduction_units_tco2e  = decarb_factor_gross   × attributed_volume,
  removal_units_tco2e    = decarb_factor_removal × attributed_volume,
  biogenic_delta_tco2e   # reported only
  status: Draft | Under verification | Verified | Superseded,
  verified_by, verified_at, opinion_iteration_id
)
```

### 3.12 Design principle: present-realistic, future-exposed (agreed 2026-10-05)

**Principle.** Ship what clients use today, simply and reliably. Show the shape of tomorrow inside the product as visible but inactive capabilities, so that (a) clients see where the platform is going, (b) we measure demand before building, and (c) the architecture never needs a rewrite to turn a capability on.

**How "exposed but non-functional" works in practice**
- Every module and major feature has a flag per client org: `hidden | preview | enabled`. There is no half-working state: a feature is either fully working or in preview.
- **Preview state** = the navigation entry, page and key controls are rendered, greyed, with a "Coming" badge, a two-line explainer of what it will do, and an **"I'm interested"** button that logs a demand signal (org, user, feature, date). Sales and roadmap read that table.
- The full navigation exists from day one (Engage, Evidence, Findings, Timeline, Ledger: Inventory / Product EFs / decarb_units, Integrations, Statements). Inactive entries are in preview.
- **Schema first.** Future fields are present as nullable from the start (registry serial, dMRV source id, verifiable-credential id, ESRS datapoint code, API client id…). Enabling a feature is a flag flip plus UI, never a migration of client data.
- Every module is an internal plugin on the same event bus and the same JSON schemas, so the API/MCP surface and the web forms are always the same contract.
- Preview features are also the sales deck: screenshots of the real product, not mock-ups.

**Horizon map**

| Capability | 2026 (Now) | 2027 (Next) | 2028+ (Later) | Trigger to enable |
|---|---|---|---|---|
| Engagement workflow, evidence vault, findings, opinion iterations, audit trail, Gantt, past services | **Live** | | | — |
| Client self-entry: inventory per scope/category/gas, product EFs, `decarb_unit` profiles, evidence per figure | **Live** | | | — |
| Spreadsheet template import | Preview | Live | | first client with >200 inventory lines |
| REST API with per-org keys | Preview | Live | | first client SaaS wanting to push |
| **MCP server** (submit data, read findings, respond, fetch opinion) | Preview | Live | | first client using an AI agent / agentic SaaS |
| AI evidence assistant (auto-classify uploads, completeness check, figure extraction, draft findings for auditor, human-in-the-loop) | Preview | Live | | auditor capacity pressure; LLM accuracy validated on our own past engagements |
| E-signature and signed opinion with hash/QR public statement page | Preview | Live | | first client asked to prove an opinion to a third party |
| Registry connectors (Verra Project Hub, Gold Standard) | Preview | Live | | first project-developer client |
| CSRD/ESRS E1 and ISO 14064-1 report export from verified data | Preview | Live | | first EU-reporting client |
| Continuous assurance (rolling verification of data streams instead of annual) | | Preview | Live | clients with monthly inventory data via API |
| dMRV connectors (IoT meters, satellite/remote sensing, farm management systems) | | Preview | Live | agri/land-use insetting clients with sensor data |
| Verifiable credentials for opinions (W3C VC / machine-verifiable signed statements) | | Preview | Live | buyers or registries requesting machine-readable assurance |
| Digital product passport export of verified product EFs | | Preview | Live | EU DPP obligations reach clients' products |
| Agent-to-agent verification (client agent ↔ VERIFASSUR auditor agent negotiating data requests and findings over MCP) | | | Preview → Live | MCP adoption in client SaaS; our own auditor agent proven internally |
| Multi-verifier recognition and interoperable registries (import other VVBs' opinions with trust level) | | | Preview | market demand for consolidated assurance history |

**Tech capability watch (what we design around now)**
- LLMs and agents are good enough today for document classification, completeness checks and figure extraction with human review; the platform should capture auditor decisions so that assistance can be trained/evaluated on our own history.
- **MCP** is becoming the standard way tools expose themselves to agents; our API should be designed as tool-shaped operations (verbs with schemas), which makes the MCP server a thin wrapper.
- Regulation is pushing toward structured, machine-readable disclosure (CSRD/ESRS datapoints, digital product passports, CBAM); verified data stored as structured records (not PDFs) is the asset.
- Integrity frameworks (ICVCM Core Carbon Principles, VCMI Claims Code, SBTi Scope 3 and GHG Protocol revisions) keep raising the evidence bar; the per-gas, removals-separate, biogenic-separate model keeps us compliant without rework.
- Signed, hashable records today become verifiable credentials tomorrow; store document hashes and signer identity from day one.

### 3.13 Open questions for the team

- Which standards first? (Verra/GS project V&V vs ISO 14064-1 corporate inventory vs ISO 14067 product — the ledger half matters most for the ISO side.)
- Accreditation constraints: which approvals (impartiality, independent review) must be enforced by the system vs recorded only?
- Evidence granularity: one evidence file per inventory line, or evidence attached at category level with lines referencing it? (Affects how the SaaS API maps its documents.)
- API design: should the client SaaS push into a *draft* request that a human confirms, or straight into a submitted request? Recommendation: push to draft, human submits.
- Which carbon-accounting SaaS tools do the first clients use? (Decides the first import templates and the MCP tool shapes.)
- Multi-verifier: can a client bring in another VVB's opinion into the Ledger (import with lower trust level)?
- Billing: in-platform quotes/invoices or integration with existing accounting?
- Naming: "Service" vs "Engagement" vs "Request" in the client UI.

---

## 4. Vocabulary (from the screenshots, to reuse consistently)

| Term | Meaning |
|---|---|
| VVB | Validation & Verification Body (the assurance provider = VERIFASSUR_X operator) |
| Service / Engagement | One contracted assurance job (validation, verification, design change…) |
| CPF | Client Pre-engagement Form |
| MSA / V&V Service Agreement | Contract documents closing the Contracting phase |
| COI / Impartiality Risk | Conflict-of-interest check per team member and per engagement |
| Technical Scope approval | Competence/scope check that the VVB can take the job |
| PDD / ERCS / BSR / EIA / Monitoring Plan | Standard carbon-project evidence documents |
| Desk Review / Remote–Onsite Audit | Execution steps |
| CAR / CL / FAR | Corrective Action Request / Clarification / Forward Action Request (findings) |
| Independent Review (IR) | Second-person review of the opinion before issuance |
| Opinion iteration | Numbered bundle of final service documents submitted for review/approval |
| Service Log | Immutable audit trail of the engagement |
| Impact Unit → `decarb_unit` | 1 tCO2e of verified reduction or removal = (baseline − project outcome) within a value chain; see 3.11 |
| Decarb factor | Intensity delta per unit of good, e.g. 0.4 kgCO2e/kg milk; the product-EF-level view of a `decarb_unit` |
| Baseline scenario | Explicit reference case (period, method, EF, volume) against which the project outcome is measured (ISO 14064-2) |
| Supply shed | Sourcing region/system for a good (e.g. "Wheat, organic, US") |
| Impact / intervention layer | Value-chain stage (1.a raw-material production … 5.b market/retail) |
| Mass balance factor / Emission allocation factor | Factors that allocate units from impacted good to reporting good / co-products |
| Reporting good | The product on which the claim is made (e.g. Bread) |
| Claim | Assignment of units to a company at a layer, feeding its inventory |
| Reserved / Available / Claimed | Portfolio status split of units |
