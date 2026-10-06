import { z } from 'zod'
import { APPROVAL_KINDS, PARTIES, PHASE_KEYS, SERVICE_ROLES, SERVICE_TYPES, SLOT_CATEGORIES } from '../enums'

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
})
export type StepTemplate = z.infer<typeof StepTemplate>

export const PhaseTemplate = z.object({
  key: z.enum(PHASE_KEYS),
  name: z.string().min(1),
  steps: z.array(StepTemplate).min(1),
})
export type PhaseTemplate = z.infer<typeof PhaseTemplate>

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
})
export type WorkflowTemplate = z.infer<typeof WorkflowTemplate>
