import { ArrowRight, Clock } from 'lucide-react'
import type { ReactNode } from 'react'
import type { NextAction } from '@/domain/workflow/next-action'
import { cn } from '@/lib/cn'
import { fmtDate } from '@/lib/format'

/**
 * Orange = blocks the viewer (needs you). Blue = informational (waiting on the other party). PRD §7.3.
 */
export function ActionPill({ action, forMe, className, onClick, compact }: { action: NextAction | null; forMe: boolean; className?: string; onClick?: () => void; compact?: boolean }) {
  if (!action) return <span className={cn('text-fg-subtle text-xs', className)}>Nothing pending</span>
  const blocking = forMe
  const Comp = onClick ? 'button' : 'span'
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
        blocking ? 'bg-blocking text-white' : 'bg-info-soft text-info',
        onClick && 'hover:opacity-90',
        className,
      )}
      title={action.label}
    >
      <span className="truncate">{compact ? shorten(action.label) : action.label}</span>
      {action.due && !compact ? (
        <span className="inline-flex items-center gap-0.5 opacity-80">
          <Clock className="size-3" /> {fmtDate(action.due)}
        </span>
      ) : null}
      {onClick ? <ArrowRight className="size-3" /> : null}
    </Comp>
  )
}

function shorten(s: string): string {
  return s.length > 42 ? `${s.slice(0, 40)}…` : s
}

export function WaitingOn({ action, children }: { action: NextAction | null; children?: ReactNode }) {
  if (!action) return null
  return (
    <span className="text-fg-muted text-xs">
      Waiting on {action.party === 'client' ? 'the client' : 'VERIFASSUR'}
      {children}
    </span>
  )
}
