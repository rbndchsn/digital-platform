/** Demo panel controls: reset, network toggles, storyline chapter bookkeeping. Not part of the real product. */
import { getNetworkSettings, setFailNextCall, setSlowNetwork } from '@/mock/latency'
import { resetStore } from '@/mock/store'
import { getStore } from './core'

export interface Chapter {
  no: number
  title: string
  persona: string
  path: string
  say: string
}

/** The investor storyline (plan_v1 §2.4). Paths are routes in the app. */
export const CHAPTERS: Chapter[] = [
  { no: 1, title: 'Client home', persona: 'usr_ingrid', path: '/', say: 'Ingrid sees two ongoing engagements, what is blocking her, and the verified history.' },
  { no: 2, title: 'Request work', persona: 'usr_ingrid', path: '/engagements/new', say: 'A five-step wizard turns a request into a structured engagement with a pre-engagement form.' },
  { no: 3, title: 'Verifier triage, scope, impartiality, team', persona: 'usr_helena', path: '/staff', say: 'Helena accepts, approves technical scope and impartiality, nominates the team; each member declares conflicts of interest.' },
  { no: 4, title: 'Contracting to planning', persona: 'usr_amina', path: '/engagements/svc_sol_ver_2025', say: 'The client accepts the agreement and audit plan in the platform; name, time and document hash are recorded.' },
  { no: 5, title: 'Evidence vault', persona: 'usr_ingrid', path: '/engagements/svc_nw_inv_2025', say: 'Required slots, versions, provenance, rejection with reason and re-upload.' },
  { no: 6, title: 'Findings', persona: 'usr_pieter', path: '/engagements/svc_nw_inv_2025/findings', say: 'A corrective action request is answered in a thread and closed by the auditor.' },
  { no: 7, title: 'Records: inventory and decarb_units', persona: 'usr_ingrid', path: '/records/decarb-units/dcu_nw_milk_2025', say: 'Per-gas inventory with biogenic and removals separate; the milk record: 3.4 → 3.0 tCO2e/t on 1,000,000 t = 400,000 units.' },
  { no: 8, title: 'Opinion: review, approval, issuance', persona: 'usr_marcus', path: '/engagements/svc_nw_decarb_2025/opinion', say: 'Iteration 2 goes through independent review and manager approval, then an animated issuance creates a public statement.' },
  { no: 9, title: 'Timeline and Service Log', persona: 'usr_ingrid', path: '/engagements/svc_nw_decarb_2025/timeline', say: 'Planned versus actual, and the immutable log of everything that just happened.' },
  { no: 10, title: 'The future, in preview', persona: 'usr_ingrid', path: '/integrations', say: 'API, MCP and webhooks are visible but not yet enabled; interest is captured and seen by VERIFASSUR.' },
]

export function network() {
  return getNetworkSettings()
}

export function toggleSlowNetwork(on: boolean): void {
  setSlowNetwork(on)
}

export function failNextCall(): void {
  setFailNextCall(true)
}

export function resetDemo(): void {
  resetStore()
}

export function setChapter(no: number): void {
  getStore().setSession({ storylineChapter: no })
}

export function currentChapter(): number {
  return getStore().getSession().storylineChapter
}
