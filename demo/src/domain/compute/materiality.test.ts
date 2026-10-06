import { describe, expect, it } from 'vitest'
import { aggregateMisstatements, consistencyWarning, proposeMisstatement, thresholdAbs, type MisstatementLike } from './materiality'

const setting = { assertion_base: 'total_gross_tco2e' as const, assertion_declared_value: 100_000, assertion_unit: 'tCO2e', threshold_pct: 5, threshold_abs: null }
const m = (over: Partial<MisstatementLike>): MisstatementLike => ({ direction: 'overstatement', amount: 1000, amount_unit: 'tCO2e', nature: 'quantitative', material_candidate: false, status: 'confirmed', corrected: false, ...over })

describe('materiality (PRD v0.3 FR-84–FR-87)', () => {
  it('derives the absolute threshold from the percentage and the declared assertion', () => {
    expect(thresholdAbs(5, 100_000)).toBe(5000)
    expect(thresholdAbs(5, null)).toBeNull()
  })

  it('aggregates gross and net over confirmed, uncorrected quantitative misstatements only', () => {
    const agg = aggregateMisstatements(
      [m({ amount: 3000 }), m({ amount: 2500, direction: 'understatement' }), m({ amount: 9000, corrected: true }), m({ amount: 9000, status: 'proposed' }), m({ amount: 9000, status: 'dismissed' }), m({ nature: 'qualitative', amount: 0 })],
      setting,
      'unqualified',
    )
    expect(agg.gross).toBe(5500)
    expect(agg.net).toBe(500)
    expect(agg.gross_pct).toBe(5.5)
    expect(agg.threshold_abs).toBe(5000)
    expect(agg.exceeds).toBe(true)
    expect(agg.qualitative_count).toBe(1)
    expect(agg.corrected_count).toBe(1)
    expect(agg.warning).toBe(true)
    expect(agg.warning_reason).toMatch(/meet or exceed materiality/)
  })

  it('raises the warning only against a clean opinion type, never as a block', () => {
    expect(consistencyWarning({ exceeds: true, materialQualitative: false, draftOpinionType: 'qualified' }).raised).toBe(false)
    expect(consistencyWarning({ exceeds: true, materialQualitative: false, draftOpinionType: 'adverse' }).raised).toBe(false)
    expect(consistencyWarning({ exceeds: false, materialQualitative: true, draftOpinionType: 'unqualified' }).raised).toBe(true)
    expect(consistencyWarning({ exceeds: false, materialQualitative: false, draftOpinionType: 'unqualified' }).raised).toBe(false)
    expect(consistencyWarning({ exceeds: true, materialQualitative: false, draftOpinionType: null }).raised).toBe(false)
  })

  it('below the threshold nothing is raised', () => {
    const agg = aggregateMisstatements([m({ amount: 1200 }), m({ amount: 800, direction: 'understatement' })], setting, 'unqualified')
    expect(agg.gross).toBe(2000)
    expect(agg.net).toBe(400)
    expect(agg.exceeds).toBe(false)
    expect(agg.warning).toBe(false)
  })

  it('proposes a misstatement from an adjusted-versus-declared difference with the right direction', () => {
    expect(proposeMisstatement(1000, 900)).toEqual({ direction: 'overstatement', amount: 100 })
    expect(proposeMisstatement(1000, 1250)).toEqual({ direction: 'understatement', amount: 250 })
    expect(proposeMisstatement(1000, 1000)).toBeNull()
  })
})
