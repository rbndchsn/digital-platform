import { z } from 'zod'
import {
  APPROVAL_KINDS,
  APPROVAL_STATUSES,
  COI_DECLARATIONS,
  COI_STATUSES,
  INVOICE_KINDS,
  INVOICE_STATUSES,
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
  materiality_pct: z.number().min(0).max(100).nullable().default(null),
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
})
export type CoiDeclaration = z.infer<typeof CoiDeclaration>

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
