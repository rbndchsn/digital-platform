/** Service workspace layout: header, next-action banner, tabs (PRD §7.1). */
import { Link, Outlet, createFileRoute, useNavigate, useRouterState } from '@tanstack/react-router'
import { Archive, MoreHorizontal, PauseCircle, PlayCircle, XCircle } from 'lucide-react'
import { useState } from 'react'
import { services, team } from '@/api'
import type { ServiceDetail } from '@/api/services'
import { ActionPill } from '@/components/action-pill'
import { CoiDeclareCard } from '@/components/coi-declare'
import { ConfirmTyped } from '@/components/confirm-typed'
import { PageHeader } from '@/components/page-header'
import { StatusChip } from '@/components/status-chip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown'
import { Field, Textarea } from '@/components/ui/input'
import { Alert, Skeleton } from '@/components/ui/misc'
import { cn } from '@/lib/cn'
import { useMe } from '@/lib/auth'
import { fmtDate, roleLabel } from '@/lib/format'
import { useAppMutation } from '@/lib/query'
import { useService } from '@/lib/service-hooks'

export const Route = createFileRoute('/_app/engagements/$serviceId')({
  component: ServiceLayout,
})

const TABS = [
  { label: 'Overview', to: '' },
  { label: 'Phases', to: '/phases' },
  { label: 'Documents', to: '/documents' },
  { label: 'Findings', to: '/findings' },
  { label: 'Timeline', to: '/timeline' },
  { label: 'Opinion', to: '/opinion' },
  { label: 'Service Log', to: '/log' },
]

function ServiceLayout() {
  const { serviceId } = Route.useParams()
  const q = useService(serviceId)
  const me = useMe()
  const navigate = useNavigate()
  const path = useRouterState({ select: (s) => s.location.pathname })
  const base = `/engagements/${serviceId}`
  if (q.isError) {
    // A nominated team member whose COI is not approved cannot open the service: show the declaration instead.
    const myCoi = team.myCoiSync(serviceId)
    if (myCoi) return <CoiDeclareCard serviceId={serviceId} coi={myCoi} />
    return <Alert tone="danger" title="This engagement is not available to you">{(q.error as Error).message}</Alert>
  }
  if (!q.data) return <Skeleton className="h-64" />
  const d = q.data
  const s = d.service
  const myRoleLabel = d.myRoles.length ? d.myRoles.map(roleLabel).join(', ') : me.role ? roleLabel(me.role) : '—'
  return (
    <>
      <PageHeader
        crumbs={me.org.type === 'client' ? [{ label: 'Engagements', to: '/engagements' }, { label: s.reference }] : [{ label: 'My work', to: '/staff' }, { label: s.reference }]}
        title={s.name}
        description={`${d.project.name} · ${s.standard} · ${fmtDate(s.period_start)} – ${fmtDate(s.period_end)}`}
        meta={
          <>
            <StatusChip status={s.status} />
            <Badge tone="outline">{s.reference}</Badge>
            {me.org.type === 'verifier' ? <Badge tone="neutral">{d.orgName}</Badge> : null}
            <Badge tone="primary">Team role: {myRoleLabel}</Badge>
            {d.statementCode ? (
              <Link to="/verify/$code" params={{ code: d.statementCode }} className="text-primary text-xs font-semibold hover:underline">
                Statement {d.statementCode}
              </Link>
            ) : null}
          </>
        }
        actions={<ServiceActions detail={d} />}
      />
      {d.nextAction ? (
        <div className={cn('mb-5 flex flex-wrap items-center gap-3 rounded-card border px-4 py-3', d.actionForMe ? 'border-blocking/40 bg-blocking-soft/40' : 'border-info/30 bg-info-soft/40')}>
          <span className="text-fg text-sm font-medium">{d.actionForMe ? 'Needs you:' : d.nextAction.party === me.org.type ? 'Next on your side:' : d.nextAction.party === 'client' ? 'Waiting on the client:' : 'Waiting on VERIFASSUR:'}</span>
          <ActionPill action={d.nextAction} forMe={d.actionForMe} onClick={() => navigate({ to: '/engagements/$serviceId/phases', params: { serviceId }, search: d.nextAction?.step_id ? { step: d.nextAction.step_id } : {} })} />
          {d.nextAction.actor_user_id && d.nextAction.actor_user_id !== me.user.id ? <span className="text-fg-muted text-xs">assigned to a specific person</span> : null}
        </div>
      ) : s.status === 'closed' ? (
        <Alert tone="success" className="mb-5" title="This engagement is closed">
          The opinion was issued on {fmtDate(s.issued_at)} and the service closed on {fmtDate(s.closed_at)}.
        </Alert>
      ) : null}
      <nav className="border-border mb-5 flex gap-1 overflow-x-auto border-b" aria-label="Engagement sections">
        {TABS.map((t) => {
          const href = `${base}${t.to}`
          const active = t.to === '' ? path === base || path === `${base}/` : path.startsWith(href)
          return (
            <Link key={t.label} to={href} className={cn('-mb-px border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap', active ? 'border-primary text-fg' : 'text-fg-muted hover:text-fg border-transparent')}>
              {t.label}
              {t.label === 'Findings' && d.counts.findingsOpen ? <span className="bg-blocking ml-1.5 rounded-full px-1.5 text-[10px] font-bold text-white">{d.counts.findingsOpen}</span> : null}
            </Link>
          )
        })}
      </nav>
      <Outlet />
    </>
  )
}

function ServiceActions({ detail }: { detail: ServiceDetail }) {
  const me = useMe()
  const navigate = useNavigate()
  const s = detail.service
  const [hold, setHold] = useState(false)
  const [cancel, setCancel] = useState(false)
  const [close, setClose] = useState(false)
  const [reason, setReason] = useState('')
  const holdM = useAppMutation(() => services.hold(s.id, reason), { successMessage: 'Service put on hold.', onSuccess: () => setHold(false) })
  const resumeM = useAppMutation(() => services.resume(s.id), { successMessage: 'Service resumed.' })
  const cancelM = useAppMutation(() => services.cancel(s.id, reason || 'Cancelled'), { successMessage: 'Service cancelled.' })
  const closeM = useAppMutation(() => services.close(s.id), { successMessage: 'Service closed.' })
  const renewM = useAppMutation(() => services.renew(s.id), { successMessage: 'Renewal drafted.', onSuccess: (svc) => navigate({ to: '/engagements/new', search: { draft: svc.id } }) })
  const isManager = me.org.type === 'verifier' && me.role === 'verifier_manager'
  const isCoord = me.org.type === 'verifier' && (me.role === 'verifier_coordinator' || isManager)
  const active = ['contracting', 'planning', 'execution', 'opinion_review'].includes(s.status)
  if (me.org.type === 'client') {
    if (s.status === 'closed' && (me.role === 'client_admin' || me.role === 'client_owner')) {
      return (
        <Button variant="secondary" onClick={() => renewM.mutate()} loading={renewM.isPending}>
          Renew for next period
        </Button>
      )
    }
    return null
  }
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary">
            Actions <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {isManager && active ? (
            <DropdownMenuItem onSelect={() => setHold(true)}>
              <PauseCircle /> Put on hold
            </DropdownMenuItem>
          ) : null}
          {isManager && s.status === 'on_hold' ? (
            <DropdownMenuItem onSelect={() => resumeM.mutate()}>
              <PlayCircle /> Resume
            </DropdownMenuItem>
          ) : null}
          {isCoord && s.status === 'issued' ? (
            <DropdownMenuItem onSelect={() => setClose(true)}>
              <Archive /> Close service
            </DropdownMenuItem>
          ) : null}
          {isManager && (active || s.status === 'on_hold' || s.status === 'requested') ? (
            <DropdownMenuItem onSelect={() => setCancel(true)} className="text-danger">
              <XCircle /> Cancel service
            </DropdownMenuItem>
          ) : null}
          {!isManager && !isCoord ? <DropdownMenuItem disabled>No actions for your role</DropdownMenuItem> : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={hold} onOpenChange={setHold}>
        <DialogContent title="Put the service on hold" description="Both parties are notified and the timeline records the hold." size="sm">
          <Field label="Reason" required>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setHold(false)}>
              Cancel
            </Button>
            <Button onClick={() => holdM.mutate()} disabled={!reason.trim()} loading={holdM.isPending}>
              Put on hold
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmTyped open={cancel} onOpenChange={setCancel} title="Cancel this service?" description="The engagement stops and cannot be resumed. The client is notified." phrase="cancel" confirmLabel="Cancel service" onConfirm={() => cancelM.mutateAsync()} />
      <ConfirmTyped open={close} onOpenChange={setClose} title="Close the service?" description="The opinion has been issued. Closing archives the engagement and starts the retention period." phrase="close" confirmLabel="Close service" danger={false} onConfirm={() => closeM.mutateAsync()} />
    </>
  )
}
