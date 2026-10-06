import { describe, expect, it } from 'vitest'
import { UnitError } from '../units'
import { computeDecarb, computeProfile, unitsFromFactors } from './decarb'

const co2 = (t: number) => ({ gas: 'CO2' as const, gas_detail: null, tonnes_gas: t, custom_gwp: null })
const ch4 = (t: number) => ({ gas: 'CH4' as const, gas_detail: null, tonnes_gas: t, custom_gwp: null })

describe('decarb compute', () => {
  it('milk example: 3.4 → 3.0 tCO2e/t on 1,000,000 t attributed = 400,000 units', () => {
    // Farm reference output 5,000,000 t; baseline 17,000,000 tCO2e gross; project 15,000,000.
    const result = computeDecarb({
      baseline: { gwp_set: 'AR6', gases: [co2(17_000_000)], biogenic_co2_t: 0, removals_tco2e: 0, reference_volume: 5_000_000, volume_unit: 't' },
      project: { gwp_set: 'AR6', gases: [co2(15_000_000)], biogenic_co2_t: 0, removals_tco2e: 0, reference_volume: 5_000_000, volume_unit: 't' },
      attributed_volume: 1_000_000,
      volume_unit: 't',
    })
    expect(result.baseline.ef_gross).toBe(3.4)
    expect(result.project.ef_gross).toBe(3)
    expect(result.decarb_factor_gross).toBeCloseTo(0.4, 6)
    expect(result.reduction_units).toBe(400_000)
    expect(result.factor_unit).toBe('tCO2e/t')
    expect(result.diagnostics).toEqual([])
  })

  it('EF-level helper gives the same answer and converts kg to t', () => {
    expect(unitsFromFactors(3.4, 3.0, 'tCO2e/t', 1_000_000, 't').units).toBe(400_000)
    // 3.4 kgCO2e/kg == 3.4 tCO2e/t ; 1,000,000 kg == 1,000 t → 400 units
    expect(unitsFromFactors(3.4, 3.0, 'kgCO2e/kg', 1_000_000, 'kg').units).toBe(400)
  })

  it('throws on kg/L mismatch instead of silently converting', () => {
    expect(() => unitsFromFactors(3.4, 3.0, 'kgCO2e/kg', 1_000_000, 'L')).toThrow(UnitError)
    expect(() =>
      computeDecarb({
        baseline: { gwp_set: 'AR6', gases: [co2(100)], biogenic_co2_t: 0, removals_tco2e: 0, reference_volume: 100, volume_unit: 't' },
        project: { gwp_set: 'AR6', gases: [co2(90)], biogenic_co2_t: 0, removals_tco2e: 0, reference_volume: 100, volume_unit: 't' },
        attributed_volume: 50,
        volume_unit: 'L',
      }),
    ).toThrow(/mass/)
  })

  it('keeps removals and biogenic separate and flags negative reductions', () => {
    const result = computeDecarb({
      baseline: { gwp_set: 'AR6', gases: [co2(80), ch4(1)], biogenic_co2_t: 10, removals_tco2e: 0, reference_volume: 100, volume_unit: 't' },
      project: { gwp_set: 'AR6', gases: [co2(85), ch4(1)], biogenic_co2_t: 4, removals_tco2e: 20, reference_volume: 100, volume_unit: 't' },
      attributed_volume: 100,
      volume_unit: 't',
    })
    expect(result.reduction_units).toBe(-5)
    expect(result.removal_units).toBe(20)
    expect(result.biogenic_delta_tco2e).toBe(6)
    expect(result.diagnostics.map((d) => d.code)).toContain('negative_reduction')
  })

  it('warns when attributed volume exceeds the project reference volume', () => {
    const result = computeDecarb({
      baseline: { gwp_set: 'AR6', gases: [co2(100)], biogenic_co2_t: 0, removals_tco2e: 0, reference_volume: 100, volume_unit: 't' },
      project: { gwp_set: 'AR6', gases: [co2(90)], biogenic_co2_t: 0, removals_tco2e: 0, reference_volume: 100, volume_unit: 't' },
      attributed_volume: 150,
      volume_unit: 't',
    })
    expect(result.diagnostics.map((d) => d.code)).toContain('volume_exceeds_reference')
  })

  it('computeProfile rejects a zero reference volume', () => {
    expect(() =>
      computeProfile({ gwp_set: 'AR5', gases: [co2(1)], biogenic_co2_t: 0, removals_tco2e: 0, reference_volume: 0, volume_unit: 't' }),
    ).toThrow(UnitError)
  })
})
