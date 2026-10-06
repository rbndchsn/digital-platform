import { createFileRoute } from '@tanstack/react-router'
import { Placeholder } from '@/components/placeholder'

export const Route = createFileRoute('/_app/records/decarb-units/')({
  component: () => <Placeholder title="decarb_units" step={11} />,
})
