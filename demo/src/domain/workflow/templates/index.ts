/**
 * Service-type workflow templates (PRD FR-10, FR-11). Templates are data: the common Contracting and Planning
 * phases are shared, and Execution differs per service type (document slots and step names).
 * Phase II stores these as JSON rows in `workflow_templates`.
 */
import type { ServiceType } from '../../enums'
import { SERVICE_TYPE_LABELS } from '../../enums'
import type { PhaseTemplate, SlotTemplate, StepTemplate, WorkflowTemplate } from '../template.schema'
import { WorkflowTemplate as WorkflowTemplateSchema } from '../template.schema'

const VERIFIER_ORG_ID = 'org_verifassur'

const slot = (
  key: string,
  name: string,
  category: SlotTemplate['category'],
  uploader_party: SlotTemplate['uploader_party'],
  required = true,
  description = '',
): SlotTemplate => ({ key, name, category, uploader_party, required, description })

const contracting: PhaseTemplate = {
  key: 'contracting',
  name: 'Contracting',
  steps: [
    {
      key: 'pre_engagement',
      name: 'Pre-engagement form',
      description: 'The client describes scope, boundary, period and sites so VERIFASSUR can assess the engagement.',
      owner_role: 'client_contact',
      planned_duration_days: 5,
      parallel_allowed: false,
      slots: [slot('cpf', 'Client pre-engagement form (CPF)', 'contract', 'client', true, 'Generated from the request; attach the signed version.')],
      approvals: [],
      checklist: [],
      is_opinion_step: false,
    },
    {
      key: 'desk_review_cpf',
      name: 'Review of the CPF',
      description: 'Technical scope and impartiality are assessed before any work starts.',
      owner_role: 'verifier_manager',
      planned_duration_days: 3,
      parallel_allowed: false,
      slots: [],
      approvals: [
        { kind: 'technical_scope', label: 'Technical scope' },
        { kind: 'impartiality', label: 'Impartiality risk' },
      ],
      checklist: [],
      is_opinion_step: false,
    },
    {
      key: 'team_nomination',
      name: 'Team nomination',
      description: 'Team members are nominated and each declares conflicts of interest.',
      owner_role: 'verifier_manager',
      planned_duration_days: 3,
      parallel_allowed: false,
      slots: [],
      approvals: [],
      checklist: [],
      is_opinion_step: false,
    },
    {
      key: 'contract_review',
      name: 'Contract review',
      description: 'Quote and contract are prepared and reviewed.',
      owner_role: 'verifier_coordinator',
      planned_duration_days: 5,
      parallel_allowed: false,
      slots: [
        slot('quote', 'Quote', 'contract', 'verifier'),
        slot('contract', 'Contract', 'contract', 'verifier'),
      ],
      approvals: [{ kind: 'contract', label: 'Contract review' }],
      checklist: [],
      is_opinion_step: false,
    },
    {
      key: 'service_agreement',
      name: 'V&V service agreement',
      description: 'The client accepts the service agreement in the platform.',
      owner_role: 'client_contact',
      planned_duration_days: 5,
      parallel_allowed: false,
      slots: [slot('msa', 'Service agreement (MSA)', 'contract', 'verifier')],
      approvals: [{ kind: 'agreement_acceptance', label: 'Service agreement acceptance' }],
      checklist: [],
      is_opinion_step: false,
    },
  ],
}

const planning: PhaseTemplate = {
  key: 'planning',
  name: 'Planning',
  steps: [
    {
      key: 'audit_plan',
      name: 'Audit plan',
      description: 'Risk and materiality assessment, sampling approach, sites and schedule.',
      owner_role: 'verifier_team_leader',
      planned_duration_days: 7,
      parallel_allowed: false,
      slots: [slot('audit_plan', 'Audit plan', 'phase', 'verifier')],
      approvals: [{ kind: 'audit_plan', label: 'Audit plan acceptance' }],
      checklist: [],
      is_opinion_step: false,
    },
  ],
}

function executionPhase(deskSlots: SlotTemplate[], dataStep: { key: string; name: string; description: string; slots: SlotTemplate[] }): PhaseTemplate {
  const steps: StepTemplate[] = [
    {
      key: 'desk_review',
      name: 'Desk review',
      description: 'Evidence is reviewed against the standard before the audit.',
      owner_role: 'verifier_auditor',
      planned_duration_days: 10,
      parallel_allowed: false,
      slots: deskSlots,
      approvals: [],
      checklist: [],
      is_opinion_step: false,
    },
    {
      key: dataStep.key,
      name: dataStep.name,
      description: dataStep.description,
      owner_role: 'verifier_auditor',
      planned_duration_days: 10,
      parallel_allowed: true,
      slots: dataStep.slots,
      approvals: [],
      checklist: [],
      is_opinion_step: false,
    },
    {
      key: 'remote_onsite_audit',
      name: 'Remote / on-site audit',
      description: 'Interviews, site evidence and sampling.',
      owner_role: 'verifier_team_leader',
      planned_duration_days: 7,
      parallel_allowed: false,
      slots: [
        slot('site_visit_plan', 'Site visit plan', 'phase', 'verifier', false),
        slot('interview_log', 'Interview log', 'phase', 'verifier', false),
      ],
      approvals: [],
      checklist: [],
      is_opinion_step: false,
    },
    {
      key: 'reporting',
      name: 'Reporting',
      description: 'Findings are resolved and the verification report is drafted.',
      owner_role: 'verifier_team_leader',
      planned_duration_days: 10,
      parallel_allowed: false,
      slots: [],
      approvals: [],
      checklist: [],
      is_opinion_step: false,
    },
    {
      key: 'final_opinion',
      name: 'Final opinion',
      description: 'Opinion iterations: team leader draft, independent review, manager approval.',
      owner_role: 'verifier_team_leader',
      planned_duration_days: 7,
      parallel_allowed: false,
      slots: [],
      approvals: [],
      checklist: [],
      is_opinion_step: true,
    },
    {
      key: 'final_submission',
      name: 'Final submission',
      description: 'Signed opinion delivered to the client and, where applicable, the registry.',
      owner_role: 'verifier_coordinator',
      planned_duration_days: 3,
      parallel_allowed: false,
      slots: [slot('signed_opinion', 'Signed opinion statement', 'reporting', 'verifier')],
      approvals: [],
      checklist: [],
      is_opinion_step: false,
    },
  ]
  return { key: 'execution', name: 'Execution', steps }
}

const projectDeskSlots = [
  slot('pdd', 'Project design document (PDD)', 'phase', 'client'),
  slot('ercs', 'Emission reduction calculation sheet (ERCS)', 'phase', 'client'),
  slot('monitoring_plan', 'Monitoring plan', 'phase', 'client'),
  slot('baseline_survey', 'Baseline survey report', 'phase', 'client', false),
  slot('eia', 'Environmental impact assessment', 'supporting', 'client', false),
]

const inventoryDeskSlots = [
  slot('inventory_workbook', 'GHG inventory workbook', 'phase', 'client'),
  slot('methodology', 'Inventory methodology and boundary description', 'phase', 'client'),
  slot('activity_data', 'Activity data samples (invoices, meter readings)', 'phase', 'client'),
  slot('org_chart', 'Organisational boundary / entity list', 'supporting', 'client', false),
]

const productDeskSlots = [
  slot('pcf_study', 'Product carbon footprint study', 'phase', 'client'),
  slot('lca_model', 'LCA model export and inventory table', 'phase', 'client'),
  slot('bom', 'Bill of materials and supplier data', 'phase', 'client'),
  slot('allocation_note', 'Allocation and cut-off justification', 'supporting', 'client', false),
]

const decarbDeskSlots = [
  slot('intervention_description', 'Intervention description and boundary', 'phase', 'client'),
  slot('baseline_evidence', 'Baseline emission evidence (per gas)', 'phase', 'client'),
  slot('project_evidence', 'Project emission evidence (per gas)', 'phase', 'client'),
  slot('volume_evidence', 'Attributed volume evidence (purchase records)', 'phase', 'client'),
  slot('supplier_attestation', 'Supplier attestation', 'supporting', 'client', false),
]

const monitoringStep = {
  key: 'monitoring_report',
  name: 'Monitoring report',
  description: 'Monitoring data and the monitoring report are checked for the period.',
  slots: [slot('monitoring_report', 'Monitoring report', 'phase', 'client'), slot('monitoring_data', 'Monitoring data export', 'phase', 'client', false)],
}
const inventoryDataStep = {
  key: 'data_review',
  name: 'Data review',
  description: 'Declared inventory lines are traced to activity data and emission factors.',
  slots: [slot('ef_sources', 'Emission factor sources', 'phase', 'client', false)],
}
const productDataStep = {
  key: 'data_review',
  name: 'Data review',
  description: 'Unit processes, allocation and data quality are traced.',
  slots: [slot('primary_data', 'Primary data collection sheets', 'phase', 'client', false)],
}
const decarbDataStep = {
  key: 'data_review',
  name: 'Baseline and project data review',
  description: 'Baseline method, per-gas profiles and attributed volumes are traced to evidence.',
  slots: [slot('method_note', 'Baseline method justification', 'phase', 'client', false)],
}
const designChangeDataStep = {
  key: 'design_change_assessment',
  name: 'Design change assessment',
  description: 'The requested change is assessed against the original validation.',
  slots: [slot('change_description', 'Description of the design change', 'phase', 'client')],
}

const IR_CHECKLIST = [
  { key: 'scope', label: 'Scope and boundary of the opinion match the agreement' },
  { key: 'evidence', label: 'Evidence supports every verified figure' },
  { key: 'findings', label: 'All blocking findings closed' },
  { key: 'calc', label: 'Calculation checks reperformed on a sample' },
  { key: 'wording', label: 'Opinion wording follows the standard template' },
]
const MANAGER_CHECKLIST = [
  { key: 'ir', label: 'Independent review completed and approved' },
  { key: 'impartiality', label: 'No impartiality threats arose during the engagement' },
  { key: 'competence', label: 'Team competence covered the technical scope' },
  { key: 'sign', label: 'Ready to sign and issue' },
]

interface TypeConfig {
  standard: string
  desk: SlotTemplate[]
  data: { key: string; name: string; description: string; slots: SlotTemplate[] }
}

const CONFIG: Record<ServiceType, TypeConfig> = {
  vcs_validation: { standard: 'Verra VCS Standard v4.x', desk: projectDeskSlots, data: monitoringStep },
  vcs_verification: { standard: 'Verra VCS Standard v4.x', desk: projectDeskSlots, data: monitoringStep },
  gs_validation: { standard: 'Gold Standard for the Global Goals', desk: projectDeskSlots, data: monitoringStep },
  gs_verification: { standard: 'Gold Standard for the Global Goals', desk: projectDeskSlots, data: monitoringStep },
  iso14064_1_inventory_verification: { standard: 'ISO 14064-1:2018 / ISO 14064-3:2019', desk: inventoryDeskSlots, data: inventoryDataStep },
  iso14067_product_verification: { standard: 'ISO 14067:2018 / ISO 14064-3:2019', desk: productDeskSlots, data: productDataStep },
  decarb_units_verification: { standard: 'ISO 14064-2:2019 / ISO 14064-3:2019', desk: decarbDeskSlots, data: decarbDataStep },
  design_change: { standard: 'Verra VCS Standard v4.x', desk: projectDeskSlots.slice(0, 2), data: designChangeDataStep },
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = (Object.keys(CONFIG) as ServiceType[]).map((type) => {
  const cfg = CONFIG[type]
  return WorkflowTemplateSchema.parse({
    id: `tpl_${type}`,
    verifier_org_id: VERIFIER_ORG_ID,
    service_type: type,
    name: SERVICE_TYPE_LABELS[type],
    standard: cfg.standard,
    version: 1,
    is_active: true,
    phases: [contracting, planning, executionPhase(cfg.desk, cfg.data)],
    ir_checklist: IR_CHECKLIST,
    manager_checklist: MANAGER_CHECKLIST,
  })
})

export function templateFor(type: ServiceType): WorkflowTemplate {
  const t = WORKFLOW_TEMPLATES.find((x) => x.service_type === type && x.is_active)
  if (!t) throw new Error(`No active template for ${type}`)
  return t
}

export function templateById(id: string): WorkflowTemplate | undefined {
  return WORKFLOW_TEMPLATES.find((x) => x.id === id)
}
