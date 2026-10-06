/** Global audit log and authentication events (PRD FR-68) with filters and CSV export. */
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Download, Search } from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'
import { admin } from '@/api'
import { EmptyState } from '@/components/empty-state'
import { NavTabs } from '@/components/nav-tabs'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input, NativeSelect } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/misc'
import { TBody, TD, TH, THead, TR, Table } from '@/components/ui/table'
import { fmtDateTime } from '@/lib/format'

const VIEWS = ['all', 'auth'] as const

export const Route = createFileRoute('/_app/admin/audit')({
  validateSearch: z.object({ view: z.enum(VIEWS).optional(), type: z.string().optional() }),
  component: AuditLog,
})

const OVERRIDE_TYPES = new Set(['step.overridden', 'service.overridden', 'team.reassigned'])

function AuditLog() {
  const navigate = useNavigate()
  const { view = 'all', type: initialType } = Route.useSearch()
  const [orgId, setOrgId] = useState('')
  const [type, setType] = useState(initialType ?? '')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [search, setSearch] = useState('')
  const orgs = useQuery({ queryKey: ['admin', 'orgs'], queryFn: admin.listOrgs })
  const types = useQuery({ queryKey: ['admin', 'audit', 'types'], queryFn: admin.auditEventTypes })
  // "Overrides" spans three event types, so it is filtered client-side below rather than as a prefix.
  const q = useQuery({ queryKey: ['admin', 'audit', view, orgId, type, from, to, search], queryFn: () => admin.auditLog({ authOnly: view === 'auth', orgId: orgId || undefined, type: type && type !== 'override' ? type : undefined, from: from || undefined, to: to || undefined, search: search || undefined, limit: 500 }) })
  function exportCsv() {
    const csv = admin.auditCsv(q.data ?? [])
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `verifassurx-audit-${view}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <>
      <PageHeader title="Audit log" description="Every event on the platform, across organisations, newest first. Append-only; times in UTC. Overrides and administration actions carry the reason that was typed." actions={<Button variant="secondary" onClick={exportCsv} disabled={!q.data?.length}><Download /> Export CSV</Button>} />
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <NavTabs value={view} onChange={(v) => navigate({ to: '/admin/audit', search: { view: v, type: type || undefined } })} items={[{ value: 'all', label: 'All events' }, { value: 'auth', label: 'Authentication events' }]} label="Audit views" />
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="text-fg-subtle pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search summary or reason" aria-label="Search the audit log" className="w-56 pl-8" />
          </div>
          <NativeSelect value={orgId} onChange={(e) => setOrgId(e.target.value)} className="w-48" aria-label="Filter by organisation">
            <option value="">All organisations</option>
            {orgs.data?.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect value={type} onChange={(e) => setType(e.target.value)} className="w-40" aria-label="Filter by event type">
            <option value="">All types</option>
            <option value="override">Overrides</option>
            {types.data?.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </NativeSelect>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" className="w-40" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" className="w-40" />
        </div>
      </div>
      <Card>
        {!q.data ? (
          <div className="p-5">
            <Skeleton className="h-48" />
          </div>
        ) : q.data.length === 0 ? (
          <EmptyState title="No events match" />
        ) : (
          <Table label="Audit events">
            <THead>
              <tr>
                <TH>When (UTC)</TH>
                <TH>Organisation</TH>
                <TH>Event</TH>
                <TH>Actor</TH>
                <TH>Summary</TH>
                <TH>Reason</TH>
              </tr>
            </THead>
            <TBody>
              {(type === 'override' ? q.data.filter((e) => OVERRIDE_TYPES.has(e.event_type)) : q.data).map((e) => {
                const override = OVERRIDE_TYPES.has(e.event_type)
                const adminEvent = e.event_type.startsWith('admin.')
                return (
                  <TR key={e.id} className={override ? 'bg-warning-soft/40' : undefined}>
                    <TD className="text-fg-muted text-xs whitespace-nowrap">{fmtDateTime(e.occurred_at)}</TD>
                    <TD className="text-xs whitespace-nowrap">
                      {e.orgName}
                      {e.serviceReference ? <div className="text-fg-subtle">{e.serviceReference}</div> : null}
                    </TD>
                    <TD>
                      <Badge tone={override ? 'warning' : adminEvent ? 'primary' : e.event_type.startsWith('auth.') ? 'info' : 'outline'}>{e.event_type}</Badge>
                    </TD>
                    <TD className="text-xs whitespace-nowrap">{e.actorName}</TD>
                    <TD className="text-sm">{e.summary}</TD>
                    <TD className="text-fg-muted max-w-72 text-xs">{e.reason ?? ''}</TD>
                  </TR>
                )
              })}
            </TBody>
          </Table>
        )}
      </Card>
    </>
  )
}
