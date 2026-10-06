import { createFileRoute } from '@tanstack/react-router'
import { Placeholder } from '@/components/placeholder'

export const Route = createFileRoute('/_app/staff/')({
  component: () => <Placeholder title="My work" step={8} />,
})
