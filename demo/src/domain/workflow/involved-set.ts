/**
 * The involved set (PRD v0.3 FR-79, §3.3): everyone who did verification work on a service and therefore may not
 * take the final decision on it. Derived from `service_team` rows and audit events, never stored as a list, so it
 * cannot drift. Scoped per service (plan_v1 §8 D11): a person who edited a figure under iteration 1 stays involved
 * for iteration 2 and for any revision of the statement.
 */
import type { ServiceRole } from '../enums'

export interface InvolvedTeamRow {
  user_id: string
  service_role: ServiceRole
  status: string
  nominated_at: string | null
}

export interface InvolvedEvent {
  event_type: string
  actor_user_id: string | null
  occurred_at: string
}

export interface InvolvedIteration {
  iteration_no: number
  ir_user_id: string | null
  ir_decision: string | null
}

export interface InvolvedInput {
  team: InvolvedTeamRow[]
  events: InvolvedEvent[]
  iterations: InvolvedIteration[]
}

export interface InvolvedMember {
  userId: string
  reasons: string[]
}

/** Audit event types that count as entering or editing a verified value (PRD FR-43, FR-77). */
export const VERIFIED_VALUE_EVENT_TYPES: readonly string[] = ['record.verified_value_edited']

/** Actions refused to the involved set (PRD FR-79, §11.2). */
export const DECISION_ACTIONS: readonly string[] = ['iteration.manager_decide', 'iteration.issue', 'statement.revise_decide', 'statement.withdraw_decide']

const ROLE_LABEL: Record<ServiceRole, string> = {
  verifier_manager: 'manager on the team',
  verifier_team_leader: 'team leader',
  verifier_auditor: 'auditor',
  verifier_technical_expert: 'technical expert',
  verifier_independent_reviewer: 'independent reviewer',
  verifier_coordinator: 'coordinator',
  verifier_finance: 'finance',
  client_contact: 'client contact',
}

function day(iso: string | null): string {
  return iso ? iso.slice(0, 10) : ''
}

export function computeInvolvedSet(input: InvolvedInput): InvolvedMember[] {
  const byUser = new Map<string, string[]>()
  const add = (userId: string | null, reason: string) => {
    if (!userId) return
    const list = byUser.get(userId) ?? []
    if (!list.includes(reason)) list.push(reason)
    byUser.set(userId, list)
  }
  // (a) every verifier service role, including members who were later removed.
  for (const t of input.team) {
    if (t.service_role === 'client_contact') continue
    add(t.user_id, `${t.status === 'removed' ? 'Was' : 'Holds'} the ${ROLE_LABEL[t.service_role]} role${t.nominated_at ? ` (nominated ${day(t.nominated_at)})` : ''}`)
  }
  // (b) every verified-value or review-status edit on a record attached to the service.
  for (const e of input.events) {
    if (VERIFIED_VALUE_EVENT_TYPES.includes(e.event_type)) add(e.actor_user_id, `Entered or edited verified values on ${day(e.occurred_at)}`)
  }
  // (c) whoever decided an independent review.
  for (const it of input.iterations) {
    if (it.ir_decision) add(it.ir_user_id, `Decided the independent review of iteration ${it.iteration_no}`)
  }
  return [...byUser.entries()].map(([userId, reasons]) => ({ userId, reasons }))
}

export function involvedMember(set: InvolvedMember[], userId: string): InvolvedMember | null {
  return set.find((m) => m.userId === userId) ?? null
}

/** Managers able to take the decision: every decision-capable user not in the involved set. */
export function eligibleDecisionMakers(managerUserIds: string[], set: InvolvedMember[]): string[] {
  return managerUserIds.filter((id) => !set.some((m) => m.userId === id))
}
