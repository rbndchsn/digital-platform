/** Service Log: append-only audit trail with filters and CSV export (PRD FR-38). */
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Download, Search } from 'lucide-react'
import { useState } from 'react'
import { services } from '@/api'
import { EmptyState } from '@/components/empty-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input, NativeSelect } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/misc'
import { TBody, TD, TH, THead, TR, Table } from '@/components/ui/table'
import { fmtDateTime } from '@/lib/format'

export const Route = createFileRoute('/_app/engagements/$serviceId/log')({
  component: ServiceLog,
})

const OVERRIDE_TYPES = ['step.overridden', 'service.overridden', 'team.reassigned', 'step.replanned']

const TYPES = [
  ['', 'All events'],
  ['override', 'Manager overrides'],
  ['service.', 'Service status'],
  ['step.', 'Steps'],
  ['document.', 'Documents'],
  ['approval.', 'Approvals'],
  ['agreement.', 'Agreement'],
  ['team.', 'Team'],
  ['coi.', 'Conflicts of interest'],
  ['finding.', 'Findings'],
  ['iteration.', 'Opinion iterations'],
  ['opinion.', 'Opinion issued'],
  ['inventory.', 'Inventory'],
  ['decarb_record.', 'decarb_units'],
]

function ServiceLog() {
  const { serviceId } = Route.useParams()
  const [type, setType] = useState('')
  const [search, setSearch] = useState('')
  const q = useQuery({ queryKey: ['log', serviceId, type, search], queryFn: () => services.log(serviceId, { types: type === 'override' ? OVERRIDE_TYPES : type ? [type] : undefined, search: search || undefined }) })
  function exportCsv() {
    const rows = q.data ?? []
    const esc = (s: string) => `"${String(s ?? '').replace(/"/g, '""')}"`
    const csv = ['occurred_at,event_type,actor,entity_type,entity_id,reason,summary', ...rows.map((e) => [e.occurred_at, e.event_type, e.actorName, e.entity_type, e.entity_id, e.reason ?? '', e.summary].map(esc).join(','))].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `service-log-${serviceId}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-fg text-base font-semibold">Service Log</h2>
          <p className="text-fg-muted text-xs">Every status change, upload, approval and decision, newest first. Append-only; times in UTC.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="text-fg-subtle pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search the log" aria-label="Search the log" className="w-56 pl-8" />
          </div>
          <NativeSelect value={type} onChange={(e) => setType(e.target.value)} className="w-48" aria-label="Filter by event type">
            {TYPES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </NativeSelect>
          <Button variant="secondary" size="sm" onClick={exportCsv} disabled={!q.data?.length}>
            <Download /> Export CSV
          </Button>
        </div>
      </div>
      <Card>
        {!q.data ? (
          <div className="p-5">
            <Skeleton className="h-40" />
          </div>
        ) : q.data.length === 0 ? (
          <EmptyState title="No events match" />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>When (UTC)</TH>
                <TH>Event</TH>
                <TH>Actor</TH>
                <TH>Summary</TH>
              </tr>
            </THead>
            <TBody>
              {q.data.map((e) => {
                const override = OVERRIDE_TYPES.includes(e.event_type) && e.event_type !== 'step.replanned'
                return (
                  <TR key={e.id} className={override ? 'bg-warning-soft/40' : undefined}>
                    <TD className="text-fg-muted text-xs whitespace-nowrap">{fmtDateTime(e.occurred_at)}</TD>
                    <TD>
                      <Badge tone={override ? 'warning' : 'outline'}>{override ? `Override · ${e.event_type}` : e.event_type}</Badge>
                    </TD>
                    <TD className="text-xs whitespace-nowrap">{e.actorName}</TD>
                    <TD className="text-sm">
                      {e.summary}
                      {e.reason && !e.summary.includes(e.reason) ? <div className="text-fg-muted text-xs italic">Reason: {e.reason}</div> : null}
                    </TD>
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
