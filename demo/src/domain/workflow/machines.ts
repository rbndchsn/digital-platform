/**
 * State machines (PRD §8.5). Each machine is a transition table; `apply` validates and returns the new state
 * plus the event name the audit log records. The api layer performs side effects.
 */
import type {
  CoiStatus,
  DocumentCheckStatus,
  FindingStatus,
  IterationStatus,
  RecordStatus,
  ServiceStatus,
  StepStatus,
} from '../enums'

export class TransitionError extends Error {
  constructor(
    readonly machine: string,
    readonly from: string,
    readonly action: string,
  ) {
    super(`${machine}: cannot "${action}" from "${from}"`)
    this.name = 'TransitionError'
  }
}

export interface Machine<S extends string, A extends string> {
  name: string
  can(from: S, action: A): boolean
  apply(from: S, action: A): { state: S; event: string }
  actionsFrom(from: S): A[]
  isTerminal(state: S): boolean
}

type Table<S extends string, A extends string> = Record<A, { from: readonly S[]; to: S | ((from: S) => S) }>

export function createMachine<S extends string, A extends string>(name: string, table: Table<S, A>, terminal: readonly S[] = []): Machine<S, A> {
  const can = (from: S, action: A) => (table[action]?.from as readonly S[] | undefined)?.includes(from) ?? false
  return {
    name,
    can,
    apply(from, action) {
      if (!can(from, action)) throw new TransitionError(name, from, action)
      const t = table[action]
      const to = typeof t.to === 'function' ? t.to(from) : t.to
      return { state: to, event: `${name}.${action}` }
    },
    actionsFrom(from) {
      return (Object.keys(table) as A[]).filter((a) => can(from, a))
    },
    isTerminal(state) {
      return terminal.includes(state)
    },
  }
}

// ---------------------------------------------------------------- Service
export type ServiceAction =
  | 'submit'
  | 'triage_accept'
  | 'triage_decline'
  | 'contracting_complete'
  | 'planning_complete'
  | 'submit_for_opinion_review'
  | 'return_to_execution'
  | 'issue'
  | 'close'
  | 'hold'
  | 'resume'
  | 'cancel'

const ACTIVE: ServiceStatus[] = ['contracting', 'planning', 'execution', 'opinion_review']

export const serviceMachine = createMachine<ServiceStatus, ServiceAction>(
  'service',
  {
    submit: { from: ['draft'], to: 'requested' },
    triage_accept: { from: ['requested', 'triage'], to: 'contracting' },
    triage_decline: { from: ['requested', 'triage'], to: 'cancelled' },
    contracting_complete: { from: ['contracting'], to: 'planning' },
    planning_complete: { from: ['planning'], to: 'execution' },
    submit_for_opinion_review: { from: ['execution'], to: 'opinion_review' },
    return_to_execution: { from: ['opinion_review'], to: 'execution' },
    issue: { from: ['opinion_review'], to: 'issued' },
    close: { from: ['issued'], to: 'closed' },
    hold: { from: ACTIVE, to: 'on_hold' },
    // `resume` returns to the stored resume_status; the api layer supplies it.
    resume: { from: ['on_hold'], to: 'contracting' },
    cancel: { from: ['draft', 'requested', 'triage', ...ACTIVE, 'on_hold'], to: 'cancelled' },
  },
  ['closed', 'cancelled'],
)

// ---------------------------------------------------------------- Step / phase
export type StepAction = 'plan' | 'start' | 'hold' | 'resume' | 'block' | 'unblock' | 'complete' | 'skip' | 'reopen'

export const stepMachine = createMachine<StepStatus, StepAction>(
  'step',
  {
    plan: { from: ['not_started'], to: 'planned' },
    start: { from: ['not_started', 'planned'], to: 'in_progress' },
    hold: { from: ['in_progress'], to: 'on_hold' },
    resume: { from: ['on_hold'], to: 'in_progress' },
    block: { from: ['in_progress'], to: 'blocked' },
    unblock: { from: ['blocked'], to: 'in_progress' },
    complete: { from: ['in_progress', 'blocked'], to: 'completed' },
    skip: { from: ['not_started', 'planned'], to: 'skipped' },
    reopen: { from: ['completed', 'skipped'], to: 'in_progress' },
  },
  [],
)

/**
 * Phase gating (PRD FR-12): a step may start only when every step in earlier phases is completed or skipped,
 * unless the step is `parallel_allowed` within its own phase (it may still not jump a phase).
 */
export function canStartStep(
  step: { phase_order: number; order_no: number; parallel_allowed: boolean },
  all: { phase_order: number; order_no: number; status: StepStatus; parallel_allowed: boolean }[],
): { ok: true } | { ok: false; reason: string } {
  const done = (s: StepStatus) => s === 'completed' || s === 'skipped'
  const earlierPhaseOpen = all.some((s) => s.phase_order < step.phase_order && !done(s.status))
  if (earlierPhaseOpen) return { ok: false, reason: 'A previous phase is not complete' }
  if (!step.parallel_allowed) {
    const earlierStepOpen = all.some(
      (s) => s.phase_order === step.phase_order && s.order_no < step.order_no && !done(s.status) && !s.parallel_allowed,
    )
    if (earlierStepOpen) return { ok: false, reason: 'A previous step in this phase is not complete' }
  }
  return { ok: true }
}

/** Phase status derived from its steps. */
export function derivePhaseStatus(stepStatuses: StepStatus[]): StepStatus {
  if (stepStatuses.length === 0) return 'not_started'
  if (stepStatuses.every((s) => s === 'completed' || s === 'skipped')) return 'completed'
  if (stepStatuses.some((s) => s === 'blocked')) return 'blocked'
  if (stepStatuses.some((s) => s === 'on_hold')) return 'on_hold'
  if (stepStatuses.some((s) => s === 'in_progress' || s === 'completed')) return 'in_progress'
  if (stepStatuses.some((s) => s === 'planned')) return 'planned'
  return 'not_started'
}

// ---------------------------------------------------------------- Finding
export type FindingAction = 'respond' | 'review' | 'close' | 'reopen' | 'withdraw'

export const findingMachine = createMachine<FindingStatus, FindingAction>(
  'finding',
  {
    respond: { from: ['open', 'under_review'], to: 'responded' },
    review: { from: ['responded'], to: 'under_review' },
    close: { from: ['responded', 'under_review', 'open'], to: 'closed' },
    reopen: { from: ['closed', 'under_review'], to: 'open' },
    withdraw: { from: ['open', 'responded', 'under_review'], to: 'withdrawn' },
  },
  ['closed', 'withdrawn'],
)

/** Which party may perform a finding action (PRD FR-29). */
export const FINDING_ACTION_PARTY: Record<FindingAction, 'client' | 'verifier' | 'either'> = {
  respond: 'client',
  review: 'verifier',
  close: 'verifier',
  reopen: 'verifier',
  withdraw: 'verifier',
}

// ---------------------------------------------------------------- Opinion iteration
export type IterationAction = 'submit_for_ir' | 'ir_approve' | 'ir_request_changes' | 'manager_approve' | 'manager_request_changes' | 'issue'

export const iterationMachine = createMachine<IterationStatus, IterationAction>(
  'iteration',
  {
    submit_for_ir: { from: ['draft'], to: 'independent_review' },
    ir_approve: { from: ['independent_review'], to: 'manager_review' },
    ir_request_changes: { from: ['independent_review'], to: 'changes_requested' },
    manager_approve: { from: ['manager_review'], to: 'approved' },
    manager_request_changes: { from: ['manager_review'], to: 'changes_requested' },
    issue: { from: ['approved'], to: 'issued' },
  },
  ['changes_requested', 'issued'],
)

// ---------------------------------------------------------------- COI
export type CoiAction = 'declare' | 'approve' | 'reject' | 'redeclare'

export const coiMachine = createMachine<CoiStatus, CoiAction>(
  'coi',
  {
    declare: { from: ['required'], to: 'declared' },
    approve: { from: ['declared'], to: 'approved' },
    reject: { from: ['declared'], to: 'rejected' },
    redeclare: { from: ['rejected'], to: 'declared' },
  },
  ['approved'],
)

// ---------------------------------------------------------------- Document version
export type DocumentAction = 'check' | 'accept' | 'reject'

export const documentMachine = createMachine<DocumentCheckStatus, DocumentAction>(
  'document_version',
  {
    check: { from: ['uploaded'], to: 'checked' },
    accept: { from: ['uploaded', 'checked'], to: 'accepted' },
    reject: { from: ['uploaded', 'checked', 'accepted'], to: 'rejected' },
  },
  [],
)

// ---------------------------------------------------------------- Ledger records
export type RecordAction = 'submit' | 'reopen' | 'start_verification' | 'verify' | 'supersede' | 'withdraw'

export const recordMachine = createMachine<RecordStatus, RecordAction>(
  'record',
  {
    submit: { from: ['draft'], to: 'submitted' },
    reopen: { from: ['submitted'], to: 'draft' },
    start_verification: { from: ['submitted'], to: 'under_verification' },
    verify: { from: ['under_verification', 'submitted'], to: 'verified' },
    supersede: { from: ['verified'], to: 'superseded' },
    withdraw: { from: ['draft', 'submitted', 'under_verification'], to: 'withdrawn' },
  },
  ['superseded', 'withdrawn'],
)
