/** Staff "My Work" (PRD FR-54): progress, COI to declare, triage count, work queue by service role, clients. */
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowRight, Inbox, ShieldAlert } from 'lucide-react'
import { dashboard } from '@/api'
import { ActionPill } from '@/components/action-pill'
import { EmptyState } from '@/components/empty-state'
import { KpiBars } from '@/components/kpi-tile'
import { PageHeader } from '@/components/page-header'
import { PhaseStepChip } from '@/components/service-table'
import { StatusChip } from '@/components/status-chip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Alert, Skeleton } from '@/components/ui/misc'
import { TBody, TD, TH, THead, TR, Table } from '@/components/ui/table'
import { useMe } from '@/lib/auth'
import { fmtRelative, roleLabel } from '@/lib/format'

export const Route = createFileRoute('/_app/staff/')({
  component: MyWork,
})

function MyWork() {
  const me = useMe()
  const navigate = useNavigate()
  const q = useQuery({ queryKey: ['dashboard', 'staff'], queryFn: dashboard.staff })
  const d = q.data
  return (
    <>
      <PageHeader title="My work" description={`${me.user.name} · ${me.role ? roleLabel(me.role) : ''} · the services you are on and what blocks you.`} actions={d?.triage.length ? <Button onClick={() => navigate({ to: '/staff/triage' })}><Inbox /> Triage queue <Badge tone="blocking" className="ml-1">{d.triage.length}</Badge></Button> : null} />
      {!d ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="space-y-6">
          {d.coiPending.length ? (
            <Alert tone="blocking" icon={<ShieldAlert />} title="Conflict-of-interest declarations outstanding">
              <ul className="mt-1 space-y-0.5">
                {d.coiPending.map((c) => (
                  <li key={c.coiId}>
                    <Link to="/engagements/$serviceId" params={{ serviceId: c.serviceId }} className="underline">
                      {c.serviceReference}
                    </Link>{' '}
                    — nominated as {roleLabel(c.role)}. Declare before the service opens for you.
                  </li>
                ))}
              </ul>
            </Alert>
          ) : null}
          <div className="grid gap-5 lg:grid-cols-3">
            <KpiBars
              label={`${d.year} · VERIFASSUR progress`}
              rows={[
                { label: 'Ongoing services', value: d.ongoing, tone: 'blocking' },
                { label: 'Completed this year', value: d.completedThisYear, tone: 'primary' },
              ]}
            />
            <Card className="lg:col-span-2">
              <CardHeader title="Latest notifications" description="Today" />
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

          <Card>
            <CardHeader title="My work" description="One row per service; the pill tells you whether the next action is yours." actions={<Button variant="ghost" size="sm" asChild><Link to="/staff/services">All services <ArrowRight /></Link></Button>} />
            {d.myWork.length === 0 ? (
              <EmptyState title="No services assigned" description="You will see services here once you are nominated on a team." />
            ) : (
              <Table>
                <THead>
                  <tr>
                    <TH>Project</TH>
                    <TH>Service</TH>
                    <TH>Team role</TH>
                    <TH>Next action</TH>
                    <TH>Phase | Step</TH>
                    <TH>Status</TH>
                  </tr>
                </THead>
                <TBody>
                  {d.myWork.map((it) => (
                    <TR key={it.id} clickable onClick={() => navigate({ to: '/engagements/$serviceId', params: { serviceId: it.id } })}>
                      <TD>
                        <div className="text-fg-subtle text-[11px]">{it.reference}</div>
                        <div className="text-fg-muted max-w-48 truncate text-xs">{it.orgName}</div>
                      </TD>
                      <TD>
                        <div className="text-primary-strong max-w-72 truncate font-semibold">{it.name}</div>
                        <div className="text-fg-subtle truncate text-xs">{it.serviceTypeLabel}</div>
                      </TD>
                      <TD className="text-sm">{it.myRoles.length ? it.myRoles.map(roleLabel).join(', ') : me.role ? roleLabel(me.role) : '—'}</TD>
                      <TD>
                        <ActionPill action={it.nextAction} forMe={it.actionForMe} compact />
                      </TD>
                      <TD>
                        <PhaseStepChip item={it} />
                      </TD>
                      <TD>
                        <StatusChip status={it.status} />
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>

          <div className="grid gap-5 md:grid-cols-2">
            <Card>
              <CardHeader title="Ongoing by client" />
              <CardContent>
                <ul className="divide-border divide-y">
                  {d.byClient.map((c) => (
                    <li key={c.orgId} className="flex items-center justify-between py-2 text-sm">
                      <span>{c.orgName}</span>
                      <Badge tone="primary">{c.ongoing}</Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader title="Triage queue" description="New requests waiting for a scope and impartiality decision." />
              <CardContent>
                {d.triage.length === 0 ? (
                  <p className="text-fg-muted text-sm">Nothing to triage.</p>
                ) : (
                  <ul className="divide-border divide-y">
                    {d.triage.map((t) => (
                      <li key={t.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                        <div className="min-w-0">
                          <div className="text-fg truncate font-medium">{t.name}</div>
                          <div className="text-fg-subtle text-xs">
                            {t.orgName} · requested {fmtRelative(t.requestedAt)}
                          </div>
                        </div>
                        <Button size="sm" variant="secondary" onClick={() => navigate({ to: '/staff/triage' })}>
                          Triage
                        </Button>
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
