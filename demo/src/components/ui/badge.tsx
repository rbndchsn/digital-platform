import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

const badgeVariants = cva('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide leading-4 whitespace-nowrap', {
  variants: {
    tone: {
      neutral: 'bg-surface-muted text-fg-muted border-transparent',
      primary: 'bg-primary-soft text-primary-strong border-transparent',
      info: 'bg-info-soft text-info border-transparent',
      success: 'bg-success-soft text-success border-transparent',
      warning: 'bg-warning-soft text-warning border-transparent',
      danger: 'bg-danger-soft text-danger border-transparent',
      blocking: 'bg-blocking-soft text-blocking border-transparent',
      outline: 'bg-transparent text-fg-muted border-border',
    },
  },
  defaultVariants: { tone: 'neutral' },
})

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />
}
