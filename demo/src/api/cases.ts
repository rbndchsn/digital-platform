/**
 * Complaints and appeals (PRD v0.3 §6.20, FR-91–FR-93). Clients raise and follow cases; staff outside the
 * involved set of the decision handle and decide them; ADMIN reads everything and changes nothing.
 */
import type { CaseDecisionEntityType, CaseKind, CaseOutcome } from '@/domain/enums'
import { decide, type Resource } from '@/domain/policy'
import type { Case, CaseNote } from '@/domain/schemas'
import { computeInvolvedSet, involvedMember, type InvolvedMember } from '@/domain/workflow/involved-set'
import { caseMachine } from '@/domain/workflow/machines'
import { todayIso } from '@/mock/clock'
import { ApiError, activeTemplateFor, addWorkingDays, audit, auditNow, authContext, authorize, call, getStore, managerUserIds, newId, notify, nowIsoString, orgName, userName } from './core'
import { involvedSetSync } from './involved'
import { requireReason } from './steps'

export interface CaseNoteView extends CaseNote {
  authorName: string
}

export interface CaseView extends Case {
  complainantName: string | null
  orgName: string
  handlerName: string | null
  decidedByName: string | null
  serviceReference: string | null
  decisionLabel: string | null
  decisionActorName: string | null
  notes: CaseNoteView[]
  overdueAcknowledge: boolean
  overdueDecide: boolean
  /** Names in the involved set of this case (service involved set plus the decision's actor). */
  involvedNames: string[]
  canHandle: boolean
}

/** The involved set of a decision (PRD §3.3): the decision's actor plus the service's involved set. */
export function caseInvolvedSetSync(c: Pick<Case, 'service_id' | 'decision_actor_user_id'>): InvolvedMember[] {
  const base = c.service_id ? involvedSetSync(c.service_id) : computeInvolvedSet({ team: [], events: [], iterations: [] })
  if (c.decision_actor_user_id && !base.some((m) => m.userId === c.decision_actor_user_id)) base.push({ userId: c.decision_actor_user_id, reasons: ['Took the decision being appealed'] })
  return base
}

function caseResource(c: Case, userId: string): Resource {
  return { orgId: c.org_id, serviceId: c.service_id ?? undefined, involved: involvedMember(caseInvolvedSetSync(c), userId) }
}

function decisionLabel(c: Case): string | null {
  const s = getStore()
  if (!c.decision_entity_type || !c.decision_entity_id) return null
  switch (c.decision_entity_type) {
    case 'service':
      return `Request ${s.find('services', c.decision_entity_id)?.reference ?? ''} declined`
    case 'approval': {
      const a = s.find('approvals', c.decision_entity_id)
      return a ? `${a.label}: ${a.status}` : null
    }
    case 'document_version': {
      const v = s.find('documentVersions', c.decision_entity_id)
      return v ? `Document ${v.filename} ${v.check_status}` : null
    }
    case 'finding': {
      const f = s.find('findings', c.decision_entity_id)
      return f ? `${f.type} #${f.number} ${f.status}` : null
    }
    case 'opinion_iteration': {
      const it = s.find('iterations', c.decision_entity_id)
      return it ? `Iteration ${it.iteration_no} (${it.status.replace(/_/g, ' ')})` : null
    }
    case 'opinion_statement': {
      const st = s.find('statements', c.decision_entity_id)
      return st ? `Statement ${st.public_code} (${st.opinion_type})` : null
    }
  }
}

export function caseView(c: Case, opts: { internal: boolean }): CaseView {
  const s = getStore()
  const now = nowIsoString()
  const openStates = ['received', 'acknowledged', 'under_investigation']
  const canHandle = (() => {
    try {
      const ctx = authContext()
      return ctx.orgType === 'verifier' && decide(ctx, 'case.handle', caseResource(c, ctx.userId)).allowed
    } catch {
      return false
    }
  })()
  return {
    ...c,
    complainantName: c.complainant_user_id ? userName(c.complainant_user_id) : (c.external_contact_json?.name ?? null),
    orgName: orgName(c.org_id),
    handlerName: c.handler_user_id ? userName(c.handler_user_id) : null,
    decidedByName: c.decided_by ? userName(c.decided_by) : null,
    serviceReference: c.service_id ? (s.find('services', c.service_id)?.reference ?? null) : null,
    decisionLabel: decisionLabel(c),
    decisionActorName: c.decision_actor_user_id ? userName(c.decision_actor_user_id) : null,
    notes: s
      .where('caseNotes', (n) => n.case_id === c.id && (opts.internal || !n.internal))
      .sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
      .map((n) => ({ ...n, authorName: userName(n.author_user_id) })),
    overdueAcknowledge: c.status === 'received' && c.acknowledge_target_at < now,
    overdueDecide: openStates.includes(c.status) && c.decide_target_at < now,
    involvedNames: caseInvolvedSetSync(c).map((m) => userName(m.userId)),
    canHandle,
  }
}

function targetsFor(serviceId: string | null): { acknowledge_days: number; decide_days: number } {
  const s = getStore()
  if (serviceId) {
    const svc = s.get('services', serviceId)
    return activeTemplateFor(svc.service_type).complaint_targets
  }
  return s.get('platformSettings', 'platform').complaint_targets_json
}

// ---------------------------------------------------------------- client side
export async function listMine(): Promise<CaseView[]> {
  return call(() => {
    const ctx = authorize('case.read_own')
    return getStore()
      .where('cases', (c) => c.org_id === ctx.orgId)
      .sort((a, b) => (a.received_at < b.received_at ? 1 : -1))
      .map((c) => caseView(c, { internal: false }))
  })
}

export async function get(caseId: string): Promise<CaseView> {
  return call(() => {
    const ctx = authContext()
    const c = getStore().get('cases', caseId)
    if (ctx.orgType === 'client') {
      authorize('case.read_own', { orgId: c.org_id })
      return caseView(c, { internal: false })
    }
    authorize('case.read_all')
    return caseView(c, { internal: true })
  })
}

export interface CreateCaseInput {
  kind: CaseKind
  subject: string
  description: string
  serviceId?: string | null
  decisionEntityType?: CaseDecisionEntityType | null
  decisionEntityId?: string | null
}

/** Who took the decision being appealed, from the audit log where possible (PRD §3.3 involved set of a decision). */
function decisionActor(input: CreateCaseInput): string | null {
  const s = getStore()
  if (!input.decisionEntityType || !input.decisionEntityId) return null
  switch (input.decisionEntityType) {
    case 'service':
      return s.where('auditEvents', (e) => e.entity_id === input.decisionEntityId && e.event_type === 'service.declined')[0]?.actor_user_id ?? null
    case 'approval':
      return s.find('approvals', input.decisionEntityId)?.decided_by ?? null
    case 'document_version':
      return s.find('documentVersions', input.decisionEntityId)?.checked_by ?? null
    case 'finding':
      return s.find('findings', input.decisionEntityId)?.closed_by ?? s.find('findings', input.decisionEntityId)?.raised_by ?? null
    case 'opinion_iteration':
      return s.find('iterations', input.decisionEntityId)?.manager_user_id ?? null
    case 'opinion_statement':
      return s.find('statements', input.decisionEntityId)?.issued_by ?? null
  }
}

export async function create(input: CreateCaseInput): Promise<CaseView> {
  return call(() => {
    const ctx = authorize('case.create')
    const s = getStore()
    if (!input.subject.trim()) throw new ApiError('validation', 'Give the case a subject.')
    if (input.kind === 'appeal' && !input.decisionEntityType) throw new ApiError('validation', 'An appeal refers to a decision: a declined request, a rejected document, a finding outcome or an opinion.')
    if (input.serviceId && s.get('services', input.serviceId).org_id !== ctx.orgId) throw new ApiError('forbidden', 'That engagement belongs to another organisation.')
    const at = nowIsoString()
    const targets = targetsFor(input.serviceId ?? null)
    const c: Case = {
      ...auditNow(ctx.userId),
      id: newId('case'),
      org_id: ctx.orgId,
      kind: input.kind,
      subject: input.subject.trim(),
      description: input.description.trim(),
      complainant_user_id: ctx.userId,
      external_contact_json: null,
      service_id: input.serviceId ?? null,
      decision_entity_type: input.decisionEntityType ?? null,
      decision_entity_id: input.decisionEntityId ?? null,
      decision_actor_user_id: decisionActor(input),
      status: 'received',
      received_at: at,
      acknowledged_at: null,
      investigation_started_at: null,
      decided_at: null,
      closed_at: null,
      acknowledge_target_at: addWorkingDays(at, targets.acknowledge_days),
      decide_target_at: addWorkingDays(at, targets.decide_days),
      handler_user_id: null,
      assigned_by: null,
      outcome: null,
      outcome_summary: null,
      decided_by: null,
      actions_json: null,
    }
    s.insert('cases', c)
    audit(ctx, { orgId: ctx.orgId, serviceId: c.service_id, eventType: 'case.received', entityType: 'case', entityId: c.id, summary: `${input.kind === 'appeal' ? 'Appeal' : 'Complaint'} received from ${userName(ctx.userId)} (${orgName(ctx.orgId)}): ${c.subject}`, after: { status: 'received', kind: input.kind, decision_entity_type: c.decision_entity_type } })
    const eligible = managerUserIds().filter((id) => !caseInvolvedSetSync(c).some((m) => m.userId === id))
    notify(eligible.length ? eligible : managerUserIds(), 'org_verifassur', 'case_received', `${input.kind === 'appeal' ? 'Appeal' : 'Complaint'} received: ${c.subject}`, `${userName(ctx.userId)} (${orgName(ctx.orgId)}) ${input.kind === 'appeal' ? 'appeals' : 'complains'}${c.service_id ? ` on ${s.get('services', c.service_id).reference}` : ''}. Acknowledge by ${c.acknowledge_target_at.slice(0, 10)}; decide by ${c.decide_target_at.slice(0, 10)}. Handlers must be outside the involved set.`, c.service_id, { type: 'case', id: c.id })
    return caseView(c, { internal: false })
  })
}

export async function withdrawCase(caseId: string): Promise<CaseView> {
  return call(() => {
    const s = getStore()
    const c = s.get('cases', caseId)
    const ctx = authorize('case.create', { orgId: c.org_id })
    const { state } = caseMachine.apply(c.status, 'withdraw')
    const updated = s.update('cases', caseId, { status: state, closed_at: nowIsoString(), outcome: 'withdrawn' }, ctx.userId)
    audit(ctx, { orgId: c.org_id, serviceId: c.service_id, eventType: 'case.withdrawn', entityType: 'case', entityId: caseId, summary: `${c.kind} "${c.subject}" withdrawn by the complainant ${userName(ctx.userId)}`, before: { status: c.status }, after: { status: state } })
    return caseView(updated, { internal: false })
  })
}

export async function addNote(caseId: string, body: string, internal = false): Promise<CaseView> {
  return call(() => {
    const s = getStore()
    const c = s.get('cases', caseId)
    const ctx = authContext()
    const staff = ctx.orgType === 'verifier'
    if (staff) authorize('case.handle', caseResource(c, ctx.userId))
    else authorize('case.read_own', { orgId: c.org_id })
    if (!body.trim()) throw new ApiError('validation', 'Write something.')
    const note: CaseNote = { ...auditNow(ctx.userId), id: newId('cnote'), case_id: caseId, author_user_id: ctx.userId, body: body.trim(), internal: staff ? internal : false }
    s.insert('caseNotes', note)
    audit(ctx, { orgId: c.org_id, serviceId: c.service_id, eventType: 'case.note_added', entityType: 'case', entityId: caseId, summary: `${note.internal ? 'Internal note' : 'Note'} added to ${c.kind} "${c.subject}" by ${userName(ctx.userId)}` })
    if (!note.internal && c.handler_user_id && c.handler_user_id !== ctx.userId) notify([c.handler_user_id], 'org_verifassur', 'generic', `New note on ${c.kind} "${c.subject}"`, note.body, c.service_id, { type: 'case', id: caseId })
    if (!note.internal && staff && c.complainant_user_id) notify([c.complainant_user_id], c.org_id, 'generic', `Update on your ${c.kind} "${c.subject}"`, note.body, c.service_id, { type: 'case', id: caseId })
    return caseView(s.get('cases', caseId), { internal: staff })
  })
}

// ---------------------------------------------------------------- staff side
export interface CaseFilter {
  status?: Case['status'] | 'open'
  kind?: CaseKind
  overdue?: boolean
}

export async function listAll(filter: CaseFilter = {}): Promise<CaseView[]> {
  return call(() => {
    authorize('case.read_all')
    let rows = getStore().all('cases')
    if (filter.status === 'open') rows = rows.filter((c) => ['received', 'acknowledged', 'under_investigation'].includes(c.status))
    else if (filter.status) rows = rows.filter((c) => c.status === filter.status)
    if (filter.kind) rows = rows.filter((c) => c.kind === filter.kind)
    const views = rows.sort((a, b) => (a.received_at < b.received_at ? 1 : -1)).map((c) => caseView(c, { internal: true }))
    return filter.overdue ? views.filter((v) => v.overdueAcknowledge || v.overdueDecide) : views
  })
}

export async function acknowledge(caseId: string): Promise<CaseView> {
  return call(() => {
    const s = getStore()
    const c = s.get('cases', caseId)
    const ctx = authorize('case.handle', caseResource(c, authContext().userId))
    const { state } = caseMachine.apply(c.status, 'acknowledge')
    const updated = s.update('cases', caseId, { status: state, acknowledged_at: nowIsoString() }, ctx.userId)
    audit(ctx, { orgId: c.org_id, serviceId: c.service_id, eventType: 'case.acknowledged', entityType: 'case', entityId: caseId, summary: `${c.kind} "${c.subject}" acknowledged by ${userName(ctx.userId)}`, before: { status: c.status }, after: { status: state } })
    if (c.complainant_user_id) notify([c.complainant_user_id], c.org_id, 'case_acknowledged', `Your ${c.kind} was acknowledged`, `VERIFASSUR acknowledged "${c.subject}". A handler outside the engagement team will investigate; a decision is due by ${c.decide_target_at.slice(0, 10)}.`, c.service_id, { type: 'case', id: caseId })
    return caseView(updated, { internal: true })
  })
}

/** Handlers who may take the case: every active verifier user outside the involved set of the decision. */
export function handlerCandidatesSync(caseId: string): { userId: string; name: string; jobTitle: string }[] {
  const s = getStore()
  const c = s.get('cases', caseId)
  const involved = new Set(caseInvolvedSetSync(c).map((m) => m.userId))
  return s
    .where('memberships', (m) => m.org_id === 'org_verifassur' && m.status === 'active' && m.role !== 'platform_admin' && !involved.has(m.user_id))
    .map((m) => s.get('users', m.user_id))
    .filter((u) => u.status === 'active')
    .map((u) => ({ userId: u.id, name: u.name, jobTitle: u.job_title ?? '' }))
}

export async function handlerCandidates(caseId: string): Promise<{ userId: string; name: string; jobTitle: string }[]> {
  return call(() => {
    authorize('case.read_all')
    return handlerCandidatesSync(caseId)
  })
}

export async function assign(caseId: string, handlerUserId: string): Promise<CaseView> {
  return call(() => {
    const s = getStore()
    const c = s.get('cases', caseId)
    const ctx = authorize('case.assign', caseResource(c, authContext().userId))
    const handler = s.get('users', handlerUserId)
    const conflict = involvedMember(caseInvolvedSetSync(c), handlerUserId)
    if (conflict) throw new ApiError('forbidden', `${handler.name} cannot handle this case: ${conflict.reasons.join('; ')}.`, { code: 'decision_maker_conflict' })
    const updated = s.update('cases', caseId, { handler_user_id: handlerUserId, assigned_by: ctx.userId }, ctx.userId)
    audit(ctx, { orgId: c.org_id, serviceId: c.service_id, eventType: 'case.assigned', entityType: 'case', entityId: caseId, summary: `${c.kind} "${c.subject}" assigned to ${handler.name} (outside the involved set) by ${userName(ctx.userId)}`, before: { handler_user_id: c.handler_user_id }, after: { handler_user_id: handlerUserId } })
    notify([handlerUserId], 'org_verifassur', 'generic', `You handle the ${c.kind} "${c.subject}"`, `${userName(ctx.userId)} assigned you. Decide by ${c.decide_target_at.slice(0, 10)}. Investigation notes stay internal.`, c.service_id, { type: 'case', id: caseId })
    return caseView(updated, { internal: true })
  })
}

export async function startInvestigation(caseId: string): Promise<CaseView> {
  return call(() => {
    const s = getStore()
    const c = s.get('cases', caseId)
    const ctx = authorize('case.handle', caseResource(c, authContext().userId))
    const { state } = caseMachine.apply(c.status, 'start_investigation')
    const updated = s.update('cases', caseId, { status: state, investigation_started_at: nowIsoString(), handler_user_id: c.handler_user_id ?? ctx.userId }, ctx.userId)
    audit(ctx, { orgId: c.org_id, serviceId: c.service_id, eventType: 'case.investigation_started', entityType: 'case', entityId: caseId, summary: `Investigation of ${c.kind} "${c.subject}" started by ${userName(ctx.userId)}`, before: { status: c.status }, after: { status: state } })
    return caseView(updated, { internal: true })
  })
}

export interface CaseDecisionInput {
  outcome: CaseOutcome
  outcomeSummary: string
  reason: string
  actions?: { reopenFindingId?: string | null; recheckDocumentVersionId?: string | null; openPostIssuanceEvent?: { statementId: string; description: string } | null }
}

/** Decision by a manager outside the involved set (FR-92); the outcome may trigger follow-up actions. */
export async function decideCase(caseId: string, input: CaseDecisionInput): Promise<CaseView> {
  return call(() => {
    const s = getStore()
    const c = s.get('cases', caseId)
    const ctx = authorize('case.decide', caseResource(c, authContext().userId))
    const r = requireReason(input.reason)
    if (!input.outcomeSummary.trim()) throw new ApiError('validation', 'Write the outcome summary the complainant will read.')
    const { state } = caseMachine.apply(c.status, 'decide')
    const at = nowIsoString()
    const actions: NonNullable<Case['actions_json']> = { reopen_finding_id: null, recheck_document_version_id: null, post_issuance_event_id: null }
    if (input.actions?.reopenFindingId) {
      const f = s.get('findings', input.actions.reopenFindingId)
      if (f.status === 'closed') {
        s.update('findings', f.id, { status: 'open', closed_by: null, closed_at: null }, ctx.userId)
        audit(ctx, { orgId: c.org_id, serviceId: f.service_id, eventType: 'finding.reopened', entityType: 'finding', entityId: f.id, summary: `${f.type} #${f.number} reopened following the ${c.kind} "${c.subject}"`, reason: r, before: { status: 'closed' }, after: { status: 'open' } })
      }
      actions.reopen_finding_id = f.id
    }
    if (input.actions?.recheckDocumentVersionId) {
      const v = s.get('documentVersions', input.actions.recheckDocumentVersionId)
      s.update('documentVersions', v.id, { check_status: 'checked', checked_by: null, checked_at: null, reject_reason: null }, ctx.userId)
      const doc = s.get('documents', v.document_id)
      if (doc.slot_id && doc.current_version_id === v.id) s.update('slots', doc.slot_id, { status: 'submitted' }, ctx.userId)
      audit(ctx, { orgId: c.org_id, serviceId: doc.service_id, eventType: 'document.recheck_ordered', entityType: 'document_version', entityId: v.id, summary: `${v.filename} returned for a fresh check following the ${c.kind} "${c.subject}"`, reason: r })
      actions.recheck_document_version_id = v.id
    }
    if (input.actions?.openPostIssuanceEvent) {
      const st = s.get('statements', input.actions.openPostIssuanceEvent.statementId)
      if (st.status === 'issued' && !s.where('postIssuanceEvents', (e) => e.statement_id === st.id && e.status === 'open').length) {
        const ev = { ...auditNow(ctx.userId), id: newId('pie'), service_id: st.service_id, statement_id: st.id, trigger: c.kind as 'complaint' | 'appeal', case_id: caseId, description: input.actions.openPostIssuanceEvent.description.trim() || `Opened from the ${c.kind} "${c.subject}"`, evidence_json: [], status: 'open' as const, outcome: null, decision_reason: null, opened_by: ctx.userId, opened_at: at, decided_by: null, decided_at: null, closed_at: null, replacement_iteration_id: null, external_notification_json: null }
        s.insert('postIssuanceEvents', ev)
        audit(ctx, { orgId: c.org_id, serviceId: st.service_id, eventType: 'statement.post_issuance_opened', entityType: 'post_issuance_event', entityId: ev.id, summary: `Post-issuance event opened on statement ${st.public_code} from the ${c.kind} "${c.subject}"`, after: { trigger: c.kind, status: 'open' } })
        actions.post_issuance_event_id = ev.id
      }
    }
    const updated = s.update('cases', caseId, { status: state, decided_at: at, decided_by: ctx.userId, outcome: input.outcome, outcome_summary: input.outcomeSummary.trim(), actions_json: actions }, ctx.userId)
    audit(ctx, { orgId: c.org_id, serviceId: c.service_id, eventType: 'case.decided', entityType: 'case', entityId: caseId, summary: `${c.kind} "${c.subject}" decided by ${userName(ctx.userId)} (outside the involved set): ${input.outcome.replace('_', ' ')} — ${r}`, reason: r, before: { status: c.status }, after: { status: state, outcome: input.outcome, actions } })
    if (c.complainant_user_id) notify([c.complainant_user_id], c.org_id, 'case_decided', `Your ${c.kind} was decided: ${input.outcome.replace('_', ' ')}`, input.outcomeSummary.trim(), c.service_id, { type: 'case', id: caseId })
    return caseView(updated, { internal: true })
  })
}

export async function close(caseId: string): Promise<CaseView> {
  return call(() => {
    const s = getStore()
    const c = s.get('cases', caseId)
    const ctx = authorize('case.decide', caseResource(c, authContext().userId))
    const { state } = caseMachine.apply(c.status, 'close')
    const updated = s.update('cases', caseId, { status: state, closed_at: nowIsoString() }, ctx.userId)
    audit(ctx, { orgId: c.org_id, serviceId: c.service_id, eventType: 'case.closed', entityType: 'case', entityId: caseId, summary: `${c.kind} "${c.subject}" closed by ${userName(ctx.userId)}`, before: { status: c.status }, after: { status: state } })
    if (c.complainant_user_id) notify([c.complainant_user_id], c.org_id, 'case_closed', `Your ${c.kind} was closed`, `"${c.subject}" is closed. Outcome: ${c.outcome?.replace('_', ' ') ?? '—'}.`, c.service_id, { type: 'case', id: caseId })
    return caseView(updated, { internal: true })
  })
}

export async function setTargets(caseId: string, targets: { acknowledgeTargetAt?: string; decideTargetAt?: string }, reason: string): Promise<CaseView> {
  return call(() => {
    const s = getStore()
    const c = s.get('cases', caseId)
    const ctx = authorize('case.assign', caseResource(c, authContext().userId))
    const r = requireReason(reason)
    const updated = s.update('cases', caseId, { acknowledge_target_at: targets.acknowledgeTargetAt ?? c.acknowledge_target_at, decide_target_at: targets.decideTargetAt ?? c.decide_target_at }, ctx.userId)
    audit(ctx, { orgId: c.org_id, serviceId: c.service_id, eventType: 'case.targets_changed', entityType: 'case', entityId: caseId, summary: `Targets of ${c.kind} "${c.subject}" changed by ${userName(ctx.userId)} — ${r}`, reason: r, before: { acknowledge_target_at: c.acknowledge_target_at, decide_target_at: c.decide_target_at }, after: { acknowledge_target_at: updated.acknowledge_target_at, decide_target_at: updated.decide_target_at } })
    return caseView(updated, { internal: true })
  })
}

/** Cron stand-in (PRD FR-55): flags overdue cases to the handler and the managers; idempotent per day. */
export function overdueSweepSync(): number {
  const s = getStore()
  const today = todayIso()
  let n = 0
  for (const c of s.where('cases', (x) => ['received', 'acknowledged', 'under_investigation'].includes(x.status))) {
    const v = caseView(c, { internal: true })
    if (!v.overdueAcknowledge && !v.overdueDecide) continue
    const already = s.where('notifications', (x) => x.type === 'case_overdue' && x.entity_id === c.id && x.created_at.slice(0, 10) === today).length
    if (already) continue
    notify([...(c.handler_user_id ? [c.handler_user_id] : []), ...managerUserIds()], 'org_verifassur', 'case_overdue', `${c.kind} "${c.subject}" is overdue`, v.overdueAcknowledge ? `Acknowledgement was due ${c.acknowledge_target_at.slice(0, 10)}.` : `A decision was due ${c.decide_target_at.slice(0, 10)}.`, c.service_id, { type: 'case', id: c.id })
    n++
  }
  return n
}
