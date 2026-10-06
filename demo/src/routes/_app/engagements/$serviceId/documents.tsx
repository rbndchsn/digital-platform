/** Documents tab: grouped by category, counts, version history, download-all (PRD §7.2). */
import { createFileRoute } from '@tanstack/react-router'
import { Search, Upload } from 'lucide-react'
import { useState } from 'react'
import type { DocumentView } from '@/api/documents'
import { DocumentRow } from '@/components/document-row'
import { DownloadAllButton } from '@/components/download-all'
import { EmptyState } from '@/components/empty-state'
import { UploadDialog } from '@/components/upload-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/misc'
import { useServicePermissions } from '@/features/service/step-detail'
import { useService, useServiceDocuments } from '@/lib/service-hooks'

export const Route = createFileRoute('/_app/engagements/$serviceId/documents')({
  component: Documents,
})

const GROUPS: { title: string; categories: DocumentView['category'][] }[] = [
  { title: 'Service reporting', categories: ['reporting', 'ir', 'checklist'] },
  { title: 'Phase documents', categories: ['phase'] },
  { title: 'Contract', categories: ['contract'] },
  { title: 'Supporting documents', categories: ['supporting'] },
]

function Documents() {
  const { serviceId } = Route.useParams()
  const d = useService(serviceId)
  const q = useServiceDocuments(serviceId)
  const [search, setSearch] = useState('')
  const [upload, setUpload] = useState(false)
  const perms = useServicePermissions(d.data)
  if (!d.data || !q.data) return <Skeleton className="h-64" />
  const docs = q.data.filter((x) => !search || x.title.toLowerCase().includes(search.toLowerCase()) || x.current?.filename.toLowerCase().includes(search.toLowerCase()))
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-fg text-base font-semibold">All documents</h2>
          <Badge tone="primary">{q.data.length}</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="text-fg-subtle pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search documents" className="w-64 pl-8" />
          </div>
          {perms.canUploadClient || perms.canUploadVerifier ? (
            <Button variant="secondary" size="sm" onClick={() => setUpload(true)}>
              <Upload /> Upload supporting document
            </Button>
          ) : null}
          <DownloadAllButton serviceId={serviceId} />
        </div>
      </div>
      {docs.length === 0 ? (
        <EmptyState title="No documents yet" description="Documents appear here as the engagement progresses." />
      ) : (
        <div className="space-y-5">
          {GROUPS.map((g) => {
            const rows = docs.filter((x) => g.categories.includes(x.category))
            if (!rows.length) return null
            return (
              <Card key={g.title}>
                <CardHeader title={<span className="inline-flex items-center gap-2">{g.title} <Badge tone="neutral">{rows.length}</Badge></span>} />
                <CardContent className="space-y-3">
                  {rows.map((doc) => (
                    <div key={doc.id}>
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="text-fg text-sm font-medium">{doc.title}</span>
                        {doc.slot ? (
                          <span className="text-fg-subtle text-xs">
                            {doc.slot.phaseName} › {doc.slot.stepName}
                            {doc.slot.required ? ' · Required' : ''}
                          </span>
                        ) : null}
                      </div>
                      <DocumentRow doc={doc} serviceId={serviceId} canReplace={perms.canUploadClient || perms.canUploadVerifier} canDelete={perms.canDeleteClient || perms.canCheck} canCheck={perms.canCheck && Boolean(doc.slot)} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
      <UploadDialog open={upload} onOpenChange={setUpload} serviceId={serviceId} category="supporting" title="Supporting document" />
    </>
  )
}
