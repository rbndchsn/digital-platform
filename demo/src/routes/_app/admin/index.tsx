/** Administration dashboard (PRD FR-71): engagement, money, cycle-time, overdue, findings, COI, workload and concentration rollups. */
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { AlertTriangle, Gauge } from 'lucide-react'
import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { admin } from '@/api'
import type { StatsFilter } from '@/api/admin'
import type { ServiceType } from '@/domain/enums'
import { SERVICE_TYPE_LABELS } from '@/domain/enums'
import { EmptyState } from '@/components/empty-state'
import { KpiNumber } from '@/components/kpi-tile'
import { PageHeader } from '@/components/page-header'
import { StatusChip } from '@/components/status-chip'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { NativeSelect } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/misc'
import { TBody, TD, TH, THead, TR, Table } from '@/components/ui/table'
import { useMe } from '@/lib/auth'
import { fmtCompact, fmtDate, fmtMoney, fmtNumber, roleLabel } from '@/lib/format'

export const Route = createFileRoute('/_app/admin/')({
  component: AdminDashboard,
})

function AdminDashboard() {
  const me = useMe()
  const [filter, setFilter] = useState<StatsFilter>({})
  const q = useQuery({ queryKey: ['admin', 'stats', filter], queryFn: () => admin.stats(filter) })
  const d = q.data
  const eur = d?.money?.find((m) => m.currency === 'EUR')
  const others = d?.money?.filter((m) => m.currency !== 'EUR') ?? []
  const chartStyle = { background: 'var(--vx-surface)', border: '1px solid var(--vx-border)', borderRadius: 8, fontSize: 12 }
  return (
    <>
      <PageHeader
        title="Administration dashboard"
        description={`${me.user.name} · the whole platform at a glance. Engagements, cycle times and workload are visible to managers too; money rollups are visible only here.`}
        actions={
          d ? (
            <div className="flex flex-wrap gap-2">
              <NativeSelect value={filter.year ?? ''} onChange={(e) => setFilter((f) => ({ ...f, year: e.target.value ? Number(e.target.value) : undefined }))} className="w-32" aria-label="Filter by year">
                <option value="">All years</option>
                {d.filters.years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </NativeSelect>
              <NativeSelect value={filter.orgId ?? ''} onChange={(e) => setFilter((f) => ({ ...f, orgId: e.target.value || undefined }))} className="w-56" aria-label="Filter by client">
                <option value="">All clients</option>
                {d.filters.clients.map((c) => (
                  <option key={c.orgId} value={c.orgId}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
              <NativeSelect value={filter.serviceType ?? ''} onChange={(e) => setFilter((f) => ({ ...f, serviceType: (e.target.value || undefined) as ServiceType | undefined }))} className="w-64" aria-label="Filter by service type">
                <option value="">All service types</option>
                {d.filters.serviceTypes.map((t) => (
                  <option key={t} value={t}>
                    {SERVICE_TYPE_LABELS[t]}
                  </option>
                ))}
              </NativeSelect>
            </div>
          ) : null
        }
      />
      {!d ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : (
        <div className="space-y-6">
          <section aria-label="Engagements">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiNumber value={d.totals.started} label="Engagements started" hint={filter.year ? `requested in ${filter.year}` : 'requested, all years'} />
              <KpiNumber value={d.totals.issued} label="Opinions issued" tone="success" />
              <KpiNumber value={d.totals.closed} label="Engagements closed" tone="fg" />
              <KpiNumber value={d.totals.ongoing} label="Ongoing now" hint={`${d.totals.awaitingTriage} awaiting triage · ${d.totals.onHold} on hold`} tone="fg" />
            </div>
          </section>

          <section aria-label="Attention">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiNumber value={d.overdueSteps.length} label="Overdue steps" tone={d.overdueSteps.length ? 'blocking' : 'fg'} hint="planned end before today on active services" />
              <KpiNumber value={d.openBlockingFindings.length} label="Open blocking findings" tone={d.openBlockingFindings.length ? 'blocking' : 'fg'} hint="CARs that block an opinion" />
              <KpiNumber value={d.coiPending.length} label="COI declarations pending" tone={d.coiPending.length ? 'blocking' : 'fg'} hint="required or awaiting approval" />
              <KpiNumber value={d.totals.overrideCount} label="Manager overrides" tone="fg" hint="each with a reason in the audit log" />
            </div>
          </section>

          {d.money ? (
            <section aria-label="Money">
              <div className="mb-2 flex items-center gap-2">
                <h2 className="text-fg text-base font-semibold">Revenue</h2>
                <Badge tone="warning">Platform administrator only</Badge>
                <span className="text-fg-muted text-xs">Quotes and invoices stay with Finance per engagement; this is the only cross-engagement view.</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MoneyTile label="Quoted" minor={eur?.quotedMinor ?? 0} others={others.map((o) => [o.currency, o.quotedMinor] as const)} />
                <MoneyTile label="Invoiced" minor={eur?.invoicedMinor ?? 0} others={others.map((o) => [o.currency, o.invoicedMinor] as const)} />
                <MoneyTile label="Paid" minor={eur?.paidMinor ?? 0} others={others.map((o) => [o.currency, o.paidMinor] as const)} tone="success" />
                <MoneyTile label="Outstanding" minor={eur?.outstandingMinor ?? 0} others={others.map((o) => [o.currency, o.outstandingMinor] as const)} tone={eur?.outstandingMinor ? 'blocking' : 'fg'} />
              </div>
            </section>
          ) : null}

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader title="Engagements per year" description="Started (requested), opinions issued and closed." />
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer>
                    <BarChart data={d.byYear} margin={{ left: 0, right: 8 }}>
                      <CartesianGrid vertical={false} stroke="var(--vx-border)" />
                      <XAxis dataKey="year" tick={{ fill: 'var(--vx-fg-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fill: 'var(--vx-fg-muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                      <Tooltip contentStyle={chartStyle} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="started" name="Started" fill="var(--vx-chart-4)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="issued" name="Issued" fill="var(--vx-chart-1)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="closed" name="Closed" fill="var(--vx-chart-3)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader title={d.money ? 'Invoiced and paid per client (EUR)' : 'Engagements per client'} description={d.money ? 'Client concentration: the largest client’s share is shown below.' : 'Started and ongoing engagements per client.'} />
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer>
                    <BarChart data={d.byClient.map((c) => ({ name: c.orgName.split(' ')[0], invoiced: c.invoicedMinor / 100, paid: c.paidMinor / 100, started: c.started, ongoing: c.ongoing }))} margin={{ left: 0, right: 8 }}>
                      <CartesianGrid vertical={false} stroke="var(--vx-border)" />
                      <XAxis dataKey="name" tick={{ fill: 'var(--vx-fg-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={(v) => fmtCompact(Number(v))} tick={{ fill: 'var(--vx-fg-muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
                      <Tooltip contentStyle={chartStyle} formatter={(v) => fmtNumber(Number(v))} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      {d.money ? (
                        <>
                          <Bar dataKey="invoiced" name="Invoiced" fill="var(--vx-chart-3)" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="paid" name="Paid" fill="var(--vx-chart-1)" radius={[4, 4, 0, 0]} />
                        </>
                      ) : (
                        <>
                          <Bar dataKey="started" name="Started" fill="var(--vx-chart-4)" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="ongoing" name="Ongoing" fill="var(--vx-chart-1)" radius={[4, 4, 0, 0]} />
                        </>
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-fg-muted mt-2 text-xs">
                  Largest client: <span className="text-fg font-medium">{d.concentration.topClientName ?? '—'}</span> · {d.concentration.topClientShareEngagementsPct} % of engagements{d.money ? ` · ${d.concentration.topClientShareRevenuePct} % of invoiced revenue` : ''} · {d.concentration.clientsWithOngoing} clients with ongoing work
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <Card>
              <CardHeader title="Cycle times" description="Median days, computed from the engagement dates." />
              <CardContent className="space-y-3">
                <Cycle label="Request → contract" days={d.cycleTimes.requestToContractMedianDays} />
                <Cycle label="Contract → opinion issued" days={d.cycleTimes.contractToIssueMedianDays} />
                <Cycle label="Request → opinion issued" days={d.cycleTimes.requestToIssueMedianDays} />
                <p className="text-fg-subtle text-xs">{d.cycleTimes.samples} issued engagement{d.cycleTimes.samples === 1 ? '' : 's'} in the sample.</p>
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader title="By service type and standard" />
              <Table label="Engagements by service type">
                <THead>
                  <tr>
                    <TH>Service type</TH>
                    <TH>Standard</TH>
                    <TH className="text-right">Started</TH>
                    <TH className="text-right">Issued</TH>
                    <TH className="text-right">Closed</TH>
                    <TH className="text-right">Req → contract</TH>
                    <TH className="text-right">Contract → issue</TH>
                    {d.money ? <TH className="text-right">Invoiced</TH> : null}
                  </tr>
                </THead>
                <TBody>
                  {d.byType.map((t) => (
                    <TR key={t.serviceType}>
                      <TD className="max-w-72 truncate text-sm font-medium">{t.label}</TD>
                      <TD className="text-fg-muted text-xs">{t.standard}</TD>
                      <TD className="text-right tabular-nums">{t.started}</TD>
                      <TD className="text-right tabular-nums">{t.issued}</TD>
                      <TD className="text-right tabular-nums">{t.closed}</TD>
                      <TD className="text-right tabular-nums">{t.medianRequestToContractDays ?? '—'}{t.medianRequestToContractDays != null ? ' d' : ''}</TD>
                      <TD className="text-right tabular-nums">{t.medianContractToIssueDays ?? '—'}{t.medianContractToIssueDays != null ? ' d' : ''}</TD>
                      {d.money ? <TD className="text-right tabular-nums">{fmtMoney(t.invoicedMinor, 'EUR')}</TD> : null}
                    </TR>
                  ))}
                </TBody>
              </Table>
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader title="Workload per staff member" description="Active team roles on active services; the manager rebalances from the team panel." />
              <Table label="Workload per staff member">
                <THead>
                  <tr>
                    <TH>Person</TH>
                    <TH>Org role</TH>
                    <TH className="text-right">Active roles</TH>
                    <TH>By service role</TH>
                    <TH className="text-right">Issued as TL</TH>
                    <TH className="text-right">COI pending</TH>
                  </tr>
                </THead>
                <TBody>
                  {d.byStaff.map((p) => (
                    <TR key={p.userId}>
                      <TD className="text-sm font-medium">{p.name}</TD>
                      <TD className="text-fg-muted text-xs">{roleLabel(p.orgRole)}</TD>
                      <TD className="text-right tabular-nums">{p.activeAssignments}</TD>
                      <TD className="text-fg-muted text-xs">{Object.entries(p.byRole).map(([r, n]) => `${roleLabel(r)} ${n}`).join(' · ') || '—'}</TD>
                      <TD className="text-right tabular-nums">{p.issuedAsTeamLeader}</TD>
                      <TD className="text-right tabular-nums">{p.coiPending ? <Badge tone="blocking">{p.coiPending}</Badge> : 0}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </Card>
            <Card>
              <CardHeader title="Per client" description="Engagements and, for the administrator, EUR invoiced, paid and outstanding." />
              <Table label="Per client">
                <THead>
                  <tr>
                    <TH>Client</TH>
                    <TH className="text-right">Started</TH>
                    <TH className="text-right">Issued</TH>
                    <TH className="text-right">Ongoing</TH>
                    {d.money ? (
                      <>
                        <TH className="text-right">Invoiced</TH>
                        <TH className="text-right">Outstanding</TH>
                        <TH className="text-right">Share</TH>
                      </>
                    ) : null}
                  </tr>
                </THead>
                <TBody>
                  {d.byClient.map((c) => (
                    <TR key={c.orgId}>
                      <TD className="text-sm font-medium">{c.orgName}</TD>
                      <TD className="text-right tabular-nums">{c.started}</TD>
                      <TD className="text-right tabular-nums">{c.issued}</TD>
                      <TD className="text-right tabular-nums">{c.ongoing}</TD>
                      {d.money ? (
                        <>
                          <TD className="text-right tabular-nums">{fmtMoney(c.invoicedMinor, 'EUR')}</TD>
                          <TD className="text-right tabular-nums">{c.outstandingMinor ? <span className="text-blocking font-medium">{fmtMoney(c.outstandingMinor, 'EUR')}</span> : fmtMoney(0, 'EUR')}</TD>
                          <TD className="text-right tabular-nums">{c.shareRevenuePct} %</TD>
                        </>
                      ) : null}
                    </TR>
                  ))}
                </TBody>
              </Table>
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <Card>
              <CardHeader title={<span className="inline-flex items-center gap-2"><AlertTriangle className="size-4" /> Overdue steps</span>} />
              <CardContent>
                {d.overdueSteps.length === 0 ? (
                  <EmptyState icon={<Gauge />} title="Nothing overdue" />
                ) : (
                  <ul className="divide-border divide-y">
                    {d.overdueSteps.slice(0, 8).map((o) => (
                      <li key={`${o.serviceId}-${o.stepName}`} className="py-2 text-sm">
                        <Link to="/engagements/$serviceId/phases" params={{ serviceId: o.serviceId }} className="text-primary-strong font-semibold hover:underline">
                          {o.serviceReference}
                        </Link>{' '}
                        <span className="text-fg">{o.stepName}</span>
                        <div className="text-fg-subtle text-xs">
                          {o.clientName} · {roleLabel(o.ownerRole)} · planned {fmtDate(o.plannedEnd)} · <span className="text-blocking font-medium">{o.daysOverdue} d late</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader title="Open blocking findings" />
              <CardContent>
                {d.openBlockingFindings.length === 0 ? (
                  <EmptyState title="No blocking finding open" />
                ) : (
                  <ul className="divide-border divide-y">
                    {d.openBlockingFindings.map((f) => (
                      <li key={f.id} className="py-2 text-sm">
                        <Link to="/engagements/$serviceId/findings/$findingId" params={{ serviceId: f.serviceId, findingId: f.id }} className="text-primary-strong font-semibold hover:underline">
                          {f.serviceReference} · {f.type} #{f.number}
                        </Link>
                        <div className="text-fg truncate">{f.title}</div>
                        <div className="text-fg-subtle text-xs">
                          {f.clientName} · {f.assignedName ?? 'unassigned'} · due {fmtDate(f.dueAt)} <StatusChip status={f.status} size="xs" />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader title="COI declarations pending" />
              <CardContent>
                {d.coiPending.length === 0 ? (
                  <EmptyState title="Every declaration is approved" />
                ) : (
                  <ul className="divide-border divide-y">
                    {d.coiPending.map((c) => (
                      <li key={c.coiId} className="flex items-center justify-between gap-2 py-2 text-sm">
                        <div className="min-w-0">
                          <div className="text-fg truncate font-medium">{c.userName}</div>
                          <div className="text-fg-subtle text-xs">
                            {c.serviceReference} · {roleLabel(c.role)}
                          </div>
                        </div>
                        <StatusChip status={c.status} size="xs" />
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  )
}

function MoneyTile({ label, minor, others, tone = 'primary' }: { label: string; minor: number; others: readonly (readonly [string, number])[]; tone?: 'primary' | 'fg' | 'success' | 'blocking' }) {
  const color = { primary: 'text-primary', fg: 'text-fg', success: 'text-success', blocking: 'text-blocking' }[tone]
  const extra = others.filter(([, v]) => v > 0)
  return (
    <div className="bg-surface border-border rounded-card border px-5 py-4 shadow-card">
      <div className={`text-3xl font-semibold tracking-tight tabular-nums ${color}`}>{fmtMoney(minor, 'EUR')}</div>
      <div className="text-fg-muted mt-1 text-sm">{label}</div>
      {extra.length ? <div className="text-fg-subtle mt-1 text-xs">{extra.map(([c, v]) => `+ ${fmtMoney(v, c)}`).join(' · ')}</div> : null}
    </div>
  )
}

function Cycle({ label, days }: { label: string; days: number | null }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-fg-muted text-sm">{label}</span>
      <span className="text-fg text-lg font-semibold tabular-nums">{days == null ? '—' : `${days} d`}</span>
    </div>
  )
}
