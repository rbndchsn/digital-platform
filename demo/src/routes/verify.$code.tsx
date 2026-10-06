/** Public verification statement page (PRD FR-36): no session required. */
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { Search, ShieldCheck, ShieldX } from 'lucide-react'
import { useState } from 'react'
import { iterations } from '@/api'
import { SERVICE_TYPE_LABELS, type ServiceType } from '@/domain/enums'
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
            <Input value={lookup} onChange={(e) => setLookup(e.target.value)} placeholder="VX-XXXX-XXXX" className="w-44 font-mono" />
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
            <p className="text-fg-muted mt-2 text-sm">The code may be mistyped, or the client has not enabled public verification for this opinion.</p>
          </div>
        ) : (
          <article className="bg-surface border-border rounded-card border shadow-card">
            <div className="bg-success-soft text-success flex items-center gap-3 rounded-t-card px-6 py-4">
              <ShieldCheck className="size-7" />
              <div>
                <div className="text-base font-semibold">Genuine VERIFASSUR opinion</div>
                <div className="text-sm opacity-90">
                  Code <code className="font-mono font-bold">{q.data.public_code}</code> · issued {fmtDateTime(q.data.issued_at)}
                </div>
              </div>
              <QrLike seed={q.data.public_code} className="ml-auto" />
            </div>
            <div className="space-y-6 px-6 py-6">
              <div>
                <h1 className="text-fg text-2xl font-semibold tracking-tight">{q.data.serviceName}</h1>
                <p className="text-fg-muted mt-1 text-sm">
                  {q.data.clientName} · {SERVICE_TYPE_LABELS[q.data.serviceType as ServiceType] ?? q.data.serviceType} · {q.data.standard}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone="primary">{titleCase(q.data.opinion_type)} opinion</Badge>
                  <Badge tone="outline">{q.data.level_of_assurance} assurance</Badge>
                  <Badge tone="outline">
                    Period {fmtDate(q.data.periodStart)} – {fmtDate(q.data.periodEnd)}
                  </Badge>
                  <Badge tone="outline">Reference {q.data.serviceReference}</Badge>
                </div>
              </div>
              {q.data.figures_json.length ? (
                <section>
                  <h2 className="text-fg-subtle mb-2 text-xs font-semibold uppercase tracking-wide">Verified figures</h2>
                  <table className="w-full text-sm">
                    <tbody className="divide-border divide-y">
                      {q.data.figures_json.map((f) => (
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
                  {q.data.hashes_json.map((h) => (
                    <li key={h.sha256} className="py-1.5">
                      <div className="text-fg font-medium">
                        {h.filename} <span className="text-fg-subtle font-normal">· {titleCase(h.role)}</span>
                      </div>
                      <code className="text-fg-muted font-mono break-all">{h.sha256}</code>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="text-fg-muted text-xs">
                Signed by {q.data.signatories_json.map((s) => `${s.name}, ${s.role}`).join(' and ')} · VERIFASSUR Assurance S.A., Luxembourg · This page confirms the existence and integrity of the opinion; the full statement is available from the client.
              </section>
            </div>
          </article>
        )}
      </div>
    </main>
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
