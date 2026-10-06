import { expect, test } from '@playwright/test'

test('placeholder page renders the product name', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'VERIFASSUR_X' })).toBeVisible()
})
