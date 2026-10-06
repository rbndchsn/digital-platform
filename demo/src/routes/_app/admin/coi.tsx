/** COI register across engagements (PRD FR-69): every declaration, its status and decision. */
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Download } from 'lucide-react'
import { useState } from 'react'
import { admin } from '@/api'
import { EmptyState } from '@/components/empty-state'
import { KpiNumber } from '@/components/kpi-tile'
import { PageHeader } from '@/components/page-header'
import { StatusChip } from '@/components/status-chip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { NativeSelect } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/misc'
import { TBody, TD, TH, THead, TR, Table } from '@/components/ui/table'
import { fmtDateTime, roleLabel } from '@/lib/format'

export const Route = createFileRoute('/_app/admin/coi')({
  component: CoiRegister,
})

function CoiRegister() {
  const [status, setStatus] = useState('')
  const [orgId, setOrgId] = useState('')
  const orgs = useQuery({ queryKey: ['admin', 'orgs'], queryFn: admin.listOrgs })
  const q = useQuery({ queryKey: ['admin', 'coi', status, orgId], queryFn: () => admin.coiRegister({ status: status || undefined, orgId: orgId || undefined }) })
  const all = useQuery({ queryKey: ['admin', 'coi', '', ''], queryFn: () => admin.coiRegister() })
  function exportCsv() {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const rows = q.data ?? []
    const csv = ['person,job_title,service,client,role,declaration,details,status,declared_at,decided_by,decided_at', ...rows.map((r) => [r.userName, r.jobTitle, r.serviceReference, r.clientName, r.role, r.declaration ?? '', r.details ?? '', r.status, r.declaredAt ?? '', r.decidedByName ?? '', r.decidedAt ?? ''].map(esc).join(','))].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `verifassurx-coi-register-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }
  const counts = { total: all.data?.length ?? 0, approved: all.data?.filter((r) => r.status === 'approved').length ?? 0, declared: all.data?.filter((r) => r.status === 'declared').length ?? 0, required: all.data?.filter((r) => r.status === 'required').length ?? 0, conflicts: all.data?.filter((r) => r.declaration === 'potential_conflict').length ?? 0 }
  return (
    <>
      <PageHeader title="Conflict-of-interest register" description="Every declaration across every engagement: who declared what, when, and who approved it. This is the impartiality evidence the accreditation body asks for (ISO/IEC 17029)." actions={<Button variant="secondary" onClick={exportCsv} disabled={!q.data?.length}><Download /> Export CSV</Button>} />
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiNumber value={counts.total} label="Declarations" tone="fg" />
        <KpiNumber value={counts.approved} label="Approved" tone="success" />
        <KpiNumber value={counts.declared + counts.required} label="Pending" tone={counts.declared + counts.required ? 'blocking' : 'fg'} hint={`${counts.required} not yet declared · ${counts.declared} awaiting approval`} />
        <KpiNumber value={counts.conflicts} label="Potential conflicts declared" tone="fg" />
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <NativeSelect value={status} onChange={(e) => setStatus(e.target.value)} className="w-48" aria-label="Filter by status">
          <option value="">All statuses</option>
          <option value="required">Declaration required</option>
          <option value="declared">Declared, awaiting approval</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </NativeSelect>
        <NativeSelect value={orgId} onChange={(e) => setOrgId(e.target.value)} className="w-56" aria-label="Filter by client">
          <option value="">All clients</option>
          {orgs.data
            ?.filter((o) => o.type === 'client')
            .map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
        </NativeSelect>
      </div>
      <Card>
        {!q.data ? (
          <div className="p-5">
            <Skeleton className="h-48" />
          </div>
        ) : q.data.length === 0 ? (
          <EmptyState title="No declaration matches" />
        ) : (
          <Table label="COI register">
            <THead>
              <tr>
                <TH>Person</TH>
                <TH>Engagement</TH>
                <TH>Role</TH>
                <TH>Declaration</TH>
                <TH>Status</TH>
                <TH>Declared</TH>
                <TH>Decided</TH>
              </tr>
            </THead>
            <TBody>
              {q.data.map((r) => (
                <TR key={r.id}>
                  <TD>
                    <div className="text-fg text-sm font-medium">{r.userName}</div>
                    <div className="text-fg-subtle text-xs">{r.jobTitle}</div>
                  </TD>
                  <TD>
                    <Link to="/engagements/$serviceId/phases" params={{ serviceId: r.serviceId }} className="text-primary-strong text-sm font-semibold hover:underline">
                      {r.serviceReference}
                    </Link>
                    <div className="text-fg-subtle max-w-64 truncate text-xs">
                      {r.clientName} · {r.serviceName}
                    </div>
                  </TD>
                  <TD>
                    <Badge tone="outline">{roleLabel(r.role)}</Badge>
                    {r.memberStatus === 'removed' ? <Badge tone="neutral" className="ml-1">removed</Badge> : null}
                  </TD>
                  <TD className="text-sm">
                    {r.declaration === 'clear' ? 'No conflict' : r.declaration === 'potential_conflict' ? <span className="text-warning font-medium">Potential conflict</span> : <span className="text-fg-subtle">—</span>}
                    {r.details ? <div className="text-fg-muted max-w-72 truncate text-xs italic" title={r.details}>“{r.details}”</div> : null}
                  </TD>
                  <TD>
                    <StatusChip status={r.status} label={r.status === 'approved' ? 'Approved' : r.status === 'declared' ? 'Awaiting approval' : r.status === 'rejected' ? 'Rejected' : 'Not declared'} />
                  </TD>
                  <TD className="text-fg-muted text-xs whitespace-nowrap">{r.declaredAt ? fmtDateTime(r.declaredAt) : '—'}</TD>
                  <TD className="text-fg-muted text-xs whitespace-nowrap">
                    {r.decidedAt ? fmtDateTime(r.decidedAt) : '—'}
                    {r.decidedByName ? <div>{r.decidedByName}</div> : null}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </>
  )
}
