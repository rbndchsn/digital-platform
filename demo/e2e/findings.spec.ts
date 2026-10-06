import { expect, test } from '@playwright/test'
import { enterAs } from './helpers'

test('ch.6 — the site manager answers a CAR with evidence and the auditor closes it', async ({ page }) => {
  await enterAs(page, /Pieter de Jong/)
  await page.goto('/engagements/svc_nw_inv_2025/findings')
  await expect(page.getByText('blocking finding open')).toBeVisible()
  await page.getByRole('link', { name: /Lelystad Q3 gas volumes unsupported/ }).click()
  await expect(page.getByText('Blocks the opinion')).toBeVisible()
  await page.getByRole('button', { name: 'Attach evidence' }).click()
  await page.getByRole('button', { name: 'Simulate upload' }).click()
  await expect(page.getByText(/uploaded \(v1\)/)).toBeVisible()
  await page.getByPlaceholder(/Explain what you did/).fill('Q3 invoices and the calibrated meter export attached.')
  await page.getByRole('button', { name: 'Respond' }).click()
  await expect(page.getByText('Response posted.')).toBeVisible()
  await expect(page.getByText('RESPONDED')).toBeVisible()

  await enterAs(page, /Priya Natarajan/)
  await page.goto('/engagements/svc_nw_inv_2025/findings')
  await page.getByRole('link', { name: /Lelystad Q3 gas volumes unsupported/ }).click()
  await page.getByRole('button', { name: 'Mark under review' }).click()
  await page.getByRole('button', { name: 'Close finding' }).click()
  await expect(page.getByText(/CAR #2 closed/)).toBeVisible()
  await page.goto('/engagements/svc_nw_inv_2025/findings')
  await expect(page.getByText('blocking finding open')).toHaveCount(0)
})
