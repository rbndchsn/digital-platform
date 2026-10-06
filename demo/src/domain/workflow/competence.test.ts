import { describe, expect, it } from 'vitest'
import { checkCompetence, qualificationStatus, type QualificationLike } from './competence'
import { templateFor } from './templates'

const q = (kind: QualificationLike['kind'], validUntil: string, extra: Partial<QualificationLike> = {}): QualificationLike => ({ kind, sector_scopes_json: ['dairy'], technical_areas_json: ['ghg_inventory'], programmes_json: ['iso14064'], valid_from: '2024-01-01', valid_until: validUntil, ...extra })
const service = { programme: 'iso14064', sector_scopes: ['dairy'], technical_areas: ['ghg_inventory'], execution_start: '2027-02-01', execution_end: '2027-04-30' }
const requirements = templateFor('iso14064_1_inventory_verification').competence_requirements

describe('competence (PRD v0.3 FR-94–FR-96)', () => {
  it('computes the qualification status from the expiry date', () => {
    expect(qualificationStatus({ valid_from: '2024-01-01', valid_until: '2029-01-01' }, '2027-01-01')).toBe('valid')
    expect(qualificationStatus({ valid_from: '2024-01-01', valid_until: '2027-03-01' }, '2027-01-01')).toBe('expiring')
    expect(qualificationStatus({ valid_from: '2024-01-01', valid_until: '2026-12-31' }, '2027-01-01')).toBe('expired')
  })

  it('a valid lead qualification covering the execution window passes', () => {
    const r = checkCompetence({ role: 'verifier_team_leader', candidate: [q('lead_verifier', '2029-01-01')], team: [], requirements, service })
    expect(r.result).toBe('ok')
    expect(r.blocked).toBe(false)
  })

  it('a missing or expiring qualification is a warning the manager may override', () => {
    const missing = checkCompetence({ role: 'verifier_team_leader', candidate: [q('verifier', '2029-01-01')], team: [], requirements, service })
    expect(missing.result).toBe('warning')
    expect(missing.items[0].detail).toMatch(/No lead verifier qualification/)
    const expiring = checkCompetence({ role: 'verifier_team_leader', candidate: [q('lead_verifier', '2027-03-15')], team: [], requirements, service })
    expect(expiring.result).toBe('warning')
    expect(expiring.items[0].detail).toMatch(/Expires on 2027-03-15/)
  })

  it('an unqualified independent reviewer is a hard block', () => {
    const r = checkCompetence({ role: 'verifier_independent_reviewer', candidate: [q('lead_verifier', '2029-01-01')], team: [], requirements, service })
    expect(r.result).toBe('block')
    expect(r.blocked).toBe(true)
    const expired = checkCompetence({ role: 'verifier_independent_reviewer', candidate: [q('independent_reviewer', '2026-06-30')], team: [], requirements, service })
    expect(expired.blocked).toBe(true)
  })

  it('team coverage of the sector scope is checked across the whole team', () => {
    const gap = checkCompetence({ role: 'verifier_auditor', candidate: [q('verifier', '2029-01-01', { sector_scopes_json: ['energy'] })], team: [], requirements, service: { ...service, sector_scopes: ['dairy', 'energy'] } })
    expect(gap.items.find((i) => i.key === 'team_coverage')!.result).toBe('warning')
    expect(gap.items.find((i) => i.key === 'team_coverage')!.detail).toMatch(/dairy/)
    const covered = checkCompetence({ role: 'verifier_auditor', candidate: [q('verifier', '2029-01-01', { sector_scopes_json: ['energy'] })], team: [q('lead_verifier', '2029-01-01')], requirements, service: { ...service, sector_scopes: ['dairy', 'energy'] } })
    expect(covered.items.find((i) => i.key === 'team_coverage')!.result).toBe('ok')
  })
})
