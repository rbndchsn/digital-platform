/** Quotes and invoice references with paid status (PRD FR-57). */
import type { InvoiceKind, InvoiceStatus } from '@/domain/enums'
import type { Invoice } from '@/domain/schemas'
import { todayIso } from '@/mock/clock'
import { audit, auditNow, authorize, call, getStore, newId, notify, serviceAudience, serviceResource } from './core'

export async function list(serviceId: string): Promise<Invoice[]> {
  return call(() => {
    authorize('invoice.read', serviceResource(serviceId))
    return getStore().where('invoices', (i) => i.service_id === serviceId)
  })
}

export interface InvoiceInput {
  kind: InvoiceKind
  reference: string
  amountMinor: number
  currency: string
  issuedAt: string | null
  dueAt: string | null
  status: InvoiceStatus
}

export async function upsert(serviceId: string, input: InvoiceInput, id?: string): Promise<Invoice> {
  return call(() => {
    const ctx = authorize('invoice.manage', serviceResource(serviceId))
    const s = getStore()
    const svc = s.get('services', serviceId)
    const base = { kind: input.kind, reference: input.reference, amount_minor: input.amountMinor, currency: input.currency, issued_at: input.issuedAt, due_at: input.dueAt, status: input.status, paid_at: input.status === 'paid' ? todayIso() : null }
    let row: Invoice
    if (id) row = s.update('invoices', id, base, ctx.userId)
    else {
      row = { ...auditNow(ctx.userId), id: newId('inv'), service_id: serviceId, document_id: null, ...base }
      s.insert('invoices', row)
    }
    audit(ctx, { orgId: svc.org_id, serviceId, eventType: id ? 'invoice.updated' : 'invoice.added', entityType: 'invoice', entityId: row.id, summary: `${input.kind === 'quote' ? 'Quote' : 'Invoice'} ${input.reference} ${id ? 'updated' : 'added'} (${(input.amountMinor / 100).toLocaleString('en', { style: 'currency', currency: input.currency })}, ${input.status})` })
    if (!id) notify(serviceAudience(serviceId, 'client'), svc.org_id, 'invoice_added', `${input.kind === 'quote' ? 'Quote' : 'Invoice'} ${input.reference}`, `${input.kind === 'quote' ? 'A quote' : 'An invoice'} for ${svc.reference} is available.`, serviceId)
    return row
  })
}

export async function markPaid(serviceId: string, id: string): Promise<Invoice> {
  return call(() => {
    const ctx = authorize('invoice.manage', serviceResource(serviceId))
    const s = getStore()
    const row = s.update('invoices', id, { status: 'paid', paid_at: todayIso() }, ctx.userId)
    audit(ctx, { orgId: s.get('services', serviceId).org_id, serviceId, eventType: 'invoice.paid', entityType: 'invoice', entityId: id, summary: `Invoice ${row.reference} marked paid` })
    return row
  })
}
