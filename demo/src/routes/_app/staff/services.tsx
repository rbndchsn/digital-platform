/** All services with filters (staff). */
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'
import { services, staff } from '@/api'
import type { ServiceType } from '@/domain/enums'
import { SERVICE_TYPES, SERVICE_TYPE_LABELS } from '@/domain/enums'
import { NavTabs } from '@/components/nav-tabs'
import { PageHeader } from '@/components/page-header'
import { ServiceTable } from '@/components/service-table'
import { Card } from '@/components/ui/card'
import { Input, NativeSelect } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/misc'

const TABS = ['ongoing', 'past'] as const

export const Route = createFileRoute('/_app/staff/services')({
  validateSearch: z.object({ tab: z.enum(TABS).optional() }),
  component: AllServices,
})

function AllServices() {
  const navigate = useNavigate()
  const { tab = 'ongoing' } = Route.useSearch()
  const [search, setSearch] = useState('')
  const [type, setType] = useState<ServiceType | ''>('')
  const [orgId, setOrgId] = useState('')
  const clients = useQuery({ queryKey: ['staff', 'clients'], queryFn: staff.clients })
  const q = useQuery({ queryKey: ['services', 'staff', tab, search, type, orgId], queryFn: () => services.list({ status: tab, search: search || undefined, type: type || undefined, orgId: orgId || undefined }) })
  return (
    <>
      <PageHeader title="All services" description="Every engagement VERIFASSUR is running or has closed, across clients." />
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <NavTabs value={tab} onChange={(v) => navigate({ to: '/staff/services', search: { tab: v } })} items={[{ value: 'ongoing', label: 'Ongoing' }, { value: 'past', label: 'Past' }]} label="Service lists" />
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="text-fg-subtle pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" aria-label="Search services" className="w-52 pl-8" />
            </div>
            <NativeSelect value={orgId} onChange={(e) => setOrgId(e.target.value)} className="w-56" aria-label="Filter by client">
              <option value="">All clients</option>
              {clients.data?.map((c) => (
                <option key={c.orgId} value={c.orgId}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
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
      <Card>{q.isLoading ? <div className="p-5"><Skeleton className="h-32" /></div> : <ServiceTable items={q.data ?? []} variant={tab} showClient emptyTitle="No services match" />}</Card>
    </>
  )
}
