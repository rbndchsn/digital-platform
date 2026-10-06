import { expect, test } from '@playwright/test'

test('ch.2 — a client submits a request through the wizard', async ({ page }) => {
  await page.goto('/sign-in')
  await page.getByRole('button', { name: /Ingrid Vos/ }).click()
  await page.getByRole('button', { name: 'Request work' }).click()
  await expect(page).toHaveURL(/engagements\/new/)

  // 1 Project
  await page.getByRole('button', { name: /Northwind product footprints/ }).click()
  await page.getByRole('button', { name: /^Next/ }).click()
  // 2 Service type
  await page.getByRole('button', { name: /Product carbon footprint verification/ }).click()
  await page.getByRole('button', { name: /^Next/ }).click()
  await expect(page.getByText(/Draft .* autosaved/)).toBeVisible()
  // 3 Scope
  await page.getByLabel('Scope summary').fill('Cradle-to-gate PCF of whey protein concentrate 80.')
  await page.getByRole('button', { name: /^Next/ }).click()
  // 4 Attachments
  await page.getByRole('button', { name: 'Add attachment' }).click()
  await page.getByRole('button', { name: 'Simulate upload' }).click()
  await expect(page.getByText(/uploaded \(v1\)/)).toBeVisible()
  await page.getByRole('button', { name: /^Next/ }).click()
  // 5 Review and submit
  await expect(page.getByText('Pre-engagement form (generated)')).toBeVisible()
  await page.getByRole('checkbox').click()
  await page.getByRole('button', { name: 'Submit request' }).click()
  await expect(page.getByText(/submitted\. VERIFASSUR will triage it shortly/)).toBeVisible()
  await expect(page).toHaveURL(/engagements\/svc_/)
})
