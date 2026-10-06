/** Staff administration: clients, templates, users of an org. */
import type { FlagState } from '@/domain/enums'
import type { WorkflowTemplate } from '@/domain/workflow/template.schema'
import { authorize, call, getStore } from './core'
import { listSync as featuresSync, type FeatureView } from './features'

export interface ClientRow {
  orgId: string
  name: string
  legalName: string
  country: string
  users: number
  ongoing: number
  closed: number
  verifiedInventories: number
  verifiedUnits: number
  flags: FeatureView[]
  /** R2 portfolios (PRD FR-78), read-only in R1. */
  portfolioManagerName: string | null
}

export async function clients(): Promise<ClientRow[]> {
  return call(() => {
    authorize('staff.clients')
    const s = getStore()
    return s
      .where('organisations', (o) => o.type === 'client')
      .map((o) => {
        const services = s.where('services', (x) => x.org_id === o.id && !x.deleted_at)
        return {
          orgId: o.id,
          name: o.name,
          legalName: o.legal_name,
          country: o.country,
          users: s.where('memberships', (m) => m.org_id === o.id && m.status === 'active').length,
          ongoing: services.filter((x) => !['draft', 'closed', 'cancelled'].includes(x.status)).length,
          closed: services.filter((x) => x.status === 'closed').length,
          verifiedInventories: s.where('inventories', (i) => i.org_id === o.id && i.status === 'verified').length,
          verifiedUnits: s.where('decarbRecords', (d) => d.org_id === o.id && d.status === 'verified').reduce((a, d) => a + (d.verified_reduction_units ?? 0) + (d.verified_removal_units ?? 0), 0),
          flags: featuresSync(o.id),
          portfolioManagerName: o.portfolio_manager_user_id ? (s.find('users', o.portfolio_manager_user_id)?.name ?? null) : null,
        }
      })
  })
}

export async function templates(): Promise<WorkflowTemplate[]> {
  return call(() => {
    authorize('staff.templates')
    return getStore().all('templates')
  })
}

export interface OrgUser {
  id: string
  name: string
  email: string
  jobTitle: string
  role: string
}

export async function orgUsers(orgId: string): Promise<OrgUser[]> {
  return call(() => {
    authorize('org.read', { orgId })
    const s = getStore()
    return s.where('memberships', (m) => m.org_id === orgId && m.status === 'active').map((m) => {
      const u = s.get('users', m.user_id)
      return { id: u.id, name: u.name, email: u.email, jobTitle: u.job_title ?? '', role: m.role }
    })
  })
}

export type { FlagState }
