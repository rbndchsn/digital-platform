/** Client home, staff "My Work" and triage queue (PRD FR-54). */
import type { ServiceStatus } from '@/domain/enums'
import { todayIso } from '@/mock/clock'
import { authContext, authorize, call, getStore, nowIsoString, orgName } from './core'
import { eligibleManagersSync } from './involved'
import { listSync as notificationsSync, type NotificationView } from './notifications'
import { toListItem, type ServiceListItem } from './services'

export interface ClientDashboard {
  year: number
  ongoing: number
  completedThisYear: number
  needsAction: ServiceListItem[]
  waitingOnVerifier: ServiceListItem[]
  notifications: NotificationView[]
  records: { inventories: number; verifiedInventories: number; emissionFactors: number; decarbRecords: number; verifiedUnits: number; withdrawn: number }
  latestVerified: { year: number; scope1: number; scope2: number; scope3: number; statementCode: string | null; levelOfAssurance: string | null } | null
  /** PRD v0.3: open complaints and appeals of the organisation. */
  casesOpen: number
}

const ONGOING: ServiceStatus[] = ['requested', 'triage', 'contracting', 'planning', 'execution', 'opinion_review', 'issued', 'on_hold', 'in_revision']

export async function client(): Promise<ClientDashboard> {
  return call(() => {
    const ctx = authorize('service.read', { orgId: authContext().orgId })
    const s = getStore()
    const year = Number(todayIso().slice(0, 4))
    const services = s.where('services', (x) => x.org_id === ctx.orgId && !x.deleted_at && x.status !== 'draft').map(toListItem)
    const ongoing = services.filter((x) => ONGOING.includes(x.status))
    const needsAction = ongoing.filter((x) => x.actionForMe).sort((a, b) => ((a.nextAction?.due ?? '9') < (b.nextAction?.due ?? '9') ? -1 : 1))
    const waiting = ongoing.filter((x) => !x.actionForMe && x.nextAction)
    const inventories = s.where('inventories', (i) => i.org_id === ctx.orgId && !i.deleted_at)
    const latest = inventories.filter((i) => i.verified_totals_json && i.status === 'verified').sort((a, b) => b.year - a.year)[0]
    const decarb = s.where('decarbRecords', (d) => d.org_id === ctx.orgId && !d.deleted_at)
    const efs = s.where('emissionFactors', (e) => e.org_id === ctx.orgId && !e.deleted_at)
    return {
      year,
      ongoing: ongoing.length,
      completedThisYear: services.filter((x) => x.status === 'closed' && (x.closedAt ?? '').startsWith(String(year))).length,
      needsAction,
      waitingOnVerifier: waiting,
      notifications: notificationsSync({ limit: 6 }),
      records: {
        inventories: inventories.length,
        verifiedInventories: inventories.filter((i) => i.status === 'verified').length,
        emissionFactors: efs.length,
        decarbRecords: decarb.length,
        verifiedUnits: decarb.filter((d) => d.status === 'verified').reduce((a, d) => a + (d.verified_reduction_units ?? 0) + (d.verified_removal_units ?? 0), 0),
        withdrawn: [...inventories, ...efs, ...decarb].filter((r) => r.assurance_status === 'withdrawn').length,
      },
      latestVerified: latest
        ? { year: latest.year, scope1: latest.verified_totals_json!.by_scope['1'] ?? 0, scope2: latest.verified_totals_json!.by_scope['2'] ?? 0, scope3: latest.verified_totals_json!.by_scope['3'] ?? 0, statementCode: latest.assurance_ref ? (s.find('statements', latest.assurance_ref)?.public_code ?? null) : null, levelOfAssurance: latest.level_of_assurance }
        : null,
      casesOpen: s.where('cases', (c) => c.org_id === ctx.orgId && ['received', 'acknowledged', 'under_investigation'].includes(c.status)).length,
    }
  })
}

export interface StaffDashboard {
  year: number
  ongoing: number
  completedThisYear: number
  myWork: ServiceListItem[]
  triage: ServiceListItem[]
  coiPending: { serviceId: string; serviceReference: string; coiId: string; role: string }[]
  notifications: NotificationView[]
  byClient: { orgId: string; orgName: string; ongoing: number }[]
  /** PRD v0.3: open and overdue complaints and appeals (managers), decisions waiting for a manager outside the involved set. */
  casesOpen: number
  casesOverdue: number
  decisionsWaiting: { serviceId: string; serviceReference: string; iterationNo: number; eligible: boolean }[]
}

export async function staff(): Promise<StaffDashboard> {
  return call(() => {
    const ctx = authContext()
    const s = getStore()
    const year = Number(todayIso().slice(0, 4))
    const orgWide = ctx.orgRole === 'verifier_manager' || ctx.orgRole === 'verifier_coordinator' || ctx.orgRole === 'verifier_finance'
    const all = s.where('services', (x) => x.verifier_org_id === ctx.orgId && !x.deleted_at && x.status !== 'draft')
    const mine = all.filter((x) => (ctx.serviceRoles[x.id]?.length ?? 0) > 0 || (orgWide && ONGOING.includes(x.status)))
    const myWork = mine.filter((x) => ONGOING.includes(x.status)).map(toListItem).sort((a, b) => Number(b.actionForMe) - Number(a.actionForMe) || ((a.nextAction?.due ?? '9') < (b.nextAction?.due ?? '9') ? -1 : 1))
    const triage = orgWide ? all.filter((x) => x.status === 'requested' || x.status === 'triage').map(toListItem) : []
    const coiPending = s
      .where('team', (t) => t.user_id === ctx.userId && t.status !== 'removed' && t.service_role !== 'client_contact')
      .map((t) => ({ t, coi: s.where('cois', (c) => c.service_team_id === t.id)[0] }))
      .filter((x) => x.coi && x.coi.status !== 'approved')
      .map((x) => ({ serviceId: x.t.service_id, serviceReference: s.get('services', x.t.service_id).reference, coiId: x.coi!.id, role: x.t.service_role }))
    const clients = new Map<string, number>()
    for (const x of all.filter((y) => ONGOING.includes(y.status))) clients.set(x.org_id, (clients.get(x.org_id) ?? 0) + 1)
    const now = nowIsoString()
    const openCases = ctx.orgRole === 'verifier_manager' ? s.where('cases', (c) => ['received', 'acknowledged', 'under_investigation'].includes(c.status)) : []
    const decisionsWaiting = ctx.orgRole === 'verifier_manager'
      ? s.where('iterations', (i) => i.status === 'manager_review').map((i) => ({ serviceId: i.service_id, serviceReference: s.get('services', i.service_id).reference, iterationNo: i.iteration_no, eligible: eligibleManagersSync(i.service_id).includes(ctx.userId) }))
      : []
    return {
      year,
      ongoing: all.filter((x) => ONGOING.includes(x.status)).length,
      completedThisYear: all.filter((x) => x.status === 'closed' && (x.closed_at ?? '').startsWith(String(year))).length,
      myWork,
      triage,
      coiPending,
      notifications: notificationsSync({ limit: 6 }),
      byClient: [...clients.entries()].map(([orgId, ongoing]) => ({ orgId, orgName: orgName(orgId), ongoing })).sort((a, b) => b.ongoing - a.ongoing),
      casesOpen: openCases.length,
      casesOverdue: openCases.filter((c) => (c.status === 'received' && c.acknowledge_target_at < now) || c.decide_target_at < now).length,
      decisionsWaiting,
    }
  })
}
