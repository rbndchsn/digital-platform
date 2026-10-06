/** Approvals (technical scope, impartiality, contract, audit plan) and client agreement acceptance. */
import type { Approval } from '@/domain/schemas'
import { ApiError, audit, authorize, call, getStore, notify, nowIsoString, serviceAudience, serviceResource, userName } from './core'
import { syncServiceStatus, transitionStepInternal } from './steps'

export async function decide(serviceId: string, approvalId: string, decision: 'approve' | 'reject', comment?: string): Promise<Approval> {
  return call(() => {
    const s = getStore()
    const ap = s.get('approvals', approvalId)
    if (ap.service_id !== serviceId) throw new ApiError('not_found', 'Approval not on this service')
    if (ap.kind === 'iteration_ir' || ap.kind === 'iteration_manager') throw new ApiError('validation', 'Iteration approvals are decided on the Opinion tab.')
    const action = `approval.decide:${ap.kind}` as `approval.decide:${'technical_scope' | 'impartiality' | 'contract' | 'audit_plan' | 'agreement_acceptance'}`
    const ctx = authorize(action, serviceResource(serviceId))
    if (ap.status !== 'pending') throw new ApiError('conflict', 'This approval has already been decided.')
    const updated = s.update('approvals', approvalId, { status: decision === 'approve' ? 'approved' : 'rejected', decided_by: ctx.userId, decided_at: nowIsoString(), comment: comment ?? null }, ctx.userId)
    const svc = s.get('services', serviceId)
    audit(ctx, { orgId: svc.org_id, serviceId, eventType: 'approval.decided', entityType: 'approval', entityId: approvalId, summary: `${ap.label} ${decision === 'approve' ? 'approved' : 'rejected'} by ${userName(ctx.userId)}${comment ? `: ${comment}` : ''}`, before: { status: 'pending' }, after: { status: updated.status } })
    notify(serviceAudience(serviceId, ctx.orgType === 'client' ? 'verifier' : 'client'), ctx.orgType === 'client' ? 'org_verifassur' : svc.org_id, 'approval_decided', `${ap.label} ${updated.status}`, `${userName(ctx.userId)} ${updated.status} "${ap.label}" on ${svc.reference}.`, serviceId)
    autoCompleteStep(serviceId, ap.step_id, ctx.userId)
    return updated
  })
}

/** Client accepts the service agreement (click-to-accept with name, time, IP and document hash; PRD FR-18). */
export async function acceptAgreement(serviceId: string, approvalId: string, typedName: string): Promise<Approval> {
  return call(() => {
    const s = getStore()
    const ap = s.get('approvals', approvalId)
    if (ap.kind !== 'agreement_acceptance') throw new ApiError('validation', 'Not an agreement approval')
    const ctx = authorize('approval.decide:agreement_acceptance', serviceResource(serviceId))
    if (ap.status !== 'pending') throw new ApiError('conflict', 'The agreement has already been accepted.')
    const user = s.get('users', ctx.userId)
    if (typedName.trim().toLowerCase() !== user.name.toLowerCase()) throw new ApiError('validation', 'Type your full name exactly as shown to accept.')
    const msaSlot = s.where('slots', (sl) => sl.step_id === ap.step_id && sl.key === 'msa')[0]
    const doc = msaSlot?.current_document_id ? s.find('documents', msaSlot.current_document_id) : null
    const ver = doc?.current_version_id ? s.find('documentVersions', doc.current_version_id) : null
    if (!ver) throw new ApiError('conflict', 'The service agreement has not been uploaded yet.')
    const at = nowIsoString()
    const updated = s.update('approvals', approvalId, { status: 'approved', decided_by: ctx.userId, decided_at: at, comment: null, evidence_json: { name: user.name, accepted_at: at, ip: '192.0.2.10', document_sha256: ver.sha256, filename: ver.filename } }, ctx.userId)
    const svc = s.get('services', serviceId)
    audit(ctx, { orgId: svc.org_id, serviceId, eventType: 'agreement.accepted', entityType: 'approval', entityId: approvalId, summary: `Service agreement accepted by ${user.name} (hash ${ver.sha256.slice(0, 12)}…)`, before: { status: 'pending' }, after: { status: 'approved', document_sha256: ver.sha256 } })
    notify(serviceAudience(serviceId, 'verifier'), 'org_verifassur', 'agreement_accepted', 'Service agreement accepted', `${user.name} accepted the service agreement for ${svc.reference}.`, serviceId)
    autoCompleteStep(serviceId, ap.step_id, ctx.userId)
    return updated
  })
}

/** When every approval and required slot of a step is satisfied, complete it and move on. */
export function autoCompleteStep(serviceId: string, stepId: string | null, actorId: string): void {
  if (!stepId) return
  const s = getStore()
  const step = s.get('steps', stepId)
  if (step.status === 'completed') return
  const pending = s.where('approvals', (a) => a.step_id === stepId && a.status !== 'approved')
  const missing = s.where('slots', (sl) => sl.step_id === stepId && sl.required && sl.status !== 'accepted')
  if (pending.length || missing.length) return
  if (step.key === 'team_nomination' || step.key === 'final_opinion') return
  try {
    if (step.status === 'not_started' || step.status === 'planned') transitionStepInternal(serviceId, stepId, 'start', actorId)
    transitionStepInternal(serviceId, stepId, 'complete', actorId)
    syncServiceStatus(serviceId, actorId)
  } catch {
    /* leave the step for a human to close */
  }
}
