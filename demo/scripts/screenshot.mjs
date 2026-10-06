// Captures screenshots of key screens from the production build (used for visual checks and the README).
// Usage: node scripts/screenshot.mjs [outDir]   (run `npm run build` first)
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from '@playwright/test'
import { preview } from 'vite'

const out = resolve(process.argv[2] ?? '../assets/demo-screenshots')
mkdirSync(out, { recursive: true })

const server = await preview({ preview: { port: 4174, strictPort: true }, logLevel: 'silent' })
const base = `http://localhost:4174`
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' })

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
  await page.goto(`${base}${s.path}`)
  // Mock latency is up to ~400 ms per call and pages chain two or three calls.
  await page.waitForTimeout(1800)
  await page.screenshot({ path: resolve(out, `${s.name}.png`), fullPage: false })
  console.log('saved', s.name)
}

await browser.close()
await server.close()
