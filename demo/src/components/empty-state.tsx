import { Inbox } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function EmptyState({ icon, title, description, action, className }: { icon?: ReactNode; title: string; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('border-border flex flex-col items-center justify-center rounded-card border border-dashed px-6 py-10 text-center', className)}>
      <div className="bg-surface-muted text-fg-subtle mb-3 grid size-10 place-items-center rounded-full [&_svg]:size-5">{icon ?? <Inbox />}</div>
      <h3 className="text-fg text-sm font-semibold">{title}</h3>
      {description ? <p className="text-fg-muted mt-1 max-w-sm text-sm">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
