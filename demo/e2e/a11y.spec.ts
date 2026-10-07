/** Accessibility audit with axe on the key screens; fails on serious and critical violations. */
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { enterAs } from './helpers'

const CLIENT_PAGES = ['/', '/engagements', '/engagements/new', '/projects', '/engagements/svc_nw_inv_2025', '/engagements/svc_nw_inv_2025/phases', '/engagements/svc_nw_inv_2025/documents', '/engagements/svc_nw_inv_2025/findings', '/engagements/svc_nw_decarb_2025/timeline', '/engagements/svc_nw_decarb_2025/opinion', '/engagements/svc_nw_decarb_2025/log', '/engagements/svc_nw_pcf_2024/opinion', '/engagements/svc_nw_decarb_2024/timeline', '/records/inventories', '/records/decarb-units/dcu_nw_milk_2025', '/records/emission-factors', '/integrations', '/organisation', '/organisation?tab=cases', '/account']
// PRD v0.3 verifier pages: the opinion tab with the materiality warning, the misstatement register, the cases register, the competence page.
const STAFF_PAGES = ['/staff', '/staff/triage', '/staff/services', '/staff/clients', '/staff/templates', '/staff/finance', '/staff/cases', '/staff/competence', '/engagements/svc_nw_pcf_2025/opinion', '/engagements/svc_nw_pcf_2025/misstatements', '/engagements/svc_atlas_decarb_2025/phases']
const ADMIN_PAGES = ['/admin', '/admin/users', '/admin/users?tab=organisations', '/admin/audit', '/admin/audit?view=auth', '/admin/coi', '/admin/settings', '/engagements/svc_nw_inv_2025/phases', '/engagements/svc_nw_inv_2025/documents', '/staff/cases', '/staff/competence']

async function audit(page: Page, path: string) {
  await page.goto(path)
  await page.waitForTimeout(1500)
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  const bad = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  return bad.map((v) => `${path}: ${v.id} (${v.impact}) ${v.nodes.length} node(s) — ${v.help}`)
}

test('client pages have no serious or critical accessibility violations', async ({ page }) => {
  test.setTimeout(240_000)
  await enterAs(page, /Ingrid Vos/)
  const problems: string[] = []
  for (const p of CLIENT_PAGES) problems.push(...(await audit(page, p)))
  expect(problems, problems.join('\n')).toEqual([])
})

test('staff pages and the public statement have no serious or critical accessibility violations', async ({ page }) => {
  test.setTimeout(180_000)
  await enterAs(page, /Helena Brandt/)
  const problems: string[] = []
  for (const p of STAFF_PAGES) problems.push(...(await audit(page, p)))
  // The withdrawn public page (PCF 2024) is read from the Opinion tab so the seeded code need not be hard-coded.
  await page.goto('/engagements/svc_nw_pcf_2024/opinion')
  await page.waitForTimeout(1500)
  const code = (await page.locator('code.font-mono.font-bold').first().innerText()).trim()
  await page.goto('/sign-in')
  problems.push(...(await audit(page, '/sign-in')))
  problems.push(...(await audit(page, `/verify/${code}`)))
  expect(problems, problems.join('\n')).toEqual([])
})

test('administration pages have no serious or critical accessibility violations', async ({ page }) => {
  test.setTimeout(150_000)
  await enterAs(page, /Sam Okafor/)
  const problems: string[] = []
  for (const p of ADMIN_PAGES) problems.push(...(await audit(page, p)))
  expect(problems, problems.join('\n')).toEqual([])
})
