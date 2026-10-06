import { createFileRoute } from '@tanstack/react-router'
import { Placeholder } from '@/components/placeholder'

export const Route = createFileRoute('/_app/engagements/$serviceId/findings/$findingId')({
  component: () => <Placeholder title="Finding" step={9} />,
})
