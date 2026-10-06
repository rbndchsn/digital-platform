/**
 * Scenario builder: creates services from the real templates and advances them to a storyline state,
 * producing the same rows (documents, approvals, team, COI, audit events, notifications) the api layer would.
 */
import type { NotificationType, ServiceRole, ServiceStatus, ServiceType } from '@/domain/enums'
import { SERVICE_TYPE_LABELS } from '@/domain/enums'
import type {
  Approval,
  AuditEvent,
  CoiDeclaration,
  Document,
  DocumentSlot,
  DocumentVersion,
  Finding,
  FindingResponse,
  Invoice,
  IterationDocument,
  Notification,
  OpinionIteration,
  OpinionStatement,
  Phase,
  Service,
  ServiceScope,
  ServiceTeamMember,
  Step,
  VerifiedFigure,
} from '@/domain/schemas'
import { instantiateTemplate } from '@/domain/workflow/instantiate'
import { derivePhaseStatus } from '@/domain/workflow/machines'
import { templateFor } from '@/domain/workflow/templates'
import { addDaysIso, daysAgo, dateDaysAgo } from '../clock'
import { fakeSha256, prng, publicCode, seedId } from '../ids'
import { ORG, USR, auditAt, userName } from './base'

export interface ServiceCtx {
  service: Service
  phases: Phase[]
  steps: Step[]
  slots: DocumentSlot[]
  approvals: Approval[]
}

export interface ScenarioTables {
  services: Service[]
  phases: Phase[]
  steps: Step[]
  slots: DocumentSlot[]
  approvals: Approval[]
  team: ServiceTeamMember[]
  cois: CoiDeclaration[]
  documents: Document[]
  documentVersions: DocumentVersion[]
  findings: Finding[]
  findingResponses: FindingResponse[]
  iterations: OpinionIteration[]
  iterationDocuments: IterationDocument[]
  statements: OpinionStatement[]
  invoices: Invoice[]
  notifications: Notification[]
  auditEvents: AuditEvent[]
}

const MIME: Record<string, string> = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  csv: 'text/csv',
  zip: 'application/zip',
}

const SLOT_FILE: Record<string, { ext: string; name: string }> = {
  cpf: { ext: 'pdf', name: 'Client pre-engagement form' },
  quote: { ext: 'pdf', name: 'Quote' },
  contract: { ext: 'pdf', name: 'Contract' },
  msa: { ext: 'pdf', name: 'Service agreement' },
  audit_plan: { ext: 'pdf', name: 'Audit plan' },
  inventory_workbook: { ext: 'xlsx', name: 'GHG inventory workbook' },
  methodology: { ext: 'docx', name: 'Inventory methodology' },
  activity_data: { ext: 'zip', name: 'Activity data samples' },
  org_chart: { ext: 'pdf', name: 'Organisational boundary' },
  ef_sources: { ext: 'xlsx', name: 'Emission factor sources' },
  pdd: { ext: 'pdf', name: 'Project design document' },
  ercs: { ext: 'xlsx', name: 'Emission reduction calculation sheet' },
  monitoring_plan: { ext: 'pdf', name: 'Monitoring plan' },
  baseline_survey: { ext: 'pdf', name: 'Baseline survey report' },
  eia: { ext: 'pdf', name: 'Environmental impact assessment' },
  monitoring_report: { ext: 'pdf', name: 'Monitoring report' },
  monitoring_data: { ext: 'csv', name: 'Monitoring data export' },
  pcf_study: { ext: 'pdf', name: 'Product carbon footprint study' },
  lca_model: { ext: 'xlsx', name: 'LCA model export' },
  bom: { ext: 'xlsx', name: 'Bill of materials' },
  allocation_note: { ext: 'docx', name: 'Allocation note' },
  primary_data: { ext: 'xlsx', name: 'Primary data sheets' },
  intervention_description: { ext: 'pdf', name: 'Intervention description' },
  baseline_evidence: { ext: 'xlsx', name: 'Baseline emission evidence' },
  project_evidence: { ext: 'xlsx', name: 'Project emission evidence' },
  volume_evidence: { ext: 'pdf', name: 'Purchase records' },
  supplier_attestation: { ext: 'pdf', name: 'Supplier attestation' },
  method_note: { ext: 'docx', name: 'Baseline method justification' },
  site_visit_plan: { ext: 'pdf', name: 'Site visit plan' },
  interview_log: { ext: 'docx', name: 'Interview log' },
  signed_opinion: { ext: 'pdf', name: 'Signed opinion statement' },
  change_description: { ext: 'docx', name: 'Design change description' },
}

export class Scenario {
  readonly t: ScenarioTables = {
    services: [],
    phases: [],
    steps: [],
    slots: [],
    approvals: [],
    team: [],
    cois: [],
    documents: [],
    documentVersions: [],
    findings: [],
    findingResponses: [],
    iterations: [],
    iterationDocuments: [],
    statements: [],
    invoices: [],
    notifications: [],
    auditEvents: [],
  }
  private rand = prng(20261005)
  private findingNo = new Map<string, number>()

  // ---------------------------------------------------------------- audit and notifications
  audit(e: Omit<AuditEvent, 'id' | 'actor_api_client_id' | 'ip' | 'user_agent' | 'actor_type' | 'reason'> & Partial<AuditEvent>): AuditEvent {
    const row: AuditEvent = {
      id: seedId('evt'),
      actor_api_client_id: null,
      actor_type: e.actor_user_id ? 'user' : 'system',
      reason: null,
      ip: null,
      user_agent: null,
      ...e,
    }
    this.t.auditEvents.push(row)
    return row
  }

  notify(userId: string, orgId: string, type: NotificationType, title: string, body: string, serviceId: string | null, at: string, read = false): void {
    this.t.notifications.push({
      id: seedId('ntf'),
      org_id: orgId,
      user_id: userId,
      type,
      title,
      body,
      entity_type: serviceId ? 'service' : null,
      entity_id: serviceId,
      service_id: serviceId,
      read_at: read ? at : null,
      emailed_at: at,
      created_at: at,
    })
  }

  // ---------------------------------------------------------------- services
  createService(opts: {
    id: string
    orgId: string
    projectId: string
    type: ServiceType
    name: string
    reference: string
    periodStart: string
    periodEnd: string
    scope: Partial<ServiceScope>
    requestedDaysAgo: number
    clientContact: string
    teamLeader?: string | null
    status?: ServiceStatus
    renewedFrom?: string | null
  }): ServiceCtx {
    const template = templateFor(opts.type)
    const requestedAt = daysAgo(opts.requestedDaysAgo, 10, 12)
    const startDate = dateDaysAgo(opts.requestedDaysAgo)
    const service: Service = {
      ...auditAt(daysAgo(opts.requestedDaysAgo + 1), opts.clientContact),
      id: opts.id,
      org_id: opts.orgId,
      verifier_org_id: ORG.verifassur,
      project_id: opts.projectId,
      template_id: template.id,
      template_version: template.version,
      service_type: opts.type,
      standard: template.standard,
      name: opts.name,
      reference: opts.reference,
      status: opts.status ?? 'requested',
      resume_status: null,
      period_start: opts.periodStart,
      period_end: opts.periodEnd,
      scope_json: { summary: '', sites: [], boundary: '', products: [], interventions: [], materiality_pct: 5, ...opts.scope },
      requested_at: requestedAt,
      contracted_at: null,
      issued_at: null,
      closed_at: null,
      on_hold_reason: null,
      renewed_from_service_id: opts.renewedFrom ?? null,
      client_contact_user_id: opts.clientContact,
      team_leader_user_id: opts.teamLeader ?? null,
      target_opinion_date: addDaysIso(startDate, 70),
    }
    const inst = instantiateTemplate({ serviceId: service.id, template, startDate, now: requestedAt, actorId: USR.mgr, newId: seedId })
    this.t.services.push(service)
    this.t.phases.push(...inst.phases)
    this.t.steps.push(...inst.steps)
    this.t.slots.push(...inst.slots)
    this.t.approvals.push(...inst.approvals)

    this.audit({ org_id: service.org_id, service_id: service.id, actor_user_id: opts.clientContact, event_type: 'service.created', entity_type: 'service', entity_id: service.id, summary: `Request drafted: ${service.name}`, before_json: null, after_json: { status: 'draft' }, occurred_at: daysAgo(opts.requestedDaysAgo + 1, 15, 40) })
    this.audit({ org_id: service.org_id, service_id: service.id, actor_user_id: opts.clientContact, event_type: 'service.submitted', entity_type: 'service', entity_id: service.id, summary: `Request submitted by ${userName(opts.clientContact)}`, before_json: { status: 'draft' }, after_json: { status: 'requested' }, occurred_at: requestedAt })
    this.notify(USR.mgr, ORG.verifassur, 'request_received', 'New request to triage', `${service.name} (${SERVICE_TYPE_LABELS[service.service_type]}) submitted by ${userName(opts.clientContact)}.`, service.id, requestedAt, opts.requestedDaysAgo > 3)
    return { service, ...inst }
  }

  private stepsOf(ctx: ServiceCtx): Step[] {
    const phaseOrder = new Map(ctx.phases.map((p) => [p.id, p.order_no]))
    return [...ctx.steps].sort((a, b) => (phaseOrder.get(a.phase_id) ?? 0) - (phaseOrder.get(b.phase_id) ?? 0) || a.order_no - b.order_no)
  }

  /** Triage accepted: service moves to contracting. */
  triage(ctx: ServiceCtx, at: string): void {
    ctx.service.status = 'contracting'
    this.audit({ org_id: ctx.service.org_id, service_id: ctx.service.id, actor_user_id: USR.mgr, event_type: 'service.triaged', entity_type: 'service', entity_id: ctx.service.id, summary: `Request accepted for ${ctx.service.standard} by ${userName(USR.mgr)}`, before_json: { status: 'requested' }, after_json: { status: 'contracting' }, occurred_at: at })
    this.notify(ctx.service.client_contact_user_id!, ctx.service.org_id, 'request_triaged', 'Request accepted', `VERIFASSUR accepted your request ${ctx.service.reference}. Contracting has started.`, ctx.service.id, at, true)
  }

  /**
   * Complete every step up to (and including) `throughKey`, then optionally start the next step.
   * Service status follows the phase of the current step.
   */
  advance(ctx: ServiceCtx, throughKey: string | null, opts: { startNext?: boolean; nextStatus?: Step['status'] } = {}): void {
    const ordered = this.stepsOf(ctx)
    const idx = throughKey ? ordered.findIndex((s) => s.key === throughKey) : -1
    if (throughKey && idx < 0) throw new Error(`Unknown step ${throughKey} in ${ctx.service.id}`)
    for (let i = 0; i <= idx; i++) this.completeStep(ctx, ordered[i])
    const next = ordered[idx + 1]
    if (next && opts.startNext !== false) {
      next.status = opts.nextStatus ?? 'in_progress'
      next.actual_start = `${next.planned_start}T09:00:00.000Z`
      this.audit({ org_id: ctx.service.org_id, service_id: ctx.service.id, actor_user_id: this.actorFor(next.owner_role, ctx), event_type: 'step.started', entity_type: 'step', entity_id: next.id, summary: `${next.name} started`, before_json: { status: 'not_started' }, after_json: { status: next.status }, occurred_at: next.actual_start })
    }
    this.refreshPhases(ctx)
    const currentStep = ordered.find((s) => s.status !== 'completed' && s.status !== 'skipped')
    const phaseKey = currentStep ? ctx.phases.find((p) => p.id === currentStep.phase_id)!.key : 'execution'
    const newStatus: ServiceStatus = currentStep ? (phaseKey === 'contracting' ? 'contracting' : phaseKey === 'planning' ? 'planning' : currentStep.key === 'final_opinion' ? 'opinion_review' : 'execution') : 'issued'
    if (ctx.service.status !== newStatus) {
      const at = currentStep?.actual_start ?? ordered[idx]?.actual_end ?? daysAgo(1)
      this.audit({ org_id: ctx.service.org_id, service_id: ctx.service.id, actor_user_id: null, event_type: 'service.status_changed', entity_type: 'service', entity_id: ctx.service.id, summary: `Service moved to ${newStatus.replace('_', ' ')}`, before_json: { status: ctx.service.status }, after_json: { status: newStatus }, occurred_at: at })
      ctx.service.status = newStatus
      if (newStatus === 'planning' && !ctx.service.contracted_at) ctx.service.contracted_at = at
    }
  }

  private actorFor(role: ServiceRole, ctx: ServiceCtx): string {
    if (role === 'client_contact') return ctx.service.client_contact_user_id ?? USR.nwAdmin
    const member = this.t.team.find((m) => m.service_id === ctx.service.id && m.service_role === role)
    if (member) return member.user_id
    const defaults: Record<string, string> = {
      verifier_manager: USR.mgr,
      verifier_team_leader: USR.tl,
      verifier_auditor: USR.aud,
      verifier_technical_expert: USR.aud,
      verifier_independent_reviewer: USR.ir,
      verifier_coordinator: USR.coord,
      verifier_finance: USR.fin,
    }
    return defaults[role] ?? USR.mgr
  }

  private completeStep(ctx: ServiceCtx, step: Step): void {
    if (step.status === 'completed') return
    const start = `${step.planned_start}T09:${String(10 + Math.floor(this.rand() * 40)).padStart(2, '0')}:00.000Z`
    const end = `${step.planned_end}T15:${String(10 + Math.floor(this.rand() * 45)).padStart(2, '0')}:00.000Z`
    const actor = this.actorFor(step.owner_role, ctx)
    step.status = 'completed'
    step.actual_start = start
    step.actual_end = end
    step.closed_by = step.owner_role === 'client_contact' ? USR.mgr : actor
    step.closed_at = end
    step.checklist_json = step.checklist_json.map((c) => ({ ...c, checked: true }))
    this.audit({ org_id: ctx.service.org_id, service_id: ctx.service.id, actor_user_id: actor, event_type: 'step.started', entity_type: 'step', entity_id: step.id, summary: `${step.name} started`, before_json: { status: 'not_started' }, after_json: { status: 'in_progress' }, occurred_at: start })

    for (const slot of ctx.slots.filter((s) => s.step_id === step.id)) {
      if (!slot.required && this.rand() < 0.35) continue
      this.fillSlot(ctx, slot, { at: addHours(start, 4 + Math.floor(this.rand() * 40)), status: 'accepted' })
    }
    for (const ap of ctx.approvals.filter((a) => a.step_id === step.id)) {
      const by = ap.kind === 'agreement_acceptance' || ap.kind === 'audit_plan' ? ctx.service.client_contact_user_id! : USR.mgr
      const at = addHours(end, -2)
      ap.status = 'approved'
      ap.decided_by = by
      ap.decided_at = at
      ap.comment = ap.kind === 'impartiality' ? 'No prior consultancy or financial relationship identified.' : ap.kind === 'technical_scope' ? 'Within accredited scope.' : null
      ap.evidence_json = ap.kind === 'agreement_acceptance' ? { name: userName(by), accepted_at: at, ip: '192.0.2.44', document_sha256: this.slotHash(ctx, 'msa') } : null
      this.audit({ org_id: ctx.service.org_id, service_id: ctx.service.id, actor_user_id: by, event_type: 'approval.decided', entity_type: 'approval', entity_id: ap.id, summary: `${ap.label} approved by ${userName(by)}`, before_json: { status: 'pending' }, after_json: { status: 'approved' }, occurred_at: at })
      if (ap.kind === 'agreement_acceptance') {
        this.notify(USR.mgr, ORG.verifassur, 'agreement_accepted', 'Service agreement accepted', `${userName(by)} accepted the service agreement for ${ctx.service.reference}.`, ctx.service.id, at, true)
      }
    }
    if (step.key === 'team_nomination') this.ensureTeamApproved(ctx, start, end)
    this.audit({ org_id: ctx.service.org_id, service_id: ctx.service.id, actor_user_id: step.closed_by, event_type: 'step.completed', entity_type: 'step', entity_id: step.id, summary: `${step.name} completed`, before_json: { status: 'in_progress' }, after_json: { status: 'completed' }, occurred_at: end })
  }

  private slotHash(ctx: ServiceCtx, key: string): string | null {
    const slot = ctx.slots.find((s) => s.key === key)
    if (!slot?.current_document_id) return null
    const doc = this.t.documents.find((d) => d.id === slot.current_document_id)
    const ver = this.t.documentVersions.find((v) => v.id === doc?.current_version_id)
    return ver?.sha256 ?? null
  }

  refreshPhases(ctx: ServiceCtx): void {
    for (const phase of ctx.phases) {
      const steps = ctx.steps.filter((s) => s.phase_id === phase.id)
      phase.status = derivePhaseStatus(steps.map((s) => s.status))
      const starts = steps.map((s) => s.actual_start).filter(Boolean) as string[]
      const ends = steps.map((s) => s.actual_end).filter(Boolean) as string[]
      phase.actual_start = starts.length ? starts.sort()[0] : null
      phase.actual_end = phase.status === 'completed' && ends.length ? ends.sort().at(-1)! : null
    }
  }

  // ---------------------------------------------------------------- documents
  fillSlot(
    ctx: ServiceCtx,
    slot: DocumentSlot,
    opts: { at: string; status: 'accepted' | 'submitted' | 'rejected'; versions?: number; rejectReason?: string; uploadedBy?: string },
  ): Document {
    const meta = SLOT_FILE[slot.key] ?? { ext: 'pdf', name: slot.name }
    const uploader = opts.uploadedBy ?? (slot.uploader_party === 'client' ? ctx.service.client_contact_user_id! : this.actorFor('verifier_coordinator', ctx))
    const doc: Document = {
      ...auditAt(opts.at, uploader),
      id: seedId('doc'),
      org_id: ctx.service.org_id,
      service_id: ctx.service.id,
      slot_id: slot.id,
      title: slot.name,
      category: slot.category,
      current_version_id: null,
      locked_at: null,
    }
    const versions = opts.versions ?? (this.rand() < 0.3 ? 2 : 1)
    let at = opts.at
    for (let v = 1; v <= versions; v++) {
      const last = v === versions
      const status = last ? (opts.status === 'accepted' ? 'accepted' : opts.status === 'rejected' ? 'rejected' : 'uploaded') : 'rejected'
      const ver = this.addVersion(ctx, doc, v, `${orgSlug(ctx.service.org_id)}_${slugify(meta.name)}_v${v}.${meta.ext}`, meta.ext, uploader, at, status, last ? (opts.rejectReason ?? null) : 'Superseded by a corrected version')
      if (!last) at = addHours(at, 30 + Math.floor(this.rand() * 60))
      doc.current_version_id = ver.id
    }
    this.t.documents.push(doc)
    slot.current_document_id = doc.id
    slot.status = opts.status
    return doc
  }

  addVersion(ctx: ServiceCtx, doc: Document, no: number, filename: string, ext: string, by: string, at: string, status: DocumentVersion['check_status'], rejectReason: string | null): DocumentVersion {
    const size = 120_000 + Math.floor(this.rand() * 4_800_000)
    const ver: DocumentVersion = {
      ...auditAt(at, by),
      id: seedId('ver'),
      document_id: doc.id,
      version_no: no,
      r2_key: `org/${ctx.service.org_id}/doc/${doc.id}/v${no}/${filename}`,
      filename,
      mime_type: MIME[ext] ?? 'application/octet-stream',
      size_bytes: size,
      sha256: fakeSha256(`${doc.id}:${no}:${filename}`),
      uploaded_by: by,
      uploaded_at: at,
      source: 'manual',
      check_status: status,
      checked_by: status === 'accepted' || status === 'rejected' ? USR.aud : null,
      checked_at: status === 'accepted' || status === 'rejected' ? addHours(at, 20) : null,
      reject_reason: status === 'rejected' ? rejectReason : null,
    }
    this.t.documentVersions.push(ver)
    this.audit({ org_id: ctx.service.org_id, service_id: ctx.service.id, actor_user_id: by, event_type: 'document.uploaded', entity_type: 'document_version', entity_id: ver.id, summary: `${filename} uploaded by ${userName(by)}`, before_json: null, after_json: { version_no: no, sha256: ver.sha256 }, occurred_at: at })
    if (status === 'accepted' || status === 'rejected') {
      this.audit({ org_id: ctx.service.org_id, service_id: ctx.service.id, actor_user_id: USR.aud, event_type: `document.${status}`, entity_type: 'document_version', entity_id: ver.id, summary: `${filename} ${status}${rejectReason && status === 'rejected' ? `: ${rejectReason}` : ''}`, before_json: { check_status: 'uploaded' }, after_json: { check_status: status }, occurred_at: ver.checked_at! })
    }
    return ver
  }

  // ---------------------------------------------------------------- team and COI
  nominate(ctx: ServiceCtx, members: { userId: string; role: ServiceRole; coi: 'approved' | 'declared' | 'required' }[], at: string): void {
    for (const m of members) {
      const tm: ServiceTeamMember = { ...auditAt(at, USR.mgr), id: seedId('team'), service_id: ctx.service.id, user_id: m.userId, service_role: m.role, status: m.coi === 'approved' ? 'active' : 'nominated', nominated_by: USR.mgr, nominated_at: at }
      this.t.team.push(tm)
      if (m.role === 'verifier_team_leader') ctx.service.team_leader_user_id = m.userId
      if (m.role === 'client_contact') continue
      const coi: CoiDeclaration = {
        ...auditAt(at, USR.mgr),
        id: seedId('coi'),
        service_team_id: tm.id,
        declaration: m.coi === 'required' ? null : 'clear',
        details: m.coi === 'required' ? null : 'No relationship with the client in the last three years.',
        declared_at: m.coi === 'required' ? null : addHours(at, 6),
        status: m.coi,
        decided_by: m.coi === 'approved' ? USR.mgr : null,
        decided_at: m.coi === 'approved' ? addHours(at, 26) : null,
      }
      this.t.cois.push(coi)
      this.audit({ org_id: ctx.service.org_id, service_id: ctx.service.id, actor_user_id: USR.mgr, event_type: 'team.nominated', entity_type: 'service_team', entity_id: tm.id, summary: `${userName(m.userId)} nominated as ${roleLabel(m.role)}`, before_json: null, after_json: { service_role: m.role }, occurred_at: at })
      this.notify(m.userId, ORG.verifassur, 'coi_required', `Conflict-of-interest declaration required`, `You were nominated as ${roleLabel(m.role)} on ${ctx.service.reference}. Declare any conflicts before opening the service.`, ctx.service.id, at, m.coi !== 'required')
      if (m.coi !== 'required') {
        this.audit({ org_id: ctx.service.org_id, service_id: ctx.service.id, actor_user_id: m.userId, event_type: 'coi.declared', entity_type: 'coi_declaration', entity_id: coi.id, summary: `${userName(m.userId)} declared no conflict of interest`, before_json: { status: 'required' }, after_json: { status: 'declared' }, occurred_at: coi.declared_at! })
      }
      if (m.coi === 'approved') {
        this.audit({ org_id: ctx.service.org_id, service_id: ctx.service.id, actor_user_id: USR.mgr, event_type: 'coi.approved', entity_type: 'coi_declaration', entity_id: coi.id, summary: `COI declaration of ${userName(m.userId)} approved`, before_json: { status: 'declared' }, after_json: { status: 'approved' }, occurred_at: coi.decided_at! })
      }
    }
  }

  private ensureTeamApproved(ctx: ServiceCtx, start: string, end: string): void {
    const existing = this.t.team.filter((m) => m.service_id === ctx.service.id)
    if (existing.length === 0) {
      this.nominate(
        ctx,
        [
          { userId: USR.tl, role: 'verifier_team_leader', coi: 'approved' },
          { userId: USR.aud, role: 'verifier_auditor', coi: 'approved' },
          { userId: USR.ir, role: 'verifier_independent_reviewer', coi: 'approved' },
          { userId: USR.coord, role: 'verifier_coordinator', coi: 'approved' },
          { userId: ctx.service.client_contact_user_id!, role: 'client_contact', coi: 'approved' },
        ],
        addHours(start, 3),
      )
    }
    void end
  }

  // ---------------------------------------------------------------- findings
  addFinding(ctx: ServiceCtx, f: {
    type: Finding['type']
    severity: Finding['severity']
    title: string
    description: string
    stepKey: string
    raisedDaysAgo: number
    dueInDays: number
    status: Finding['status']
    assignedTo?: string | null
    responses?: { by: string; party: 'client' | 'verifier'; body: string; daysAgo: number }[]
  }): Finding {
    const n = (this.findingNo.get(ctx.service.id) ?? 0) + 1
    this.findingNo.set(ctx.service.id, n)
    const step = ctx.steps.find((s) => s.key === f.stepKey)
    const raisedAt = daysAgo(f.raisedDaysAgo, 11, 20)
    const closed = f.status === 'closed'
    const finding: Finding = {
      ...auditAt(raisedAt, USR.aud),
      id: seedId('fnd'),
      service_id: ctx.service.id,
      number: n,
      type: f.type,
      severity: f.severity,
      title: f.title,
      description: f.description,
      step_id: step?.id ?? null,
      entity_type: null,
      entity_id: null,
      raised_by: USR.aud,
      raised_at: raisedAt,
      assigned_user_id: f.assignedTo ?? ctx.service.client_contact_user_id,
      due_at: addDaysIso(raisedAt.slice(0, 10), f.dueInDays),
      status: f.status,
      closed_by: closed ? USR.aud : null,
      closed_at: closed ? daysAgo(Math.max(0, f.raisedDaysAgo - f.dueInDays + 1), 16, 5) : null,
      blocking: f.type === 'CAR',
    }
    this.t.findings.push(finding)
    this.audit({ org_id: ctx.service.org_id, service_id: ctx.service.id, actor_user_id: USR.aud, event_type: 'finding.raised', entity_type: 'finding', entity_id: finding.id, summary: `${f.type} #${n} raised: ${f.title}`, before_json: null, after_json: { status: 'open', severity: f.severity }, occurred_at: raisedAt })
    this.notify(finding.assigned_user_id!, ctx.service.org_id, 'finding_raised', `${f.type} #${n} raised on ${ctx.service.reference}`, f.title, ctx.service.id, raisedAt, closed || f.raisedDaysAgo > 2)
    for (const r of f.responses ?? []) {
      const at = daysAgo(r.daysAgo, 14, 30)
      this.t.findingResponses.push({ ...auditAt(at, r.by), id: seedId('rsp'), finding_id: finding.id, author_user_id: r.by, party: r.party, body: r.body })
      this.audit({ org_id: ctx.service.org_id, service_id: ctx.service.id, actor_user_id: r.by, event_type: 'finding.responded', entity_type: 'finding', entity_id: finding.id, summary: `${userName(r.by)} responded to ${f.type} #${n}`, before_json: null, after_json: null, occurred_at: at })
    }
    if (closed) {
      this.audit({ org_id: ctx.service.org_id, service_id: ctx.service.id, actor_user_id: USR.aud, event_type: 'finding.closed', entity_type: 'finding', entity_id: finding.id, summary: `${f.type} #${n} closed`, before_json: { status: 'responded' }, after_json: { status: 'closed' }, occurred_at: finding.closed_at! })
    }
    return finding
  }

  // ---------------------------------------------------------------- opinion iterations
  addIteration(ctx: ServiceCtx, it: {
    no: number
    status: OpinionIteration['status']
    daysAgo: number
    figures: VerifiedFigure[]
    opinionType: OpinionIteration['summary_json']['opinion_type']
    narrative: string
    irComment?: string
    managerComment?: string
  }): OpinionIteration {
    const createdAt = daysAgo(it.daysAgo, 9, 45)
    const template = templateFor(ctx.service.service_type)
    const decidedIr = ['manager_review', 'approved', 'issued', 'changes_requested'].includes(it.status)
    const irApproved = decidedIr && it.status !== 'changes_requested'
    const decidedMgr = ['approved', 'issued'].includes(it.status)
    const iteration: OpinionIteration = {
      ...auditAt(createdAt, USR.tl),
      id: seedId('itr'),
      service_id: ctx.service.id,
      iteration_no: it.no,
      status: it.status,
      summary_json: { opinion_type: it.opinionType, level_of_assurance: 'reasonable', figures: it.figures, narrative: it.narrative },
      submitted_for_ir_at: it.status === 'draft' ? null : addHours(createdAt, 30),
      ir_user_id: USR.ir,
      ir_decision: decidedIr ? (irApproved ? 'approve' : 'request_changes') : null,
      ir_comment: decidedIr ? (it.irComment ?? 'Evidence trail complete; wording consistent with the standard template.') : null,
      ir_decided_at: decidedIr ? addHours(createdAt, 78) : null,
      manager_user_id: decidedMgr ? USR.mgr : null,
      manager_decision: decidedMgr ? 'approve' : null,
      manager_comment: decidedMgr ? (it.managerComment ?? 'Approved for issuance.') : null,
      manager_decided_at: decidedMgr ? addHours(createdAt, 100) : null,
      checklist_ir_json: template.ir_checklist.map((c) => ({ ...c, checked: decidedIr })),
      checklist_manager_json: template.manager_checklist.map((c) => ({ ...c, checked: decidedMgr })),
    }
    this.t.iterations.push(iteration)
    const roles: IterationDocument['role'][] = ['report', 'findings_report', 'opinion', 'calc_check']
    if (decidedIr) roles.push('ir_report', 'ir_checklist')
    if (decidedMgr) roles.push('manager_checklist')
    for (const role of roles) {
      const by = role.startsWith('ir_') ? USR.ir : role === 'manager_checklist' ? USR.mgr : USR.tl
      const doc: Document = { ...auditAt(createdAt, by), id: seedId('doc'), org_id: ctx.service.org_id, service_id: ctx.service.id, slot_id: null, title: iterationDocTitle(role), category: role.startsWith('ir_') ? 'ir' : role.endsWith('checklist') ? 'checklist' : 'reporting', current_version_id: null, locked_at: it.status === 'issued' ? addHours(createdAt, 110) : null }
      const ver = this.addVersion(ctx, doc, 1, `${ctx.service.reference}_${slugify(iterationDocTitle(role))}_it${it.no}.pdf`, 'pdf', by, addHours(createdAt, role.startsWith('ir_') ? 70 : role === 'manager_checklist' ? 98 : 2), 'accepted', null)
      doc.current_version_id = ver.id
      this.t.documents.push(doc)
      this.t.iterationDocuments.push({ ...auditAt(createdAt, by), id: seedId('itd'), iteration_id: iteration.id, document_version_id: ver.id, role })
    }
    this.audit({ org_id: ctx.service.org_id, service_id: ctx.service.id, actor_user_id: USR.tl, event_type: 'iteration.created', entity_type: 'opinion_iteration', entity_id: iteration.id, summary: `Opinion iteration ${it.no} created by ${userName(USR.tl)}`, before_json: null, after_json: { status: 'draft' }, occurred_at: createdAt })
    if (iteration.submitted_for_ir_at) {
      this.audit({ org_id: ctx.service.org_id, service_id: ctx.service.id, actor_user_id: USR.tl, event_type: 'iteration.submitted_for_ir', entity_type: 'opinion_iteration', entity_id: iteration.id, summary: `Iteration ${it.no} submitted for independent review`, before_json: { status: 'draft' }, after_json: { status: 'independent_review' }, occurred_at: iteration.submitted_for_ir_at })
    }
    if (decidedIr) {
      this.audit({ org_id: ctx.service.org_id, service_id: ctx.service.id, actor_user_id: USR.ir, event_type: irApproved ? 'iteration.ir_approved' : 'iteration.ir_changes_requested', entity_type: 'opinion_iteration', entity_id: iteration.id, summary: `Independent review: ${irApproved ? 'approved' : 'changes requested'} by ${userName(USR.ir)}`, before_json: { status: 'independent_review' }, after_json: { status: irApproved ? 'manager_review' : 'changes_requested' }, occurred_at: iteration.ir_decided_at! })
      this.notify(USR.tl, ORG.verifassur, 'iteration_decision', `Iteration ${it.no}: ${irApproved ? 'IR approved' : 'changes requested'}`, iteration.ir_comment!, ctx.service.id, iteration.ir_decided_at!, it.status !== 'changes_requested')
    }
    if (decidedMgr) {
      this.audit({ org_id: ctx.service.org_id, service_id: ctx.service.id, actor_user_id: USR.mgr, event_type: 'iteration.manager_approved', entity_type: 'opinion_iteration', entity_id: iteration.id, summary: `Iteration ${it.no} approved by ${userName(USR.mgr)}`, before_json: { status: 'manager_review' }, after_json: { status: 'approved' }, occurred_at: iteration.manager_decided_at! })
    }
    return iteration
  }

  issue(ctx: ServiceCtx, iteration: OpinionIteration, daysAgoIssued: number): OpinionStatement {
    const at = daysAgo(daysAgoIssued, 14, 2)
    const docs = this.t.iterationDocuments.filter((d) => d.iteration_id === iteration.id)
    const hashes = docs.map((d) => {
      const v = this.t.documentVersions.find((x) => x.id === d.document_version_id)!
      return { filename: v.filename, sha256: v.sha256, role: d.role }
    })
    for (const d of docs) {
      const v = this.t.documentVersions.find((x) => x.id === d.document_version_id)!
      const doc = this.t.documents.find((x) => x.id === v.document_id)!
      doc.locked_at = at
    }
    const statement: OpinionStatement = {
      ...auditAt(at, USR.mgr),
      id: seedId('stm'),
      service_id: ctx.service.id,
      iteration_id: iteration.id,
      public_code: publicCode(ctx.service.id),
      opinion_type: iteration.summary_json.opinion_type ?? 'unqualified',
      level_of_assurance: iteration.summary_json.level_of_assurance ?? 'reasonable',
      statement_html_r2_key: `org/${ctx.service.org_id}/statements/${ctx.service.id}/statement.html`,
      statement_pdf_r2_key: `org/${ctx.service.org_id}/statements/${ctx.service.id}/statement.pdf`,
      figures_json: iteration.summary_json.figures,
      hashes_json: hashes,
      signatories_json: [
        { name: userName(USR.mgr), role: 'Scheme manager', signed_at: at },
        { name: userName(USR.tl), role: 'Lead verifier', signed_at: addHours(at, -1) },
      ],
      issued_at: at,
      issued_by: USR.mgr,
      public_enabled: true,
    }
    this.t.statements.push(statement)
    iteration.status = 'issued'
    ctx.service.issued_at = at
    this.audit({ org_id: ctx.service.org_id, service_id: ctx.service.id, actor_user_id: USR.mgr, event_type: 'opinion.issued', entity_type: 'opinion_statement', entity_id: statement.id, summary: `Opinion issued (${statement.opinion_type}, ${statement.level_of_assurance} assurance) — code ${statement.public_code}`, before_json: { status: 'approved' }, after_json: { status: 'issued' }, occurred_at: at })
    this.notify(ctx.service.client_contact_user_id!, ctx.service.org_id, 'opinion_issued', `Opinion issued for ${ctx.service.reference}`, `VERIFASSUR issued a ${statement.opinion_type} opinion. Verification code ${statement.public_code}.`, ctx.service.id, at, daysAgoIssued > 5)
    return statement
  }

  close(ctx: ServiceCtx, daysAgoClosed: number): void {
    const at = daysAgo(daysAgoClosed, 10, 0)
    const ordered = this.stepsOf(ctx)
    for (const s of ordered) this.completeStep(ctx, s)
    this.refreshPhases(ctx)
    this.audit({ org_id: ctx.service.org_id, service_id: ctx.service.id, actor_user_id: USR.coord, event_type: 'service.closed', entity_type: 'service', entity_id: ctx.service.id, summary: `Service closed by ${userName(USR.coord)}`, before_json: { status: 'issued' }, after_json: { status: 'closed' }, occurred_at: at })
    ctx.service.status = 'closed'
    ctx.service.closed_at = at
  }

  // ---------------------------------------------------------------- invoices
  invoice(ctx: ServiceCtx, inv: { quoteMinor: number; invoiceMinor?: number; currency?: string; quoteDaysAgo: number; invoiceDaysAgo?: number; paidDaysAgo?: number; overdue?: boolean }): void {
    const currency = inv.currency ?? 'EUR'
    const qAt = dateDaysAgo(inv.quoteDaysAgo)
    this.t.invoices.push({ ...auditAt(daysAgo(inv.quoteDaysAgo), USR.fin), id: seedId('inv'), service_id: ctx.service.id, kind: 'quote', reference: `Q-${qAt.slice(0, 4)}-${ctx.service.reference.slice(-4)}`, amount_minor: inv.quoteMinor, currency, issued_at: qAt, due_at: null, paid_at: null, status: 'sent', document_id: null })
    if (inv.invoiceDaysAgo != null) {
      const iAt = dateDaysAgo(inv.invoiceDaysAgo)
      const paid = inv.paidDaysAgo != null
      this.t.invoices.push({ ...auditAt(daysAgo(inv.invoiceDaysAgo), USR.fin), id: seedId('inv'), service_id: ctx.service.id, kind: 'invoice', reference: `INV-${iAt.slice(0, 4)}-${ctx.service.reference.slice(-4)}`, amount_minor: inv.invoiceMinor ?? inv.quoteMinor, currency, issued_at: iAt, due_at: addDaysIso(iAt, 30), paid_at: paid ? dateDaysAgo(inv.paidDaysAgo!) : null, status: paid ? 'paid' : inv.overdue ? 'overdue' : 'sent', document_id: null })
    }
  }
}

// ---------------------------------------------------------------- helpers
export function addHours(iso: string, hours: number): string {
  return new Date(new Date(iso).getTime() + hours * 3_600_000).toISOString()
}

export function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function orgSlug(orgId: string): string {
  return { [ORG.northwind]: 'Northwind', [ORG.solstice]: 'Solstice', [ORG.atlas]: 'Atlas' }[orgId] ?? 'Client'
}

export function roleLabel(role: ServiceRole): string {
  const labels: Record<ServiceRole, string> = {
    verifier_manager: 'Manager',
    verifier_team_leader: 'Team leader',
    verifier_auditor: 'Auditor',
    verifier_technical_expert: 'Technical expert',
    verifier_independent_reviewer: 'Independent reviewer',
    verifier_coordinator: 'Coordinator',
    verifier_finance: 'Finance',
    client_contact: 'Client contact',
  }
  return labels[role]
}

export function iterationDocTitle(role: IterationDocument['role']): string {
  const titles: Record<IterationDocument['role'], string> = {
    report: 'Verification report',
    findings_report: 'Findings report',
    opinion: 'Opinion statement (draft)',
    calc_check: 'Calculation checks',
    ir_report: 'Independent review report',
    ir_checklist: 'Independent review checklist',
    manager_checklist: 'Manager checklist',
  }
  return titles[role]
}
