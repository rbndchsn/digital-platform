/** Overview tab: phase rail, next action, team, key dates, quote/invoice, counts, download-all. PRD §7.2. */
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { Mail, Receipt } from 'lucide-react'
import { toast } from 'sonner'
import { ActionPill } from '@/components/action-pill'
import { DownloadAllButton } from '@/components/download-all'
import { PhaseRail } from '@/components/phase-rail'
import { StatusChip } from '@/components/status-chip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Avatar, Skeleton } from '@/components/ui/misc'
import { useMe } from '@/lib/auth'
import { fmtDate, fmtMoney, roleLabel } from '@/lib/format'
import { useService } from '@/lib/service-hooks'

export const Route = createFileRoute('/_app/engagements/$serviceId/')({
  component: Overview,
})

function Overview() {
  const { serviceId } = Route.useParams()
  const q = useService(serviceId)
  const me = useMe()
  const navigate = useNavigate()
  if (!q.data) return <Skeleton className="h-64" />
  const d = q.data
  const s = d.service
  const quote = d.invoices.find((i) => i.kind === 'quote')
  const invoice = d.invoices.find((i) => i.kind === 'invoice')
  const currentStepId = d.nextAction?.step_id ?? d.phases.flatMap((p) => p.steps).find((st) => st.status !== 'completed' && st.status !== 'skipped')?.id ?? null
  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <div>
        <PhaseRail phases={d.phases.map((p) => ({ id: p.id, key: p.key, name: p.name, status: p.status, steps: p.steps.map((st) => ({ id: st.id, key: st.key, name: st.name, status: st.status })) }))} activeStepId={currentStepId} onSelect={(stepId) => navigate({ to: '/engagements/$serviceId/phases', params: { serviceId }, search: { step: stepId } })} />
      </div>
      <div className="space-y-5">
        <Card>
          <CardHeader title="Where this engagement stands" description={d.nextAction ? `Current step: ${d.phases.flatMap((p) => p.steps).find((st) => st.id === currentStepId)?.name ?? '—'}` : 'No open action'} actions={<StatusChip status={s.status} />} />
          <CardContent>
            {d.nextAction ? (
              <div className="flex flex-wrap items-center gap-3">
                <ActionPill action={d.nextAction} forMe={d.actionForMe} onClick={() => navigate({ to: '/engagements/$serviceId/phases', params: { serviceId }, search: d.nextAction?.step_id ? { step: d.nextAction.step_id } : {} })} />
                <span className="text-fg-muted text-xs">{d.actionForMe ? 'This is on you.' : `Waiting on ${d.nextAction.party === 'client' ? 'the client' : 'VERIFASSUR'} (${roleLabel(d.nextAction.role)}).`}</span>
              </div>
            ) : (
              <p className="text-fg-muted text-sm">Nothing is pending.</p>
            )}
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <Kv k="Requested" v={fmtDate(s.requested_at)} />
              <Kv k="Contracted" v={fmtDate(s.contracted_at)} />
              <Kv k="Target opinion date" v={fmtDate(s.target_opinion_date)} />
              <Kv k="Issued" v={fmtDate(s.issued_at)} />
            </dl>
          </CardContent>
        </Card>

        <div className="grid gap-5 md:grid-cols-2">
          <Card>
            <CardHeader title="Team" description="Everyone on this engagement and their role" />
            <CardContent>
              {d.team.length ? (
                <ul className="space-y-2">
                  {d.team.map((m) => (
                    <li key={m.id} className="flex items-center gap-3">
                      <Avatar name={m.name} tone={m.role === 'client_contact' ? 'neutral' : 'primary'} />
                      <div className="min-w-0 flex-1">
                        <div className="text-fg truncate text-sm font-medium">{m.name}</div>
                        <div className="text-fg-subtle truncate text-xs">
                          {roleLabel(m.role)} · {m.jobTitle}
                        </div>
                      </div>
                      {me.org.type === 'verifier' && m.coi ? <StatusChip status={m.coi.status} size="xs" label={m.coi.status === 'approved' ? 'COI cleared' : m.coi.status === 'declared' ? 'COI declared' : 'COI pending'} /> : null}
                      <Button size="icon" variant="ghost" aria-label={`E-mail ${m.name}`} onClick={() => toast.message(`Would open a draft to ${m.email}.`)}>
                        <Mail />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-fg-muted text-sm">The team is nominated during contracting.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="Quote and invoice" description="Commercial status of this engagement" />
            <CardContent>
              {quote || invoice ? (
                <dl className="space-y-2 text-sm">
                  {quote ? (
                    <div className="flex items-center justify-between">
                      <dt className="text-fg-muted">
                        Quote {quote.reference}
                        <span className="text-fg-subtle ml-1 text-xs">{fmtDate(quote.issued_at)}</span>
                      </dt>
                      <dd className="font-medium">{fmtMoney(quote.amount_minor, quote.currency)}</dd>
                    </div>
                  ) : null}
                  {invoice ? (
                    <div className="flex items-center justify-between">
                      <dt className="text-fg-muted">
                        Invoice {invoice.reference}
                        <span className="text-fg-subtle ml-1 text-xs">due {fmtDate(invoice.due_at)}</span>
                      </dt>
                      <dd className="flex items-center gap-2 font-medium">
                        {fmtMoney(invoice.amount_minor, invoice.currency)}
                        <StatusChip status={invoice.status} size="xs" />
                      </dd>
                    </div>
                  ) : null}
                  {invoice?.paid_at ? <p className="text-success text-xs">Paid on {fmtDate(invoice.paid_at)}.</p> : null}
                </dl>
              ) : (
                <p className="text-fg-muted text-sm">A quote is issued after triage.</p>
              )}
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => toast.message('Would open the quote PDF.')}>
                  <Receipt /> View quote
                </Button>
                {me.org.type === 'verifier' ? (
                  <Button size="sm" variant="ghost" asChild>
                    <Link to="/staff/finance">Manage in Finance</Link>
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader title="At a glance" actions={<DownloadAllButton serviceId={serviceId} />} />
          <CardContent className="grid gap-3 text-sm sm:grid-cols-4">
            <Stat label="Documents" value={d.counts.documents} to={`/engagements/${serviceId}/documents`} />
            <Stat label="Open findings" value={d.counts.findingsOpen} to={`/engagements/${serviceId}/findings`} tone={d.counts.findingsOpen ? 'blocking' : undefined} />
            <Stat label="Findings (total)" value={d.counts.findingsTotal} to={`/engagements/${serviceId}/findings`} />
            <Stat label="Opinion iterations" value={d.counts.iterations} to={`/engagements/${serviceId}/opinion`} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-fg-subtle text-xs">{k}</dt>
      <dd className="text-fg font-medium">{v}</dd>
    </div>
  )
}

function Stat({ label, value, to, tone }: { label: string; value: number; to: string; tone?: 'blocking' }) {
  return (
    <Link to={to} className="hover:bg-surface-muted rounded-md px-2 py-1">
      <div className={`text-2xl font-semibold tabular-nums ${tone === 'blocking' ? 'text-blocking' : 'text-fg'}`}>{value}</div>
      <div className="text-fg-muted text-xs">{label}</div>
      {tone === 'blocking' ? <Badge tone="blocking" className="mt-1">needs attention</Badge> : null}
    </Link>
  )
}
