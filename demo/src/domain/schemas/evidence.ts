import { z } from 'zod'
import { DOCUMENT_CHECK_STATUSES, DOCUMENT_SOURCES, EVIDENCE_ENTITY_TYPES, SLOT_CATEGORIES } from '../enums'
import { AuditColumns, Id, IsoDateTime } from './common'

export const Document = AuditColumns.extend({
  id: Id,
  org_id: Id,
  service_id: Id.nullable(),
  slot_id: Id.nullable(),
  title: z.string().min(1),
  category: z.enum(SLOT_CATEGORIES),
  current_version_id: Id.nullable(),
  locked_at: IsoDateTime.nullable(),
})
export type Document = z.infer<typeof Document>

export const DocumentVersion = AuditColumns.extend({
  id: Id,
  document_id: Id,
  version_no: z.number().int().positive(),
  r2_key: z.string(),
  filename: z.string().min(1),
  mime_type: z.string(),
  size_bytes: z.number().int().nonnegative(),
  sha256: z.string().length(64),
  uploaded_by: Id,
  uploaded_at: IsoDateTime,
  source: z.enum(DOCUMENT_SOURCES),
  check_status: z.enum(DOCUMENT_CHECK_STATUSES),
  checked_by: Id.nullable(),
  checked_at: IsoDateTime.nullable(),
  reject_reason: z.string().nullable(),
})
export type DocumentVersion = z.infer<typeof DocumentVersion>

export const EvidenceLink = AuditColumns.extend({
  id: Id,
  org_id: Id,
  document_version_id: Id,
  entity_type: z.enum(EVIDENCE_ENTITY_TYPES),
  entity_id: Id,
  note: z.string().nullable(),
})
export type EvidenceLink = z.infer<typeof EvidenceLink>
