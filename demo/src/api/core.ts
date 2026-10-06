/**
 * Shared plumbing for the mock api layer: auth context, latency, audit, notifications, ids, errors.
 * Pages import `@/api/*` only. In Phase II every function here is replaced by `fetch` calls.
 */
import type { NotificationType, OrgRole, ServiceRole } from '@/domain/enums'
import type { AuthContext } from '@/domain/policy'
import { ForbiddenError, assertCan, type Action, type Resource } from '@/domain/policy'
import type { AuditColumns, AuditEvent, Notification, User } from '@/domain/schemas'
import { TransitionError } from '@/domain/workflow/machines'
import { UnitError } from '@/domain/units'
import { nowIso } from '@/mock/clock'
import { buildSeed } from '@/mock/fixtures'
import { runtimeId } from '@/mock/ids'
import { MockNetworkError, simulateLatency } from '@/mock/latency'
import { NotFoundError, configureStore, getStore, type Store } from '@/mock/store'

configureStore(buildSeed)

export { getStore }
export type { Store }

export type ApiErrorCode = 'unauthenticated' | 'forbidden' | 'not_found' | 'conflict' | 'validation' | 'network'

export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function toApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e
  if (e instanceof ForbiddenError) return new ApiError('forbidden', e.reason ? `You cannot do that: ${e.reason}.` : 'You do not have permission for this action.')
  if (e instanceof NotFoundError) return new ApiError('not_found', `${e.table} ${e.id} was not found.`)
  if (e instanceof TransitionError) return new ApiError('conflict', `This action is not available in the current state (${e.from}).`)
  if (e instanceof UnitError) return new ApiError('validation', e.message, { code: e.code })
  if (e instanceof MockNetworkError) return new ApiError('network', 'The request could not reach the server. Try again.')
  if (e instanceof Error) return new ApiError('validation', e.message)
  return new ApiError('validation', 'Unexpected error')
}

/** Wrap a synchronous store operation as an async api call with simulated latency and error mapping. */
export async function call<T>(fn: () => T): Promise<T> {
  try {
    await simulateLatency()
    return fn()
  } catch (e) {
    throw toApiError(e)
  }
}

// ---------------------------------------------------------------- auth context
export function currentUser(): User | null {
  const s = getStore()
  const { userId } = s.getSession()
  return userId ? (s.find('users', userId) ?? null) : null
}

export function authContext(): AuthContext {
  const s = getStore()
  const { userId, orgId } = s.getSession()
  if (!userId || !orgId) throw new ApiError('unauthenticated', 'Sign in to continue.')
  const org = s.get('organisations', orgId)
  const membership = s.where('memberships', (m) => m.user_id === userId && m.org_id === orgId && m.status === 'active')[0]
  const user = s.get('users', userId)
  const serviceRoles: Record<string, ServiceRole[]> = {}
  const coiApproved: Record<string, boolean> = {}
  for (const m of s.where('team', (t) => t.user_id === userId && t.status !== 'removed')) {
    ;(serviceRoles[m.service_id] ??= []).push(m.service_role)
    const coi = s.where('cois', (c) => c.service_team_id === m.id)[0]
    const ok = m.service_role === 'client_contact' ? true : coi?.status === 'approved'
    coiApproved[m.service_id] = (coiApproved[m.service_id] ?? true) && ok
  }
  const orgRole = (membership?.role as OrgRole | undefined) ?? null
  if (user.status !== 'active') throw new ApiError('unauthenticated', 'This account is deactivated.')
  return {
    userId,
    orgId,
    orgType: org.type,
    orgRole,
    // ADMIN is the org-level role `platform_admin` on the verifier org (plan_v1 §8 D1).
    platformRole: orgRole === 'platform_admin' && org.type === 'verifier' ? 'platform_admin' : null,
    serviceRoles,
    coiApproved,
  }
}

export function authorize(action: Action, resource: Resource = {}): AuthContext {
  const ctx = authContext()
  assertCan(ctx, action, resource)
  return ctx
}

/** Resource descriptor for a service (org + team leader), used by policy checks. */
export function serviceResource(serviceId: string): Resource {
  const svc = getStore().get('services', serviceId)
  return { orgId: svc.org_id, serviceId: svc.id, teamLeaderUserId: svc.team_leader_user_id }
}

// ---------------------------------------------------------------- rows
export function newId(prefix: string): string {
  return runtimeId(prefix)
}

export function auditNow(actorId: string | null): AuditColumns {
  const at = nowIso()
  return { created_at: at, created_by: actorId, updated_at: at, updated_by: actorId, version: 0, deleted_at: null }
}

export function userName(id: string | null | undefined): string {
  if (!id) return '—'
  return getStore().find('users', id)?.name ?? 'Unknown user'
}

export function orgName(id: string | null | undefined): string {
  if (!id) return '—'
  return getStore().find('organisations', id)?.name ?? 'Unknown organisation'
}

// ---------------------------------------------------------------- audit and notifications
export interface AuditInput {
  orgId: string
  serviceId: string | null
  eventType: string
  entityType: string
  entityId: string
  summary: string
  /** Mandatory for overrides and ADMIN actions that take one (PRD §6.13/6.14). */
  reason?: string | null
  before?: unknown
  after?: unknown
}

export function audit(ctx: AuthContext | null, input: AuditInput): AuditEvent {
  const row: AuditEvent = {
    id: newId('evt'),
    org_id: input.orgId,
    service_id: input.serviceId,
    actor_user_id: ctx?.userId ?? null,
    actor_api_client_id: null,
    actor_type: ctx ? 'user' : 'system',
    event_type: input.eventType,
    entity_type: input.entityType,
    entity_id: input.entityId,
    summary: input.summary,
    reason: input.reason ?? null,
    before_json: input.before ?? null,
    after_json: input.after ?? null,
    ip: '192.0.2.10',
    user_agent: 'demo',
    occurred_at: nowIso(),
  }
  getStore().insert('auditEvents', row)
  return row
}

export function notify(userIds: string[], orgId: string, type: NotificationType, title: string, body: string, serviceId: string | null, entity?: { type: string; id: string }): void {
  const s = getStore()
  for (const userId of new Set(userIds.filter(Boolean))) {
    const row: Notification = {
      id: newId('ntf'),
      org_id: orgId,
      user_id: userId,
      type,
      title,
      body,
      entity_type: entity?.type ?? (serviceId ? 'service' : null),
      entity_id: entity?.id ?? serviceId,
      service_id: serviceId,
      read_at: null,
      emailed_at: nowIso(),
      created_at: nowIso(),
    }
    s.insert('notifications', row)
  }
}

/** Users who should hear about a service event: client contact + client admins, and the verifier team. */
export function serviceAudience(serviceId: string, party: 'client' | 'verifier' | 'both'): string[] {
  const s = getStore()
  const svc = s.get('services', serviceId)
  const client = [
    svc.client_contact_user_id,
    ...s.where('memberships', (m) => m.org_id === svc.org_id && (m.role === 'client_admin' || m.role === 'client_owner')).map((m) => m.user_id),
  ].filter(Boolean) as string[]
  const team = s.where('team', (t) => t.service_id === serviceId && t.status !== 'removed' && t.service_role !== 'client_contact').map((t) => t.user_id)
  const managers = s.where('memberships', (m) => m.org_id === svc.verifier_org_id && m.role === 'verifier_manager').map((m) => m.user_id)
  const verifier = [...team, ...managers]
  return party === 'client' ? client : party === 'verifier' ? verifier : [...client, ...verifier]
}

export function nowIsoString(): string {
  return nowIso()
}
