/**
 * Workflow templates (PRD FR-10; v0.3 FR-80, FR-84, FR-95, FR-97, FR-91): phases, steps, slots, approvals and
 * checklists per service type, plus the governance rules as data. A manager edits them with a reason; every save
 * validates the template and creates a new active version (plan_v1 §8 D34). ADMIN reads only.
 */
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { History, Layers, Lock, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { staff } from '@/api'
import type { TemplatePatch } from '@/api/staff'
import type { AssertionBase, MaterialityBasis, OnBreach, QualificationKind, RotationRole, RotationScope, ServiceRole } from '@/domain/enums'
import { ASSERTION_BASES, ASSERTION_BASE_LABELS, QUALIFICATION_KINDS, QUALIFICATION_KIND_LABELS, ROTATION_ROLES } from '@/domain/enums'
import { PROTECTED_APPROVAL_KINDS, type RotationRule, type WorkflowTemplate } from '@/domain/workflow/template.schema'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Field, Input, NativeSelect, Textarea } from '@/components/ui/input'
import { Alert, Checkbox, Skeleton, Switch, Tooltip } from '@/components/ui/misc'
import { cn } from '@/lib/cn'
import { useMe } from '@/lib/auth'
import { roleLabel } from '@/lib/format'
import { useAppMutation } from '@/lib/query'

export const Route = createFileRoute('/_app/staff/templates')({
  component: Templates,
})

const REQ_ROLES: ServiceRole[] = ['verifier_team_leader', 'verifier_auditor', 'verifier_technical_expert', 'verifier_independent_reviewer']

function Templates() {
  const me = useMe()
  const q = useQuery({ queryKey: ['staff', 'templates'], queryFn: staff.templates })
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [edit, setEdit] = useState(false)
  const canEdit = me.org.type === 'verifier' && !me.isAdmin && me.role === 'verifier_manager'
  if (!q.data) return <Skeleton className="h-64" />
  const active = q.data.filter((x) => x.is_active)
  const t: WorkflowTemplate = active.find((x) => x.service_type === selectedType) ?? active[0]
  const versions = q.data.filter((x) => x.service_type === t.service_type).sort((a, b) => b.version - a.version)
  return (
    <>
      <PageHeader title="Workflow templates" description="Templates are data: phases, steps, owner roles, planned durations, document slots, approvals, checklists, and since v0.3 the non-overridable locks, materiality defaults, competence requirements, rotation rules and complaint targets. New services copy the active version; running services are never changed by edits." />
      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="Service types" />
            <ul className="divide-border divide-y">
              {active.map((x) => (
                <li key={x.id}>
                  <button type="button" onClick={() => setSelectedType(x.service_type)} className={cn('flex w-full items-center gap-2 px-5 py-2.5 text-left text-sm', x.id === t.id ? 'bg-primary-soft/40 text-primary-strong font-semibold' : 'hover:bg-surface-muted')}>
                    <Layers className="size-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{x.name}</span>
                    <Badge tone="outline">v{x.version}</Badge>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardHeader title={<span className="inline-flex items-center gap-2"><History className="size-4" /> Version history</span>} description="Every save is a new version with its reason; older versions stay readable for running services." />
            <CardContent>
              <ul className="space-y-1.5 text-xs">
                {versions.map((v) => (
                  <li key={v.id} className="flex flex-wrap items-center gap-2">
                    <Badge tone={v.is_active ? 'success' : 'neutral'}>
                      v{v.version} {v.is_active ? '· active' : '· inactive'}
                    </Badge>
                    <span className="text-fg-muted">{v.last_edit_reason ?? 'shipped template'}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader title={t.name} description={`${t.standard} · version ${t.version} · ${t.is_active ? 'active' : 'inactive'} · ${t.assurance.applies ? `${t.assurance.default} assurance by default` : 'validation (no level of assurance)'} · retention ${t.retention_years ?? 'platform default'} years`} actions={canEdit ? <Button variant="secondary" size="sm" onClick={() => setEdit(true)}><Pencil /> Edit template</Button> : me.isAdmin ? <Badge tone="warning">Read-only</Badge> : null} />
          <CardContent className="space-y-5">
            {t.phases.map((p) => (
              <div key={p.key}>
                <h4 className="text-fg mb-2 text-sm font-semibold">
                  {p.name} <span className="text-fg-subtle font-normal">· {p.steps.reduce((a, s) => a + s.planned_duration_days, 0)} planned days</span>
                </h4>
                <ol className="border-border divide-border divide-y rounded-md border">
                  {p.steps.map((s) => (
                    <li key={s.key} className="px-3 py-2" data-step-key={s.key} data-non-overridable={s.non_overridable}>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        {s.non_overridable ? (
                          <Tooltip content="Non-overridable: cannot be completed or skipped by a manager override (PRD FR-80).">
                            <Lock className="text-fg-muted size-3.5" aria-label="Non-overridable" />
                          </Tooltip>
                        ) : null}
                        <span className="font-medium">{s.name}</span>
                        <Badge tone="outline">{roleLabel(s.owner_role)}</Badge>
                        <span className="text-fg-subtle text-xs">{s.planned_duration_days} days</span>
                        {s.parallel_allowed ? <Badge tone="info">parallel</Badge> : null}
                        {s.is_opinion_step ? <Badge tone="primary">opinion iterations</Badge> : null}
                      </div>
                      {s.description ? <div className="text-fg-muted text-xs">{s.description}</div> : null}
                      {s.slots.length || s.approvals.length ? (
                        <div className="text-fg-subtle mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
                          {s.slots.map((sl) => (
                            <span key={sl.key}>
                              📄 {sl.name} {sl.required ? <span className="text-danger">(required)</span> : '(optional)'} · {sl.uploader_party}
                            </span>
                          ))}
                          {s.approvals.map((a) => (
                            <span key={a.kind}>✅ {a.label}</span>
                          ))}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
            <div className="grid gap-4 sm:grid-cols-2">
              <Rules t={t} />
              <div className="space-y-4">
                <div>
                  <h4 className="text-fg mb-1 text-sm font-semibold">Independent review checklist</h4>
                  <ul className="text-fg-muted list-disc pl-4 text-xs">
                    {t.ir_checklist.map((c) => (
                      <li key={c.key}>{c.label}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-fg mb-1 text-sm font-semibold">Manager checklist</h4>
                  <ul className="text-fg-muted list-disc pl-4 text-xs">
                    {t.manager_checklist.map((c) => (
                      <li key={c.key}>{c.label}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      {edit ? <TemplateEditor t={t} onClose={() => setEdit(false)} /> : null}
    </>
  )
}

function Rules({ t }: { t: WorkflowTemplate }) {
  const md = t.materiality_defaults
  const roles = Object.entries(t.competence_requirements.roles) as [ServiceRole, { qualification: QualificationKind; programme: string | null }][]
  return (
    <div className="space-y-3 text-xs">
      <div>
        <h4 className="text-fg mb-1 text-sm font-semibold">Materiality defaults</h4>
        {md ? (
          <p className="text-fg-muted">
            {md.threshold_pct} % of {ASSERTION_BASE_LABELS[md.assertion_base].toLowerCase()} · {md.basis === 'programme_rule' ? 'programme rule' : 'verifier judgement'}
            {md.basis_note ? ` · ${md.basis_note}` : ''}
            {md.qualitative.length ? ` · qualitative: ${md.qualitative.join('; ')}` : ''}
          </p>
        ) : (
          <p className="text-fg-muted">Not applicable (validation).</p>
        )}
      </div>
      <div>
        <h4 className="text-fg mb-1 text-sm font-semibold">Competence requirements</h4>
        <ul className="text-fg-muted list-disc pl-4">
          {roles.map(([r, req]) => (
            <li key={r}>
              {roleLabel(r)}: {QUALIFICATION_KIND_LABELS[req.qualification]}
              {req.programme ? ` for ${req.programme}` : ''}
              {r === 'verifier_independent_reviewer' ? ' (hard block)' : ' (warning)'}
            </li>
          ))}
          <li>Team coverage of sector scopes and technical areas: {t.competence_requirements.team_coverage ? 'required (warning)' : 'not checked'}</li>
        </ul>
      </div>
      <div>
        <h4 className="text-fg mb-1 text-sm font-semibold">Rotation rules</h4>
        {t.rotation_rules.length === 0 ? (
          <p className="text-fg-muted">None.</p>
        ) : (
          <ul className="text-fg-muted list-disc pl-4">
            {t.rotation_rules.map((r, i) => (
              <li key={i}>
                {r.role === 'vvb' ? 'VERIFASSUR (body)' : roleLabel(r.role)}: at most {r.max_consecutive} consecutive on the same {r.scope === 'same_project' ? 'project' : 'client'}, cooling-off {r.cooling_off_periods} period{r.cooling_off_periods === 1 ? '' : 's'}, on breach {r.on_breach}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h4 className="text-fg mb-1 text-sm font-semibold">Complaint targets and findings</h4>
        <p className="text-fg-muted">
          Acknowledge within {t.complaint_targets.acknowledge_days} working days, decide within {t.complaint_targets.decide_days} · blocking finding types: {t.blocking_finding_types.join(', ')}
        </p>
      </div>
    </div>
  )
}

/** Structured editor (PRD §7.2 "Template editor"): every save asks a reason and validates the protected steps. */
function TemplateEditor({ t, onClose }: { t: WorkflowTemplate; onClose: () => void }) {
  const steps = t.phases.flatMap((p) => p.steps)
  const [locks, setLocks] = useState<Record<string, boolean>>(Object.fromEntries(steps.map((s) => [s.key, s.non_overridable])))
  const md = t.materiality_defaults
  const [base, setBase] = useState<AssertionBase>(md?.assertion_base ?? 'total_gross_tco2e')
  const [pct, setPct] = useState(String(md?.threshold_pct ?? 5))
  const [basis, setBasis] = useState<MaterialityBasis>(md?.basis ?? 'programme_rule')
  const [basisNote, setBasisNote] = useState(md?.basis_note ?? '')
  const [qualitative, setQualitative] = useState(md?.qualitative.join('\n') ?? '')
  const [roles, setRoles] = useState<Record<string, { qualification: QualificationKind | ''; programme: string }>>(Object.fromEntries(REQ_ROLES.map((r) => [r, { qualification: t.competence_requirements.roles[r]?.qualification ?? '', programme: t.competence_requirements.roles[r]?.programme ?? '' }])))
  const [coverage, setCoverage] = useState(t.competence_requirements.team_coverage)
  const [rules, setRules] = useState<RotationRule[]>(t.rotation_rules.map((r) => ({ ...r })))
  const [ackDays, setAckDays] = useState(String(t.complaint_targets.acknowledge_days))
  const [decideDays, setDecideDays] = useState(String(t.complaint_targets.decide_days))
  const [retention, setRetention] = useState(t.retention_years == null ? '' : String(t.retention_years))
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const protectedKeys = new Set(steps.filter((s) => s.approvals.some((a) => PROTECTED_APPROVAL_KINDS.includes(a.kind)) || s.is_opinion_step || s.key === 'team_nomination').map((s) => s.key))
  const m = useAppMutation(
    () => {
      const patch: TemplatePatch = {
        nonOverridable: locks,
        competenceRequirements: { roles: Object.fromEntries(Object.entries(roles).filter(([, v]) => v.qualification).map(([r, v]) => [r, { qualification: v.qualification as QualificationKind, programme: v.programme || null }])), team_coverage: coverage },
        rotationRules: rules,
        complaintTargets: { acknowledge_days: Number(ackDays), decide_days: Number(decideDays) },
        retentionYears: retention === '' ? null : Number(retention),
      }
      if (t.assurance.applies) patch.materialityDefaults = { assertion_base: base, threshold_pct: Number(pct), basis, basis_note: basisNote, qualitative: qualitative.split('\n').map((x) => x.trim()).filter(Boolean) }
      return staff.updateTemplate(t.id, patch, reason)
    },
    {
      successMessage: (r) => `Template saved as version ${r.version}; new services use it, running services keep their copy.`,
      onSuccess: onClose,
      onError: (e) => {
        const d = (e as { details?: { errors?: string[] } }).details
        setErrors(d?.errors ?? [])
      },
    },
  )
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={`Edit template — ${t.name}`} description="Rules as data. The validator refuses a template where a protected approval, the team nomination or the opinion step could be forced to completed or skipped (PRD FR-80)." size="xl">
        {errors.length ? (
          <Alert tone="danger" className="mb-4" title="The template did not validate">
            <ul className="list-disc pl-4">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </Alert>
        ) : null}
        <section className="space-y-2">
          <h4 className="text-fg text-sm font-semibold">Non-overridable steps</h4>
          <p className="text-fg-subtle text-xs">A locked step can never be forced to completed or skipped by a manager override; reopening stays allowed. Steps holding a protected approval are locked by the validator.</p>
          <ul className="divide-border border-border divide-y rounded-md border">
            {steps.map((s) => (
              <li key={s.key} className="flex items-center gap-3 px-3 py-2 text-sm">
                {locks[s.key] ? <Lock className="text-fg-muted size-3.5" /> : <span className="size-3.5" />}
                <span className="flex-1">
                  {s.name}
                  {protectedKeys.has(s.key) ? <span className="text-fg-subtle ml-2 text-xs">protected: {s.approvals.filter((a) => PROTECTED_APPROVAL_KINDS.includes(a.kind)).map((a) => a.label).join(', ') || (s.is_opinion_step ? 'final opinion' : 'team nomination')}</span> : null}
                </span>
                <Switch checked={locks[s.key]} onCheckedChange={(v) => setLocks((l) => ({ ...l, [s.key]: v }))} aria-label={`Non-overridable: ${s.name}`} />
              </li>
            ))}
          </ul>
        </section>
        {t.assurance.applies ? (
          <section className="mt-5 space-y-2">
            <h4 className="text-fg text-sm font-semibold">Materiality defaults</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Assertion base">
                <NativeSelect value={base} onChange={(e) => setBase(e.target.value as AssertionBase)}>
                  {ASSERTION_BASES.map((b) => (
                    <option key={b} value={b}>
                      {ASSERTION_BASE_LABELS[b]}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Threshold (%)">
                <Input type="number" min={0} max={100} step={0.1} value={pct} onChange={(e) => setPct(e.target.value)} />
              </Field>
              <Field label="Basis">
                <NativeSelect value={basis} onChange={(e) => setBasis(e.target.value as MaterialityBasis)}>
                  <option value="programme_rule">Programme rule</option>
                  <option value="verifier_judgement">Verifier judgement</option>
                </NativeSelect>
              </Field>
              <Field label="Basis note">
                <Input value={basisNote} onChange={(e) => setBasisNote(e.target.value)} />
              </Field>
              <Field label="Qualitative considerations" hint="One per line." className="sm:col-span-2">
                <Textarea value={qualitative} onChange={(e) => setQualitative(e.target.value)} />
              </Field>
            </div>
          </section>
        ) : null}
        <section className="mt-5 space-y-2">
          <h4 className="text-fg text-sm font-semibold">Competence requirements</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {REQ_ROLES.map((r) => (
              <div key={r} className="border-border rounded-md border px-3 py-2">
                <div className="text-fg mb-1 text-xs font-semibold">
                  {roleLabel(r)} {r === 'verifier_independent_reviewer' ? <Badge tone="danger">hard block</Badge> : <Badge tone="warning">warning</Badge>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <NativeSelect value={roles[r].qualification} onChange={(e) => setRoles((x) => ({ ...x, [r]: { ...x[r], qualification: e.target.value as QualificationKind | '' } }))} aria-label={`Qualification for ${roleLabel(r)}`}>
                    <option value="">No requirement</option>
                    {QUALIFICATION_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {QUALIFICATION_KIND_LABELS[k]}
                      </option>
                    ))}
                  </NativeSelect>
                  <Input value={roles[r].programme} onChange={(e) => setRoles((x) => ({ ...x, [r]: { ...x[r], programme: e.target.value } }))} placeholder="programme (optional)" aria-label={`Programme for ${roleLabel(r)}`} />
                </div>
              </div>
            ))}
          </div>
          <label className="inline-flex items-center gap-2 text-sm">
            <Checkbox checked={coverage} onCheckedChange={(v) => setCoverage(v === true)} /> The team as a whole must cover the service's sector scopes and technical areas (warning)
          </label>
        </section>
        <section className="mt-5 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-fg text-sm font-semibold">Rotation rules</h4>
            <Button size="sm" variant="secondary" onClick={() => setRules((r) => [...r, { role: 'verifier_team_leader', scope: 'same_project', max_consecutive: 3, cooling_off_periods: 1, on_breach: 'warn' }])}>
              <Plus /> Add rule
            </Button>
          </div>
          {rules.length === 0 ? <p className="text-fg-muted text-xs">No rotation rule.</p> : null}
          <ul className="space-y-2">
            {rules.map((r, i) => (
              <li key={i} className="border-border grid gap-2 rounded-md border px-3 py-2 sm:grid-cols-[1.2fr_1fr_80px_80px_90px_auto]">
                <NativeSelect value={r.role} onChange={(e) => setRules((x) => x.map((y, j) => (j === i ? { ...y, role: e.target.value as RotationRole } : y)))} aria-label="Rule role">
                  {ROTATION_ROLES.map((ro) => (
                    <option key={ro} value={ro}>
                      {ro === 'vvb' ? 'VERIFASSUR (body, triage warn only)' : roleLabel(ro)}
                    </option>
                  ))}
                </NativeSelect>
                <NativeSelect value={r.scope} onChange={(e) => setRules((x) => x.map((y, j) => (j === i ? { ...y, scope: e.target.value as RotationScope } : y)))} aria-label="Rule scope">
                  <option value="same_project">Same project</option>
                  <option value="same_client">Same client</option>
                </NativeSelect>
                <Input type="number" min={1} value={r.max_consecutive} onChange={(e) => setRules((x) => x.map((y, j) => (j === i ? { ...y, max_consecutive: Number(e.target.value) } : y)))} aria-label="Max consecutive" />
                <Input type="number" min={0} value={r.cooling_off_periods} onChange={(e) => setRules((x) => x.map((y, j) => (j === i ? { ...y, cooling_off_periods: Number(e.target.value) } : y)))} aria-label="Cooling-off periods" />
                <NativeSelect value={r.on_breach} onChange={(e) => setRules((x) => x.map((y, j) => (j === i ? { ...y, on_breach: e.target.value as OnBreach } : y)))} aria-label="On breach">
                  <option value="warn">Warn</option>
                  <option value="block">Block</option>
                </NativeSelect>
                <Button size="icon" variant="ghost" aria-label="Remove rule" onClick={() => setRules((x) => x.filter((_, j) => j !== i))}>
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        </section>
        <section className="mt-5 grid gap-3 sm:grid-cols-3">
          <Field label="Acknowledge complaints within (working days)">
            <Input type="number" min={1} value={ackDays} onChange={(e) => setAckDays(e.target.value)} />
          </Field>
          <Field label="Decide complaints within (working days)">
            <Input type="number" min={1} value={decideDays} onChange={(e) => setDecideDays(e.target.value)} />
          </Field>
          <Field label="Retention (years)" hint="Empty = platform default">
            <Input type="number" min={1} value={retention} onChange={(e) => setRetention(e.target.value)} />
          </Field>
        </section>
        <Field label="Reason for the change" required hint="At least 10 characters; written to the audit log with before and after values (template.edited)." className="mt-5">
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => m.mutate()} loading={m.isPending} disabled={reason.trim().length < 10}>
            Save as version {t.version + 1}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
