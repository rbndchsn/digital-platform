import { Checkbox as RC, Progress as RP, Switch as RS, Tooltip as RTT } from 'radix-ui'
import { Check } from 'lucide-react'
import type { ComponentProps, HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { initials } from '@/lib/format'

export function Switch({ className, ...props }: ComponentProps<typeof RS.Root>) {
  return (
    <RS.Root className={cn('bg-border data-[state=checked]:bg-primary relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-50', className)} {...props}>
      <RS.Thumb className="bg-surface block size-4 translate-x-0.5 rounded-full shadow transition-transform data-[state=checked]:translate-x-[18px]" />
    </RS.Root>
  )
}

export function Checkbox({ className, ...props }: ComponentProps<typeof RC.Root>) {
  return (
    <RC.Root className={cn('bg-surface border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary grid size-4 shrink-0 place-items-center rounded border disabled:opacity-50', className)} {...props}>
      <RC.Indicator>
        <Check className="text-primary-fg size-3" strokeWidth={3} />
      </RC.Indicator>
    </RC.Root>
  )
}

export function Progress({ value, className, tone = 'primary', label = 'Progress' }: { value: number; className?: string; tone?: 'primary' | 'success' | 'warning' | 'blocking' | 'info'; label?: string }) {
  const bg = { primary: 'bg-primary', success: 'bg-success', warning: 'bg-warning', blocking: 'bg-blocking', info: 'bg-info' }[tone]
  return (
    <RP.Root className={cn('bg-surface-muted h-2 w-full overflow-hidden rounded-full', className)} value={value} aria-label={label}>
      <RP.Indicator className={cn('h-full rounded-full transition-[width]', bg)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </RP.Root>
  )
}

export const TooltipProvider = RTT.Provider

export function Tooltip({ children, content, side = 'top' }: { children: ReactNode; content: ReactNode; side?: 'top' | 'bottom' | 'left' | 'right' }) {
  return (
    <RTT.Root delayDuration={200}>
      <RTT.Trigger asChild>{children}</RTT.Trigger>
      <RTT.Portal>
        <RTT.Content side={side} sideOffset={6} className="bg-fg text-bg z-50 max-w-xs rounded-md px-2.5 py-1.5 text-xs shadow-card">
          {content}
          <RTT.Arrow className="fill-fg" />
        </RTT.Content>
      </RTT.Portal>
    </RTT.Root>
  )
}

export function Separator({ className, vertical }: { className?: string; vertical?: boolean }) {
  return <div role="separator" className={cn('bg-border', vertical ? 'h-full w-px' : 'h-px w-full', className)} />
}

export function Avatar({ name, size = 'md', className, tone = 'neutral' }: { name: string; size?: 'sm' | 'md' | 'lg'; className?: string; tone?: 'neutral' | 'primary' }) {
  const s = { sm: 'size-6 text-[10px]', md: 'size-8 text-xs', lg: 'size-10 text-sm' }[size]
  const t = tone === 'primary' ? 'bg-primary text-primary-fg' : 'bg-surface-muted text-fg-muted'
  return (
    <span className={cn('grid shrink-0 place-items-center rounded-full font-semibold', s, t, className)} title={name} aria-hidden>
      {initials(name)}
    </span>
  )
}

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('bg-surface-muted animate-pulse rounded-md', className)} {...props} />
}

export function Alert({ tone = 'info', title, children, className, icon, ...rest }: { tone?: 'info' | 'success' | 'warning' | 'danger' | 'blocking'; title?: ReactNode; children?: ReactNode; className?: string; icon?: ReactNode } & Omit<HTMLAttributes<HTMLDivElement>, 'title'>) {
  const styles = {
    info: 'bg-info-soft text-info border-info/30',
    success: 'bg-success-soft text-success border-success/30',
    warning: 'bg-warning-soft text-warning border-warning/30',
    danger: 'bg-danger-soft text-danger border-danger/30',
    blocking: 'bg-blocking-soft text-blocking border-blocking/30',
  }[tone]
  return (
    <div role="status" className={cn('flex gap-3 rounded-md border px-3.5 py-3 text-sm', styles, className)} {...rest}>
      {icon ? <span className="mt-0.5 shrink-0 [&_svg]:size-4">{icon}</span> : null}
      <div className="min-w-0">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={cn(title ? 'mt-0.5' : '', 'opacity-90')}>{children}</div> : null}
      </div>
    </div>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="bg-surface-muted border-border text-fg-muted rounded border px-1.5 py-0.5 font-mono text-[10px]">{children}</kbd>
}
