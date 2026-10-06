import { createFileRoute } from '@tanstack/react-router'
import { Placeholder } from '@/components/placeholder'

export const Route = createFileRoute('/_app/staff/clients')({
  component: () => <Placeholder title="Clients" step={12} />,
})
