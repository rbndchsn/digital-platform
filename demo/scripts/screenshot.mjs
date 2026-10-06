// Captures screenshots of key screens from the production build (used for visual checks and the README).
// Usage: node scripts/screenshot.mjs [outDir]   (run `npm run build` first). SHOTS=02,05 filters by name prefix.
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from '@playwright/test'
import { preview } from 'vite'

const out = resolve(process.argv[2] ?? '../assets/demo-screenshots')
mkdirSync(out, { recursive: true })

const server = await preview({ preview: { port: 4174, strictPort: true }, logLevel: 'silent' })
const base = `http://localhost:4174`
// SHOT_THEME=dark and SHOT_WIDTH=820 produce dark-mode and tablet variants (files prefixed accordingly).
const theme = process.env.SHOT_THEME === 'dark' ? 'dark' : 'light'
const width = Number(process.env.SHOT_WIDTH ?? 1440)
const prefix = `${theme === 'dark' ? 'dark-' : ''}${width !== 1440 ? `w${width}-` : ''}`
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width, height: 900 }, colorScheme: theme })

/** Reads the seeded public code of an issued service from its opinion tab. */
async function statementCode(serviceId) {
  await page.goto(`${base}/engagements/${serviceId}/opinion`)
  await page.waitForTimeout(1800)
  return (await page.locator('code.font-mono.font-bold').first().innerText()).trim()
}

const all = [
  { name: '01-sign-in', path: '/sign-in' },
  { name: '02-client-home', persona: 'Ingrid Vos', path: '/' },
  { name: '03-staff-shell', persona: 'Helena Brandt', path: '/staff' },
  { name: '04-integrations-preview', persona: 'Ingrid Vos', path: '/integrations' },
  { name: '05-engagements', persona: 'Ingrid Vos', path: '/engagements' },
  { name: '06-engagements-past', persona: 'Ingrid Vos', path: '/engagements?tab=past' },
  { name: '07-projects', persona: 'Ingrid Vos', path: '/projects' },
  { name: '08-request-wizard', persona: 'Ingrid Vos', path: '/engagements/new' },
  { name: '09-service-overview', persona: 'Ingrid Vos', path: '/engagements/svc_nw_inv_2025' },
  { name: '10-step-detail', persona: 'Ingrid Vos', path: '/engagements/svc_nw_inv_2025/phases' },
  { name: '11-documents', persona: 'Ingrid Vos', path: '/engagements/svc_nw_inv_2025/documents' },
  { name: '12-timeline', persona: 'Ingrid Vos', path: '/engagements/svc_nw_decarb_2025/timeline' },
  { name: '13-service-log', persona: 'Ingrid Vos', path: '/engagements/svc_nw_decarb_2025/log' },
  { name: '14-team-coi', persona: 'Helena Brandt', path: '/engagements/svc_atlas_decarb_2025/phases' },
  { name: '15-staff-my-work', persona: 'Marcus Oyelaran', path: '/staff' },
  { name: '16-triage', persona: 'Helena Brandt', path: '/staff/triage' },
  { name: '17-finance', persona: 'Jonas Weber', path: '/staff/finance' },
  { name: '18-findings', persona: 'Ingrid Vos', path: '/engagements/svc_nw_inv_2025/findings' },
  { name: '19-finding-thread', persona: 'Ingrid Vos', path: '/engagements/svc_nw_inv_2024/findings' },
  { name: '20-opinion-iterations', persona: 'Marcus Oyelaran', path: '/engagements/svc_nw_decarb_2025/opinion' },
  { name: '21-opinion-issued', persona: 'Ingrid Vos', path: '/engagements/svc_nw_inv_2024/opinion' },
  { name: '22-public-verify', persona: 'Ingrid Vos', path: async () => `/verify/${await statementCode('svc_nw_inv_2024')}` },
  { name: '23-inventory', persona: 'Ingrid Vos', path: '/records/inventories' },
  { name: '24-decarb-record', persona: 'Ingrid Vos', path: '/records/decarb-units/dcu_nw_milk_2025' },
  { name: '25-decarb-portfolio', persona: 'Ingrid Vos', path: '/records/decarb-units' },
  { name: '26-emission-factors', persona: 'Ingrid Vos', path: '/records/emission-factors' },
  { name: '27-staff-clients', persona: 'Helena Brandt', path: '/staff/clients' },
  { name: '28-admin-dashboard', persona: 'Sam Okafor', path: '/admin' },
  { name: '29-admin-users', persona: 'Sam Okafor', path: '/admin/users' },
  { name: '30-admin-audit', persona: 'Sam Okafor', path: '/admin/audit' },
  { name: '31-manager-override', persona: 'Helena Brandt', path: '/engagements/svc_nw_inv_2025/phases' },
]
const only = process.env.SHOTS?.split(',')
const shots = only ? all.filter((s) => only.some((o) => s.name.startsWith(o))) : all

for (const s of shots) {
  if (s.persona) {
    await page.goto(`${base}/sign-in`)
    await page.evaluate(() => window.sessionStorage.clear())
    await page.goto(`${base}/sign-in`)
    await page.getByRole('button', { name: new RegExp(s.persona) }).click()
    await page.waitForURL((u) => !u.pathname.includes('sign-in'))
  }
  const path = typeof s.path === 'function' ? await s.path() : s.path
  await page.goto(`${base}${path}`)
  // Mock latency is up to ~400 ms per call and pages chain two or three calls.
  await page.waitForTimeout(1800)
  await page.screenshot({ path: resolve(out, `${prefix}${s.name}.png`), fullPage: false })
  console.log('saved', `${prefix}${s.name}`)
}

await browser.close()
await server.close()
