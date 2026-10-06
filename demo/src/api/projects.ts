/** Projects. */
import type { Programme } from '@/domain/enums'
import type { Project } from '@/domain/schemas'
import { ApiError, audit, auditNow, authContext, authorize, call, getStore, newId } from './core'

export interface ProjectView extends Project {
  serviceCount: number
  ongoingCount: number
  ownerName: string
  orgName: string
}

function view(p: Project): ProjectView {
  const s = getStore()
  const services = s.where('services', (x) => x.project_id === p.id && !x.deleted_at)
  return {
    ...p,
    serviceCount: services.length,
    ongoingCount: services.filter((x) => !['closed', 'cancelled', 'draft'].includes(x.status)).length,
    ownerName: s.find('users', p.owner_user_id)?.name ?? '—',
    orgName: s.find('organisations', p.org_id)?.name ?? '—',
  }
}

export async function list(orgId?: string): Promise<ProjectView[]> {
  return call(() => {
    const ctx = authContext()
    const target = ctx.orgType === 'client' ? ctx.orgId : orgId
    const s = getStore()
    return s.where('projects', (p) => (target ? p.org_id === target : true) && p.status === 'active').map(view)
  })
}

export async function get(projectId: string): Promise<ProjectView> {
  return call(() => {
    const p = getStore().get('projects', projectId)
    authorize('project.read', { orgId: p.org_id })
    return view(p)
  })
}

export interface ProjectInput {
  name: string
  description: string
  country: string
  region: string | null
  programme: Programme
  externalRegistryId: string | null
}

export async function create(input: ProjectInput): Promise<ProjectView> {
  return call(() => {
    const ctx = authorize('project.create')
    if (ctx.orgType !== 'client') throw new ApiError('forbidden', 'Only client organisations create projects.')
    const p: Project = {
      ...auditNow(ctx.userId),
      id: newId('prj'),
      org_id: ctx.orgId,
      name: input.name,
      description: input.description,
      country: input.country,
      region: input.region,
      programme: input.programme,
      external_registry_id: input.externalRegistryId,
      owner_user_id: ctx.userId,
      status: 'active',
    }
    getStore().insert('projects', p)
    audit(ctx, { orgId: ctx.orgId, serviceId: null, eventType: 'project.created', entityType: 'project', entityId: p.id, summary: `Project created: ${p.name}` })
    return view(p)
  })
}

export async function update(projectId: string, patch: Partial<ProjectInput>): Promise<ProjectView> {
  return call(() => {
    const s = getStore()
    const p = s.get('projects', projectId)
    const ctx = authorize('project.update', { orgId: p.org_id })
    const next: Partial<Project> = {}
    if (patch.name != null) next.name = patch.name
    if (patch.description != null) next.description = patch.description
    if (patch.country) next.country = patch.country
    if (patch.region !== undefined) next.region = patch.region
    if (patch.programme) next.programme = patch.programme
    if (patch.externalRegistryId !== undefined) next.external_registry_id = patch.externalRegistryId
    const updated = s.update('projects', projectId, next, ctx.userId)
    audit(ctx, { orgId: p.org_id, serviceId: null, eventType: 'project.updated', entityType: 'project', entityId: p.id, summary: `Project updated: ${updated.name}`, before: p, after: updated })
    return view(updated)
  })
}
