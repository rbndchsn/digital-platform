import { Tooltip } from '@/components/ui/misc'
import { cn } from '@/lib/cn'
import { fmtDateTime, fmtRelative } from '@/lib/format'

/** "v3 · uploaded 04 Feb 2026 14:02 UTC by H. Morgan · via web" (PRD §7.3). */
export function ProvenanceLine({ version, at, by, source = 'manual', className, verb = 'uploaded' }: { version?: number | null; at: string | null | undefined; by: string | null | undefined; source?: string; className?: string; verb?: string }) {
  const via = { manual: 'web', import: 'import', api: 'API', mcp: 'MCP' }[source] ?? source
  return (
    <span className={cn('text-fg-subtle inline-flex flex-wrap items-center gap-x-1 text-[11px]', className)}>
      {version != null ? <span className="text-fg-muted font-medium">v{version}</span> : null}
      {version != null ? <span>·</span> : null}
      <span>{verb}</span>
      <Tooltip content={fmtDateTime(at)}>
        <span className="underline decoration-dotted underline-offset-2">{fmtRelative(at)}</span>
      </Tooltip>
      {by ? <span>by {by}</span> : null}
      <span>·</span>
      <span>via {via}</span>
    </span>
  )
}

export function Hash({ value, className }: { value: string; className?: string }) {
  return (
    <Tooltip content={<span className="font-mono break-all">{value}</span>}>
      <code className={cn('bg-surface-muted text-fg-muted rounded px-1 py-0.5 font-mono text-[10px]', className)}>{value.slice(0, 8)}…{value.slice(-6)}</code>
    </Tooltip>
  )
}
