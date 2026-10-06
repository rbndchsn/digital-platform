/** Presenter panel: persona switch, storyline chapters, network toggles, reset. Not part of the real product. */
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { FlaskConical, MoonStar, RefreshCw, SunMedium, UserRoundCheck, Wifi, WifiOff, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { auth, demo } from '@/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmTyped } from '@/components/confirm-typed'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Avatar, Switch } from '@/components/ui/misc'
import { cn } from '@/lib/cn'
import { roleLabel } from '@/lib/format'
import { useTheme } from '@/lib/theme'

const PRESENTER_KEY = 'vx.presenterNotes'

export function usePresenterNotes() {
  const [on, setOn] = useState<boolean>(() => {
    try {
      return window.sessionStorage.getItem(PRESENTER_KEY) === '1'
    } catch {
      return false
    }
  })
  useEffect(() => {
    try {
      window.sessionStorage.setItem(PRESENTER_KEY, on ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [on])
  return [on, setOn] as const
}

export function DemoPanel({ currentUserId }: { currentUserId: string | null }) {
  const [open, setOpen] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [slow, setSlow] = useState(demo.network().slow)
  const [presenter, setPresenter] = usePresenterNotes()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const personas = auth.listPersonas()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '.' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  async function enterAs(userId: string, path?: string) {
    await auth.signIn(userId)
    await qc.invalidateQueries()
    setOpen(false)
    navigate({ to: path ?? '/' })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-fg text-bg fixed right-4 bottom-4 z-30 inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold shadow-card hover:opacity-90"
        aria-label="Open demo panel (Ctrl+.)"
      >
        <FlaskConical className="size-4" /> Demo
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Demo panel" description="Presenter controls. Nothing here exists in the real product." size="xl">
          <div className="grid gap-6 md:grid-cols-[1.1fr_1fr]">
            <section>
              <h4 className="text-fg-subtle mb-2 text-xs font-semibold uppercase tracking-wide">Storyline</h4>
              <ol className="space-y-1">
                {demo.CHAPTERS.map((c) => (
                  <li key={c.no}>
                    <button type="button" onClick={() => enterAs(c.persona, c.path)} className="hover:bg-surface-muted flex w-full items-start gap-3 rounded-md px-2 py-1.5 text-left">
                      <span className="bg-primary-soft text-primary-strong grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold">{c.no}</span>
                      <span className="min-w-0">
                        <span className="text-fg block text-sm font-medium">{c.title}</span>
                        <span className="text-fg-muted block text-xs">
                          as {personas.find((p) => p.userId === c.persona)?.name} · {c.say}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </section>
            <section className="space-y-5">
              <div>
                <h4 className="text-fg-subtle mb-2 text-xs font-semibold uppercase tracking-wide">Enter as</h4>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {personas.map((p) => (
                    <button key={`${p.userId}-${p.orgId}`} type="button" disabled={p.disabled} title={p.disabledReason ?? undefined} onClick={() => enterAs(p.userId)} className={cn('hover:bg-surface-muted flex items-center gap-2 rounded-md px-2 py-1.5 text-left disabled:opacity-50', p.userId === currentUserId && 'bg-primary-soft/50')}>
                      <Avatar name={p.name} size="sm" tone={p.orgType === 'verifier' ? 'primary' : 'neutral'} />
                      <span className="min-w-0">
                        <span className="text-fg block truncate text-xs font-medium">{p.name}</span>
                        <span className="text-fg-subtle block truncate text-[11px]">
                          {p.disabled ? p.disabledReason : `${roleLabel(p.role)} · ${p.orgName}`}
                        </span>
                      </span>
                      {p.userId === currentUserId ? <UserRoundCheck className="text-primary ml-auto size-4" /> : null}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-fg-subtle mb-2 text-xs font-semibold uppercase tracking-wide">Controls</h4>
                <div className="space-y-2">
                  <label className="flex items-center justify-between gap-3 text-sm">
                    <span className="inline-flex items-center gap-2">
                      {slow ? <WifiOff className="size-4" /> : <Wifi className="size-4" />} Slow network
                    </span>
                    <Switch checked={slow} onCheckedChange={(v) => { setSlow(v); demo.toggleSlowNetwork(v) }} />
                  </label>
                  <label className="flex items-center justify-between gap-3 text-sm">
                    <span className="inline-flex items-center gap-2">
                      <FlaskConical className="size-4" /> Presenter notes
                    </span>
                    <Switch checked={presenter} onCheckedChange={setPresenter} />
                  </label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button variant="secondary" size="sm" onClick={() => { demo.failNextCall(); toast.message('The next action will fail, to show error handling.') }}>
                      <Zap /> Fail next call
                    </Button>
                    <Button variant="secondary" size="sm" onClick={toggle}>
                      {theme === 'dark' ? <SunMedium /> : <MoonStar />} {theme === 'dark' ? 'Light' : 'Dark'} mode
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => setConfirmReset(true)}>
                      <RefreshCw /> Reset demo
                    </Button>
                  </div>
                </div>
              </div>
              <p className="text-fg-subtle text-[11px]">
                Progress is kept in this browser tab only and is lost when the tab closes. <Badge tone="outline">Ctrl + .</Badge> toggles this panel.
              </p>
            </section>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmTyped
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset the demo?"
        description="All progress in this session is discarded and the seed data is restored."
        phrase="reset"
        confirmLabel="Reset demo"
        onConfirm={async () => {
          demo.resetDemo()
          await qc.invalidateQueries()
          setOpen(false)
          navigate({ to: '/sign-in' })
          toast.success('Demo reset to the seed data.')
        }}
      />
    </>
  )
}
