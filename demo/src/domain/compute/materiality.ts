/**
 * Materiality and misstatement aggregation (PRD v0.3 FR-84–FR-87). Pure functions: the platform computes, displays
 * and warns; the opinion type and whether a misstatement is material stay human decisions (PRD §7.3).
 */
import type { AssertionBase, MisstatementDirection, OpinionType } from '../enums'
import type { AggregationSnapshot } from '../schemas/opinions'
import { round } from '../units'

export interface MisstatementLike {
  direction: MisstatementDirection
  amount: number
  amount_unit: string
  nature: 'quantitative' | 'qualitative'
  material_candidate: boolean
  status: 'proposed' | 'confirmed' | 'dismissed'
  corrected: boolean
}

export interface MaterialityLike {
  assertion_base: AssertionBase
  assertion_declared_value: number | null
  assertion_unit: string
  threshold_pct: number
  threshold_abs: number | null
}

/** Absolute equivalent of the percentage threshold on the declared assertion (PRD FR-84). */
export function thresholdAbs(thresholdPct: number, assertionValue: number | null): number | null {
  if (assertionValue == null || !Number.isFinite(assertionValue)) return null
  return round(Math.abs(assertionValue) * (thresholdPct / 100), 6)
}

/** Unit of the assertion base. */
export function assertionUnit(base: AssertionBase, efUnit?: string | null): string {
  if (base === 'ef_value') return efUnit ?? 'kgCO2e/unit'
  return 'tCO2e'
}

export type Aggregation = Omit<AggregationSnapshot, 'snapshot_at'>

/**
 * Gross (absolute values summed) and net (signed, understatements negative) uncorrected confirmed misstatements,
 * each as an amount and a percentage of the assertion, against the threshold (PRD FR-86). Qualitative entries are
 * listed separately and never summed.
 */
export function aggregateMisstatements(items: MisstatementLike[], setting: MaterialityLike | null, draftOpinionType: OpinionType | null): Aggregation {
  const confirmed = items.filter((m) => m.status === 'confirmed')
  const uncorrected = confirmed.filter((m) => !m.corrected)
  const quantitative = uncorrected.filter((m) => m.nature === 'quantitative')
  const qualitative = uncorrected.filter((m) => m.nature === 'qualitative')
  const gross = round(quantitative.reduce((a, m) => a + Math.abs(m.amount), 0), 6)
  const net = round(quantitative.reduce((a, m) => a + (m.direction === 'overstatement' ? m.amount : -m.amount), 0), 6)
  const base = setting?.assertion_declared_value ?? null
  const pct = (x: number) => (base ? round((Math.abs(x) / Math.abs(base)) * 100, 2) : null)
  const abs = setting ? (setting.threshold_abs ?? thresholdAbs(setting.threshold_pct, base)) : null
  const exceeds = abs != null ? gross >= abs || Math.abs(net) >= abs : false
  const materialQualitative = qualitative.some((m) => m.material_candidate)
  const warning = consistencyWarning({ exceeds, materialQualitative, draftOpinionType })
  return {
    gross,
    net,
    gross_pct: pct(gross),
    net_pct: pct(net),
    threshold_abs: abs,
    threshold_pct: setting?.threshold_pct ?? null,
    unit: setting?.assertion_unit ?? quantitative[0]?.amount_unit ?? 'tCO2e',
    exceeds,
    qualitative_count: qualitative.length,
    material_qualitative: materialQualitative,
    confirmed_count: confirmed.length,
    corrected_count: confirmed.filter((m) => m.corrected).length,
    warning: warning.raised,
    warning_reason: warning.reason,
  }
}

/** Opinion types that assert "no material misstatement" and are therefore inconsistent with an exceeded threshold. */
const CLEAN_OPINIONS: readonly OpinionType[] = ['unqualified', 'validation_positive']

/**
 * PRD FR-87: a warning, never a block. Raised when the aggregate meets or exceeds materiality (or a qualitative
 * misstatement is a material candidate) while the draft opinion is unqualified.
 */
export function consistencyWarning(input: { exceeds: boolean; materialQualitative: boolean; draftOpinionType: OpinionType | null }): { raised: boolean; reason: string | null } {
  if (!input.draftOpinionType || !CLEAN_OPINIONS.includes(input.draftOpinionType)) return { raised: false, reason: null }
  if (input.exceeds) return { raised: true, reason: 'Aggregated uncorrected misstatements meet or exceed materiality while the draft opinion is unqualified.' }
  if (input.materialQualitative) return { raised: true, reason: 'A qualitative misstatement is marked as a material candidate while the draft opinion is unqualified.' }
  return { raised: false, reason: null }
}

/** Proposes a misstatement from an adjusted-versus-declared difference (PRD FR-85 "proposed by the system"). */
export function proposeMisstatement(declared: number, adjusted: number): { direction: MisstatementDirection; amount: number } | null {
  const diff = round(adjusted - declared, 6)
  if (Math.abs(diff) < 1e-9) return null
  // The client declared more than was verified → overstatement; less → understatement.
  return { direction: diff < 0 ? 'overstatement' : 'understatement', amount: Math.abs(diff) }
}
