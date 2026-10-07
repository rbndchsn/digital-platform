/**
 * Materiality panel, aggregation panel, inconsistency warning and misstatement register (PRD v0.3 §6.18, FR-84–FR-87,
 * §7.2). The platform computes and displays; a named person sets the threshold, confirms each misstatement and
 * decides the opinion type.
 */
import { Link } from '@tanstack/react-router'
import { AlertTriangle, BadgeCheck, Pencil, Plus, Scale } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { materiality } from '@/api'
import type { AggregationView, MaterialityView, MisstatementView } from '@/api/materiality'
import type { AssertionBase, MaterialityBasis, MisstatementDirection, MisstatementNature } from '@/domain/enums'
import { ASSERTION_BASES, ASSERTION_BASE_LABELS, LEVEL_OF_ASSURANCE_LABELS } from '@/domain/enums'
import type { AggregationSnapshot } from '@/domain/schemas'
import { AssuranceBadge } from '@/components/assurance-badge'
import { EmptyState } from '@/components/empty-state'
import { ReasonDialog } from '@/components/reason-dialog'
import { StatusChip } from '@/components/status-chip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Field, Input, NativeSelect, Textarea } from '@/components/ui/input'
import { Alert, Checkbox, Skeleton } from '@/components/ui/misc'
import { TBody, TD, TH, THead, TR, Table } from '@/components/ui/table'
import { cn } from '@/lib/cn'
import { fmtDateTime, fmtNumber } from '@/lib/format'
import { useAppMutation } from '@/lib/query'
import { useAggregation, useMateriality, useMisstatements, useServiceFindings } from '@/lib/service-hooks'
import type { useServicePermissions } from './permissions'

type Perms = ReturnType<typeof useServicePermissions>

function num(n: number | null | undefined, unit?: string) {
  if (n == null) return '—'
  return `${fmtNumber(n, Math.abs(n) < 10 ? 3 : 0)}${unit ? ` ${unit}` : ''}`
}

// ---------------------------------------------------------------- materiality panel (FR-84, D25)
export function MaterialityPanel({ serviceId, perms, className }: { serviceId: string; perms: Perms; className?: string }) {
  const q = useMateriality(serviceId)
  const [edit, setEdit] = useState(false)
  const approve = useAppMutation(() => materiality.approve(serviceId), { successMessage: 'Materiality approved. The IR and manager checklists show the setting.' })
  if (q.data === undefined) return <Skeleton className="h-40" />
  const m = q.data
  return (
    <Card className={className} data-testid="materiality-panel">
      <CardHeader
        title={
          <span className="inline-flex flex-wrap items-center gap-2">
            <Scale className="size-4" /> Materiality
            {m ? <StatusChip status={m.status} label={m.status === 'approved' ? 'Approved' : 'Draft'} /> : null}
          </span>
        }
        description="The yardstick the aggregated misstatements are measured against. The platform proposes the template default; a named person sets and approves it."
        actions={
          m ? (
            <>
              {perms.canSetMateriality ? (
                <Button size="sm" variant="secondary" onClick={() => setEdit(true)}>
                  <Pencil /> {m.status === 'approved' ? 'Change (reason)' : 'Set materiality'}
                </Button>
              ) : null}
              {perms.canApproveMateriality && m.status === 'draft' ? (
                <Button size="sm" onClick={() => approve.mutate()} loading={approve.isPending}>
                  <BadgeCheck /> Approve materiality
                </Button>
              ) : null}
            </>
          ) : null
        }
      />
      <CardContent>
        {!m ? (
          <p className="text-fg-muted text-sm">Materiality does not apply to this service type (validation: no level of assurance).</p>
        ) : (
          <>
            <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <Kv k="Level of assurance" v={<AssuranceBadge level={m.level_of_assurance} />} />
              <Kv k="Assertion base" v={ASSERTION_BASE_LABELS[m.assertion_base]} sub={m.assertion_declared_value != null ? `declared ${num(m.assertion_declared_value, m.assertion_unit)}` : 'declared value not yet available'} />
              <Kv k="Threshold" v={`${m.threshold_pct} %`} sub={m.threshold_abs != null ? `= ${num(m.threshold_abs, m.assertion_unit)}` : 'absolute value once the assertion is declared'} strong />
              <Kv k="Basis" v={m.basis === 'programme_rule' ? 'Programme rule' : 'Verifier judgement'} sub={m.basis_note ?? undefined} />
            </dl>
            {m.qualitative_json.length ? (
              <div className="mt-3">
                <div className="text-fg-subtle text-[11px] font-semibold uppercase tracking-wide">Qualitative considerations</div>
                <ul className="text-fg-muted mt-1 list-disc pl-4 text-sm">
                  {m.qualitative_json.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p className="text-fg-subtle mt-3 text-xs">
              {m.templateDefault ? `Template default: ${m.templateDefault.threshold_pct} % of ${ASSERTION_BASE_LABELS[m.templateDefault.assertion_base].toLowerCase()} (${m.templateDefault.basis === 'programme_rule' ? 'programme rule' : 'verifier judgement'}). ` : ''}
              {m.setByName ? `Set by ${m.setByName}. ` : 'Proposed by the platform from the template; not yet set by a person. '}
              {m.status === 'approved' ? `Approved by ${m.approvedByName} on ${fmtDateTime(m.approved_at)}.` : 'Awaiting manager approval (recorded next to the audit plan acceptance).'}
            </p>
          </>
        )}
      </CardContent>
      {edit && m ? <MaterialityDialog serviceId={serviceId} m={m} onClose={() => setEdit(false)} /> : null}
    </Card>
  )
}

function Kv({ k, v, sub, strong }: { k: string; v: ReactNode; sub?: string; strong?: boolean }) {
  return (
    <div>
      <dt className="text-fg-subtle text-xs">{k}</dt>
      <dd className={cn('text-fg', strong && 'text-lg font-semibold tabular-nums')}>{v}</dd>
      {sub ? <dd className="text-fg-subtle text-xs">{sub}</dd> : null}
    </div>
  )
}

function MaterialityDialog({ serviceId, m, onClose }: { serviceId: string; m: MaterialityView; onClose: () => void }) {
  const [base, setBase] = useState<AssertionBase>(m.assertion_base)
  const [pct, setPct] = useState(String(m.threshold_pct))
  const [basis, setBasis] = useState<MaterialityBasis>(m.basis)
  const [note, setNote] = useState(m.basis_note ?? '')
  const [qualitative, setQualitative] = useState(m.qualitative_json.join('\n'))
  const [reason, setReason] = useState('')
  const wasApproved = m.status === 'approved'
  const mut = useAppMutation(() => materiality.set(serviceId, { assertion_base: base, threshold_pct: Number(pct), basis, basis_note: note || null, qualitative: qualitative.split('\n').map((x) => x.trim()).filter(Boolean), reason: reason || undefined }), {
    successMessage: wasApproved ? 'Materiality changed and returned to draft; a manager must approve it again.' : 'Materiality set; a manager approves it with the audit plan.',
    onSuccess: onClose,
  })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={wasApproved ? 'Change the approved materiality' : 'Set materiality'} description={`Level of assurance: ${LEVEL_OF_ASSURANCE_LABELS[m.level_of_assurance].toLowerCase()} (service attribute, locked at contracting). The absolute threshold is computed from the declared assertion when you save.`} size="lg">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Assertion base" required>
            <NativeSelect value={base} onChange={(e) => setBase(e.target.value as AssertionBase)}>
              {ASSERTION_BASES.map((b) => (
                <option key={b} value={b}>
                  {ASSERTION_BASE_LABELS[b]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Threshold (%)" required hint={m.templateDefault ? `Template default ${m.templateDefault.threshold_pct} %` : undefined}>
            <Input type="number" min={0} max={100} step={0.1} value={pct} onChange={(e) => setPct(e.target.value)} />
          </Field>
          <Field label="Basis" required>
            <NativeSelect value={basis} onChange={(e) => setBasis(e.target.value as MaterialityBasis)}>
              <option value="programme_rule">Programme rule</option>
              <option value="verifier_judgement">Verifier judgement</option>
            </NativeSelect>
          </Field>
          <Field label="Basis note">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. ISO 14064-3 §5.4, 5 % for reasonable assurance" />
          </Field>
          <Field label="Qualitative considerations" hint="One per line." className="sm:col-span-2">
            <Textarea value={qualitative} onChange={(e) => setQualitative(e.target.value)} />
          </Field>
          {wasApproved ? (
            <Field label="Reason for the change" required hint="At least 10 characters; the setting returns to draft and must be approved again." className="sm:col-span-2">
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => mut.mutate()} loading={mut.isPending} disabled={!(Number(pct) >= 0 && Number(pct) <= 100) || (wasApproved && reason.trim().length < 10)}>
            Save materiality
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------- aggregation panel (FR-86) and warning (FR-87)
type AggLike = Pick<AggregationSnapshot, 'gross' | 'net' | 'gross_pct' | 'net_pct' | 'threshold_abs' | 'threshold_pct' | 'unit' | 'exceeds' | 'qualitative_count' | 'material_qualitative' | 'confirmed_count' | 'corrected_count' | 'warning' | 'warning_reason'>

export function AggregationPanel({ agg, snapshot, draftOpinionType, qualitative, className, title = 'Uncorrected misstatements versus materiality' }: { agg: AggLike; snapshot?: AggregationSnapshot | null; draftOpinionType?: string | null; qualitative?: MisstatementView[]; className?: string; title?: string }) {
  const threshold = agg.threshold_abs
  const ratio = (x: number) => (threshold ? Math.min(100, (Math.abs(x) / threshold) * 100) : 0)
  return (
    <div className={cn('bg-surface-muted/60 border-border rounded-md border px-4 py-3', className)} data-testid="aggregation-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-fg text-sm font-semibold">{title}</h4>
        <span className="text-fg-subtle text-xs">
          {agg.confirmed_count} confirmed · {agg.corrected_count} corrected{draftOpinionType ? ` · draft opinion: ${draftOpinionType.replace(/_/g, ' ')}` : ''}
        </span>
      </div>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <Gauge label="Gross (sum of absolute amounts)" value={agg.gross} pct={agg.gross_pct} unit={agg.unit} fill={ratio(agg.gross)} exceeds={threshold != null && agg.gross >= threshold} />
        <Gauge label="Net (signed, understatements negative)" value={agg.net} pct={agg.net_pct} unit={agg.unit} fill={ratio(agg.net)} exceeds={threshold != null && Math.abs(agg.net) >= threshold} />
      </div>
      <p className="text-fg-subtle mt-2 text-xs">
        Materiality {threshold != null ? `${num(threshold, agg.unit)} (${agg.threshold_pct} % of the assertion)` : 'not yet set'}
        {agg.qualitative_count ? ` · ${agg.qualitative_count} qualitative misstatement${agg.qualitative_count === 1 ? '' : 's'} listed separately${agg.material_qualitative ? ', one marked as a material candidate' : ''}` : ' · no qualitative misstatement'}
        {snapshot ? ` · snapshot taken ${fmtDateTime(snapshot.snapshot_at)} when the iteration was submitted for independent review${snapshot.gross !== agg.gross || snapshot.net !== agg.net ? ` (then gross ${num(snapshot.gross, snapshot.unit)}, net ${num(snapshot.net, snapshot.unit)})` : ''}` : ''}
      </p>
      {qualitative?.length ? (
        <ul className="mt-2 space-y-1 text-xs">
          {qualitative.map((m) => (
            <li key={m.id} className="flex items-start gap-2">
              <Badge tone={m.material_candidate ? 'warning' : 'outline'}>{m.material_candidate ? 'Material candidate' : 'Qualitative'}</Badge>
              <span className="text-fg-muted">{m.description}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function Gauge({ label, value, pct, unit, fill, exceeds }: { label: string; value: number; pct: number | null; unit: string; fill: number; exceeds: boolean }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-fg-subtle text-xs">{label}</span>
        <span className={cn('text-sm font-semibold tabular-nums', exceeds ? 'text-danger' : 'text-fg')}>
          {num(value, unit)}
          {pct != null ? <span className="text-fg-subtle ml-1 text-xs font-normal">({pct} %)</span> : null}
        </span>
      </div>
      <div className="bg-surface mt-1 h-2 w-full overflow-hidden rounded-full border border-border" role="img" aria-label={`${label}: ${Math.round(fill)} % of materiality`}>
        <div className={cn('h-full rounded-full transition-[width]', exceeds ? 'bg-danger' : fill > 70 ? 'bg-warning' : 'bg-success')} style={{ width: `${fill}%` }} />
      </div>
    </div>
  )
}

export function MaterialityWarningBanner({ agg, ackIr, ackManager, className }: { agg: AggLike; ackIr?: { name: string; at: string; comment: string } | null; ackManager?: { name: string; at: string; comment: string } | null; className?: string }) {
  if (!agg.warning) return null
  return (
    <Alert tone="warning" icon={<AlertTriangle />} className={className} title="Inconsistency warning: aggregated misstatements versus the draft opinion type" data-testid="materiality-warning">
      <p>{agg.warning_reason}</p>
      <p className="mt-1">This is a warning, never a block: the independent reviewer and the decision-maker must each acknowledge it with a comment before approving. The judgement stays theirs.</p>
      {ackIr || ackManager ? (
        <ul className="mt-1.5 space-y-0.5 text-xs">
          {ackIr ? (
            <li>
              Acknowledged by the independent reviewer {ackIr.name} on {fmtDateTime(ackIr.at)}: “{ackIr.comment}”
            </li>
          ) : null}
          {ackManager ? (
            <li>
              Acknowledged by the decision-maker {ackManager.name} on {fmtDateTime(ackManager.at)}: “{ackManager.comment}”
            </li>
          ) : null}
        </ul>
      ) : null}
    </Alert>
  )
}

// ---------------------------------------------------------------- misstatement register (FR-85)
export function MisstatementRegister({ serviceId, perms, className }: { serviceId: string; perms: Perms; className?: string }) {
  const list = useMisstatements(serviceId)
  const agg = useAggregation(serviceId)
  const [add, setAdd] = useState(false)
  const [dismiss, setDismiss] = useState<MisstatementView | null>(null)
  const [correct, setCorrect] = useState<MisstatementView | null>(null)
  const confirm = useAppMutation((id: string) => materiality.confirm(serviceId, id), { successMessage: 'Misstatement confirmed; the aggregation panel is updated.' })
  const dismissM = useAppMutation(({ id, reason }: { id: string; reason: string }) => materiality.dismiss(serviceId, id, reason), { successMessage: 'Misstatement dismissed with your reason.' })
  if (!list.data || !agg.data) return <Skeleton className="h-48" />
  const rows = list.data
  const canManage = perms.canManageMisstatements
  return (
    <div className={cn('space-y-4', className)}>
      <AggregationPanel agg={agg.data} draftOpinionType={agg.data.draftOpinionType} qualitative={agg.data.qualitative} />
      <MaterialityWarningBanner agg={agg.data} />
      <Card>
        <CardHeader
          title={`Misstatement register (${rows.length})`}
          description="Proposed by the platform from adjusted-versus-declared differences, raised from a finding, or entered directly. A person confirms, dismisses with a reason or marks the correction."
          actions={canManage ? <Button size="sm" onClick={() => setAdd(true)}><Plus /> Add misstatement</Button> : null}
        />
        {rows.length === 0 ? (
          <EmptyState title="No misstatement registered" description="Adjusted lines and verified totals that differ from the declared values propose entries here." />
        ) : (
          <Table label="Misstatement register">
            <THead>
              <tr>
                <TH>Direction</TH>
                <TH className="text-right">Amount</TH>
                <TH className="text-right">% of base</TH>
                <TH>Nature</TH>
                <TH>Source</TH>
                <TH>Description</TH>
                <TH>Corrected</TH>
                <TH>Status</TH>
                {canManage ? <TH /> : null}
              </tr>
            </THead>
            <TBody>
              {rows.map((m) => (
                <TR key={m.id} data-misstatement-status={m.status}>
                  <TD>
                    <Badge tone={m.direction === 'understatement' ? 'danger' : 'warning'}>{m.direction}</Badge>
                  </TD>
                  <TD className="text-right tabular-nums">{m.nature === 'quantitative' ? num(m.amount, m.amount_unit) : '—'}</TD>
                  <TD className="text-right tabular-nums">{m.pctOfBase != null ? `${m.pctOfBase} %` : '—'}</TD>
                  <TD className="text-xs">
                    {m.nature}
                    {m.material_candidate ? <Badge tone="warning" className="ml-1">material candidate</Badge> : null}
                  </TD>
                  <TD className="text-xs">
                    <Badge tone="outline">{m.source === 'system' ? 'Proposed by platform' : m.source === 'finding' ? 'From finding' : 'Manual'}</Badge>
                    {m.findingLabel ? <div className="text-fg-subtle mt-0.5">{m.findingLabel}</div> : null}
                    {m.recordLabel ? <div className="text-fg-subtle mt-0.5">{m.recordLabel}</div> : null}
                  </TD>
                  <TD className="max-w-md text-sm">
                    {m.description}
                    {m.dismiss_reason ? <div className="text-fg-muted text-xs italic">Dismissed: {m.dismiss_reason}</div> : null}
                    {m.confirmedByName ? <div className="text-fg-subtle text-xs">Confirmed by {m.confirmedByName} · {fmtDateTime(m.confirmed_at)}</div> : null}
                  </TD>
                  <TD className="text-xs">{m.corrected ? <Badge tone="success">Corrected · {m.corrected_revision_ref}</Badge> : '—'}</TD>
                  <TD>
                    <StatusChip status={m.status} />
                  </TD>
                  {canManage ? (
                    <TD className="whitespace-nowrap">
                      {m.status === 'proposed' ? (
                        <div className="flex gap-1">
                          <Button size="sm" onClick={() => confirm.mutate(m.id)} loading={confirm.isPending}>
                            Confirm
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setDismiss(m)}>
                            Dismiss
                          </Button>
                        </div>
                      ) : m.status === 'confirmed' && !m.corrected ? (
                        <Button size="sm" variant="ghost" onClick={() => setCorrect(m)}>
                          Mark corrected
                        </Button>
                      ) : null}
                    </TD>
                  ) : null}
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
      {add ? <MisstatementDialog serviceId={serviceId} unit={agg.data.unit} onClose={() => setAdd(false)} /> : null}
      <ReasonDialog open={dismiss !== null} onOpenChange={(o) => !o && setDismiss(null)} title="Dismiss this misstatement" description={dismiss?.description} reasonLabel="Why it is not a misstatement" confirmLabel="Dismiss" onConfirm={(reason) => dismiss && dismissM.mutateAsync({ id: dismiss.id, reason })} />
      {correct ? <CorrectedDialog serviceId={serviceId} m={correct} onClose={() => setCorrect(null)} /> : null}
    </div>
  )
}

function CorrectedDialog({ serviceId, m, onClose }: { serviceId: string; m: MisstatementView; onClose: () => void }) {
  const [ref, setRef] = useState('')
  const mut = useAppMutation(() => materiality.markCorrected(serviceId, m.id, ref), { successMessage: 'Misstatement marked as corrected; it no longer counts in the aggregate.', onSuccess: onClose })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Mark as corrected" description={`${m.description}. The client corrected the declared value in a new revision; reference it so the register links the two.`} size="sm">
        <Field label="Correcting revision" required>
          <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. Inventory 2025 revision 2" />
        </Field>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => mut.mutate()} loading={mut.isPending} disabled={!ref.trim()}>
            Mark corrected
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Direct entry or "Raise from finding" (FR-85). */
export function MisstatementDialog({ serviceId, unit, findingId, onClose }: { serviceId: string; unit?: string; findingId?: string | null; onClose: () => void }) {
  const fnd = useServiceFindings(serviceId)
  const [direction, setDirection] = useState<MisstatementDirection>('overstatement')
  const [nature, setNature] = useState<MisstatementNature>('quantitative')
  const [amount, setAmount] = useState('')
  const [amountUnit, setAmountUnit] = useState(unit ?? 'tCO2e')
  const [material, setMaterial] = useState(false)
  const [description, setDescription] = useState('')
  const [finding, setFinding] = useState(findingId ?? '')
  const [proposeOnly, setProposeOnly] = useState(false)
  const mut = useAppMutation(() => materiality.create(serviceId, { direction, nature, amount: Number(amount) || 0, amount_unit: amountUnit, material_candidate: nature === 'qualitative' && material, description, finding_id: finding || null, propose_only: proposeOnly }), {
    successMessage: proposeOnly ? 'Misstatement proposed for confirmation.' : 'Misstatement registered and confirmed.',
    onSuccess: onClose,
  })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={findingId ? 'Raise a misstatement from this finding' : 'Add a misstatement'} description="Quantitative entries carry an amount in the unit of the assertion; qualitative entries are listed separately and never summed." size="lg">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nature" required>
            <NativeSelect value={nature} onChange={(e) => setNature(e.target.value as MisstatementNature)}>
              <option value="quantitative">Quantitative</option>
              <option value="qualitative">Qualitative</option>
            </NativeSelect>
          </Field>
          <Field label="Direction" required>
            <NativeSelect value={direction} onChange={(e) => setDirection(e.target.value as MisstatementDirection)}>
              <option value="overstatement">Overstatement (declared too high)</option>
              <option value="understatement">Understatement (declared too low)</option>
            </NativeSelect>
          </Field>
          {nature === 'quantitative' ? (
            <>
              <Field label="Amount" required>
                <Input type="number" min={0} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </Field>
              <Field label="Unit" required>
                <Input value={amountUnit} onChange={(e) => setAmountUnit(e.target.value)} />
              </Field>
            </>
          ) : (
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <Checkbox checked={material} onCheckedChange={(v) => setMaterial(v === true)} /> Material candidate (raises the inconsistency warning on an unqualified draft opinion)
            </label>
          )}
          <Field label="Linked finding" className="sm:col-span-2">
            <NativeSelect value={finding} onChange={(e) => setFinding(e.target.value)}>
              <option value="">None</option>
              {(fnd.data ?? []).map((f) => (
                <option key={f.id} value={f.id}>
                  {f.type} #{f.number} — {f.title}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Description" required className="sm:col-span-2">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What was declared, what the evidence supports, and why." />
          </Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <Checkbox checked={proposeOnly} onCheckedChange={(v) => setProposeOnly(v === true)} /> Leave as proposed for the team leader to confirm
          </label>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => mut.mutate()} loading={mut.isPending} disabled={!description.trim() || (nature === 'quantitative' && !(Number(amount) >= 0 && amount !== ''))}>
            <Plus /> {proposeOnly ? 'Propose' : 'Register'} misstatement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Short link block used on the Phases and Opinion tabs. */
export function MisstatementLink({ serviceId, count, proposed }: { serviceId: string; count: number; proposed: number }) {
  return (
    <Link to="/engagements/$serviceId/misstatements" params={{ serviceId }} className="text-primary inline-flex items-center gap-1 text-xs font-semibold hover:underline">
      <Scale className="size-3.5" /> Misstatement register ({count}){proposed ? <Badge tone="blocking" className="ml-1">{proposed} proposed</Badge> : null}
    </Link>
  )
}

export type { AggregationView }
