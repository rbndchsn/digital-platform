/** Accessibility audit with axe on the key screens; fails on serious and critical violations. */
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { enterAs } from './helpers'

const CLIENT_PAGES = ['/', '/engagements', '/engagements/new', '/projects', '/engagements/svc_nw_inv_2025', '/engagements/svc_nw_inv_2025/phases', '/engagements/svc_nw_inv_2025/documents', '/engagements/svc_nw_inv_2025/findings', '/engagements/svc_nw_decarb_2025/timeline', '/engagements/svc_nw_decarb_2025/opinion', '/engagements/svc_nw_decarb_2025/log', '/records/inventories', '/records/decarb-units/dcu_nw_milk_2025', '/records/emission-factors', '/integrations', '/organisation', '/account']
const STAFF_PAGES = ['/staff', '/staff/triage', '/staff/services', '/staff/clients', '/staff/templates', '/staff/finance']
const ADMIN_PAGES = ['/admin', '/admin/users', '/admin/users?tab=organisations', '/admin/audit', '/admin/audit?view=auth', '/admin/coi', '/admin/settings', '/engagements/svc_nw_inv_2025/phases', '/engagements/svc_nw_inv_2025/documents']

async function audit(page: Page, path: string) {
  await page.goto(path)
  await page.waitForTimeout(1500)
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  const bad = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  return bad.map((v) => `${path}: ${v.id} (${v.impact}) ${v.nodes.length} node(s) — ${v.help}`)
}

test('client pages have no serious or critical accessibility violations', async ({ page }) => {
  test.setTimeout(180_000)
  await enterAs(page, /Ingrid Vos/)
  const problems: string[] = []
  for (const p of CLIENT_PAGES) problems.push(...(await audit(page, p)))
  expect(problems, problems.join('\n')).toEqual([])
})

test('staff pages and the public statement have no serious or critical accessibility violations', async ({ page }) => {
  test.setTimeout(120_000)
  await enterAs(page, /Helena Brandt/)
  const problems: string[] = []
  for (const p of STAFF_PAGES) problems.push(...(await audit(page, p)))
  await page.goto('/sign-in')
  problems.push(...(await audit(page, '/sign-in')))
  expect(problems, problems.join('\n')).toEqual([])
})

test('administration pages have no serious or critical accessibility violations', async ({ page }) => {
  test.setTimeout(120_000)
  await enterAs(page, /Sam Okafor/)
  const problems: string[] = []
  for (const p of ADMIN_PAGES) problems.push(...(await audit(page, p)))
  expect(problems, problems.join('\n')).toEqual([])
})
