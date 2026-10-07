import { expect, type Page } from '@playwright/test'

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

/** Ticks every checkbox of the open review dialog (the materiality item only becomes enabled once acknowledged). */
export async function tickAll(page: Page) {
  for (const box of await page.getByRole('dialog').getByRole('checkbox').all()) {
    if (await box.isEnabled()) await box.click()
  }
}

/** The public code shown on the statement card of a service's Opinion tab. */
export async function statementCode(page: Page, serviceId: string): Promise<string> {
  await page.goto(`/engagements/${serviceId}/opinion`)
  await expect(page.getByText('Verification code').first()).toBeVisible()
  return (await page.locator('code.font-mono.font-bold').first().innerText()).trim()
}

/**
 * Chapter 14 (PRD v0.3 FR-89): Helena opens a post-issuance event, Marc decides a revision, the team re-confirms
 * COI, the team leader prepares the revision iteration, IR and decision run again and the old statement reads
 * Superseded. The team is the seeded Northwind team (Marcus, Priya, Tomas, Ana).
 */
export async function runRevision(page: Page, serviceId: string, nextIterationNo: number) {
  await enterAs(page, /Helena Brandt/)
  await page.goto(`/engagements/${serviceId}/opinion`)
  await page.getByRole('button', { name: 'Open post-issuance event' }).click()
  await page.getByLabel(/What was discovered/).fill('The client reports a corrected attributed volume; the verified figures must be restated.')
  await page.getByRole('button', { name: 'Open event', exact: true }).click()
  await expect(page.getByText(/Post-issuance event opened/)).toBeVisible()
  await expect(page.getByText('Under review').first()).toBeVisible()

  await enterAs(page, /Marc Lefèvre/)
  await page.goto(`/engagements/${serviceId}/opinion`)
  await page.getByRole('button', { name: 'Decide', exact: true }).click()
  await page.getByRole('radio', { name: /Revise the opinion/ }).check()
  await page.getByLabel(/^Reason/).fill('Attributed volume must be restated on delivered tonnes; the chain runs again.')
  await page.getByRole('button', { name: 'Open revision' }).click()
  await expect(page.getByText('Revision in progress')).toBeVisible()

  for (const member of [/Marcus Oyelaran/, /Priya Natarajan/, /Tomas Lindqvist/, /Ana Ferreira/]) {
    await enterAs(page, member)
    await page.goto(`/engagements/${serviceId}`)
    const card = page.getByTestId('coi-card')
    if (await card.count()) {
      await card.getByRole('button', { name: 'Re-confirm declaration' }).click()
      await expect(page.getByText(/re-confirmed/i).first()).toBeVisible()
    }
  }
  await enterAs(page, /Helena Brandt/)
  await page.goto(`/engagements/${serviceId}/phases`)
  // Completed phases are collapsed in the rail: expand Contracting, then open the nomination step.
  await page.getByRole('button', { name: /^Contracting/ }).first().click()
  await page.getByRole('button', { name: /Team nomination/ }).first().click()
  for (let i = 0; i < 6; i++) {
    const approve = page.getByRole('button', { name: 'Approve', exact: true })
    if ((await approve.count()) === 0) break
    await approve.first().click()
    await expect(page.getByText('COI decision recorded.').first()).toBeVisible()
    await page.waitForTimeout(400)
  }

  await enterAs(page, /Marcus Oyelaran/)
  await page.goto(`/engagements/${serviceId}/opinion`)
  await page.getByRole('button', { name: `Prepare iteration ${nextIterationNo}`, exact: false }).click()
  await page.getByRole('button', { name: `Create iteration ${nextIterationNo}` }).click()
  await page.getByRole('button', { name: 'Submit for independent review' }).click()
  await expect(page.getByText(`Iteration ${nextIterationNo} submitted for independent review.`)).toBeVisible()

  await enterAs(page, /Tomas Lindqvist/)
  await page.goto(`/engagements/${serviceId}/opinion`)
  await page.getByRole('button', { name: 'Independent review', exact: true }).click()
  await tickAll(page)
  await page.getByRole('button', { name: 'Approve' }).click()
  await expect(page.getByText(`Iteration ${nextIterationNo}: manager review`)).toBeVisible()

  await enterAs(page, /Marc Lefèvre/)
  await page.goto(`/engagements/${serviceId}/opinion`)
  await page.getByRole('button', { name: 'Manager decision', exact: true }).click()
  await tickAll(page)
  await page.getByRole('button', { name: 'Approve' }).click()
  await expect(page.getByText(`Iteration ${nextIterationNo}: approved`)).toBeVisible()
  await page.getByRole('button', { name: 'Issue opinion' }).first().click()
  await page.getByRole('button', { name: 'Issue opinion' }).last().click()
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Opinion issued' })).toBeVisible({ timeout: 25_000 })
  await page.goto(`/engagements/${serviceId}/opinion`)
  await expect(page.getByText('Statement history')).toBeVisible()
  await expect(page.getByTestId('statement-card').getByText('Issued', { exact: true })).toBeVisible()
  await expect(page.getByText('Superseded', { exact: true }).first()).toBeVisible()
}
