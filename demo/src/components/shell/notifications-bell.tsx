import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Bell, CheckCheck } from 'lucide-react'
import { notifications } from '@/api'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown'
import { cn } from '@/lib/cn'
import { fmtRelative } from '@/lib/format'
import { useAppMutation } from '@/lib/query'

export function NotificationsBell() {
  const navigate = useNavigate()
  const q = useQuery({ queryKey: ['notifications', 'bell'], queryFn: () => notifications.list({ limit: 8 }), refetchInterval: 4000 })
  const unread = q.data?.filter((n) => !n.read_at).length ?? 0
  const markRead = useAppMutation((id: string) => notifications.markRead(id), { silent: true })
  const markAll = useAppMutation(() => notifications.markAllRead(), { silent: true })
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} className="relative">
          <Bell />
          {unread > 0 ? <span className="bg-blocking absolute top-1 right-1 grid min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold text-white">{unread}</span> : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-96">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="px-0 py-0">Latest notifications</DropdownMenuLabel>
          <Button variant="ghost" size="sm" onClick={() => markAll.mutate()} disabled={unread === 0}>
            <CheckCheck /> Mark all read
          </Button>
        </div>
        <DropdownMenuSeparator />
        {q.data?.length ? (
          q.data.map((n) => (
            <DropdownMenuItem
              key={n.id}
              className="items-start py-2"
              onSelect={() => {
                if (!n.read_at) markRead.mutate(n.id)
                if (n.href) navigate({ to: n.href })
              }}
            >
              <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.read_at ? 'bg-border' : 'bg-blocking')} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className={cn('block truncate text-sm', !n.read_at && 'font-semibold')}>{n.title}</span>
                <span className="text-fg-muted line-clamp-2 block text-xs">{n.body}</span>
                <span className="text-fg-subtle block text-[11px]">
                  {n.serviceReference ? `${n.serviceReference} · ` : ''}
                  {fmtRelative(n.created_at)}
                </span>
              </span>
            </DropdownMenuItem>
          ))
        ) : (
          <p className="text-fg-muted px-2 py-4 text-center text-sm">You're all caught up.</p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
