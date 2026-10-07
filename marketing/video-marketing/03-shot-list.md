# Shot list — record in this order

Generated from `scenes.mjs`. One OBS session from a fresh **Reset demo** (`Ctrl+.` → Reset demo → type `reset`), 1440 × 900 window, light theme, presenter notes off. Blocks are ordered so the demo state is right: block J (override) must come after block D (the re-upload), block G issues the Gouda opinion that block G’s public page needs.

Persona switch: `Ctrl+.` → click the name or the chapter. Hold every still **2 s before and 2 s after** an action. If a click goes wrong, wait 2 s, say "retake" and redo the clip. `raw` is the length to record; the edit uses 3–5 s of most clips, more where the script says.

## A · Sign-in and client home (Ingrid, chapters 1–2)

| ✓ | Clip | Persona | Go to | Do | Must be visible | Raw | Used in |
|---|---|---|---|---|---|---|---|
| ☐ | **C01** | any | `/sign-in` | Land on the persona grid; hover two cards; click Ingrid Vos. | Thirteen persona cards, three client companies and VERIFASSUR. | 8 s | F13 |
| ☐ | **C41** | any | `Ctrl+.` | Open the Demo panel; hover the persona grid; hover the chapter list; close. | Thirteen personas and sixteen chapters in one panel. | 8 s | F13 |
| ☐ | **C02** | Ingrid Vos | `/` | Hold 3 s, then scroll slowly from the top to the Verified records tiles and stop. | Progress bars, notifications, orange "Needs your action", "Waiting on VERIFASSUR", verified tiles with level badges and statement codes. | 12 s | T3, T4, F4 |
| ☐ | **C03** | Ingrid Vos | `/` | Hover the orange pill for 2 s, then click it. | Orange pill "Re-upload Activity data samples" with the due date; the engagement opens. | 7 s | T5, F6 |
| ☐ | **C09** | Ingrid Vos | `/engagements/svc_nw_inv_2025` | Hold on Overview; hover the phase rail; hover the "Level of assurance and materiality" card. | Phase rail, next-action banner, team, level of assurance, quote and invoice. | 10 s | T4, F6 |
| ☐ | **C42** | Ingrid Vos | `/engagements/svc_nw_inv_2024` | Click Renew for next period; hold on the pre-filled wizard; Cancel. | Scope, sites and evidence list pre-filled from last year. | 10 s | F5 |
| ☐ | **C04** | Ingrid Vos | `/ → Request work` | Step 1 pick Northwind product footprints; step 2 pick Product carbon footprint verification (ISO 14067) and pause on the right panel; step 3 type the scope summary. | The five-step rail, the service-type cards, the "documents this template will require" panel, autosave hint. | 25 s | T5, F5 |
| ☐ | **C05** | Ingrid Vos | `wizard step 4 → 5` | Add attachment → Simulate upload; step 5 pause on the generated pre-engagement form; tick, Submit request. | Generated pre-engagement form, confirmation tick, submit toast. | 15 s | F5 |

## B · Verifier triage and team (Helena, chapter 3)

| ✓ | Clip | Persona | Go to | Do | Must be visible | Raw | Used in |
|---|---|---|---|---|---|---|---|
| ☐ | **C06** | Helena Brandt | `/staff → Triage queue` | Pause on My work (COI alert, triage queue); open Triage queue; hover the Atlas card; Accept into Contracting. | Triage card with scope, period, materiality default, VVB rotation history; accept dialog. | 15 s | F5 |
| ☐ | **C07** | Helena Brandt | `/engagements/svc_atlas_decarb_2025/phases` | Pause on the Team nomination step; click Approve on Tomas’s COI declaration. | COI statuses per member (cleared, pending, declared); the independent reviewer cannot hold another role. | 10 s | F4, F5 |

## C · Agreement with a hash (Amina, chapter 4)

| ✓ | Clip | Persona | Go to | Do | Must be visible | Raw | Used in |
|---|---|---|---|---|---|---|---|
| ☐ | **C08** | Amina Wanjiru | `/engagements/svc_sol_ver_2025 → Phases → Contracting › V&V service agreement` | Pause on the approval row; hover the hash. | Who accepted the agreement, when, from which IP, and the document hash. | 8 s | T5, F5 |

## D · Evidence vault (Ingrid then Priya, chapter 5)

| ✓ | Clip | Persona | Go to | Do | Must be visible | Raw | Used in |
|---|---|---|---|---|---|---|---|
| ☐ | **C10** | Ingrid Vos | `/engagements/svc_nw_inv_2025/phases` | Pause on the Rejected slot and its reason; Re-upload corrected version → Simulate upload; pause on v2. | Rejected slot with the auditor’s reason, then "Submitted · v2" with a new hash and a provenance line. | 15 s | T5, F6 |
| ☐ | **C11** | Priya Natarajan | `/engagements/svc_nw_inv_2025/phases` | Click Accept on version 2. | Toast "Document accepted."; slot turns Accepted. | 7 s | F6 |
| ☐ | **C12** | Ingrid Vos | `/engagements/svc_nw_inv_2025/documents` | Pause; open the ⋯ menu → Version history; close; hover Download all. | Grouped documents with counts, version history, the manifest with hashes. | 10 s | F6 |

## E · Findings (Pieter then Priya, chapter 6)

| ✓ | Clip | Persona | Go to | Do | Must be visible | Raw | Used in |
|---|---|---|---|---|---|---|---|
| ☐ | **C13** | Pieter de Jong | `/engagements/svc_nw_inv_2025/findings` | Pause on the "1 blocking finding open" banner; open CAR #2; Attach evidence → Simulate upload; type a short response; Respond. | Finding list with severities, the thread, the attachment, the response. | 18 s | T5, F6 |
| ☐ | **C14** | Priya Natarajan | `same finding` | Mark under review → Close finding; return to the list. | The blocking banner is gone. | 10 s | F6 |

## F · Records (Ingrid, chapter 7)

| ✓ | Clip | Persona | Go to | Do | Must be visible | Raw | Used in |
|---|---|---|---|---|---|---|---|
| ☐ | **C22** | Ingrid Vos | `/records/inventories → 2025` | Pause on the year chart; open 2025; click Scope 3 tab; hover an evidence chip; hover "Biogenic CO2 (reported separately)". | Year chart, level badges in the Assurance column, lines per gas with GWP, declared vs verified, evidence chips. | 18 s | T4, F4, F8 |
| ☐ | **C23** | Ingrid Vos | `/records/decarb-units/dcu_nw_milk_2025` | Hold on the two profiles; scroll to Computed decarb_units; stop on 400,000. | Baseline 3.400, project 3.000, attributed 1,000,000 t, 400,000 reduction units, biogenic delta reported not counted. | 12 s | T7, F8 |
| ☐ | **C24** | Ingrid Vos | `same → What if…` | Change the unit to L → Recompute → hold on the refusal; change to kg → Recompute → 400 units. | "Unit mismatch" refusal in red; then 400 units on kg. | 15 s | T7, F8 |

## G · Materiality, decision, issuance (Tomas, Helena, Marc, chapter 13) — HERO

| ✓ | Clip | Persona | Go to | Do | Must be visible | Raw | Used in |
|---|---|---|---|---|---|---|---|
| ☐ | **C15** | Tomas Lindqvist | `Ctrl+. → chapter 13 (/engagements/svc_nw_pcf_2025/opinion)` | Scroll slowly over the aggregation panel; stop on the inconsistency warning. | Red gauge, gross and net against materiality 0.445, "Materiality warning" badge, the amber warning box. | 12 s | T6, F7 |
| ☐ | **C16** | Tomas Lindqvist | `same` | Independent review → show the greyed materiality item → type the acknowledgement → tick all → Approve. | Item greyed with "acknowledgement required" until text is typed; toast "sent to manager review". | 20 s | T6, F7 |
| ☐ | **C17** | Helena Brandt | `same` | Hover the disabled Manager decision button; hold on the eligibility notice. | Notice naming the verified-value edit, the involved set, and "Marc Lefèvre" as the eligible manager. | 10 s | T6, F7 |
| ☐ | **C18** | Marc Lefèvre | `same` | Manager decision → acknowledgement → tick all → Approve → Issue opinion → Issue opinion. Let the eight steps run; hold on "Opinion issued". | The eight issuance steps completing one by one; the new code; the Open public statement button. HERO CLIP: record it twice, once at a slower cursor. | 30 s | T6, F7 |
| ☐ | **C19** | (dialog) | `Open public statement (new tab)` | Hold on the green banner; scroll slowly to the hashes; stop. | "Genuine VERIFASSUR opinion", QR, limited-assurance badge, materiality line, figures, document hashes. | 12 s | T1, T7, F1, F9 |

## H · Revision and withdrawal (chapter 14) and the public pages

| ✓ | Clip | Persona | Go to | Do | Must be visible | Raw | Used in |
|---|---|---|---|---|---|---|---|
| ☐ | **C43** | Helena Brandt | `Ctrl+. → chapter 14 (/engagements/svc_nw_pcf_2024/opinion) then /engagements/svc_nw_decarb_2024/opinion → Statement history` | Hold on the withdrawn statement card; then open the statement history and hold on the Superseded row. | "Statement withdrawn" with reason category and decider; a Superseded row with the replacement code. | 12 s | F9 |
| ☐ | **C20** | any | `/verify/<PCF 2024 code>` | Type the withdrawn code into the lookup box; Check; hold. | Red "This statement has been withdrawn", reason "Error in the statement", no figures, code still resolves. | 12 s | T7, F9 |
| ☐ | **C21** | any | `/verify/<decarb 2024 superseded code>` | Type the superseded code; Check; hover the replacement link. | Amber banner "superseded" with the link to the replacement code. | 10 s | F9 |
| ☐ | **C25** | Ingrid Vos | `/records/emission-factors` | Pause on the red alert and the "Assurance withdrawn" badges; open Assurance history on a 2024 factor; close. | Withdrawn badges, declared-only values, the former verified value in the history drawer. | 12 s | F8 |
| ☐ | **C44** | Helena Brandt → Marc Lefèvre | `/engagements/svc_nw_decarb_2025/opinion (after C18)` | Open post-issuance event → describe → submit; switch to Marc → Decide → Revise the opinion; hold on "In revision" and the Re-confirm COI cards. *(optional: needs chapter 8 played first so the 2025 decarb opinion exists)* *(spare: not in either cut, record if time allows)* | A revision re-runs the whole chain: status "In revision", every team member asked to re-confirm conflicts. | 20 s | — |

## I · Cases, competence, templates (Helena, Ingrid, chapters 15–16)

| ✓ | Clip | Persona | Go to | Do | Must be visible | Raw | Used in |
|---|---|---|---|---|---|---|---|
| ☐ | **C28** | Helena Brandt | `/staff/cases` | Pause on the overdue pill; open the appeal; Reassign handler; hold on "Not offered (involved set)"; Cancel. | Queue with kind, stage, targets, overdue pill; the assign dialog that refuses Priya. | 15 s | T8, F10 |
| ☐ | **C29** | Ingrid Vos | `/organisation?tab=cases` | Pause on the appeal card and its stage dates. *(spare: not in either cut, record if time allows)* | The client sees handler, stages, targets and the handler’s message, not the internal note. | 8 s | — |
| ☐ | **C26** | Helena Brandt | `Ctrl+. → chapter 16 (/engagements/svc_atlas_decarb_2025/phases)` | Nominate → Jonas Weber: Technical expert (warnings + reason field) → Helena Brandt: Independent reviewer (block) → set both back → Cancel. | Amber warnings with the mandatory override reason; the red "Blocked: no override lifts this rule". | 20 s | T8, F10 |
| ☐ | **C27** | Helena Brandt | `/staff/competence` | Tick "Expiring within 90 days"; open Priya’s row; close. | Qualifications table, validity, Priya’s certificate expiring in 45 days, legacy engagements at the bottom. | 12 s | F10 |
| ☐ | **C39** | Helena Brandt | `/staff/templates → Edit template` | Scroll the lock switches, the materiality default, the competence requirements and the rotation rules; Cancel. | Templates as data: non-overridable locks, rotation rules, complaint targets, version history. | 12 s | F10 |

## J · Manager override (Helena, chapter 12) — after block D

| ✓ | Clip | Persona | Go to | Do | Must be visible | Raw | Used in |
|---|---|---|---|---|---|---|---|
| ☐ | **C30** | Helena Brandt | `/engagements/svc_nw_inv_2025/phases (chapter 12)` | Override status → Force complete; show the disabled confirm; type the reason; confirm; hold on "Completed by override". | Reason gate (10 characters), the override badge with name and reason, the next step started. | 18 s | F10 |
| ☐ | **C31** | Helena Brandt | `same page → Team nomination step` | Hover the Non-overridable lock; open Override status; hold on the greyed Force complete and Skip. | "Cannot be completed or skipped by override" on a locked step. | 8 s | F10 |

## K · Administration (Sam, chapter 11)

| ✓ | Clip | Persona | Go to | Do | Must be visible | Raw | Used in |
|---|---|---|---|---|---|---|---|
| ☐ | **C32** | Sam Okafor | `/admin (chapter 11)` | Hold on the top tiles; scroll to Governance controls; stop on the Revenue tiles. | Engagements started, issued, closed; governance tiles (refused decisions, warnings acknowledged, revisions, cases, expiring qualifications); "Platform administrator only" badge. | 15 s | T8, F10 |
| ☐ | **C33** | Sam Okafor | `/engagements/svc_nw_inv_2025/phases` | Hold on the read-only banner; scroll to a document row ("Content closed"); click Break-glass access; type a reason; hold; Cancel. | No action buttons anywhere; the break-glass dialog asks for a reason and warns it is audited. | 15 s | F10 |
| ☐ | **C35** | Sam Okafor | `/admin/audit → COI register` | Scroll the audit log; switch to Authentication events; open the COI register. | Global audit log with actor and reason; the COI register across engagements. | 12 s | F10 |
| ☐ | **C34** | Sam Okafor | `/engagements/svc_nw_pcf_2025/log` | Filter "Decisions and refusals"; scroll slowly. | Highlighted rows: Marc’s decision "(outside the involved set)", the two acknowledgements, the issuance. | 10 s | F7 |

## L · The future (Ingrid then Helena, chapter 10)

| ✓ | Clip | Persona | Go to | Do | Must be visible | Raw | Used in |
|---|---|---|---|---|---|---|---|
| ☐ | **C37** | Ingrid Vos | `/integrations (chapter 10)` | Hold on the four preview cards; scroll to "Further out"; back up; I’m interested on MCP server → Register interest. | "Coming next" overlays on API keys, MCP server, webhooks, spreadsheet import; the confirmation. | 15 s | T9, F12 |
| ☐ | **C38** | Helena Brandt | `/staff/clients` | Pause on Interest signals; hover a feature switch; hover the Portfolio manager "Coming" badge. | The "Ingrid Vos · Northwind" interest row; per-client feature states. | 10 s | F12 |

## M · B-roll

| ✓ | Clip | Persona | Go to | Do | Must be visible | Raw | Used in |
|---|---|---|---|---|---|---|---|
| ☐ | **C36** | Ingrid Vos | `/engagements/svc_nw_decarb_2024/timeline` | Hover a tick; press Tab three times; toggle Table view. | Planned outline vs actual fill, milestones, override markers, focus ring, the table. | 12 s | F6 |
| ☐ | **C40** | Ingrid Vos | `/ and /verify/<code>` | Toggle dark mode on the home page; hold 3 s; toggle on the public page; hold 3 s. | Dark-mode B-roll for the differentiators segment. | 12 s | F3, F11 |

Total raw material: about 10 minutes before retakes; plan 45 minutes for the session.

## Codes you will need

- **PCF 2024 (withdrawn):** Ingrid → `/engagements/svc_nw_pcf_2024/opinion` → the code on the statement card.
- **Decarb 2024 (superseded):** Ingrid → `/engagements/svc_nw_decarb_2024/opinion` → **Statement history** → the row marked Superseded.
- **Gouda 2025 (issued in C18):** shown in the issuance dialog; the public tab opens from there.

## Naming the files

Save each clip as `clips/C18-issuance.mp4` (id, dash, two or three words). The storyboard and scripts reference the id only, so the words are for you. Keep the raw OBS recording as well.
