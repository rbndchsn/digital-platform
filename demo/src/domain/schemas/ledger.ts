import { z } from 'zod'
import {
  BASELINE_METHODS,
  CONSOLIDATION_APPROACHES,
  DOCUMENT_SOURCES,
  EF_BOUNDARIES,
  EF_METHODS,
  GASES,
  GWP_SETS,
  INTERVENTION_LAYERS,
  PROFILE_KINDS,
  RECORD_STATUSES,
  SCOPES,
  SCOPE_CATEGORIES,
} from '../enums'
import { AuditColumns, Id, IsoDate, IsoDateTime } from './common'

export const GasEntry = z.object({
  gas: z.enum(GASES),
  gas_detail: z.string().nullable().default(null),
  tonnes_gas: z.number().nonnegative(),
  /** Custom GWP, required only for gas = other. */
  custom_gwp: z.number().positive().nullable().default(null),
})
export type GasEntry = z.infer<typeof GasEntry>

export const InventoryLineGas = AuditColumns.extend(GasEntry.shape).extend({
  id: Id,
  line_id: Id,
  gwp: z.number().positive(),
  tco2e: z.number().nonnegative(),
})
export type InventoryLineGas = z.infer<typeof InventoryLineGas>

export const ScopeTotals = z.object({
  gross_tco2e: z.number(),
  biogenic_co2_t: z.number(),
  removals_tco2e: z.number(),
  by_scope: z.record(z.string(), z.number()),
  by_category: z.record(z.string(), z.number()),
})
export type ScopeTotals = z.infer<typeof ScopeTotals>

export const Inventory = AuditColumns.extend({
  id: Id,
  org_id: Id,
  year: z.number().int().min(2000).max(2100),
  boundary_name: z.string().min(1),
  consolidation: z.enum(CONSOLIDATION_APPROACHES),
  gwp_set: z.enum(GWP_SETS),
  status: z.enum(RECORD_STATUSES),
  revision: z.number().int().nonnegative(),
  service_id: Id.nullable(),
  declared_totals_json: ScopeTotals.nullable(),
  verified_totals_json: ScopeTotals.nullable(),
  assurance_ref: Id.nullable(),
  superseded_by_id: Id.nullable(),
  submitted_at: IsoDateTime.nullable(),
  verified_at: IsoDateTime.nullable(),
})
export type Inventory = z.infer<typeof Inventory>

export const InventoryLine = AuditColumns.extend({
  id: Id,
  inventory_id: Id,
  org_id: Id,
  scope: z.union([z.literal(1), z.literal(2), z.literal(3)]).pipe(z.number().refine((n) => (SCOPES as readonly number[]).includes(n))),
  category: z.enum(SCOPE_CATEGORIES),
  site: z.string().nullable(),
  activity: z.string().min(1),
  quantity: z.number().nullable(),
  unit: z.string().nullable(),
  declared_gross_tco2e: z.number().nonnegative(),
  declared_biogenic_co2_t: z.number().nonnegative().default(0),
  declared_removals_tco2e: z.number().nonnegative().default(0),
  verified_gross_tco2e: z.number().nonnegative().nullable(),
  verified_biogenic_co2_t: z.number().nonnegative().nullable(),
  verified_removals_tco2e: z.number().nonnegative().nullable(),
  verifier_comment: z.string().nullable(),
  source: z.enum(DOCUMENT_SOURCES),
  order_no: z.number().int(),
})
export type InventoryLine = z.infer<typeof InventoryLine>

export const EmissionFactor = AuditColumns.extend({
  id: Id,
  org_id: Id,
  product_name: z.string().min(1),
  product_code: z.string().nullable(),
  functional_unit: z.string().min(1),
  boundary: z.enum(EF_BOUNDARIES),
  method: z.enum(EF_METHODS),
  year: z.number().int(),
  declared_value: z.number().nonnegative(),
  value_unit: z.string().min(1),
  verified_value: z.number().nonnegative().nullable(),
  status: z.enum(RECORD_STATUSES),
  service_id: Id.nullable(),
  assurance_ref: Id.nullable(),
  superseded_by_id: Id.nullable(),
  notes: z.string().nullable(),
})
export type EmissionFactor = z.infer<typeof EmissionFactor>

export const EmissionProfileGas = AuditColumns.extend(GasEntry.shape).extend({
  id: Id,
  profile_id: Id,
  gwp: z.number().positive(),
  tco2e: z.number().nonnegative(),
})
export type EmissionProfileGas = z.infer<typeof EmissionProfileGas>

export const EmissionProfile = AuditColumns.extend({
  id: Id,
  org_id: Id,
  kind: z.enum(PROFILE_KINDS),
  period_start: IsoDate,
  period_end: IsoDate,
  boundary: z.string().min(1),
  gwp_set: z.enum(GWP_SETS),
  gross_tco2e: z.number().nonnegative(),
  biogenic_co2_t: z.number().nonnegative().default(0),
  removals_tco2e: z.number().nonnegative().default(0),
  reference_volume: z.number().positive(),
  volume_unit: z.string().min(1),
  ef_gross: z.number().nonnegative(),
  ef_removal: z.number().nonnegative(),
  ef_unit: z.string().min(1),
  notes: z.string().nullable(),
})
export type EmissionProfile = z.infer<typeof EmissionProfile>

export const SupplyShed = z.object({
  good: z.string().min(1),
  variety: z.string().nullable().default(null),
  country: z.string().length(2),
  region: z.string().nullable().default(null),
})
export type SupplyShed = z.infer<typeof SupplyShed>

export const Intervention = z.object({
  type: z.string().min(1),
  activities: z.array(z.string()).default([]),
  layer: z.enum(INTERVENTION_LAYERS),
  start_date: IsoDate,
})
export type Intervention = z.infer<typeof Intervention>

export const DecarbUnitRecord = AuditColumns.extend({
  id: Id,
  org_id: Id,
  good: z.string().min(1),
  supply_shed_json: SupplyShed,
  supplier_name: z.string().nullable(),
  facility_id: z.string().nullable(),
  intervention_json: Intervention,
  baseline_method: z.enum(BASELINE_METHODS),
  baseline_profile_id: Id.nullable(),
  project_profile_id: Id.nullable(),
  attributed_volume: z.number().nonnegative(),
  volume_unit: z.string().min(1),
  decarb_factor_gross: z.number().nullable(),
  decarb_factor_removal: z.number().nullable(),
  factor_unit: z.string().nullable(),
  declared_reduction_units: z.number().nullable(),
  declared_removal_units: z.number().nullable(),
  biogenic_delta_tco2e: z.number().nullable(),
  verified_reduction_units: z.number().nullable(),
  verified_removal_units: z.number().nullable(),
  justification: z.string().nullable(),
  status: z.enum(RECORD_STATUSES),
  service_id: Id.nullable(),
  assurance_ref: Id.nullable(),
  superseded_by_id: Id.nullable(),
  period_start: IsoDate,
  period_end: IsoDate,
})
export type DecarbUnitRecord = z.infer<typeof DecarbUnitRecord>
