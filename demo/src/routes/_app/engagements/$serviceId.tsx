/** Service workspace layout: header, next-action banner, tabs (PRD §7.1). v0.3: level-of-assurance badge and lock, revision state, "under review" marker. */
import { useQuery } from '@tanstack/react-query'
import { Link, Outlet, createFileRoute, useNavigate, useRouterState } from '@tanstack/react-router'
import { Archive, Eye, KeyRound, Lock, MoreHorizontal, PauseCircle, PlayCircle, ShieldAlert, XCircle } from 'lucide-react'
import { useState } from 'react'
import { admin, services, team } from '@/api'
import type { ServiceDetail } from '@/api/services'
import type { LevelOfAssurance, ServiceOverrideAction } from '@/domain/enums'
import { ActionPill } from '@/components/action-pill'
import { AppealButton } from '@/components/appeal-button'
import { AssuranceBadge } from '@/components/assurance-badge'
import { CoiDeclareCard } from '@/components/coi-declare'
import { ConfirmTyped } from '@/components/confirm-typed'
import { PageHeader } from '@/components/page-header'
import { ReasonDialog } from '@/components/reason-dialog'
import { StatusChip } from '@/components/status-chip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown'
import { Field, NativeSelect, Textarea } from '@/components/ui/input'
import { Alert, Skeleton, Tooltip } from '@/components/ui/misc'
import { cn } from '@/lib/cn'
import { useMe } from '@/lib/auth'
import { fmtDate, fmtDateTime, roleLabel } from '@/lib/format'
import { useAppMutation } from '@/lib/query'
import { usePostIssuanceEvents, useService } from '@/lib/service-hooks'

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
  const events = usePostIssuanceEvents(serviceId, Boolean(q.data?.statementCode))
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
  const underReview = (events.data ?? []).some((e) => e.status === 'open') || s.status === 'in_revision'
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
            {d.assuranceApplies ? (
              <span className="inline-flex items-center gap-1" data-testid="service-assurance">
                <AssuranceBadge level={s.level_of_assurance} status={d.statementStatus === 'withdrawn' ? 'withdrawn' : null} />
                {s.assurance_level_locked_at ? (
                  <Tooltip content={`Level of assurance locked at agreement acceptance on ${fmtDateTime(s.assurance_level_locked_at)}; only a manager override with an amended agreement changes it (PRD FR-81).`}>
                    <Lock className="text-fg-subtle size-3.5 cursor-help" aria-label="Level of assurance locked" />
                  </Tooltip>
                ) : null}
              </span>
            ) : (
              <AssuranceBadge level={s.level_of_assurance} />
            )}
            {me.org.type === 'verifier' ? <Badge tone="neutral">{d.orgName}</Badge> : null}
            <Badge tone="primary">Team role: {myRoleLabel}</Badge>
            {d.statementCode ? (
              <Link to="/verify/$code" params={{ code: d.statementCode }} className={cn('text-xs font-semibold hover:underline', d.statementStatus === 'withdrawn' ? 'text-danger' : 'text-primary')}>
                Statement {d.statementCode}
                {d.statementStatus && d.statementStatus !== 'issued' ? ` (${d.statementStatus})` : ''}
              </Link>
            ) : null}
          </>
        }
        actions={<ServiceActions detail={d} />}
      />
      {me.isAdmin ? <AdminReadOnlyBanner serviceId={serviceId} reference={s.reference} /> : null}
      {d.nextAction ? (
        <div className={cn('mb-5 flex flex-wrap items-center gap-3 rounded-card border px-4 py-3', d.actionForMe ? 'border-blocking/40 bg-blocking-soft/40' : 'border-info/30 bg-info-soft/40')}>
          <span className="text-fg text-sm font-medium">{d.actionForMe ? 'Needs you:' : d.nextAction.party === me.org.type ? 'Next on your side:' : d.nextAction.party === 'client' ? 'Waiting on the client:' : 'Waiting on VERIFASSUR:'}</span>
          <ActionPill action={d.nextAction} forMe={d.actionForMe} onClick={() => navigate({ to: '/engagements/$serviceId/phases', params: { serviceId }, search: d.nextAction?.step_id ? { step: d.nextAction.step_id } : {} })} />
          {d.nextAction.actor_user_id && d.nextAction.actor_user_id !== me.user.id ? <span className="text-fg-muted text-xs">assigned to a specific person</span> : null}
        </div>
      ) : s.status === 'closed' ? (
        <Alert tone={d.statementStatus === 'withdrawn' ? 'danger' : 'success'} className="mb-5" title={d.statementStatus === 'withdrawn' ? 'This engagement is closed; its statement was withdrawn' : 'This engagement is closed'}>
          The opinion was issued on {fmtDate(s.issued_at)} and the service closed on {fmtDate(s.closed_at)}.{d.statementStatus === 'withdrawn' ? ' The records that relied on the statement show “assurance withdrawn”; see the Opinion tab.' : ''}
        </Alert>
      ) : s.status === 'cancelled' && !s.issued_at && s.on_hold_reason && !s.contracted_at ? (
        <Alert tone="danger" className="mb-5" title="Request declined by VERIFASSUR">
          <span>{s.on_hold_reason}</span>
          <div className="mt-2">
            <AppealButton serviceId={s.id} decisionEntityType="service" decisionEntityId={s.id} subject={`Declined request ${s.reference}`} />
          </div>
        </Alert>
      ) : null}
      <nav className="border-border mb-5 flex gap-1 overflow-x-auto border-b" aria-label="Engagement sections">
        {TABS.map((t) => {
          const href = `${base}${t.to}`
          const active = t.to === '' ? path === base || path === `${base}/` : path.startsWith(href) || (t.to === '/opinion' && path.startsWith(`${base}/misstatements`))
          return (
            <Link key={t.label} to={href} className={cn('-mb-px border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap', active ? 'border-primary text-fg' : 'text-fg-muted hover:text-fg border-transparent')}>
              {t.label}
              {t.label === 'Findings' && d.counts.findingsOpen ? <span className="bg-blocking ml-1.5 rounded-full px-1.5 text-[10px] font-bold text-white">{d.counts.findingsOpen}</span> : null}
              {t.label === 'Opinion' && underReview ? <Badge tone="warning" className="ml-1.5 px-1.5 text-[9px]">Under review</Badge> : null}
            </Link>
          )
        })}
      </nav>
      <Outlet />
    </>
  )
}

/** PRD §7.3: the platform administrator is read-only; evidence content needs break-glass (FR-70). */
function AdminReadOnlyBanner({ serviceId, reference }: { serviceId: string; reference: string }) {
  const q = useQuery({ queryKey: ['breakGlass', serviceId], queryFn: async () => admin.canReadEvidenceContentSync(serviceId) })
  const [ask, setAsk] = useState(false)
  const m = useAppMutation((reason: string) => admin.breakGlass(serviceId, reason), { successMessage: `Break-glass access to ${reference} recorded; the managers were notified.` })
  const granted = q.data === true
  return (
    <>
      <Alert tone="warning" className="mb-5" icon={<Eye />} title="Platform administrator: read-only view">
        <span>You see every detail of this engagement but cannot act on it. {granted ? 'Evidence content is open for this session under break-glass access; every view is logged.' : 'Document contents stay closed until you request break-glass access with a reason.'}</span>
        {!granted ? (
          <Button size="sm" variant="secondary" className="ml-3 opacity-100" onClick={() => setAsk(true)}>
            <KeyRound /> Break-glass access
          </Button>
        ) : null}
      </Alert>
      <ReasonDialog open={ask} onOpenChange={setAsk} title={`Break-glass access to ${reference}`} description="Grants you the content of the evidence on this engagement for the rest of this session. The request and every subsequent view are written to the audit log and the verifier managers are notified." reasonLabel="Why do you need the evidence content?" placeholder="e.g. Support ticket 2210: the client cannot open the activity data sample." confirmLabel="Request access" onConfirm={(reason) => m.mutateAsync(reason)} />
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
  const [override, setOverride] = useState<ServiceOverrideAction | null>(null)
  const [level, setLevel] = useState<LevelOfAssurance>(s.level_of_assurance === 'limited' ? 'reasonable' : 'limited')
  const holdM = useAppMutation(() => services.hold(s.id, reason), { successMessage: 'Service put on hold.', onSuccess: () => setHold(false) })
  const resumeM = useAppMutation(() => services.resume(s.id), { successMessage: 'Service resumed.' })
  const cancelM = useAppMutation(() => services.cancel(s.id, reason || 'Cancelled'), { successMessage: 'Service cancelled.' })
  const closeM = useAppMutation(() => services.close(s.id), { successMessage: 'Service closed.' })
  const overrideM = useAppMutation(({ action, r }: { action: ServiceOverrideAction; r: string }) => services.overrideService(s.id, action, r, action === 'change_assurance_level' ? { levelOfAssurance: level } : {}), {
    successMessage: (svc) => (override === 'change_assurance_level' ? `Override recorded: level of assurance is now ${svc.level_of_assurance}. The amended agreement must be accepted again and materiality re-approved.` : `Override recorded: ${svc.reference} is now ${svc.status.replace('_', ' ')}. Both parties were notified.`),
  })
  const renewM = useAppMutation(() => services.renew(s.id), { successMessage: 'Renewal drafted.', onSuccess: (svc) => navigate({ to: '/engagements/new', search: { draft: svc.id } }) })
  const isManager = me.org.type === 'verifier' && !me.isAdmin && me.role === 'verifier_manager'
  const isCoord = me.org.type === 'verifier' && !me.isAdmin && (me.role === 'verifier_coordinator' || isManager)
  const active = ['contracting', 'planning', 'execution', 'opinion_review'].includes(s.status)
  const canChangeLevel = isManager && detail.assuranceApplies && !['issued', 'closed', 'cancelled', 'in_revision'].includes(s.status) && !detail.statementCode
  // The platform administrator changes nothing on an engagement (PRD §3.2 v0.2).
  if (me.isAdmin) return null
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
  const overrideTitle = override === 'return_to_execution' ? 'Override: return the service to execution' : override === 'change_assurance_level' ? 'Override: change the level of assurance' : 'Override: close the service'
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
          {isManager && s.status === 'opinion_review' ? (
            <DropdownMenuItem onSelect={() => setOverride('return_to_execution')}>
              <ShieldAlert /> Override: return to execution
            </DropdownMenuItem>
          ) : null}
          {isManager && s.status === 'issued' ? (
            <DropdownMenuItem onSelect={() => setOverride('close')}>
              <ShieldAlert /> Override: close with reason
            </DropdownMenuItem>
          ) : null}
          {canChangeLevel ? (
            <DropdownMenuItem onSelect={() => setOverride('change_assurance_level')}>
              <ShieldAlert /> Override: change level of assurance
            </DropdownMenuItem>
          ) : null}
          {!isManager && !isCoord ? <DropdownMenuItem disabled>No actions for your role</DropdownMenuItem> : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <ReasonDialog
        open={override !== null}
        onOpenChange={(o) => !o && setOverride(null)}
        title={overrideTitle}
        description={override === 'change_assurance_level' ? `Currently ${s.level_of_assurance} assurance${s.assurance_level_locked_at ? `, locked at agreement acceptance on ${fmtDate(s.assurance_level_locked_at)}` : ''}. Changing it reopens the agreement acceptance for an amended agreement (the agreement step is not overridden) and returns the materiality setting to draft (PRD FR-81).` : 'A manager override of the service status. Both parties are notified and the Service Log records it as an override with your reason.'}
        reasonLabel="Reason for the override"
        confirmLabel="Apply override"
        danger
        onConfirm={(r) => override && overrideM.mutateAsync({ action: override, r })}
      >
        {override === 'change_assurance_level' ? (
          <Field label="New level of assurance" required>
            <NativeSelect value={level} onChange={(e) => setLevel(e.target.value as LevelOfAssurance)}>
              {(['limited', 'reasonable'] as LevelOfAssurance[]).filter((l) => l !== s.level_of_assurance).map((l) => (
                <option key={l} value={l}>
                  {l === 'limited' ? 'Limited assurance' : 'Reasonable assurance'}
                </option>
              ))}
            </NativeSelect>
          </Field>
        ) : null}
      </ReasonDialog>
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
