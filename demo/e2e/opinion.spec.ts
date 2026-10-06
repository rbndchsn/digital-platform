import { expect, test } from '@playwright/test'
import { enterAs } from './helpers'

test('ch.8 — iteration 2 is reviewed, approved and issued; the public statement opens', async ({ page }) => {
  // Team leader prepares iteration 2 and submits it for independent review
  await enterAs(page, /Marcus Oyelaran/)
  await page.goto('/engagements/svc_nw_decarb_2025/opinion')
  await expect(page.getByText('Changes requested by Tomas Lindqvist')).toBeVisible()
  await page.getByRole('button', { name: 'Prepare iteration 2', exact: true }).click()
  await page.getByRole('button', { name: 'Create iteration 2' }).click()
  await expect(page.getByText('Iteration 2 created')).toBeVisible()
  await page.getByRole('button', { name: 'Submit for independent review' }).click()
  await expect(page.getByText('Iteration 2 submitted for independent review.')).toBeVisible()

  // Independent reviewer approves with the checklist
  await enterAs(page, /Tomas Lindqvist/)
  await page.goto('/engagements/svc_nw_decarb_2025/opinion')
  await page.getByRole('button', { name: 'Independent review', exact: true }).click()
  const approve = page.getByRole('button', { name: 'Approve' })
  await expect(approve).toBeDisabled()
  for (const box of await page.getByRole('checkbox').all()) await box.click()
  await approve.click()
  await expect(page.getByText('Iteration 2: manager review')).toBeVisible()

  // Manager approves and issues
  await enterAs(page, /Helena Brandt/)
  await page.goto('/engagements/svc_nw_decarb_2025/opinion')
  await page.getByRole('button', { name: 'Manager approval', exact: true }).click()
  for (const box of await page.getByRole('checkbox').all()) await box.click()
  await page.getByRole('button', { name: 'Approve' }).click()
  await expect(page.getByText('Iteration 2: approved')).toBeVisible()
  await page.getByRole('button', { name: 'Issue opinion' }).first().click()
  await page.getByRole('button', { name: 'Issue opinion' }).last().click()
  await expect(page.getByText('Public verification code')).toBeVisible({ timeout: 20_000 })
  const code = (await page.locator('code.font-mono.font-bold').first().innerText()).trim()
  expect(code).toMatch(/^VX-[A-Z2-9]{4}-[A-Z2-9]{4}$/)

  // Public page without a session
  await page.goto(`/verify/${code}`)
  await expect(page.getByText('Genuine VERIFASSUR opinion')).toBeVisible()
  await expect(page.getByText('Northwind Dairy Cooperative')).toBeVisible()
  await page.goto('/verify/VX-NOPE-0000')
  await expect(page.getByText(/No statement found/)).toBeVisible()
})
