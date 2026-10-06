/**
 * Service team nomination, reassignment and conflict-of-interest declarations (PRD FR-16, FR-17, FR-75).
 * PRD v0.3 FR-96, FR-98: every nomination or reassignment runs the competence and rotation checks; blocks stop it,
 * warnings need an override reason that is counted in the override statistics.
 */
import type { ServiceRole } from '@/domain/enums'
import type { CoiDeclaration, NominationCheck, ServiceTeamMember } from '@/domain/schemas'
import { coiMachine } from '@/domain/workflow/machines'
import { ApiError, audit, auditNow, authContext, authorize, call, getStore, newId, notify, nowIsoString, serviceAudience, serviceResource, userName } from './core'
import { checkCandidateSync, profileViewSync, type CandidateCheck } from './competence'
import { teamView, type TeamView } from './services'
import { requireReason, transitionStepInternal } from './steps'

export interface Candidate {
  userId: string
  name: string
  jobTitle: string
  role: ServiceRole
  /** Number of services where the user is currently active. */
  load: number
  /** PRD v0.3: qualification summary and overall status for the picker. */
  qualificationSummary: string
  competenceOverall: string
}

export async function candidates(serviceId: string): Promise<Candidate[]> {
  return call(() => {
    authorize('team.nominate', serviceResource(serviceId))
    const s = getStore()
    const existing = new Set(s.where('team', (t) => t.service_id === serviceId && t.status !== 'removed').map((t) => t.user_id))
    return s
      .where('memberships', (m) => m.org_id === 'org_verifassur' && m.status === 'active' && m.role !== 'platform_admin' && !existing.has(m.user_id))
      .map((m) => {
        const u = s.get('users', m.user_id)
        const p = profileViewSync(u.id)
        return {
          userId: u.id,
          name: u.name,
          jobTitle: u.job_title ?? '',
          role: m.role as ServiceRole,
          load: s.where('team', (t) => t.user_id === u.id && t.status === 'active').filter((t) => !['closed', 'cancelled'].includes(s.get('services', t.service_id).status)).length,
          qualificationSummary: p.qualifications.length ? p.qualifications.map((q) => `${q.kind.replace(/_/g, ' ')} (${q.status})`).join(' · ') : 'No qualification on file',
          competenceOverall: p.overall,
        }
      })
  })
}

export interface NominationInput {
  userId: string
  role: ServiceRole
  /** Mandatory when the check returns warnings (PRD FR-96, FR-98). */
  overrideReason?: string
}

export interface NominationResult {
  team: TeamView[]
  checks: CandidateCheck[]
}

/** Runs the checks for one nomination; throws on a block or on warnings without a reason; records the check. */
function runChecks(ctx: ReturnType<typeof authContext>, serviceId: string, tm: ServiceTeamMember, kind: NominationCheck['kind'], overrideReason: string | undefined): CandidateCheck {
  const s = getStore()
  const svc = s.get('services', serviceId)
  const check = checkCandidateSync(serviceId, tm.user_id, tm.service_role)
  if (check.blocked) throw new ApiError('conflict', `${userName(tm.user_id)} cannot be nominated as ${roleLabel(tm.service_role)}: ${check.blocks.join(' ')}`, { code: check.competence.blocked ? 'competence_block' : 'rotation_block', blocks: check.blocks })
  const reason = check.warnings.length ? requireReasonForWarnings(overrideReason, check.warnings) : null
  const row: NominationCheck = { ...auditNow(ctx.userId), id: newId('chk'), service_team_id: tm.id, kind, competence_json: check.competence.items, rotation_json: check.rotation.items.map(({ key, requirement, result, detail }) => ({ key, requirement, result, detail })), overridden: Boolean(reason), override_reason: reason, checked_by: ctx.userId, checked_at: nowIsoString() }
  s.insert('nominationChecks', row)
  if (reason) {
    audit(ctx, { orgId: svc.org_id, serviceId, eventType: 'team.check_overridden', entityType: 'service_team', entityId: tm.id, summary: `Override: ${userName(tm.user_id)} nominated as ${roleLabel(tm.service_role)} despite ${check.warnings.length} warning${check.warnings.length === 1 ? '' : 's'} by ${userName(ctx.userId)} — ${reason}`, reason, after: { warnings: check.warnings } })
    notify(s.where('memberships', (m) => m.org_id === 'org_verifassur' && m.role === 'verifier_manager' && m.status === 'active').map((m) => m.user_id).filter((u) => u !== ctx.userId), 'org_verifassur', 'check_overridden', `Competence or rotation warning overridden on ${svc.reference}`, `${userName(ctx.userId)} nominated ${userName(tm.user_id)} as ${roleLabel(tm.service_role)} despite: ${check.warnings.join(' ')} Reason: ${reason}`, serviceId)
  }
  return check
}

function requireReasonForWarnings(reason: string | undefined, warnings: string[]): string {
  try {
    return requireReason(reason)
  } catch {
    throw new ApiError('validation', `The check raised ${warnings.length} warning${warnings.length === 1 ? '' : 's'}; give a reason (at least 10 characters) to nominate anyway.`, { code: 'override_reason_required', warnings })
  }
}

export async function nominate(serviceId: string, members: NominationInput[]): Promise<NominationResult> {
  return call(() => {
    const ctx = authorize('team.nominate', serviceResource(serviceId))
    const s = getStore()
    const svc = s.get('services', serviceId)
    const current = s.where('team', (t) => t.service_id === serviceId && t.status !== 'removed')
    const checks: CandidateCheck[] = []
    for (const m of members) {
      const others = [...current, ...members.filter((x) => x !== m).map((x) => ({ user_id: x.userId, service_role: x.role }))].filter((x) => x.user_id === m.userId)
      if (m.role === 'verifier_independent_reviewer' && others.length) throw new ApiError('validation', `${userName(m.userId)} cannot be independent reviewer and hold another role on this service.`)
      if (others.some((o) => o.service_role === 'verifier_independent_reviewer')) throw new ApiError('validation', `${userName(m.userId)} is the independent reviewer and cannot take another role.`)
      if (current.some((c) => c.user_id === m.userId && c.service_role === m.role)) continue
      const tm: ServiceTeamMember = { ...auditNow(ctx.userId), id: newId('team'), service_id: serviceId, user_id: m.userId, service_role: m.role, status: 'nominated', nominated_by: ctx.userId, nominated_at: nowIsoString(), removed_at: null }
      // Checks run before the row is saved (PRD FR-16): a block or a missing override reason leaves the team untouched.
      const check = runChecks(ctx, serviceId, tm, 'nomination', m.overrideReason)
      checks.push(check)
      s.insert('team', tm)
      if (m.role === 'verifier_team_leader') s.update('services', serviceId, { team_leader_user_id: m.userId }, ctx.userId)
      const coi: CoiDeclaration = { ...auditNow(ctx.userId), id: newId('coi'), service_team_id: tm.id, declaration: null, details: null, declared_at: null, status: 'required', decided_by: null, decided_at: null, reconfirmed_for_iteration_id: null }
      s.insert('cois', coi)
      audit(ctx, { orgId: svc.org_id, serviceId, eventType: 'team.nominated', entityType: 'service_team', entityId: tm.id, summary: `${userName(m.userId)} nominated as ${roleLabel(m.role)}${check.warnings.length ? ` (${check.warnings.length} warning${check.warnings.length === 1 ? '' : 's'} overridden)` : ' (competence and rotation checks passed)'}`, after: { service_role: m.role, competence: check.competence.result, rotation: check.rotation.result } })
      notify([m.userId], 'org_verifassur', 'coi_required', 'Conflict-of-interest declaration required', `You were nominated on ${svc.reference}. Declare any conflicts before opening the service.`, serviceId, { type: 'coi', id: coi.id })
    }
    return { team: teamView(serviceId), checks }
  })
}

export async function remove(serviceId: string, teamMemberId: string): Promise<TeamView[]> {
  return call(() => {
    const ctx = authorize('team.nominate', serviceResource(serviceId))
    const s = getStore()
    const tm = s.get('team', teamMemberId)
    s.update('team', teamMemberId, { status: 'removed', removed_at: nowIsoString() }, ctx.userId)
    audit(ctx, { orgId: s.get('services', serviceId).org_id, serviceId, eventType: 'team.removed', entityType: 'service_team', entityId: tm.id, summary: `${userName(tm.user_id)} removed from the team (stays in the involved set)` })
    return teamView(serviceId)
  })
}

/**
 * Manager reassigns a team role to another person (PRD FR-75): the previous member is removed, the new one is
 * nominated in the same role after the competence and rotation checks and must declare conflicts of interest.
 */
export async function reassign(serviceId: string, teamMemberId: string, toUserId: string, reason: string, overrideReason?: string): Promise<NominationResult> {
  return call(() => {
    const ctx = authorize('team.reassign', serviceResource(serviceId))
    const r = requireReason(reason)
    const s = getStore()
    const tm = s.get('team', teamMemberId)
    if (tm.service_id !== serviceId || tm.status === 'removed') throw new ApiError('not_found', 'Team member not on this service')
    if (tm.user_id === toUserId) throw new ApiError('validation', 'Pick a different person.')
    const toUser = s.get('users', toUserId)
    if (toUser.status !== 'active' || !s.where('memberships', (m) => m.user_id === toUserId && m.org_id === 'org_verifassur' && m.status === 'active').length) throw new ApiError('validation', `${toUser.name} is not an active VERIFASSUR user.`)
    const others = s.where('team', (t) => t.service_id === serviceId && t.status !== 'removed' && t.user_id === toUserId && t.id !== teamMemberId)
    if (tm.service_role === 'verifier_independent_reviewer' && others.length) throw new ApiError('validation', `${toUser.name} cannot be independent reviewer and hold another role on this service.`)
    if (others.some((o) => o.service_role === 'verifier_independent_reviewer')) throw new ApiError('validation', `${toUser.name} is the independent reviewer and cannot take another role.`)
    const svc = s.get('services', serviceId)
    const next: ServiceTeamMember = { ...auditNow(ctx.userId), id: newId('team'), service_id: serviceId, user_id: toUserId, service_role: tm.service_role, status: 'nominated', nominated_by: ctx.userId, nominated_at: nowIsoString(), removed_at: null }
    const check = runChecks(ctx, serviceId, next, 'reassignment', overrideReason ?? reason)
    s.update('team', teamMemberId, { status: 'removed', removed_at: nowIsoString() }, ctx.userId)
    s.insert('team', next)
    const coi: CoiDeclaration = { ...auditNow(ctx.userId), id: newId('coi'), service_team_id: next.id, declaration: null, details: null, declared_at: null, status: 'required', decided_by: null, decided_at: null, reconfirmed_for_iteration_id: null }
    s.insert('cois', coi)
    if (tm.service_role === 'verifier_team_leader') s.update('services', serviceId, { team_leader_user_id: toUserId }, ctx.userId)
    const role = roleLabel(tm.service_role)
    audit(ctx, { orgId: svc.org_id, serviceId, eventType: 'team.reassigned', entityType: 'service_team', entityId: next.id, summary: `Override: ${role} reassigned from ${userName(tm.user_id)} to ${toUser.name} by ${userName(ctx.userId)} — ${r}`, reason: r, before: { user_id: tm.user_id, service_role: tm.service_role }, after: { user_id: toUserId, service_role: tm.service_role, competence: check.competence.result, rotation: check.rotation.result } })
    notify([tm.user_id], 'org_verifassur', 'team_reassigned', `Your ${role} role on ${svc.reference} was reassigned`, `${userName(ctx.userId)} reassigned the ${role} role to ${toUser.name}. Reason: ${r}`, serviceId)
    notify([toUserId], 'org_verifassur', 'coi_required', 'Conflict-of-interest declaration required', `You were assigned as ${role} on ${svc.reference} (reassigned from ${userName(tm.user_id)}). Declare any conflicts before opening the service.`, serviceId, { type: 'coi', id: coi.id })
    return { team: teamView(serviceId), checks: [check] }
  })
}

/** The signed-in user's pending COI declaration on a service, if any. */
export function myCoiSync(serviceId: string): (CoiDeclaration & { role: ServiceRole; serviceName: string; serviceReference: string; clientName: string; reconfirmation: boolean }) | null {
  const s = getStore()
  const ctx = authContext()
  const tm = s.where('team', (t) => t.service_id === serviceId && t.user_id === ctx.userId && t.status !== 'removed' && t.service_role !== 'client_contact')[0]
  if (!tm) return null
  const coi = s.where('cois', (c) => c.service_team_id === tm.id)[0]
  if (!coi || coi.status === 'approved') return null
  const svc = s.get('services', serviceId)
  return { ...coi, role: tm.service_role, serviceName: svc.name, serviceReference: svc.reference, clientName: s.get('organisations', svc.org_id).name, reconfirmation: Boolean(coi.reconfirmed_for_iteration_id) }
}

export async function declareCoi(serviceId: string, coiId: string, declaration: 'clear' | 'potential_conflict', details: string): Promise<CoiDeclaration> {
  return call(() => {
    const ctx = authorize('coi.declare', serviceResource(serviceId))
    const s = getStore()
    const coi = s.get('cois', coiId)
    const tm = s.get('team', coi.service_team_id)
    if (tm.user_id !== ctx.userId) throw new ApiError('forbidden', 'You can only declare your own conflicts of interest.')
    // A re-confirmation for a revision (PRD FR-89) is already in `declared`; the member confirms the content again.
    const state = coi.status === 'declared' ? 'declared' : coiMachine.apply(coi.status, coi.status === 'rejected' ? 'redeclare' : 'declare').state
    const updated = s.update('cois', coiId, { status: state, declaration, details, declared_at: nowIsoString() }, ctx.userId)
    const svc = s.get('services', serviceId)
    audit(ctx, { orgId: svc.org_id, serviceId, eventType: 'coi.declared', entityType: 'coi_declaration', entityId: coiId, summary: `${userName(ctx.userId)} ${coi.reconfirmed_for_iteration_id ? 're-confirmed' : 'declared'} ${declaration === 'clear' ? 'no conflict of interest' : 'a potential conflict of interest'}`, before: { status: coi.status }, after: { status: state, declaration } })
    notify(serviceAudience(serviceId, 'verifier').filter((u) => s.where('memberships', (m) => m.user_id === u && m.role === 'verifier_manager').length > 0), 'org_verifassur', 'coi_decided', 'COI declaration to approve', `${userName(ctx.userId)} declared ${declaration === 'clear' ? 'no conflict' : 'a potential conflict'} on ${svc.reference}.`, serviceId, { type: 'coi', id: coiId })
    return updated
  })
}

export async function decideCoi(serviceId: string, coiId: string, decision: 'approve' | 'reject', comment?: string): Promise<CoiDeclaration> {
  return call(() => {
    const ctx = authorize('coi.decide', serviceResource(serviceId))
    const s = getStore()
    const coi = s.get('cois', coiId)
    const { state } = coiMachine.apply(coi.status, decision)
    const updated = s.update('cois', coiId, { status: state, decided_by: ctx.userId, decided_at: nowIsoString(), details: comment ? `${coi.details ?? ''}\nManager: ${comment}`.trim() : coi.details }, ctx.userId)
    const tm = s.get('team', coi.service_team_id)
    if (decision === 'approve') s.update('team', tm.id, { status: 'active' }, ctx.userId)
    const svc = s.get('services', serviceId)
    audit(ctx, { orgId: svc.org_id, serviceId, eventType: `coi.${decision === 'approve' ? 'approved' : 'rejected'}`, entityType: 'coi_declaration', entityId: coiId, summary: `COI declaration of ${userName(tm.user_id)} ${decision === 'approve' ? 'approved' : 'rejected'} by ${userName(ctx.userId)}`, before: { status: coi.status }, after: { status: state } })
    notify([tm.user_id], 'org_verifassur', 'coi_decided', `COI declaration ${state}`, `${userName(ctx.userId)} ${decision === 'approve' ? 'approved' : 'rejected'} your declaration on ${svc.reference}.`, serviceId)
    // Close the nomination step automatically once the whole team is cleared.
    const members = s.where('team', (t) => t.service_id === serviceId && t.status !== 'removed' && t.service_role !== 'client_contact')
    const allApproved = members.length > 0 && members.every((m) => s.where('cois', (c) => c.service_team_id === m.id)[0]?.status === 'approved')
    if (allApproved) {
      const step = s.where('steps', (st) => st.service_id === serviceId && st.key === 'team_nomination')[0]
      if (step && step.status !== 'completed') {
        try {
          if (step.status === 'not_started' || step.status === 'planned') transitionStepInternal(serviceId, step.id, 'start', ctx.userId)
          transitionStepInternal(serviceId, step.id, 'complete', ctx.userId)
        } catch {
          /* leave for manual close */
        }
      }
    }
    return updated
  })
}

/** Latest recorded check per team member (for the team panel). */
export function checksForTeamSync(serviceId: string): Record<string, NominationCheck> {
  const s = getStore()
  const out: Record<string, NominationCheck> = {}
  for (const tm of s.where('team', (t) => t.service_id === serviceId)) {
    const latest = s.where('nominationChecks', (c) => c.service_team_id === tm.id).sort((a, b) => (a.checked_at < b.checked_at ? 1 : -1))[0]
    if (latest) out[tm.id] = latest
  }
  return out
}

export function roleLabel(role: ServiceRole): string {
  return role.replace('verifier_', '').replace(/_/g, ' ')
}
