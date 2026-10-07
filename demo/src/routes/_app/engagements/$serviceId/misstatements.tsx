/** Misstatement register of a service (PRD v0.3 FR-85–FR-87): aggregation panel, warning, register with actions. */
import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/misc'
import { MaterialityPanel, MisstatementRegister } from '@/features/service/materiality'
import { useServicePermissions } from '@/features/service/permissions'
import { useService } from '@/lib/service-hooks'

export const Route = createFileRoute('/_app/engagements/$serviceId/misstatements')({
  component: Misstatements,
})

function Misstatements() {
  const { serviceId } = Route.useParams()
  const d = useService(serviceId)
  const perms = useServicePermissions(d.data)
  if (!d.data) return <Skeleton className="h-64" />
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-fg text-base font-semibold">Materiality and misstatements</h2>
          <p className="text-fg-muted text-xs">The threshold set in Planning, and every difference found in Execution, aggregated against it. Displayed, not decided: the opinion type stays a human judgement.</p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/engagements/$serviceId/opinion" params={{ serviceId }}>
            <ArrowLeft /> Opinion tab
          </Link>
        </Button>
      </div>
      <MaterialityPanel serviceId={serviceId} perms={perms} />
      <MisstatementRegister serviceId={serviceId} perms={perms} />
    </div>
  )
}
