import { createFileRoute } from '@tanstack/react-router'
import { Placeholder } from '@/components/placeholder'

export const Route = createFileRoute('/_app/staff/services')({
  component: () => <Placeholder title="All services" step={8} />,
})
