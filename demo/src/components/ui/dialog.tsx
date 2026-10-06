import { Dialog as RD } from 'radix-ui'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export const Dialog = RD.Root
export const DialogTrigger = RD.Trigger
export const DialogClose = RD.Close

export function DialogContent({ children, className, title, description, size = 'md', hideClose }: { children: ReactNode; className?: string; title: ReactNode; description?: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl'; hideClose?: boolean }) {
  const width = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size]
  return (
    <RD.Portal>
      <RD.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in" />
      <RD.Content className={cn('bg-surface border-border fixed top-1/2 left-1/2 z-50 flex max-h-[90vh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-card border shadow-card focus:outline-none', width, className)}>
        <div className="border-border flex items-start justify-between gap-4 border-b px-5 py-4">
          <div>
            <RD.Title className="text-fg text-base font-semibold">{title}</RD.Title>
            {description ? <RD.Description className="text-fg-muted mt-1 text-sm">{description}</RD.Description> : <RD.Description className="sr-only">{typeof title === 'string' ? title : 'Dialog'}</RD.Description>}
          </div>
          {!hideClose ? (
            <RD.Close className="text-fg-muted hover:bg-surface-muted hover:text-fg rounded-md p-1" aria-label="Close">
              <X className="size-4" />
            </RD.Close>
          ) : null}
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </RD.Content>
    </RD.Portal>
  )
}

export function DialogFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mt-4 flex flex-wrap items-center justify-end gap-2', className)}>{children}</div>
}
