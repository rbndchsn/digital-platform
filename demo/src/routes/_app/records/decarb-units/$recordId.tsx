/** decarb_unit record editor (PRD FR-48..FR-52): baseline/project profiles, computed panel with diagnostics, what-if, submit. */
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { AlertTriangle, ArrowRight, BadgeCheck, Calculator, Pencil, Send } from 'lucide-react'
import { useState } from 'react'
import { records } from '@/api'
import type { DecarbView, ProfileInputDto, ProfileView } from '@/api/records'
import type { GwpSet, ProfileKind } from '@/domain/enums'
import type { GasEntry } from '@/domain/schemas'
import { GOOD_UNIT_KEYS } from '@/domain/units'
import { DeclaredVerifiedPair } from '@/components/declared-verified'
import { EvidenceChips } from '@/components/evidence-chips'
import { PageHeader } from '@/components/page-header'
import { StatusChip } from '@/components/status-chip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Field, Input, NativeSelect, Textarea } from '@/components/ui/input'
import { Alert, Skeleton } from '@/components/ui/misc'
import { GasEditor } from '@/features/records/gas-editor'
import { SubmitForVerificationDialog } from '@/features/records/submit-dialog'
import { cn } from '@/lib/cn'
import { useMe } from '@/lib/auth'
import { describeError, useAppMutation } from '@/lib/query'
import { fmtDate, fmtNumber, titleCase } from '@/lib/format'

export const Route = createFileRoute('/_app/records/decarb-units/$recordId')({
  component: RecordEditor,
})

function RecordEditor() {
  const { recordId } = Route.useParams()
  const me = useMe()
  const q = useQuery({ queryKey: ['decarb', recordId], queryFn: () => records.getDecarbRecord(recordId) })
  const [editProfile, setEditProfile] = useState<ProfileKind | null>(null)
  const [submit, setSubmit] = useState(false)
  const [verify, setVerify] = useState(false)
  const [justification, setJustification] = useState<string | null>(null)
  const submitM = useAppMutation((t: Parameters<typeof records.submitDecarbRecord>[1]) => records.submitDecarbRecord(recordId, t), { successMessage: 'Record submitted for verification.' })
  const saveJust = useAppMutation((j: string) => records.upsertDecarbRecord({ good: q.data!.good, supply_shed_json: q.data!.supply_shed_json, supplier_name: q.data!.supplier_name, intervention_json: q.data!.intervention_json, baseline_method: q.data!.baseline_method, attributed_volume: q.data!.attributed_volume, volume_unit: q.data!.volume_unit, period_start: q.data!.period_start, period_end: q.data!.period_end, justification: j }, recordId), { successMessage: 'Justification saved.' })
  if (!q.data) return <Skeleton className="h-64" />
  const d = q.data
  const c = d.computed
  const isClient = me.org.type === 'client'
  const canEdit = isClient && me.role !== 'client_viewer' && d.status === 'draft'
  // Verifier roles and the manager (PRD FR-77) enter verified units; the platform administrator never does.
  const canVerify = !isClient && !me.isAdmin && (d.status === 'submitted' || d.status === 'under_verification') && Boolean(c)
  const blockers: string[] = []
  if (!d.baseline) blockers.push('Enter the baseline emission profile.')
  if (!d.project) blockers.push('Enter the project emission profile.')
  if (d.computeError) blockers.push(d.computeError)
  if (c && c.reduction_units < 0 && !(justification ?? d.justification)?.trim()) blockers.push('Reduction units are negative; add a justification.')
  return (
    <>
      <PageHeader
        crumbs={[{ label: 'decarb_units', to: '/records/decarb-units' }, { label: `${d.good} ${d.period_end.slice(0, 4)}` }]}
        title={`${d.good} · ${d.period_start.slice(0, 4)}`}
        description={`${d.supply_shed_json.good}${d.supply_shed_json.variety ? `, ${d.supply_shed_json.variety}` : ''}, ${d.supply_shed_json.country}${d.supply_shed_json.region ? ` (${d.supply_shed_json.region})` : ''} · ${d.supplier_name ?? ''} · ${d.intervention_json.type} (${d.intervention_json.activities.join(', ')}) · layer ${titleCase(d.intervention_json.layer.replace(/^(\d[a-z]?)_/, '$1 '))} · since ${fmtDate(d.intervention_json.start_date)}`}
        meta={
          <>
            <StatusChip status={d.status} />
            <Badge tone="outline">Baseline: {d.baseline_method}</Badge>
            <Badge tone="outline">
              Period {fmtDate(d.period_start)} – {fmtDate(d.period_end)}
            </Badge>
            {d.serviceReference ? (
              <Link to="/engagements/$serviceId" params={{ serviceId: d.service_id! }} className="text-primary text-xs font-semibold hover:underline">
                Engagement {d.serviceReference}
              </Link>
            ) : null}
            {d.statementCode ? (
              <Link to="/verify/$code" params={{ code: d.statementCode }} className="text-primary text-xs font-semibold hover:underline">
                Statement {d.statementCode}
              </Link>
            ) : null}
          </>
        }
        actions={
          <>
            {canEdit ? (
              <Button onClick={() => setSubmit(true)}>
                <Send /> Submit for verification
              </Button>
            ) : null}
            {canVerify ? (
              <Button variant="secondary" onClick={() => setVerify(true)}>
                <BadgeCheck /> Verified values
              </Button>
            ) : null}
          </>
        }
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <ProfileCard kind="baseline" profile={d.baseline} canEdit={canEdit} onEdit={() => setEditProfile('baseline')} serviceId={d.service_id} />
        <ProfileCard kind="project" profile={d.project} canEdit={canEdit} onEdit={() => setEditProfile('project')} serviceId={d.service_id} />
      </div>

      <Card className="mt-5">
        <CardHeader title={<span className="inline-flex items-center gap-2"><Calculator className="size-4" /> Computed decarb_units</span>} description={`Attributed volume ${fmtNumber(d.attributed_volume)} ${d.volume_unit} — the volume purchased by ${me.org.name}, not the supplier's total output.`} />
        <CardContent>
          {d.computeError ? (
            <Alert tone="danger" icon={<AlertTriangle />} title="Cannot compute">
              {d.computeError}
            </Alert>
          ) : !c ? (
            <p className="text-fg-muted text-sm">Enter both profiles to compute.</p>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <Stat label="Decarb factor (gross)" value={`${fmtNumber(c.decarb_factor_gross, 3)} ${c.factor_unit}`} sub={`${fmtNumber(c.baseline.ef_gross, 3)} − ${fmtNumber(c.project.ef_gross, 3)}`} />
                <Stat label="Reduction decarb_units" value={`${fmtNumber(c.reduction_units)} tCO2e`} sub={`${fmtNumber(c.decarb_factor_gross, 3)} × ${fmtNumber(c.attributed_volume_base)} ${c.base_unit}`} highlight={c.reduction_units >= 0 ? 'success' : 'danger'} />
                <Stat label="Removal decarb_units" value={`${fmtNumber(c.removal_units)} tCO2e`} sub={`${fmtNumber(c.decarb_factor_removal, 3)} × ${fmtNumber(c.attributed_volume_base)} ${c.base_unit}`} highlight={c.removal_units > 0 ? 'success' : undefined} />
                <Stat label="Biogenic CO2 delta" value={`${fmtNumber(c.biogenic_delta_tco2e)} tCO2e`} sub="reported only, not counted" />
              </div>
              {c.diagnostics.length ? (
                <div className="mt-3 space-y-2">
                  {c.diagnostics.map((x) => (
                    <Alert key={x.code} tone={x.code === 'negative_reduction' ? 'danger' : 'warning'} icon={<AlertTriangle />} title={titleCase(x.code)}>
                      {x.message}
                    </Alert>
                  ))}
                </div>
              ) : null}
              {(d.status !== 'draft' || d.verified_reduction_units != null) && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="text-fg-subtle mb-1 text-xs font-semibold uppercase tracking-wide">Reduction units</div>
                    <DeclaredVerifiedPair declared={d.declared_reduction_units} verified={d.verified_reduction_units} unit="tCO2e" />
                  </div>
                  <div>
                    <div className="text-fg-subtle mb-1 text-xs font-semibold uppercase tracking-wide">Removal units</div>
                    <DeclaredVerifiedPair declared={d.declared_removal_units} verified={d.verified_removal_units} unit="tCO2e" />
                  </div>
                </div>
              )}
            </>
          )}
          {canEdit && c && c.reduction_units < 0 ? (
            <Field label="Justification (required for negative reductions)" className="mt-4">
              <Textarea value={justification ?? d.justification ?? ''} onChange={(e) => setJustification(e.target.value)} onBlur={() => justification != null && saveJust.mutate(justification)} />
            </Field>
          ) : null}
          <EvidenceChips evidence={d.evidence} entityType="decarb_unit_record" entityId={d.id} canEdit={isClient && me.role !== 'client_viewer' && d.status !== 'verified'} serviceId={d.service_id} className="mt-4" />
        </CardContent>
      </Card>

      {d.baseline && d.project ? <WhatIf d={d} /> : null}

      {editProfile ? <ProfileDialog kind={editProfile} record={d} existing={editProfile === 'baseline' ? d.baseline : d.project} onClose={() => setEditProfile(null)} /> : null}
      {verify && c ? <VerifyDecarbDialog d={d} computedReduction={c.reduction_units} computedRemoval={c.removal_units} onClose={() => setVerify(false)} /> : null}
      <SubmitForVerificationDialog open={submit} onOpenChange={setSubmit} serviceType="decarb_units_verification" defaultName={`${d.good} ${d.period_start.slice(0, 4)} — decarb_units verification`} onSubmit={(t) => submitM.mutateAsync(t)} pending={submitM.isPending} blockers={blockers} />
    </>
  )
}

/** Verifier records the verified units (PRD FR-43-style entry for decarb records; manager too, FR-77). */
function VerifyDecarbDialog({ d, computedReduction, computedRemoval, onClose }: { d: DecarbView; computedReduction: number; computedRemoval: number; onClose: () => void }) {
  const [reduction, setReduction] = useState(String(d.verified_reduction_units ?? computedReduction))
  const [removal, setRemoval] = useState(String(d.verified_removal_units ?? computedRemoval))
  const m = useAppMutation(() => records.setVerifiedDecarb(d.id, { reduction: Number(reduction), removal: Number(removal) }), { successMessage: 'Verified values recorded.', onSuccess: onClose })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Verified decarb_units" description={`Declared ${fmtNumber(d.declared_reduction_units)} reduction and ${fmtNumber(d.declared_removal_units)} removal units. Verified values are written back to the record and shown side by side.`} size="sm">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Verified reduction units (tCO2e)" required>
            <Input type="number" step="any" value={reduction} onChange={(e) => setReduction(e.target.value)} />
          </Field>
          <Field label="Verified removal units (tCO2e)" required>
            <Input type="number" step="any" value={removal} onChange={(e) => setRemoval(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => m.mutate()} loading={m.isPending} disabled={reduction === '' || removal === ''}>
            Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Stat({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: 'success' | 'danger' }) {
  return (
    <div className="bg-surface-muted/60 rounded-md px-3 py-2">
      <div className="text-fg-subtle text-xs">{label}</div>
      <div className={cn('text-fg text-lg font-semibold tabular-nums', highlight === 'success' && 'text-success', highlight === 'danger' && 'text-danger')}>{value}</div>
      {sub ? <div className="text-fg-subtle text-[11px]">{sub}</div> : null}
    </div>
  )
}

function ProfileCard({ kind, profile, canEdit, onEdit, serviceId }: { kind: ProfileKind; profile: ProfileView | null; canEdit: boolean; onEdit: () => void; serviceId: string | null }) {
  return (
    <Card>
      <CardHeader title={kind === 'baseline' ? 'Baseline emission profile' : 'Project emission profile'} description={kind === 'baseline' ? 'What the supplier was doing before the intervention (or the counterfactual). Logged, not defined, by the platform.' : 'Measured outcome during the project period.'} actions={canEdit ? <Button size="sm" variant="secondary" onClick={onEdit}><Pencil /> {profile ? 'Edit' : 'Enter'}</Button> : null} />
      <CardContent>
        {!profile ? (
          <p className="text-fg-muted text-sm">Not entered yet.</p>
        ) : (
          <div className="space-y-3">
            <div className="text-fg-subtle text-xs">
              {fmtDate(profile.period_start)} – {fmtDate(profile.period_end)} · {profile.boundary} · GWP {profile.gwp_set}
            </div>
            <GasEditor set={profile.gwp_set} gases={profile.gases.map((g) => ({ gas: g.gas, gas_detail: g.gas_detail, tonnes_gas: g.tonnes_gas, custom_gwp: g.custom_gwp }))} onChange={() => undefined} readOnly />
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
              <Kv k="Gross" v={`${fmtNumber(profile.gross_tco2e)} tCO2e`} />
              <Kv k="Biogenic CO2 (separate)" v={`${fmtNumber(profile.biogenic_co2_t)} t`} />
              <Kv k="Removals (separate)" v={`${fmtNumber(profile.removals_tco2e)} tCO2e`} />
              <Kv k="Reference volume" v={`${fmtNumber(profile.reference_volume)} ${profile.volume_unit}`} />
              <Kv k="EF gross" v={`${fmtNumber(profile.ef_gross, 3)} ${profile.ef_unit}`} strong />
              <Kv k="EF removal" v={`${fmtNumber(profile.ef_removal, 3)} ${profile.ef_unit}`} />
            </dl>
            <EvidenceChips evidence={profile.evidence} entityType="emission_profile" entityId={profile.id} canEdit={canEdit} serviceId={serviceId} compact />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Kv({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div>
      <dt className="text-fg-subtle text-[11px]">{k}</dt>
      <dd className={cn('text-fg tabular-nums', strong && 'font-semibold')}>{v}</dd>
    </div>
  )
}

function ProfileDialog({ kind, record, existing, onClose }: { kind: ProfileKind; record: DecarbView; existing: ProfileView | null; onClose: () => void }) {
  const prevYear = (s: string) => `${Number(s.slice(0, 4)) - 1}${s.slice(4)}`
  const [period, setPeriod] = useState<[string, string]>(existing ? [existing.period_start, existing.period_end] : kind === 'baseline' ? [prevYear(record.period_start), prevYear(record.period_end)] : [record.period_start, record.period_end])
  const [boundary, setBoundary] = useState(existing?.boundary ?? `${record.good} — farm gate, ${record.supply_shed_json.country}`)
  const [gwp, setGwp] = useState<GwpSet>(existing?.gwp_set ?? 'AR6')
  const [gases, setGases] = useState<GasEntry[]>(existing ? existing.gases.map((g) => ({ gas: g.gas, gas_detail: g.gas_detail, tonnes_gas: g.tonnes_gas, custom_gwp: g.custom_gwp })) : [{ gas: 'CO2', gas_detail: null, tonnes_gas: 0, custom_gwp: null }, { gas: 'CH4', gas_detail: null, tonnes_gas: 0, custom_gwp: null }, { gas: 'N2O', gas_detail: null, tonnes_gas: 0, custom_gwp: null }])
  const [biogenic, setBiogenic] = useState(String(existing?.biogenic_co2_t ?? 0))
  const [removals, setRemovals] = useState(String(existing?.removals_tco2e ?? 0))
  const [refVolume, setRefVolume] = useState(String(existing?.reference_volume ?? ''))
  const [unit, setUnit] = useState(existing?.volume_unit ?? record.volume_unit)
  const input: ProfileInputDto = { period_start: period[0], period_end: period[1], boundary, gwp_set: gwp, gases, biogenic_co2_t: Number(biogenic) || 0, removals_tco2e: Number(removals) || 0, reference_volume: Number(refVolume), volume_unit: unit, notes: null }
  const m = useAppMutation(() => records.setProfile(record.id, kind, input), { successMessage: `${kind === 'baseline' ? 'Baseline' : 'Project'} profile saved.`, onSuccess: onClose })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={kind === 'baseline' ? 'Baseline emission profile' : 'Project emission profile'} description="Per gas, in tonnes. The reference volume is the supplier output the emissions relate to; the EF is derived from it." size="xl">
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Period start" required>
            <Input type="date" value={period[0]} onChange={(e) => setPeriod([e.target.value, period[1]])} />
          </Field>
          <Field label="Period end" required>
            <Input type="date" value={period[1]} onChange={(e) => setPeriod([period[0], e.target.value])} />
          </Field>
          <Field label="Boundary" required className="sm:col-span-2">
            <Input value={boundary} onChange={(e) => setBoundary(e.target.value)} />
          </Field>
          <Field label="GWP set">
            <NativeSelect value={gwp} onChange={(e) => setGwp(e.target.value as GwpSet)}>
              <option value="AR6">AR6</option>
              <option value="AR5">AR5</option>
            </NativeSelect>
          </Field>
          <Field label="Reference volume" required>
            <Input type="number" min={0} step="any" value={refVolume} onChange={(e) => setRefVolume(e.target.value)} />
          </Field>
          <Field label="Volume unit">
            <NativeSelect value={unit} onChange={(e) => setUnit(e.target.value)}>
              {GOOD_UNIT_KEYS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <div className="mt-4">
          <GasEditor set={gwp} gases={gases} onChange={setGases} />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Biogenic CO2 (t, reported separately)">
            <Input type="number" min={0} step="any" value={biogenic} onChange={(e) => setBiogenic(e.target.value)} />
          </Field>
          <Field label="Removals (tCO2e, reported separately)">
            <Input type="number" min={0} step="any" value={removals} onChange={(e) => setRemovals(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => m.mutate()} loading={m.isPending} disabled={!(Number(refVolume) > 0) || gases.length === 0 || !boundary.trim()}>
            Save profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** What-if panel: recompute with a different attributed volume or unit without saving (shows the unit-mismatch error, plan ch. 7). */
function WhatIf({ d }: { d: DecarbView }) {
  const [volume, setVolume] = useState(String(d.attributed_volume))
  const [unit, setUnit] = useState(d.volume_unit)
  const [result, setResult] = useState<{ units: number; factor: number; factorUnit: string } | { error: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const toInput = (p: ProfileView): ProfileInputDto => ({ period_start: p.period_start, period_end: p.period_end, boundary: p.boundary, gwp_set: p.gwp_set, gases: p.gases.map((g) => ({ gas: g.gas, gas_detail: g.gas_detail, tonnes_gas: g.tonnes_gas, custom_gwp: g.custom_gwp })), biogenic_co2_t: p.biogenic_co2_t, removals_tco2e: p.removals_tco2e, reference_volume: p.reference_volume, volume_unit: p.volume_unit, notes: null })
  async function run() {
    setBusy(true)
    try {
      const r = await records.previewDecarb({ baseline: toInput(d.baseline!), project: toInput(d.project!), attributed_volume: Number(volume), volume_unit: unit })
      setResult({ units: r.reduction_units, factor: r.decarb_factor_gross, factorUnit: r.factor_unit })
    } catch (e) {
      setResult({ error: describeError(e) })
    } finally {
      setBusy(false)
    }
  }
  return (
    <Card className="mt-5">
      <CardHeader title="What if…" description="Recompute on a different attributed volume or unit without changing the record. Units are explicit: a mismatch is refused, never silently converted." />
      <CardContent>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Attributed volume">
            <Input type="number" min={0} step="any" value={volume} onChange={(e) => setVolume(e.target.value)} className="w-44" />
          </Field>
          <Field label="Unit">
            <NativeSelect value={unit} onChange={(e) => setUnit(e.target.value)} className="w-28">
              {GOOD_UNIT_KEYS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Button variant="secondary" onClick={run} loading={busy}>
            <ArrowRight /> Recompute
          </Button>
          {result ? (
            'error' in result ? (
              <Alert tone="danger" icon={<AlertTriangle />} className="flex-1" title="Unit mismatch">
                {result.error}
              </Alert>
            ) : (
              <div className="bg-success-soft text-success flex-1 rounded-md px-3 py-2 text-sm">
                <span className="font-semibold tabular-nums">{fmtNumber(result.units)} tCO2e</span> reduction units at {fmtNumber(result.factor, 3)} {result.factorUnit}
              </div>
            )
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
