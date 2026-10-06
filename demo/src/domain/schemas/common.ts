import { z } from 'zod'

/** ULID-like id. Fixtures use readable ids such as "org_northwind"; Phase II uses ULIDs. */
export const Id = z.string().min(1)
export const IsoDateTime = z.string().datetime({ offset: true })
export const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD')

/** Common audit columns on every mutable row (PRD §9.1). */
export const AuditColumns = z.object({
  created_at: IsoDateTime,
  created_by: Id.nullable(),
  updated_at: IsoDateTime,
  updated_by: Id.nullable(),
  version: z.number().int().nonnegative(),
  deleted_at: IsoDateTime.nullable(),
})
export type AuditColumns = z.infer<typeof AuditColumns>

export const Money = z.object({
  amount_minor: z.number().int(),
  currency: z.string().length(3),
})
