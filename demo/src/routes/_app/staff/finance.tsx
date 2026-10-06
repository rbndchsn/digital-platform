/** Finance: quotes and invoice references with paid status (PRD FR-57). */
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Plus, Receipt } from 'lucide-react'
import { useState } from 'react'
import { invoices, services } from '@/api'
import type { ServiceListItem } from '@/api/services'
import type { InvoiceKind, InvoiceStatus } from '@/domain/enums'
import type { Invoice } from '@/domain/schemas'
import { PageHeader } from '@/components/page-header'
import { StatusChip } from '@/components/status-chip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Field, Input, NativeSelect } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/misc'
import { TBody, TD, TH, THead, TR, Table } from '@/components/ui/table'
import { useMe } from '@/lib/auth'
import { fmtDate, fmtMoney } from '@/lib/format'
import { useAppMutation } from '@/lib/query'

const todayIso = () => new Date().toISOString().slice(0, 10)

export const Route = createFileRoute('/_app/staff/finance')({
  component: Finance,
})

function Finance() {
  const me = useMe()
  const list = useQuery({ queryKey: ['services', 'finance'], queryFn: () => services.list({}) })
  const [add, setAdd] = useState<ServiceListItem | null>(null)
  const canManage = me.role === 'verifier_finance' || me.role === 'verifier_manager' || me.role === 'verifier_coordinator'
  return (
    <>
      <PageHeader title="Finance" description="Quotes and invoices per engagement. Amounts and paid status are visible to the client on the engagement overview; invoicing itself happens in your accounting system." />
      <Card>
        {!list.data ? (
          <div className="p-5">
            <Skeleton className="h-40" />
          </div>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Engagement</TH>
                <TH>Client</TH>
                <TH>Quote</TH>
                <TH>Invoice</TH>
                <TH>Paid</TH>
                <TH />
              </tr>
            </THead>
            <TBody>
              {list.data
                .filter((s) => s.status !== 'draft')
                .map((s) => (
                  <FinanceRow key={s.id} item={s} canManage={canManage} onAdd={() => setAdd(s)} />
                ))}
            </TBody>
          </Table>
        )}
      </Card>
      {add ? <InvoiceDialog item={add} onClose={() => setAdd(null)} /> : null}
    </>
  )
}

function FinanceRow({ item, canManage, onAdd }: { item: ServiceListItem; canManage: boolean; onAdd: () => void }) {
  const inv = useQuery({ queryKey: ['invoices', item.id], queryFn: () => invoices.list(item.id) })
  const paid = useAppMutation((id: string) => invoices.markPaid(item.id, id), { successMessage: 'Marked paid.' })
  const quote = inv.data?.find((i) => i.kind === 'quote')
  const invoice = inv.data?.find((i) => i.kind === 'invoice')
  return (
    <TR>
      <TD>
        <div className="text-fg-subtle text-[11px]">{item.reference}</div>
        <div className="max-w-72 truncate font-medium">{item.name}</div>
      </TD>
      <TD className="text-fg-muted text-sm">{item.orgName}</TD>
      <TD className="text-sm">{quote ? <Money inv={quote} /> : <span className="text-fg-subtle">—</span>}</TD>
      <TD className="text-sm">{invoice ? <Money inv={invoice} /> : <span className="text-fg-subtle">—</span>}</TD>
      <TD>{invoice ? <StatusChip status={invoice.status} /> : <Badge tone="outline">—</Badge>}</TD>
      <TD className="text-right whitespace-nowrap">
        {canManage ? (
          <>
            {invoice && invoice.status !== 'paid' ? (
              <Button size="sm" variant="secondary" onClick={() => paid.mutate(invoice.id)} loading={paid.isPending}>
                Mark paid
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" onClick={onAdd}>
              <Plus /> Add
            </Button>
          </>
        ) : null}
      </TD>
    </TR>
  )
}

function Money({ inv }: { inv: Invoice }) {
  return (
    <span>
      <span className="font-medium">{fmtMoney(inv.amount_minor, inv.currency)}</span>
      <span className="text-fg-subtle ml-1 text-xs">
        {inv.reference} · {fmtDate(inv.issued_at)}
      </span>
    </span>
  )
}

function InvoiceDialog({ item, onClose }: { item: ServiceListItem; onClose: () => void }) {
  const [kind, setKind] = useState<InvoiceKind>('invoice')
  const [reference, setReference] = useState(`${kind === 'quote' ? 'Q' : 'INV'}-${todayIso().slice(0, 4)}-${item.reference.slice(-4)}`)
  const [amount, setAmount] = useState('25000')
  const [currency, setCurrency] = useState('EUR')
  const [status, setStatus] = useState<InvoiceStatus>('sent')
  const m = useAppMutation(() => invoices.upsert(item.id, { kind, reference, amountMinor: Math.round(Number(amount) * 100), currency, issuedAt: todayIso(), dueAt: kind === 'invoice' ? addDays(todayIso(), 30) : null, status }), { successMessage: `${kind === 'quote' ? 'Quote' : 'Invoice'} added; the client can see it.`, onSuccess: onClose })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={<span className="inline-flex items-center gap-2"><Receipt className="size-4" /> Add quote or invoice — {item.reference}</span>} description="Reference and amount only; the document itself lives in your accounting system." size="sm">
        <div className="space-y-3">
          <Field label="Type">
            <NativeSelect value={kind} onChange={(e) => { const k = e.target.value as InvoiceKind; setKind(k); setReference(`${k === 'quote' ? 'Q' : 'INV'}-${todayIso().slice(0, 4)}-${item.reference.slice(-4)}`) }}>
              <option value="quote">Quote</option>
              <option value="invoice">Invoice</option>
            </NativeSelect>
          </Field>
          <Field label="Reference" required>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount" required>
              <Input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
            </Field>
            <Field label="Currency">
              <NativeSelect value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <option>EUR</option>
                <option>USD</option>
                <option>GBP</option>
              </NativeSelect>
            </Field>
          </div>
          <Field label="Status">
            <NativeSelect value={status} onChange={(e) => setStatus(e.target.value as InvoiceStatus)}>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="draft">Draft</option>
            </NativeSelect>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => m.mutate()} loading={m.isPending} disabled={!reference.trim() || !(Number(amount) > 0)}>
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function addDays(d: string, n: number): string {
  return new Date(new Date(`${d}T00:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10)
}
