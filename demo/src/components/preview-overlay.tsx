/**
 * Preview state for future features (plan_v1 §2.2, PRD FR-58): the real layout rendered greyed with a
 * "Coming" badge, a two-line explainer and an "I'm interested" button that records a demand signal.
 */
import { useQuery } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { features } from '@/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Field, Textarea } from '@/components/ui/input'
import { cn } from '@/lib/cn'
import { useAppMutation } from '@/lib/query'

export function useFeature(key: string) {
  const q = useQuery({ queryKey: ['features'], queryFn: features.list })
  const f = q.data?.find((x) => x.key === key)
  return { state: f?.state ?? features.stateSync(key), flag: f, isLoading: q.isLoading }
}

export function InterestButton({ flagKey, size = 'md', className }: { flagKey: string; size?: 'sm' | 'md'; className?: string }) {
  const { flag } = useFeature(flagKey)
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const m = useAppMutation((n: string) => features.registerInterest(flagKey, n || undefined), { successMessage: 'Thanks — VERIFASSUR has been told you are interested.' })
  if (flag?.interested) {
    return (
      <Badge tone="success" className={className}>
        Interest registered
      </Badge>
    )
  }
  return (
    <>
      <Button size={size} variant="outline" className={className} onClick={() => setOpen(true)}>
        <Sparkles /> I'm interested
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={`Interested in ${flag?.title ?? 'this feature'}?`} description="Tell VERIFASSUR how you would use it. This is recorded against your organisation and helps order the roadmap." size="sm">
          <Field label="How would you use it? (optional)">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Our carbon-accounting tool could push the inventory directly." />
          </Field>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button loading={m.isPending} onClick={() => m.mutateAsync(note).then(() => setOpen(false))}>
              Register interest
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function PreviewOverlay({ flagKey, children, className, horizonLabel }: { flagKey: string; children: ReactNode; className?: string; horizonLabel?: string }) {
  const { state, flag } = useFeature(flagKey)
  if (state === 'enabled') return <>{children}</>
  if (state === 'hidden') return null
  return (
    <div className={cn('relative flex min-h-80 flex-col', className)}>
      <div className="pointer-events-none flex-1 select-none opacity-45 grayscale-[35%]" aria-hidden>
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="bg-surface/95 border-border max-w-md rounded-card border p-5 text-center shadow-card backdrop-blur">
          <Badge tone="primary" className="mb-2">
            Coming {horizonLabel ?? (flag?.horizon === 'later' ? 'later' : 'next')}
          </Badge>
          <h3 className="text-fg text-base font-semibold">{flag?.title ?? flagKey}</h3>
          <p className="text-fg-muted mt-1 text-sm">{flag?.description}</p>
          <div className="mt-4 flex justify-center">
            <InterestButton flagKey={flagKey} />
          </div>
        </div>
      </div>
    </div>
  )
}

export function ComingBadge({ flagKey }: { flagKey: string }) {
  const { state, flag } = useFeature(flagKey)
  if (state !== 'preview') return null
  return <Badge tone="primary">Coming {flag?.horizon === 'later' ? 'later' : 'next'}</Badge>
}
