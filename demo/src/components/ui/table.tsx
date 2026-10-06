import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export function Table({ className, label = 'Table', ...props }: HTMLAttributes<HTMLTableElement> & { label?: string }) {
  // The wrapper can scroll horizontally, so it must be reachable by keyboard (axe: scrollable-region-focusable).
  return (
    <div className="w-full overflow-x-auto focus-visible:outline-primary" tabIndex={0} role="region" aria-label={label}>
      <table className={cn('w-full border-collapse text-sm', className)} {...props} />
    </div>
  )
}
export function THead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('text-fg-subtle text-left text-[11px] font-semibold uppercase tracking-wide', className)} {...props} />
}
export function TBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('divide-border divide-y', className)} {...props} />
}
export function TR({ className, clickable, ...props }: HTMLAttributes<HTMLTableRowElement> & { clickable?: boolean }) {
  return <tr className={cn(clickable && 'hover:bg-surface-muted cursor-pointer transition-colors', className)} {...props} />
}
export function TH({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn('px-3 py-2 font-semibold first:pl-5 last:pr-5', className)} {...props} />
}
export function TD({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-3 py-2.5 align-middle first:pl-5 last:pr-5', className)} {...props} />
}
