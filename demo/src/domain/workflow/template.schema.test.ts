import { describe, expect, it } from 'vitest'
import { WorkflowTemplate, validateTemplate } from './template.schema'
import { templateFor } from './templates'

describe('template validation (PRD v0.3 FR-80)', () => {
  it('accepts every shipped template', () => {
    for (const type of ['iso14064_1_inventory_verification', 'vcs_validation', 'decarb_units_verification'] as const) expect(validateTemplate(templateFor(type))).toEqual([])
  })

  it('rejects a protected approval in an overridable step and an unprotected opinion step', () => {
    const t = WorkflowTemplate.parse(JSON.parse(JSON.stringify(templateFor('iso14064_1_inventory_verification'))))
    const cpf = t.phases[0].steps.find((s) => s.key === 'desk_review_cpf')!
    cpf.non_overridable = false
    const opinion = t.phases[2].steps.find((s) => s.key === 'final_opinion')!
    opinion.non_overridable = false
    const errors = validateTemplate(t)
    expect(errors.some((e) => e.includes('Review of the CPF') && e.includes('Technical scope'))).toBe(true)
    expect(errors.some((e) => e.includes('Final opinion'))).toBe(true)
  })

  it('rejects inconsistent assurance defaults', () => {
    const t = WorkflowTemplate.parse(JSON.parse(JSON.stringify(templateFor('vcs_validation'))))
    t.assurance = { applies: false, default: 'reasonable' }
    expect(validateTemplate(t)).toContain('A template where assurance does not apply must default to not_applicable.')
    const v = WorkflowTemplate.parse(JSON.parse(JSON.stringify(templateFor('iso14064_1_inventory_verification'))))
    v.materiality_defaults = null
    expect(validateTemplate(v)).toContain('A verification template needs materiality defaults.')
  })

  it('parses with defaults so older template JSON still loads', () => {
    const minimal = WorkflowTemplate.parse({ id: 't', verifier_org_id: 'o', service_type: 'design_change', name: 'n', standard: 's', version: 1, phases: templateFor('design_change').phases })
    expect(minimal.assurance.applies).toBe(true)
    expect(minimal.complaint_targets.decide_days).toBe(30)
    expect(minimal.phases[0].steps[0].non_overridable).toBe(false)
  })
})
