import { createFileRoute } from '@tanstack/react-router'
import { Placeholder } from '@/components/placeholder'

export const Route = createFileRoute('/_app/engagements/new')({
  component: () => <Placeholder title="New request" step={6} />,
})
