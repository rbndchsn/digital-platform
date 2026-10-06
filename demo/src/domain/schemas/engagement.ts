import { z } from 'zod'
import {
  APPROVAL_KINDS,
  APPROVAL_STATUSES,
  CHECK_RESULTS,
  COI_DECLARATIONS,
  COI_STATUSES,
  INVOICE_KINDS,
  INVOICE_STATUSES,
  LEVELS_OF_ASSURANCE,
  PARTIES,
  PHASE_KEYS,
  PROGRAMMES,
  SERVICE_ROLES,
  SERVICE_STATUSES,
  SERVICE_TYPES,
  SLOT_CATEGORIES,
  SLOT_STATUSES,
  STEP_STATUSES,
} from '../enums'
import { AuditColumns, Id, IsoDate, IsoDateTime } from './common'

export const Project = AuditColumns.extend({
  id: Id,
  org_id: Id,
  name: z.string().min(1),
  description: z.string().default(''),
  country: z.string().length(2),
  region: z.string().nullable(),
  programme: z.enum(PROGRAMMES),
  external_registry_id: z.string().nullable(),
  owner_user_id: Id,
  status: z.enum(['active', 'archived']),
})
export type Project = z.infer<typeof Project>

export const ServiceScope = z.object({
  summary: z.string().default(''),
  sites: z.array(z.string()).default([]),
  boundary: z.string().default(''),
  products: z.array(z.string()).default([]),
  interventions: z.array(z.string()).default([]),
  /** Requested threshold from the wizard; the approved materiality setting (FR-84) is the authoritative value. */
  materiality_pct: z.number().min(0).max(100).nullable().default(null),
  /** PRD v0.3 FR-95: what the team as a whole must cover. */
  sector_scopes: z.array(z.string()).default([]),
  technical_areas: z.array(z.string()).default([]),
})
export type ServiceScope = z.infer<typeof ServiceScope>

export const Service = AuditColumns.extend({
  id: Id,
  org_id: Id,
  verifier_org_id: Id,
  project_id: Id,
  template_id: Id.nullable(),
  template_version: z.number().int().nullable(),
  service_type: z.enum(SERVICE_TYPES),
  standard: z.string().min(1),
  name: z.string().min(1),
  /** Human reference shown in lists, e.g. "VX-2026-0142". */
  reference: z.string().min(1),
  status: z.enum(SERVICE_STATUSES),
  /** Status to return to after on_hold. */
  resume_status: z.enum(SERVICE_STATUSES).nullable().default(null),
  period_start: IsoDate,
  period_end: IsoDate,
  scope_json: ServiceScope,
  requested_at: IsoDateTime.nullable(),
  contracted_at: IsoDateTime.nullable(),
  issued_at: IsoDateTime.nullable(),
  closed_at: IsoDateTime.nullable(),
  on_hold_reason: z.string().nullable(),
  renewed_from_service_id: Id.nullable(),
  client_contact_user_id: Id.nullable(),
  team_leader_user_id: Id.nullable(),
  target_opinion_date: IsoDate.nullable().default(null),
  /** PRD v0.3 FR-81: fixed at contracting; `not_applicable` for validation templates. */
  level_of_assurance: z.enum(LEVELS_OF_ASSURANCE),
  assurance_level_locked_at: IsoDateTime.nullable().default(null),
  /** PRD v0.3 FR-98: the VVB-level rotation check recorded at triage. */
  triage_check_json: z.unknown().nullable().default(null),
})
export type Service = z.infer<typeof Service>

export const Phase = AuditColumns.extend({
  id: Id,
  service_id: Id,
  key: z.enum(PHASE_KEYS),
  name: z.string(),
  order_no: z.number().int(),
  status: z.enum(STEP_STATUSES),
  planned_start: IsoDate.nullable(),
  planned_end: IsoDate.nullable(),
  actual_start: IsoDateTime.nullable(),
  actual_end: IsoDateTime.nullable(),
})
export type Phase = z.infer<typeof Phase>

export const ChecklistItem = z.object({
  key: z.string(),
  label: z.string(),
  checked: z.boolean().default(false),
})
export type ChecklistItem = z.infer<typeof ChecklistItem>

export const Step = AuditColumns.extend({
  id: Id,
  service_id: Id,
  phase_id: Id,
  key: z.string(),
  name: z.string(),
  description: z.string().default(''),
  order_no: z.number().int(),
  owner_role: z.enum(SERVICE_ROLES),
  status: z.enum(STEP_STATUSES),
  planned_start: IsoDate.nullable(),
  planned_end: IsoDate.nullable(),
  actual_start: IsoDateTime.nullable(),
  actual_end: IsoDateTime.nullable(),
  parallel_allowed: z.boolean().default(false),
  /** PRD v0.3 FR-80: copied from the template; the step cannot be forced to completed or skipped. */
  non_overridable: z.boolean().default(false),
  checklist_json: z.array(ChecklistItem).default([]),
  closed_by: Id.nullable(),
  closed_at: IsoDateTime.nullable(),
})
export type Step = z.infer<typeof Step>

export const DocumentSlot = AuditColumns.extend({
  id: Id,
  service_id: Id,
  step_id: Id,
  key: z.string(),
  name: z.string(),
  description: z.string().default(''),
  category: z.enum(SLOT_CATEGORIES),
  required: z.boolean(),
  uploader_party: z.enum(PARTIES),
  current_document_id: Id.nullable(),
  status: z.enum(SLOT_STATUSES),
})
export type DocumentSlot = z.infer<typeof DocumentSlot>

export const Approval = AuditColumns.extend({
  id: Id,
  service_id: Id,
  step_id: Id.nullable(),
  kind: z.enum(APPROVAL_KINDS),
  label: z.string(),
  status: z.enum(APPROVAL_STATUSES),
  decided_by: Id.nullable(),
  decided_at: IsoDateTime.nullable(),
  comment: z.string().nullable(),
  evidence_json: z.record(z.string(), z.unknown()).nullable(),
})
export type Approval = z.infer<typeof Approval>

export const ServiceTeamMember = AuditColumns.extend({
  id: Id,
  service_id: Id,
  user_id: Id,
  service_role: z.enum(SERVICE_ROLES),
  status: z.enum(['nominated', 'active', 'removed']),
  nominated_by: Id.nullable(),
  nominated_at: IsoDateTime.nullable(),
  /** Kept so the involved set (PRD FR-79) still counts people who left the team. */
  removed_at: IsoDateTime.nullable().default(null),
})
export type ServiceTeamMember = z.infer<typeof ServiceTeamMember>

export const CoiDeclaration = AuditColumns.extend({
  id: Id,
  service_team_id: Id,
  declaration: z.enum(COI_DECLARATIONS).nullable(),
  details: z.string().nullable(),
  declared_at: IsoDateTime.nullable(),
  status: z.enum(COI_STATUSES),
  decided_by: Id.nullable(),
  decided_at: IsoDateTime.nullable(),
  /** PRD v0.3 FR-89: set when the declaration was re-confirmed for a revision iteration. */
  reconfirmed_for_iteration_id: Id.nullable().default(null),
})
export type CoiDeclaration = z.infer<typeof CoiDeclaration>

export const CheckItem = z.object({
  key: z.string(),
  requirement: z.string(),
  result: z.enum(CHECK_RESULTS),
  detail: z.string(),
})
export type CheckItem = z.infer<typeof CheckItem>

/** PRD v0.3 FR-96, FR-98: the competence and rotation check recorded on a nomination or reassignment. */
export const NominationCheck = AuditColumns.extend({
  id: Id,
  service_team_id: Id,
  kind: z.enum(['nomination', 'reassignment']),
  competence_json: z.array(CheckItem),
  rotation_json: z.array(CheckItem),
  overridden: z.boolean(),
  override_reason: z.string().nullable(),
  checked_by: Id,
  checked_at: IsoDateTime,
})
export type NominationCheck = z.infer<typeof NominationCheck>

/** PRD v0.3 FR-98: pre-platform engagements so rotation counts are complete. Entered by managers, audited. */
export const LegacyEngagement = AuditColumns.extend({
  id: Id,
  verifier_org_id: Id,
  client_org_id: Id,
  project_id: Id.nullable(),
  /** Null for a VVB-level row (the body did the engagement; nobody specific is counted). */
  user_id: Id.nullable(),
  service_role: z.enum(SERVICE_ROLES).nullable(),
  service_type: z.enum(SERVICE_TYPES),
  reference: z.string().min(1),
  period_start: IsoDate,
  period_end: IsoDate,
  entered_by: Id,
  note: z.string().nullable(),
})
export type LegacyEngagement = z.infer<typeof LegacyEngagement>

export const Invoice = AuditColumns.extend({
  id: Id,
  service_id: Id,
  kind: z.enum(INVOICE_KINDS),
  reference: z.string(),
  amount_minor: z.number().int(),
  currency: z.string().length(3),
  issued_at: IsoDate.nullable(),
  due_at: IsoDate.nullable(),
  paid_at: IsoDate.nullable(),
  status: z.enum(INVOICE_STATUSES),
  document_id: Id.nullable(),
})
export type Invoice = z.infer<typeof Invoice>
