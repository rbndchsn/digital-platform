/** GHG inventories list with year-over-year verified totals (PRD FR-39, FR-44). */
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { BarChart3, Plus } from 'lucide-react'
import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { records } from '@/api'
import type { ConsolidationApproach, GwpSet } from '@/domain/enums'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { StatusChip } from '@/components/status-chip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Field, Input, NativeSelect } from '@/components/ui/input'
import { Progress, Skeleton } from '@/components/ui/misc'
import { TBody, TD, TH, THead, TR, Table } from '@/components/ui/table'
import { useMe } from '@/lib/auth'
import { fmtCompact, fmtNumber, fmtPct } from '@/lib/format'
import { useAppMutation } from '@/lib/query'

export const Route = createFileRoute('/_app/records/inventories/')({
  component: Inventories,
})

function Inventories() {
  const me = useMe()
  const navigate = useNavigate()
  const q = useQuery({ queryKey: ['inventories'], queryFn: records.listInventories })
  const cmp = useQuery({ queryKey: ['inventories', 'compare'], queryFn: records.compareInventories })
  const [create, setCreate] = useState(false)
  const canEdit = me.org.type === 'client' && me.role !== 'client_viewer'
  const chart = (cmp.data?.years ?? []).map((y) => ({ year: y.year, 'Scope 1': y.verified?.by_scope['1'] ?? y.declared?.by_scope['1'] ?? 0, 'Scope 2': y.verified?.by_scope['2'] ?? y.declared?.by_scope['2'] ?? 0, 'Scope 3': y.verified?.by_scope['3'] ?? y.declared?.by_scope['3'] ?? 0, verified: Boolean(y.verified) }))
  return (
    <>
      <PageHeader title="GHG inventories" description="One inventory per reporting year, entered per scope, category and gas with evidence on every figure. Verified values are written back when an opinion is issued." actions={canEdit ? <Button onClick={() => setCreate(true)}><Plus /> New inventory</Button> : null} />
      {!q.data ? (
        <Skeleton className="h-64" />
      ) : q.data.length === 0 ? (
        <EmptyState icon={<BarChart3 />} title="No inventory yet" description="Create the first reporting year and enter your lines." action={canEdit ? <Button onClick={() => setCreate(true)}>New inventory</Button> : null} />
      ) : (
        <div className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <Card>
              <CardHeader title="Verified totals by year" description="tCO2e by scope; the latest year may still be declared only." />
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer>
                    <BarChart data={chart} margin={{ left: 8, right: 8 }}>
                      <CartesianGrid vertical={false} stroke="var(--vx-border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--vx-fg-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={(v) => fmtCompact(v)} tick={{ fill: 'var(--vx-fg-muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={56} />
                      <Tooltip formatter={(v) => fmtNumber(Number(v))} contentStyle={{ background: 'var(--vx-surface)', border: '1px solid var(--vx-border)', borderRadius: 8, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="Scope 1" stackId="a" fill="var(--vx-chart-1)" />
                      <Bar dataKey="Scope 2" stackId="a" fill="var(--vx-chart-4)" />
                      <Bar dataKey="Scope 3" stackId="a" fill="var(--vx-chart-3)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader title="Change, latest verified year" description="Against the previous verified year" />
              <CardContent className="space-y-3">
                {cmp.data?.change.map((c) => (
                  <div key={c.scope} className="flex items-center justify-between text-sm">
                    <span className="text-fg-muted">Scope {c.scope}</span>
                    <span className="tabular-nums">
                      <span className="text-fg font-semibold">{fmtNumber(c.current)}</span> <span className="text-fg-subtle text-xs">tCO2e</span>
                      <Badge tone={c.pct == null ? 'outline' : c.pct <= 0 ? 'success' : 'danger'} className="ml-2">
                        {fmtPct(c.pct)}
                      </Badge>
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
          <Card>
            <Table>
              <THead>
                <tr>
                  <TH>Year</TH>
                  <TH>Boundary</TH>
                  <TH>Status</TH>
                  <TH>Scope 1</TH>
                  <TH>Scope 2</TH>
                  <TH>Scope 3</TH>
                  <TH>Evidence</TH>
                  <TH>Assurance</TH>
                </tr>
              </THead>
              <TBody>
                {q.data.map((inv) => {
                  const t = inv.verifiedTotals ?? inv.totals
                  return (
                    <TR key={inv.id} clickable onClick={() => navigate({ to: '/records/inventories/$inventoryId', params: { inventoryId: inv.id } })}>
                      <TD>
                        <Link to="/records/inventories/$inventoryId" params={{ inventoryId: inv.id }} className="text-primary-strong text-base font-semibold hover:underline" onClick={(e) => e.stopPropagation()}>
                          {inv.year}
                        </Link>
                        <div className="text-fg-subtle text-xs">
                          {inv.gwp_set} · rev {inv.revision}
                        </div>
                      </TD>
                      <TD className="text-fg-muted max-w-56 truncate text-xs">{inv.boundary_name}</TD>
                      <TD>
                        <StatusChip status={inv.status} />
                      </TD>
                      <TD className="tabular-nums">{fmtNumber(t.by_scope['1'])}</TD>
                      <TD className="tabular-nums">{fmtNumber(t.by_scope['2'])}</TD>
                      <TD className="tabular-nums">{fmtNumber(t.by_scope['3'])}</TD>
                      <TD>
                        <div className="w-28">
                          <Progress value={inv.completeness.total ? (inv.completeness.withEvidence / inv.completeness.total) * 100 : 0} tone={inv.completeness.withEvidence === inv.completeness.total ? 'success' : 'warning'} />
                          <div className="text-fg-subtle mt-0.5 text-[11px]">
                            {inv.completeness.withEvidence}/{inv.completeness.total} lines
                          </div>
                        </div>
                      </TD>
                      <TD className="text-xs">
                        {inv.statementCode ? (
                          <Link to="/verify/$code" params={{ code: inv.statementCode }} className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                            {inv.statementCode}
                          </Link>
                        ) : inv.serviceReference ? (
                          <span className="text-fg-muted">{inv.serviceReference}</span>
                        ) : (
                          '—'
                        )}
                      </TD>
                    </TR>
                  )
                })}
              </TBody>
            </Table>
          </Card>
        </div>
      )}
      <NewInventoryDialog open={create} onOpenChange={setCreate} existing={q.data ?? []} />
    </>
  )
}

function NewInventoryDialog({ open, onOpenChange, existing }: { open: boolean; onOpenChange: (o: boolean) => void; existing: { id: string; year: number }[] }) {
  const navigate = useNavigate()
  const latest = [...existing].sort((a, b) => b.year - a.year)[0]
  const [year, setYear] = useState(String((latest?.year ?? new Date().getUTCFullYear() - 1) + 1))
  const [boundary, setBoundary] = useState('Operational control — all sites')
  const [consolidation, setConsolidation] = useState<ConsolidationApproach>('operational_control')
  const [gwp, setGwp] = useState<GwpSet>('AR6')
  const [copyFrom, setCopyFrom] = useState(latest?.id ?? '')
  const m = useAppMutation(() => records.createInventory({ year: Number(year), boundaryName: boundary, consolidation, gwpSet: gwp, copyFromId: copyFrom || undefined }), { successMessage: 'Inventory created.', onSuccess: (inv) => { onOpenChange(false); navigate({ to: '/records/inventories/$inventoryId', params: { inventoryId: inv.id } }) } })
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="New GHG inventory" description="Copying last year's lines keeps the structure; figures and evidence are re-entered.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Reporting year" required>
            <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} />
          </Field>
          <Field label="GWP set">
            <NativeSelect value={gwp} onChange={(e) => setGwp(e.target.value as GwpSet)}>
              <option value="AR6">IPCC AR6 (100-year)</option>
              <option value="AR5">IPCC AR5 (100-year)</option>
            </NativeSelect>
          </Field>
          <Field label="Boundary name" required className="sm:col-span-2">
            <Input value={boundary} onChange={(e) => setBoundary(e.target.value)} />
          </Field>
          <Field label="Consolidation approach">
            <NativeSelect value={consolidation} onChange={(e) => setConsolidation(e.target.value as ConsolidationApproach)}>
              <option value="operational_control">Operational control</option>
              <option value="financial_control">Financial control</option>
              <option value="equity_share">Equity share</option>
            </NativeSelect>
          </Field>
          <Field label="Copy lines from">
            <NativeSelect value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)}>
              <option value="">Start empty</option>
              {existing.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.year}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => m.mutate()} loading={m.isPending} disabled={!year || !boundary.trim()}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
