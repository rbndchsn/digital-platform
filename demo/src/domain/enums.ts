/**
 * Enumerations for the VERIFASSUR_X domain. Names and values follow the PRD
 * (planning/0001-prd-verifassurx-platform.md §3.2, §8.5, §9.3) so Phase II can lift this file unchanged.
 */

export const ORG_TYPES = ['verifier', 'client'] as const
export type OrgType = (typeof ORG_TYPES)[number]

export const CLIENT_ROLES = ['client_owner', 'client_admin', 'client_contributor', 'client_viewer'] as const
export type ClientRole = (typeof CLIENT_ROLES)[number]

/**
 * Verifier org roles. `platform_admin` (ADMIN, PRD §3.2 v0.2) is an org-level role on the verifier org:
 * it administers the platform and holds no engagement power (plan_v1 §8 D1).
 */
export const VERIFIER_ROLES = [
  'verifier_manager',
  'verifier_team_leader',
  'verifier_auditor',
  'verifier_technical_expert',
  'verifier_independent_reviewer',
  'verifier_coordinator',
  'verifier_finance',
  'platform_admin',
] as const
export type VerifierRole = (typeof VERIFIER_ROLES)[number]

export const PLATFORM_ROLES = ['platform_admin'] as const
export type PlatformRole = (typeof PLATFORM_ROLES)[number]

export const ORG_ROLES = [...CLIENT_ROLES, ...VERIFIER_ROLES] as const
export type OrgRole = (typeof ORG_ROLES)[number]

/** Roles a person can hold on a service team. ADMIN is never on a team. */
export const SERVICE_ROLES = ['verifier_manager', 'verifier_team_leader', 'verifier_auditor', 'verifier_technical_expert', 'verifier_independent_reviewer', 'verifier_coordinator', 'verifier_finance', 'client_contact'] as const
export type ServiceRole = (typeof SERVICE_ROLES)[number]

/** Manager overrides (PRD §6.14). */
export const STEP_OVERRIDE_ACTIONS = ['complete', 'reopen', 'skip'] as const
export type StepOverrideAction = (typeof STEP_OVERRIDE_ACTIONS)[number]

export const SERVICE_OVERRIDE_ACTIONS = ['hold', 'resume', 'cancel', 'close', 'return_to_execution', 'change_assurance_level'] as const
export type ServiceOverrideAction = (typeof SERVICE_OVERRIDE_ACTIONS)[number]

/** Minimum length of the mandatory reason on overrides and ADMIN actions. */
export const OVERRIDE_REASON_MIN_LENGTH = 10

export const ANNOUNCEMENT_TONES = ['info', 'warning', 'success'] as const
export type AnnouncementTone = (typeof ANNOUNCEMENT_TONES)[number]

export const ANNOUNCEMENT_AUDIENCES = ['all', 'clients', 'staff'] as const
export type AnnouncementAudience = (typeof ANNOUNCEMENT_AUDIENCES)[number]

export const SERVICE_TYPES = [
  'vcs_validation',
  'vcs_verification',
  'gs_validation',
  'gs_verification',
  'iso14064_1_inventory_verification',
  'iso14067_product_verification',
  'decarb_units_verification',
  'design_change',
] as const
export type ServiceType = (typeof SERVICE_TYPES)[number]

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  vcs_validation: 'VCS project validation',
  vcs_verification: 'VCS project verification',
  gs_validation: 'Gold Standard project validation',
  gs_verification: 'Gold Standard project verification',
  iso14064_1_inventory_verification: 'Corporate GHG inventory verification (ISO 14064-1)',
  iso14067_product_verification: 'Product carbon footprint verification (ISO 14067)',
  decarb_units_verification: 'decarb_units verification (value-chain intervention, ISO 14064-2)',
  design_change: 'Project design change review',
}

export const PROGRAMMES = ['verra_vcs', 'gold_standard', 'iso14064', 'iso14067', 'insetting', 'other'] as const
export type Programme = (typeof PROGRAMMES)[number]

export const PROGRAMME_LABELS: Record<Programme, string> = {
  verra_vcs: 'Verra VCS',
  gold_standard: 'Gold Standard',
  iso14064: 'ISO 14064-1',
  iso14067: 'ISO 14067',
  insetting: 'Value-chain insetting',
  other: 'Other',
}

export const SERVICE_STATUSES = [
  'draft',
  'requested',
  'triage',
  'contracting',
  'planning',
  'execution',
  'opinion_review',
  'issued',
  'closed',
  'on_hold',
  'cancelled',
  /** PRD v0.3 FR-89: an issued or closed service re-running the opinion chain after a post-issuance event. */
  'in_revision',
] as const
export type ServiceStatus = (typeof SERVICE_STATUSES)[number]

export const STEP_STATUSES = ['not_started', 'planned', 'in_progress', 'on_hold', 'blocked', 'completed', 'skipped'] as const
export type StepStatus = (typeof STEP_STATUSES)[number]
export type PhaseStatus = StepStatus

export const PHASE_KEYS = ['contracting', 'planning', 'execution'] as const
export type PhaseKey = (typeof PHASE_KEYS)[number]

export const SLOT_CATEGORIES = ['contract', 'phase', 'supporting', 'reporting', 'ir', 'checklist'] as const
export type SlotCategory = (typeof SLOT_CATEGORIES)[number]

export const SLOT_STATUSES = ['empty', 'submitted', 'accepted', 'rejected'] as const
export type SlotStatus = (typeof SLOT_STATUSES)[number]

export const PARTIES = ['client', 'verifier'] as const
export type Party = (typeof PARTIES)[number]

export const APPROVAL_KINDS = [
  'technical_scope',
  'impartiality',
  'audit_plan',
  'contract',
  'agreement_acceptance',
  'iteration_ir',
  'iteration_manager',
] as const
export type ApprovalKind = (typeof APPROVAL_KINDS)[number]

export const APPROVAL_STATUSES = ['pending', 'approved', 'rejected'] as const
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number]

export const TEAM_MEMBER_STATUSES = ['nominated', 'active', 'removed'] as const
export type TeamMemberStatus = (typeof TEAM_MEMBER_STATUSES)[number]

export const COI_DECLARATIONS = ['clear', 'potential_conflict'] as const
export type CoiDeclarationValue = (typeof COI_DECLARATIONS)[number]

export const COI_STATUSES = ['required', 'declared', 'approved', 'rejected'] as const
export type CoiStatus = (typeof COI_STATUSES)[number]

export const DOCUMENT_SOURCES = ['manual', 'import', 'api', 'mcp'] as const
export type DocumentSource = (typeof DOCUMENT_SOURCES)[number]

export const DOCUMENT_CHECK_STATUSES = ['uploaded', 'checked', 'accepted', 'rejected'] as const
export type DocumentCheckStatus = (typeof DOCUMENT_CHECK_STATUSES)[number]

export const EVIDENCE_ENTITY_TYPES = [
  'inventory_line',
  'inventory_line_gas',
  'emission_factor',
  'decarb_unit_record',
  'emission_profile',
  'emission_profile_gas',
  'finding_response',
  'misstatement',
  'post_issuance_event',
  'case_note',
  'competence_qualification',
] as const
export type EvidenceEntityType = (typeof EVIDENCE_ENTITY_TYPES)[number]

export const FINDING_TYPES = ['CAR', 'CL', 'FAR', 'OBS'] as const
export type FindingType = (typeof FINDING_TYPES)[number]

export const FINDING_TYPE_LABELS: Record<FindingType, string> = {
  CAR: 'Corrective action request',
  CL: 'Clarification request',
  FAR: 'Forward action request',
  OBS: 'Observation',
}

export const FINDING_SEVERITIES = ['major', 'minor', 'info'] as const
export type FindingSeverity = (typeof FINDING_SEVERITIES)[number]

export const FINDING_STATUSES = ['open', 'responded', 'under_review', 'closed', 'withdrawn'] as const
export type FindingStatus = (typeof FINDING_STATUSES)[number]

export const ITERATION_STATUSES = [
  'draft',
  'independent_review',
  'changes_requested',
  'ir_approved',
  'manager_review',
  'approved',
  'issued',
] as const
export type IterationStatus = (typeof ITERATION_STATUSES)[number]

export const ITERATION_DOC_ROLES = [
  'report',
  'findings_report',
  'opinion',
  'calc_check',
  'ir_report',
  'ir_checklist',
  'manager_checklist',
] as const
export type IterationDocRole = (typeof ITERATION_DOC_ROLES)[number]

export const OPINION_TYPES = [
  'unqualified',
  'qualified',
  'adverse',
  'disclaimer',
  'validation_positive',
  'validation_negative',
] as const
export type OpinionType = (typeof OPINION_TYPES)[number]

/** PRD v0.3 FR-81: `not_applicable` is used by validation service types whose template sets `assurance.applies = false`. */
export const LEVELS_OF_ASSURANCE = ['limited', 'reasonable', 'not_applicable'] as const
export type LevelOfAssurance = (typeof LEVELS_OF_ASSURANCE)[number]

export const LEVEL_OF_ASSURANCE_LABELS: Record<LevelOfAssurance, string> = {
  limited: 'Limited assurance',
  reasonable: 'Reasonable assurance',
  not_applicable: 'Validation (no assurance level)',
}

/** PRD v0.3 FR-82: inventory lines carry a review status, never an individual verified value. */
export const REVIEW_STATUSES = ['not_reviewed', 'accepted', 'adjusted', 'not_individually_tested'] as const
export type ReviewStatus = (typeof REVIEW_STATUSES)[number]

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  not_reviewed: 'Not reviewed',
  accepted: 'Accepted',
  adjusted: 'Adjusted',
  not_individually_tested: 'Not individually tested',
}

/** PRD v0.3 FR-83: status of the assurance reference carried by a record. */
export const ASSURANCE_STATUSES = ['verified', 'superseded', 'withdrawn'] as const
export type AssuranceStatus = (typeof ASSURANCE_STATUSES)[number]

/** PRD v0.3 §8.5: an issued statement is terminal once superseded or withdrawn. */
export const STATEMENT_STATUSES = ['issued', 'superseded', 'withdrawn'] as const
export type StatementStatus = (typeof STATEMENT_STATUSES)[number]

export const WITHDRAWAL_PUBLIC_CATEGORIES = ['error_in_statement', 'misrepresentation_by_client', 'programme_decision', 'other'] as const
export type WithdrawalPublicCategory = (typeof WITHDRAWAL_PUBLIC_CATEGORIES)[number]

export const WITHDRAWAL_PUBLIC_CATEGORY_LABELS: Record<WithdrawalPublicCategory, string> = {
  error_in_statement: 'Error in the statement',
  misrepresentation_by_client: 'Misrepresentation by the client',
  programme_decision: 'Programme decision',
  other: 'Other',
}

/** PRD v0.3 FR-88–90. */
export const POST_ISSUANCE_TRIGGERS = ['verifier', 'client', 'complaint', 'appeal', 'programme', 'other'] as const
export type PostIssuanceTrigger = (typeof POST_ISSUANCE_TRIGGERS)[number]

export const POST_ISSUANCE_OUTCOMES = ['no_action', 'revise', 'withdraw'] as const
export type PostIssuanceOutcome = (typeof POST_ISSUANCE_OUTCOMES)[number]

export const POST_ISSUANCE_STATUSES = ['open', 'decided', 'closed'] as const
export type PostIssuanceStatus = (typeof POST_ISSUANCE_STATUSES)[number]

/** PRD v0.3 FR-84: what the materiality percentage applies to. Template data. */
export const ASSERTION_BASES = ['total_gross_tco2e', 'scope_1_2_gross_tco2e', 'ef_value', 'reduction_units'] as const
export type AssertionBase = (typeof ASSERTION_BASES)[number]

export const ASSERTION_BASE_LABELS: Record<AssertionBase, string> = {
  total_gross_tco2e: 'Total gross emissions (tCO2e)',
  scope_1_2_gross_tco2e: 'Scope 1 and 2 gross emissions (tCO2e)',
  ef_value: 'Product emission factor value',
  reduction_units: 'Reduction decarb_units (tCO2e)',
}

export const MATERIALITY_BASES = ['programme_rule', 'verifier_judgement'] as const
export type MaterialityBasis = (typeof MATERIALITY_BASES)[number]

export const MATERIALITY_STATUSES = ['draft', 'approved'] as const
export type MaterialityStatus = (typeof MATERIALITY_STATUSES)[number]

/** PRD v0.3 FR-85. */
export const MISSTATEMENT_SOURCES = ['system', 'finding', 'manual'] as const
export type MisstatementSource = (typeof MISSTATEMENT_SOURCES)[number]

export const MISSTATEMENT_DIRECTIONS = ['overstatement', 'understatement'] as const
export type MisstatementDirection = (typeof MISSTATEMENT_DIRECTIONS)[number]

export const MISSTATEMENT_NATURES = ['quantitative', 'qualitative'] as const
export type MisstatementNature = (typeof MISSTATEMENT_NATURES)[number]

export const MISSTATEMENT_STATUSES = ['proposed', 'confirmed', 'dismissed'] as const
export type MisstatementStatus = (typeof MISSTATEMENT_STATUSES)[number]

export const MISSTATEMENT_RECORD_TYPES = ['inventory', 'emission_factor', 'decarb_unit_record'] as const
export type MisstatementRecordType = (typeof MISSTATEMENT_RECORD_TYPES)[number]

/** PRD v0.3 FR-91–92: complaints and appeals. */
export const CASE_KINDS = ['complaint', 'appeal'] as const
export type CaseKind = (typeof CASE_KINDS)[number]

export const CASE_STATUSES = ['received', 'acknowledged', 'under_investigation', 'decided', 'closed', 'withdrawn_by_complainant'] as const
export type CaseStatus = (typeof CASE_STATUSES)[number]

export const CASE_OUTCOMES = ['upheld', 'partly_upheld', 'not_upheld', 'withdrawn'] as const
export type CaseOutcome = (typeof CASE_OUTCOMES)[number]

export const CASE_DECISION_ENTITY_TYPES = ['service', 'approval', 'document_version', 'finding', 'opinion_iteration', 'opinion_statement'] as const
export type CaseDecisionEntityType = (typeof CASE_DECISION_ENTITY_TYPES)[number]

/** PRD v0.3 FR-94–96: competence. */
export const QUALIFICATION_KINDS = ['lead_verifier', 'verifier', 'independent_reviewer', 'technical_expert', 'lead_validator', 'validator'] as const
export type QualificationKind = (typeof QUALIFICATION_KINDS)[number]

export const QUALIFICATION_KIND_LABELS: Record<QualificationKind, string> = {
  lead_verifier: 'Lead verifier',
  verifier: 'Verifier',
  independent_reviewer: 'Independent reviewer',
  technical_expert: 'Technical expert',
  lead_validator: 'Lead validator',
  validator: 'Validator',
}

export const QUALIFICATION_STATUSES = ['valid', 'expiring', 'expired'] as const
export type QualificationStatus = (typeof QUALIFICATION_STATUSES)[number]

/** Days before expiry at which a qualification is shown as `expiring` and reminders start (PRD FR-94). */
export const QUALIFICATION_EXPIRING_DAYS = 90

/** PRD v0.3 FR-97–98: rotation rules. */
export const ROTATION_SCOPES = ['same_project', 'same_client'] as const
export type RotationScope = (typeof ROTATION_SCOPES)[number]

export const ROTATION_ROLES = ['verifier_team_leader', 'verifier_auditor', 'verifier_technical_expert', 'verifier_independent_reviewer', 'vvb'] as const
export type RotationRole = (typeof ROTATION_ROLES)[number]

export const ON_BREACH = ['warn', 'block'] as const
export type OnBreach = (typeof ON_BREACH)[number]

/** Outcome of a competence or rotation check item. */
export const CHECK_RESULTS = ['ok', 'warning', 'block'] as const
export type CheckResult = (typeof CHECK_RESULTS)[number]

export const CONSOLIDATION_APPROACHES = ['operational_control', 'financial_control', 'equity_share'] as const
export type ConsolidationApproach = (typeof CONSOLIDATION_APPROACHES)[number]

export const GWP_SETS = ['AR5', 'AR6'] as const
export type GwpSet = (typeof GWP_SETS)[number]

export const RECORD_STATUSES = ['draft', 'submitted', 'under_verification', 'verified', 'superseded', 'withdrawn'] as const
export type RecordStatus = (typeof RECORD_STATUSES)[number]

export const SCOPES = [1, 2, 3] as const
export type Scope = (typeof SCOPES)[number]

export const SCOPE_CATEGORIES = [
  's1_stationary_combustion',
  's1_mobile_combustion',
  's1_process',
  's1_fugitive',
  's1_land_use',
  's2_location_based',
  's2_market_based',
  's3_c1_purchased_goods_services',
  's3_c2_capital_goods',
  's3_c3_fuel_energy_related',
  's3_c4_upstream_transport',
  's3_c5_waste_in_operations',
  's3_c6_business_travel',
  's3_c7_employee_commuting',
  's3_c8_upstream_leased_assets',
  's3_c9_downstream_transport',
  's3_c10_processing_sold_products',
  's3_c11_use_of_sold_products',
  's3_c12_end_of_life_sold_products',
  's3_c13_downstream_leased_assets',
  's3_c14_franchises',
  's3_c15_investments',
] as const
export type ScopeCategory = (typeof SCOPE_CATEGORIES)[number]

export const SCOPE_CATEGORY_LABELS: Record<ScopeCategory, string> = {
  s1_stationary_combustion: 'Stationary combustion',
  s1_mobile_combustion: 'Mobile combustion',
  s1_process: 'Process emissions',
  s1_fugitive: 'Fugitive emissions',
  s1_land_use: 'Land use and livestock',
  s2_location_based: 'Purchased energy (location-based)',
  s2_market_based: 'Purchased energy (market-based)',
  s3_c1_purchased_goods_services: 'C1 Purchased goods and services',
  s3_c2_capital_goods: 'C2 Capital goods',
  s3_c3_fuel_energy_related: 'C3 Fuel- and energy-related activities',
  s3_c4_upstream_transport: 'C4 Upstream transportation and distribution',
  s3_c5_waste_in_operations: 'C5 Waste generated in operations',
  s3_c6_business_travel: 'C6 Business travel',
  s3_c7_employee_commuting: 'C7 Employee commuting',
  s3_c8_upstream_leased_assets: 'C8 Upstream leased assets',
  s3_c9_downstream_transport: 'C9 Downstream transportation and distribution',
  s3_c10_processing_sold_products: 'C10 Processing of sold products',
  s3_c11_use_of_sold_products: 'C11 Use of sold products',
  s3_c12_end_of_life_sold_products: 'C12 End-of-life treatment of sold products',
  s3_c13_downstream_leased_assets: 'C13 Downstream leased assets',
  s3_c14_franchises: 'C14 Franchises',
  s3_c15_investments: 'C15 Investments',
}

export function scopeOfCategory(category: ScopeCategory): Scope {
  return Number(category.charAt(1)) as Scope
}

export const GASES = ['CO2', 'CH4', 'N2O', 'HFC', 'PFC', 'SF6', 'NF3', 'other'] as const
export type Gas = (typeof GASES)[number]

export const GAS_LABELS: Record<Gas, string> = {
  CO2: 'Carbon dioxide (CO₂)',
  CH4: 'Methane (CH₄)',
  N2O: 'Nitrous oxide (N₂O)',
  HFC: 'Hydrofluorocarbons (HFCs)',
  PFC: 'Perfluorocarbons (PFCs)',
  SF6: 'Sulphur hexafluoride (SF₆)',
  NF3: 'Nitrogen trifluoride (NF₃)',
  other: 'Other GHG',
}

export const EF_BOUNDARIES = ['cradle_to_gate', 'cradle_to_grave', 'gate_to_gate'] as const
export type EfBoundary = (typeof EF_BOUNDARIES)[number]

export const EF_METHODS = ['iso14067', 'pef', 'ghgp_product', 'other'] as const
export type EfMethod = (typeof EF_METHODS)[number]

export const BASELINE_METHODS = ['historical', 'counterfactual', 'other'] as const
export type BaselineMethod = (typeof BASELINE_METHODS)[number]

export const PROFILE_KINDS = ['baseline', 'project'] as const
export type ProfileKind = (typeof PROFILE_KINDS)[number]

export const INTERVENTION_LAYERS = [
  '1a_raw_material_production',
  '1b_raw_material_processing',
  '2_manufacturing',
  '3_distribution',
  '4_use',
  '5a_market_wholesale',
  '5b_market_retail',
] as const
export type InterventionLayer = (typeof INTERVENTION_LAYERS)[number]

export const INVOICE_KINDS = ['quote', 'invoice'] as const
export type InvoiceKind = (typeof INVOICE_KINDS)[number]

export const INVOICE_STATUSES = ['draft', 'sent', 'paid', 'overdue', 'void'] as const
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

export const FLAG_STATES = ['hidden', 'preview', 'enabled'] as const
export type FlagState = (typeof FLAG_STATES)[number]

export const HORIZONS = ['now', 'next', 'later'] as const
export type Horizon = (typeof HORIZONS)[number]

export const NOTIFICATION_TYPES = [
  'request_received',
  'request_triaged',
  'document_requested',
  'document_rejected',
  'document_accepted',
  'finding_raised',
  'finding_responded',
  'finding_closed',
  'step_opened',
  'step_closed',
  'iteration_decision',
  'opinion_issued',
  'agreement_accepted',
  'invoice_added',
  'team_assigned',
  'coi_required',
  'coi_decided',
  'approval_decided',
  'record_submitted',
  'record_verified',
  'service_on_hold',
  'step_overridden',
  'service_overridden',
  'team_reassigned',
  'account_changed',
  // PRD v0.3 FR-55
  'iteration_returned_to_ir',
  'decision_refused',
  'materiality_changed',
  'materiality_warning',
  'misstatement_proposed',
  'misstatement_confirmed',
  'post_issuance_opened',
  'statement_revised',
  'statement_withdrawn',
  'case_received',
  'case_acknowledged',
  'case_decided',
  'case_closed',
  'case_overdue',
  'competence_expiring',
  'competence_expired',
  'check_overridden',
  'generic',
] as const
export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

export const ACTOR_TYPES = ['user', 'api', 'mcp', 'system'] as const
export type ActorType = (typeof ACTOR_TYPES)[number]
