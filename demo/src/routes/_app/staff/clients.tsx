/** Staff Clients: per-client stats, feature flag states per client, and interest signals (PRD FR-59). */
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Sparkles } from 'lucide-react'
import { features, staff } from '@/api'
import type { FlagState } from '@/domain/enums'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { ComingBadge } from '@/components/preview-overlay'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { NativeSelect } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/misc'
import { TBody, TD, TH, THead, TR, Table } from '@/components/ui/table'
import { useMe } from '@/lib/auth'
import { fmtNumber, fmtRelative } from '@/lib/format'
import { useAppMutation } from '@/lib/query'

export const Route = createFileRoute('/_app/staff/clients')({
  component: Clients,
})

function Clients() {
  const me = useMe()
  const q = useQuery({ queryKey: ['staff', 'clients'], queryFn: staff.clients })
  const interest = useQuery({ queryKey: ['staff', 'interest'], queryFn: features.staffInterest })
  const setFlag = useAppMutation(({ orgId, key, state }: { orgId: string; key: string; state: FlagState | null }) => features.setOverride(orgId, key, state), { successMessage: 'Feature state updated for the client.' })
  // Managers and the platform administrator (PRD FR-67) set per-client feature states.
  const canFlag = me.role === 'verifier_manager' || me.isAdmin
  return (
    <>
      <PageHeader title="Clients" description="Every client organisation, what is running for them, and which future capabilities each one can see or use. Interest signals come from the “I'm interested” buttons on preview features." />
      {!q.data ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="space-y-6">
          <Card>
            <Table>
              <THead>
                <tr>
                  <TH>Client</TH>
                  <TH>Users</TH>
                  <TH>Ongoing</TH>
                  <TH>Closed</TH>
                  <TH>Verified inventories</TH>
                  <TH>Verified decarb_units</TH>
                  <TH>Previews on</TH>
                  <TH>
                    <span className="inline-flex items-center gap-1">
                      Portfolio manager <ComingBadge flagKey="portfolios" />
                    </span>
                  </TH>
                </tr>
              </THead>
              <TBody>
                {q.data.map((c) => (
                  <TR key={c.orgId}>
                    <TD>
                      <div className="font-semibold">{c.name}</div>
                      <div className="text-fg-subtle text-xs">
                        {c.legalName} · {c.country}
                      </div>
                    </TD>
                    <TD>{c.users}</TD>
                    <TD>
                      <Badge tone={c.ongoing ? 'primary' : 'neutral'}>{c.ongoing}</Badge>
                    </TD>
                    <TD>{c.closed}</TD>
                    <TD>{c.verifiedInventories}</TD>
                    <TD className="tabular-nums">{fmtNumber(c.verifiedUnits)} tCO2e</TD>
                    <TD className="text-fg-muted text-xs">
                      {c.flags.filter((f) => f.state === 'enabled').length} enabled · {c.flags.filter((f) => f.state === 'preview').length} preview
                    </TD>
                    <TD className="text-fg-muted text-sm" title="Release 2: a senior manager owns a handful of clients; read-only until then.">
                      {c.portfolioManagerName ?? '—'}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Card>

          <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
            <Card>
              <CardHeader title="Feature states per client" description={canFlag ? 'Hidden, preview (visible but inactive) or enabled. Changes apply immediately to that client.' : 'Only managers change feature states.'} />
              <CardContent>
                <Table>
                  <THead>
                    <tr>
                      <TH>Feature</TH>
                      {q.data.map((c) => (
                        <TH key={c.orgId}>{c.name.split(' ')[0]}</TH>
                      ))}
                    </tr>
                  </THead>
                  <TBody>
                    {q.data[0]?.flags.map((f) => (
                      <TR key={f.key}>
                        <TD>
                          <div className="text-sm font-medium">{f.title}</div>
                          <div className="text-fg-subtle text-[11px]">{f.horizon}</div>
                        </TD>
                        {q.data!.map((c) => {
                          const cf = c.flags.find((x) => x.key === f.key)!
                          return (
                            <TD key={c.orgId}>
                              {canFlag ? (
                                <NativeSelect value={cf.state} onChange={(e) => setFlag.mutate({ orgId: c.orgId, key: f.key, state: e.target.value as FlagState })} className="h-8 w-28 text-xs" aria-label={`${f.title} for ${c.name}`}>
                                  <option value="hidden">Hidden</option>
                                  <option value="preview">Preview</option>
                                  <option value="enabled">Enabled</option>
                                </NativeSelect>
                              ) : (
                                <Badge tone={cf.state === 'enabled' ? 'success' : cf.state === 'preview' ? 'primary' : 'neutral'}>{cf.state}</Badge>
                              )}
                              {cf.interestCount ? <div className="text-primary mt-0.5 text-[11px]">{cf.interestCount} interested</div> : null}
                            </TD>
                          )
                        })}
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader title={<span className="inline-flex items-center gap-2"><Sparkles className="size-4" /> Interest signals</span>} description="Demand captured on preview features, newest first." />
              <CardContent>
                {!interest.data?.length ? (
                  <EmptyState title="No interest yet" description="Signals appear when a client clicks “I'm interested”." />
                ) : (
                  <ul className="divide-border divide-y">
                    {interest.data.map((i) => (
                      <li key={i.id} className="py-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-fg text-sm font-medium">{i.flagTitle}</span>
                          <span className="text-fg-subtle text-[11px]">{fmtRelative(i.createdAt)}</span>
                        </div>
                        <div className="text-fg-muted text-xs">
                          {i.userName} · {i.orgName}
                        </div>
                        {i.note ? <div className="text-fg mt-1 text-xs italic">“{i.note}”</div> : null}
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
