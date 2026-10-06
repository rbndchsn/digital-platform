import { Construction } from 'lucide-react'
import { EmptyState } from './empty-state'
import { PageHeader } from './page-header'

/** Temporary page body while a plan step is not built yet. Removed as steps complete. */
export function Placeholder({ title, step }: { title: string; step: number }) {
  return (
    <>
      <PageHeader title={title} />
      <EmptyState icon={<Construction />} title={`${title} arrives in plan step ${step}`} description="The navigation is complete from day one; this screen is built in a later step of plan_v1.md." />
    </>
  )
}
