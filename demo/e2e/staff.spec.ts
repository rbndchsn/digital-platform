import { expect, test } from '@playwright/test'
import { enterAs } from './helpers'

test('ch.3 — the manager triages a request, approves scope and impartiality, nominates the team', async ({ page }) => {
  await enterAs(page, /Helena Brandt/)
  await expect(page).toHaveURL(/\/staff/)
  await page.goto('/staff/triage')
  await expect(page.getByText('Sourdough range 2025')).toBeVisible()
  await page.getByRole('button', { name: 'Accept into Contracting' }).first().click()
  await expect(page).toHaveURL(/engagements\/svc_atlas_pcf_2025\/phases/)
  await expect(page.getByText('accepted; contracting has started')).toBeVisible()

  // The client must upload the CPF first; the manager can request it.
  await expect(page.getByText('Waiting on the client:')).toBeVisible()
  await page.getByRole('button', { name: 'Request from client' }).click()
  await page.getByRole('button', { name: 'Send request' }).click()
  await expect(page.getByText(/Request sent/)).toBeVisible()
})

test('ch.4 — the client accepts the audit plan and execution starts', async ({ page }) => {
  await enterAs(page, /Amina Wanjiru/)
  await page.goto('/engagements/svc_sol_ver_2025')
  await expect(page.getByText('Needs you:')).toBeVisible()
  await page.getByRole('button', { name: /Accept the audit plan/ }).first().click()
  await page.getByRole('button', { name: 'Accept plan' }).click()
  await page.getByRole('button', { name: 'Approve' }).click()
  await expect(page.getByText('Audit plan acceptance approved')).toBeVisible()
  await expect(page.getByText('EXECUTION').first()).toBeVisible()
})

test('ch.3 — the manager approves a declared COI, which closes team nomination', async ({ page }) => {
  await enterAs(page, /Helena Brandt/)
  await page.goto('/engagements/svc_atlas_decarb_2025/phases')
  await expect(page.getByText('Team nomination and conflicts of interest')).toBeVisible()
  await page.getByRole('button', { name: 'Approve' }).first().click()
  await expect(page.getByText('COI decision recorded.')).toBeVisible()
})

test('finance adds an invoice and marks it paid', async ({ page }) => {
  await enterAs(page, /Jonas Weber/)
  await page.goto('/staff/finance')
  await expect(page.getByRole('heading', { name: 'Finance' })).toBeVisible()
  const row = page.getByRole('row', { name: /VX-2026-0022/ })
  await row.getByRole('button', { name: 'Mark paid' }).click()
  await expect(page.getByText('Marked paid.')).toBeVisible()
})
