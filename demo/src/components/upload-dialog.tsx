/**
 * Upload dialog in the "show, don't do" pattern (plan_v1 §2.2): real-looking drop zone and buttons,
 * no file is read; "Simulate upload" creates the document version through the api.
 */
import { CloudUpload, FileUp, FolderOpen } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { documents } from '@/api'
import type { DocumentView } from '@/api/documents'
import type { SlotCategory } from '@/domain/enums'
import { ShowDontDoDialog } from '@/components/show-dont-do'
import { Field, Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/misc'
import { useAppMutation } from '@/lib/query'

const ACCEPT = 'PDF, DOCX, XLSX, CSV, PPTX, PNG, JPG, ZIP, JSON, XML · up to 500 MB'

function suggestName(slotName?: string, replace?: { filename: string } | null): string {
  if (replace) {
    const m = replace.filename.match(/^(.*?)(?:_v(\d+))?(\.\w+)$/)
    if (m) return `${m[1]}_v${Number(m[2] ?? 1) + 1}${m[3]}`
  }
  const base = (slotName ?? 'Document').replace(/\(.*?\)/g, '').trim().replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '')
  const ext = /workbook|sheet|data|export|sources|model|bom|calculation/i.test(slotName ?? '') ? 'xlsx' : /samples|records|pack/i.test(slotName ?? '') ? 'zip' : 'pdf'
  return `${base}.${ext}`
}

const MIME: Record<string, string> = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  csv: 'text/csv',
  zip: 'application/zip',
  png: 'image/png',
  jpg: 'image/jpeg',
  json: 'application/json',
  xml: 'application/xml',
}

export function UploadDialog({ open, onOpenChange, serviceId, slot, replaceDocument, category, title, onUploaded }: { open: boolean; onOpenChange: (o: boolean) => void; serviceId: string | null; slot?: { id: string; name: string } | null; replaceDocument?: { id: string; filename: string } | null; category?: SlotCategory; title?: string; onUploaded?: (doc: DocumentView) => void }) {
  // `typed` is null until the user edits; the suggestion is derived, so no effect is needed to reset it.
  const [typed, setTyped] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const filename = typed ?? suggestName(slot?.name ?? title, replaceDocument ?? null)
  const close = (o: boolean) => {
    if (!o) setTyped(null)
    onOpenChange(o)
  }
  const m = useAppMutation(
    async () => {
      // Animate a believable progress bar before the api call.
      for (let p = 0; p <= 100; p += 20) {
        setProgress(p)
        await new Promise((r) => setTimeout(r, 90))
      }
      const ext = filename.split('.').pop()?.toLowerCase() ?? 'pdf'
      const size = 180_000 + ((filename.length * 7_919 + ext.length * 131) % 4_200_000)
      return documents.simulateUpload({ serviceId, slotId: slot?.id ?? null, documentId: replaceDocument?.id ?? null, filename, sizeBytes: size, mimeType: MIME[ext] ?? 'application/octet-stream', category, title: title ?? slot?.name })
    },
    {
      successMessage: (doc) => `${doc.current?.filename} uploaded (v${doc.current?.version_no}).`,
      onSuccess: (doc) => onUploaded?.(doc),
      onSettled: () => setProgress(null),
    },
  )
  return (
    <ShowDontDoDialog
      open={open}
      onOpenChange={close}
      title={replaceDocument ? `Upload a new version of ${replaceDocument.filename}` : slot ? `Upload: ${slot.name}` : (title ?? 'Upload a document')}
      description={ACCEPT}
      wouldDo={['Open your file picker and compute a SHA-256 of the file in your browser', 'Upload it straight to encrypted object storage with a 15-minute signed URL', 'Create an immutable version with uploader, time and hash in the audit log', 'Notify the verifier that the document slot is filled']}
      simulateLabel="Simulate upload"
      onSimulate={() => m.mutateAsync()}
      simulateDisabled={!filename.trim()}
    >
      <div className="border-border bg-surface-muted/50 flex flex-col items-center justify-center rounded-md border-2 border-dashed px-6 py-8 text-center">
        <CloudUpload className="text-primary mb-2 size-9" />
        <p className="text-fg text-sm font-medium">Drag and drop your file here</p>
        <p className="text-fg-subtle mb-4 text-xs">or</p>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" className="bg-surface border-border hover:bg-surface-muted inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm shadow-xs" onClick={() => toast.message('The file picker is not functional in the demo. Use "Simulate upload".')}>
            <FileUp className="size-4" /> Choose file
          </button>
          <button type="button" className="bg-surface border-border hover:bg-surface-muted inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm shadow-xs" onClick={() => toast.message('The folder picker is not functional in the demo. Use "Simulate upload".')}>
            <FolderOpen className="size-4" /> Choose folder
          </button>
        </div>
      </div>
      <Field label="File name that will be recorded" className="mt-4" hint="Edit it to taste; the demo stores metadata only.">
        <Input value={filename} onChange={(e) => setTyped(e.target.value)} />
      </Field>
      {progress != null ? (
        <div className="mt-3">
          <Progress value={progress} />
          <p className="text-fg-subtle mt-1 text-xs">{progress < 100 ? `Uploading… ${progress} %` : 'Computing hash and registering the version…'}</p>
        </div>
      ) : null}
    </ShowDontDoDialog>
  )
}
