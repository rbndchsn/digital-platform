import { createFileRoute } from '@tanstack/react-router'
import { Placeholder } from '@/components/placeholder'

export const Route = createFileRoute('/_app/engagements/$serviceId')({
  component: () => <Placeholder title="Service workspace" step={7} />,
})
