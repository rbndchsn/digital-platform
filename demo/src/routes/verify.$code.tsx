/** Public verification statement page (PRD FR-36, v0.3): no session required; superseded and withdrawn banners never disappear. */
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { AlertTriangle, Search, ShieldCheck, ShieldOff, ShieldX } from 'lucide-react'
import { useState } from 'react'
import { iterations } from '@/api'
import type { StatementView } from '@/api/iterations'
import { ASSERTION_BASE_LABELS, SERVICE_TYPE_LABELS, WITHDRAWAL_PUBLIC_CATEGORY_LABELS, type ServiceType } from '@/domain/enums'
import { AssuranceBadge } from '@/components/assurance-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/misc'
import { fmtDate, fmtDateTime, fmtNumber, titleCase } from '@/lib/format'
import { useTheme } from '@/lib/theme'

export const Route = createFileRoute('/verify/$code')({
  component: Verify,
})

function Verify() {
  const { code } = Route.useParams()
  const navigate = useNavigate()
  useTheme()
  const [lookup, setLookup] = useState('')
  const q = useQuery({ queryKey: ['public-statement', code], queryFn: () => iterations.getPublicStatement(code) })
  return (
    <main className="bg-bg min-h-full">
      <header className="bg-surface border-border border-b">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="bg-primary text-primary-fg grid size-8 place-items-center rounded-lg text-sm font-bold" aria-hidden>
              ✓
            </span>
            <span className="text-fg text-sm font-semibold tracking-tight">VERIFASSUR_X</span>
            <span className="text-fg-subtle text-xs">· Public verification</span>
          </Link>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (lookup.trim()) navigate({ to: '/verify/$code', params: { code: lookup.trim().toUpperCase() } })
            }}
          >
            <Input value={lookup} onChange={(e) => setLookup(e.target.value)} placeholder="VX-XXXX-XXXX" className="w-44 font-mono" aria-label="Verification code" />
            <Button type="submit" variant="secondary" size="md">
              <Search /> Check
            </Button>
          </form>
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-6 py-8">
        {q.isLoading ? (
          <Skeleton className="h-96" />
        ) : !q.data ? (
          <div className="bg-surface border-border rounded-card border p-8 text-center shadow-card">
            <ShieldX className="text-danger mx-auto mb-3 size-10" />
            <h1 className="text-fg text-xl font-semibold">No statement found for {code}</h1>
            <p className="text-fg-muted mt-2 text-sm">The code may be mistyped. A code that was ever issued always resolves, even after a withdrawal.</p>
          </div>
        ) : (
          <Statement st={q.data} />
        )}
      </div>
    </main>
  )
}

function Statement({ st }: { st: StatementView }) {
  const status = st.status
  return (
    <article className="bg-surface border-border rounded-card border shadow-card" data-statement-status={status}>
      {status === 'issued' ? (
        <div className="bg-success-soft text-success flex items-center gap-3 rounded-t-card px-6 py-4">
          <ShieldCheck className="size-7" />
          <div>
            <div className="text-base font-semibold">Genuine VERIFASSUR opinion</div>
            <div className="text-sm opacity-90">
              Code <code className="font-mono font-bold">{st.public_code}</code> · issued {fmtDateTime(st.issued_at)}
            </div>
          </div>
          <QrLike seed={st.public_code} className="ml-auto" />
        </div>
      ) : status === 'superseded' ? (
        <div className="bg-warning-soft text-warning flex items-center gap-3 rounded-t-card px-6 py-4" role="status">
          <AlertTriangle className="size-7 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold">This statement has been superseded</div>
            <div className="text-sm opacity-90">
              Code <code className="font-mono font-bold">{st.public_code}</code> was issued {fmtDateTime(st.issued_at)} and replaced on {fmtDateTime(st.superseded_at)}.
              {st.supersededByCode ? (
                <>
                  {' '}
                  The current opinion is{' '}
                  <Link to="/verify/$code" params={{ code: st.supersededByCode }} className="font-semibold underline">
                    {st.supersededByCode}
                  </Link>
                  .
                </>
              ) : null}
            </div>
          </div>
          <QrLike seed={st.public_code} className="ml-auto opacity-60" />
        </div>
      ) : (
        <div className="bg-danger-soft text-danger flex items-center gap-3 rounded-t-card px-6 py-4" role="status">
          <ShieldOff className="size-7 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold">This statement has been withdrawn</div>
            <div className="text-sm opacity-90">
              Code <code className="font-mono font-bold">{st.public_code}</code> was issued {fmtDateTime(st.issued_at)} and withdrawn by VERIFASSUR on {fmtDateTime(st.withdrawn_at)}. Reason category: <span className="font-semibold">{st.withdrawal_public_category ? WITHDRAWAL_PUBLIC_CATEGORY_LABELS[st.withdrawal_public_category] : 'Other'}</span>. The opinion must not be relied upon; the records it covered no longer carry assurance.
            </div>
          </div>
        </div>
      )}
      <div className="space-y-6 px-6 py-6">
        <div>
          <h1 className="text-fg text-2xl font-semibold tracking-tight">{st.serviceName}</h1>
          <p className="text-fg-muted mt-1 text-sm">
            {st.clientName} · {SERVICE_TYPE_LABELS[st.serviceType as ServiceType] ?? st.serviceType} · {st.standard}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone={status === 'issued' ? 'primary' : 'neutral'}>{titleCase(st.opinion_type)} opinion</Badge>
            <AssuranceBadge level={st.level_of_assurance} status={status === 'withdrawn' ? 'withdrawn' : status === 'superseded' ? 'superseded' : null} />
            <Badge tone="outline">
              Period {fmtDate(st.periodStart)} – {fmtDate(st.periodEnd)}
            </Badge>
            <Badge tone="outline">Reference {st.serviceReference}</Badge>
          </div>
          {st.materiality_json ? (
            <p className="text-fg-muted mt-3 text-sm" data-testid="materiality-line">
              Materiality: {st.materiality_json.threshold_pct} % of {ASSERTION_BASE_LABELS[st.materiality_json.assertion_base].toLowerCase()}
              {st.materiality_json.threshold_abs != null ? ` (${fmtNumber(st.materiality_json.threshold_abs, st.materiality_json.threshold_abs < 10 ? 3 : 0)} ${st.materiality_json.unit})` : ''} · basis: {st.materiality_json.basis === 'programme_rule' ? 'programme rule' : 'verifier judgement'}
              {st.misstatement_summary_json ? ` · uncorrected misstatements ${fmtNumber(st.misstatement_summary_json.gross, st.misstatement_summary_json.gross < 10 ? 3 : 0)} ${st.misstatement_summary_json.unit} gross${st.misstatement_summary_json.warning ? ', inconsistency warning acknowledged' : ''}` : ''}
            </p>
          ) : null}
        </div>
        {st.hidden ? (
          <section className="bg-surface-muted/60 border-border rounded-md border px-4 py-3 text-sm" role="note">
            <p className="text-fg font-medium">{status === 'withdrawn' ? 'Figures and document hashes are not shown for a withdrawn statement.' : 'The client has not enabled public display of the verified figures and document hashes.'}</p>
            <p className="text-fg-muted mt-1 text-xs">This page still confirms that the code exists, which opinion type and level of assurance it carried, and its current status.</p>
          </section>
        ) : (
          <>
            {st.figures_json.length ? (
              <section>
                <h2 className="text-fg-subtle mb-2 text-xs font-semibold uppercase tracking-wide">Verified figures</h2>
                <table className="w-full text-sm">
                  <tbody className="divide-border divide-y">
                    {st.figures_json.map((f) => (
                      <tr key={f.key}>
                        <td className="text-fg py-1.5">{f.label}</td>
                        <td className="text-fg py-1.5 text-right font-semibold tabular-nums">
                          {fmtNumber(f.value, Number.isInteger(f.value) ? 0 : 2)} <span className="text-fg-muted font-normal">{f.unit}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ) : null}
            <section>
              <h2 className="text-fg-subtle mb-2 text-xs font-semibold uppercase tracking-wide">Documents covered by this opinion</h2>
              <p className="text-fg-muted mb-2 text-xs">Compare the SHA-256 of a file you were given with the hash below. A match proves the file is the one VERIFASSUR issued.</p>
              <ul className="divide-border divide-y text-xs">
                {st.hashes_json.map((h) => (
                  <li key={h.sha256} className="py-1.5">
                    <div className="text-fg font-medium">
                      {h.filename} <span className="text-fg-subtle font-normal">· {titleCase(h.role)}</span>
                    </div>
                    <code className="text-fg-muted font-mono break-all">{h.sha256}</code>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
        <section className="text-fg-muted text-xs">
          Signed by {st.signatories_json.map((s) => `${s.name}, ${s.role}`).join(' and ')} · VERIFASSUR Assurance S.A., Luxembourg · This page confirms the existence, status and integrity of the opinion; the full statement is available from the client.
          {status === 'withdrawn' && st.withdrawnByName ? ` Withdrawal decided by ${st.withdrawnByName}.` : ''}
        </section>
      </div>
    </article>
  )
}

/** Deterministic QR-looking matrix from the code (decorative stand-in; Phase II renders a real QR). */
function QrLike({ seed, className }: { seed: string; className?: string }) {
  const n = 21
  let h = 2166136261
  const cells: boolean[] = []
  for (let i = 0; i < n * n; i++) {
    h ^= seed.charCodeAt(i % seed.length) + i
    h = Math.imul(h, 16777619) >>> 0
    cells.push((h & 0x80000) !== 0)
  }
  const finder = (x: number, y: number) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7)
  return (
    <svg width="76" height="76" viewBox={`0 0 ${n} ${n}`} className={className} role="img" aria-label="Verification code pattern">
      <rect width={n} height={n} fill="white" />
      {cells.map((on, i) => {
        const x = i % n
        const y = Math.floor(i / n)
        if (finder(x, y)) {
          const fx = x < 7 ? x : x - (n - 7)
          const fy = y < 7 ? y : y - (n - 7)
          const ring = fx === 0 || fy === 0 || fx === 6 || fy === 6 || (fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4)
          return ring ? <rect key={i} x={x} y={y} width="1" height="1" fill="#0b1f1e" /> : null
        }
        return on ? <rect key={i} x={x} y={y} width="1" height="1" fill="#0b1f1e" /> : null
      })}
    </svg>
  )
}
