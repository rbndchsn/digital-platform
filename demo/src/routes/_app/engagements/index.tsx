/** Engagements: ongoing, past (paid status, download-all) and drafts (PRD FR-56). */
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Plus, RefreshCw, Search } from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'
import { services } from '@/api'
import type { ServiceType } from '@/domain/enums'
import { SERVICE_TYPES, SERVICE_TYPE_LABELS } from '@/domain/enums'
import { NavTabs } from '@/components/nav-tabs'
import { PageHeader } from '@/components/page-header'
import { ServiceTable } from '@/components/service-table'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input, NativeSelect } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/misc'
import { useAppMutation } from '@/lib/query'

const TABS = ['ongoing', 'past', 'drafts'] as const

export const Route = createFileRoute('/_app/engagements/')({
  validateSearch: z.object({ tab: z.enum(TABS).optional() }),
  component: Engagements,
})

function Engagements() {
  const navigate = useNavigate()
  const { tab = 'ongoing' } = Route.useSearch()
  const [search, setSearch] = useState('')
  const [type, setType] = useState<ServiceType | ''>('')
  const q = useQuery({ queryKey: ['services', tab, search, type], queryFn: () => services.list({ status: tab, search: search || undefined, type: type || undefined }) })
  const renew = useAppMutation((id: string) => services.renew(id), { successMessage: 'Renewal drafted from last year’s engagement.', onSuccess: (svc) => navigate({ to: '/engagements/new', search: { draft: svc.id } }) })
  const renewable = tab === 'past' ? (q.data ?? []).filter((s) => s.status === 'closed') : []

  return (
    <>
      <PageHeader
        title="Engagements"
        description="Every validation and verification engagement with VERIFASSUR: what is running, what is finished and paid, and drafts you have not submitted."
        actions={
          <Button onClick={() => navigate({ to: '/engagements/new' })}>
            <Plus /> New request
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <NavTabs value={tab} onChange={(v) => navigate({ to: '/engagements', search: { tab: v } })} items={[{ value: 'ongoing', label: 'Ongoing' }, { value: 'past', label: 'Past' }, { value: 'drafts', label: 'Drafts' }]} label="Engagement lists" />
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="text-fg-subtle pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search reference or name" aria-label="Search engagements" className="w-64 pl-8" />
            </div>
            <NativeSelect value={type} onChange={(e) => setType(e.target.value as ServiceType | '')} className="w-64" aria-label="Filter by service type">
              <option value="">All service types</option>
              {SERVICE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {SERVICE_TYPE_LABELS[t]}
                </option>
              ))}
            </NativeSelect>
          </div>
      </div>
      <Card>
        {q.isLoading ? (
          <div className="space-y-2 p-5">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : (
          <ServiceTable
            items={q.data ?? []}
            variant={tab}
            emptyTitle={tab === 'drafts' ? 'No draft requests' : tab === 'past' ? 'No past engagements' : 'No ongoing engagements'}
            emptyDescription={tab === 'drafts' ? 'Start a request and it is saved here until you submit it.' : undefined}
            emptyAction={
              <Button onClick={() => navigate({ to: '/engagements/new' })}>
                <Plus /> New request
              </Button>
            }
          />
        )}
      </Card>
      {renewable.length ? (
        <Card className="mt-4">
          <div className="flex flex-wrap items-center gap-3 px-5 py-3">
            <RefreshCw className="text-primary size-4" />
            <div className="flex-1 text-sm">
              <span className="font-medium">Renew for the next period.</span> <span className="text-fg-muted">Scope, sites and the evidence list are pre-filled from the closed engagement.</span>
            </div>
            <NativeSelect className="w-80" onChange={(e) => e.target.value && renew.mutate(e.target.value)} defaultValue="" aria-label="Choose an engagement to renew">
              <option value="">Choose an engagement to renew…</option>
              {renewable.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.reference} · {s.name}
                </option>
              ))}
            </NativeSelect>
          </div>
        </Card>
      ) : null}
    </>
  )
}
