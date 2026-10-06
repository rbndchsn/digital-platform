/**
 * GHG inventory arithmetic (PRD FR-40, FR-44). Pure functions; the platform logs declared values and
 * derives tCO2e per gas, line totals and inventory totals. Biogenic CO2 and removals are never netted into gross.
 */
import type { GwpSet, Scope, ScopeCategory } from '../enums'
import { scopeOfCategory } from '../enums'
import type { GasEntry, ScopeTotals } from '../schemas'
import { gwpFor, round } from '../units'

export interface GasResult extends GasEntry {
  gwp: number
  tco2e: number
}

/** tCO2e for each gas entry using the inventory's GWP set. */
export function computeGases(set: GwpSet, gases: GasEntry[]): GasResult[] {
  return gases.map((g) => {
    const gwp = gwpFor(set, g.gas, g.gas_detail, g.custom_gwp)
    return { ...g, gwp, tco2e: round(g.tonnes_gas * gwp, 6) }
  })
}

/** Gross tCO2e of a line = Σ gas tCO2e. */
export function lineGrossFromGases(set: GwpSet, gases: GasEntry[]): number {
  return round(
    computeGases(set, gases).reduce((acc, g) => acc + g.tco2e, 0),
    6,
  )
}

export interface LineForTotals {
  category: ScopeCategory
  gross_tco2e: number
  biogenic_co2_t: number
  removals_tco2e: number
}

/** Inventory totals by scope and category; biogenic and removals reported separately. */
export function computeTotals(lines: LineForTotals[]): ScopeTotals {
  const by_scope: Record<string, number> = { '1': 0, '2': 0, '3': 0 }
  const by_category: Record<string, number> = {}
  let gross = 0
  let biogenic = 0
  let removals = 0
  for (const line of lines) {
    const scope: Scope = scopeOfCategory(line.category)
    gross += line.gross_tco2e
    biogenic += line.biogenic_co2_t
    removals += line.removals_tco2e
    by_scope[String(scope)] = round((by_scope[String(scope)] ?? 0) + line.gross_tco2e, 6)
    by_category[line.category] = round((by_category[line.category] ?? 0) + line.gross_tco2e, 6)
  }
  return {
    gross_tco2e: round(gross, 6),
    biogenic_co2_t: round(biogenic, 6),
    removals_tco2e: round(removals, 6),
    by_scope,
    by_category,
  }
}

/** Year-over-year change for a scope total; null when the previous value is zero or missing. */
export function yoyChangePct(current: number, previous: number | null | undefined): number | null {
  if (previous == null || previous === 0) return null
  return round(((current - previous) / previous) * 100, 1)
}
