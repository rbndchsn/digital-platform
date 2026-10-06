import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { auth } from '@/api'
import { AppShell } from '@/components/shell/app-shell'
import { AuthProvider } from '@/lib/auth'

export const Route = createFileRoute('/_app')({
  beforeLoad: ({ location }) => {
    const me = auth.sessionProbe()
    if (!me) throw redirect({ to: '/sign-in', search: { redirect: location.href } })
    return { me }
  },
  component: AppLayout,
})

function AppLayout() {
  const { me } = Route.useRouteContext()
  return (
    <AuthProvider initial={me}>
      <AppShell>
        <Outlet />
      </AppShell>
    </AuthProvider>
  )
}
