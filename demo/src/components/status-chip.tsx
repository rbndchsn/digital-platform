import { cn } from '@/lib/cn'
import { statusLabel } from '@/lib/format'

type Tone = 'completed' | 'in_progress' | 'pending' | 'on_hold' | 'blocked' | 'rejected' | 'planned' | 'info' | 'success'

const TONE: Record<string, Tone> = {
  completed: 'completed',
  closed: 'completed',
  issued: 'completed',
  verified: 'completed',
  approved: 'completed',
  accepted: 'completed',
  paid: 'completed',
  active: 'completed',
  in_progress: 'in_progress',
  execution: 'in_progress',
  contracting: 'in_progress',
  planning: 'in_progress',
  opinion_review: 'in_progress',
  under_verification: 'in_progress',
  under_review: 'in_progress',
  independent_review: 'in_progress',
  manager_review: 'in_progress',
  submitted: 'info',
  responded: 'info',
  uploaded: 'info',
  checked: 'info',
  declared: 'info',
  requested: 'info',
  triage: 'info',
  sent: 'info',
  nominated: 'info',
  not_started: 'pending',
  draft: 'pending',
  pending: 'pending',
  empty: 'pending',
  skipped: 'pending',
  superseded: 'pending',
  void: 'pending',
  withdrawn: 'pending',
  on_hold: 'on_hold',
  overdue: 'on_hold',
  blocked: 'blocked',
  open: 'blocked',
  required: 'blocked',
  rejected: 'rejected',
  cancelled: 'rejected',
  changes_requested: 'rejected',
  planned: 'planned',
}

const STYLE: Record<Tone, string> = {
  completed: 'bg-[var(--vx-status-completed)] text-white',
  in_progress: 'bg-[var(--vx-status-in-progress)] text-white',
  pending: 'bg-surface-muted text-fg-muted',
  on_hold: 'bg-[var(--vx-status-on-hold)] text-white',
  blocked: 'bg-[var(--vx-status-blocked)] text-white',
  rejected: 'bg-[var(--vx-status-rejected)] text-white',
  planned: 'bg-[var(--vx-status-planned)] text-white',
  info: 'bg-info-soft text-info',
  success: 'bg-success-soft text-success',
}

export function StatusChip({ status, className, size = 'sm', label }: { status: string; className?: string; size?: 'xs' | 'sm'; label?: string }) {
  const tone = TONE[status] ?? 'pending'
  return (
    <span
      className={cn('inline-flex items-center rounded-full font-semibold uppercase tracking-wide whitespace-nowrap', size === 'xs' ? 'px-1.5 py-px text-[9px] leading-4' : 'px-2 py-0.5 text-[10px] leading-4', STYLE[tone], className)}
      data-status={status}
    >
      {label ?? statusLabel(status)}
    </span>
  )
}
