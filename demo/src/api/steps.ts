/** Internal step helpers shared by services, approvals, documents and team modules (no latency). */
import { OVERRIDE_REASON_MIN_LENGTH, type ServiceStatus, type StepOverrideAction } from '@/domain/enums'
import type { AuthContext } from '@/domain/policy'
import type { Phase, Step } from '@/domain/schemas'
import { TransitionError, applyStepOverride, canStartStep, derivePhaseStatus, stepMachine, type StepAction } from '@/domain/workflow/machines'
import { ApiError, audit, getStore, notify, nowIsoString, serviceAudience, userName } from './core'

/** Overrides and ADMIN actions need a real reason (PRD FR-73, §11.2). */
export function requireReason(reason: string | undefined | null): string {
  const r = (reason ?? '').trim()
  if (r.length < OVERRIDE_REASON_MIN_LENGTH) throw new ApiError('validation', `A reason of at least ${OVERRIDE_REASON_MIN_LENGTH} characters is required.`)
  return r
}

export function currentStepOf(serviceId: string): { phase: Phase; step: Step } | null {
  const s = getStore()
  const phases = s.where('phases', (p) => p.service_id === serviceId).sort((a, b) => a.order_no - b.order_no)
  for (const phase of phases) {
    const steps = s.where('steps', (st) => st.phase_id === phase.id).sort((a, b) => a.order_no - b.order_no)
    const open = steps.find((st) => st.status !== 'completed' && st.status !== 'skipped')
    if (open) return { phase, step: open }
  }
  return null
}

export function refreshPhaseStatus(phaseId: string, actorId: string | null): void {
  const s = getStore()
  const steps = s.where('steps', (st) => st.phase_id === phaseId)
  const status = derivePhaseStatus(steps.map((st) => st.status))
  const starts = steps.map((st) => st.actual_start).filter(Boolean) as string[]
  const ends = steps.map((st) => st.actual_end).filter(Boolean) as string[]
  s.update('phases', phaseId, { status, actual_start: starts.length ? starts.sort()[0] : null, actual_end: status === 'completed' && ends.length ? ends.sort().at(-1)! : null }, actorId)
}

export function startFirstStep(serviceId: string, actorId: string): void {
  const s = getStore()
  const cur = currentStepOf(serviceId)
  if (cur && (cur.step.status === 'not_started' || cur.step.status === 'planned')) {
    s.update('steps', cur.step.id, { status: 'in_progress', actual_start: nowIsoString() }, actorId)
    refreshPhaseStatus(cur.phase.id, actorId)
    const svc = s.get('services', serviceId)
    audit(null, { orgId: svc.org_id, serviceId, eventType: 'step.started', entityType: 'step', entityId: cur.step.id, summary: `${cur.step.name} started`, before: { status: 'not_started' }, after: { status: 'in_progress' } })
    notify(serviceAudience(serviceId, cur.step.owner_role === 'client_contact' ? 'client' : 'verifier'), cur.step.owner_role === 'client_contact' ? svc.org_id : 'org_verifassur', 'step_opened', `${cur.step.name} is open`, `${cur.step.name} started on ${svc.reference}.`, serviceId)
  }
}

/** Recompute the service status from the current step after a step change. */
export function syncServiceStatus(serviceId: string, actorId: string | null): void {
  const s = getStore()
  const svc = s.get('services', serviceId)
  if (!['contracting', 'planning', 'execution', 'opinion_review'].includes(svc.status)) return
  const cur = currentStepOf(serviceId)
  let next: ServiceStatus
  if (!cur) next = svc.status
  else if (cur.phase.key === 'contracting') next = 'contracting'
  else if (cur.phase.key === 'planning') next = 'planning'
  else if (cur.step.key === 'final_opinion') next = 'opinion_review'
  else next = 'execution'
  if (next !== svc.status) {
    s.update('services', serviceId, { status: next, contracted_at: next === 'planning' && !svc.contracted_at ? nowIsoString() : svc.contracted_at }, actorId)
    audit(null, { orgId: svc.org_id, serviceId, eventType: 'service.status_changed', entityType: 'service', entityId: serviceId, summary: `Service moved to ${next.replace('_', ' ')}`, before: { status: svc.status }, after: { status: next } })
    if (next === 'planning') {
      notify(serviceAudience(serviceId, 'both'), svc.org_id, 'generic', `${svc.reference} is contracted`, 'Contracting is complete; planning has started.', serviceId)
    }
  }
}

export function transitionStepInternal(serviceId: string, stepId: string, action: StepAction, actorId: string, opts: { reason?: string; plannedStart?: string; plannedEnd?: string } = {}): Step {
  const s = getStore()
  const step = s.get('steps', stepId)
  const phase = s.get('phases', step.phase_id)
  const svc = s.get('services', serviceId)
  if (action === 'start') {
    const phases = s.where('phases', (p) => p.service_id === serviceId)
    const all = s.where('steps', (st) => st.service_id === serviceId).map((st) => ({ phase_order: phases.find((p) => p.id === st.phase_id)!.order_no, order_no: st.order_no, status: st.status, parallel_allowed: st.parallel_allowed }))
    const gate = canStartStep({ phase_order: phase.order_no, order_no: step.order_no, parallel_allowed: step.parallel_allowed }, all)
    if (!gate.ok) throw new ApiError('conflict', gate.reason)
  }
  if (action === 'complete') {
    const missing = s.where('slots', (sl) => sl.step_id === stepId && sl.required && sl.status !== 'accepted')
    if (missing.length) throw new ApiError('conflict', `Required documents not yet accepted: ${missing.map((m) => m.name).join(', ')}.`)
    const pending = s.where('approvals', (a) => a.step_id === stepId && a.status !== 'approved')
    if (pending.length) throw new ApiError('conflict', `Approvals pending: ${pending.map((a) => a.label).join(', ')}.`)
    if (step.key === 'team_nomination') {
      const members = s.where('team', (t) => t.service_id === serviceId && t.status !== 'removed' && t.service_role !== 'client_contact')
      if (members.length === 0) throw new ApiError('conflict', 'Nominate the team first.')
      const notApproved = members.filter((m) => s.where('cois', (c) => c.service_team_id === m.id)[0]?.status !== 'approved')
      if (notApproved.length) throw new ApiError('conflict', `COI declarations outstanding: ${notApproved.map((m) => userName(m.user_id)).join(', ')}.`)
    }
    if (step.key === 'final_opinion') {
      const issued = s.where('iterations', (i) => i.service_id === serviceId && i.status === 'issued').length
      if (!issued) throw new ApiError('conflict', 'The opinion must be issued before this step can be completed.')
    }
  }
  const { state } = stepMachine.apply(step.status, action)
  const patch: Partial<Step> = { status: state }
  if (action === 'start' || action === 'reopen') patch.actual_start = step.actual_start ?? nowIsoString()
  if (action === 'complete') {
    patch.actual_end = nowIsoString()
    patch.closed_by = actorId
    patch.closed_at = nowIsoString()
  }
  if (action === 'reopen') {
    patch.actual_end = null
    patch.closed_at = null
    patch.closed_by = null
  }
  if (opts.plannedStart) patch.planned_start = opts.plannedStart
  if (opts.plannedEnd) patch.planned_end = opts.plannedEnd
  const updated = s.update('steps', stepId, patch, actorId)
  refreshPhaseStatus(phase.id, actorId)
  const verb = action === 'complete' ? 'completed' : action === 'start' ? 'started' : action === 'reopen' ? 'reopened' : action === 'hold' ? 'put on hold' : action === 'block' ? 'blocked' : action === 'unblock' ? 'unblocked' : action === 'resume' ? 'resumed' : action === 'skip' ? 'skipped' : 'planned'
  audit({ userId: actorId, orgId: svc.org_id, orgType: 'verifier', orgRole: null, platformRole: null, serviceRoles: {}, coiApproved: {} }, { orgId: svc.org_id, serviceId, eventType: `step.${verb.replace(' ', '_')}`, entityType: 'step', entityId: stepId, summary: `${step.name} ${verb}${opts.reason ? `: ${opts.reason}` : ''}`, before: { status: step.status }, after: { status: state } })
  if (action === 'complete') {
    notify(serviceAudience(serviceId, 'client'), svc.org_id, 'step_closed', `${step.name} completed`, `${userName(actorId)} completed ${step.name} on ${svc.reference}.`, serviceId)
    startFirstStep(serviceId, actorId)
  }
  syncServiceStatus(serviceId, actorId)
  return updated
}

/**
 * Manager override of a step status (PRD FR-73): bypasses required slots and approvals, writes the distinct
 * `step.overridden` event with the reason, notifies both parties and lets the workflow move on.
 */
export function overrideStepInternal(ctx: AuthContext, serviceId: string, stepId: string, action: StepOverrideAction, reason: string): Step {
  const s = getStore()
  const step = s.get('steps', stepId)
  if (step.service_id !== serviceId) throw new ApiError('not_found', 'Step not on this service')
  const phase = s.get('phases', step.phase_id)
  const svc = s.get('services', serviceId)
  let state: Step['status']
  try {
    state = applyStepOverride(step, action).state
  } catch (e) {
    // PRD v0.3 FR-80: a refused override of a protected step is itself evidence (ADMIN statistics, FR-71).
    if (e instanceof TransitionError && e.code === 'step_non_overridable') {
      audit(ctx, { orgId: svc.org_id, serviceId, eventType: 'step.override_refused', entityType: 'step', entityId: stepId, summary: `Override refused: ${step.name} cannot be ${action === 'complete' ? 'forced to completed' : 'skipped'} (non-overridable step) — attempted by ${userName(ctx.userId)}`, reason, before: { status: step.status }, after: { action, code: 'step_non_overridable' } })
    }
    throw e
  }
  const now = nowIsoString()
  const patch: Partial<Step> = { status: state }
  if (action === 'complete' || action === 'skip') {
    patch.actual_start = step.actual_start ?? now
    patch.actual_end = now
    patch.closed_by = ctx.userId
    patch.closed_at = now
  }
  if (action === 'reopen') {
    patch.actual_start = step.actual_start ?? now
    patch.actual_end = null
    patch.closed_by = null
    patch.closed_at = null
  }
  const updated = s.update('steps', stepId, patch, ctx.userId)
  refreshPhaseStatus(phase.id, ctx.userId)
  const verb = action === 'complete' ? 'completed' : action === 'reopen' ? 'reopened' : 'skipped'
  audit(ctx, { orgId: svc.org_id, serviceId, eventType: 'step.overridden', entityType: 'step', entityId: stepId, summary: `Override: ${step.name} ${verb} by ${userName(ctx.userId)} — ${reason}`, reason, before: { status: step.status }, after: { status: state, action } })
  const title = `${step.name} ${verb} by manager override`
  const body = `${userName(ctx.userId)} ${verb} "${step.name}" on ${svc.reference}. Reason: ${reason}`
  notify(serviceAudience(serviceId, 'client'), svc.org_id, 'step_overridden', title, body, serviceId, { type: 'step', id: stepId })
  notify(serviceAudience(serviceId, 'verifier').filter((u) => u !== ctx.userId), 'org_verifassur', 'step_overridden', title, body, serviceId, { type: 'step', id: stepId })
  if (action === 'complete' || action === 'skip') startFirstStep(serviceId, ctx.userId)
  syncServiceStatus(serviceId, ctx.userId)
  return updated
}
