/** Level-of-assurance badge and assurance history (PRD v0.3 FR-83, §7.3 "Assurance is always qualified"). */
import { ShieldCheck, ShieldOff } from 'lucide-react'
import type { LevelOfAssurance } from '@/domain/enums'
import { LEVEL_OF_ASSURANCE_LABELS } from '@/domain/enums'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/cn'
import { fmtDateTime } from '@/lib/format'

export function AssuranceBadge({ level, status, className }: { level: LevelOfAssurance | null | undefined; status?: string | null; className?: string }) {
  if (!level) return null
  if (status === 'withdrawn') {
    return (
      <Badge tone="danger" className={className} title="The statement this record relied on was withdrawn">
        <ShieldOff className="size-3" /> Assurance withdrawn
      </Badge>
    )
  }
  if (level === 'not_applicable') return <Badge tone="outline" className={className}>Validation</Badge>
  return (
    <Badge tone={status === 'superseded' ? 'neutral' : level === 'reasonable' ? 'success' : 'info'} className={className} title={LEVEL_OF_ASSURANCE_LABELS[level]}>
      <ShieldCheck className="size-3" /> {level === 'reasonable' ? 'Reasonable' : 'Limited'} assurance{status === 'superseded' ? ' · superseded' : ''}
    </Badge>
  )
}

export function AssuranceHistory({ history, className }: { history: { event: string; statementCode: string | null; levelOfAssurance: LevelOfAssurance; occurredAt: string }[]; className?: string }) {
  if (!history.length) return null
  const label: Record<string, string> = { written_back: 'Verified figures written back', superseded: 'Reference superseded', withdrawn: 'Assurance withdrawn' }
  return (
    <div className={cn('bg-surface-muted/60 border-border rounded-md border px-3 py-2', className)}>
      <div className="text-fg-subtle mb-1 text-[11px] font-semibold uppercase tracking-wide">Assurance history</div>
      <ul className="space-y-0.5 text-xs">
        {history.map((h, i) => (
          <li key={i} className="flex flex-wrap items-center gap-2">
            <span className="text-fg-muted">{fmtDateTime(h.occurredAt)}</span>
            <span className={h.event === 'withdrawn' ? 'text-danger font-medium' : 'text-fg'}>{label[h.event] ?? h.event}</span>
            {h.statementCode ? <code className="text-fg-muted font-mono">{h.statementCode}</code> : null}
            <span className="text-fg-subtle">{h.levelOfAssurance === 'not_applicable' ? 'validation' : `${h.levelOfAssurance} assurance`}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
