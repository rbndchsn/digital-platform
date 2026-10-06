/** Organisations, users, memberships, projects and feature flags for the investor storyline (plan_v1 §2.3–2.4). */
import type { AuditColumns, FeatureFlag, Membership, Organisation, Project, User } from '@/domain/schemas'
import { daysAgo } from '../clock'

export const ORG = {
  verifassur: 'org_verifassur',
  northwind: 'org_northwind',
  solstice: 'org_solstice',
  atlas: 'org_atlas',
} as const

export const USR = {
  mgr: 'usr_helena',
  tl: 'usr_marcus',
  aud: 'usr_priya',
  ir: 'usr_tomas',
  coord: 'usr_ana',
  fin: 'usr_jonas',
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
  { id: USR.tl, name: 'Marcus Oyelaran', email: 'marcus.oyelaran@verifassur.example', title: 'Lead verifier', org: ORG.verifassur, role: 'verifier_team_leader' },
  { id: USR.aud, name: 'Priya Natarajan', email: 'priya.natarajan@verifassur.example', title: 'GHG auditor', org: ORG.verifassur, role: 'verifier_auditor' },
  { id: USR.ir, name: 'Tomas Lindqvist', email: 'tomas.lindqvist@verifassur.example', title: 'Independent reviewer', org: ORG.verifassur, role: 'verifier_independent_reviewer' },
  { id: USR.coord, name: 'Ana Ferreira', email: 'ana.ferreira@verifassur.example', title: 'Engagement coordinator', org: ORG.verifassur, role: 'verifier_coordinator' },
  { id: USR.fin, name: 'Jonas Weber', email: 'jonas.weber@verifassur.example', title: 'Finance', org: ORG.verifassur, role: 'verifier_finance' },
  { id: USR.nwAdmin, name: 'Ingrid Vos', email: 'ingrid.vos@northwind.example', title: 'Head of Sustainability', org: ORG.northwind, role: 'client_admin' },
  { id: USR.nwContrib, name: 'Pieter de Jong', email: 'pieter.dejong@northwind.example', title: 'Site manager, Lelystad', org: ORG.northwind, role: 'client_contributor' },
  { id: USR.nwViewer, name: 'Claire Mertens', email: 'claire.mertens@northwind.example', title: 'Chief Financial Officer', org: ORG.northwind, role: 'client_viewer' },
  { id: USR.solAdmin, name: 'Amina Wanjiru', email: 'amina.wanjiru@solstice.example', title: 'Carbon programme lead', org: ORG.solstice, role: 'client_admin' },
  { id: USR.atlasAdmin, name: 'Luc Moreau', email: 'luc.moreau@atlasfoods.example', title: 'Scope 3 manager', org: ORG.atlas, role: 'client_admin' },
]

export function users(): User[] {
  const a = auditAt(daysAgo(380))
  return PEOPLE.map((p) => ({
    ...a,
    id: p.id,
    email: p.email,
    name: p.name,
    email_verified: true,
    mfa_enabled: true,
    locale: 'en',
    timezone: p.org === ORG.solstice ? 'Africa/Nairobi' : 'Europe/Amsterdam',
    status: 'active',
    job_title: p.title,
    last_sign_in_at: null,
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
  ]
}
