/** Evidence vault: simulated uploads, versions, checks, evidence links, download-all (PRD §6.3; plan_v1 §2.2 "show, don't do"). */
import type { EvidenceEntityType, SlotCategory } from '@/domain/enums'
import type { Document, DocumentVersion, EvidenceLink } from '@/domain/schemas'
import { documentMachine } from '@/domain/workflow/machines'
import { fakeSha256 } from '@/mock/ids'
import { ApiError, audit, auditNow, authContext, authorize, call, getStore, newId, notify, nowIsoString, serviceAudience, serviceResource, userName } from './core'
import { autoCompleteStep } from './approvals'

export interface VersionView extends DocumentVersion {
  uploaderName: string
  checkerName: string | null
}

export interface DocumentView extends Document {
  current: VersionView | null
  versions: VersionView[]
  slot: { id: string; key: string; name: string; required: boolean; status: string; stepName: string; phaseName: string } | null
  evidenceFor: { entity_type: EvidenceEntityType; entity_id: string }[]
  serviceReference: string | null
}

export function versionView(v: DocumentVersion): VersionView {
  return { ...v, uploaderName: userName(v.uploaded_by), checkerName: v.checked_by ? userName(v.checked_by) : null }
}

export function documentView(doc: Document): DocumentView {
  const s = getStore()
  const versions = s.where('documentVersions', (v) => v.document_id === doc.id && !v.deleted_at).sort((a, b) => b.version_no - a.version_no).map(versionView)
  const current = versions.find((v) => v.id === doc.current_version_id) ?? versions[0] ?? null
  const slot = doc.slot_id ? s.find('slots', doc.slot_id) : null
  const step = slot ? s.find('steps', slot.step_id) : null
  const phase = step ? s.find('phases', step.phase_id) : null
  const versionIds = new Set(versions.map((v) => v.id))
  return {
    ...doc,
    current,
    versions,
    slot: slot ? { id: slot.id, key: slot.key, name: slot.name, required: slot.required, status: slot.status, stepName: step?.name ?? '', phaseName: phase?.name ?? '' } : null,
    evidenceFor: s.where('evidenceLinks', (e) => versionIds.has(e.document_version_id)).map((e) => ({ entity_type: e.entity_type, entity_id: e.entity_id })),
    serviceReference: doc.service_id ? (s.find('services', doc.service_id)?.reference ?? null) : null,
  }
}

export async function listForService(serviceId: string): Promise<DocumentView[]> {
  return call(() => {
    authorize('document.read', serviceResource(serviceId))
    return getStore()
      .where('documents', (d) => d.service_id === serviceId && !d.deleted_at)
      .map(documentView)
      .sort((a, b) => ((a.current?.uploaded_at ?? '') < (b.current?.uploaded_at ?? '') ? 1 : -1))
  })
}

export async function listForOrg(): Promise<DocumentView[]> {
  return call(() => {
    const ctx = authContext()
    return getStore()
      .where('documents', (d) => d.org_id === ctx.orgId && !d.deleted_at)
      .map(documentView)
      .sort((a, b) => ((a.current?.uploaded_at ?? '') < (b.current?.uploaded_at ?? '') ? 1 : -1))
  })
}

export async function get(documentId: string): Promise<DocumentView> {
  return call(() => {
    const doc = getStore().get('documents', documentId)
    if (doc.service_id) authorize('document.read', serviceResource(doc.service_id))
    else authorize('record.read', { orgId: doc.org_id })
    return documentView(doc)
  })
}

export interface SimulatedUpload {
  serviceId: string | null
  slotId?: string | null
  documentId?: string | null
  title?: string
  filename: string
  sizeBytes: number
  mimeType: string
  category?: SlotCategory
}

/**
 * "Simulate upload": creates the document/version rows the real upload handshake would create.
 * No file bytes are read (plan_v1 §2.2).
 */
export async function simulateUpload(input: SimulatedUpload): Promise<DocumentView> {
  return call(() => {
    const s = getStore()
    const slot = input.slotId ? s.get('slots', input.slotId) : null
    const existing = input.documentId ? s.get('documents', input.documentId) : slot?.current_document_id ? s.find('documents', slot.current_document_id) : null
    const party = slot?.uploader_party ?? (authContext().orgType === 'client' ? 'client' : 'verifier')
    const ctx = input.serviceId ? authorize(party === 'client' ? 'document.upload:client' : 'document.upload:verifier', { ...serviceResource(input.serviceId), locked: Boolean(existing?.locked_at) }) : authorize('record.create', { orgId: authContext().orgId })
    if (existing?.locked_at) throw new ApiError('conflict', 'This document is locked by an issued opinion.')
    const orgId = input.serviceId ? s.get('services', input.serviceId).org_id : ctx.orgId
    const doc: Document = existing ?? {
      ...auditNow(ctx.userId),
      id: newId('doc'),
      org_id: orgId,
      service_id: input.serviceId,
      slot_id: slot?.id ?? null,
      title: input.title ?? slot?.name ?? input.filename,
      category: input.category ?? slot?.category ?? 'supporting',
      current_version_id: null,
      locked_at: null,
    }
    if (!existing) s.insert('documents', doc)
    const versionNo = s.where('documentVersions', (v) => v.document_id === doc.id).length + 1
    const at = nowIsoString()
    const ver: DocumentVersion = {
      ...auditNow(ctx.userId),
      id: newId('ver'),
      document_id: doc.id,
      version_no: versionNo,
      r2_key: `org/${orgId}/doc/${doc.id}/v${versionNo}/${input.filename}`,
      filename: input.filename,
      mime_type: input.mimeType,
      size_bytes: input.sizeBytes,
      sha256: fakeSha256(`${doc.id}:${versionNo}:${input.filename}:${at}`),
      uploaded_by: ctx.userId,
      uploaded_at: at,
      source: 'manual',
      check_status: 'uploaded',
      checked_by: null,
      checked_at: null,
      reject_reason: null,
    }
    s.insert('documentVersions', ver)
    s.update('documents', doc.id, { current_version_id: ver.id }, ctx.userId)
    if (slot) s.update('slots', slot.id, { current_document_id: doc.id, status: 'submitted' }, ctx.userId)
    audit(ctx, { orgId, serviceId: input.serviceId, eventType: 'document.uploaded', entityType: 'document_version', entityId: ver.id, summary: `${input.filename} uploaded by ${userName(ctx.userId)}${slot ? ` to "${slot.name}"` : ''}`, after: { version_no: versionNo, sha256: ver.sha256, size_bytes: ver.size_bytes } })
    // The platform's integrity check completes immediately in the demo.
    s.update('documentVersions', ver.id, { check_status: 'checked' }, null)
    if (input.serviceId && slot) {
      const svc = s.get('services', input.serviceId)
      notify(serviceAudience(input.serviceId, party === 'client' ? 'verifier' : 'client'), party === 'client' ? 'org_verifassur' : svc.org_id, 'document_requested', `${slot.name} uploaded`, `${userName(ctx.userId)} uploaded ${input.filename} (v${versionNo}) to ${svc.reference}.`, input.serviceId, { type: 'document', id: doc.id })
      // Verifier-uploaded slots don't need a client check; mark accepted so the step can close.
      if (party === 'verifier') {
        s.update('documentVersions', ver.id, { check_status: 'accepted', checked_by: ctx.userId, checked_at: nowIsoString() }, ctx.userId)
        s.update('slots', slot.id, { status: 'accepted' }, ctx.userId)
        autoCompleteStep(input.serviceId, slot.step_id, ctx.userId)
      }
    }
    return documentView(s.get('documents', doc.id))
  })
}

export async function check(serviceId: string, versionId: string, decision: 'accept' | 'reject', reason?: string): Promise<DocumentView> {
  return call(() => {
    const ctx = authorize('document.check', serviceResource(serviceId))
    const s = getStore()
    const ver = s.get('documentVersions', versionId)
    const doc = s.get('documents', ver.document_id)
    if (doc.locked_at) throw new ApiError('conflict', 'Locked by an issued opinion.')
    if (decision === 'reject' && !reason?.trim()) throw new ApiError('validation', 'A reason is required to reject a document.')
    const { state } = documentMachine.apply(ver.check_status, decision)
    s.update('documentVersions', versionId, { check_status: state, checked_by: ctx.userId, checked_at: nowIsoString(), reject_reason: decision === 'reject' ? reason! : null }, ctx.userId)
    const slot = doc.slot_id ? s.get('slots', doc.slot_id) : null
    if (slot && doc.current_version_id === versionId) s.update('slots', slot.id, { status: state === 'accepted' ? 'accepted' : 'rejected' }, ctx.userId)
    const svc = s.get('services', serviceId)
    audit(ctx, { orgId: svc.org_id, serviceId, eventType: `document.${state}`, entityType: 'document_version', entityId: versionId, summary: `${ver.filename} ${state} by ${userName(ctx.userId)}${reason ? `: ${reason}` : ''}`, before: { check_status: ver.check_status }, after: { check_status: state } })
    notify(serviceAudience(serviceId, 'client'), svc.org_id, state === 'accepted' ? 'document_accepted' : 'document_rejected', `${doc.title} ${state}`, state === 'accepted' ? `${ver.filename} was accepted.` : `${ver.filename} was rejected: ${reason}. Please re-upload.`, serviceId, { type: 'document', id: doc.id })
    if (slot && state === 'accepted') autoCompleteStep(serviceId, slot.step_id, ctx.userId)
    return documentView(s.get('documents', doc.id))
  })
}

export async function removeVersion(versionId: string): Promise<void> {
  return call(() => {
    const s = getStore()
    const ver = s.get('documentVersions', versionId)
    const doc = s.get('documents', ver.document_id)
    const ctx = doc.service_id ? authorize('document.delete', { ...serviceResource(doc.service_id), locked: Boolean(doc.locked_at) }) : authorize('record.create', { orgId: doc.org_id })
    if (doc.locked_at) throw new ApiError('conflict', 'Locked by an issued opinion.')
    s.update('documentVersions', versionId, { deleted_at: nowIsoString() }, ctx.userId)
    const remaining = s.where('documentVersions', (v) => v.document_id === doc.id && !v.deleted_at).sort((a, b) => b.version_no - a.version_no)
    s.update('documents', doc.id, { current_version_id: remaining[0]?.id ?? null, deleted_at: remaining.length ? null : nowIsoString() }, ctx.userId)
    if (doc.slot_id) {
      const slot = s.get('slots', doc.slot_id)
      s.update('slots', slot.id, remaining.length ? { status: remaining[0].check_status === 'accepted' ? 'accepted' : remaining[0].check_status === 'rejected' ? 'rejected' : 'submitted' } : { status: 'empty', current_document_id: null }, ctx.userId)
    }
    audit(ctx, { orgId: doc.org_id, serviceId: doc.service_id, eventType: 'document.version_deleted', entityType: 'document_version', entityId: versionId, summary: `${ver.filename} (v${ver.version_no}) deleted by ${userName(ctx.userId)}` })
  })
}

export async function linkEvidence(documentVersionId: string, entityType: EvidenceEntityType, entityId: string, note?: string): Promise<EvidenceLink> {
  return call(() => {
    const s = getStore()
    const ver = s.get('documentVersions', documentVersionId)
    const doc = s.get('documents', ver.document_id)
    const ctx = authorize('record.create', { orgId: doc.org_id })
    const link: EvidenceLink = { ...auditNow(ctx.userId), id: newId('evl'), org_id: doc.org_id, document_version_id: documentVersionId, entity_type: entityType, entity_id: entityId, note: note ?? null }
    s.insert('evidenceLinks', link)
    audit(ctx, { orgId: doc.org_id, serviceId: doc.service_id, eventType: 'evidence.linked', entityType: 'evidence_link', entityId: link.id, summary: `${ver.filename} linked as evidence to ${entityType.replace('_', ' ')}` })
    return link
  })
}

export async function unlinkEvidence(linkId: string): Promise<void> {
  return call(() => {
    const s = getStore()
    const link = s.get('evidenceLinks', linkId)
    authorize('record.create', { orgId: link.org_id })
    s.remove('evidenceLinks', linkId)
  })
}

export interface EvidenceView {
  linkId: string
  document: DocumentView
}

export function evidenceFor(entityType: EvidenceEntityType, entityId: string): EvidenceView[] {
  const s = getStore()
  return s
    .where('evidenceLinks', (e) => e.entity_type === entityType && e.entity_id === entityId)
    .map((e) => {
      const ver = s.find('documentVersions', e.document_version_id)
      const doc = ver ? s.find('documents', ver.document_id) : null
      return doc ? { linkId: e.id, document: documentView(doc) } : null
    })
    .filter((x): x is EvidenceView => x !== null)
}

/** Simulated "download all": returns a manifest the UI shows while a fake zip "prepares". */
export async function downloadAll(serviceId: string): Promise<{ jobId: string; filename: string; files: { filename: string; sha256: string; size_bytes: number }[]; totalBytes: number }> {
  return call(() => {
    authorize('document.read', serviceResource(serviceId))
    const s = getStore()
    const svc = s.get('services', serviceId)
    const files = s
      .where('documents', (d) => d.service_id === serviceId && !d.deleted_at)
      .map((d) => (d.current_version_id ? s.find('documentVersions', d.current_version_id) : null))
      .filter((v): v is DocumentVersion => Boolean(v))
      .map((v) => ({ filename: v.filename, sha256: v.sha256, size_bytes: v.size_bytes }))
    return { jobId: newId('job'), filename: `${svc.reference}_all-documents.zip`, files, totalBytes: files.reduce((a, f) => a + f.size_bytes, 0) }
  })
}
