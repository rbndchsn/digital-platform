/** Step detail: slots, approvals, checklist, step actions, team/COI (PRD §7.2 "Step detail"). */
import { Link } from '@tanstack/react-router'
import { CheckCircle2, FileText, Mail, PlayCircle, RotateCcw, Upload, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { services, team } from '@/api'
import type { ServiceDetail, SlotView, TeamView } from '@/api/services'
import type { ServiceRole } from '@/domain/enums'
import { ApprovalRow } from '@/components/approval-row'
import { DocumentRow } from '@/components/document-row'
import { ShowDontDoDialog } from '@/components/show-dont-do'
import { StatusChip } from '@/components/status-chip'
import { UploadDialog } from '@/components/upload-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Field, NativeSelect, Textarea } from '@/components/ui/input'
import { Alert, Avatar, Checkbox } from '@/components/ui/misc'
import { useMe } from '@/lib/auth'
import { fmtDate, roleLabel } from '@/lib/format'
import { useAppMutation } from '@/lib/query'
import { useServiceDocuments } from '@/lib/service-hooks'

type Step = ServiceDetail['phases'][number]['steps'][number]

export function useServicePermissions(d: ServiceDetail | undefined) {
  const me = useMe()
  const isVerifier = me.org.type === 'verifier'
  const isManager = isVerifier && me.role === 'verifier_manager'
  const roles = d?.myRoles ?? []
  const onTeam = (r: ServiceRole) => roles.includes(r)
  return {
    isVerifier,
    isManager,
    canTransition: isManager || onTeam('verifier_team_leader') || onTeam('verifier_auditor') || onTeam('verifier_technical_expert'),
    canCheck: isManager || onTeam('verifier_team_leader') || onTeam('verifier_auditor') || onTeam('verifier_technical_expert'),
    canUploadClient: !isVerifier && (me.role === 'client_admin' || me.role === 'client_owner' || me.role === 'client_contributor'),
    canUploadVerifier: isManager || me.role === 'verifier_coordinator' || onTeam('verifier_team_leader') || onTeam('verifier_auditor') || onTeam('verifier_coordinator'),
    canDecideVerifierApprovals: isManager,
    canDecideClientApprovals: !isVerifier && (me.role === 'client_admin' || me.role === 'client_owner'),
    canNominate: isManager,
    canDeleteClient: !isVerifier && (me.role === 'client_admin' || me.role === 'client_owner'),
  }
}

export function StepDetail({ detail, step, phaseName }: { detail: ServiceDetail; step: Step; phaseName: string }) {
  const perms = useServicePermissions(detail)
  const docs = useServiceDocuments(detail.service.id)
  const [uploadSlot, setUploadSlot] = useState<SlotView | null>(null)
  const [requestSlot, setRequestSlot] = useState<SlotView | null>(null)
  const transition = useAppMutation((action: 'start' | 'complete' | 'reopen' | 'hold' | 'resume') => services.transitionStep(detail.service.id, step.id, action), { successMessage: (st) => `${st.name}: ${st.status.replace('_', ' ')}.` })
  const required = step.slots.filter((s) => s.required)
  const optional = step.slots.filter((s) => !s.required)
  const docOf = (slot: SlotView) => docs.data?.find((x) => x.id === slot.document?.id)
  const canUploadTo = (slot: SlotView) => (slot.uploader_party === 'client' ? perms.canUploadClient : perms.canUploadVerifier)
  const teamMember = (userId: string | null) => detail.team.find((t) => t.userId === userId)?.name ?? null
  const deciderName = (by: string | null) => (by ? (teamMember(by) ?? detail.team.find((t) => t.userId === by)?.name ?? 'Helena Brandt') : null)
  const msaSlot = detail.phases.flatMap((p) => p.steps).flatMap((s) => s.slots).find((s) => s.key === 'msa') ?? null
  const isCurrent = detail.nextAction?.step_id === step.id

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title={
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-fg-subtle text-sm font-normal">{phaseName} ›</span> {step.name}
              <StatusChip status={step.status} />
              {isCurrent ? <Badge tone="blocking">Current step</Badge> : null}
            </span>
          }
          description={step.description}
          actions={
            perms.canTransition ? (
              <div className="flex flex-wrap gap-1">
                {(step.status === 'not_started' || step.status === 'planned') && step.canStart ? (
                  <Button size="sm" variant="secondary" onClick={() => transition.mutate('start')} loading={transition.isPending}>
                    <PlayCircle /> Start step
                  </Button>
                ) : null}
                {step.status === 'in_progress' || step.status === 'blocked' ? (
                  <Button size="sm" onClick={() => transition.mutate('complete')} loading={transition.isPending}>
                    <CheckCircle2 /> Close step
                  </Button>
                ) : null}
                {step.status === 'in_progress' ? (
                  <Button size="sm" variant="ghost" onClick={() => transition.mutate('hold')}>
                    Hold
                  </Button>
                ) : null}
                {step.status === 'on_hold' ? (
                  <Button size="sm" variant="secondary" onClick={() => transition.mutate('resume')}>
                    Resume
                  </Button>
                ) : null}
                {step.status === 'completed' ? (
                  <Button size="sm" variant="ghost" onClick={() => transition.mutate('reopen')}>
                    <RotateCcw /> Reopen
                  </Button>
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
          {step.key === 'final_opinion' ? (
            <Alert tone="info" className="mt-4" title="This step is driven by opinion iterations">
              <Link to="/engagements/$serviceId/opinion" params={{ serviceId: detail.service.id }} className="underline">
                Open the Opinion tab
              </Link>{' '}
              to draft, review, approve and issue.
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      {step.key === 'team_nomination' ? <TeamPanel detail={detail} /> : null}

      {required.length || optional.length ? (
        <Card>
          <CardHeader title="Documents for this step" description="Required slots must be accepted before the step can close." />
          <CardContent className="space-y-5">
            {required.length ? (
              <SlotGroup title="Required" slots={required} serviceId={detail.service.id} docOf={docOf} canUploadTo={canUploadTo} canCheck={perms.canCheck} canDeleteClient={perms.canDeleteClient} onUpload={setUploadSlot} onRequest={perms.isVerifier ? setRequestSlot : undefined} />
            ) : null}
            {optional.length ? (
              <SlotGroup title="Supporting (optional)" slots={optional} serviceId={detail.service.id} docOf={docOf} canUploadTo={canUploadTo} canCheck={perms.canCheck} canDeleteClient={perms.canDeleteClient} onUpload={setUploadSlot} onRequest={perms.isVerifier ? setRequestSlot : undefined} />
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
    </div>
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

function TeamPanel({ detail }: { detail: ServiceDetail }) {
  const perms = useServicePermissions(detail)
  const me = useMe()
  const [nominate, setNominate] = useState(false)
  const decide = useAppMutation(({ coiId, decision }: { coiId: string; decision: 'approve' | 'reject' }) => team.decideCoi(detail.service.id, coiId, decision), { successMessage: 'COI decision recorded.' })
  const remove = useAppMutation((id: string) => team.remove(detail.service.id, id), { successMessage: 'Team member removed.' })
  const members = detail.team.filter((t) => t.role !== 'client_contact')
  return (
    <Card>
      <CardHeader title="Team nomination and conflicts of interest" description="Every nominated member declares conflicts; the manager approves. The independent reviewer cannot hold another role." actions={perms.canNominate ? <Button size="sm" onClick={() => setNominate(true)}><UserPlus /> Nominate</Button> : null} />
      <CardContent>
        {members.length === 0 ? (
          <p className="text-fg-muted text-sm">No team nominated yet.</p>
        ) : (
          <ul className="divide-border divide-y">
            {members.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 py-2">
                <Avatar name={m.name} tone="primary" />
                <div className="min-w-0 flex-1">
                  <div className="text-fg text-sm font-medium">{m.name}</div>
                  <div className="text-fg-subtle text-xs">
                    {roleLabel(m.role)} · {m.jobTitle}
                  </div>
                  {m.coi?.details ? <div className="text-fg-muted mt-0.5 text-xs italic">“{m.coi.details}”</div> : null}
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
                {perms.canNominate ? (
                  <Button size="sm" variant="ghost" onClick={() => remove.mutate(m.id)}>
                    Remove
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <NominateDialog open={nominate} onOpenChange={setNominate} serviceId={detail.service.id} existing={detail.team} />
    </Card>
  )
}

function NominateDialog({ open, onOpenChange, serviceId, existing }: { open: boolean; onOpenChange: (o: boolean) => void; serviceId: string; existing: TeamView[] }) {
  const [picked, setPicked] = useState<Record<string, ServiceRole | ''>>({})
  const [candidates, setCandidates] = useState<Awaited<ReturnType<typeof team.candidates>> | null>(null)
  const load = async () => setCandidates(await team.candidates(serviceId))
  const m = useAppMutation(
    () =>
      team.nominate(
        serviceId,
        Object.entries(picked)
          .filter(([, r]) => r)
          .map(([userId, role]) => ({ userId, role: role as ServiceRole })),
      ),
    { successMessage: 'Team nominated; each member has been asked to declare conflicts of interest.', onSuccess: () => { onOpenChange(false); setPicked({}) } },
  )
  const ROLES: ServiceRole[] = ['verifier_team_leader', 'verifier_auditor', 'verifier_technical_expert', 'verifier_independent_reviewer', 'verifier_coordinator']
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (o) void load() }}>
      <DialogContent title="Nominate team members" description="Pick a role per person. Current workload is shown to help balance assignments." size="lg">
        {!candidates ? (
          <p className="text-fg-muted text-sm">Loading…</p>
        ) : candidates.length === 0 ? (
          <p className="text-fg-muted text-sm">Everyone is already on this team.</p>
        ) : (
          <ul className="divide-border divide-y">
            {candidates.map((c) => (
              <li key={c.userId} className="flex flex-wrap items-center gap-3 py-2">
                <Avatar name={c.name} tone="primary" />
                <div className="min-w-0 flex-1">
                  <div className="text-fg text-sm font-medium">{c.name}</div>
                  <div className="text-fg-subtle text-xs">
                    {c.jobTitle} · {c.load} active service{c.load === 1 ? '' : 's'}
                  </div>
                </div>
                <NativeSelect className="w-56" value={picked[c.userId] ?? ''} onChange={(e) => setPicked((p) => ({ ...p, [c.userId]: e.target.value as ServiceRole | '' }))}>
                  <option value="">Not on this team</option>
                  {ROLES.map((r) => (
                    <option key={r} value={r} disabled={r === 'verifier_team_leader' && existing.some((t) => t.role === 'verifier_team_leader')}>
                      {roleLabel(r)}
                    </option>
                  ))}
                </NativeSelect>
              </li>
            ))}
          </ul>
        )}
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => m.mutate()} loading={m.isPending} disabled={!Object.values(picked).some(Boolean)}>
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
