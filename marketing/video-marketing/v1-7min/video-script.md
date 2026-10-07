# VERIFASSUR_X product video — script v1

Target length: about 7 minutes for the full cut. Tone: calm, confident, concrete. Speak slightly slower than conversation (about 130 words per minute). Every claim below is something the demo shows on screen; do not add claims the product does not make (no registry, no calculation engine, no AI that decides).

Recording source: the live demo at https://rbndchsn.github.io/digital-platform/ after **Reset demo**, 1440 × 900 window, light theme, presenter notes off. Persona switches happen through the floating **Demo** button (`Ctrl+.`); cut those moments in post or keep them as fast transitions.

Legend: **ON SCREEN** what the viewer sees · **DO** what you click · **SAY** narration · ⏱ running time.

---

## Scene 1 — The problem (⏱ 0:00–0:35)

**ON SCREEN**: Black slide with three words appearing one by one: *E-mail. Folders. PDFs.* Then cut to the client home page.

**DO**: Nothing yet; title card prepared in post. Then show `/` as **Ingrid Vos**.

**SAY**:
> An assurance engagement today runs on e-mail, shared folders and spreadsheets. The client does not know which document is missing, which finding is blocking the opinion, or when the statement will arrive. And when it arrives, it is a PDF. Every number in it gets re-typed into next year's report, the CSRD disclosure, and the buyer's questionnaire.
>
> VERIFASSUR_X replaces that with one workspace. This is what a client sees when they log in.

## Scene 2 — One next action (⏱ 0:35–1:15)

**ON SCREEN**: Client home: progress bars, notifications, the orange "Needs your action" card, "Waiting on VERIFASSUR", verified records tiles.

**DO**: Hover the orange pill; point at the verified records tiles with the level-of-assurance badge; click the orange pill to open the engagement.

**SAY**:
> Three things, in order: what is running, what is blocking me, what has been verified.
>
> Orange means it is on you. Blue means we are working on it. There is always exactly one next action per engagement, and it is computed from the workflow, never typed by hand.
>
> At the bottom, last year's verified scope 1, 2 and 3 totals and the verified decarb units, each with its level of assurance and the public code of the statement that verified it.

## Scene 3 — The engagement workspace and the evidence vault (⏱ 1:15–2:15)

**ON SCREEN**: Engagement overview (phase rail, next action, team, level of assurance, quote and invoice). Then the Phases tab with the rejected activity-data slot. Re-upload dialog. Switch to **Priya Natarajan**, accept the version.

**DO**: Open the engagement → Overview. Click the pill *Re-upload Activity data samples* → **Re-upload corrected version** → **Simulate upload**. `Ctrl+.` → Priya → same step → **Accept**.

**SAY**:
> Every engagement runs through three phases, Contracting, Planning and Execution, driven by a template for the service type. The template defines the steps, who owns them, the documents each step requires, the approvals and the checklists.
>
> Here the auditor rejected a sample pack with a reason. The client re-uploads. Version two, new hash, provenance line. Nothing is ever overwritten.
>
> On the verifier side, the auditor accepts the new version and the step can close. Every version, every decision, every timestamp is in the Service Log.

## Scene 4 — Materiality, and the decision nobody can take for you (⏱ 2:15–3:30)

**ON SCREEN**: Opinion tab of the Gouda footprint 2025 as **Tomas Lindqvist**: aggregation panel with the red gauge, inconsistency warning. Independent review dialog with the greyed materiality item until the acknowledgement is written. Then **Helena Brandt**: the disabled *Manager decision* button and the eligibility notice naming Marc. Then **Marc Lefèvre**: acknowledge, approve, issue; the animated issuance.

**DO**: `Ctrl+.` → chapter 13. Click **Independent review**, show the greyed item, type the acknowledgement, tick all, **Approve**. `Ctrl+.` → Helena → same page: hover the disabled button, show the notice. `Ctrl+.` → Marc → **Manager decision** → acknowledge, tick, **Approve** → **Issue opinion** twice. Let the eight steps run.

**SAY**:
> This is where accreditation stops being paperwork.
>
> Materiality was set in planning: five percent of the declared factor. Every difference the team found is aggregated against it. Here the misstatement exceeds the threshold while the draft opinion is unqualified, so the platform raises a warning. It is a warning, not a block. The reviewer must acknowledge it in writing. The judgement stays human.
>
> Now the decision. Helena is a manager, but she entered a verified value on this engagement. That puts her in the involved set, so the decision is refused to her. The button is not hidden; it is disabled, with the reason and the name of the manager who can decide. Nothing silent.
>
> Marc, outside the involved set, acknowledges the warning, approves, and issues. Lock the documents, hash them, render the statement, create the public code, write the verified figures back to the client's records, notify everyone. Eight steps, each visibly completing.

## Scene 5 — Prove it to anyone (⏱ 3:30–4:10)

**ON SCREEN**: The public verification page for the new statement. Then the withdrawn PCF 2024 page with the red banner and hidden figures. Then the superseded 2024 decarb page with the amber banner and the link.

**DO**: Click **Open public statement**. Then paste the PCF 2024 code into the lookup box (read it from `/engagements/svc_nw_pcf_2024/opinion` beforehand). Then the superseded code from `/engagements/svc_nw_decarb_2024/opinion`.

**SAY**:
> Anyone can check a statement without an account: opinion type, level of assurance, materiality, the verified figures, the hash of every locked document.
>
> And the page tells the truth about time. This statement was withdrawn last month because of an error in the statement. The banner says so, the figures are gone, the code still resolves. This one was superseded by a revision; the banner links to the replacement. A statement never disappears. The records that relied on it are re-marked the same way.

## Scene 6 — The ledger (⏱ 4:10–5:00)

**ON SCREEN**: GHG inventories list with the year chart and level badges. The milk decarb_unit record: baseline and project profiles, 400,000 units, the what-if with the unit mismatch refused. Emission factors with "Assurance withdrawn".

**DO**: `Ctrl+.` → chapter 7. Show `/records/inventories`, then `/records/decarb-units/dcu_nw_milk_2025`; in **What if…** change the unit to **L** → **Recompute** → unit mismatch; back to **kg** → 400 units. Then `/records/emission-factors`.

**SAY**:
> Verified numbers live as records, not as PDFs. Inventories by year, scope and gas, with biogenic CO2 and removals reported separately, declared next to verified.
>
> A decarb unit is one tonne of CO2e between a baseline and a project outcome in the value chain, computed on the volume the client actually bought. Baseline three point four, project three point zero, one million tonnes: four hundred thousand units. Units are explicit. Change tonnes to litres and the platform refuses; a kilo-to-tonne slip can never inflate a claim by a thousand.
>
> Every record carries its level of assurance, its statement, and its history, including the moment an assurance was withdrawn.

## Scene 7 — Competence, rotation, complaints (⏱ 5:00–5:50)

**ON SCREEN**: Atlas team nomination step: nominate dialog with the live check, the override reason, the hard block for a missing reviewer qualification. The Competence page. The complaints and appeals register with the overdue pill.

**DO**: `Ctrl+.` → chapter 16. **Nominate** → pick *Technical expert* for Jonas Weber: warnings and the reason field; pick *Independent reviewer* for Helena: block. Cancel. Show `/staff/competence`. Show `/staff/cases`, open the appeal, point at *Not offered (involved set)* in the assign dialog.

**SAY**:
> Who may do the work is checked before the work starts. Every nomination runs the competence and rotation rules from the template. A gap is a warning the manager can override with a written reason, counted in the statistics. A missing independent-reviewer qualification is a block no reason can lift.
>
> Competence profiles, validity, expiry reminders, rotation history, including engagements from before the platform.
>
> And when a client disagrees, there is a formal route: complaints and appeals with targets, overdue flags, and a handler who is never in the involved set of the decision being appealed. The complainant sees every stage and the outcome; the investigation notes stay internal.

## Scene 8 — Administration and the audit trail (⏱ 5:50–6:25)

**ON SCREEN**: Admin dashboard as **Sam Okafor**: governance tiles, money rollups. An engagement as Sam: read-only banner, no action controls. Service Log with the *Decisions and refusals* filter.

**DO**: `Ctrl+.` → chapter 11. Scroll to **Governance controls**. Open an engagement; show the banner. Then the Service Log of the Gouda engagement, filter *Decisions and refusals*.

**SAY**:
> Platform administration is separated from assurance decisions. Sam sees the whole firm, including the money, and cannot touch a single engagement.
>
> The governance tiles are live: refused decisions, refused overrides on locked steps, materiality warnings and their acknowledgements, revisions and withdrawals, open and overdue cases, expiring qualifications.
>
> And every one of those is a line in an append-only log, with who, when, and why. This is what an accreditation body audits.

## Scene 9 — The future, and the close (⏱ 6:25–7:00)

**ON SCREEN**: Integrations page with API keys, MCP server and webhooks in preview, "I'm interested". Then the staff Clients page with the interest signal. End card: logo, URL, contact.

**DO**: `Ctrl+.` → chapter 10. Click **I'm interested** on MCP server, register. `Ctrl+.` → Helena → `/staff/clients`. Cut to the end card.

**SAY**:
> The roadmap is in the product. API keys, an MCP server so a client's carbon-accounting software or its agent can submit data and answer findings, webhooks, an evidence assistant, report exports, registry links. Visible today, switched on when a client is ready, and demand is measured before anything is built.
>
> Every form is already backed by a published schema the API will accept unchanged. Switching a capability on is a flag, not a rewrite.
>
> VERIFASSUR_X. The digital platform for sustainability assurance: GHG inventories, product footprints and value-chain decarbonisation, verified in one workspace. See it live at the address on screen.

---

## Word count and pacing

About 900 words of narration for roughly 7 minutes at 130 words per minute. If the full cut runs long, trim scene 3 (the evidence vault) first; scenes 4 and 5 carry the message.

## Lines to avoid

- "Issues credits", "registry", "transfers", "claims": the platform verifies only.
- "Calculates your emissions": the client declares, the platform logs, checks and verifies.
- "The AI decides": the assistant is a preview and only proposes; people decide.
- Real company or person names: everything in the demo is fictional.
