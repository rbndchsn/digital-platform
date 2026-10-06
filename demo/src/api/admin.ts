/**
 * Administration console api (PRD §6.13, `/admin/*`): users, organisations, settings, announcements, global
 * audit and auth logs, COI register, statistics and money rollups, break-glass. Only the platform administrator
 * (`platform_admin`) passes `authorize('admin.*')`; every mutation writes an `admin.*` audit event with a reason
 * where one is taken. Users and organisations are never deleted (plan_v1 §8 D6).
 */
import type { AnnouncementAudience, AnnouncementTone, FlagState, OrgRole, ServiceType } from '@/domain/enums'
import { SERVICE_TYPE_LABELS } from '@/domain/enums'
import { isPlatformAdmin } from '@/domain/policy'
import type { Announcement, AuditEvent, Membership, Organisation, PlatformSettings, User } from '@/domain/schemas'
import { todayIso } from '@/mock/clock'
import { ApiError, audit, auditNow, authContext, authorize, call, getStore, newId, notify, nowIsoString, orgName, userName } from './core'
import { requireReason } from './steps'

const ACTIVE_SERVICE: readonly string[] = ['contracting', 'planning', 'execution', 'opinion_review', 'on_hold']

// ---------------------------------------------------------------- users
export interface AdminUserRow {
  id: string
  name: string
  email: string
  jobTitle: string
  orgId: string
  orgName: string
  orgType: 'verifier' | 'client'
  role: OrgRole
  membershipStatus: Membership['status']
  status: User['status']
  mfaEnabled: boolean
  lastSignInAt: string | null
  deactivatedAt: string | null
  deactivatedByName: string | null
  deactivationReason: string | null
  anonymisedAt: string | null
  /** Active team roles on active services + open findings assigned + COI pending. */
  openWork: number
}

function openWorkOf(userId: string): number {
  const s = getStore()
  const team = s.where('team', (t) => t.user_id === userId && t.status !== 'removed' && t.service_role !== 'client_contact').filter((t) => ACTIVE_SERVICE.includes(s.get('services', t.service_id).status))
  const findings = s.where('findings', (f) => f.assigned_user_id === userId && (f.status === 'open' || f.status === 'responded' || f.status === 'under_review'))
  const coi = team.filter((t) => s.where('cois', (c) => c.service_team_id === t.id)[0]?.status !== 'approved')
  return team.length + findings.length + coi.length
}

function userRow(u: User, m: Membership): AdminUserRow {
  const s = getStore()
  const org = s.get('organisations', m.org_id)
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    jobTitle: u.job_title ?? '',
    orgId: org.id,
    orgName: org.name,
    orgType: org.type,
    role: m.role,
    membershipStatus: m.status,
    status: u.status,
    mfaEnabled: u.mfa_enabled,
    lastSignInAt: u.last_sign_in_at,
    deactivatedAt: u.deactivated_at,
    deactivatedByName: u.deactivated_by ? userName(u.deactivated_by) : null,
    deactivationReason: u.deactivation_reason,
    anonymisedAt: u.anonymised_at,
    openWork: openWorkOf(u.id),
  }
}

export interface UserFilter {
  orgId?: string
  role?: OrgRole
  status?: 'active' | 'disabled' | 'invited'
  search?: string
}

export async function listUsers(filter: UserFilter = {}): Promise<AdminUserRow[]> {
  return call(() => {
    authorize('admin.users')
    const s = getStore()
    let rows = s.all('memberships').map((m) => userRow(s.get('users', m.user_id), m))
    if (filter.orgId) rows = rows.filter((r) => r.orgId === filter.orgId)
    if (filter.role) rows = rows.filter((r) => r.role === filter.role)
    if (filter.status === 'invited') rows = rows.filter((r) => r.membershipStatus === 'invited')
    else if (filter.status) rows = rows.filter((r) => r.status === filter.status)
    if (filter.search) {
      const q = filter.search.toLowerCase()
      rows = rows.filter((r) => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || r.orgName.toLowerCase().includes(q))
    }
    return rows.sort((a, b) => a.orgName.localeCompare(b.orgName) || a.name.localeCompare(b.name))
  })
}

export async function updateUser(userId: string, patch: { name?: string; email?: string; jobTitle?: string }): Promise<AdminUserRow> {
  return call(() => {
    const ctx = authorize('admin.users')
    const s = getStore()
    const u = s.get('users', userId)
    const next: Partial<User> = {}
    if (patch.name?.trim()) next.name = patch.name.trim()
    if (patch.email?.trim()) {
      const email = patch.email.trim().toLowerCase()
      if (s.where('users', (x) => x.id !== userId && x.email.toLowerCase() === email).length) throw new ApiError('validation', 'Another user already has that e-mail.')
      next.email = email
    }
    if (patch.jobTitle !== undefined) next.job_title = patch.jobTitle
    const updated = s.update('users', userId, next, ctx.userId)
    const m = s.where('memberships', (x) => x.user_id === userId)[0]
    audit(ctx, { orgId: m?.org_id ?? ctx.orgId, serviceId: null, eventType: 'admin.user_updated', entityType: 'user', entityId: userId, summary: `${u.name} updated by ${userName(ctx.userId)}`, before: { name: u.name, email: u.email, job_title: u.job_title }, after: { name: updated.name, email: updated.email, job_title: updated.job_title } })
    return userRow(updated, m)
  })
}

export async function changeRole(userId: string, orgId: string, role: OrgRole): Promise<AdminUserRow> {
  return call(() => {
    const ctx = authorize('admin.users')
    const s = getStore()
    const m = s.where('memberships', (x) => x.user_id === userId && x.org_id === orgId)[0]
    if (!m) throw new ApiError('not_found', 'Membership not found')
    const org = s.get('organisations', orgId)
    const isClientRole = role.startsWith('client_')
    if ((org.type === 'client') !== isClientRole) throw new ApiError('validation', `${role} is not a ${org.type} role.`)
    if (userId === ctx.userId && m.role === 'platform_admin' && role !== 'platform_admin') throw new ApiError('validation', 'You cannot remove your own administrator role.')
    const updated = s.update('memberships', m.id, { role }, ctx.userId)
    audit(ctx, { orgId, serviceId: null, eventType: 'admin.role_changed', entityType: 'membership', entityId: m.id, summary: `${userName(userId)}: role changed from ${m.role} to ${role} at ${org.name} by ${userName(ctx.userId)}`, before: { role: m.role }, after: { role } })
    notify([userId], orgId, 'account_changed', 'Your role was changed', `${userName(ctx.userId)} changed your role at ${org.name} to ${role.replace(/^(client|verifier)_/, '').replace('_', ' ')}.`, null)
    return userRow(s.get('users', userId), updated)
  })
}

export interface ReassignmentSummary {
  userId: string
  userName: string
  services: { serviceId: string; reference: string; name: string; role: string; coiStatus: string | null }[]
  openFindings: { id: string; serviceId: string; serviceReference: string; number: number; type: string; title: string }[]
  draftRequests: { id: string; reference: string; name: string }[]
  notifiedManagers: string[]
}

/** Deactivate (never delete) a user: PRD FR-64. Returns what the manager must reassign. */
export async function deactivateUser(userId: string, reason: string): Promise<ReassignmentSummary> {
  return call(() => {
    const ctx = authorize('admin.users')
    const r = requireReason(reason)
    const s = getStore()
    const u = s.get('users', userId)
    if (userId === ctx.userId) throw new ApiError('validation', 'You cannot deactivate your own account.')
    if (u.status === 'disabled') throw new ApiError('conflict', `${u.name} is already deactivated.`)
    const at = nowIsoString()
    const team = s.where('team', (t) => t.user_id === userId && t.status !== 'removed')
    const summary: ReassignmentSummary = {
      userId,
      userName: u.name,
      services: team
        .filter((t) => ACTIVE_SERVICE.includes(s.get('services', t.service_id).status))
        .map((t) => {
          const svc = s.get('services', t.service_id)
          return { serviceId: svc.id, reference: svc.reference, name: svc.name, role: t.service_role, coiStatus: s.where('cois', (c) => c.service_team_id === t.id)[0]?.status ?? null }
        }),
      openFindings: s
        .where('findings', (f) => f.assigned_user_id === userId && (f.status === 'open' || f.status === 'responded' || f.status === 'under_review'))
        .map((f) => ({ id: f.id, serviceId: f.service_id, serviceReference: s.get('services', f.service_id).reference, number: f.number, type: f.type, title: f.title })),
      draftRequests: s.where('services', (x) => x.status === 'draft' && x.client_contact_user_id === userId).map((x) => ({ id: x.id, reference: x.reference, name: x.name })),
      notifiedManagers: [],
    }
    s.update('users', userId, { status: 'disabled', deactivated_at: at, deactivated_by: ctx.userId, deactivation_reason: r }, ctx.userId)
    const memberships = s.where('memberships', (m) => m.user_id === userId)
    for (const m of memberships) if (m.status === 'active') s.update('memberships', m.id, { status: 'disabled' }, ctx.userId)
    for (const t of team) {
      s.update('team', t.id, { status: 'removed' }, ctx.userId)
      const svc = s.get('services', t.service_id)
      if (svc.team_leader_user_id === userId && t.service_role === 'verifier_team_leader') s.update('services', svc.id, { team_leader_user_id: null }, ctx.userId)
      audit(ctx, { orgId: svc.org_id, serviceId: svc.id, eventType: 'team.removed', entityType: 'service_team', entityId: t.id, summary: `${u.name} removed from the team (account deactivated)`, reason: r })
    }
    if (s.getSession().userId === userId) s.setSession({ userId: null, orgId: null, breakGlassServiceIds: [] })
    const homeOrg = memberships[0]?.org_id ?? ctx.orgId
    audit(ctx, { orgId: homeOrg, serviceId: null, eventType: 'admin.user_deactivated', entityType: 'user', entityId: userId, summary: `${u.name} deactivated by ${userName(ctx.userId)} — ${r}`, reason: r, before: { status: 'active' }, after: { status: 'disabled', open_services: summary.services.length, open_findings: summary.openFindings.length } })
    // Hand the open work to the people who can reassign it.
    const managers = s.where('memberships', (m) => m.org_id === 'org_verifassur' && m.role === 'verifier_manager' && m.status === 'active').map((m) => m.user_id)
    const clientAdmins = memberships.filter((m) => s.get('organisations', m.org_id).type === 'client').flatMap((m) => s.where('memberships', (x) => x.org_id === m.org_id && (x.role === 'client_admin' || x.role === 'client_owner') && x.status === 'active' && x.user_id !== userId).map((x) => x.user_id))
    const body = `${u.name} was deactivated by ${userName(ctx.userId)}. Open work to reassign: ${summary.services.length} team role(s) on ${summary.services.map((x) => x.reference).join(', ') || 'no service'}, ${summary.openFindings.length} open finding(s), ${summary.draftRequests.length} draft request(s). Reason: ${r}`
    notify(managers, 'org_verifassur', 'account_changed', `${u.name} deactivated — work to reassign`, body, summary.services[0]?.serviceId ?? null)
    if (clientAdmins.length) notify(clientAdmins, memberships[0].org_id, 'account_changed', `${u.name} deactivated`, body, summary.services[0]?.serviceId ?? null)
    summary.notifiedManagers = managers.map(userName)
    return summary
  })
}

export async function reactivateUser(userId: string): Promise<AdminUserRow> {
  return call(() => {
    const ctx = authorize('admin.users')
    const s = getStore()
    const u = s.get('users', userId)
    if (u.status === 'active') throw new ApiError('conflict', `${u.name} is already active.`)
    if (u.anonymised_at) throw new ApiError('conflict', 'An anonymised account cannot be reactivated.')
    s.update('users', userId, { status: 'active', deactivated_at: null, deactivated_by: null, deactivation_reason: null }, ctx.userId)
    const memberships = s.where('memberships', (m) => m.user_id === userId)
    for (const m of memberships) if (m.status === 'disabled') s.update('memberships', m.id, { status: 'active' }, ctx.userId)
    audit(ctx, { orgId: memberships[0]?.org_id ?? ctx.orgId, serviceId: null, eventType: 'admin.user_reactivated', entityType: 'user', entityId: userId, summary: `${u.name} reactivated by ${userName(ctx.userId)} (team roles are not restored)`, before: { status: 'disabled' }, after: { status: 'active' } })
    return userRow(s.get('users', userId), memberships[0])
  })
}

/** Show-don't-do actions: the dialog explains what would happen; Simulate records the audit event only. */
export async function resetPassword(userId: string): Promise<void> {
  return adminUserEvent(userId, 'admin.password_reset', (u, by) => `Password reset link sent to ${u.email} by ${by}`)
}
export async function resetMfa(userId: string): Promise<void> {
  return adminUserEvent(userId, 'admin.mfa_reset', (u, by) => `MFA and passkeys reset for ${u.name} by ${by}; re-enrolment required at next sign-in`)
}
export async function forceSignOut(userId: string): Promise<void> {
  return adminUserEvent(userId, 'admin.force_sign_out', (u, by) => `All sessions of ${u.name} revoked by ${by}`, (s, uid) => {
    if (s.getSession().userId === uid) s.setSession({ userId: null, orgId: null, breakGlassServiceIds: [] })
  })
}

async function adminUserEvent(userId: string, eventType: string, summary: (u: User, by: string) => string, effect?: (s: ReturnType<typeof getStore>, userId: string) => void): Promise<void> {
  return call(() => {
    const ctx = authorize('admin.users')
    const s = getStore()
    const u = s.get('users', userId)
    effect?.(s, userId)
    const m = s.where('memberships', (x) => x.user_id === userId)[0]
    audit(ctx, { orgId: m?.org_id ?? ctx.orgId, serviceId: null, eventType, entityType: 'user', entityId: userId, summary: summary(u, userName(ctx.userId)) })
    notify([userId], m?.org_id ?? ctx.orgId, 'account_changed', 'Security change on your account', summary(u, userName(ctx.userId)), null)
  })
}

/** Anonymise a deactivated user after the retention period (PRD FR-65). Irreversible. */
export async function anonymiseUser(userId: string, reason: string): Promise<AdminUserRow> {
  return call(() => {
    const ctx = authorize('admin.users')
    const r = requireReason(reason)
    const s = getStore()
    const u = s.get('users', userId)
    if (u.status !== 'disabled') throw new ApiError('conflict', 'Only deactivated users can be anonymised.')
    if (u.anonymised_at) throw new ApiError('conflict', 'Already anonymised.')
    const pseudonym = `Former user ${userId.slice(-4).toUpperCase()}`
    const updated = s.update('users', userId, { name: pseudonym, email: `${userId}@anonymised.invalid`, job_title: '', anonymised_at: nowIsoString() }, ctx.userId)
    const m = s.where('memberships', (x) => x.user_id === userId)[0]
    audit(ctx, { orgId: m?.org_id ?? ctx.orgId, serviceId: null, eventType: 'admin.user_anonymised', entityType: 'user', entityId: userId, summary: `User ${userId} anonymised by ${userName(ctx.userId)} — ${r}`, reason: r, before: { name: u.name }, after: { name: pseudonym } })
    return userRow(updated, m)
  })
}

export async function inviteUser(input: { orgId: string; email: string; name: string; jobTitle?: string; role: OrgRole }): Promise<AdminUserRow> {
  return call(() => {
    const ctx = authorize('admin.users')
    const s = getStore()
    const org = s.get('organisations', input.orgId)
    const email = input.email.trim().toLowerCase()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new ApiError('validation', 'Enter a valid e-mail address.')
    if (!input.name.trim()) throw new ApiError('validation', 'Enter the person’s name.')
    if ((org.type === 'client') !== input.role.startsWith('client_')) throw new ApiError('validation', `${input.role} is not a ${org.type} role.`)
    let user = s.where('users', (x) => x.email.toLowerCase() === email)[0]
    if (!user) {
      user = { ...auditNow(ctx.userId), id: newId('usr'), email, name: input.name.trim(), email_verified: false, mfa_enabled: false, locale: 'en', timezone: 'Europe/Amsterdam', status: 'active', job_title: input.jobTitle ?? '', last_sign_in_at: null, deactivated_at: null, deactivated_by: null, deactivation_reason: null, anonymised_at: null }
      s.insert('users', user)
    }
    if (s.where('memberships', (m) => m.user_id === user!.id && m.org_id === org.id).length) throw new ApiError('conflict', `${user.name} is already a member of ${org.name}.`)
    const m: Membership = { ...auditNow(ctx.userId), id: newId('mem'), org_id: org.id, user_id: user.id, role: input.role, status: 'invited' }
    s.insert('memberships', m)
    audit(ctx, { orgId: org.id, serviceId: null, eventType: 'admin.user_invited', entityType: 'membership', entityId: m.id, summary: `${user.name} (${email}) invited to ${org.name} as ${input.role} by ${userName(ctx.userId)}`, after: { role: input.role, expires_in_days: 7 } })
    return userRow(user, m)
  })
}

// ---------------------------------------------------------------- organisations
export interface AdminOrgRow {
  id: string
  type: 'verifier' | 'client'
  name: string
  legalName: string
  country: string
  registrationNo: string | null
  status: Organisation['status']
  suspendedAt: string | null
  suspendedReason: string | null
  portfolioManagerName: string | null
  users: number
  ongoing: number
  closed: number
  verifiedRecords: number
  previewFlags: number
  enabledFlags: number
}

function orgRow(o: Organisation): AdminOrgRow {
  const s = getStore()
  const services = s.where('services', (x) => x.org_id === o.id && !x.deleted_at)
  const overrides = s.where('flagOverrides', (f) => f.org_id === o.id)
  const flags = s.all('featureFlags').map((f) => overrides.find((x) => x.flag_key === f.key)?.state ?? f.default_state)
  return {
    id: o.id,
    type: o.type,
    name: o.name,
    legalName: o.legal_name,
    country: o.country,
    registrationNo: o.registration_no,
    status: o.status,
    suspendedAt: o.suspended_at,
    suspendedReason: o.suspended_reason,
    portfolioManagerName: o.portfolio_manager_user_id ? userName(o.portfolio_manager_user_id) : null,
    users: s.where('memberships', (m) => m.org_id === o.id && m.status === 'active').length,
    ongoing: services.filter((x) => ACTIVE_SERVICE.includes(x.status) || x.status === 'requested' || x.status === 'triage' || x.status === 'issued').length,
    closed: services.filter((x) => x.status === 'closed').length,
    verifiedRecords: s.where('inventories', (i) => i.org_id === o.id && i.status === 'verified').length + s.where('emissionFactors', (e) => e.org_id === o.id && e.status === 'verified').length + s.where('decarbRecords', (d) => d.org_id === o.id && d.status === 'verified').length,
    previewFlags: flags.filter((f) => f === 'preview').length,
    enabledFlags: flags.filter((f) => f === 'enabled').length,
  }
}

export async function listOrgs(): Promise<AdminOrgRow[]> {
  return call(() => {
    authorize('admin.orgs')
    return getStore()
      .all('organisations')
      .map(orgRow)
      .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'verifier' ? -1 : 1))
  })
}

export async function createOrg(input: { name: string; legalName: string; country: string; registrationNo?: string | null }): Promise<AdminOrgRow> {
  return call(() => {
    const ctx = authorize('admin.orgs')
    const s = getStore()
    if (!input.name.trim() || !input.legalName.trim()) throw new ApiError('validation', 'Name and legal name are required.')
    if (!/^[A-Z]{2}$/.test(input.country)) throw new ApiError('validation', 'Country must be a two-letter ISO code.')
    if (s.where('organisations', (o) => o.name.toLowerCase() === input.name.trim().toLowerCase()).length) throw new ApiError('conflict', 'An organisation with that name already exists.')
    const org: Organisation = { ...auditNow(ctx.userId), id: newId('org'), type: 'client', name: input.name.trim(), legal_name: input.legalName.trim(), country: input.country, registration_no: input.registrationNo?.trim() || null, settings_json: {}, status: 'active', suspended_at: null, suspended_reason: null, portfolio_manager_user_id: null, initials: input.name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') }
    s.insert('organisations', org)
    audit(ctx, { orgId: org.id, serviceId: null, eventType: 'admin.org_created', entityType: 'organisation', entityId: org.id, summary: `Client organisation ${org.name} created by ${userName(ctx.userId)}`, after: { name: org.name, country: org.country } })
    return orgRow(org)
  })
}

export async function updateOrg(orgId: string, patch: { name?: string; legalName?: string; country?: string; registrationNo?: string | null }): Promise<AdminOrgRow> {
  return call(() => {
    const ctx = authorize('admin.orgs')
    const s = getStore()
    const o = s.get('organisations', orgId)
    const next: Partial<Organisation> = {}
    if (patch.name?.trim()) next.name = patch.name.trim()
    if (patch.legalName?.trim()) next.legal_name = patch.legalName.trim()
    if (patch.country) {
      if (!/^[A-Z]{2}$/.test(patch.country)) throw new ApiError('validation', 'Country must be a two-letter ISO code.')
      next.country = patch.country
    }
    if (patch.registrationNo !== undefined) next.registration_no = patch.registrationNo?.trim() || null
    const updated = s.update('organisations', orgId, next, ctx.userId)
    audit(ctx, { orgId, serviceId: null, eventType: 'admin.org_updated', entityType: 'organisation', entityId: orgId, summary: `${o.name} updated by ${userName(ctx.userId)}`, before: { name: o.name, legal_name: o.legal_name, country: o.country }, after: { name: updated.name, legal_name: updated.legal_name, country: updated.country } })
    return orgRow(updated)
  })
}

export async function suspendOrg(orgId: string, reason: string): Promise<AdminOrgRow> {
  return call(() => {
    const ctx = authorize('admin.orgs')
    const r = requireReason(reason)
    const s = getStore()
    const o = s.get('organisations', orgId)
    if (o.type === 'verifier') throw new ApiError('validation', 'The verifier organisation cannot be suspended.')
    if (o.status === 'suspended') throw new ApiError('conflict', `${o.name} is already suspended.`)
    const updated = s.update('organisations', orgId, { status: 'suspended', suspended_at: nowIsoString(), suspended_reason: r }, ctx.userId)
    if (s.getSession().orgId === orgId) s.setSession({ userId: null, orgId: null, breakGlassServiceIds: [] })
    audit(ctx, { orgId, serviceId: null, eventType: 'admin.org_suspended', entityType: 'organisation', entityId: orgId, summary: `${o.name} suspended by ${userName(ctx.userId)} — ${r}`, reason: r, before: { status: 'active' }, after: { status: 'suspended' } })
    const managers = s.where('memberships', (m) => m.org_id === 'org_verifassur' && m.role === 'verifier_manager' && m.status === 'active').map((m) => m.user_id)
    notify(managers, 'org_verifassur', 'account_changed', `${o.name} suspended`, `${userName(ctx.userId)} suspended ${o.name}: ${r}. Its users cannot sign in; engagements are frozen.`, null)
    return orgRow(updated)
  })
}

export async function unsuspendOrg(orgId: string): Promise<AdminOrgRow> {
  return call(() => {
    const ctx = authorize('admin.orgs')
    const s = getStore()
    const o = s.get('organisations', orgId)
    if (o.status !== 'suspended') throw new ApiError('conflict', `${o.name} is not suspended.`)
    const updated = s.update('organisations', orgId, { status: 'active', suspended_at: null, suspended_reason: null }, ctx.userId)
    audit(ctx, { orgId, serviceId: null, eventType: 'admin.org_unsuspended', entityType: 'organisation', entityId: orgId, summary: `${o.name} reactivated by ${userName(ctx.userId)}`, before: { status: 'suspended' }, after: { status: 'active' } })
    return orgRow(updated)
  })
}

// ---------------------------------------------------------------- settings, flags, announcements
export async function getSettings(): Promise<PlatformSettings> {
  return call(() => {
    authorize('admin.settings')
    return getStore().get('platformSettings', 'platform')
  })
}

export async function updateSettings(patch: Partial<Pick<PlatformSettings, 'maintenance_mode' | 'maintenance_message' | 'maintenance_from' | 'maintenance_until' | 'branding_json' | 'notification_templates_json' | 'retention_years'>>): Promise<PlatformSettings> {
  return call(() => {
    const ctx = authorize('admin.settings')
    const s = getStore()
    const before = s.get('platformSettings', 'platform')
    const next = s.update('platformSettings', 'platform', { ...patch, updated_by: ctx.userId, updated_at: nowIsoString() })
    const changed = Object.keys(patch).join(', ')
    audit(ctx, { orgId: 'org_verifassur', serviceId: null, eventType: 'admin.settings_updated', entityType: 'platform_settings', entityId: 'platform', summary: `Platform settings updated by ${userName(ctx.userId)}: ${changed}`, before: Object.fromEntries(Object.keys(patch).map((k) => [k, (before as Record<string, unknown>)[k]])), after: patch })
    return next
  })
}

/** Reads the maintenance / branding settings for the shell without a session. */
export function settingsSync(): PlatformSettings | null {
  try {
    return getStore().find('platformSettings', 'platform') ?? null
  } catch {
    return null
  }
}

export interface FlagDefaultRow {
  key: string
  title: string
  description: string
  horizon: string
  area: string
  defaultState: FlagState
  overrides: { orgId: string; orgName: string; state: FlagState }[]
  interestCount: number
}

export async function listFlagDefaults(): Promise<FlagDefaultRow[]> {
  return call(() => {
    authorize('admin.settings')
    const s = getStore()
    return s.all('featureFlags').map((f) => ({
      key: f.key,
      title: f.title,
      description: f.description,
      horizon: f.horizon,
      area: f.area,
      defaultState: f.default_state,
      overrides: s.where('flagOverrides', (o) => o.flag_key === f.key).map((o) => ({ orgId: o.org_id, orgName: orgName(o.org_id), state: o.state })),
      interestCount: s.where('featureInterest', (i) => i.flag_key === f.key).length,
    }))
  })
}

export async function setFlagDefault(key: string, state: FlagState): Promise<FlagDefaultRow[]> {
  return call(() => {
    const ctx = authorize('admin.settings')
    const s = getStore()
    const flag = s.all('featureFlags').find((f) => f.key === key)
    if (!flag) throw new ApiError('not_found', `Unknown feature ${key}`)
    const before = flag.default_state
    flag.default_state = state
    s.setSession({})
    audit(ctx, { orgId: 'org_verifassur', serviceId: null, eventType: 'admin.flag_default_changed', entityType: 'feature_flag', entityId: key, summary: `Default state of "${flag.title}" set to ${state} by ${userName(ctx.userId)}`, before: { state: before }, after: { state } })
    return s.all('featureFlags').map((f) => ({ key: f.key, title: f.title, description: f.description, horizon: f.horizon, area: f.area, defaultState: f.default_state, overrides: s.where('flagOverrides', (o) => o.flag_key === f.key).map((o) => ({ orgId: o.org_id, orgName: orgName(o.org_id), state: o.state })), interestCount: s.where('featureInterest', (i) => i.flag_key === f.key).length }))
  })
}

export async function listAnnouncements(): Promise<Announcement[]> {
  return call(() => {
    authorize('admin.settings')
    return [...getStore().all('announcements')].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  })
}

export interface AnnouncementInput {
  title: string
  body: string
  tone: AnnouncementTone
  audience: AnnouncementAudience
  startsAt?: string | null
  endsAt?: string | null
  active: boolean
}

export async function createAnnouncement(input: AnnouncementInput): Promise<Announcement> {
  return call(() => {
    const ctx = authorize('admin.settings')
    if (!input.title.trim()) throw new ApiError('validation', 'A title is required.')
    const row: Announcement = { id: newId('ann'), title: input.title.trim(), body: input.body.trim(), tone: input.tone, audience: input.audience, starts_at: input.startsAt ?? nowIsoString(), ends_at: input.endsAt ?? null, active: input.active, created_by: ctx.userId, created_at: nowIsoString() }
    getStore().insert('announcements', row)
    audit(ctx, { orgId: 'org_verifassur', serviceId: null, eventType: 'admin.announcement_created', entityType: 'announcement', entityId: row.id, summary: `Announcement "${row.title}" created by ${userName(ctx.userId)} (${row.audience}, ${row.active ? 'active' : 'inactive'})`, after: { audience: row.audience, active: row.active } })
    return row
  })
}

export async function updateAnnouncement(id: string, patch: Partial<AnnouncementInput>): Promise<Announcement> {
  return call(() => {
    const ctx = authorize('admin.settings')
    const s = getStore()
    const a = s.get('announcements', id)
    const next: Partial<Announcement> = {}
    if (patch.title !== undefined) next.title = patch.title.trim()
    if (patch.body !== undefined) next.body = patch.body.trim()
    if (patch.tone) next.tone = patch.tone
    if (patch.audience) next.audience = patch.audience
    if (patch.startsAt !== undefined) next.starts_at = patch.startsAt ?? nowIsoString()
    if (patch.endsAt !== undefined) next.ends_at = patch.endsAt
    if (patch.active !== undefined) next.active = patch.active
    const updated = s.update('announcements', id, next, ctx.userId)
    audit(ctx, { orgId: 'org_verifassur', serviceId: null, eventType: patch.active !== undefined && Object.keys(patch).length === 1 ? (patch.active ? 'admin.announcement_published' : 'admin.announcement_withdrawn') : 'admin.announcement_updated', entityType: 'announcement', entityId: id, summary: `Announcement "${updated.title}" ${patch.active === true ? 'published' : patch.active === false ? 'withdrawn' : 'updated'} by ${userName(ctx.userId)}`, before: { active: a.active }, after: { active: updated.active } })
    return updated
  })
}

export async function removeAnnouncement(id: string): Promise<void> {
  return call(() => {
    const ctx = authorize('admin.settings')
    const s = getStore()
    const a = s.get('announcements', id)
    s.remove('announcements', id)
    audit(ctx, { orgId: 'org_verifassur', serviceId: null, eventType: 'admin.announcement_deleted', entityType: 'announcement', entityId: id, summary: `Announcement "${a.title}" deleted by ${userName(ctx.userId)}` })
  })
}

/** Announcements the signed-in viewer should see now (shell banner). Safe when signed out. */
export function activeAnnouncementsSync(): Announcement[] {
  try {
    const s = getStore()
    const { orgId } = s.getSession()
    const orgType = orgId ? s.find('organisations', orgId)?.type : undefined
    const now = nowIsoString()
    return s.where('announcements', (a) => a.active && a.starts_at <= now && (!a.ends_at || a.ends_at > now) && (a.audience === 'all' || (a.audience === 'clients' && orgType === 'client') || (a.audience === 'staff' && orgType === 'verifier')))
  } catch {
    return []
  }
}

// ---------------------------------------------------------------- global audit log and COI register
export interface AuditRow extends AuditEvent {
  actorName: string
  orgName: string
  serviceReference: string | null
}

export interface AuditFilter {
  orgId?: string
  actorId?: string
  /** Event type prefix, e.g. `admin.`, `step.`, `auth.`. */
  type?: string
  from?: string
  to?: string
  search?: string
  authOnly?: boolean
  limit?: number
}

export function auditRow(e: AuditEvent): AuditRow {
  const s = getStore()
  return { ...e, actorName: e.actor_user_id ? userName(e.actor_user_id) : e.actor_type === 'system' ? 'System' : e.actor_type, orgName: orgName(e.org_id), serviceReference: e.service_id ? (s.find('services', e.service_id)?.reference ?? null) : null }
}

export async function auditLog(filter: AuditFilter = {}): Promise<AuditRow[]> {
  return call(() => {
    authorize('admin.audit')
    let rows = getStore().all('auditEvents')
    if (filter.authOnly) rows = rows.filter((e) => e.event_type.startsWith('auth.') || e.event_type === 'admin.role_changed' || e.event_type === 'admin.password_reset' || e.event_type === 'admin.mfa_reset' || e.event_type === 'admin.force_sign_out')
    if (filter.orgId) rows = rows.filter((e) => e.org_id === filter.orgId)
    if (filter.actorId) rows = rows.filter((e) => e.actor_user_id === filter.actorId)
    if (filter.type) rows = rows.filter((e) => e.event_type.startsWith(filter.type!))
    if (filter.from) rows = rows.filter((e) => e.occurred_at >= filter.from!)
    if (filter.to) rows = rows.filter((e) => e.occurred_at <= `${filter.to}T23:59:59Z`)
    if (filter.search) {
      const q = filter.search.toLowerCase()
      rows = rows.filter((e) => e.summary.toLowerCase().includes(q) || e.event_type.includes(q) || (e.reason ?? '').toLowerCase().includes(q))
    }
    const sorted = [...rows].sort((a, b) => (a.occurred_at < b.occurred_at ? 1 : -1))
    return (filter.limit ? sorted.slice(0, filter.limit) : sorted).map(auditRow)
  })
}

/** Distinct event-type prefixes present in the log (for the filter select). */
export async function auditEventTypes(): Promise<string[]> {
  return call(() => {
    authorize('admin.audit')
    return [...new Set(getStore().all('auditEvents').map((e) => `${e.event_type.split('.')[0]}.`))].sort()
  })
}

export function auditCsv(rows: AuditRow[]): string {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  return ['occurred_at,organisation,service,event_type,actor,entity_type,entity_id,reason,summary', ...rows.map((e) => [e.occurred_at, e.orgName, e.serviceReference ?? '', e.event_type, e.actorName, e.entity_type, e.entity_id, e.reason ?? '', e.summary].map(esc).join(','))].join('\n')
}

export interface CoiRegisterRow {
  id: string
  userId: string
  userName: string
  jobTitle: string
  serviceId: string
  serviceReference: string
  serviceName: string
  clientName: string
  role: string
  declaration: string | null
  details: string | null
  status: string
  declaredAt: string | null
  decidedByName: string | null
  decidedAt: string | null
  memberStatus: string
}

export async function coiRegister(filter: { status?: string; userId?: string; orgId?: string } = {}): Promise<CoiRegisterRow[]> {
  return call(() => {
    authorize('admin.coi_register')
    const s = getStore()
    let rows = s.all('cois').map((c) => {
      const tm = s.get('team', c.service_team_id)
      const svc = s.get('services', tm.service_id)
      const u = s.get('users', tm.user_id)
      return { id: c.id, userId: u.id, userName: u.name, jobTitle: u.job_title ?? '', serviceId: svc.id, serviceReference: svc.reference, serviceName: svc.name, clientName: orgName(svc.org_id), clientOrgId: svc.org_id, role: tm.service_role, declaration: c.declaration, details: c.details, status: c.status, declaredAt: c.declared_at, decidedByName: c.decided_by ? userName(c.decided_by) : null, decidedAt: c.decided_at, memberStatus: tm.status }
    })
    if (filter.status) rows = rows.filter((r) => r.status === filter.status)
    if (filter.userId) rows = rows.filter((r) => r.userId === filter.userId)
    if (filter.orgId) rows = rows.filter((r) => r.clientOrgId === filter.orgId)
    return rows
      .sort((a, b) => (a.status === 'approved' ? 1 : 0) - (b.status === 'approved' ? 1 : 0) || ((a.declaredAt ?? '9') < (b.declaredAt ?? '9') ? -1 : 1))
      .map(({ clientOrgId: _o, ...r }) => r)
  })
}

// ---------------------------------------------------------------- statistics and rollups (PRD FR-71)
export interface MoneyByCurrency {
  currency: string
  quotedMinor: number
  invoicedMinor: number
  paidMinor: number
  outstandingMinor: number
}

export interface AdminStats {
  filters: { years: number[]; clients: { orgId: string; name: string }[]; serviceTypes: ServiceType[] }
  totals: { started: number; issued: number; closed: number; ongoing: number; awaitingTriage: number; onHold: number; organisations: number; users: number; activeUsers: number; overrideCount: number }
  byYear: { year: number; started: number; issued: number; closed: number; invoicedMinor: number; paidMinor: number; outstandingMinor: number }[]
  byClient: { orgId: string; orgName: string; started: number; issued: number; closed: number; ongoing: number; invoicedMinor: number; paidMinor: number; outstandingMinor: number; shareEngagementsPct: number; shareRevenuePct: number }[]
  byType: { serviceType: ServiceType; label: string; standard: string; started: number; issued: number; closed: number; medianRequestToContractDays: number | null; medianContractToIssueDays: number | null; invoicedMinor: number }[]
  byStaff: { userId: string; name: string; orgRole: string; activeAssignments: number; byRole: Record<string, number>; issuedAsTeamLeader: number; coiPending: number }[]
  cycleTimes: { requestToContractMedianDays: number | null; contractToIssueMedianDays: number | null; requestToIssueMedianDays: number | null; samples: number }
  overdueSteps: { serviceId: string; serviceReference: string; clientName: string; stepName: string; ownerRole: string; plannedEnd: string; daysOverdue: number }[]
  openBlockingFindings: { id: string; serviceId: string; serviceReference: string; clientName: string; number: number; type: string; title: string; dueAt: string | null; assignedName: string | null; status: string }[]
  coiPending: { coiId: string; serviceId: string; serviceReference: string; userName: string; role: string; status: string }[]
  concentration: { topClientName: string | null; topClientShareEngagementsPct: number; topClientShareRevenuePct: number; clientsWithOngoing: number }
  /** Money is returned only to the platform administrator (plan_v1 §8 D7). */
  money: MoneyByCurrency[] | null
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2)
}

const days = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000)

export interface StatsFilter {
  year?: number
  orgId?: string
  serviceType?: ServiceType
}

export async function stats(filter: StatsFilter = {}): Promise<AdminStats> {
  return call(() => {
    const ctx = authorize('admin.stats')
    const s = getStore()
    const today = todayIso()
    const allServices = s.where('services', (x) => x.verifier_org_id === 'org_verifassur' && !x.deleted_at && x.status !== 'draft')
    const yearOf = (iso: string | null) => (iso ? Number(iso.slice(0, 4)) : null)
    const inYear = (iso: string | null) => filter.year == null || yearOf(iso) === filter.year
    let services = allServices
    if (filter.orgId) services = services.filter((x) => x.org_id === filter.orgId)
    if (filter.serviceType) services = services.filter((x) => x.service_type === filter.serviceType)
    const svcIds = new Set(services.map((x) => x.id))
    const invoices = s.where('invoices', (i) => svcIds.has(i.service_id))
    const invoicesInYear = invoices.filter((i) => inYear(i.issued_at))

    const moneyOf = (inv: typeof invoices) => {
      const byCur = new Map<string, MoneyByCurrency>()
      for (const i of inv) {
        const m = byCur.get(i.currency) ?? { currency: i.currency, quotedMinor: 0, invoicedMinor: 0, paidMinor: 0, outstandingMinor: 0 }
        if (i.kind === 'quote') m.quotedMinor += i.amount_minor
        else if (i.status !== 'void' && i.status !== 'draft') {
          m.invoicedMinor += i.amount_minor
          if (i.status === 'paid') m.paidMinor += i.amount_minor
          else m.outstandingMinor += i.amount_minor
        }
        byCur.set(i.currency, m)
      }
      return [...byCur.values()].sort((a, b) => b.invoicedMinor - a.invoicedMinor)
    }
    const eur = (inv: typeof invoices) => {
      const m = moneyOf(inv).find((x) => x.currency === 'EUR') ?? { invoicedMinor: 0, paidMinor: 0, outstandingMinor: 0 }
      return { invoicedMinor: m.invoicedMinor, paidMinor: m.paidMinor, outstandingMinor: m.outstandingMinor }
    }

    const started = services.filter((x) => inYear(x.requested_at))
    const issued = services.filter((x) => x.issued_at && inYear(x.issued_at))
    const closed = services.filter((x) => x.status === 'closed' && inYear(x.closed_at))
    const ongoing = services.filter((x) => ACTIVE_SERVICE.includes(x.status) || x.status === 'issued')

    const years = [...new Set(allServices.flatMap((x) => [yearOf(x.requested_at), yearOf(x.issued_at), yearOf(x.closed_at)]).filter((y): y is number => y !== null))].sort()
    const byYear = years.map((year) => {
      const inv = invoices.filter((i) => yearOf(i.issued_at) === year)
      return { year, started: services.filter((x) => yearOf(x.requested_at) === year).length, issued: services.filter((x) => yearOf(x.issued_at) === year).length, closed: services.filter((x) => yearOf(x.closed_at) === year).length, ...eur(inv) }
    })

    const clientOrgs = s.where('organisations', (o) => o.type === 'client')
    const totalEngagements = started.length || 1
    const totalInvoiced = eur(invoicesInYear).invoicedMinor || 1
    const byClient = clientOrgs
      .map((o) => {
        const mine = services.filter((x) => x.org_id === o.id)
        const inv = invoicesInYear.filter((i) => mine.some((x) => x.id === i.service_id))
        const money = eur(inv)
        const startedN = mine.filter((x) => inYear(x.requested_at)).length
        return { orgId: o.id, orgName: o.name, started: startedN, issued: mine.filter((x) => x.issued_at && inYear(x.issued_at)).length, closed: mine.filter((x) => x.status === 'closed' && inYear(x.closed_at)).length, ongoing: mine.filter((x) => ACTIVE_SERVICE.includes(x.status) || x.status === 'issued').length, ...money, shareEngagementsPct: Math.round((startedN / totalEngagements) * 100), shareRevenuePct: Math.round((money.invoicedMinor / totalInvoiced) * 100) }
      })
      .filter((c) => c.started + c.issued + c.closed + c.ongoing > 0 || !filter.orgId)
      .sort((a, b) => b.invoicedMinor - a.invoicedMinor || b.started - a.started)

    const types = [...new Set(allServices.map((x) => x.service_type))]
    const byType = types
      .map((t) => {
        const mine = services.filter((x) => x.service_type === t)
        const r2c = mine.filter((x) => x.requested_at && x.contracted_at && inYear(x.requested_at)).map((x) => days(x.requested_at!, x.contracted_at!))
        const c2i = mine.filter((x) => x.contracted_at && x.issued_at && inYear(x.issued_at)).map((x) => days(x.contracted_at!, x.issued_at!))
        return { serviceType: t, label: SERVICE_TYPE_LABELS[t], standard: mine[0]?.standard ?? allServices.find((x) => x.service_type === t)?.standard ?? '', started: mine.filter((x) => inYear(x.requested_at)).length, issued: mine.filter((x) => x.issued_at && inYear(x.issued_at)).length, closed: mine.filter((x) => x.status === 'closed' && inYear(x.closed_at)).length, medianRequestToContractDays: median(r2c), medianContractToIssueDays: median(c2i), invoicedMinor: eur(invoicesInYear.filter((i) => mine.some((x) => x.id === i.service_id))).invoicedMinor }
      })
      .filter((t) => t.started + t.issued + t.closed > 0 || !filter.serviceType)
      .sort((a, b) => b.started - a.started)

    const staffMembers = s.where('memberships', (m) => m.org_id === 'org_verifassur' && m.status === 'active' && m.role !== 'platform_admin')
    const byStaff = staffMembers
      .map((m) => {
        const u = s.get('users', m.user_id)
        const team = s.where('team', (t) => t.user_id === u.id && t.status !== 'removed' && svcIds.has(t.service_id))
        const active = team.filter((t) => ACTIVE_SERVICE.includes(s.get('services', t.service_id).status))
        const byRole: Record<string, number> = {}
        for (const t of active) byRole[t.service_role] = (byRole[t.service_role] ?? 0) + 1
        return { userId: u.id, name: u.name, orgRole: m.role, activeAssignments: active.length, byRole, issuedAsTeamLeader: services.filter((x) => x.team_leader_user_id === u.id && x.issued_at && inYear(x.issued_at)).length, coiPending: active.filter((t) => s.where('cois', (c) => c.service_team_id === t.id)[0]?.status !== 'approved').length }
      })
      .sort((a, b) => b.activeAssignments - a.activeAssignments || a.name.localeCompare(b.name))

    const r2cAll = services.filter((x) => x.requested_at && x.contracted_at && inYear(x.requested_at)).map((x) => days(x.requested_at!, x.contracted_at!))
    const c2iAll = services.filter((x) => x.contracted_at && x.issued_at && inYear(x.issued_at)).map((x) => days(x.contracted_at!, x.issued_at!))
    const r2iAll = services.filter((x) => x.requested_at && x.issued_at && inYear(x.issued_at)).map((x) => days(x.requested_at!, x.issued_at!))

    const activeIds = new Set(services.filter((x) => ACTIVE_SERVICE.includes(x.status) && x.status !== 'on_hold').map((x) => x.id))
    const overdueSteps = s
      .where('steps', (st) => activeIds.has(st.service_id) && st.status !== 'completed' && st.status !== 'skipped' && Boolean(st.planned_end && st.planned_end < today))
      .map((st) => {
        const svc = s.get('services', st.service_id)
        return { serviceId: svc.id, serviceReference: svc.reference, clientName: orgName(svc.org_id), stepName: st.name, ownerRole: st.owner_role, plannedEnd: st.planned_end!, daysOverdue: days(st.planned_end!, today) }
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue)

    const openBlockingFindings = s
      .where('findings', (f) => svcIds.has(f.service_id) && f.blocking && f.status !== 'closed' && f.status !== 'withdrawn')
      .map((f) => {
        const svc = s.get('services', f.service_id)
        return { id: f.id, serviceId: svc.id, serviceReference: svc.reference, clientName: orgName(svc.org_id), number: f.number, type: f.type, title: f.title, dueAt: f.due_at, assignedName: f.assigned_user_id ? userName(f.assigned_user_id) : null, status: f.status }
      })

    const coiPending = s
      .where('team', (t) => svcIds.has(t.service_id) && t.status !== 'removed' && t.service_role !== 'client_contact')
      .map((t) => ({ t, coi: s.where('cois', (c) => c.service_team_id === t.id)[0] }))
      .filter((x) => x.coi && x.coi.status !== 'approved' && ACTIVE_SERVICE.includes(s.get('services', x.t.service_id).status))
      .map((x) => ({ coiId: x.coi!.id, serviceId: x.t.service_id, serviceReference: s.get('services', x.t.service_id).reference, userName: userName(x.t.user_id), role: x.t.service_role, status: x.coi!.status }))

    const top = [...byClient].sort((a, b) => b.invoicedMinor - a.invoicedMinor)[0]
    const topByEng = [...byClient].sort((a, b) => b.started + b.ongoing - (a.started + a.ongoing))[0]
    const engagementsTotal = byClient.reduce((a, c) => a + c.started + c.ongoing, 0) || 1

    return {
      filters: { years, clients: clientOrgs.map((o) => ({ orgId: o.id, name: o.name })), serviceTypes: types },
      totals: {
        started: started.length,
        issued: issued.length,
        closed: closed.length,
        ongoing: ongoing.length,
        awaitingTriage: services.filter((x) => x.status === 'requested' || x.status === 'triage').length,
        onHold: services.filter((x) => x.status === 'on_hold').length,
        organisations: clientOrgs.length,
        users: s.all('users').length,
        activeUsers: s.where('users', (u) => u.status === 'active').length,
        overrideCount: s.where('auditEvents', (e) => (e.event_type === 'step.overridden' || e.event_type === 'service.overridden' || e.event_type === 'team.reassigned') && inYear(e.occurred_at)).length,
      },
      byYear,
      byClient,
      byType,
      byStaff,
      cycleTimes: { requestToContractMedianDays: median(r2cAll), contractToIssueMedianDays: median(c2iAll), requestToIssueMedianDays: median(r2iAll), samples: r2iAll.length },
      overdueSteps,
      openBlockingFindings,
      coiPending,
      concentration: { topClientName: top?.orgName ?? null, topClientShareEngagementsPct: topByEng ? Math.round(((topByEng.started + topByEng.ongoing) / engagementsTotal) * 100) : 0, topClientShareRevenuePct: top?.shareRevenuePct ?? 0, clientsWithOngoing: byClient.filter((c) => c.ongoing > 0).length },
      money: isPlatformAdmin(ctx) ? moneyOf(invoicesInYear) : null,
    }
  })
}

// ---------------------------------------------------------------- data operations (PRD FR-72, show-don't-do: Simulate records the event)
export type DataOperation = 'export_org' | 'export_audit' | 'retention_report' | 'backup_check'

export interface DataOperationResult {
  jobId: string
  summary: string
  details: { label: string; value: string }[]
}

export async function dataOperation(kind: DataOperation, params: { orgId?: string } = {}): Promise<DataOperationResult> {
  return call(() => {
    const ctx = authorize('admin.settings')
    const s = getStore()
    const settings = s.get('platformSettings', 'platform')
    const jobId = newId('job')
    const today = todayIso()
    const cutoff = `${Number(today.slice(0, 4)) - settings.retention_years}${today.slice(4)}`
    let summary: string
    let details: { label: string; value: string }[]
    if (kind === 'export_org') {
      const org = s.get('organisations', params.orgId ?? '')
      const docs = s.where('documents', (d) => d.org_id === org.id && !d.deleted_at).length
      const events = s.where('auditEvents', (e) => e.org_id === org.id).length
      summary = `Export of ${org.name} queued (job ${jobId})`
      details = [
        { label: 'Services', value: String(s.where('services', (x) => x.org_id === org.id).length) },
        { label: 'Documents in manifest', value: String(docs) },
        { label: 'Audit events', value: String(events) },
        { label: 'Delivery', value: 'Signed link, expires after 7 days' },
      ]
    } else if (kind === 'export_audit') {
      summary = `Platform audit log export queued (job ${jobId})`
      details = [
        { label: 'Audit events', value: String(s.all('auditEvents').length) },
        { label: 'Format', value: 'CSV + JSON lines, SHA-256 manifest' },
        { label: 'Delivery', value: 'Signed link, expires after 7 days' },
      ]
    } else if (kind === 'retention_report') {
      const expired = s.where('services', (x) => x.status === 'closed' && Boolean(x.closed_at && x.closed_at.slice(0, 10) < cutoff))
      summary = `Retention report ready: ${expired.length} service${expired.length === 1 ? '' : 's'} past the ${settings.retention_years}-year period`
      details = [
        { label: 'Retention period', value: `${settings.retention_years} years after closure` },
        { label: 'Cut-off date', value: cutoff },
        { label: 'Services to purge', value: String(expired.length) },
        { label: 'Deactivated users eligible for anonymisation', value: String(s.where('users', (u) => u.status === 'disabled' && !u.anonymised_at && Boolean(u.deactivated_at && u.deactivated_at.slice(0, 10) < cutoff)).length) },
      ]
    } else {
      summary = 'Backups verified'
      details = [
        { label: 'Last D1 export to R2', value: `${today}T02:00Z (nightly)` },
        { label: 'Last R2 replication to the secondary bucket', value: `${today}T03:30Z (daily)` },
        { label: 'D1 Time Travel window', value: '30 days' },
        { label: 'Last tested restore', value: 'staging, last quarter' },
      ]
    }
    audit(ctx, { orgId: params.orgId ?? 'org_verifassur', serviceId: null, eventType: `admin.${kind}`, entityType: 'job', entityId: jobId, summary: `${summary} by ${userName(ctx.userId)}`, after: Object.fromEntries(details.map((d) => [d.label, d.value])) })
    return { jobId, summary, details }
  })
}

// ---------------------------------------------------------------- break-glass (PRD FR-70)
export interface BreakGlassGrant {
  serviceId: string
  serviceReference: string
  grantedAt: string
}

/** Grants session-scoped access to the evidence content of one service, with a mandatory reason; managers are notified. */
export async function breakGlass(serviceId: string, reason: string): Promise<BreakGlassGrant> {
  return call(() => {
    const ctx = authorize('admin.break_glass')
    const r = requireReason(reason)
    const s = getStore()
    const svc = s.get('services', serviceId)
    const current = s.getSession().breakGlassServiceIds ?? []
    if (!current.includes(serviceId)) s.setSession({ breakGlassServiceIds: [...current, serviceId] })
    const at = nowIsoString()
    audit(ctx, { orgId: svc.org_id, serviceId, eventType: 'admin.break_glass', entityType: 'service', entityId: serviceId, summary: `Break-glass evidence access to ${svc.reference} by ${userName(ctx.userId)} — ${r}`, reason: r, after: { granted_until: 'end of session' } })
    const managers = s.where('memberships', (m) => m.org_id === 'org_verifassur' && m.role === 'verifier_manager' && m.status === 'active').map((m) => m.user_id)
    notify(managers, 'org_verifassur', 'account_changed', `Break-glass access on ${svc.reference}`, `${userName(ctx.userId)} (platform administrator) opened evidence content on ${svc.reference}. Reason: ${r}`, serviceId)
    return { serviceId, serviceReference: svc.reference, grantedAt: at }
  })
}

/** True when the viewer may open evidence content on this service: everyone except ADMIN without a grant. */
export function canReadEvidenceContentSync(serviceId: string | null): boolean {
  try {
    const ctx = authContext()
    if (!isPlatformAdmin(ctx)) return true
    if (!serviceId) return false
    return (getStore().getSession().breakGlassServiceIds ?? []).includes(serviceId)
  } catch {
    return true
  }
}

/** Records each content read by ADMIN under break-glass (FR-70). */
export function logBreakGlassRead(serviceId: string, what: string): void {
  try {
    const ctx = authContext()
    if (!isPlatformAdmin(ctx)) return
    const svc = getStore().get('services', serviceId)
    audit(ctx, { orgId: svc.org_id, serviceId, eventType: 'admin.break_glass_read', entityType: 'service', entityId: serviceId, summary: `${userName(ctx.userId)} opened ${what} on ${svc.reference} under break-glass access` })
  } catch {
    /* not signed in */
  }
}

export function isAdminSync(): boolean {
  try {
    return isPlatformAdmin(authContext())
  } catch {
    return false
  }
}
