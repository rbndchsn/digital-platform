/**
 * Eligibility notice (PRD v0.3 FR-79, §7.3 "Conflicts are shown, not hidden"): when the viewer is in the involved set,
 * the decision control stays visible but disabled and this notice says why and who may decide instead.
 */
import { Lock, UserX } from 'lucide-react'
import type { Eligibility } from '@/api/involved'
import { Alert } from '@/components/ui/misc'
import { cn } from '@/lib/cn'
import { useMe } from '@/lib/auth'
import { useEligibility } from '@/lib/service-hooks'

/**
 * Persistent inline note on a record editor (PRD FR-77, FR-79): the viewer edited a verified value on this service
 * and is therefore in its involved set, or the figures are immutable because the opinion is issued.
 */
export function InvolvedNote({ serviceId, immutable, className }: { serviceId: string | null; immutable?: boolean; className?: string }) {
  const me = useMe()
  const staff = me.org.type === 'verifier' && !me.isAdmin
  const e = useEligibility(serviceId ?? '', 'iteration.manager_decide', staff && Boolean(serviceId))
  if (!staff || !serviceId) return null
  const involved = e.data && !e.data.allowed && e.data.code === 'decision_maker_conflict'
  if (!involved && !immutable) return null
  return (
    <div className={cn('space-y-1 text-xs', className)} data-testid="involved-note">
      {immutable ? (
        <p className="text-fg-muted inline-flex items-center gap-1.5">
          <Lock className="size-3.5" /> Verified figures of an issued opinion are immutable (<code className="font-mono">issued_immutable</code>). To change them, a manager opens a post-issuance revision on the Opinion tab.
        </p>
      ) : null}
      {involved ? (
        <p className="text-warning inline-flex items-center gap-1.5">
          <UserX className="size-3.5" /> You are in the involved set of this service ({e.data!.reasons.join('; ')}) and cannot take its final decision. Eligible: {e.data!.eligibleManagers.join(', ') || 'none'}.
        </p>
      ) : null}
    </div>
  )
}

export function EligibilityNotice({ e, what, className }: { e: Eligibility | null | undefined; what: string; className?: string }) {
  if (!e || e.allowed || e.code !== 'decision_maker_conflict') return null
  return (
    <Alert tone="warning" icon={<UserX />} className={className} title={`You cannot ${what}: you are in the involved set of this service`} data-testid="eligibility-notice">
      <ul className="mt-1 list-disc space-y-0.5 pl-4">
        {e.reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <p className="mt-1.5">
        {e.eligibleManagers.length ? (
          <>
            Eligible decision-maker{e.eligibleManagers.length === 1 ? '' : 's'}: <span className="font-semibold">{e.eligibleManagers.join(', ')}</span>. Hand the decision over; the refusal and the hand-over are written to the Service Log.
          </>
        ) : (
          <span className="font-semibold">No manager outside the involved set is available: a second decision-capable manager must be assigned before this service can be decided.</span>
        )}
      </p>
    </Alert>
  )
}
