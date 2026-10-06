/** Opinion iterations, independent review, manager approval, issuance and statements (PRD §6.5, §8.6). */
import type { IterationDocRole, LevelOfAssurance, OpinionType } from '@/domain/enums'
import type { ChecklistItem, Document, DocumentVersion, IterationDocument, OpinionIteration, OpinionStatement, VerifiedFigure } from '@/domain/schemas'
import { iterationMachine } from '@/domain/workflow/machines'
import { templateFor } from '@/domain/workflow/templates'
import { fakeSha256, publicCode } from '@/mock/ids'
import { ApiError, audit, auditNow, authContext, authorize, call, getStore, newId, notify, nowIsoString, orgName, serviceAudience, serviceResource, userName } from './core'
import { versionView, type VersionView } from './documents'
import { writeBackVerifiedRecords } from './records'
import { transitionStepInternal } from './steps'

export interface IterationView extends OpinionIteration {
  documents: { id: string; role: IterationDocRole; title: string; version: VersionView }[]
  irName: string | null
  managerName: string | null
  createdByName: string
  blockingFindingsOpen: number
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
  return {
    ...it,
    documents,
    irName: it.ir_user_id ? userName(it.ir_user_id) : null,
    managerName: it.manager_user_id ? userName(it.manager_user_id) : null,
    createdByName: userName(it.created_by),
    blockingFindingsOpen: s.where('findings', (f) => f.service_id === it.service_id && f.blocking && f.status !== 'closed' && f.status !== 'withdrawn').length,
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
  levelOfAssurance: LevelOfAssurance
  narrative: string
  figures: VerifiedFigure[]
}

/** Default figures proposed from the records attached to the service (client-declared values). */
export function suggestedFigures(serviceId: string): VerifiedFigure[] {
  const s = getStore()
  const figures: VerifiedFigure[] = []
  for (const inv of s.where('inventories', (i) => i.service_id === serviceId)) {
    const t = inv.declared_totals_json
    if (!t) continue
    figures.push({ key: 'scope1', label: 'Scope 1', value: t.by_scope['1'] ?? 0, unit: 'tCO2e' })
    figures.push({ key: 'scope2', label: 'Scope 2', value: t.by_scope['2'] ?? 0, unit: 'tCO2e' })
    figures.push({ key: 'scope3', label: 'Scope 3', value: t.by_scope['3'] ?? 0, unit: 'tCO2e' })
    if (t.biogenic_co2_t) figures.push({ key: 'biogenic', label: 'Biogenic CO2 (reported separately)', value: t.biogenic_co2_t, unit: 't' })
    if (t.removals_tco2e) figures.push({ key: 'removals', label: 'Removals (reported separately)', value: t.removals_tco2e, unit: 'tCO2e' })
  }
  for (const d of s.where('decarbRecords', (r) => r.service_id === serviceId)) {
    figures.push({ key: `reduction_${d.id}`, label: `Reduction decarb_units — ${d.good}`, value: d.declared_reduction_units ?? 0, unit: 'tCO2e' })
    if (d.declared_removal_units) figures.push({ key: `removal_${d.id}`, label: `Removal decarb_units — ${d.good}`, value: d.declared_removal_units, unit: 'tCO2e' })
    figures.push({ key: `factor_${d.id}`, label: `Decarb factor (gross) — ${d.good}`, value: d.decarb_factor_gross ?? 0, unit: d.factor_unit ?? 'tCO2e/t' })
  }
  for (const ef of s.where('emissionFactors', (e) => e.service_id === serviceId)) {
    figures.push({ key: `ef_${ef.id}`, label: ef.product_name, value: ef.declared_value, unit: ef.value_unit })
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
    const it: OpinionIteration = {
      ...auditNow(ctx.userId),
      id: newId('itr'),
      service_id: serviceId,
      iteration_no: no,
      status: 'draft',
      summary_json: { opinion_type: input.opinionType, level_of_assurance: input.levelOfAssurance, figures: input.figures, narrative: input.narrative },
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
    }
    s.insert('iterations', it)
    // The bundle documents are created as placeholders the team leader "uploads" (simulated).
    for (const role of ['report', 'findings_report', 'opinion', 'calc_check'] as IterationDocRole[]) attachInternal(serviceId, it.id, role, `${svc.reference}_${DOC_TITLES[role].replace(/[^a-z0-9]+/gi, '-')}_it${no}.pdf`, ctx.userId)
    audit(ctx, { orgId: svc.org_id, serviceId, eventType: 'iteration.created', entityType: 'opinion_iteration', entityId: it.id, summary: `Opinion iteration ${no} created by ${userName(ctx.userId)}`, after: { status: 'draft' } })
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

export async function submitForIr(serviceId: string, iterationId: string): Promise<IterationView> {
  return call(() => {
    const ctx = authorize('iteration.submit_for_ir', serviceResource(serviceId))
    const s = getStore()
    const it = s.get('iterations', iterationId)
    const { state } = iterationMachine.apply(it.status, 'submit_for_ir')
    const updated = s.update('iterations', iterationId, { status: state, submitted_for_ir_at: nowIsoString() }, ctx.userId)
    const svc = s.get('services', serviceId)
    audit(ctx, { orgId: svc.org_id, serviceId, eventType: 'iteration.submitted_for_ir', entityType: 'opinion_iteration', entityId: iterationId, summary: `Iteration ${it.iteration_no} submitted for independent review`, before: { status: it.status }, after: { status: state } })
    if (it.ir_user_id) notify([it.ir_user_id], 'org_verifassur', 'iteration_decision', `Independent review requested: ${svc.reference}`, `Iteration ${it.iteration_no} is ready for your review.`, serviceId, { type: 'iteration', id: iterationId })
    return iterationView(updated)
  })
}

export async function irDecide(serviceId: string, iterationId: string, decision: 'approve' | 'request_changes', comment: string, checklist: ChecklistItem[]): Promise<IterationView> {
  return call(() => {
    const ctx = authorize('iteration.ir_decide', serviceResource(serviceId))
    const s = getStore()
    const it = s.get('iterations', iterationId)
    if (decision === 'approve' && checklist.some((c) => !c.checked)) throw new ApiError('validation', 'Complete every checklist item before approving.')
    if (decision === 'request_changes' && !comment.trim()) throw new ApiError('validation', 'Explain what must change.')
    const { state } = iterationMachine.apply(it.status, decision === 'approve' ? 'ir_approve' : 'ir_request_changes')
    attachInternal(serviceId, iterationId, 'ir_report', `${s.get('services', serviceId).reference}_Independent-review-report_it${it.iteration_no}.pdf`, ctx.userId)
    attachInternal(serviceId, iterationId, 'ir_checklist', `${s.get('services', serviceId).reference}_IR-checklist_it${it.iteration_no}.pdf`, ctx.userId)
    const updated = s.update('iterations', iterationId, { status: state, ir_user_id: ctx.userId, ir_decision: decision, ir_comment: comment, ir_decided_at: nowIsoString(), checklist_ir_json: checklist }, ctx.userId)
    const svc = s.get('services', serviceId)
    audit(ctx, { orgId: svc.org_id, serviceId, eventType: decision === 'approve' ? 'iteration.ir_approved' : 'iteration.ir_changes_requested', entityType: 'opinion_iteration', entityId: iterationId, summary: `Independent review: ${decision === 'approve' ? 'approved' : 'changes requested'} by ${userName(ctx.userId)}${comment ? `: ${comment}` : ''}`, before: { status: it.status }, after: { status: state } })
    notify([...(svc.team_leader_user_id ? [svc.team_leader_user_id] : []), ...serviceAudience(serviceId, 'verifier')], 'org_verifassur', 'iteration_decision', `Iteration ${it.iteration_no}: ${decision === 'approve' ? 'IR approved' : 'changes requested'}`, comment || 'Approved without comments.', serviceId, { type: 'iteration', id: iterationId })
    return iterationView(updated)
  })
}

export async function managerDecide(serviceId: string, iterationId: string, decision: 'approve' | 'request_changes', comment: string, checklist: ChecklistItem[]): Promise<IterationView> {
  return call(() => {
    const ctx = authorize('iteration.manager_decide', serviceResource(serviceId))
    const s = getStore()
    const it = s.get('iterations', iterationId)
    const blocking = s.where('findings', (f) => f.service_id === serviceId && f.blocking && f.status !== 'closed' && f.status !== 'withdrawn')
    if (decision === 'approve' && blocking.length) throw new ApiError('conflict', `Blocking findings are still open: ${blocking.map((f) => `${f.type} #${f.number}`).join(', ')}.`)
    if (decision === 'approve' && checklist.some((c) => !c.checked)) throw new ApiError('validation', 'Complete every checklist item before approving.')
    if (decision === 'request_changes' && !comment.trim()) throw new ApiError('validation', 'Explain what must change.')
    const { state } = iterationMachine.apply(it.status, decision === 'approve' ? 'manager_approve' : 'manager_request_changes')
    attachInternal(serviceId, iterationId, 'manager_checklist', `${s.get('services', serviceId).reference}_Manager-checklist_it${it.iteration_no}.pdf`, ctx.userId)
    const updated = s.update('iterations', iterationId, { status: state, manager_user_id: ctx.userId, manager_decision: decision, manager_comment: comment, manager_decided_at: nowIsoString(), checklist_manager_json: checklist }, ctx.userId)
    const svc = s.get('services', serviceId)
    audit(ctx, { orgId: svc.org_id, serviceId, eventType: decision === 'approve' ? 'iteration.manager_approved' : 'iteration.manager_changes_requested', entityType: 'opinion_iteration', entityId: iterationId, summary: `Iteration ${it.iteration_no} ${decision === 'approve' ? 'approved' : 'returned'} by ${userName(ctx.userId)}${comment ? `: ${comment}` : ''}`, before: { status: it.status }, after: { status: state } })
    notify(serviceAudience(serviceId, 'verifier'), 'org_verifassur', 'iteration_decision', `Iteration ${it.iteration_no}: ${decision === 'approve' ? 'approved for issuance' : 'changes requested'}`, comment || 'Approved.', serviceId, { type: 'iteration', id: iterationId })
    return iterationView(updated)
  })
}

export type IssuanceStepKey = 'preconditions' | 'lock' | 'hash' | 'render' | 'statement' | 'writeback' | 'status' | 'notify'

export const ISSUANCE_STEPS: { key: IssuanceStepKey; label: string }[] = [
  { key: 'preconditions', label: 'Checking preconditions (approval, blocking findings)' },
  { key: 'lock', label: 'Locking iteration documents' },
  { key: 'hash', label: 'Computing SHA-256 of every document' },
  { key: 'render', label: 'Rendering the statement (HTML → PDF)' },
  { key: 'statement', label: 'Creating the public verification code' },
  { key: 'writeback', label: 'Writing verified figures to the client records' },
  { key: 'status', label: 'Marking the service as issued' },
  { key: 'notify', label: 'Notifying the client and the team' },
]

/**
 * Issue the opinion. Runs the PRD §8.6 workflow; `onProgress` lets the UI animate each step.
 * The whole thing is one synchronous store transaction after the animation.
 */
export async function issue(serviceId: string, iterationId: string, onProgress?: (key: IssuanceStepKey) => Promise<void> | void): Promise<StatementView> {
  const ctx = authorize('iteration.issue', serviceResource(serviceId))
  const s = getStore()
  const it = s.get('iterations', iterationId)
  const svc = s.get('services', serviceId)
  await onProgress?.('preconditions')
  if (it.status !== 'approved') throw new ApiError('conflict', 'Only a manager-approved iteration can be issued.')
  const blocking = s.where('findings', (f) => f.service_id === serviceId && f.blocking && f.status !== 'closed' && f.status !== 'withdrawn')
  if (blocking.length) throw new ApiError('conflict', 'Blocking findings are still open.')
  if (s.where('statements', (st) => st.service_id === serviceId).length) throw new ApiError('conflict', 'An opinion has already been issued for this service.')
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
  const statement: OpinionStatement = {
    ...auditNow(ctx.userId),
    id: newId('stm'),
    service_id: serviceId,
    iteration_id: iterationId,
    public_code: publicCode(`${serviceId}:${at}`),
    opinion_type: it.summary_json.opinion_type ?? 'unqualified',
    level_of_assurance: it.summary_json.level_of_assurance ?? 'reasonable',
    statement_html_r2_key: `org/${svc.org_id}/statements/${serviceId}/statement.html`,
    statement_pdf_r2_key: `org/${svc.org_id}/statements/${serviceId}/statement.pdf`,
    figures_json: it.summary_json.figures,
    hashes_json: hashes,
    signatories_json: [
      { name: userName(ctx.userId), role: 'Scheme manager', signed_at: at },
      ...(svc.team_leader_user_id ? [{ name: userName(svc.team_leader_user_id), role: 'Lead verifier', signed_at: at }] : []),
    ],
    issued_at: at,
    issued_by: ctx.userId,
    public_enabled: true,
  }
  s.insert('statements', statement)
  s.update('iterations', iterationId, { status: 'issued' }, ctx.userId)
  await onProgress?.('writeback')
  writeBackVerifiedRecords(serviceId, iterationId, ctx.userId)
  await onProgress?.('status')
  s.update('services', serviceId, { status: 'issued', issued_at: at }, ctx.userId)
  const step = s.where('steps', (st) => st.service_id === serviceId && st.key === 'final_opinion')[0]
  if (step && step.status !== 'completed') {
    try {
      if (step.status === 'not_started' || step.status === 'planned') transitionStepInternal(serviceId, step.id, 'start', ctx.userId)
      transitionStepInternal(serviceId, step.id, 'complete', ctx.userId)
    } catch {
      /* ignore */
    }
  }
  s.update('services', serviceId, { status: 'issued', issued_at: at }, ctx.userId)
  audit(ctx, { orgId: svc.org_id, serviceId, eventType: 'opinion.issued', entityType: 'opinion_statement', entityId: statement.id, summary: `Opinion issued (${statement.opinion_type}, ${statement.level_of_assurance} assurance) — code ${statement.public_code}`, before: { status: 'approved' }, after: { status: 'issued', public_code: statement.public_code } })
  await onProgress?.('notify')
  notify(serviceAudience(serviceId, 'both'), svc.org_id, 'opinion_issued', `Opinion issued for ${svc.reference}`, `VERIFASSUR issued a ${statement.opinion_type.replace('_', ' ')} opinion. Verification code ${statement.public_code}.`, serviceId, { type: 'statement', id: statement.id })
  return statementView(statement)
}

export function statementView(st: OpinionStatement): StatementView {
  const s = getStore()
  const svc = s.get('services', st.service_id)
  return {
    ...st,
    serviceReference: svc.reference,
    serviceName: svc.name,
    serviceType: svc.service_type,
    standard: svc.standard,
    clientName: orgName(svc.org_id),
    periodStart: svc.period_start,
    periodEnd: svc.period_end,
    issuedByName: userName(st.issued_by),
    verifyUrlPath: `/verify/${st.public_code}`,
  }
}

export async function getStatement(serviceId: string): Promise<StatementView | null> {
  return call(() => {
    authorize('service.read', serviceResource(serviceId))
    const st = getStore().where('statements', (x) => x.service_id === serviceId)[0]
    return st ? statementView(st) : null
  })
}

/** Public lookup by verification code; no session needed. */
export async function getPublicStatement(code: string): Promise<StatementView | null> {
  return call(() => {
    const st = getStore().where('statements', (x) => x.public_code.toUpperCase() === code.trim().toUpperCase() && x.public_enabled)[0]
    return st ? statementView(st) : null
  })
}

export async function setPublicEnabled(serviceId: string, enabled: boolean): Promise<StatementView> {
  return call(() => {
    const ctx = authorize('service.read', serviceResource(serviceId))
    if (ctx.orgType !== 'client' || (ctx.orgRole !== 'client_admin' && ctx.orgRole !== 'client_owner')) throw new ApiError('forbidden', 'Only client admins change statement visibility.')
    const s = getStore()
    const st = s.where('statements', (x) => x.service_id === serviceId)[0]
    if (!st) throw new ApiError('not_found', 'No statement')
    const updated = s.update('statements', st.id, { public_enabled: enabled }, ctx.userId)
    audit(ctx, { orgId: s.get('services', serviceId).org_id, serviceId, eventType: 'statement.visibility_changed', entityType: 'opinion_statement', entityId: st.id, summary: `Public statement ${enabled ? 'enabled' : 'disabled'}` })
    return statementView(updated)
  })
}

export function currentCtxUserId(): string {
  return authContext().userId
}
