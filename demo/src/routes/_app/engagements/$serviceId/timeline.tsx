import { createFileRoute } from '@tanstack/react-router'
import { Gantt } from '@/components/gantt'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/misc'
import { useTimeline } from '@/lib/service-hooks'

export const Route = createFileRoute('/_app/engagements/$serviceId/timeline')({
  component: Timeline,
})

function Timeline() {
  const { serviceId } = Route.useParams()
  const q = useTimeline(serviceId)
  if (!q.data) return <Skeleton className="h-64" />
  return (
    <Card>
      <CardHeader title="Timeline" description="Planned dates come from the workflow template and the team leader's adjustments; actual bars come from recorded status changes. Hover a row for its transitions." />
      <CardContent>
        <Gantt rows={q.data.rows} rangeStart={q.data.rangeStart} rangeEnd={q.data.rangeEnd} today={q.data.today} />
      </CardContent>
    </Card>
  )
}
