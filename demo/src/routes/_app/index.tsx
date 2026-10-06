/** Client home (PRD FR-54; plan_v1 ch. 1): progress, what needs you, waiting on VERIFASSUR, notifications, verified records. */
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { ArrowRight, BarChart3, Clock, FileSpreadsheet, Leaf, Plus, ShieldCheck } from 'lucide-react'
import { dashboard } from '@/api'
import { ActionPill } from '@/components/action-pill'
import { EmptyState } from '@/components/empty-state'
import { KpiBars, KpiNumber } from '@/components/kpi-tile'
import { PageHeader } from '@/components/page-header'
import { PhaseStepChip } from '@/components/service-table'
import { StatusChip } from '@/components/status-chip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/misc'
import { useMe } from '@/lib/auth'
import { fmtDate, fmtRelative } from '@/lib/format'

export const Route = createFileRoute('/_app/')({
  beforeLoad: ({ context }) => {
    if (context.me.org.type === 'verifier') throw redirect({ to: '/staff' })
  },
  component: ClientHome,
})

function ClientHome() {
  const me = useMe()
  const navigate = useNavigate()
  const q = useQuery({ queryKey: ['dashboard', 'client'], queryFn: dashboard.client })
  const d = q.data
  const firstName = me.user.name.split(' ')[0]
  return (
    <>
      <PageHeader
        title={`Good day, ${firstName}`}
        description={`${me.org.name} · what needs your attention and where each engagement stands.`}
        actions={
          <Button onClick={() => navigate({ to: '/engagements/new' })}>
            <Plus /> Request work
          </Button>
        }
      />
      {!d ? (
        <div className="grid gap-5 lg:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40 lg:col-span-2" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-5 lg:grid-cols-3">
            <KpiBars
              label={`${d.year} · My progress`}
              rows={[
                { label: 'Ongoing engagements', value: d.ongoing, tone: 'blocking' },
                { label: 'Completed this year', value: d.completedThisYear, tone: 'primary' },
              ]}
            />
            <Card className="lg:col-span-2">
              <CardHeader
                title="Latest notifications"
                description="Today"
                actions={
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/account">View all</Link>
                  </Button>
                }
              />
              <CardContent>
                {d.notifications.length === 0 ? (
                  <p className="text-fg-muted text-sm">Nothing new.</p>
                ) : (
                  <ul className="divide-border divide-y">
                    {d.notifications.slice(0, 4).map((n) => (
                      <li key={n.id} className="flex items-start gap-3 py-2">
                        <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read_at ? 'bg-border' : 'bg-blocking'}`} aria-hidden />
                        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => n.href && navigate({ to: n.href })}>
                          <span className="text-fg block truncate text-sm font-medium">
                            {n.serviceReference ? <span className="text-primary-strong mr-1 font-semibold">{n.serviceReference}</span> : null}
                            {n.title}
                          </span>
                          <span className="text-fg-muted line-clamp-1 block text-xs">{n.body}</span>
                        </button>
                        <span className="text-fg-subtle shrink-0 text-[11px]">{fmtRelative(n.created_at)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-fg text-base font-semibold">Needs your action</h2>
              <Badge tone={d.needsAction.length ? 'blocking' : 'neutral'}>{d.needsAction.length}</Badge>
            </div>
            {d.needsAction.length === 0 ? (
              <EmptyState icon={<ShieldCheck />} title="Nothing is waiting on you" description="VERIFASSUR is working on your engagements. You will be notified when something needs you." />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {d.needsAction.map((it) => (
                  <Card key={it.id} className="border-l-blocking border-l-4">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-fg-subtle text-[11px] font-medium">{it.reference}</div>
                          <Link to="/engagements/$serviceId" params={{ serviceId: it.id }} className="text-fg block truncate font-semibold hover:underline">
                            {it.name}
                          </Link>
                          <div className="mt-1.5">
                            <PhaseStepChip item={it} />
                          </div>
                        </div>
                        <StatusChip status={it.status} />
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <ActionPill action={it.nextAction} forMe onClick={() => navigate({ to: '/engagements/$serviceId', params: { serviceId: it.id } })} />
                        {it.nextAction?.due ? (
                          <span className="text-fg-muted inline-flex items-center gap-1 text-xs">
                            <Clock className="size-3" /> due {fmtDate(it.nextAction.due)}
                          </span>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {d.waitingOnVerifier.length ? (
            <section>
              <h2 className="text-fg mb-3 text-base font-semibold">Waiting on VERIFASSUR</h2>
              <Card>
                <ul className="divide-border divide-y">
                  {d.waitingOnVerifier.map((it) => (
                    <li key={it.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-fg-subtle text-[11px]">{it.reference}</div>
                        <Link to="/engagements/$serviceId" params={{ serviceId: it.id }} className="text-fg font-medium hover:underline">
                          {it.name}
                        </Link>
                      </div>
                      <PhaseStepChip item={it} />
                      <ActionPill action={it.nextAction} forMe={false} compact />
                      <StatusChip status={it.status} />
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          ) : null}

          <section>
            <h2 className="text-fg mb-3 text-base font-semibold">Verified records</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {d.latestVerified ? (
                <>
                  <KpiNumber value={d.latestVerified.scope1} unit="tCO2e" label={`Scope 1 · verified ${d.latestVerified.year}`} />
                  <KpiNumber value={d.latestVerified.scope2} unit="tCO2e" label={`Scope 2 · verified ${d.latestVerified.year}`} />
                  <KpiNumber value={d.latestVerified.scope3} unit="tCO2e" label={`Scope 3 · verified ${d.latestVerified.year}`} hint={d.latestVerified.statementCode ? <Link to="/verify/$code" params={{ code: d.latestVerified.statementCode }} className="text-primary hover:underline">Statement {d.latestVerified.statementCode}</Link> : null} />
                </>
              ) : (
                <EmptyState title="No verified inventory yet" className="md:col-span-3" />
              )}
              <KpiNumber value={d.records.verifiedUnits} unit="tCO2e" label="Verified decarb_units" tone="success" hint={`${d.records.decarbRecords} records`} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" asChild>
                <Link to="/records/inventories">
                  <BarChart3 /> GHG inventories ({d.records.inventories})
                </Link>
              </Button>
              <Button variant="secondary" size="sm" asChild>
                <Link to="/records/emission-factors">
                  <FileSpreadsheet /> Product emission factors ({d.records.emissionFactors})
                </Link>
              </Button>
              <Button variant="secondary" size="sm" asChild>
                <Link to="/records/decarb-units">
                  <Leaf /> decarb_units ({d.records.decarbRecords})
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/engagements">
                  All engagements <ArrowRight />
                </Link>
              </Button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
