import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { Building2, ChevronsUpDown, Eye, LogOut, Megaphone, Menu, MoonStar, Settings, SunMedium, Wrench, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { admin, auth, demo } from '@/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown'
import { Alert, Avatar } from '@/components/ui/misc'
import { useFeature } from '@/components/preview-overlay'
import { cn } from '@/lib/cn'
import { useMe } from '@/lib/auth'
import { roleLabel } from '@/lib/format'
import { useTheme } from '@/lib/theme'
import { DemoPanel, usePresenterNotes } from './demo-panel'
import { ADMIN_NAV, CLIENT_NAV, STAFF_NAV, type NavItem } from './nav'
import { NotificationsBell } from './notifications-bell'

/** Announcement banner (PRD FR-67) and maintenance notice, for every viewer in the audience. */
function PlatformBanners() {
  const me = useMe()
  const q = useQuery({ queryKey: ['announcements', 'active', me.org.id], queryFn: async () => ({ announcements: admin.activeAnnouncementsSync(), settings: admin.settingsSync() }), refetchInterval: 4000 })
  const list = q.data?.announcements ?? []
  const maintenance = q.data?.settings?.maintenance_mode ? q.data.settings : null
  if (!list.length && !maintenance) return null
  return (
    <div className="space-y-2 px-4 pt-4 md:px-8">
      {maintenance ? (
        <Alert tone="warning" icon={<Wrench />} title="Maintenance mode">
          {maintenance.maintenance_message ?? 'The platform is read-only for a short while.'}
          {me.isAdmin ? ' Only platform administrators can make changes right now.' : ''}
        </Alert>
      ) : null}
      {list.map((a) => (
        <Alert key={a.id} tone={a.tone} icon={<Megaphone />} title={a.title}>
          {a.body}
        </Alert>
      ))}
    </div>
  )
}

function NavLink({ item, onClick }: { item: NavItem; onClick?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname })
  const active = item.exact ? path === item.to : path === item.to || path.startsWith(`${item.to}/`)
  const { state } = useFeature(item.flag ?? '__none__')
  const Icon = item.icon
  return (
    <Link
      to={item.to}
      onClick={onClick}
      className={cn('flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors', active ? 'bg-primary-soft text-primary-strong' : 'text-fg-muted hover:bg-surface-muted hover:text-fg')}
      aria-current={active ? 'page' : undefined}
    >
      <Icon className="size-4 shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
      {item.flag && state === 'preview' ? (
        <Badge tone="primary" className="px-1.5 text-[9px]">
          Soon
        </Badge>
      ) : null}
    </Link>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const me = useMe()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { theme, toggle } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [presenter] = usePresenterNotes()
  const isStaff = me.org.type === 'verifier'
  const groups = me.isAdmin ? ADMIN_NAV : isStaff ? STAFF_NAV : CLIENT_NAV
  const chapter = demo.currentChapter()
  const chapterInfo = demo.CHAPTERS.find((c) => c.no === chapter)

  async function signOut() {
    await auth.signOut()
    qc.clear()
    navigate({ to: '/sign-in' })
  }
  async function switchOrg(orgId: string) {
    await auth.switchOrg(orgId)
    await qc.invalidateQueries()
    navigate({ to: '/' })
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-3 py-4">
        <span className="bg-primary text-primary-fg grid size-8 place-items-center rounded-lg text-sm font-bold" aria-hidden>
          ✓
        </span>
        <div className="min-w-0">
          <div className="text-fg text-sm font-semibold tracking-tight">VERIFASSUR_X</div>
          <div className="text-fg-subtle text-[11px]">{me.isAdmin ? 'Administration portal' : isStaff ? 'Verifier workspace' : 'Client portal'}</div>
        </div>
        <button type="button" className="text-fg-muted ml-auto md:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu">
          <X className="size-5" />
        </button>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-2 pb-4">
        {groups.map((g, i) => (
          <div key={i}>
            {g.label ? <div className="text-fg-subtle px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wide">{g.label}</div> : null}
            <div className="space-y-0.5">
              {g.items.map((item) => (
                <NavLink key={item.to} item={item} onClick={() => setMobileOpen(false)} />
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-border border-t p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="hover:bg-surface-muted flex w-full items-center gap-2 rounded-md px-2 py-2 text-left">
              <span className="bg-surface-muted text-fg-muted grid size-8 shrink-0 place-items-center rounded-md text-xs font-bold">{me.org.initials}</span>
              <span className="min-w-0 flex-1">
                <span className="text-fg block truncate text-sm font-medium">{me.org.name}</span>
                <span className="text-fg-subtle block truncate text-[11px]">{me.role ? roleLabel(me.role) : ''}</span>
              </span>
              <ChevronsUpDown className="text-fg-subtle size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel>Organisations</DropdownMenuLabel>
            {me.orgs.map((o) => (
              <DropdownMenuItem key={o.id} onSelect={() => switchOrg(o.id)} disabled={o.id === me.org.id}>
                <Building2 /> {o.name}
                <span className="text-fg-subtle ml-auto text-[11px]">{roleLabel(o.role)}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )

  return (
    <div className="bg-bg flex min-h-full">
      <aside className="bg-surface border-border hidden w-64 shrink-0 border-r md:block">{sidebar}</aside>
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="bg-surface absolute inset-y-0 left-0 w-72 shadow-card">{sidebar}</aside>
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-surface/80 border-border sticky top-0 z-20 flex h-14 items-center gap-2 border-b px-4 backdrop-blur md:px-6">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu />
          </Button>
          <div className="min-w-0 flex-1">
            {presenter && chapterInfo ? (
              <div className="text-fg-muted hidden items-center gap-2 text-xs md:flex">
                <Badge tone="primary">Chapter {chapterInfo.no}</Badge>
                <span className="truncate">{chapterInfo.say}</span>
              </div>
            ) : null}
          </div>
          <Badge tone="outline" className="hidden sm:inline-flex">
            Your role: {me.role ? roleLabel(me.role) : '—'}
          </Badge>
          {me.isAdmin ? (
            <Badge tone="warning" className="hidden lg:inline-flex" title="The platform administrator sees everything and changes no engagement or record data.">
              <Eye className="size-3" /> Read-only on engagements
            </Badge>
          ) : null}
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
            {theme === 'dark' ? <SunMedium /> : <MoonStar />}
          </Button>
          <NotificationsBell />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="flex items-center gap-2 rounded-full" aria-label="Account menu">
                <Avatar name={me.user.name} tone="primary" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-60">
              <div className="px-2 py-1.5">
                <div className="text-fg text-sm font-medium">{me.user.name}</div>
                <div className="text-fg-subtle truncate text-xs">{me.user.email}</div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate({ to: '/account' })}>
                <Settings /> Account and security
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={signOut}>
                <LogOut /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <PlatformBanners />
        <main className="flex-1 px-4 py-6 md:px-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
      <DemoPanel currentUserId={me.user.id} />
    </div>
  )
}
