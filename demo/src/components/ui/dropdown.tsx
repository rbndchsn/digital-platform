import { DropdownMenu as RM } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

export const DropdownMenu = RM.Root
export const DropdownMenuTrigger = RM.Trigger

export function DropdownMenuContent({ className, ...props }: ComponentProps<typeof RM.Content>) {
  return (
    <RM.Portal>
      <RM.Content sideOffset={6} align="end" className={cn('bg-surface border-border z-50 min-w-48 rounded-md border p-1 shadow-card', className)} {...props} />
    </RM.Portal>
  )
}

export function DropdownMenuItem({ className, ...props }: ComponentProps<typeof RM.Item>) {
  return <RM.Item className={cn('text-fg hover:bg-surface-muted focus:bg-surface-muted flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled]:opacity-50 [&_svg]:size-4', className)} {...props} />
}

export function DropdownMenuLabel({ className, ...props }: ComponentProps<typeof RM.Label>) {
  return <RM.Label className={cn('text-fg-subtle px-2 py-1.5 text-xs font-semibold uppercase tracking-wide', className)} {...props} />
}

export function DropdownMenuSeparator({ className, ...props }: ComponentProps<typeof RM.Separator>) {
  return <RM.Separator className={cn('bg-border my-1 h-px', className)} {...props} />
}
