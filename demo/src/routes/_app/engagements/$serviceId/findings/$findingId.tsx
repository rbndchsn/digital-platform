/** Finding thread: responses with attachments, client respond, verifier review/close/reopen/withdraw. */
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { CheckCircle2, Paperclip, RotateCcw, Scale, Send, Trash2, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { findings } from '@/api'
import type { DocumentView } from '@/api/documents'
import { AppealButton } from '@/components/appeal-button'
import { DocumentRow } from '@/components/document-row'
import { PageHeader } from '@/components/page-header'
import { StatusChip } from '@/components/status-chip'
import { UploadDialog } from '@/components/upload-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Textarea } from '@/components/ui/input'
import { Alert, Avatar, Skeleton } from '@/components/ui/misc'
import { MisstatementDialog } from '@/features/service/materiality'
import { useServicePermissions } from '@/features/service/permissions'
import { cn } from '@/lib/cn'
import { useMe } from '@/lib/auth'
import { fmtDate, fmtDateTime } from '@/lib/format'
import { useAppMutation } from '@/lib/query'
import { useService } from '@/lib/service-hooks'
import { TypeBadge } from './index'

export const Route = createFileRoute('/_app/engagements/$serviceId/findings/$findingId')({
  component: FindingDetail,
})

function FindingDetail() {
  const { serviceId, findingId } = Route.useParams()
  const me = useMe()
  const d = useService(serviceId)
  const perms = useServicePermissions(d.data)
  const q = useQuery({ queryKey: ['finding', findingId], queryFn: () => findings.get(findingId) })
  const [body, setBody] = useState('')
  const [attachments, setAttachments] = useState<DocumentView[]>([])
  const [upload, setUpload] = useState(false)
  const [raise, setRaise] = useState(false)
  const respond = useAppMutation(() => findings.respond(findingId, body, attachments.map((a) => a.current!.id)), { successMessage: 'Response posted.', onSuccess: () => { setBody(''); setAttachments([]) } })
  const transition = useAppMutation(({ action, comment }: { action: 'review' | 'close' | 'reopen' | 'withdraw'; comment?: string }) => findings.transition(findingId, action, comment), { successMessage: (f) => `${f.type} #${f.number} ${f.status.replace('_', ' ')}.`, onSuccess: () => setBody('') })
  if (!q.data || !d.data) return <Skeleton className="h-64" />
  const { finding: f, responses } = q.data
  const closed = f.status === 'closed' || f.status === 'withdrawn'
  const isClient = me.org.type === 'client'
  const canRespond = isClient ? perms.canUploadClient : perms.canTransition
  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Findings', to: `/engagements/${serviceId}/findings` }, { label: `${f.type} #${f.number}` }]}
        title={
          <span className="flex flex-wrap items-center gap-2">
            <TypeBadge type={f.type} /> #{f.number} {f.title}
          </span>
        }
        meta={
          <>
            <StatusChip status={f.status} />
            <Badge tone={f.severity === 'major' ? 'danger' : f.severity === 'minor' ? 'warning' : 'neutral'}>{f.severity}</Badge>
            {f.blocking && !closed ? <Badge tone="blocking">Blocks the opinion</Badge> : null}
            <span className="text-fg-muted text-xs">
              Raised by {f.raisedByName} on {fmtDate(f.raised_at)} · assigned to {f.assignedName ?? '—'} · due {fmtDate(f.due_at)}
              {f.overdue ? <span className="text-danger font-semibold"> · overdue</span> : null}
              {f.stepName ? ` · ${f.stepName}` : ''}
            </span>
          </>
        }
        actions={
          <div className="flex flex-wrap gap-1">
            {perms.canManageMisstatements && d.data.assuranceApplies && (f.type === 'CAR' || f.type === 'OBS') ? (
              <Button variant="secondary" onClick={() => setRaise(true)}>
                <Scale /> Raise misstatement
              </Button>
            ) : null}
            {perms.canTransition && !closed ? (
              <>
                {f.status === 'responded' ? (
                  <Button variant="secondary" onClick={() => transition.mutate({ action: 'review' })} loading={transition.isPending}>
                    Mark under review
                  </Button>
                ) : null}
                <Button onClick={() => transition.mutate({ action: 'close', comment: body || undefined })} loading={transition.isPending}>
                  <CheckCircle2 /> Close finding
                </Button>
                <Button variant="ghost" onClick={() => transition.mutate({ action: 'withdraw', comment: body || undefined })}>
                  <Trash2 /> Withdraw
                </Button>
              </>
            ) : perms.canTransition && f.status === 'closed' ? (
              <Button variant="secondary" onClick={() => transition.mutate({ action: 'reopen' })}>
                <RotateCcw /> Reopen
              </Button>
            ) : null}
            {f.status === 'closed' ? <AppealButton serviceId={serviceId} decisionEntityType="finding" decisionEntityId={f.id} subject={`Closure of ${f.type} #${f.number}: ${f.title}`} size="md" /> : null}
          </div>
        }
      />
      {raise ? <MisstatementDialog serviceId={serviceId} findingId={f.id} onClose={() => setRaise(false)} /> : null}
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card>
            <CardHeader title="Finding" />
            <CardContent>
              <p className="text-fg text-sm whitespace-pre-line">{f.description || 'No description.'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader title={`Thread (${responses.length})`} />
            <CardContent className="space-y-4">
              {responses.length === 0 ? <p className="text-fg-muted text-sm">No responses yet.</p> : null}
              {responses.map((r) => (
                <div key={r.id} className={cn('flex gap-3', r.party === 'verifier' ? '' : 'flex-row-reverse')}>
                  <Avatar name={r.authorName} tone={r.party === 'verifier' ? 'primary' : 'neutral'} />
                  <div className={cn('max-w-[85%] rounded-card px-4 py-3', r.party === 'verifier' ? 'bg-primary-soft/40' : 'bg-surface-muted')}>
                    <div className="mb-1 flex flex-wrap items-baseline gap-2">
                      <span className="text-fg text-sm font-semibold">{r.authorName}</span>
                      <span className="text-fg-subtle text-[11px]">
                        {r.party === 'verifier' ? 'VERIFASSUR' : 'Client'} · {fmtDateTime(r.created_at)}
                      </span>
                    </div>
                    <p className="text-fg text-sm whitespace-pre-line">{r.body}</p>
                    {r.attachments.length ? (
                      <div className="mt-2 space-y-1.5">
                        {r.attachments.map((a) => (
                          <DocumentRow key={a.id} doc={a} serviceId={serviceId} compact />
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
              {closed ? (
                <Alert tone={f.status === 'closed' ? 'success' : 'info'} title={f.status === 'closed' ? `Closed by ${f.closed_by ? 'VERIFASSUR' : ''} on ${fmtDate(f.closed_at)}` : 'Withdrawn'} />
              ) : canRespond ? (
                <div className="border-border rounded-card border p-3">
                  <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={isClient ? 'Explain what you did and attach the evidence…' : 'Add a comment, or use the buttons above to close / withdraw with this comment.'} />
                  {attachments.length ? (
                    <ul className="mt-2 space-y-1">
                      {attachments.map((a) => (
                        <li key={a.id} className="text-fg-muted inline-flex items-center gap-1.5 text-xs">
                          <Paperclip className="size-3" /> {a.current?.filename}
                          <button type="button" className="text-fg-subtle hover:text-danger" onClick={() => setAttachments((x) => x.filter((y) => y.id !== a.id))} aria-label="Remove attachment">
                            <Undo2 className="size-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setUpload(true)}>
                      <Paperclip /> Attach evidence
                    </Button>
                    <Button size="sm" onClick={() => respond.mutate()} disabled={!body.trim()} loading={respond.isPending}>
                      <Send /> {isClient ? 'Respond' : 'Comment'}
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
        <aside>
          <Card>
            <CardHeader title="How findings work" />
            <CardContent className="text-fg-muted space-y-2 text-sm">
              <p>
                The client responds in this thread with evidence. VERIFASSUR reviews the response and closes the finding, or asks for more.
              </p>
              <p>Corrective action requests (CAR) must be closed before the manager can approve the opinion. Clarifications, forward actions and observations do not block.</p>
              <p>Every message, attachment and status change is written to the Service Log.</p>
            </CardContent>
          </Card>
        </aside>
      </div>
      <UploadDialog open={upload} onOpenChange={setUpload} serviceId={serviceId} category="supporting" title={`Evidence for ${f.type} #${f.number}`} onUploaded={(doc) => setAttachments((x) => [...x, doc])} />
    </>
  )
}
