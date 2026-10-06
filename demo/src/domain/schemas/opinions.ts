import { z } from 'zod'
import {
  ASSERTION_BASES,
  ITERATION_DOC_ROLES,
  ITERATION_STATUSES,
  LEVELS_OF_ASSURANCE,
  MATERIALITY_BASES,
  MATERIALITY_STATUSES,
  MISSTATEMENT_DIRECTIONS,
  MISSTATEMENT_NATURES,
  MISSTATEMENT_RECORD_TYPES,
  MISSTATEMENT_SOURCES,
  MISSTATEMENT_STATUSES,
  OPINION_TYPES,
  POST_ISSUANCE_OUTCOMES,
  POST_ISSUANCE_STATUSES,
  POST_ISSUANCE_TRIGGERS,
  STATEMENT_STATUSES,
  WITHDRAWAL_PUBLIC_CATEGORIES,
} from '../enums'
import { AuditColumns, Id, IsoDateTime } from './common'
import { ChecklistItem } from './engagement'

export const VerifiedFigure = z.object({
  key: z.string(),
  label: z.string(),
  value: z.number(),
  unit: z.string(),
})
export type VerifiedFigure = z.infer<typeof VerifiedFigure>

/** Who acknowledged the materiality consistency warning, when, and what they said (PRD v0.3 FR-87). */
export const MaterialityAck = z.object({
  user_id: Id,
  at: IsoDateTime,
  comment: z.string().min(1),
})
export type MaterialityAck = z.infer<typeof MaterialityAck>

/** Snapshot of the aggregation panel at submit-for-IR (PRD v0.3 FR-86). */
export const AggregationSnapshot = z.object({
  gross: z.number(),
  net: z.number(),
  gross_pct: z.number().nullable(),
  net_pct: z.number().nullable(),
  threshold_abs: z.number().nullable(),
  threshold_pct: z.number().nullable(),
  unit: z.string(),
  exceeds: z.boolean(),
  qualitative_count: z.number().int(),
  material_qualitative: z.boolean(),
  confirmed_count: z.number().int(),
  corrected_count: z.number().int(),
  warning: z.boolean(),
  warning_reason: z.string().nullable(),
  snapshot_at: IsoDateTime,
})
export type AggregationSnapshot = z.infer<typeof AggregationSnapshot>

export const OpinionIteration = AuditColumns.extend({
  id: Id,
  service_id: Id,
  iteration_no: z.number().int().positive(),
  status: z.enum(ITERATION_STATUSES),
  summary_json: z.object({
    /** The draft opinion type (PRD FR-87 `draft_opinion_type`). */
    opinion_type: z.enum(OPINION_TYPES).nullable(),
    level_of_assurance: z.enum(LEVELS_OF_ASSURANCE).nullable(),
    figures: z.array(VerifiedFigure).default([]),
    narrative: z.string().default(''),
  }),
  submitted_for_ir_at: IsoDateTime.nullable(),
  ir_user_id: Id.nullable(),
  ir_decision: z.enum(['approve', 'request_changes']).nullable(),
  ir_comment: z.string().nullable(),
  ir_decided_at: IsoDateTime.nullable(),
  manager_user_id: Id.nullable(),
  manager_decision: z.enum(['approve', 'request_changes']).nullable(),
  manager_comment: z.string().nullable(),
  manager_decided_at: IsoDateTime.nullable(),
  checklist_ir_json: z.array(ChecklistItem).default([]),
  checklist_manager_json: z.array(ChecklistItem).default([]),
  // PRD v0.3
  aggregation_json: AggregationSnapshot.nullable().default(null),
  materiality_warning: z.boolean().default(false),
  materiality_ack_ir_json: MaterialityAck.nullable().default(null),
  materiality_ack_manager_json: MaterialityAck.nullable().default(null),
  /** FR-89: the statement this iteration revises. */
  revision_of_statement_id: Id.nullable().default(null),
  /** FR-77 (b): how many times a verified-value edit sent this iteration back to independent review. */
  returned_to_ir_count: z.number().int().nonnegative().default(0),
})
export type OpinionIteration = z.infer<typeof OpinionIteration>

export const IterationDocument = AuditColumns.extend({
  id: Id,
  iteration_id: Id,
  document_version_id: Id,
  role: z.enum(ITERATION_DOC_ROLES),
})
export type IterationDocument = z.infer<typeof IterationDocument>

export const OpinionStatement = AuditColumns.extend({
  id: Id,
  service_id: Id,
  iteration_id: Id,
  public_code: z.string().min(6),
  opinion_type: z.enum(OPINION_TYPES),
  level_of_assurance: z.enum(LEVELS_OF_ASSURANCE),
  statement_html_r2_key: z.string(),
  statement_pdf_r2_key: z.string(),
  figures_json: z.array(VerifiedFigure),
  hashes_json: z.array(z.object({ filename: z.string(), sha256: z.string(), role: z.enum(ITERATION_DOC_ROLES) })),
  signatories_json: z.array(z.object({ name: z.string(), role: z.string(), signed_at: IsoDateTime })),
  issued_at: IsoDateTime,
  issued_by: Id,
  public_enabled: z.boolean(),
  // PRD v0.3 FR-34, FR-89, FR-90
  materiality_json: z.object({ assertion_base: z.enum(ASSERTION_BASES), threshold_pct: z.number(), threshold_abs: z.number().nullable(), unit: z.string(), basis: z.enum(MATERIALITY_BASES) }).nullable().default(null),
  misstatement_summary_json: AggregationSnapshot.nullable().default(null),
  status: z.enum(STATEMENT_STATUSES).default('issued'),
  superseded_by_id: Id.nullable().default(null),
  superseded_at: IsoDateTime.nullable().default(null),
  withdrawn_at: IsoDateTime.nullable().default(null),
  withdrawn_by: Id.nullable().default(null),
  withdrawal_reason: z.string().nullable().default(null),
  withdrawal_public_category: z.enum(WITHDRAWAL_PUBLIC_CATEGORIES).nullable().default(null),
})
export type OpinionStatement = z.infer<typeof OpinionStatement>

/** PRD v0.3 FR-84: one materiality setting per service, approved by a manager. */
export const MaterialitySetting = AuditColumns.extend({
  id: Id,
  service_id: Id,
  level_of_assurance: z.enum(LEVELS_OF_ASSURANCE),
  assertion_base: z.enum(ASSERTION_BASES),
  assertion_declared_value: z.number().nullable(),
  assertion_unit: z.string(),
  threshold_pct: z.number().min(0).max(100),
  threshold_abs: z.number().nullable(),
  basis: z.enum(MATERIALITY_BASES),
  basis_note: z.string().nullable(),
  qualitative_json: z.array(z.string()).default([]),
  template_defaults_json: z.object({ assertion_base: z.enum(ASSERTION_BASES), threshold_pct: z.number(), basis: z.enum(MATERIALITY_BASES) }).nullable().default(null),
  status: z.enum(MATERIALITY_STATUSES),
  set_by: Id.nullable(),
  approved_by: Id.nullable(),
  approved_at: IsoDateTime.nullable(),
})
export type MaterialitySetting = z.infer<typeof MaterialitySetting>

/** PRD v0.3 FR-85: the misstatement register. */
export const Misstatement = AuditColumns.extend({
  id: Id,
  service_id: Id,
  org_id: Id,
  iteration_id: Id.nullable(),
  finding_id: Id.nullable(),
  record_type: z.enum(MISSTATEMENT_RECORD_TYPES).nullable(),
  record_id: Id.nullable(),
  record_line_id: Id.nullable(),
  source: z.enum(MISSTATEMENT_SOURCES),
  direction: z.enum(MISSTATEMENT_DIRECTIONS),
  amount: z.number().nonnegative(),
  amount_unit: z.string(),
  nature: z.enum(MISSTATEMENT_NATURES),
  material_candidate: z.boolean().default(false),
  description: z.string().min(1),
  status: z.enum(MISSTATEMENT_STATUSES),
  dismiss_reason: z.string().nullable(),
  corrected: z.boolean().default(false),
  corrected_revision_ref: z.string().nullable(),
  confirmed_by: Id.nullable(),
  confirmed_at: IsoDateTime.nullable(),
})
export type Misstatement = z.infer<typeof Misstatement>

/** PRD v0.3 FR-88: a post-issuance event on a statement. */
export const PostIssuanceEvent = AuditColumns.extend({
  id: Id,
  service_id: Id,
  statement_id: Id,
  trigger: z.enum(POST_ISSUANCE_TRIGGERS),
  case_id: Id.nullable(),
  description: z.string().min(1),
  evidence_json: z.array(Id).default([]),
  status: z.enum(POST_ISSUANCE_STATUSES),
  outcome: z.enum(POST_ISSUANCE_OUTCOMES).nullable(),
  decision_reason: z.string().nullable(),
  opened_by: Id,
  opened_at: IsoDateTime,
  decided_by: Id.nullable(),
  decided_at: IsoDateTime.nullable(),
  closed_at: IsoDateTime.nullable(),
  replacement_iteration_id: Id.nullable(),
  external_notification_json: z.object({ to: z.string(), when: IsoDateTime, how: z.string(), by: Id }).nullable().default(null),
})
export type PostIssuanceEvent = z.infer<typeof PostIssuanceEvent>

/** PRD v0.3 FR-83: one row per write-back, supersession or withdrawal of a record's assurance. */
export const RecordAssuranceHistory = z.object({
  id: Id,
  org_id: Id,
  record_type: z.enum(MISSTATEMENT_RECORD_TYPES),
  record_id: Id,
  statement_id: Id,
  level_of_assurance: z.enum(LEVELS_OF_ASSURANCE),
  event: z.enum(['written_back', 'superseded', 'withdrawn']),
  occurred_at: IsoDateTime,
})
export type RecordAssuranceHistory = z.infer<typeof RecordAssuranceHistory>
