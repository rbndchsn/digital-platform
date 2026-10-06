/** Evidence chips on a figure plus a dialog to link an existing document or upload a new one (PRD FR-25, FR-41). */
import { useQuery } from '@tanstack/react-query'
import { FileCheck2, Link2, Paperclip, Upload, X } from 'lucide-react'
import { useState } from 'react'
import { documents } from '@/api'
import type { EvidenceView } from '@/api/documents'
import type { EvidenceEntityType } from '@/domain/enums'
import { Hash } from '@/components/provenance'
import { UploadDialog } from '@/components/upload-dialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/cn'
import { fmtRelative } from '@/lib/format'
import { useAppMutation } from '@/lib/query'

export function EvidenceChips({ evidence, entityType, entityId, canEdit, serviceId, className, compact }: { evidence: EvidenceView[]; entityType: EvidenceEntityType; entityId: string; canEdit: boolean; serviceId?: string | null; className?: string; compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const unlink = useAppMutation((id: string) => documents.unlinkEvidence(id), { silent: true })
  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      {evidence.map((e) => (
        <span key={e.linkId} className="bg-success-soft text-success inline-flex max-w-56 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium" title={e.document.current?.filename}>
          <FileCheck2 className="size-3 shrink-0" />
          <span className="truncate">{compact ? e.document.current?.filename.replace(/^.*?_/, '') : e.document.current?.filename}</span>
          {canEdit ? (
            <button type="button" className="hover:text-danger" aria-label="Unlink evidence" onClick={() => unlink.mutate(e.linkId)}>
              <X className="size-3" />
            </button>
          ) : null}
        </span>
      ))}
      {canEdit ? (
        <button type="button" onClick={() => setOpen(true)} className={cn('border-border text-fg-muted hover:border-primary hover:text-primary inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-0.5 text-[11px]', evidence.length === 0 && 'border-blocking/60 text-blocking')}>
          <Paperclip className="size-3" /> {evidence.length ? 'Add' : 'Add evidence'}
        </button>
      ) : evidence.length === 0 ? (
        <span className="text-blocking text-[11px]">No evidence</span>
      ) : null}
      <LinkEvidenceDialog open={open} onOpenChange={setOpen} entityType={entityType} entityId={entityId} serviceId={serviceId ?? null} />
    </div>
  )
}

function LinkEvidenceDialog({ open, onOpenChange, entityType, entityId, serviceId }: { open: boolean; onOpenChange: (o: boolean) => void; entityType: EvidenceEntityType; entityId: string; serviceId: string | null }) {
  const docs = useQuery({ queryKey: ['documents', 'org'], queryFn: documents.listForOrg, enabled: open })
  const [search, setSearch] = useState('')
  const [upload, setUpload] = useState(false)
  const link = useAppMutation((versionId: string) => documents.linkEvidence(versionId, entityType, entityId), { successMessage: 'Evidence linked.', onSuccess: () => onOpenChange(false) })
  const rows = (docs.data ?? []).filter((d) => d.current && (!search || d.current.filename.toLowerCase().includes(search.toLowerCase()) || d.title.toLowerCase().includes(search.toLowerCase()))).slice(0, 40)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Link evidence to this figure" description="Pick a document already in your vault, or upload a new one. The link is recorded in the audit log." size="lg">
        <div className="mb-3 flex gap-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search your documents" />
          <Button variant="secondary" onClick={() => setUpload(true)}>
            <Upload /> Upload new
          </Button>
        </div>
        <ul className="divide-border border-border max-h-80 divide-y overflow-y-auto rounded-md border">
          {rows.map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <div className="text-fg truncate font-medium">{d.current!.filename}</div>
                <div className="text-fg-subtle text-xs">
                  {d.title}
                  {d.serviceReference ? ` · ${d.serviceReference}` : ''} · {fmtRelative(d.current!.uploaded_at)} · <Hash value={d.current!.sha256} />
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => link.mutate(d.current!.id)} loading={link.isPending}>
                <Link2 /> Link
              </Button>
            </li>
          ))}
          {rows.length === 0 ? <li className="text-fg-muted px-3 py-6 text-center text-sm">No documents match.</li> : null}
        </ul>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
        <UploadDialog open={upload} onOpenChange={setUpload} serviceId={serviceId} category="supporting" title="Evidence" onUploaded={(doc) => doc.current && link.mutate(doc.current.id)} />
      </DialogContent>
    </Dialog>
  )
}
