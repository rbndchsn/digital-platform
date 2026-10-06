import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { PhaseRail } from '@/components/phase-rail'
import { Skeleton } from '@/components/ui/misc'
import { StepDetail } from '@/features/service/step-detail'
import { useService } from '@/lib/service-hooks'

export const Route = createFileRoute('/_app/engagements/$serviceId/phases')({
  validateSearch: z.object({ step: z.string().optional() }),
  component: Phases,
})

function Phases() {
  const { serviceId } = Route.useParams()
  const { step } = Route.useSearch()
  const navigate = useNavigate()
  const q = useService(serviceId)
  if (!q.data) return <Skeleton className="h-64" />
  const d = q.data
  const all = d.phases.flatMap((p) => p.steps.map((s) => ({ ...s, phaseName: p.name })))
  const current = all.find((s) => s.id === step) ?? all.find((s) => s.id === d.nextAction?.step_id) ?? all.find((s) => s.status !== 'completed' && s.status !== 'skipped') ?? all[all.length - 1]
  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <PhaseRail phases={d.phases.map((p) => ({ id: p.id, key: p.key, name: p.name, status: p.status, steps: p.steps.map((st) => ({ id: st.id, key: st.key, name: st.name, status: st.status })) }))} activeStepId={current?.id} onSelect={(id) => navigate({ to: '/engagements/$serviceId/phases', params: { serviceId }, search: { step: id } })} />
      {current ? <StepDetail key={current.id} detail={d} step={current} phaseName={current.phaseName} /> : null}
    </div>
  )
}
