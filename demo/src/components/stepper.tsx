import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'

export function Stepper({ steps, current, onSelect }: { steps: string[]; current: number; onSelect?: (i: number) => void }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
      {steps.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <li key={label} className="flex items-center gap-2">
            <button
              type="button"
              disabled={!onSelect || i > current}
              onClick={() => onSelect?.(i)}
              className={cn('inline-flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-sm disabled:cursor-default', active ? 'bg-primary-soft text-primary-strong font-semibold' : done ? 'text-fg hover:bg-surface-muted' : 'text-fg-subtle')}
              aria-current={active ? 'step' : undefined}
            >
              <span className={cn('grid size-6 place-items-center rounded-full text-xs font-bold', active ? 'bg-primary text-primary-fg' : done ? 'bg-success text-white' : 'bg-surface-muted text-fg-subtle')}>{done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}</span>
              {label}
            </button>
            {i < steps.length - 1 ? <span className="bg-border hidden h-px w-6 sm:block" aria-hidden /> : null}
          </li>
        )
      })}
    </ol>
  )
}
