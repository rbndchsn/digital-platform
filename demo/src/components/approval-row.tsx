/** Approval rows (technical scope, impartiality, contract, audit plan, agreement acceptance) with decisions. PRD FR-15, FR-18. */
import { CheckCircle2, CircleDashed, PenLine, XCircle } from 'lucide-react'
import { useState } from 'react'
import { approvals } from '@/api'
import type { SlotView } from '@/api/services'
import type { Approval } from '@/domain/schemas'
import { Hash } from '@/components/provenance'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Field, Input, Textarea } from '@/components/ui/input'
import { Alert, Checkbox } from '@/components/ui/misc'
import { cn } from '@/lib/cn'
import { useMe } from '@/lib/auth'
import { fmtDateTime } from '@/lib/format'
import { useAppMutation } from '@/lib/query'

export function ApprovalRow({ approval, serviceId, deciderName, msaSlot, canDecide, className }: { approval: Approval; serviceId: string; deciderName: string | null; msaSlot?: SlotView | null; canDecide: boolean; className?: string }) {
  const [decide, setDecide] = useState<null | 'approve' | 'reject'>(null)
  const [accept, setAccept] = useState(false)
  const me = useMe()
  const isAgreement = approval.kind === 'agreement_acceptance'
  const clientKinds = ['agreement_acceptance', 'audit_plan']
  const partyOk = clientKinds.includes(approval.kind) ? me.org.type === 'client' : me.org.type === 'verifier'
  const showAction = approval.status === 'pending' && canDecide && partyOk
  const Icon = approval.status === 'approved' ? CheckCircle2 : approval.status === 'rejected' ? XCircle : CircleDashed
  const ev = approval.evidence_json as { name?: string; accepted_at?: string; ip?: string; document_sha256?: string; filename?: string } | null
  return (
    <div className={cn('bg-surface-muted/60 border-border flex flex-wrap items-center gap-3 rounded-md border px-3 py-2', className)}>
      <Icon className={cn('size-5 shrink-0', approval.status === 'approved' ? 'text-success' : approval.status === 'rejected' ? 'text-danger' : 'text-fg-subtle')} />
      <div className="min-w-0 flex-1">
        <div className="text-fg text-sm font-medium">{approval.label}</div>
        {approval.comment ? <div className="text-fg-muted text-xs">{approval.comment}</div> : null}
        {isAgreement && ev?.document_sha256 ? (
          <div className="text-fg-subtle text-[11px]">
            Accepted by {ev.name} · {fmtDateTime(ev.accepted_at)} · IP {ev.ip} · document <Hash value={ev.document_sha256} />
          </div>
        ) : null}
      </div>
      <dl className="grid grid-cols-3 gap-x-4 text-xs">
        <div>
          <dt className="text-fg-subtle">Status</dt>
          <dd className={cn('font-semibold', approval.status === 'approved' ? 'text-success' : approval.status === 'rejected' ? 'text-danger' : 'text-fg-muted')}>{approval.status === 'approved' ? 'Approved' : approval.status === 'rejected' ? 'Rejected' : 'Pending'}</dd>
        </div>
        <div>
          <dt className="text-fg-subtle">{isAgreement ? 'Accepted by' : 'Approved by'}</dt>
          <dd className="text-fg">{deciderName ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-fg-subtle">Date</dt>
          <dd className="text-fg whitespace-nowrap">{approval.decided_at ? fmtDateTime(approval.decided_at) : '—'}</dd>
        </div>
      </dl>
      {showAction ? (
        isAgreement ? (
          <Button size="sm" onClick={() => setAccept(true)}>
            <PenLine /> Accept agreement
          </Button>
        ) : (
          <div className="flex gap-1">
            <Button size="sm" onClick={() => setDecide('approve')}>
              {approval.kind === 'audit_plan' ? 'Accept plan' : 'Approve'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDecide('reject')}>
              Reject
            </Button>
          </div>
        )
      ) : null}
      <DecideDialog open={decide !== null} decision={decide ?? 'approve'} onOpenChange={(o) => !o && setDecide(null)} serviceId={serviceId} approval={approval} />
      {isAgreement ? <AcceptAgreementDialog open={accept} onOpenChange={setAccept} serviceId={serviceId} approval={approval} msaSlot={msaSlot ?? null} /> : null}
    </div>
  )
}

function DecideDialog({ open, onOpenChange, decision, serviceId, approval }: { open: boolean; onOpenChange: (o: boolean) => void; decision: 'approve' | 'reject'; serviceId: string; approval: Approval }) {
  const [comment, setComment] = useState('')
  const m = useAppMutation(() => approvals.decide(serviceId, approval.id, decision, comment || undefined), { successMessage: `${approval.label} ${decision === 'approve' ? 'approved' : 'rejected'}.`, onSuccess: () => { onOpenChange(false); setComment('') } })
  const hints: Record<string, string> = {
    technical_scope: 'Confirm the engagement is within VERIFASSUR’s accredited scope and the team competence required.',
    impartiality: 'Confirm no consultancy, financial or personal relationship threatens impartiality (ISO 14065 / ISO 17029).',
    contract: 'Confirm the quote and contract reflect the agreed scope and fees.',
    audit_plan: 'Confirm the sites, sampling and schedule proposed by the team leader.',
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={`${decision === 'approve' ? 'Approve' : 'Reject'}: ${approval.label}`} description={hints[approval.kind]} size="sm">
        <Field label={decision === 'approve' ? 'Comment (optional)' : 'Reason'} required={decision === 'reject'}>
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} />
        </Field>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant={decision === 'reject' ? 'danger' : 'default'} onClick={() => m.mutate()} loading={m.isPending} disabled={decision === 'reject' && !comment.trim()}>
            {decision === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Click-to-accept with the typed name, the document hash and the recorded IP/time (PRD FR-18). */
function AcceptAgreementDialog({ open, onOpenChange, serviceId, approval, msaSlot }: { open: boolean; onOpenChange: (o: boolean) => void; serviceId: string; approval: Approval; msaSlot: SlotView | null }) {
  const me = useMe()
  const [name, setName] = useState('')
  const [read, setRead] = useState(false)
  const v = msaSlot?.document?.version ?? null
  const m = useAppMutation(() => approvals.acceptAgreement(serviceId, approval.id, name), { successMessage: 'Service agreement accepted. Planning can start.', onSuccess: () => onOpenChange(false) })
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Accept the service agreement" description="Your acceptance is recorded with your name, the time, your IP address and the hash of the exact document you accept." size="md">
        {v ? (
          <div className="border-border bg-surface-muted/60 mb-4 rounded-md border px-3 py-2 text-sm">
            <div className="font-medium">{v.filename}</div>
            <div className="text-fg-subtle text-xs">
              v{v.version_no} · uploaded {fmtDateTime(v.uploaded_at)} · SHA-256 <Hash value={v.sha256} />
            </div>
          </div>
        ) : (
          <Alert tone="warning">The agreement has not been uploaded yet.</Alert>
        )}
        <label className="mb-3 flex items-start gap-2 text-sm">
          <Checkbox checked={read} onCheckedChange={(c) => setRead(c === true)} className="mt-0.5" />
          <span>I have read the service agreement and accept it on behalf of {me.org.name}.</span>
        </label>
        <Field label={`Type your full name: ${me.user.name}`} required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={me.user.name} />
        </Field>
        <p className="text-fg-subtle mt-3 text-[11px]">You were asked to re-authenticate a moment ago (demo: skipped). Recorded: {me.user.email}, IP 192.0.2.10, {new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC.</p>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Back to demo
          </Button>
          <Button onClick={() => m.mutate()} loading={m.isPending} disabled={!read || !v || name.trim().toLowerCase() !== me.user.name.toLowerCase()}>
            <PenLine /> Accept agreement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
