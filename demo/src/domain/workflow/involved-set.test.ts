import { describe, expect, it } from 'vitest'
import { computeInvolvedSet, eligibleDecisionMakers, involvedMember } from './involved-set'

describe('involved set (PRD v0.3 FR-79)', () => {
  const team = [
    { user_id: 'u_tl', service_role: 'verifier_team_leader' as const, status: 'active', nominated_at: '2027-01-10T09:00:00Z' },
    { user_id: 'u_aud', service_role: 'verifier_auditor' as const, status: 'removed', nominated_at: '2027-01-10T09:00:00Z' },
    { user_id: 'u_ir', service_role: 'verifier_independent_reviewer' as const, status: 'active', nominated_at: null },
    { user_id: 'u_client', service_role: 'client_contact' as const, status: 'active', nominated_at: null },
  ]
  const events = [
    { event_type: 'record.verified_value_edited', actor_user_id: 'u_mgr', occurred_at: '2027-03-12T10:00:00Z' },
    { event_type: 'step.overridden', actor_user_id: 'u_mgr2', occurred_at: '2027-03-12T10:00:00Z' },
    { event_type: 'record.verified_value_edited', actor_user_id: 'u_mgr', occurred_at: '2027-03-13T10:00:00Z' },
  ]
  const iterations = [{ iteration_no: 1, ir_user_id: 'u_ir', ir_decision: 'request_changes' }]

  it('includes team roles (even removed), verified-value editors and the IR decider, never the client contact', () => {
    const set = computeInvolvedSet({ team, events, iterations })
    const ids = set.map((m) => m.userId).sort()
    expect(ids).toEqual(['u_aud', 'u_ir', 'u_mgr', 'u_tl'])
    expect(involvedMember(set, 'u_mgr')!.reasons).toEqual(['Entered or edited verified values on 2027-03-12', 'Entered or edited verified values on 2027-03-13'])
    expect(involvedMember(set, 'u_aud')!.reasons[0]).toMatch(/^Was the auditor role/)
    expect(involvedMember(set, 'u_ir')!.reasons).toContain('Decided the independent review of iteration 1')
    expect(involvedMember(set, 'u_mgr2')).toBeNull()
    expect(involvedMember(set, 'u_client')).toBeNull()
  })

  it('is derived, so a step override or a later removal never changes who edited figures', () => {
    const set = computeInvolvedSet({ team: [], events, iterations: [] })
    expect(set.map((m) => m.userId)).toEqual(['u_mgr'])
  })

  it('names the eligible decision-makers as the managers outside the set', () => {
    const set = computeInvolvedSet({ team, events, iterations })
    expect(eligibleDecisionMakers(['u_mgr', 'u_mgr2'], set)).toEqual(['u_mgr2'])
    expect(eligibleDecisionMakers(['u_mgr'], set)).toEqual([])
  })
})
