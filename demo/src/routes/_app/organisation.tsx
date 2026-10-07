/** Organisation page: members and the client's complaints and appeals (PRD §7.2 v0.3, FR-91, FR-92). */
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { MessageSquare, Scale, Send, UserPlus, XCircle } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { cases, services, staff } from '@/api'
import type { CaseView } from '@/api/cases'
import { EmptyState } from '@/components/empty-state'
import { NavTabs } from '@/components/nav-tabs'
import { PageHeader } from '@/components/page-header'
import { ShowDontDoDialog } from '@/components/show-dont-do'
import { StatusChip } from '@/components/status-chip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Field, Input, NativeSelect, Textarea } from '@/components/ui/input'
import { Alert, Avatar, Skeleton } from '@/components/ui/misc'
import { TBody, TD, TH, THead, TR, Table } from '@/components/ui/table'
import { useMe } from '@/lib/auth'
import { fmtDate, fmtDateTime, roleLabel } from '@/lib/format'
import { useAppMutation } from '@/lib/query'
import { useMyCases } from '@/lib/service-hooks'

export const Route = createFileRoute('/_app/organisation')({
  validateSearch: z.object({ tab: z.enum(['members', 'cases']).optional() }),
  component: Organisation,
})

function Organisation() {
  const me = useMe()
  const navigate = useNavigate()
  const { tab = 'members' } = Route.useSearch()
  const [invite, setInvite] = useState(false)
  const [raise, setRaise] = useState(false)
  const canAct = me.role !== 'client_viewer'
  return (
    <>
      <PageHeader title={me.org.name} description={`Members of your organisation and their roles, and the formal route for complaints and appeals. Country: ${me.org.country}.`} actions={tab === 'cases' ? (canAct ? <Button onClick={() => setRaise(true)}><Scale /> Raise a complaint</Button> : null) : <Button onClick={() => setInvite(true)}><UserPlus /> Invite member</Button>} />
      <NavTabs
        className="mb-5"
        value={tab}
        onChange={(t) => navigate({ to: '/organisation', search: t === 'members' ? {} : { tab: t } })}
        label="Organisation sections"
        items={[
          { value: 'members' as const, label: 'Members' },
          { value: 'cases' as const, label: 'Complaints and appeals' },
        ]}
      />
      {tab === 'members' ? <Members /> : <CasesTab />}
      <ShowDontDoDialog
        open={invite}
        onOpenChange={setInvite}
        title="Invite a member"
        description="Invitations are single-use and expire after 7 days."
        wouldDo={['E-mail a single-use invitation link', 'Create the membership with the chosen role once accepted', 'Record the invitation in the audit log']}
        simulateLabel="Send invitation"
        onSimulate={() => toast.success('Invitation sent (simulated).')}
      >
        <div className="space-y-3">
          <Field label="Work e-mail" required>
            <Input placeholder="colleague@company.com" />
          </Field>
          <Field label="Role" required>
            <NativeSelect defaultValue="client_contributor">
              <option value="client_admin">Admin</option>
              <option value="client_contributor">Contributor</option>
              <option value="client_viewer">Viewer</option>
            </NativeSelect>
          </Field>
        </div>
      </ShowDontDoDialog>
      {raise ? <RaiseComplaintDialog onClose={() => setRaise(false)} /> : null}
    </>
  )
}

function Members() {
  const me = useMe()
  const users = useQuery({ queryKey: ['orgUsers', me.org.id], queryFn: () => staff.orgUsers(me.org.id) })
  return (
    <Card>
      <Table label="Members">
        <THead>
          <tr>
            <TH>Member</TH>
            <TH>Role</TH>
            <TH>MFA</TH>
            <TH>Status</TH>
          </tr>
        </THead>
        <TBody>
          {users.data?.map((u) => (
            <TR key={u.id}>
              <TD>
                <div className="flex items-center gap-3">
                  <Avatar name={u.name} />
                  <div>
                    <div className="font-medium">{u.name}</div>
                    <div className="text-fg-subtle text-xs">
                      {u.jobTitle} · {u.email}
                    </div>
                  </div>
                </div>
              </TD>
              <TD>
                <Badge tone="outline">{roleLabel(u.role)}</Badge>
              </TD>
              <TD>
                <Badge tone="success">Enabled</Badge>
              </TD>
              <TD>
                <Badge tone="neutral">Active</Badge>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </Card>
  )
}

const STAGES: { key: keyof CaseView; label: string }[] = [
  { key: 'received_at', label: 'Received' },
  { key: 'acknowledged_at', label: 'Acknowledged' },
  { key: 'investigation_started_at', label: 'Under investigation' },
  { key: 'decided_at', label: 'Decided' },
  { key: 'closed_at', label: 'Closed' },
]

function CasesTab() {
  const me = useMe()
  const q = useMyCases()
  const [selected, setSelected] = useState<string | null>(null)
  if (!q.data) return <Skeleton className="h-48" />
  const rows = q.data
  const canAct = me.role !== 'client_viewer'
  return (
    <div className="space-y-4">
      <Alert tone="info" title="How this works">
        A complaint is about VERIFASSUR's conduct; an appeal asks a decision to be reconsidered (a declined request, a rejected document, a finding outcome, an opinion). A manager outside the involved set of the decision handles it; you see each stage, the handler and the outcome summary. An appeal never suspends the decision appealed against.
      </Alert>
      {rows.length === 0 ? (
        <EmptyState icon={<Scale />} title="No complaint or appeal" description="Raise a complaint here, or appeal a decision from the screen where it was taken." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <Card>
            <ul className="divide-border divide-y">
              {rows.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => setSelected(c.id)} className={`flex w-full flex-col gap-1 px-5 py-3 text-left ${selected === c.id ? 'bg-primary-soft/40' : 'hover:bg-surface-muted'}`} data-testid={`case-${c.id}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={c.kind === 'appeal' ? 'primary' : 'warning'}>{c.kind}</Badge>
                      <span className="text-fg text-sm font-semibold">{c.subject}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <StatusChip status={c.status} size="xs" />
                      <span className="text-fg-subtle">
                        received {fmtDate(c.received_at)}
                        {c.serviceReference ? ` · ${c.serviceReference}` : ''}
                        {c.handlerName ? ` · handler ${c.handlerName}` : ''}
                      </span>
                      {c.outcome ? <Badge tone={c.outcome === 'upheld' ? 'success' : c.outcome === 'partly_upheld' ? 'warning' : 'neutral'}>{c.outcome.replace(/_/g, ' ')}</Badge> : null}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
          {selected ? <CaseDetail c={rows.find((x) => x.id === selected)!} canAct={canAct} /> : <Card className="text-fg-muted p-6 text-sm">Select a case to follow it.</Card>}
        </div>
      )}
    </div>
  )
}

function CaseDetail({ c, canAct }: { c: CaseView; canAct: boolean }) {
  const [note, setNote] = useState('')
  const addNote = useAppMutation(() => cases.addNote(c.id, note, false), { successMessage: 'Note sent to the handler.', onSuccess: () => setNote('') })
  const withdraw = useAppMutation(() => cases.withdrawCase(c.id), { successMessage: 'Case withdrawn.' })
  const open = ['received', 'acknowledged', 'under_investigation'].includes(c.status)
  return (
    <Card data-testid="case-detail">
      <CardHeader
        title={
          <span className="inline-flex flex-wrap items-center gap-2">
            <Badge tone={c.kind === 'appeal' ? 'primary' : 'warning'}>{c.kind}</Badge> {c.subject} <StatusChip status={c.status} />
          </span>
        }
        description={c.description}
        actions={canAct && open ? <Button size="sm" variant="ghost" onClick={() => withdraw.mutate()} loading={withdraw.isPending}><XCircle /> Withdraw</Button> : null}
      />
      <CardContent className="space-y-4">
        {c.decisionLabel ? (
          <p className="text-fg-muted text-sm">
            Decision appealed: <span className="text-fg font-medium">{c.decisionLabel}</span>
            {c.serviceReference ? (
              <>
                {' '}
                on{' '}
                <Link to="/engagements/$serviceId" params={{ serviceId: c.service_id! }} className="text-primary hover:underline">
                  {c.serviceReference}
                </Link>
              </>
            ) : null}
            . The decision stands while the appeal is handled.
          </p>
        ) : c.serviceReference ? (
          <p className="text-fg-muted text-sm">
            About engagement{' '}
            <Link to="/engagements/$serviceId" params={{ serviceId: c.service_id! }} className="text-primary hover:underline">
              {c.serviceReference}
            </Link>
            .
          </p>
        ) : null}
        <ol className="grid gap-2 text-xs sm:grid-cols-5">
          {STAGES.map((s) => {
            const at = c[s.key] as string | null
            return (
              <li key={s.key} className={`rounded-md border px-2 py-1.5 ${at ? 'border-success/40 bg-success-soft/40' : 'border-border'}`}>
                <div className="text-fg font-semibold">{s.label}</div>
                <div className="text-fg-muted">{at ? fmtDateTime(at) : '—'}</div>
              </li>
            )
          })}
        </ol>
        <p className="text-fg-subtle text-xs">
          Targets: acknowledgement by {fmtDate(c.acknowledge_target_at)}
          {c.overdueAcknowledge ? <Badge tone="blocking" className="ml-1">overdue</Badge> : null} · decision by {fmtDate(c.decide_target_at)}
          {c.overdueDecide ? <Badge tone="blocking" className="ml-1">overdue</Badge> : null} · handler {c.handlerName ?? 'not yet assigned'}
        </p>
        {c.outcome ? (
          <Alert tone={c.outcome === 'upheld' ? 'success' : c.outcome === 'partly_upheld' ? 'warning' : 'info'} title={`Outcome: ${c.outcome.replace(/_/g, ' ')}${c.decidedByName ? ` · decided by ${c.decidedByName}` : ''}`}>
            {c.outcome_summary}
          </Alert>
        ) : null}
        <div>
          <h4 className="text-fg-subtle mb-1 text-xs font-semibold uppercase tracking-wide">Correspondence</h4>
          {c.notes.length === 0 ? <p className="text-fg-muted text-sm">No message yet.</p> : null}
          <ul className="space-y-2">
            {c.notes.map((n) => (
              <li key={n.id} className="bg-surface-muted/60 rounded-md px-3 py-2 text-sm">
                <div className="text-fg-subtle text-[11px]">
                  {n.authorName} · {fmtDateTime(n.created_at)}
                </div>
                {n.body}
              </li>
            ))}
          </ul>
          {canAct && open ? (
            <div className="mt-2 flex gap-2">
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add information for the handler…" aria-label="Add a note" />
              <Button size="sm" onClick={() => addNote.mutate()} disabled={!note.trim()} loading={addNote.isPending} className="self-end">
                <Send /> Send
              </Button>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

function RaiseComplaintDialog({ onClose }: { onClose: () => void }) {
  const svcs = useQuery({ queryKey: ['services', 'all-for-complaint'], queryFn: () => services.list() })
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [serviceId, setServiceId] = useState('')
  const m = useAppMutation(() => cases.create({ kind: 'complaint', subject, description, serviceId: serviceId || null }), {
    successMessage: (c) => `Complaint received. VERIFASSUR acknowledges by ${c.acknowledge_target_at.slice(0, 10)} and decides by ${c.decide_target_at.slice(0, 10)}.`,
    onSuccess: onClose,
  })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Raise a complaint" description="About VERIFASSUR's conduct on an engagement or in general. A manager outside the involved set handles it; you follow every stage here." size="md">
        <Field label="Subject" required>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </Field>
        <Field label="Engagement concerned" className="mt-3">
          <NativeSelect value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            <option value="">General (not about one engagement)</option>
            {(svcs.data ?? []).filter((s) => s.status !== 'draft').map((s) => (
              <option key={s.id} value={s.id}>
                {s.reference} — {s.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="What happened" required className="mt-3">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Facts, dates, people involved, and what outcome you ask for." />
        </Field>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => m.mutate()} loading={m.isPending} disabled={!subject.trim() || !description.trim()}>
            <MessageSquare /> Submit complaint
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
