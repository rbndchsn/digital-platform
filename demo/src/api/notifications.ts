/** In-app notifications. */
import type { Notification } from '@/domain/schemas'
import { authContext, call, getStore, nowIsoString } from './core'

export interface NotificationView extends Notification {
  serviceReference: string | null
  /** Route hint the UI can navigate to. */
  href: string | null
}

export function toView(n: Notification): NotificationView {
  const s = getStore()
  const svc = n.service_id ? s.find('services', n.service_id) : null
  let href: string | null = svc ? `/engagements/${svc.id}` : null
  if (svc && n.entity_type === 'finding' && n.entity_id) href = `/engagements/${svc.id}/findings/${n.entity_id}`
  if (svc && n.entity_type === 'iteration') href = `/engagements/${svc.id}/opinion`
  if (svc && n.entity_type === 'statement') href = `/engagements/${svc.id}/opinion`
  if (svc && n.entity_type === 'document') href = `/engagements/${svc.id}/documents`
  if (svc && n.entity_type === 'coi') href = `/engagements/${svc.id}`
  if (n.entity_type === 'inventory' && n.entity_id) href = `/records/inventories/${n.entity_id}`
  if (n.entity_type === 'decarb_unit_record' && n.entity_id) href = `/records/decarb-units/${n.entity_id}`
  // PRD v0.3: cases open on the register of the viewer's side; competence reminders open the Competence page.
  if (n.entity_type === 'case') href = s.find('organisations', n.org_id)?.type === 'verifier' ? '/staff/cases' : '/organisation?tab=cases'
  if (n.entity_type === 'competence') href = '/staff/competence'
  return { ...n, serviceReference: svc?.reference ?? null, href }
}

export function listSync(opts: { unreadOnly?: boolean; limit?: number } = {}): NotificationView[] {
  const ctx = authContext()
  let rows = getStore().where('notifications', (n) => n.user_id === ctx.userId)
  if (opts.unreadOnly) rows = rows.filter((n) => !n.read_at)
  rows = rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  if (opts.limit) rows = rows.slice(0, opts.limit)
  return rows.map(toView)
}

export async function list(opts: { unreadOnly?: boolean; limit?: number } = {}): Promise<NotificationView[]> {
  return call(() => listSync(opts))
}

export function unreadCountSync(): number {
  try {
    const ctx = authContext()
    return getStore().where('notifications', (n) => n.user_id === ctx.userId && !n.read_at).length
  } catch {
    return 0
  }
}

export async function markRead(id: string): Promise<void> {
  return call(() => {
    const s = getStore()
    const n = s.get('notifications', id)
    if (!n.read_at) s.update('notifications', id, { read_at: nowIsoString() })
  })
}

export async function markAllRead(): Promise<void> {
  return call(() => {
    const ctx = authContext()
    const s = getStore()
    for (const n of s.where('notifications', (x) => x.user_id === ctx.userId && !x.read_at)) s.update('notifications', n.id, { read_at: nowIsoString() })
  })
}
