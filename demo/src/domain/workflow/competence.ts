/**
 * Competence checks at nomination and reassignment (PRD v0.3 FR-94–FR-96, ISO 14065 / ISO 14066). Pure functions.
 * A missing or expired independent-reviewer qualification is a hard block; every other gap is a warning the manager
 * may override with a reason.
 */
import type { CheckResult, QualificationKind, QualificationStatus, ServiceRole } from '../enums'
import { QUALIFICATION_EXPIRING_DAYS, QUALIFICATION_KIND_LABELS } from '../enums'
import type { CheckItem } from '../schemas/engagement'
import type { CompetenceRequirements } from './template.schema'

export interface QualificationLike {
  kind: QualificationKind
  sector_scopes_json: string[]
  technical_areas_json: string[]
  programmes_json: string[]
  valid_from: string
  valid_until: string
}

const DAY_MS = 86_400_000

/** `valid | expiring | expired` from `valid_until`, computed as of a date (PRD §8.5, never stored). */
export function qualificationStatus(q: Pick<QualificationLike, 'valid_from' | 'valid_until'>, asOf: string): QualificationStatus {
  const today = asOf.slice(0, 10)
  if (q.valid_until < today || q.valid_from > today) return 'expired'
  const days = Math.round((new Date(`${q.valid_until}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) / DAY_MS)
  return days <= QUALIFICATION_EXPIRING_DAYS ? 'expiring' : 'valid'
}

/** Days until expiry (negative when expired). */
export function daysUntilExpiry(q: Pick<QualificationLike, 'valid_until'>, asOf: string): number {
  return Math.round((new Date(`${q.valid_until}T00:00:00Z`).getTime() - new Date(`${asOf.slice(0, 10)}T00:00:00Z`).getTime()) / DAY_MS)
}

export interface CompetenceCheckInput {
  role: ServiceRole
  candidate: QualificationLike[]
  /** Qualifications of the other verifier members already on the team (for coverage). */
  team: QualificationLike[]
  requirements: CompetenceRequirements
  service: { programme: string | null; sector_scopes: string[]; technical_areas: string[]; execution_start: string; execution_end: string }
}

export interface CompetenceCheck {
  items: CheckItem[]
  result: CheckResult
  blocked: boolean
}

function worst(items: CheckItem[]): CheckResult {
  if (items.some((i) => i.result === 'block')) return 'block'
  if (items.some((i) => i.result === 'warning')) return 'warning'
  return 'ok'
}

/** A qualification covers the planned execution window when it is valid on the planned end date. */
function coversWindow(q: QualificationLike, start: string, end: string): 'yes' | 'expires_during' | 'no' {
  if (q.valid_from > start || q.valid_until < start) return 'no'
  return q.valid_until >= end ? 'yes' : 'expires_during'
}

export function checkCompetence(input: CompetenceCheckInput): CompetenceCheck {
  const items: CheckItem[] = []
  const req = input.requirements.roles[input.role]
  if (req) {
    const label = QUALIFICATION_KIND_LABELS[req.qualification]
    const matching = input.candidate.filter((q) => q.kind === req.qualification && (!req.programme || q.programmes_json.includes(req.programme)))
    const block = input.role === 'verifier_independent_reviewer'
    if (matching.length === 0) {
      items.push({ key: `qualification:${req.qualification}`, requirement: `${label} qualification`, result: block ? 'block' : 'warning', detail: `No ${label.toLowerCase()} qualification on file${req.programme ? ` for ${req.programme}` : ''}.` })
    } else {
      const best = [...matching].sort((a, b) => (a.valid_until < b.valid_until ? 1 : -1))[0]
      const cover = coversWindow(best, input.service.execution_start, input.service.execution_end)
      if (cover === 'yes') items.push({ key: `qualification:${req.qualification}`, requirement: `${label} qualification`, result: 'ok', detail: `Valid until ${best.valid_until}.` })
      else if (cover === 'expires_during') items.push({ key: `qualification:${req.qualification}`, requirement: `${label} qualification`, result: block ? 'block' : 'warning', detail: `Expires on ${best.valid_until}, before the planned execution end (${input.service.execution_end}).` })
      else items.push({ key: `qualification:${req.qualification}`, requirement: `${label} qualification`, result: block ? 'block' : 'warning', detail: `Expired on ${best.valid_until}.` })
    }
    if (input.service.programme) {
      const programmeOk = input.candidate.some((q) => q.programmes_json.includes(input.service.programme!))
      items.push({ key: 'programme', requirement: `Programme ${input.service.programme}`, result: programmeOk ? 'ok' : 'warning', detail: programmeOk ? 'Covered by a qualification.' : `No qualification lists ${input.service.programme}.` })
    }
  }
  if (input.requirements.team_coverage && (input.service.sector_scopes.length || input.service.technical_areas.length)) {
    const all = [...input.candidate, ...input.team]
    const scopes = new Set(all.flatMap((q) => q.sector_scopes_json))
    const areas = new Set(all.flatMap((q) => q.technical_areas_json))
    const missingScopes = input.service.sector_scopes.filter((s) => !scopes.has(s))
    const missingAreas = input.service.technical_areas.filter((a) => !areas.has(a))
    items.push({ key: 'team_coverage', requirement: 'Team covers the sector scope and technical areas', result: missingScopes.length || missingAreas.length ? 'warning' : 'ok', detail: missingScopes.length || missingAreas.length ? `Not covered: ${[...missingScopes, ...missingAreas].join(', ')}.` : 'Every sector scope and technical area is covered.' })
  }
  const result = worst(items)
  return { items, result, blocked: result === 'block' }
}
