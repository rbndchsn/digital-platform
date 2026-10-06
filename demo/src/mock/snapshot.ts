/** Builds the ServiceSnapshot the domain's next-action function expects, from the tables. */
import type { ServiceSnapshot } from '@/domain/workflow/next-action'
import type { Tables } from './store'

export function snapshotFrom(t: Pick<Tables, 'services' | 'phases' | 'steps' | 'slots' | 'approvals' | 'team' | 'cois' | 'findings' | 'iterations'>, serviceId: string): ServiceSnapshot {
  const service = t.services.find((s) => s.id === serviceId)
  if (!service) throw new Error(`service ${serviceId} not found`)
  return {
    service,
    phases: t.phases.filter((p) => p.service_id === serviceId),
    steps: t.steps.filter((s) => s.service_id === serviceId),
    slots: t.slots.filter((s) => s.service_id === serviceId),
    approvals: t.approvals.filter((a) => a.service_id === serviceId),
    team: t.team
      .filter((m) => m.service_id === serviceId)
      .map((m) => ({ ...m, coi: t.cois.find((c) => c.service_team_id === m.id) ?? null })),
    findings: t.findings.filter((f) => f.service_id === serviceId),
    iterations: t.iterations.filter((i) => i.service_id === serviceId),
  }
}
