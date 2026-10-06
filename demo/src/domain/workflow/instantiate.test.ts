import { describe, expect, it } from 'vitest'
import { instantiateTemplate } from './instantiate'
import { WORKFLOW_TEMPLATES, templateFor } from './templates'

describe('templates', () => {
  it('defines all eight service types with three phases each', () => {
    expect(WORKFLOW_TEMPLATES).toHaveLength(8)
    for (const t of WORKFLOW_TEMPLATES) {
      expect(t.phases.map((p) => p.key)).toEqual(['contracting', 'planning', 'execution'])
      expect(t.phases[2].steps.some((s) => s.is_opinion_step)).toBe(true)
    }
  })
  it('gives inventory verification inventory-specific slots', () => {
    const t = templateFor('iso14064_1_inventory_verification')
    const desk = t.phases[2].steps.find((s) => s.key === 'desk_review')!
    expect(desk.slots.map((s) => s.key)).toContain('inventory_workbook')
  })
})

describe('instantiateTemplate', () => {
  it('creates phases, steps, slots and approvals with sequential planned dates', () => {
    let n = 0
    const out = instantiateTemplate({
      serviceId: 'svc_1',
      template: templateFor('decarb_units_verification'),
      startDate: '2026-01-05',
      now: '2026-01-05T09:00:00Z',
      actorId: 'usr_mgr',
      newId: (p) => `${p}_${++n}`,
    })
    expect(out.phases).toHaveLength(3)
    expect(out.steps.filter((s) => s.phase_id === out.phases[0].id)).toHaveLength(5)
    expect(out.steps[0].planned_start).toBe('2026-01-05')
    expect(out.steps[0].planned_end).toBe('2026-01-10')
    expect(out.steps[1].planned_start).toBe('2026-01-10')
    expect(out.slots.find((s) => s.key === 'cpf')?.required).toBe(true)
    expect(out.approvals.filter((a) => a.kind === 'impartiality')).toHaveLength(1)
    expect(out.phases[0].planned_end).toBe(out.phases[1].planned_start)
    expect(out.steps.every((s) => s.status === 'not_started')).toBe(true)
  })
})
