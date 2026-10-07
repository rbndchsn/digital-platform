/**
 * Competence page (PRD v0.3 §7.2, FR-94, FR-98): staff profiles with qualifications, validity and expiry; managers
 * edit each other's profiles (never their own); evidence upload is show-don't-do; legacy engagements for rotation.
 */
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Award, BellRing, History, Lock, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { competence, staff } from '@/api'
import type { ProfileView, QualificationView } from '@/api/competence'
import type { QualificationKind, ServiceRole, ServiceType } from '@/domain/enums'
import { QUALIFICATION_KINDS, QUALIFICATION_KIND_LABELS, SERVICE_TYPES, SERVICE_TYPE_LABELS } from '@/domain/enums'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { ReasonDialog } from '@/components/reason-dialog'
import { ShowDontDoDialog } from '@/components/show-dont-do'
import { StatusChip } from '@/components/status-chip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Field, Input, NativeSelect, Textarea } from '@/components/ui/input'
import { Alert, Avatar, Checkbox, Skeleton } from '@/components/ui/misc'
import { TBody, TD, TH, THead, TR, Table } from '@/components/ui/table'
import { useMe } from '@/lib/auth'
import { fmtDate, fmtDateTime, roleLabel } from '@/lib/format'
import { useAppMutation } from '@/lib/query'

export const Route = createFileRoute('/_app/staff/competence')({
  component: Competence,
})

const nice = (s: string) => s.replace(/_/g, ' ')

function Competence() {
  const me = useMe()
  const [expiring, setExpiring] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [legacy, setLegacy] = useState(false)
  const q = useQuery({ queryKey: ['competence', 'profiles', expiring], queryFn: () => competence.listProfiles(expiring ? { expiringWithinDays: 90 } : {}) })
  const legacyRows = useQuery({ queryKey: ['competence', 'legacy'], queryFn: competence.listLegacy })
  const isManager = me.org.type === 'verifier' && !me.isAdmin && me.role === 'verifier_manager'
  const reminders = useAppMutation(async () => competence.expiryRemindersSync(), { successMessage: (n) => (n ? `${n} expiry reminder${n === 1 ? '' : 's'} sent (90 / 30 / 7 days and on expiry).` : 'No new reminder due today; earlier reminders are not repeated.') })
  const current = q.data?.find((p) => p.user_id === selected)
  return (
    <>
      <PageHeader
        title="Competence"
        description={me.isAdmin ? 'Read-only for the platform administrator.' : 'Qualifications, sector scopes, technical areas, programmes and validity per person (ISO 14065 / ISO 14066). Managers maintain each other\'s profiles; nobody edits their own. The team panel runs the checks from these profiles.'}
        actions={
          <>
            <label className="inline-flex items-center gap-2 text-sm">
              <Checkbox checked={expiring} onCheckedChange={(v) => setExpiring(v === true)} /> Expiring within 90 days
            </label>
            {isManager ? (
              <Button variant="secondary" onClick={() => reminders.mutate()} loading={reminders.isPending}>
                <BellRing /> Run expiry reminders
              </Button>
            ) : null}
          </>
        }
      />
      {!q.data ? (
        <Skeleton className="h-64" />
      ) : q.data.length === 0 ? (
        <EmptyState icon={<Award />} title="No profile matches" />
      ) : (
        <Card>
          <Table label="Competence profiles">
            <THead>
              <tr>
                <TH>Person</TH>
                <TH>Qualifications</TH>
                <TH>Sector scopes</TH>
                <TH>Technical areas</TH>
                <TH>Programmes</TH>
                <TH>Languages</TH>
                <TH>Validity</TH>
                <TH>Status</TH>
              </tr>
            </THead>
            <TBody>
              {q.data.map((p) => {
                const soonest = [...p.qualifications].sort((a, b) => a.daysToExpiry - b.daysToExpiry)[0]
                return (
                  <TR key={p.user_id} clickable onClick={() => setSelected(p.user_id)} data-testid={`profile-${p.user_id}`}>
                    <TD>
                      <div className="flex items-center gap-2">
                        <Avatar name={p.userName} tone="primary" size="sm" />
                        <div>
                          <div className="text-fg text-sm font-medium">{p.userName}</div>
                          <div className="text-fg-subtle text-xs">
                            {roleLabel(p.orgRole)} · {p.activeAssignments} active role{p.activeAssignments === 1 ? '' : 's'}
                          </div>
                        </div>
                      </div>
                    </TD>
                    <TD>
                      <div className="flex flex-wrap gap-1">
                        {p.qualifications.length ? p.qualifications.map((qq) => <Badge key={qq.id} tone={qq.status === 'valid' ? 'success' : qq.status === 'expiring' ? 'warning' : 'danger'}>{QUALIFICATION_KIND_LABELS[qq.kind]}</Badge>) : <span className="text-fg-subtle text-xs">none on file</span>}
                      </div>
                    </TD>
                    <TD className="text-xs">{[...new Set(p.qualifications.flatMap((qq) => qq.sector_scopes_json))].map(nice).join(', ') || '—'}</TD>
                    <TD className="text-xs">{[...new Set(p.qualifications.flatMap((qq) => qq.technical_areas_json))].map(nice).join(', ') || '—'}</TD>
                    <TD className="text-xs">{[...new Set(p.qualifications.flatMap((qq) => qq.programmes_json))].map(nice).join(', ') || '—'}</TD>
                    <TD className="text-xs">{p.languages_json.join(', ') || '—'}</TD>
                    <TD className="text-xs whitespace-nowrap">{soonest ? `${soonest.status === 'expired' ? 'expired' : 'until'} ${fmtDate(soonest.valid_until)}${soonest.daysToExpiry >= 0 ? ` (${soonest.daysToExpiry} d)` : ''}` : '—'}</TD>
                    <TD>
                      <StatusChip status={p.overall === 'none' ? 'pending' : p.overall} label={p.overall === 'none' ? 'No qualification' : undefined} />
                    </TD>
                  </TR>
                )
              })}
            </TBody>
          </Table>
        </Card>
      )}

      <Card className="mt-5">
        <CardHeader title={<span className="inline-flex items-center gap-2"><History className="size-4" /> Legacy engagements (rotation history)</span>} description="Engagements done before the platform, entered by a manager so the rotation counts are complete (PRD FR-98). Audited." actions={isManager ? <Button size="sm" variant="secondary" onClick={() => setLegacy(true)}><Plus /> Add legacy engagement</Button> : null} />
        <CardContent>
          {!legacyRows.data ? (
            <Skeleton className="h-16" />
          ) : legacyRows.data.length === 0 ? (
            <p className="text-fg-muted text-sm">None recorded.</p>
          ) : (
            <ul className="divide-border divide-y text-sm">
              {legacyRows.data.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center gap-2 py-2">
                  <code className="font-mono text-xs">{l.reference}</code>
                  <span className="text-fg">{l.clientName}</span>
                  <span className="text-fg-subtle text-xs">
                    {SERVICE_TYPE_LABELS[l.service_type]} · {l.period_start.slice(0, 4)}
                    {l.period_end.slice(0, 4) !== l.period_start.slice(0, 4) ? `–${l.period_end.slice(0, 4)}` : ''}
                  </span>
                  {l.userName ? <Badge tone="outline">{l.userName} · {l.service_role ? roleLabel(l.service_role) : ''}</Badge> : <Badge tone="outline">VERIFASSUR (body)</Badge>}
                  <span className="text-fg-subtle ml-auto text-xs">entered by {l.enteredByName}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      {current ? <ProfileDrawer p={current} canEdit={isManager} onClose={() => setSelected(null)} /> : null}
      {legacy ? <LegacyDialog onClose={() => setLegacy(false)} profiles={q.data ?? []} /> : null}
    </>
  )
}

function ProfileDrawer({ p, canEdit, onClose }: { p: ProfileView; canEdit: boolean; onClose: () => void }) {
  const [edit, setEdit] = useState<QualificationView | 'new' | null>(null)
  const [remove, setRemove] = useState<QualificationView | null>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const [languages, setLanguages] = useState<string | null>(null)
  const removeM = useAppMutation(({ id, reason }: { id: string; reason: string }) => competence.removeQualification(p.user_id, id, reason), { successMessage: 'Qualification removed.' })
  const saveM = useAppMutation(() => competence.updateProfile(p.user_id, { summary: summary ?? p.summary, languages: (languages ?? p.languages_json.join(', ')).split(',').map((x) => x.trim()).filter(Boolean) }), { successMessage: 'Profile updated.', onSuccess: () => { setSummary(null); setLanguages(null) } })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={<span className="inline-flex items-center gap-2">{p.userName} <Badge tone="outline">{roleLabel(p.orgRole)}</Badge></span>} description={`${p.jobTitle} · ${p.activeAssignments} active role${p.activeAssignments === 1 ? '' : 's'} · ${p.lastEditedByName ? `last edited by ${p.lastEditedByName} on ${fmtDateTime(p.last_edited_at)}` : 'never edited'}`} size="xl">
        {p.isOwn ? (
          <Alert tone="warning" icon={<Lock />} className="mb-4" title="This is your own profile">
            A user cannot edit their own competence profile (PRD FR-94, policy `own_profile`). Ask the other manager to maintain it; any attempt is refused and logged.
          </Alert>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-fg text-sm font-semibold">Qualifications</h4>
          {canEdit ? (
            <Button size="sm" onClick={() => setEdit('new')} data-testid="add-qualification">
              <Plus /> Add qualification
            </Button>
          ) : null}
        </div>
        {p.qualifications.length === 0 ? (
          <p className="text-fg-muted mt-2 text-sm">No qualification on file. This person cannot be nominated in a role that requires one without a warning (or a block for the independent reviewer).</p>
        ) : (
          <Table label="Qualifications">
            <THead>
              <tr>
                <TH>Kind</TH>
                <TH>Sector scopes</TH>
                <TH>Technical areas</TH>
                <TH>Programmes</TH>
                <TH>Valid</TH>
                <TH>Status</TH>
                <TH>Evidence</TH>
                {canEdit ? <TH /> : null}
              </tr>
            </THead>
            <TBody>
              {p.qualifications.map((qq) => (
                <TR key={qq.id} data-qualification-status={qq.status}>
                  <TD className="text-sm font-medium">{QUALIFICATION_KIND_LABELS[qq.kind]}</TD>
                  <TD className="text-xs">{qq.sector_scopes_json.map(nice).join(', ') || '—'}</TD>
                  <TD className="text-xs">{qq.technical_areas_json.map(nice).join(', ') || '—'}</TD>
                  <TD className="text-xs">{qq.programmes_json.map(nice).join(', ') || '—'}</TD>
                  <TD className="text-xs whitespace-nowrap">
                    {fmtDate(qq.valid_from)} – {fmtDate(qq.valid_until)}
                  </TD>
                  <TD>
                    <StatusChip status={qq.status} label={qq.status === 'expiring' ? `Expiring · ${qq.daysToExpiry} d` : qq.status === 'expired' ? 'Expired' : 'Valid'} />
                  </TD>
                  <TD className="text-xs">{qq.evidence_document_id ? <Badge tone="success">on file</Badge> : <span className="text-fg-subtle">—</span>}</TD>
                  {canEdit ? (
                    <TD className="whitespace-nowrap">
                      <Button size="icon" variant="ghost" aria-label="Edit qualification" onClick={() => setEdit(qq)}>
                        <Pencil />
                      </Button>
                      <Button size="icon" variant="ghost" aria-label="Remove qualification" onClick={() => setRemove(qq)}>
                        <Trash2 />
                      </Button>
                    </TD>
                  ) : null}
                </TR>
              ))}
            </TBody>
          </Table>
        )}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Languages" hint="Comma-separated">
            <Input value={languages ?? p.languages_json.join(', ')} onChange={(e) => setLanguages(e.target.value)} disabled={!canEdit} />
          </Field>
          <Field label="Summary">
            <Textarea value={summary ?? p.summary} onChange={(e) => setSummary(e.target.value)} disabled={!canEdit} />
          </Field>
        </div>
        {canEdit ? (
          <DialogFooter>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button onClick={() => saveM.mutate()} loading={saveM.isPending} disabled={summary === null && languages === null}>
              Save profile
            </Button>
          </DialogFooter>
        ) : null}
        {edit ? <QualificationDialog userId={p.user_id} q={edit === 'new' ? null : edit} onClose={() => setEdit(null)} /> : null}
        <ReasonDialog open={remove !== null} onOpenChange={(o) => !o && setRemove(null)} title={`Remove ${remove ? QUALIFICATION_KIND_LABELS[remove.kind] : ''}`} description="The removal is audited with before and after values." reasonLabel="Reason" confirmLabel="Remove" danger onConfirm={(reason) => remove && removeM.mutateAsync({ id: remove.id, reason })} />
      </DialogContent>
    </Dialog>
  )
}

function QualificationDialog({ userId, q, onClose }: { userId: string; q: QualificationView | null; onClose: () => void }) {
  const [kind, setKind] = useState<QualificationKind>(q?.kind ?? 'verifier')
  const [scopes, setScopes] = useState(q?.sector_scopes_json.join(', ') ?? '')
  const [areas, setAreas] = useState(q?.technical_areas_json.join(', ') ?? '')
  const [programmes, setProgrammes] = useState(q?.programmes_json.join(', ') ?? '')
  const [from, setFrom] = useState(q?.valid_from ?? '')
  const [until, setUntil] = useState(q?.valid_until ?? '')
  const [note, setNote] = useState(q?.note ?? '')
  const [evidence, setEvidence] = useState<string | null>(q?.evidence_document_id ?? null)
  const [upload, setUpload] = useState(false)
  const split = (s: string) => s.split(',').map((x) => x.trim().replace(/\s+/g, '_').toLowerCase()).filter(Boolean)
  const m = useAppMutation(() => competence.upsertQualification(userId, { kind, sector_scopes: split(scopes), technical_areas: split(areas), programmes: split(programmes), valid_from: from, valid_until: until, evidence_document_id: evidence, note: note || null }, q?.id), { successMessage: q ? 'Qualification updated.' : 'Qualification added.', onSuccess: onClose })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={q ? 'Edit qualification' : 'Add qualification'} description="Status (valid, expiring within 90 days, expired) is computed from the validity dates, never stored. Every edit is audited." size="lg">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Kind" required>
            <NativeSelect value={kind} onChange={(e) => setKind(e.target.value as QualificationKind)}>
              {QUALIFICATION_KINDS.map((k) => (
                <option key={k} value={k}>
                  {QUALIFICATION_KIND_LABELS[k]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Programmes" hint="Comma-separated, e.g. iso14064, insetting">
            <Input value={programmes} onChange={(e) => setProgrammes(e.target.value)} />
          </Field>
          <Field label="Sector scopes" hint="Comma-separated, e.g. dairy processing, dairy farming">
            <Input value={scopes} onChange={(e) => setScopes(e.target.value)} />
          </Field>
          <Field label="Technical areas" hint="Comma-separated, e.g. ghg inventory, soil carbon">
            <Input value={areas} onChange={(e) => setAreas(e.target.value)} />
          </Field>
          <Field label="Valid from" required>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="Valid until" required>
            <Input type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
          </Field>
          <Field label="Note" className="sm:col-span-2">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Certificate number, issuing body…" />
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setUpload(true)}>
            <Upload /> {evidence ? 'Replace evidence' : 'Upload evidence'}
          </Button>
          <span className="text-fg-subtle text-xs">{evidence ? 'Certificate on file.' : 'No certificate attached yet.'}</span>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => m.mutate()} loading={m.isPending} disabled={!from || !until}>
            {q ? 'Save' : 'Add qualification'}
          </Button>
        </DialogFooter>
      </DialogContent>
      <ShowDontDoDialog open={upload} onOpenChange={setUpload} title="Upload the certificate" description="PDF or image, up to 20 MB; stored in the evidence vault with its hash." wouldDo={['Open a file picker and upload to the evidence vault', 'Compute the SHA-256 and link the document to the qualification', 'Record the upload in the audit log']} simulateLabel="Simulate upload" onSimulate={() => { setEvidence(`doc_cert_${Date.now()}`); toast.success('Certificate uploaded (simulated).') }} />
    </Dialog>
  )
}

function LegacyDialog({ onClose, profiles }: { onClose: () => void; profiles: ProfileView[] }) {
  const clients = useQuery({ queryKey: ['staff', 'clients'], queryFn: staff.clients })
  const [clientOrgId, setClientOrgId] = useState('')
  const [userId, setUserId] = useState('')
  const [role, setRole] = useState<ServiceRole>('verifier_team_leader')
  const [type, setType] = useState<ServiceType>('iso14064_1_inventory_verification')
  const [reference, setReference] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [note, setNote] = useState('')
  const m = useAppMutation(() => competence.addLegacy({ clientOrgId, userId: userId || null, serviceRole: userId ? role : null, serviceType: type, reference, periodStart: start, periodEnd: end, note: note || null }), { successMessage: 'Legacy engagement recorded; the rotation history counts it.', onSuccess: onClose })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Add a legacy engagement" description="An engagement completed before the platform. Leave the person empty for a body-level (VVB) row." size="lg">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Client" required>
            <NativeSelect value={clientOrgId} onChange={(e) => setClientOrgId(e.target.value)}>
              <option value="">Choose…</option>
              {(clients.data ?? []).map((c) => (
                <option key={c.orgId} value={c.orgId}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Service type" required>
            <NativeSelect value={type} onChange={(e) => setType(e.target.value as ServiceType)}>
              {SERVICE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {SERVICE_TYPE_LABELS[t]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Person (optional)">
            <NativeSelect value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">VERIFASSUR as a body</option>
              {profiles.map((p) => (
                <option key={p.user_id} value={p.user_id}>
                  {p.userName}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Role held">
            <NativeSelect value={role} onChange={(e) => setRole(e.target.value as ServiceRole)} disabled={!userId}>
              {(['verifier_team_leader', 'verifier_auditor', 'verifier_technical_expert', 'verifier_independent_reviewer'] as ServiceRole[]).map((r) => (
                <option key={r} value={r}>
                  {roleLabel(r)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Historic reference" required>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. VX-2022-0041" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Period start" required>
              <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </Field>
            <Field label="Period end" required>
              <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </Field>
          </div>
          <Field label="Note" className="sm:col-span-2">
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => m.mutate()} loading={m.isPending} disabled={!clientOrgId || !reference.trim() || !start || !end}>
            <Plus /> Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
