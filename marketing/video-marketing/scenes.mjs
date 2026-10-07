// VERIFASSUR_X video package v2 — single source of truth for both cuts.
// `node build.mjs` turns this file into the scripts, the shot list, the teleprompter files and storyboard.html.
// Edit the text here, never in the generated files.

/* ------------------------------------------------------------------------------------------------
 * CLIPS — screen recordings you capture from the live demo (one OBS session, see 03-shot-list.md).
 * raw = seconds to record (hold still 2 s before and after); the edit uses 3–5 s of each unless noted.
 * shot = a still that stands in for the clip in storyboard.html (marketingimages or demo screenshots).
 * ---------------------------------------------------------------------------------------------- */
const DS = '../../assets/demo-screenshots'
const MI = '../marketingimages'

export const clips = {
  C01: { persona: 'any', url: '/sign-in', do: 'Land on the persona grid; hover two cards; click Ingrid Vos.', raw: 8, see: 'Thirteen persona cards, three client companies and VERIFASSUR.', shot: `${DS}/01-sign-in.png`, chapter: 1 },
  C02: { persona: 'Ingrid Vos', url: '/', do: 'Hold 3 s, then scroll slowly from the top to the Verified records tiles and stop.', raw: 12, see: 'Progress bars, notifications, orange "Needs your action", "Waiting on VERIFASSUR", verified tiles with level badges and statement codes.', shot: `${MI}/01-client-home.png`, chapter: 1 },
  C03: { persona: 'Ingrid Vos', url: '/', do: 'Hover the orange pill for 2 s, then click it.', raw: 7, see: 'Orange pill "Re-upload Activity data samples" with the due date; the engagement opens.', shot: `${MI}/01-client-home.png`, chapter: 1 },
  C04: { persona: 'Ingrid Vos', url: '/ → Request work', do: 'Step 1 pick Northwind product footprints; step 2 pick Product carbon footprint verification (ISO 14067) and pause on the right panel; step 3 type the scope summary.', raw: 25, see: 'The five-step rail, the service-type cards, the "documents this template will require" panel, autosave hint.', shot: `${DS}/08-request-wizard.png`, chapter: 2 },
  C05: { persona: 'Ingrid Vos', url: 'wizard step 4 → 5', do: 'Add attachment → Simulate upload; step 5 pause on the generated pre-engagement form; tick, Submit request.', raw: 15, see: 'Generated pre-engagement form, confirmation tick, submit toast.', shot: `${DS}/08-request-wizard.png`, chapter: 2 },
  C06: { persona: 'Helena Brandt', url: '/staff → Triage queue', do: 'Pause on My work (COI alert, triage queue); open Triage queue; hover the Atlas card; Accept into Contracting.', raw: 15, see: 'Triage card with scope, period, materiality default, VVB rotation history; accept dialog.', shot: `${DS}/16-triage.png`, chapter: 3 },
  C07: { persona: 'Helena Brandt', url: '/engagements/svc_atlas_decarb_2025/phases', do: 'Pause on the Team nomination step; click Approve on Tomas’s COI declaration.', raw: 10, see: 'COI statuses per member (cleared, pending, declared); the independent reviewer cannot hold another role.', shot: `${DS}/14-team-coi.png`, chapter: 3 },
  C08: { persona: 'Amina Wanjiru', url: '/engagements/svc_sol_ver_2025 → Phases → Contracting › V&V service agreement', do: 'Pause on the approval row; hover the hash.', raw: 8, see: 'Who accepted the agreement, when, from which IP, and the document hash.', shot: `${DS}/10-step-detail.png`, chapter: 4 },
  C09: { persona: 'Ingrid Vos', url: '/engagements/svc_nw_inv_2025', do: 'Hold on Overview; hover the phase rail; hover the "Level of assurance and materiality" card.', raw: 10, see: 'Phase rail, next-action banner, team, level of assurance, quote and invoice.', shot: `${MI}/02-engagement-workspace.png`, chapter: 5 },
  C10: { persona: 'Ingrid Vos', url: '/engagements/svc_nw_inv_2025/phases', do: 'Pause on the Rejected slot and its reason; Re-upload corrected version → Simulate upload; pause on v2.', raw: 15, see: 'Rejected slot with the auditor’s reason, then "Submitted · v2" with a new hash and a provenance line.', shot: `${MI}/03-evidence-step.png`, chapter: 5 },
  C11: { persona: 'Priya Natarajan', url: '/engagements/svc_nw_inv_2025/phases', do: 'Click Accept on version 2.', raw: 7, see: 'Toast "Document accepted."; slot turns Accepted.', shot: `${MI}/03-evidence-step.png`, chapter: 5 },
  C12: { persona: 'Ingrid Vos', url: '/engagements/svc_nw_inv_2025/documents', do: 'Pause; open the ⋯ menu → Version history; close; hover Download all.', raw: 10, see: 'Grouped documents with counts, version history, the manifest with hashes.', shot: `${DS}/11-documents.png`, chapter: 5 },
  C13: { persona: 'Pieter de Jong', url: '/engagements/svc_nw_inv_2025/findings', do: 'Pause on the "1 blocking finding open" banner; open CAR #2; Attach evidence → Simulate upload; type a short response; Respond.', raw: 18, see: 'Finding list with severities, the thread, the attachment, the response.', shot: `${DS}/18-findings.png`, chapter: 6 },
  C14: { persona: 'Priya Natarajan', url: 'same finding', do: 'Mark under review → Close finding; return to the list.', raw: 10, see: 'The blocking banner is gone.', shot: `${DS}/19-finding-thread.png`, chapter: 6 },
  C15: { persona: 'Tomas Lindqvist', url: 'Ctrl+. → chapter 13 (/engagements/svc_nw_pcf_2025/opinion)', do: 'Scroll slowly over the aggregation panel; stop on the inconsistency warning.', raw: 12, see: 'Red gauge, gross and net against materiality 0.445, "Materiality warning" badge, the amber warning box.', shot: `${MI}/07-materiality-panel.png`, chapter: 13 },
  C16: { persona: 'Tomas Lindqvist', url: 'same', do: 'Independent review → show the greyed materiality item → type the acknowledgement → tick all → Approve.', raw: 20, see: 'Item greyed with "acknowledgement required" until text is typed; toast "sent to manager review".', shot: `${DS}/32-opinion-aggregation.png`, chapter: 13 },
  C17: { persona: 'Helena Brandt', url: 'same', do: 'Hover the disabled Manager decision button; hold on the eligibility notice.', raw: 10, see: 'Notice naming the verified-value edit, the involved set, and "Marc Lefèvre" as the eligible manager.', shot: `${DS}/32-opinion-aggregation.png`, chapter: 13 },
  C18: { persona: 'Marc Lefèvre', url: 'same', do: 'Manager decision → acknowledgement → tick all → Approve → Issue opinion → Issue opinion. Let the eight steps run; hold on "Opinion issued".', raw: 30, see: 'The eight issuance steps completing one by one; the new code; the Open public statement button. HERO CLIP: record it twice, once at a slower cursor.', shot: `${DS}/20-opinion-iterations.png`, chapter: 13 },
  C19: { persona: '(dialog)', url: 'Open public statement (new tab)', do: 'Hold on the green banner; scroll slowly to the hashes; stop.', raw: 12, see: '"Genuine VERIFASSUR opinion", QR, limited-assurance badge, materiality line, figures, document hashes.', shot: `${MI}/05-public-verification.png`, chapter: 13 },
  C20: { persona: 'any', url: '/verify/<PCF 2024 code>', do: 'Type the withdrawn code into the lookup box; Check; hold.', raw: 12, see: 'Red "This statement has been withdrawn", reason "Error in the statement", no figures, code still resolves.', shot: `${MI}/08-withdrawn-statement.png`, chapter: 14 },
  C21: { persona: 'any', url: '/verify/<decarb 2024 superseded code>', do: 'Type the superseded code; Check; hover the replacement link.', raw: 10, see: 'Amber banner "superseded" with the link to the replacement code.', shot: `${DS}/34-public-withdrawn.png`, chapter: 14 },
  C22: { persona: 'Ingrid Vos', url: '/records/inventories → 2025', do: 'Pause on the year chart; open 2025; click Scope 3 tab; hover an evidence chip; hover "Biogenic CO2 (reported separately)".', raw: 18, see: 'Year chart, level badges in the Assurance column, lines per gas with GWP, declared vs verified, evidence chips.', shot: `${DS}/23-inventory.png`, chapter: 7 },
  C23: { persona: 'Ingrid Vos', url: '/records/decarb-units/dcu_nw_milk_2025', do: 'Hold on the two profiles; scroll to Computed decarb_units; stop on 400,000.', raw: 12, see: 'Baseline 3.400, project 3.000, attributed 1,000,000 t, 400,000 reduction units, biogenic delta reported not counted.', shot: `${MI}/06-decarb-record.png`, chapter: 7 },
  C24: { persona: 'Ingrid Vos', url: 'same → What if…', do: 'Change the unit to L → Recompute → hold on the refusal; change to kg → Recompute → 400 units.', raw: 15, see: '"Unit mismatch" refusal in red; then 400 units on kg.', shot: `${MI}/06-decarb-record.png`, chapter: 7 },
  C25: { persona: 'Ingrid Vos', url: '/records/emission-factors', do: 'Pause on the red alert and the "Assurance withdrawn" badges; open Assurance history on a 2024 factor; close.', raw: 12, see: 'Withdrawn badges, declared-only values, the former verified value in the history drawer.', shot: `${DS}/26-emission-factors.png`, chapter: 14 },
  C26: { persona: 'Helena Brandt', url: 'Ctrl+. → chapter 16 (/engagements/svc_atlas_decarb_2025/phases)', do: 'Nominate → Jonas Weber: Technical expert (warnings + reason field) → Helena Brandt: Independent reviewer (block) → set both back → Cancel.', raw: 20, see: 'Amber warnings with the mandatory override reason; the red "Blocked: no override lifts this rule".', shot: `${MI}/09-competence-check.png`, chapter: 16 },
  C27: { persona: 'Helena Brandt', url: '/staff/competence', do: 'Tick "Expiring within 90 days"; open Priya’s row; close.', raw: 12, see: 'Qualifications table, validity, Priya’s certificate expiring in 45 days, legacy engagements at the bottom.', shot: `${DS}/36-competence.png`, chapter: 16 },
  C28: { persona: 'Helena Brandt', url: '/staff/cases', do: 'Pause on the overdue pill; open the appeal; Reassign handler; hold on "Not offered (involved set)"; Cancel.', raw: 15, see: 'Queue with kind, stage, targets, overdue pill; the assign dialog that refuses Priya.', shot: `${DS}/35-cases-register.png`, chapter: 15 },
  C29: { persona: 'Ingrid Vos', url: '/organisation?tab=cases', do: 'Pause on the appeal card and its stage dates.', raw: 8, see: 'The client sees handler, stages, targets and the handler’s message, not the internal note.', shot: `${DS}/35-cases-register.png`, chapter: 15 },
  C30: { persona: 'Helena Brandt', url: '/engagements/svc_nw_inv_2025/phases (chapter 12)', do: 'Override status → Force complete; show the disabled confirm; type the reason; confirm; hold on "Completed by override".', raw: 18, see: 'Reason gate (10 characters), the override badge with name and reason, the next step started.', shot: `${DS}/31-manager-override.png`, chapter: 12 },
  C31: { persona: 'Helena Brandt', url: 'same page → Team nomination step', do: 'Hover the Non-overridable lock; open Override status; hold on the greyed Force complete and Skip.', raw: 8, see: '"Cannot be completed or skipped by override" on a locked step.', shot: `${DS}/31-manager-override.png`, chapter: 12 },
  C32: { persona: 'Sam Okafor', url: '/admin (chapter 11)', do: 'Hold on the top tiles; scroll to Governance controls; stop on the Revenue tiles.', raw: 15, see: 'Engagements started, issued, closed; governance tiles (refused decisions, warnings acknowledged, revisions, cases, expiring qualifications); "Platform administrator only" badge.', shot: `${MI}/11-admin-dashboard.png`, chapter: 11 },
  C33: { persona: 'Sam Okafor', url: '/engagements/svc_nw_inv_2025/phases', do: 'Hold on the read-only banner; scroll to a document row ("Content closed"); click Break-glass access; type a reason; hold; Cancel.', raw: 15, see: 'No action buttons anywhere; the break-glass dialog asks for a reason and warns it is audited.', shot: `${DS}/10-step-detail.png`, chapter: 11 },
  C34: { persona: 'Sam Okafor', url: '/engagements/svc_nw_pcf_2025/log', do: 'Filter "Decisions and refusals"; scroll slowly.', raw: 10, see: 'Highlighted rows: Marc’s decision "(outside the involved set)", the two acknowledgements, the issuance.', shot: `${DS}/13-service-log.png`, chapter: 13 },
  C35: { persona: 'Sam Okafor', url: '/admin/audit → COI register', do: 'Scroll the audit log; switch to Authentication events; open the COI register.', raw: 12, see: 'Global audit log with actor and reason; the COI register across engagements.', shot: `${DS}/30-admin-audit.png`, chapter: 11 },
  C36: { persona: 'Ingrid Vos', url: '/engagements/svc_nw_decarb_2024/timeline', do: 'Hover a tick; press Tab three times; toggle Table view.', raw: 12, see: 'Planned outline vs actual fill, milestones, override markers, focus ring, the table.', shot: `${MI}/10-timeline.png`, chapter: 9 },
  C37: { persona: 'Ingrid Vos', url: '/integrations (chapter 10)', do: 'Hold on the four preview cards; scroll to "Further out"; back up; I’m interested on MCP server → Register interest.', raw: 15, see: '"Coming next" overlays on API keys, MCP server, webhooks, spreadsheet import; the confirmation.', shot: `${MI}/12-integrations-preview.png`, chapter: 10 },
  C38: { persona: 'Helena Brandt', url: '/staff/clients', do: 'Pause on Interest signals; hover a feature switch; hover the Portfolio manager "Coming" badge.', raw: 10, see: 'The "Ingrid Vos · Northwind" interest row; per-client feature states.', shot: `${DS}/27-staff-clients.png`, chapter: 10 },
  C39: { persona: 'Helena Brandt', url: '/staff/templates → Edit template', do: 'Scroll the lock switches, the materiality default, the competence requirements and the rotation rules; Cancel.', raw: 12, see: 'Templates as data: non-overridable locks, rotation rules, complaint targets, version history.', shot: `${DS}/03-staff-shell.png`, chapter: 16 },
  C40: { persona: 'Ingrid Vos', url: '/ and /verify/<code>', do: 'Toggle dark mode on the home page; hold 3 s; toggle on the public page; hold 3 s.', raw: 12, see: 'Dark-mode B-roll for the differentiators segment.', shot: `${DS}/dark-02-client-home.png`, chapter: 1 },
  C41: { persona: 'any', url: 'Ctrl+.', do: 'Open the Demo panel; hover the persona grid; hover the chapter list; close.', raw: 8, see: 'Thirteen personas and sixteen chapters in one panel.', shot: `${DS}/01-sign-in.png`, chapter: 1 },
  C42: { persona: 'Ingrid Vos', url: '/engagements/svc_nw_inv_2024', do: 'Click Renew for next period; hold on the pre-filled wizard; Cancel.', raw: 10, see: 'Scope, sites and evidence list pre-filled from last year.', shot: `${MI}/04-opinion-issued.png`, chapter: 2 },
  C43: { persona: 'Helena Brandt', url: 'Ctrl+. → chapter 14 (/engagements/svc_nw_pcf_2024/opinion) then /engagements/svc_nw_decarb_2024/opinion → Statement history', do: 'Hold on the withdrawn statement card; then open the statement history and hold on the Superseded row.', raw: 12, see: '"Statement withdrawn" with reason category and decider; a Superseded row with the replacement code.', shot: `${MI}/08-withdrawn-statement.png`, chapter: 14 },
  C44: { persona: 'Helena Brandt → Marc Lefèvre', url: '/engagements/svc_nw_decarb_2025/opinion (after C18)', do: 'Open post-issuance event → describe → submit; switch to Marc → Decide → Revise the opinion; hold on "In revision" and the Re-confirm COI cards.', raw: 20, see: 'A revision re-runs the whole chain: status "In revision", every team member asked to re-confirm conflicts.', shot: `${DS}/20-opinion-iterations.png`, chapter: 14 },
}

/* ------------------------------------------------------------------------------------------------
 * CARDS — graphics generated by cards/build-cards.mjs (static PNG) and motion/render-motion.mjs (webm).
 * ---------------------------------------------------------------------------------------------- */
export const cards = {
  M01: { file: 'motion/out/m01-cold-open.webm', still: 'cards/out/t01-cold-open.png', desc: 'Three questions appear one by one on ink: "Who verified this number?" / "To what level?" / "Can anyone check?"', dur: 9 },
  M02: { file: 'motion/out/m02-email-folders-pdfs.webm', still: 'cards/out/t03-email-folders-pdfs.png', desc: '"E-mail. Folders. PDFs." one word per second, then "Assurance is a black box."', dur: 6 },
  M03: { file: 'motion/out/m03-flow.webm', still: 'cards/out/t06-flow.png', desc: 'The five chapters build left to right: Request → Run → Decide → Keep → Prove.', dur: 6 },
  M04: { file: 'motion/out/m04-roadmap.webm', still: 'cards/out/t09-roadmap.png', desc: 'Now / Next / Later columns fill in with their capabilities.', dur: 8 },
  M05: { file: 'motion/out/m05-end-card.webm', still: 'cards/out/t11-end-card.png', desc: 'Logo lockup, tagline, URL, "Demonstration with fictional data", contact line.', dur: 8 },
  M06: { file: 'motion/out/m06-two-things.webm', still: 'cards/out/t05-two-things.png', desc: '"Two things in one product": Client portal and Verified-data ledger slide in, the Verifier workflow bar appears underneath.', dur: 7 },
  T02: { file: 'cards/out/t02-title.png', desc: 'Title card: logo lockup + "The digital platform for sustainability assurance".' },
  T04: { file: 'cards/out/t04-three-audiences.png', desc: 'Problem card with three columns: Clients · Verifiers · Everyone downstream.' },
  T07: { file: 'cards/out/t07-rules-in-workflow.png', desc: '"Rules in the workflow, not in a binder": the standards on the left, the enforced controls on the right.' },
  T08: { file: 'cards/out/t08-six-differences.png', desc: 'Six differentiators as a numbered list.' },
  T10: { file: 'cards/out/t10-nothing-disappears.png', desc: '"Nothing disappears": Verified → Superseded → Withdrawn status chips with what each keeps.' },
  T12: { file: 'cards/out/t12-proof-you-can-click.png', desc: '"Proof you can click": 16 chapters · 13 personas · 3 client companies · 1 verification body, with the demo URL.' },
  CH1: { file: 'cards/out/ch1-request.png', desc: 'Chapter card 1 · Request' },
  CH2: { file: 'cards/out/ch2-run.png', desc: 'Chapter card 2 · Run' },
  CH3: { file: 'cards/out/ch3-decide.png', desc: 'Chapter card 3 · Decide' },
  CH4: { file: 'cards/out/ch4-keep.png', desc: 'Chapter card 4 · Keep' },
  CH5: { file: 'cards/out/ch5-prove.png', desc: 'Chapter card 5 · Prove' },
  CH6: { file: 'cards/out/ch6-accreditation-grade.png', desc: 'Chapter card 6 · Accreditation-grade by construction' },
}

/* ------------------------------------------------------------------------------------------------
 * Lower-thirds (transparent PNG) — one per persona that appears on screen.
 * ---------------------------------------------------------------------------------------------- */
export const lowerThirds = [
  { id: 'lt-ingrid', name: 'Ingrid Vos', role: 'Head of Sustainability · Northwind Dairy Cooperative (client)' },
  { id: 'lt-pieter', name: 'Pieter de Jong', role: 'Site manager, Lelystad · Northwind (client contributor)' },
  { id: 'lt-amina', name: 'Amina Wanjiru', role: 'Carbon programme lead · Solstice (client)' },
  { id: 'lt-helena', name: 'Helena Brandt', role: 'Scheme manager · VERIFASSUR' },
  { id: 'lt-marc', name: 'Marc Lefèvre', role: 'Technical manager · VERIFASSUR · outside the involved set' },
  { id: 'lt-marcus', name: 'Marcus Oyelaran', role: 'Lead verifier · VERIFASSUR' },
  { id: 'lt-priya', name: 'Priya Natarajan', role: 'GHG auditor · VERIFASSUR' },
  { id: 'lt-tomas', name: 'Tomas Lindqvist', role: 'Independent reviewer · VERIFASSUR' },
  { id: 'lt-sam', name: 'Sam Okafor', role: 'Platform administrator · sees everything, changes nothing' },
]

/* ------------------------------------------------------------------------------------------------
 * Feature labels (transparent PNG chips) — burned over the 3–5 s montage clips.
 * ---------------------------------------------------------------------------------------------- */
export const labels = [
  ['f-request', 'Request wizard · five steps'],
  ['f-preform', 'Generated pre-engagement form'],
  ['f-triage', 'Triage with rotation history'],
  ['f-coi', 'Conflict-of-interest declarations'],
  ['f-agreement', 'Agreement accepted · name, time, hash'],
  ['f-renewal', 'Renewal pre-filled from last year'],
  ['f-next-action', 'One next action, always'],
  ['f-phases', 'Three phases · one template per service type'],
  ['f-evidence', 'Versioned evidence · SHA-256'],
  ['f-documents', 'Download all · manifest with hashes'],
  ['f-findings', 'Findings block the opinion until closed'],
  ['f-timeline', 'Timeline · planned vs actual'],
  ['f-materiality', 'Misstatements aggregated against materiality'],
  ['f-ack', 'Warning acknowledged in writing, never bypassed'],
  ['f-involved', 'Decision refused inside the involved set'],
  ['f-issuance', 'Issuance · eight visible steps'],
  ['f-log', 'Service Log · append-only'],
  ['f-inventory', 'GHG inventory · per scope, gas, year'],
  ['f-decarb', 'decarb_units · computed on the volume you bought'],
  ['f-units', 'Unit mismatch refused, never multiplied'],
  ['f-history', 'Assurance history on every record'],
  ['f-public', 'Public verification page · no account needed'],
  ['f-withdrawn', 'Withdrawn · banner stays, code still resolves'],
  ['f-superseded', 'Superseded · links to the replacement'],
  ['f-competence', 'Competence and rotation checked at nomination'],
  ['f-hard-block', 'Hard block · no reason lifts it'],
  ['f-cases', 'Complaints and appeals · handled outside the involved set'],
  ['f-override', 'Override with a reason · never silently'],
  ['f-locked', 'Non-overridable gates · template data'],
  ['f-admin', 'Administrator · sees everything, changes nothing'],
  ['f-audit', 'Global audit log and COI register'],
  ['f-previews', 'Roadmap in the product · "I’m interested"'],
  ['f-flags', 'Switched on per client · a flag, not a rewrite'],
  ['f-templates', 'Templates as data · every save is a version'],
  ['f-dark', 'Light and dark · keyboard-navigable'],
]

/* ------------------------------------------------------------------------------------------------
 * SCENES. Each scene: id, title, dur (s), kind (long | montage | card), visual (ordered list of
 * {asset, secs, text}) where asset is a clip id, a card id, or 'EDIT' for something made in the editor;
 * vo = narration; music = direction; notes = editing notes.
 * ---------------------------------------------------------------------------------------------- */

export const teaser = {
  id: 'teaser',
  title: 'VERIFASSUR_X — Teaser',
  target: 'about 3:40',
  audience: 'LinkedIn, sales e-mail, first contact with a prospect or investor. Stands alone; no prior knowledge.',
  scenes: [
    {
      id: 'T1', title: 'Cold open — three questions', dur: 18, kind: 'long',
      visual: [
        { asset: 'M01', secs: 9, text: 'Who verified this number? / To what level? / Can anyone check?' },
        { asset: 'C19', secs: 9, text: 'Public verification page: the code is typed, the green banner appears.' },
      ],
      vo: `Who verified this number? To what level of assurance? And can anyone check?
Most verification statements live in an inbox. They cannot answer.
This one can.`,
      music: 'Silence for the first 4 s, then a single low sustained note under the questions; the bed starts on the cut to the public page.',
      notes: 'Cut from the third question straight to the public page with the code half-typed. Let the green banner land on "This one can."',
    },
    {
      id: 'T2', title: 'Title', dur: 7, kind: 'card',
      visual: [{ asset: 'T02', secs: 7, text: 'VERIFASSUR_X · The digital platform for sustainability assurance' }],
      vo: '',
      music: 'Bed rises; one soft hit on the logo.',
      notes: 'Cross-dissolve in from the public page over 0.5 s; hold; dip to ink.',
    },
    {
      id: 'T3', title: 'The problem', dur: 33, kind: 'long',
      visual: [
        { asset: 'M02', secs: 6, text: 'E-mail. Folders. PDFs. → Assurance is a black box.' },
        { asset: 'T04', secs: 14, text: 'Clients · Verifiers · Everyone downstream (three columns, revealed one at a time in the editor)' },
        { asset: 'C02', secs: 13, text: 'Slow scroll of the client home, desaturated 30 % with a soft vignette until the next scene.' },
      ],
      vo: `An assurance engagement today runs on e-mail, shared folders and spreadsheets.
For the client, it is a black box: what is missing, what is blocking, when will the opinion arrive.
For the verifier, accreditation is a paper exercise.
And downstream, a claim is only as good as its proof.`,
      music: 'Sparse. Bed at −30 dB, no percussion.',
      notes: 'Reveal the three columns of T04 as the narration names each audience (wipe or fade per column). The home-page scroll under the last sentence is the first glimpse of the product; keep it muted and let the next scene bring the colour back.',
    },
    {
      id: 'T4', title: 'What it is', dur: 37, kind: 'long',
      visual: [
        { asset: 'M06', secs: 7, text: 'Two things in one product: Client portal · Verified-data ledger · (Verifier workflow underneath)' },
        { asset: 'C02', secs: 10, text: 'Client home in full colour: progress, Needs your action, Verified records.' },
        { asset: 'C09', secs: 8, text: 'Engagement overview: phase rail, next action, team, level of assurance.' },
        { asset: 'C22', secs: 7, text: 'GHG inventory 2025 with evidence chips.' },
        { asset: 'M03', secs: 5, text: 'Request → Run → Decide → Keep → Prove' },
      ],
      vo: `VERIFASSUR_X replaces the black box with one workspace.
A client portal, where a company requests, follows and archives the verification of its GHG inventory, its product footprints and its value-chain decarbonisation.
A verified-data ledger, where every opinion writes its figures back as records you can prove.
And behind both, a verifier workflow that is accreditation-grade by construction.
The platform shows. People decide.`,
      music: 'Bed opens up: percussion enters on "one workspace".',
      notes: 'Colour returns on the cut to C02. The flow animation M03 at the end is the bridge into the montage; its five words become the section labels.',
    },
    {
      id: 'T5', title: 'Montage — Request and Run', dur: 24, kind: 'montage',
      visual: [
        { asset: 'C04', secs: 5, text: 'f-request' },
        { asset: 'C03', secs: 4, text: 'f-next-action' },
        { asset: 'C10', secs: 5, text: 'f-evidence' },
        { asset: 'C08', secs: 4, text: 'f-agreement' },
        { asset: 'C13', secs: 6, text: 'f-findings' },
      ],
      vo: `Request in five steps.
One next action, always.
Evidence in versioned slots, each with a hash.
An agreement accepted with a name, a time and a hash.
Findings that block the opinion until they are closed.`,
      music: 'Montage pulse: a clear beat; cut on the beat.',
      notes: 'One label chip per clip, bottom-left, in for the full clip. Subtle push-in (103 → 108 %) on each clip. Hard cuts, no dissolves.',
    },
    {
      id: 'T6', title: 'Montage — Decide', dur: 26, kind: 'montage',
      visual: [
        { asset: 'C15', secs: 5, text: 'f-materiality' },
        { asset: 'C16', secs: 4, text: 'f-ack' },
        { asset: 'C17', secs: 5, text: 'f-involved' },
        { asset: 'C18', secs: 12, text: 'f-issuance' },
      ],
      vo: `Materiality, aggregated against every misstatement.
A warning that must be acknowledged in writing.
A decision refused to anyone who touched the figures.
And issuance in eight visible steps: lock, hash, render, code, write back, notify.`,
      music: 'Beat continues; drop the percussion for the last 3 s of C18 so the "Opinion issued" moment breathes.',
      notes: 'The issuance clip is the hero of the teaser: slow the cursor, keep the whole dialog in frame, let the ticks land in rhythm with the list in the narration.',
    },
    {
      id: 'T7', title: 'Montage — Keep and Prove', dur: 26, kind: 'montage',
      visual: [
        { asset: 'C23', secs: 6, text: 'f-decarb' },
        { asset: 'C24', secs: 6, text: 'f-units' },
        { asset: 'C19', secs: 5, text: 'f-public' },
        { asset: 'C20', secs: 5, text: 'f-withdrawn' },
        { asset: 'T10', secs: 4, text: 'Nothing disappears.' },
      ],
      vo: `Verified numbers live as records. Four hundred thousand decarb units, computed on the volume you actually bought, with a unit mismatch refused on sight.
Anyone can check a statement. Including the ones that were withdrawn.
Nothing disappears.`,
      music: 'Beat continues.',
      notes: 'Zoom 110 % on the "Unit mismatch" refusal and on the red withdrawn banner. T10 is a hard cut to ink: the three status chips, no motion.',
    },
    {
      id: 'T8', title: 'Montage — Accreditation-grade', dur: 16, kind: 'montage',
      visual: [
        { asset: 'C26', secs: 6, text: 'f-hard-block' },
        { asset: 'C28', secs: 5, text: 'f-cases' },
        { asset: 'C32', secs: 5, text: 'f-admin' },
      ],
      vo: `Competence and rotation, checked at nomination.
Complaints, handled outside the involved set.
An administrator who sees everything and changes nothing.`,
      music: 'Beat continues, then a half-bar rest before the next scene.',
      notes: 'Zoom on the red "Blocked" line in C26 and on the "Platform administrator only" badge in C32.',
    },
    {
      id: 'T9', title: 'The roadmap is in the product', dur: 22, kind: 'long',
      visual: [
        { asset: 'C37', secs: 10, text: 'Integrations: API keys, MCP server, webhooks, spreadsheet import in preview; "I’m interested".' },
        { asset: 'M04', secs: 12, text: 'Now · Next · Later' },
      ],
      vo: `And the roadmap is in the product. API, MCP server, AI evidence assistant, report exports, then continuous assurance.
Visible today. Switched on when you are ready. A flag, not a rewrite.`,
      music: 'Beat resolves to the melodic bed.',
      notes: 'Let the Now/Next/Later columns fill in time with the narration.',
    },
    {
      id: 'T10', title: 'Close', dur: 14, kind: 'card',
      visual: [{ asset: 'M05', secs: 14, text: 'VERIFASSUR_X · Your digital platform for now and the future · demo URL · Demonstration with fictional data · contact' }],
      vo: `VERIFASSUR_X. Sustainability assurance, verified in one workspace.
See it live.`,
      music: 'Final chord; tail out over the end card.',
      notes: 'Hold the end card 6 s after the last word. Captions off for the end card.',
    },
  ],
}

export const full = {
  id: 'full',
  title: 'VERIFASSUR_X — Full product film',
  target: 'about 10:00',
  audience: 'Website, investor and client meetings, onboarding of partners. The viewer may pause; the chapters are self-contained.',
  scenes: [
    {
      id: 'F1', title: 'Cold open — three questions', dur: 22, kind: 'long',
      visual: [
        { asset: 'M01', secs: 9, text: 'Who verified this number? / To what level? / Can anyone check?' },
        { asset: 'C19', secs: 13, text: 'Public verification page: code typed, green banner, slow scroll to the hashes.' },
      ],
      vo: `Who verified this number? To what level of assurance? And can anyone check?
Today, most verification statements live in an inbox. They cannot answer.
This one can. A code, a status, the figures, and the hash of every document behind them.`,
      music: 'Silence for 4 s, one sustained low note, bed starts on the cut to the public page.',
      notes: 'Same cold open as the teaser, three seconds longer on the public page so the scroll reaches the hashes.',
    },
    {
      id: 'F2', title: 'Title', dur: 8, kind: 'card',
      visual: [{ asset: 'T02', secs: 8, text: 'VERIFASSUR_X · The digital platform for sustainability assurance' }],
      vo: '',
      music: 'Bed rises; soft hit on the logo.',
      notes: 'Dissolve in, hold, dip to ink.',
    },
    {
      id: 'F3', title: 'The problem — three audiences', dur: 50, kind: 'long',
      visual: [
        { asset: 'M02', secs: 6, text: 'E-mail. Folders. PDFs. → Assurance is a black box.' },
        { asset: 'T04', secs: 25, text: 'Three columns revealed one at a time: Clients · Verifiers · Everyone downstream' },
        { asset: 'C40', secs: 9, text: 'Public page in dark mode, desaturated, with a slow push-in.' },
        { asset: 'EDIT', secs: 10, text: 'On ink: "Is this still current?" in Fraunces, then the answer fades in underneath: a verification code.' },
      ],
      vo: `An assurance engagement today runs on e-mail, shared folders and spreadsheets.
For the client, it is a black box. Which document is missing? Which finding is blocking the opinion? When will the statement arrive? Nobody can say without asking.
For the verifier, accreditation is a paper exercise. Impartiality, competence, independent review, separation of decisions: proven after the fact, with checklists and filing. A rule that lives in a procedure can be skipped.
And for everyone downstream, buyers, lenders, programmes, regulators, a claim is only as good as its proof. A PDF cannot answer the question "is this still current?"`,
      music: 'Sparse bed, no percussion. Nothing under the last question.',
      notes: 'This is the longest spoken segment; keep the visuals slow. Reveal each column of T04 exactly when its audience is named. The final question sits alone on ink for 2 s before the answer appears.',
    },
    {
      id: 'F4', title: 'What VERIFASSUR_X is', dur: 50, kind: 'long',
      visual: [
        { asset: 'M06', secs: 7, text: 'Two things in one product' },
        { asset: 'C02', secs: 12, text: 'Client home in full colour: progress, Needs your action, Waiting on VERIFASSUR, Verified records.' },
        { asset: 'C22', secs: 8, text: 'GHG inventory 2025: lines per gas, declared vs verified, evidence chips.' },
        { asset: 'C07', secs: 8, text: 'Team nomination step with COI statuses (verifier side).' },
        { asset: 'EDIT', secs: 10, text: 'On ink, two lines: "VERIFASSUR_X verifies." / "The platform shows. People decide."' },
        { asset: 'M03', secs: 5, text: 'Request → Run → Decide → Keep → Prove' },
      ],
      vo: `VERIFASSUR_X replaces the black box with one workspace.
It is two things in one product. A client portal, where a company requests, follows and archives the independent verification of its GHG inventory, its product carbon footprints, its value-chain decarbonisation and its carbon projects.
And a verified-data ledger, where every opinion writes its figures back as records the company can prove, year after year.
Behind both sits the verifier workflow that makes the work accreditation-grade by construction.
VERIFASSUR_X verifies. It never issues or trades carbon units, and it never computes a client's emissions.
The platform shows. People decide.`,
      music: 'Bed opens: percussion enters on "one workspace".',
      notes: 'Colour returns on the cut to C02. M03 at the end introduces the five chapter words that structure the next five minutes.',
    },
    {
      id: 'F5', title: 'Chapter 1 — Request', dur: 45, kind: 'montage',
      visual: [
        { asset: 'CH1', secs: 3, text: '1 · Request' },
        { asset: 'C04', secs: 10, text: 'f-request' },
        { asset: 'C05', secs: 6, text: 'f-preform' },
        { asset: 'C06', secs: 7, text: 'f-triage' },
        { asset: 'C07', secs: 6, text: 'f-coi' },
        { asset: 'C08', secs: 7, text: 'f-agreement' },
        { asset: 'C42', secs: 6, text: 'f-renewal' },
      ],
      vo: `Chapter one. Request.
A five-step wizard turns a need into a structured engagement: project, service type and standard, scope and period, level of assurance, attachments. The template already lists the documents it will require.
A generated pre-engagement form lets the verifier triage immediately.
Technical scope and impartiality are approved. The team is nominated, and every member declares conflicts of interest before the service even opens for them.
The service agreement is accepted in the platform: name, time, and the hash of the document.
And next year, the renewal is pre-filled from this year.`,
      music: 'Montage pulse begins. Cut on the beat.',
      notes: 'Chapter card 3 s with a whip of the flow bar. Label chips bottom-left. Push-in on every clip. Lower-third on the first appearance of Helena (C06) and Amina (C08).',
    },
    {
      id: 'F6', title: 'Chapter 2 — Run', dur: 50, kind: 'montage',
      visual: [
        { asset: 'CH2', secs: 3, text: '2 · Run' },
        { asset: 'C09', secs: 6, text: 'f-phases' },
        { asset: 'C03', secs: 5, text: 'f-next-action' },
        { asset: 'C10', secs: 9, text: 'f-evidence' },
        { asset: 'C11', secs: 3, text: '(no label: the Accept toast)' },
        { asset: 'C12', secs: 5, text: 'f-documents' },
        { asset: 'C13', secs: 8, text: 'f-findings' },
        { asset: 'C14', secs: 4, text: '(no label: the blocking banner disappears)' },
        { asset: 'C36', secs: 7, text: 'f-timeline' },
      ],
      vo: `Chapter two. Run.
Three phases, Contracting, Planning, Execution, driven by a workflow template for the service type.
There is always exactly one next action per engagement. Orange means it is on you. Blue means VERIFASSUR is working on it. It is computed from the workflow, never typed by hand.
Every step has its required document slots. Here the auditor rejected a sample pack with a reason. The client re-uploads: version two, new hash, provenance line. Nothing is ever overwritten.
Findings run as threads with attachments. A corrective action request blocks the opinion until it is closed.
And the timeline shows planned against actual, with a tick for every transition.`,
      music: 'Pulse continues.',
      notes: 'Zoom on the orange pill (C03), on "Submitted · v2" and its hash (C10), on the blocking banner (C13). Lower-thirds for Priya (C11) and Pieter (C13).',
    },
    {
      id: 'F7', title: 'Chapter 3 — Decide', dur: 75, kind: 'montage',
      visual: [
        { asset: 'CH3', secs: 3, text: '3 · Decide' },
        { asset: 'C15', secs: 10, text: 'f-materiality' },
        { asset: 'C16', secs: 10, text: 'f-ack' },
        { asset: 'C17', secs: 10, text: 'f-involved' },
        { asset: 'C18', secs: 30, text: 'f-issuance' },
        { asset: 'C34', secs: 12, text: 'f-log' },
      ],
      vo: `Chapter three. Decide. This is where accreditation stops being paperwork.
Materiality is set in planning and approved by a manager. Every difference the team finds is aggregated against it. Here the misstatement exceeds the threshold while the draft opinion is unqualified, so the platform raises a warning. A warning, not a block. The independent reviewer must acknowledge it in writing. The judgement stays human.
Now the decision. Helena is a manager, but she entered a verified value on this engagement. That puts her in the involved set, so the decision is refused to her. The button is not hidden. It is disabled, with the reason, and the name of the manager who can decide.
Marc, outside the involved set, acknowledges, approves, and issues.
Lock the documents. Hash them. Render the statement. Create the public code. Write the verified figures to the client's records. Notify everyone. Eight steps, each visibly completing.
Every decision lands in the Service Log: who, when, why.`,
      music: 'Pulse continues through C17; drop the percussion for the issuance (C18) and let a slow melodic line carry the eight ticks; pulse returns on C34.',
      notes: 'Longer clips here on purpose: this chapter carries the message. Zoom on the greyed checklist item (C16), on the disabled button and its notice (C17). Lower-thirds for Tomas, Helena and Marc. The issuance is the hero of the film: the narration list ("Lock the documents. Hash them…") should land one phrase per tick.',
    },
    {
      id: 'F8', title: 'Chapter 4 — Keep', dur: 50, kind: 'montage',
      visual: [
        { asset: 'CH4', secs: 3, text: '4 · Keep' },
        { asset: 'C22', secs: 10, text: 'f-inventory' },
        { asset: 'C23', secs: 10, text: 'f-decarb' },
        { asset: 'C24', secs: 12, text: 'f-units' },
        { asset: 'C25', secs: 10, text: 'f-history' },
        { asset: 'EDIT', secs: 5, text: 'On ink: "Numbers, not PDFs."' },
      ],
      vo: `Chapter four. Keep.
Verified numbers live as records, not as PDFs. GHG inventories by year, scope, category and gas, with biogenic CO2 and removals reported separately, declared next to verified, evidence on every line.
A decarb unit is one tonne of CO2e between a baseline and a project outcome in the value chain, computed on the volume the client actually bought. Baseline three point four, project three point zero, one million tonnes: four hundred thousand units.
Units are explicit. Change tonnes to litres and the platform refuses. A kilo-to-tonne slip can never inflate a claim by a thousand.
Every record carries its level of assurance, its statement, and its history.`,
      music: 'Pulse continues, lighter.',
      notes: 'Zoom on 400,000 (C23), on the red "Unit mismatch" (C24), on the "Assurance withdrawn" badge and the history drawer (C25).',
    },
    {
      id: 'F9', title: 'Chapter 5 — Prove', dur: 47, kind: 'montage',
      visual: [
        { asset: 'CH5', secs: 3, text: '5 · Prove' },
        { asset: 'C19', secs: 12, text: 'f-public' },
        { asset: 'C20', secs: 10, text: 'f-withdrawn' },
        { asset: 'C21', secs: 8, text: 'f-superseded' },
        { asset: 'C43', secs: 8, text: '(no label: the statement card and the history on the verifier side)' },
        { asset: 'T10', secs: 6, text: 'Nothing disappears.' },
      ],
      vo: `Chapter five. Prove.
Anyone can check a statement without an account: opinion type, level of assurance, materiality, the verified figures, the hash of every locked document.
And the page tells the truth about time. This statement was withdrawn because of an error. The banner says so, the figures are gone, the code still resolves. This one was superseded by a revision, and links to its replacement.
A statement never disappears. The records that relied on it are re-marked the same way.`,
      music: 'Pulse thins out; the last line sits on a held chord.',
      notes: 'Zoom on the red banner (C20) and the amber link (C21). T10 is a hard cut to ink.',
    },
    {
      id: 'F10', title: 'Accreditation-grade by construction', dur: 76, kind: 'montage',
      visual: [
        { asset: 'CH6', secs: 3, text: '6 · Accreditation-grade by construction' },
        { asset: 'T07', secs: 8, text: 'Standards → controls enforced by the workflow' },
        { asset: 'C26', secs: 10, text: 'f-competence' },
        { asset: 'C27', secs: 5, text: '(no label: competence page, expiring certificate)' },
        { asset: 'C28', secs: 9, text: 'f-cases' },
        { asset: 'C30', secs: 9, text: 'f-override' },
        { asset: 'C31', secs: 5, text: 'f-locked' },
        { asset: 'C32', secs: 9, text: 'f-admin' },
        { asset: 'C33', secs: 6, text: '(no label: read-only banner, break-glass)' },
        { asset: 'C35', secs: 6, text: 'f-audit' },
        { asset: 'C39', secs: 6, text: 'f-templates' },
      ],
      vo: `ISO 17029, 14065 and 14066 ask for impartiality, competence, independent review, rotation, and complaint handling. In VERIFASSUR_X those rules live in the workflow, not in a binder.
Every nomination runs the competence and rotation checks from the template. A gap is a warning the manager can override with a written reason, counted in the statistics. A missing independent-reviewer qualification is a block that no reason can lift.
Complaints and appeals have targets, overdue flags, and a handler who is never in the involved set of the decision being appealed.
When the normal flow is stuck, a manager can override a step, but only with a reason, only in the log, and never on the gates the template locks: impartiality, the agreement, independent review, issuance.
Platform administration is separated from assurance. The administrator sees everything, including the money, and changes nothing. Every event is appended to an audit log.
The rules themselves are data: versioned templates, edited with a reason.
This is what an accreditation body audits.`,
      music: 'Pulse returns, steady and low.',
      notes: 'Zoom on "Blocked: no override lifts this rule" (C26), "Not offered (involved set)" (C28), the reason gate (C30), the greyed Force complete (C31), "Platform administrator only" (C32). Lower-third for Sam on C32.',
    },
    {
      id: 'F11', title: 'What makes it different', dur: 36, kind: 'long',
      visual: [
        { asset: 'T08', secs: 26, text: 'Six differentiators, revealed one line at a time in the editor' },
        { asset: 'C40', secs: 10, text: 'f-dark' },
      ],
      vo: `Six things make it different.
Client-first: it leads with what you must do, what you got, and what it cost.
Numbers, not PDFs.
Rules in the workflow, not in a binder.
Conflicts are shown, not hidden.
Nothing disappears.
And the roadmap is in the product.`,
      music: 'Melodic bed, no percussion.',
      notes: 'Reveal each line of T08 as it is spoken (six keyframes). The dark-mode B-roll under the last line is a breath before the roadmap.',
    },
    {
      id: 'F12', title: 'The future — now, next, later', dur: 66, kind: 'long',
      visual: [
        { asset: 'M04', secs: 14, text: 'Now · Next · Later' },
        { asset: 'C37', secs: 14, text: 'f-previews' },
        { asset: 'C38', secs: 8, text: 'f-flags' },
        { asset: 'EDIT', secs: 18, text: 'On ink, three lines fading in: "Continuous assurance on monthly data streams" / "Verifiable credentials for opinions" / "A verified figure that travels with the product" (digital product passport)' },
        { asset: 'EDIT', secs: 12, text: 'On ink: "A flag, not a rewrite." with a small JSON-schema snippet rendered faintly behind it' },
      ],
      vo: `Now, next, later.
Now: a complete, accreditation-grade engagement and ledger.
Next, visible today as previews: spreadsheet import, a REST API with per-client keys, and an MCP server so a client's carbon-accounting software, or its AI agent, can submit data and answer findings directly. An AI evidence assistant that classifies uploads and drafts findings for the auditor to decide. Legal e-signature. CSRD and ISO report exports. Registry links. Every preview has an "I'm interested" button, so demand is measured before anything is built.
Later: continuous assurance on monthly data streams, digital MRV connectors, verifiable credentials for opinions, a digital product passport export. Assurance becomes a live signal instead of an annual event, and a verified figure travels with the product.
Every form is already backed by a published schema the API accepts unchanged. Switching a capability on is a flag, not a rewrite.`,
      music: 'Bed builds gently to its widest point on "travels with the product", then settles.',
      notes: 'M04 columns fill in time with "now", "next", "later". Keep the "Later" lines on ink slow and generous; this is the investor beat.',
    },
    {
      id: 'F13', title: 'Proof you can click, and close', dur: 32, kind: 'long',
      visual: [
        { asset: 'C01', secs: 4, text: 'The persona grid on sign-in.' },
        { asset: 'C41', secs: 4, text: 'The Demo panel: thirteen personas, sixteen chapters.' },
        { asset: 'T12', secs: 10, text: '16 chapters · 13 personas · 3 client companies · 1 verification body · demo URL' },
        { asset: 'M05', secs: 14, text: 'End card: logo, tagline, URL, fictional-data line, contact' },
      ],
      vo: `Everything you have seen is live, in a clickable demo with fictional data: sixteen chapters, thirteen personas, three client companies and one verification body.
VERIFASSUR_X. The digital platform for sustainability assurance. GHG inventories, product footprints and value-chain decarbonisation, verified in one workspace.
Your digital platform, for now and the future.`,
      music: 'Final phrase and chord; tail out over the end card.',
      notes: 'Hold the end card 8 s after the last word. Captions off on the end card.',
    },
  ],
}
