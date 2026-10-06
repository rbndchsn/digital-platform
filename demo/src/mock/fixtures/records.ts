/** Ledger fixtures: GHG inventories, product emission factors and decarb_unit records (plan_v1 §2.4 ch. 7). */
import type { GwpSet, ScopeCategory } from '@/domain/enums'
import { scopeOfCategory } from '@/domain/enums'
import { computeDecarb, computeProfile } from '@/domain/compute/decarb'
import { computeGases, computeTotals } from '@/domain/compute/inventory'
import type {
  DecarbUnitRecord,
  Document,
  DocumentVersion,
  EmissionFactor,
  EmissionProfile,
  EmissionProfileGas,
  EvidenceLink,
  GasEntry,
  Inventory,
  InventoryLine,
  InventoryLineGas,
} from '@/domain/schemas'
import { daysAgo } from '../clock'
import { fakeSha256, seedId } from '../ids'
import { ORG, USR, auditAt } from './base'

export interface RecordTables {
  inventories: Inventory[]
  inventoryLines: InventoryLine[]
  inventoryLineGases: InventoryLineGas[]
  emissionFactors: EmissionFactor[]
  profiles: EmissionProfile[]
  profileGases: EmissionProfileGas[]
  decarbRecords: DecarbUnitRecord[]
  documents: Document[]
  documentVersions: DocumentVersion[]
  evidenceLinks: EvidenceLink[]
}

const g = (gas: GasEntry['gas'], tonnes: number, detail: string | null = null): GasEntry => ({ gas, gas_detail: detail, tonnes_gas: tonnes, custom_gwp: null })

interface LineSpec {
  category: ScopeCategory
  site: string | null
  activity: string
  quantity: number | null
  unit: string | null
  gases: GasEntry[]
  biogenic?: number
  removals?: number
  /** Verified value override (null = same as declared). */
  verifiedGross?: number | null
  comment?: string | null
}

/** Northwind inventory lines; `scale` lets 2023/2024/2025 differ. */
function northwindLines(scale: number, year: number): LineSpec[] {
  const s = (n: number) => Math.round(n * scale * 100) / 100
  return [
    { category: 's1_stationary_combustion', site: 'Lelystad', activity: 'Natural gas — boilers and CHP', quantity: s(4_120_000), unit: 'm3', gases: [g('CO2', s(7_790)), g('CH4', s(0.42)), g('N2O', s(0.015))] },
    { category: 's1_stationary_combustion', site: 'Leeuwarden', activity: 'Natural gas — boilers', quantity: s(2_310_000), unit: 'm3', gases: [g('CO2', s(4_370)), g('CH4', s(0.24)), g('N2O', s(0.008))] },
    { category: 's1_stationary_combustion', site: 'Zwolle', activity: 'Natural gas — boilers', quantity: s(1_480_000), unit: 'm3', gases: [g('CO2', s(2_800)), g('CH4', s(0.15)), g('N2O', s(0.005))] },
    { category: 's1_mobile_combustion', site: null, activity: 'Milk collection fleet — diesel', quantity: s(1_960_000), unit: 'L', gases: [g('CO2', s(5_230)), g('CH4', s(0.3)), g('N2O', s(0.21))], biogenic: s(410) },
    { category: 's1_fugitive', site: 'Lelystad', activity: 'Refrigerant top-ups (HFC-134a, R-404A)', quantity: s(0.62), unit: 't', gases: [g('HFC', s(0.38), 'HFC-134a'), g('HFC', s(0.24), 'HFC-125')], verifiedGross: year === 2024 ? s(1_480) : null, comment: year === 2024 ? 'R-404A split corrected to HFC-125/143a per service logs.' : null },
    { category: 's2_location_based', site: null, activity: 'Purchased electricity — all sites (location-based)', quantity: s(38_400), unit: 'MWh', gases: [g('CO2', s(12_670)), g('CH4', s(0.9)), g('N2O', s(0.12))] },
    { category: 's2_market_based', site: null, activity: 'Purchased electricity — all sites (market-based, 60 % GoO wind)', quantity: s(38_400), unit: 'MWh', gases: [g('CO2', s(5_070)), g('CH4', s(0.36)), g('N2O', s(0.05))] },
    { category: 's3_c1_purchased_goods_services', site: null, activity: 'Raw milk from member farms', quantity: s(1_180_000), unit: 't', gases: [g('CO2', s(690_000)), g('CH4', s(96_500)), g('N2O', s(1_920))], biogenic: s(21_000), removals: s(18_600), verifiedGross: year === 2024 ? s(3_906_000) : null, comment: year === 2024 ? 'Enteric CH4 restated with AR6 GWP.' : null },
    { category: 's3_c1_purchased_goods_services', site: null, activity: 'Packaging (PET, carton, film)', quantity: s(14_900), unit: 't', gases: [g('CO2', s(41_200)), g('CH4', s(12)), g('N2O', s(0.9))] },
    { category: 's3_c2_capital_goods', site: null, activity: 'Plant and equipment', quantity: null, unit: null, gases: [g('CO2', s(6_300))] },
    { category: 's3_c3_fuel_energy_related', site: null, activity: 'Upstream fuel and T&D losses', quantity: null, unit: null, gases: [g('CO2', s(4_900)), g('CH4', s(45))] },
    { category: 's3_c4_upstream_transport', site: null, activity: 'Inbound ingredients and packaging', quantity: s(9_800_000), unit: 'unit', gases: [g('CO2', s(8_720)), g('N2O', s(0.3))] },
    { category: 's3_c5_waste_in_operations', site: null, activity: 'Wastewater treatment and solid waste', quantity: s(28_000), unit: 't', gases: [g('CO2', s(1_100)), g('CH4', s(120))] },
    { category: 's3_c6_business_travel', site: null, activity: 'Air and rail travel', quantity: null, unit: null, gases: [g('CO2', s(410))] },
    { category: 's3_c7_employee_commuting', site: null, activity: 'Commuting survey (1,840 FTE)', quantity: null, unit: null, gases: [g('CO2', s(1_960))] },
    { category: 's3_c9_downstream_transport', site: null, activity: 'Distribution to retail DCs', quantity: null, unit: null, gases: [g('CO2', s(12_400)), g('N2O', s(0.4))] },
    { category: 's3_c12_end_of_life_sold_products', site: null, activity: 'Packaging end of life', quantity: s(14_900), unit: 't', gases: [g('CO2', s(9_300)), g('CH4', s(85))] },
  ]
}

export function buildRecords(serviceIds: { nwInv2023: string; nwInv2024: string; nwInv2025: string; nwDecarb2024: string; nwDecarb2025: string; atlasDecarb2025: string; atlasPcf2025: string | null; nwPcf2024: string }): RecordTables {
  const t: RecordTables = { inventories: [], inventoryLines: [], inventoryLineGases: [], emissionFactors: [], profiles: [], profileGases: [], decarbRecords: [], documents: [], documentVersions: [], evidenceLinks: [] }

  // ---------------------------------------------------------------- evidence helper
  const evidence = (orgId: string, serviceId: string | null, title: string, filename: string, at: string, by: string, entity_type: EvidenceLink['entity_type'], entity_id: string): void => {
    const doc: Document = { ...auditAt(at, by), id: seedId('doc'), org_id: orgId, service_id: serviceId, slot_id: null, title, category: 'supporting', current_version_id: null, locked_at: null }
    const ver: DocumentVersion = { ...auditAt(at, by), id: seedId('ver'), document_id: doc.id, version_no: 1, r2_key: `org/${orgId}/doc/${doc.id}/v1/${filename}`, filename, mime_type: filename.endsWith('.xlsx') ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf', size_bytes: 180_000 + (filename.length * 9_137) % 2_400_000, sha256: fakeSha256(`${doc.id}:${filename}`), uploaded_by: by, uploaded_at: at, source: 'manual', check_status: 'checked', checked_by: null, checked_at: null, reject_reason: null }
    doc.current_version_id = ver.id
    t.documents.push(doc)
    t.documentVersions.push(ver)
    t.evidenceLinks.push({ ...auditAt(at, by), id: seedId('evl'), org_id: orgId, document_version_id: ver.id, entity_type, entity_id, note: null })
  }

  // ---------------------------------------------------------------- inventories
  const inventory = (opts: { year: number; scale: number; status: Inventory['status']; serviceId: string; createdDaysAgo: number; gwp: GwpSet; verifiedDaysAgo?: number; assuranceRef?: string | null; superseded?: boolean; evidenceCoverage: number; revision?: number }): Inventory => {
    const at = daysAgo(opts.createdDaysAgo)
    const inv: Inventory = { ...auditAt(at, USR.nwAdmin), id: seedId('inv'), org_id: ORG.northwind, year: opts.year, boundary_name: 'Northwind Dairy Cooperative — operational control', consolidation: 'operational_control', gwp_set: opts.gwp, status: opts.status, revision: opts.revision ?? 1, service_id: opts.serviceId, declared_totals_json: null, verified_totals_json: null, assurance_ref: opts.assuranceRef ?? null, superseded_by_id: null, submitted_at: opts.status === 'draft' ? null : daysAgo(opts.createdDaysAgo - 6), verified_at: opts.verifiedDaysAgo != null ? daysAgo(opts.verifiedDaysAgo) : null }
    const specs = northwindLines(opts.scale, opts.year)
    const forTotals: { category: ScopeCategory; gross_tco2e: number; biogenic_co2_t: number; removals_tco2e: number }[] = []
    const forVerified: typeof forTotals = []
    specs.forEach((spec, i) => {
      const gases = computeGases(opts.gwp, spec.gases)
      const gross = Math.round(gases.reduce((a, x) => a + x.tco2e, 0) * 100) / 100
      const verified = opts.status === 'verified' || opts.status === 'superseded' ? (spec.verifiedGross ?? gross) : null
      const line: InventoryLine = { ...auditAt(at, USR.nwAdmin), id: seedId('lin'), inventory_id: inv.id, org_id: ORG.northwind, scope: scopeOfCategory(spec.category), category: spec.category, site: spec.site, activity: spec.activity, quantity: spec.quantity, unit: spec.unit, declared_gross_tco2e: gross, declared_biogenic_co2_t: spec.biogenic ?? 0, declared_removals_tco2e: spec.removals ?? 0, verified_gross_tco2e: verified, verified_biogenic_co2_t: verified != null ? (spec.biogenic ?? 0) : null, verified_removals_tco2e: verified != null ? (spec.removals ?? 0) : null, verifier_comment: verified != null ? (spec.comment ?? null) : null, source: i % 5 === 4 ? 'import' : 'manual', order_no: i }
      t.inventoryLines.push(line)
      for (const gr of gases) t.inventoryLineGases.push({ ...auditAt(at, USR.nwAdmin), id: seedId('lgs'), line_id: line.id, gas: gr.gas, gas_detail: gr.gas_detail, tonnes_gas: gr.tonnes_gas, custom_gwp: gr.custom_gwp, gwp: gr.gwp, tco2e: gr.tco2e })
      forTotals.push({ category: spec.category, gross_tco2e: gross, biogenic_co2_t: spec.biogenic ?? 0, removals_tco2e: spec.removals ?? 0 })
      if (verified != null) forVerified.push({ category: spec.category, gross_tco2e: verified, biogenic_co2_t: spec.biogenic ?? 0, removals_tco2e: spec.removals ?? 0 })
      if (i / specs.length < opts.evidenceCoverage) {
        evidence(ORG.northwind, opts.serviceId, `${spec.activity} — evidence ${opts.year}`, `Northwind_${opts.year}_${spec.category}_${spec.site ?? 'all'}.${i % 3 === 0 ? 'pdf' : 'xlsx'}`, daysAgo(opts.createdDaysAgo - 2), i % 4 === 1 ? USR.nwContrib : USR.nwAdmin, 'inventory_line', line.id)
      }
    })
    inv.declared_totals_json = computeTotals(forTotals)
    inv.verified_totals_json = forVerified.length ? computeTotals(forVerified) : null
    t.inventories.push(inv)
    return inv
  }

  const inv2023 = inventory({ year: 2023, scale: 1.0, status: 'superseded', serviceId: serviceIds.nwInv2023, createdDaysAgo: 700, gwp: 'AR5', verifiedDaysAgo: 650, assuranceRef: 'itr_nw_2023', evidenceCoverage: 0.9 })
  const inv2024 = inventory({ year: 2024, scale: 0.968, status: 'verified', serviceId: serviceIds.nwInv2024, createdDaysAgo: 380, gwp: 'AR6', verifiedDaysAgo: 320, assuranceRef: 'itr_nw_2024', evidenceCoverage: 1 })
  inv2023.superseded_by_id = null // superseded refers to the 2023 verified status being replaced by the 2024 cycle; kept for history
  inventory({ year: 2025, scale: 0.931, status: 'under_verification', serviceId: serviceIds.nwInv2025, createdDaysAgo: 40, gwp: 'AR6', evidenceCoverage: 0.82, revision: 2 })
  void inv2024

  // ---------------------------------------------------------------- product emission factors
  const ef = (e: Omit<EmissionFactor, keyof ReturnType<typeof auditAt> | 'id'>, createdDaysAgo: number, by: string): EmissionFactor => {
    const row: EmissionFactor = { ...auditAt(daysAgo(createdDaysAgo), by), id: seedId('ef'), ...e }
    t.emissionFactors.push(row)
    return row
  }
  const milk2024 = ef({ org_id: ORG.northwind, product_name: 'Semi-skimmed milk, 1 L carton', product_code: 'NW-MLK-1L', functional_unit: 'per litre', boundary: 'cradle_to_gate', method: 'iso14067', year: 2024, declared_value: 1.24, value_unit: 'kgCO2e/L', verified_value: 1.21, status: 'verified', service_id: serviceIds.nwPcf2024, assurance_ref: 'itr_nw_pcf_2024', superseded_by_id: null, notes: 'Mass allocation between cream and skim per ISO 14067 §6.4.' }, 400, USR.nwAdmin)
  evidence(ORG.northwind, serviceIds.nwPcf2024, 'Milk PCF study 2024', 'Northwind_PCF_milk_2024.pdf', daysAgo(395), USR.nwAdmin, 'emission_factor', milk2024.id)
  ef({ org_id: ORG.northwind, product_name: 'Gouda 48+, 1 kg wheel', product_code: 'NW-GDA-1K', functional_unit: 'per kg', boundary: 'cradle_to_gate', method: 'iso14067', year: 2024, declared_value: 8.9, value_unit: 'kgCO2e/kg', verified_value: 8.7, status: 'verified', service_id: serviceIds.nwPcf2024, assurance_ref: 'itr_nw_pcf_2024', superseded_by_id: null, notes: null }, 400, USR.nwAdmin)
  ef({ org_id: ORG.northwind, product_name: 'Whey protein concentrate 80', product_code: 'NW-WPC-80', functional_unit: 'per kg', boundary: 'cradle_to_gate', method: 'iso14067', year: 2025, declared_value: 6.4, value_unit: 'kgCO2e/kg', verified_value: null, status: 'draft', service_id: null, assurance_ref: null, superseded_by_id: null, notes: 'Awaiting 2025 energy data for the drying line.' }, 20, USR.nwAdmin)
  ef({ org_id: ORG.atlas, product_name: 'Sourdough loaf 500 g', product_code: 'AF-SRD-500', functional_unit: 'per unit', boundary: 'cradle_to_gate', method: 'iso14067', year: 2025, declared_value: 0.52, value_unit: 'kgCO2e/unit', verified_value: null, status: 'submitted', service_id: serviceIds.atlasPcf2025, assurance_ref: null, superseded_by_id: null, notes: null }, 5, USR.atlasAdmin)

  // ---------------------------------------------------------------- decarb_unit records
  const profile = (orgId: string, kind: EmissionProfile['kind'], period: [string, string], gwp: GwpSet, gases: GasEntry[], biogenic: number, removals: number, refVolume: number, unit: string, at: string, by: string, boundary: string): EmissionProfile => {
    const r = computeProfile({ gwp_set: gwp, gases, biogenic_co2_t: biogenic, removals_tco2e: removals, reference_volume: refVolume, volume_unit: unit })
    const p: EmissionProfile = { ...auditAt(at, by), id: seedId('prf'), org_id: orgId, kind, period_start: period[0], period_end: period[1], boundary, gwp_set: gwp, gross_tco2e: r.gross_tco2e, biogenic_co2_t: biogenic, removals_tco2e: removals, reference_volume: refVolume, volume_unit: unit, ef_gross: r.ef_gross, ef_removal: r.ef_removal, ef_unit: r.ef_unit, notes: null }
    t.profiles.push(p)
    for (const gr of computeGases(gwp, gases)) t.profileGases.push({ ...auditAt(at, by), id: seedId('pgs'), profile_id: p.id, gas: gr.gas, gas_detail: gr.gas_detail, tonnes_gas: gr.tonnes_gas, custom_gwp: gr.custom_gwp, gwp: gr.gwp, tco2e: gr.tco2e })
    return p
  }

  const decarb = (d: {
    id?: string
    orgId: string
    good: string
    shed: DecarbUnitRecord['supply_shed_json']
    supplier: string
    intervention: DecarbUnitRecord['intervention_json']
    baselineMethod: DecarbUnitRecord['baseline_method']
    baseline: { period: [string, string]; gases: GasEntry[]; biogenic: number; removals: number }
    project: { period: [string, string]; gases: GasEntry[]; biogenic: number; removals: number }
    refVolume: number
    unit: string
    attributed: number
    status: DecarbUnitRecord['status']
    serviceId: string | null
    assuranceRef?: string | null
    createdDaysAgo: number
    by: string
    verifiedDaysAgoFactor?: number
    evidenceFiles: string[]
  }): DecarbUnitRecord => {
    const at = daysAgo(d.createdDaysAgo)
    const boundary = `${d.good} — farm gate, ${d.shed.country}`
    const b = profile(d.orgId, 'baseline', d.baseline.period, 'AR6', d.baseline.gases, d.baseline.biogenic, d.baseline.removals, d.refVolume, d.unit, at, d.by, boundary)
    const p = profile(d.orgId, 'project', d.project.period, 'AR6', d.project.gases, d.project.biogenic, d.project.removals, d.refVolume, d.unit, at, d.by, boundary)
    const r = computeDecarb({
      baseline: { gwp_set: 'AR6', gases: d.baseline.gases, biogenic_co2_t: d.baseline.biogenic, removals_tco2e: d.baseline.removals, reference_volume: d.refVolume, volume_unit: d.unit },
      project: { gwp_set: 'AR6', gases: d.project.gases, biogenic_co2_t: d.project.biogenic, removals_tco2e: d.project.removals, reference_volume: d.refVolume, volume_unit: d.unit },
      attributed_volume: d.attributed,
      volume_unit: d.unit,
    })
    const verified = d.status === 'verified' || d.status === 'superseded'
    const rec: DecarbUnitRecord = {
      ...auditAt(at, d.by),
      id: d.id ?? seedId('dcu'),
      org_id: d.orgId,
      good: d.good,
      supply_shed_json: d.shed,
      supplier_name: d.supplier,
      facility_id: null,
      intervention_json: d.intervention,
      baseline_method: d.baselineMethod,
      baseline_profile_id: b.id,
      project_profile_id: p.id,
      attributed_volume: d.attributed,
      volume_unit: d.unit,
      decarb_factor_gross: r.decarb_factor_gross,
      decarb_factor_removal: r.decarb_factor_removal,
      factor_unit: r.factor_unit,
      declared_reduction_units: r.reduction_units,
      declared_removal_units: r.removal_units,
      biogenic_delta_tco2e: r.biogenic_delta_tco2e,
      verified_reduction_units: verified ? Math.round(r.reduction_units * (d.verifiedDaysAgoFactor ?? 1)) : null,
      verified_removal_units: verified ? Math.round(r.removal_units * (d.verifiedDaysAgoFactor ?? 1)) : null,
      justification: null,
      status: d.status,
      service_id: d.serviceId,
      assurance_ref: d.assuranceRef ?? null,
      superseded_by_id: null,
      period_start: d.project.period[0],
      period_end: d.project.period[1],
    }
    t.decarbRecords.push(rec)
    d.evidenceFiles.forEach((f, i) => evidence(d.orgId, d.serviceId, f.replace(/\.\w+$/, '').replace(/_/g, ' '), f, daysAgo(d.createdDaysAgo - 1), d.by, i === 0 ? 'decarb_unit_record' : i === 1 ? 'emission_profile' : 'emission_profile', i === 0 ? rec.id : i === 1 ? b.id : p.id))
    return rec
  }

  // Northwind milk 2024 (verified history): 3.5 → 3.4 tCO2e/t on 900,000 t attributed = 90,000 units
  decarb({
    orgId: ORG.northwind,
    good: 'Raw milk',
    shed: { good: 'Milk', variety: 'Holstein-Friesian', country: 'NL', region: 'Friesland' },
    supplier: 'Member farms — cluster North (42 farms)',
    intervention: { type: 'Enteric methane and manure management', activities: ['3-NOP feed additive', 'Covered slurry storage'], layer: '1a_raw_material_production', start_date: '2024-01-01' },
    baselineMethod: 'historical',
    baseline: { period: ['2023-01-01', '2023-12-31'], gases: [g('CO2', 744_000), g('CH4', 103_500), g('N2O', 2_000)], biogenic: 25_000, removals: 0 },
    project: { period: ['2024-01-01', '2024-12-31'], gases: [g('CO2', 740_000), g('CH4', 99_200), g('N2O', 1_990)], biogenic: 25_000, removals: 0 },
    refVolume: 1_200_000,
    unit: 't',
    attributed: 900_000,
    status: 'verified',
    serviceId: serviceIds.nwDecarb2024,
    assuranceRef: 'itr_nw_decarb_2024',
    createdDaysAgo: 330,
    by: USR.nwAdmin,
    evidenceFiles: ['Northwind_insetting_2024_purchase_records.pdf', 'Northwind_cluster_north_baseline_2023.xlsx', 'Northwind_cluster_north_project_2024.xlsx'],
  })

  // Northwind milk 2025 (the storyline record): 3.4 → 3.0 tCO2e/t on 1,000,000 t attributed = 400,000 units
  decarb({
    id: 'dcu_nw_milk_2025',
    orgId: ORG.northwind,
    good: 'Raw milk',
    shed: { good: 'Milk', variety: 'Holstein-Friesian', country: 'NL', region: 'Friesland' },
    supplier: 'Member farms — cluster North (42 farms)',
    intervention: { type: 'Enteric methane and manure management', activities: ['3-NOP feed additive', 'Covered slurry storage', 'Precision fertilisation'], layer: '1a_raw_material_production', start_date: '2025-01-01' },
    baselineMethod: 'historical',
    baseline: { period: ['2024-01-01', '2024-12-31'], gases: [g('CO2', 744_000), g('CH4', 100_000), g('N2O', 2_000)], biogenic: 25_000, removals: 0 },
    project: { period: ['2025-01-01', '2025-12-31'], gases: [g('CO2', 709_800), g('CH4', 85_000), g('N2O', 1_900)], biogenic: 24_000, removals: 0 },
    refVolume: 1_200_000,
    unit: 't',
    attributed: 1_000_000,
    status: 'under_verification',
    serviceId: serviceIds.nwDecarb2025,
    createdDaysAgo: 55,
    by: USR.nwAdmin,
    evidenceFiles: ['Northwind_insetting_2025_purchase_records.pdf', 'Northwind_cluster_north_baseline_2024.xlsx', 'Northwind_cluster_north_project_2025.xlsx'],
  })

  // Atlas wheat 2025: 0.45 → 0.32 tCO2e/t plus 0.05 tCO2e/t removals, 20,000 t attributed
  decarb({
    orgId: ORG.atlas,
    good: 'Wheat grain',
    shed: { good: 'Wheat', variety: 'Organic soft wheat', country: 'FR', region: 'Beauce' },
    supplier: 'Coopérative céréalière de Beauce (60 growers)',
    intervention: { type: 'Regenerative practices', activities: ['Cover cropping', 'Reduced tillage'], layer: '1a_raw_material_production', start_date: '2024-10-01' },
    baselineMethod: 'counterfactual',
    baseline: { period: ['2023-09-01', '2024-08-31'], gases: [g('CO2', 24_000), g('N2O', 44)], biogenic: 0, removals: 0 },
    project: { period: ['2024-09-01', '2025-08-31'], gases: [g('CO2', 18_000), g('N2O', 28)], biogenic: 0, removals: 4_000 },
    refVolume: 80_000,
    unit: 't',
    attributed: 20_000,
    status: 'submitted',
    serviceId: serviceIds.atlasDecarb2025,
    createdDaysAgo: 14,
    by: USR.atlasAdmin,
    evidenceFiles: ['Atlas_wheat_2025_delivery_notes.pdf', 'Atlas_wheat_baseline_model.xlsx', 'Atlas_wheat_project_2025_field_data.xlsx'],
  })

  return t
}
