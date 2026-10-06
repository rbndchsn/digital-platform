import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Navigation-style tabs (no tab panels): plain buttons, so no aria-controls pointing nowhere. */
export function NavTabs<T extends string>({ value, onChange, items, className, label = 'Views' }: { value: T; onChange: (v: T) => void; items: { value: T; label: ReactNode }[]; className?: string; label?: string }) {
  return (
    <div role="group" aria-label={label} className={cn('border-border flex items-end gap-1 border-b', className)}>
      {items.map((it) => (
        <button
          key={it.value}
          type="button"
          onClick={() => onChange(it.value)}
          aria-current={it.value === value ? 'page' : undefined}
          className={cn('text-fg-muted hover:text-fg -mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors', it.value === value && 'border-primary text-fg')}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}
