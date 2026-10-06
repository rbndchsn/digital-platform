import { z } from 'zod'
import { ACTOR_TYPES, DOCUMENT_SOURCES, FLAG_STATES, HORIZONS, NOTIFICATION_TYPES } from '../enums'
import { Id, IsoDateTime } from './common'

export const AuditEvent = z.object({
  id: Id,
  org_id: Id,
  service_id: Id.nullable(),
  actor_user_id: Id.nullable(),
  actor_api_client_id: Id.nullable(),
  actor_type: z.enum(ACTOR_TYPES),
  event_type: z.string().min(1),
  entity_type: z.string().min(1),
  entity_id: Id,
  summary: z.string().min(1),
  before_json: z.unknown().nullable(),
  after_json: z.unknown().nullable(),
  ip: z.string().nullable(),
  user_agent: z.string().nullable(),
  occurred_at: IsoDateTime,
})
export type AuditEvent = z.infer<typeof AuditEvent>

export const Notification = z.object({
  id: Id,
  org_id: Id,
  user_id: Id,
  type: z.enum(NOTIFICATION_TYPES),
  title: z.string().min(1),
  body: z.string(),
  entity_type: z.string().nullable(),
  entity_id: Id.nullable(),
  service_id: Id.nullable(),
  read_at: IsoDateTime.nullable(),
  emailed_at: IsoDateTime.nullable(),
  created_at: IsoDateTime,
})
export type Notification = z.infer<typeof Notification>

export const NotificationPreference = z.object({
  user_id: Id,
  type: z.enum(NOTIFICATION_TYPES),
  in_app: z.boolean(),
  email: z.enum(['immediate', 'digest', 'off']),
})
export type NotificationPreference = z.infer<typeof NotificationPreference>

export const Submission = z.object({
  id: Id,
  org_id: Id,
  source: z.enum(DOCUMENT_SOURCES),
  api_client_id: Id.nullable(),
  entity_type: z.string(),
  entity_id: Id,
  payload_sha256: z.string(),
  received_at: IsoDateTime,
})
export type Submission = z.infer<typeof Submission>

export const FeatureFlag = z.object({
  key: z.string().min(1),
  default_state: z.enum(FLAG_STATES),
  title: z.string().min(1),
  description: z.string(),
  horizon: z.enum(HORIZONS),
  /** Navigation group the preview page lives in. */
  area: z.enum(['integrations', 'engagements', 'records', 'statements', 'platform']),
})
export type FeatureFlag = z.infer<typeof FeatureFlag>

export const FeatureFlagOverride = z.object({
  org_id: Id,
  flag_key: z.string(),
  state: z.enum(FLAG_STATES),
})
export type FeatureFlagOverride = z.infer<typeof FeatureFlagOverride>

export const FeatureInterest = z.object({
  id: Id,
  org_id: Id,
  user_id: Id,
  flag_key: z.string(),
  note: z.string().nullable(),
  created_at: IsoDateTime,
})
export type FeatureInterest = z.infer<typeof FeatureInterest>
