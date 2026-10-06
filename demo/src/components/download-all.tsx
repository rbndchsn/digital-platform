import { Download } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { documents } from '@/api'
import { ShowDontDoDialog } from '@/components/show-dont-do'
import { Button } from '@/components/ui/button'
import { fmtBytes } from '@/lib/format'

export function DownloadAllButton({ serviceId, label = 'Download all', size = 'sm' }: { serviceId: string; label?: string; size?: 'sm' | 'md' }) {
  const [dl, setDl] = useState<Awaited<ReturnType<typeof documents.downloadAll>> | null>(null)
  const [busy, setBusy] = useState(false)
  return (
    <>
      <Button
        variant="secondary"
        size={size}
        loading={busy}
        onClick={async () => {
          setBusy(true)
          try {
            setDl(await documents.downloadAll(serviceId))
          } finally {
            setBusy(false)
          }
        }}
      >
        <Download /> {label}
      </Button>
      <ShowDontDoDialog open={dl !== null} onOpenChange={(o) => !o && setDl(null)} title={dl?.filename ?? 'Download all'} description={dl ? `${dl.files.length} files · ${fmtBytes(dl.totalBytes)} · with manifest.json listing every SHA-256` : ''} wouldDo={['Queue a background job that streams every current version into a zip', 'Add manifest.json with file names and SHA-256 hashes', 'Give you a 7-day download link and record it in the Service Log']} simulateLabel="Simulate download" onSimulate={() => toast.success(`${dl?.filename} prepared and downloaded (simulated).`)} size="lg">
        <ul className="divide-border border-border max-h-64 divide-y overflow-y-auto rounded-md border text-xs">
          {dl?.files.map((f) => (
            <li key={f.sha256} className="flex items-center gap-3 px-3 py-1.5">
              <span className="flex-1 truncate">{f.filename}</span>
              <span className="text-fg-subtle">{fmtBytes(f.size_bytes)}</span>
              <code className="text-fg-subtle font-mono">{f.sha256.slice(0, 10)}…</code>
            </li>
          ))}
        </ul>
      </ShowDontDoDialog>
    </>
  )
}
