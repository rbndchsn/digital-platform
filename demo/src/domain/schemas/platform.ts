import { z } from 'zod'
import { ACTOR_TYPES, ANNOUNCEMENT_AUDIENCES, ANNOUNCEMENT_TONES, DOCUMENT_SOURCES, FLAG_STATES, HORIZONS, NOTIFICATION_TYPES } from '../enums'
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
  /** Mandatory for overrides and ADMIN actions that take one (PRD §6.13/6.14). */
  reason: z.string().nullable().default(null),
  before_json: z.unknown().nullable(),
  after_json: z.unknown().nullable(),
  ip: z.string().nullable(),
  user_agent: z.string().nullable(),
  occurred_at: IsoDateTime,
})
export type AuditEvent = z.infer<typeof AuditEvent>

/** Single-row platform configuration (PRD §9.3 `platform_settings`, FR-67). */
export const PlatformSettings = z.object({
  id: z.literal('platform'),
  maintenance_mode: z.boolean(),
  maintenance_message: z.string().nullable(),
  maintenance_from: IsoDateTime.nullable(),
  maintenance_until: IsoDateTime.nullable(),
  branding_json: z.object({ product_name: z.string().min(1), primary_colour: z.string().min(1), logo_r2_key: z.string().nullable() }),
  notification_templates_json: z.array(z.object({ type: z.enum(NOTIFICATION_TYPES), subject: z.string(), body: z.string() })),
  retention_years: z.number().int().positive(),
  updated_by: Id.nullable(),
  updated_at: IsoDateTime,
})
export type PlatformSettings = z.infer<typeof PlatformSettings>

/** Announcement banner shown in the app shell (PRD FR-67). */
export const Announcement = z.object({
  id: Id,
  title: z.string().min(1),
  body: z.string(),
  tone: z.enum(ANNOUNCEMENT_TONES),
  audience: z.enum(ANNOUNCEMENT_AUDIENCES),
  starts_at: IsoDateTime,
  ends_at: IsoDateTime.nullable(),
  active: z.boolean(),
  created_by: Id.nullable(),
  created_at: IsoDateTime,
})
export type Announcement = z.infer<typeof Announcement>

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
