import { Link, useNavigate } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import type { ServiceListItem } from '@/api/services'
import { ActionPill } from '@/components/action-pill'
import { StatusChip } from '@/components/status-chip'
import { Badge } from '@/components/ui/badge'
import { TBody, TD, TH, THead, TR, Table } from '@/components/ui/table'
import { fmtDate, fmtRelative } from '@/lib/format'
import { EmptyState } from './empty-state'

export function PhaseStepChip({ item }: { item: ServiceListItem }) {
  if (!item.phaseName) return <span className="text-fg-subtle text-xs">—</span>
  return (
    <span className="bg-primary-soft text-primary-strong inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap">
      <span>{item.phaseName}</span>
      <span className="opacity-50">|</span>
      <span className="truncate font-medium">{item.stepName}</span>
    </span>
  )
}

export function PaidBadge({ status }: { status: ServiceListItem['paidStatus'] }) {
  const map = { paid: ['success', 'Paid'], invoiced: ['info', 'Invoiced'], quoted: ['neutral', 'Quoted'], none: ['outline', '—'] } as const
  const [tone, label] = map[status]
  return <Badge tone={tone}>{label}</Badge>
}

export function ServiceTable({ items, variant = 'ongoing', showClient, emptyTitle = 'No engagements', emptyDescription, emptyAction }: { items: ServiceListItem[]; variant?: 'ongoing' | 'past' | 'drafts'; showClient?: boolean; emptyTitle?: string; emptyDescription?: ReactNode; emptyAction?: ReactNode }) {
  const navigate = useNavigate()
  if (items.length === 0) return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
  const go = (id: string) => navigate({ to: '/engagements/$serviceId', params: { serviceId: id } })
  return (
    <Table>
      <THead>
        <tr>
          <TH>Engagement</TH>
          {showClient ? <TH>Client</TH> : null}
          <TH>Type</TH>
          {variant === 'past' ? (
            <>
              <TH>Period</TH>
              <TH>Issued</TH>
              <TH>Paid</TH>
            </>
          ) : variant === 'drafts' ? (
            <>
              <TH>Created</TH>
              <TH />
            </>
          ) : (
            <>
              <TH>Status</TH>
              <TH>Phase | Step</TH>
              <TH>Next action</TH>
              <TH>Team leader</TH>
            </>
          )}
        </tr>
      </THead>
      <TBody>
        {items.map((it) => (
          <TR key={it.id} clickable onClick={() => go(it.id)}>
            <TD>
              <div className="text-fg-subtle text-[11px] font-medium">{it.reference}</div>
              <Link to="/engagements/$serviceId" params={{ serviceId: it.id }} className="text-primary-strong font-semibold hover:underline" onClick={(e) => e.stopPropagation()}>
                {it.name}
              </Link>
              <div className="text-fg-subtle text-xs">{it.projectName}</div>
            </TD>
            {showClient ? <TD className="text-fg-muted">{it.orgName}</TD> : null}
            <TD>
              <div className="max-w-56 truncate text-xs" title={it.serviceTypeLabel}>
                {it.serviceTypeLabel}
              </div>
              <div className="text-fg-subtle truncate text-[11px]">{it.standard}</div>
            </TD>
            {variant === 'past' ? (
              <>
                <TD className="text-fg-muted text-xs whitespace-nowrap">
                  {fmtDate(it.periodStart)} – {fmtDate(it.periodEnd)}
                </TD>
                <TD className="text-fg-muted text-xs whitespace-nowrap">{fmtDate(it.issuedAt)}</TD>
                <TD>
                  <PaidBadge status={it.paidStatus} />
                </TD>
              </>
            ) : variant === 'drafts' ? (
              <>
                <TD className="text-fg-muted text-xs">{fmtRelative(it.updatedAt)}</TD>
                <TD className="text-right">
                  <Link to="/engagements/new" search={{ draft: it.id }} className="text-primary text-xs font-semibold hover:underline" onClick={(e) => e.stopPropagation()}>
                    Continue →
                  </Link>
                </TD>
              </>
            ) : (
              <>
                <TD>
                  <StatusChip status={it.status} />
                </TD>
                <TD>
                  <PhaseStepChip item={it} />
                </TD>
                <TD>
                  <ActionPill action={it.nextAction} forMe={it.actionForMe} compact />
                </TD>
                <TD className="text-fg-muted text-xs">{it.teamLeaderName ?? '—'}</TD>
              </>
            )}
          </TR>
        ))}
      </TBody>
    </Table>
  )
}
