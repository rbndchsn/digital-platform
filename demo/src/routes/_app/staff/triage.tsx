import { createFileRoute } from '@tanstack/react-router'
import { Placeholder } from '@/components/placeholder'

export const Route = createFileRoute('/_app/staff/triage')({
  component: () => <Placeholder title="Triage queue" step={8} />,
})
