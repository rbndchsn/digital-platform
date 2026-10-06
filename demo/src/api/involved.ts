/**
 * Involved set, decision eligibility and the consequences of a verified-value edit (PRD v0.3 FR-77, FR-79).
 * Derived at request time from `service_team` and `audit_events`; nothing here is stored as a list.
 */
import type { Action, Resource } from '@/domain/policy'
import { decide, type AuthContext } from '@/domain/policy'
import { computeInvolvedSet, eligibleDecisionMakers, involvedMember, type InvolvedMember } from '@/domain/workflow/involved-set'
import { iterationMachine } from '@/domain/workflow/machines'
import { ApiError, audit, authContext, authorize, call, getStore, notify, nowIsoString, serviceResource, userName } from './core'

export function involvedSetSync(serviceId: string): InvolvedMember[] {
  const s = getStore()
  return computeInvolvedSet({
    team: s.where('team', (t) => t.service_id === serviceId).map((t) => ({ user_id: t.user_id, service_role: t.service_role, status: t.status, nominated_at: t.nominated_at })),
    events: s.where('auditEvents', (e) => e.service_id === serviceId).map((e) => ({ event_type: e.event_type, actor_user_id: e.actor_user_id, occurred_at: e.occurred_at })),
    iterations: s.where('iterations', (i) => i.service_id === serviceId).map((i) => ({ iteration_no: i.iteration_no, ir_user_id: i.ir_user_id, ir_decision: i.ir_decision })),
  })
}

/** Resource descriptor for decision-type actions: the service plus the viewer's involved-set entry. */
export function decisionResource(serviceId: string, userId: string): Resource {
  return { ...serviceResource(serviceId), involved: involvedMember(involvedSetSync(serviceId), userId) }
}

/** Decision-capable managers (active `verifier_manager` memberships) who are not in the involved set. */
export function eligibleManagersSync(serviceId: string): string[] {
  const s = getStore()
  const managers = s.where('memberships', (m) => m.org_id === 'org_verifassur' && m.role === 'verifier_manager' && m.status === 'active').map((m) => m.user_id).filter((id) => s.get('users', id).status === 'active')
  return eligibleDecisionMakers(managers, involvedSetSync(serviceId))
}

export interface InvolvedSetView {
  members: (InvolvedMember & { name: string })[]
  eligibleManagers: { userId: string; name: string }[]
}

export async function involvedSet(serviceId: string): Promise<InvolvedSetView> {
  return call(() => {
    authorize('service.read', serviceResource(serviceId))
    return { members: involvedSetSync(serviceId).map((m) => ({ ...m, name: userName(m.userId) })), eligibleManagers: eligibleManagersSync(serviceId).map((id) => ({ userId: id, name: userName(id) })) }
  })
}

export interface Eligibility {
  allowed: boolean
  reasons: string[]
  code: string | null
  eligibleManagers: string[]
}

/** PRD §10.2 `GET /services/:id/eligibility?action=`: drives the disabled decision control with its reasons. */
export function eligibilitySync(serviceId: string, action: Action): Eligibility {
  const ctx = authContext()
  const d = decide(ctx, action, decisionResource(serviceId, ctx.userId))
  const me = involvedMember(involvedSetSync(serviceId), ctx.userId)
  return { allowed: d.allowed, reasons: d.allowed ? [] : d.code === 'decision_maker_conflict' && me ? me.reasons : [d.reason ?? 'Not allowed'], code: d.allowed ? null : (d.code ?? 'forbidden'), eligibleManagers: eligibleManagersSync(serviceId).map(userName) }
}

export async function eligibility(serviceId: string, action: Action): Promise<Eligibility> {
  return call(() => {
    authorize('service.read', serviceResource(serviceId))
    return eligibilitySync(serviceId, action)
  })
}

export interface VerifiedValueEdit {
  entityType: string
  entityId: string
  summary: string
  before: unknown
  after: unknown
}

/**
 * Every verified-value or review-status edit (PRD FR-43, FR-77): refused after issuance (`issued_immutable`),
 * written as `record.verified_value_edited` (which places the editor in the involved set), and when an iteration is
 * past independent review it goes back to IR with its decision, checklist and acknowledgement cleared.
 */
export function recordVerifiedValueEdit(ctx: AuthContext, serviceId: string | null, edit: VerifiedValueEdit): { involvedSetJoined: boolean; iterationReturnedToIr: string | null } {
  const s = getStore()
  if (!serviceId) {
    audit(ctx, { orgId: ctx.orgId, serviceId: null, eventType: 'record.verified_value_edited', entityType: edit.entityType, entityId: edit.entityId, summary: edit.summary, before: edit.before, after: edit.after })
    return { involvedSetJoined: false, iterationReturnedToIr: null }
  }
  const svc = s.get('services', serviceId)
  if (s.where('statements', (st) => st.service_id === serviceId && st.status !== 'withdrawn').length && svc.status !== 'in_revision') {
    throw new ApiError('conflict', 'Verified figures of an issued opinion are immutable. Open a post-issuance revision or withdrawal instead.', { code: 'issued_immutable' })
  }
  audit(ctx, { orgId: svc.org_id, serviceId, eventType: 'record.verified_value_edited', entityType: edit.entityType, entityId: edit.entityId, summary: edit.summary, before: edit.before, after: edit.after })
  let returned: string | null = null
  for (const it of s.where('iterations', (i) => i.service_id === serviceId && iterationMachine.can(i.status, 'return_to_ir'))) {
    const { state } = iterationMachine.apply(it.status, 'return_to_ir')
    const template = s.get('templates', svc.template_id ?? `tpl_${svc.service_type}`)
    s.update('iterations', it.id, { status: state, ir_decision: null, ir_comment: null, ir_decided_at: null, manager_user_id: null, manager_decision: null, manager_comment: null, manager_decided_at: null, materiality_ack_ir_json: null, materiality_ack_manager_json: null, checklist_ir_json: template.ir_checklist.map((c) => ({ ...c, checked: false })), checklist_manager_json: template.manager_checklist.map((c) => ({ ...c, checked: false })), returned_to_ir_count: it.returned_to_ir_count + 1, submitted_for_ir_at: nowIsoString() }, ctx.userId)
    audit(ctx, { orgId: svc.org_id, serviceId, eventType: 'iteration.returned_to_ir', entityType: 'opinion_iteration', entityId: it.id, summary: `Iteration ${it.iteration_no} returned to independent review: ${userName(ctx.userId)} edited verified values after the review`, reason: edit.summary, before: { status: it.status }, after: { status: state } })
    notify([...(it.ir_user_id ? [it.ir_user_id] : []), ...(svc.team_leader_user_id ? [svc.team_leader_user_id] : [])], 'org_verifassur', 'iteration_returned_to_ir', `Iteration ${it.iteration_no} returned to independent review`, `${userName(ctx.userId)} edited verified values on ${svc.reference} after the independent review. The review must be redone.`, serviceId, { type: 'iteration', id: it.id })
    returned = it.id
  }
  return { involvedSetJoined: true, iterationReturnedToIr: returned }
}
