/** decarb_units portfolio (PRD FR-53): records by year and good, declared vs verified units, assurance links. */
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { Leaf, Plus } from 'lucide-react'
import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { records } from '@/api'
import type { BaselineMethod, InterventionLayer } from '@/domain/enums'
import { INTERVENTION_LAYERS } from '@/domain/enums'
import { GOOD_UNIT_KEYS } from '@/domain/units'
import { AssuranceBadge } from '@/components/assurance-badge'
import { EmptyState } from '@/components/empty-state'
import { KpiNumber } from '@/components/kpi-tile'
import { PageHeader } from '@/components/page-header'
import { StatusChip } from '@/components/status-chip'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Field, Input, NativeSelect, Textarea } from '@/components/ui/input'
import { Alert, Skeleton } from '@/components/ui/misc'
import { TBody, TD, TH, THead, TR, Table } from '@/components/ui/table'
import { useMe } from '@/lib/auth'
import { fmtCompact, fmtNumber, titleCase } from '@/lib/format'
import { useAppMutation } from '@/lib/query'

export const Route = createFileRoute('/_app/records/decarb-units/')({
  component: Portfolio,
})

function Portfolio() {
  const me = useMe()
  const navigate = useNavigate()
  const q = useQuery({ queryKey: ['decarb', 'portfolio'], queryFn: records.portfolio })
  const [create, setCreate] = useState(false)
  const canEdit = me.org.type === 'client' && me.role !== 'client_viewer'
  const verifiedTotal = q.data?.rows.filter((r) => r.status === 'verified').reduce((a, r) => a + (r.verifiedReduction ?? 0) + (r.verifiedRemoval ?? 0), 0) ?? 0
  const declaredTotal = q.data?.rows.filter((r) => r.status !== 'verified' && r.status !== 'superseded').reduce((a, r) => a + (r.declaredReduction ?? 0) + (r.declaredRemoval ?? 0), 0) ?? 0
  const withdrawn = q.data?.rows.filter((r) => r.assuranceStatus === 'withdrawn').length ?? 0
  return (
    <>
      <PageHeader title="decarb_units" description="1 decarb_unit = 1 tCO2e of reduction or removal between a baseline and a project outcome in your value chain, computed on the volume attributed to you. VERIFASSUR verifies; it does not issue, transfer or claim." actions={canEdit ? <Button onClick={() => setCreate(true)}><Plus /> New record</Button> : null} />
      <Alert tone="info" className="mb-5" title="How a record works">
        Baseline and project emissions are entered per gas with biogenic CO2 and removals separate. Decarb factor = EF<sub>baseline</sub> − EF<sub>project</sub>; units = factor × attributed volume. Units are explicit and converted; a kg/t mismatch is an error, never a silent ×1000.
      </Alert>
      {!q.data ? (
        <Skeleton className="h-64" />
      ) : q.data.rows.length === 0 ? (
        <EmptyState icon={<Leaf />} title="No decarb_unit record yet" action={canEdit ? <Button onClick={() => setCreate(true)}>New record</Button> : null} />
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <KpiNumber value={verifiedTotal} unit="tCO2e" label="Verified decarb_units" tone="success" hint={withdrawn ? `${withdrawn} record${withdrawn === 1 ? '' : 's'} with assurance withdrawn excluded` : 'each record carries its level of assurance'} />
            <KpiNumber value={declaredTotal} unit="tCO2e" label="Declared, awaiting verification" tone="fg" />
            <Card>
              <CardHeader title="By year" />
              <CardContent>
                <div className="h-28">
                  <ResponsiveContainer>
                    <BarChart data={q.data.byYear} margin={{ left: 0, right: 0, top: 4 }}>
                      <CartesianGrid vertical={false} stroke="var(--vx-border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--vx-fg-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={(v) => fmtCompact(v)} tick={{ fill: 'var(--vx-fg-muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={44} />
                      <Tooltip formatter={(v) => fmtNumber(Number(v))} contentStyle={{ background: 'var(--vx-surface)', border: '1px solid var(--vx-border)', borderRadius: 8, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="declared" name="Declared" fill="var(--vx-chart-5)" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="verified" name="Verified" fill="var(--vx-chart-1)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <Table>
              <THead>
                <tr>
                  <TH>Good · supply shed</TH>
                  <TH>Year</TH>
                  <TH>Decarb factor</TH>
                  <TH>Attributed volume</TH>
                  <TH>Reduction units</TH>
                  <TH>Removal units</TH>
                  <TH>Status</TH>
                  <TH>Assurance</TH>
                </tr>
              </THead>
              <TBody>
                {q.data.rows.map((r) => (
                  <TR key={r.id} clickable onClick={() => navigate({ to: '/records/decarb-units/$recordId', params: { recordId: r.id } })}>
                    <TD>
                      <Link to="/records/decarb-units/$recordId" params={{ recordId: r.id }} className="text-primary-strong font-semibold hover:underline" onClick={(e) => e.stopPropagation()}>
                        {r.good}
                      </Link>
                      <div className="text-fg-subtle text-xs">{r.supplyShed}</div>
                    </TD>
                    <TD>{r.year}</TD>
                    <TD className="tabular-nums">
                      {r.factor != null ? fmtNumber(r.factor, 3) : '—'} <span className="text-fg-subtle text-xs">{r.factorUnit}</span>
                    </TD>
                    <TD className="tabular-nums">
                      {fmtNumber(r.attributedVolume)} <span className="text-fg-subtle text-xs">{r.volumeUnit}</span>
                    </TD>
                    <TD className="tabular-nums">
                      <span className={r.verifiedReduction != null ? 'text-success font-semibold' : ''}>{fmtNumber(r.verifiedReduction ?? r.declaredReduction)}</span>
                      {r.verifiedReduction == null ? <span className="text-fg-subtle text-xs"> declared</span> : null}
                    </TD>
                    <TD className="tabular-nums">{fmtNumber(r.verifiedRemoval ?? r.declaredRemoval)}</TD>
                    <TD>
                      <StatusChip status={r.status} />
                    </TD>
                    <TD className="text-xs">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <AssuranceBadge level={r.levelOfAssurance} status={r.assuranceStatus === 'withdrawn' ? 'withdrawn' : r.status === 'under_verification' && r.statementCode ? 'under_review' : r.assuranceStatus} />
                        {r.statementCode ? (
                          <Link to="/verify/$code" params={{ code: r.statementCode }} className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                            {r.statementCode}
                          </Link>
                        ) : r.serviceReference ? (
                          <span className="text-fg-muted">{r.serviceReference}</span>
                        ) : (
                          '—'
                        )}
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Card>
        </div>
      )}
      <NewRecordDialog open={create} onOpenChange={setCreate} />
    </>
  )
}

function NewRecordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const navigate = useNavigate()
  const y = new Date().getUTCFullYear() - 1
  const [form, setForm] = useState({ good: '', shedGood: '', variety: '', country: 'NL', region: '', supplier: '', type: '', activities: '', layer: '1a_raw_material_production' as InterventionLayer, start: `${y}-01-01`, baselineMethod: 'historical' as BaselineMethod, volume: '', unit: 't', periodStart: `${y}-01-01`, periodEnd: `${y}-12-31` })
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const m = useAppMutation(
    () =>
      records.upsertDecarbRecord({
        good: form.good,
        supply_shed_json: { good: form.shedGood || form.good, variety: form.variety || null, country: form.country.toUpperCase(), region: form.region || null },
        supplier_name: form.supplier || null,
        intervention_json: { type: form.type, activities: form.activities.split(',').map((x) => x.trim()).filter(Boolean), layer: form.layer, start_date: form.start },
        baseline_method: form.baselineMethod,
        attributed_volume: Number(form.volume),
        volume_unit: form.unit,
        period_start: form.periodStart,
        period_end: form.periodEnd,
        justification: null,
      }),
    { successMessage: 'Record created. Now enter the baseline and project profiles.', onSuccess: (r) => { onOpenChange(false); navigate({ to: '/records/decarb-units/$recordId', params: { recordId: r.id } }) } },
  )
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="New decarb_unit record" description="Describe the good, the supply shed and the intervention; the emission profiles come next." size="lg">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Good" required>
            <Input value={form.good} onChange={set('good')} placeholder="Raw milk" />
          </Field>
          <Field label="Supplier / cluster">
            <Input value={form.supplier} onChange={set('supplier')} />
          </Field>
          <Field label="Supply shed good">
            <Input value={form.shedGood} onChange={set('shedGood')} placeholder="Milk" />
          </Field>
          <Field label="Variety / system">
            <Input value={form.variety} onChange={set('variety')} placeholder="Holstein-Friesian" />
          </Field>
          <Field label="Country (ISO 2)" required>
            <Input value={form.country} onChange={set('country')} maxLength={2} />
          </Field>
          <Field label="Region">
            <Input value={form.region} onChange={set('region')} />
          </Field>
          <Field label="Intervention type" required>
            <Input value={form.type} onChange={set('type')} placeholder="Enteric methane and manure management" />
          </Field>
          <Field label="Activities" hint="Comma-separated">
            <Input value={form.activities} onChange={set('activities')} placeholder="3-NOP feed additive, covered slurry storage" />
          </Field>
          <Field label="Value-chain layer">
            <NativeSelect value={form.layer} onChange={set('layer')}>
              {INTERVENTION_LAYERS.map((l) => (
                <option key={l} value={l}>
                  {titleCase(l.replace(/^(\d[a-z]?)_/, '$1 '))}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Baseline method" hint="Declared by you; VERIFASSUR assesses it">
            <NativeSelect value={form.baselineMethod} onChange={set('baselineMethod')}>
              <option value="historical">Historical (what the supplier did before)</option>
              <option value="counterfactual">Counterfactual</option>
              <option value="other">Other</option>
            </NativeSelect>
          </Field>
          <Field label="Attributed volume (what you purchased)" required>
            <Input type="number" min={0} step="any" value={form.volume} onChange={set('volume')} />
          </Field>
          <Field label="Volume unit">
            <NativeSelect value={form.unit} onChange={set('unit')}>
              {GOOD_UNIT_KEYS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Period start" required>
            <Input type="date" value={form.periodStart} onChange={set('periodStart')} />
          </Field>
          <Field label="Period end" required>
            <Input type="date" value={form.periodEnd} onChange={set('periodEnd')} />
          </Field>
          <Field label="Intervention start" className="sm:col-span-2">
            <Input type="date" value={form.start} onChange={set('start')} />
          </Field>
        </div>
        <Textarea className="hidden" />
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => m.mutate()} loading={m.isPending} disabled={!form.good.trim() || !form.type.trim() || !(Number(form.volume) > 0) || form.country.length !== 2}>
            Create record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
