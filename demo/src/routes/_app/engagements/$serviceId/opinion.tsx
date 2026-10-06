/** Opinion tab (PRD §6.5, §7.2): iterations, independent review, manager approval, issuance, statement. */
import { Link, createFileRoute } from '@tanstack/react-router'
import { CheckCircle2, ChevronDown, Download, ExternalLink, FileSignature, Plus, Send, ShieldCheck, XCircle } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { iterations } from '@/api'
import type { IterationView, StatementView } from '@/api/iterations'
import type { LevelOfAssurance, OpinionType } from '@/domain/enums'
import type { ChecklistItem, VerifiedFigure } from '@/domain/schemas'
import { DocumentRow } from '@/components/document-row'
import { EmptyState } from '@/components/empty-state'
import { IssuanceDialog } from '@/components/issuance-dialog'
import { KpiNumber } from '@/components/kpi-tile'
import { Hash } from '@/components/provenance'
import { ShowDontDoDialog } from '@/components/show-dont-do'
import { StatusChip } from '@/components/status-chip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Field, Input, NativeSelect, Textarea } from '@/components/ui/input'
import { Alert, Checkbox, Skeleton, Switch } from '@/components/ui/misc'
import { useServicePermissions } from '@/features/service/step-detail'
import { cn } from '@/lib/cn'
import { useMe } from '@/lib/auth'
import { fmtDateTime, fmtNumber, titleCase } from '@/lib/format'
import { useAppMutation } from '@/lib/query'
import { useIterations, useService, useServiceFindings, useStatement } from '@/lib/service-hooks'

export const Route = createFileRoute('/_app/engagements/$serviceId/opinion')({
  component: Opinion,
})

function Opinion() {
  const { serviceId } = Route.useParams()
  const me = useMe()
  const d = useService(serviceId)
  const its = useIterations(serviceId)
  const st = useStatement(serviceId)
  const fnd = useServiceFindings(serviceId)
  const perms = useServicePermissions(d.data)
  const [create, setCreate] = useState(false)
  if (!d.data || !its.data || st.data === undefined) return <Skeleton className="h-64" />
  const latest = its.data[0]
  const canCreate = perms.isVerifier && (d.data.myRoles.includes('verifier_team_leader') || perms.isManager) && (!latest || latest.status === 'changes_requested') && !st.data
  const blockingOpen = (fnd.data ?? []).filter((f) => f.blocking && f.status !== 'closed' && f.status !== 'withdrawn').length
  return (
    <div className="space-y-5">
      {st.data ? <StatementCard statement={st.data} serviceId={serviceId} isClientAdmin={me.org.type === 'client' && (me.role === 'client_admin' || me.role === 'client_owner')} /> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-fg text-base font-semibold">Opinion iterations</h2>
          <p className="text-fg-muted text-xs">Team leader draft → independent review → manager approval → issuance. Each iteration is a reviewable bundle.</p>
        </div>
        {canCreate ? (
          <Button onClick={() => setCreate(true)}>
            <Plus /> Prepare iteration {(latest?.iteration_no ?? 0) + 1}
          </Button>
        ) : null}
      </div>
      {blockingOpen && !st.data ? (
        <Alert tone="blocking" title={`${blockingOpen} blocking finding${blockingOpen === 1 ? '' : 's'} still open`}>
          The manager cannot approve an iteration until every CAR is closed.{' '}
          <Link to="/engagements/$serviceId/findings" params={{ serviceId }} className="underline">
            Go to findings
          </Link>
        </Alert>
      ) : null}
      {its.data.length === 0 ? (
        <EmptyState icon={<FileSignature />} title="No iteration yet" description="The team leader prepares the first opinion iteration once reporting is complete." />
      ) : (
        its.data.map((it, i) => <IterationCard key={it.id} it={it} serviceId={serviceId} defaultOpen={i === 0} perms={perms} teamLeaderId={d.data!.service.team_leader_user_id} />)
      )}
      <CreateIterationDialog open={create} onOpenChange={setCreate} serviceId={serviceId} nextNo={(latest?.iteration_no ?? 0) + 1} previous={latest ?? null} />
    </div>
  )
}

function StatementCard({ statement, serviceId, isClientAdmin }: { statement: StatementView; serviceId: string; isClientAdmin: boolean }) {
  const [pdf, setPdf] = useState(false)
  const toggle = useAppMutation((enabled: boolean) => iterations.setPublicEnabled(serviceId, enabled), { successMessage: 'Statement visibility updated.' })
  return (
    <Card className="border-success/40">
      <CardHeader
        title={
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="text-success size-5" /> Opinion issued · {titleCase(statement.opinion_type)} · {statement.level_of_assurance} assurance
          </span>
        }
        description={`Issued ${fmtDateTime(statement.issued_at)} by ${statement.issuedByName} · ${statement.standard}`}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => setPdf(true)}>
              <Download /> Statement PDF
            </Button>
            <Button size="sm" asChild>
              <Link to="/verify/$code" params={{ code: statement.public_code }} target="_blank" rel="noreferrer">
                <ExternalLink /> Public page
              </Link>
            </Button>
          </>
        }
      />
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="primary">Verification code</Badge>
          <code className="text-fg font-mono text-lg font-bold tracking-wider">{statement.public_code}</code>
          {isClientAdmin ? (
            <label className="text-fg-muted ml-auto inline-flex items-center gap-2 text-xs">
              Public verification page <Switch checked={statement.public_enabled} onCheckedChange={(v) => toggle.mutate(v)} />
            </label>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {statement.figures_json.slice(0, 4).map((f) => (
            <KpiNumber key={f.key} value={f.value} unit={f.unit} label={f.label} decimals={Number.isInteger(f.value) ? 0 : 2} />
          ))}
        </div>
        <div>
          <h4 className="text-fg-subtle mb-1 text-xs font-semibold uppercase tracking-wide">Locked documents and hashes</h4>
          <ul className="text-xs">
            {statement.hashes_json.map((h) => (
              <li key={h.sha256} className="flex items-center gap-2 py-0.5">
                <span className="text-fg flex-1 truncate">{h.filename}</span>
                <Badge tone="outline">{titleCase(h.role)}</Badge>
                <Hash value={h.sha256} />
              </li>
            ))}
          </ul>
        </div>
        <div className="text-fg-subtle text-xs">Signed by {statement.signatories_json.map((s) => `${s.name} (${s.role})`).join(' and ')}.</div>
      </CardContent>
      <ShowDontDoDialog open={pdf} onOpenChange={setPdf} title="Statement PDF" description={`${statement.serviceReference} — ${statement.public_code}.pdf`} wouldDo={['Render the same HTML as the public page to PDF on the server', 'Embed the verification code and document hashes', 'Stream it to you with a 5-minute signed link']} simulateLabel="Simulate download" onSimulate={() => toast.success('Statement PDF downloaded (simulated).')} />
    </Card>
  )
}

function IterationCard({ it, serviceId, defaultOpen, perms, teamLeaderId }: { it: IterationView; serviceId: string; defaultOpen: boolean; perms: ReturnType<typeof useServicePermissions>; teamLeaderId: string | null }) {
  const me = useMe()
  const [open, setOpen] = useState(defaultOpen)
  const [review, setReview] = useState<null | 'ir' | 'manager'>(null)
  const [issue, setIssue] = useState(false)
  const submit = useAppMutation(() => iterations.submitForIr(serviceId, it.id), { successMessage: `Iteration ${it.iteration_no} submitted for independent review.` })
  const isTl = me.user.id === teamLeaderId
  const isIr = me.user.id === it.ir_user_id || (perms.isVerifier && me.role === 'verifier_independent_reviewer')
  const banner =
    it.status === 'issued' ? ['success', 'Iteration issued as the final opinion.'] : it.status === 'approved' ? ['success', `Iteration approved by ${it.managerName}. Ready to issue.`] : it.status === 'changes_requested' ? ['danger', `Changes requested by ${it.manager_decision === 'request_changes' ? it.managerName : it.irName}: ${it.manager_decision === 'request_changes' ? it.manager_comment : it.ir_comment}`] : it.status === 'manager_review' ? ['info', `Independent review approved by ${it.irName}. Awaiting manager approval.`] : it.status === 'independent_review' ? ['info', `Submitted for independent review (${it.irName ?? 'reviewer to be assigned'}).`] : ['info', 'Draft — the team leader is assembling the bundle.']
  const grouped = (roles: string[]) => it.documents.filter((x) => roles.includes(x.role))
  return (
    <Card>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 px-5 py-4 text-left" aria-expanded={open}>
        <ChevronDown className={cn('text-fg-subtle size-4 transition-transform', open && 'rotate-180')} />
        <span className="text-fg text-base font-semibold">Iteration {it.iteration_no}</span>
        <StatusChip status={it.status} />
        <span className="text-fg-subtle ml-auto text-xs">
          {it.summary_json.opinion_type ? `${titleCase(it.summary_json.opinion_type)} · ` : ''}created by {it.createdByName} · {fmtDateTime(it.created_at)}
        </span>
      </button>
      {open ? (
        <CardContent className="space-y-5">
          <Alert tone={banner[0] as 'success' | 'danger' | 'info'}>{banner[1]}</Alert>
          {it.summary_json.narrative ? (
            <blockquote className="border-primary text-fg border-l-4 pl-3 text-sm italic">{it.summary_json.narrative}</blockquote>
          ) : null}
          {it.summary_json.figures.length ? (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {it.summary_json.figures.map((f) => (
                <div key={f.key} className="bg-surface-muted/60 rounded-md px-3 py-2 text-sm">
                  <div className="text-fg-subtle text-xs">{f.label}</div>
                  <div className="text-fg font-semibold tabular-nums">
                    {fmtNumber(f.value, Number.isInteger(f.value) ? 0 : 2)} <span className="text-fg-muted font-normal">{f.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          <DocGroup title={`VVB final service documents (${grouped(['report', 'findings_report', 'opinion', 'calc_check']).length})`} subtitle={`Team leader${it.status !== 'draft' ? ' · submitted for review' : ''}`} docs={grouped(['report', 'findings_report', 'opinion', 'calc_check'])} serviceId={serviceId} />
          {grouped(['ir_report', 'ir_checklist']).length ? <DocGroup title="Independent review" subtitle={`${it.irName} · ${it.ir_decision === 'approve' ? 'approved' : 'changes requested'} ${fmtDateTime(it.ir_decided_at)}`} docs={grouped(['ir_report', 'ir_checklist'])} serviceId={serviceId} comment={it.ir_comment} checklist={it.checklist_ir_json} /> : null}
          {grouped(['manager_checklist']).length ? <DocGroup title="Manager checklist" subtitle={`${it.managerName} · ${it.manager_decision === 'approve' ? 'approved' : 'changes requested'} ${fmtDateTime(it.manager_decided_at)}`} docs={grouped(['manager_checklist'])} serviceId={serviceId} comment={it.manager_comment} checklist={it.checklist_manager_json} /> : null}

          {perms.isVerifier ? (
            <div className="border-border flex flex-wrap gap-2 border-t pt-4">
              {it.status === 'draft' && (isTl || perms.isManager) ? (
                <Button onClick={() => submit.mutate()} loading={submit.isPending}>
                  <Send /> Submit for independent review
                </Button>
              ) : null}
              {it.status === 'independent_review' && isIr ? (
                <Button onClick={() => setReview('ir')}>
                  <CheckCircle2 /> Independent review
                </Button>
              ) : null}
              {it.status === 'manager_review' && perms.isManager ? (
                <Button onClick={() => setReview('manager')} disabled={it.blockingFindingsOpen > 0} title={it.blockingFindingsOpen ? 'Blocking findings open' : undefined}>
                  <CheckCircle2 /> Manager approval
                </Button>
              ) : null}
              {it.status === 'approved' && perms.isManager ? (
                <Button onClick={() => setIssue(true)}>
                  <ShieldCheck /> Issue opinion
                </Button>
              ) : null}
              {it.status === 'manager_review' && perms.isManager && isTl ? <span className="text-fg-subtle self-center text-xs">You are the team leader of this service and cannot approve your own opinion.</span> : null}
            </div>
          ) : null}
        </CardContent>
      ) : null}
      <ReviewDialog open={review !== null} kind={review ?? 'ir'} onOpenChange={(o) => !o && setReview(null)} serviceId={serviceId} it={it} />
      <IssuanceDialog open={issue} onOpenChange={setIssue} serviceId={serviceId} iterationId={it.id} iterationNo={it.iteration_no} />
    </Card>
  )
}

function DocGroup({ title, subtitle, docs, serviceId, comment, checklist }: { title: string; subtitle: string; docs: IterationView['documents']; serviceId: string; comment?: string | null; checklist?: ChecklistItem[] }) {
  return (
    <div>
      <h4 className="text-primary-strong text-sm font-semibold">{title}</h4>
      <p className="text-fg-subtle mb-2 text-xs">{subtitle}</p>
      {comment ? <p className="text-fg mb-2 text-sm italic">“{comment}”</p> : null}
      {checklist?.length ? (
        <ul className="mb-2 grid gap-1 sm:grid-cols-2">
          {checklist.map((c) => (
            <li key={c.key} className="text-fg-muted flex items-center gap-2 text-xs">
              {c.checked ? <CheckCircle2 className="text-success size-3.5" /> : <XCircle className="text-fg-subtle size-3.5" />} {c.label}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="space-y-1.5">
        {docs.map((x) => (
          <DocumentRow key={x.id} doc={{ ...docStub(x), locked_at: null }} serviceId={serviceId} compact />
        ))}
      </div>
    </div>
  )
}

function docStub(x: IterationView['documents'][number]) {
  const v = x.version
  return { id: v.document_id, org_id: '', service_id: null, slot_id: null, title: x.title, category: 'reporting' as const, current_version_id: v.id, locked_at: null, created_at: v.created_at, created_by: v.created_by, updated_at: v.updated_at, updated_by: v.updated_by, version: 0, deleted_at: null, current: v, versions: [v], slot: null, evidenceFor: [], serviceReference: null }
}

function ReviewDialog({ open, onOpenChange, kind, serviceId, it }: { open: boolean; onOpenChange: (o: boolean) => void; kind: 'ir' | 'manager'; serviceId: string; it: IterationView }) {
  const base = kind === 'ir' ? it.checklist_ir_json : it.checklist_manager_json
  const [checks, setChecks] = useState<Record<string, boolean>>({})
  const [comment, setComment] = useState('')
  const list = base.map((c) => ({ ...c, checked: checks[c.key] ?? c.checked }))
  const m = useAppMutation((decision: 'approve' | 'request_changes') => (kind === 'ir' ? iterations.irDecide(serviceId, it.id, decision, comment, list) : iterations.managerDecide(serviceId, it.id, decision, comment, list)), {
    successMessage: (r) => `Iteration ${r.iteration_no}: ${r.status.replace('_', ' ')}.`,
    onSuccess: () => { onOpenChange(false); setComment(''); setChecks({}) },
  })
  const allChecked = list.every((c) => c.checked)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={kind === 'ir' ? `Independent review — iteration ${it.iteration_no}` : `Manager approval — iteration ${it.iteration_no}`} description={kind === 'ir' ? 'Work through the checklist. Approving sends the iteration to the manager; requesting changes returns it to the team leader.' : 'Confirm the checklist. Approving makes the iteration ready to issue.'} size="lg">
        <ul className="space-y-2">
          {list.map((c) => (
            <li key={c.key}>
              <label className="flex items-start gap-2 text-sm">
                <Checkbox checked={c.checked} onCheckedChange={(v) => setChecks((x) => ({ ...x, [c.key]: v === true }))} className="mt-0.5" /> {c.label}
              </label>
            </li>
          ))}
        </ul>
        <Field label="Comment" className="mt-4" hint="Required when requesting changes.">
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} />
        </Field>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="ghost" onClick={() => m.mutate('request_changes')} disabled={!comment.trim()} loading={m.isPending}>
            <XCircle /> Request changes
          </Button>
          <Button onClick={() => m.mutate('approve')} disabled={!allChecked} loading={m.isPending}>
            <CheckCircle2 /> Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CreateIterationDialog({ open, onOpenChange, serviceId, nextNo, previous }: { open: boolean; onOpenChange: (o: boolean) => void; serviceId: string; nextNo: number; previous: IterationView | null }) {
  const [opinionType, setOpinionType] = useState<OpinionType>(previous?.summary_json.opinion_type ?? 'unqualified')
  const [level, setLevel] = useState<LevelOfAssurance>(previous?.summary_json.level_of_assurance ?? 'reasonable')
  const [narrative, setNarrative] = useState(previous?.summary_json.narrative ?? '')
  const [figures, setFigures] = useState<VerifiedFigure[] | null>(null)
  const list = figures ?? (previous?.summary_json.figures.length ? previous.summary_json.figures : iterations.suggestedFigures(serviceId))
  const m = useAppMutation(() => iterations.create(serviceId, { opinionType, levelOfAssurance: level, narrative, figures: list }), { successMessage: (it) => `Iteration ${it.iteration_no} created with the final service documents.`, onSuccess: () => onOpenChange(false) })
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={`Prepare iteration ${nextNo}`} description="The bundle (verification report, findings report, opinion statement, calculation checks) is created with the figures below. Verified figures default to the client's declared values; adjust them to what you verified." size="lg">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Opinion type">
            <NativeSelect value={opinionType} onChange={(e) => setOpinionType(e.target.value as OpinionType)}>
              {(['unqualified', 'qualified', 'adverse', 'disclaimer', 'validation_positive', 'validation_negative'] as OpinionType[]).map((t) => (
                <option key={t} value={t}>
                  {titleCase(t)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Level of assurance">
            <NativeSelect value={level} onChange={(e) => setLevel(e.target.value as LevelOfAssurance)}>
              <option value="reasonable">Reasonable</option>
              <option value="limited">Limited</option>
            </NativeSelect>
          </Field>
          <Field label="Opinion wording" className="sm:col-span-2">
            <Textarea value={narrative} onChange={(e) => setNarrative(e.target.value)} placeholder="The GHG statement is fairly stated, in all material respects, in accordance with…" />
          </Field>
        </div>
        <h4 className="text-fg-subtle mt-4 mb-1 text-xs font-semibold uppercase tracking-wide">Verified figures</h4>
        {list.length === 0 ? (
          <p className="text-fg-muted text-sm">No records are attached to this service; add figures manually in Phase II.</p>
        ) : (
          <ul className="space-y-1.5">
            {list.map((f, i) => (
              <li key={f.key} className="flex items-center gap-2">
                <span className="text-fg flex-1 truncate text-sm">{f.label}</span>
                <Input className="w-40 text-right tabular-nums" type="number" step="any" value={f.value} onChange={(e) => setFigures(list.map((x, j) => (j === i ? { ...x, value: Number(e.target.value) } : x)))} />
                <span className="text-fg-subtle w-20 text-xs">{f.unit}</span>
              </li>
            ))}
          </ul>
        )}
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => m.mutate()} loading={m.isPending} disabled={!narrative.trim()}>
            <Plus /> Create iteration {nextNo}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
