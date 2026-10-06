import { createFileRoute } from '@tanstack/react-router'
import { Placeholder } from '@/components/placeholder'

export const Route = createFileRoute('/_app/engagements/$serviceId/findings/')({
  component: () => <Placeholder title="Findings" step={9} />,
})
