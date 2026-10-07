import { Award, BarChart3, Briefcase, Building2, ClipboardCheck, FileSpreadsheet, FolderKanban, Gauge, Home, Inbox, Layers, Leaf, Plug, Receipt, Scale, ScrollText, Settings2, ShieldCheck, Users, UsersRound, type LucideIcon } from 'lucide-react'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  /** Feature flag key; when in preview the item shows a "Coming" marker. */
  flag?: string
  exact?: boolean
}

export interface NavGroup {
  label?: string
  items: NavItem[]
}

export const CLIENT_NAV: NavGroup[] = [
  {
    items: [
      { label: 'Home', to: '/', icon: Home, exact: true },
      { label: 'Engagements', to: '/engagements', icon: Briefcase },
      { label: 'Projects', to: '/projects', icon: FolderKanban },
    ],
  },
  {
    label: 'Records',
    items: [
      { label: 'GHG inventories', to: '/records/inventories', icon: BarChart3 },
      { label: 'Product emission factors', to: '/records/emission-factors', icon: FileSpreadsheet },
      { label: 'decarb_units', to: '/records/decarb-units', icon: Leaf },
    ],
  },
  {
    label: 'Platform',
    items: [
      { label: 'Integrations', to: '/integrations', icon: Plug, flag: 'api' },
      { label: 'Organisation', to: '/organisation', icon: Building2 },
    ],
  },
]

/** Verifier portal (PRD §7.1 v0.3): the complaints register and the competence page sit beside the work queues. */
export const STAFF_NAV: NavGroup[] = [
  {
    items: [
      { label: 'My work', to: '/staff', icon: ClipboardCheck, exact: true },
      { label: 'Triage queue', to: '/staff/triage', icon: Inbox },
      { label: 'All services', to: '/staff/services', icon: Briefcase },
    ],
  },
  {
    label: 'Governance',
    items: [
      { label: 'Complaints and appeals', to: '/staff/cases', icon: Scale },
      { label: 'Competence', to: '/staff/competence', icon: Award },
    ],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Clients', to: '/staff/clients', icon: Users },
      { label: 'Templates', to: '/staff/templates', icon: Layers },
      { label: 'Finance', to: '/staff/finance', icon: Receipt },
    ],
  },
]

/** Administration portal (PRD §7.1 v0.2): platform administrator only. Read-only views of the verifier pages below. */
export const ADMIN_NAV: NavGroup[] = [
  {
    label: 'Administration portal',
    items: [
      { label: 'Dashboard', to: '/admin', icon: Gauge, exact: true },
      { label: 'Users and organisations', to: '/admin/users', icon: UsersRound },
      { label: 'Audit log', to: '/admin/audit', icon: ScrollText },
      { label: 'COI register', to: '/admin/coi', icon: ShieldCheck },
      { label: 'Settings', to: '/admin/settings', icon: Settings2 },
    ],
  },
  {
    label: 'Read-only views',
    items: [
      { label: 'All services', to: '/staff/services', icon: Briefcase },
      { label: 'Complaints and appeals', to: '/staff/cases', icon: Scale },
      { label: 'Competence', to: '/staff/competence', icon: Award },
      { label: 'Clients', to: '/staff/clients', icon: Users },
      { label: 'Templates', to: '/staff/templates', icon: Layers },
      { label: 'Finance', to: '/staff/finance', icon: Receipt },
    ],
  },
]
