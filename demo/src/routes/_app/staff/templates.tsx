import { createFileRoute } from '@tanstack/react-router'
import { Placeholder } from '@/components/placeholder'

export const Route = createFileRoute('/_app/staff/templates')({
  component: () => <Placeholder title="Workflow templates" step={12} />,
})
