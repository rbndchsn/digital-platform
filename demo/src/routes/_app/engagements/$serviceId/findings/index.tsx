/** Findings list with raise-finding dialog (PRD §6.4; plan_v1 ch. 6). */
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { AlertTriangle, Plus } from 'lucide-react'
import { useState } from 'react'
import { findings, staff } from '@/api'
import type { FindingSeverity, FindingType } from '@/domain/enums'
import { FINDING_TYPE_LABELS } from '@/domain/enums'
import { EmptyState } from '@/components/empty-state'
import { StatusChip } from '@/components/status-chip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Field, Input, NativeSelect, Textarea } from '@/components/ui/input'
import { Alert, Skeleton } from '@/components/ui/misc'
import { TBody, TD, TH, THead, TR, Table } from '@/components/ui/table'
import { useServicePermissions } from '@/features/service/step-detail'
import { cn } from '@/lib/cn'
import { fmtDate } from '@/lib/format'
import { useAppMutation } from '@/lib/query'
import { useService, useServiceFindings } from '@/lib/service-hooks'

export const Route = createFileRoute('/_app/engagements/$serviceId/findings/')({
  component: Findings,
})

export function TypeBadge({ type }: { type: FindingType }) {
  const tone = { CAR: 'danger', CL: 'info', FAR: 'warning', OBS: 'neutral' } as const
  return (
    <Badge tone={tone[type]} title={FINDING_TYPE_LABELS[type]}>
      {type}
    </Badge>
  )
}

function Findings() {
  const { serviceId } = Route.useParams()
  const navigate = useNavigate()
  const d = useService(serviceId)
  const q = useServiceFindings(serviceId)
  const perms = useServicePermissions(d.data)
  const [raise, setRaise] = useState(false)
  if (!q.data || !d.data) return <Skeleton className="h-64" />
  const open = q.data.filter((f) => f.status !== 'closed' && f.status !== 'withdrawn')
  const blocking = open.filter((f) => f.blocking)
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-fg text-base font-semibold">
            Findings <Badge tone={open.length ? 'blocking' : 'neutral'}>{open.length} open</Badge>
          </h2>
          <p className="text-fg-muted text-xs">CAR = corrective action request (blocks the opinion) · CL = clarification · FAR = forward action · OBS = observation.</p>
        </div>
        {perms.canTransition ? (
          <Button onClick={() => setRaise(true)}>
            <Plus /> Raise finding
          </Button>
        ) : null}
      </div>
      {blocking.length ? (
        <Alert tone="blocking" icon={<AlertTriangle />} className="mb-4" title={`${blocking.length} blocking finding${blocking.length === 1 ? '' : 's'} open`}>
          The opinion cannot be approved until every CAR is closed.
        </Alert>
      ) : null}
      <Card>
        {q.data.length === 0 ? (
          <EmptyState title="No findings" description="Findings raised during desk review and the audit appear here with their response thread." />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>#</TH>
                <TH>Type</TH>
                <TH>Finding</TH>
                <TH>Step</TH>
                <TH>Assigned</TH>
                <TH>Due</TH>
                <TH>Status</TH>
              </tr>
            </THead>
            <TBody>
              {q.data.map((f) => (
                <TR key={f.id} clickable onClick={() => navigate({ to: '/engagements/$serviceId/findings/$findingId', params: { serviceId, findingId: f.id } })}>
                  <TD className="text-fg-subtle text-xs">#{f.number}</TD>
                  <TD>
                    <TypeBadge type={f.type} />
                  </TD>
                  <TD>
                    <Link to="/engagements/$serviceId/findings/$findingId" params={{ serviceId, findingId: f.id }} className="text-fg font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
                      {f.title}
                    </Link>
                    <div className="text-fg-subtle text-xs">
                      {f.severity} · {f.responseCount} response{f.responseCount === 1 ? '' : 's'} · raised by {f.raisedByName}
                    </div>
                  </TD>
                  <TD className="text-fg-muted text-xs">{f.stepName ?? '—'}</TD>
                  <TD className="text-fg-muted text-xs">{f.assignedName ?? '—'}</TD>
                  <TD className={cn('text-xs whitespace-nowrap', f.overdue ? 'text-danger font-semibold' : 'text-fg-muted')}>
                    {fmtDate(f.due_at)}
                    {f.overdue ? ' · overdue' : ''}
                  </TD>
                  <TD>
                    <StatusChip status={f.status} />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
      <RaiseFindingDialog open={raise} onOpenChange={setRaise} serviceId={serviceId} steps={d.data.phases.flatMap((p) => p.steps.map((s) => ({ id: s.id, name: `${p.name} › ${s.name}` })))} clientOrgId={d.data.service.org_id} />
    </>
  )
}

function RaiseFindingDialog({ open, onOpenChange, serviceId, steps, clientOrgId }: { open: boolean; onOpenChange: (o: boolean) => void; serviceId: string; steps: { id: string; name: string }[]; clientOrgId: string }) {
  const users = useQuery({ queryKey: ['orgUsers', clientOrgId], queryFn: () => staff.orgUsers(clientOrgId), enabled: open })
  const [form, setForm] = useState({ type: 'CAR' as FindingType, severity: 'major' as FindingSeverity, title: '', description: '', stepId: '', assignedUserId: '', dueAt: '' })
  const m = useAppMutation(() => findings.create(serviceId, { type: form.type, severity: form.severity, title: form.title, description: form.description, stepId: form.stepId || null, assignedUserId: form.assignedUserId || null, dueAt: form.dueAt || null }), {
    successMessage: (f) => `${f.type} #${f.number} raised; the client has been notified.`,
    onSuccess: () => onOpenChange(false),
  })
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Raise a finding" description="The assignee and the client admins are notified. CARs block the opinion until closed." size="lg">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Type" required>
            <NativeSelect value={form.type} onChange={set('type')}>
              {(['CAR', 'CL', 'FAR', 'OBS'] as FindingType[]).map((t) => (
                <option key={t} value={t}>
                  {t} — {FINDING_TYPE_LABELS[t]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Severity" required>
            <NativeSelect value={form.severity} onChange={set('severity')}>
              <option value="major">Major</option>
              <option value="minor">Minor</option>
              <option value="info">Info</option>
            </NativeSelect>
          </Field>
          <Field label="Title" required className="sm:col-span-2">
            <Input value={form.title} onChange={set('title')} placeholder="e.g. Scope 1 stationary combustion: Q3 gas volumes unsupported" />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <Textarea value={form.description} onChange={set('description')} placeholder="What was observed, what evidence is needed, and the requirement it relates to." />
          </Field>
          <Field label="Related step">
            <NativeSelect value={form.stepId} onChange={set('stepId')}>
              <option value="">—</option>
              {steps.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Assign to (client)">
            <NativeSelect value={form.assignedUserId} onChange={set('assignedUserId')}>
              <option value="">Client contact</option>
              {users.data?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} · {u.jobTitle}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Due date">
            <Input type="date" value={form.dueAt} onChange={set('dueAt')} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => m.mutate()} loading={m.isPending} disabled={!form.title.trim()}>
            Raise finding
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
