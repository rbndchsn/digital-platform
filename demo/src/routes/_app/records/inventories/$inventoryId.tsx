/** Inventory editor: scope tabs, per-gas lines, evidence, declared vs verified, submit (PRD FR-40..FR-43). */
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Pencil, Plus, RotateCcw, Send, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { records } from '@/api'
import type { InventoryView, LineView } from '@/api/records'
import type { ScopeCategory } from '@/domain/enums'
import { SCOPE_CATEGORIES, SCOPE_CATEGORY_LABELS, scopeOfCategory } from '@/domain/enums'
import type { GasEntry } from '@/domain/schemas'
import { ConfirmTyped } from '@/components/confirm-typed'
import { DeclaredVerifiedPair } from '@/components/declared-verified'
import { EvidenceChips } from '@/components/evidence-chips'
import { KpiNumber } from '@/components/kpi-tile'
import { PageHeader } from '@/components/page-header'
import { StatusChip } from '@/components/status-chip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Field, Input, NativeSelect, Textarea } from '@/components/ui/input'
import { Alert, Progress, Skeleton } from '@/components/ui/misc'
import { NavTabs } from '@/components/nav-tabs'
import { GasEditor } from '@/features/records/gas-editor'
import { SubmitForVerificationDialog } from '@/features/records/submit-dialog'
import { useMe } from '@/lib/auth'
import { fmtNumber } from '@/lib/format'
import { useAppMutation } from '@/lib/query'

export const Route = createFileRoute('/_app/records/inventories/$inventoryId')({
  component: InventoryEditor,
})

function InventoryEditor() {
  const { inventoryId } = Route.useParams()
  const me = useMe()
  const q = useQuery({ queryKey: ['inventory', inventoryId], queryFn: () => records.getInventory(inventoryId) })
  const [scope, setScope] = useState<'1' | '2' | '3'>('3')
  const [edit, setEdit] = useState<LineView | 'new' | null>(null)
  const [verify, setVerify] = useState<LineView | null>(null)
  const [submit, setSubmit] = useState(false)
  const [reopen, setReopen] = useState(false)
  const [del, setDel] = useState<LineView | null>(null)
  const submitM = useAppMutation((t: Parameters<typeof records.submitInventory>[1]) => records.submitInventory(inventoryId, t), { successMessage: 'Inventory submitted for verification.' })
  const reopenM = useAppMutation(() => records.reopenInventory(inventoryId), { successMessage: 'Inventory reopened as a new revision.' })
  const delM = useAppMutation((lineId: string) => records.removeLine(inventoryId, lineId), { successMessage: 'Line removed.' })
  if (!q.data) return <Skeleton className="h-64" />
  const inv = q.data
  const isClient = me.org.type === 'client'
  const canEdit = isClient && me.role !== 'client_viewer' && inv.status === 'draft'
  const canReopen = isClient && me.role !== 'client_viewer' && inv.status === 'submitted'
  // Verifier roles and the manager (PRD FR-77) enter verified values; the platform administrator never does.
  const canVerify = !isClient && !me.isAdmin && ['submitted', 'under_verification'].includes(inv.status)
  const lines = inv.lines.filter((l) => String(l.scope) === scope)
  const scopeTotal = (s: string) => inv.totals.by_scope[s] ?? 0
  const verifiedScope = (s: string) => inv.verifiedTotals?.by_scope[s] ?? null
  const completeness = inv.completeness.total ? Math.round((inv.completeness.withEvidence / inv.completeness.total) * 100) : 0
  return (
    <>
      <PageHeader
        crumbs={[{ label: 'GHG inventories', to: '/records/inventories' }, { label: String(inv.year) }]}
        title={`GHG inventory ${inv.year}`}
        description={`${inv.boundary_name} · ${inv.consolidation.replace('_', ' ')} · GWP ${inv.gwp_set} (100-year) · revision ${inv.revision}`}
        meta={
          <>
            <StatusChip status={inv.status} />
            {inv.serviceReference ? (
              <Link to="/engagements/$serviceId" params={{ serviceId: inv.service_id! }} className="text-primary text-xs font-semibold hover:underline">
                Engagement {inv.serviceReference}
              </Link>
            ) : null}
            {inv.statementCode ? (
              <Link to="/verify/$code" params={{ code: inv.statementCode }} className="text-primary text-xs font-semibold hover:underline">
                Statement {inv.statementCode}
              </Link>
            ) : null}
          </>
        }
        actions={
          <>
            {canEdit ? (
              <Button onClick={() => setSubmit(true)}>
                <Send /> Submit for verification
              </Button>
            ) : null}
            {canReopen ? (
              <Button variant="secondary" onClick={() => setReopen(true)}>
                <RotateCcw /> Reopen to edit
              </Button>
            ) : null}
          </>
        }
      />
      {inv.status === 'verified' ? <Alert tone="success" className="mb-5" title="Verified">Verified values below carry the assurance reference of the issued opinion. Later edits create a new revision that supersedes this one once verified.</Alert> : null}
      {inv.status === 'submitted' || inv.status === 'under_verification' ? <Alert tone="info" className="mb-5" title="Under verification">Declared values are frozen. VERIFASSUR enters verified values line by line; differences are highlighted.</Alert> : null}
      <div className="mb-5 grid gap-4 md:grid-cols-4">
        <KpiNumber value={inv.totals.gross_tco2e} unit="tCO2e" label="Gross total (declared)" hint={inv.verifiedTotals ? `Verified ${fmtNumber(inv.verifiedTotals.gross_tco2e)}` : undefined} />
        <KpiNumber value={inv.totals.biogenic_co2_t} unit="t" label="Biogenic CO2 (reported separately)" tone="fg" />
        <KpiNumber value={inv.totals.removals_tco2e} unit="tCO2e" label="Removals (reported separately)" tone="success" />
        <Card>
          <CardContent className="pt-4">
            <div className="text-fg text-sm font-semibold">Evidence completeness</div>
            <Progress value={completeness} tone={completeness === 100 ? 'success' : 'warning'} className="mt-2" label="Evidence completeness" />
            <div className="text-fg-subtle mt-1 text-xs">
              {inv.completeness.withEvidence} of {inv.completeness.total} lines evidenced
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <NavTabs
          value={scope}
          onChange={setScope}
          label="Scopes"
          items={(['1', '2', '3'] as const).map((s) => ({
            value: s,
            label: (
              <>
                Scope {s} <span className="text-fg-subtle ml-1.5 text-xs tabular-nums">{fmtNumber(scopeTotal(s))}{verifiedScope(s) != null ? ` / ${fmtNumber(verifiedScope(s))}` : ''}</span>
              </>
            ),
          }))}
        />
        {canEdit ? (
          <Button variant="secondary" size="sm" onClick={() => setEdit('new')}>
            <Plus /> Add line
          </Button>
        ) : null}
      </div>
      <Card>
        {lines.length === 0 ? (
          <p className="text-fg-muted p-6 text-center text-sm">No lines in scope {scope}.</p>
        ) : (
          <ul className="divide-border divide-y">
            {lines.map((l) => (
              <li key={l.id} className="px-5 py-3">
                <div className="flex flex-wrap items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="outline">{SCOPE_CATEGORY_LABELS[l.category]}</Badge>
                      {l.site ? <span className="text-fg-subtle text-xs">{l.site}</span> : null}
                      {l.source !== 'manual' ? <Badge tone="info">via {l.source}</Badge> : null}
                    </div>
                    <div className="text-fg mt-1 text-sm font-medium">{l.activity}</div>
                    <div className="text-fg-subtle text-xs">
                      {l.quantity != null ? `${fmtNumber(l.quantity)} ${l.unit ?? ''} · ` : ''}
                      {l.gases.map((g) => `${g.gas}${g.gas_detail && g.gas_detail !== g.gas ? ` (${g.gas_detail})` : ''} ${fmtNumber(g.tonnes_gas, 3)} t × ${g.gwp}`).join(' · ')}
                      {l.declared_biogenic_co2_t ? ` · biogenic ${fmtNumber(l.declared_biogenic_co2_t)} t` : ''}
                      {l.declared_removals_tco2e ? ` · removals ${fmtNumber(l.declared_removals_tco2e)} tCO2e` : ''}
                    </div>
                    <EvidenceChips evidence={l.evidence} entityType="inventory_line" entityId={l.id} canEdit={isClient && me.role !== 'client_viewer' && inv.status !== 'verified'} serviceId={inv.service_id} className="mt-1.5" compact />
                    {l.verifier_comment ? <div className="text-warning mt-1 text-xs">Verifier: {l.verifier_comment}</div> : null}
                  </div>
                  <DeclaredVerifiedPair declared={l.declared_gross_tco2e} verified={l.verified_gross_tco2e} unit="tCO2e" className="w-56 shrink-0" />
                  <div className="flex shrink-0 gap-1">
                    {canEdit ? (
                      <>
                        <Button size="icon" variant="ghost" aria-label="Edit line" onClick={() => setEdit(l)}>
                          <Pencil />
                        </Button>
                        <Button size="icon" variant="ghost" aria-label="Delete line" onClick={() => setDel(l)}>
                          <Trash2 />
                        </Button>
                      </>
                    ) : null}
                    {canVerify ? (
                      <Button size="sm" variant="outline" onClick={() => setVerify(l)}>
                        Verified value
                      </Button>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {edit ? <LineDialog inv={inv} line={edit === 'new' ? null : edit} defaultScope={scope} onClose={() => setEdit(null)} /> : null}
      {verify ? <VerifyLineDialog inv={inv} line={verify} onClose={() => setVerify(null)} /> : null}
      <SubmitForVerificationDialog open={submit} onOpenChange={setSubmit} serviceType="iso14064_1_inventory_verification" defaultName={`Corporate GHG inventory FY${inv.year} — verification`} onSubmit={(t) => submitM.mutateAsync(t)} pending={submitM.isPending} blockers={inv.lines.length === 0 ? ['Add at least one line.'] : []} />
      <ConfirmTyped open={reopen} onOpenChange={setReopen} title="Reopen this inventory?" description="A new revision is created and declared values can be edited again. The engagement keeps the submitted revision until you resubmit." phrase="reopen" confirmLabel="Reopen" danger={false} onConfirm={() => reopenM.mutateAsync()} />
      <ConfirmTyped open={del !== null} onOpenChange={(o) => !o && setDel(null)} title={`Delete line "${del?.activity}"?`} phrase="delete" confirmLabel="Delete line" onConfirm={() => delM.mutateAsync(del!.id)} />
    </>
  )
}

function LineDialog({ inv, line, defaultScope, onClose }: { inv: InventoryView; line: LineView | null; defaultScope: string; onClose: () => void }) {
  const [category, setCategory] = useState<ScopeCategory>(line?.category ?? (SCOPE_CATEGORIES.find((c) => String(scopeOfCategory(c)) === defaultScope) ?? 's3_c1_purchased_goods_services'))
  const [site, setSite] = useState(line?.site ?? '')
  const [activity, setActivity] = useState(line?.activity ?? '')
  const [quantity, setQuantity] = useState(line?.quantity != null ? String(line.quantity) : '')
  const [unit, setUnit] = useState(line?.unit ?? '')
  const [gases, setGases] = useState<GasEntry[]>(line ? line.gases.map((g) => ({ gas: g.gas, gas_detail: g.gas_detail, tonnes_gas: g.tonnes_gas, custom_gwp: g.custom_gwp })) : [{ gas: 'CO2', gas_detail: null, tonnes_gas: 0, custom_gwp: null }])
  const [biogenic, setBiogenic] = useState(String(line?.declared_biogenic_co2_t ?? 0))
  const [removals, setRemovals] = useState(String(line?.declared_removals_tco2e ?? 0))
  const m = useAppMutation(() => records.upsertLine(inv.id, { category, site: site || null, activity, quantity: quantity === '' ? null : Number(quantity), unit: unit || null, gases, biogenic_co2_t: Number(biogenic) || 0, removals_tco2e: Number(removals) || 0 }, line?.id), { successMessage: line ? 'Line updated.' : 'Line added.', onSuccess: onClose })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={line ? 'Edit line' : 'Add line'} description="Enter tonnes of each gas; the platform applies the inventory's GWP set. Biogenic CO2 and removals are separate." size="xl">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Category" required>
            <NativeSelect value={category} onChange={(e) => setCategory(e.target.value as ScopeCategory)}>
              {SCOPE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  Scope {scopeOfCategory(c)} · {SCOPE_CATEGORY_LABELS[c]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Site">
            <Input value={site} onChange={(e) => setSite(e.target.value)} placeholder="e.g. Lelystad" />
          </Field>
          <Field label="Activity" required className="sm:col-span-2">
            <Input value={activity} onChange={(e) => setActivity(e.target.value)} placeholder="e.g. Natural gas — boilers and CHP" />
          </Field>
          <Field label="Activity quantity">
            <Input type="number" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </Field>
          <Field label="Quantity unit">
            <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="m3, L, MWh, t…" />
          </Field>
        </div>
        <div className="mt-4">
          <GasEditor set={inv.gwp_set} gases={gases} onChange={setGases} />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Biogenic CO2 (t, reported separately)">
            <Input type="number" min={0} step="any" value={biogenic} onChange={(e) => setBiogenic(e.target.value)} />
          </Field>
          <Field label="Removals (tCO2e, reported separately)">
            <Input type="number" min={0} step="any" value={removals} onChange={(e) => setRemovals(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => m.mutate()} loading={m.isPending} disabled={!activity.trim() || gases.length === 0}>
            {line ? 'Save line' : 'Add line'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function VerifyLineDialog({ inv, line, onClose }: { inv: InventoryView; line: LineView; onClose: () => void }) {
  const [gross, setGross] = useState(String(line.verified_gross_tco2e ?? line.declared_gross_tco2e))
  const [comment, setComment] = useState(line.verifier_comment ?? '')
  const m = useAppMutation(() => records.setVerifiedLine(inv.id, line.id, { gross: Number(gross), biogenic: line.verified_biogenic_co2_t ?? line.declared_biogenic_co2_t, removals: line.verified_removals_tco2e ?? line.declared_removals_tco2e, comment: comment || null }), { successMessage: 'Verified value recorded.', onSuccess: onClose })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Verified value" description={`${line.activity} · declared ${fmtNumber(line.declared_gross_tco2e)} tCO2e`} size="sm">
        <Field label="Verified gross tCO2e" required>
          <Input type="number" step="any" value={gross} onChange={(e) => setGross(e.target.value)} />
        </Field>
        <Field label="Comment (shown to the client)" className="mt-3">
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} />
        </Field>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => m.mutate()} loading={m.isPending}>
            Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
