/** Plays the whole investor storyline (DEMO_SCRIPT.md) in one browser session, in order. */
import { expect, test } from '@playwright/test'
import { enterAs } from './helpers'

test.describe.configure({ mode: 'serial' })

test('the full ten-chapter storyline runs without a dead click', async ({ page }) => {
  test.setTimeout(240_000)

  // 1 — home
  await enterAs(page, /Ingrid Vos/)
  await expect(page.getByText('Needs your action')).toBeVisible()
  await expect(page.getByText('Verified records')).toBeVisible()

  // 2 — request
  await page.getByRole('button', { name: 'Request work' }).click()
  await page.getByRole('button', { name: /Northwind product footprints/ }).click()
  await page.getByRole('button', { name: /^Next/ }).click()
  await page.getByRole('button', { name: /Product carbon footprint verification/ }).click()
  await page.getByRole('button', { name: /^Next/ }).click()
  await page.getByLabel('Scope summary').fill('Cradle-to-gate PCF of whey protein concentrate 80.')
  await page.getByRole('button', { name: /^Next/ }).click()
  await page.getByRole('button', { name: /^Next/ }).click()
  await page.getByRole('checkbox').click()
  await page.getByRole('button', { name: 'Submit request' }).click()
  await expect(page).toHaveURL(/engagements\/svc_/)

  // 3 — triage and COI
  await enterAs(page, /Helena Brandt/)
  await page.goto('/staff/triage')
  await page.getByRole('button', { name: 'Accept into Contracting' }).first().click()
  await expect(page).toHaveURL(/phases/)
  await page.goto('/engagements/svc_atlas_decarb_2025/phases')
  await page.getByRole('button', { name: 'Approve' }).first().click()
  await expect(page.getByText('COI decision recorded.')).toBeVisible()

  // 4 — audit plan acceptance
  await enterAs(page, /Amina Wanjiru/)
  await page.goto('/engagements/svc_sol_ver_2025')
  await page.getByRole('button', { name: /Accept the audit plan/ }).first().click()
  await page.getByRole('button', { name: 'Accept plan' }).click()
  await page.getByRole('button', { name: 'Approve' }).click()
  await expect(page.getByText('Audit plan acceptance approved')).toBeVisible()

  // 5 — evidence
  await enterAs(page, /Ingrid Vos/)
  await page.goto('/engagements/svc_nw_inv_2025')
  await page.getByRole('button', { name: /Re-upload Activity data samples/ }).first().click()
  await page.getByRole('button', { name: 'Re-upload corrected version' }).click()
  await page.getByRole('button', { name: 'Simulate upload' }).click()
  await expect(page.getByText(/uploaded \(v2\)/)).toBeVisible()
  await enterAs(page, /Priya Natarajan/)
  await page.goto('/engagements/svc_nw_inv_2025/phases')
  await page.getByRole('button', { name: 'Accept' }).first().click()
  await expect(page.getByText('Document accepted.')).toBeVisible()

  // 6 — findings
  await enterAs(page, /Pieter de Jong/)
  await page.goto('/engagements/svc_nw_inv_2025/findings')
  await page.getByRole('link', { name: /Lelystad Q3 gas volumes unsupported/ }).click()
  await page.getByPlaceholder(/Explain what you did/).fill('Invoices attached.')
  await page.getByRole('button', { name: 'Respond', exact: true }).click()
  await expect(page.getByText('Response posted.')).toBeVisible()
  await enterAs(page, /Priya Natarajan/)
  await page.goto('/engagements/svc_nw_inv_2025/findings')
  await page.getByRole('link', { name: /Lelystad Q3 gas volumes unsupported/ }).click()
  await page.getByRole('button', { name: 'Close finding' }).click()
  await expect(page.getByText(/CAR #2 closed/)).toBeVisible()

  // 7 — records
  await enterAs(page, /Ingrid Vos/)
  await page.goto('/records/decarb-units/dcu_nw_milk_2025')
  await expect(page.getByText('400,000 tCO2e').first()).toBeVisible()
  await page.getByRole('combobox').last().selectOption('L')
  await page.getByRole('button', { name: 'Recompute' }).click()
  await expect(page.getByText('Unit mismatch')).toBeVisible()

  // 8 — opinion
  await enterAs(page, /Marcus Oyelaran/)
  await page.goto('/engagements/svc_nw_decarb_2025/opinion')
  await page.getByRole('button', { name: 'Prepare iteration 2', exact: true }).click()
  await page.getByRole('button', { name: 'Create iteration 2' }).click()
  await page.getByRole('button', { name: 'Submit for independent review' }).click()
  await expect(page.getByText('Iteration 2 submitted for independent review.')).toBeVisible()
  await enterAs(page, /Tomas Lindqvist/)
  await page.goto('/engagements/svc_nw_decarb_2025/opinion')
  await page.getByRole('button', { name: 'Independent review', exact: true }).click()
  for (const box of await page.getByRole('checkbox').all()) await box.click()
  await page.getByRole('button', { name: 'Approve' }).click()
  await expect(page.getByText('Iteration 2: manager review')).toBeVisible()
  await enterAs(page, /Helena Brandt/)
  await page.goto('/engagements/svc_nw_decarb_2025/opinion')
  await page.getByRole('button', { name: 'Manager approval', exact: true }).click()
  for (const box of await page.getByRole('checkbox').all()) await box.click()
  await page.getByRole('button', { name: 'Approve' }).click()
  await page.getByRole('button', { name: 'Issue opinion' }).first().click()
  await page.getByRole('button', { name: 'Issue opinion' }).last().click()
  await expect(page.getByText('Public verification code')).toBeVisible({ timeout: 20_000 })
  const code = (await page.locator('code.font-mono.font-bold').first().innerText()).trim()
  await page.goto(`/verify/${code}`)
  await expect(page.getByText('Genuine VERIFASSUR opinion')).toBeVisible()

  // 9 — timeline and log
  await enterAs(page, /Ingrid Vos/)
  await page.goto('/engagements/svc_nw_decarb_2025/log')
  await expect(page.getByRole('cell', { name: /Opinion issued \(/ }).first()).toBeVisible()
  await page.goto('/records/decarb-units')
  await expect(page.getByRole('row', { name: /2025/ }).getByText('VERIFIED')).toBeVisible()

  // 10 — previews
  await page.goto('/integrations')
  await page.getByRole('button', { name: "I'm interested" }).first().click()
  await page.getByRole('button', { name: 'Register interest' }).click()
  await expect(page.getByText(/VERIFASSUR has been told/)).toBeVisible()
  await enterAs(page, /Helena Brandt/)
  await page.goto('/staff/clients')
  await expect(page.getByText('Interest signals')).toBeVisible()
  await expect(page.getByText('Ingrid Vos · Northwind Dairy Cooperative')).toBeVisible()
})
