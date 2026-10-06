import { describe, expect, it } from 'vitest'
import {
  TransitionError,
  applyStepOverride,
  canStartStep,
  caseMachine,
  coiMachine,
  derivePhaseStatus,
  documentMachine,
  findingMachine,
  iterationMachine,
  materialityMachine,
  misstatementMachine,
  postIssuanceMachine,
  recordMachine,
  serviceMachine,
  statementMachine,
  stepMachine,
} from './machines'

describe('manager step override', () => {
  it('forces a step from any state with a distinct event', () => {
    expect(applyStepOverride({ key: 'desk_review', status: 'not_started' }, 'complete')).toEqual({ state: 'completed', event: 'step.overridden' })
    expect(applyStepOverride({ key: 'desk_review', status: 'blocked' }, 'complete').state).toBe('completed')
    expect(applyStepOverride({ key: 'desk_review', status: 'in_progress' }, 'skip').state).toBe('skipped')
    expect(applyStepOverride({ key: 'desk_review', status: 'skipped' }, 'reopen').state).toBe('in_progress')
    // The normal machine would refuse these.
    expect(() => stepMachine.apply('not_started', 'complete')).toThrow(TransitionError)
    expect(() => stepMachine.apply('in_progress', 'skip')).toThrow(TransitionError)
  })
  it('refuses a no-op and never forces a non-overridable step to completed or skipped (PRD v0.3 FR-80)', () => {
    expect(() => applyStepOverride({ key: 'desk_review', status: 'completed' }, 'complete')).toThrow(TransitionError)
    const nomination = { key: 'team_nomination', status: 'in_progress' as const, non_overridable: true }
    expect(() => applyStepOverride(nomination, 'complete')).toThrow(TransitionError)
    expect(() => applyStepOverride(nomination, 'skip')).toThrow(TransitionError)
    try {
      applyStepOverride(nomination, 'complete')
    } catch (e) {
      expect((e as TransitionError).code).toBe('step_non_overridable')
    }
    expect(() => applyStepOverride({ key: 'final_opinion', status: 'in_progress', non_overridable: true }, 'complete')).toThrow(TransitionError)
    // Reopening makes the process stricter and stays allowed; the attribute, not the key, decides.
    expect(applyStepOverride({ key: 'team_nomination', status: 'completed', non_overridable: true }, 'reopen').state).toBe('in_progress')
    expect(applyStepOverride({ key: 'team_nomination', status: 'in_progress', non_overridable: false }, 'complete').state).toBe('completed')
  })
})

describe('PRD v0.3 machines', () => {
  it('revision reopens an issued or closed service and returns to opinion review', () => {
    expect(serviceMachine.apply('closed', 'open_revision').state).toBe('in_revision')
    expect(serviceMachine.apply('issued', 'open_revision').state).toBe('in_revision')
    expect(serviceMachine.apply('in_revision', 'revision_to_opinion_review').state).toBe('opinion_review')
    expect(() => serviceMachine.apply('execution', 'open_revision')).toThrow(TransitionError)
  })
  it('a verified-value edit after IR approval returns the iteration to independent review', () => {
    expect(iterationMachine.apply('manager_review', 'return_to_ir').state).toBe('independent_review')
    expect(iterationMachine.apply('approved', 'return_to_ir').state).toBe('independent_review')
    expect(() => iterationMachine.apply('draft', 'return_to_ir')).toThrow(TransitionError)
    expect(() => iterationMachine.apply('issued', 'return_to_ir')).toThrow(TransitionError)
  })
  it('statements are terminal once superseded or withdrawn', () => {
    expect(statementMachine.apply('issued', 'supersede').state).toBe('superseded')
    expect(statementMachine.apply('issued', 'withdraw').state).toBe('withdrawn')
    expect(() => statementMachine.apply('withdrawn', 'supersede')).toThrow(TransitionError)
    expect(statementMachine.isTerminal('withdrawn')).toBe(true)
  })
  it('cases run received → acknowledged → under investigation → decided → closed, or are withdrawn by the complainant', () => {
    let s = caseMachine.apply('received', 'acknowledge').state
    s = caseMachine.apply(s, 'start_investigation').state
    s = caseMachine.apply(s, 'decide').state
    expect(caseMachine.apply(s, 'close').state).toBe('closed')
    expect(caseMachine.apply('acknowledged', 'withdraw').state).toBe('withdrawn_by_complainant')
    expect(() => caseMachine.apply('decided', 'withdraw')).toThrow(TransitionError)
  })
  it('materiality reopens after approval; misstatements go proposed → confirmed → dismissed', () => {
    expect(materialityMachine.apply('draft', 'approve').state).toBe('approved')
    expect(materialityMachine.apply('approved', 'reopen').state).toBe('draft')
    const c = misstatementMachine.apply('proposed', 'confirm').state
    expect(misstatementMachine.apply(c, 'dismiss').state).toBe('dismissed')
    expect(() => misstatementMachine.apply('dismissed', 'confirm')).toThrow(TransitionError)
  })
  it('a verified record can be withdrawn (assurance withdrawn) and COI re-confirmed for a revision', () => {
    expect(recordMachine.apply('verified', 'withdraw').state).toBe('withdrawn')
    expect(coiMachine.apply('approved', 'reconfirm').state).toBe('declared')
    expect(postIssuanceMachine.apply(postIssuanceMachine.apply('open', 'decide').state, 'close').state).toBe('closed')
  })
})

describe('service machine', () => {
  it('follows the happy path', () => {
    let s = serviceMachine.apply('draft', 'submit').state
    expect(s).toBe('requested')
    s = serviceMachine.apply(s, 'triage_accept').state
    expect(s).toBe('contracting')
    s = serviceMachine.apply(s, 'contracting_complete').state
    s = serviceMachine.apply(s, 'planning_complete').state
    s = serviceMachine.apply(s, 'submit_for_opinion_review').state
    expect(s).toBe('opinion_review')
    s = serviceMachine.apply(s, 'issue').state
    expect(s).toBe('issued')
    s = serviceMachine.apply(s, 'close').state
    expect(serviceMachine.isTerminal(s)).toBe(true)
  })

  it('refuses illegal transitions', () => {
    expect(() => serviceMachine.apply('draft', 'issue')).toThrow(TransitionError)
    expect(() => serviceMachine.apply('closed', 'hold')).toThrow(TransitionError)
    expect(serviceMachine.can('execution', 'hold')).toBe(true)
    expect(serviceMachine.can('requested', 'hold')).toBe(false)
    expect(serviceMachine.actionsFrom('issued')).toEqual(['close', 'open_revision'])
  })
})

describe('step machine and gating', () => {
  it('allows the normal lifecycle and reopening', () => {
    expect(stepMachine.apply('not_started', 'start').state).toBe('in_progress')
    expect(stepMachine.apply('in_progress', 'complete').state).toBe('completed')
    expect(stepMachine.apply('completed', 'reopen').state).toBe('in_progress')
    expect(() => stepMachine.apply('completed', 'complete')).toThrow(TransitionError)
  })

  it('gates steps by phase and order', () => {
    const all = [
      { phase_order: 0, order_no: 0, status: 'completed' as const, parallel_allowed: false },
      { phase_order: 0, order_no: 1, status: 'in_progress' as const, parallel_allowed: false },
      { phase_order: 1, order_no: 0, status: 'not_started' as const, parallel_allowed: false },
      { phase_order: 0, order_no: 2, status: 'not_started' as const, parallel_allowed: true },
    ]
    expect(canStartStep({ phase_order: 1, order_no: 0, parallel_allowed: false }, all).ok).toBe(false)
    expect(canStartStep({ phase_order: 0, order_no: 2, parallel_allowed: true }, all).ok).toBe(true)
    expect(canStartStep({ phase_order: 0, order_no: 1, parallel_allowed: false }, all).ok).toBe(true)
    all[1].status = 'completed'
    expect(canStartStep({ phase_order: 1, order_no: 0, parallel_allowed: false }, all).ok).toBe(false) // parallel step 2 still open? it is parallel_allowed so ignored for order, but phase gating counts it
  })

  it('derives phase status', () => {
    expect(derivePhaseStatus(['completed', 'completed'])).toBe('completed')
    expect(derivePhaseStatus(['completed', 'in_progress'])).toBe('in_progress')
    expect(derivePhaseStatus(['not_started', 'not_started'])).toBe('not_started')
    expect(derivePhaseStatus(['in_progress', 'blocked'])).toBe('blocked')
    expect(derivePhaseStatus(['completed', 'not_started'])).toBe('in_progress')
  })
})

describe('finding machine', () => {
  it('client responds, verifier reviews and closes', () => {
    let s = findingMachine.apply('open', 'respond').state
    s = findingMachine.apply(s, 'review').state
    expect(s).toBe('under_review')
    expect(findingMachine.apply(s, 'close').state).toBe('closed')
    expect(() => findingMachine.apply('closed', 'respond')).toThrow(TransitionError)
  })
})

describe('iteration machine', () => {
  it('changes requested by IR ends the iteration', () => {
    const s = iterationMachine.apply('independent_review', 'ir_request_changes').state
    expect(iterationMachine.isTerminal(s)).toBe(true)
    expect(() => iterationMachine.apply(s, 'submit_for_ir')).toThrow(TransitionError)
  })
  it('approval path reaches issued', () => {
    let s = iterationMachine.apply('draft', 'submit_for_ir').state
    s = iterationMachine.apply(s, 'ir_approve').state
    expect(s).toBe('manager_review')
    s = iterationMachine.apply(s, 'manager_approve').state
    expect(iterationMachine.apply(s, 'issue').state).toBe('issued')
    expect(() => iterationMachine.apply('manager_review', 'issue')).toThrow(TransitionError)
  })
})

describe('coi, document and record machines', () => {
  it('coi requires declaration before approval', () => {
    expect(() => coiMachine.apply('required', 'approve')).toThrow(TransitionError)
    const s = coiMachine.apply('required', 'declare').state
    expect(coiMachine.apply(s, 'approve').state).toBe('approved')
    expect(coiMachine.apply(coiMachine.apply(s, 'reject').state, 'redeclare').state).toBe('declared')
  })
  it('documents can be rejected after acceptance but not re-checked', () => {
    expect(documentMachine.apply('accepted', 'reject').state).toBe('rejected')
    expect(() => documentMachine.apply('rejected', 'check')).toThrow(TransitionError)
  })
  it('records are superseded only after verification', () => {
    expect(() => recordMachine.apply('submitted', 'supersede')).toThrow(TransitionError)
    const v = recordMachine.apply('submitted', 'verify').state
    expect(recordMachine.apply(v, 'supersede').state).toBe('superseded')
  })
})
