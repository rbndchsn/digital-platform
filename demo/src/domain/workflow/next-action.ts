/**
 * Computes the single "next action" of a service (PRD G2, §8.5). Derived from state, never stored.
 */
import type { Party, ServiceRole } from '../enums'
import type {
  Approval,
  CoiDeclaration,
  DocumentSlot,
  Finding,
  OpinionIteration,
  Phase,
  Service,
  ServiceTeamMember,
  Step,
} from '../schemas'

export interface ServiceSnapshot {
  service: Service
  phases: Phase[]
  steps: Step[]
  slots: DocumentSlot[]
  approvals: Approval[]
  team: (ServiceTeamMember & { coi: CoiDeclaration | null })[]
  findings: Finding[]
  iterations: OpinionIteration[]
}

export interface NextAction {
  party: Party
  /** Role expected to act; `actor_user_id` narrows it to one person when known. */
  role: ServiceRole | 'client_admin'
  actor_user_id: string | null
  action: NextActionKey
  label: string
  entity_type: 'service' | 'step' | 'slot' | 'approval' | 'coi' | 'finding' | 'iteration' | null
  entity_id: string | null
  step_id: string | null
  due: string | null
  /** True when the action blocks progress for the other party too. */
  blocking: boolean
}

export type NextActionKey =
  | 'complete_request'
  | 'triage'
  | 'resume'
  | 'close'
  | 'upload_document'
  | 'review_documents'
  | 'decide_approval'
  | 'nominate_team'
  | 'declare_coi'
  | 'decide_coi'
  | 'accept_agreement'
  | 'accept_audit_plan'
  | 'respond_finding'
  | 'review_finding'
  | 'create_iteration'
  | 'submit_for_ir'
  | 'ir_decide'
  | 'manager_decide'
  | 'issue'
  | 'work_step'
  | 'complete_step'

const done = (s: Step['status']) => s === 'completed' || s === 'skipped'

function currentStep(snap: ServiceSnapshot): Step | null {
  const phaseOrder = new Map(snap.phases.map((p) => [p.id, p.order_no]))
  const ordered = [...snap.steps].sort(
    (a, b) => (phaseOrder.get(a.phase_id) ?? 0) - (phaseOrder.get(b.phase_id) ?? 0) || a.order_no - b.order_no,
  )
  return ordered.find((s) => !done(s.status)) ?? null
}

function act(partial: Omit<NextAction, 'actor_user_id' | 'entity_type' | 'entity_id' | 'step_id' | 'due' | 'blocking'> & Partial<NextAction>): NextAction {
  return {
    actor_user_id: null,
    entity_type: null,
    entity_id: null,
    step_id: null,
    due: null,
    blocking: true,
    ...partial,
  }
}

export function computeNextAction(snap: ServiceSnapshot): NextAction | null {
  const { service } = snap
  switch (service.status) {
    case 'closed':
    case 'cancelled':
      return null
    case 'draft':
      return act({ party: 'client', role: 'client_admin', action: 'complete_request', label: 'Complete and submit the request', entity_type: 'service', entity_id: service.id })
    case 'requested':
    case 'triage':
      return act({ party: 'verifier', role: 'verifier_manager', action: 'triage', label: 'Triage the request', entity_type: 'service', entity_id: service.id })
    case 'on_hold':
      return act({
        party: 'verifier',
        role: 'verifier_manager',
        action: 'resume',
        label: `Resume the service (on hold: ${service.on_hold_reason ?? 'no reason given'})`,
        entity_type: 'service',
        entity_id: service.id,
      })
    case 'issued':
      return act({ party: 'verifier', role: 'verifier_coordinator', action: 'close', label: 'Close the service', entity_type: 'service', entity_id: service.id, blocking: false })
    case 'in_revision': {
      // PRD v0.3 FR-89: the revision runs the opinion chain again on a fresh iteration.
      const latest = [...snap.iterations].sort((a, b) => b.iteration_no - a.iteration_no)[0]
      const opinionStep = snap.steps.find((s) => s.key === 'final_opinion') ?? null
      if (!latest || latest.status === 'issued' || latest.status === 'changes_requested') {
        return act({ party: 'verifier', role: 'verifier_team_leader', action: 'create_iteration', label: `Prepare the revision (iteration ${(latest?.iteration_no ?? 0) + 1})`, entity_type: 'step', entity_id: opinionStep?.id ?? service.id, step_id: opinionStep?.id ?? null })
      }
      break
    }
    default:
      break
  }

  const step = currentStep(snap)
  if (!step) {
    return act({ party: 'verifier', role: 'verifier_manager', action: 'complete_step', label: 'All steps complete — close out', entity_type: 'service', entity_id: service.id, blocking: false })
  }
  const stepSlots = snap.slots.filter((s) => s.step_id === step.id)
  const stepApprovals = snap.approvals.filter((a) => a.step_id === step.id)
  const due = step.planned_end

  // Required uploads by the client always come first.
  const missingClient = stepSlots.find((s) => s.required && s.uploader_party === 'client' && (s.status === 'empty' || s.status === 'rejected'))
  if (missingClient) {
    return act({
      party: 'client',
      role: 'client_admin',
      action: 'upload_document',
      label: `${missingClient.status === 'rejected' ? 'Re-upload' : 'Upload'} ${missingClient.name}`,
      entity_type: 'slot',
      entity_id: missingClient.id,
      step_id: step.id,
      due,
    })
  }
  const missingVerifier = stepSlots.find((s) => s.required && s.uploader_party === 'verifier' && (s.status === 'empty' || s.status === 'rejected'))

  switch (step.key) {
    case 'pre_engagement': {
      return act({ party: 'verifier', role: 'verifier_manager', action: 'review_documents', label: 'Review the pre-engagement form', entity_type: 'step', entity_id: step.id, step_id: step.id, due })
    }
    case 'desk_review_cpf': {
      const pending = stepApprovals.find((a) => a.status === 'pending')
      if (pending) {
        return act({ party: 'verifier', role: 'verifier_manager', action: 'decide_approval', label: `Approve ${pending.label.toLowerCase()}`, entity_type: 'approval', entity_id: pending.id, step_id: step.id, due })
      }
      break
    }
    case 'team_nomination': {
      const members = snap.team.filter((m) => m.status !== 'removed' && m.service_role !== 'client_contact')
      if (members.length === 0) {
        return act({ party: 'verifier', role: 'verifier_manager', action: 'nominate_team', label: 'Nominate the engagement team', entity_type: 'step', entity_id: step.id, step_id: step.id, due })
      }
      const toDeclare = members.find((m) => !m.coi || m.coi.status === 'required' || m.coi.status === 'rejected')
      if (toDeclare) {
        return act({
          party: 'verifier',
          role: toDeclare.service_role,
          actor_user_id: toDeclare.user_id,
          action: 'declare_coi',
          label: 'Declare conflicts of interest',
          entity_type: 'coi',
          entity_id: toDeclare.coi?.id ?? toDeclare.id,
          step_id: step.id,
          due,
        })
      }
      const toDecide = members.find((m) => m.coi?.status === 'declared')
      if (toDecide) {
        return act({ party: 'verifier', role: 'verifier_manager', action: 'decide_coi', label: 'Approve conflict-of-interest declarations', entity_type: 'coi', entity_id: toDecide.coi!.id, step_id: step.id, due })
      }
      break
    }
    case 'contract_review': {
      if (missingVerifier) {
        return act({ party: 'verifier', role: 'verifier_coordinator', action: 'upload_document', label: `Upload ${missingVerifier.name}`, entity_type: 'slot', entity_id: missingVerifier.id, step_id: step.id, due })
      }
      const pending = stepApprovals.find((a) => a.status === 'pending')
      if (pending) {
        return act({ party: 'verifier', role: 'verifier_manager', action: 'decide_approval', label: 'Approve the contract', entity_type: 'approval', entity_id: pending.id, step_id: step.id, due })
      }
      break
    }
    case 'service_agreement': {
      if (missingVerifier) {
        return act({ party: 'verifier', role: 'verifier_coordinator', action: 'upload_document', label: `Upload ${missingVerifier.name}`, entity_type: 'slot', entity_id: missingVerifier.id, step_id: step.id, due })
      }
      const pending = stepApprovals.find((a) => a.kind === 'agreement_acceptance' && a.status === 'pending')
      if (pending) {
        return act({ party: 'client', role: 'client_admin', action: 'accept_agreement', label: 'Accept the service agreement', entity_type: 'approval', entity_id: pending.id, step_id: step.id, due })
      }
      break
    }
    case 'audit_plan': {
      if (missingVerifier) {
        return act({ party: 'verifier', role: 'verifier_team_leader', action: 'upload_document', label: 'Upload the audit plan', entity_type: 'slot', entity_id: missingVerifier.id, step_id: step.id, due })
      }
      const pending = stepApprovals.find((a) => a.kind === 'audit_plan' && a.status === 'pending')
      if (pending) {
        return act({ party: 'client', role: 'client_admin', action: 'accept_audit_plan', label: 'Accept the audit plan', entity_type: 'approval', entity_id: pending.id, step_id: step.id, due })
      }
      break
    }
    default:
      break
  }

  // Findings take priority inside execution.
  const openFinding = snap.findings.find((f) => f.status === 'open')
  if (openFinding) {
    return act({
      party: 'client',
      role: 'client_admin',
      actor_user_id: openFinding.assigned_user_id,
      action: 'respond_finding',
      label: `Respond to ${openFinding.type} #${openFinding.number}: ${openFinding.title}`,
      entity_type: 'finding',
      entity_id: openFinding.id,
      step_id: openFinding.step_id,
      due: openFinding.due_at,
    })
  }
  const respondedFinding = snap.findings.find((f) => f.status === 'responded' || f.status === 'under_review')
  if (respondedFinding) {
    return act({
      party: 'verifier',
      role: 'verifier_team_leader',
      action: 'review_finding',
      label: `Review the response to ${respondedFinding.type} #${respondedFinding.number}`,
      entity_type: 'finding',
      entity_id: respondedFinding.id,
      step_id: respondedFinding.step_id,
      due: respondedFinding.due_at,
      blocking: false,
    })
  }

  if (step.key === 'final_opinion' || service.status === 'in_revision') {
    const latest = [...snap.iterations].sort((a, b) => b.iteration_no - a.iteration_no)[0]
    const blockingOpen = snap.findings.some((f) => f.blocking && !['closed', 'withdrawn'].includes(f.status))
    if (!latest || latest.status === 'changes_requested') {
      return act({ party: 'verifier', role: 'verifier_team_leader', action: 'create_iteration', label: latest ? `Prepare iteration ${latest.iteration_no + 1}` : 'Prepare the opinion (iteration 1)', entity_type: 'step', entity_id: step.id, step_id: step.id, due })
    }
    switch (latest.status) {
      case 'draft':
        return act({ party: 'verifier', role: 'verifier_team_leader', action: 'submit_for_ir', label: `Submit iteration ${latest.iteration_no} for independent review`, entity_type: 'iteration', entity_id: latest.id, step_id: step.id, due })
      case 'independent_review':
        return act({ party: 'verifier', role: 'verifier_independent_reviewer', actor_user_id: latest.ir_user_id, action: 'ir_decide', label: `Independent review of iteration ${latest.iteration_no}`, entity_type: 'iteration', entity_id: latest.id, step_id: step.id, due })
      case 'manager_review':
        // PRD v0.3 FR-79: the decision belongs to a manager outside the involved set; the UI shows eligibility.
        return act({ party: 'verifier', role: 'verifier_manager', action: 'manager_decide', label: blockingOpen ? 'Blocking findings must close before approval' : `Manager decision on iteration ${latest.iteration_no} (outside the involved set)`, entity_type: 'iteration', entity_id: latest.id, step_id: step.id, due })
      case 'approved':
        return act({ party: 'verifier', role: 'verifier_manager', action: 'issue', label: 'Issue the opinion', entity_type: 'iteration', entity_id: latest.id, step_id: step.id, due })
      default:
        break
    }
  }

  if (missingVerifier) {
    return act({ party: 'verifier', role: step.owner_role, action: 'upload_document', label: `Upload ${missingVerifier.name}`, entity_type: 'slot', entity_id: missingVerifier.id, step_id: step.id, due })
  }

  const party: Party = step.owner_role === 'client_contact' ? 'client' : 'verifier'
  const role = step.owner_role === 'client_contact' ? 'client_admin' : step.owner_role
  if (step.status === 'in_progress' || step.status === 'blocked' || step.status === 'on_hold') {
    return act({ party, role, action: 'complete_step', label: `Complete ${step.name}`, entity_type: 'step', entity_id: step.id, step_id: step.id, due, blocking: false })
  }
  return act({ party, role, action: 'work_step', label: `Start ${step.name}`, entity_type: 'step', entity_id: step.id, step_id: step.id, due, blocking: false })
}

/** Whether a next action is addressed to the given viewer. */
export function isActionForViewer(
  action: NextAction | null,
  viewer: { party: Party; roles: string[]; userId: string },
): boolean {
  if (!action) return false
  if (action.party !== viewer.party) return false
  if (action.actor_user_id) return action.actor_user_id === viewer.userId
  if (viewer.party === 'client') return viewer.roles.some((r) => r === 'client_owner' || r === 'client_admin' || r === 'client_contributor' || r === 'client_contact')
  return viewer.roles.includes(action.role)
}
