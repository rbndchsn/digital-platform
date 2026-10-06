import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { MapPin, Plus } from 'lucide-react'
import { projects, services } from '@/api'
import { PROGRAMME_LABELS } from '@/domain/enums'
import { PageHeader } from '@/components/page-header'
import { ServiceTable } from '@/components/service-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/misc'
import { useMe } from '@/lib/auth'

export const Route = createFileRoute('/_app/projects/$projectId')({
  component: ProjectDetail,
})

function ProjectDetail() {
  const { projectId } = Route.useParams()
  const navigate = useNavigate()
  const me = useMe()
  const p = useQuery({ queryKey: ['project', projectId], queryFn: () => projects.get(projectId) })
  const ongoing = useQuery({ queryKey: ['services', 'project', projectId, 'ongoing'], queryFn: () => services.list({ projectId, status: 'ongoing' }) })
  const past = useQuery({ queryKey: ['services', 'project', projectId, 'past'], queryFn: () => services.list({ projectId, status: 'past' }) })
  if (!p.data) return <Skeleton className="h-40" />
  const d = p.data
  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Projects', to: '/projects' }, { label: d.name }]}
        title={d.name}
        description={d.description}
        meta={
          <>
            <Badge tone="primary">{PROGRAMME_LABELS[d.programme]}</Badge>
            <span className="text-fg-muted inline-flex items-center gap-1 text-xs">
              <MapPin className="size-3" /> {d.country}
              {d.region ? ` · ${d.region}` : ''}
            </span>
            {d.external_registry_id ? <Badge tone="outline">Registry {d.external_registry_id}</Badge> : null}
            <span className="text-fg-subtle text-xs">Owner {d.ownerName}</span>
          </>
        }
        actions={me.org.type === 'client' ? <Button onClick={() => navigate({ to: '/engagements/new', search: { project: d.id } })}><Plus /> Request work on this project</Button> : null}
      />
      <Card className="mb-5">
        <CardHeader title="Ongoing engagements" />
        <ServiceTable items={ongoing.data ?? []} emptyTitle="No ongoing engagement on this project" />
      </Card>
      <Card>
        <CardHeader title="Past engagements" />
        <ServiceTable items={past.data ?? []} variant="past" emptyTitle="No past engagement on this project" />
      </Card>
    </>
  )
}
