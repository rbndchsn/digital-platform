/**
 * Authorisation policy (PRD §11.2): `can(ctx, action, resource)`.
 * Resolution order: platform role (ADMIN allow-list) → org role → service role → COI gate → involved set →
 * other separation-of-duties rules → resource state. Identical in Phase II; only the AuthContext construction changes.
 */
import type { OrgRole, OrgType, PlatformRole, ServiceRole } from './enums'
import type { InvolvedMember } from './workflow/involved-set'
import { DECISION_ACTIONS } from './workflow/involved-set'

export interface AuthContext {
  userId: string
  orgId: string
  orgType: OrgType
  orgRole: OrgRole | null
  /** `platform_admin` when the active membership is the ADMIN role on the verifier org (plan_v1 §8 D1). */
  platformRole: PlatformRole | null
  /** serviceId → roles this user holds on that service. */
  serviceRoles: Record<string, ServiceRole[]>
  /** serviceId → true when every COI declaration of this user on the service is approved. */
  coiApproved: Record<string, boolean>
}

export type Action =
  | 'org.read'
  | 'org.manage_members'
  | 'org.manage_api_keys'
  | 'org.manage_flags'
  | 'project.create'
  | 'project.read'
  | 'project.update'
  | 'service.create'
  | 'service.read'
  | 'service.update_draft'
  | 'service.submit'
  | 'service.renew'
  | 'service.triage'
  | 'service.hold'
  | 'service.cancel'
  | 'service.close'
  | 'service.override'
  | 'step.transition'
  | 'step.override'
  | 'step.plan_dates'
  | 'step.request_document'
  | 'approval.decide:technical_scope'
  | 'approval.decide:impartiality'
  | 'approval.decide:contract'
  | 'approval.decide:audit_plan'
  | 'approval.decide:agreement_acceptance'
  | 'team.nominate'
  | 'team.reassign'
  | 'team.check_override'
  | 'coi.declare'
  | 'coi.decide'
  | 'document.read'
  | 'document.upload:client'
  | 'document.upload:verifier'
  | 'document.check'
  | 'document.delete'
  | 'finding.create'
  | 'finding.respond'
  | 'finding.transition'
  | 'iteration.create'
  | 'iteration.submit_for_ir'
  | 'iteration.ir_decide'
  | 'iteration.manager_decide'
  | 'iteration.issue'
  | 'record.create'
  | 'record.read'
  | 'record.submit'
  | 'record.verify'
  | 'invoice.read'
  | 'invoice.manage'
  | 'staff.triage_queue'
  | 'staff.templates'
  | 'staff.clients'
  | 'template.edit'
  | 'feature.interest'
  | 'admin.users'
  | 'admin.orgs'
  | 'admin.settings'
  | 'admin.audit'
  | 'admin.coi_register'
  | 'admin.stats'
  | 'admin.break_glass'
  // PRD v0.3
  | 'materiality.set'
  | 'materiality.approve'
  | 'misstatement.manage'
  | 'materiality.acknowledge'
  | 'statement.post_issuance_open'
  | 'statement.revise_decide'
  | 'statement.withdraw_decide'
  | 'case.create'
  | 'case.read_own'
  | 'case.read_all'
  | 'case.handle'
  | 'case.assign'
  | 'case.decide'
  | 'competence.read'
  | 'competence.edit'
  | 'legacy.manage'

export interface Resource {
  /** Owning client org of the resource. */
  orgId?: string
  serviceId?: string
  /** Team leader of the service (informational; the involved set is authoritative since PRD v0.3). */
  teamLeaderUserId?: string | null
  /** Manager who approved the iteration (informational). */
  approvingManagerUserId?: string | null
  /** PRD v0.3 FR-79: the viewer's entry in the involved set of the service or decision, when they are in it. */
  involved?: InvolvedMember | null
  /** PRD v0.3 FR-94: true when the competence profile being edited is the viewer's own. */
  ownProfile?: boolean
  /** Resource state flags. */
  locked?: boolean
}

export type DecisionCode = 'decision_maker_conflict' | 'own_profile' | 'admin_read_only' | 'coi_pending' | 'forbidden'

export interface Decision {
  allowed: boolean
  reason?: string
  code?: DecisionCode
}

const CLIENT_READ: Action[] = ['org.read', 'project.read', 'service.read', 'document.read', 'record.read', 'invoice.read', 'feature.interest', 'case.read_own']
const CLIENT_CONTRIBUTE: Action[] = [...CLIENT_READ, 'document.upload:client', 'finding.respond', 'record.create', 'record.submit', 'case.create']
const CLIENT_ADMIN: Action[] = [
  ...CLIENT_CONTRIBUTE,
  'project.create',
  'project.update',
  'service.create',
  'service.update_draft',
  'service.submit',
  'service.renew',
  'approval.decide:agreement_acceptance',
  'approval.decide:audit_plan',
  'org.manage_members',
  'org.manage_api_keys',
]

const CLIENT_ROLE_ACTIONS: Record<string, Action[]> = {
  client_owner: CLIENT_ADMIN,
  client_admin: CLIENT_ADMIN,
  client_contributor: CLIENT_CONTRIBUTE,
  client_viewer: CLIENT_READ,
}

const VERIFIER_COMMON: Action[] = ['org.read', 'service.read', 'project.read', 'document.read', 'record.read', 'invoice.read', 'coi.declare', 'case.handle']

/**
 * ADMIN (platform administrator, PRD §3.2 v0.2): sees everything, administers users, organisations and
 * settings, and never touches engagement or record data. This is the complete allow-list (plan_v1 §8 D2).
 * PRD v0.3: reads the complaints register (incl. notes) and competence profiles, changes neither.
 */
export const ADMIN_ACTIONS: readonly Action[] = [
  'org.read',
  'project.read',
  'service.read',
  'document.read',
  'record.read',
  'invoice.read',
  'staff.clients',
  'staff.templates',
  'org.manage_flags',
  'feature.interest',
  'case.read_all',
  'competence.read',
  'admin.users',
  'admin.orgs',
  'admin.settings',
  'admin.audit',
  'admin.coi_register',
  'admin.stats',
  'admin.break_glass',
]

/** Actions granted by the verifier's org-level role regardless of service team membership. */
const VERIFIER_ORG_ACTIONS: Record<string, Action[]> = {
  verifier_manager: [
    ...VERIFIER_COMMON,
    'staff.triage_queue',
    'service.triage',
    'service.hold',
    'service.cancel',
    'service.close',
    'service.override',
    'approval.decide:technical_scope',
    'approval.decide:impartiality',
    'approval.decide:contract',
    'team.nominate',
    'team.reassign',
    'team.check_override',
    'coi.decide',
    'step.transition',
    'step.override',
    'step.plan_dates',
    'step.request_document',
    'document.upload:verifier',
    'document.check',
    'document.delete',
    'finding.create',
    'finding.transition',
    'iteration.manager_decide',
    'iteration.issue',
    'record.verify',
    'invoice.manage',
    'staff.templates',
    'template.edit',
    'staff.clients',
    'org.manage_members',
    'org.manage_flags',
    // PRD v0.3
    'materiality.set',
    'materiality.approve',
    'misstatement.manage',
    'materiality.acknowledge',
    'statement.post_issuance_open',
    'statement.revise_decide',
    'statement.withdraw_decide',
    'case.read_all',
    'case.assign',
    'case.decide',
    'competence.read',
    'competence.edit',
    'legacy.manage',
  ],
  verifier_coordinator: [...VERIFIER_COMMON, 'staff.triage_queue', 'document.upload:verifier', 'invoice.manage', 'service.close', 'case.read_all', 'competence.read'],
  verifier_finance: [...VERIFIER_COMMON, 'invoice.manage'],
  verifier_team_leader: [...VERIFIER_COMMON, 'competence.read'],
  verifier_auditor: VERIFIER_COMMON,
  verifier_technical_expert: VERIFIER_COMMON,
  verifier_independent_reviewer: VERIFIER_COMMON,
  // ADMIN is resolved before org roles; listed here only so the table is total.
  platform_admin: [],
}

/** Actions granted by a role held on the specific service. */
const SERVICE_ROLE_ACTIONS: Record<ServiceRole, Action[]> = {
  verifier_manager: VERIFIER_ORG_ACTIONS.verifier_manager,
  verifier_team_leader: [
    ...VERIFIER_COMMON,
    'step.transition',
    'step.plan_dates',
    'step.request_document',
    'document.upload:verifier',
    'document.check',
    'document.delete',
    'finding.create',
    'finding.transition',
    'iteration.create',
    'iteration.submit_for_ir',
    'record.verify',
    'materiality.set',
    'misstatement.manage',
  ],
  verifier_auditor: [...VERIFIER_COMMON, 'step.transition', 'document.upload:verifier', 'document.check', 'finding.create', 'finding.transition', 'record.verify', 'misstatement.manage'],
  verifier_technical_expert: [...VERIFIER_COMMON, 'step.transition', 'document.check', 'finding.create', 'finding.transition', 'record.verify', 'misstatement.manage'],
  verifier_independent_reviewer: [...VERIFIER_COMMON, 'iteration.ir_decide', 'materiality.acknowledge'],
  verifier_coordinator: [...VERIFIER_COMMON, 'document.upload:verifier', 'invoice.manage'],
  verifier_finance: [...VERIFIER_COMMON, 'invoice.manage'],
  client_contact: CLIENT_ADMIN,
}

/** Service-scoped actions: these require team membership (or a manager/coordinator/finance org role). */
const SERVICE_SCOPED = new Set<Action>([
  'service.read',
  'service.hold',
  'service.cancel',
  'service.close',
  'service.override',
  'step.transition',
  'step.override',
  'step.plan_dates',
  'step.request_document',
  'approval.decide:technical_scope',
  'approval.decide:impartiality',
  'approval.decide:contract',
  'approval.decide:audit_plan',
  'approval.decide:agreement_acceptance',
  'team.nominate',
  'team.reassign',
  'team.check_override',
  'coi.declare',
  'coi.decide',
  'document.read',
  'document.upload:client',
  'document.upload:verifier',
  'document.check',
  'document.delete',
  'finding.create',
  'finding.respond',
  'finding.transition',
  'iteration.create',
  'iteration.submit_for_ir',
  'iteration.ir_decide',
  'iteration.manager_decide',
  'iteration.issue',
  'record.verify',
  'invoice.read',
  'invoice.manage',
  'materiality.set',
  'materiality.approve',
  'misstatement.manage',
  'materiality.acknowledge',
  'statement.post_issuance_open',
  'statement.revise_decide',
  'statement.withdraw_decide',
])

/** Actions refused to anyone in the involved set (PRD v0.3 FR-79, FR-92). */
const INVOLVED_SET_REFUSED = new Set<Action>([...(DECISION_ACTIONS as Action[]), 'case.handle', 'case.assign', 'case.decide'])

const ORG_WIDE_VERIFIER_ROLES = new Set<string>(['verifier_manager', 'verifier_coordinator', 'verifier_finance'])

export function decide(ctx: AuthContext, action: Action, resource: Resource = {}): Decision {
  // ADMIN: platform administration and global read; every engagement or record mutation is denied here,
  // before any org or service rule can grant it (PRD §3.2, §11.2).
  if (ctx.platformRole === 'platform_admin' || ctx.orgRole === 'platform_admin') {
    if (ADMIN_ACTIONS.includes(action)) return { allowed: true }
    return { allowed: false, code: 'admin_read_only', reason: 'the platform administrator cannot change engagement or record data' }
  }
  if (action.startsWith('admin.')) return { allowed: false, code: 'forbidden', reason: 'platform administration is reserved to the platform administrator' }

  if (ctx.orgType === 'client') {
    const allowedActions = ctx.orgRole ? (CLIENT_ROLE_ACTIONS[ctx.orgRole] ?? []) : []
    if (!allowedActions.includes(action)) return { allowed: false, code: 'forbidden', reason: `role ${ctx.orgRole ?? 'none'} cannot ${action}` }
    if (resource.orgId && resource.orgId !== ctx.orgId) return { allowed: false, code: 'forbidden', reason: 'resource belongs to another organisation' }
    if (resource.locked && (action.startsWith('document.upload') || action === 'document.delete')) {
      return { allowed: false, code: 'forbidden', reason: 'document is locked by an issued opinion' }
    }
    return { allowed: true }
  }

  // Verifier org
  const orgActions = ctx.orgRole ? (VERIFIER_ORG_ACTIONS[ctx.orgRole] ?? []) : []
  const serviceId = resource.serviceId
  const myServiceRoles = serviceId ? (ctx.serviceRoles[serviceId] ?? []) : []
  const serviceActions = myServiceRoles.flatMap((r) => SERVICE_ROLE_ACTIONS[r] ?? [])

  // COI gate: a team member whose COI is not approved may only declare it.
  if (serviceId && myServiceRoles.length > 0 && ctx.coiApproved[serviceId] !== true) {
    if (action !== 'coi.declare') {
      return { allowed: false, code: 'coi_pending', reason: 'conflict of interest declaration pending' }
    }
    return { allowed: true }
  }

  const orgWide = ctx.orgRole ? ORG_WIDE_VERIFIER_ROLES.has(ctx.orgRole) : false
  if (SERVICE_SCOPED.has(action) && !serviceId) {
    return { allowed: false, code: 'forbidden', reason: 'service-scoped action without a service' }
  }
  const allowed = SERVICE_SCOPED.has(action)
    ? serviceActions.includes(action) || (orgWide && orgActions.includes(action))
    : orgActions.includes(action) || serviceActions.includes(action)
  if (!allowed) return { allowed: false, code: 'forbidden', reason: `no role grants ${action}` }

  // Involved set (PRD v0.3 FR-79, FR-92): whoever did verification work cannot decide, and cannot handle a
  // complaint or appeal about the service. Org role is ignored here: a manager who edited a figure is refused too.
  if (INVOLVED_SET_REFUSED.has(action) && resource.involved) {
    return { allowed: false, code: 'decision_maker_conflict', reason: `you are in the involved set of this service (${resource.involved.reasons.join('; ')})` }
  }

  // Other separation-of-duties rules (PRD FR-17, FR-94, §11.2).
  if (action === 'iteration.ir_decide') {
    const others = myServiceRoles.filter((r) => r !== 'verifier_independent_reviewer')
    if (others.length > 0) return { allowed: false, code: 'forbidden', reason: 'independent reviewer holds another role on this service' }
  }
  if (action === 'competence.edit' && resource.ownProfile) {
    return { allowed: false, code: 'own_profile', reason: 'you cannot edit your own competence profile; another manager maintains it' }
  }
  if (resource.locked && (action.startsWith('document.upload') || action === 'document.delete')) {
    return { allowed: false, code: 'forbidden', reason: 'document is locked by an issued opinion' }
  }
  return { allowed: true }
}

export function can(ctx: AuthContext, action: Action, resource: Resource = {}): boolean {
  return decide(ctx, action, resource).allowed
}

/** True when the context is the platform administrator (read-only on engagement data). */
export function isPlatformAdmin(ctx: Pick<AuthContext, 'platformRole' | 'orgRole'>): boolean {
  return ctx.platformRole === 'platform_admin' || ctx.orgRole === 'platform_admin'
}

export class ForbiddenError extends Error {
  constructor(
    readonly action: Action,
    readonly reason: string | undefined,
    readonly code: DecisionCode = 'forbidden',
  ) {
    super(`Forbidden: ${action}${reason ? ` (${reason})` : ''}`)
    this.name = 'ForbiddenError'
  }
}

export function assertCan(ctx: AuthContext, action: Action, resource: Resource = {}): void {
  const d = decide(ctx, action, resource)
  if (!d.allowed) throw new ForbiddenError(action, d.reason, d.code)
}
