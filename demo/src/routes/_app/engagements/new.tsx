/** Request wizard (PRD FR-9, FR-14; plan_v1 ch. 2): Project → Service type → Scope & period → Attachments → Review & submit. */
import { useQuery } from '@tanstack/react-query'
import { Navigate, createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight, CheckCircle2, FileText, Plus, Send, Trash2, Upload } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { documents, projects, services } from '@/api'
import type { LevelOfAssurance, ServiceType } from '@/domain/enums'
import { LEVEL_OF_ASSURANCE_LABELS, PROGRAMME_LABELS, SERVICE_TYPES, SERVICE_TYPE_LABELS } from '@/domain/enums'
import type { ServiceScope } from '@/domain/schemas'
import { templateFor } from '@/domain/workflow/templates'
import { AssuranceBadge } from '@/components/assurance-badge'
import { PageHeader } from '@/components/page-header'
import { Stepper } from '@/components/stepper'
import { UploadDialog } from '@/components/upload-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Field, Input, NativeSelect, Textarea } from '@/components/ui/input'
import { Alert, Checkbox, Skeleton } from '@/components/ui/misc'
import { NewProjectDialog } from '@/routes/_app/projects/index'
import { cn } from '@/lib/cn'
import { fmtBytes, fmtDate } from '@/lib/format'
import { useAppMutation } from '@/lib/query'
import { useMe } from '@/lib/auth'

export const Route = createFileRoute('/_app/engagements/new')({
  validateSearch: z.object({ draft: z.string().optional(), project: z.string().optional() }),
  component: NewRequest,
})

const STEPS = ['Project', 'Service type', 'Scope and period', 'Attachments', 'Review and submit']

interface FormState {
  projectId: string
  serviceType: ServiceType | ''
  name: string
  periodStart: string
  periodEnd: string
  targetOpinionDate: string
  /** PRD v0.3 FR-81: requested level of assurance; the template says whether it applies and its default. */
  levelOfAssurance: LevelOfAssurance
  scope: ServiceScope
}

const thisYear = new Date().getUTCFullYear()
const emptyForm = (projectId = ''): FormState => ({
  projectId,
  serviceType: '',
  name: '',
  periodStart: `${thisYear - 1}-01-01`,
  periodEnd: `${thisYear - 1}-12-31`,
  targetOpinionDate: '',
  levelOfAssurance: 'reasonable',
  scope: { summary: '', sites: [], boundary: '', products: [], interventions: [], materiality_pct: null, sector_scopes: [], technical_areas: [] },
})

/** Loads a draft (or renewal) when `?draft=` is present, then mounts the wizard with its initial values. */
function NewRequest() {
  const me = useMe()
  const { draft: draftId, project: projectParam } = Route.useSearch()
  const draft = useQuery({ queryKey: ['service', draftId], queryFn: () => services.get(draftId!), enabled: Boolean(draftId) })
  if (me.org.type !== 'client') {
    return <Alert tone="warning" title="Requests are created by client organisations">Switch to a client persona in the demo panel to request work.</Alert>
  }
  if (draftId && !draft.data) return <Skeleton className="h-64" />
  if (draft.data && draft.data.service.status !== 'draft') {
    return <Navigate to="/engagements/$serviceId" params={{ serviceId: draft.data.service.id }} />
  }
  const s = draft.data?.service
  const initial: FormState = s
    ? { projectId: s.project_id, serviceType: s.service_type, name: s.name, periodStart: s.period_start, periodEnd: s.period_end, targetOpinionDate: s.target_opinion_date ?? '', levelOfAssurance: s.level_of_assurance, scope: s.scope_json }
    : emptyForm(projectParam ?? '')
  return <Wizard key={draftId ?? 'new'} initial={initial} initialStep={s ? 2 : 0} initialServiceId={draftId ?? null} draftReference={s?.reference ?? null} />
}

function Wizard({ initial, initialStep, initialServiceId, draftReference }: { initial: FormState; initialStep: number; initialServiceId: string | null; draftReference: string | null }) {
  const navigate = useNavigate()
  const me = useMe()
  const [step, setStep] = useState(initialStep)
  const [form, setForm] = useState<FormState>(initial)
  const [serviceId, setServiceId] = useState<string | null>(initialServiceId)
  const [confirm, setConfirm] = useState(false)
  const [newProject, setNewProject] = useState(false)
  const [upload, setUpload] = useState(false)
  const projs = useQuery({ queryKey: ['projects'], queryFn: () => projects.list() })
  const docs = useQuery({ queryKey: ['documents', serviceId], queryFn: () => documents.listForService(serviceId!), enabled: Boolean(serviceId) })

  const project = projs.data?.find((p) => p.id === form.projectId)
  const template = form.serviceType ? templateFor(form.serviceType) : null

  const ensureDraft = useAppMutation(
    async () => {
      if (serviceId) return services.updateDraft(serviceId, toDraftInput(form))
      const created = await services.createDraft(toDraftInput(form))
      setServiceId(created.id)
      return created
    },
    { silent: true },
  )
  const submit = useAppMutation(
    async () => {
      const svc = serviceId ? await services.updateDraft(serviceId, toDraftInput(form)) : await services.createDraft(toDraftInput(form))
      return services.submit(svc.id)
    },
    {
      successMessage: (svc) => `${svc.reference} submitted. VERIFASSUR will triage it shortly.`,
      onSuccess: (svc) => navigate({ to: '/engagements/$serviceId', params: { serviceId: svc.id } }),
    },
  )
  const removeDoc = useAppMutation((versionId: string) => documents.removeVersion(versionId), { successMessage: 'Attachment removed.' })

  const canNext = [Boolean(form.projectId), Boolean(form.serviceType), Boolean(form.name.trim() && form.periodStart && form.periodEnd && form.scope.summary.trim()), true, confirm][step]

  async function next() {
    if (step >= 1 && form.projectId && form.serviceType) {
      try {
        await ensureDraft.mutateAsync()
        if (step === 1 && !serviceId) toast.message('Draft saved. You can leave and come back from Engagements › Drafts.')
      } catch {
        return
      }
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1))
  }

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }))
  const updateScope = <K extends keyof ServiceScope>(k: K, v: ServiceScope[K]) => setForm((f) => ({ ...f, scope: { ...f.scope, [k]: v } }))

  return (
    <>
      <PageHeader crumbs={[{ label: 'Engagements', to: '/engagements' }, { label: 'New request' }]} title="Request validation or verification work" description="Five short steps. The request becomes a structured engagement with a pre-engagement form VERIFASSUR can triage immediately." meta={serviceId ? <Badge tone="outline">Draft {draftReference ?? ''} autosaved</Badge> : null} />
      <div className="mb-6">
        <Stepper steps={STEPS} current={step} onSelect={setStep} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardContent className="pt-5">
            {step === 0 ? (
              <div className="space-y-4">
                <p className="text-fg-muted text-sm">Which project is this engagement about? A project is the boundary that the opinion will refer to.</p>
                {projs.isLoading ? (
                  <Skeleton className="h-24" />
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {projs.data?.map((p) => (
                      <button key={p.id} type="button" onClick={() => update('projectId', p.id)} className={cn('rounded-card border p-3 text-left transition-colors', form.projectId === p.id ? 'border-primary bg-primary-soft/40' : 'border-border hover:bg-surface-muted')}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-fg text-sm font-semibold">{p.name}</span>
                          {form.projectId === p.id ? <CheckCircle2 className="text-primary size-4" /> : null}
                        </div>
                        <div className="text-fg-subtle mt-1 text-xs">
                          {PROGRAMME_LABELS[p.programme]} · {p.country} · {p.serviceCount} engagement{p.serviceCount === 1 ? '' : 's'}
                        </div>
                      </button>
                    ))}
                    <button type="button" onClick={() => setNewProject(true)} className="border-border text-fg-muted hover:bg-surface-muted flex items-center justify-center gap-2 rounded-card border border-dashed p-3 text-sm">
                      <Plus className="size-4" /> New project
                    </button>
                  </div>
                )}
              </div>
            ) : null}

            {step === 1 ? (
              <div className="space-y-4">
                <p className="text-fg-muted text-sm">What do you need assured? The service type sets the standard, the workflow and the documents VERIFASSUR will ask for.</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {SERVICE_TYPES.map((t) => {
                    const tpl = templateFor(t)
                    const selected = form.serviceType === t
                    return (
                      <button key={t} type="button" onClick={() => { update('serviceType', t); update('levelOfAssurance', tpl.assurance.applies ? tpl.assurance.default : 'not_applicable'); if (!form.name) update('name', `${SERVICE_TYPE_LABELS[t]} ${form.periodEnd.slice(0, 4)}`) }} className={cn('rounded-card border p-3 text-left transition-colors', selected ? 'border-primary bg-primary-soft/40' : 'border-border hover:bg-surface-muted')}>
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-fg text-sm font-semibold">{SERVICE_TYPE_LABELS[t]}</span>
                          {selected ? <CheckCircle2 className="text-primary size-4 shrink-0" /> : null}
                        </div>
                        <div className="text-fg-subtle mt-1 text-xs">
                          {tpl.standard} · {tpl.assurance.applies ? `${tpl.assurance.default} assurance by default` : 'validation, no assurance level'}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-4">
                <Field label="Engagement name" required>
                  <Input value={form.name} onChange={(e) => update('name', e.target.value)} />
                </Field>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Period start" required>
                    <Input type="date" value={form.periodStart} onChange={(e) => update('periodStart', e.target.value)} />
                  </Field>
                  <Field label="Period end" required>
                    <Input type="date" value={form.periodEnd} onChange={(e) => update('periodEnd', e.target.value)} />
                  </Field>
                  <Field label="Target opinion date">
                    <Input type="date" value={form.targetOpinionDate} onChange={(e) => update('targetOpinionDate', e.target.value)} />
                  </Field>
                </div>
                <Field label="Scope summary" required hint="What is in scope, in one or two sentences. This becomes the first section of the pre-engagement form.">
                  <Textarea value={form.scope.summary} onChange={(e) => updateScope('summary', e.target.value)} />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Sites" hint="Comma-separated">
                    <Input value={form.scope.sites.join(', ')} onChange={(e) => updateScope('sites', splitList(e.target.value))} placeholder="Lelystad, Leeuwarden" />
                  </Field>
                  <Field label="Boundary / consolidation">
                    <NativeSelect value={form.scope.boundary} onChange={(e) => updateScope('boundary', e.target.value)}>
                      <option value="">Choose…</option>
                      <option>Operational control</option>
                      <option>Financial control</option>
                      <option>Equity share</option>
                      <option>Product system (cradle to gate)</option>
                      <option>Project boundary</option>
                    </NativeSelect>
                  </Field>
                  <Field label="Products" hint="For product footprints; comma-separated">
                    <Input value={form.scope.products.join(', ')} onChange={(e) => updateScope('products', splitList(e.target.value))} />
                  </Field>
                  <Field label="Interventions" hint="For decarb_units; comma-separated">
                    <Input value={form.scope.interventions.join(', ')} onChange={(e) => updateScope('interventions', splitList(e.target.value))} />
                  </Field>
                  {template?.assurance.applies ? (
                    <Field label="Level of assurance" required hint={`Template default: ${template.assurance.default}. Confirmed on the pre-engagement form and locked when you accept the agreement; materiality is set by VERIFASSUR from it.`}>
                      <NativeSelect value={form.levelOfAssurance} onChange={(e) => update('levelOfAssurance', e.target.value as LevelOfAssurance)}>
                        <option value="limited">Limited assurance</option>
                        <option value="reasonable">Reasonable assurance</option>
                      </NativeSelect>
                    </Field>
                  ) : (
                    <div>
                      <div className="text-fg mb-1 block text-sm font-medium">Level of assurance</div>
                      <div className="flex h-9 items-center">
                        <AssuranceBadge level="not_applicable" />
                      </div>
                      <p className="text-fg-subtle text-xs">A validation gives a positive or negative conclusion, not a level of assurance.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-4">
                <p className="text-fg-muted text-sm">Attach what you already have (previous reports, inventory workbooks, project documents). Required documents are requested per step once the engagement starts.</p>
                <Button variant="secondary" onClick={() => setUpload(true)}>
                  <Upload /> Add attachment
                </Button>
                {docs.data?.length ? (
                  <ul className="divide-border border-border divide-y rounded-md border">
                    {docs.data.map((d) => (
                      <li key={d.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                        <FileText className="text-fg-subtle size-4" />
                        <span className="flex-1 truncate">{d.current?.filename}</span>
                        <span className="text-fg-subtle text-xs">{d.current ? fmtBytes(d.current.size_bytes) : ''}</span>
                        <Button variant="ghost" size="icon" aria-label="Remove" onClick={() => d.current && removeDoc.mutate(d.current.id)}>
                          <Trash2 />
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-fg-subtle text-xs">No attachments yet. This step is optional.</p>
                )}
              </div>
            ) : null}

            {step === 4 ? (
              <div className="space-y-4">
                <h3 className="text-fg text-sm font-semibold">Pre-engagement form (generated)</h3>
                <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[180px_1fr]">
                  <Row k="Client" v={me.org.name} />
                  <Row k="Project" v={project?.name ?? '—'} />
                  <Row k="Service type" v={form.serviceType ? SERVICE_TYPE_LABELS[form.serviceType] : '—'} />
                  <Row k="Standard" v={template?.standard ?? '—'} />
                  <Row k="Engagement" v={form.name} />
                  <Row k="Period" v={`${fmtDate(form.periodStart)} – ${fmtDate(form.periodEnd)}`} />
                  <Row k="Target opinion date" v={form.targetOpinionDate ? fmtDate(form.targetOpinionDate) : 'Not set'} />
                  <Row k="Scope" v={form.scope.summary} />
                  <Row k="Sites" v={form.scope.sites.join(', ') || '—'} />
                  <Row k="Boundary" v={form.scope.boundary || '—'} />
                  <Row k="Products" v={form.scope.products.join(', ') || '—'} />
                  <Row k="Interventions" v={form.scope.interventions.join(', ') || '—'} />
                  <Row k="Level of assurance" v={LEVEL_OF_ASSURANCE_LABELS[form.levelOfAssurance]} />
                  <Row k="Attachments" v={`${docs.data?.length ?? 0}`} />
                  <Row k="Contact" v={`${me.user.name} (${me.user.email})`} />
                </dl>
                <label className="flex items-start gap-2 text-sm">
                  <Checkbox checked={confirm} onCheckedChange={(v) => setConfirm(v === true)} className="mt-0.5" />
                  <span>I confirm the information is accurate and that {me.org.name} requests VERIFASSUR to assess this engagement for technical scope and impartiality.</span>
                </label>
              </div>
            ) : null}

            <div className="border-border mt-6 flex items-center justify-between border-t pt-4">
              <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
                <ArrowLeft /> Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button onClick={next} disabled={!canNext} loading={ensureDraft.isPending}>
                  Next <ArrowRight />
                </Button>
              ) : (
                <Button onClick={() => submit.mutate()} disabled={!canNext} loading={submit.isPending}>
                  <Send /> Submit request
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <aside className="space-y-4">
          <Card>
            <CardHeader title="What happens next" />
            <CardContent>
              <ol className="text-fg-muted list-decimal space-y-1.5 pl-4 text-sm">
                <li>VERIFASSUR triages the request and confirms technical scope and impartiality.</li>
                <li>A team is nominated; each member declares conflicts of interest.</li>
                <li>You receive a quote and accept the service agreement in the platform.</li>
                <li>The engagement runs through planning and execution with one clear next action at every moment.</li>
              </ol>
            </CardContent>
          </Card>
          {template ? (
            <Card>
              <CardHeader title="Documents this engagement will ask for" description={template.standard} />
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {template.phases
                    .flatMap((p) => p.steps)
                    .flatMap((s) => s.slots)
                    .filter((s) => s.uploader_party === 'client')
                    .map((s) => (
                      <li key={s.key} className="flex items-center gap-2">
                        <FileText className="text-fg-subtle size-3.5 shrink-0" />
                        <span className="flex-1">{s.name}</span>
                        {s.required ? <Badge tone="danger">Required</Badge> : <Badge tone="outline">Optional</Badge>}
                      </li>
                    ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </aside>
      </div>
      <NewProjectDialog open={newProject} onOpenChange={setNewProject} />
      <UploadDialog open={upload} onOpenChange={setUpload} serviceId={serviceId} category="supporting" title="Request attachment" />
    </>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt className="text-fg-muted">{k}</dt>
      <dd className="text-fg">{v || '—'}</dd>
    </>
  )
}

function splitList(s: string): string[] {
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
}

function toDraftInput(f: FormState) {
  return { projectId: f.projectId, serviceType: f.serviceType as ServiceType, name: f.name, periodStart: f.periodStart, periodEnd: f.periodEnd, scope: f.scope, targetOpinionDate: f.targetOpinionDate || null, levelOfAssurance: f.levelOfAssurance }
}
