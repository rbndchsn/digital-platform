/**
 * Authorisation policy (PRD §11.2): `can(ctx, action, resource)`.
 * Resolution order: platform role → org role → service role → COI gate → separation of duties → resource state.
 * Identical in Phase II; only the AuthContext construction changes.
 */
import type { OrgRole, OrgType, PlatformRole, ServiceRole } from './enums'

export interface AuthContext {
  userId: string
  orgId: string
  orgType: OrgType
  orgRole: OrgRole | null
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
  | 'step.transition'
  | 'step.request_document'
  | 'approval.decide:technical_scope'
  | 'approval.decide:impartiality'
  | 'approval.decide:contract'
  | 'approval.decide:audit_plan'
  | 'approval.decide:agreement_acceptance'
  | 'team.nominate'
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
  | 'feature.interest'

export interface Resource {
  /** Owning client org of the resource. */
  orgId?: string
  serviceId?: string
  /** Team leader of the service (for separation of duties). */
  teamLeaderUserId?: string | null
  /** Manager who approved the iteration (for separation of duties on issue). */
  approvingManagerUserId?: string | null
  /** Resource state flags. */
  locked?: boolean
}

export interface Decision {
  allowed: boolean
  reason?: string
}

const CLIENT_READ: Action[] = ['org.read', 'project.read', 'service.read', 'document.read', 'record.read', 'invoice.read', 'feature.interest']
const CLIENT_CONTRIBUTE: Action[] = [...CLIENT_READ, 'document.upload:client', 'finding.respond', 'record.create', 'record.submit']
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

const VERIFIER_COMMON: Action[] = ['org.read', 'service.read', 'project.read', 'document.read', 'record.read', 'invoice.read', 'coi.declare']

/** Actions granted by the verifier's org-level role regardless of service team membership. */
const VERIFIER_ORG_ACTIONS: Record<string, Action[]> = {
  verifier_manager: [
    ...VERIFIER_COMMON,
    'staff.triage_queue',
    'service.triage',
    'service.hold',
    'service.cancel',
    'service.close',
    'approval.decide:technical_scope',
    'approval.decide:impartiality',
    'approval.decide:contract',
    'team.nominate',
    'coi.decide',
    'step.transition',
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
    'staff.clients',
    'org.manage_members',
    'org.manage_flags',
  ],
  verifier_coordinator: [...VERIFIER_COMMON, 'staff.triage_queue', 'document.upload:verifier', 'invoice.manage', 'service.close'],
  verifier_finance: [...VERIFIER_COMMON, 'invoice.manage'],
  verifier_team_leader: VERIFIER_COMMON,
  verifier_auditor: VERIFIER_COMMON,
  verifier_technical_expert: VERIFIER_COMMON,
  verifier_independent_reviewer: VERIFIER_COMMON,
}

/** Actions granted by a role held on the specific service. */
const SERVICE_ROLE_ACTIONS: Record<ServiceRole, Action[]> = {
  verifier_manager: VERIFIER_ORG_ACTIONS.verifier_manager,
  verifier_team_leader: [
    ...VERIFIER_COMMON,
    'step.transition',
    'step.request_document',
    'document.upload:verifier',
    'document.check',
    'document.delete',
    'finding.create',
    'finding.transition',
    'iteration.create',
    'iteration.submit_for_ir',
    'record.verify',
  ],
  verifier_auditor: [...VERIFIER_COMMON, 'step.transition', 'document.upload:verifier', 'document.check', 'finding.create', 'finding.transition', 'record.verify'],
  verifier_technical_expert: [...VERIFIER_COMMON, 'step.transition', 'document.check', 'finding.create', 'finding.transition', 'record.verify'],
  verifier_independent_reviewer: [...VERIFIER_COMMON, 'iteration.ir_decide'],
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
  'step.transition',
  'step.request_document',
  'approval.decide:technical_scope',
  'approval.decide:impartiality',
  'approval.decide:contract',
  'approval.decide:audit_plan',
  'approval.decide:agreement_acceptance',
  'team.nominate',
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
])

const ORG_WIDE_VERIFIER_ROLES = new Set<string>(['verifier_manager', 'verifier_coordinator', 'verifier_finance'])

export function decide(ctx: AuthContext, action: Action, resource: Resource = {}): Decision {
  // Platform admin: tenant administration only.
  if (ctx.platformRole === 'platform_admin') {
    return { allowed: action === 'org.manage_flags' || action === 'staff.clients' || action === 'org.read', reason: 'platform admin scope' }
  }

  if (ctx.orgType === 'client') {
    const allowedActions = ctx.orgRole ? (CLIENT_ROLE_ACTIONS[ctx.orgRole] ?? []) : []
    if (!allowedActions.includes(action)) return { allowed: false, reason: `role ${ctx.orgRole ?? 'none'} cannot ${action}` }
    if (resource.orgId && resource.orgId !== ctx.orgId) return { allowed: false, reason: 'resource belongs to another organisation' }
    if (resource.locked && (action.startsWith('document.upload') || action === 'document.delete')) {
      return { allowed: false, reason: 'document is locked by an issued opinion' }
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
      return { allowed: false, reason: 'conflict of interest declaration pending' }
    }
    return { allowed: true }
  }

  const orgWide = ctx.orgRole ? ORG_WIDE_VERIFIER_ROLES.has(ctx.orgRole) : false
  if (SERVICE_SCOPED.has(action) && !serviceId) {
    return { allowed: false, reason: 'service-scoped action without a service' }
  }
  const allowed = SERVICE_SCOPED.has(action)
    ? serviceActions.includes(action) || (orgWide && orgActions.includes(action))
    : orgActions.includes(action) || serviceActions.includes(action)
  if (!allowed) return { allowed: false, reason: `no role grants ${action}` }

  // Separation of duties (PRD FR-17, §11.2).
  if (action === 'iteration.ir_decide') {
    const others = myServiceRoles.filter((r) => r !== 'verifier_independent_reviewer')
    if (others.length > 0) return { allowed: false, reason: 'independent reviewer holds another role on this service' }
  }
  if ((action === 'iteration.manager_decide' || action === 'iteration.issue') && resource.teamLeaderUserId === ctx.userId) {
    return { allowed: false, reason: 'the team leader cannot approve or issue their own opinion' }
  }
  if (resource.locked && (action.startsWith('document.upload') || action === 'document.delete')) {
    return { allowed: false, reason: 'document is locked by an issued opinion' }
  }
  return { allowed: true }
}

export function can(ctx: AuthContext, action: Action, resource: Resource = {}): boolean {
  return decide(ctx, action, resource).allowed
}

export class ForbiddenError extends Error {
  constructor(
    readonly action: Action,
    readonly reason: string | undefined,
  ) {
    super(`Forbidden: ${action}${reason ? ` (${reason})` : ''}`)
    this.name = 'ForbiddenError'
  }
}

export function assertCan(ctx: AuthContext, action: Action, resource: Resource = {}): void {
  const d = decide(ctx, action, resource)
  if (!d.allowed) throw new ForbiddenError(action, d.reason)
}
