/** Check-result list (PRD v0.3 §7.4): competence and rotation items in red (block), amber (warning) or green (pass). */
import { AlertTriangle, CheckCircle2, XOctagon } from 'lucide-react'
import type { CheckItem } from '@/domain/schemas'
import { cn } from '@/lib/cn'

export function CheckResultList({ items, className, compact }: { items: CheckItem[]; className?: string; compact?: boolean }) {
  if (!items.length) return <p className={cn('text-fg-subtle text-xs', className)}>No competence or rotation rule applies to this role.</p>
  return (
    <ul className={cn('space-y-1', className)} data-testid="check-results">
      {items.map((i) => (
        <li key={i.key} className={cn('flex items-start gap-2', compact ? 'text-xs' : 'text-sm')} data-check-result={i.result}>
          {i.result === 'block' ? <XOctagon className="text-danger mt-0.5 size-4 shrink-0" aria-label="Block" /> : i.result === 'warning' ? <AlertTriangle className="text-warning mt-0.5 size-4 shrink-0" aria-label="Warning" /> : <CheckCircle2 className="text-success mt-0.5 size-4 shrink-0" aria-label="Pass" />}
          <span className="min-w-0">
            <span className={cn('font-medium', i.result === 'block' ? 'text-danger' : i.result === 'warning' ? 'text-warning' : 'text-fg')}>{i.requirement}</span>
            <span className="text-fg-muted"> — {i.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
