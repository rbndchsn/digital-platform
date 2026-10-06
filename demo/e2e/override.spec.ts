/** Chapter 12 — manager override (PRD §6.14): a stuck step is forced with a reason; the log and the client's next action follow. */
import { expect, test } from '@playwright/test'
import { enterAs } from './helpers'

test('ch.12 — Helena forces the desk review to completed with a reason; Ingrid no longer has to re-upload; the log shows the override', async ({ page }) => {
  // Before: the client is asked to re-upload the rejected activity data.
  await enterAs(page, /Ingrid Vos/)
  await expect(page.getByRole('button', { name: /Re-upload Activity data samples/ }).first()).toBeVisible()

  await enterAs(page, /Helena Brandt/)
  await page.goto('/engagements/svc_nw_inv_2025/phases')
  await expect(page.getByText('Execution ›')).toBeVisible()
  await page.getByRole('button', { name: 'Override status' }).click()
  await page.getByRole('menuitem', { name: 'Force complete' }).click()
  const dialogButton = page.getByRole('button', { name: 'Force complete' })
  await expect(dialogButton).toBeDisabled()
  await page.getByLabel(/Reason for the override/).fill('Evidence reviewed off-platform during the site visit; closing to keep the plan.')
  await dialogButton.click()
  await expect(page.getByText(/Override recorded: Desk review is now completed/)).toBeVisible()
  await expect(page.getByText('Completed by override')).toBeVisible()
  await expect(page.getByText(/Manager override by Helena Brandt/)).toBeVisible()

  // The Service Log records it as an override with the reason.
  await page.goto('/engagements/svc_nw_inv_2025/log')
  await page.getByRole('combobox', { name: 'Filter by event type' }).selectOption('override')
  await expect(page.getByText(/Override: Desk review completed by Helena Brandt/)).toBeVisible()
  await expect(page.getByText(/closing to keep the plan/).first()).toBeVisible()

  // The client's next action has moved: the re-upload is no longer asked.
  await enterAs(page, /Ingrid Vos/)
  await expect(page.getByText('Needs your action')).toBeVisible()
  await expect(page.getByRole('button', { name: /Re-upload Activity data samples/ })).toHaveCount(0)

  // The platform administrator's audit log lists the override under the "Overrides" filter.
  await enterAs(page, /Sam Okafor/)
  await page.goto('/admin/audit?type=override')
  await expect(page.getByText(/Override: Desk review completed by Helena Brandt/)).toBeVisible()
})

test('ch.12 — the manager reassigns a team role with a reason and the new member must declare conflicts', async ({ page }) => {
  await enterAs(page, /Helena Brandt/)
  await page.goto('/engagements/svc_atlas_decarb_2025/phases')
  await expect(page.getByText('Team nomination and conflicts of interest')).toBeVisible()
  const row = page.getByRole('listitem').filter({ hasText: 'Priya Natarajan' })
  await row.getByRole('button', { name: 'Reassign' }).click()
  await page.getByLabel(/New team member/).selectOption('usr_jonas')
  await page.getByLabel(/Reason for the reassignment/).fill('Priya is on leave until November; Jonas takes the data review.')
  await page.getByRole('button', { name: 'Reassign role' }).click()
  await expect(page.getByText(/reassigned to Jonas Weber/)).toBeVisible()
  await expect(page.getByRole('listitem').filter({ hasText: 'Jonas Weber' }).getByText('COI pending')).toBeVisible()
  // Impartiality cannot be forced: the completion override is disabled on team nomination.
  await page.getByRole('button', { name: 'Override status' }).click()
  await expect(page.getByRole('menuitem', { name: 'Force complete' })).toHaveAttribute('data-disabled', '')
})
