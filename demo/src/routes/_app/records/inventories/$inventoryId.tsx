/** Inventory editor: scope tabs, per-gas lines, evidence, line review status and assertion-level verified totals, submit (PRD FR-40..FR-43, v0.3 FR-82). */
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { BadgeCheck, Pencil, Plus, RotateCcw, Send, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { records } from '@/api'
import type { InventoryView, LineView } from '@/api/records'
import type { ReviewStatus, ScopeCategory } from '@/domain/enums'
import { REVIEW_STATUSES, REVIEW_STATUS_LABELS, SCOPE_CATEGORIES, SCOPE_CATEGORY_LABELS, scopeOfCategory } from '@/domain/enums'
import type { GasEntry } from '@/domain/schemas'
import { AssuranceBadge, AssuranceHistory } from '@/components/assurance-badge'
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

const REVIEW_TONE: Record<ReviewStatus, 'neutral' | 'success' | 'warning' | 'info'> = { not_reviewed: 'neutral', accepted: 'success', adjusted: 'warning', not_individually_tested: 'info' }

function InventoryEditor() {
  const { inventoryId } = Route.useParams()
  const me = useMe()
  const q = useQuery({ queryKey: ['inventory', inventoryId], queryFn: () => records.getInventory(inventoryId) })
  const [scope, setScope] = useState<'1' | '2' | '3'>('3')
  const [edit, setEdit] = useState<LineView | 'new' | null>(null)
  const [review, setReview] = useState<LineView | null>(null)
  const [totals, setTotals] = useState(false)
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
  // Verifier roles and the manager (PRD FR-77) review lines and enter verified totals before issuance; the platform administrator never does.
  const canVerify = !isClient && !me.isAdmin && ['submitted', 'under_verification'].includes(inv.status)
  const lines = inv.lines.filter((l) => String(l.scope) === scope)
  const scopeTotal = (s: string) => inv.totals.by_scope[s] ?? 0
  const verifiedScope = (s: string) => inv.verifiedTotals?.by_scope[s] ?? null
  const completeness = inv.completeness.total ? Math.round((inv.completeness.withEvidence / inv.completeness.total) * 100) : 0
  const reviewPct = inv.review.total ? Math.round((inv.review.reviewed / inv.review.total) * 100) : 0
  return (
    <>
      <PageHeader
        crumbs={[{ label: 'GHG inventories', to: '/records/inventories' }, { label: String(inv.year) }]}
        title={`GHG inventory ${inv.year}`}
        description={`${inv.boundary_name} · ${inv.consolidation.replace('_', ' ')} · GWP ${inv.gwp_set} (100-year) · revision ${inv.revision}`}
        meta={
          <>
            <StatusChip status={inv.status} />
            <AssuranceBadge level={inv.level_of_assurance} status={inv.assurance_status} />
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
            {canVerify ? (
              <Button variant="secondary" onClick={() => setTotals(true)}>
                <BadgeCheck /> Verified totals
              </Button>
            ) : null}
          </>
        }
      />
      {inv.status === 'verified' ? (
        <Alert tone="success" className="mb-5" title={`Verified · ${inv.level_of_assurance === 'limited' ? 'limited' : 'reasonable'} assurance`}>
          The opinion covers the inventory totals as a whole. Each line shows how it was reviewed (accepted, adjusted or not individually tested); no line is individually assured. Later edits create a new revision that supersedes this one once verified.
        </Alert>
      ) : null}
      {inv.status === 'withdrawn' ? (
        <Alert tone="danger" className="mb-5" title="Assurance withdrawn">
          The statement this inventory relied on was withdrawn. The figures below are declared only; the former verified figures remain in the assurance history.
        </Alert>
      ) : null}
      {inv.status === 'submitted' || inv.status === 'under_verification' ? <Alert tone="info" className="mb-5" title="Under verification">Declared values are frozen. VERIFASSUR reviews each line (accepted, adjusted or not individually tested) and enters the verified totals at assertion level; adjusted lines propose misstatements to the register.</Alert> : null}
      <div className="mb-5 grid gap-4 md:grid-cols-4">
        <KpiNumber value={inv.totals.gross_tco2e} unit="tCO2e" label="Gross total (declared)" hint={inv.verifiedTotals ? `Verified ${fmtNumber(inv.verifiedTotals.gross_tco2e)} tCO2e` : inv.review.adjusted ? `With adjustments ${fmtNumber(inv.adjustedTotals.gross_tco2e)} tCO2e` : undefined} />
        <KpiNumber value={inv.totals.biogenic_co2_t} unit="t" label="Biogenic CO2 (reported separately)" tone="fg" />
        <KpiNumber value={inv.totals.removals_tco2e} unit="tCO2e" label="Removals (reported separately)" tone="success" />
        <Card>
          <CardContent className="pt-4">
            <div className="text-fg text-sm font-semibold">Evidence completeness</div>
            <Progress value={completeness} tone={completeness === 100 ? 'success' : 'warning'} className="mt-2" label="Evidence completeness" />
            <div className="text-fg-subtle mt-1 text-xs">
              {inv.completeness.withEvidence} of {inv.completeness.total} lines evidenced
            </div>
            {inv.review.reviewed ? (
              <>
                <div className="text-fg mt-3 text-sm font-semibold">Line review</div>
                <Progress value={reviewPct} tone="info" className="mt-2" label="Lines reviewed" />
                <div className="text-fg-subtle mt-1 text-xs">
                  {inv.review.reviewed} of {inv.review.total} lines reviewed · {inv.review.adjusted} adjusted
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
      {inv.assurance.history.length ? <AssuranceHistory history={inv.assurance.history} className="mb-5" /> : null}
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
                      {l.review_status !== 'not_reviewed' || inv.status !== 'draft' ? <Badge tone={REVIEW_TONE[l.review_status]} data-review={l.review_status}>{REVIEW_STATUS_LABELS[l.review_status]}</Badge> : null}
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
                  <DeclaredVerifiedPair declared={l.declared_gross_tco2e} verified={l.review_status === 'adjusted' ? l.adjusted_gross_tco2e : null} unit="tCO2e" className="w-56 shrink-0" verifiedLabel="Adjusted" />
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
                      <Button size="sm" variant="outline" onClick={() => setReview(l)}>
                        Review line
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
      {review ? <ReviewLineDialog inv={inv} line={review} onClose={() => setReview(null)} /> : null}
      {totals ? <VerifiedTotalsDialog inv={inv} onClose={() => setTotals(false)} /> : null}
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

/** PRD v0.3 FR-82: review status per line; an adjusted value proposes a misstatement and places the editor in the involved set. */
function ReviewLineDialog({ inv, line, onClose }: { inv: InventoryView; line: LineView; onClose: () => void }) {
  const [status, setStatus] = useState<ReviewStatus>(line.review_status === 'not_reviewed' ? 'accepted' : line.review_status)
  const [gross, setGross] = useState(String(line.adjusted_gross_tco2e ?? line.declared_gross_tco2e))
  const [comment, setComment] = useState(line.verifier_comment ?? '')
  const m = useAppMutation(() => records.reviewLine(inv.id, line.id, { review_status: status, adjusted_gross_tco2e: status === 'adjusted' ? Number(gross) : null, comment: comment || null }), {
    successMessage: (r) => `Line reviewed: ${REVIEW_STATUS_LABELS[status].toLowerCase()}.${r.misstatementProposed ? ' A misstatement was proposed to the register.' : ''}${r.iterationReturnedToIr ? ' The open iteration went back to independent review.' : ''}${r.involvedSetJoined ? ' You are now in the involved set of this service.' : ''}`,
    onSuccess: onClose,
  })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Review line" description={`${line.activity} · declared ${fmtNumber(line.declared_gross_tco2e)} tCO2e. The opinion covers the totals; a line is never individually assured.`} size="sm">
        <Field label="Review status" required>
          <NativeSelect value={status} onChange={(e) => setStatus(e.target.value as ReviewStatus)}>
            {REVIEW_STATUSES.filter((s) => s !== 'not_reviewed').map((s) => (
              <option key={s} value={s}>
                {REVIEW_STATUS_LABELS[s]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        {status === 'adjusted' ? (
          <Field label="Adjusted gross tCO2e" required className="mt-3" hint="A difference from the declared value is proposed to the misstatement register for confirmation.">
            <Input type="number" step="any" value={gross} onChange={(e) => setGross(e.target.value)} />
          </Field>
        ) : null}
        <Field label="Comment (shown to the client)" className="mt-3">
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} />
        </Field>
        <Alert tone="info" className="mt-3">
          Entering or editing a verified value is verification work: you join the involved set and cannot take the final decision on this service (PRD FR-79).
        </Alert>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => m.mutate()} loading={m.isPending} disabled={status === 'adjusted' && gross === ''}>
            Record review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** PRD v0.3 FR-43, FR-82: assertion-level verified totals per scope. Proposed from the declared totals with line adjustments applied. */
function VerifiedTotalsDialog({ inv, onClose }: { inv: InventoryView; onClose: () => void }) {
  const base = inv.verifiedTotals ?? inv.adjustedTotals
  const [s1, setS1] = useState(String(base.by_scope['1'] ?? 0))
  const [s2, setS2] = useState(String(base.by_scope['2'] ?? 0))
  const [s3, setS3] = useState(String(base.by_scope['3'] ?? 0))
  const [comment, setComment] = useState('')
  const m = useAppMutation(() => records.setVerifiedTotals(inv.id, { byScope: { '1': Number(s1), '2': Number(s2), '3': Number(s3) }, biogenic: base.biogenic_co2_t, removals: base.removals_tco2e }, comment || undefined), { successMessage: 'Verified totals recorded; you are now in the involved set of this service.', onSuccess: onClose })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={`Verified totals — inventory ${inv.year}`} description="The figures the opinion will cover, at assertion level. Proposed from the declared totals with your line adjustments applied; a difference from the declared total proposes a misstatement." size="sm">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Scope 1 (tCO2e)">
            <Input type="number" step="any" value={s1} onChange={(e) => setS1(e.target.value)} />
          </Field>
          <Field label="Scope 2 (tCO2e)">
            <Input type="number" step="any" value={s2} onChange={(e) => setS2(e.target.value)} />
          </Field>
          <Field label="Scope 3 (tCO2e)">
            <Input type="number" step="any" value={s3} onChange={(e) => setS3(e.target.value)} />
          </Field>
        </div>
        <p className="text-fg-subtle mt-2 text-xs">
          Declared: {fmtNumber(inv.totals.by_scope['1'])} / {fmtNumber(inv.totals.by_scope['2'])} / {fmtNumber(inv.totals.by_scope['3'])} tCO2e · gross {fmtNumber(inv.totals.gross_tco2e)} tCO2e
        </p>
        <Field label="Comment" className="mt-3">
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} />
        </Field>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => m.mutate()} loading={m.isPending}>
            Record totals
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
