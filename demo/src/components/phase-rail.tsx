import { ChevronDown, FileText, ListChecks, Rocket } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/cn'
import { statusLabel } from '@/lib/format'
import { StatusChip } from './status-chip'

export interface RailStep {
  id: string
  key: string
  name: string
  status: string
}

export interface RailPhase {
  id: string
  key: string
  name: string
  status: string
  steps: RailStep[]
}

const ICON = { contracting: FileText, planning: ListChecks, execution: Rocket } as const

/** Left phase rail from the reference screenshots: phases with status chips, expandable steps. */
export function PhaseRail({ phases, activeStepId, onSelect, className }: { phases: RailPhase[]; activeStepId?: string | null; onSelect?: (stepId: string) => void; className?: string }) {
  const [open, setOpen] = useState<Record<string, boolean>>(() => Object.fromEntries(phases.map((p) => [p.id, p.status === 'in_progress' || p.status === 'blocked' || p.status === 'on_hold' || p.steps.some((s) => s.id === activeStepId)])))
  return (
    <nav aria-label="Phases" className={cn('bg-surface-muted/60 border-border rounded-card border p-2', className)}>
      {phases.map((p) => {
        const Icon = ICON[p.key as keyof typeof ICON] ?? FileText
        const isOpen = open[p.id] ?? false
        const accent = p.status === 'completed' ? 'border-[var(--vx-status-completed)]' : p.status === 'not_started' ? 'border-border' : 'border-primary'
        return (
          <div key={p.id} className={cn('bg-surface mb-2 rounded-md border-l-4 shadow-xs last:mb-0', accent)}>
            <button type="button" onClick={() => setOpen((o) => ({ ...o, [p.id]: !isOpen }))} className="flex w-full items-center gap-2 px-3 py-2.5 text-left" aria-expanded={isOpen}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className={cn('text-sm font-semibold', p.status === 'not_started' ? 'text-fg-muted' : 'text-fg')}>{p.name}</span>
                  <Icon className="text-fg-subtle size-3.5" aria-hidden />
                </div>
                <StatusChip status={p.status} size="xs" className="mt-1" />
              </div>
              <ChevronDown className={cn('text-fg-subtle size-4 transition-transform', isOpen && 'rotate-180')} />
            </button>
            {isOpen ? (
              <ol className="border-border ml-4 border-l pb-2">
                {p.steps.map((s) => {
                  const active = s.id === activeStepId
                  return (
                    <li key={s.id} className="relative">
                      <button
                        type="button"
                        onClick={() => onSelect?.(s.id)}
                        className={cn('hover:bg-surface-muted -ml-px w-full border-l-2 py-1.5 pr-3 pl-4 text-left text-sm', active ? 'border-primary bg-primary-soft/40' : 'border-transparent')}
                        aria-current={active ? 'step' : undefined}
                      >
                        <span className={cn('block leading-tight', active ? 'text-primary-strong font-semibold' : s.status === 'not_started' ? 'text-fg-muted' : 'text-fg')}>{s.name}</span>
                        <span className={cn('text-[11px]', s.status === 'completed' ? 'text-fg-muted' : s.status === 'in_progress' ? 'text-primary' : s.status === 'blocked' || s.status === 'on_hold' ? 'text-warning' : 'text-fg-subtle')}>{statusLabel(s.status)}</span>
                      </button>
                    </li>
                  )
                })}
              </ol>
            ) : null}
          </div>
        )
      })}
    </nav>
  )
}
