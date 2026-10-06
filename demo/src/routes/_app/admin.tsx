/** Administration portal layout (PRD §7.1 v0.2): platform administrator only. */
import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/admin')({
  beforeLoad: ({ context }) => {
    if (!context.me.isAdmin) throw redirect({ to: '/' })
  },
  component: () => <Outlet />,
})
