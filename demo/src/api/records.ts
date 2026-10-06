/** Ledger: GHG inventories, product emission factors, decarb_unit records (PRD §6.7–6.9, v0.3 §6.17). */
import type { BaselineMethod, ConsolidationApproach, EfBoundary, EfMethod, GwpSet, LevelOfAssurance, ProfileKind, ReviewStatus, ScopeCategory, ServiceType } from '@/domain/enums'
import { scopeOfCategory } from '@/domain/enums'
import { computeDecarb, computeProfile, type DecarbResult } from '@/domain/compute/decarb'
import { computeGases, computeTotals, yoyChangePct } from '@/domain/compute/inventory'
import { proposeMisstatement } from '@/domain/compute/materiality'
import type { DecarbUnitRecord, EmissionFactor, EmissionProfile, EmissionProfileGas, GasEntry, Intervention, Inventory, InventoryLine, InventoryLineGas, RecordAssuranceHistory, ScopeTotals, SupplyShed } from '@/domain/schemas'
import { recordMachine } from '@/domain/workflow/machines'
import { UnitError } from '@/domain/units'
import { todayIso } from '@/mock/clock'
import { ApiError, audit, auditNow, authContext, authorize, call, getStore, newId, notify, nowIsoString, serviceAudience, userName } from './core'
import { evidenceFor, type EvidenceView } from './documents'
import { recordVerifiedValueEdit } from './involved'
import { proposeFromAdjustment } from './materiality'
import { createDraft, submit as submitService } from './services'

// ---------------------------------------------------------------- shared assurance view (PRD v0.3 FR-83)
export interface AssuranceView {
  statementCode: string | null
  statementStatus: string | null
  levelOfAssurance: LevelOfAssurance | null
  assuranceStatus: string | null
  history: { event: string; statementCode: string | null; levelOfAssurance: LevelOfAssurance; occurredAt: string }[]
}

export function assuranceView(recordType: RecordAssuranceHistory['record_type'], recordId: string, assuranceRef: string | null, level: LevelOfAssurance | null, status: string | null): AssuranceView {
  const s = getStore()
  const st = assuranceRef ? s.find('statements', assuranceRef) : null
  return {
    statementCode: st?.public_code ?? null,
    statementStatus: st?.status ?? null,
    levelOfAssurance: level,
    assuranceStatus: status,
    history: s
      .where('recordAssuranceHistory', (h) => h.record_type === recordType && h.record_id === recordId)
      .sort((a, b) => (a.occurred_at < b.occurred_at ? 1 : -1))
      .map((h) => ({ event: h.event, statementCode: s.find('statements', h.statement_id)?.public_code ?? null, levelOfAssurance: h.level_of_assurance, occurredAt: h.occurred_at })),
  }
}

export async function assuranceHistory(recordType: RecordAssuranceHistory['record_type'], recordId: string): Promise<AssuranceView> {
  return call(() => {
    const s = getStore()
    const row = recordType === 'inventory' ? s.get('inventories', recordId) : recordType === 'emission_factor' ? s.get('emissionFactors', recordId) : s.get('decarbRecords', recordId)
    authorize('record.read', { orgId: row.org_id })
    return assuranceView(recordType, recordId, row.assurance_ref, row.level_of_assurance, row.assurance_status)
  })
}

// ---------------------------------------------------------------- inventories
export interface LineView extends InventoryLine {
  gases: InventoryLineGas[]
  evidence: EvidenceView[]
  /** Gross value after the verifier's adjustment (declared when accepted or not tested). */
  effective_gross_tco2e: number
}

export interface InventoryView extends Inventory {
  lines: LineView[]
  totals: ScopeTotals
  /** Declared totals with the verifier's line adjustments applied (proposal for the verified totals). */
  adjustedTotals: ScopeTotals
  /** Assertion-level verified figures (PRD v0.3 FR-82), null until entered or written back. */
  verifiedTotals: ScopeTotals | null
  completeness: { withEvidence: number; total: number }
  review: { reviewed: number; adjusted: number; total: number }
  serviceReference: string | null
  statementCode: string | null
  assurance: AssuranceView
}

function totalsOf(lines: InventoryLine[], adjusted: boolean): ScopeTotals {
  return computeTotals(
    lines.map((l) => ({
      category: l.category,
      gross_tco2e: adjusted && l.review_status === 'adjusted' ? (l.adjusted_gross_tco2e ?? l.declared_gross_tco2e) : l.declared_gross_tco2e,
      biogenic_co2_t: adjusted && l.review_status === 'adjusted' ? (l.adjusted_biogenic_co2_t ?? l.declared_biogenic_co2_t) : l.declared_biogenic_co2_t,
      removals_tco2e: adjusted && l.review_status === 'adjusted' ? (l.adjusted_removals_tco2e ?? l.declared_removals_tco2e) : l.declared_removals_tco2e,
    })),
  )
}

export function inventoryView(inv: Inventory): InventoryView {
  const s = getStore()
  const lines = s.where('inventoryLines', (l) => l.inventory_id === inv.id && !l.deleted_at).sort((a, b) => a.order_no - b.order_no)
  const views: LineView[] = lines.map((l) => ({ ...l, gases: s.where('inventoryLineGases', (g) => g.line_id === l.id), evidence: evidenceFor('inventory_line', l.id), effective_gross_tco2e: l.review_status === 'adjusted' ? (l.adjusted_gross_tco2e ?? l.declared_gross_tco2e) : l.declared_gross_tco2e }))
  const svc = inv.service_id ? s.find('services', inv.service_id) : null
  const assurance = assuranceView('inventory', inv.id, inv.assurance_ref, inv.level_of_assurance, inv.assurance_status)
  return {
    ...inv,
    lines: views,
    totals: totalsOf(lines, false),
    adjustedTotals: totalsOf(lines, true),
    verifiedTotals: inv.verified_totals_json,
    completeness: { withEvidence: views.filter((v) => v.evidence.length > 0).length, total: views.length },
    review: { reviewed: lines.filter((l) => l.review_status !== 'not_reviewed').length, adjusted: lines.filter((l) => l.review_status === 'adjusted').length, total: lines.length },
    serviceReference: svc?.reference ?? null,
    statementCode: assurance.statementCode,
    assurance,
  }
}

export async function listInventories(): Promise<InventoryView[]> {
  return call(() => {
    const ctx = authorize('record.read')
    const orgId = ctx.orgType === 'client' ? ctx.orgId : undefined
    return getStore()
      .where('inventories', (i) => (orgId ? i.org_id === orgId : true) && !i.deleted_at)
      .sort((a, b) => b.year - a.year)
      .map(inventoryView)
  })
}

export async function getInventory(id: string): Promise<InventoryView> {
  return call(() => {
    const inv = getStore().get('inventories', id)
    authorize('record.read', { orgId: inv.org_id })
    return inventoryView(inv)
  })
}

const freshLineReview = { review_status: 'not_reviewed' as ReviewStatus, adjusted_gross_tco2e: null, adjusted_biogenic_co2_t: null, adjusted_removals_tco2e: null, verifier_comment: null, reviewed_by: null, reviewed_at: null }

export async function createInventory(input: { year: number; boundaryName: string; consolidation: ConsolidationApproach; gwpSet: GwpSet; copyFromId?: string }): Promise<InventoryView> {
  return call(() => {
    const ctx = authorize('record.create')
    const s = getStore()
    const inv: Inventory = { ...auditNow(ctx.userId), id: newId('inv'), org_id: ctx.orgId, year: input.year, boundary_name: input.boundaryName, consolidation: input.consolidation, gwp_set: input.gwpSet, status: 'draft', revision: 1, service_id: null, declared_totals_json: null, verified_totals_json: null, assurance_ref: null, level_of_assurance: null, assurance_status: null, superseded_by_id: null, submitted_at: null, verified_at: null }
    s.insert('inventories', inv)
    if (input.copyFromId) {
      const src = s.get('inventories', input.copyFromId)
      for (const l of s.where('inventoryLines', (x) => x.inventory_id === src.id && !x.deleted_at)) {
        const line: InventoryLine = { ...l, ...auditNow(ctx.userId), id: newId('lin'), inventory_id: inv.id, ...freshLineReview }
        s.insert('inventoryLines', line)
        for (const g of s.where('inventoryLineGases', (x) => x.line_id === l.id)) s.insert('inventoryLineGases', { ...g, ...auditNow(ctx.userId), id: newId('lgs'), line_id: line.id })
      }
    }
    refreshDeclaredTotals(inv.id, ctx.userId)
    audit(ctx, { orgId: ctx.orgId, serviceId: null, eventType: 'inventory.created', entityType: 'inventory', entityId: inv.id, summary: `GHG inventory ${inv.year} created${input.copyFromId ? ' from the previous year' : ''}` })
    return inventoryView(s.get('inventories', inv.id))
  })
}

export interface LineInput {
  category: ScopeCategory
  site: string | null
  activity: string
  quantity: number | null
  unit: string | null
  gases: GasEntry[]
  biogenic_co2_t: number
  removals_tco2e: number
}

function assertEditable(inv: Inventory) {
  if (inv.status !== 'draft') throw new ApiError('conflict', 'Only draft inventories can be edited. Reopen it to create a new revision.')
}

export async function upsertLine(inventoryId: string, input: LineInput, lineId?: string): Promise<InventoryView> {
  return call(() => {
    const s = getStore()
    const inv = s.get('inventories', inventoryId)
    const ctx = authorize('record.create', { orgId: inv.org_id })
    assertEditable(inv)
    const gases = computeGases(inv.gwp_set, input.gases)
    const gross = Math.round(gases.reduce((a, g) => a + g.tco2e, 0) * 1000) / 1000
    const base = { category: input.category, scope: scopeOfCategory(input.category), site: input.site, activity: input.activity, quantity: input.quantity, unit: input.unit, declared_gross_tco2e: gross, declared_biogenic_co2_t: input.biogenic_co2_t, declared_removals_tco2e: input.removals_tco2e }
    let id = lineId
    if (lineId) {
      s.update('inventoryLines', lineId, base, ctx.userId)
      for (const g of s.where('inventoryLineGases', (x) => x.line_id === lineId)) s.remove('inventoryLineGases', g.id)
    } else {
      id = newId('lin')
      const order = s.where('inventoryLines', (x) => x.inventory_id === inventoryId).length
      s.insert('inventoryLines', { ...auditNow(ctx.userId), id, inventory_id: inventoryId, org_id: inv.org_id, ...base, ...freshLineReview, source: 'manual', order_no: order })
    }
    for (const g of gases) s.insert('inventoryLineGases', { ...auditNow(ctx.userId), id: newId('lgs'), line_id: id!, gas: g.gas, gas_detail: g.gas_detail, tonnes_gas: g.tonnes_gas, custom_gwp: g.custom_gwp, gwp: g.gwp, tco2e: g.tco2e })
    refreshDeclaredTotals(inventoryId, ctx.userId)
    audit(ctx, { orgId: inv.org_id, serviceId: inv.service_id, eventType: lineId ? 'inventory.line_updated' : 'inventory.line_added', entityType: 'inventory_line', entityId: id!, summary: `${lineId ? 'Updated' : 'Added'} line "${input.activity}" (${gross} tCO2e)` })
    return inventoryView(s.get('inventories', inventoryId))
  })
}

export async function removeLine(inventoryId: string, lineId: string): Promise<InventoryView> {
  return call(() => {
    const s = getStore()
    const inv = s.get('inventories', inventoryId)
    const ctx = authorize('record.create', { orgId: inv.org_id })
    assertEditable(inv)
    s.update('inventoryLines', lineId, { deleted_at: nowIsoString() }, ctx.userId)
    refreshDeclaredTotals(inventoryId, ctx.userId)
    return inventoryView(s.get('inventories', inventoryId))
  })
}

function refreshDeclaredTotals(inventoryId: string, actorId: string | null) {
  const s = getStore()
  const lines = s.where('inventoryLines', (l) => l.inventory_id === inventoryId && !l.deleted_at)
  s.update('inventories', inventoryId, { declared_totals_json: totalsOf(lines, false) }, actorId)
}

export async function reopenInventory(inventoryId: string): Promise<InventoryView> {
  return call(() => {
    const s = getStore()
    const inv = s.get('inventories', inventoryId)
    const ctx = authorize('record.create', { orgId: inv.org_id })
    const { state } = recordMachine.apply(inv.status, 'reopen')
    s.update('inventories', inventoryId, { status: state, revision: inv.revision + 1 }, ctx.userId)
    audit(ctx, { orgId: inv.org_id, serviceId: inv.service_id, eventType: 'inventory.reopened', entityType: 'inventory', entityId: inventoryId, summary: `Inventory ${inv.year} reopened as revision ${inv.revision + 1}`, before: { status: inv.status }, after: { status: state } })
    return inventoryView(s.get('inventories', inventoryId))
  })
}

export interface SubmitTarget {
  serviceId?: string
  newRequest?: { projectId: string; name: string }
}

async function attachAndSubmit(kind: 'inventory' | 'emission_factor' | 'decarb', id: string, target: SubmitTarget, serviceType: ServiceType, period: [string, string]) {
  const s = getStore()
  let serviceId = target.serviceId
  if (!serviceId && target.newRequest) {
    const draft = await createDraft({ projectId: target.newRequest.projectId, serviceType, name: target.newRequest.name, periodStart: period[0], periodEnd: period[1], scope: { summary: `Verification of ${kind.replace('_', ' ')} ${id}` } })
    await submitService(draft.id)
    serviceId = draft.id
  }
  if (!serviceId) throw new ApiError('validation', 'Choose an engagement or create a request.')
  const svc = s.get('services', serviceId)
  if (['closed', 'cancelled', 'issued'].includes(svc.status)) throw new ApiError('conflict', 'That engagement is already closed.')
  return serviceId
}

export async function submitInventory(inventoryId: string, target: SubmitTarget): Promise<InventoryView> {
  const s = getStore()
  const inv = s.get('inventories', inventoryId)
  const ctx = authorize('record.submit', { orgId: inv.org_id })
  if (s.where('inventoryLines', (l) => l.inventory_id === inventoryId && !l.deleted_at).length === 0) throw new ApiError('validation', 'Add at least one line before submitting.')
  const { state } = recordMachine.apply(inv.status, 'submit')
  const serviceId = await attachAndSubmit('inventory', inventoryId, target, 'iso14064_1_inventory_verification', [`${inv.year}-01-01`, `${inv.year}-12-31`])
  return call(() => {
    s.update('inventories', inventoryId, { status: state, service_id: serviceId, submitted_at: nowIsoString() }, ctx.userId)
    const svc = s.get('services', serviceId)
    audit(ctx, { orgId: inv.org_id, serviceId, eventType: 'inventory.submitted', entityType: 'inventory', entityId: inventoryId, summary: `GHG inventory ${inv.year} (revision ${inv.revision}) submitted for verification on ${svc.reference}`, before: { status: inv.status }, after: { status: state } })
    notify(serviceAudience(serviceId, 'verifier'), 'org_verifassur', 'record_submitted', `Inventory ${inv.year} submitted`, `${userName(ctx.userId)} submitted the ${inv.year} GHG inventory on ${svc.reference}.`, serviceId, { type: 'inventory', id: inventoryId })
    return inventoryView(s.get('inventories', inventoryId))
  })
}

export interface LineReviewInput {
  review_status: ReviewStatus
  adjusted_gross_tco2e?: number | null
  adjusted_biogenic_co2_t?: number | null
  adjusted_removals_tco2e?: number | null
  comment: string | null
}

/**
 * PRD v0.3 FR-43, FR-82: the verifier sets the review status of a line and, when adjusted, the adjusted values.
 * The edit is a verified-value edit (involved set, return-to-IR, immutable after issuance) and a difference between
 * the adjusted and declared gross proposes a misstatement (FR-85).
 */
export async function reviewLine(inventoryId: string, lineId: string, input: LineReviewInput): Promise<InventoryView & { involvedSetJoined: boolean; iterationReturnedToIr: string | null; misstatementProposed: boolean }> {
  return call(() => {
    const s = getStore()
    const inv = s.get('inventories', inventoryId)
    const ctx = inv.service_id ? authorize('record.verify', { orgId: inv.org_id, serviceId: inv.service_id }) : authorize('record.verify', { orgId: inv.org_id })
    const line = s.get('inventoryLines', lineId)
    const adjusted = input.review_status === 'adjusted'
    if (adjusted && input.adjusted_gross_tco2e == null) throw new ApiError('validation', 'Enter the adjusted gross value.')
    const patch: Partial<InventoryLine> = {
      review_status: input.review_status,
      adjusted_gross_tco2e: adjusted ? input.adjusted_gross_tco2e! : null,
      adjusted_biogenic_co2_t: adjusted ? (input.adjusted_biogenic_co2_t ?? line.declared_biogenic_co2_t) : null,
      adjusted_removals_tco2e: adjusted ? (input.adjusted_removals_tco2e ?? line.declared_removals_tco2e) : null,
      verifier_comment: input.comment,
      reviewed_by: ctx.userId,
      reviewed_at: nowIsoString(),
    }
    const result = recordVerifiedValueEdit(ctx, inv.service_id, { entityType: 'inventory_line', entityId: lineId, summary: `Line "${line.activity}" reviewed: ${input.review_status.replace(/_/g, ' ')}${adjusted ? ` (adjusted to ${input.adjusted_gross_tco2e} tCO2e)` : ''}${input.comment ? ` — ${input.comment}` : ''}`, before: { review_status: line.review_status, adjusted_gross_tco2e: line.adjusted_gross_tco2e }, after: { review_status: input.review_status, adjusted_gross_tco2e: patch.adjusted_gross_tco2e } })
    s.update('inventoryLines', lineId, patch, ctx.userId)
    if (inv.status === 'submitted') s.update('inventories', inventoryId, { status: 'under_verification' }, ctx.userId)
    let misstatementProposed = false
    if (adjusted && inv.service_id) {
      const proposal = proposeMisstatement(line.declared_gross_tco2e, input.adjusted_gross_tco2e!)
      if (proposal) misstatementProposed = proposeFromAdjustment(ctx, inv.service_id, { recordType: 'inventory', recordId: inventoryId, recordLineId: lineId, direction: proposal.direction, amount: proposal.amount, unit: 'tCO2e', description: `Line "${line.activity}": declared ${line.declared_gross_tco2e} tCO2e, adjusted to ${input.adjusted_gross_tco2e} tCO2e${input.comment ? ` (${input.comment})` : ''}` })
    }
    return { ...inventoryView(s.get('inventories', inventoryId)), ...result, misstatementProposed }
  })
}

/** PRD v0.3 FR-43, FR-82: the assertion-level verified totals of the inventory. */
export async function setVerifiedTotals(inventoryId: string, totals: { byScope: Record<string, number>; biogenic: number; removals: number }, comment?: string): Promise<InventoryView> {
  return call(() => {
    const s = getStore()
    const inv = s.get('inventories', inventoryId)
    const ctx = inv.service_id ? authorize('record.verify', { orgId: inv.org_id, serviceId: inv.service_id }) : authorize('record.verify', { orgId: inv.org_id })
    const gross = Object.values(totals.byScope).reduce((a, b) => a + b, 0)
    const next: ScopeTotals = { gross_tco2e: gross, biogenic_co2_t: totals.biogenic, removals_tco2e: totals.removals, by_scope: totals.byScope, by_category: inv.verified_totals_json?.by_category ?? {} }
    recordVerifiedValueEdit(ctx, inv.service_id, { entityType: 'inventory', entityId: inventoryId, summary: `Verified totals entered for inventory ${inv.year}: ${gross} tCO2e gross${comment ? ` — ${comment}` : ''}`, before: inv.verified_totals_json, after: next })
    s.update('inventories', inventoryId, { verified_totals_json: next, status: inv.status === 'submitted' ? 'under_verification' : inv.status }, ctx.userId)
    if (inv.service_id) {
      const declared = inv.declared_totals_json?.gross_tco2e ?? totalsOf(s.where('inventoryLines', (l) => l.inventory_id === inventoryId && !l.deleted_at), false).gross_tco2e
      const proposal = proposeMisstatement(declared, gross)
      if (proposal) proposeFromAdjustment(ctx, inv.service_id, { recordType: 'inventory', recordId: inventoryId, recordLineId: null, direction: proposal.direction, amount: proposal.amount, unit: 'tCO2e', description: `Inventory ${inv.year} gross total: declared ${declared} tCO2e, verified ${gross} tCO2e` })
    }
    return inventoryView(s.get('inventories', inventoryId))
  })
}

export interface YearComparison {
  years: { year: number; status: string; declared: ScopeTotals | null; verified: ScopeTotals | null; statementCode: string | null; levelOfAssurance: LevelOfAssurance | null; assuranceStatus: string | null }[]
  change: { scope: string; current: number; previous: number | null; pct: number | null }[]
}

export async function compareInventories(): Promise<YearComparison> {
  return call(() => {
    const ctx = authorize('record.read')
    const s = getStore()
    const invs = s.where('inventories', (i) => i.org_id === ctx.orgId && !i.deleted_at).sort((a, b) => a.year - b.year)
    const years = invs.map((i) => ({ year: i.year, status: i.status, declared: i.declared_totals_json, verified: i.verified_totals_json, statementCode: i.assurance_ref ? (s.find('statements', i.assurance_ref)?.public_code ?? null) : null, levelOfAssurance: i.level_of_assurance, assuranceStatus: i.assurance_status }))
    const usable = invs.filter((i) => i.verified_totals_json && i.assurance_status !== 'withdrawn')
    const latestVerified = [...usable].reverse()[0]
    const previous = latestVerified ? [...usable].reverse().find((i) => i.year < latestVerified.year) : null
    const change = ['1', '2', '3'].map((scope) => {
      const current = latestVerified?.verified_totals_json?.by_scope[scope] ?? 0
      const prev = previous?.verified_totals_json?.by_scope[scope] ?? null
      return { scope, current, previous: prev, pct: yoyChangePct(current, prev) }
    })
    return { years, change }
  })
}

// ---------------------------------------------------------------- product emission factors
export interface EmissionFactorView extends EmissionFactor {
  evidence: EvidenceView[]
  serviceReference: string | null
  statementCode: string | null
  assurance: AssuranceView
  history: { year: number; declared: number; verified: number | null; status: string; assuranceStatus: string | null }[]
}

export function efView(ef: EmissionFactor): EmissionFactorView {
  const s = getStore()
  const assurance = assuranceView('emission_factor', ef.id, ef.assurance_ref, ef.level_of_assurance, ef.assurance_status)
  return {
    ...ef,
    evidence: evidenceFor('emission_factor', ef.id),
    serviceReference: ef.service_id ? (s.find('services', ef.service_id)?.reference ?? null) : null,
    statementCode: assurance.statementCode,
    assurance,
    history: s
      .where('emissionFactors', (x) => x.org_id === ef.org_id && x.product_name === ef.product_name && !x.deleted_at)
      .sort((a, b) => a.year - b.year)
      .map((x) => ({ year: x.year, declared: x.declared_value, verified: x.verified_value, status: x.status, assuranceStatus: x.assurance_status })),
  }
}

export async function listEmissionFactors(): Promise<EmissionFactorView[]> {
  return call(() => {
    const ctx = authorize('record.read')
    return getStore()
      .where('emissionFactors', (e) => (ctx.orgType === 'client' ? e.org_id === ctx.orgId : true) && !e.deleted_at)
      .sort((a, b) => b.year - a.year || a.product_name.localeCompare(b.product_name))
      .map(efView)
  })
}

export interface EfInput {
  product_name: string
  product_code: string | null
  functional_unit: string
  boundary: EfBoundary
  method: EfMethod
  year: number
  declared_value: number
  value_unit: string
  notes: string | null
}

export async function upsertEmissionFactor(input: EfInput, id?: string): Promise<EmissionFactorView> {
  return call(() => {
    const ctx = authorize('record.create')
    const s = getStore()
    if (id) {
      const ef = s.get('emissionFactors', id)
      if (ef.status !== 'draft') throw new ApiError('conflict', 'Only draft factors can be edited.')
      return efView(s.update('emissionFactors', id, input, ctx.userId))
    }
    const ef: EmissionFactor = { ...auditNow(ctx.userId), id: newId('ef'), org_id: ctx.orgId, ...input, verified_value: null, status: 'draft', service_id: null, assurance_ref: null, level_of_assurance: null, assurance_status: null, superseded_by_id: null }
    s.insert('emissionFactors', ef)
    audit(ctx, { orgId: ctx.orgId, serviceId: null, eventType: 'emission_factor.created', entityType: 'emission_factor', entityId: ef.id, summary: `Product emission factor created: ${ef.product_name} ${ef.year}` })
    return efView(ef)
  })
}

export async function submitEmissionFactor(id: string, target: SubmitTarget): Promise<EmissionFactorView> {
  const s = getStore()
  const ef = s.get('emissionFactors', id)
  const ctx = authorize('record.submit', { orgId: ef.org_id })
  const { state } = recordMachine.apply(ef.status, 'submit')
  const serviceId = await attachAndSubmit('emission_factor', id, target, 'iso14067_product_verification', [`${ef.year}-01-01`, `${ef.year}-12-31`])
  return call(() => {
    s.update('emissionFactors', id, { status: state, service_id: serviceId }, ctx.userId)
    audit(ctx, { orgId: ef.org_id, serviceId, eventType: 'emission_factor.submitted', entityType: 'emission_factor', entityId: id, summary: `${ef.product_name} ${ef.year} submitted for verification`, before: { status: ef.status }, after: { status: state } })
    return efView(s.get('emissionFactors', id))
  })
}

/** Verifier (or manager, PRD FR-77) records the verified value of a product emission factor; a verified-value edit (PRD v0.3). */
export async function setVerifiedEmissionFactor(id: string, value: number, comment?: string): Promise<EmissionFactorView & { involvedSetJoined: boolean; iterationReturnedToIr: string | null }> {
  return call(() => {
    const s = getStore()
    const ef = s.get('emissionFactors', id)
    const ctx = authorize('record.verify', { orgId: ef.org_id, serviceId: ef.service_id ?? undefined })
    if (ef.status === 'verified' || ef.status === 'superseded') throw new ApiError('conflict', 'Verified figures of an issued opinion are immutable; open a post-issuance revision instead.', { code: 'issued_immutable' })
    const result = recordVerifiedValueEdit(ctx, ef.service_id, { entityType: 'emission_factor', entityId: id, summary: `Verified value entered for ${ef.product_name} ${ef.year}: ${value} ${ef.value_unit}${comment ? ` (${comment})` : ''}`, before: { verified_value: ef.verified_value }, after: { verified_value: value } })
    s.update('emissionFactors', id, { verified_value: value, status: ef.status === 'submitted' ? 'under_verification' : ef.status }, ctx.userId)
    if (ef.service_id) {
      const proposal = proposeMisstatement(ef.declared_value, value)
      if (proposal) proposeFromAdjustment(ctx, ef.service_id, { recordType: 'emission_factor', recordId: id, recordLineId: null, direction: proposal.direction, amount: proposal.amount, unit: ef.value_unit, description: `${ef.product_name} ${ef.year}: declared ${ef.declared_value} ${ef.value_unit}, verified ${value} ${ef.value_unit}${comment ? ` (${comment})` : ''}` })
    }
    return { ...efView(s.get('emissionFactors', id)), ...result }
  })
}

// ---------------------------------------------------------------- decarb_unit records
export interface ProfileView extends EmissionProfile {
  gases: EmissionProfileGas[]
  evidence: EvidenceView[]
}

export interface DecarbView extends DecarbUnitRecord {
  baseline: ProfileView | null
  project: ProfileView | null
  evidence: EvidenceView[]
  computed: DecarbResult | null
  computeError: string | null
  serviceReference: string | null
  statementCode: string | null
  assurance: AssuranceView
}

function profileView(id: string | null): ProfileView | null {
  if (!id) return null
  const s = getStore()
  const p = s.find('profiles', id)
  if (!p) return null
  return { ...p, gases: s.where('profileGases', (g) => g.profile_id === id), evidence: evidenceFor('emission_profile', id) }
}

function toProfileInput(p: ProfileView) {
  return { gwp_set: p.gwp_set, gases: p.gases.map((g) => ({ gas: g.gas, gas_detail: g.gas_detail, tonnes_gas: g.tonnes_gas, custom_gwp: g.custom_gwp })), biogenic_co2_t: p.biogenic_co2_t, removals_tco2e: p.removals_tco2e, reference_volume: p.reference_volume, volume_unit: p.volume_unit }
}

export function decarbView(d: DecarbUnitRecord): DecarbView {
  const s = getStore()
  const baseline = profileView(d.baseline_profile_id)
  const project = profileView(d.project_profile_id)
  let computed: DecarbResult | null = null
  let computeError: string | null = null
  if (baseline && project) {
    try {
      computed = computeDecarb({ baseline: toProfileInput(baseline), project: toProfileInput(project), attributed_volume: d.attributed_volume, volume_unit: d.volume_unit })
    } catch (e) {
      computeError = e instanceof UnitError ? e.message : 'Cannot compute'
    }
  }
  const assurance = assuranceView('decarb_unit_record', d.id, d.assurance_ref, d.level_of_assurance, d.assurance_status)
  return {
    ...d,
    baseline,
    project,
    evidence: evidenceFor('decarb_unit_record', d.id),
    computed,
    computeError,
    serviceReference: d.service_id ? (s.find('services', d.service_id)?.reference ?? null) : null,
    statementCode: assurance.statementCode,
    assurance,
  }
}

export async function listDecarbRecords(): Promise<DecarbView[]> {
  return call(() => {
    const ctx = authorize('record.read')
    return getStore()
      .where('decarbRecords', (d) => (ctx.orgType === 'client' ? d.org_id === ctx.orgId : true) && !d.deleted_at)
      .sort((a, b) => (a.period_start < b.period_start ? 1 : -1))
      .map(decarbView)
  })
}

export async function getDecarbRecord(id: string): Promise<DecarbView> {
  return call(() => {
    const d = getStore().get('decarbRecords', id)
    authorize('record.read', { orgId: d.org_id })
    return decarbView(d)
  })
}

export interface DecarbInput {
  good: string
  supply_shed_json: SupplyShed
  supplier_name: string | null
  intervention_json: Intervention
  baseline_method: BaselineMethod
  attributed_volume: number
  volume_unit: string
  period_start: string
  period_end: string
  justification: string | null
}

export async function upsertDecarbRecord(input: DecarbInput, id?: string): Promise<DecarbView> {
  return call(() => {
    const ctx = authorize('record.create')
    const s = getStore()
    if (id) {
      const d = s.get('decarbRecords', id)
      if (d.status !== 'draft') throw new ApiError('conflict', 'Only draft records can be edited.')
      s.update('decarbRecords', id, input, ctx.userId)
      recomputeDecarb(id, ctx.userId)
      return decarbView(s.get('decarbRecords', id))
    }
    const d: DecarbUnitRecord = { ...auditNow(ctx.userId), id: newId('dcu'), org_id: ctx.orgId, ...input, facility_id: null, baseline_profile_id: null, project_profile_id: null, decarb_factor_gross: null, decarb_factor_removal: null, factor_unit: null, declared_reduction_units: null, declared_removal_units: null, biogenic_delta_tco2e: null, verified_reduction_units: null, verified_removal_units: null, status: 'draft', service_id: null, assurance_ref: null, level_of_assurance: null, assurance_status: null, superseded_by_id: null }
    s.insert('decarbRecords', d)
    audit(ctx, { orgId: ctx.orgId, serviceId: null, eventType: 'decarb_record.created', entityType: 'decarb_unit_record', entityId: d.id, summary: `decarb_unit record created: ${d.good} ${d.period_start.slice(0, 4)}` })
    return decarbView(d)
  })
}

export interface ProfileInputDto {
  period_start: string
  period_end: string
  boundary: string
  gwp_set: GwpSet
  gases: GasEntry[]
  biogenic_co2_t: number
  removals_tco2e: number
  reference_volume: number
  volume_unit: string
  notes: string | null
}

export async function setProfile(recordId: string, kind: ProfileKind, input: ProfileInputDto): Promise<DecarbView> {
  return call(() => {
    const s = getStore()
    const d = s.get('decarbRecords', recordId)
    const ctx = authorize('record.create', { orgId: d.org_id })
    if (d.status !== 'draft') throw new ApiError('conflict', 'Only draft records can be edited.')
    const r = computeProfile({ gwp_set: input.gwp_set, gases: input.gases, biogenic_co2_t: input.biogenic_co2_t, removals_tco2e: input.removals_tco2e, reference_volume: input.reference_volume, volume_unit: input.volume_unit })
    const existingId = kind === 'baseline' ? d.baseline_profile_id : d.project_profile_id
    const base = { kind, period_start: input.period_start, period_end: input.period_end, boundary: input.boundary, gwp_set: input.gwp_set, gross_tco2e: r.gross_tco2e, biogenic_co2_t: input.biogenic_co2_t, removals_tco2e: input.removals_tco2e, reference_volume: input.reference_volume, volume_unit: input.volume_unit, ef_gross: r.ef_gross, ef_removal: r.ef_removal, ef_unit: r.ef_unit, notes: input.notes }
    let id = existingId
    if (existingId) {
      s.update('profiles', existingId, base, ctx.userId)
      for (const g of s.where('profileGases', (x) => x.profile_id === existingId)) s.remove('profileGases', g.id)
    } else {
      id = newId('prf')
      s.insert('profiles', { ...auditNow(ctx.userId), id, org_id: d.org_id, ...base })
      s.update('decarbRecords', recordId, kind === 'baseline' ? { baseline_profile_id: id } : { project_profile_id: id }, ctx.userId)
    }
    for (const g of computeGases(input.gwp_set, input.gases)) s.insert('profileGases', { ...auditNow(ctx.userId), id: newId('pgs'), profile_id: id!, gas: g.gas, gas_detail: g.gas_detail, tonnes_gas: g.tonnes_gas, custom_gwp: g.custom_gwp, gwp: g.gwp, tco2e: g.tco2e })
    recomputeDecarb(recordId, ctx.userId)
    audit(ctx, { orgId: d.org_id, serviceId: d.service_id, eventType: 'decarb_record.profile_set', entityType: 'emission_profile', entityId: id!, summary: `${kind === 'baseline' ? 'Baseline' : 'Project'} profile set: ${r.gross_tco2e} tCO2e on ${input.reference_volume} ${input.volume_unit} (EF ${r.ef_gross} ${r.ef_unit})` })
    return decarbView(s.get('decarbRecords', recordId))
  })
}

function recomputeDecarb(recordId: string, actorId: string | null) {
  const s = getStore()
  const view = decarbView(s.get('decarbRecords', recordId))
  if (!view.computed) {
    s.update('decarbRecords', recordId, { decarb_factor_gross: null, decarb_factor_removal: null, factor_unit: null, declared_reduction_units: null, declared_removal_units: null, biogenic_delta_tco2e: null }, actorId)
    return
  }
  const c = view.computed
  s.update('decarbRecords', recordId, { decarb_factor_gross: c.decarb_factor_gross, decarb_factor_removal: c.decarb_factor_removal, factor_unit: c.factor_unit, declared_reduction_units: c.reduction_units, declared_removal_units: c.removal_units, biogenic_delta_tco2e: c.biogenic_delta_tco2e }, actorId)
}

/** Dry-run compute for the editor (what-if), without saving. */
export async function previewDecarb(input: { baseline: ProfileInputDto; project: ProfileInputDto; attributed_volume: number; volume_unit: string }): Promise<DecarbResult> {
  return call(() => computeDecarb({ baseline: { ...input.baseline }, project: { ...input.project }, attributed_volume: input.attributed_volume, volume_unit: input.volume_unit }))
}

export async function submitDecarbRecord(id: string, target: SubmitTarget): Promise<DecarbView> {
  const s = getStore()
  const d = s.get('decarbRecords', id)
  const ctx = authorize('record.submit', { orgId: d.org_id })
  const view = decarbView(d)
  if (!view.computed) throw new ApiError('validation', view.computeError ?? 'Both profiles are required before submitting.')
  if (view.computed.reduction_units < 0 && !d.justification?.trim()) throw new ApiError('validation', 'Reduction units are negative; add a justification before submitting.')
  const { state } = recordMachine.apply(d.status, 'submit')
  const serviceId = await attachAndSubmit('decarb', id, target, 'decarb_units_verification', [d.period_start, d.period_end])
  return call(() => {
    s.update('decarbRecords', id, { status: state, service_id: serviceId }, ctx.userId)
    const svc = s.get('services', serviceId)
    audit(ctx, { orgId: d.org_id, serviceId, eventType: 'decarb_record.submitted', entityType: 'decarb_unit_record', entityId: id, summary: `decarb_unit record ${d.good} ${d.period_start.slice(0, 4)} submitted on ${svc.reference} (${view.computed!.reduction_units} reduction units declared)`, before: { status: d.status }, after: { status: state } })
    notify(serviceAudience(serviceId, 'verifier'), 'org_verifassur', 'record_submitted', 'decarb_unit record submitted', `${userName(ctx.userId)} submitted ${d.good} ${d.period_start.slice(0, 4)} on ${svc.reference}.`, serviceId, { type: 'decarb_unit_record', id })
    return decarbView(s.get('decarbRecords', id))
  })
}

export async function setVerifiedDecarb(id: string, values: { reduction: number; removal: number }, comment?: string): Promise<DecarbView & { involvedSetJoined: boolean; iterationReturnedToIr: string | null }> {
  return call(() => {
    const s = getStore()
    const d = s.get('decarbRecords', id)
    const ctx = authorize('record.verify', { orgId: d.org_id, serviceId: d.service_id ?? undefined })
    if (d.status === 'verified' || d.status === 'superseded') throw new ApiError('conflict', 'Verified figures of an issued opinion are immutable; open a post-issuance revision instead.', { code: 'issued_immutable' })
    const result = recordVerifiedValueEdit(ctx, d.service_id, { entityType: 'decarb_unit_record', entityId: id, summary: `Verified values entered for ${d.good} ${d.period_start.slice(0, 4)}: ${values.reduction} reduction, ${values.removal} removal units${comment ? ` (${comment})` : ''}`, before: { reduction: d.verified_reduction_units, removal: d.verified_removal_units }, after: values })
    s.update('decarbRecords', id, { verified_reduction_units: values.reduction, verified_removal_units: values.removal, status: d.status === 'submitted' ? 'under_verification' : d.status }, ctx.userId)
    if (d.service_id && d.declared_reduction_units != null) {
      const proposal = proposeMisstatement(d.declared_reduction_units, values.reduction)
      if (proposal) proposeFromAdjustment(ctx, d.service_id, { recordType: 'decarb_unit_record', recordId: id, recordLineId: null, direction: proposal.direction, amount: proposal.amount, unit: 'tCO2e', description: `${d.good} ${d.period_start.slice(0, 4)}: declared ${d.declared_reduction_units} reduction units, verified ${values.reduction}${comment ? ` (${comment})` : ''}` })
    }
    return { ...decarbView(s.get('decarbRecords', id)), ...result }
  })
}

export interface PortfolioRow {
  id: string
  good: string
  supplyShed: string
  year: number
  status: string
  assuranceStatus: string | null
  levelOfAssurance: LevelOfAssurance | null
  declaredReduction: number | null
  declaredRemoval: number | null
  verifiedReduction: number | null
  verifiedRemoval: number | null
  factor: number | null
  factorUnit: string | null
  attributedVolume: number
  volumeUnit: string
  serviceReference: string | null
  statementCode: string | null
}

export async function portfolio(): Promise<{ rows: PortfolioRow[]; byYear: { year: number; verified: number; declared: number }[] }> {
  return call(() => {
    const ctx = authorize('record.read')
    const s = getStore()
    const rows = s
      .where('decarbRecords', (d) => (ctx.orgType === 'client' ? d.org_id === ctx.orgId : true) && !d.deleted_at)
      .map((d) => {
        const v = decarbView(d)
        return {
          id: d.id,
          good: d.good,
          supplyShed: `${d.supply_shed_json.good}${d.supply_shed_json.variety ? `, ${d.supply_shed_json.variety}` : ''}, ${d.supply_shed_json.country}${d.supply_shed_json.region ? ` (${d.supply_shed_json.region})` : ''}`,
          year: Number(d.period_end.slice(0, 4)),
          status: d.status,
          assuranceStatus: d.assurance_status,
          levelOfAssurance: d.level_of_assurance,
          declaredReduction: d.declared_reduction_units,
          declaredRemoval: d.declared_removal_units,
          verifiedReduction: d.status === 'withdrawn' ? null : d.verified_reduction_units,
          verifiedRemoval: d.status === 'withdrawn' ? null : d.verified_removal_units,
          factor: d.decarb_factor_gross,
          factorUnit: d.factor_unit,
          attributedVolume: d.attributed_volume,
          volumeUnit: d.volume_unit,
          serviceReference: v.serviceReference,
          statementCode: v.statementCode,
        }
      })
      .sort((a, b) => b.year - a.year || a.good.localeCompare(b.good))
    const years = [...new Set(rows.map((r) => r.year))].sort()
    const byYear = years.map((year) => ({
      year,
      verified: rows.filter((r) => r.year === year && r.status === 'verified').reduce((a, r) => a + (r.verifiedReduction ?? 0) + (r.verifiedRemoval ?? 0), 0),
      declared: rows.filter((r) => r.year === year).reduce((a, r) => a + (r.declaredReduction ?? 0) + (r.declaredRemoval ?? 0), 0),
    }))
    return { rows, byYear }
  })
}

// ---------------------------------------------------------------- write-back, supersession and withdrawal (PRD FR-35, FR-83, FR-89, FR-90)
function historyRow(orgId: string, recordType: RecordAssuranceHistory['record_type'], recordId: string, statementId: string, level: LevelOfAssurance, event: RecordAssuranceHistory['event'], at: string): void {
  getStore().insert('recordAssuranceHistory', { id: newId('rah'), org_id: orgId, record_type: recordType, record_id: recordId, statement_id: statementId, level_of_assurance: level, event, occurred_at: at })
}

/**
 * Issuance step 6 (PRD §8.6): assertion-level verified figures, `assurance_ref` = statement, level of assurance,
 * `assurance_status = verified`, history rows; older verified records for the same scope are superseded.
 */
export function writeBackVerifiedRecords(serviceId: string, statementId: string, actorId: string): void {
  const s = getStore()
  const at = nowIsoString()
  const statement = s.get('statements', statementId)
  const level = statement.level_of_assurance
  const previousStatementIds = s.where('statements', (st) => st.service_id === serviceId && st.id !== statementId).map((st) => st.id)
  // A supersession is written one second before the new write-back so the history reads newest first without ties.
  const before = new Date(new Date(at).getTime() - 1000).toISOString()
  const supersedeOld = (type: RecordAssuranceHistory['record_type'], orgId: string, id: string, newId_: string, oldLevel: LevelOfAssurance | null, oldRef: string | null) => {
    s.update(type === 'inventory' ? 'inventories' : type === 'emission_factor' ? 'emissionFactors' : 'decarbRecords', id, { status: 'superseded', assurance_status: 'superseded', superseded_by_id: newId_ } as never, actorId)
    if (oldRef) historyRow(orgId, type, id, oldRef, oldLevel ?? 'reasonable', 'superseded', before)
  }
  for (const inv of s.where('inventories', (i) => i.service_id === serviceId)) {
    const lines = s.where('inventoryLines', (l) => l.inventory_id === inv.id && !l.deleted_at)
    const verifiedTotals = inv.verified_totals_json ?? totalsOf(lines, true)
    for (const older of s.where('inventories', (x) => x.org_id === inv.org_id && x.id !== inv.id && x.year === inv.year && x.status === 'verified')) supersedeOld('inventory', inv.org_id, older.id, inv.id, older.level_of_assurance, older.assurance_ref)
    const revising = inv.assurance_ref && previousStatementIds.includes(inv.assurance_ref)
    if (revising) historyRow(inv.org_id, 'inventory', inv.id, inv.assurance_ref!, inv.level_of_assurance ?? level, 'superseded', before)
    s.update('inventories', inv.id, { status: 'verified', verified_totals_json: verifiedTotals, assurance_ref: statementId, level_of_assurance: level, assurance_status: 'verified', verified_at: at }, actorId)
    historyRow(inv.org_id, 'inventory', inv.id, statementId, level, 'written_back', at)
    audit(null, { orgId: inv.org_id, serviceId, eventType: 'inventory.verified', entityType: 'inventory', entityId: inv.id, summary: `GHG inventory ${inv.year} marked verified (${level} assurance, statement ${statement.public_code})`, after: { status: 'verified', level_of_assurance: level, assurance_ref: statementId } })
  }
  for (const ef of s.where('emissionFactors', (e) => e.service_id === serviceId)) {
    for (const older of s.where('emissionFactors', (x) => x.org_id === ef.org_id && x.id !== ef.id && x.product_name === ef.product_name && x.year === ef.year && x.status === 'verified')) supersedeOld('emission_factor', ef.org_id, older.id, ef.id, older.level_of_assurance, older.assurance_ref)
    if (ef.assurance_ref && previousStatementIds.includes(ef.assurance_ref)) historyRow(ef.org_id, 'emission_factor', ef.id, ef.assurance_ref, ef.level_of_assurance ?? level, 'superseded', before)
    s.update('emissionFactors', ef.id, { status: 'verified', verified_value: ef.verified_value ?? ef.declared_value, assurance_ref: statementId, level_of_assurance: level, assurance_status: 'verified' }, actorId)
    historyRow(ef.org_id, 'emission_factor', ef.id, statementId, level, 'written_back', at)
    audit(null, { orgId: ef.org_id, serviceId, eventType: 'emission_factor.verified', entityType: 'emission_factor', entityId: ef.id, summary: `${ef.product_name} ${ef.year} marked verified (${level} assurance)`, after: { status: 'verified', level_of_assurance: level, assurance_ref: statementId } })
  }
  for (const d of s.where('decarbRecords', (r) => r.service_id === serviceId)) {
    for (const older of s.where('decarbRecords', (x) => x.org_id === d.org_id && x.id !== d.id && x.good === d.good && x.period_end.slice(0, 4) === d.period_end.slice(0, 4) && JSON.stringify(x.supply_shed_json) === JSON.stringify(d.supply_shed_json) && x.status === 'verified')) supersedeOld('decarb_unit_record', d.org_id, older.id, d.id, older.level_of_assurance, older.assurance_ref)
    if (d.assurance_ref && previousStatementIds.includes(d.assurance_ref)) historyRow(d.org_id, 'decarb_unit_record', d.id, d.assurance_ref, d.level_of_assurance ?? level, 'superseded', before)
    s.update('decarbRecords', d.id, { status: 'verified', verified_reduction_units: d.verified_reduction_units ?? d.declared_reduction_units, verified_removal_units: d.verified_removal_units ?? d.declared_removal_units, assurance_ref: statementId, level_of_assurance: level, assurance_status: 'verified' }, actorId)
    historyRow(d.org_id, 'decarb_unit_record', d.id, statementId, level, 'written_back', at)
    audit(null, { orgId: d.org_id, serviceId, eventType: 'decarb_record.verified', entityType: 'decarb_unit_record', entityId: d.id, summary: `decarb_unit record ${d.good} ${d.period_start.slice(0, 4)} marked verified (${level} assurance)`, after: { status: 'verified', level_of_assurance: level, assurance_ref: statementId } })
  }
}

/**
 * Withdrawal step 3 (PRD §8.6, FR-90): every record that relied on the statement loses verified status and shows
 * "assurance withdrawn"; verified figures stay readable in the history, nothing is deleted.
 */
export function withdrawRecordsFor(statementId: string, actorId: string): number {
  const s = getStore()
  const at = nowIsoString()
  let n = 0
  for (const inv of s.where('inventories', (i) => i.assurance_ref === statementId)) {
    s.update('inventories', inv.id, { status: 'withdrawn', assurance_status: 'withdrawn' }, actorId)
    historyRow(inv.org_id, 'inventory', inv.id, statementId, inv.level_of_assurance ?? 'reasonable', 'withdrawn', at)
    audit(null, { orgId: inv.org_id, serviceId: inv.service_id, eventType: 'record.assurance_withdrawn', entityType: 'inventory', entityId: inv.id, summary: `GHG inventory ${inv.year}: assurance withdrawn (statement withdrawn)`, before: { status: inv.status }, after: { status: 'withdrawn' } })
    n++
  }
  for (const ef of s.where('emissionFactors', (e) => e.assurance_ref === statementId)) {
    s.update('emissionFactors', ef.id, { status: 'withdrawn', assurance_status: 'withdrawn' }, actorId)
    historyRow(ef.org_id, 'emission_factor', ef.id, statementId, ef.level_of_assurance ?? 'reasonable', 'withdrawn', at)
    audit(null, { orgId: ef.org_id, serviceId: ef.service_id, eventType: 'record.assurance_withdrawn', entityType: 'emission_factor', entityId: ef.id, summary: `${ef.product_name} ${ef.year}: assurance withdrawn (statement withdrawn)`, before: { status: ef.status }, after: { status: 'withdrawn' } })
    n++
  }
  for (const d of s.where('decarbRecords', (r) => r.assurance_ref === statementId)) {
    s.update('decarbRecords', d.id, { status: 'withdrawn', assurance_status: 'withdrawn' }, actorId)
    historyRow(d.org_id, 'decarb_unit_record', d.id, statementId, d.level_of_assurance ?? 'reasonable', 'withdrawn', at)
    audit(null, { orgId: d.org_id, serviceId: d.service_id, eventType: 'record.assurance_withdrawn', entityType: 'decarb_unit_record', entityId: d.id, summary: `decarb_unit record ${d.good} ${d.period_start.slice(0, 4)}: assurance withdrawn (statement withdrawn)`, before: { status: d.status }, after: { status: 'withdrawn' } })
    n++
  }
  return n
}

/** Revision (PRD FR-89): the records of the service go back under verification so the team can re-enter figures. */
export function reopenRecordsForRevision(serviceId: string, actorId: string): void {
  const s = getStore()
  for (const inv of s.where('inventories', (i) => i.service_id === serviceId && i.status === 'verified')) s.update('inventories', inv.id, { status: 'under_verification' }, actorId)
  for (const ef of s.where('emissionFactors', (e) => e.service_id === serviceId && e.status === 'verified')) s.update('emissionFactors', ef.id, { status: 'under_verification' }, actorId)
  for (const d of s.where('decarbRecords', (r) => r.service_id === serviceId && r.status === 'verified')) s.update('decarbRecords', d.id, { status: 'under_verification' }, actorId)
}

export function currentYear(): number {
  return Number(todayIso().slice(0, 4))
}

export function viewerOrgId(): string {
  return authContext().orgId
}
