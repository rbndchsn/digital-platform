/** Feature flags with preview state and interest capture (PRD §6.11; plan_v1 §2.2). */
import type { FlagState } from '@/domain/enums'
import type { FeatureFlag, FeatureInterest } from '@/domain/schemas'
import { audit, authContext, authorize, call, getStore, newId, nowIsoString, orgName, userName } from './core'

export interface FeatureView extends FeatureFlag {
  state: FlagState
  interested: boolean
  interestCount: number
}

export function effectiveState(flag: FeatureFlag, orgId: string): FlagState {
  const o = getStore().where('flagOverrides', (x) => x.org_id === orgId && x.flag_key === flag.key)[0]
  return o?.state ?? flag.default_state
}

export function listSync(orgId?: string): FeatureView[] {
  const s = getStore()
  const ctx = authContext()
  const org = orgId ?? ctx.orgId
  return s.all('featureFlags').map((f) => ({
    ...f,
    state: effectiveState(f, org),
    interested: s.where('featureInterest', (i) => i.flag_key === f.key && i.user_id === ctx.userId).length > 0,
    interestCount: s.where('featureInterest', (i) => i.flag_key === f.key && i.org_id === org).length,
  }))
}

export async function list(): Promise<FeatureView[]> {
  return call(() => listSync())
}

export function stateSync(key: string): FlagState {
  try {
    const s = getStore()
    const flag = s.all('featureFlags').find((f) => f.key === key)
    if (!flag) return 'hidden'
    return effectiveState(flag, authContext().orgId)
  } catch {
    return 'hidden'
  }
}

export async function registerInterest(key: string, note?: string): Promise<FeatureView> {
  return call(() => {
    const ctx = authorize('feature.interest')
    const s = getStore()
    const flag = s.all('featureFlags').find((f) => f.key === key)
    if (!flag) throw new Error('Unknown feature')
    const existing = s.where('featureInterest', (i) => i.flag_key === key && i.user_id === ctx.userId)[0]
    if (existing) {
      if (note) s.update('featureInterest', existing.id, { note })
    } else {
      const row: FeatureInterest = { id: newId('fi'), org_id: ctx.orgId, user_id: ctx.userId, flag_key: key, note: note ?? null, created_at: nowIsoString() }
      s.insert('featureInterest', row)
    }
    audit(ctx, { orgId: ctx.orgId, serviceId: null, eventType: 'feature.interest', entityType: 'feature_flag', entityId: key, summary: `${userName(ctx.userId)} is interested in "${flag.title}"${note ? `: ${note}` : ''}` })
    return listSync().find((f) => f.key === key)!
  })
}

export interface InterestRow {
  id: string
  flagKey: string
  flagTitle: string
  orgId: string
  orgName: string
  userName: string
  note: string | null
  createdAt: string
}

export async function staffInterest(): Promise<InterestRow[]> {
  return call(() => {
    authorize('staff.clients')
    const s = getStore()
    return s
      .all('featureInterest')
      .map((i) => ({ id: i.id, flagKey: i.flag_key, flagTitle: s.all('featureFlags').find((f) => f.key === i.flag_key)?.title ?? i.flag_key, orgId: i.org_id, orgName: orgName(i.org_id), userName: userName(i.user_id), note: i.note, createdAt: i.created_at }))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  })
}

export async function setOverride(orgId: string, key: string, state: FlagState | null): Promise<FeatureView[]> {
  return call(() => {
    const ctx = authorize('org.manage_flags')
    const s = getStore()
    const existing = s.where('flagOverrides', (x) => x.org_id === orgId && x.flag_key === key)
    for (const e of existing) {
      const idx = s.all('flagOverrides').indexOf(e)
      if (idx >= 0) s.all('flagOverrides').splice(idx, 1)
    }
    if (state) s.insert('flagOverrides', { org_id: orgId, flag_key: key, state })
    audit(ctx, { orgId, serviceId: null, eventType: 'feature.override', entityType: 'feature_flag', entityId: key, summary: `Feature "${key}" set to ${state ?? 'default'} for ${orgName(orgId)}` })
    return listSync(orgId)
  })
}
