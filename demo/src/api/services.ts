/** Services (engagements): list, detail aggregate, request lifecycle, triage, hold/cancel/close, timeline, log. */
import type { PHASE_KEYS, ServiceOverrideAction, ServiceStatus, ServiceType, StepOverrideAction } from '@/domain/enums'
import { SERVICE_TYPE_LABELS } from '@/domain/enums'
import { isPlatformAdmin } from '@/domain/policy'
import type { Approval, AuditEvent, DocumentSlot, DocumentVersion, Invoice, Phase, Project, Service, ServiceScope, Step } from '@/domain/schemas'
import { instantiateTemplate } from '@/domain/workflow/instantiate'
import { canStartStep, serviceMachine, type StepAction } from '@/domain/workflow/machines'
import type { NextAction } from '@/domain/workflow/next-action'
import { computeNextAction, isActionForViewer } from '@/domain/workflow/next-action'
import { templateFor } from '@/domain/workflow/templates'
import { snapshotFrom } from '@/mock/snapshot'
import { todayIso } from '@/mock/clock'
import { ApiError, audit, auditNow, authContext, authorize, call, getStore, newId, notify, nowIsoString, orgName, serviceAudience, serviceResource, userName } from './core'
import { currentStepOf, overrideStepInternal, requireReason, startFirstStep, transitionStepInternal } from './steps'

export { syncServiceStatus, refreshPhaseStatus } from './steps'

export interface ServiceListItem {
  id: string
  reference: string
  name: string
  serviceType: ServiceType
  serviceTypeLabel: string
  standard: string
  status: ServiceStatus
  orgId: string
  orgName: string
  projectId: string
  projectName: string
  country: string
  periodStart: string
  periodEnd: string
  phaseKey: (typeof PHASE_KEYS)[number] | null
  phaseName: string | null
  stepName: string | null
  nextAction: NextAction | null
  /** True when the next action is on the viewer's side. */
  actionForMe: boolean
  teamLeaderName: string | null
  myRoles: string[]
  requestedAt: string | null
  issuedAt: string | null
  closedAt: string | null
  paidStatus: 'paid' | 'invoiced' | 'quoted' | 'none'
  openFindings: number
  updatedAt: string
}

export interface SlotView extends DocumentSlot {
  document: { id: string; title: string; version: DocumentVersion | null; versionCount: number } | null
}

export interface TeamView {
  id: string
  userId: string
  name: string
  email: string
  jobTitle: string
  role: string
  status: string
  coi: { id: string; status: string; declaration: string | null; details: string | null; declaredAt: string | null; decidedAt: string | null } | null
}

export interface ServiceDetail {
  service: Service
  project: Project
  orgName: string
  phases: (Phase & { steps: (Step & { slots: SlotView[]; approvals: Approval[]; canStart: boolean; startBlockedReason: string | null })[] })[]
  team: TeamView[]
  invoices: Invoice[]
  nextAction: NextAction | null
  actionForMe: boolean
  counts: { findingsOpen: number; findingsTotal: number; documents: number; iterations: number }
  statementCode: string | null
  myRoles: string[]
  canEdit: boolean
  clientContactName: string | null
}

// ---------------------------------------------------------------- helpers
function viewer() {
  const ctx = authContext()
  const roles = ctx.orgRole ? [ctx.orgRole] : []
  return { ctx, party: ctx.orgType, roles, userId: ctx.userId }
}

function paidStatus(serviceId: string): ServiceListItem['paidStatus'] {
  const inv = getStore().where('invoices', (i) => i.service_id === serviceId)
  if (inv.some((i) => i.kind === 'invoice' && i.status === 'paid')) return 'paid'
  if (inv.some((i) => i.kind === 'invoice')) return 'invoiced'
  if (inv.some((i) => i.kind === 'quote')) return 'quoted'
  return 'none'
}

export function toListItem(svc: Service): ServiceListItem {
  const s = getStore()
  const v = viewer()
  const project = s.get('projects', svc.project_id)
  const snap = snapshotFrom({ services: [svc], phases: s.all('phases'), steps: s.all('steps'), slots: s.all('slots'), approvals: s.all('approvals'), team: s.all('team'), cois: s.all('cois'), findings: s.all('findings'), iterations: s.all('iterations') }, svc.id)
  const nextAction = computeNextAction(snap)
  const cur = currentStepOf(svc.id)
  const myRoles = [...(v.ctx.serviceRoles[svc.id] ?? [])]
  return {
    id: svc.id,
    reference: svc.reference,
    name: svc.name,
    serviceType: svc.service_type,
    serviceTypeLabel: SERVICE_TYPE_LABELS[svc.service_type],
    standard: svc.standard,
    status: svc.status,
    orgId: svc.org_id,
    orgName: orgName(svc.org_id),
    projectId: project.id,
    projectName: project.name,
    country: project.country,
    periodStart: svc.period_start,
    periodEnd: svc.period_end,
    phaseKey: cur?.phase.key ?? null,
    phaseName: cur?.phase.name ?? null,
    stepName: cur?.step.name ?? null,
    nextAction,
    actionForMe: isActionForViewer(nextAction, { party: v.party, roles: [...v.roles, ...myRoles], userId: v.userId }),
    teamLeaderName: svc.team_leader_user_id ? userName(svc.team_leader_user_id) : null,
    myRoles,
    requestedAt: svc.requested_at,
    issuedAt: svc.issued_at,
    closedAt: svc.closed_at,
    paidStatus: paidStatus(svc.id),
    openFindings: s.where('findings', (f) => f.service_id === svc.id && (f.status === 'open' || f.status === 'responded' || f.status === 'under_review')).length,
    updatedAt: svc.updated_at,
  }
}

function visibleServices(): Service[] {
  const s = getStore()
  const ctx = authContext()
  if (ctx.orgType === 'client') return s.where('services', (x) => x.org_id === ctx.orgId && !x.deleted_at)
  // ADMIN sees every engagement (read-only); managers, coordinators and finance see the whole verifier portfolio.
  const orgWide = isPlatformAdmin(ctx) || ctx.orgRole === 'verifier_manager' || ctx.orgRole === 'verifier_coordinator' || ctx.orgRole === 'verifier_finance'
  return s.where('services', (x) => x.verifier_org_id === ctx.orgId && !x.deleted_at && (orgWide || (ctx.serviceRoles[x.id]?.length ?? 0) > 0))
}

// ---------------------------------------------------------------- reads
export interface ListFilter {
  status?: ServiceStatus[] | 'ongoing' | 'past' | 'drafts'
  projectId?: string
  type?: ServiceType
  orgId?: string
  search?: string
}

const ONGOING: ServiceStatus[] = ['requested', 'triage', 'contracting', 'planning', 'execution', 'opinion_review', 'issued', 'on_hold']
const PAST: ServiceStatus[] = ['closed', 'cancelled']

export async function list(filter: ListFilter = {}): Promise<ServiceListItem[]> {
  return call(() => {
    let rows = visibleServices()
    if (filter.status === 'ongoing') rows = rows.filter((r) => ONGOING.includes(r.status))
    else if (filter.status === 'past') rows = rows.filter((r) => PAST.includes(r.status))
    else if (filter.status === 'drafts') rows = rows.filter((r) => r.status === 'draft')
    else if (Array.isArray(filter.status)) rows = rows.filter((r) => (filter.status as ServiceStatus[]).includes(r.status))
    if (filter.projectId) rows = rows.filter((r) => r.project_id === filter.projectId)
    if (filter.type) rows = rows.filter((r) => r.service_type === filter.type)
    if (filter.orgId) rows = rows.filter((r) => r.org_id === filter.orgId)
    if (filter.search) {
      const q = filter.search.toLowerCase()
      rows = rows.filter((r) => r.name.toLowerCase().includes(q) || r.reference.toLowerCase().includes(q))
    }
    return rows.map(toListItem).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
  })
}

export function slotView(slot: DocumentSlot): SlotView {
  const s = getStore()
  const doc = slot.current_document_id ? s.find('documents', slot.current_document_id) : null
  if (!doc) return { ...slot, document: null }
  const versions = s.where('documentVersions', (v) => v.document_id === doc.id && !v.deleted_at)
  const version = doc.current_version_id ? (s.find('documentVersions', doc.current_version_id) ?? null) : null
  return { ...slot, document: { id: doc.id, title: doc.title, version, versionCount: versions.length } }
}

export function teamView(serviceId: string): TeamView[] {
  const s = getStore()
  return s
    .where('team', (t) => t.service_id === serviceId && t.status !== 'removed')
    .map((t) => {
      const u = s.get('users', t.user_id)
      const coi = s.where('cois', (c) => c.service_team_id === t.id)[0]
      return {
        id: t.id,
        userId: u.id,
        name: u.name,
        email: u.email,
        jobTitle: u.job_title ?? '',
        role: t.service_role,
        status: t.status,
        coi: coi ? { id: coi.id, status: coi.status, declaration: coi.declaration, details: coi.details, declaredAt: coi.declared_at, decidedAt: coi.decided_at } : null,
      }
    })
}

export function getSync(serviceId: string): ServiceDetail {
  const s = getStore()
  const ctx = authorize('service.read', serviceResource(serviceId))
  const service = s.get('services', serviceId)
  const project = s.get('projects', service.project_id)
  const allSteps = s.where('steps', (st) => st.service_id === serviceId)
  const phases = s.where('phases', (p) => p.service_id === serviceId).sort((a, b) => a.order_no - b.order_no)
  const gatingInput = allSteps.map((st) => ({ phase_order: phases.find((p) => p.id === st.phase_id)!.order_no, order_no: st.order_no, status: st.status, parallel_allowed: st.parallel_allowed }))
  const nextAction = computeNextAction(snapshotFrom({ services: s.all('services'), phases: s.all('phases'), steps: s.all('steps'), slots: s.all('slots'), approvals: s.all('approvals'), team: s.all('team'), cois: s.all('cois'), findings: s.all('findings'), iterations: s.all('iterations') }, serviceId))
  const myRoles = [...(ctx.serviceRoles[serviceId] ?? [])]
  const v = viewer()
  return {
    service,
    project,
    orgName: orgName(service.org_id),
    phases: phases.map((p) => ({
      ...p,
      steps: allSteps
        .filter((st) => st.phase_id === p.id)
        .sort((a, b) => a.order_no - b.order_no)
        .map((st) => {
          const gate = canStartStep({ phase_order: p.order_no, order_no: st.order_no, parallel_allowed: st.parallel_allowed }, gatingInput)
          return {
            ...st,
            slots: s.where('slots', (sl) => sl.step_id === st.id).map(slotView),
            approvals: s.where('approvals', (a) => a.step_id === st.id),
            canStart: gate.ok,
            startBlockedReason: gate.ok ? null : gate.reason,
          }
        }),
    })),
    team: teamView(serviceId),
    invoices: s.where('invoices', (i) => i.service_id === serviceId),
    nextAction,
    actionForMe: isActionForViewer(nextAction, { party: v.party, roles: [...v.roles, ...myRoles], userId: v.userId }),
    counts: {
      findingsOpen: s.where('findings', (f) => f.service_id === serviceId && f.status !== 'closed' && f.status !== 'withdrawn').length,
      findingsTotal: s.where('findings', (f) => f.service_id === serviceId).length,
      documents: s.where('documents', (d) => d.service_id === serviceId && !d.deleted_at).length,
      iterations: s.where('iterations', (i) => i.service_id === serviceId).length,
    },
    statementCode: s.where('statements', (st) => st.service_id === serviceId)[0]?.public_code ?? null,
    myRoles,
    canEdit: ctx.orgType === 'client' ? service.status === 'draft' : false,
    clientContactName: service.client_contact_user_id ? userName(service.client_contact_user_id) : null,
  }
}

export async function get(serviceId: string): Promise<ServiceDetail> {
  return call(() => getSync(serviceId))
}

// ---------------------------------------------------------------- request lifecycle (client)
export interface DraftInput {
  projectId: string
  serviceType: ServiceType
  name: string
  periodStart: string
  periodEnd: string
  scope: Partial<ServiceScope>
  targetOpinionDate?: string | null
}

function nextReference(): string {
  const year = todayIso().slice(0, 4)
  const count = getStore().all('services').filter((s) => s.reference.startsWith(`VX-${year}-`)).length
  return `VX-${year}-${String(60 + count).padStart(4, '0')}`
}

export async function createDraft(input: DraftInput): Promise<Service> {
  return call(() => {
    const ctx = authorize('service.create', { orgId: authContext().orgId })
    const s = getStore()
    const project = s.get('projects', input.projectId)
    if (project.org_id !== ctx.orgId) throw new ApiError('forbidden', 'Project belongs to another organisation')
    const template = templateFor(input.serviceType)
    const svc: Service = {
      ...auditNow(ctx.userId),
      id: newId('svc'),
      org_id: ctx.orgId,
      verifier_org_id: 'org_verifassur',
      project_id: project.id,
      template_id: template.id,
      template_version: template.version,
      service_type: input.serviceType,
      standard: template.standard,
      name: input.name,
      reference: nextReference(),
      status: 'draft',
      resume_status: null,
      period_start: input.periodStart,
      period_end: input.periodEnd,
      scope_json: { summary: '', sites: [], boundary: '', products: [], interventions: [], materiality_pct: 5, ...input.scope },
      requested_at: null,
      contracted_at: null,
      issued_at: null,
      closed_at: null,
      on_hold_reason: null,
      renewed_from_service_id: null,
      client_contact_user_id: ctx.userId,
      team_leader_user_id: null,
      target_opinion_date: input.targetOpinionDate ?? null,
    }
    s.insert('services', svc)
    audit(ctx, { orgId: ctx.orgId, serviceId: svc.id, eventType: 'service.created', entityType: 'service', entityId: svc.id, summary: `Request drafted: ${svc.name}`, after: { status: 'draft' } })
    return svc
  })
}

export async function updateDraft(serviceId: string, patch: Partial<DraftInput>): Promise<Service> {
  return call(() => {
    const ctx = authorize('service.update_draft', serviceResource(serviceId))
    const s = getStore()
    const svc = s.get('services', serviceId)
    if (svc.status !== 'draft') throw new ApiError('conflict', 'Only draft requests can be edited.')
    const next: Partial<Service> = {}
    if (patch.name != null) next.name = patch.name
    if (patch.periodStart) next.period_start = patch.periodStart
    if (patch.periodEnd) next.period_end = patch.periodEnd
    if (patch.targetOpinionDate !== undefined) next.target_opinion_date = patch.targetOpinionDate
    if (patch.serviceType && patch.serviceType !== svc.service_type) {
      const template = templateFor(patch.serviceType)
      next.service_type = patch.serviceType
      next.template_id = template.id
      next.template_version = template.version
      next.standard = template.standard
    }
    if (patch.projectId) next.project_id = patch.projectId
    if (patch.scope) next.scope_json = { ...svc.scope_json, ...patch.scope }
    return s.update('services', serviceId, next, ctx.userId)
  })
}

export async function submit(serviceId: string): Promise<Service> {
  return call(() => {
    const ctx = authorize('service.submit', serviceResource(serviceId))
    const s = getStore()
    const svc = s.get('services', serviceId)
    const { state } = serviceMachine.apply(svc.status, 'submit')
    const template = templateFor(svc.service_type)
    const inst = instantiateTemplate({ serviceId, template, startDate: todayIso(), now: nowIsoString(), actorId: ctx.userId, newId })
    for (const p of inst.phases) s.insert('phases', p)
    for (const st of inst.steps) s.insert('steps', st)
    for (const sl of inst.slots) s.insert('slots', sl)
    for (const a of inst.approvals) s.insert('approvals', a)
    const updated = s.update('services', serviceId, { status: state, requested_at: nowIsoString() }, ctx.userId)
    audit(ctx, { orgId: svc.org_id, serviceId, eventType: 'service.submitted', entityType: 'service', entityId: serviceId, summary: `Request submitted by ${userName(ctx.userId)}`, before: { status: 'draft' }, after: { status: state } })
    notify(serviceAudience(serviceId, 'verifier'), 'org_verifassur', 'request_received', 'New request to triage', `${svc.name} (${SERVICE_TYPE_LABELS[svc.service_type]}) submitted by ${userName(ctx.userId)} at ${orgName(svc.org_id)}.`, serviceId)
    return updated
  })
}

export async function renew(serviceId: string): Promise<Service> {
  return call(() => {
    const ctx = authorize('service.renew', serviceResource(serviceId))
    const s = getStore()
    const src = s.get('services', serviceId)
    const template = templateFor(src.service_type)
    const shift = (d: string) => `${Number(d.slice(0, 4)) + 1}${d.slice(4)}`
    const svc: Service = {
      ...src,
      ...auditNow(ctx.userId),
      id: newId('svc'),
      template_id: template.id,
      template_version: template.version,
      standard: template.standard,
      name: src.name.replace(/(FY|MP|monitoring period )?(\d{4})/, (_m, p, y) => `${p ?? ''}${Number(y) + 1}`),
      reference: nextReference(),
      status: 'draft',
      period_start: shift(src.period_start),
      period_end: shift(src.period_end),
      requested_at: null,
      contracted_at: null,
      issued_at: null,
      closed_at: null,
      on_hold_reason: null,
      renewed_from_service_id: src.id,
      client_contact_user_id: ctx.userId,
      team_leader_user_id: null,
      target_opinion_date: null,
    }
    s.insert('services', svc)
    audit(ctx, { orgId: svc.org_id, serviceId: svc.id, eventType: 'service.renewed', entityType: 'service', entityId: svc.id, summary: `Renewal drafted from ${src.reference}`, after: { renewed_from: src.id } })
    return svc
  })
}

// ---------------------------------------------------------------- triage and status (verifier)
export async function triage(serviceId: string, decision: 'accept' | 'decline', reason?: string): Promise<Service> {
  return call(() => {
    const ctx = authorize('service.triage', serviceResource(serviceId))
    const s = getStore()
    const svc = s.get('services', serviceId)
    const { state } = serviceMachine.apply(svc.status, decision === 'accept' ? 'triage_accept' : 'triage_decline')
    const updated = s.update('services', serviceId, { status: state, on_hold_reason: decision === 'decline' ? (reason ?? null) : null }, ctx.userId)
    audit(ctx, { orgId: svc.org_id, serviceId, eventType: decision === 'accept' ? 'service.triaged' : 'service.declined', entityType: 'service', entityId: serviceId, summary: decision === 'accept' ? `Request accepted for ${svc.standard} by ${userName(ctx.userId)}` : `Request declined by ${userName(ctx.userId)}: ${reason ?? ''}`, before: { status: svc.status }, after: { status: state } })
    notify(serviceAudience(serviceId, 'client'), svc.org_id, 'request_triaged', decision === 'accept' ? 'Request accepted' : 'Request declined', decision === 'accept' ? `VERIFASSUR accepted your request ${svc.reference}. Contracting has started.` : `VERIFASSUR could not accept ${svc.reference}: ${reason ?? 'no reason given'}.`, serviceId)
    if (decision === 'accept') startFirstStep(serviceId, ctx.userId)
    return updated
  })
}

export async function hold(serviceId: string, reason: string): Promise<Service> {
  return call(() => {
    const ctx = authorize('service.hold', serviceResource(serviceId))
    const s = getStore()
    const svc = s.get('services', serviceId)
    const { state } = serviceMachine.apply(svc.status, 'hold')
    const updated = s.update('services', serviceId, { status: state, resume_status: svc.status, on_hold_reason: reason }, ctx.userId)
    audit(ctx, { orgId: svc.org_id, serviceId, eventType: 'service.on_hold', entityType: 'service', entityId: serviceId, summary: `Service put on hold: ${reason}`, before: { status: svc.status }, after: { status: state } })
    notify(serviceAudience(serviceId, 'both'), svc.org_id, 'service_on_hold', `${svc.reference} on hold`, reason, serviceId)
    return updated
  })
}

export async function resume(serviceId: string): Promise<Service> {
  return call(() => {
    const ctx = authorize('service.hold', serviceResource(serviceId))
    const s = getStore()
    const svc = s.get('services', serviceId)
    serviceMachine.apply(svc.status, 'resume')
    const back = svc.resume_status ?? 'contracting'
    const updated = s.update('services', serviceId, { status: back, resume_status: null, on_hold_reason: null }, ctx.userId)
    audit(ctx, { orgId: svc.org_id, serviceId, eventType: 'service.resumed', entityType: 'service', entityId: serviceId, summary: 'Service resumed', before: { status: 'on_hold' }, after: { status: back } })
    return updated
  })
}

export async function cancel(serviceId: string, reason: string): Promise<Service> {
  return call(() => {
    const ctx = authorize('service.cancel', serviceResource(serviceId))
    const s = getStore()
    const svc = s.get('services', serviceId)
    const { state } = serviceMachine.apply(svc.status, 'cancel')
    const updated = s.update('services', serviceId, { status: state, on_hold_reason: reason, closed_at: nowIsoString() }, ctx.userId)
    audit(ctx, { orgId: svc.org_id, serviceId, eventType: 'service.cancelled', entityType: 'service', entityId: serviceId, summary: `Service cancelled: ${reason}`, before: { status: svc.status }, after: { status: state } })
    return updated
  })
}

export async function close(serviceId: string): Promise<Service> {
  return call(() => {
    const ctx = authorize('service.close', serviceResource(serviceId))
    const s = getStore()
    const svc = s.get('services', serviceId)
    const { state } = serviceMachine.apply(svc.status, 'close')
    const updated = s.update('services', serviceId, { status: state, closed_at: nowIsoString() }, ctx.userId)
    audit(ctx, { orgId: svc.org_id, serviceId, eventType: 'service.closed', entityType: 'service', entityId: serviceId, summary: `Service closed by ${userName(ctx.userId)}`, before: { status: svc.status }, after: { status: state } })
    return updated
  })
}

// ---------------------------------------------------------------- steps
export async function transitionStep(serviceId: string, stepId: string, action: StepAction, opts: { reason?: string; plannedStart?: string; plannedEnd?: string } = {}): Promise<Step> {
  return call(() => {
    const ctx = authorize('step.transition', serviceResource(serviceId))
    return transitionStepInternal(serviceId, stepId, action, ctx.userId, opts)
  })
}

// ---------------------------------------------------------------- manager overrides (PRD §6.14)
/** Force a step to completed / in progress / skipped with a mandatory reason (FR-73). */
export async function overrideStep(serviceId: string, stepId: string, action: StepOverrideAction, reason: string): Promise<Step> {
  return call(() => {
    const ctx = authorize('step.override', serviceResource(serviceId))
    return overrideStepInternal(ctx, serviceId, stepId, action, requireReason(reason))
  })
}

/** Force a service status change with a mandatory reason (FR-74); both parties are notified. */
export async function overrideService(serviceId: string, action: ServiceOverrideAction, reason: string): Promise<Service> {
  return call(() => {
    const ctx = authorize('service.override', serviceResource(serviceId))
    const r = requireReason(reason)
    const s = getStore()
    const svc = s.get('services', serviceId)
    let next: Partial<Service>
    if (action === 'resume') {
      serviceMachine.apply(svc.status, 'resume')
      next = { status: svc.resume_status ?? 'contracting', resume_status: null, on_hold_reason: null }
    } else if (action === 'return_to_execution') {
      next = { status: serviceMachine.apply(svc.status, 'return_to_execution').state }
    } else {
      const { state } = serviceMachine.apply(svc.status, action)
      next = { status: state }
      if (action === 'hold') Object.assign(next, { resume_status: svc.status, on_hold_reason: r })
      if (action === 'cancel') Object.assign(next, { on_hold_reason: r, closed_at: nowIsoString() })
      if (action === 'close') Object.assign(next, { closed_at: nowIsoString() })
    }
    const updated = s.update('services', serviceId, next, ctx.userId)
    const verb = { hold: 'put on hold', resume: 'resumed', cancel: 'cancelled', close: 'closed', return_to_execution: 'returned to execution' }[action]
    audit(ctx, { orgId: svc.org_id, serviceId, eventType: 'service.overridden', entityType: 'service', entityId: serviceId, summary: `Override: service ${verb} by ${userName(ctx.userId)} — ${r}`, reason: r, before: { status: svc.status }, after: { status: updated.status, action } })
    notify(serviceAudience(serviceId, 'both').filter((u) => u !== ctx.userId), svc.org_id, 'service_overridden', `${svc.reference} ${verb} by manager override`, `${userName(ctx.userId)} ${verb} ${svc.reference}. Reason: ${r}`, serviceId)
    return updated
  })
}

/** Change the planned dates of a step (FR-76); manager or team leader. */
export async function replanStep(serviceId: string, stepId: string, dates: { plannedStart: string | null; plannedEnd: string | null }, reason?: string): Promise<Step> {
  return call(() => {
    const ctx = authorize('step.plan_dates', serviceResource(serviceId))
    const s = getStore()
    const step = s.get('steps', stepId)
    if (step.service_id !== serviceId) throw new ApiError('not_found', 'Step not on this service')
    if (dates.plannedStart && dates.plannedEnd && dates.plannedEnd < dates.plannedStart) throw new ApiError('validation', 'The planned end must not be before the planned start.')
    const updated = s.update('steps', stepId, { planned_start: dates.plannedStart, planned_end: dates.plannedEnd }, ctx.userId)
    const svc = s.get('services', serviceId)
    audit(ctx, { orgId: svc.org_id, serviceId, eventType: 'step.replanned', entityType: 'step', entityId: stepId, summary: `${step.name} replanned to ${dates.plannedStart ?? '—'} – ${dates.plannedEnd ?? '—'} by ${userName(ctx.userId)}${reason ? ` — ${reason}` : ''}`, reason: reason?.trim() || null, before: { planned_start: step.planned_start, planned_end: step.planned_end }, after: { planned_start: dates.plannedStart, planned_end: dates.plannedEnd } })
    return updated
  })
}

// ---------------------------------------------------------------- timeline and log
export interface TimelineRow {
  id: string
  kind: 'phase' | 'step'
  phaseKey: string
  name: string
  status: string
  plannedStart: string | null
  plannedEnd: string | null
  actualStart: string | null
  actualEnd: string | null
  transitions: { at: string; summary: string }[]
}

export async function timeline(serviceId: string): Promise<{ rows: TimelineRow[]; rangeStart: string; rangeEnd: string; today: string }> {
  return call(() => {
    authorize('service.read', serviceResource(serviceId))
    const s = getStore()
    const phases = s.where('phases', (p) => p.service_id === serviceId).sort((a, b) => a.order_no - b.order_no)
    const events = s.where('auditEvents', (e) => e.service_id === serviceId)
    const rows: TimelineRow[] = []
    for (const p of phases) {
      rows.push({ id: p.id, kind: 'phase', phaseKey: p.key, name: p.name, status: p.status, plannedStart: p.planned_start, plannedEnd: p.planned_end, actualStart: p.actual_start, actualEnd: p.actual_end, transitions: [] })
      for (const st of s.where('steps', (x) => x.phase_id === p.id).sort((a, b) => a.order_no - b.order_no)) {
        rows.push({
          id: st.id,
          kind: 'step',
          phaseKey: p.key,
          name: st.name,
          status: st.status,
          plannedStart: st.planned_start,
          plannedEnd: st.planned_end,
          actualStart: st.actual_start,
          actualEnd: st.actual_end,
          transitions: events.filter((e) => e.entity_id === st.id).map((e) => ({ at: e.occurred_at, summary: e.summary })).sort((a, b) => (a.at < b.at ? -1 : 1)),
        })
      }
    }
    const dates = rows.flatMap((r) => [r.plannedStart, r.plannedEnd, r.actualStart?.slice(0, 10), r.actualEnd?.slice(0, 10)]).filter(Boolean) as string[]
    const today = todayIso()
    return { rows, rangeStart: [...dates, today].sort()[0], rangeEnd: [...dates, today].sort().at(-1)!, today }
  })
}

export interface LogEntry extends AuditEvent {
  actorName: string
}

export async function log(serviceId: string, filter: { types?: string[]; actorId?: string; search?: string } = {}): Promise<LogEntry[]> {
  return call(() => {
    authorize('service.read', serviceResource(serviceId))
    const s = getStore()
    let rows = s.where('auditEvents', (e) => e.service_id === serviceId)
    if (filter.types?.length) rows = rows.filter((e) => filter.types!.some((t) => e.event_type.startsWith(t)))
    if (filter.actorId) rows = rows.filter((e) => e.actor_user_id === filter.actorId)
    if (filter.search) {
      const q = filter.search.toLowerCase()
      rows = rows.filter((e) => e.summary.toLowerCase().includes(q))
    }
    return rows.sort((a, b) => (a.occurred_at < b.occurred_at ? 1 : -1)).map((e) => ({ ...e, actorName: e.actor_user_id ? userName(e.actor_user_id) : 'System' }))
  })
}

export { SERVICE_TYPE_LABELS }
