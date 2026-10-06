/** Triage queue (PRD FR-54, plan_v1 ch. 3): accept a request into Contracting or decline it. */
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Check, Inbox, X } from 'lucide-react'
import { useState } from 'react'
import { services } from '@/api'
import type { ServiceListItem } from '@/api/services'
import { templateFor } from '@/domain/workflow/templates'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Field, Textarea } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/misc'
import { fmtDate, fmtRelative } from '@/lib/format'
import { useAppMutation } from '@/lib/query'

export const Route = createFileRoute('/_app/staff/triage')({
  component: Triage,
})

function Triage() {
  const q = useQuery({ queryKey: ['services', 'triage'], queryFn: () => services.list({ status: ['requested', 'triage'] }) })
  return (
    <>
      <PageHeader title="Triage queue" description="New requests. Accepting instantiates the workflow template for the service type and starts Contracting; the client is notified either way." />
      {!q.data ? (
        <Skeleton className="h-40" />
      ) : q.data.length === 0 ? (
        <EmptyState icon={<Inbox />} title="Nothing to triage" description="New client requests appear here." />
      ) : (
        <div className="space-y-4">
          {q.data.map((it) => (
            <TriageCard key={it.id} item={it} />
          ))}
        </div>
      )}
    </>
  )
}

function TriageCard({ item }: { item: ServiceListItem }) {
  const navigate = useNavigate()
  const detail = useQuery({ queryKey: ['service', item.id], queryFn: () => services.get(item.id) })
  const [decline, setDecline] = useState(false)
  const [reason, setReason] = useState('')
  const template = templateFor(item.serviceType)
  const accept = useAppMutation(() => services.triage(item.id, 'accept'), { successMessage: `${item.reference} accepted; contracting has started.`, onSuccess: () => navigate({ to: '/engagements/$serviceId/phases', params: { serviceId: item.id } }) })
  const declineM = useAppMutation(() => services.triage(item.id, 'decline', reason), { successMessage: `${item.reference} declined.`, onSuccess: () => setDecline(false) })
  const s = detail.data?.service
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {item.name} <Badge tone="outline">{item.reference}</Badge>
          </span>
        }
        description={`${item.orgName} · ${item.projectName} · requested ${fmtRelative(item.requestedAt)}`}
        actions={
          <>
            <Button variant="ghost" onClick={() => setDecline(true)}>
              <X /> Decline
            </Button>
            <Button onClick={() => accept.mutate()} loading={accept.isPending}>
              <Check /> Accept into Contracting
            </Button>
          </>
        }
      />
      <CardContent>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[170px_1fr]">
          <dt className="text-fg-muted">Service type</dt>
          <dd>
            {item.serviceTypeLabel} <span className="text-fg-subtle">· {template.standard}</span>
          </dd>
          <dt className="text-fg-muted">Period</dt>
          <dd>
            {fmtDate(item.periodStart)} – {fmtDate(item.periodEnd)}
          </dd>
          {s ? (
            <>
              <dt className="text-fg-muted">Scope</dt>
              <dd>{s.scope_json.summary || '—'}</dd>
              {s.scope_json.sites.length ? (
                <>
                  <dt className="text-fg-muted">Sites</dt>
                  <dd>{s.scope_json.sites.join(', ')}</dd>
                </>
              ) : null}
              {s.scope_json.products.length ? (
                <>
                  <dt className="text-fg-muted">Products</dt>
                  <dd>{s.scope_json.products.join(', ')}</dd>
                </>
              ) : null}
              {s.scope_json.interventions.length ? (
                <>
                  <dt className="text-fg-muted">Interventions</dt>
                  <dd>{s.scope_json.interventions.join(', ')}</dd>
                </>
              ) : null}
              <dt className="text-fg-muted">Materiality</dt>
              <dd>{s.scope_json.materiality_pct != null ? `${s.scope_json.materiality_pct} %` : '—'}</dd>
              <dt className="text-fg-muted">Client contact</dt>
              <dd>{detail.data?.clientContactName ?? '—'}</dd>
              <dt className="text-fg-muted">Attachments</dt>
              <dd>{detail.data?.counts.documents ?? 0}</dd>
            </>
          ) : null}
          <dt className="text-fg-muted">Workflow</dt>
          <dd className="text-fg-muted text-xs">
            {template.phases.map((p) => `${p.name} (${p.steps.length} steps)`).join(' → ')} · {template.phases.flatMap((p) => p.steps).flatMap((st) => st.slots).filter((sl) => sl.required && sl.uploader_party === 'client').length} required client documents
          </dd>
        </dl>
      </CardContent>
      <Dialog open={decline} onOpenChange={setDecline}>
        <DialogContent title={`Decline ${item.reference}`} description="The client is told why. Typical reasons: outside accredited scope, impartiality threat, capacity." size="sm">
          <Field label="Reason" required>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDecline(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => declineM.mutate()} disabled={!reason.trim()} loading={declineM.isPending}>
              Decline request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
