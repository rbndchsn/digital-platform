/**
 * Post-issuance events: revision and withdrawal of an issued statement (PRD v0.3 §6.19, FR-88–FR-90, §8.6).
 * The decision belongs to a manager outside the involved set (FR-79); records are re-marked, never deleted.
 */
import type { PostIssuanceOutcome, PostIssuanceTrigger, WithdrawalPublicCategory } from '@/domain/enums'
import { decide } from '@/domain/policy'
import type { PostIssuanceEvent } from '@/domain/schemas'
import { coiMachine, postIssuanceMachine, serviceMachine, statementMachine } from '@/domain/workflow/machines'
import { ApiError, audit, auditNow, authContext, authorize, call, getStore, managerUserIds, newId, notify, nowIsoString, serviceAudience, serviceResource, userName } from './core'
import { decisionResource, eligibleManagersSync, involvedSetSync } from './involved'
import { reopenRecordsForRevision, withdrawRecordsFor } from './records'
import { requireReason } from './steps'

export interface PostIssuanceView extends PostIssuanceEvent {
  statementCode: string
  statementStatus: string
  openedByName: string
  decidedByName: string | null
  replacementCode: string | null
  caseSubject: string | null
  /** Whether the viewer may decide this event (outside the involved set). */
  canDecide: boolean
  eligibleManagers: string[]
}

export function postIssuanceView(ev: PostIssuanceEvent): PostIssuanceView {
  const s = getStore()
  const st = s.get('statements', ev.statement_id)
  const replacement = st.superseded_by_id ? s.find('statements', st.superseded_by_id) : null
  const canDecide = (() => {
    try {
      const ctx = authContext()
      return ev.status === 'open' && decide(ctx, 'statement.withdraw_decide', decisionResource(ev.service_id, ctx.userId)).allowed
    } catch {
      return false
    }
  })()
  return {
    ...ev,
    statementCode: st.public_code,
    statementStatus: st.status,
    openedByName: userName(ev.opened_by),
    decidedByName: ev.decided_by ? userName(ev.decided_by) : null,
    replacementCode: replacement?.public_code ?? null,
    caseSubject: ev.case_id ? (s.find('cases', ev.case_id)?.subject ?? null) : null,
    canDecide,
    eligibleManagers: eligibleManagersSync(ev.service_id).map(userName),
  }
}

export async function list(serviceId: string): Promise<PostIssuanceView[]> {
  return call(() => {
    authorize('service.read', serviceResource(serviceId))
    return getStore()
      .where('postIssuanceEvents', (e) => e.service_id === serviceId)
      .sort((a, b) => (a.opened_at < b.opened_at ? 1 : -1))
      .map(postIssuanceView)
  })
}

export interface OpenInput {
  trigger: PostIssuanceTrigger
  description: string
  evidenceVersionIds?: string[]
  caseId?: string | null
}

/** A manager opens a post-issuance event on an issued statement (FR-88). */
export async function open(statementId: string, input: OpenInput): Promise<PostIssuanceView> {
  return call(() => {
    const s = getStore()
    const st = s.get('statements', statementId)
    const ctx = authorize('statement.post_issuance_open', serviceResource(st.service_id))
    if (st.status !== 'issued') throw new ApiError('conflict', `Statement ${st.public_code} is already ${st.status}.`)
    if (s.where('postIssuanceEvents', (e) => e.statement_id === statementId && e.status === 'open').length) throw new ApiError('conflict', 'A post-issuance event is already open on this statement.')
    if (!input.description.trim()) throw new ApiError('validation', 'Describe what was discovered.')
    const svc = s.get('services', st.service_id)
    const ev: PostIssuanceEvent = {
      ...auditNow(ctx.userId),
      id: newId('pie'),
      service_id: st.service_id,
      statement_id: statementId,
      trigger: input.trigger,
      case_id: input.caseId ?? null,
      description: input.description.trim(),
      evidence_json: input.evidenceVersionIds ?? [],
      status: 'open',
      outcome: null,
      decision_reason: null,
      opened_by: ctx.userId,
      opened_at: nowIsoString(),
      decided_by: null,
      decided_at: null,
      closed_at: null,
      replacement_iteration_id: null,
      external_notification_json: null,
    }
    s.insert('postIssuanceEvents', ev)
    audit(ctx, { orgId: svc.org_id, serviceId: svc.id, eventType: 'statement.post_issuance_opened', entityType: 'post_issuance_event', entityId: ev.id, summary: `Post-issuance event opened on statement ${st.public_code} by ${userName(ctx.userId)} (trigger: ${input.trigger}): ${ev.description}`, after: { trigger: input.trigger, status: 'open' } })
    notify([...serviceAudience(st.service_id, 'both'), ...managerUserIds()].filter((u) => u !== ctx.userId), svc.org_id, 'post_issuance_opened', `${svc.reference}: statement ${st.public_code} under review`, `${userName(ctx.userId)} opened a post-issuance event (${input.trigger}): ${ev.description}`, svc.id, { type: 'statement', id: statementId })
    return postIssuanceView(ev)
  })
}

export interface DecideInput {
  outcome: PostIssuanceOutcome
  reason: string
  publicCategory?: WithdrawalPublicCategory | null
  externalNotification?: { to: string; how: string } | null
}

/**
 * The decision (FR-89 revise, FR-90 withdraw) by a manager outside the involved set. `revise` opens the revision:
 * the service goes to `in_revision`, every COI is re-confirmed, records return under verification and the team
 * leader prepares the next iteration. `withdraw` marks the statement and every dependent record immediately.
 */
export async function decideEvent(eventId: string, input: DecideInput): Promise<PostIssuanceView> {
  return call(() => {
    const s = getStore()
    const ev = s.get('postIssuanceEvents', eventId)
    const ctx = authContext()
    const action = input.outcome === 'withdraw' ? 'statement.withdraw_decide' : 'statement.revise_decide'
    const d = decide(ctx, action, decisionResource(ev.service_id, ctx.userId))
    const svc = s.get('services', ev.service_id)
    const st = s.get('statements', ev.statement_id)
    if (!d.allowed) {
      if (d.code === 'decision_maker_conflict') {
        audit(ctx, { orgId: svc.org_id, serviceId: svc.id, eventType: 'iteration.decision_refused', entityType: 'post_issuance_event', entityId: eventId, summary: `${input.outcome} decision on statement ${st.public_code} refused to ${userName(ctx.userId)}: decision_maker_conflict (${d.reason})`, reason: 'decision_maker_conflict' })
        throw new ApiError('forbidden', `You cannot take this decision: ${d.reason}.`, { code: 'decision_maker_conflict', eligible: eligibleManagersSync(ev.service_id).map(userName) })
      }
      throw new ApiError('forbidden', d.reason ? `You cannot do that: ${d.reason}.` : 'You do not have permission for this action.', { code: d.code })
    }
    const r = requireReason(input.reason)
    if (input.outcome === 'withdraw' && !input.publicCategory) throw new ApiError('validation', 'Choose the public reason category shown on the verification page.')
    const at = nowIsoString()
    const { state } = postIssuanceMachine.apply(ev.status, 'decide')
    const patch: Partial<PostIssuanceEvent> = { status: state, outcome: input.outcome, decision_reason: r, decided_by: ctx.userId, decided_at: at }
    if (input.externalNotification) patch.external_notification_json = { to: input.externalNotification.to, when: at, how: input.externalNotification.how, by: ctx.userId }
    audit(ctx, { orgId: svc.org_id, serviceId: svc.id, eventType: 'statement.post_issuance_decided', entityType: 'post_issuance_event', entityId: eventId, summary: `Post-issuance event on ${st.public_code} decided by ${userName(ctx.userId)} (outside the involved set): ${input.outcome} — ${r}`, reason: r, before: { status: ev.status }, after: { status: state, outcome: input.outcome } })

    if (input.outcome === 'no_action') {
      const { state: closed } = postIssuanceMachine.apply(state, 'close')
      s.update('postIssuanceEvents', eventId, { ...patch, status: closed, closed_at: at }, ctx.userId)
    } else if (input.outcome === 'withdraw') {
      const { state: stState } = statementMachine.apply(st.status, 'withdraw')
      s.update('statements', st.id, { status: stState, withdrawn_at: at, withdrawn_by: ctx.userId, withdrawal_reason: r, withdrawal_public_category: input.publicCategory ?? 'other' }, ctx.userId)
      const n = withdrawRecordsFor(st.id, ctx.userId)
      audit(ctx, { orgId: svc.org_id, serviceId: svc.id, eventType: 'statement.withdrawn', entityType: 'opinion_statement', entityId: st.id, summary: `Statement ${st.public_code} withdrawn by ${userName(ctx.userId)} (${input.publicCategory}); ${n} record${n === 1 ? '' : 's'} marked "assurance withdrawn" — ${r}`, reason: r, before: { status: 'issued' }, after: { status: stState, public_category: input.publicCategory } })
      if (svc.status === 'issued') {
        const { state: svcState } = serviceMachine.apply(svc.status, 'close')
        s.update('services', svc.id, { status: svcState, closed_at: at }, ctx.userId)
      }
      const { state: closed } = postIssuanceMachine.apply(state, 'close')
      s.update('postIssuanceEvents', eventId, { ...patch, status: closed, closed_at: at }, ctx.userId)
      notify(serviceAudience(svc.id, 'both').filter((u) => u !== ctx.userId), svc.org_id, 'statement_withdrawn', `Statement ${st.public_code} withdrawn`, `VERIFASSUR withdrew the opinion for ${svc.reference}. Records that relied on it now show "assurance withdrawn"; the public page carries a withdrawal notice. Reason category: ${input.publicCategory}.`, svc.id, { type: 'statement', id: st.id })
    } else {
      // Revise: re-run the chain. Service → in_revision, COI re-confirmation, records back under verification.
      const { state: svcState } = serviceMachine.apply(svc.status, 'open_revision')
      s.update('services', svc.id, { status: svcState }, ctx.userId)
      s.update('postIssuanceEvents', eventId, patch, ctx.userId)
      for (const tm of s.where('team', (t) => t.service_id === svc.id && t.status !== 'removed' && t.service_role !== 'client_contact')) {
        const coi = s.where('cois', (c) => c.service_team_id === tm.id)[0]
        if (coi && coiMachine.can(coi.status, 'reconfirm')) {
          const { state: coiState } = coiMachine.apply(coi.status, 'reconfirm')
          s.update('cois', coi.id, { status: coiState, decided_by: null, decided_at: null, reconfirmed_for_iteration_id: eventId }, ctx.userId)
          s.update('team', tm.id, { status: 'nominated' }, ctx.userId)
          notify([tm.user_id], 'org_verifassur', 'coi_required', `Re-confirm your conflict-of-interest declaration on ${svc.reference}`, 'A revision of the issued opinion is opening; every team member re-confirms their declaration before the chain runs again.', svc.id, { type: 'coi', id: coi.id })
        }
      }
      reopenRecordsForRevision(svc.id, ctx.userId)
      for (const key of ['final_opinion', 'final_submission']) {
        const step = s.where('steps', (x) => x.service_id === svc.id && x.key === key)[0]
        if (step && (step.status === 'completed' || step.status === 'skipped')) s.update('steps', step.id, { status: key === 'final_opinion' ? 'in_progress' : 'not_started', actual_end: null, closed_at: null, closed_by: null }, ctx.userId)
      }
      audit(ctx, { orgId: svc.org_id, serviceId: svc.id, eventType: 'service.status_changed', entityType: 'service', entityId: svc.id, summary: `Revision of statement ${st.public_code} opened: team re-confirms COI, independent review and decision run again`, before: { status: svc.status }, after: { status: svcState } })
      notify(serviceAudience(svc.id, 'both').filter((u) => u !== ctx.userId), svc.org_id, 'statement_revised', `${svc.reference}: revision of statement ${st.public_code} opened`, `${userName(ctx.userId)} decided to revise the issued opinion. The statement stays valid until the replacement is issued; the team re-confirms conflicts of interest and prepares a new iteration.`, svc.id, { type: 'statement', id: st.id })
    }
    return postIssuanceView(s.get('postIssuanceEvents', eventId))
  })
}

/** The programme or registry was told outside the platform; the platform records that it happened (FR-88). */
export async function recordExternalNotification(eventId: string, input: { to: string; how: string }): Promise<PostIssuanceView> {
  return call(() => {
    const s = getStore()
    const ev = s.get('postIssuanceEvents', eventId)
    const ctx = authorize('statement.post_issuance_open', serviceResource(ev.service_id))
    if (!input.to.trim() || !input.how.trim()) throw new ApiError('validation', 'Say who was notified and how.')
    const at = nowIsoString()
    const updated = s.update('postIssuanceEvents', eventId, { external_notification_json: { to: input.to.trim(), when: at, how: input.how.trim(), by: ctx.userId } }, ctx.userId)
    const svc = s.get('services', ev.service_id)
    audit(ctx, { orgId: svc.org_id, serviceId: svc.id, eventType: 'statement.external_notification_recorded', entityType: 'post_issuance_event', entityId: eventId, summary: `${userName(ctx.userId)} recorded that ${input.to.trim()} was notified (${input.how.trim()})`, after: updated.external_notification_json })
    return postIssuanceView(updated)
  })
}

/** Who is in the involved set of the service, for the dialog (why a manager cannot decide). */
export function involvedNamesSync(serviceId: string): string[] {
  return involvedSetSync(serviceId).map((m) => userName(m.userId))
}
