import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { Placeholder } from '@/components/placeholder'

export const Route = createFileRoute('/_app/engagements/new')({
  validateSearch: z.object({ draft: z.string().optional(), project: z.string().optional() }),
  component: () => <Placeholder title="New request" step={6} />,
})
