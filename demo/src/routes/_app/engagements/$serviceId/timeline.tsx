import { createFileRoute } from '@tanstack/react-router'
import { Timeline } from '@/components/timeline'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/misc'
import { useTimeline } from '@/lib/service-hooks'

export const Route = createFileRoute('/_app/engagements/$serviceId/timeline')({
  component: TimelineTab,
})

function TimelineTab() {
  const { serviceId } = Route.useParams()
  const q = useTimeline(serviceId)
  if (!q.data) return <Skeleton className="h-64" />
  return (
    <Card>
      <CardHeader title="Timeline" description="Planned dates come from the workflow template and the team leader's adjustments; actual bars come from recorded status changes. Every transition is a tick with its actor and time; overrides are diamonds; milestones mark the agreement, issuance, revision and withdrawal. Rows and markers are keyboard-focusable; the table view carries the same data." />
      <CardContent>
        <Timeline view={q.data} />
      </CardContent>
    </Card>
  )
}
