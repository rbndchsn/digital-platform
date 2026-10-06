import { cn } from '@/lib/cn'
import { fmtNumber } from '@/lib/format'

/** Declared (client) vs verified or adjusted (VERIFASSUR) side by side; the right column is read-only for clients (PRD §7.3). */
export function DeclaredVerifiedPair({ declared, verified, unit, decimals = 0, className, compact, verifiedLabel = 'Verified' }: { declared: number | null | undefined; verified: number | null | undefined; unit?: string; decimals?: number; className?: string; compact?: boolean; verifiedLabel?: string }) {
  const differs = verified != null && declared != null && Math.abs(verified - declared) > 1e-9
  return (
    <div className={cn('grid grid-cols-2 gap-3 tabular-nums', className)}>
      <div>
        {!compact ? <div className="text-fg-subtle text-[10px] font-semibold uppercase tracking-wide">Declared</div> : null}
        <div className="text-fg text-sm">
          {fmtNumber(declared, decimals)}
          {unit ? <span className="text-fg-subtle ml-1 text-xs">{unit}</span> : null}
        </div>
      </div>
      <div>
        {!compact ? <div className="text-fg-subtle text-[10px] font-semibold uppercase tracking-wide">{verifiedLabel}</div> : null}
        <div className={cn('text-sm font-semibold', verified == null ? 'text-fg-subtle font-normal' : differs ? 'text-warning' : 'text-success')}>
          {verified == null ? '—' : fmtNumber(verified, decimals)}
          {verified != null && unit ? <span className="text-fg-subtle ml-1 text-xs font-normal">{unit}</span> : null}
        </div>
      </div>
    </div>
  )
}
