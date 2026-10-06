import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { fmtNumber } from '@/lib/format'

export function KpiNumber({ value, unit, label, hint, className, decimals = 0, tone = 'primary' }: { value: number | null | undefined; unit?: string; label: string; hint?: ReactNode; className?: string; decimals?: number; tone?: 'primary' | 'fg' | 'success' | 'blocking' }) {
  const color = { primary: 'text-primary', fg: 'text-fg', success: 'text-success', blocking: 'text-blocking' }[tone]
  return (
    <div className={cn('bg-surface border-border rounded-card border px-5 py-4 shadow-card', className)}>
      <div className={cn('text-3xl font-semibold tracking-tight tabular-nums', color)}>
        {fmtNumber(value, decimals)}
        {unit ? <span className="text-fg-muted ml-1 text-base font-medium">{unit}</span> : null}
      </div>
      <div className="text-fg-muted mt-1 text-sm">{label}</div>
      {hint ? <div className="text-fg-subtle mt-1 text-xs">{hint}</div> : null}
    </div>
  )
}

/** Donut KPI (pure SVG). `value` over `max`; shows the value in the centre like the reference "2,468 tCO2". */
export function KpiDonut({ value, max, unit, label, className, decimals = 0 }: { value: number; max: number; unit?: string; label: string; className?: string; decimals?: number }) {
  const r = 34
  const c = 2 * Math.PI * r
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0
  return (
    <div className={cn('bg-surface border-border flex items-center gap-4 rounded-card border px-5 py-4 shadow-card', className)}>
      <svg width="84" height="84" viewBox="0 0 84 84" role="img" aria-label={`${label}: ${fmtNumber(value, decimals)} ${unit ?? ''}`}>
        <circle cx="42" cy="42" r={r} fill="none" stroke="var(--vx-surface-muted)" strokeWidth="9" />
        <circle cx="42" cy="42" r={r} fill="none" stroke="var(--vx-primary)" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${c * pct} ${c * (1 - pct)}`} transform="rotate(-90 42 42)" />
        <text x="42" y="40" textAnchor="middle" className="fill-fg" fontSize="13" fontWeight="600">
          {fmtNumber(value, decimals)}
        </text>
        {unit ? (
          <text x="42" y="54" textAnchor="middle" className="fill-fg-muted" fontSize="9">
            {unit}
          </text>
        ) : null}
      </svg>
      <div>
        <div className="text-fg text-sm font-semibold">{label}</div>
        <div className="text-fg-subtle text-xs">{Math.round(pct * 100)} % of {fmtNumber(max, decimals)}</div>
      </div>
    </div>
  )
}

export function KpiBars({ rows, label, className }: { rows: { label: string; value: number; tone?: 'blocking' | 'primary' | 'info' | 'success' }[]; label: string; className?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  const tone = { blocking: 'bg-blocking', primary: 'bg-primary', info: 'bg-info', success: 'bg-success' }
  return (
    <div className={cn('bg-surface border-border rounded-card border px-5 py-4 shadow-card', className)}>
      <div className="text-fg mb-3 text-sm font-semibold">{label}</div>
      <div className="space-y-2.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-3">
            <div className="bg-surface-muted h-2.5 flex-1 overflow-hidden rounded-full">
              <div className={cn('h-full rounded-full', tone[r.tone ?? 'primary'])} style={{ width: `${(r.value / max) * 100}%` }} />
            </div>
            <span className="text-fg w-6 text-right text-sm font-semibold tabular-nums">{r.value}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        {rows.map((r) => (
          <span key={r.label} className="text-fg-muted inline-flex items-center gap-1.5 text-xs">
            <span className={cn('size-2 rounded-full', tone[r.tone ?? 'primary'])} /> {r.label}
          </span>
        ))}
      </div>
    </div>
  )
}
