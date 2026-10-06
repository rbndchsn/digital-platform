/** Chapter 11 — the platform administrator (PRD §3.2 v0.2, §6.13): sees everything, administers users, changes no engagement data. */
import { expect, test } from '@playwright/test'
import { enterAs } from './helpers'

test('ch.11 — Sam sees the dashboard with money, deactivates a user with a reason and finds it in the audit log', async ({ page }) => {
  await enterAs(page, /Sam Okafor/)
  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.getByRole('heading', { name: 'Administration dashboard' })).toBeVisible()
  await expect(page.getByText('Platform administrator only')).toBeVisible()
  await expect(page.getByText('Outstanding', { exact: true }).first()).toBeVisible()

  // Users: deactivate Pieter de Jong (typed confirmation + mandatory reason) and read the reassignment summary.
  await page.goto('/admin/users')
  await page.getByRole('button', { name: 'Actions for Pieter de Jong' }).click()
  await page.getByRole('menuitem', { name: 'Deactivate' }).click()
  await page.getByLabel(/^Reason/).fill('Left Northwind on 30 September 2026 (HR ticket 4471).')
  await page.getByPlaceholder('deactivate').fill('deactivate')
  await page.getByRole('button', { name: 'Deactivate user' }).click()
  await expect(page.getByText('Pieter de Jong deactivated — work to reassign')).toBeVisible()
  await expect(page.getByText(/Open findings assigned \(1\)/)).toBeVisible()
  await page.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByRole('row', { name: /Pieter de Jong/ }).getByText('Deactivated')).toBeVisible()

  // The audit log shows the action, its actor and its reason.
  await page.goto('/admin/audit')
  await expect(page.getByText(/Pieter de Jong deactivated by Sam Okafor/).first()).toBeVisible()
  await expect(page.getByText('HR ticket 4471').first()).toBeVisible()
  await page.getByRole('group', { name: 'Audit views' }).getByRole('button', { name: 'Authentication events' }).click()
  await expect(page.getByText(/Sam Okafor signed in/).first()).toBeVisible()

  // Settings: the announcement banner goes live for everyone.
  await page.goto('/admin/settings')
  await page.getByRole('switch', { name: 'Publish Scheduled maintenance' }).click()
  await expect(page.getByText('Announcement is live in the app shell.')).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'Scheduled maintenance' })).toBeVisible()
})

test('ch.11 — Sam opens an engagement and sees no action control, only break-glass for evidence content', async ({ page }) => {
  await enterAs(page, /Sam Okafor/)
  await page.goto('/engagements/svc_nw_inv_2025/phases')
  await expect(page.getByText('Platform administrator: read-only view')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Close step' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Override status' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^Actions/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Request from client' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Accept', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Re-upload corrected version' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^Upload$/ })).toHaveCount(0)
  await expect(page.getByText('Content closed').first()).toBeVisible()

  // Break-glass with a reason opens the content for this session and is logged.
  await page.getByRole('button', { name: 'Break-glass access' }).click()
  await page.getByLabel(/Why do you need the evidence content/).fill('Support ticket 2210: the client cannot open the activity data sample.')
  await page.getByRole('button', { name: 'Request access' }).click()
  await expect(page.getByText(/Break-glass access to VX-2026-0031 recorded/)).toBeVisible()
  await expect(page.getByText('Content closed')).toHaveCount(0)
  await page.goto('/admin/audit')
  await expect(page.getByText(/Break-glass evidence access to VX-2026-0031 by Sam Okafor/).first()).toBeVisible()

  // Records are read-only too.
  await page.goto('/records/decarb-units/dcu_nw_milk_2025')
  await expect(page.getByRole('button', { name: 'Verified values' })).toHaveCount(0)
  await page.goto('/staff/finance')
  await expect(page.getByRole('button', { name: 'Mark paid' })).toHaveCount(0)
})
