import { createFileRoute } from '@tanstack/react-router'
import { Placeholder } from '@/components/placeholder'

export const Route = createFileRoute('/verify/$code')({
  component: () => <Placeholder title="Public verification statement" step={10} />,
})
