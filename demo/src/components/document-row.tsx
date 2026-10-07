/** Document row with provenance, status and actions (view, download, replace, delete, accept/reject). PRD §7.2. */
import { useQuery } from '@tanstack/react-query'
import { Check, Download, Eye, FileText, History, Lock, MoreHorizontal, RefreshCw, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { admin, documents } from '@/api'
import type { DocumentView, VersionView } from '@/api/documents'
import { AppealButton } from '@/components/appeal-button'
import { ConfirmTyped } from '@/components/confirm-typed'
import { Hash, ProvenanceLine } from '@/components/provenance'
import { ShowDontDoDialog } from '@/components/show-dont-do'
import { StatusChip } from '@/components/status-chip'
import { UploadDialog } from '@/components/upload-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown'
import { Field, Textarea } from '@/components/ui/input'
import { cn } from '@/lib/cn'
import { fmtBytes, fmtDateTime } from '@/lib/format'
import { useAppMutation } from '@/lib/query'

export interface DocumentRowProps {
  doc: DocumentView
  serviceId: string | null
  /** Viewer can upload a new version (slot party matches or supporting doc). */
  canReplace?: boolean
  canDelete?: boolean
  /** Verifier can accept / reject. */
  canCheck?: boolean
  compact?: boolean
  className?: string
}

export function DocumentRow({ doc, serviceId, canReplace, canDelete, canCheck, compact, className }: DocumentRowProps) {
  const [preview, setPreview] = useState(false)
  const [download, setDownload] = useState(false)
  const [replace, setReplace] = useState(false)
  const [history, setHistory] = useState(false)
  const [del, setDel] = useState(false)
  const [reject, setReject] = useState(false)
  const v = doc.current
  const locked = Boolean(doc.locked_at)
  // PRD FR-70: the platform administrator sees metadata and hashes; content needs break-glass for this service.
  // A query (same key as the engagement banner) so the grant re-renders every row after the mutation invalidates.
  const grant = useQuery({ queryKey: ['breakGlass', serviceId ?? doc.service_id], queryFn: async () => admin.canReadEvidenceContentSync(serviceId ?? doc.service_id) })
  const contentAllowed = grant.data ?? admin.canReadEvidenceContentSync(serviceId ?? doc.service_id)
  const accept = useAppMutation(() => documents.check(serviceId!, v!.id, 'accept'), { successMessage: 'Document accepted.' })
  const remove = useAppMutation(() => documents.removeVersion(v!.id), { successMessage: 'Version deleted.' })
  if (!v) return null
  function openContent(kind: 'preview' | 'download') {
    if (!contentAllowed) {
      toast.message('Evidence content needs break-glass access. Request it from the banner at the top of the engagement.')
      return
    }
    if (serviceId) admin.logBreakGlassRead(serviceId, `${kind === 'preview' ? 'preview' : 'download'} of ${v!.filename}`)
    if (kind === 'preview') setPreview(true)
    else setDownload(true)
  }
  return (
    <div className={cn('bg-surface-muted/60 border-border flex items-center gap-3 rounded-md border px-3 py-2', className)}>
      <FileText className="text-fg-subtle size-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => openContent('preview')} className="text-fg truncate text-sm font-medium hover:underline">
            {v.filename}
          </button>
          {!compact ? <StatusChip status={v.check_status} size="xs" /> : null}
          {locked ? <Badge tone="outline">Locked</Badge> : null}
          {!contentAllowed ? (
            <Badge tone="warning" title="Break-glass access required to open the content">
              <Lock className="size-3" /> Content closed
            </Badge>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-2">
          <ProvenanceLine version={v.version_no} at={v.uploaded_at} by={v.uploaderName} source={v.source} />
          {!compact ? (
            <>
              <span className="text-fg-subtle text-[11px]">· {fmtBytes(v.size_bytes)}</span>
              <Hash value={v.sha256} />
            </>
          ) : null}
        </div>
        {v.check_status === 'rejected' && v.reject_reason ? (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="text-danger text-xs">Rejected: {v.reject_reason}</p>
            {!compact ? <AppealButton serviceId={serviceId ?? doc.service_id} decisionEntityType="document_version" decisionEntityId={v.id} subject={`Rejection of ${v.filename} (v${v.version_no})`} variant="ghost" /> : null}
          </div>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {canCheck && !locked && (v.check_status === 'uploaded' || v.check_status === 'checked') ? (
          <>
            <Button size="sm" variant="outline" onClick={() => accept.mutate()} loading={accept.isPending}>
              <Check /> Accept
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setReject(true)}>
              <X /> Reject
            </Button>
          </>
        ) : null}
        <Button size="icon" variant="ghost" aria-label="Download" onClick={() => openContent('download')}>
          <Download />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" aria-label="More">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onSelect={() => openContent('preview')}>
              <Eye /> View
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setHistory(true)}>
              <History /> Version history ({doc.versions.length})
            </DropdownMenuItem>
            {canReplace && !locked ? (
              <DropdownMenuItem onSelect={() => setReplace(true)}>
                <RefreshCw /> Upload new version
              </DropdownMenuItem>
            ) : null}
            {canDelete && !locked ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setDel(true)} className="text-danger">
                  <Trash2 /> Delete this version
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <DocumentPreviewDialog open={preview} onOpenChange={setPreview} doc={doc} version={v} />
      <ShowDontDoDialog open={download} onOpenChange={setDownload} title={`Download ${v.filename}`} description={`${fmtBytes(v.size_bytes)} · SHA-256 ${v.sha256.slice(0, 16)}…`} wouldDo={['Issue a 5-minute signed URL for this exact version', 'Stream the file from encrypted object storage', 'Record the download in the Service Log']} simulateLabel="Simulate download" onSimulate={() => toast.success(`${v.filename} downloaded (simulated).`)} />
      <UploadDialog open={replace} onOpenChange={setReplace} serviceId={serviceId} slot={doc.slot ? { id: doc.slot.id, name: doc.slot.name } : null} replaceDocument={{ id: doc.id, filename: v.filename }} />
      <VersionHistoryDialog open={history} onOpenChange={setHistory} doc={doc} />
      <ConfirmTyped open={del} onOpenChange={setDel} title={`Delete ${v.filename}?`} description="The version is hidden and the deletion is written to the Service Log. Nothing is physically removed during the retention period." phrase="delete" confirmLabel="Delete version" onConfirm={() => remove.mutateAsync()} />
      {serviceId ? <RejectDialog open={reject} onOpenChange={setReject} serviceId={serviceId} version={v} /> : null}
    </div>
  )
}

function RejectDialog({ open, onOpenChange, serviceId, version }: { open: boolean; onOpenChange: (o: boolean) => void; serviceId: string; version: VersionView }) {
  const [reason, setReason] = useState('')
  const m = useAppMutation(() => documents.check(serviceId, version.id, 'reject', reason), { successMessage: 'Document rejected; the client has been notified.', onSuccess: () => { onOpenChange(false); setReason('') } })
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={`Reject ${version.filename}`} description="The slot reopens and the client is asked to re-upload. Your reason is shown to them." size="sm">
        <Field label="Reason" required>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Q3 invoices for Lelystad are missing from the sample pack." autoFocus />
        </Field>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => m.mutate()} disabled={!reason.trim()} loading={m.isPending}>
            Reject document
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function VersionHistoryDialog({ open, onOpenChange, doc }: { open: boolean; onOpenChange: (o: boolean) => void; doc: DocumentView }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={`Version history — ${doc.title}`} description="Every version is immutable and keeps its own hash." size="lg">
        <ol className="divide-border divide-y">
          {doc.versions.map((v) => (
            <li key={v.id} className="flex items-start gap-3 py-2.5">
              <span className="bg-surface-muted text-fg-muted grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold">v{v.version_no}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-fg text-sm font-medium">{v.filename}</span>
                  <StatusChip status={v.check_status} size="xs" />
                  {v.id === doc.current_version_id ? <Badge tone="primary">Current</Badge> : null}
                </div>
                <div className="text-fg-subtle text-xs">
                  {fmtDateTime(v.uploaded_at)} · {v.uploaderName} · {fmtBytes(v.size_bytes)} · via {v.source}
                </div>
                <div className="mt-0.5">
                  <Hash value={v.sha256} />
                </div>
                {v.reject_reason ? <p className="text-danger mt-1 text-xs">Rejected by {v.checkerName}: {v.reject_reason}</p> : v.checkerName ? <p className="text-fg-subtle mt-1 text-xs">{v.check_status === 'accepted' ? 'Accepted' : 'Checked'} by {v.checkerName} on {fmtDateTime(v.checked_at)}</p> : null}
              </div>
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  )
}

export function DocumentPreviewDialog({ open, onOpenChange, doc, version }: { open: boolean; onOpenChange: (o: boolean) => void; doc: DocumentView; version: VersionView }) {
  const ext = version.filename.split('.').pop()?.toUpperCase() ?? 'FILE'
  return (
    <ShowDontDoDialog open={open} onOpenChange={onOpenChange} title={version.filename} description={`${doc.title} · v${version.version_no} · ${fmtBytes(version.size_bytes)}`} wouldDo={['Render the file in an in-browser viewer (PDF, images, spreadsheets)', 'Watermark the view with your name and the time', 'Record the view in the Service Log']} noSimulate size="lg">
      <div className="bg-surface-muted border-border flex aspect-[4/3] flex-col items-center justify-center rounded-md border">
        <div className="bg-surface border-border flex h-[78%] w-[62%] flex-col gap-2 rounded-sm border p-5 shadow-card">
          <div className="text-fg-subtle text-[10px] font-semibold tracking-wide uppercase">{ext} preview</div>
          <div className="bg-fg/80 h-3 w-2/3 rounded" />
          <div className="bg-fg/15 h-2 w-full rounded" />
          <div className="bg-fg/15 h-2 w-11/12 rounded" />
          <div className="bg-fg/15 h-2 w-4/5 rounded" />
          <div className="mt-2 grid grid-cols-3 gap-1">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="bg-fg/10 h-2 rounded" />
            ))}
          </div>
          <div className="bg-fg/15 mt-auto h-2 w-1/2 rounded" />
        </div>
        <p className="text-fg-subtle mt-3 text-xs">
          SHA-256 <code className="font-mono">{version.sha256}</code>
        </p>
      </div>
    </ShowDontDoDialog>
  )
}
