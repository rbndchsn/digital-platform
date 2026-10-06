/**
 * PRD v0.3 governance fixtures (plan_v1 §3.2): materiality and misstatements with a live warning, a withdrawn
 * statement, a superseded statement after a revision, complaints and appeals, nomination checks and the audit
 * events that place people in the involved set. Runs after the storyline services and records exist.
 */
import type { CheckItem, Case, CaseNote, MaterialitySetting, Misstatement, NominationCheck, OpinionIteration, OpinionStatement, PostIssuanceEvent, RecordAssuranceHistory } from '@/domain/schemas'
import { templateFor } from '@/domain/workflow/templates'
import { aggregateMisstatements, thresholdAbs } from '@/domain/compute/materiality'
import { daysAgo } from '../clock'
import { publicCode, seedId } from '../ids'
import { ORG, USR, auditAt, userName } from './base'
import type { RecordTables } from './records'
import type { Scenario, ServiceCtx } from './scenario'
import { addHours } from './scenario'

export interface GovernanceTables {
  materialitySettings: MaterialitySetting[]
  misstatements: Misstatement[]
  postIssuanceEvents: PostIssuanceEvent[]
  recordAssuranceHistory: RecordAssuranceHistory[]
  cases: Case[]
  caseNotes: CaseNote[]
  nominationChecks: NominationCheck[]
}

export interface GovernanceInput {
  sc: Scenario
  records: RecordTables
  ctx: { nwPcf2024: ServiceCtx; nwDecarb2024: ServiceCtx; nwInv2025: ServiceCtx; nwDecarb2025: ServiceCtx; solVer2025: ServiceCtx; atlasDecarb2025: ServiceCtx; nwPcf2025: ServiceCtx }
}

export function buildGovernance({ sc, records, ctx }: GovernanceInput): GovernanceTables {
  const g: GovernanceTables = { materialitySettings: [], misstatements: [], postIssuanceEvents: [], recordAssuranceHistory: [], cases: [], caseNotes: [], nominationChecks: [] }
  const history = (orgId: string, type: RecordAssuranceHistory['record_type'], recordId: string, statementId: string, level: RecordAssuranceHistory['level_of_assurance'], event: RecordAssuranceHistory['event'], at: string) => g.recordAssuranceHistory.push({ id: seedId('rah'), org_id: orgId, record_type: type, record_id: recordId, statement_id: statementId, level_of_assurance: level, event, occurred_at: at })

  // Every verified record starts its history with the write-back of its statement (PRD FR-83).
  for (const inv of records.inventories) if (inv.assurance_ref && inv.verified_at) history(inv.org_id, 'inventory', inv.id, inv.assurance_ref, inv.level_of_assurance ?? 'reasonable', 'written_back', inv.verified_at)
  for (const ef of records.emissionFactors) if (ef.assurance_ref) history(ef.org_id, 'emission_factor', ef.id, ef.assurance_ref, ef.level_of_assurance ?? 'limited', 'written_back', sc.t.statements.find((s) => s.id === ef.assurance_ref)!.issued_at)
  for (const d of records.decarbRecords) if (d.assurance_ref) history(d.org_id, 'decarb_unit_record', d.id, d.assurance_ref, d.level_of_assurance ?? 'reasonable', 'written_back', sc.t.statements.find((s) => s.id === d.assurance_ref)!.issued_at)

  // ---------------------------------------------------------------- materiality on the ongoing verifications (FR-84)
  const materiality = (c: ServiceCtx, base: MaterialitySetting['assertion_base'], declared: number, unit: string, approvedDaysAgo: number | null, pct = 5): MaterialitySetting => {
    const tpl = templateFor(c.service.service_type).materiality_defaults!
    const at = daysAgo((approvedDaysAgo ?? 10) + 2, 10, 30)
    const row: MaterialitySetting = { ...auditAt(at, USR.tl), id: seedId('mat'), service_id: c.service.id, level_of_assurance: c.service.level_of_assurance, assertion_base: base, assertion_declared_value: declared, assertion_unit: unit, threshold_pct: pct, threshold_abs: thresholdAbs(pct, declared), basis: tpl.basis, basis_note: tpl.basis_note, qualitative_json: [...tpl.qualitative], template_defaults_json: { assertion_base: tpl.assertion_base, threshold_pct: tpl.threshold_pct, basis: tpl.basis }, status: approvedDaysAgo != null ? 'approved' : 'draft', set_by: USR.tl, approved_by: approvedDaysAgo != null ? USR.mgr : null, approved_at: approvedDaysAgo != null ? daysAgo(approvedDaysAgo, 15, 0) : null }
    g.materialitySettings.push(row)
    sc.audit({ org_id: c.service.org_id, service_id: c.service.id, actor_user_id: USR.tl, event_type: 'materiality.changed', entity_type: 'materiality_setting', entity_id: row.id, summary: `Materiality set by ${userName(USR.tl)}: ${pct} % of ${base.replace(/_/g, ' ')} (${row.threshold_abs} ${unit})`, before_json: null, after_json: { assertion_base: base, threshold_pct: pct }, occurred_at: at })
    if (approvedDaysAgo != null) sc.audit({ org_id: c.service.org_id, service_id: c.service.id, actor_user_id: USR.mgr, event_type: 'materiality.approved', entity_type: 'materiality_setting', entity_id: row.id, summary: `Materiality approved by ${userName(USR.mgr)}: ${pct} % of ${base.replace(/_/g, ' ')} (${row.threshold_abs} ${unit})`, before_json: { status: 'draft' }, after_json: { status: 'approved' }, occurred_at: row.approved_at! })
    return row
  }
  const inv2025 = records.inventories.find((i) => i.year === 2025)!
  materiality(ctx.nwInv2025, 'total_gross_tco2e', inv2025.declared_totals_json?.gross_tco2e ?? 0, 'tCO2e', 20)
  const milk2025 = records.decarbRecords.find((d) => d.id === 'dcu_nw_milk_2025')!
  materiality(ctx.nwDecarb2025, 'reduction_units', milk2025.declared_reduction_units ?? 400_000, 'tCO2e', 40)
  const gouda2025 = records.emissionFactors.find((e) => e.product_name.startsWith('Gouda') && e.year === 2025)!
  const matPcf = materiality(ctx.nwPcf2025, 'ef_value', gouda2025.declared_value, 'kgCO2e/kg', 12)

  // ---------------------------------------------------------------- chapter 13: the PCF 2025 service with a live warning (FR-85–87)
  // Helena entered the verified value: that is verification work, so she joins the involved set (FR-77, FR-79).
  const helenaEditAt = daysAgo(6, 15, 20)
  sc.audit({ org_id: ORG.northwind, service_id: ctx.nwPcf2025.service.id, actor_user_id: USR.mgr, event_type: 'record.verified_value_edited', entity_type: 'emission_factor', entity_id: gouda2025.id, summary: `Verified value entered for ${gouda2025.product_name} ${gouda2025.year}: 9.4 kgCO2e/kg (rennet, cultures and brine inputs omitted from the declared boundary)`, before_json: { verified_value: null }, after_json: { verified_value: 9.4 }, occurred_at: helenaEditAt })
  const mis1: Misstatement = { ...auditAt(helenaEditAt, USR.mgr), id: seedId('mis'), service_id: ctx.nwPcf2025.service.id, org_id: ORG.northwind, iteration_id: null, finding_id: null, record_type: 'emission_factor', record_id: gouda2025.id, record_line_id: null, source: 'system', direction: 'understatement', amount: 0.5, amount_unit: 'kgCO2e/kg', nature: 'quantitative', material_candidate: false, description: `${gouda2025.product_name} ${gouda2025.year}: declared 8.9 kgCO2e/kg, verified 9.4 kgCO2e/kg (rennet, cultures and brine inputs omitted from the declared boundary)`, status: 'confirmed', dismiss_reason: null, corrected: false, corrected_revision_ref: null, confirmed_by: USR.tl, confirmed_at: addHours(helenaEditAt, 3) }
  const mis2: Misstatement = { ...auditAt(daysAgo(5, 9, 10), USR.aud), id: seedId('mis'), service_id: ctx.nwPcf2025.service.id, org_id: ORG.northwind, iteration_id: null, finding_id: null, record_type: 'emission_factor', record_id: gouda2025.id, record_line_id: null, source: 'manual', direction: 'overstatement', amount: 0, amount_unit: 'kgCO2e/kg', nature: 'qualitative', material_candidate: false, description: 'Allocation between cheese and whey documented with 2024 mass balances; 2025 figures requested (CL).', status: 'confirmed', dismiss_reason: null, corrected: false, corrected_revision_ref: null, confirmed_by: USR.aud, confirmed_at: daysAgo(5, 9, 10) }
  g.misstatements.push(mis1, mis2)
  sc.audit({ org_id: ORG.northwind, service_id: ctx.nwPcf2025.service.id, actor_user_id: null, event_type: 'misstatement.proposed', entity_type: 'misstatement', entity_id: mis1.id, summary: `Misstatement proposed by the platform: understatement of 0.5 kgCO2e/kg — ${mis1.description}`, before_json: null, after_json: { status: 'proposed' }, occurred_at: helenaEditAt })
  sc.audit({ org_id: ORG.northwind, service_id: ctx.nwPcf2025.service.id, actor_user_id: USR.tl, event_type: 'misstatement.confirmed', entity_type: 'misstatement', entity_id: mis1.id, summary: `Misstatement confirmed by ${userName(USR.tl)}: ${mis1.description}`, before_json: { status: 'proposed' }, after_json: { status: 'confirmed' }, occurred_at: mis1.confirmed_at! })
  sc.audit({ org_id: ORG.northwind, service_id: ctx.nwPcf2025.service.id, actor_user_id: USR.aud, event_type: 'misstatement.confirmed', entity_type: 'misstatement', entity_id: mis2.id, summary: `Misstatement registered by ${userName(USR.aud)}: qualitative — ${mis2.description}`, before_json: null, after_json: { status: 'confirmed' }, occurred_at: mis2.confirmed_at! })
  const itPcf = sc.addIteration(ctx.nwPcf2025, { no: 1, status: 'independent_review', daysAgo: 4, opinionType: 'unqualified', narrative: 'The product carbon footprint of Gouda 48+ (1 kg wheel) for 2025 is prepared in accordance with ISO 14067:2018.', figures: [{ key: `ef_${gouda2025.id}`, label: gouda2025.product_name, value: 9.4, unit: 'kgCO2e/kg' }] })
  const agg = aggregateMisstatements(g.misstatements.filter((m) => m.service_id === ctx.nwPcf2025.service.id), matPcf, 'unqualified')
  itPcf.aggregation_json = { ...agg, snapshot_at: itPcf.submitted_for_ir_at! }
  itPcf.materiality_warning = agg.warning
  mis1.iteration_id = itPcf.id
  mis2.iteration_id = itPcf.id
  sc.audit({ org_id: ORG.northwind, service_id: ctx.nwPcf2025.service.id, actor_user_id: USR.tl, event_type: 'materiality.warning_raised', entity_type: 'opinion_iteration', entity_id: itPcf.id, summary: `Inconsistency warning on iteration 1: ${agg.warning_reason}`, before_json: null, after_json: itPcf.aggregation_json, occurred_at: itPcf.submitted_for_ir_at! })
  sc.notify(USR.ir, ORG.verifassur, 'materiality_warning', `Materiality warning on ${ctx.nwPcf2025.service.reference}`, `${agg.warning_reason} The reviewer and the decision-maker must acknowledge it with a comment.`, ctx.nwPcf2025.service.id, itPcf.submitted_for_ir_at!)
  sc.notify(USR.mgr2, ORG.verifassur, 'materiality_warning', `Materiality warning on ${ctx.nwPcf2025.service.reference}`, `${agg.warning_reason} Helena Brandt edited a verified value on this service and cannot take the decision; it falls to you.`, ctx.nwPcf2025.service.id, itPcf.submitted_for_ir_at!)

  // ---------------------------------------------------------------- chapter 14a: the PCF 2024 statement withdrawn (FR-90)
  const stPcf2024 = sc.t.statements.find((s) => s.service_id === ctx.nwPcf2024.service.id)!
  const openedAt = daysAgo(25, 10, 0)
  const withdrawnAt = daysAgo(20, 16, 30)
  const reason = 'Allocation factor misapplied to Gouda 48+ (whey co-product treated as waste); the 2024 factor is understated by about 7 %, above materiality. Discovered during the 2025 engagement.'
  const evWithdraw: PostIssuanceEvent = { ...auditAt(openedAt, USR.mgr), id: seedId('pie'), service_id: ctx.nwPcf2024.service.id, statement_id: stPcf2024.id, trigger: 'verifier', case_id: null, description: 'Boundary and allocation error found while verifying the 2025 Gouda factor affects the issued 2024 factors.', evidence_json: [], status: 'closed', outcome: 'withdraw', decision_reason: reason, opened_by: USR.mgr, opened_at: openedAt, decided_by: USR.mgr2, decided_at: withdrawnAt, closed_at: withdrawnAt, replacement_iteration_id: null, external_notification_json: { to: 'Client and the two retailers who received the 2024 factor sheet', when: addHours(withdrawnAt, 20), how: 'Registered letter and e-mail from the scheme manager', by: USR.mgr } }
  g.postIssuanceEvents.push(evWithdraw)
  stPcf2024.status = 'withdrawn'
  stPcf2024.withdrawn_at = withdrawnAt
  stPcf2024.withdrawn_by = USR.mgr2
  stPcf2024.withdrawal_reason = reason
  stPcf2024.withdrawal_public_category = 'error_in_statement'
  for (const ef of records.emissionFactors.filter((e) => e.service_id === ctx.nwPcf2024.service.id)) {
    ef.status = 'withdrawn'
    ef.assurance_status = 'withdrawn'
    history(ef.org_id, 'emission_factor', ef.id, stPcf2024.id, ef.level_of_assurance ?? 'limited', 'withdrawn', withdrawnAt)
    sc.audit({ org_id: ORG.northwind, service_id: ctx.nwPcf2024.service.id, actor_user_id: null, event_type: 'record.assurance_withdrawn', entity_type: 'emission_factor', entity_id: ef.id, summary: `${ef.product_name} ${ef.year}: assurance withdrawn (statement withdrawn)`, before_json: { status: 'verified' }, after_json: { status: 'withdrawn' }, occurred_at: withdrawnAt })
  }
  sc.audit({ org_id: ORG.northwind, service_id: ctx.nwPcf2024.service.id, actor_user_id: USR.mgr, event_type: 'statement.post_issuance_opened', entity_type: 'post_issuance_event', entity_id: evWithdraw.id, summary: `Post-issuance event opened on statement ${stPcf2024.public_code} by ${userName(USR.mgr)} (trigger: verifier): ${evWithdraw.description}`, before_json: null, after_json: { trigger: 'verifier', status: 'open' }, occurred_at: openedAt })
  sc.audit({ org_id: ORG.northwind, service_id: ctx.nwPcf2024.service.id, actor_user_id: USR.mgr2, event_type: 'statement.post_issuance_decided', entity_type: 'post_issuance_event', entity_id: evWithdraw.id, summary: `Post-issuance event on ${stPcf2024.public_code} decided by ${userName(USR.mgr2)} (outside the involved set): withdraw — ${reason}`, reason, before_json: { status: 'open' }, after_json: { status: 'decided', outcome: 'withdraw' }, occurred_at: withdrawnAt })
  sc.audit({ org_id: ORG.northwind, service_id: ctx.nwPcf2024.service.id, actor_user_id: USR.mgr2, event_type: 'statement.withdrawn', entity_type: 'opinion_statement', entity_id: stPcf2024.id, summary: `Statement ${stPcf2024.public_code} withdrawn by ${userName(USR.mgr2)} (error_in_statement); 2 records marked "assurance withdrawn" — ${reason}`, reason, before_json: { status: 'issued' }, after_json: { status: 'withdrawn', public_category: 'error_in_statement' }, occurred_at: withdrawnAt })
  sc.notify(USR.nwAdmin, ORG.northwind, 'statement_withdrawn', `Statement ${stPcf2024.public_code} withdrawn`, 'VERIFASSUR withdrew the 2024 product footprint opinion. The milk and Gouda factors now show "assurance withdrawn"; the public page carries a withdrawal notice. Reason category: error in the statement.', ctx.nwPcf2024.service.id, withdrawnAt)
  sc.notify(USR.nwViewer, ORG.northwind, 'statement_withdrawn', `Statement ${stPcf2024.public_code} withdrawn`, 'The 2024 product emission factors lost their assurance. Do not use them in external reporting until the 2025 opinion is issued.', ctx.nwPcf2024.service.id, withdrawnAt, true)

  // ---------------------------------------------------------------- chapter 14b: the 2024 decarb_units statement superseded after a revision (FR-89)
  const st1 = sc.t.statements.find((s) => s.service_id === ctx.nwDecarb2024.service.id)!
  const milk2024 = records.decarbRecords.find((d) => d.service_id === ctx.nwDecarb2024.service.id)!
  const revOpened = daysAgo(150, 9, 0)
  const revDecided = daysAgo(148, 11, 0)
  const revReason = 'Northwind reported a corrected attributed volume for 2024: 880,000 t delivered against 900,000 t contracted. The verified units must be restated.'
  const evRevise: PostIssuanceEvent = { ...auditAt(revOpened, USR.mgr), id: seedId('pie'), service_id: ctx.nwDecarb2024.service.id, statement_id: st1.id, trigger: 'client', case_id: null, description: 'Client reported that 2024 delivery statements total 880,000 t, not the 900,000 t in the purchase contracts used at verification.', evidence_json: [], status: 'closed', outcome: 'revise', decision_reason: revReason, opened_by: USR.mgr, opened_at: revOpened, decided_by: USR.mgr2, decided_at: revDecided, closed_at: null, replacement_iteration_id: null, external_notification_json: null }
  const matDecarb2024 = materiality(ctx.nwDecarb2024, 'reduction_units', 90_000, 'tCO2e', 262)
  const misVol: Misstatement = { ...auditAt(daysAgo(140, 10, 0), USR.aud), id: seedId('mis'), service_id: ctx.nwDecarb2024.service.id, org_id: ORG.northwind, iteration_id: null, finding_id: null, record_type: 'decarb_unit_record', record_id: milk2024.id, record_line_id: null, source: 'system', direction: 'overstatement', amount: 2_000, amount_unit: 'tCO2e', nature: 'quantitative', material_candidate: false, description: 'Raw milk 2024: declared 90,000 reduction units on 900,000 t; verified 88,000 units on 880,000 t delivered', status: 'confirmed', dismiss_reason: null, corrected: false, corrected_revision_ref: null, confirmed_by: USR.tl, confirmed_at: daysAgo(139, 9, 0) }
  g.misstatements.push(misVol)
  sc.audit({ org_id: ORG.northwind, service_id: ctx.nwDecarb2024.service.id, actor_user_id: USR.aud, event_type: 'record.verified_value_edited', entity_type: 'decarb_unit_record', entity_id: milk2024.id, summary: 'Verified values entered for Raw milk 2024: 88000 reduction, 0 removal units (restated on 880,000 t delivered)', before_json: { reduction: 90_000 }, after_json: { reduction: 88_000 }, occurred_at: daysAgo(140, 10, 0) })
  const it2 = sc.addIteration(ctx.nwDecarb2024, { no: 2, status: 'approved', daysAgo: 135, opinionType: 'unqualified', narrative: 'Revised statement: the 2024 decarb_units are quantified in accordance with ISO 14064-2:2019 on the attributed volume of 880,000 t of raw milk actually delivered.', figures: [{ key: 'reduction_units', label: 'Reduction decarb_units', value: 88_000, unit: 'tCO2e' }, { key: 'factor', label: 'Decarb factor', value: 0.1, unit: 'tCO2e/t' }], managerComment: 'Approved for issuance as a revision; decision taken outside the involved set.' })
  it2.revision_of_statement_id = st1.id
  it2.manager_user_id = USR.mgr2
  it2.aggregation_json = { ...aggregateMisstatements([misVol], matDecarb2024, 'unqualified'), snapshot_at: it2.submitted_for_ir_at! }
  misVol.iteration_id = it2.id
  const st2 = sc.issue(ctx.nwDecarb2024, it2, 130)
  st2.public_code = publicCode(`${ctx.nwDecarb2024.service.id}:revision-2`)
  st2.issued_by = USR.mgr2
  st2.signatories_json = [{ name: userName(USR.mgr2), role: 'Decision-maker (manager)', signed_at: st2.issued_at }, { name: userName(USR.tl), role: 'Lead verifier', signed_at: st2.issued_at }]
  st2.materiality_json = { assertion_base: 'reduction_units', threshold_pct: 5, threshold_abs: matDecarb2024.threshold_abs, unit: 'tCO2e', basis: matDecarb2024.basis }
  st2.misstatement_summary_json = it2.aggregation_json
  st1.status = 'superseded'
  st1.superseded_by_id = st2.id
  st1.superseded_at = st2.issued_at
  evRevise.closed_at = st2.issued_at
  evRevise.replacement_iteration_id = it2.id
  g.postIssuanceEvents.push(evRevise)
  milk2024.verified_reduction_units = 88_000
  milk2024.assurance_ref = st2.id
  milk2024.level_of_assurance = st2.level_of_assurance
  history(ORG.northwind, 'decarb_unit_record', milk2024.id, st1.id, st1.level_of_assurance, 'superseded', new Date(new Date(st2.issued_at).getTime() - 1000).toISOString())
  history(ORG.northwind, 'decarb_unit_record', milk2024.id, st2.id, st2.level_of_assurance, 'written_back', st2.issued_at)
  ctx.nwDecarb2024.service.status = 'closed'
  sc.audit({ org_id: ORG.northwind, service_id: ctx.nwDecarb2024.service.id, actor_user_id: USR.mgr, event_type: 'statement.post_issuance_opened', entity_type: 'post_issuance_event', entity_id: evRevise.id, summary: `Post-issuance event opened on statement ${st1.public_code} by ${userName(USR.mgr)} (trigger: client): ${evRevise.description}`, before_json: null, after_json: { trigger: 'client', status: 'open' }, occurred_at: revOpened })
  sc.audit({ org_id: ORG.northwind, service_id: ctx.nwDecarb2024.service.id, actor_user_id: USR.mgr2, event_type: 'statement.post_issuance_decided', entity_type: 'post_issuance_event', entity_id: evRevise.id, summary: `Post-issuance event on ${st1.public_code} decided by ${userName(USR.mgr2)} (outside the involved set): revise — ${revReason}`, reason: revReason, before_json: { status: 'open' }, after_json: { status: 'decided', outcome: 'revise' }, occurred_at: revDecided })
  sc.audit({ org_id: ORG.northwind, service_id: ctx.nwDecarb2024.service.id, actor_user_id: USR.mgr2, event_type: 'statement.superseded', entity_type: 'opinion_statement', entity_id: st1.id, summary: `Statement ${st1.public_code} superseded by ${st2.public_code}`, before_json: { status: 'issued' }, after_json: { status: 'superseded', superseded_by_id: st2.id }, occurred_at: st2.issued_at })
  sc.notify(USR.nwAdmin, ORG.northwind, 'statement_revised', `Revised opinion issued for ${ctx.nwDecarb2024.service.reference}`, `VERIFASSUR issued a revised opinion (reasonable assurance): 88,000 reduction decarb_units on 880,000 t. Verification code ${st2.public_code}; it replaces ${st1.public_code}.`, ctx.nwDecarb2024.service.id, st2.issued_at, true)

  // ---------------------------------------------------------------- chapter 15: an appeal under investigation and an overdue complaint (FR-91, FR-92)
  const activitySlot = ctx.nwInv2025.slots.find((s) => s.key === 'activity_data')!
  const activityDoc = sc.t.documents.find((d) => d.id === activitySlot.current_document_id)!
  const rejectedVersion = sc.t.documentVersions.find((v) => v.id === activityDoc.current_version_id)!
  const appealAt = daysAgo(3, 8, 45)
  const appeal: Case = { ...auditAt(appealAt, USR.nwAdmin), id: 'case_nw_appeal_activity_data', org_id: ORG.northwind, kind: 'appeal', subject: 'Rejection of the activity data sample pack', description: 'The Q3 Lelystad invoices were in the pack under the supplier’s name (Gasunie Transport) rather than by month. We ask that the rejection be reconsidered rather than re-uploading an identical pack.', complainant_user_id: USR.nwAdmin, external_contact_json: null, service_id: ctx.nwInv2025.service.id, decision_entity_type: 'document_version', decision_entity_id: rejectedVersion.id, decision_actor_user_id: USR.aud, status: 'under_investigation', received_at: appealAt, acknowledged_at: addHours(appealAt, 5), investigation_started_at: daysAgo(2, 10, 0), decided_at: null, closed_at: null, acknowledge_target_at: daysAgo(-4, 8, 45), decide_target_at: daysAgo(-39, 8, 45), handler_user_id: USR.mgr2, assigned_by: USR.mgr2, outcome: null, outcome_summary: null, decided_by: null, actions_json: null }
  g.cases.push(appeal)
  g.caseNotes.push({ ...auditAt(daysAgo(2, 10, 5), USR.mgr2), id: seedId('cnote'), case_id: appeal.id, author_user_id: USR.mgr2, body: 'Checked the pack: invoices are present but filed by supplier. The rejection reason ("missing") is factually wrong; the re-check should ask for a monthly index instead. Priya (who rejected) is in the involved set and is not consulted on the decision.', internal: true })
  g.caseNotes.push({ ...auditAt(daysAgo(2, 10, 20), USR.mgr2), id: seedId('cnote'), case_id: appeal.id, author_user_id: USR.mgr2, body: 'Thank you, we are reviewing the pack as filed. You will have a decision within the target date.', internal: false })
  sc.audit({ org_id: ORG.northwind, service_id: ctx.nwInv2025.service.id, actor_user_id: USR.nwAdmin, event_type: 'case.received', entity_type: 'case', entity_id: appeal.id, summary: `Appeal received from ${userName(USR.nwAdmin)} (Northwind Dairy Cooperative): ${appeal.subject}`, before_json: null, after_json: { status: 'received', kind: 'appeal', decision_entity_type: 'document_version' }, occurred_at: appealAt })
  sc.audit({ org_id: ORG.northwind, service_id: ctx.nwInv2025.service.id, actor_user_id: USR.mgr2, event_type: 'case.acknowledged', entity_type: 'case', entity_id: appeal.id, summary: `appeal "${appeal.subject}" acknowledged by ${userName(USR.mgr2)}`, before_json: { status: 'received' }, after_json: { status: 'acknowledged' }, occurred_at: appeal.acknowledged_at! })
  sc.audit({ org_id: ORG.northwind, service_id: ctx.nwInv2025.service.id, actor_user_id: USR.mgr2, event_type: 'case.assigned', entity_type: 'case', entity_id: appeal.id, summary: `appeal "${appeal.subject}" assigned to ${userName(USR.mgr2)} (outside the involved set) by ${userName(USR.mgr2)}`, before_json: { handler_user_id: null }, after_json: { handler_user_id: USR.mgr2 }, occurred_at: addHours(appeal.acknowledged_at!, 1) })
  sc.audit({ org_id: ORG.northwind, service_id: ctx.nwInv2025.service.id, actor_user_id: USR.mgr2, event_type: 'case.investigation_started', entity_type: 'case', entity_id: appeal.id, summary: `Investigation of appeal "${appeal.subject}" started by ${userName(USR.mgr2)}`, before_json: { status: 'acknowledged' }, after_json: { status: 'under_investigation' }, occurred_at: appeal.investigation_started_at! })
  sc.notify(USR.nwAdmin, ORG.northwind, 'case_acknowledged', 'Your appeal was acknowledged', `VERIFASSUR acknowledged "${appeal.subject}". A handler outside the engagement team will investigate; a decision is due by ${appeal.decide_target_at.slice(0, 10)}.`, ctx.nwInv2025.service.id, appeal.acknowledged_at!, true)

  const complaintAt = daysAgo(9, 14, 10)
  const complaint: Case = { ...auditAt(complaintAt, USR.solAdmin), id: 'case_sol_complaint_delay', org_id: ORG.solstice, kind: 'complaint', subject: 'Audit plan delivered two weeks late with no response to e-mails', description: 'The audit plan for the 2025 monitoring period arrived on day 19 instead of the agreed day 5, and three e-mails to the coordinator went unanswered. Our site visit window in Laikipia is now at risk.', complainant_user_id: USR.solAdmin, external_contact_json: null, service_id: ctx.solVer2025.service.id, decision_entity_type: null, decision_entity_id: null, decision_actor_user_id: null, status: 'received', received_at: complaintAt, acknowledged_at: null, investigation_started_at: null, decided_at: null, closed_at: null, acknowledge_target_at: daysAgo(2, 14, 10), decide_target_at: daysAgo(-33, 14, 10), handler_user_id: null, assigned_by: null, outcome: null, outcome_summary: null, decided_by: null, actions_json: null }
  g.cases.push(complaint)
  sc.audit({ org_id: ORG.solstice, service_id: ctx.solVer2025.service.id, actor_user_id: USR.solAdmin, event_type: 'case.received', entity_type: 'case', entity_id: complaint.id, summary: `Complaint received from ${userName(USR.solAdmin)} (Solstice Renewables Ltd): ${complaint.subject}`, before_json: null, after_json: { status: 'received', kind: 'complaint' }, occurred_at: complaintAt })
  sc.notify(USR.mgr2, ORG.verifassur, 'case_received', `Complaint received: ${complaint.subject}`, `${userName(USR.solAdmin)} (Solstice Renewables Ltd) complains on ${ctx.solVer2025.service.reference}. Acknowledge by ${complaint.acknowledge_target_at.slice(0, 10)}; decide by ${complaint.decide_target_at.slice(0, 10)}. Handlers must be outside the involved set.`, ctx.solVer2025.service.id, complaintAt)
  sc.notify(USR.mgr2, ORG.verifassur, 'case_overdue', `complaint "${complaint.subject}" is overdue`, `Acknowledgement was due ${complaint.acknowledge_target_at.slice(0, 10)}.`, ctx.solVer2025.service.id, daysAgo(1, 7, 0))

  // ---------------------------------------------------------------- chapter 16: nomination checks on the Atlas team (FR-96, FR-98)
  const atlasChecks: Record<string, { competence: CheckItem[]; rotation: CheckItem[]; overridden: boolean; reason: string | null }> = {
    [USR.tl]: { competence: [{ key: 'qualification:lead_verifier', requirement: 'Lead verifier qualification', result: 'ok', detail: 'Valid until 2028-02-28.' }, { key: 'programme', requirement: 'Programme insetting', result: 'ok', detail: 'Covered by a qualification.' }, { key: 'team_coverage', requirement: 'Team covers the sector scope and technical areas', result: 'warning', detail: 'Not covered: soil_carbon.' }], rotation: [{ key: 'rotation:verifier_team_leader:same_client', requirement: 'At most 3 consecutive engagements as team leader on this client', result: 'ok', detail: 'No prior engagement in this role on this client.' }], overridden: true, reason: 'Soil-carbon expertise is contracted externally (Dr. Elise Marchand, INRAE) and joins before the desk review; the team covers every other area.' },
    [USR.aud]: { competence: [{ key: 'qualification:verifier', requirement: 'Verifier qualification', result: 'ok', detail: 'Valid until 2028-04-30.' }, { key: 'programme', requirement: 'Programme insetting', result: 'ok', detail: 'Covered by a qualification.' }, { key: 'team_coverage', requirement: 'Team covers the sector scope and technical areas', result: 'warning', detail: 'Not covered: soil_carbon.' }], rotation: [], overridden: true, reason: 'Soil-carbon expertise is contracted externally (Dr. Elise Marchand, INRAE) and joins before the desk review; the team covers every other area.' },
    [USR.ir]: { competence: [{ key: 'qualification:independent_reviewer', requirement: 'Independent reviewer qualification', result: 'ok', detail: 'Valid until 2027-12-31.' }, { key: 'programme', requirement: 'Programme insetting', result: 'ok', detail: 'Covered by a qualification.' }, { key: 'team_coverage', requirement: 'Team covers the sector scope and technical areas', result: 'warning', detail: 'Not covered: soil_carbon.' }], rotation: [], overridden: true, reason: 'Soil-carbon expertise is contracted externally (Dr. Elise Marchand, INRAE) and joins before the desk review; the team covers every other area.' },
    [USR.coord]: { competence: [{ key: 'team_coverage', requirement: 'Team covers the sector scope and technical areas', result: 'warning', detail: 'Not covered: soil_carbon.' }], rotation: [], overridden: true, reason: 'Soil-carbon expertise is contracted externally (Dr. Elise Marchand, INRAE) and joins before the desk review; the team covers every other area.' },
  }
  for (const tm of sc.t.team.filter((t) => t.service_id === ctx.atlasDecarb2025.service.id && t.service_role !== 'client_contact')) {
    const c = atlasChecks[tm.user_id]
    if (!c) continue
    g.nominationChecks.push({ ...auditAt(tm.nominated_at!, USR.mgr), id: seedId('chk'), service_team_id: tm.id, kind: 'nomination', competence_json: c.competence, rotation_json: c.rotation, overridden: c.overridden, override_reason: c.reason, checked_by: USR.mgr, checked_at: tm.nominated_at! })
    if (c.overridden) sc.audit({ org_id: ORG.atlas, service_id: ctx.atlasDecarb2025.service.id, actor_user_id: USR.mgr, event_type: 'team.check_overridden', entity_type: 'service_team', entity_id: tm.id, summary: `Override: ${userName(tm.user_id)} nominated as ${tm.service_role.replace('verifier_', '').replace(/_/g, ' ')} despite 1 warning by ${userName(USR.mgr)} — ${c.reason}`, reason: c.reason, before_json: null, after_json: { warnings: ['Team covers the sector scope and technical areas: Not covered: soil_carbon.'] }, occurred_at: tm.nominated_at! })
  }
  // The checks on the running Northwind inventory passed (history): the 2024 adjusted lines were entered by Priya and Marcus.
  const inv2024 = records.inventories.find((i) => i.year === 2024)!
  for (const line of records.inventoryLines.filter((l) => l.inventory_id === inv2024.id && l.review_status === 'adjusted')) {
    sc.audit({ org_id: ORG.northwind, service_id: inv2024.service_id, actor_user_id: line.reviewed_by, event_type: 'record.verified_value_edited', entity_type: 'inventory_line', entity_id: line.id, summary: `Line "${line.activity}" reviewed: adjusted (adjusted to ${line.adjusted_gross_tco2e} tCO2e)${line.verifier_comment ? ` — ${line.verifier_comment}` : ''}`, before_json: { review_status: 'not_reviewed' }, after_json: { review_status: 'adjusted', adjusted_gross_tco2e: line.adjusted_gross_tco2e }, occurred_at: line.reviewed_at ?? daysAgo(340) })
  }
  return g
}

export type { OpinionIteration, OpinionStatement }
