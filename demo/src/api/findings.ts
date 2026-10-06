/** Findings (CAR, CL, FAR, OBS) with threaded responses (PRD §6.4). */
import type { FindingSeverity, FindingType } from '@/domain/enums'
import type { Finding, FindingResponse } from '@/domain/schemas'
import { FINDING_ACTION_PARTY, findingMachine, type FindingAction } from '@/domain/workflow/machines'
import { todayIso } from '@/mock/clock'
import { ApiError, audit, auditNow, authContext, authorize, call, getStore, newId, notify, nowIsoString, serviceAudience, serviceResource, userName } from './core'
import { documentView, type DocumentView } from './documents'

export interface FindingView extends Finding {
  raisedByName: string
  assignedName: string | null
  stepName: string | null
  serviceReference: string
  responseCount: number
  overdue: boolean
}

export interface ResponseView extends FindingResponse {
  authorName: string
  attachments: DocumentView[]
}

export function findingView(f: Finding): FindingView {
  const s = getStore()
  const step = f.step_id ? s.find('steps', f.step_id) : null
  const open = f.status !== 'closed' && f.status !== 'withdrawn'
  return {
    ...f,
    raisedByName: userName(f.raised_by),
    assignedName: f.assigned_user_id ? userName(f.assigned_user_id) : null,
    stepName: step?.name ?? null,
    serviceReference: s.get('services', f.service_id).reference,
    responseCount: s.where('findingResponses', (r) => r.finding_id === f.id).length,
    overdue: open && Boolean(f.due_at && f.due_at < todayIso()),
  }
}

export async function list(serviceId: string): Promise<FindingView[]> {
  return call(() => {
    authorize('service.read', serviceResource(serviceId))
    return getStore()
      .where('findings', (f) => f.service_id === serviceId)
      .sort((a, b) => a.number - b.number)
      .map(findingView)
  })
}

export async function get(findingId: string): Promise<{ finding: FindingView; responses: ResponseView[] }> {
  return call(() => {
    const s = getStore()
    const f = s.get('findings', findingId)
    authorize('service.read', serviceResource(f.service_id))
    const responses = s
      .where('findingResponses', (r) => r.finding_id === findingId)
      .sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
      .map((r) => ({
        ...r,
        authorName: userName(r.author_user_id),
        attachments: s
          .where('evidenceLinks', (e) => e.entity_type === 'finding_response' && e.entity_id === r.id)
          .map((e) => {
            const v = s.find('documentVersions', e.document_version_id)
            const d = v ? s.find('documents', v.document_id) : null
            return d ? documentView(d) : null
          })
          .filter((d): d is DocumentView => d !== null),
      }))
    return { finding: findingView(f), responses }
  })
}

export interface CreateFindingInput {
  type: FindingType
  severity: FindingSeverity
  title: string
  description: string
  stepId: string | null
  assignedUserId: string | null
  dueAt: string | null
}

export async function create(serviceId: string, input: CreateFindingInput): Promise<FindingView> {
  return call(() => {
    const ctx = authorize('finding.create', serviceResource(serviceId))
    const s = getStore()
    const svc = s.get('services', serviceId)
    if (!input.title.trim()) throw new ApiError('validation', 'A title is required.')
    const number = s.where('findings', (f) => f.service_id === serviceId).length + 1
    const f: Finding = {
      ...auditNow(ctx.userId),
      id: newId('fnd'),
      service_id: serviceId,
      number,
      type: input.type,
      severity: input.severity,
      title: input.title.trim(),
      description: input.description,
      step_id: input.stepId,
      entity_type: null,
      entity_id: null,
      raised_by: ctx.userId,
      raised_at: nowIsoString(),
      assigned_user_id: input.assignedUserId ?? svc.client_contact_user_id,
      due_at: input.dueAt,
      status: 'open',
      closed_by: null,
      closed_at: null,
      blocking: input.type === 'CAR',
    }
    s.insert('findings', f)
    audit(ctx, { orgId: svc.org_id, serviceId, eventType: 'finding.raised', entityType: 'finding', entityId: f.id, summary: `${f.type} #${number} raised by ${userName(ctx.userId)}: ${f.title}`, after: { status: 'open', severity: f.severity } })
    notify([f.assigned_user_id!, ...serviceAudience(serviceId, 'client')], svc.org_id, 'finding_raised', `${f.type} #${number} raised on ${svc.reference}`, f.title, serviceId, { type: 'finding', id: f.id })
    return findingView(f)
  })
}

export async function respond(findingId: string, body: string, attachmentVersionIds: string[] = []): Promise<ResponseView> {
  return call(() => {
    const s = getStore()
    const f = s.get('findings', findingId)
    const ctx = authContext()
    const party = ctx.orgType
    authorize(party === 'client' ? 'finding.respond' : 'finding.transition', serviceResource(f.service_id))
    if (!body.trim()) throw new ApiError('validation', 'Write a response first.')
    if (f.status === 'closed' || f.status === 'withdrawn') throw new ApiError('conflict', 'This finding is closed.')
    const r: FindingResponse = { ...auditNow(ctx.userId), id: newId('rsp'), finding_id: findingId, author_user_id: ctx.userId, party, body: body.trim() }
    s.insert('findingResponses', r)
    for (const vid of attachmentVersionIds) {
      s.insert('evidenceLinks', { ...auditNow(ctx.userId), id: newId('evl'), org_id: s.get('services', f.service_id).org_id, document_version_id: vid, entity_type: 'finding_response', entity_id: r.id, note: null })
    }
    const svc = s.get('services', f.service_id)
    let status: Finding['status'] = f.status
    if (party === 'client' && findingMachine.can(f.status, 'respond')) status = findingMachine.apply(f.status, 'respond').state
    if (status !== f.status) s.update('findings', findingId, { status }, ctx.userId)
    audit(ctx, { orgId: svc.org_id, serviceId: f.service_id, eventType: 'finding.responded', entityType: 'finding', entityId: findingId, summary: `${userName(ctx.userId)} responded to ${f.type} #${f.number}`, before: { status: f.status }, after: { status } })
    notify(serviceAudience(f.service_id, party === 'client' ? 'verifier' : 'client'), party === 'client' ? 'org_verifassur' : svc.org_id, 'finding_responded', `Response on ${f.type} #${f.number}`, `${userName(ctx.userId)}: ${body.trim().slice(0, 120)}`, f.service_id, { type: 'finding', id: findingId })
    return { ...r, authorName: userName(ctx.userId), attachments: [] }
  })
}

export async function transition(findingId: string, action: FindingAction, comment?: string): Promise<FindingView> {
  return call(() => {
    const s = getStore()
    const f = s.get('findings', findingId)
    const ctx = authorize('finding.transition', serviceResource(f.service_id))
    if (FINDING_ACTION_PARTY[action] === 'client' && ctx.orgType !== 'client') throw new ApiError('forbidden', 'Only the client responds to findings.')
    const { state } = findingMachine.apply(f.status, action)
    const patch: Partial<Finding> = { status: state }
    if (state === 'closed') {
      patch.closed_by = ctx.userId
      patch.closed_at = nowIsoString()
    }
    if (action === 'reopen') {
      patch.closed_by = null
      patch.closed_at = null
    }
    const updated = s.update('findings', findingId, patch, ctx.userId)
    if (comment?.trim()) {
      s.insert('findingResponses', { ...auditNow(ctx.userId), id: newId('rsp'), finding_id: findingId, author_user_id: ctx.userId, party: 'verifier', body: comment.trim() })
    }
    const svc = s.get('services', f.service_id)
    audit(ctx, { orgId: svc.org_id, serviceId: f.service_id, eventType: `finding.${state}`, entityType: 'finding', entityId: findingId, summary: `${f.type} #${f.number} ${state.replace('_', ' ')} by ${userName(ctx.userId)}${comment ? `: ${comment}` : ''}`, before: { status: f.status }, after: { status: state } })
    if (state === 'closed') notify(serviceAudience(f.service_id, 'client'), svc.org_id, 'finding_closed', `${f.type} #${f.number} closed`, `${userName(ctx.userId)} closed "${f.title}".`, f.service_id, { type: 'finding', id: findingId })
    return findingView(updated)
  })
}

export async function update(findingId: string, patch: Partial<Pick<Finding, 'severity' | 'due_at' | 'assigned_user_id' | 'description' | 'title'>>): Promise<FindingView> {
  return call(() => {
    const s = getStore()
    const f = s.get('findings', findingId)
    const ctx = authorize('finding.transition', serviceResource(f.service_id))
    const updated = s.update('findings', findingId, patch, ctx.userId)
    audit(ctx, { orgId: s.get('services', f.service_id).org_id, serviceId: f.service_id, eventType: 'finding.updated', entityType: 'finding', entityId: findingId, summary: `${f.type} #${f.number} updated`, before: f, after: updated })
    return findingView(updated)
  })
}
