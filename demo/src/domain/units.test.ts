import { describe, expect, it } from 'vitest'
import { UnitError, assertSameDimension, efToBase, gwpFor, parseEfUnit, toBaseQuantity } from './units'

describe('units', () => {
  it('parses emission factor units', () => {
    expect(parseEfUnit('kgCO2e/kg')).toEqual({ co2e: 'kgCO2e', good: 'kg' })
    expect(() => parseEfUnit('gCO2e/kg')).toThrow(UnitError)
    expect(() => parseEfUnit('kgCO2e')).toThrow(UnitError)
  })

  it('converts quantities to base units', () => {
    expect(toBaseQuantity(1_000_000, 'kg')).toEqual({ value: 1000, base: 't', dimension: 'mass' })
    expect(toBaseQuantity(2500, 'kWh').value).toBeCloseTo(2.5)
    expect(() => toBaseQuantity(1, 'gallon')).toThrow(UnitError)
  })

  it('converts emission factors to tCO2e per base good unit', () => {
    expect(efToBase(3.4, 'kgCO2e/kg')).toEqual({ value: 3.4, unit: 'tCO2e/t', dimension: 'mass' })
    expect(efToBase(3.4, 'tCO2e/t').value).toBe(3.4)
    expect(efToBase(3400, 'kgCO2e/t').value).toBeCloseTo(3.4)
    expect(efToBase(0.5, 'kgCO2e/kWh')).toEqual({ value: 0.5, unit: 'tCO2e/MWh', dimension: 'energy' })
  })

  it('rejects factor/volume dimension mismatches', () => {
    expect(() => assertSameDimension('kgCO2e/kg', 'L')).toThrow(/unit_mismatch|per mass/)
    expect(() => assertSameDimension('kgCO2e/kg', 't')).not.toThrow()
  })

  it('resolves GWP values', () => {
    expect(gwpFor('AR5', 'CH4')).toBe(28)
    expect(gwpFor('AR6', 'CH4')).toBe(27.9)
    expect(gwpFor('AR6', 'CH4', 'CH4-fossil')).toBe(29.8)
    expect(gwpFor('AR5', 'N2O')).toBe(265)
    expect(gwpFor('AR6', 'HFC')).toBe(1530) // family default HFC-134a
    expect(gwpFor('AR6', 'HFC', 'HFC-32')).toBe(771)
    expect(gwpFor('AR6', 'other', null, 42)).toBe(42)
    expect(() => gwpFor('AR6', 'other')).toThrow(UnitError)
  })
})
