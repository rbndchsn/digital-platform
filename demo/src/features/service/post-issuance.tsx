/**
 * Post-issuance events (PRD v0.3 §6.19, FR-88–FR-90): a manager opens an event on an issued statement; a manager
 * outside the involved set decides no action, revision or withdrawal; external notification is recorded, not sent.
 */
import { Link } from '@tanstack/react-router'
import { AlertTriangle, ExternalLink, FileWarning, Gavel, Paperclip, Send } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { cases, postIssuance } from '@/api'
import type { StatementView } from '@/api/iterations'
import type { PostIssuanceView } from '@/api/post-issuance'
import type { PostIssuanceOutcome, PostIssuanceTrigger, WithdrawalPublicCategory } from '@/domain/enums'
import { POST_ISSUANCE_TRIGGERS, WITHDRAWAL_PUBLIC_CATEGORIES, WITHDRAWAL_PUBLIC_CATEGORY_LABELS } from '@/domain/enums'
import { EligibilityNotice } from '@/components/eligibility-notice'
import { ShowDontDoDialog } from '@/components/show-dont-do'
import { StatusChip } from '@/components/status-chip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Field, Input, NativeSelect, Textarea } from '@/components/ui/input'
import { Alert, Checkbox } from '@/components/ui/misc'
import { fmtDateTime, titleCase } from '@/lib/format'
import { useAppMutation } from '@/lib/query'
import { useEligibility, usePostIssuanceEvents, useServiceDocuments } from '@/lib/service-hooks'

const TRIGGER_LABELS: Record<PostIssuanceTrigger, string> = { verifier: 'Found by VERIFASSUR', client: 'Reported by the client', complaint: 'Complaint', appeal: 'Appeal', programme: 'Programme or registry', other: 'Other' }

export function PostIssuancePanel({ serviceId, statement, canOpen, className }: { serviceId: string; statement: StatementView | null; canOpen: boolean; className?: string }) {
  const q = usePostIssuanceEvents(serviceId)
  const [open, setOpen] = useState(false)
  const [decide, setDecide] = useState<PostIssuanceView | null>(null)
  const [notify, setNotify] = useState<PostIssuanceView | null>(null)
  const events = q.data ?? []
  const hasOpen = events.some((e) => e.status === 'open')
  if (!statement && events.length === 0) return null
  return (
    <Card className={className} data-testid="post-issuance-panel">
      <CardHeader
        title={
          <span className="inline-flex items-center gap-2">
            <FileWarning className="size-4" /> Post-issuance events
            {hasOpen ? <Badge tone="warning">Under review</Badge> : null}
          </span>
        }
        description="New facts after issuance are recorded as an event; a manager outside the involved set decides no action, a revision or a withdrawal. Nothing is deleted; the public page shows the outcome."
        actions={canOpen && statement?.status === 'issued' && !hasOpen ? <Button size="sm" variant="secondary" onClick={() => setOpen(true)}><FileWarning /> Open post-issuance event</Button> : null}
      />
      <CardContent>
        {events.length === 0 ? (
          <p className="text-fg-muted text-sm">No post-issuance event on this service.</p>
        ) : (
          <ul className="divide-border divide-y">
            {events.map((ev) => (
              <li key={ev.id} className="py-3" data-event-status={ev.status}>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusChip status={ev.status} label={ev.status === 'open' ? 'Open · under review' : ev.status === 'decided' ? `Decided · ${ev.outcome?.replace('_', ' ')}` : `Closed · ${ev.outcome?.replace('_', ' ')}`} />
                  <Badge tone="outline">{TRIGGER_LABELS[ev.trigger]}</Badge>
                  <span className="text-fg-subtle text-xs">
                    on statement <code className="font-mono">{ev.statementCode}</code> · opened by {ev.openedByName} · {fmtDateTime(ev.opened_at)}
                  </span>
                </div>
                <p className="text-fg mt-1 text-sm">{ev.description}</p>
                {ev.caseSubject ? <p className="text-fg-subtle text-xs">Linked case: {ev.caseSubject}</p> : null}
                {ev.evidence_json.length ? <p className="text-fg-subtle text-xs">{ev.evidence_json.length} evidence document{ev.evidence_json.length === 1 ? '' : 's'} attached</p> : null}
                {ev.decided_at ? (
                  <p className="text-fg-muted mt-1 text-xs">
                    Decided by {ev.decidedByName} (outside the involved set) on {fmtDateTime(ev.decided_at)}: <span className="font-semibold">{ev.outcome?.replace('_', ' ')}</span>
                    {ev.decision_reason ? ` — ${ev.decision_reason}` : ''}
                    {ev.outcome === 'revise' && ev.replacementCode ? (
                      <>
                        {' '}
                        · replacement statement{' '}
                        <Link to="/verify/$code" params={{ code: ev.replacementCode }} className="text-primary font-semibold hover:underline">
                          {ev.replacementCode}
                        </Link>
                      </>
                    ) : ev.outcome === 'revise' ? ' · the team re-confirms COI and prepares the revision iteration' : null}
                  </p>
                ) : null}
                {ev.external_notification_json ? (
                  <p className="text-fg-muted mt-1 text-xs">
                    <ExternalLink className="mr-1 inline size-3" /> External notification recorded: {ev.external_notification_json.to} · {ev.external_notification_json.how} · {fmtDateTime(ev.external_notification_json.when)}
                  </p>
                ) : null}
                {canOpen ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {ev.status === 'open' ? (
                      <Button size="sm" onClick={() => setDecide(ev)} disabled={!ev.canDecide} title={ev.canDecide ? undefined : 'You are in the involved set of this service'}>
                        <Gavel /> Decide
                      </Button>
                    ) : null}
                    {ev.status === 'open' && !ev.canDecide ? <span className="text-warning self-center text-xs">You are in the involved set; eligible: {ev.eligibleManagers.join(', ') || 'none'}.</span> : null}
                    {!ev.external_notification_json && ev.status !== 'open' && ev.outcome !== 'no_action' ? (
                      <Button size="sm" variant="secondary" onClick={() => setNotify(ev)}>
                        <Send /> Record external notification
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      {open && statement ? <OpenEventDialog serviceId={serviceId} statement={statement} onClose={() => setOpen(false)} /> : null}
      {decide ? <DecideDialog serviceId={serviceId} ev={decide} onClose={() => setDecide(null)} /> : null}
      <ExternalNotificationDialog ev={notify} onClose={() => setNotify(null)} />
    </Card>
  )
}

function OpenEventDialog({ serviceId, statement, onClose }: { serviceId: string; statement: StatementView; onClose: () => void }) {
  const docs = useServiceDocuments(serviceId)
  const linked = useQuery({ queryKey: ['cases', 'all', 'open'], queryFn: () => cases.listAll({ status: 'open' }), retry: false })
  const [trigger, setTrigger] = useState<PostIssuanceTrigger>('verifier')
  const [description, setDescription] = useState('')
  const [caseId, setCaseId] = useState('')
  const [evidence, setEvidence] = useState<string[]>([])
  const [picker, setPicker] = useState(false)
  const [picked, setPicked] = useState<Record<string, boolean>>({})
  const m = useAppMutation(() => postIssuance.open(statement.id, { trigger, description, evidenceVersionIds: evidence, caseId: caseId || null }), {
    successMessage: `Post-issuance event opened on ${statement.public_code}; the client, the team and the other managers were notified.`,
    onSuccess: onClose,
  })
  const versions = (docs.data ?? []).filter((d) => d.current).map((d) => ({ id: d.current!.id, name: d.current!.filename }))
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={`Open a post-issuance event on ${statement.public_code}`} description="The statement stays valid until a decision is taken. The client's records show “under review” while the event is open." size="lg">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Trigger" required>
            <NativeSelect value={trigger} onChange={(e) => setTrigger(e.target.value as PostIssuanceTrigger)}>
              {POST_ISSUANCE_TRIGGERS.map((t) => (
                <option key={t} value={t}>
                  {TRIGGER_LABELS[t]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Linked complaint or appeal" hint={linked.isError ? 'Not available for your role.' : undefined}>
            <NativeSelect value={caseId} onChange={(e) => setCaseId(e.target.value)}>
              <option value="">None</option>
              {(linked.data ?? []).filter((c) => !c.service_id || c.service_id === serviceId).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.kind}: {c.subject}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="What was discovered" required className="sm:col-span-2">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Facts, source and which figures are affected." />
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setPicker(true)}>
            <Paperclip /> Attach evidence
          </Button>
          <span className="text-fg-subtle text-xs">{evidence.length ? `${evidence.length} document${evidence.length === 1 ? '' : 's'} selected` : 'No evidence attached yet (optional).'}</span>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => m.mutate()} loading={m.isPending} disabled={!description.trim()}>
            <FileWarning /> Open event
          </Button>
        </DialogFooter>
      </DialogContent>
      <ShowDontDoDialog open={picker} onOpenChange={setPicker} title="Attach evidence" description="Pick documents already on this engagement or add new ones." wouldDo={['Open the evidence vault picker with upload', 'Link each chosen version to the event with its hash', 'Record the links in the Service Log']} simulateLabel="Attach selected" onSimulate={() => setEvidence(Object.entries(picked).filter(([, v]) => v).map(([k]) => k))}>
        <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
          {versions.map((v) => (
            <li key={v.id}>
              <label className="flex items-center gap-2">
                <Checkbox checked={Boolean(picked[v.id])} onCheckedChange={(c) => setPicked((p) => ({ ...p, [v.id]: c === true }))} /> {v.name}
              </label>
            </li>
          ))}
          {versions.length === 0 ? <li className="text-fg-muted">No documents on this engagement.</li> : null}
        </ul>
      </ShowDontDoDialog>
    </Dialog>
  )
}

function DecideDialog({ serviceId, ev, onClose }: { serviceId: string; ev: PostIssuanceView; onClose: () => void }) {
  const [outcome, setOutcome] = useState<PostIssuanceOutcome>('revise')
  const [reason, setReason] = useState('')
  const [category, setCategory] = useState<WithdrawalPublicCategory>('error_in_statement')
  const eligibility = useEligibility(serviceId, outcome === 'withdraw' ? 'statement.withdraw_decide' : 'statement.revise_decide')
  const m = useAppMutation(() => postIssuance.decideEvent(ev.id, { outcome, reason, publicCategory: outcome === 'withdraw' ? category : null }), {
    successMessage: (r) => (r.outcome === 'withdraw' ? `Statement ${r.statementCode} withdrawn; the records now show “assurance withdrawn” and the public page carries the notice.` : r.outcome === 'revise' ? `Revision of ${r.statementCode} opened: the team re-confirms conflicts of interest and prepares a new iteration.` : 'Event closed with no action.'),
    onSuccess: onClose,
  })
  const blocked = eligibility.data ? !eligibility.data.allowed : false
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={`Decide the post-issuance event on ${ev.statementCode}`} description="The decision needs a manager outside the involved set of the service (PRD FR-79). A withdrawal is final; a revision re-runs the whole chain with a fresh involved set." size="md">
        <EligibilityNotice e={eligibility.data} what="decide this event" className="mb-3" />
        <fieldset className="space-y-2">
          <legend className="text-fg mb-1 text-sm font-medium">Outcome</legend>
          {(['no_action', 'revise', 'withdraw'] as PostIssuanceOutcome[]).map((o) => (
            <label key={o} className="flex items-start gap-2 text-sm">
              <input type="radio" name="outcome" value={o} checked={outcome === o} onChange={() => setOutcome(o)} className="mt-1" />
              <span>
                <span className="font-medium">{o === 'no_action' ? 'No action' : o === 'revise' ? 'Revise the opinion' : 'Withdraw the statement'}</span>
                <span className="text-fg-muted block text-xs">{o === 'no_action' ? 'The statement stands; the event is closed with your reason.' : o === 'revise' ? 'Service goes to “in revision”, every COI is re-confirmed, records return under verification, a new iteration runs through IR and a decision outside the involved set.' : 'The statement is withdrawn now; every record that relied on it shows “assurance withdrawn”; the public page shows the reason category.'}</span>
              </span>
            </label>
          ))}
        </fieldset>
        {outcome === 'withdraw' ? (
          <Field label="Public reason category (shown on the verification page)" required className="mt-3">
            <NativeSelect value={category} onChange={(e) => setCategory(e.target.value as WithdrawalPublicCategory)}>
              {WITHDRAWAL_PUBLIC_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {WITHDRAWAL_PUBLIC_CATEGORY_LABELS[c]}
                </option>
              ))}
            </NativeSelect>
          </Field>
        ) : null}
        <Field label="Reason" required hint="At least 10 characters; written to the Service Log with your name." className="mt-3">
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        {outcome === 'withdraw' ? (
          <Alert tone="danger" icon={<AlertTriangle />} className="mt-3">
            Withdrawal cannot be undone. The client admins and the team are notified; record the external notification (programme, registry) afterwards.
          </Alert>
        ) : null}
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={outcome === 'withdraw' ? 'danger' : 'default'} onClick={() => m.mutate()} loading={m.isPending} disabled={blocked || reason.trim().length < 10}>
            <Gavel /> {outcome === 'withdraw' ? 'Withdraw statement' : outcome === 'revise' ? 'Open revision' : 'Close with no action'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ExternalNotificationDialog({ ev, onClose }: { ev: PostIssuanceView | null; onClose: () => void }) {
  const [to, setTo] = useState('')
  const [how, setHow] = useState('')
  const m = useAppMutation(() => postIssuance.recordExternalNotification(ev!.id, { to, how }), { successMessage: 'External notification recorded on the event.', onSuccess: () => { onClose(); setTo(''); setHow('') } })
  return (
    <ShowDontDoDialog open={ev !== null} onOpenChange={(o) => !o && onClose()} title="Record external notification" description="The programme, registry or accreditation body is informed outside the platform; the platform records that it happened (who, when, how)." wouldDo={['Nothing is sent from the platform', 'The record (who, when, how, by whom) is written to the event and the Service Log', 'The ADMIN statistics count the notification']} simulateLabel="Record notification" simulateDisabled={!to.trim() || !how.trim()} onSimulate={() => m.mutateAsync()}>
      <div className="space-y-3">
        <Field label="Who was notified" required>
          <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="e.g. Verra registry, the client and the two retailers" />
        </Field>
        <Field label="How" required>
          <Input value={how} onChange={(e) => setHow(e.target.value)} placeholder="e.g. Registered letter and e-mail from the scheme manager" />
        </Field>
        <p className="text-fg-subtle text-xs">{ev ? `Statement ${ev.statementCode} · outcome ${titleCase(ev.outcome ?? '')}` : ''}</p>
      </div>
    </ShowDontDoDialog>
  )
}
