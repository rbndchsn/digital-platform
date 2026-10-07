/**
 * Timeline (PRD FR-37, §7.2; plan_v1 §8 D23): custom read-only SVG. Collapsible phase rows, month axis with a week
 * sub-axis on short ranges, planned (outline) vs actual (filled), one tick per transition with actor and UTC / local
 * time, today line, milestones (agreement, issuance, revision, withdrawal), override markers, lock on
 * non-overridable rows, keyboard focus on rows and markers, and a table view of the same data.
 */
import { Lock } from 'lucide-react'
import { useState, type KeyboardEvent, type ReactNode } from 'react'
import type { TimelineMilestone, TimelineRow, TimelineTransition, TimelineView } from '@/api/services'
import { NavTabs } from '@/components/nav-tabs'
import { Badge } from '@/components/ui/badge'
import { TBody, TD, TH, THead, TR, Table } from '@/components/ui/table'
import { StatusChip } from '@/components/status-chip'
import { cn } from '@/lib/cn'
import { fmtDate, fmtDateTime } from '@/lib/format'

const DAY = 86_400_000
const ROW_H = 30
const LABEL_W = 240
const TOP = 44

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

const MILESTONE: Record<TimelineMilestone['kind'], { color: string; glyph: string }> = {
  agreement: { color: 'var(--vx-primary)', glyph: 'A' },
  issued: { color: 'var(--vx-success)', glyph: 'I' },
  revised: { color: 'var(--vx-info)', glyph: 'R' },
  withdrawn: { color: 'var(--vx-danger)', glyph: 'W' },
  superseded: { color: 'var(--vx-warning)', glyph: 'S' },
}

type Tip = { title: string; lines: ReactNode[] }

function localTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
}

function transitionTip(r: TimelineRow, t: TimelineTransition): Tip {
  return { title: `${r.name}${t.override ? ' · override' : ''}`, lines: [t.summary, `${t.actorName} · ${fmtDateTime(t.at)} · local ${localTime(t.at)}`] }
}

export function Timeline({ view, className }: { view: TimelineView; className?: string }) {
  const [mode, setMode] = useState<'chart' | 'table'>('chart')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [tip, setTip] = useState<Tip | null>(null)
  const [focused, setFocused] = useState<string | null>(null)
  const toggle = (phaseId: string) =>
    setCollapsed((c) => {
      const n = new Set(c)
      if (n.has(phaseId)) n.delete(phaseId)
      else n.add(phaseId)
      return n
    })
  const rows = view.rows.filter((r) => r.kind === 'phase' || !collapsed.has(r.phaseId))
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <NavTabs
          value={mode}
          onChange={setMode}
          label="Timeline view"
          items={[
            { value: 'chart' as const, label: 'Chart view' },
            { value: 'table' as const, label: 'Table view' },
          ]}
        />
        <div className="flex gap-1">
          <button type="button" className="text-primary text-xs font-semibold hover:underline" onClick={() => setCollapsed(new Set())}>
            Expand all
          </button>
          <span className="text-fg-subtle text-xs">·</span>
          <button type="button" className="text-primary text-xs font-semibold hover:underline" onClick={() => setCollapsed(new Set(view.rows.filter((r) => r.kind === 'phase').map((r) => r.id)))}>
            Collapse all
          </button>
        </div>
      </div>
      {mode === 'table' ? <TimelineTable view={view} /> : <Chart view={view} rows={rows} collapsed={collapsed} toggle={toggle} tip={tip} setTip={setTip} focused={focused} setFocused={setFocused} />}
    </div>
  )
}

function Chart({ view, rows, collapsed, toggle, tip, setTip, focused, setFocused }: { view: TimelineView; rows: TimelineRow[]; collapsed: Set<string>; toggle: (id: string) => void; tip: Tip | null; setTip: (t: Tip | null) => void; focused: string | null; setFocused: (id: string | null) => void }) {
  const start = toMs(view.rangeStart)! - 7 * DAY
  const end = toMs(view.rangeEnd)! + 21 * DAY
  const days = Math.ceil((end - start) / DAY)
  const pxPerDay = days < 120 ? 9 : days < 400 ? 6 : 4
  const width = LABEL_W + days * pxPerDay
  const height = TOP + rows.length * ROW_H + 16
  const x = (ms: number) => LABEL_W + ((ms - start) / DAY) * pxPerDay
  const months: { label: string; x: number }[] = []
  for (let d = new Date(start); d.getTime() < end; d.setUTCMonth(d.getUTCMonth() + 1, 1)) {
    const first = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)
    if (first >= start) months.push({ label: d.toLocaleString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' }), x: x(first) })
  }
  const weeks: { label: string; x: number }[] = []
  if (days < 120) {
    const d = new Date(start)
    while (d.getUTCDay() !== 1) d.setUTCDate(d.getUTCDate() + 1)
    for (; d.getTime() < end; d.setUTCDate(d.getUTCDate() + 7)) weeks.push({ label: `${d.getUTCDate()}`, x: x(d.getTime()) })
  }
  const todayX = x(toMs(view.today)!)
  const onKey = (e: KeyboardEvent, fn: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      fn()
    }
  }
  return (
    <div className="relative">
      <div className="overflow-x-auto">
        <svg width={width} height={height} role="group" aria-label="Timeline of phases and steps" className="select-none">
          <style>{`.vx-focus:focus { outline: none } .vx-tick:hover { opacity: 1 }`}</style>
          {months.map((m) => (
            <g key={m.label}>
              <line x1={m.x} x2={m.x} y1={TOP - 10} y2={height} stroke="var(--vx-border)" strokeDasharray="2 3" />
              <text x={m.x + 4} y={12} fontSize="10" fill="var(--vx-fg-subtle)">
                {m.label}
              </text>
            </g>
          ))}
          {weeks.map((w) => (
            <g key={`w${w.x}`}>
              <line x1={w.x} x2={w.x} y1={TOP - 4} y2={TOP} stroke="var(--vx-fg-subtle)" />
              <text x={w.x + 2} y={TOP - 7} fontSize="8" fill="var(--vx-fg-subtle)">
                {w.label}
              </text>
            </g>
          ))}
          {view.milestones.map((m, i) => {
            const mx = x(toMs(m.at)!)
            const c = MILESTONE[m.kind]
            const id = `ms-${i}`
            return (
              <g key={id} className="vx-focus" tabIndex={0} role="img" aria-label={`${m.label}, ${fmtDateTime(m.at)}`} onFocus={() => { setFocused(id); setTip({ title: m.label, lines: [`${fmtDateTime(m.at)} · local ${localTime(m.at)}`] }) }} onBlur={() => { setFocused(null); setTip(null) }} onMouseEnter={() => setTip({ title: m.label, lines: [`${fmtDateTime(m.at)} · local ${localTime(m.at)}`] })} onMouseLeave={() => setTip(null)}>
                <line x1={mx} x2={mx} y1={TOP - 2} y2={height} stroke={c.color} strokeWidth={1.5} strokeDasharray="4 3" />
                <circle cx={mx} cy={TOP - 2} r={8} fill={c.color} stroke={focused === id ? 'var(--vx-primary)' : 'var(--vx-surface)'} strokeWidth={focused === id ? 3 : 1.5} />
                <text x={mx} y={TOP + 1} fontSize="9" fontWeight={700} textAnchor="middle" fill="white">
                  {c.glyph}
                </text>
              </g>
            )
          })}
          <line x1={todayX} x2={todayX} y1={TOP - 2} y2={height} stroke="var(--vx-blocking)" strokeWidth="1.5" />
          <text x={todayX + 4} y={height - 4} fontSize="9" fill="var(--vx-blocking)">
            today
          </text>
          {rows.map((r, i) => {
            const y = TOP + i * ROW_H
            const ps = toMs(r.plannedStart)
            const pe = toMs(r.plannedEnd)
            const as_ = toMs(r.actualStart)
            const ae = toMs(r.actualEnd) ?? (as_ && (r.status === 'in_progress' || r.status === 'blocked' || r.status === 'on_hold') ? toMs(view.today) : null)
            const color = COLOR[r.status] ?? COLOR.not_started
            const rowTip: Tip = { title: r.name, lines: [`${r.status.replace(/_/g, ' ')} · planned ${fmtDate(r.plannedStart)} – ${fmtDate(r.plannedEnd)} · actual ${r.actualStart ? fmtDate(r.actualStart) : '—'} – ${r.actualEnd ? fmtDate(r.actualEnd) : r.actualStart ? 'ongoing' : '—'}`, ...(r.nonOverridable ? ['Non-overridable step (PRD FR-80)'] : []), ...r.transitions.slice(-3).map((t) => `${fmtDateTime(t.at)} · ${t.actorName} · ${t.summary}`)] }
            const isPhase = r.kind === 'phase'
            return (
              <g key={r.id}>
                <g
                  className="vx-focus"
                  tabIndex={0}
                  role={isPhase ? 'button' : 'group'}
                  aria-expanded={isPhase ? !collapsed.has(r.id) : undefined}
                  aria-label={isPhase ? `${r.name} phase, ${collapsed.has(r.id) ? 'collapsed' : 'expanded'}` : `${r.name}, ${r.status.replace(/_/g, ' ')}`}
                  onClick={() => isPhase && toggle(r.id)}
                  onKeyDown={(e) => onKey(e, () => isPhase && toggle(r.id))}
                  onFocus={() => { setFocused(r.id); setTip(rowTip) }}
                  onBlur={() => { setFocused(null); setTip(null) }}
                  onMouseEnter={() => setTip(rowTip)}
                  onMouseLeave={() => setTip(null)}
                  style={{ cursor: isPhase ? 'pointer' : 'default' }}
                >
                  <rect x={0} y={y} width={width} height={ROW_H} fill={isPhase ? 'var(--vx-surface-muted)' : 'transparent'} opacity={isPhase ? 0.6 : 1} />
                  {focused === r.id ? <rect x={1} y={y + 1} width={width - 2} height={ROW_H - 2} fill="none" stroke="var(--vx-primary)" strokeWidth={2} rx={4} /> : null}
                  <text x={isPhase ? 8 : 26} y={y + 19} fontSize={isPhase ? 12 : 11} fontWeight={isPhase ? 700 : 400} fill="var(--vx-fg)">
                    {isPhase ? `${collapsed.has(r.id) ? '▸' : '▾'} ` : ''}
                    {r.name.length > 28 ? `${r.name.slice(0, 27)}…` : r.name}
                  </text>
                  {r.nonOverridable ? <Lock x={LABEL_W - 18} y={y + 9} width={11} height={11} color="var(--vx-fg-muted)" aria-label="Non-overridable" /> : null}
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
                {r.transitions.map((t, j) => {
                  const tx = x(toMs(t.at)!)
                  const id = `${r.id}-t${j}`
                  const tt = transitionTip(r, t)
                  return (
                    <g key={id} className="vx-focus vx-tick" tabIndex={0} role="img" aria-label={`${t.summary}, ${t.actorName}, ${fmtDateTime(t.at)}`} onFocus={() => { setFocused(id); setTip(tt) }} onBlur={() => { setFocused(null); setTip(null) }} onMouseEnter={() => setTip(tt)} onMouseLeave={() => setTip(null)} opacity={0.85}>
                      {t.override ? <rect x={tx - 4} y={y + 11} width={8} height={8} transform={`rotate(45 ${tx} ${y + 15})`} fill="var(--vx-warning)" stroke={focused === id ? 'var(--vx-primary)' : 'var(--vx-surface)'} strokeWidth={focused === id ? 2 : 1} /> : <line x1={tx} x2={tx} y1={y + 6} y2={y + 24} stroke={focused === id ? 'var(--vx-primary)' : 'var(--vx-fg)'} strokeWidth={focused === id ? 3 : 1.5} />}
                    </g>
                  )
                })}
              </g>
            )
          })}
        </svg>
      </div>
      {tip ? (
        <div className="bg-fg text-bg pointer-events-none absolute top-2 right-2 z-10 w-80 rounded-md p-3 text-xs shadow-card" role="status">
          <div className="font-semibold">{tip.title}</div>
          <ul className="mt-1 space-y-0.5 opacity-90">
            {tip.lines.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="text-fg-muted mt-2 flex flex-wrap gap-4 text-xs">
        <Legend color={COLOR.not_started} label="Not started / open" dashed />
        <Legend color={COLOR.in_progress} label="In progress" />
        <Legend color={COLOR.completed} label="Complete / closed" />
        <Legend color={COLOR.planned} label="Planned" />
        <Legend color={COLOR.on_hold} label="On hold" />
        <span className="inline-flex items-center gap-1.5">
          <span className="bg-fg inline-block h-3 w-0.5" /> Transition (hover or focus for actor and time)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="bg-warning inline-block size-2.5 rotate-45" /> Override
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Lock className="size-3" /> Non-overridable
        </span>
        {(Object.keys(MILESTONE) as TimelineMilestone['kind'][]).map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className="inline-grid size-4 place-items-center rounded-full text-[9px] font-bold text-white" style={{ background: MILESTONE[k].color }}>
              {MILESTONE[k].glyph}
            </span>
            {k === 'issued' ? 'Opinion issued' : k === 'agreement' ? 'Agreement accepted' : k === 'revised' ? 'Revision' : k === 'withdrawn' ? 'Withdrawn' : 'Superseded'}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="bg-blocking inline-block h-3 w-0.5" /> Today
        </span>
      </div>
    </div>
  )
}

function TimelineTable({ view }: { view: TimelineView }) {
  return (
    <div className="space-y-3">
      {view.milestones.length ? (
        <div className="flex flex-wrap gap-2 text-xs">
          {view.milestones.map((m, i) => (
            <Badge key={i} tone={m.kind === 'withdrawn' ? 'danger' : m.kind === 'issued' ? 'success' : m.kind === 'revised' ? 'info' : m.kind === 'superseded' ? 'warning' : 'primary'}>
              {m.label} · {fmtDateTime(m.at)}
            </Badge>
          ))}
        </div>
      ) : null}
      <Table label="Timeline table">
        <THead>
          <tr>
            <TH>Phase › step</TH>
            <TH>Status</TH>
            <TH>Planned</TH>
            <TH>Actual</TH>
            <TH>Transitions</TH>
            <TH>Last transition</TH>
          </tr>
        </THead>
        <TBody>
          {view.rows.map((r) => {
            const last = r.transitions[r.transitions.length - 1]
            return (
              <TR key={r.id} className={r.kind === 'phase' ? 'bg-surface-muted/60' : undefined}>
                <TD className={cn('text-sm', r.kind === 'phase' ? 'font-semibold' : 'pl-8')}>
                  <span className="inline-flex items-center gap-1.5">
                    {r.name}
                    {r.nonOverridable ? <Lock className="text-fg-muted size-3" aria-label="Non-overridable" /> : null}
                  </span>
                </TD>
                <TD>
                  <StatusChip status={r.status} size="xs" />
                </TD>
                <TD className="text-xs whitespace-nowrap">
                  {fmtDate(r.plannedStart)} – {fmtDate(r.plannedEnd)}
                </TD>
                <TD className="text-xs whitespace-nowrap">
                  {r.actualStart ? fmtDate(r.actualStart) : '—'} – {r.actualEnd ? fmtDate(r.actualEnd) : r.actualStart ? 'ongoing' : '—'}
                </TD>
                <TD className="text-xs">
                  {r.transitions.length}
                  {r.transitions.some((t) => t.override) ? <Badge tone="warning" className="ml-1">override</Badge> : null}
                </TD>
                <TD className="text-fg-muted max-w-md truncate text-xs">{last ? `${fmtDateTime(last.at)} · ${last.actorName} · ${last.summary}` : '—'}</TD>
              </TR>
            )
          })}
        </TBody>
      </Table>
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
