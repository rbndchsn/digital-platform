/** Organisations, users, memberships, projects, feature flags, competence and legacy history for the investor storyline (plan_v1 §2.3–2.4). */
import type { QualificationKind } from '@/domain/enums'
import type { Announcement, AuditColumns, CompetenceProfile, CompetenceQualification, FeatureFlag, LegacyEngagement, Membership, Organisation, PlatformSettings, Project, User } from '@/domain/schemas'
import { daysAgo, daysFromNow } from '../clock'
import { seedId } from '../ids'

export const ORG = {
  verifassur: 'org_verifassur',
  northwind: 'org_northwind',
  solstice: 'org_solstice',
  atlas: 'org_atlas',
} as const

export const USR = {
  mgr: 'usr_helena',
  /** Second decision-capable manager (PRD v0.3 §16 assumption 7, plan_v1 §8 D13). */
  mgr2: 'usr_marc',
  tl: 'usr_marcus',
  aud: 'usr_priya',
  ir: 'usr_tomas',
  coord: 'usr_ana',
  fin: 'usr_jonas',
  admin: 'usr_sam',
  nwAdmin: 'usr_ingrid',
  nwContrib: 'usr_pieter',
  nwViewer: 'usr_claire',
  solAdmin: 'usr_amina',
  atlasAdmin: 'usr_luc',
} as const

export const PRJ = {
  nwCorp: 'prj_nw_corporate',
  nwInsetting: 'prj_nw_insetting',
  nwProducts: 'prj_nw_products',
  solLaikipia: 'prj_sol_laikipia',
  atlasWheat: 'prj_atlas_wheat',
  atlasBakery: 'prj_atlas_bakery',
} as const

export function auditAt(at: string, by: string | null = null): AuditColumns {
  return { created_at: at, created_by: by, updated_at: at, updated_by: by, version: 0, deleted_at: null }
}

export function organisations(): Organisation[] {
  const a = auditAt(daysAgo(400))
  return [
    { ...a, id: ORG.verifassur, type: 'verifier', name: 'VERIFASSUR', legal_name: 'VERIFASSUR Assurance S.A.', country: 'LU', registration_no: 'B-284110', settings_json: {}, status: 'active', suspended_at: null, suspended_reason: null, portfolio_manager_user_id: null, initials: 'VX' },
    { ...a, id: ORG.northwind, type: 'client', name: 'Northwind Dairy Cooperative', legal_name: 'Northwind Zuivelcoöperatie U.A.', country: 'NL', registration_no: 'KvK 58213907', settings_json: {}, status: 'active', suspended_at: null, suspended_reason: null, portfolio_manager_user_id: USR.mgr, initials: 'ND' },
    { ...a, id: ORG.solstice, type: 'client', name: 'Solstice Renewables Ltd', legal_name: 'Solstice Renewables Limited', country: 'KE', registration_no: 'PVT-9QU4E2', settings_json: {}, status: 'active', suspended_at: null, suspended_reason: null, portfolio_manager_user_id: USR.mgr, initials: 'SR' },
    { ...a, id: ORG.atlas, type: 'client', name: 'Atlas Foods Group', legal_name: 'Atlas Foods Group SAS', country: 'FR', registration_no: 'RCS 812 445 661', settings_json: {}, status: 'active', suspended_at: null, suspended_reason: null, portfolio_manager_user_id: USR.mgr, initials: 'AF' },
  ]
}

interface Person {
  id: string
  name: string
  email: string
  title: string
  org: string
  role: Membership['role']
}

const PEOPLE: Person[] = [
  { id: USR.mgr, name: 'Helena Brandt', email: 'helena.brandt@verifassur.example', title: 'Scheme manager', org: ORG.verifassur, role: 'verifier_manager' },
  { id: USR.mgr2, name: 'Marc Lefèvre', email: 'marc.lefevre@verifassur.example', title: 'Technical manager', org: ORG.verifassur, role: 'verifier_manager' },
  { id: USR.tl, name: 'Marcus Oyelaran', email: 'marcus.oyelaran@verifassur.example', title: 'Lead verifier', org: ORG.verifassur, role: 'verifier_team_leader' },
  { id: USR.aud, name: 'Priya Natarajan', email: 'priya.natarajan@verifassur.example', title: 'GHG auditor', org: ORG.verifassur, role: 'verifier_auditor' },
  { id: USR.ir, name: 'Tomas Lindqvist', email: 'tomas.lindqvist@verifassur.example', title: 'Independent reviewer', org: ORG.verifassur, role: 'verifier_independent_reviewer' },
  { id: USR.coord, name: 'Ana Ferreira', email: 'ana.ferreira@verifassur.example', title: 'Engagement coordinator', org: ORG.verifassur, role: 'verifier_coordinator' },
  { id: USR.fin, name: 'Jonas Weber', email: 'jonas.weber@verifassur.example', title: 'Finance', org: ORG.verifassur, role: 'verifier_finance' },
  { id: USR.admin, name: 'Sam Okafor', email: 'sam.okafor@verifassur.example', title: 'Platform administrator', org: ORG.verifassur, role: 'platform_admin' },
  { id: USR.nwAdmin, name: 'Ingrid Vos', email: 'ingrid.vos@northwind.example', title: 'Head of Sustainability', org: ORG.northwind, role: 'client_admin' },
  { id: USR.nwContrib, name: 'Pieter de Jong', email: 'pieter.dejong@northwind.example', title: 'Site manager, Lelystad', org: ORG.northwind, role: 'client_contributor' },
  { id: USR.nwViewer, name: 'Claire Mertens', email: 'claire.mertens@northwind.example', title: 'Chief Financial Officer', org: ORG.northwind, role: 'client_viewer' },
  { id: USR.solAdmin, name: 'Amina Wanjiru', email: 'amina.wanjiru@solstice.example', title: 'Carbon programme lead', org: ORG.solstice, role: 'client_admin' },
  { id: USR.atlasAdmin, name: 'Luc Moreau', email: 'luc.moreau@atlasfoods.example', title: 'Scope 3 manager', org: ORG.atlas, role: 'client_admin' },
]

/** Deterministic "last sign-in" per persona: staff daily, client admins weekly, viewers rarely. */
const LAST_SIGN_IN_DAYS: Record<string, number> = { usr_helena: 0, usr_marc: 1, usr_marcus: 0, usr_priya: 1, usr_tomas: 2, usr_ana: 0, usr_jonas: 3, usr_sam: 0, usr_ingrid: 1, usr_pieter: 4, usr_claire: 23, usr_amina: 2, usr_luc: 6 }

export function users(): User[] {
  const a = auditAt(daysAgo(380))
  return PEOPLE.map((p) => ({
    ...a,
    id: p.id,
    email: p.email,
    name: p.name,
    email_verified: true,
    mfa_enabled: p.id !== USR.nwViewer,
    locale: 'en',
    timezone: p.org === ORG.solstice ? 'Africa/Nairobi' : 'Europe/Amsterdam',
    status: 'active',
    job_title: p.title,
    last_sign_in_at: daysAgo(LAST_SIGN_IN_DAYS[p.id] ?? 7, 8, 30 + (p.id.length % 20)),
    deactivated_at: null,
    deactivated_by: null,
    deactivation_reason: null,
    anonymised_at: null,
  }))
}

export function memberships(): Membership[] {
  const a = auditAt(daysAgo(380))
  return PEOPLE.map((p, i) => ({ ...a, id: `mem_${String(i + 1).padStart(3, '0')}`, org_id: p.org, user_id: p.id, role: p.role, status: 'active' }))
}

export function userName(id: string | null | undefined): string {
  return PEOPLE.find((p) => p.id === id)?.name ?? 'Unknown user'
}

export function projects(): Project[] {
  const a = auditAt(daysAgo(360), USR.nwAdmin)
  return [
    { ...a, id: PRJ.nwCorp, org_id: ORG.northwind, name: 'Northwind corporate GHG inventory', description: 'Organisation-wide GHG inventory of Northwind Dairy Cooperative: three processing sites (Lelystad, Leeuwarden, Zwolle), the logistics fleet and the member-farm supply chain under operational control.', country: 'NL', region: 'Flevoland', programme: 'iso14064', external_registry_id: null, owner_user_id: USR.nwAdmin, status: 'active' },
    { ...a, id: PRJ.nwInsetting, org_id: ORG.northwind, name: 'Northwind dairy insetting programme', description: 'Value-chain insetting across 42 member farms in cluster North: 3-NOP feed additive, covered slurry storage and precision fertilisation. Reductions are claimed within Northwind’s Scope 3 as decarb_units.', country: 'NL', region: 'Friesland', programme: 'insetting', external_registry_id: null, owner_user_id: USR.nwAdmin, status: 'active' },
    { ...a, id: PRJ.nwProducts, org_id: ORG.northwind, name: 'Northwind product footprints', description: 'Product carbon footprints for the core dairy range (milk, Gouda, whey protein) to ISO 14067.', country: 'NL', region: null, programme: 'iso14067', external_registry_id: null, owner_user_id: USR.nwAdmin, status: 'active' },
    { ...auditAt(daysAgo(540), USR.solAdmin), id: PRJ.solLaikipia, org_id: ORG.solstice, name: 'Solstice solar mini-grids — Laikipia County', description: 'Grouped project of 14 solar mini-grids replacing diesel generation for rural households and agro-processors in Laikipia County, Kenya.', country: 'KE', region: 'Laikipia', programme: 'verra_vcs', external_registry_id: 'VCS-DEMO-4471', owner_user_id: USR.solAdmin, status: 'active' },
    { ...auditAt(daysAgo(120), USR.atlasAdmin), id: PRJ.atlasWheat, org_id: ORG.atlas, name: 'Atlas regenerative wheat sourcing', description: 'Cover cropping and reduced tillage across 60 wheat growers in Beauce supplying Atlas bakeries; reductions and soil-carbon removals claimed as decarb_units.', country: 'FR', region: 'Centre-Val de Loire', programme: 'insetting', external_registry_id: null, owner_user_id: USR.atlasAdmin, status: 'active' },
    { ...auditAt(daysAgo(40), USR.atlasAdmin), id: PRJ.atlasBakery, org_id: ORG.atlas, name: 'Atlas bakery product footprints', description: 'Product carbon footprints for the sourdough range sold to retail.', country: 'FR', region: null, programme: 'iso14067', external_registry_id: null, owner_user_id: USR.atlasAdmin, status: 'active' },
  ]
}

/** Feature flags per PRD §13. `enabled` = live in the demo; `preview` = exposed, non-functional. */
export function featureFlags(): FeatureFlag[] {
  return [
    { key: 'public_statement', default_state: 'enabled', title: 'Public verification statement', description: 'Anyone with the code can check an issued opinion and its document hashes.', horizon: 'now', area: 'statements' },
    { key: 'spreadsheet_import', default_state: 'preview', title: 'Spreadsheet import', description: 'Import inventories and decarb_unit records from the VERIFASSUR_X template (XLSX/CSV).', horizon: 'next', area: 'records' },
    { key: 'api', default_state: 'preview', title: 'REST API', description: 'Push requests, inventories, evidence and read findings from your own systems with per-organisation API keys.', horizon: 'next', area: 'integrations' },
    { key: 'mcp', default_state: 'preview', title: 'MCP server', description: 'Let your carbon-accounting software or AI agent submit data and respond to findings through Model Context Protocol tools.', horizon: 'next', area: 'integrations' },
    { key: 'webhooks', default_state: 'preview', title: 'Webhooks', description: 'Receive service status, finding and opinion events in your systems.', horizon: 'next', area: 'integrations' },
    { key: 'ai_assistant', default_state: 'preview', title: 'AI evidence assistant', description: 'Classifies uploads into required slots, checks completeness and extracts key figures for auditor review.', horizon: 'next', area: 'engagements' },
    { key: 'esign', default_state: 'preview', title: 'Legal e-signature', description: 'Sign service agreements and opinions with a qualified e-signature provider.', horizon: 'next', area: 'engagements' },
    { key: 'reports_export', default_state: 'preview', title: 'Report exports', description: 'Generate ISO 14064-1 reports and CSRD/ESRS E1 datapoints from verified data.', horizon: 'next', area: 'records' },
    { key: 'registry_links', default_state: 'preview', title: 'Registry connectors', description: 'Hand monitoring reports to Verra Project Hub and Gold Standard and pull issuance back.', horizon: 'next', area: 'integrations' },
    { key: 'sso', default_state: 'preview', title: 'Enterprise SSO', description: 'Sign in with your company identity provider (OIDC).', horizon: 'next', area: 'platform' },
    { key: 'continuous_assurance', default_state: 'preview', title: 'Continuous assurance', description: 'Rolling verification of monthly data streams instead of a single annual engagement.', horizon: 'later', area: 'engagements' },
    { key: 'dmrv', default_state: 'preview', title: 'Digital MRV connectors', description: 'Meters, satellite data and farm management systems feed evidence directly.', horizon: 'later', area: 'integrations' },
    { key: 'verifiable_credentials', default_state: 'preview', title: 'Verifiable credentials', description: 'Machine-verifiable signed opinions (W3C VC) for buyers and registries.', horizon: 'later', area: 'statements' },
    { key: 'dpp_export', default_state: 'preview', title: 'Digital product passport export', description: 'Publish verified product emission factors to digital product passports.', horizon: 'later', area: 'records' },
    { key: 'agent_verification', default_state: 'preview', title: 'Agent-to-agent verification', description: 'Your agent and the VERIFASSUR auditor agent negotiate data requests and findings over MCP.', horizon: 'later', area: 'integrations' },
    { key: 'multi_verifier', default_state: 'preview', title: 'Multi-verifier recognition', description: 'Import opinions from other verification bodies with a trust level.', horizon: 'later', area: 'platform' },
    { key: 'portfolios', default_state: 'preview', title: 'Portfolios', description: 'A senior manager owns a handful of clients and their auditors; work queues, triage and rollups scoped by portfolio.', horizon: 'next', area: 'platform' },
    { key: 'public_complaints', default_state: 'preview', title: 'Public complaint form', description: 'External parties file a complaint about VERIFASSUR through a public form and follow it with a case token.', horizon: 'next', area: 'platform' },
  ]
}

// ---------------------------------------------------------------- competence (PRD v0.3 FR-94)
const SCOPES = { dairyProc: 'dairy_processing', dairyFarm: 'dairy_farming', arable: 'arable_farming', renewables: 'renewable_energy', food: 'food_manufacturing' }
const AREAS = { inventory: 'ghg_inventory', pcf: 'product_footprint', projects: 'project_reductions', soil: 'soil_carbon', refrigerants: 'refrigerants' }
const ALL_PROGRAMMES = ['iso14064', 'iso14067', 'insetting', 'verra_vcs', 'gold_standard']

interface QualSpec {
  kind: QualificationKind
  scopes: string[]
  areas: string[]
  programmes: string[]
  from: string
  until: string
  note?: string
}

const QUALS: Record<string, QualSpec[]> = {
  [USR.mgr]: [{ kind: 'lead_verifier', scopes: [SCOPES.dairyProc, SCOPES.dairyFarm, SCOPES.food], areas: [AREAS.inventory, AREAS.pcf], programmes: ['iso14064', 'iso14067', 'insetting'], from: '2024-01-01', until: '2027-12-31', note: 'IRCA GHG lead verifier; VERIFASSUR witness audit 2024.' }],
  [USR.mgr2]: [
    { kind: 'lead_verifier', scopes: [SCOPES.renewables, SCOPES.dairyFarm, SCOPES.arable], areas: [AREAS.inventory, AREAS.projects], programmes: ALL_PROGRAMMES, from: '2025-01-01', until: '2028-12-31' },
    { kind: 'independent_reviewer', scopes: [SCOPES.renewables, SCOPES.dairyFarm, SCOPES.arable, SCOPES.dairyProc, SCOPES.food], areas: [AREAS.inventory, AREAS.projects, AREAS.pcf], programmes: ALL_PROGRAMMES, from: '2025-01-01', until: '2028-12-31' },
  ],
  [USR.tl]: [
    { kind: 'lead_verifier', scopes: [SCOPES.dairyProc, SCOPES.dairyFarm, SCOPES.arable, SCOPES.renewables], areas: [AREAS.inventory, AREAS.pcf, AREAS.projects], programmes: ALL_PROGRAMMES, from: '2023-03-01', until: '2028-02-28', note: 'Lead on 11 engagements since 2021.' },
    { kind: 'verifier', scopes: [SCOPES.dairyProc, SCOPES.dairyFarm, SCOPES.arable, SCOPES.renewables], areas: [AREAS.inventory, AREAS.pcf, AREAS.projects], programmes: ALL_PROGRAMMES, from: '2021-06-01', until: '2028-02-28' },
  ],
  [USR.aud]: [
    { kind: 'verifier', scopes: [SCOPES.dairyProc, SCOPES.dairyFarm, SCOPES.food], areas: [AREAS.inventory, AREAS.pcf], programmes: ['iso14064', 'iso14067', 'insetting'], from: '2024-05-01', until: '2028-04-30' },
    // Expiring soon: drives the reminder and the "expiring" badge (PRD FR-94, FR-55).
    { kind: 'technical_expert', scopes: [SCOPES.dairyProc], areas: [AREAS.refrigerants], programmes: ['iso14064'], from: '2023-11-01', until: daysFromNow(45), note: 'F-gas handling certificate (category I).' },
  ],
  [USR.ir]: [{ kind: 'independent_reviewer', scopes: [SCOPES.dairyProc, SCOPES.dairyFarm, SCOPES.renewables, SCOPES.arable, SCOPES.food], areas: [AREAS.inventory, AREAS.pcf, AREAS.projects], programmes: ALL_PROGRAMMES, from: '2023-01-01', until: '2027-12-31' }],
}

const LANGUAGES: Record<string, string[]> = { [USR.mgr]: ['en', 'de', 'nl'], [USR.mgr2]: ['en', 'fr'], [USR.tl]: ['en', 'yo', 'fr'], [USR.aud]: ['en', 'ta', 'hi'], [USR.ir]: ['en', 'sv'], [USR.coord]: ['en', 'pt'], [USR.fin]: ['en', 'de'] }
const SUMMARY: Record<string, string> = {
  [USR.mgr]: 'Scheme manager; ISO 14064-1 and ISO 14067 lead verifier for food and dairy.',
  [USR.mgr2]: 'Technical manager; project-based programmes (VCS, Gold Standard) and independent review.',
  [USR.tl]: 'Lead verifier across inventories, product footprints and value-chain interventions.',
  [USR.aud]: 'GHG auditor; refrigerant and energy data specialist.',
  [USR.ir]: 'Independent reviewer; no engagement delivery role since 2023.',
  [USR.coord]: 'Engagement coordinator; no verifier qualification (administrative role).',
  [USR.fin]: 'Finance; no verifier qualification.',
}

/** One profile per staff member (not the platform administrator); managers maintain each other's (plan_v1 §8 D21). */
export function competenceFixtures(): { profiles: CompetenceProfile[]; qualifications: CompetenceQualification[] } {
  const a = auditAt(daysAgo(200), USR.mgr)
  const profiles: CompetenceProfile[] = []
  const qualifications: CompetenceQualification[] = []
  for (const p of PEOPLE.filter((x) => x.org === ORG.verifassur && x.role !== 'platform_admin')) {
    const editor = p.id === USR.mgr ? USR.mgr2 : USR.mgr
    const profile: CompetenceProfile = { ...a, id: seedId('cmp'), user_id: p.id, verifier_org_id: ORG.verifassur, languages_json: LANGUAGES[p.id] ?? ['en'], summary: SUMMARY[p.id] ?? '', last_edited_by: editor, last_edited_at: daysAgo(60 + (p.id.length % 30), 11, 0) }
    profiles.push(profile)
    for (const q of QUALS[p.id] ?? []) qualifications.push({ ...a, id: seedId('qual'), profile_id: profile.id, kind: q.kind, sector_scopes_json: q.scopes, technical_areas_json: q.areas, programmes_json: q.programmes, valid_from: q.from, valid_until: q.until, evidence_document_id: null, note: q.note ?? null })
  }
  return { profiles, qualifications }
}

/** Pre-platform Northwind inventory verifications led by Marcus, so the rotation count is complete (PRD FR-98). */
export function legacyEngagements(): LegacyEngagement[] {
  const a = auditAt(daysAgo(150), USR.mgr)
  return [
    { ...a, id: seedId('leg'), verifier_org_id: ORG.verifassur, client_org_id: ORG.northwind, project_id: PRJ.nwCorp, user_id: USR.tl, service_role: 'verifier_team_leader', service_type: 'iso14064_1_inventory_verification', reference: 'VX-2022-0081', period_start: '2021-01-01', period_end: '2021-12-31', entered_by: USR.mgr, note: 'Pre-platform engagement, archived in the legacy file share.' },
    { ...a, id: seedId('leg'), verifier_org_id: ORG.verifassur, client_org_id: ORG.northwind, project_id: PRJ.nwCorp, user_id: USR.tl, service_role: 'verifier_team_leader', service_type: 'iso14064_1_inventory_verification', reference: 'VX-2023-0094', period_start: '2022-01-01', period_end: '2022-12-31', entered_by: USR.mgr, note: 'Pre-platform engagement, archived in the legacy file share.' },
  ]
}

/** Platform configuration (PRD FR-67). */
export function platformSettings(): PlatformSettings[] {
  return [
    {
      id: 'platform',
      maintenance_mode: false,
      maintenance_message: null,
      maintenance_from: null,
      maintenance_until: null,
      branding_json: { product_name: 'VERIFASSUR_X', primary_colour: '#0f766e', logo_r2_key: null },
      notification_templates_json: [
        { type: 'document_requested', subject: '[VERIFASSUR_X] {{service_reference}}: {{slot_name}} requested', body: 'Hello {{first_name}},\n\n{{requester}} asked for "{{slot_name}}" on {{service_name}} by {{due_date}}.\n\nOpen the slot: {{link}}' },
        { type: 'finding_raised', subject: '[VERIFASSUR_X] {{service_reference}}: {{finding_type}} #{{finding_no}} raised', body: 'Hello {{first_name}},\n\n{{auditor}} raised {{finding_type}} #{{finding_no}} "{{finding_title}}", due {{due_date}}.\n\nRespond: {{link}}' },
        { type: 'opinion_issued', subject: '[VERIFASSUR_X] Opinion issued for {{service_reference}}', body: 'Hello {{first_name}},\n\nThe opinion for {{service_name}} was issued on {{issued_at}}. Public statement: {{public_url}}' },
        { type: 'step_overridden', subject: '[VERIFASSUR_X] {{service_reference}}: {{step_name}} {{override_action}} by the manager', body: 'Hello {{first_name}},\n\n{{manager}} set "{{step_name}}" to {{new_status}} on {{service_name}}.\nReason: {{reason}}\n\nWhat happens next: {{next_action}}' },
      ],
      retention_years: 10,
      complaint_targets_json: { acknowledge_days: 5, decide_days: 30 },
      updated_by: USR.admin,
      updated_at: daysAgo(30, 10, 0),
    },
  ]
}

/** One prepared (inactive) announcement the ADMIN switches on during chapter 11. */
export function announcements(): Announcement[] {
  return [
    {
      id: 'ann_maintenance_2026_10',
      title: 'Scheduled maintenance',
      body: 'VERIFASSUR_X will be read-only on Sunday 02:00–04:00 UTC while the evidence vault is migrated to the new EU region. Uploads and approvals resume automatically afterwards.',
      tone: 'info',
      audience: 'all',
      // Yesterday, so the announcement is already "started" whatever the time of day the seed is built (the storyline test switches it on).
      starts_at: daysAgo(1, 6, 0),
      ends_at: null,
      active: false,
      created_by: USR.admin,
      created_at: daysAgo(1, 16, 20),
    },
  ]
}
