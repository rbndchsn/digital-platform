/**
 * decarb_unit arithmetic (brainstorming §3.11, PRD FR-49..FR-51).
 *
 * 1 decarb_unit = 1 tCO2e of (baseline − project) computed on the client's attributed volume.
 *   decarb_factor_gross   = EF_gross(baseline)   − EF_gross(project)
 *   decarb_factor_removal = EF_removal(project)  − EF_removal(baseline)
 *   reduction_units       = decarb_factor_gross   × attributed_volume
 *   removal_units         = decarb_factor_removal × attributed_volume
 * Biogenic CO2 deltas are reported only. All units are normalised explicitly; mismatches are errors.
 */
import type { GwpSet } from '../enums'
import type { GasEntry } from '../schemas'
import { UnitError, assertSameDimension, efToBase, round, toBaseQuantity } from '../units'
import { lineGrossFromGases } from './inventory'

export interface ProfileInput {
  gwp_set: GwpSet
  gases: GasEntry[]
  biogenic_co2_t: number
  removals_tco2e: number
  reference_volume: number
  volume_unit: string
}

export interface ProfileResult {
  gross_tco2e: number
  biogenic_co2_t: number
  removals_tco2e: number
  /** tCO2e per base unit of the good (t, m3, MWh or unit). */
  ef_gross: number
  ef_removal: number
  ef_biogenic: number
  ef_unit: string
  reference_volume_base: number
  base_unit: string
}

export function computeProfile(p: ProfileInput): ProfileResult {
  if (!(p.reference_volume > 0)) throw new UnitError('unit_mismatch', 'Reference volume must be greater than zero')
  const gross = lineGrossFromGases(p.gwp_set, p.gases)
  const vol = toBaseQuantity(p.reference_volume, p.volume_unit)
  return {
    gross_tco2e: gross,
    biogenic_co2_t: round(p.biogenic_co2_t, 6),
    removals_tco2e: round(p.removals_tco2e, 6),
    ef_gross: round(gross / vol.value, 6),
    ef_removal: round(p.removals_tco2e / vol.value, 6),
    ef_biogenic: round(p.biogenic_co2_t / vol.value, 6),
    ef_unit: `tCO2e/${vol.base}`,
    reference_volume_base: vol.value,
    base_unit: vol.base,
  }
}

export type Diagnostic =
  | { code: 'unit_mismatch'; message: string }
  | { code: 'negative_reduction'; message: string }
  | { code: 'volume_exceeds_reference'; message: string }
  | { code: 'gwp_set_differs'; message: string }

export interface DecarbInput {
  baseline: ProfileInput
  project: ProfileInput
  attributed_volume: number
  volume_unit: string
}

export interface DecarbResult {
  baseline: ProfileResult
  project: ProfileResult
  decarb_factor_gross: number
  decarb_factor_removal: number
  decarb_factor_biogenic: number
  factor_unit: string
  attributed_volume_base: number
  base_unit: string
  reduction_units: number
  removal_units: number
  biogenic_delta_tco2e: number
  diagnostics: Diagnostic[]
}

/** Compute factors and units. Throws UnitError on dimension mismatch; returns soft diagnostics otherwise. */
export function computeDecarb(input: DecarbInput): DecarbResult {
  const baseline = computeProfile(input.baseline)
  const project = computeProfile(input.project)
  const diagnostics: Diagnostic[] = []

  if (baseline.base_unit !== project.base_unit) {
    throw new UnitError(
      'unit_mismatch',
      `Baseline volume is in ${input.baseline.volume_unit} but project volume is in ${input.project.volume_unit}`,
    )
  }
  assertSameDimension(project.ef_unit, input.volume_unit)
  if (input.baseline.gwp_set !== input.project.gwp_set) {
    diagnostics.push({ code: 'gwp_set_differs', message: 'Baseline and project use different GWP sets' })
  }

  const vol = toBaseQuantity(input.attributed_volume, input.volume_unit)
  const decarb_factor_gross = round(baseline.ef_gross - project.ef_gross, 6)
  const decarb_factor_removal = round(project.ef_removal - baseline.ef_removal, 6)
  const decarb_factor_biogenic = round(baseline.ef_biogenic - project.ef_biogenic, 6)
  const reduction_units = round(decarb_factor_gross * vol.value, 3)
  const removal_units = round(decarb_factor_removal * vol.value, 3)
  const biogenic_delta_tco2e = round(decarb_factor_biogenic * vol.value, 3)

  if (reduction_units < 0) {
    diagnostics.push({
      code: 'negative_reduction',
      message: 'Project emissions per unit of good are higher than the baseline; a justification is required to submit',
    })
  }
  if (vol.value > project.reference_volume_base) {
    diagnostics.push({
      code: 'volume_exceeds_reference',
      message: `Attributed volume (${vol.value} ${vol.base}) exceeds the project reference volume (${project.reference_volume_base} ${project.base_unit})`,
    })
  }

  return {
    baseline,
    project,
    decarb_factor_gross,
    decarb_factor_removal,
    decarb_factor_biogenic,
    factor_unit: project.ef_unit,
    attributed_volume_base: vol.value,
    base_unit: vol.base,
    reduction_units,
    removal_units,
    biogenic_delta_tco2e,
    diagnostics,
  }
}

/** Convenience for the EF-level view: units from two factors in a given unit and a volume. */
export function unitsFromFactors(
  baselineEf: number,
  projectEf: number,
  efUnit: string,
  volume: number,
  volumeUnit: string,
): { decarb_factor: number; units: number; factor_unit: string } {
  assertSameDimension(efUnit, volumeUnit)
  const b = efToBase(baselineEf, efUnit)
  const p = efToBase(projectEf, efUnit)
  const v = toBaseQuantity(volume, volumeUnit)
  const decarb_factor = round(b.value - p.value, 6)
  return { decarb_factor, units: round(decarb_factor * v.value, 3), factor_unit: b.unit }
}
