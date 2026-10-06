import { z } from 'zod'
import { CLIENT_ROLES, ORG_ROLES, ORG_TYPES, PLATFORM_ROLES, VERIFIER_ROLES } from '../enums'
import { AuditColumns, Id, IsoDateTime } from './common'

export const Organisation = AuditColumns.extend({
  id: Id,
  type: z.enum(ORG_TYPES),
  name: z.string().min(1),
  legal_name: z.string().min(1),
  country: z.string().length(2),
  registration_no: z.string().nullable(),
  settings_json: z.record(z.string(), z.unknown()).default({}),
  status: z.enum(['active', 'suspended']),
  /** Demo-only: short initials for avatars. */
  initials: z.string().min(1).max(3).optional(),
})
export type Organisation = z.infer<typeof Organisation>

export const User = AuditColumns.extend({
  id: Id,
  email: z.string().email(),
  name: z.string().min(1),
  email_verified: z.boolean(),
  mfa_enabled: z.boolean(),
  locale: z.string().default('en'),
  timezone: z.string().default('UTC'),
  status: z.enum(['active', 'disabled']),
  job_title: z.string().optional(),
  platform_role: z.enum(PLATFORM_ROLES).nullable().default(null),
})
export type User = z.infer<typeof User>

export const Membership = AuditColumns.extend({
  id: Id,
  org_id: Id,
  user_id: Id,
  role: z.enum(ORG_ROLES),
  status: z.enum(['invited', 'active', 'disabled']),
})
export type Membership = z.infer<typeof Membership>

export const Invitation = AuditColumns.extend({
  id: Id,
  org_id: Id,
  email: z.string().email(),
  role: z.enum(ORG_ROLES),
  expires_at: IsoDateTime,
  accepted_at: IsoDateTime.nullable(),
  invited_by: Id,
})
export type Invitation = z.infer<typeof Invitation>

export const ApiClient = AuditColumns.extend({
  id: Id,
  org_id: Id,
  name: z.string().min(1),
  key_prefix: z.string(),
  scopes_json: z.array(z.enum(['read', 'write', 'submit'])),
  last_used_at: IsoDateTime.nullable(),
  revoked_at: IsoDateTime.nullable(),
})
export type ApiClient = z.infer<typeof ApiClient>

export const ClientRoleSchema = z.enum(CLIENT_ROLES)
export const VerifierRoleSchema = z.enum(VERIFIER_ROLES)
