/** Assembles the demo seed (plan_v1 §2.4 storyline). Deterministic apart from "today". */
import { WORKFLOW_TEMPLATES } from '@/domain/workflow/templates'
import { daysAgo } from '../clock'
import { resetIds } from '../ids'
import type { Tables } from '../store'
import { ORG, PRJ, USR, announcements, featureFlags, memberships, organisations, platformSettings, projects, userName, users } from './base'
import { buildRecords } from './records'
import { Scenario, addHours } from './scenario'

export const SVC = {
  nwInv2023: 'svc_nw_inv_2023',
  nwInv2024: 'svc_nw_inv_2024',
  nwPcf2024: 'svc_nw_pcf_2024',
  nwDecarb2024: 'svc_nw_decarb_2024',
  nwInv2025: 'svc_nw_inv_2025',
  nwDecarb2025: 'svc_nw_decarb_2025',
  solVal2024: 'svc_sol_val_2024',
  solVer2025: 'svc_sol_ver_2025',
  atlasDecarb2025: 'svc_atlas_decarb_2025',
  atlasPcf2025: 'svc_atlas_pcf_2025',
} as const

export function buildSeed(): Tables {
  resetIds()
  const sc = new Scenario()

  // ---------------------------------------------------------------- Northwind history (closed, paid)
  const nwInv2023 = sc.createService({ id: SVC.nwInv2023, orgId: ORG.northwind, projectId: PRJ.nwCorp, type: 'iso14064_1_inventory_verification', name: 'Corporate GHG inventory FY2023 — verification', reference: 'VX-2024-0117', periodStart: '2023-01-01', periodEnd: '2023-12-31', scope: { summary: 'Scope 1, 2 and 3 inventory of Northwind Dairy Cooperative for FY2023.', sites: ['Lelystad', 'Leeuwarden', 'Zwolle'], boundary: 'Operational control' }, requestedDaysAgo: 760, clientContact: USR.nwAdmin })
  sc.triage(nwInv2023, daysAgo(758))
  sc.advance(nwInv2023, 'reporting')
  sc.issue(nwInv2023, sc.addIteration(nwInv2023, { no: 1, status: 'approved', daysAgo: 700, opinionType: 'unqualified', narrative: 'The GHG inventory is fairly stated, in all material respects, in accordance with ISO 14064-1:2018.', figures: [{ key: 'scope1', label: 'Scope 1', value: 20_250, unit: 'tCO2e' }, { key: 'scope2_market', label: 'Scope 2 (market)', value: 5_120, unit: 'tCO2e' }, { key: 'scope3', label: 'Scope 3', value: 4_031_000, unit: 'tCO2e' }] }), 695)
  sc.close(nwInv2023, 690)
  sc.invoice(nwInv2023, { quoteMinor: 2_850_000, quoteDaysAgo: 755, invoiceDaysAgo: 694, paidDaysAgo: 668 })

  const nwInv2024 = sc.createService({ id: SVC.nwInv2024, orgId: ORG.northwind, projectId: PRJ.nwCorp, type: 'iso14064_1_inventory_verification', name: 'Corporate GHG inventory FY2024 — verification', reference: 'VX-2025-0142', periodStart: '2024-01-01', periodEnd: '2024-12-31', scope: { summary: 'Scope 1, 2 and 3 inventory of Northwind Dairy Cooperative for FY2024, reasonable assurance.', sites: ['Lelystad', 'Leeuwarden', 'Zwolle'], boundary: 'Operational control' }, requestedDaysAgo: 400, clientContact: USR.nwAdmin, renewedFrom: SVC.nwInv2023 })
  sc.triage(nwInv2024, daysAgo(398))
  sc.advance(nwInv2024, 'reporting')
  sc.addFinding(nwInv2024, { type: 'CAR', severity: 'major', title: 'Refrigerant leakage: R-404A not split into HFC species', description: 'Fugitive emissions were calculated with a single GWP for R-404A. Split the blend into HFC-125, HFC-143a and HFC-134a and recalculate with AR6 values.', stepKey: 'desk_review', raisedDaysAgo: 360, dueInDays: 10, status: 'closed', responses: [{ by: USR.nwContrib, party: 'client', body: 'Service logs re-extracted; blend split applied. Updated workbook v3 attached.', daysAgo: 356 }, { by: USR.aud, party: 'verifier', body: 'Recalculation verified against the supplier safety data sheet. Closing.', daysAgo: 354 }] })
  sc.addFinding(nwInv2024, { type: 'CL', severity: 'minor', title: 'Clarify GWP set used for enteric methane', description: 'The workbook mixes AR5 and AR6 methane values across sheets.', stepKey: 'data_review', raisedDaysAgo: 352, dueInDays: 7, status: 'closed', responses: [{ by: USR.nwAdmin, party: 'client', body: 'AR6 (27.9) applied consistently in v3.', daysAgo: 350 }] })
  sc.issue(nwInv2024, sc.addIteration(nwInv2024, { no: 1, status: 'approved', daysAgo: 335, opinionType: 'unqualified', narrative: 'The GHG inventory is fairly stated, in all material respects, in accordance with ISO 14064-1:2018. Enteric methane restated with AR6 GWP values.', figures: [{ key: 'scope1', label: 'Scope 1', value: 19_640, unit: 'tCO2e' }, { key: 'scope2_market', label: 'Scope 2 (market)', value: 4_960, unit: 'tCO2e' }, { key: 'scope3', label: 'Scope 3', value: 3_906_000, unit: 'tCO2e' }, { key: 'biogenic', label: 'Biogenic CO2 (reported separately)', value: 20_700, unit: 't' }] }), 330)
  sc.close(nwInv2024, 325)
  sc.invoice(nwInv2024, { quoteMinor: 2_980_000, quoteDaysAgo: 395, invoiceDaysAgo: 329, paidDaysAgo: 302 })

  const nwPcf2024 = sc.createService({ id: SVC.nwPcf2024, orgId: ORG.northwind, projectId: PRJ.nwProducts, type: 'iso14067_product_verification', name: 'Product carbon footprints 2024 — milk and Gouda', reference: 'VX-2025-0096', periodStart: '2024-01-01', periodEnd: '2024-12-31', scope: { summary: 'Cradle-to-gate PCF of semi-skimmed milk (1 L) and Gouda 48+ (1 kg).', products: ['Semi-skimmed milk, 1 L carton', 'Gouda 48+, 1 kg wheel'] }, requestedDaysAgo: 420, clientContact: USR.nwAdmin })
  sc.triage(nwPcf2024, daysAgo(418))
  sc.advance(nwPcf2024, 'reporting')
  sc.issue(nwPcf2024, sc.addIteration(nwPcf2024, { no: 1, status: 'approved', daysAgo: 375, opinionType: 'unqualified', narrative: 'The product carbon footprints are prepared in accordance with ISO 14067:2018.', figures: [{ key: 'milk', label: 'Semi-skimmed milk', value: 1.21, unit: 'kgCO2e/L' }, { key: 'gouda', label: 'Gouda 48+', value: 8.7, unit: 'kgCO2e/kg' }] }), 370)
  sc.close(nwPcf2024, 366)
  sc.invoice(nwPcf2024, { quoteMinor: 1_640_000, quoteDaysAgo: 415, invoiceDaysAgo: 369, paidDaysAgo: 345 })

  const nwDecarb2024 = sc.createService({ id: SVC.nwDecarb2024, orgId: ORG.northwind, projectId: PRJ.nwInsetting, type: 'decarb_units_verification', name: 'Dairy insetting 2024 — decarb_units verification', reference: 'VX-2025-0158', periodStart: '2024-01-01', periodEnd: '2024-12-31', scope: { summary: 'Verification of 2024 decarb_units from cluster North (3-NOP and covered slurry storage).', interventions: ['3-NOP feed additive', 'Covered slurry storage'] }, requestedDaysAgo: 330, clientContact: USR.nwAdmin })
  sc.triage(nwDecarb2024, daysAgo(328))
  sc.advance(nwDecarb2024, 'reporting')
  sc.issue(nwDecarb2024, sc.addIteration(nwDecarb2024, { no: 1, status: 'approved', daysAgo: 270, opinionType: 'unqualified', narrative: 'The decarb_units are quantified in accordance with ISO 14064-2:2019 on the attributed volume of 900,000 t of raw milk.', figures: [{ key: 'reduction_units', label: 'Reduction decarb_units', value: 90_000, unit: 'tCO2e' }, { key: 'factor', label: 'Decarb factor', value: 0.1, unit: 'tCO2e/t' }] }), 265)
  sc.close(nwDecarb2024, 260)
  sc.invoice(nwDecarb2024, { quoteMinor: 2_120_000, quoteDaysAgo: 326, invoiceDaysAgo: 264, paidDaysAgo: 240 })

  // ---------------------------------------------------------------- Northwind ongoing: FY2025 inventory (execution, desk review)
  const nwInv2025 = sc.createService({ id: SVC.nwInv2025, orgId: ORG.northwind, projectId: PRJ.nwCorp, type: 'iso14064_1_inventory_verification', name: 'Corporate GHG inventory FY2025 — verification', reference: 'VX-2026-0031', periodStart: '2025-01-01', periodEnd: '2025-12-31', scope: { summary: 'Scope 1, 2 and 3 inventory of Northwind Dairy Cooperative for FY2025, reasonable assurance, AR6 GWP.', sites: ['Lelystad', 'Leeuwarden', 'Zwolle'], boundary: 'Operational control', materiality_pct: 5 }, requestedDaysAgo: 34, clientContact: USR.nwAdmin, renewedFrom: SVC.nwInv2024 })
  sc.triage(nwInv2025, daysAgo(33))
  sc.advance(nwInv2025, 'audit_plan')
  {
    const slotOf = (key: string) => nwInv2025.slots.find((s) => s.key === key)!
    sc.fillSlot(nwInv2025, slotOf('inventory_workbook'), { at: daysAgo(5, 10, 5), status: 'accepted', versions: 1 })
    sc.fillSlot(nwInv2025, slotOf('methodology'), { at: daysAgo(5, 10, 20), status: 'accepted', versions: 1 })
    sc.fillSlot(nwInv2025, slotOf('activity_data'), { at: daysAgo(4, 15, 0), status: 'rejected', versions: 1, uploadedBy: USR.nwContrib, rejectReason: 'Q3 natural gas invoices for Lelystad are missing from the sample pack.' })
    sc.fillSlot(nwInv2025, slotOf('org_chart'), { at: daysAgo(5, 11, 0), status: 'submitted', versions: 1 })
    sc.notify(USR.nwAdmin, ORG.northwind, 'document_rejected', 'Activity data samples rejected', 'Q3 natural gas invoices for Lelystad are missing from the sample pack. Please re-upload.', nwInv2025.service.id, daysAgo(3, 9, 15))
    sc.notify(USR.nwContrib, ORG.northwind, 'document_rejected', 'Activity data samples rejected', 'Q3 natural gas invoices for Lelystad are missing from the sample pack. Please re-upload.', nwInv2025.service.id, daysAgo(3, 9, 15))
  }
  sc.addFinding(nwInv2025, { type: 'CL', severity: 'minor', title: 'Confirm market-based residual mix factor', description: 'The market-based Scope 2 line uses a 2024 residual mix factor; confirm the 2025 AIB value or justify.', stepKey: 'desk_review', raisedDaysAgo: 4, dueInDays: 7, status: 'closed', responses: [{ by: USR.nwAdmin, party: 'client', body: '2025 AIB residual mix (0.412 kgCO2e/kWh) applied in workbook v2.', daysAgo: 3 }] })
  sc.addFinding(nwInv2025, { type: 'CAR', severity: 'major', title: 'Scope 1 stationary combustion: Lelystad Q3 gas volumes unsupported', description: 'Natural gas consumption for July–September at Lelystad (1.04 million m3) cannot be traced to supplier invoices or meter readings. Provide invoices or calibrated meter exports for the period.', stepKey: 'desk_review', raisedDaysAgo: 2, dueInDays: 7, status: 'open', assignedTo: USR.nwContrib })
  sc.addFinding(nwInv2025, { type: 'OBS', severity: 'info', title: 'Consider site-level sub-metering for CHP', description: 'Allocating CHP gas between heat and electricity would improve Scope 1/2 transparency.', stepKey: 'desk_review', raisedDaysAgo: 2, dueInDays: 30, status: 'open', assignedTo: USR.nwAdmin })
  sc.invoice(nwInv2025, { quoteMinor: 3_050_000, quoteDaysAgo: 30, invoiceDaysAgo: 12 })

  // ---------------------------------------------------------------- Northwind ongoing: insetting 2025 (opinion review, iteration 1 returned)
  const nwDecarb2025 = sc.createService({ id: SVC.nwDecarb2025, orgId: ORG.northwind, projectId: PRJ.nwInsetting, type: 'decarb_units_verification', name: 'Dairy insetting 2025 — decarb_units verification', reference: 'VX-2026-0009', periodStart: '2025-01-01', periodEnd: '2025-12-31', scope: { summary: 'Verification of 2025 decarb_units from cluster North on 1,000,000 t attributed raw milk. Baseline: historical 2024.', interventions: ['3-NOP feed additive', 'Covered slurry storage', 'Precision fertilisation'] }, requestedDaysAgo: 60, clientContact: USR.nwAdmin, renewedFrom: SVC.nwDecarb2024 })
  sc.triage(nwDecarb2025, daysAgo(59))
  sc.advance(nwDecarb2025, 'reporting')
  sc.addFinding(nwDecarb2025, { type: 'CAR', severity: 'major', title: 'Attributed volume evidence references 2024 contracts', description: 'Purchase records supporting the 1,000,000 t attributed volume cite FY2024 supply contracts. Provide 2025 delivery statements per farm cluster.', stepKey: 'data_review', raisedDaysAgo: 20, dueInDays: 10, status: 'closed', responses: [{ by: USR.nwAdmin, party: 'client', body: '2025 delivery statements (monthly, per farm) uploaded as purchase records v2.', daysAgo: 15 }, { by: USR.aud, party: 'verifier', body: 'Volumes reconcile to 1,000,412 t; attributed volume of 1,000,000 t is supported. Closing.', daysAgo: 13 }] })
  sc.addFinding(nwDecarb2025, { type: 'CL', severity: 'minor', title: 'State the GWP set for both profiles', description: 'Baseline and project profiles must both use AR6 100-year values.', stepKey: 'desk_review', raisedDaysAgo: 24, dueInDays: 7, status: 'closed', responses: [{ by: USR.nwAdmin, party: 'client', body: 'Both profiles use AR6; confirmed in the method note.', daysAgo: 22 }] })
  sc.addIteration(nwDecarb2025, { no: 1, status: 'changes_requested', daysAgo: 8, opinionType: 'unqualified', narrative: 'The 2025 decarb_units of Northwind Dairy Cooperative are quantified in accordance with ISO 14064-2:2019 on an attributed volume of 1,000,000 t of raw milk.', figures: [{ key: 'reduction_units', label: 'Reduction decarb_units', value: 400_000, unit: 'tCO2e' }, { key: 'factor', label: 'Decarb factor (gross)', value: 0.4, unit: 'tCO2e/t' }, { key: 'biogenic_delta', label: 'Biogenic CO2 delta (reported separately)', value: 833.3, unit: 'tCO2e' }], irComment: 'Opinion wording must state that biogenic CO2 is reported separately and excluded from the units. Also reference the closed CAR #1 in the findings summary. Please prepare iteration 2.' })
  sc.invoice(nwDecarb2025, { quoteMinor: 2_240_000, quoteDaysAgo: 56, invoiceDaysAgo: 30 })

  // ---------------------------------------------------------------- Solstice (project developer)
  const solVal2024 = sc.createService({ id: SVC.solVal2024, orgId: ORG.solstice, projectId: PRJ.solLaikipia, type: 'vcs_validation', name: 'Laikipia mini-grids — VCS validation', reference: 'VX-2025-0044', periodStart: '2024-01-01', periodEnd: '2031-12-31', scope: { summary: 'Validation of the grouped project description against VCS Standard v4 and VM0038.', sites: ['Nanyuki', 'Rumuruti', 'Dol Dol'] }, requestedDaysAgo: 500, clientContact: USR.solAdmin })
  sc.triage(solVal2024, daysAgo(498))
  sc.advance(solVal2024, 'reporting')
  sc.issue(solVal2024, sc.addIteration(solVal2024, { no: 1, status: 'approved', daysAgo: 415, opinionType: 'validation_positive', narrative: 'The project is likely to achieve the estimated emission reductions and meets the requirements of the VCS Standard v4.', figures: [{ key: 'estimated_annual', label: 'Estimated annual reductions', value: 2_468, unit: 'tCO2e' }, { key: 'crediting_period', label: 'Crediting period', value: 7, unit: 'years' }] }), 410)
  sc.close(solVal2024, 405)
  sc.invoice(solVal2024, { quoteMinor: 2_600_000, currency: 'USD', quoteDaysAgo: 495, invoiceDaysAgo: 409, paidDaysAgo: 380 })

  const solVer2025 = sc.createService({ id: SVC.solVer2025, orgId: ORG.solstice, projectId: PRJ.solLaikipia, type: 'vcs_verification', name: 'Laikipia mini-grids — verification, monitoring period 2025', reference: 'VX-2026-0022', periodStart: '2025-01-01', periodEnd: '2025-12-31', scope: { summary: 'First verification of the grouped project, monitoring period 1 (2025).', sites: ['Nanyuki', 'Rumuruti', 'Dol Dol'] }, requestedDaysAgo: 25, clientContact: USR.solAdmin })
  sc.triage(solVer2025, daysAgo(24))
  sc.advance(solVer2025, 'service_agreement')
  sc.fillSlot(solVer2025, solVer2025.slots.find((s) => s.key === 'audit_plan')!, { at: daysAgo(2, 16, 30), status: 'submitted', versions: 1, uploadedBy: USR.tl })
  sc.notify(USR.solAdmin, ORG.solstice, 'document_requested', 'Audit plan ready for your acceptance', 'Marcus Oyelaran uploaded the audit plan for VX-2026-0022. Please review and accept it.', solVer2025.service.id, daysAgo(2, 16, 35))
  sc.invoice(solVer2025, { quoteMinor: 1_850_000, currency: 'USD', quoteDaysAgo: 22, invoiceDaysAgo: 4 })

  // ---------------------------------------------------------------- Atlas (new client)
  const atlasDecarb2025 = sc.createService({ id: SVC.atlasDecarb2025, orgId: ORG.atlas, projectId: PRJ.atlasWheat, type: 'decarb_units_verification', name: 'Regenerative wheat 2025 — decarb_units verification', reference: 'VX-2026-0047', periodStart: '2024-09-01', periodEnd: '2025-08-31', scope: { summary: 'Verification of reduction and removal decarb_units on 20,000 t of organic wheat from Beauce. Counterfactual baseline.', interventions: ['Cover cropping', 'Reduced tillage'] }, requestedDaysAgo: 12, clientContact: USR.atlasAdmin })
  sc.triage(atlasDecarb2025, daysAgo(11))
  sc.advance(atlasDecarb2025, 'desk_review_cpf')
  sc.nominate(
    atlasDecarb2025,
    [
      { userId: USR.tl, role: 'verifier_team_leader', coi: 'approved' },
      { userId: USR.aud, role: 'verifier_auditor', coi: 'required' },
      { userId: USR.ir, role: 'verifier_independent_reviewer', coi: 'declared' },
      { userId: USR.coord, role: 'verifier_coordinator', coi: 'approved' },
      { userId: USR.atlasAdmin, role: 'client_contact', coi: 'approved' },
    ],
    daysAgo(1, 14, 10),
  )
  sc.invoice(atlasDecarb2025, { quoteMinor: 1_960_000, quoteDaysAgo: 3 })

  sc.createService({ id: SVC.atlasPcf2025, orgId: ORG.atlas, projectId: PRJ.atlasBakery, type: 'iso14067_product_verification', name: 'Sourdough range 2025 — product footprint verification', reference: 'VX-2026-0052', periodStart: '2025-01-01', periodEnd: '2025-12-31', scope: { summary: 'Cradle-to-gate PCF of the sourdough loaf 500 g for retail labelling.', products: ['Sourdough loaf 500 g'] }, requestedDaysAgo: 2, clientContact: USR.atlasAdmin })

  // ---------------------------------------------------------------- records
  const records = buildRecords({ nwInv2023: SVC.nwInv2023, nwInv2024: SVC.nwInv2024, nwInv2025: SVC.nwInv2025, nwDecarb2024: SVC.nwDecarb2024, nwDecarb2025: SVC.nwDecarb2025, atlasDecarb2025: SVC.atlasDecarb2025, atlasPcf2025: SVC.atlasPcf2025, nwPcf2024: SVC.nwPcf2024 })
  const issuedIterationFor = (serviceId: string | null) => sc.t.statements.find((s) => s.service_id === serviceId)?.iteration_id ?? null
  for (const inv of records.inventories) if (inv.assurance_ref) inv.assurance_ref = issuedIterationFor(inv.service_id)
  for (const ef of records.emissionFactors) if (ef.assurance_ref) ef.assurance_ref = issuedIterationFor(ef.service_id)
  for (const d of records.decarbRecords) if (d.assurance_ref) d.assurance_ref = issuedIterationFor(d.service_id)
  const inv2023 = records.inventories.find((i) => i.year === 2023)
  const inv2024 = records.inventories.find((i) => i.year === 2024)
  if (inv2023 && inv2024) inv2023.superseded_by_id = inv2024.id

  // A couple of extra notifications so the bell has recent, varied items.
  sc.notify(USR.nwAdmin, ORG.northwind, 'invoice_added', 'Invoice INV-2026-0031 issued', `${userName(USR.fin)} issued the invoice for VX-2026-0031 (EUR 30,500, due in 30 days).`, SVC.nwInv2025, daysAgo(12, 11, 0), true)
  sc.notify(USR.nwAdmin, ORG.northwind, 'iteration_decision', 'Opinion iteration returned by independent review', 'Iteration 1 for VX-2026-0009 was returned with comments; the team leader is preparing iteration 2.', SVC.nwDecarb2025, addHours(daysAgo(8), 78), true)
  sc.notify(USR.mgr, ORG.verifassur, 'coi_required', 'COI declaration outstanding', `${userName(USR.aud)} has not yet declared conflicts of interest on VX-2026-0047.`, SVC.atlasDecarb2025, daysAgo(0, 8, 5))
  sc.notify(USR.tl, ORG.verifassur, 'finding_responded', 'Client responded to CL #1', `${userName(USR.nwAdmin)} responded to CL #1 on VX-2026-0031.`, SVC.nwInv2025, daysAgo(3, 14, 30))

  // Authentication events for the ADMIN auth log (PRD FR-68): one sign-in per persona at their last sign-in time, plus a failed attempt.
  for (const u of users()) {
    const m = memberships().find((x) => x.user_id === u.id)!
    sc.audit({ org_id: m.org_id, service_id: null, actor_user_id: u.id, event_type: 'auth.signed_in', entity_type: 'user', entity_id: u.id, summary: `${u.name} signed in (password + TOTP)`, before_json: null, after_json: { method: 'password+totp' }, occurred_at: u.last_sign_in_at! })
  }
  sc.audit({ org_id: ORG.northwind, service_id: null, actor_user_id: null, event_type: 'auth.failed', entity_type: 'user', entity_id: USR.nwContrib, summary: 'Failed sign-in for pieter.dejong@northwind.example (wrong password, 2nd attempt)', before_json: null, after_json: { ip: '198.51.100.23' }, occurred_at: daysAgo(4, 7, 58) })
  sc.audit({ org_id: ORG.verifassur, service_id: null, actor_user_id: USR.admin, event_type: 'admin.flag_default_changed', entity_type: 'feature_flag', entity_id: 'public_statement', summary: 'Default state of "Public verification statement" set to enabled', before_json: { state: 'preview' }, after_json: { state: 'enabled' }, occurred_at: daysAgo(30, 10, 0) })

  return {
    organisations: organisations(),
    users: users(),
    memberships: memberships(),
    apiClients: [],
    projects: projects(),
    services: sc.t.services,
    phases: sc.t.phases,
    steps: sc.t.steps,
    slots: sc.t.slots,
    approvals: sc.t.approvals,
    team: sc.t.team,
    cois: sc.t.cois,
    documents: [...sc.t.documents, ...records.documents],
    documentVersions: [...sc.t.documentVersions, ...records.documentVersions],
    evidenceLinks: records.evidenceLinks,
    findings: sc.t.findings,
    findingResponses: sc.t.findingResponses,
    iterations: sc.t.iterations,
    iterationDocuments: sc.t.iterationDocuments,
    statements: sc.t.statements,
    inventories: records.inventories,
    inventoryLines: records.inventoryLines,
    inventoryLineGases: records.inventoryLineGases,
    emissionFactors: records.emissionFactors,
    profiles: records.profiles,
    profileGases: records.profileGases,
    decarbRecords: records.decarbRecords,
    invoices: sc.t.invoices,
    notifications: sc.t.notifications.sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
    auditEvents: sc.t.auditEvents.sort((a, b) => (a.occurred_at < b.occurred_at ? 1 : -1)),
    featureFlags: featureFlags(),
    flagOverrides: [],
    featureInterest: [],
    templates: WORKFLOW_TEMPLATES,
    platformSettings: platformSettings(),
    announcements: announcements(),
  }
}
