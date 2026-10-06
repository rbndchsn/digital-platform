import { z } from 'zod'
import { ITERATION_DOC_ROLES, ITERATION_STATUSES, LEVELS_OF_ASSURANCE, OPINION_TYPES } from '../enums'
import { AuditColumns, Id, IsoDateTime } from './common'
import { ChecklistItem } from './engagement'

export const VerifiedFigure = z.object({
  key: z.string(),
  label: z.string(),
  value: z.number(),
  unit: z.string(),
})
export type VerifiedFigure = z.infer<typeof VerifiedFigure>

export const OpinionIteration = AuditColumns.extend({
  id: Id,
  service_id: Id,
  iteration_no: z.number().int().positive(),
  status: z.enum(ITERATION_STATUSES),
  summary_json: z.object({
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
})
export type OpinionStatement = z.infer<typeof OpinionStatement>
