/**
 * Rotation rules (PRD v0.3 FR-97, FR-98). Pure functions over engagement history: how many consecutive prior
 * engagements a person held a role on, for the same project or the same client; the VVB-level rule counts the
 * body regardless of person and can only warn (one verifier organisation in Release 1, plan_v1 §8 D22).
 */
import type { CheckResult, RotationRole, ServiceRole } from '../enums'
import type { CheckItem } from '../schemas/engagement'
import type { RotationRule } from './template.schema'

export interface EngagementHistoryRow {
  reference: string
  projectId: string | null
  clientOrgId: string
  periodStart: string
  periodEnd: string
  /** Service roles held on that engagement, by user id. */
  roles: { userId: string; role: ServiceRole }[]
}

export interface RotationCheckInput {
  rules: RotationRule[]
  /** Completed (issued or closed) engagements plus legacy rows, excluding the service being staffed. */
  history: EngagementHistoryRow[]
  service: { projectId: string | null; clientOrgId: string; periodStart: string }
  candidateUserId: string
  role: ServiceRole
}

export interface RotationCheckItem extends CheckItem {
  rule: RotationRule
  count: number
  chain: string[]
}

export interface RotationCheck {
  items: RotationCheckItem[]
  result: CheckResult
  blocked: boolean
}

function inScope(row: EngagementHistoryRow, rule: RotationRule, service: RotationCheckInput['service']): boolean {
  return rule.scope === 'same_project' ? row.projectId != null && row.projectId === service.projectId : row.clientOrgId === service.clientOrgId
}

/**
 * Consecutive prior engagements, newest first, where the person held the role (or, for `vvb`, where the body did
 * the engagement). The chain breaks at the first in-scope engagement where the condition does not hold.
 */
export function consecutiveEngagements(rows: EngagementHistoryRow[], rule: RotationRule, service: RotationCheckInput['service'], userId: string, role: ServiceRole): EngagementHistoryRow[] {
  const scoped = rows.filter((r) => inScope(r, rule, service) && r.periodStart < service.periodStart).sort((a, b) => (a.periodEnd < b.periodEnd ? 1 : -1))
  const chain: EngagementHistoryRow[] = []
  for (const r of scoped) {
    const held = rule.role === 'vvb' ? true : r.roles.some((x) => x.userId === userId && x.role === role)
    if (!held) break
    chain.push(r)
  }
  return chain
}

export function appliesTo(rule: RotationRule, role: ServiceRole): boolean {
  return (rule.role as string) === role
}

export function checkRotation(input: RotationCheckInput): RotationCheck {
  const items: RotationCheckItem[] = []
  for (const rule of input.rules.filter((r) => appliesTo(r, input.role))) {
    const chain = consecutiveEngagements(input.history, rule, input.service, input.candidateUserId, input.role)
    const count = chain.length
    const breach = count >= rule.max_consecutive
    const scopeLabel = rule.scope === 'same_project' ? 'this project' : 'this client'
    items.push({
      key: `rotation:${rule.role}:${rule.scope}`,
      requirement: `At most ${rule.max_consecutive} consecutive engagements as ${labelRole(rule.role)} on ${scopeLabel}`,
      result: breach ? (rule.on_breach === 'block' ? 'block' : 'warning') : 'ok',
      detail: count === 0 ? `No prior engagement in this role on ${scopeLabel}.` : `${count} consecutive prior engagement${count === 1 ? '' : 's'} on ${scopeLabel}: ${chain.map((c) => c.reference).join(', ')}${breach ? ` — limit of ${rule.max_consecutive} reached; cooling-off of ${rule.cooling_off_periods} period${rule.cooling_off_periods === 1 ? '' : 's'} applies.` : '.'}`,
      rule,
      count,
      chain: chain.map((c) => c.reference),
    })
  }
  const result: CheckResult = items.some((i) => i.result === 'block') ? 'block' : items.some((i) => i.result === 'warning') ? 'warning' : 'ok'
  return { items, result, blocked: result === 'block' }
}

/** VVB-level check at triage (PRD FR-98): counts the body's consecutive engagements; warn only. */
export function checkVvbRotation(rules: RotationRule[], history: EngagementHistoryRow[], service: RotationCheckInput['service']): RotationCheckItem[] {
  return rules
    .filter((r) => r.role === 'vvb')
    .map((rule) => {
      const chain = consecutiveEngagements(history, rule, service, '', 'verifier_team_leader')
      const breach = chain.length >= rule.max_consecutive
      const scopeLabel = rule.scope === 'same_project' ? 'this project' : 'this client'
      return {
        key: `rotation:vvb:${rule.scope}`,
        requirement: `VERIFASSUR at most ${rule.max_consecutive} consecutive engagements on ${scopeLabel}`,
        result: breach ? 'warning' : 'ok',
        detail: chain.length === 0 ? `No prior engagement on ${scopeLabel}.` : `${chain.length} consecutive prior engagement${chain.length === 1 ? '' : 's'}: ${chain.map((c) => c.reference).join(', ')}${breach ? ' — limit reached; consider declining or documenting the decision.' : '.'}`,
        rule,
        count: chain.length,
        chain: chain.map((c) => c.reference),
      } satisfies RotationCheckItem
    })
}

function labelRole(role: RotationRole): string {
  const map: Record<RotationRole, string> = { verifier_team_leader: 'team leader', verifier_auditor: 'auditor', verifier_technical_expert: 'technical expert', verifier_independent_reviewer: 'independent reviewer', vvb: 'the verification body' }
  return map[role]
}
