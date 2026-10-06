import { createFileRoute } from '@tanstack/react-router'
import { Placeholder } from '@/components/placeholder'

export const Route = createFileRoute('/_app/engagements/$serviceId/opinion')({
  component: () => <Placeholder title="Opinion" step={10} />,
})
