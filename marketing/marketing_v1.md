# VERIFASSUR_X — the digital platform for sustainability assurance services

**YOUR DIGITAL PLATFORM FOR NOW AND THE FUTURE**

*Marketing brief v1 · October 2026 · companion files: `marketing_v1.html` (send this one), `marketingimages/` (screenshots), `video-marketing/` (video script and production kit)*

> **GHG inventories, product carbon footprints and value-chain decarbonisation, verified in one workspace.** VERIFASSUR_X is where a company requests, follows and archives the independent verification of its GHG inventory, its product carbon footprints, its value-chain decarbonisation (`decarb_units`) and its carbon projects, and keeps every verified number as a record it can prove. One next action; every figure traceable to the evidence and the opinion that verified it.

---

## 1. What it is

VERIFASSUR_X is the digital platform of VERIFASSUR, an independent validation and verification body (VVB) in the carbon market. It is two things in one product:

- **A client portal.** A company that needs an ISO 14064-1 inventory verification, an ISO 14067 product footprint verification, a VCS or Gold Standard validation, or a `decarb_units` verification requests the work, follows it step by step, answers findings, accepts the service agreement, and receives an opinion it can prove to anyone.
- **A verified-data ledger.** Every opinion writes its verified figures back into the client's records: GHG inventories by year, scope and gas; product emission factors; `decarb_units` computed on the volume the client actually bought. Each figure carries the level of assurance and a reference to the statement that verified it. Next year starts from this year.

Behind both sits the verifier workflow that makes the work accreditation-grade by construction: impartiality and technical-scope approvals, team nomination with conflict-of-interest declarations and competence checks, independent review, a final decision taken by someone who did no verification work, and an immutable audit trail.

VERIFASSUR_X verifies. It never issues, transfers, retires or claims carbon units, and it never computes a client's emissions for them. The platform shows; people decide.

## 2. Why it is needed

**For clients, assurance is a black box.** Today an engagement runs on e-mail, shared folders and spreadsheets. The sustainability lead does not know which document is missing, which finding is blocking the opinion, or when the statement will arrive. The output is a PDF whose numbers must be re-typed into next year's report, the CSRD disclosure and the buyer's questionnaire.

**For verifiers, accreditation is a paper exercise.** ISO/IEC 17029, ISO 14065 and ISO 14066 demand impartiality, competence, independent review, separation between those who verify and those who decide, materiality judgement, complaint handling and rotation. Most bodies prove this after the fact with checklists and filing. A rule that lives in a procedure can be skipped; a rule that lives in the workflow cannot.

**For everyone downstream, a claim is only as good as its proof.** Buyers, lenders, programmes and regulators increasingly ask "who verified this, to what level, and can I check?" A verification statement that lives in an inbox cannot answer. A public page with a code, a hash and a current status can, even after the statement is revised or withdrawn.

VERIFASSUR_X replaces the black box with one workspace where every obligation, document, decision and verified number has an owner, a status, a timestamp and a link to its evidence.

## 3. What it does

**Request.** A five-step wizard turns a need into a structured engagement: project, service type and standard, scope and period, level of assurance, attachments, and a generated pre-engagement form the verifier can triage immediately. Renewals are pre-filled from last year.

**Run.** Three phases (Contracting, Planning, Execution) driven by a workflow template per service type. Required-document slots per step, versioned uploads with hashes, findings threads, a single "next action" that always says who must do what, a timeline of planned versus actual, and a Service Log of everything that happened.

**Decide.** Opinion iterations go from the team leader to an independent reviewer to a manager who is outside the involved set. Materiality is set in planning and every misstatement found is aggregated against it on the Opinion tab. Issuance locks the documents, hashes them, writes the verified figures to the client's records, creates a public verification code and notifies everyone.

**Keep.** Verified inventories, emission factors and `decarb_units` live as records with a status (verified, superseded, under review, assurance withdrawn), a level of assurance and an assurance history. They are reused the following year and will be reachable through an API.

**Prove.** Any stakeholder can open `/verify/{code}` and see the opinion type, the level of assurance, the materiality threshold, the document hashes and, crucially, whether the statement is still current. Superseded and withdrawn statements keep their page with a banner; nothing disappears.

## 4. Who it serves

| Who | What they get |
|---|---|
| **Sustainability and carbon leads** (client admin) | One home page with what is blocking them, what VERIFASSUR is doing, and what has been verified; requests and renewals without e-mail; the service agreement accepted in the platform with name, time and document hash |
| **Site managers and data owners** (client contributor) | Upload evidence to the exact slot that asked for it; answer findings in a thread with attachments |
| **CFOs, boards, investors** (client viewer) | Read-only dashboards, verified totals year over year, signed statements with a public code |
| **VERIFASSUR managers** | Triage with rotation history, approvals, team nomination with competence and rotation checks, decisions outside the involved set, overrides with a mandatory reason, post-issuance events, complaints and appeals, templates as data |
| **Team leaders, auditors, independent reviewers** | A work queue, step detail with slots and checklists, line review statuses, misstatement register, iteration bundles, checklists with the materiality consistency item |
| **Platform administrator** | Sees everything incl. money rollups, manages users, organisations and settings, reads the global audit and COI registers, and can change nothing on an engagement |
| **Buyers, programmes, auditors of the auditor** | The public verification page and, later, verified data through the API |

## 5. Key functionalities

### Engagement engine
- Request wizard with autosave, draft resume, renewal from a past engagement and a generated pre-engagement form.
- Service-type templates (eight in Release 1) that define phases, steps, owner roles, planned durations, document slots, approvals, checklists, locks, materiality defaults, competence requirements, rotation rules and complaint targets. Managers edit them with a reason; every save is a new version.
- One computed next action per engagement; orange when it is on you, blue when it is on the other side.
- Timeline: planned outline versus actual fill, a tick per transition with actor and time, milestones for agreement, issuance, revision and withdrawal, override markers, keyboard navigation and a table view.
- Service Log: append-only, filterable by event family (decisions and refusals, materiality, statements, cases, competence, overrides), exportable.

### Evidence vault
- Required and supporting slots per step, party-aware upload, version history, provenance line, SHA-256 per version, accept or reject with a reason, request-from-client, download-all manifest.
- Evidence linked to figures: every inventory line, emission factor and `decarb_unit` profile shows its evidence chips.

### Findings
- CAR, CL, FAR and OBS with severity, step, assignee and due date; threaded responses with attachments; corrective action requests block the opinion until closed; a client can appeal a closure.

### Opinion and issuance
- Iteration bundles (report, findings report, opinion draft, calculation checks) reviewed by the independent reviewer and decided by a manager outside the involved set.
- Materiality set in Planning (assertion base, threshold, basis, qualitative considerations) and approved by a manager; misstatement register fed by adjusted lines, verified totals and findings; aggregation panel with gross and net against the threshold; an inconsistency warning that must be acknowledged, never bypassed silently.
- Animated issuance: lock, hash, render, code, write-back, status, notify.
- Statement card with status, level of assurance, materiality line and history; post-issuance events for revision (the whole chain runs again, conflicts of interest re-confirmed) and withdrawal (records marked, public banner, reason category).

### Public verification
- `/verify/{code}`: opinion type, level, materiality, verified figures, document hashes, signatories; amber banner when superseded with a link to the replacement; red banner when withdrawn. The client can hide the figures; the banner never hides.

### Verified-data ledger
- GHG inventories per year, scope, category and gas with GWP sets (AR5, AR6), biogenic CO2 and removals reported separately, declared versus verified, line review status, year-over-year change.
- Product emission factors per product, functional unit, boundary, method and year with history.
- `decarb_units`: baseline and project emission profiles per gas, attributed volume, decarb factor and units computed with explicit units (a kg/t mismatch is refused, never silently multiplied), diagnostics, portfolio by year.
- Every record: level of assurance badge, assurance status, statement link, assurance history drawer.

### Accreditation-grade controls
- Involved set derived from the team, the verified-value edits and the independent review; the decision control is disabled with the reasons and the eligible manager named.
- Non-overridable steps as template data: impartiality, scope, contract, agreement, independent review and issuance cannot be forced; a refused attempt is itself logged.
- Competence profiles with validity, expiry reminders and checks at nomination (warnings overridable with a reason, the independent-reviewer qualification a hard block); rotation rules per role and for the body itself; legacy engagements so counts are complete.
- Complaints and appeals register with targets, overdue flags, handlers outside the involved set, internal notes the complainant never sees, and decisions that can reopen a finding, re-check a document or open a post-issuance event.
- Manager overrides of step and service status with a mandatory reason, highlighted in the log and counted in the governance statistics.

### Administration
- Users and organisations (deactivate, never delete), feature flag defaults and per-client states, announcements, maintenance mode, global audit and authentication logs, COI register, break-glass access to evidence content with a reason, governance statistics, money rollups visible only here.

## 6. What makes it different

1. **Client-first.** It leads with "what do I need to do, what did I get, what did it cost", not with the auditor's queue.
2. **Numbers, not PDFs.** Verified figures become records with an assurance reference, a level and a history, reused next year and exposed to machines.
3. **Rules in the workflow, not in a binder.** Separation of decision, non-overridable gates, materiality, competence and rotation are enforced by the system and visible on screen.
4. **Conflicts are shown, not hidden.** A manager who cannot decide sees why and who can; a warning asks for an acknowledgement rather than picking the answer.
5. **Nothing disappears.** Revisions and withdrawals keep the public page, re-mark the records and leave the trail intact.
6. **The roadmap is in the product.** Future capabilities are visible as previews with an "I'm interested" button, so demand is measured before anything is built.

## 7. The future: how we stay ahead

| Horizon | Capability | What it unlocks |
|---|---|---|
| **Now** (Release 1) | Everything in section 5 | A complete, accreditation-grade engagement and ledger |
| **Next** (Release 2, visible today as previews) | Spreadsheet import; REST API with per-client keys; MCP server exposing the same operations as tools; AI evidence assistant (classify uploads, completeness check, figure extraction, draft findings for the auditor); legal e-signature; CSRD/ESRS E1 and ISO 14064-1 report exports; registry links (Verra, Gold Standard); portfolios for senior managers; public complaint form | A client's carbon-accounting software, or its agent, submits data and answers findings directly; verified data flows into disclosures without re-typing |
| **Later** (Release 3+) | Continuous assurance on monthly data streams; dMRV connectors; verifiable credentials for opinions; digital product passport export; agent-to-agent verification; multi-verifier recognition | Assurance becomes a live signal rather than an annual event, and a verified figure travels with the product |

Two design rules keep this credible. Every form is backed from day one by a published JSON schema that the future API accepts unchanged, so switching a capability on is a flag, not a rewrite. And every preview is either fully working or clearly marked as coming, never half-working.

## 8. Proof you can click

- **Live demo:** https://rbndchsn.github.io/digital-platform/ (fictional organisations and people; nothing leaves the browser).
- **Guided walkthrough:** sixteen chapters, about 35 minutes, in `demo/DEMO_SCRIPT.md`. The floating **Demo** button (`Ctrl+.`) switches persona and jumps to any chapter.
- **Thirteen personas** across three client companies and VERIFASSUR, including two decision-capable managers, an independent reviewer and a platform administrator.

## 9. Screenshots in this brief

`marketingimages/01-client-home.png` · `02-engagement-workspace.png` · `03-evidence-step.png` · `04-opinion-issued.png` · `05-public-verification.png` · `06-decarb-record.png` · `07-materiality-panel.png` · `08-withdrawn-statement.png` · `09-competence-check.png` · `10-timeline.png` · `11-admin-dashboard.png` · `12-integrations-preview.png`

Replace any file under the same name to update both the HTML and this document's references.

## 10. Contact

VERIFASSUR Assurance S.A. · *add name, e-mail and phone before sending* · Demo access on request.
