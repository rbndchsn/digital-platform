/**
 * Opinion iterations, independent review, manager decision, issuance and statements (PRD §6.5, §8.6).
 * PRD v0.3: decision separation (FR-79), materiality aggregation and acknowledgement (FR-86, FR-87), statements
 * with status, revision issuance (FR-89) and the public page that never disappears (FR-36).
 */
import type { IterationDocRole, LevelOfAssurance, OpinionType } from '@/domain/enums'
import { decide } from '@/domain/policy'
import type { ChecklistItem, Document, DocumentVersion, IterationDocument, MaterialityAck, OpinionIteration, OpinionStatement, VerifiedFigure } from '@/domain/schemas'
import { iterationMachine, postIssuanceMachine, serviceMachine, statementMachine } from '@/domain/workflow/machines'
import { MATERIALITY_CHECKLIST_KEY, templateFor } from '@/domain/workflow/templates'
import { fakeSha256, publicCode } from '@/mock/ids'
import { ApiError, audit, auditNow, authContext, authorize, call, getStore, newId, notify, nowIsoString, orgName, serviceAudience, serviceResource, userName } from './core'
import { versionView, type VersionView } from './documents'
import { decisionResource, eligibilitySync, eligibleManagersSync, type Eligibility } from './involved'
import { aggregationSync, ensureMaterialityDraft, type AggregationView } from './materiality'
import { writeBackVerifiedRecords } from './records'
import { transitionStepInternal } from './steps'

export interface IterationView extends OpinionIteration {
  documents: { id: string; role: IterationDocRole; title: string; version: VersionView }[]
  irName: string | null
  managerName: string | null
  createdByName: string
  blockingFindingsOpen: number
  /** PRD v0.3 FR-86: live aggregation of the service's uncorrected misstatements against materiality. */
  aggregation: AggregationView
  /** PRD v0.3 FR-79: whether the viewer may take the manager decision on this iteration, and why not. */
  decision: Eligibility
  ackIrName: string | null
  ackManagerName: string | null
  revisionOfCode: string | null
}

export interface StatementView extends OpinionStatement {
  serviceReference: string
  serviceName: string
  serviceType: string
  standard: string
  clientName: string
  periodStart: string
  periodEnd: string
  issuedByName: string
  verifyUrlPath: string
  supersededByCode: string | null
  withdrawnByName: string | null
  /** True on the public page when the client opted out of public display (banners still show, PRD FR-36). */
  hidden: boolean
}

const DOC_TITLES: Record<IterationDocRole, string> = {
  report: 'Verification report',
  findings_report: 'Findings report',
  opinion: 'Opinion statement (draft)',
  calc_check: 'Calculation checks',
  ir_report: 'Independent review report',
  ir_checklist: 'Independent review checklist',
  manager_checklist: 'Manager checklist',
}

export function iterationView(it: OpinionIteration): IterationView {
  const s = getStore()
  const documents = s
    .where('iterationDocuments', (d) => d.iteration_id === it.id)
    .map((d) => {
      const v = s.find('documentVersions', d.document_version_id)
      const doc = v ? s.find('documents', v.document_id) : null
      return v && doc ? { id: d.id, role: d.role, title: doc.title, version: versionView(v) } : null
    })
    .filter((x): x is IterationView['documents'][number] => x !== null)
  let decision: Eligibility
  try {
    decision = eligibilitySync(it.service_id, 'iteration.manager_decide')
  } catch {
    decision = { allowed: false, reasons: [], code: null, eligibleManagers: [] }
  }
  return {
    ...it,
    documents,
    irName: it.ir_user_id ? userName(it.ir_user_id) : null,
    managerName: it.manager_user_id ? userName(it.manager_user_id) : null,
    createdByName: userName(it.created_by),
    blockingFindingsOpen: s.where('findings', (f) => f.service_id === it.service_id && f.blocking && f.status !== 'closed' && f.status !== 'withdrawn').length,
    aggregation: aggregationSync(it.service_id, it.summary_json.opinion_type),
    decision,
    ackIrName: it.materiality_ack_ir_json ? userName(it.materiality_ack_ir_json.user_id) : null,
    ackManagerName: it.materiality_ack_manager_json ? userName(it.materiality_ack_manager_json.user_id) : null,
    revisionOfCode: it.revision_of_statement_id ? (s.find('statements', it.revision_of_statement_id)?.public_code ?? null) : null,
  }
}

export async function list(serviceId: string): Promise<IterationView[]> {
  return call(() => {
    authorize('service.read', serviceResource(serviceId))
    return getStore()
      .where('iterations', (i) => i.service_id === serviceId)
      .sort((a, b) => b.iteration_no - a.iteration_no)
      .map(iterationView)
  })
}

export interface CreateIterationInput {
  opinionType: OpinionType
  /** Ignored since PRD v0.3: the level of assurance is the service's (FR-81). Kept for callers. */
  levelOfAssurance?: LevelOfAssurance
  narrative: string
  figures: VerifiedFigure[]
}

/** Default figures proposed from the records attached to the service (client-declared values). */
export function suggestedFigures(serviceId: string): VerifiedFigure[] {
  const s = getStore()
  const figures: VerifiedFigure[] = []
  for (const inv of s.where('inventories', (i) => i.service_id === serviceId)) {
    const t = inv.verified_totals_json ?? inv.declared_totals_json
    if (!t) continue
    figures.push({ key: 'scope1', label: 'Scope 1', value: t.by_scope['1'] ?? 0, unit: 'tCO2e' })
    figures.push({ key: 'scope2', label: 'Scope 2', value: t.by_scope['2'] ?? 0, unit: 'tCO2e' })
    figures.push({ key: 'scope3', label: 'Scope 3', value: t.by_scope['3'] ?? 0, unit: 'tCO2e' })
    if (t.biogenic_co2_t) figures.push({ key: 'biogenic', label: 'Biogenic CO2 (reported separately)', value: t.biogenic_co2_t, unit: 't' })
    if (t.removals_tco2e) figures.push({ key: 'removals', label: 'Removals (reported separately)', value: t.removals_tco2e, unit: 'tCO2e' })
  }
  for (const d of s.where('decarbRecords', (r) => r.service_id === serviceId)) {
    figures.push({ key: `reduction_${d.id}`, label: `Reduction decarb_units — ${d.good}`, value: d.verified_reduction_units ?? d.declared_reduction_units ?? 0, unit: 'tCO2e' })
    if (d.declared_removal_units) figures.push({ key: `removal_${d.id}`, label: `Removal decarb_units — ${d.good}`, value: d.verified_removal_units ?? d.declared_removal_units, unit: 'tCO2e' })
    figures.push({ key: `factor_${d.id}`, label: `Decarb factor (gross) — ${d.good}`, value: d.decarb_factor_gross ?? 0, unit: d.factor_unit ?? 'tCO2e/t' })
  }
  for (const ef of s.where('emissionFactors', (e) => e.service_id === serviceId)) {
    figures.push({ key: `ef_${ef.id}`, label: ef.product_name, value: ef.verified_value ?? ef.declared_value, unit: ef.value_unit })
  }
  return figures
}

export async function create(serviceId: string, input: CreateIterationInput): Promise<IterationView> {
  return call(() => {
    const ctx = authorize('iteration.create', serviceResource(serviceId))
    const s = getStore()
    const svc = s.get('services', serviceId)
    const open = s.where('iterations', (i) => i.service_id === serviceId && !['changes_requested', 'issued'].includes(i.status))
    if (open.length) throw new ApiError('conflict', `Iteration ${open[0].iteration_no} is still ${open[0].status.replace('_', ' ')}.`)
    const no = s.where('iterations', (i) => i.service_id === serviceId).length + 1
    const template = templateFor(svc.service_type)
    ensureMaterialityDraft(serviceId, ctx.userId)
    const revising = svc.status === 'in_revision' ? (s.where('statements', (st) => st.service_id === serviceId && st.status === 'issued')[0] ?? null) : null
    const it: OpinionIteration = {
      ...auditNow(ctx.userId),
      id: newId('itr'),
      service_id: serviceId,
      iteration_no: no,
      status: 'draft',
      summary_json: { opinion_type: input.opinionType, level_of_assurance: svc.level_of_assurance, figures: input.figures, narrative: input.narrative },
      submitted_for_ir_at: null,
      ir_user_id: s.where('team', (t) => t.service_id === serviceId && t.service_role === 'verifier_independent_reviewer' && t.status !== 'removed')[0]?.user_id ?? null,
      ir_decision: null,
      ir_comment: null,
      ir_decided_at: null,
      manager_user_id: null,
      manager_decision: null,
      manager_comment: null,
      manager_decided_at: null,
      checklist_ir_json: template.ir_checklist.map((c) => ({ ...c, checked: false })),
      checklist_manager_json: template.manager_checklist.map((c) => ({ ...c, checked: false })),
      aggregation_json: null,
      materiality_warning: false,
      materiality_ack_ir_json: null,
      materiality_ack_manager_json: null,
      revision_of_statement_id: revising?.id ?? null,
      returned_to_ir_count: 0,
    }
    s.insert('iterations', it)
    // The bundle documents are created as placeholders the team leader "uploads" (simulated).
    for (const role of ['report', 'findings_report', 'opinion', 'calc_check'] as IterationDocRole[]) attachInternal(serviceId, it.id, role, `${svc.reference}_${DOC_TITLES[role].replace(/[^a-z0-9]+/gi, '-')}_it${no}.pdf`, ctx.userId)
    audit(ctx, { orgId: svc.org_id, serviceId, eventType: 'iteration.created', entityType: 'opinion_iteration', entityId: it.id, summary: `Opinion iteration ${no} created by ${userName(ctx.userId)}${revising ? ` (revision of statement ${revising.public_code})` : ''}`, after: { status: 'draft', revision_of_statement_id: revising?.id ?? null } })
    if (svc.status === 'in_revision') {
      const { state } = serviceMachine.apply(svc.status, 'revision_to_opinion_review')
      s.update('services', serviceId, { status: state }, ctx.userId)
      audit(null, { orgId: svc.org_id, serviceId, eventType: 'service.status_changed', entityType: 'service', entityId: serviceId, summary: 'Service moved to opinion review (revision iteration created)', before: { status: 'in_revision' }, after: { status: state } })
    }
    const step = s.where('steps', (st) => st.service_id === serviceId && st.key === 'final_opinion')[0]
    if (step && (step.status === 'not_started' || step.status === 'planned')) {
      try {
        transitionStepInternal(serviceId, step.id, 'start', ctx.userId)
      } catch {
        /* earlier steps still open: the iteration can still be drafted */
      }
    }
    return iterationView(s.get('iterations', it.id))
  })
}

function attachInternal(serviceId: string, iterationId: string, role: IterationDocRole, filename: string, actorId: string): IterationDocument {
  const s = getStore()
  const svc = s.get('services', serviceId)
  const at = nowIsoString()
  const doc: Document = { ...auditNow(actorId), id: newId('doc'), org_id: svc.org_id, service_id: serviceId, slot_id: null, title: DOC_TITLES[role], category: role.startsWith('ir_') ? 'ir' : role.endsWith('checklist') ? 'checklist' : 'reporting', current_version_id: null, locked_at: null }
  const ver: DocumentVersion = { ...auditNow(actorId), id: newId('ver'), document_id: doc.id, version_no: 1, r2_key: `org/${svc.org_id}/doc/${doc.id}/v1/${filename}`, filename, mime_type: 'application/pdf', size_bytes: 240_000 + (filename.length * 7_919) % 900_000, sha256: fakeSha256(`${doc.id}:${filename}:${at}`), uploaded_by: actorId, uploaded_at: at, source: 'manual', check_status: 'accepted', checked_by: actorId, checked_at: at, reject_reason: null }
  doc.current_version_id = ver.id
  s.insert('documents', doc)
  s.insert('documentVersions', ver)
  const link: IterationDocument = { ...auditNow(actorId), id: newId('itd'), iteration_id: iterationId, document_version_id: ver.id, role }
  s.insert('iterationDocuments', link)
  return link
}

export async function attachDocument(serviceId: string, iterationId: string, role: IterationDocRole, filename: string): Promise<IterationView> {
  return call(() => {
    const ctx = authorize(role.startsWith('ir_') ? 'iteration.ir_decide' : role === 'manager_checklist' ? 'iteration.manager_decide' : 'iteration.create', serviceResource(serviceId))
    const it = getStore().get('iterations', iterationId)
    if (it.status === 'issued') throw new ApiError('conflict', 'Issued iterations are locked.')
    attachInternal(serviceId, iterationId, role, filename, ctx.userId)
    audit(ctx, { orgId: getStore().get('services', serviceId).org_id, serviceId, eventType: 'iteration.document_attached', entityType: 'opinion_iteration', entityId: iterationId, summary: `${DOC_TITLES[role]} attached to iteration ${it.iteration_no}` })
    return iterationView(getStore().get('iterations', iterationId))
  })
}

/** Team leader changes the draft opinion type before submission (PRD FR-87 `draft_opinion_type`). */
export async function setDraftOpinionType(serviceId: string, iterationId: string, opinionType: OpinionType): Promise<IterationView> {
  return call(() => {
    const ctx = authorize('iteration.create', serviceResource(serviceId))
    const s = getStore()
    const it = s.get('iterations', iterationId)
    if (it.status !== 'draft') throw new ApiError('conflict', 'The opinion type can only change while the iteration is a draft.')
    const updated = s.update('iterations', iterationId, { summary_json: { ...it.summary_json, opinion_type: opinionType } }, ctx.userId)
    audit(ctx, { orgId: s.get('services', serviceId).org_id, serviceId, eventType: 'iteration.draft_opinion_type_changed', entityType: 'opinion_iteration', entityId: iterationId, summary: `Draft opinion type of iteration ${it.iteration_no} set to ${opinionType} by ${userName(ctx.userId)}`, before: { opinion_type: it.summary_json.opinion_type }, after: { opinion_type: opinionType } })
    return iterationView(updated)
  })
}

export async function submitForIr(serviceId: string, iterationId: string): Promise<IterationView> {
  return call(() => {
    const ctx = authorize('iteration.submit_for_ir', serviceResource(serviceId))
    const s = getStore()
    const it = s.get('iterations', iterationId)
    const { state } = iterationMachine.apply(it.status, 'submit_for_ir')
    const svc = s.get('services', serviceId)
    // PRD v0.3 FR-86, FR-87: snapshot the aggregation panel and raise the consistency warning when due.
    const agg = aggregationSync(serviceId, it.summary_json.opinion_type)
    const snapshot = { gross: agg.gross, net: agg.net, gross_pct: agg.gross_pct, net_pct: agg.net_pct, threshold_abs: agg.threshold_abs, threshold_pct: agg.threshold_pct, unit: agg.unit, exceeds: agg.exceeds, qualitative_count: agg.qualitative_count, material_qualitative: agg.material_qualitative, confirmed_count: agg.confirmed_count, corrected_count: agg.corrected_count, warning: agg.warning, warning_reason: agg.warning_reason, snapshot_at: nowIsoString() }
    const updated = s.update('iterations', iterationId, { status: state, submitted_for_ir_at: nowIsoString(), aggregation_json: snapshot, materiality_warning: agg.warning }, ctx.userId)
    audit(ctx, { orgId: svc.org_id, serviceId, eventType: 'iteration.submitted_for_ir', entityType: 'opinion_iteration', entityId: iterationId, summary: `Iteration ${it.iteration_no} submitted for independent review (uncorrected misstatements: ${agg.gross} ${agg.unit} gross${agg.threshold_abs != null ? ` vs materiality ${agg.threshold_abs} ${agg.unit}` : ''})`, before: { status: it.status }, after: { status: state, materiality_warning: agg.warning } })
    if (agg.warning) {
      audit(ctx, { orgId: svc.org_id, serviceId, eventType: 'materiality.warning_raised', entityType: 'opinion_iteration', entityId: iterationId, summary: `Inconsistency warning on iteration ${it.iteration_no}: ${agg.warning_reason}`, after: snapshot })
      const managers = s.where('memberships', (m) => m.org_id === 'org_verifassur' && m.role === 'verifier_manager' && m.status === 'active').map((m) => m.user_id)
      notify([...(it.ir_user_id ? [it.ir_user_id] : []), ...managers], 'org_verifassur', 'materiality_warning', `Materiality warning on ${svc.reference}`, `${agg.warning_reason} The reviewer and the decision-maker must acknowledge it with a comment.`, serviceId, { type: 'iteration', id: iterationId })
    }
    if (it.ir_user_id) notify([it.ir_user_id], 'org_verifassur', 'iteration_decision', `Independent review requested: ${svc.reference}`, `Iteration ${it.iteration_no} is ready for your review.`, serviceId, { type: 'iteration', id: iterationId })
    return iterationView(updated)
  })
}

export interface DecisionInput {
  decision: 'approve' | 'request_changes'
  comment: string
  checklist: ChecklistItem[]
  /** PRD v0.3 FR-87: required when the iteration carries the materiality warning. */
  materialityAck?: string | null
}

function requireAck(it: OpinionIteration, input: DecisionInput, ctx: { userId: string }): MaterialityAck | null {
  if (!it.materiality_warning) return null
  const comment = input.materialityAck?.trim() ?? ''
  if (!comment) throw new ApiError('validation', 'The materiality inconsistency warning must be acknowledged with a comment before deciding.', { code: 'acknowledgement_required' })
  return { user_id: ctx.userId, at: nowIsoString(), comment }
}

export async function irDecide(serviceId: string, iterationId: string, decision: 'approve' | 'request_changes', comment: string, checklist: ChecklistItem[], materialityAck?: string | null): Promise<IterationView> {
  return call(() => {
    const ctx = authorize('iteration.ir_decide', serviceResource(serviceId))
    const s = getStore()
    const it = s.get('iterations', iterationId)
    if (decision === 'approve' && checklist.some((c) => !c.checked)) throw new ApiError('validation', 'Complete every checklist item before approving.')
    if (decision === 'request_changes' && !comment.trim()) throw new ApiError('validation', 'Explain what must change.')
    const ack = requireAck(it, { decision, comment, checklist, materialityAck }, ctx)
    const { state } = iterationMachine.apply(it.status, decision === 'approve' ? 'ir_approve' : 'ir_request_changes')
    attachInternal(serviceId, iterationId, 'ir_report', `${s.get('services', serviceId).reference}_Independent-review-report_it${it.iteration_no}.pdf`, ctx.userId)
    attachInternal(serviceId, iterationId, 'ir_checklist', `${s.get('services', serviceId).reference}_IR-checklist_it${it.iteration_no}.pdf`, ctx.userId)
    const updated = s.update('iterations', iterationId, { status: state, ir_user_id: ctx.userId, ir_decision: decision, ir_comment: comment, ir_decided_at: nowIsoString(), checklist_ir_json: checklist, materiality_ack_ir_json: ack }, ctx.userId)
    const svc = s.get('services', serviceId)
    if (ack) audit(ctx, { orgId: svc.org_id, serviceId, eventType: 'materiality.warning_acknowledged', entityType: 'opinion_iteration', entityId: iterationId, summary: `Independent reviewer ${userName(ctx.userId)} acknowledged the materiality warning on iteration ${it.iteration_no}: ${ack.comment}`, reason: ack.comment })
    audit(ctx, { orgId: svc.org_id, serviceId, eventType: decision === 'approve' ? 'iteration.ir_approved' : 'iteration.ir_changes_requested', entityType: 'opinion_iteration', entityId: iterationId, summary: `Independent review: ${decision === 'approve' ? 'approved' : 'changes requested'} by ${userName(ctx.userId)}${comment ? `: ${comment}` : ''}`, before: { status: it.status }, after: { status: state } })
    notify([...(svc.team_leader_user_id ? [svc.team_leader_user_id] : []), ...serviceAudience(serviceId, 'verifier')], 'org_verifassur', 'iteration_decision', `Iteration ${it.iteration_no}: ${decision === 'approve' ? 'IR approved' : 'changes requested'}`, comment || 'Approved without comments.', serviceId, { type: 'iteration', id: iterationId })
    return iterationView(updated)
  })
}

/** Refusal of a decision to the involved set is itself an audit event (PRD FR-33, FR-79) and tells the eligible managers. */
function refuseDecision(serviceId: string, iterationId: string, action: 'iteration.manager_decide' | 'iteration.issue'): never {
  const ctx = authContext()
  const s = getStore()
  const svc = s.get('services', serviceId)
  const d = decide(ctx, action, decisionResource(serviceId, ctx.userId))
  if (d.allowed) throw new ApiError('conflict', 'Unexpected state')
  if (d.code === 'decision_maker_conflict') {
    const it = s.get('iterations', iterationId)
    const eligible = eligibleManagersSync(serviceId)
    audit(ctx, { orgId: svc.org_id, serviceId, eventType: 'iteration.decision_refused', entityType: 'opinion_iteration', entityId: iterationId, summary: `Decision on iteration ${it.iteration_no} refused to ${userName(ctx.userId)}: decision_maker_conflict (${d.reason})`, reason: 'decision_maker_conflict', after: { code: 'decision_maker_conflict', eligible_managers: eligible.map(userName) } })
    notify(eligible.filter((u) => u !== ctx.userId), 'org_verifassur', 'decision_refused', `${svc.reference}: decision needs a manager outside the involved set`, `${userName(ctx.userId)} is in the involved set of ${svc.reference} and cannot decide iteration ${it.iteration_no}. One of ${eligible.map(userName).join(', ') || 'the other managers'} must take it.`, serviceId, { type: 'iteration', id: iterationId })
    throw new ApiError('forbidden', `You cannot take this decision: ${d.reason}.`, { code: 'decision_maker_conflict', eligible: eligible.map(userName) })
  }
  throw new ApiError('forbidden', d.reason ? `You cannot do that: ${d.reason}.` : 'You do not have permission for this action.', { code: d.code })
}

export async function managerDecide(serviceId: string, iterationId: string, decision: 'approve' | 'request_changes', comment: string, checklist: ChecklistItem[], materialityAck?: string | null): Promise<IterationView> {
  return call(() => {
    const ctx = authContext()
    if (!decide(ctx, 'iteration.manager_decide', decisionResource(serviceId, ctx.userId)).allowed) refuseDecision(serviceId, iterationId, 'iteration.manager_decide')
    const s = getStore()
    const it = s.get('iterations', iterationId)
    const blocking = s.where('findings', (f) => f.service_id === serviceId && f.blocking && f.status !== 'closed' && f.status !== 'withdrawn')
    if (decision === 'approve' && blocking.length) throw new ApiError('conflict', `Blocking findings are still open: ${blocking.map((f) => `${f.type} #${f.number}`).join(', ')}.`)
    if (decision === 'approve' && checklist.some((c) => !c.checked)) throw new ApiError('validation', 'Complete every checklist item before approving.')
    if (decision === 'request_changes' && !comment.trim()) throw new ApiError('validation', 'Explain what must change.')
    const ack = requireAck(it, { decision, comment, checklist, materialityAck }, ctx)
    const { state } = iterationMachine.apply(it.status, decision === 'approve' ? 'manager_approve' : 'manager_request_changes')
    attachInternal(serviceId, iterationId, 'manager_checklist', `${s.get('services', serviceId).reference}_Manager-checklist_it${it.iteration_no}.pdf`, ctx.userId)
    const updated = s.update('iterations', iterationId, { status: state, manager_user_id: ctx.userId, manager_decision: decision, manager_comment: comment, manager_decided_at: nowIsoString(), checklist_manager_json: checklist, materiality_ack_manager_json: ack }, ctx.userId)
    const svc = s.get('services', serviceId)
    if (ack) audit(ctx, { orgId: svc.org_id, serviceId, eventType: 'materiality.warning_acknowledged', entityType: 'opinion_iteration', entityId: iterationId, summary: `Decision-maker ${userName(ctx.userId)} acknowledged the materiality warning on iteration ${it.iteration_no}: ${ack.comment}`, reason: ack.comment })
    audit(ctx, { orgId: svc.org_id, serviceId, eventType: decision === 'approve' ? 'iteration.manager_approved' : 'iteration.manager_changes_requested', entityType: 'opinion_iteration', entityId: iterationId, summary: `Iteration ${it.iteration_no} ${decision === 'approve' ? 'approved' : 'returned'} by ${userName(ctx.userId)} (outside the involved set)${comment ? `: ${comment}` : ''}`, before: { status: it.status }, after: { status: state } })
    notify(serviceAudience(serviceId, 'verifier'), 'org_verifassur', 'iteration_decision', `Iteration ${it.iteration_no}: ${decision === 'approve' ? 'approved for issuance' : 'changes requested'}`, comment || 'Approved.', serviceId, { type: 'iteration', id: iterationId })
    return iterationView(updated)
  })
}

export type IssuanceStepKey = 'preconditions' | 'lock' | 'hash' | 'render' | 'statement' | 'writeback' | 'status' | 'notify'

export const ISSUANCE_STEPS: { key: IssuanceStepKey; label: string }[] = [
  { key: 'preconditions', label: 'Checking preconditions (decision outside the involved set, blocking findings, acknowledgements)' },
  { key: 'lock', label: 'Locking iteration documents' },
  { key: 'hash', label: 'Computing SHA-256 of every document' },
  { key: 'render', label: 'Rendering the statement (HTML → PDF)' },
  { key: 'statement', label: 'Creating the public verification code' },
  { key: 'writeback', label: 'Writing verified figures to the client records' },
  { key: 'status', label: 'Marking the service as issued' },
  { key: 'notify', label: 'Notifying the client and the team' },
]

/**
 * Issue the opinion. Runs the PRD §8.6 workflow; `onProgress` lets the UI animate each step. A revision issuance
 * (FR-89) supersedes the previous statement, re-points the records and closes the post-issuance event.
 */
export async function issue(serviceId: string, iterationId: string, onProgress?: (key: IssuanceStepKey) => Promise<void> | void): Promise<StatementView> {
  const ctx = authContext()
  if (!decide(ctx, 'iteration.issue', decisionResource(serviceId, ctx.userId)).allowed) refuseDecision(serviceId, iterationId, 'iteration.issue')
  const s = getStore()
  const it = s.get('iterations', iterationId)
  const svc = s.get('services', serviceId)
  await onProgress?.('preconditions')
  if (it.status !== 'approved') throw new ApiError('conflict', 'Only a manager-approved iteration can be issued.')
  const blocking = s.where('findings', (f) => f.service_id === serviceId && f.blocking && f.status !== 'closed' && f.status !== 'withdrawn')
  if (blocking.length) throw new ApiError('conflict', 'Blocking findings are still open.')
  if (it.materiality_warning && (!it.materiality_ack_ir_json || !it.materiality_ack_manager_json)) throw new ApiError('conflict', 'The materiality warning must be acknowledged by the reviewer and the decision-maker.')
  const previous = s.where('statements', (st) => st.service_id === serviceId && st.status === 'issued')
  if (previous.length && !it.revision_of_statement_id) throw new ApiError('conflict', 'An opinion has already been issued for this service. Open a post-issuance revision to replace it.')
  await onProgress?.('lock')
  const at = nowIsoString()
  const docs = s.where('iterationDocuments', (d) => d.iteration_id === iterationId)
  for (const d of docs) {
    const v = s.get('documentVersions', d.document_version_id)
    s.update('documents', v.document_id, { locked_at: at }, ctx.userId)
  }
  await onProgress?.('hash')
  const hashes = docs.map((d) => {
    const v = s.get('documentVersions', d.document_version_id)
    return { filename: v.filename, sha256: v.sha256, role: d.role }
  })
  await onProgress?.('render')
  await onProgress?.('statement')
  const agg = aggregationSync(serviceId, it.summary_json.opinion_type)
  const setting = agg.setting
  const statement: OpinionStatement = {
    ...auditNow(ctx.userId),
    id: newId('stm'),
    service_id: serviceId,
    iteration_id: iterationId,
    public_code: publicCode(`${serviceId}:${at}`),
    opinion_type: it.summary_json.opinion_type ?? 'unqualified',
    level_of_assurance: svc.level_of_assurance,
    statement_html_r2_key: `org/${svc.org_id}/statements/${serviceId}/${iterationId}/statement.html`,
    statement_pdf_r2_key: `org/${svc.org_id}/statements/${serviceId}/${iterationId}/statement.pdf`,
    figures_json: it.summary_json.figures,
    hashes_json: hashes,
    signatories_json: [
      { name: userName(ctx.userId), role: 'Decision-maker (manager)', signed_at: at },
      ...(svc.team_leader_user_id ? [{ name: userName(svc.team_leader_user_id), role: 'Lead verifier', signed_at: at }] : []),
    ],
    issued_at: at,
    issued_by: ctx.userId,
    public_enabled: true,
    materiality_json: setting ? { assertion_base: setting.assertion_base, threshold_pct: setting.threshold_pct, threshold_abs: setting.threshold_abs, unit: setting.assertion_unit, basis: setting.basis } : null,
    misstatement_summary_json: it.aggregation_json ?? { gross: agg.gross, net: agg.net, gross_pct: agg.gross_pct, net_pct: agg.net_pct, threshold_abs: agg.threshold_abs, threshold_pct: agg.threshold_pct, unit: agg.unit, exceeds: agg.exceeds, qualitative_count: agg.qualitative_count, material_qualitative: agg.material_qualitative, confirmed_count: agg.confirmed_count, corrected_count: agg.corrected_count, warning: agg.warning, warning_reason: agg.warning_reason, snapshot_at: at },
    status: 'issued',
    superseded_by_id: null,
    superseded_at: null,
    withdrawn_at: null,
    withdrawn_by: null,
    withdrawal_reason: null,
    withdrawal_public_category: null,
  }
  s.insert('statements', statement)
  s.update('iterations', iterationId, { status: 'issued' }, ctx.userId)
  await onProgress?.('writeback')
  writeBackVerifiedRecords(serviceId, statement.id, ctx.userId)
  // Revision: the old statement becomes superseded and points to the new one (PRD FR-89).
  for (const old of previous) {
    const { state } = statementMachine.apply(old.status, 'supersede')
    s.update('statements', old.id, { status: state, superseded_by_id: statement.id, superseded_at: at }, ctx.userId)
    audit(ctx, { orgId: svc.org_id, serviceId, eventType: 'statement.superseded', entityType: 'opinion_statement', entityId: old.id, summary: `Statement ${old.public_code} superseded by ${statement.public_code}`, before: { status: 'issued' }, after: { status: state, superseded_by_id: statement.id } })
    for (const ev of s.where('postIssuanceEvents', (e) => e.statement_id === old.id && e.status === 'decided' && e.outcome === 'revise')) {
      const { state: evState } = postIssuanceMachine.apply(ev.status, 'close')
      s.update('postIssuanceEvents', ev.id, { status: evState, closed_at: at, replacement_iteration_id: iterationId }, ctx.userId)
    }
  }
  await onProgress?.('status')
  const { state: svcState } = serviceMachine.apply(svc.status === 'in_revision' ? 'opinion_review' : svc.status, 'issue')
  s.update('services', serviceId, { status: svcState, issued_at: at }, ctx.userId)
  const step = s.where('steps', (st) => st.service_id === serviceId && st.key === 'final_opinion')[0]
  if (step && step.status !== 'completed') {
    try {
      if (step.status === 'not_started' || step.status === 'planned') transitionStepInternal(serviceId, step.id, 'start', ctx.userId)
      transitionStepInternal(serviceId, step.id, 'complete', ctx.userId)
    } catch {
      /* ignore */
    }
  }
  s.update('services', serviceId, { status: svcState, issued_at: at }, ctx.userId)
  audit(ctx, { orgId: svc.org_id, serviceId, eventType: 'opinion.issued', entityType: 'opinion_statement', entityId: statement.id, summary: `Opinion issued (${statement.opinion_type}, ${statement.level_of_assurance} assurance) — code ${statement.public_code}${previous.length ? ` (replaces ${previous.map((p) => p.public_code).join(', ')})` : ''}`, before: { status: 'approved' }, after: { status: 'issued', public_code: statement.public_code, level_of_assurance: statement.level_of_assurance } })
  await onProgress?.('notify')
  notify(serviceAudience(serviceId, 'both'), svc.org_id, previous.length ? 'statement_revised' : 'opinion_issued', previous.length ? `Revised opinion issued for ${svc.reference}` : `Opinion issued for ${svc.reference}`, `VERIFASSUR issued a ${statement.opinion_type.replace('_', ' ')} opinion (${statement.level_of_assurance} assurance). Verification code ${statement.public_code}.${previous.length ? ` It replaces ${previous.map((p) => p.public_code).join(', ')}.` : ''}`, serviceId, { type: 'statement', id: statement.id })
  return statementView(statement)
}

export function statementView(st: OpinionStatement, opts: { hidden?: boolean } = {}): StatementView {
  const s = getStore()
  const svc = s.get('services', st.service_id)
  const hidden = opts.hidden ?? false
  return {
    ...st,
    figures_json: hidden ? [] : st.figures_json,
    hashes_json: hidden ? [] : st.hashes_json,
    serviceReference: svc.reference,
    serviceName: svc.name,
    serviceType: svc.service_type,
    standard: svc.standard,
    clientName: orgName(svc.org_id),
    periodStart: svc.period_start,
    periodEnd: svc.period_end,
    issuedByName: userName(st.issued_by),
    verifyUrlPath: `/verify/${st.public_code}`,
    supersededByCode: st.superseded_by_id ? (s.find('statements', st.superseded_by_id)?.public_code ?? null) : null,
    withdrawnByName: st.withdrawn_by ? userName(st.withdrawn_by) : null,
    hidden,
  }
}

/** The current statement of a service: the issued one, else the most recent withdrawn one. */
export function currentStatementSync(serviceId: string): OpinionStatement | null {
  const all = getStore().where('statements', (x) => x.service_id === serviceId).sort((a, b) => (a.issued_at < b.issued_at ? 1 : -1))
  return all.find((x) => x.status === 'issued') ?? all[0] ?? null
}

export async function getStatement(serviceId: string): Promise<StatementView | null> {
  return call(() => {
    authorize('service.read', serviceResource(serviceId))
    const st = currentStatementSync(serviceId)
    return st ? statementView(st) : null
  })
}

/** Every statement of the service, newest first (issued, superseded, withdrawn). */
export async function listStatements(serviceId: string): Promise<StatementView[]> {
  return call(() => {
    authorize('service.read', serviceResource(serviceId))
    return getStore()
      .where('statements', (x) => x.service_id === serviceId)
      .sort((a, b) => (a.issued_at < b.issued_at ? 1 : -1))
      .map((st) => statementView(st))
  })
}

/**
 * Public lookup by verification code; no session needed. PRD v0.3 FR-36: the page never disappears once a code
 * exists; a client opt-out hides figures and hashes but never a superseded or withdrawn banner.
 */
export async function getPublicStatement(code: string): Promise<StatementView | null> {
  return call(() => {
    const st = getStore().where('statements', (x) => x.public_code.toUpperCase() === code.trim().toUpperCase())[0]
    if (!st) return null
    return statementView(st, { hidden: !st.public_enabled || st.status === 'withdrawn' })
  })
}

export async function setPublicEnabled(serviceId: string, enabled: boolean): Promise<StatementView> {
  return call(() => {
    const ctx = authorize('service.read', serviceResource(serviceId))
    if (ctx.orgType !== 'client' || (ctx.orgRole !== 'client_admin' && ctx.orgRole !== 'client_owner')) throw new ApiError('forbidden', 'Only client admins change statement visibility.')
    const s = getStore()
    const st = currentStatementSync(serviceId)
    if (!st) throw new ApiError('not_found', 'No statement')
    const updated = s.update('statements', st.id, { public_enabled: enabled }, ctx.userId)
    audit(ctx, { orgId: s.get('services', serviceId).org_id, serviceId, eventType: 'statement.visibility_changed', entityType: 'opinion_statement', entityId: st.id, summary: `Public statement ${enabled ? 'enabled' : 'disabled'} (a superseded or withdrawn banner stays visible)` })
    return statementView(updated)
  })
}

export function currentCtxUserId(): string {
  return authContext().userId
}

export { MATERIALITY_CHECKLIST_KEY }
