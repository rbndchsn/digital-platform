/** Display formatting. Dates are stored in UTC and shown as UTC with a local hint on hover (PRD §7.3). */
import { format, formatDistanceToNowStrict, parseISO } from 'date-fns'

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = iso.length === 10 ? parseISO(iso) : new Date(iso)
  return format(d, 'dd MMM yyyy')
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.toISOString().slice(0, 10).split('-').reverse().join('/')} ${d.toISOString().slice(11, 16)} UTC`
}

export function fmtRelative(iso: string | null | undefined): string {
  if (!iso) return '—'
  return formatDistanceToNowStrict(new Date(iso), { addSuffix: true })
}

export function fmtNumber(n: number | null | undefined, decimals = 0): string {
  if (n == null || Number.isNaN(n)) return '—'
  return n.toLocaleString('en-GB', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export function fmtCompact(n: number | null | undefined): string {
  if (n == null) return '—'
  return Intl.NumberFormat('en-GB', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}

export function fmtMoney(amountMinor: number, currency: string): string {
  return (amountMinor / 100).toLocaleString('en-GB', { style: 'currency', currency, maximumFractionDigits: 0 })
}

export function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`
}

export function fmtPct(n: number | null | undefined, decimals = 1): string {
  if (n == null) return '—'
  return `${n > 0 ? '+' : ''}${n.toFixed(decimals)} %`
}

export function titleCase(s: string): string {
  return s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}

export function roleLabel(role: string): string {
  const map: Record<string, string> = {
    client_owner: 'Owner',
    client_admin: 'Admin',
    client_contributor: 'Contributor',
    client_viewer: 'Viewer',
    client_contact: 'Client contact',
    verifier_manager: 'Manager',
    verifier_team_leader: 'Team leader',
    verifier_auditor: 'Auditor',
    verifier_technical_expert: 'Technical expert',
    verifier_independent_reviewer: 'Independent reviewer',
    verifier_coordinator: 'Coordinator',
    verifier_finance: 'Finance',
    platform_admin: 'Platform administrator',
  }
  return map[role] ?? titleCase(role)
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    not_started: 'Not started',
    planned: 'Planned',
    in_progress: 'In progress',
    on_hold: 'On hold',
    blocked: 'Blocked',
    completed: 'Completed',
    skipped: 'Skipped',
    draft: 'Draft',
    requested: 'Requested',
    triage: 'In triage',
    contracting: 'Contracting',
    planning: 'Planning',
    execution: 'Execution',
    opinion_review: 'Opinion review',
    issued: 'Issued',
    closed: 'Closed',
    cancelled: 'Cancelled',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    open: 'Open',
    responded: 'Responded',
    under_review: 'Under review',
    withdrawn: 'Withdrawn',
    independent_review: 'Independent review',
    changes_requested: 'Changes requested',
    ir_approved: 'IR approved',
    manager_review: 'Manager review',
    submitted: 'Submitted',
    under_verification: 'Under verification',
    verified: 'Verified',
    superseded: 'Superseded',
    empty: 'Missing',
    accepted: 'Accepted',
    uploaded: 'Uploaded',
    checked: 'Checked',
    required: 'Declaration required',
    declared: 'Declared',
    paid: 'Paid',
    sent: 'Sent',
    overdue: 'Overdue',
    void: 'Void',
    nominated: 'Nominated',
    active: 'Active',
  }
  return map[status] ?? titleCase(status)
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}
