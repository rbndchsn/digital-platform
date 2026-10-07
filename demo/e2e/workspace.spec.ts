import { expect, test } from '@playwright/test'
import { enterAs } from './helpers'

test('ch.5 — the client re-uploads a rejected document and the auditor accepts it', async ({ page }) => {
  await enterAs(page, /Ingrid Vos/)
  await page.goto('/engagements/svc_nw_inv_2025')
  await expect(page.getByText('Needs you:')).toBeVisible()
  await page.getByRole('button', { name: /Re-upload Activity data samples/ }).first().click()
  await expect(page).toHaveURL(/phases\?step=/)
  await expect(page.getByText('Q3 natural gas invoices for Lelystad are missing')).toBeVisible()
  await page.getByRole('button', { name: 'Re-upload corrected version' }).click()
  await page.getByRole('button', { name: 'Simulate upload' }).click()
  await expect(page.getByText(/uploaded \(v2\)/)).toBeVisible()

  // Switch to the auditor and accept
  await enterAs(page, /Priya Natarajan/)
  await page.goto('/engagements/svc_nw_inv_2025/phases')
  await page.getByRole('button', { name: 'Accept' }).first().click()
  await expect(page.getByText('Document accepted.')).toBeVisible()

  // Service Log and Timeline reflect it
  await page.goto('/engagements/svc_nw_inv_2025/log')
  await expect(page.getByText(/accepted by Priya Natarajan/).first()).toBeVisible()
  await page.goto('/engagements/svc_nw_inv_2025/timeline')
  await expect(page.getByRole('group', { name: 'Timeline of phases and steps' })).toBeVisible()
})

test('ch.3 — a nominated auditor is gated by the COI declaration', async ({ page }) => {
  await enterAs(page, /Priya Natarajan/)
  await page.goto('/engagements/svc_atlas_decarb_2025')
  await expect(page.getByText('Conflict-of-interest declaration required')).toBeVisible()
  await page.getByRole('button', { name: 'Submit declaration' }).click()
  await expect(page.getByText('Declaration submitted', { exact: true })).toBeVisible()
})
