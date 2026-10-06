import { expect, test } from '@playwright/test'

test('sign-in page renders and a persona can enter the client portal', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/sign-in/)
  await expect(page.getByRole('heading', { name: 'VERIFASSUR_X' })).toBeVisible()
  await page.getByRole('button', { name: /Ingrid Vos/ }).click()
  await expect(page.getByText('Client portal')).toBeVisible()
  await expect(page.getByText('Your role: Admin')).toBeVisible()
})

test('a verifier persona lands on the staff workspace', async ({ page }) => {
  await page.goto('/sign-in')
  await page.getByRole('button', { name: /Helena Brandt/ }).click()
  await expect(page).toHaveURL(/\/staff/)
  await expect(page.getByText('Verifier workspace')).toBeVisible()
})
