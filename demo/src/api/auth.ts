/** Mock authentication: persona picker, fake MFA, org switching (plan_v1 §2.3). */
import type { OrgRole, OrgType } from '@/domain/enums'
import type { AuthContext } from '@/domain/policy'
import { ApiError, authContext, call, currentUser, getStore } from './core'

export interface Persona {
  userId: string
  name: string
  email: string
  jobTitle: string
  orgId: string
  orgName: string
  orgType: OrgType
  orgInitials: string
  role: OrgRole
}

export interface Me {
  user: { id: string; name: string; email: string; jobTitle: string; mfaEnabled: boolean }
  org: { id: string; name: string; type: OrgType; initials: string; country: string }
  role: OrgRole | null
  orgs: { id: string; name: string; type: OrgType; role: OrgRole }[]
  ctx: AuthContext
}

export function listPersonas(): Persona[] {
  const s = getStore()
  return s
    .all('memberships')
    .filter((m) => m.status === 'active')
    .map((m) => {
      const user = s.get('users', m.user_id)
      const org = s.get('organisations', m.org_id)
      return {
        userId: user.id,
        name: user.name,
        email: user.email,
        jobTitle: user.job_title ?? '',
        orgId: org.id,
        orgName: org.name,
        orgType: org.type,
        orgInitials: org.initials ?? org.name.slice(0, 2).toUpperCase(),
        role: m.role,
      }
    })
}

export async function signIn(userId: string, orgId?: string): Promise<Me> {
  return call(() => {
    const s = getStore()
    const memberships = s.where('memberships', (m) => m.user_id === userId && m.status === 'active')
    if (memberships.length === 0) throw new ApiError('unauthenticated', 'Unknown user')
    const target = orgId ?? memberships[0].org_id
    if (!memberships.some((m) => m.org_id === target)) throw new ApiError('forbidden', 'Not a member of that organisation')
    s.setSession({ userId, orgId: target })
    return meSync()
  })
}

export async function signOut(): Promise<void> {
  return call(() => {
    getStore().setSession({ userId: null, orgId: null })
  })
}

export async function switchOrg(orgId: string): Promise<Me> {
  return call(() => {
    const s = getStore()
    const { userId } = s.getSession()
    if (!userId) throw new ApiError('unauthenticated', 'Sign in to continue.')
    if (!s.where('memberships', (m) => m.user_id === userId && m.org_id === orgId && m.status === 'active').length) {
      throw new ApiError('forbidden', 'Not a member of that organisation')
    }
    s.setSession({ orgId })
    return meSync()
  })
}

export function meSync(): Me {
  const s = getStore()
  const user = currentUser()
  if (!user) throw new ApiError('unauthenticated', 'Sign in to continue.')
  const ctx = authContext()
  const org = s.get('organisations', ctx.orgId)
  const orgs = s
    .where('memberships', (m) => m.user_id === user.id && m.status === 'active')
    .map((m) => {
      const o = s.get('organisations', m.org_id)
      return { id: o.id, name: o.name, type: o.type, role: m.role }
    })
  return {
    user: { id: user.id, name: user.name, email: user.email, jobTitle: user.job_title ?? '', mfaEnabled: user.mfa_enabled },
    org: { id: org.id, name: org.name, type: org.type, initials: org.initials ?? org.name.slice(0, 2).toUpperCase(), country: org.country },
    role: ctx.orgRole,
    orgs,
    ctx,
  }
}

/** Synchronous session probe for route guards (no latency). Returns null when signed out. */
export function sessionProbe(): Me | null {
  try {
    return meSync()
  } catch {
    return null
  }
}

export async function me(): Promise<Me> {
  return call(meSync)
}
