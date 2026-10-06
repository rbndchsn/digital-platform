/** Gantt timeline (PRD FR-37): planned (outline) vs actual (filled) per phase and step, today line, hover transitions. Pure SVG. */
import { useState } from 'react'
import type { TimelineRow } from '@/api/services'
import { cn } from '@/lib/cn'
import { fmtDate, fmtDateTime } from '@/lib/format'

const DAY = 86_400_000
const ROW_H = 30
const LABEL_W = 230
const PX_PER_DAY = 6

function toMs(d: string | null | undefined): number | null {
  if (!d) return null
  return new Date(d.length === 10 ? `${d}T00:00:00Z` : d).getTime()
}

const COLOR: Record<string, string> = {
  completed: 'var(--vx-status-completed)',
  in_progress: 'var(--vx-status-in-progress)',
  on_hold: 'var(--vx-status-on-hold)',
  blocked: 'var(--vx-status-blocked)',
  planned: 'var(--vx-status-planned)',
  not_started: 'var(--vx-fg-subtle)',
  skipped: 'var(--vx-fg-subtle)',
}

export function Gantt({ rows, rangeStart, rangeEnd, today, className }: { rows: TimelineRow[]; rangeStart: string; rangeEnd: string; today: string; className?: string }) {
  const [hover, setHover] = useState<TimelineRow | null>(null)
  const start = toMs(rangeStart)! - 7 * DAY
  const end = toMs(rangeEnd)! + 21 * DAY
  const days = Math.ceil((end - start) / DAY)
  const width = LABEL_W + days * PX_PER_DAY
  const height = rows.length * ROW_H + 36
  const x = (ms: number) => LABEL_W + ((ms - start) / DAY) * PX_PER_DAY
  const months: { label: string; x: number }[] = []
  for (let d = new Date(start); d.getTime() < end; d.setUTCMonth(d.getUTCMonth() + 1, 1)) {
    const first = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)
    if (first >= start) months.push({ label: d.toLocaleString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' }), x: x(first) })
  }
  const todayX = x(toMs(today)!)
  return (
    <div className={cn('relative overflow-x-auto', className)}>
      <svg width={width} height={height} role="img" aria-label="Timeline of phases and steps">
        {months.map((m) => (
          <g key={m.label}>
            <line x1={m.x} x2={m.x} y1={20} y2={height} stroke="var(--vx-border)" strokeDasharray="2 3" />
            <text x={m.x + 4} y={14} fontSize="10" fill="var(--vx-fg-subtle)">
              {m.label}
            </text>
          </g>
        ))}
        <line x1={todayX} x2={todayX} y1={20} y2={height} stroke="var(--vx-blocking)" strokeWidth="1.5" />
        <text x={todayX + 4} y={height - 4} fontSize="9" fill="var(--vx-blocking)">
          today
        </text>
        {rows.map((r, i) => {
          const y = 28 + i * ROW_H
          const ps = toMs(r.plannedStart)
          const pe = toMs(r.plannedEnd)
          const as_ = toMs(r.actualStart)
          const ae = toMs(r.actualEnd) ?? (as_ && (r.status === 'in_progress' || r.status === 'blocked' || r.status === 'on_hold') ? toMs(today) : null)
          const color = COLOR[r.status] ?? COLOR.not_started
          return (
            <g key={r.id} onMouseEnter={() => setHover(r)} onMouseLeave={() => setHover(null)}>
              <rect x={0} y={y} width={width} height={ROW_H} fill={r.kind === 'phase' ? 'var(--vx-surface-muted)' : 'transparent'} opacity={r.kind === 'phase' ? 0.6 : 1} />
              <text x={r.kind === 'phase' ? 8 : 22} y={y + 19} fontSize={r.kind === 'phase' ? 12 : 11} fontWeight={r.kind === 'phase' ? 700 : 400} fill="var(--vx-fg)">
                {r.name.length > 30 ? `${r.name.slice(0, 29)}…` : r.name}
              </text>
              {ps != null && pe != null ? <rect x={x(ps)} y={y + 9} width={Math.max(3, x(pe) - x(ps))} height={12} rx={6} fill="none" stroke={color} strokeWidth={1.5} strokeDasharray={r.status === 'not_started' ? '3 2' : undefined} /> : null}
              {as_ != null && ae != null ? <rect x={x(as_)} y={y + 9} width={Math.max(3, x(ae) - x(as_))} height={12} rx={6} fill={color} opacity={0.9} /> : null}
              {r.status === 'completed' && ae != null ? (
                <g transform={`translate(${x(ae) - 6}, ${y + 15})`}>
                  <circle r={7} fill="var(--vx-surface)" stroke={color} strokeWidth={1.5} />
                  <path d="M-3 0 L-1 2 L3 -2" stroke={color} strokeWidth={1.8} fill="none" strokeLinecap="round" />
                </g>
              ) : null}
              {r.status === 'not_started' && ps != null ? <circle cx={x(ps)} cy={y + 15} r={3.5} fill="var(--vx-border)" /> : null}
            </g>
          )
        })}
      </svg>
      {hover ? (
        <div className="bg-fg text-bg pointer-events-none absolute top-2 right-2 z-10 w-72 rounded-md p-3 text-xs shadow-card">
          <div className="font-semibold">{hover.name}</div>
          <div className="opacity-80">Planned {fmtDate(hover.plannedStart)} – {fmtDate(hover.plannedEnd)}</div>
          <div className="opacity-80">Actual {hover.actualStart ? fmtDate(hover.actualStart) : '—'} – {hover.actualEnd ? fmtDate(hover.actualEnd) : hover.actualStart ? 'ongoing' : '—'}</div>
          {hover.transitions.length ? (
            <ul className="mt-2 space-y-0.5 border-t border-white/20 pt-2">
              {hover.transitions.slice(-5).map((t, i) => (
                <li key={i} className="flex gap-2">
                  <span className="shrink-0 opacity-70">{fmtDateTime(t.at)}</span>
                  <span className="truncate">{t.summary}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      <div className="text-fg-muted mt-2 flex flex-wrap gap-4 text-xs">
        <Legend color={COLOR.not_started} label="Not started / open" dashed />
        <Legend color={COLOR.in_progress} label="In progress" />
        <Legend color={COLOR.completed} label="Complete / closed" />
        <Legend color={COLOR.planned} label="Planned" />
        <Legend color={COLOR.on_hold} label="On hold" />
        <Legend color={COLOR.blocked} label="Blocked" />
        <span className="inline-flex items-center gap-1.5">
          <span className="bg-blocking inline-block h-3 w-0.5" /> Today
        </span>
      </div>
    </div>
  )
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-2.5 w-5 rounded-full" style={dashed ? { border: `1.5px dashed ${color}` } : { background: color }} />
      {label}
    </span>
  )
}
