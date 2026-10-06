import { Tabs as RT } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

export const Tabs = RT.Root
export const TabsContent = RT.Content

export function TabsList({ className, ...props }: ComponentProps<typeof RT.List>) {
  return <RT.List className={cn('border-border flex items-end gap-1 border-b', className)} {...props} />
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof RT.Trigger>) {
  return (
    <RT.Trigger
      className={cn(
        'text-fg-muted hover:text-fg -mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors data-[state=active]:border-primary data-[state=active]:text-fg',
        className,
      )}
      {...props}
    />
  )
}
