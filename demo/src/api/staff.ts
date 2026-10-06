/** Staff administration: clients, templates, users of an org. */
import type { FlagState } from '@/domain/enums'
import { WorkflowTemplate as WorkflowTemplateSchema, validateTemplate, type WorkflowTemplate } from '@/domain/workflow/template.schema'
import { ApiError, audit, authorize, call, getStore, userName } from './core'
import { listSync as featuresSync, type FeatureView } from './features'
import { requireReason } from './steps'

export interface ClientRow {
  orgId: string
  name: string
  legalName: string
  country: string
  users: number
  ongoing: number
  closed: number
  verifiedInventories: number
  verifiedUnits: number
  flags: FeatureView[]
  /** R2 portfolios (PRD FR-78), read-only in R1. */
  portfolioManagerName: string | null
}

export async function clients(): Promise<ClientRow[]> {
  return call(() => {
    authorize('staff.clients')
    const s = getStore()
    return s
      .where('organisations', (o) => o.type === 'client')
      .map((o) => {
        const services = s.where('services', (x) => x.org_id === o.id && !x.deleted_at)
        return {
          orgId: o.id,
          name: o.name,
          legalName: o.legal_name,
          country: o.country,
          users: s.where('memberships', (m) => m.org_id === o.id && m.status === 'active').length,
          ongoing: services.filter((x) => !['draft', 'closed', 'cancelled'].includes(x.status)).length,
          closed: services.filter((x) => x.status === 'closed').length,
          verifiedInventories: s.where('inventories', (i) => i.org_id === o.id && i.status === 'verified').length,
          verifiedUnits: s.where('decarbRecords', (d) => d.org_id === o.id && d.status === 'verified').reduce((a, d) => a + (d.verified_reduction_units ?? 0) + (d.verified_removal_units ?? 0), 0),
          flags: featuresSync(o.id),
          portfolioManagerName: o.portfolio_manager_user_id ? (s.find('users', o.portfolio_manager_user_id)?.name ?? null) : null,
        }
      })
  })
}

export async function templates(): Promise<WorkflowTemplate[]> {
  return call(() => {
    authorize('staff.templates')
    return getStore().all('templates')
  })
}

export interface TemplatePatch {
  /** Step key → new value of the lock (PRD v0.3 FR-80). */
  nonOverridable?: Record<string, boolean>
  materialityDefaults?: WorkflowTemplate['materiality_defaults']
  competenceRequirements?: WorkflowTemplate['competence_requirements']
  rotationRules?: WorkflowTemplate['rotation_rules']
  complaintTargets?: WorkflowTemplate['complaint_targets']
  blockingFindingTypes?: WorkflowTemplate['blocking_finding_types']
  retentionYears?: number | null
}

/**
 * Manager edits a template (PRD FR-10, FR-80): a reason is mandatory, the result must validate, and a new version
 * becomes active for new services. Running services keep their copied steps (§8.5).
 */
export async function updateTemplate(templateId: string, patch: TemplatePatch, reason: string): Promise<WorkflowTemplate> {
  return call(() => {
    const ctx = authorize('template.edit')
    const r = requireReason(reason)
    const s = getStore()
    const current = s.get('templates', templateId)
    const next: WorkflowTemplate = WorkflowTemplateSchema.parse(JSON.parse(JSON.stringify(current)))
    if (patch.nonOverridable) for (const p of next.phases) for (const st of p.steps) if (patch.nonOverridable[st.key] !== undefined) st.non_overridable = patch.nonOverridable[st.key]
    if (patch.materialityDefaults !== undefined) next.materiality_defaults = patch.materialityDefaults
    if (patch.competenceRequirements) next.competence_requirements = patch.competenceRequirements
    if (patch.rotationRules) next.rotation_rules = patch.rotationRules
    if (patch.complaintTargets) next.complaint_targets = patch.complaintTargets
    if (patch.blockingFindingTypes) next.blocking_finding_types = patch.blockingFindingTypes
    if (patch.retentionYears !== undefined) next.retention_years = patch.retentionYears
    const errors = validateTemplate(next)
    if (errors.length) throw new ApiError('validation', errors.join(' '), { code: 'template_invalid', errors })
    next.version = current.version + 1
    next.last_edit_reason = r
    // The previous version stays in the table (inactive) so running services can still be read against it.
    s.update('templates', templateId, { is_active: false }, ctx.userId)
    const row: WorkflowTemplate = { ...next, id: `${templateId}_v${next.version}` }
    s.insert('templates', row)
    audit(ctx, { orgId: 'org_verifassur', serviceId: null, eventType: 'template.edited', entityType: 'workflow_template', entityId: row.id, summary: `Template "${current.name}" saved as version ${next.version} by ${userName(ctx.userId)} (${Object.keys(patch).join(', ')}) — ${r}`, reason: r, before: { version: current.version, non_overridable: Object.fromEntries(current.phases.flatMap((p) => p.steps).map((st) => [st.key, st.non_overridable])) }, after: { version: next.version, non_overridable: Object.fromEntries(next.phases.flatMap((p) => p.steps).map((st) => [st.key, st.non_overridable])), patch } })
    return row
  })
}

export interface OrgUser {
  id: string
  name: string
  email: string
  jobTitle: string
  role: string
}

export async function orgUsers(orgId: string): Promise<OrgUser[]> {
  return call(() => {
    authorize('org.read', { orgId })
    const s = getStore()
    return s.where('memberships', (m) => m.org_id === orgId && m.status === 'active').map((m) => {
      const u = s.get('users', m.user_id)
      return { id: u.id, name: u.name, email: u.email, jobTitle: u.job_title ?? '', role: m.role }
    })
  })
}

export type { FlagState }
