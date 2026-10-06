import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('bg-surface border-border rounded-card border shadow-card', className)} {...props} />
}

export function CardHeader({ className, title, description, actions, ...props }: Omit<HTMLAttributes<HTMLDivElement>, 'title'> & { title?: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 px-5 pt-5 pb-3', className)} {...props}>
      <div className="min-w-0">
        {title ? <h3 className="text-fg text-base font-semibold leading-tight">{title}</h3> : null}
        {description ? <p className="text-fg-muted mt-1 text-sm">{description}</p> : null}
        {props.children}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 pb-5', className)} {...props} />
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('border-border flex items-center gap-2 border-t px-5 py-3', className)} {...props} />
}
