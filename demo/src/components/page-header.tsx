import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface Crumb {
  label: string
  to?: string
}

export function PageHeader({ title, description, crumbs, actions, meta, className }: { title: ReactNode; description?: ReactNode; crumbs?: Crumb[]; actions?: ReactNode; meta?: ReactNode; className?: string }) {
  return (
    <header className={cn('mb-6', className)}>
      {crumbs?.length ? (
        <nav aria-label="Breadcrumb" className="text-fg-muted mb-2 flex flex-wrap items-center gap-1 text-xs">
          {crumbs.map((c, i) => (
            <span key={i} className="inline-flex items-center gap-1">
              {c.to ? (
                <Link to={c.to} className="hover:text-fg">
                  {c.label}
                </Link>
              ) : (
                <span className="text-fg">{c.label}</span>
              )}
              {i < crumbs.length - 1 ? <ChevronRight className="size-3" /> : null}
            </span>
          ))}
        </nav>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-fg text-2xl font-semibold tracking-tight">{title}</h1>
          {description ? <p className="text-fg-muted mt-1 max-w-3xl text-sm">{description}</p> : null}
          {meta ? <div className="mt-2 flex flex-wrap items-center gap-2">{meta}</div> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  )
}
