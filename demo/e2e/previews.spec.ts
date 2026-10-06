import { expect, test } from '@playwright/test'
import { enterAs } from './helpers'

test('ch.10 — a client registers interest in a preview feature and VERIFASSUR sees it', async ({ page }) => {
  await enterAs(page, /Ingrid Vos/)
  await page.goto('/integrations')
  await expect(page.getByText('MCP server', { exact: true })).toBeVisible()
  const mcpCard = page.locator('div', { hasText: 'MCP server' }).filter({ has: page.getByRole('button', { name: "I'm interested" }) }).last()
  await mcpCard.getByRole('button', { name: "I'm interested" }).click()
  await page.getByPlaceholder(/carbon-accounting tool/).fill('We use an agentic carbon-accounting tool.')
  await page.getByRole('button', { name: 'Register interest' }).click()
  await expect(page.getByText(/VERIFASSUR has been told/)).toBeVisible()
  await expect(page.getByText('Interest registered').first()).toBeVisible()

  await page.goto('/preview/dmrv')
  await expect(page.getByText('Digital MRV connectors').first()).toBeVisible()

  await enterAs(page, /Helena Brandt/)
  await page.goto('/staff/clients')
  await expect(page.getByText('Interest signals')).toBeVisible()
  await expect(page.getByText('We use an agentic carbon-accounting tool.')).toBeVisible()
})
