import { describe, expect, it } from 'vitest'
import { checkRotation, checkVvbRotation, consecutiveEngagements, type EngagementHistoryRow } from './rotation'
import type { RotationRule } from './template.schema'

const rule: RotationRule = { role: 'verifier_team_leader', scope: 'same_client', max_consecutive: 3, cooling_off_periods: 1, on_breach: 'warn' }
const row = (reference: string, year: number, tl: string | null, projectId = 'p1'): EngagementHistoryRow => ({ reference, projectId, clientOrgId: 'c1', periodStart: `${year}-01-01`, periodEnd: `${year}-12-31`, roles: tl ? [{ userId: tl, role: 'verifier_team_leader' }] : [] })
const service = { projectId: 'p1', clientOrgId: 'c1', periodStart: '2026-01-01' }

describe('rotation (PRD v0.3 FR-97, FR-98)', () => {
  it('counts consecutive prior engagements where the person held the role, newest first, breaking at the first gap', () => {
    const history = [row('A', 2022, 'u_x'), row('B', 2023, 'u_marcus'), row('C', 2024, 'u_marcus'), row('D', 2025, 'u_marcus')]
    expect(consecutiveEngagements(history, rule, service, 'u_marcus', 'verifier_team_leader').map((r) => r.reference)).toEqual(['D', 'C', 'B'])
    expect(consecutiveEngagements(history, rule, service, 'u_x', 'verifier_team_leader')).toEqual([])
  })

  it('warns at the limit and blocks when the rule says so', () => {
    const history = [row('B', 2023, 'u_marcus'), row('C', 2024, 'u_marcus'), row('D', 2025, 'u_marcus')]
    const warn = checkRotation({ rules: [rule], history, service, candidateUserId: 'u_marcus', role: 'verifier_team_leader' })
    expect(warn.result).toBe('warning')
    expect(warn.items[0].count).toBe(3)
    expect(warn.items[0].detail).toMatch(/limit of 3 reached/)
    const block = checkRotation({ rules: [{ ...rule, on_breach: 'block' }], history, service, candidateUserId: 'u_marcus', role: 'verifier_team_leader' })
    expect(block.blocked).toBe(true)
    const fine = checkRotation({ rules: [rule], history: history.slice(1), service, candidateUserId: 'u_marcus', role: 'verifier_team_leader' })
    expect(fine.result).toBe('ok')
    expect(fine.items[0].count).toBe(2)
  })

  it('ignores rules for other roles and engagements outside the scope or after the service period', () => {
    const history = [row('B', 2023, 'u_marcus', 'p2'), row('F', 2027, 'u_marcus')]
    const projectRule: RotationRule = { ...rule, scope: 'same_project' }
    expect(checkRotation({ rules: [projectRule], history, service, candidateUserId: 'u_marcus', role: 'verifier_team_leader' }).items[0].count).toBe(0)
    expect(checkRotation({ rules: [projectRule], history, service, candidateUserId: 'u_marcus', role: 'verifier_auditor' }).items).toEqual([])
  })

  it('the VVB-level rule counts the body and only warns (one verifier organisation in Release 1)', () => {
    const vvb: RotationRule = { role: 'vvb', scope: 'same_project', max_consecutive: 2, cooling_off_periods: 1, on_breach: 'block' }
    const items = checkVvbRotation([vvb], [row('B', 2023, null), row('C', 2024, 'u_x'), row('D', 2025, null)], service)
    expect(items[0].count).toBe(3)
    expect(items[0].result).toBe('warning')
  })
})
