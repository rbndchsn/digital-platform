/** Level-of-assurance badge and assurance history (PRD v0.3 FR-83, §7.3 "Assurance is always qualified"). */
import { History, ShieldCheck, ShieldOff } from 'lucide-react'
import { useState } from 'react'
import type { LevelOfAssurance } from '@/domain/enums'
import { LEVEL_OF_ASSURANCE_LABELS } from '@/domain/enums'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { cn } from '@/lib/cn'
import { fmtDateTime } from '@/lib/format'

export type AssuranceState = 'verified' | 'under_review' | 'withdrawn' | 'superseded'

/**
 * Badge states (PRD §7.2 "Records portfolio"): verified with level, under review (open post-issuance event or
 * revision), assurance withdrawn, superseded. `status` accepts the record `assurance_status`, a statement status or
 * the explicit `under_review` state.
 */
export function AssuranceBadge({ level, status, className }: { level: LevelOfAssurance | null | undefined; status?: string | null; className?: string }) {
  if (!level) return null
  if (status === 'withdrawn') {
    return (
      <Badge tone="danger" className={className} title="The statement this record relied on was withdrawn" data-assurance="withdrawn">
        <ShieldOff className="size-3" /> Assurance withdrawn
      </Badge>
    )
  }
  if (level === 'not_applicable')
    return (
      <Badge tone="outline" className={className} data-assurance="validation">
        Validation
      </Badge>
    )
  const label = level === 'reasonable' ? 'Reasonable' : 'Limited'
  if (status === 'under_review') {
    return (
      <Badge tone="warning" className={className} title="A post-issuance event or revision is open on the statement this record relies on" data-assurance="under_review">
        <ShieldCheck className="size-3" /> {label} assurance · under review
      </Badge>
    )
  }
  return (
    <Badge tone={status === 'superseded' ? 'neutral' : level === 'reasonable' ? 'success' : 'info'} className={className} title={LEVEL_OF_ASSURANCE_LABELS[level]} data-assurance={status === 'superseded' ? 'superseded' : 'verified'}>
      <ShieldCheck className="size-3" /> {label} assurance{status === 'superseded' ? ' · superseded' : ''}
    </Badge>
  )
}

/** Badge state of a record from its columns: a verified record back under verification is a revision in progress. */
export function recordAssuranceState(r: { status: string; assurance_status: string | null; assurance_ref: string | null }): string | null {
  if (r.assurance_status === 'withdrawn') return 'withdrawn'
  if (r.assurance_ref && r.status === 'under_verification') return 'under_review'
  return r.assurance_status
}

export type AssuranceHistoryRow ={ event: string; statementCode: string | null; levelOfAssurance: LevelOfAssurance; occurredAt: string }

const EVENT_LABEL: Record<string, string> = { written_back: 'Verified figures written back', superseded: 'Reference superseded', withdrawn: 'Assurance withdrawn' }

export function AssuranceHistory({ history, className }: { history: AssuranceHistoryRow[]; className?: string }) {
  if (!history.length) return null
  return (
    <div className={cn('bg-surface-muted/60 border-border rounded-md border px-3 py-2', className)}>
      <div className="text-fg-subtle mb-1 text-[11px] font-semibold uppercase tracking-wide">Assurance history</div>
      <HistoryList history={history} />
    </div>
  )
}

function HistoryList({ history }: { history: AssuranceHistoryRow[] }) {
  return (
    <ul className="space-y-0.5 text-xs">
      {history.map((h, i) => (
        <li key={i} className="flex flex-wrap items-center gap-2">
          <span className="text-fg-muted">{fmtDateTime(h.occurredAt)}</span>
          <span className={h.event === 'withdrawn' ? 'text-danger font-medium' : 'text-fg'}>{EVENT_LABEL[h.event] ?? h.event}</span>
          {h.statementCode ? <code className="text-fg-muted font-mono">{h.statementCode}</code> : null}
          <span className="text-fg-subtle">{h.levelOfAssurance === 'not_applicable' ? 'validation' : `${h.levelOfAssurance} assurance`}</span>
        </li>
      ))}
    </ul>
  )
}

/** Drawer-style dialog listing every write-back, supersession and withdrawal of a record (PRD FR-83). */
export function AssuranceHistoryButton({ history, title = 'Assurance history', className, size = 'sm' }: { history: AssuranceHistoryRow[]; title?: string; className?: string; size?: 'sm' | 'md' }) {
  const [open, setOpen] = useState(false)
  if (!history.length) return null
  return (
    <>
      <Button variant="ghost" size={size} className={className} onClick={() => setOpen(true)} data-testid="assurance-history">
        <History /> {title} ({history.length})
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={title} description="One row per write-back, revision or withdrawal. Nothing is deleted: a withdrawn or superseded reference stays readable here." size="md">
          <HistoryList history={history} />
        </DialogContent>
      </Dialog>
    </>
  )
}
