/**
 * Step detail: slots, approvals, checklist, step actions, manager overrides, team/COI with competence and rotation
 * checks, materiality on the audit plan step (PRD §7.2 "Step detail", §6.14; v0.3 FR-80, FR-84, FR-96, FR-98).
 */
import { Link } from '@tanstack/react-router'
import { CalendarClock, CheckCircle2, FileText, Lock, Mail, PlayCircle, Repeat, RotateCcw, Scale, ShieldAlert, SkipForward, Upload, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { competence, services, team } from '@/api'
import type { CandidateCheck, HistoryLine, ProfileView } from '@/api/competence'
import type { ServiceDetail, SlotView, TeamView } from '@/api/services'
import type { ServiceRole, StepOverrideAction } from '@/domain/enums'
import { QUALIFICATION_KIND_LABELS } from '@/domain/enums'
import { ApprovalRow } from '@/components/approval-row'
import { CheckResultList } from '@/components/check-results'
import { DocumentRow } from '@/components/document-row'
import { ReasonDialog } from '@/components/reason-dialog'
import { ShowDontDoDialog } from '@/components/show-dont-do'
import { StatusChip } from '@/components/status-chip'
import { UploadDialog } from '@/components/upload-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown'
import { Field, Input, NativeSelect, Textarea } from '@/components/ui/input'
import { Alert, Avatar, Checkbox, Tooltip } from '@/components/ui/misc'
import { useMe } from '@/lib/auth'
import { fmtDate, fmtDateTime, roleLabel } from '@/lib/format'
import { useAppMutation } from '@/lib/query'
import { useMisstatements, useProfiles, useServiceDocuments, useTeamChecks } from '@/lib/service-hooks'
import { MaterialityPanel, MisstatementLink } from './materiality'
import { useServicePermissions } from './permissions'
import { useQuery } from '@tanstack/react-query'

export { useServicePermissions } from './permissions'

type Step = ServiceDetail['phases'][number]['steps'][number]

export function StepDetail({ detail, step, phaseName }: { detail: ServiceDetail; step: Step; phaseName: string }) {
  const perms = useServicePermissions(detail)
  const docs = useServiceDocuments(detail.service.id)
  const [uploadSlot, setUploadSlot] = useState<SlotView | null>(null)
  const [requestSlot, setRequestSlot] = useState<SlotView | null>(null)
  const [override, setOverride] = useState<StepOverrideAction | null>(null)
  const [replan, setReplan] = useState(false)
  const transition = useAppMutation((action: 'start' | 'complete' | 'reopen' | 'hold' | 'resume') => services.transitionStep(detail.service.id, step.id, action), { successMessage: (st) => `${st.name}: ${st.status.replace('_', ' ')}.` })
  const overrideM = useAppMutation(({ action, reason }: { action: StepOverrideAction; reason: string }) => services.overrideStep(detail.service.id, step.id, action, reason), { successMessage: (st) => `Override recorded: ${st.name} is now ${st.status.replace('_', ' ')}. Both parties were notified.` })
  const required = step.slots.filter((s) => s.required)
  const optional = step.slots.filter((s) => !s.required)
  const docOf = (slot: SlotView) => docs.data?.find((x) => x.id === slot.document?.id)
  const canUploadTo = (slot: SlotView) => (slot.uploader_party === 'client' ? perms.canUploadClient : perms.canUploadVerifier)
  const teamMember = (userId: string | null) => detail.team.find((t) => t.userId === userId)?.name ?? null
  const deciderName = (by: string | null) => (by ? (teamMember(by) ?? detail.team.find((t) => t.userId === by)?.name ?? 'Helena Brandt') : null)
  const msaSlot = detail.phases.flatMap((p) => p.steps).flatMap((s) => s.slots).find((s) => s.key === 'msa') ?? null
  const isCurrent = detail.nextAction?.step_id === step.id
  const done = step.status === 'completed' || step.status === 'skipped'
  const phase = detail.phases.find((p) => p.id === step.phase_id)
  const overrideTitles: Record<StepOverrideAction, string> = { complete: `Force "${step.name}" to completed`, reopen: `Reopen "${step.name}" by override`, skip: `Skip "${step.name}" by override` }
  // PRD v0.3 FR-80: the lock is a step attribute copied from the template; the UI never hard-codes step keys.
  const locked = step.non_overridable

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title={
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-fg-subtle text-sm font-normal">{phaseName} ›</span> {step.name}
              <StatusChip status={step.status} />
              {isCurrent ? <Badge tone="blocking">Current step</Badge> : null}
              {locked ? (
                <Tooltip content="Cannot be completed or skipped by override (template attribute non_overridable, PRD FR-80). Reopening stays allowed.">
                  <Badge tone="outline" className="cursor-help" data-testid="non-overridable">
                    <Lock className="size-3" /> Non-overridable
                  </Badge>
                </Tooltip>
              ) : null}
              {step.lastOverride ? (
                <Badge tone="warning" title={step.lastOverride.reason ?? undefined}>
                  {step.lastOverride.action === 'complete' ? 'Completed' : step.lastOverride.action === 'reopen' ? 'Reopened' : 'Skipped'} by override
                </Badge>
              ) : null}
            </span>
          }
          description={step.description}
          actions={
            perms.canTransition || perms.canOverride || perms.canReplan ? (
              <div className="flex flex-wrap gap-1">
                {perms.canTransition && (step.status === 'not_started' || step.status === 'planned') && step.canStart ? (
                  <Button size="sm" variant="secondary" onClick={() => transition.mutate('start')} loading={transition.isPending}>
                    <PlayCircle /> Start step
                  </Button>
                ) : null}
                {perms.canTransition && (step.status === 'in_progress' || step.status === 'blocked') ? (
                  <Button size="sm" onClick={() => transition.mutate('complete')} loading={transition.isPending}>
                    <CheckCircle2 /> Close step
                  </Button>
                ) : null}
                {perms.canTransition && step.status === 'in_progress' ? (
                  <Button size="sm" variant="ghost" onClick={() => transition.mutate('hold')}>
                    Hold
                  </Button>
                ) : null}
                {perms.canTransition && step.status === 'on_hold' ? (
                  <Button size="sm" variant="secondary" onClick={() => transition.mutate('resume')}>
                    Resume
                  </Button>
                ) : null}
                {perms.canTransition && step.status === 'completed' ? (
                  <Button size="sm" variant="ghost" onClick={() => transition.mutate('reopen')}>
                    <RotateCcw /> Reopen
                  </Button>
                ) : null}
                {perms.canReplan && !done ? (
                  <Button size="sm" variant="ghost" onClick={() => setReplan(true)}>
                    <CalendarClock /> Planned dates
                  </Button>
                ) : null}
                {perms.canOverride ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline">
                        <ShieldAlert /> Override status
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuLabel>Manager override — reason required</DropdownMenuLabel>
                      <DropdownMenuItem onSelect={() => setOverride('complete')} disabled={step.status === 'completed' || locked} title={locked ? 'Non-overridable step' : undefined}>
                        {locked ? <Lock /> : <CheckCircle2 />} Force complete
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setOverride('reopen')} disabled={step.status === 'in_progress'}>
                        <RotateCcw /> Reopen
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setOverride('skip')} disabled={step.status === 'skipped' || locked} title={locked ? 'Non-overridable step' : undefined}>
                        {locked ? <Lock /> : <SkipForward />} Skip
                      </DropdownMenuItem>
                      {locked ? <div className="text-fg-subtle max-w-56 px-2 py-1.5 text-[11px]">Cannot be completed or skipped by override: impartiality, agreement, independent review and issuance are protected (PRD FR-80).</div> : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </div>
            ) : null
          }
        />
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-4">
            <Kv k="Owner" v={roleLabel(step.owner_role)} />
            <Kv k="Planned" v={`${fmtDate(step.planned_start)} – ${fmtDate(step.planned_end)}`} />
            <Kv k="Actual" v={`${step.actual_start ? fmtDate(step.actual_start) : '—'} – ${step.actual_end ? fmtDate(step.actual_end) : step.actual_start ? 'ongoing' : '—'}`} />
            <Kv k="Closed by" v={step.closed_by ? (deciderName(step.closed_by) ?? '—') : '—'} />
          </dl>
          {!step.canStart && step.status === 'not_started' && step.startBlockedReason ? <p className="text-fg-subtle mt-3 text-xs">Cannot start yet: {step.startBlockedReason}.</p> : null}
          {locked ? (
            <p className="text-fg-muted mt-3 inline-flex items-center gap-1.5 text-xs">
              <Lock className="size-3.5" /> Cannot be completed or skipped by override.
            </p>
          ) : null}
          {step.lastOverride ? (
            <Alert tone="warning" className="mt-4" icon={<ShieldAlert />} title={`Manager override by ${step.lastOverride.byName} on ${fmtDateTime(step.lastOverride.at)}`}>
              {step.lastOverride.reason ?? 'No reason recorded.'}
            </Alert>
          ) : null}
          {step.key === 'final_opinion' ? (
            <Alert tone="info" className="mt-4" title="This step is driven by opinion iterations">
              <Link to="/engagements/$serviceId/opinion" params={{ serviceId: detail.service.id }} className="underline">
                Open the Opinion tab
              </Link>{' '}
              to draft, review, decide and issue.
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      {step.key === 'team_nomination' ? <TeamPanel detail={detail} /> : null}
      {step.key === 'audit_plan' && detail.assuranceApplies ? <MaterialityPanel serviceId={detail.service.id} perms={perms} /> : null}
      {phase?.key === 'execution' && step.key !== 'final_opinion' && detail.assuranceApplies ? <MisstatementCard serviceId={detail.service.id} /> : null}

      {required.length || optional.length ? (
        <Card>
          <CardHeader title="Documents for this step" description="Required slots must be accepted before the step can close." />
          <CardContent className="space-y-5">
            {required.length ? (
              <SlotGroup title="Required" slots={required} serviceId={detail.service.id} docOf={docOf} canUploadTo={canUploadTo} canCheck={perms.canCheck} canDeleteClient={perms.canDeleteClient} onUpload={setUploadSlot} onRequest={perms.isVerifier && !perms.readOnly ? setRequestSlot : undefined} />
            ) : null}
            {optional.length ? (
              <SlotGroup title="Supporting (optional)" slots={optional} serviceId={detail.service.id} docOf={docOf} canUploadTo={canUploadTo} canCheck={perms.canCheck} canDeleteClient={perms.canDeleteClient} onUpload={setUploadSlot} onRequest={perms.isVerifier && !perms.readOnly ? setRequestSlot : undefined} />
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {step.approvals.length ? (
        <Card>
          <CardHeader title="Approvals" description="Each decision is recorded with the approver and the time." />
          <CardContent className="space-y-2">
            {step.approvals.map((a) => (
              <ApprovalRow key={a.id} approval={a} serviceId={detail.service.id} deciderName={deciderName(a.decided_by)} msaSlot={msaSlot} canDecide={a.kind === 'agreement_acceptance' || a.kind === 'audit_plan' ? perms.canDecideClientApprovals : perms.canDecideVerifierApprovals} />
            ))}
          </CardContent>
        </Card>
      ) : null}

      {step.checklist_json.length ? (
        <Card>
          <CardHeader title="Checklist" />
          <CardContent>
            <ul className="space-y-1.5">
              {step.checklist_json.map((c) => (
                <li key={c.key} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={c.checked} disabled /> {c.label}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <UploadDialog open={uploadSlot !== null} onOpenChange={(o) => !o && setUploadSlot(null)} serviceId={detail.service.id} slot={uploadSlot ? { id: uploadSlot.id, name: uploadSlot.name } : null} />
      <ShowDontDoDialog open={requestSlot !== null} onOpenChange={(o) => !o && setRequestSlot(null)} title={`Request "${requestSlot?.name}" from the client`} description="The client contact receives an e-mail and an in-app notification with a direct link to this slot." wouldDo={['Send an e-mail to the client contact with a deep link', 'Create a blocking notification for the client admins', 'Record the request in the Service Log']} simulateLabel="Send request" onSimulate={() => toast.success(`Request sent for "${requestSlot?.name}" (simulated).`)}>
        <Field label="Message">
          <Textarea defaultValue={`Please upload ${requestSlot?.name ?? 'the document'} for ${detail.service.reference} by ${fmtDate(step.planned_end)}.`} />
        </Field>
      </ShowDontDoDialog>
      <ReasonDialog
        open={override !== null}
        onOpenChange={(o) => !o && setOverride(null)}
        title={override ? overrideTitles[override] : ''}
        description={override === 'complete' ? 'Bypasses the required documents and approvals of this step. The next step starts and the next action is recomputed.' : override === 'reopen' ? 'Puts the step back in progress; the client and the team see it reopened.' : 'Marks the step as skipped; it no longer blocks the phase.'}
        reasonLabel="Reason for the override"
        placeholder="e.g. Evidence reviewed off-platform during the site visit; closing to keep the plan."
        confirmLabel={override === 'complete' ? 'Force complete' : override === 'reopen' ? 'Reopen step' : 'Skip step'}
        danger={override !== 'reopen'}
        note="Written to the Service Log as an override with your name and reason; the step owner party and the client contact are notified."
        onConfirm={(reason) => override && overrideM.mutateAsync({ action: override, reason })}
      />
      {replan ? <ReplanDialog detail={detail} step={step} onClose={() => setReplan(false)} /> : null}
    </div>
  )
}

function MisstatementCard({ serviceId }: { serviceId: string }) {
  const mis = useMisstatements(serviceId)
  const rows = mis.data ?? []
  const proposed = rows.filter((m) => m.status === 'proposed').length
  return (
    <Card>
      <CardHeader title={<span className="inline-flex items-center gap-2"><Scale className="size-4" /> Misstatements found in execution</span>} description="Adjusted lines and verified totals that differ from the declared values propose entries; the team confirms or dismisses them. The aggregate is measured against materiality on the Opinion tab." />
      <CardContent className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-fg">
          {rows.length} registered · {rows.filter((m) => m.status === 'confirmed').length} confirmed{proposed ? ` · ${proposed} awaiting confirmation` : ''}
        </span>
        <MisstatementLink serviceId={serviceId} count={rows.length} proposed={proposed} />
      </CardContent>
    </Card>
  )
}

function ReplanDialog({ detail, step, onClose }: { detail: ServiceDetail; step: Step; onClose: () => void }) {
  const [start, setStart] = useState(step.planned_start ?? '')
  const [end, setEnd] = useState(step.planned_end ?? '')
  const [reason, setReason] = useState('')
  const m = useAppMutation(() => services.replanStep(detail.service.id, step.id, { plannedStart: start || null, plannedEnd: end || null }, reason || undefined), { successMessage: 'Planned dates updated; the Timeline shows the new plan.', onSuccess: onClose })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={`Planned dates — ${step.name}`} description="The Timeline keeps planned versus actual; the change is written to the Service Log." size="sm">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Planned start">
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="Planned end">
            <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
        <Field label="Reason (optional)" className="mt-3">
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Site visit moved at the client's request." />
        </Field>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => m.mutate()} loading={m.isPending} disabled={Boolean(start && end && end < start)}>
            Save dates
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SlotGroup({ title, slots, serviceId, docOf, canUploadTo, canCheck, canDeleteClient, onUpload, onRequest }: { title: string; slots: SlotView[]; serviceId: string; docOf: (s: SlotView) => ReturnType<typeof useServiceDocuments>['data'] extends (infer T)[] | undefined ? T | undefined : never; canUploadTo: (s: SlotView) => boolean; canCheck: boolean; canDeleteClient: boolean; onUpload: (s: SlotView) => void; onRequest?: (s: SlotView) => void }) {
  return (
    <div>
      <h4 className="text-fg-subtle mb-2 text-xs font-semibold uppercase tracking-wide">{title}</h4>
      <div className="space-y-2">
        {slots.map((slot) => {
          const doc = docOf(slot)
          return (
            <div key={slot.id}>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="text-fg text-sm font-medium">{slot.name}</span>
                {slot.required ? <Badge tone="danger">Required</Badge> : null}
                <Badge tone="outline">{slot.uploader_party === 'client' ? 'Client uploads' : 'VERIFASSUR uploads'}</Badge>
                <StatusChip status={slot.status} size="xs" />
                {slot.description ? <span className="text-fg-subtle text-xs">{slot.description}</span> : null}
              </div>
              {doc ? (
                <div className="space-y-2">
                  <DocumentRow doc={doc} serviceId={serviceId} canReplace={canUploadTo(slot)} canDelete={slot.uploader_party === 'client' ? canDeleteClient : canCheck} canCheck={canCheck && slot.uploader_party === 'client'} />
                  {slot.status === 'rejected' && canUploadTo(slot) ? (
                    <Button size="sm" onClick={() => onUpload(slot)}>
                      <Upload /> Re-upload corrected version
                    </Button>
                  ) : null}
                </div>
              ) : (
                <div className="border-border flex flex-wrap items-center gap-3 rounded-md border border-dashed px-3 py-2.5">
                  <FileText className="text-fg-subtle size-4" />
                  <span className="text-fg-muted flex-1 text-sm">Not uploaded yet</span>
                  {canUploadTo(slot) ? (
                    <Button size="sm" onClick={() => onUpload(slot)}>
                      <Upload /> Upload
                    </Button>
                  ) : null}
                  {onRequest && slot.uploader_party === 'client' ? (
                    <Button size="sm" variant="ghost" onClick={() => onRequest(slot)}>
                      <Mail /> Request from client
                    </Button>
                  ) : null}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- team panel (FR-16, FR-17, FR-75; v0.3 FR-96, FR-98)
function TeamPanel({ detail }: { detail: ServiceDetail }) {
  const perms = useServicePermissions(detail)
  const me = useMe()
  const [nominate, setNominate] = useState(false)
  const [reassign, setReassign] = useState<TeamView | null>(null)
  const decide = useAppMutation(({ coiId, decision }: { coiId: string; decision: 'approve' | 'reject' }) => team.decideCoi(detail.service.id, coiId, decision), { successMessage: 'COI decision recorded.' })
  const remove = useAppMutation((id: string) => team.remove(detail.service.id, id), { successMessage: 'Team member removed (they stay in the involved set).' })
  const members = detail.team.filter((t) => t.role !== 'client_contact')
  const checks = useTeamChecks(detail.service.id)
  const profiles = useProfiles(perms.isVerifier)
  const byUser = new Map((profiles.data ?? []).map((p) => [p.user_id, p]))
  const scope = detail.service.scope_json
  const covered = (key: 'sector_scopes_json' | 'technical_areas_json') => new Set(members.flatMap((m) => byUser.get(m.userId)?.qualifications.flatMap((q) => q[key]) ?? []))
  const missingScopes = scope.sector_scopes.filter((s) => !covered('sector_scopes_json').has(s))
  const missingAreas = scope.technical_areas.filter((a) => !covered('technical_areas_json').has(a))
  return (
    <Card>
      <CardHeader title="Team nomination and conflicts of interest" description="Every nomination runs the competence and rotation checks; every member declares conflicts; the manager approves. The independent reviewer cannot hold another role and needs a valid IR qualification." actions={perms.canNominate ? <Button size="sm" onClick={() => setNominate(true)}><UserPlus /> Nominate</Button> : null} />
      <CardContent>
        {members.length === 0 ? (
          <p className="text-fg-muted text-sm">No team nominated yet.</p>
        ) : (
          <ul className="divide-border divide-y">
            {members.map((m) => (
              <li key={m.id} className="flex flex-wrap items-start gap-3 py-3">
                <Avatar name={m.name} tone="primary" />
                <div className="min-w-0 flex-1">
                  <div className="text-fg text-sm font-medium">{m.name}</div>
                  <div className="text-fg-subtle text-xs">
                    {roleLabel(m.role)} · {m.jobTitle}
                  </div>
                  {m.coi?.details ? <div className="text-fg-muted mt-0.5 text-xs italic">“{m.coi.details}”</div> : null}
                  {perms.isVerifier ? <MemberExtras member={m} profile={byUser.get(m.userId) ?? null} detail={detail} check={checks.data?.[m.id] ?? null} profilesAvailable={Boolean(profiles.data)} /> : null}
                </div>
                {m.coi ? <StatusChip status={m.coi.status} label={m.coi.status === 'approved' ? 'COI cleared' : m.coi.status === 'declared' ? `Declared: ${m.coi.declaration === 'clear' ? 'no conflict' : 'potential conflict'}` : m.coi.status === 'rejected' ? 'COI rejected' : 'COI pending'} /> : null}
                {perms.canNominate && m.coi?.status === 'declared' ? (
                  <div className="flex gap-1">
                    <Button size="sm" onClick={() => decide.mutate({ coiId: m.coi!.id, decision: 'approve' })}>
                      Approve
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => decide.mutate({ coiId: m.coi!.id, decision: 'reject' })}>
                      Reject
                    </Button>
                  </div>
                ) : null}
                {m.userId === me.user.id && m.coi && m.coi.status !== 'approved' ? <Badge tone="blocking">You must declare</Badge> : null}
                {perms.canOverride ? (
                  <Button size="sm" variant="ghost" onClick={() => setReassign(m)}>
                    <Repeat /> Reassign
                  </Button>
                ) : null}
                {perms.canNominate ? (
                  <Button size="sm" variant="ghost" onClick={() => remove.mutate(m.id)}>
                    Remove
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {perms.isVerifier && profiles.data && (scope.sector_scopes.length || scope.technical_areas.length) ? (
          <div className="border-border mt-3 border-t pt-3 text-xs" data-testid="team-coverage">
            <span className="text-fg-subtle font-semibold uppercase tracking-wide">Team coverage</span>{' '}
            <span className="text-fg-muted">
              sector scopes {scope.sector_scopes.map((s) => s.replace(/_/g, ' ')).join(', ') || '—'} · technical areas {scope.technical_areas.map((s) => s.replace(/_/g, ' ')).join(', ') || '—'} ·{' '}
            </span>
            {missingScopes.length || missingAreas.length ? <Badge tone="warning">Not covered: {[...missingScopes, ...missingAreas].map((s) => s.replace(/_/g, ' ')).join(', ')}</Badge> : <Badge tone="success">Every scope and area covered</Badge>}
          </div>
        ) : null}
      </CardContent>
      <NominateDialog open={nominate} onOpenChange={setNominate} serviceId={detail.service.id} existing={detail.team} />
      {reassign ? <ReassignDialog member={reassign} serviceId={detail.service.id} onClose={() => setReassign(null)} /> : null}
    </Card>
  )
}

/** Competence summary, rotation history line and the stored check result per member (PRD §7.2 "Team panel"). */
function MemberExtras({ member, profile, detail, check, profilesAvailable }: { member: TeamView; profile: ProfileView | null; detail: ServiceDetail; check: NonNullable<ReturnType<typeof useTeamChecks>['data']>[string] | null; profilesAvailable: boolean }) {
  const history = useQuery({ queryKey: ['rotationHistory', member.userId, detail.service.org_id, detail.project.id], queryFn: () => competence.rotationHistory({ userId: member.userId, orgId: detail.service.org_id, projectId: detail.project.id }), retry: false, enabled: profilesAvailable })
  const items = check ? [...check.competence_json, ...check.rotation_json] : []
  return (
    <div className="mt-1.5 space-y-1 text-xs">
      {profilesAvailable ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-fg-subtle">Competence:</span>
          {profile && profile.qualifications.length ? (
            profile.qualifications.map((q) => (
              <Badge key={q.id} tone={q.status === 'valid' ? 'success' : q.status === 'expiring' ? 'warning' : 'danger'} title={`${q.sector_scopes_json.join(', ')} · ${q.technical_areas_json.join(', ')} · valid until ${q.valid_until}`}>
                {QUALIFICATION_KIND_LABELS[q.kind]} · {q.status}
              </Badge>
            ))
          ) : (
            <Badge tone="outline">No qualification on file</Badge>
          )}
        </div>
      ) : null}
      {history.data ? <RotationLine lines={history.data} role={member.role} /> : null}
      {check ? (
        <div>
          <span className="text-fg-subtle">Checks at {check.kind} ({fmtDateTime(check.checked_at)}):</span>
          {check.overridden ? <Badge tone="warning" className="ml-1">Warning overridden</Badge> : items.every((i) => i.result === 'ok') ? <Badge tone="success" className="ml-1">Passed</Badge> : null}
          <CheckResultList items={items} compact className="mt-1" />
          {check.override_reason ? <div className="text-fg-muted mt-0.5 italic">Override reason: {check.override_reason}</div> : null}
        </div>
      ) : null}
    </div>
  )
}

function RotationLine({ lines, role }: { lines: HistoryLine[]; role: string }) {
  const same = lines.filter((l) => l.role === role)
  if (lines.length === 0) return <div className="text-fg-subtle">Rotation: no prior engagement for this client.</div>
  return (
    <div className="text-fg-muted">
      Rotation: {same.length ? `${roleLabel(role)} on ${same.length} prior engagement${same.length === 1 ? '' : 's'} for this client (${same.map((l) => `${l.reference} ${l.period}${l.legacy ? ', legacy' : ''}`).join('; ')})` : `${lines.length} prior engagement${lines.length === 1 ? '' : 's'} for this client in other roles`}.
    </div>
  )
}

/** Live check result for a candidate in the pickers (dry run through `competence.checkCandidate`). */
function CandidateCheckView({ check, loading, reason, onReason, reasonLabel = 'Override reason' }: { check: CandidateCheck | null; loading: boolean; reason?: string; onReason?: (r: string) => void; reasonLabel?: string }) {
  if (loading) return <p className="text-fg-subtle text-xs">Running competence and rotation checks…</p>
  if (!check) return null
  const items = [...check.competence.items, ...check.rotation.items]
  return (
    <div className="bg-surface-muted/60 border-border mt-2 rounded-md border px-3 py-2" data-testid="candidate-check" data-blocked={check.blocked}>
      <CheckResultList items={items} compact />
      {check.history.length ? <p className="text-fg-subtle mt-1 text-[11px]">History for this client: {check.history.map((h) => `${h.reference} ${h.period} (${h.role ? roleLabel(h.role) : 'VERIFASSUR'}${h.legacy ? ', legacy' : ''})`).join('; ')}</p> : null}
      {check.blocked ? (
        <Alert tone="danger" className="mt-2" title="Blocked: no override lifts this rule">
          {check.blocks.join(' ')}
        </Alert>
      ) : check.warnings.length && onReason ? (
        <Field label={reasonLabel} required hint="At least 10 characters; counted in the override statistics and notified to the other managers." className="mt-2">
          <Textarea value={reason ?? ''} onChange={(e) => onReason(e.target.value)} placeholder="e.g. Expertise contracted externally and joins before the desk review." data-testid="override-reason" />
        </Field>
      ) : null}
    </div>
  )
}

/** Manager reassigns a team role to another person (PRD FR-75) with a mandatory reason; the reason doubles as the override reason for warnings (plan_v1 §8 D31). */
function ReassignDialog({ member, serviceId, onClose }: { member: TeamView; serviceId: string; onClose: () => void }) {
  const candidates = useQuery({ queryKey: ['team', 'candidates', serviceId], queryFn: () => team.candidates(serviceId) })
  const [toUserId, setToUserId] = useState('')
  const check = useQuery({ queryKey: ['team', 'check', serviceId, toUserId, member.role], queryFn: () => competence.checkCandidate(serviceId, toUserId, member.role as ServiceRole), enabled: Boolean(toUserId) })
  const m = useAppMutation((reason: string) => team.reassign(serviceId, member.id, toUserId, reason), { successMessage: (r) => `${roleLabel(member.role)} reassigned to ${r.team.find((x) => x.userId === toUserId)?.name ?? 'the new member'}; they must declare conflicts of interest.${r.checks[0]?.warnings.length ? ` ${r.checks[0].warnings.length} competence or rotation warning(s) overridden with your reason.` : ''}`, onSuccess: onClose })
  const blocked = Boolean(check.data?.blocked)
  return (
    <ReasonDialog
      open
      size="md"
      onOpenChange={(o) => !o && onClose()}
      title={`Reassign ${roleLabel(member.role)} from ${member.name}`}
      description="The current member is removed (and stays in the involved set), the new one is nominated in the same role after the competence and rotation checks and must declare conflicts of interest."
      reasonLabel="Reason for the reassignment"
      placeholder="e.g. On leave until November; the data review cannot wait."
      confirmLabel="Reassign role"
      confirmDisabled={!toUserId || blocked || check.isLoading}
      note={check.data?.warnings.length ? 'The check raised warnings: your reassignment reason doubles as the override reason and is counted in the override statistics.' : 'Both people are notified; the change is written to the Service Log as an override.'}
      onConfirm={(reason) => (toUserId ? m.mutateAsync(reason) : Promise.reject(new Error('Pick a person')))}
    >
      <Field label="New team member" required>
        <NativeSelect value={toUserId} onChange={(e) => setToUserId(e.target.value)}>
          <option value="">Choose a colleague…</option>
          {(candidates.data ?? []).map((c) => (
            <option key={c.userId} value={c.userId}>
              {c.name} · {c.jobTitle} · {c.load} active service{c.load === 1 ? '' : 's'} · {c.qualificationSummary}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <CandidateCheckView check={check.data ?? null} loading={check.isLoading} />
    </ReasonDialog>
  )
}

function NominateDialog({ open, onOpenChange, serviceId, existing }: { open: boolean; onOpenChange: (o: boolean) => void; serviceId: string; existing: TeamView[] }) {
  const [picked, setPicked] = useState<Record<string, ServiceRole | ''>>({})
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const [checks, setChecks] = useState<Record<string, CandidateCheck | 'loading' | null>>({})
  const candidates = useQuery({ queryKey: ['team', 'candidates', serviceId], queryFn: () => team.candidates(serviceId), enabled: open })
  const picks = Object.entries(picked).filter(([, r]) => r) as [string, ServiceRole][]
  const m = useAppMutation(
    () => team.nominate(serviceId, picks.map(([userId, role]) => ({ userId, role, overrideReason: reasons[userId] || undefined }))),
    { successMessage: (r) => `Team nominated (competence and rotation checks ${r.checks.some((c) => c.warnings.length) ? 'passed with overridden warnings' : 'passed'}); each member has been asked to declare conflicts of interest.`, onSuccess: () => { onOpenChange(false); setPicked({}); setReasons({}); setChecks({}) } },
  )
  const ROLES: ServiceRole[] = ['verifier_team_leader', 'verifier_auditor', 'verifier_technical_expert', 'verifier_independent_reviewer', 'verifier_coordinator']
  // Dry run through `GET /services/:id/team/check` every time a role is picked (PRD FR-96).
  function pick(userId: string, role: ServiceRole | '') {
    setPicked((p) => ({ ...p, [userId]: role }))
    if (!role) return
    const key = `${userId}:${role}`
    if (checks[key] !== undefined) return
    setChecks((c) => ({ ...c, [key]: 'loading' }))
    void competence.checkCandidate(serviceId, userId, role).then((r) => setChecks((c) => ({ ...c, [key]: r }))).catch(() => setChecks((c) => ({ ...c, [key]: null })))
  }
  const checkOf = (userId: string, role: ServiceRole | '') => (role ? checks[`${userId}:${role}`] : undefined)
  const problem = picks.some(([userId, role]) => {
    const c = checkOf(userId, role)
    if (!c || c === 'loading') return true
    if (c.blocked) return true
    return c.warnings.length > 0 && (reasons[userId] ?? '').trim().length < 10
  })
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Nominate team members" description="Pick a role per person. Each pick runs the competence and rotation checks: a warning needs an override reason, a block (missing independent-reviewer qualification, rotation rule set to block) cannot be overridden." size="xl">
        {!candidates.data ? (
          <p className="text-fg-muted text-sm">Loading…</p>
        ) : candidates.data.length === 0 ? (
          <p className="text-fg-muted text-sm">Everyone is already on this team.</p>
        ) : (
          <ul className="divide-border divide-y">
            {candidates.data.map((c) => {
              const role = picked[c.userId] ?? ''
              const chk = checkOf(c.userId, role)
              return (
                <li key={c.userId} className="py-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <Avatar name={c.name} tone="primary" />
                    <div className="min-w-0 flex-1">
                      <div className="text-fg text-sm font-medium">{c.name}</div>
                      <div className="text-fg-subtle text-xs">
                        {c.jobTitle} · {c.load} active service{c.load === 1 ? '' : 's'}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
                        <Badge tone={c.competenceOverall === 'valid' ? 'success' : c.competenceOverall === 'expiring' ? 'warning' : c.competenceOverall === 'expired' ? 'danger' : 'outline'}>{c.competenceOverall === 'none' ? 'No qualification' : `Qualifications ${c.competenceOverall}`}</Badge>
                        <span className="text-fg-muted">{c.qualificationSummary}</span>
                      </div>
                    </div>
                    <NativeSelect className="w-56" value={role} aria-label={`Role for ${c.name}`} onChange={(e) => pick(c.userId, e.target.value as ServiceRole | '')}>
                      <option value="">Not on this team</option>
                      {ROLES.map((r) => (
                        <option key={r} value={r} disabled={r === 'verifier_team_leader' && existing.some((t) => t.role === 'verifier_team_leader')}>
                          {roleLabel(r)}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  {role ? <CandidateCheckView check={chk && chk !== 'loading' ? chk : null} loading={chk === 'loading'} reason={reasons[c.userId]} onReason={(r) => setReasons((x) => ({ ...x, [c.userId]: r }))} /> : null}
                </li>
              )
            })}
          </ul>
        )}
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => m.mutate()} loading={m.isPending} disabled={picks.length === 0 || problem}>
            Nominate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
