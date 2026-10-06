import type { Page } from '@playwright/test'

/**
 * Sign in as a persona and wait until the guarded app has loaded.
 * If a session already exists, sign out through the account menu first (keeps the demo store intact).
 */
export async function enterAs(page: Page, persona: RegExp | string) {
  await page.goto('/sign-in')
  if (!page.url().includes('/sign-in')) {
    await page.getByRole('button', { name: 'Account menu' }).click()
    await page.getByRole('menuitem', { name: 'Sign out' }).click()
    await page.waitForURL(/sign-in/)
  }
  await page.getByRole('button', { name: persona }).click()
  await page.waitForURL((u) => !u.pathname.includes('sign-in'))
}
