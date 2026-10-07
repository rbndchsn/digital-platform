/**
 * Complaints and appeals register (PRD v0.3 §7.2, FR-91, FR-92): queue with targets and overdue flags, handler
 * assignment outside the involved set, internal notes, decision with follow-up actions, closure. ADMIN reads only.
 */
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { CalendarClock, CheckCircle2, Gavel, Lock, Scale, Search, Send, UserCheck } from 'lucide-react'
import { useState } from 'react'
import { cases, documents, findings, iterations } from '@/api'
import type { CaseFilter, CaseView } from '@/api/cases'
import type { CaseKind, CaseOutcome } from '@/domain/enums'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { ReasonDialog } from '@/components/reason-dialog'
import { StatusChip } from '@/components/status-chip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Field, Input, NativeSelect, Textarea } from '@/components/ui/input'
import { Alert, Checkbox, Skeleton } from '@/components/ui/misc'
import { TBody, TD, TH, THead, TR, Table } from '@/components/ui/table'
import { useMe } from '@/lib/auth'
import { fmtDate, fmtDateTime } from '@/lib/format'
import { useAppMutation } from '@/lib/query'

export const Route = createFileRoute('/_app/staff/cases')({
  component: CasesRegister,
})

const OPEN = ['received', 'acknowledged', 'under_investigation']

function CasesRegister() {
  const me = useMe()
  const [kind, setKind] = useState<CaseKind | ''>('')
  const [stage, setStage] = useState<string>('open')
  const [overdue, setOverdue] = useState(false)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const filter: CaseFilter = { kind: kind || undefined, status: stage === 'all' ? undefined : (stage as CaseFilter['status']), overdue }
  const q = useQuery({ queryKey: ['cases', 'all', filter], queryFn: () => cases.listAll(filter) })
  const rows = (q.data ?? []).filter((c) => !search || `${c.subject} ${c.orgName} ${c.serviceReference ?? ''}`.toLowerCase().includes(search.toLowerCase()))
  return (
    <>
      <PageHeader
        title="Complaints and appeals"
        description={me.isAdmin ? 'Read-only register for the platform administrator, including internal investigation notes.' : 'Every complaint and appeal, its targets and its handler. Handlers and deciders must be outside the involved set of the decision concerned (PRD FR-92).'}
        meta={
          <>
            <Badge tone="blocking">{(q.data ?? []).filter((c) => OPEN.includes(c.status)).length} open</Badge>
            <Badge tone="danger">{(q.data ?? []).filter((c) => c.overdueAcknowledge || c.overdueDecide).length} overdue</Badge>
          </>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="text-fg-subtle pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search subject, client, reference" aria-label="Search cases" className="w-64 pl-8" />
        </div>
        <NativeSelect value={kind} onChange={(e) => setKind(e.target.value as CaseKind | '')} className="w-40" aria-label="Filter by kind">
          <option value="">All kinds</option>
          <option value="complaint">Complaints</option>
          <option value="appeal">Appeals</option>
        </NativeSelect>
        <NativeSelect value={stage} onChange={(e) => setStage(e.target.value)} className="w-48" aria-label="Filter by stage">
          <option value="open">Open (any stage)</option>
          <option value="all">All</option>
          <option value="received">Received</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="under_investigation">Under investigation</option>
          <option value="decided">Decided</option>
          <option value="closed">Closed</option>
          <option value="withdrawn_by_complainant">Withdrawn by complainant</option>
        </NativeSelect>
        <label className="inline-flex items-center gap-2 text-sm">
          <Checkbox checked={overdue} onCheckedChange={(v) => setOverdue(v === true)} /> Overdue only
        </label>
      </div>
      {!q.data ? (
        <Skeleton className="h-64" />
      ) : rows.length === 0 ? (
        <EmptyState icon={<Scale />} title="No case matches" description="Complaints and appeals raised by clients appear here with their acknowledgement and decision targets." />
      ) : (
        <Card>
          <Table label="Complaints and appeals">
            <THead>
              <tr>
                <TH>Kind</TH>
                <TH>Client · subject</TH>
                <TH>Linked</TH>
                <TH>Stage</TH>
                <TH>Acknowledge by</TH>
                <TH>Decide by</TH>
                <TH>Handler</TH>
              </tr>
            </THead>
            <TBody>
              {rows.map((c) => (
                <TR key={c.id} clickable onClick={() => setSelected(c.id)} data-testid={`case-row-${c.id}`}>
                  <TD>
                    <Badge tone={c.kind === 'appeal' ? 'primary' : 'warning'}>{c.kind}</Badge>
                  </TD>
                  <TD>
                    <div className="text-fg-subtle text-[11px]">
                      {c.orgName} · {c.complainantName ?? 'external'}
                    </div>
                    <div className="text-fg max-w-md truncate text-sm font-semibold">{c.subject}</div>
                  </TD>
                  <TD className="text-xs">
                    {c.serviceReference ? <div className="text-fg">{c.serviceReference}</div> : <span className="text-fg-subtle">general</span>}
                    {c.decisionLabel ? <div className="text-fg-subtle max-w-56 truncate">{c.decisionLabel}</div> : null}
                  </TD>
                  <TD>
                    <StatusChip status={c.status} />
                  </TD>
                  <TD className="text-xs whitespace-nowrap">
                    {fmtDate(c.acknowledge_target_at)} {c.overdueAcknowledge ? <Badge tone="blocking">overdue</Badge> : c.acknowledged_at ? <Badge tone="success">done</Badge> : null}
                  </TD>
                  <TD className="text-xs whitespace-nowrap">
                    {fmtDate(c.decide_target_at)} {c.overdueDecide ? <Badge tone="blocking">overdue</Badge> : c.decided_at ? <Badge tone="success">done</Badge> : null}
                  </TD>
                  <TD className="text-xs">{c.handlerName ?? <span className="text-fg-subtle">unassigned</span>}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      )}
      {selected ? <CaseDrawer caseId={selected} onClose={() => setSelected(null)} /> : null}
    </>
  )
}

/** The drawer reads the case by id so it survives a stage change that drops the case out of the list filter. */
function CaseDrawer({ caseId, onClose }: { caseId: string; onClose: () => void }) {
  const q = useQuery({ queryKey: ['cases', 'one', caseId], queryFn: () => cases.get(caseId) })
  if (!q.data) return null
  return <CaseDrawerBody c={q.data} onClose={onClose} />
}

function CaseDrawerBody({ c, onClose }: { c: CaseView; onClose: () => void }) {
  const me = useMe()
  const isManager = me.org.type === 'verifier' && !me.isAdmin && me.role === 'verifier_manager'
  const readOnly = me.isAdmin
  const [note, setNote] = useState('')
  const [internal, setInternal] = useState(true)
  const [assign, setAssign] = useState(false)
  const [decide, setDecide] = useState(false)
  const [targets, setTargets] = useState(false)
  const ack = useAppMutation(() => cases.acknowledge(c.id), { successMessage: 'Acknowledged; the complainant was notified.' })
  const start = useAppMutation(() => cases.startInvestigation(c.id), { successMessage: 'Investigation started.' })
  const close = useAppMutation(() => cases.close(c.id), { successMessage: 'Case closed.' })
  const addNote = useAppMutation(() => cases.addNote(c.id, note, internal), { successMessage: internal ? 'Internal note added.' : 'Note sent to the complainant.', onSuccess: () => setNote('') })
  const open = OPEN.includes(c.status)
  const canHandle = c.canHandle && !readOnly
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={<span className="inline-flex flex-wrap items-center gap-2"><Badge tone={c.kind === 'appeal' ? 'primary' : 'warning'}>{c.kind}</Badge> {c.subject} <StatusChip status={c.status} /></span>} description={`${c.orgName} · ${c.complainantName ?? 'external party'} · received ${fmtDateTime(c.received_at)}`} size="xl">
        <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-4">
            <p className="text-fg text-sm whitespace-pre-line">{c.description}</p>
            {c.decisionLabel ? (
              <Alert tone="info" title={`Decision appealed: ${c.decisionLabel}${c.decisionActorName ? ` (taken by ${c.decisionActorName})` : ''}`}>
                The decision stands while the appeal is handled. {c.serviceReference ? <Link to="/engagements/$serviceId" params={{ serviceId: c.service_id! }} className="underline">Open {c.serviceReference}</Link> : null}
              </Alert>
            ) : c.serviceReference ? (
              <p className="text-fg-muted text-sm">
                About{' '}
                <Link to="/engagements/$serviceId" params={{ serviceId: c.service_id! }} className="text-primary hover:underline">
                  {c.serviceReference}
                </Link>
              </p>
            ) : null}
            {c.outcome ? (
              <Alert tone={c.outcome === 'upheld' ? 'success' : c.outcome === 'partly_upheld' ? 'warning' : 'info'} title={`Outcome: ${c.outcome.replace(/_/g, ' ')} · decided by ${c.decidedByName} on ${fmtDateTime(c.decided_at)}`}>
                {c.outcome_summary}
                {c.actions_json && (c.actions_json.reopen_finding_id || c.actions_json.recheck_document_version_id || c.actions_json.post_issuance_event_id) ? (
                  <p className="mt-1 text-xs">Actions recorded: {[c.actions_json.reopen_finding_id ? 'finding reopened' : null, c.actions_json.recheck_document_version_id ? 'document version returned for a fresh check' : null, c.actions_json.post_issuance_event_id ? 'post-issuance event opened' : null].filter(Boolean).join(', ')}.</p>
                ) : null}
              </Alert>
            ) : null}
            <div>
              <h4 className="text-fg-subtle mb-1 text-xs font-semibold uppercase tracking-wide">Notes</h4>
              {c.notes.length === 0 ? <p className="text-fg-muted text-sm">No note yet.</p> : null}
              <ul className="space-y-2">
                {c.notes.map((n) => (
                  <li key={n.id} className={`rounded-md px-3 py-2 text-sm ${n.internal ? 'bg-warning-soft/40' : 'bg-surface-muted/60'}`}>
                    <div className="text-fg-subtle flex flex-wrap items-center gap-2 text-[11px]">
                      {n.authorName} · {fmtDateTime(n.created_at)} {n.internal ? <Badge tone="warning">internal</Badge> : <Badge tone="outline">visible to the complainant</Badge>}
                    </div>
                    {n.body}
                  </li>
                ))}
              </ul>
              {canHandle && open ? (
                <div className="mt-2 space-y-2">
                  <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Investigation note…" aria-label="Add a note" />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="inline-flex items-center gap-2 text-xs">
                      <Checkbox checked={internal} onCheckedChange={(v) => setInternal(v === true)} /> Internal (never shown to the complainant)
                    </label>
                    <Button size="sm" onClick={() => addNote.mutate()} disabled={!note.trim()} loading={addNote.isPending}>
                      <Send /> Add note
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-surface-muted/60 border-border rounded-md border px-3 py-2 text-xs">
              <div className="text-fg-subtle mb-1 font-semibold uppercase tracking-wide">Targets and stages</div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                <dt className="text-fg-muted">Acknowledge by</dt>
                <dd>
                  {fmtDate(c.acknowledge_target_at)} {c.overdueAcknowledge ? <Badge tone="blocking">overdue</Badge> : null}
                </dd>
                <dt className="text-fg-muted">Decide by</dt>
                <dd>
                  {fmtDate(c.decide_target_at)} {c.overdueDecide ? <Badge tone="blocking">overdue</Badge> : null}
                </dd>
                <dt className="text-fg-muted">Acknowledged</dt>
                <dd>{c.acknowledged_at ? fmtDateTime(c.acknowledged_at) : '—'}</dd>
                <dt className="text-fg-muted">Investigation</dt>
                <dd>{c.investigation_started_at ? fmtDateTime(c.investigation_started_at) : '—'}</dd>
                <dt className="text-fg-muted">Decided</dt>
                <dd>{c.decided_at ? fmtDateTime(c.decided_at) : '—'}</dd>
                <dt className="text-fg-muted">Closed</dt>
                <dd>{c.closed_at ? fmtDateTime(c.closed_at) : '—'}</dd>
                <dt className="text-fg-muted">Handler</dt>
                <dd>{c.handlerName ?? 'unassigned'}</dd>
              </dl>
            </div>
            <div className="text-xs">
              <div className="text-fg-subtle mb-1 font-semibold uppercase tracking-wide">Involved set of this decision</div>
              <p className="text-fg-muted">{c.involvedNames.length ? `${c.involvedNames.join(', ')} cannot handle or decide this case.` : 'Nobody is excluded.'}</p>
            </div>
            {readOnly ? (
              <Alert tone="warning" icon={<Lock />} title="Read-only">
                The platform administrator reads the register, including internal notes, and changes nothing.
              </Alert>
            ) : (
              <div className="flex flex-wrap gap-2">
                {c.status === 'received' && canHandle ? (
                  <Button size="sm" onClick={() => ack.mutate()} loading={ack.isPending}>
                    <CheckCircle2 /> Acknowledge
                  </Button>
                ) : null}
                {isManager && open ? (
                  <Button size="sm" variant="secondary" onClick={() => setAssign(true)}>
                    <UserCheck /> {c.handler_user_id ? 'Reassign handler' : 'Assign handler'}
                  </Button>
                ) : null}
                {c.status === 'acknowledged' && canHandle ? (
                  <Button size="sm" variant="secondary" onClick={() => start.mutate()} loading={start.isPending}>
                    Start investigation
                  </Button>
                ) : null}
                {isManager && c.status === 'under_investigation' ? (
                  <Button size="sm" onClick={() => setDecide(true)} disabled={!c.canHandle} title={c.canHandle ? undefined : 'You are in the involved set of this decision'}>
                    <Gavel /> Decide
                  </Button>
                ) : null}
                {isManager && c.status === 'decided' ? (
                  <Button size="sm" onClick={() => close.mutate()} loading={close.isPending}>
                    Close case
                  </Button>
                ) : null}
                {isManager && open ? (
                  <Button size="sm" variant="ghost" onClick={() => setTargets(true)}>
                    <CalendarClock /> Set targets
                  </Button>
                ) : null}
                {isManager && !c.canHandle && open ? <p className="text-warning w-full text-xs">You are in the involved set of this decision ({c.involvedNames.join(', ')}); another manager must assign, decide or close.</p> : null}
              </div>
            )}
          </div>
        </div>
        {assign ? <AssignDialog c={c} onClose={() => setAssign(false)} /> : null}
        {decide ? <DecideCaseDialog c={c} onClose={() => setDecide(false)} /> : null}
        {targets ? <TargetsDialog c={c} onClose={() => setTargets(false)} /> : null}
      </DialogContent>
    </Dialog>
  )
}

function AssignDialog({ c, onClose }: { c: CaseView; onClose: () => void }) {
  const cand = useQuery({ queryKey: ['cases', 'handlers', c.id], queryFn: () => cases.handlerCandidates(c.id) })
  const [userId, setUserId] = useState(c.handler_user_id ?? '')
  const m = useAppMutation(() => cases.assign(c.id, userId), { successMessage: (r) => `${r.handlerName} assigned as handler (outside the involved set).`, onSuccess: onClose })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Assign a handler" description="Any verifier user outside the involved set of the decision. The involved set is derived from the team rows, the verified-value edits and the independent review of the service, plus the actor of the decision." size="sm">
        <Field label="Handler" required>
          <NativeSelect value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">Choose…</option>
            {(cand.data ?? []).map((u) => (
              <option key={u.userId} value={u.userId}>
                {u.name} · {u.jobTitle}
              </option>
            ))}
          </NativeSelect>
        </Field>
        {c.involvedNames.length ? <p className="text-fg-subtle mt-2 text-xs">Not offered (involved set): {c.involvedNames.join(', ')}.</p> : null}
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => m.mutate()} loading={m.isPending} disabled={!userId}>
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DecideCaseDialog({ c, onClose }: { c: CaseView; onClose: () => void }) {
  const sid = c.service_id
  const fnd = useQuery({ queryKey: ['findings', sid], queryFn: () => findings.list(sid!), enabled: Boolean(sid) })
  const docs = useQuery({ queryKey: ['documents', sid], queryFn: () => documents.listForService(sid!), enabled: Boolean(sid) })
  const st = useQuery({ queryKey: ['statement', sid], queryFn: () => iterations.getStatement(sid!), enabled: Boolean(sid) })
  const [outcome, setOutcome] = useState<CaseOutcome>('upheld')
  const [summary, setSummary] = useState('')
  const [reason, setReason] = useState('')
  const [reopenFinding, setReopenFinding] = useState('')
  const [recheck, setRecheck] = useState(c.decision_entity_type === 'document_version' ? (c.decision_entity_id ?? '') : '')
  const [pie, setPie] = useState(false)
  const m = useAppMutation(() => cases.decideCase(c.id, { outcome, outcomeSummary: summary, reason, actions: { reopenFindingId: reopenFinding || null, recheckDocumentVersionId: recheck || null, openPostIssuanceEvent: pie && st.data ? { statementId: st.data.id, description: `Opened from the ${c.kind} "${c.subject}"` } : null } }), {
    successMessage: (r) => `Decided: ${r.outcome?.replace(/_/g, ' ')}. The complainant sees the outcome summary.`,
    onSuccess: onClose,
  })
  const closedFindings = (fnd.data ?? []).filter((f) => f.status === 'closed')
  const rejected = (docs.data ?? []).flatMap((d) => d.versions.filter((v) => v.check_status === 'rejected').map((v) => ({ id: v.id, name: `${v.filename} (v${v.version_no})` })))
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={`Decide the ${c.kind}`} description="Taken by a manager outside the involved set. The outcome summary is shown to the complainant; the reason stays in the audit log. Follow-up actions are recorded on the case." size="lg">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Outcome" required>
            <NativeSelect value={outcome} onChange={(e) => setOutcome(e.target.value as CaseOutcome)}>
              <option value="upheld">Upheld</option>
              <option value="partly_upheld">Partly upheld</option>
              <option value="not_upheld">Not upheld</option>
            </NativeSelect>
          </Field>
          <div />
          <Field label="Outcome summary (visible to the complainant)" required className="sm:col-span-2">
            <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} />
          </Field>
          <Field label="Reason (audit log)" required hint="At least 10 characters." className="sm:col-span-2">
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        </div>
        {sid ? (
          <fieldset className="mt-3 space-y-2">
            <legend className="text-fg text-sm font-medium">Actions on the engagement</legend>
            <Field label="Reopen a closed finding">
              <NativeSelect value={reopenFinding} onChange={(e) => setReopenFinding(e.target.value)}>
                <option value="">None</option>
                {closedFindings.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.type} #{f.number} — {f.title}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Return a rejected document version for a fresh check">
              <NativeSelect value={recheck} onChange={(e) => setRecheck(e.target.value)}>
                <option value="">None</option>
                {rejected.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            {st.data?.status === 'issued' ? (
              <label className="inline-flex items-center gap-2 text-sm">
                <Checkbox checked={pie} onCheckedChange={(v) => setPie(v === true)} /> Open a post-issuance event on statement {st.data.public_code} (trigger: {c.kind})
              </label>
            ) : null}
          </fieldset>
        ) : null}
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => m.mutate()} loading={m.isPending} disabled={!summary.trim() || reason.trim().length < 10}>
            <Gavel /> Record decision
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TargetsDialog({ c, onClose }: { c: CaseView; onClose: () => void }) {
  const [ackAt, setAckAt] = useState(c.acknowledge_target_at.slice(0, 10))
  const [decideAt, setDecideAt] = useState(c.decide_target_at.slice(0, 10))
  const m = useAppMutation((reason: string) => cases.setTargets(c.id, { acknowledgeTargetAt: `${ackAt}T17:00:00.000Z`, decideTargetAt: `${decideAt}T17:00:00.000Z` }, reason), { successMessage: 'Targets updated.', onSuccess: onClose })
  return (
    <ReasonDialog open onOpenChange={(o) => !o && onClose()} title="Set the targets" description="Targets come from the template of the linked service (or the platform setting); a manager may adjust them with a reason." reasonLabel="Reason" confirmLabel="Save targets" onConfirm={(r) => m.mutateAsync(r)}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Acknowledge by">
          <Input type="date" value={ackAt} onChange={(e) => setAckAt(e.target.value)} />
        </Field>
        <Field label="Decide by">
          <Input type="date" value={decideAt} onChange={(e) => setDecideAt(e.target.value)} />
        </Field>
      </div>
    </ReasonDialog>
  )
}
