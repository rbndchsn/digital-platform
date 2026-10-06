/**
 * Materiality setting, misstatement register and aggregation (PRD v0.3 §6.18, FR-84–FR-87). The platform computes,
 * displays, warns and records who decided what; it never chooses the opinion type.
 */
import type { AssertionBase, LevelOfAssurance, MaterialityBasis, MisstatementDirection, MisstatementNature, MisstatementRecordType, OpinionType } from '@/domain/enums'
import type { AuthContext } from '@/domain/policy'
import { aggregateMisstatements, assertionUnit, thresholdAbs, type Aggregation } from '@/domain/compute/materiality'
import type { MaterialitySetting, Misstatement, OpinionIteration } from '@/domain/schemas'
import { materialityMachine, misstatementMachine } from '@/domain/workflow/machines'
import { templateFor } from '@/domain/workflow/templates'
import { ApiError, audit, auditNow, authorize, call, getStore, newId, notify, nowIsoString, serviceAudience, serviceResource, userName } from './core'
import { requireReason } from './steps'

// ---------------------------------------------------------------- assertion base
/** The declared value of the assertion the threshold applies to (PRD FR-84). */
export function assertionDeclaredValue(serviceId: string, base: AssertionBase): { value: number | null; unit: string } {
  const s = getStore()
  const inv = s.where('inventories', (i) => i.service_id === serviceId)[0]
  const ef = s.where('emissionFactors', (e) => e.service_id === serviceId)[0]
  const dcu = s.where('decarbRecords', (d) => d.service_id === serviceId)
  switch (base) {
    case 'total_gross_tco2e':
      return { value: inv?.declared_totals_json?.gross_tco2e ?? null, unit: 'tCO2e' }
    case 'scope_1_2_gross_tco2e':
      return { value: inv ? (inv.declared_totals_json?.by_scope['1'] ?? 0) + (inv.declared_totals_json?.by_scope['2'] ?? 0) : null, unit: 'tCO2e' }
    case 'ef_value':
      return { value: ef?.declared_value ?? null, unit: assertionUnit('ef_value', ef?.value_unit) }
    case 'reduction_units':
      return { value: dcu.length ? dcu.reduce((a, d) => a + (d.declared_reduction_units ?? 0), 0) : null, unit: 'tCO2e' }
  }
}

// ---------------------------------------------------------------- materiality setting
export interface MaterialityView extends MaterialitySetting {
  setByName: string | null
  approvedByName: string | null
  templateDefault: { assertion_base: AssertionBase; threshold_pct: number; basis: MaterialityBasis; basis_note: string; qualitative: string[] } | null
  applies: boolean
}

export function materialitySync(serviceId: string): MaterialityView | null {
  const s = getStore()
  const svc = s.get('services', serviceId)
  const template = templateFor(svc.service_type)
  const row = s.where('materialitySettings', (m) => m.service_id === serviceId)[0]
  if (!row) return null
  return { ...row, setByName: row.set_by ? userName(row.set_by) : null, approvedByName: row.approved_by ? userName(row.approved_by) : null, templateDefault: template.materiality_defaults, applies: template.assurance.applies }
}

/** Creates the draft setting from the template defaults when a service enters planning (idempotent). */
export function ensureMaterialityDraft(serviceId: string, actorId: string | null): MaterialitySetting | null {
  const s = getStore()
  const svc = s.get('services', serviceId)
  const template = templateFor(svc.service_type)
  if (!template.assurance.applies || !template.materiality_defaults) return null
  const existing = s.where('materialitySettings', (m) => m.service_id === serviceId)[0]
  if (existing) return existing
  const d = template.materiality_defaults
  const base = assertionDeclaredValue(serviceId, d.assertion_base)
  const row: MaterialitySetting = {
    ...auditNow(actorId),
    id: newId('mat'),
    service_id: serviceId,
    level_of_assurance: svc.level_of_assurance,
    assertion_base: d.assertion_base,
    assertion_declared_value: base.value,
    assertion_unit: base.unit,
    threshold_pct: svc.scope_json.materiality_pct ?? d.threshold_pct,
    threshold_abs: thresholdAbs(svc.scope_json.materiality_pct ?? d.threshold_pct, base.value),
    basis: d.basis,
    basis_note: d.basis_note || null,
    qualitative_json: [...d.qualitative],
    template_defaults_json: { assertion_base: d.assertion_base, threshold_pct: d.threshold_pct, basis: d.basis },
    status: 'draft',
    set_by: null,
    approved_by: null,
    approved_at: null,
  }
  s.insert('materialitySettings', row)
  return row
}

export async function get(serviceId: string): Promise<MaterialityView | null> {
  return call(() => {
    authorize('service.read', serviceResource(serviceId))
    ensureMaterialityDraft(serviceId, null)
    return materialitySync(serviceId)
  })
}

export interface MaterialityInput {
  assertion_base: AssertionBase
  threshold_pct: number
  basis: MaterialityBasis
  basis_note: string | null
  qualitative: string[]
  reason?: string
}

/** Team leader (or manager) sets or changes the setting; a change after approval needs a reason and reopens it (FR-84). */
export async function set(serviceId: string, input: MaterialityInput): Promise<MaterialityView> {
  return call(() => {
    const ctx = authorize('materiality.set', serviceResource(serviceId))
    const s = getStore()
    const row = ensureMaterialityDraft(serviceId, ctx.userId) ?? s.where('materialitySettings', (m) => m.service_id === serviceId)[0]
    if (!row) throw new ApiError('validation', 'Materiality does not apply to this service type.')
    const svc = s.get('services', serviceId)
    if (s.where('statements', (st) => st.service_id === serviceId && st.status === 'issued').length) throw new ApiError('conflict', 'The opinion is issued; materiality can no longer change.', { code: 'issued_immutable' })
    const wasApproved = row.status === 'approved'
    const reason = wasApproved ? requireReason(input.reason) : (input.reason?.trim() || null)
    if (input.threshold_pct < 0 || input.threshold_pct > 100) throw new ApiError('validation', 'The threshold is a percentage between 0 and 100.')
    const base = assertionDeclaredValue(serviceId, input.assertion_base)
    const patch: Partial<MaterialitySetting> = {
      level_of_assurance: svc.level_of_assurance,
      assertion_base: input.assertion_base,
      assertion_declared_value: base.value,
      assertion_unit: base.unit,
      threshold_pct: input.threshold_pct,
      threshold_abs: thresholdAbs(input.threshold_pct, base.value),
      basis: input.basis,
      basis_note: input.basis_note,
      qualitative_json: input.qualitative,
      set_by: ctx.userId,
    }
    if (wasApproved) Object.assign(patch, { status: materialityMachine.apply(row.status, 'reopen').state, approved_by: null, approved_at: null })
    const updated = s.update('materialitySettings', row.id, patch, ctx.userId)
    audit(ctx, { orgId: svc.org_id, serviceId, eventType: 'materiality.changed', entityType: 'materiality_setting', entityId: row.id, summary: `Materiality ${wasApproved ? 'changed after approval (returned to draft)' : 'set'} by ${userName(ctx.userId)}: ${input.threshold_pct} % of ${input.assertion_base.replace(/_/g, ' ')}${base.value != null ? ` (${patch.threshold_abs} ${base.unit})` : ''}${reason ? ` — ${reason}` : ''}`, reason, before: { assertion_base: row.assertion_base, threshold_pct: row.threshold_pct, basis: row.basis, status: row.status }, after: { assertion_base: input.assertion_base, threshold_pct: input.threshold_pct, basis: input.basis, status: updated.status } })
    notify(serviceAudience(serviceId, 'verifier').filter((u) => u !== ctx.userId), 'org_verifassur', 'materiality_changed', `Materiality ${wasApproved ? 'changed' : 'set'} on ${svc.reference}`, `${userName(ctx.userId)} set materiality to ${input.threshold_pct} % of ${input.assertion_base.replace(/_/g, ' ')}.${wasApproved ? ' It must be approved again.' : ''}`, serviceId)
    return materialitySync(serviceId)!
  })
}

/** Manager approves the setting together with the audit plan (FR-84; plan_v1 §8 D18). */
export async function approve(serviceId: string, comment?: string): Promise<MaterialityView> {
  return call(() => {
    const ctx = authorize('materiality.approve', serviceResource(serviceId))
    const s = getStore()
    const row = ensureMaterialityDraft(serviceId, ctx.userId)
    if (!row) throw new ApiError('validation', 'Materiality does not apply to this service type.')
    const { state } = materialityMachine.apply(row.status, 'approve')
    s.update('materialitySettings', row.id, { status: state, approved_by: ctx.userId, approved_at: nowIsoString() }, ctx.userId)
    const svc = s.get('services', serviceId)
    audit(ctx, { orgId: svc.org_id, serviceId, eventType: 'materiality.approved', entityType: 'materiality_setting', entityId: row.id, summary: `Materiality approved by ${userName(ctx.userId)}: ${row.threshold_pct} % of ${row.assertion_base.replace(/_/g, ' ')}${row.threshold_abs != null ? ` (${row.threshold_abs} ${row.assertion_unit})` : ''}${comment ? ` — ${comment}` : ''}`, before: { status: row.status }, after: { status: state } })
    return materialitySync(serviceId)!
  })
}

// ---------------------------------------------------------------- misstatements
export interface MisstatementView extends Misstatement {
  confirmedByName: string | null
  findingLabel: string | null
  recordLabel: string | null
  pctOfBase: number | null
}

export function misstatementsSync(serviceId: string): MisstatementView[] {
  const s = getStore()
  const setting = s.where('materialitySettings', (m) => m.service_id === serviceId)[0]
  return s
    .where('misstatements', (m) => m.service_id === serviceId)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .map((m) => {
      const f = m.finding_id ? s.find('findings', m.finding_id) : null
      let recordLabel: string | null = null
      if (m.record_type === 'inventory' && m.record_id) {
        const inv = s.find('inventories', m.record_id)
        const line = m.record_line_id ? s.find('inventoryLines', m.record_line_id) : null
        recordLabel = inv ? `Inventory ${inv.year}${line ? ` · ${line.activity}` : ''}` : null
      } else if (m.record_type === 'emission_factor' && m.record_id) {
        const ef = s.find('emissionFactors', m.record_id)
        recordLabel = ef ? `${ef.product_name} ${ef.year}` : null
      } else if (m.record_type === 'decarb_unit_record' && m.record_id) {
        const d = s.find('decarbRecords', m.record_id)
        recordLabel = d ? `${d.good} ${d.period_start.slice(0, 4)}` : null
      }
      return { ...m, confirmedByName: m.confirmed_by ? userName(m.confirmed_by) : null, findingLabel: f ? `${f.type} #${f.number}` : null, recordLabel, pctOfBase: setting?.assertion_declared_value && m.nature === 'quantitative' ? Math.round((m.amount / Math.abs(setting.assertion_declared_value)) * 10000) / 100 : null }
    })
}

export async function list(serviceId: string): Promise<MisstatementView[]> {
  return call(() => {
    authorize('service.read', serviceResource(serviceId))
    return misstatementsSync(serviceId)
  })
}

export interface MisstatementInput {
  direction: MisstatementDirection
  amount: number
  amount_unit: string
  nature: MisstatementNature
  material_candidate?: boolean
  description: string
  finding_id?: string | null
  record_type?: MisstatementRecordType | null
  record_id?: string | null
  record_line_id?: string | null
  /** Manual entries by the team are confirmed immediately; `true` leaves them proposed. */
  propose_only?: boolean
}

function insertMisstatement(ctx: AuthContext, serviceId: string, input: MisstatementInput, source: Misstatement['source']): Misstatement {
  const s = getStore()
  const svc = s.get('services', serviceId)
  if (!input.description.trim()) throw new ApiError('validation', 'Describe the misstatement.')
  if (input.nature === 'quantitative' && !(input.amount >= 0)) throw new ApiError('validation', 'Enter the amount.')
  const confirmed = source !== 'system' && !input.propose_only
  const row: Misstatement = {
    ...auditNow(ctx.userId),
    id: newId('mis'),
    service_id: serviceId,
    org_id: svc.org_id,
    iteration_id: s.where('iterations', (i) => i.service_id === serviceId && i.status !== 'issued' && i.status !== 'changes_requested')[0]?.id ?? null,
    finding_id: input.finding_id ?? null,
    record_type: input.record_type ?? null,
    record_id: input.record_id ?? null,
    record_line_id: input.record_line_id ?? null,
    source,
    direction: input.direction,
    amount: input.nature === 'quantitative' ? input.amount : 0,
    amount_unit: input.amount_unit,
    nature: input.nature,
    material_candidate: input.material_candidate ?? false,
    description: input.description.trim(),
    status: confirmed ? 'confirmed' : 'proposed',
    dismiss_reason: null,
    corrected: false,
    corrected_revision_ref: null,
    confirmed_by: confirmed ? ctx.userId : null,
    confirmed_at: confirmed ? nowIsoString() : null,
  }
  s.insert('misstatements', row)
  audit(ctx, { orgId: svc.org_id, serviceId, eventType: confirmed ? 'misstatement.confirmed' : 'misstatement.proposed', entityType: 'misstatement', entityId: row.id, summary: `Misstatement ${confirmed ? 'registered' : 'proposed'}${source === 'system' ? ' by the platform' : ` by ${userName(ctx.userId)}`}: ${row.direction} of ${row.nature === 'quantitative' ? `${row.amount} ${row.amount_unit}` : 'qualitative nature'} — ${row.description}`, after: { status: row.status, direction: row.direction, amount: row.amount } })
  if (!confirmed) notify([...(svc.team_leader_user_id ? [svc.team_leader_user_id] : [])], 'org_verifassur', 'misstatement_proposed', `Misstatement proposed on ${svc.reference}`, `${row.description}. Confirm or dismiss it in the misstatement register.`, serviceId)
  return row
}

/** System proposal from an adjusted-versus-declared difference (FR-85). Returns false when an identical proposal is open. */
export function proposeFromAdjustment(ctx: AuthContext, serviceId: string, input: { recordType: MisstatementRecordType; recordId: string; recordLineId: string | null; direction: MisstatementDirection; amount: number; unit: string; description: string }): boolean {
  const s = getStore()
  const dup = s.where('misstatements', (m) => m.service_id === serviceId && m.record_id === input.recordId && m.record_line_id === input.recordLineId && m.source === 'system' && m.status === 'proposed')
  for (const d of dup) s.update('misstatements', d.id, { direction: input.direction, amount: input.amount, description: input.description }, ctx.userId)
  if (dup.length) return false
  insertMisstatement(ctx, serviceId, { direction: input.direction, amount: input.amount, amount_unit: input.unit, nature: 'quantitative', description: input.description, record_type: input.recordType, record_id: input.recordId, record_line_id: input.recordLineId, propose_only: true }, 'system')
  return true
}

export async function create(serviceId: string, input: MisstatementInput): Promise<MisstatementView[]> {
  return call(() => {
    const ctx = authorize('misstatement.manage', serviceResource(serviceId))
    insertMisstatement(ctx, serviceId, input, input.finding_id ? 'finding' : 'manual')
    return misstatementsSync(serviceId)
  })
}

export async function confirm(serviceId: string, misstatementId: string): Promise<MisstatementView[]> {
  return call(() => {
    const ctx = authorize('misstatement.manage', serviceResource(serviceId))
    const s = getStore()
    const m = s.get('misstatements', misstatementId)
    const { state } = misstatementMachine.apply(m.status, 'confirm')
    s.update('misstatements', misstatementId, { status: state, confirmed_by: ctx.userId, confirmed_at: nowIsoString() }, ctx.userId)
    const svc = s.get('services', serviceId)
    audit(ctx, { orgId: svc.org_id, serviceId, eventType: 'misstatement.confirmed', entityType: 'misstatement', entityId: misstatementId, summary: `Misstatement confirmed by ${userName(ctx.userId)}: ${m.description}`, before: { status: m.status }, after: { status: state } })
    return misstatementsSync(serviceId)
  })
}

export async function dismiss(serviceId: string, misstatementId: string, reason: string): Promise<MisstatementView[]> {
  return call(() => {
    const ctx = authorize('misstatement.manage', serviceResource(serviceId))
    const r = requireReason(reason)
    const s = getStore()
    const m = s.get('misstatements', misstatementId)
    const { state } = misstatementMachine.apply(m.status, 'dismiss')
    s.update('misstatements', misstatementId, { status: state, dismiss_reason: r }, ctx.userId)
    const svc = s.get('services', serviceId)
    audit(ctx, { orgId: svc.org_id, serviceId, eventType: 'misstatement.dismissed', entityType: 'misstatement', entityId: misstatementId, summary: `Misstatement dismissed by ${userName(ctx.userId)} — ${r}`, reason: r, before: { status: m.status }, after: { status: state } })
    return misstatementsSync(serviceId)
  })
}

/** The client corrected the declared value in a new revision (FR-42, FR-85). */
export async function markCorrected(serviceId: string, misstatementId: string, revisionRef: string): Promise<MisstatementView[]> {
  return call(() => {
    const ctx = authorize('misstatement.manage', serviceResource(serviceId))
    const s = getStore()
    const m = s.get('misstatements', misstatementId)
    if (m.status !== 'confirmed') throw new ApiError('conflict', 'Only a confirmed misstatement can be marked as corrected.')
    if (!revisionRef.trim()) throw new ApiError('validation', 'Reference the correcting revision.')
    s.update('misstatements', misstatementId, { corrected: true, corrected_revision_ref: revisionRef.trim() }, ctx.userId)
    const svc = s.get('services', serviceId)
    audit(ctx, { orgId: svc.org_id, serviceId, eventType: 'misstatement.corrected', entityType: 'misstatement', entityId: misstatementId, summary: `Misstatement marked corrected by ${userName(ctx.userId)} (${revisionRef.trim()}): ${m.description}`, before: { corrected: false }, after: { corrected: true, corrected_revision_ref: revisionRef.trim() } })
    return misstatementsSync(serviceId)
  })
}

// ---------------------------------------------------------------- aggregation panel (FR-86, FR-87)
export interface AggregationView extends Aggregation {
  setting: MaterialityView | null
  quantitative: MisstatementView[]
  qualitative: MisstatementView[]
  proposed: MisstatementView[]
  draftOpinionType: OpinionType | null
}

export function aggregationSync(serviceId: string, draftOpinionType: OpinionType | null): AggregationView {
  const setting = materialitySync(serviceId)
  const all = misstatementsSync(serviceId)
  const agg = aggregateMisstatements(all, setting, draftOpinionType)
  const uncorrected = all.filter((m) => m.status === 'confirmed' && !m.corrected)
  return { ...agg, setting, quantitative: uncorrected.filter((m) => m.nature === 'quantitative'), qualitative: uncorrected.filter((m) => m.nature === 'qualitative'), proposed: all.filter((m) => m.status === 'proposed'), draftOpinionType }
}

export async function aggregate(serviceId: string, iterationId?: string): Promise<AggregationView> {
  return call(() => {
    authorize('service.read', serviceResource(serviceId))
    const s = getStore()
    const it: OpinionIteration | undefined = iterationId ? s.find('iterations', iterationId) : s.where('iterations', (i) => i.service_id === serviceId).sort((a, b) => b.iteration_no - a.iteration_no)[0]
    return aggregationSync(serviceId, it?.summary_json.opinion_type ?? null)
  })
}

export type { Aggregation, LevelOfAssurance }
