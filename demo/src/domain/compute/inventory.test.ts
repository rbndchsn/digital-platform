import { describe, expect, it } from 'vitest'
import { computeGases, computeTotals, lineGrossFromGases, yoyChangePct } from './inventory'

describe('inventory compute', () => {
  it('computes tCO2e per gas with AR5 and AR6', () => {
    const gases = [
      { gas: 'CO2' as const, gas_detail: null, tonnes_gas: 100, custom_gwp: null },
      { gas: 'CH4' as const, gas_detail: null, tonnes_gas: 2, custom_gwp: null },
      { gas: 'N2O' as const, gas_detail: null, tonnes_gas: 0.1, custom_gwp: null },
    ]
    const ar5 = computeGases('AR5', gases)
    expect(ar5.map((g) => g.tco2e)).toEqual([100, 56, 26.5])
    const ar6 = computeGases('AR6', gases)
    expect(ar6.map((g) => g.tco2e)).toEqual([100, 55.8, 27.3])
    expect(lineGrossFromGases('AR5', gases)).toBe(182.5)
  })

  it('handles HFC species detail and custom GWP for other', () => {
    const out = computeGases('AR6', [
      { gas: 'HFC', gas_detail: 'HFC-32', tonnes_gas: 1, custom_gwp: null },
      { gas: 'other', gas_detail: 'R-1234yf', tonnes_gas: 10, custom_gwp: 0.5 },
    ])
    expect(out[0].tco2e).toBe(771)
    expect(out[1].tco2e).toBe(5)
  })

  it('totals by scope and category and keeps biogenic and removals separate', () => {
    const totals = computeTotals([
      { category: 's1_stationary_combustion', gross_tco2e: 100, biogenic_co2_t: 10, removals_tco2e: 0 },
      { category: 's1_land_use', gross_tco2e: 50, biogenic_co2_t: 0, removals_tco2e: 20 },
      { category: 's2_market_based', gross_tco2e: 30, biogenic_co2_t: 0, removals_tco2e: 0 },
      { category: 's3_c1_purchased_goods_services', gross_tco2e: 400, biogenic_co2_t: 5, removals_tco2e: 0 },
    ])
    expect(totals.gross_tco2e).toBe(580)
    expect(totals.biogenic_co2_t).toBe(15)
    expect(totals.removals_tco2e).toBe(20)
    expect(totals.by_scope).toEqual({ '1': 150, '2': 30, '3': 400 })
    expect(totals.by_category.s1_land_use).toBe(50)
  })

  it('computes year-over-year change', () => {
    expect(yoyChangePct(90, 100)).toBe(-10)
    expect(yoyChangePct(90, 0)).toBeNull()
    expect(yoyChangePct(90, null)).toBeNull()
  })
})
