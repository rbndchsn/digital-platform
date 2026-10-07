/**
 * Opinion tab (PRD §6.5, §7.2; v0.3 §6.16–6.19): iterations with the aggregation panel and the inconsistency warning,
 * independent review and manager decision with acknowledgement and eligibility, issuance, the statement card with
 * its status and level of assurance, statement history, post-issuance events and the client's appeal entry point.
 */
import { Link, createFileRoute } from '@tanstack/react-router'
import { CheckCircle2, ChevronDown, Download, ExternalLink, FileSignature, History, Plus, RotateCcw, Send, ShieldCheck, ShieldOff, XCircle } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { iterations } from '@/api'
import type { IterationView, StatementView } from '@/api/iterations'
import type { OpinionType } from '@/domain/enums'
import { ASSERTION_BASE_LABELS, WITHDRAWAL_PUBLIC_CATEGORY_LABELS } from '@/domain/enums'
import type { ChecklistItem, VerifiedFigure } from '@/domain/schemas'
import { AppealButton } from '@/components/appeal-button'
import { AssuranceBadge } from '@/components/assurance-badge'
import { DocumentRow } from '@/components/document-row'
import { EligibilityNotice } from '@/components/eligibility-notice'
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
import { AggregationPanel, MaterialityWarningBanner, MisstatementLink } from '@/features/service/materiality'
import { useServicePermissions } from '@/features/service/permissions'
import { PostIssuancePanel } from '@/features/service/post-issuance'
import { cn } from '@/lib/cn'
import { useMe } from '@/lib/auth'
import { fmtDateTime, fmtNumber, titleCase } from '@/lib/format'
import { useAppMutation } from '@/lib/query'
import { useIterations, useMisstatements, useService, useServiceFindings, useStatement, useStatements } from '@/lib/service-hooks'

export const Route = createFileRoute('/_app/engagements/$serviceId/opinion')({
  component: Opinion,
})

const OPINION_TYPES: OpinionType[] = ['unqualified', 'qualified', 'adverse', 'disclaimer', 'validation_positive', 'validation_negative']

function Opinion() {
  const { serviceId } = Route.useParams()
  const me = useMe()
  const d = useService(serviceId)
  const its = useIterations(serviceId)
  const st = useStatement(serviceId)
  const history = useStatements(serviceId)
  const fnd = useServiceFindings(serviceId)
  const mis = useMisstatements(serviceId)
  const perms = useServicePermissions(d.data)
  const [create, setCreate] = useState(false)
  if (!d.data || !its.data || st.data === undefined) return <Skeleton className="h-64" />
  const svc = d.data.service
  const latest = its.data[0]
  const noOpenIteration = !latest || latest.status === 'changes_requested' || latest.status === 'issued'
  const issuedBlocks = st.data?.status === 'issued' && svc.status !== 'in_revision'
  const canCreate = perms.canPrepareIteration && noOpenIteration && !issuedBlocks
  const blockingOpen = (fnd.data ?? []).filter((f) => f.blocking && f.status !== 'closed' && f.status !== 'withdrawn').length
  const assuranceApplies = d.data.assuranceApplies
  return (
    <div className="space-y-5">
      {svc.status === 'in_revision' ? (
        <Alert tone="warning" icon={<RotateCcw />} title="Revision in progress">
          A post-issuance event reopened this opinion. Statement {st.data?.public_code} stays valid until the replacement is issued. Every team member re-confirms their conflict-of-interest declaration, the team prepares a new iteration, and the decision needs a manager outside the involved set of both cycles.
        </Alert>
      ) : null}
      {st.data ? <StatementCard statement={st.data} serviceId={serviceId} isClientAdmin={me.org.type === 'client' && (me.role === 'client_admin' || me.role === 'client_owner')} /> : null}
      {history.data && history.data.length > 1 ? <StatementHistory statements={history.data} /> : null}
      {st.data || (history.data?.length ?? 0) > 0 ? <PostIssuancePanel serviceId={serviceId} statement={st.data} canOpen={perms.canOpenPostIssuance} /> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-fg text-base font-semibold">Opinion iterations</h2>
          <p className="text-fg-muted text-xs">Team leader draft → independent review → manager decision (outside the involved set) → issuance. Each iteration is a reviewable bundle with its aggregation panel.</p>
          {assuranceApplies && mis.data ? (
            <div className="mt-1">
              <MisstatementLink serviceId={serviceId} count={mis.data.length} proposed={mis.data.filter((m) => m.status === 'proposed').length} />
            </div>
          ) : null}
        </div>
        {canCreate ? (
          <Button onClick={() => setCreate(true)}>
            <Plus /> Prepare iteration {(latest?.iteration_no ?? 0) + 1}
          </Button>
        ) : null}
      </div>
      {blockingOpen && !issuedBlocks ? (
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
        its.data.map((it, i) => <IterationCard key={it.id} it={it} serviceId={serviceId} defaultOpen={i === 0} perms={perms} assuranceApplies={assuranceApplies} />)
      )}
      <CreateIterationDialog open={create} onOpenChange={setCreate} serviceId={serviceId} nextNo={(latest?.iteration_no ?? 0) + 1} previous={latest ?? null} level={svc.level_of_assurance} revisionOf={svc.status === 'in_revision' ? (st.data?.public_code ?? null) : null} />
    </div>
  )
}

function StatementCard({ statement, serviceId, isClientAdmin }: { statement: StatementView; serviceId: string; isClientAdmin: boolean }) {
  const [pdf, setPdf] = useState(false)
  const toggle = useAppMutation((enabled: boolean) => iterations.setPublicEnabled(serviceId, enabled), { successMessage: 'Statement visibility updated. A superseded or withdrawn banner always stays visible.' })
  const status = statement.status
  const tone = status === 'issued' ? 'border-success/40' : status === 'withdrawn' ? 'border-danger/50' : 'border-warning/50'
  const m = statement.materiality_json
  const ms = statement.misstatement_summary_json
  const fmt = (n: number) => fmtNumber(n, Math.abs(n) < 10 ? 3 : 0)
  return (
    <Card className={tone} data-testid="statement-card" data-statement-status={status}>
      <CardHeader
        title={
          <span className="inline-flex flex-wrap items-center gap-2">
            {status === 'withdrawn' ? <ShieldOff className="text-danger size-5" /> : <ShieldCheck className={cn('size-5', status === 'issued' ? 'text-success' : 'text-warning')} />}
            {status === 'issued' ? 'Opinion issued' : status === 'superseded' ? 'Statement superseded' : 'Statement withdrawn'} · {titleCase(statement.opinion_type)}
            <StatusChip status={status} />
            <AssuranceBadge level={statement.level_of_assurance} status={status === 'issued' ? null : status} />
          </span>
        }
        description={`Issued ${fmtDateTime(statement.issued_at)} by ${statement.issuedByName} · ${statement.standard}`}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => setPdf(true)}>
              <Download /> Statement PDF
            </Button>
            <Button size="sm" variant={status === 'issued' ? 'default' : 'secondary'} asChild>
              <Link to="/verify/$code" params={{ code: statement.public_code }} target="_blank" rel="noreferrer">
                <ExternalLink /> Public page
              </Link>
            </Button>
          </>
        }
      />
      <CardContent className="space-y-4">
        {status === 'superseded' ? (
          <Alert tone="warning" title={`Superseded on ${fmtDateTime(statement.superseded_at)}`}>
            {statement.supersededByCode ? (
              <>
                Replaced by statement{' '}
                <Link to="/verify/$code" params={{ code: statement.supersededByCode }} className="font-semibold underline">
                  {statement.supersededByCode}
                </Link>
                . The records now point to the replacement; this code still resolves with a banner.
              </>
            ) : (
              'Replaced by a later statement.'
            )}
          </Alert>
        ) : null}
        {status === 'withdrawn' ? (
          <Alert tone="danger" title={`Withdrawn on ${fmtDateTime(statement.withdrawn_at)} by ${statement.withdrawnByName ?? 'VERIFASSUR'}`}>
            Public reason category: <span className="font-semibold">{statement.withdrawal_public_category ? WITHDRAWAL_PUBLIC_CATEGORY_LABELS[statement.withdrawal_public_category] : 'Other'}</span>.{statement.withdrawal_reason ? ` ${statement.withdrawal_reason}` : ''} Every record that relied on it shows “assurance withdrawn”; verified figures stay readable in the history, nothing is deleted.
          </Alert>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="primary">Verification code</Badge>
          <code className="text-fg font-mono text-lg font-bold tracking-wider">{statement.public_code}</code>
          {isClientAdmin && status === 'issued' ? (
            <label className="text-fg-muted ml-auto inline-flex items-center gap-2 text-xs">
              Public verification page <Switch checked={statement.public_enabled} onCheckedChange={(v) => toggle.mutate(v)} aria-label="Public verification page" />
            </label>
          ) : null}
        </div>
        {m ? (
          <p className="text-fg-muted text-sm" data-testid="statement-materiality">
            Materiality {m.threshold_pct} % of {ASSERTION_BASE_LABELS[m.assertion_base].toLowerCase()}
            {m.threshold_abs != null ? ` (${fmt(m.threshold_abs)} ${m.unit})` : ''} · {m.basis === 'programme_rule' ? 'programme rule' : 'verifier judgement'}
            {ms ? ` · uncorrected misstatements: gross ${fmt(ms.gross)} ${ms.unit}${ms.gross_pct != null ? ` (${ms.gross_pct} %)` : ''}, net ${fmt(ms.net)} ${ms.unit}, ${ms.confirmed_count} confirmed, ${ms.corrected_count} corrected${ms.warning ? ' · inconsistency warning acknowledged by the reviewer and the decision-maker' : ''}` : ''}
          </p>
        ) : null}
        {statement.figures_json.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {statement.figures_json.slice(0, 4).map((f) => (
              <KpiNumber key={f.key} value={f.value} unit={f.unit} label={f.label} decimals={Number.isInteger(f.value) ? 0 : 2} tone={status === 'issued' ? 'primary' : 'fg'} />
            ))}
          </div>
        ) : null}
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-fg-subtle text-xs">Signed by {statement.signatories_json.map((s) => `${s.name} (${s.role})`).join(' and ')}.</div>
          {status === 'issued' ? <AppealButton serviceId={serviceId} decisionEntityType="opinion_statement" decisionEntityId={statement.id} subject={`Opinion ${statement.public_code} (${titleCase(statement.opinion_type)})`} /> : null}
        </div>
      </CardContent>
      <ShowDontDoDialog open={pdf} onOpenChange={setPdf} title="Statement PDF" description={`${statement.serviceReference} — ${statement.public_code}.pdf`} wouldDo={['Render the same HTML as the public page to PDF on the server', 'Embed the verification code, level of assurance, materiality and document hashes', 'Stream it to you with a 5-minute signed link']} simulateLabel="Simulate download" onSimulate={() => toast.success('Statement PDF downloaded (simulated).')} />
    </Card>
  )
}

function StatementHistory({ statements }: { statements: StatementView[] }) {
  return (
    <Card>
      <CardHeader title={<span className="inline-flex items-center gap-2"><History className="size-4" /> Statement history</span>} description="Every statement issued on this service, newest first. Superseded and withdrawn codes keep resolving on the public page with a banner." />
      <CardContent>
        <ul className="divide-border divide-y text-sm">
          {statements.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-2 py-2">
              <code className="font-mono font-semibold">{s.public_code}</code>
              <StatusChip status={s.status} />
              <AssuranceBadge level={s.level_of_assurance} status={s.status === 'issued' ? null : s.status} />
              <span className="text-fg-muted text-xs">
                {titleCase(s.opinion_type)} · issued {fmtDateTime(s.issued_at)} by {s.issuedByName}
                {s.status === 'superseded' && s.supersededByCode ? ` · superseded ${fmtDateTime(s.superseded_at)} by ${s.supersededByCode}` : ''}
                {s.status === 'withdrawn' ? ` · withdrawn ${fmtDateTime(s.withdrawn_at)}` : ''}
              </span>
              <Link to="/verify/$code" params={{ code: s.public_code }} className="text-primary ml-auto text-xs font-semibold hover:underline">
                Public page
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function IterationCard({ it, serviceId, defaultOpen, perms, assuranceApplies }: { it: IterationView; serviceId: string; defaultOpen: boolean; perms: ReturnType<typeof useServicePermissions>; assuranceApplies: boolean }) {
  const me = useMe()
  const [open, setOpen] = useState(defaultOpen)
  const [review, setReview] = useState<null | 'ir' | 'manager'>(null)
  const [issue, setIssue] = useState(false)
  const submit = useAppMutation(() => iterations.submitForIr(serviceId, it.id), { successMessage: (r) => `Iteration ${r.iteration_no} submitted for independent review.${r.materiality_warning ? ' The aggregation snapshot raised the inconsistency warning.' : ''}` })
  const setType = useAppMutation((t: OpinionType) => iterations.setDraftOpinionType(serviceId, it.id, t), { successMessage: 'Draft opinion type updated; the aggregation panel re-evaluates the consistency check.' })
  const isIr = me.user.id === it.ir_user_id || (perms.isVerifier && me.role === 'verifier_independent_reviewer')
  const banner =
    it.status === 'issued' ? ['success', 'Iteration issued as the final opinion.'] : it.status === 'approved' ? ['success', `Iteration approved by ${it.managerName} (outside the involved set). Ready to issue.`] : it.status === 'changes_requested' ? ['danger', `Changes requested by ${it.manager_decision === 'request_changes' ? it.managerName : it.irName}: ${it.manager_decision === 'request_changes' ? it.manager_comment : it.ir_comment}`] : it.status === 'manager_review' ? ['info', `Independent review approved by ${it.irName}. Awaiting the manager decision by someone outside the involved set.`] : it.status === 'independent_review' ? ['info', `Submitted for independent review (${it.irName ?? 'reviewer to be assigned'}).${it.returned_to_ir_count ? ` Returned to review ${it.returned_to_ir_count} time${it.returned_to_ir_count === 1 ? '' : 's'} after a verified-value edit.` : ''}`] : ['info', 'Draft — the team leader is assembling the bundle.']
  const grouped = (roles: string[]) => it.documents.filter((x) => roles.includes(x.role))
  const decisionBlocked = !it.decision.allowed && it.decision.code === 'decision_maker_conflict'
  return (
    <Card data-testid={`iteration-${it.iteration_no}`}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full flex-wrap items-center gap-3 px-5 py-4 text-left" aria-expanded={open}>
        <ChevronDown className={cn('text-fg-subtle size-4 transition-transform', open && 'rotate-180')} />
        <span className="text-fg text-base font-semibold">Iteration {it.iteration_no}</span>
        <StatusChip status={it.status} />
        {it.revisionOfCode ? <Badge tone="warning">Revision of {it.revisionOfCode}</Badge> : null}
        {it.materiality_warning ? <Badge tone="warning">Materiality warning</Badge> : null}
        <span className="text-fg-subtle ml-auto text-xs">
          {it.summary_json.opinion_type ? `${titleCase(it.summary_json.opinion_type)} · ` : ''}created by {it.createdByName} · {fmtDateTime(it.created_at)}
        </span>
      </button>
      {open ? (
        <CardContent className="space-y-5">
          <Alert tone={banner[0] as 'success' | 'danger' | 'info'}>{banner[1]}</Alert>
          {it.summary_json.narrative ? <blockquote className="border-primary text-fg border-l-4 pl-3 text-sm italic">{it.summary_json.narrative}</blockquote> : null}
          {it.status === 'draft' && perms.canPrepareIteration ? (
            <Field label="Draft opinion type" hint="The aggregation panel compares the uncorrected misstatements with this type; an unqualified draft above materiality raises the warning.">
              <NativeSelect className="w-64" value={it.summary_json.opinion_type ?? 'unqualified'} onChange={(e) => setType.mutate(e.target.value as OpinionType)} disabled={setType.isPending}>
                {OPINION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {titleCase(t)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
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
          {assuranceApplies ? (
            <>
              <AggregationPanel agg={it.aggregation} snapshot={it.aggregation_json} draftOpinionType={it.summary_json.opinion_type} qualitative={it.aggregation.qualitative} />
              <MaterialityWarningBanner agg={it.materiality_warning ? { ...it.aggregation, warning: true, warning_reason: it.aggregation.warning_reason ?? it.aggregation_json?.warning_reason ?? 'Aggregated uncorrected misstatements meet or exceed materiality while the draft opinion is unqualified.' } : it.aggregation} ackIr={it.materiality_ack_ir_json ? { name: it.ackIrName ?? '', at: it.materiality_ack_ir_json.at, comment: it.materiality_ack_ir_json.comment } : null} ackManager={it.materiality_ack_manager_json ? { name: it.ackManagerName ?? '', at: it.materiality_ack_manager_json.at, comment: it.materiality_ack_manager_json.comment } : null} />
            </>
          ) : null}
          <DocGroup title={`VVB final service documents (${grouped(['report', 'findings_report', 'opinion', 'calc_check']).length})`} subtitle={`Team leader${it.status !== 'draft' ? ' · submitted for review' : ''}`} docs={grouped(['report', 'findings_report', 'opinion', 'calc_check'])} serviceId={serviceId} />
          {grouped(['ir_report', 'ir_checklist']).length ? <DocGroup title="Independent review" subtitle={`${it.irName} · ${it.ir_decision === 'approve' ? 'approved' : 'changes requested'} ${fmtDateTime(it.ir_decided_at)}`} docs={grouped(['ir_report', 'ir_checklist'])} serviceId={serviceId} comment={it.ir_comment} checklist={it.checklist_ir_json} /> : null}
          {grouped(['manager_checklist']).length ? <DocGroup title="Manager decision" subtitle={`${it.managerName} · ${it.manager_decision === 'approve' ? 'approved' : 'changes requested'} ${fmtDateTime(it.manager_decided_at)}`} docs={grouped(['manager_checklist'])} serviceId={serviceId} comment={it.manager_comment} checklist={it.checklist_manager_json} /> : null}

          {perms.isVerifier && !perms.readOnly ? (
            <div className="border-border space-y-3 border-t pt-4">
              <div className="flex flex-wrap gap-2">
                {it.status === 'draft' && perms.canPrepareIteration ? (
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
                  <Button onClick={() => setReview('manager')} disabled={it.blockingFindingsOpen > 0 || decisionBlocked} title={it.blockingFindingsOpen ? 'Blocking findings open' : decisionBlocked ? 'You are in the involved set of this service' : undefined} data-testid="manager-decision">
                    <CheckCircle2 /> Manager decision
                  </Button>
                ) : null}
                {it.status === 'approved' && perms.isManager ? (
                  <Button onClick={() => setIssue(true)} disabled={decisionBlocked} title={decisionBlocked ? 'You are in the involved set of this service' : undefined}>
                    <ShieldCheck /> Issue opinion
                  </Button>
                ) : null}
              </div>
              {(it.status === 'manager_review' || it.status === 'approved') && perms.isManager ? <EligibilityNotice e={it.decision} what={it.status === 'approved' ? 'issue this opinion' : 'decide this iteration'} /> : null}
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

/** IR and manager decision dialogs (PRD FR-33, FR-34; v0.3 FR-87: the materiality item needs an acknowledgement comment when the warning is raised). */
function ReviewDialog({ open, onOpenChange, kind, serviceId, it }: { open: boolean; onOpenChange: (o: boolean) => void; kind: 'ir' | 'manager'; serviceId: string; it: IterationView }) {
  const base = kind === 'ir' ? it.checklist_ir_json : it.checklist_manager_json
  const [checks, setChecks] = useState<Record<string, boolean>>({})
  const [comment, setComment] = useState('')
  const [ack, setAck] = useState('')
  const warning = it.materiality_warning || it.aggregation.warning
  const ackOk = !warning || ack.trim().length > 0
  const list = base.map((c) => ({ ...c, checked: c.key === iterations.MATERIALITY_CHECKLIST_KEY && !ackOk ? false : (checks[c.key] ?? c.checked) }))
  const m = useAppMutation((decision: 'approve' | 'request_changes') => (kind === 'ir' ? iterations.irDecide(serviceId, it.id, decision, comment, list, warning ? ack : null) : iterations.managerDecide(serviceId, it.id, decision, comment, list, warning ? ack : null)), {
    successMessage: (r) => `Iteration ${r.iteration_no}: ${r.status.replace('_', ' ')}.${warning ? ' Your acknowledgement of the materiality warning was recorded.' : ''}`,
    onSuccess: () => { onOpenChange(false); setComment(''); setChecks({}); setAck('') },
  })
  const allChecked = list.every((c) => c.checked)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={kind === 'ir' ? `Independent review — iteration ${it.iteration_no}` : `Manager decision — iteration ${it.iteration_no}`} description={kind === 'ir' ? 'Work through the checklist. Approving sends the iteration to the manager; requesting changes returns it to the team leader.' : 'Confirm the checklist. Approving makes the iteration ready to issue; you are outside the involved set of this service.'} size="lg">
        {warning ? (
          <div className="mb-4 space-y-3">
            <AggregationPanel agg={it.aggregation_json ?? it.aggregation} draftOpinionType={it.summary_json.opinion_type} title="Aggregate at submission versus materiality" />
            <MaterialityWarningBanner agg={{ ...(it.aggregation_json ?? it.aggregation), warning: true, warning_reason: it.aggregation_json?.warning_reason ?? it.aggregation.warning_reason ?? 'Aggregated uncorrected misstatements meet or exceed materiality while the draft opinion is unqualified.' }} />
            <Field label="Acknowledgement comment" required hint="Required to tick the materiality item and to decide. Stored with your name and time; shown in the Service Log and on the statement's misstatement summary.">
              <Textarea value={ack} onChange={(e) => setAck(e.target.value)} placeholder="e.g. The understatement is confirmed and material; I nevertheless consider the draft opinion appropriate because…" data-testid="materiality-ack" />
            </Field>
          </div>
        ) : null}
        <ul className="space-y-2">
          {list.map((c) => {
            const isMateriality = c.key === iterations.MATERIALITY_CHECKLIST_KEY
            return (
              <li key={c.key}>
                <label className={cn('flex items-start gap-2 text-sm', isMateriality && !ackOk && 'opacity-60')}>
                  <Checkbox checked={c.checked} disabled={isMateriality && !ackOk} onCheckedChange={(v) => setChecks((x) => ({ ...x, [c.key]: v === true }))} className="mt-0.5" /> {c.label}
                  {isMateriality && warning ? <Badge tone="warning">acknowledgement required</Badge> : null}
                </label>
              </li>
            )
          })}
        </ul>
        <Field label="Comment" className="mt-4" hint="Required when requesting changes.">
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} />
        </Field>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="ghost" onClick={() => m.mutate('request_changes')} disabled={!comment.trim() || !ackOk} loading={m.isPending}>
            <XCircle /> Request changes
          </Button>
          <Button onClick={() => m.mutate('approve')} disabled={!allChecked || !ackOk} loading={m.isPending}>
            <CheckCircle2 /> Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CreateIterationDialog({ open, onOpenChange, serviceId, nextNo, previous, level, revisionOf }: { open: boolean; onOpenChange: (o: boolean) => void; serviceId: string; nextNo: number; previous: IterationView | null; level: StatementView['level_of_assurance']; revisionOf: string | null }) {
  const [opinionType, setOpinionType] = useState<OpinionType>(previous?.summary_json.opinion_type ?? 'unqualified')
  const [narrative, setNarrative] = useState(previous?.summary_json.narrative ?? '')
  const [figures, setFigures] = useState<VerifiedFigure[] | null>(null)
  const list = figures ?? (previous?.summary_json.figures.length ? previous.summary_json.figures : iterations.suggestedFigures(serviceId))
  const m = useAppMutation(() => iterations.create(serviceId, { opinionType, narrative, figures: list }), { successMessage: (it) => `Iteration ${it.iteration_no} created with the final service documents.${it.revisionOfCode ? ` It revises statement ${it.revisionOfCode}.` : ''}`, onSuccess: () => onOpenChange(false) })
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={`Prepare iteration ${nextNo}${revisionOf ? ` (revision of ${revisionOf})` : ''}`} description="The bundle (verification report, findings report, opinion statement, calculation checks) is created with the figures below. Verified figures default to the records' verified or declared values." size="lg">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Draft opinion type">
            <NativeSelect value={opinionType} onChange={(e) => setOpinionType(e.target.value as OpinionType)}>
              {OPINION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {titleCase(t)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <div>
            <div className="text-fg mb-1 block text-sm font-medium">Level of assurance</div>
            <div className="flex h-9 items-center">
              <AssuranceBadge level={level} />
            </div>
            <p className="text-fg-subtle text-xs">A service attribute fixed at contracting (PRD FR-81), not chosen per iteration.</p>
          </div>
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
                <Input className="w-40 text-right tabular-nums" type="number" step="any" value={f.value} onChange={(e) => setFigures(list.map((x, j) => (j === i ? { ...x, value: Number(e.target.value) } : x)))} aria-label={f.label} />
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
