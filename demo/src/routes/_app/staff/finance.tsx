import { createFileRoute } from '@tanstack/react-router'
import { Placeholder } from '@/components/placeholder'

export const Route = createFileRoute('/_app/staff/finance')({
  component: () => <Placeholder title="Finance" step={8} />,
})
