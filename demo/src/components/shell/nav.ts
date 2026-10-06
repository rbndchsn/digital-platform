import { BarChart3, Briefcase, Building2, ClipboardCheck, FileSpreadsheet, FolderKanban, Home, Inbox, Layers, Leaf, Plug, Receipt, Users, type LucideIcon } from 'lucide-react'

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

export const STAFF_NAV: NavGroup[] = [
  {
    items: [
      { label: 'My work', to: '/staff', icon: ClipboardCheck, exact: true },
      { label: 'Triage queue', to: '/staff/triage', icon: Inbox },
      { label: 'All services', to: '/staff/services', icon: Briefcase },
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
