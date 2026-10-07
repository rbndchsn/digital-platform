/** Product emission factors: list, editor, history, submit, verified value (PRD FR-46, FR-47; v0.3 FR-82, FR-83). */
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { BadgeCheck, FileSpreadsheet, Lock, Pencil, Plus, Send } from 'lucide-react'
import { useState } from 'react'
import { records } from '@/api'
import type { EmissionFactorView } from '@/api/records'
import type { EfBoundary, EfMethod } from '@/domain/enums'
import { AssuranceBadge, AssuranceHistoryButton, recordAssuranceState } from '@/components/assurance-badge'
import { DeclaredVerifiedPair } from '@/components/declared-verified'
import { InvolvedNote } from '@/components/eligibility-notice'
import { EmptyState } from '@/components/empty-state'
import { EvidenceChips } from '@/components/evidence-chips'
import { PageHeader } from '@/components/page-header'
import { StatusChip } from '@/components/status-chip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Field, Input, NativeSelect, Textarea } from '@/components/ui/input'
import { Alert, Skeleton } from '@/components/ui/misc'
import { SubmitForVerificationDialog } from '@/features/records/submit-dialog'
import { useMe } from '@/lib/auth'
import { fmtNumber, titleCase } from '@/lib/format'
import { useAppMutation } from '@/lib/query'

export const Route = createFileRoute('/_app/records/emission-factors')({
  component: EmissionFactors,
})

const IMMUTABLE = ['verified', 'superseded', 'withdrawn']

function EmissionFactors() {
  const me = useMe()
  const q = useQuery({ queryKey: ['emissionFactors'], queryFn: records.listEmissionFactors })
  const [edit, setEdit] = useState<EmissionFactorView | 'new' | null>(null)
  const [submit, setSubmit] = useState<EmissionFactorView | null>(null)
  const [verify, setVerify] = useState<EmissionFactorView | null>(null)
  const submitM = useAppMutation(({ id, target }: { id: string; target: Parameters<typeof records.submitEmissionFactor>[1] }) => records.submitEmissionFactor(id, target), { successMessage: 'Emission factor submitted for verification.' })
  const canEdit = me.org.type === 'client' && me.role !== 'client_viewer'
  // Verifier roles and the manager (PRD FR-77) enter verified values before issuance; the platform administrator never does.
  const canVerify = me.org.type === 'verifier' && !me.isAdmin
  const withdrawn = (q.data ?? []).filter((e) => e.assurance_status === 'withdrawn').length
  return (
    <>
      <PageHeader title="Product emission factors" description="One factor per product, functional unit, boundary and year. Verified factors carry the level of assurance and the assurance reference of the opinion that verified them; a withdrawn opinion leaves the factor declared-only." actions={canEdit ? <Button onClick={() => setEdit('new')}><Plus /> New factor</Button> : null} />
      {withdrawn ? (
        <Alert tone="danger" className="mb-5" title={`${withdrawn} factor${withdrawn === 1 ? '' : 's'} with assurance withdrawn`}>
          The statement these factors relied on was withdrawn. Do not use them in external reporting as verified figures; the former verified values stay readable in the assurance history.
        </Alert>
      ) : null}
      {!q.data ? (
        <Skeleton className="h-64" />
      ) : q.data.length === 0 ? (
        <EmptyState icon={<FileSpreadsheet />} title="No product emission factor yet" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {q.data.map((ef) => {
            const immutable = IMMUTABLE.includes(ef.status)
            return (
              <Card key={ef.id} className="p-5" data-testid={`ef-${ef.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-fg text-base font-semibold">{ef.product_name}</h3>
                      <StatusChip status={ef.status} />
                      <AssuranceBadge level={ef.level_of_assurance} status={recordAssuranceState(ef)} />
                    </div>
                    <div className="text-fg-subtle text-xs">
                      {ef.product_code ? `${ef.product_code} · ` : ''}
                      {ef.year} · {ef.functional_unit} · {titleCase(ef.boundary)} · {ef.method.toUpperCase().replace('GHGP_PRODUCT', 'GHG Protocol')}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {canEdit && ef.status === 'draft' ? (
                      <>
                        <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setEdit(ef)}>
                          <Pencil />
                        </Button>
                        <Button size="sm" onClick={() => setSubmit(ef)}>
                          <Send /> Submit
                        </Button>
                      </>
                    ) : null}
                    {canVerify && (ef.status === 'submitted' || ef.status === 'under_verification') ? (
                      <Button size="sm" variant="secondary" onClick={() => setVerify(ef)}>
                        <BadgeCheck /> Verified value
                      </Button>
                    ) : null}
                    {canVerify && immutable ? (
                      <Button size="sm" variant="secondary" disabled title="Verified figures of an issued opinion are immutable (issued_immutable)">
                        <Lock /> Verified value
                      </Button>
                    ) : null}
                  </div>
                </div>
                <DeclaredVerifiedPair declared={ef.declared_value} verified={ef.assurance_status === 'withdrawn' ? null : ef.verified_value} unit={ef.value_unit} decimals={2} className="mt-3" verifiedLabel={ef.assurance_status === 'withdrawn' ? 'Verified (withdrawn)' : 'Verified'} />
                {ef.assurance_status === 'withdrawn' && ef.verified_value != null ? <p className="text-fg-subtle mt-1 text-xs">Former verified value {fmtNumber(ef.verified_value, 2)} {ef.value_unit}, no longer assured.</p> : null}
                <EvidenceChips evidence={ef.evidence} entityType="emission_factor" entityId={ef.id} canEdit={canEdit && ef.status !== 'verified'} serviceId={ef.service_id} className="mt-2" compact />
                {ef.notes ? <p className="text-fg-muted mt-2 text-xs">{ef.notes}</p> : null}
                {canVerify ? <InvolvedNote serviceId={ef.service_id} immutable={immutable} className="mt-2" /> : null}
                <div className="text-fg-subtle mt-3 flex flex-wrap items-center gap-2 text-xs">
                  {ef.history.length > 1 ? (
                    <span>
                      History: {ef.history.map((h) => `${h.year} ${h.verified != null && h.assuranceStatus !== 'withdrawn' ? fmtNumber(h.verified, 2) : `${fmtNumber(h.declared, 2)}*`}${h.assuranceStatus === 'withdrawn' ? ' (withdrawn)' : h.assuranceStatus === 'superseded' ? ' (superseded)' : ''}`).join(' → ')}
                    </span>
                  ) : null}
                  {ef.statementCode ? (
                    <Link to="/verify/$code" params={{ code: ef.statementCode }} className="text-primary hover:underline">
                      Statement {ef.statementCode}
                    </Link>
                  ) : ef.serviceReference ? (
                    <Badge tone="outline">{ef.serviceReference}</Badge>
                  ) : null}
                  <AssuranceHistoryButton history={ef.assurance.history} className="ml-auto" />
                </div>
              </Card>
            )
          })}
        </div>
      )}
      {edit ? <EfDialog ef={edit === 'new' ? null : edit} onClose={() => setEdit(null)} /> : null}
      {verify ? <VerifyEfDialog ef={verify} onClose={() => setVerify(null)} /> : null}
      {submit ? <SubmitForVerificationDialog open onOpenChange={(o) => !o && setSubmit(null)} serviceType="iso14067_product_verification" defaultName={`Product carbon footprint ${submit.year} — ${submit.product_name}`} onSubmit={(target) => submitM.mutateAsync({ id: submit.id, target })} pending={submitM.isPending} /> : null}
    </>
  )
}

/** Verifier (or manager, PRD FR-77) records the verified value of a factor: a verified-value edit that joins the involved set and may propose a misstatement. */
function VerifyEfDialog({ ef, onClose }: { ef: EmissionFactorView; onClose: () => void }) {
  const [value, setValue] = useState(String(ef.verified_value ?? ef.declared_value))
  const [comment, setComment] = useState('')
  const m = useAppMutation(() => records.setVerifiedEmissionFactor(ef.id, Number(value), comment || undefined), {
    successMessage: (r) => `Verified value recorded.${Number(value) !== ef.declared_value ? ' A misstatement was proposed to the register.' : ''}${r.iterationReturnedToIr ? ' The open iteration went back to independent review.' : ''}${r.involvedSetJoined ? ' You are now in the involved set of this service.' : ''}`,
    onSuccess: onClose,
  })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Verified value" description={`${ef.product_name} ${ef.year} · declared ${fmtNumber(ef.declared_value, 2)} ${ef.value_unit}`} size="sm">
        <Field label={`Verified value (${ef.value_unit})`} required>
          <Input type="number" step="any" value={value} onChange={(e) => setValue(e.target.value)} />
        </Field>
        <Field label="Comment (shown to the client)" className="mt-3">
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} />
        </Field>
        <Alert tone="info" className="mt-3">
          Entering a verified value is verification work: you join the involved set and cannot take the final decision on this service (PRD FR-79). A difference from the declared value proposes a misstatement.
        </Alert>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => m.mutate()} loading={m.isPending} disabled={value === ''}>
            Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EfDialog({ ef, onClose }: { ef: EmissionFactorView | null; onClose: () => void }) {
  const [form, setForm] = useState({ product_name: ef?.product_name ?? '', product_code: ef?.product_code ?? '', functional_unit: ef?.functional_unit ?? 'per kg', boundary: (ef?.boundary ?? 'cradle_to_gate') as EfBoundary, method: (ef?.method ?? 'iso14067') as EfMethod, year: String(ef?.year ?? new Date().getUTCFullYear() - 1), declared_value: String(ef?.declared_value ?? ''), value_unit: ef?.value_unit ?? 'kgCO2e/kg', notes: ef?.notes ?? '' })
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const m = useAppMutation(() => records.upsertEmissionFactor({ product_name: form.product_name, product_code: form.product_code || null, functional_unit: form.functional_unit, boundary: form.boundary, method: form.method, year: Number(form.year), declared_value: Number(form.declared_value), value_unit: form.value_unit, notes: form.notes || null }, ef?.id), { successMessage: ef ? 'Factor updated.' : 'Factor created.', onSuccess: onClose })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={ef ? 'Edit product emission factor' : 'New product emission factor'} size="lg">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Product" required className="sm:col-span-2">
            <Input value={form.product_name} onChange={set('product_name')} />
          </Field>
          <Field label="Product code">
            <Input value={form.product_code} onChange={set('product_code')} />
          </Field>
          <Field label="Reference year" required>
            <Input type="number" value={form.year} onChange={set('year')} />
          </Field>
          <Field label="Functional unit" required>
            <Input value={form.functional_unit} onChange={set('functional_unit')} placeholder="per kg, per litre, per unit" />
          </Field>
          <Field label="Value unit" required>
            <NativeSelect value={form.value_unit} onChange={set('value_unit')}>
              {['kgCO2e/kg', 'kgCO2e/L', 'kgCO2e/unit', 'tCO2e/t', 'kgCO2e/kWh'].map((u) => (
                <option key={u}>{u}</option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Declared value" required>
            <Input type="number" step="any" min={0} value={form.declared_value} onChange={set('declared_value')} />
          </Field>
          <Field label="System boundary">
            <NativeSelect value={form.boundary} onChange={set('boundary')}>
              <option value="cradle_to_gate">Cradle to gate</option>
              <option value="cradle_to_grave">Cradle to grave</option>
              <option value="gate_to_gate">Gate to gate</option>
            </NativeSelect>
          </Field>
          <Field label="Method">
            <NativeSelect value={form.method} onChange={set('method')}>
              <option value="iso14067">ISO 14067</option>
              <option value="pef">PEF</option>
              <option value="ghgp_product">GHG Protocol Product Standard</option>
              <option value="other">Other</option>
            </NativeSelect>
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <Textarea value={form.notes} onChange={set('notes')} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => m.mutate()} loading={m.isPending} disabled={!form.product_name.trim() || !(Number(form.declared_value) >= 0) || !form.year}>
            {ef ? 'Save' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
