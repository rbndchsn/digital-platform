import { createFileRoute } from '@tanstack/react-router'
import { Placeholder } from '@/components/placeholder'

export const Route = createFileRoute('/_app/records/inventories/')({
  component: () => <Placeholder title="GHG inventories" step={11} />,
})
