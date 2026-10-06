import { z } from 'zod'
import { EVIDENCE_ENTITY_TYPES, FINDING_SEVERITIES, FINDING_STATUSES, FINDING_TYPES, PARTIES } from '../enums'
import { AuditColumns, Id, IsoDate, IsoDateTime } from './common'

export const Finding = AuditColumns.extend({
  id: Id,
  service_id: Id,
  number: z.number().int().positive(),
  type: z.enum(FINDING_TYPES),
  severity: z.enum(FINDING_SEVERITIES),
  title: z.string().min(1),
  description: z.string().default(''),
  step_id: Id.nullable(),
  entity_type: z.enum(EVIDENCE_ENTITY_TYPES).nullable(),
  entity_id: Id.nullable(),
  raised_by: Id,
  raised_at: IsoDateTime,
  assigned_user_id: Id.nullable(),
  due_at: IsoDate.nullable(),
  status: z.enum(FINDING_STATUSES),
  closed_by: Id.nullable(),
  closed_at: IsoDateTime.nullable(),
  blocking: z.boolean(),
})
export type Finding = z.infer<typeof Finding>

export const FindingResponse = AuditColumns.extend({
  id: Id,
  finding_id: Id,
  author_user_id: Id,
  party: z.enum(PARTIES),
  body: z.string().min(1),
})
export type FindingResponse = z.infer<typeof FindingResponse>
