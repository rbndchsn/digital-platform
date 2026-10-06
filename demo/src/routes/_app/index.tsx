import { createFileRoute, redirect } from '@tanstack/react-router'
import { Placeholder } from '@/components/placeholder'

export const Route = createFileRoute('/_app/')({
  beforeLoad: ({ context }) => {
    if (context.me.org.type === 'verifier') throw redirect({ to: '/staff' })
  },
  component: () => <Placeholder title="Home" step={5} />,
})
