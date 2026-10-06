/**
 * Units, conversions and GWP tables. Everything that multiplies an emission factor by a volume
 * goes through here so a kg/t mismatch can never silently inflate a result (PRD FR-50).
 */
import type { Gas, GwpSet } from './enums'

export type Dimension = 'mass' | 'volume' | 'energy' | 'count'

export interface GoodUnitDef {
  dimension: Dimension
  /** Multiply a quantity in this unit by `toBase` to get the base unit of its dimension. */
  toBase: number
  base: string
  label: string
}

/** Units in which an amount of a good can be expressed. Base units: t (mass), m3 (volume), MWh (energy), unit (count). */
export const GOOD_UNITS = {
  kg: { dimension: 'mass', toBase: 1e-3, base: 't', label: 'kilograms' },
  t: { dimension: 'mass', toBase: 1, base: 't', label: 'tonnes' },
  L: { dimension: 'volume', toBase: 1e-3, base: 'm3', label: 'litres' },
  m3: { dimension: 'volume', toBase: 1, base: 'm3', label: 'cubic metres' },
  kWh: { dimension: 'energy', toBase: 1e-3, base: 'MWh', label: 'kilowatt-hours' },
  MWh: { dimension: 'energy', toBase: 1, base: 'MWh', label: 'megawatt-hours' },
  unit: { dimension: 'count', toBase: 1, base: 'unit', label: 'units' },
} as const satisfies Record<string, GoodUnitDef>

export type GoodUnit = keyof typeof GOOD_UNITS
export const GOOD_UNIT_KEYS = Object.keys(GOOD_UNITS) as GoodUnit[]

/** CO2e mass units and their factor to tonnes. */
export const CO2E_UNITS = { kgCO2e: 1e-3, tCO2e: 1 } as const
export type Co2eUnit = keyof typeof CO2E_UNITS

/** An emission-factor unit is "<co2e unit>/<good unit>", e.g. "kgCO2e/kg" or "tCO2e/t". */
export type EfUnit = `${Co2eUnit}/${GoodUnit}`

export const EF_UNIT_OPTIONS: EfUnit[] = [
  'kgCO2e/kg',
  'tCO2e/t',
  'kgCO2e/t',
  'kgCO2e/L',
  'kgCO2e/m3',
  'kgCO2e/kWh',
  'tCO2e/MWh',
  'kgCO2e/unit',
  'tCO2e/unit',
]

export class UnitError extends Error {
  readonly code: 'unit_mismatch' | 'unknown_unit' | 'unknown_gwp'
  constructor(code: UnitError['code'], message: string) {
    super(message)
    this.name = 'UnitError'
    this.code = code
  }
}

export function parseEfUnit(unit: string): { co2e: Co2eUnit; good: GoodUnit } {
  const [co2e, good] = unit.split('/')
  if (!co2e || !good || !(co2e in CO2E_UNITS) || !(good in GOOD_UNITS)) {
    throw new UnitError('unknown_unit', `Unknown emission factor unit "${unit}"`)
  }
  return { co2e: co2e as Co2eUnit, good: good as GoodUnit }
}

export function goodUnitDef(unit: string): GoodUnitDef {
  const def = (GOOD_UNITS as Record<string, GoodUnitDef>)[unit]
  if (!def) throw new UnitError('unknown_unit', `Unknown unit "${unit}"`)
  return def
}

/** Convert a quantity of a good to the base unit of its dimension (t, m3, MWh or unit). */
export function toBaseQuantity(value: number, unit: string): { value: number; base: string; dimension: Dimension } {
  const def = goodUnitDef(unit)
  return { value: value * def.toBase, base: def.base, dimension: def.dimension }
}

/**
 * Convert an emission factor to tCO2e per base good unit.
 * e.g. 3.4 kgCO2e/kg → 3.4 tCO2e/t ; 0.5 kgCO2e/kWh → 0.5 tCO2e/MWh.
 */
export function efToBase(value: number, unit: string): { value: number; unit: EfUnit; dimension: Dimension } {
  const { co2e, good } = parseEfUnit(unit)
  const goodDef = GOOD_UNITS[good]
  const perBaseGood = value * CO2E_UNITS[co2e] / goodDef.toBase
  return { value: perBaseGood, unit: `tCO2e/${goodDef.base as GoodUnit}` as EfUnit, dimension: goodDef.dimension }
}

/** Assert that a factor and a volume refer to the same dimension (mass with mass, energy with energy…). */
export function assertSameDimension(efUnit: string, volumeUnit: string): void {
  const ef = efToBase(1, efUnit)
  const vol = goodUnitDef(volumeUnit)
  if (ef.dimension !== vol.dimension) {
    throw new UnitError(
      'unit_mismatch',
      `Emission factor is per ${ef.dimension} (${efUnit}) but the volume is a ${vol.dimension} (${volumeUnit})`,
    )
  }
}

/** Global warming potentials, 100-year, by IPCC assessment report. Values in tCO2e per tonne of gas. */
export const GWP: Record<GwpSet, Record<string, number>> = {
  AR5: {
    CO2: 1,
    CH4: 28,
    'CH4-fossil': 30,
    N2O: 265,
    SF6: 23500,
    NF3: 16100,
    'HFC-23': 12400,
    'HFC-32': 677,
    'HFC-125': 3170,
    'HFC-134a': 1300,
    'HFC-143a': 4800,
    'HFC-152a': 138,
    'HFC-227ea': 3350,
    'PFC-14': 6630,
    'PFC-116': 11100,
  },
  AR6: {
    CO2: 1,
    CH4: 27.9,
    'CH4-fossil': 29.8,
    N2O: 273,
    SF6: 25200,
    NF3: 17400,
    'HFC-23': 14600,
    'HFC-32': 771,
    'HFC-125': 3740,
    'HFC-134a': 1530,
    'HFC-143a': 5810,
    'HFC-152a': 164,
    'HFC-227ea': 3600,
    'PFC-14': 7380,
    'PFC-116': 12400,
  },
}

/** Default species used when a gas family (HFC, PFC) is reported without a detail. */
const FAMILY_DEFAULT: Partial<Record<Gas, string>> = { HFC: 'HFC-134a', PFC: 'PFC-14' }

/**
 * Resolve the GWP for a gas. `gasDetail` selects a species inside a family (e.g. "HFC-32") or a variant ("CH4-fossil").
 * For `other`, a custom GWP must be supplied by the caller.
 */
export function gwpFor(set: GwpSet, gas: Gas, gasDetail?: string | null, customGwp?: number | null): number {
  if (gas === 'other') {
    if (customGwp == null || !(customGwp > 0)) {
      throw new UnitError('unknown_gwp', 'A GWP value is required for "other" gases')
    }
    return customGwp
  }
  const table = GWP[set]
  const key = gasDetail && gasDetail in table ? gasDetail : (FAMILY_DEFAULT[gas] ?? gas)
  const value = table[key]
  if (value == null) throw new UnitError('unknown_gwp', `No ${set} GWP for ${gas}${gasDetail ? ` (${gasDetail})` : ''}`)
  return value
}

export function round(value: number, decimals = 3): number {
  const f = 10 ** decimals
  return Math.round(value * f) / f
}
