/** Sign-in: a realistic form that accepts anything, plus the persona picker ("Demo: enter as…"). plan_v1 §2.2/2.3. */
import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { Fingerprint, KeyRound, ShieldCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { z } from 'zod'
import { auth } from '@/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { Avatar } from '@/components/ui/misc'
import { cn } from '@/lib/cn'
import { roleLabel } from '@/lib/format'

const DEFAULT_PERSONA = 'usr_ingrid'

export const Route = createFileRoute('/sign-in')({
  validateSearch: z.object({ redirect: z.string().optional() }),
  beforeLoad: ({ search }) => {
    if (auth.sessionProbe()) throw redirect({ to: search.redirect ?? '/' })
  },
  component: SignIn,
})

function SignIn() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { redirect: back } = Route.useSearch()
  const [stage, setStage] = useState<'credentials' | 'mfa'>('credentials')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const personas = auth.listPersonas()
  const clients = personas.filter((p) => p.orgType === 'client')
  const staff = personas.filter((p) => p.orgType === 'verifier')

  async function enter(userId: string) {
    setBusy(true)
    try {
      await auth.signIn(userId)
      qc.clear()
      navigate({ to: back ?? '/' })
    } finally {
      setBusy(false)
    }
  }

  function submitCredentials(e: FormEvent) {
    e.preventDefault()
    setStage('mfa')
  }

  function submitMfa(e: FormEvent) {
    e.preventDefault()
    const match = personas.find((p) => p.email.toLowerCase() === email.trim().toLowerCase())
    void enter(match?.userId ?? DEFAULT_PERSONA)
  }

  return (
    <main className="bg-bg min-h-full">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-6 py-10 lg:grid-cols-[420px_1fr]">
        <section className="bg-surface border-border rounded-card border p-7 shadow-card">
          <div className="mb-6 flex items-center gap-3">
            <span className="bg-primary text-primary-fg grid size-10 place-items-center rounded-lg text-lg font-bold" aria-hidden>
              ✓
            </span>
            <div>
              <h1 className="text-fg text-xl font-semibold tracking-tight">VERIFASSUR_X</h1>
              <p className="text-fg-muted text-xs">Assurance platform for the carbon economy</p>
            </div>
          </div>
          {stage === 'credentials' ? (
            <form onSubmit={submitCredentials} className="space-y-4">
              <Field label="Work e-mail">
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="username" />
              </Field>
              <Field label="Password">
                <Input type="password" placeholder="••••••••••••" autoComplete="current-password" />
              </Field>
              <div className="flex items-center justify-between text-xs">
                <label className="text-fg-muted inline-flex items-center gap-2">
                  <input type="checkbox" className="accent-primary" /> Keep me signed in
                </label>
                <button type="button" className="text-primary hover:underline">
                  Forgot password?
                </button>
              </div>
              <Button type="submit" className="w-full">
                Continue
              </Button>
              <div className="relative py-1 text-center text-[11px] text-fg-subtle">
                <span className="bg-surface relative z-10 px-2">or</span>
                <span className="bg-border absolute top-1/2 right-0 left-0 h-px" aria-hidden />
              </div>
              <Button type="button" variant="secondary" className="w-full" onClick={() => setStage('mfa')}>
                <Fingerprint /> Sign in with a passkey
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setStage('mfa')}>
                <KeyRound /> E-mail me a magic link
              </Button>
            </form>
          ) : (
            <form onSubmit={submitMfa} className="space-y-4">
              <div className="bg-primary-soft text-primary-strong flex items-center gap-2 rounded-md px-3 py-2 text-sm">
                <ShieldCheck className="size-4" /> Two-factor authentication
              </div>
              <Field label="6-digit code from your authenticator" hint="Any six digits work in the demo.">
                <Input inputMode="numeric" pattern="[0-9]*" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="123456" className="text-center text-lg tracking-[0.4em]" autoFocus />
              </Field>
              <Button type="submit" className="w-full" disabled={code.length !== 6} loading={busy}>
                Verify and sign in
              </Button>
              <button type="button" className="text-fg-muted w-full text-center text-xs hover:underline" onClick={() => setStage('credentials')}>
                Back
              </button>
            </form>
          )}
          <p className="text-fg-subtle mt-6 text-[11px]">Invitation-only platform. Contact your VERIFASSUR engagement coordinator to be added to your organisation.</p>
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <Badge tone="primary">Demo</Badge>
            <h2 className="text-fg text-base font-semibold">Enter as…</h2>
            <span className="text-fg-muted text-xs">The sign-in form is not functional; pick a persona.</span>
          </div>
          <PersonaGroup title="Client organisations" personas={clients} onPick={enter} busy={busy} />
          <PersonaGroup title="VERIFASSUR (verifier)" personas={staff} onPick={enter} busy={busy} tone="primary" />
        </section>
      </div>
    </main>
  )
}

function PersonaGroup({ title, personas, onPick, busy, tone = 'neutral' }: { title: string; personas: ReturnType<typeof auth.listPersonas>; onPick: (id: string) => void; busy: boolean; tone?: 'neutral' | 'primary' }) {
  return (
    <div className="mb-5">
      <h3 className="text-fg-subtle mb-2 text-xs font-semibold uppercase tracking-wide">{title}</h3>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {personas.map((p) => (
          <button
            key={`${p.userId}-${p.orgId}`}
            type="button"
            disabled={busy || p.disabled}
            title={p.disabledReason ?? undefined}
            onClick={() => onPick(p.userId)}
            className={cn('bg-surface border-border hover:border-primary flex items-center gap-3 rounded-card border p-3 text-left shadow-xs transition-colors disabled:opacity-60', p.disabled && 'grayscale')}
          >
            <Avatar name={p.name} size="lg" tone={tone} />
            <span className="min-w-0">
              <span className="text-fg block truncate text-sm font-semibold">{p.name}</span>
              <span className="text-fg-muted block truncate text-xs">{p.disabled ? p.disabledReason : p.jobTitle}</span>
              <span className="text-fg-subtle block truncate text-[11px]">
                {roleLabel(p.role)} · {p.orgName}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
