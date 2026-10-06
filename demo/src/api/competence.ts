/**
 * Competence profiles, nomination checks, rotation history and legacy engagements (PRD v0.3 §6.21, §6.22,
 * FR-94–FR-98). Managers maintain profiles (never their own); checks run at nomination, reassignment and triage.
 */
import type { QualificationKind, QualificationStatus, ServiceRole, ServiceType } from '@/domain/enums'
import { QUALIFICATION_EXPIRING_DAYS } from '@/domain/enums'
import type { CompetenceProfile, CompetenceQualification, LegacyEngagement } from '@/domain/schemas'
import { checkCompetence, daysUntilExpiry, qualificationStatus, type CompetenceCheck } from '@/domain/workflow/competence'
import { checkRotation, checkVvbRotation, type EngagementHistoryRow, type RotationCheck, type RotationCheckItem } from '@/domain/workflow/rotation'
import { todayIso } from '@/mock/clock'
import { ApiError, activeTemplateFor, audit, auditNow, authContext, authorize, call, getStore, managerUserIds, newId, notify, nowIsoString, orgName, userName } from './core'

// ---------------------------------------------------------------- profiles
export interface QualificationView extends CompetenceQualification {
  status: QualificationStatus
  daysToExpiry: number
}

export interface ProfileView extends CompetenceProfile {
  userName: string
  jobTitle: string
  orgRole: string
  qualifications: QualificationView[]
  /** Worst status across qualifications; `none` when the profile is empty. */
  overall: QualificationStatus | 'none'
  lastEditedByName: string | null
  activeAssignments: number
  isOwn: boolean
}

function qualificationView(q: CompetenceQualification): QualificationView {
  const today = todayIso()
  return { ...q, status: qualificationStatus(q, today), daysToExpiry: daysUntilExpiry(q, today) }
}

export function ensureProfile(userId: string, actorId: string | null): CompetenceProfile {
  const s = getStore()
  const existing = s.where('competenceProfiles', (p) => p.user_id === userId)[0]
  if (existing) return existing
  const row: CompetenceProfile = { ...auditNow(actorId), id: newId('cmp'), user_id: userId, verifier_org_id: 'org_verifassur', languages_json: [], summary: '', last_edited_by: null, last_edited_at: null }
  s.insert('competenceProfiles', row)
  return row
}

export function profileViewSync(userId: string): ProfileView {
  const s = getStore()
  const p = ensureProfile(userId, null)
  const u = s.get('users', userId)
  const m = s.where('memberships', (x) => x.user_id === userId && x.org_id === 'org_verifassur')[0]
  const quals = s.where('competenceQualifications', (q) => q.profile_id === p.id).map(qualificationView).sort((a, b) => a.kind.localeCompare(b.kind))
  const overall: ProfileView['overall'] = quals.length === 0 ? 'none' : quals.some((q) => q.status === 'expired') ? 'expired' : quals.some((q) => q.status === 'expiring') ? 'expiring' : 'valid'
  const isOwn = (() => {
    try {
      return authContext().userId === userId
    } catch {
      return false
    }
  })()
  return {
    ...p,
    userName: u.name,
    jobTitle: u.job_title ?? '',
    orgRole: m?.role ?? '',
    qualifications: quals,
    overall,
    lastEditedByName: p.last_edited_by ? userName(p.last_edited_by) : null,
    activeAssignments: s.where('team', (t) => t.user_id === userId && t.status !== 'removed' && t.service_role !== 'client_contact').filter((t) => ['contracting', 'planning', 'execution', 'opinion_review', 'in_revision', 'on_hold'].includes(s.get('services', t.service_id).status)).length,
    isOwn,
  }
}

export async function listProfiles(filter: { expiringWithinDays?: number } = {}): Promise<ProfileView[]> {
  return call(() => {
    authorize('competence.read')
    const s = getStore()
    let rows = s
      .where('memberships', (m) => m.org_id === 'org_verifassur' && m.status === 'active' && m.role !== 'platform_admin')
      .map((m) => profileViewSync(m.user_id))
      .sort((a, b) => a.userName.localeCompare(b.userName))
    if (filter.expiringWithinDays != null) rows = rows.filter((p) => p.qualifications.some((q) => q.daysToExpiry <= filter.expiringWithinDays!))
    return rows
  })
}

export async function getProfile(userId: string): Promise<ProfileView> {
  return call(() => {
    authorize('competence.read')
    return profileViewSync(userId)
  })
}

function assertNotOwn(userId: string) {
  const ctx = authContext()
  authorize('competence.edit', { ownProfile: ctx.userId === userId })
  return ctx
}

export async function updateProfile(userId: string, patch: { languages?: string[]; summary?: string }): Promise<ProfileView> {
  return call(() => {
    const ctx = assertNotOwn(userId)
    const s = getStore()
    const p = ensureProfile(userId, ctx.userId)
    const next: Partial<CompetenceProfile> = { last_edited_by: ctx.userId, last_edited_at: nowIsoString() }
    if (patch.languages) next.languages_json = patch.languages
    if (patch.summary !== undefined) next.summary = patch.summary
    s.update('competenceProfiles', p.id, next, ctx.userId)
    audit(ctx, { orgId: 'org_verifassur', serviceId: null, eventType: 'competence.edited', entityType: 'competence_profile', entityId: p.id, summary: `Competence profile of ${userName(userId)} updated by ${userName(ctx.userId)}`, before: { languages: p.languages_json, summary: p.summary }, after: { languages: next.languages_json ?? p.languages_json, summary: next.summary ?? p.summary } })
    return profileViewSync(userId)
  })
}

export interface QualificationInput {
  kind: QualificationKind
  sector_scopes: string[]
  technical_areas: string[]
  programmes: string[]
  valid_from: string
  valid_until: string
  evidence_document_id?: string | null
  note?: string | null
}

export async function upsertQualification(userId: string, input: QualificationInput, qualificationId?: string): Promise<ProfileView> {
  return call(() => {
    const ctx = assertNotOwn(userId)
    const s = getStore()
    const p = ensureProfile(userId, ctx.userId)
    if (!input.valid_from || !input.valid_until || input.valid_until < input.valid_from) throw new ApiError('validation', 'Validity dates are required and the end must not precede the start.')
    const base = { kind: input.kind, sector_scopes_json: input.sector_scopes, technical_areas_json: input.technical_areas, programmes_json: input.programmes, valid_from: input.valid_from, valid_until: input.valid_until, evidence_document_id: input.evidence_document_id ?? null, note: input.note ?? null }
    let before: unknown = null
    if (qualificationId) {
      before = s.get('competenceQualifications', qualificationId)
      s.update('competenceQualifications', qualificationId, base, ctx.userId)
    } else {
      s.insert('competenceQualifications', { ...auditNow(ctx.userId), id: newId('qual'), profile_id: p.id, ...base })
    }
    s.update('competenceProfiles', p.id, { last_edited_by: ctx.userId, last_edited_at: nowIsoString() }, ctx.userId)
    audit(ctx, { orgId: 'org_verifassur', serviceId: null, eventType: 'competence.edited', entityType: 'competence_qualification', entityId: qualificationId ?? p.id, summary: `${qualificationId ? 'Qualification updated' : 'Qualification added'} for ${userName(userId)} by ${userName(ctx.userId)}: ${input.kind.replace(/_/g, ' ')} valid ${input.valid_from} – ${input.valid_until}`, before, after: base })
    return profileViewSync(userId)
  })
}

export async function removeQualification(userId: string, qualificationId: string, reason: string): Promise<ProfileView> {
  return call(() => {
    const ctx = assertNotOwn(userId)
    const s = getStore()
    const q = s.get('competenceQualifications', qualificationId)
    if (!reason.trim()) throw new ApiError('validation', 'Say why the qualification is removed.')
    s.remove('competenceQualifications', qualificationId)
    audit(ctx, { orgId: 'org_verifassur', serviceId: null, eventType: 'competence.edited', entityType: 'competence_qualification', entityId: qualificationId, summary: `Qualification ${q.kind.replace(/_/g, ' ')} removed from ${userName(userId)} by ${userName(ctx.userId)} — ${reason.trim()}`, reason: reason.trim(), before: q, after: null })
    return profileViewSync(userId)
  })
}

/** Cron stand-in (PRD FR-55): reminders at 90 / 30 / 7 days and on expiry; idempotent per qualification and threshold. */
export function expiryRemindersSync(): number {
  const s = getStore()
  let n = 0
  for (const q of s.all('competenceQualifications').map(qualificationView)) {
    const threshold = q.daysToExpiry < 0 ? 'expired' : q.daysToExpiry <= 7 ? '7' : q.daysToExpiry <= 30 ? '30' : q.daysToExpiry <= QUALIFICATION_EXPIRING_DAYS ? '90' : null
    if (!threshold) continue
    const p = s.get('competenceProfiles', q.profile_id)
    const key = `${q.id}:${threshold}`
    if (s.where('notifications', (x) => (x.type === 'competence_expiring' || x.type === 'competence_expired') && x.body.includes(key)).length) continue
    const type = threshold === 'expired' ? 'competence_expired' : 'competence_expiring'
    const title = threshold === 'expired' ? `${q.kind.replace(/_/g, ' ')} qualification expired` : `${q.kind.replace(/_/g, ' ')} qualification expires in ${q.daysToExpiry} days`
    notify([p.user_id, ...managerUserIds()], 'org_verifassur', type, title, `${userName(p.user_id)}: ${q.kind.replace(/_/g, ' ')} valid until ${q.valid_until}. Renew the evidence on the Competence page. [${key}]`, null, { type: 'competence', id: p.user_id })
    n++
  }
  return n
}

// ---------------------------------------------------------------- rotation history and legacy engagements
export function historySync(): EngagementHistoryRow[] {
  const s = getStore()
  const done = s.where('services', (x) => x.verifier_org_id === 'org_verifassur' && (x.status === 'issued' || x.status === 'closed')).map((x) => ({
    reference: x.reference,
    projectId: x.project_id,
    clientOrgId: x.org_id,
    periodStart: x.period_start,
    periodEnd: x.period_end,
    roles: s.where('team', (t) => t.service_id === x.id && t.service_role !== 'client_contact').map((t) => ({ userId: t.user_id, role: t.service_role })),
  }))
  const legacy = s.all('legacyEngagements').map((l) => ({ reference: l.reference, projectId: l.project_id, clientOrgId: l.client_org_id, periodStart: l.period_start, periodEnd: l.period_end, roles: l.user_id && l.service_role ? [{ userId: l.user_id, role: l.service_role }] : [] }))
  return [...done, ...legacy]
}

export interface HistoryLine {
  reference: string
  period: string
  role: string | null
  legacy: boolean
}

/** Prior engagements of a person for the same client (and the same project), newest first, for the team panel. */
export function personHistorySync(userId: string, clientOrgId: string, projectId: string | null): HistoryLine[] {
  const s = getStore()
  return historySync()
    .filter((r) => r.clientOrgId === clientOrgId && r.roles.some((x) => x.userId === userId))
    .sort((a, b) => (a.periodEnd < b.periodEnd ? 1 : -1))
    .map((r) => ({ reference: r.reference, period: `${r.periodStart.slice(0, 4)}${r.periodEnd.slice(0, 4) !== r.periodStart.slice(0, 4) ? `–${r.periodEnd.slice(0, 4)}` : ''}${r.projectId && r.projectId === projectId ? ' (same project)' : ''}`, role: r.roles.find((x) => x.userId === userId)?.role ?? null, legacy: !s.where('services', (x) => x.reference === r.reference).length }))
}

export async function rotationHistory(filter: { userId?: string; orgId?: string; projectId?: string }): Promise<HistoryLine[]> {
  return call(() => {
    authorize('competence.read')
    if (filter.userId && filter.orgId) return personHistorySync(filter.userId, filter.orgId, filter.projectId ?? null)
    return historySync()
      .filter((r) => (!filter.orgId || r.clientOrgId === filter.orgId) && (!filter.projectId || r.projectId === filter.projectId))
      .sort((a, b) => (a.periodEnd < b.periodEnd ? 1 : -1))
      .map((r) => ({ reference: r.reference, period: r.periodStart.slice(0, 4), role: null, legacy: false }))
  })
}

export interface LegacyView extends LegacyEngagement {
  clientName: string
  userName: string | null
  enteredByName: string
}

export async function listLegacy(): Promise<LegacyView[]> {
  return call(() => {
    authorize('competence.read')
    return getStore()
      .all('legacyEngagements')
      .sort((a, b) => (a.period_end < b.period_end ? 1 : -1))
      .map((l) => ({ ...l, clientName: orgName(l.client_org_id), userName: l.user_id ? userName(l.user_id) : null, enteredByName: userName(l.entered_by) }))
  })
}

export async function addLegacy(input: { clientOrgId: string; projectId?: string | null; userId?: string | null; serviceRole?: ServiceRole | null; serviceType: ServiceType; reference: string; periodStart: string; periodEnd: string; note?: string | null }): Promise<LegacyView[]> {
  return call(() => {
    const ctx = authorize('legacy.manage')
    const s = getStore()
    if (!input.reference.trim()) throw new ApiError('validation', 'Enter the historic reference.')
    const row: LegacyEngagement = { ...auditNow(ctx.userId), id: newId('leg'), verifier_org_id: 'org_verifassur', client_org_id: input.clientOrgId, project_id: input.projectId ?? null, user_id: input.userId ?? null, service_role: input.serviceRole ?? null, service_type: input.serviceType, reference: input.reference.trim(), period_start: input.periodStart, period_end: input.periodEnd, entered_by: ctx.userId, note: input.note ?? null }
    s.insert('legacyEngagements', row)
    audit(ctx, { orgId: input.clientOrgId, serviceId: null, eventType: 'legacy_engagement.added', entityType: 'legacy_engagement', entityId: row.id, summary: `Legacy engagement ${row.reference} (${row.period_start.slice(0, 4)}) recorded for rotation history by ${userName(ctx.userId)}${row.user_id ? `: ${userName(row.user_id)} as ${row.service_role?.replace('verifier_', '').replace(/_/g, ' ')}` : ''}`, after: row })
    return s.all('legacyEngagements').sort((a, b) => (a.period_end < b.period_end ? 1 : -1)).map((l) => ({ ...l, clientName: orgName(l.client_org_id), userName: l.user_id ? userName(l.user_id) : null, enteredByName: userName(l.entered_by) }))
  })
}

// ---------------------------------------------------------------- nomination checks (FR-96, FR-98)
export interface CandidateCheck {
  userId: string
  role: ServiceRole
  competence: CompetenceCheck
  rotation: RotationCheck
  history: HistoryLine[]
  qualificationSummary: string
  blocked: boolean
  warnings: string[]
  blocks: string[]
}

export function checkCandidateSync(serviceId: string, userId: string, role: ServiceRole): CandidateCheck {
  const s = getStore()
  const svc = s.get('services', serviceId)
  const project = s.get('projects', svc.project_id)
  const template = activeTemplateFor(svc.service_type)
  const profile = profileViewSync(userId)
  const execution = s.where('phases', (p) => p.service_id === serviceId && p.key === 'execution')[0]
  const otherQuals = s
    .where('team', (t) => t.service_id === serviceId && t.status !== 'removed' && t.service_role !== 'client_contact' && t.user_id !== userId)
    .flatMap((t) => profileViewSync(t.user_id).qualifications)
  const competence = checkCompetence({
    role,
    candidate: profile.qualifications,
    team: otherQuals,
    requirements: template.competence_requirements,
    service: { programme: project.programme, sector_scopes: svc.scope_json.sector_scopes, technical_areas: svc.scope_json.technical_areas, execution_start: execution?.planned_start ?? todayIso(), execution_end: execution?.planned_end ?? todayIso() },
  })
  const rotation = checkRotation({ rules: template.rotation_rules, history: historySync().filter((r) => r.reference !== svc.reference), service: { projectId: svc.project_id, clientOrgId: svc.org_id, periodStart: svc.period_start }, candidateUserId: userId, role })
  const items = [...competence.items, ...rotation.items]
  const relevant = profile.qualifications.filter((q) => ['lead_verifier', 'verifier', 'independent_reviewer', 'technical_expert', 'lead_validator', 'validator'].includes(q.kind))
  return {
    userId,
    role,
    competence,
    rotation,
    history: personHistorySync(userId, svc.org_id, svc.project_id),
    qualificationSummary: relevant.length ? relevant.map((q) => `${q.kind.replace(/_/g, ' ')} (${q.status}, until ${q.valid_until})`).join(' · ') : 'No qualification on file',
    blocked: competence.blocked || rotation.blocked,
    warnings: items.filter((i) => i.result === 'warning').map((i) => `${i.requirement}: ${i.detail}`),
    blocks: items.filter((i) => i.result === 'block').map((i) => `${i.requirement}: ${i.detail}`),
  }
}

/** Dry run for the candidate picker (PRD §10.2 `GET /services/:id/team/check`). */
export async function checkCandidate(serviceId: string, userId: string, role: ServiceRole): Promise<CandidateCheck> {
  return call(() => {
    authorize('team.nominate', { serviceId, orgId: getStore().get('services', serviceId).org_id })
    return checkCandidateSync(serviceId, userId, role)
  })
}

/** VVB-level rotation at triage (FR-98): warn only. */
export function vvbCheckSync(serviceId: string): RotationCheckItem[] {
  const s = getStore()
  const svc = s.get('services', serviceId)
  const template = activeTemplateFor(svc.service_type)
  return checkVvbRotation(template.rotation_rules, historySync().filter((r) => r.reference !== svc.reference), { projectId: svc.project_id, clientOrgId: svc.org_id, periodStart: svc.period_start })
}
