/**
 * Workflow template schema (PRD FR-10, §8.5). Programme-variable rules are template data, never code (PRD v0.3):
 * `non_overridable` steps, assurance applicability, materiality defaults, competence requirements, rotation rules
 * and complaint targets all live here and are copied into the service at instantiation.
 */
import { z } from 'zod'
import {
  APPROVAL_KINDS,
  ASSERTION_BASES,
  FINDING_TYPES,
  LEVELS_OF_ASSURANCE,
  MATERIALITY_BASES,
  ON_BREACH,
  PARTIES,
  PHASE_KEYS,
  QUALIFICATION_KINDS,
  ROTATION_ROLES,
  ROTATION_SCOPES,
  SERVICE_ROLES,
  SERVICE_TYPES,
  SLOT_CATEGORIES,
  type ApprovalKind,
} from '../enums'

export const SlotTemplate = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(''),
  category: z.enum(SLOT_CATEGORIES),
  required: z.boolean(),
  uploader_party: z.enum(PARTIES),
})
export type SlotTemplate = z.infer<typeof SlotTemplate>

export const ApprovalTemplate = z.object({
  kind: z.enum(APPROVAL_KINDS),
  label: z.string().min(1),
})
export type ApprovalTemplate = z.infer<typeof ApprovalTemplate>

export const StepTemplate = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(''),
  owner_role: z.enum(SERVICE_ROLES),
  planned_duration_days: z.number().int().positive(),
  parallel_allowed: z.boolean().default(false),
  slots: z.array(SlotTemplate).default([]),
  approvals: z.array(ApprovalTemplate).default([]),
  checklist: z.array(z.object({ key: z.string(), label: z.string() })).default([]),
  /** Marks the step whose completion is driven by opinion iterations. */
  is_opinion_step: z.boolean().default(false),
  /** PRD v0.3 FR-80: a manager override may never force this step to completed or skipped (reopen stays allowed). */
  non_overridable: z.boolean().default(false),
})
export type StepTemplate = z.infer<typeof StepTemplate>

export const PhaseTemplate = z.object({
  key: z.enum(PHASE_KEYS),
  name: z.string().min(1),
  steps: z.array(StepTemplate).min(1),
})
export type PhaseTemplate = z.infer<typeof PhaseTemplate>

/** PRD v0.3 FR-81. */
export const AssuranceTemplate = z.object({
  applies: z.boolean(),
  default: z.enum(LEVELS_OF_ASSURANCE),
})
export type AssuranceTemplate = z.infer<typeof AssuranceTemplate>

/** PRD v0.3 FR-84. */
export const MaterialityDefaults = z.object({
  assertion_base: z.enum(ASSERTION_BASES),
  threshold_pct: z.number().min(0).max(100),
  basis: z.enum(MATERIALITY_BASES),
  basis_note: z.string().default(''),
  qualitative: z.array(z.string()).default([]),
})
export type MaterialityDefaults = z.infer<typeof MaterialityDefaults>

/** PRD v0.3 FR-95. */
export const CompetenceRequirements = z.object({
  roles: z.record(z.enum(SERVICE_ROLES), z.object({ qualification: z.enum(QUALIFICATION_KINDS), programme: z.string().nullable().default(null) })).default({}),
  /** The team as a whole must cover the service's sector scopes and technical areas. */
  team_coverage: z.boolean().default(true),
})
export type CompetenceRequirements = z.infer<typeof CompetenceRequirements>

/** PRD v0.3 FR-97. */
export const RotationRule = z.object({
  role: z.enum(ROTATION_ROLES),
  scope: z.enum(ROTATION_SCOPES),
  max_consecutive: z.number().int().positive(),
  cooling_off_periods: z.number().int().nonnegative().default(1),
  on_breach: z.enum(ON_BREACH),
})
export type RotationRule = z.infer<typeof RotationRule>

export const ComplaintTargets = z.object({
  acknowledge_days: z.number().int().positive(),
  decide_days: z.number().int().positive(),
})
export type ComplaintTargets = z.infer<typeof ComplaintTargets>

export const WorkflowTemplate = z.object({
  id: z.string().min(1),
  verifier_org_id: z.string().min(1),
  service_type: z.enum(SERVICE_TYPES),
  name: z.string().min(1),
  standard: z.string().min(1),
  version: z.number().int().positive(),
  is_active: z.boolean().default(true),
  phases: z.array(PhaseTemplate).length(3),
  ir_checklist: z.array(z.object({ key: z.string(), label: z.string() })).default([]),
  manager_checklist: z.array(z.object({ key: z.string(), label: z.string() })).default([]),
  // PRD v0.3
  assurance: AssuranceTemplate.default({ applies: true, default: 'reasonable' }),
  materiality_defaults: MaterialityDefaults.nullable().default(null),
  competence_requirements: CompetenceRequirements.default({ roles: {}, team_coverage: true }),
  rotation_rules: z.array(RotationRule).default([]),
  complaint_targets: ComplaintTargets.default({ acknowledge_days: 5, decide_days: 30 }),
  blocking_finding_types: z.array(z.enum(FINDING_TYPES)).default(['CAR']),
  /** Programme-specific retention; null falls back to the platform setting (PRD §9.5). */
  retention_years: z.number().int().positive().nullable().default(null),
  /** Reason recorded with the last edit (PRD FR-10). */
  last_edit_reason: z.string().nullable().default(null),
})
export type WorkflowTemplate = z.infer<typeof WorkflowTemplate>

/** Approval kinds that may only sit in a `non_overridable` step (PRD FR-80, G5). */
export const PROTECTED_APPROVAL_KINDS: readonly ApprovalKind[] = ['technical_scope', 'impartiality', 'contract', 'agreement_acceptance', 'iteration_ir', 'iteration_manager']

/** Step keys that every shipped template must protect in addition to the approval rule (team nomination, final opinion). */
export const PROTECTED_STEP_KEYS: readonly string[] = ['team_nomination', 'final_opinion']

/**
 * Template validation (PRD FR-80): a template is rejected when a protected approval, the team nomination or the
 * opinion step sits in a step a manager could force to completed or skipped.
 */
export function validateTemplate(t: WorkflowTemplate): string[] {
  const errors: string[] = []
  for (const p of t.phases) {
    for (const s of p.steps) {
      if (s.non_overridable) continue
      const protectedApprovals = s.approvals.filter((a) => PROTECTED_APPROVAL_KINDS.includes(a.kind))
      if (protectedApprovals.length) errors.push(`Step "${s.name}" holds ${protectedApprovals.map((a) => a.label).join(', ')} and must be non-overridable.`)
      if (PROTECTED_STEP_KEYS.includes(s.key) || s.is_opinion_step) errors.push(`Step "${s.name}" must be non-overridable (team nomination and the final opinion cannot be skipped, PRD G5).`)
    }
  }
  if (t.assurance.applies && t.assurance.default === 'not_applicable') errors.push('A template where assurance applies needs a default level of limited or reasonable.')
  if (!t.assurance.applies && t.assurance.default !== 'not_applicable') errors.push('A template where assurance does not apply must default to not_applicable.')
  if (t.assurance.applies && !t.materiality_defaults) errors.push('A verification template needs materiality defaults.')
  return errors
}
