/** PRD v0.3 §6.20 complaints and appeals, §6.21 competence. Field names follow PRD §9.3. */
import { z } from 'zod'
import { CASE_DECISION_ENTITY_TYPES, CASE_KINDS, CASE_OUTCOMES, CASE_STATUSES, QUALIFICATION_KINDS } from '../enums'
import { AuditColumns, Id, IsoDate, IsoDateTime } from './common'

export const Case = AuditColumns.extend({
  id: Id,
  /** Complainant organisation; the verifier org for an external (R2) complaint. */
  org_id: Id,
  kind: z.enum(CASE_KINDS),
  subject: z.string().min(1),
  description: z.string().default(''),
  complainant_user_id: Id.nullable(),
  external_contact_json: z.object({ name: z.string(), email: z.string() }).nullable().default(null),
  service_id: Id.nullable(),
  decision_entity_type: z.enum(CASE_DECISION_ENTITY_TYPES).nullable(),
  decision_entity_id: Id.nullable(),
  /** Actor of the decision appealed against; joins the involved set of the case (PRD §3.3). */
  decision_actor_user_id: Id.nullable().default(null),
  status: z.enum(CASE_STATUSES),
  received_at: IsoDateTime,
  acknowledged_at: IsoDateTime.nullable(),
  investigation_started_at: IsoDateTime.nullable(),
  decided_at: IsoDateTime.nullable(),
  closed_at: IsoDateTime.nullable(),
  acknowledge_target_at: IsoDateTime,
  decide_target_at: IsoDateTime,
  handler_user_id: Id.nullable(),
  assigned_by: Id.nullable(),
  outcome: z.enum(CASE_OUTCOMES).nullable(),
  /** Visible to the complainant. */
  outcome_summary: z.string().nullable(),
  decided_by: Id.nullable(),
  actions_json: z.object({ reopen_finding_id: Id.nullable(), recheck_document_version_id: Id.nullable(), post_issuance_event_id: Id.nullable() }).nullable().default(null),
})
export type Case = z.infer<typeof Case>

export const CaseNote = AuditColumns.extend({
  id: Id,
  case_id: Id,
  author_user_id: Id,
  body: z.string().min(1),
  /** Internal notes are never shown to the complainant (PRD FR-92). */
  internal: z.boolean(),
})
export type CaseNote = z.infer<typeof CaseNote>

export const CompetenceProfile = AuditColumns.extend({
  id: Id,
  user_id: Id,
  verifier_org_id: Id,
  languages_json: z.array(z.string()).default([]),
  summary: z.string().default(''),
  last_edited_by: Id.nullable(),
  last_edited_at: IsoDateTime.nullable(),
})
export type CompetenceProfile = z.infer<typeof CompetenceProfile>

/** Status (`valid | expiring | expired`) is computed from `valid_until`, never stored (PRD §8.5). */
export const CompetenceQualification = AuditColumns.extend({
  id: Id,
  profile_id: Id,
  kind: z.enum(QUALIFICATION_KINDS),
  sector_scopes_json: z.array(z.string()).default([]),
  technical_areas_json: z.array(z.string()).default([]),
  programmes_json: z.array(z.string()).default([]),
  valid_from: IsoDate,
  valid_until: IsoDate,
  evidence_document_id: Id.nullable(),
  note: z.string().nullable(),
})
export type CompetenceQualification = z.infer<typeof CompetenceQualification>
