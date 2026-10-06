import { expect, test } from '@playwright/test'
import { enterAs } from './helpers'

test('ch.7 — inventory per gas and the milk decarb_unit record with a unit-mismatch refusal', async ({ page }) => {
  await enterAs(page, /Ingrid Vos/)
  await page.goto('/records/inventories')
  await expect(page.getByRole('heading', { name: 'GHG inventories' })).toBeVisible()
  await page.getByRole('link', { name: '2025', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'GHG inventory 2025' })).toBeVisible()
  await expect(page.getByText('Raw milk from member farms')).toBeVisible()
  await expect(page.getByText('Biogenic CO2 (reported separately)')).toBeVisible()

  await page.goto('/records/decarb-units/dcu_nw_milk_2025')
  await expect(page.getByText('Reduction decarb_units')).toBeVisible()
  await expect(page.getByText('400,000 tCO2e').first()).toBeVisible()
  await expect(page.getByText('0.400 tCO2e/t').first()).toBeVisible()

  // What-if with litres against a per-tonne factor is refused
  await page.getByRole('combobox').last().selectOption('L')
  await page.getByRole('button', { name: 'Recompute' }).click()
  await expect(page.getByText('Unit mismatch')).toBeVisible()
  await page.getByRole('combobox').last().selectOption('kg')
  await page.getByRole('button', { name: 'Recompute' }).click()
  await expect(page.getByText(/400 tCO2e reduction units/)).toBeVisible()

  await page.goto('/records/decarb-units')
  await expect(page.getByRole('heading', { name: 'decarb_units' })).toBeVisible()
  await expect(page.getByText('Verified decarb_units')).toBeVisible()
})
