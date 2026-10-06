// Loads one or more paths from the production build as a persona and prints console errors / page errors.
// Usage: node scripts/probe.mjs "Ingrid Vos" / /engagements
import { chromium } from '@playwright/test'
import { preview } from 'vite'

const [persona, ...paths] = process.argv.slice(2)
const server = await preview({ preview: { port: 4175, strictPort: true }, logLevel: 'silent' })
const base = 'http://localhost:4175'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const problems = []
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') problems.push(`[console.${m.type()}] ${m.text()}`)
})
page.on('pageerror', (e) => problems.push(`[pageerror] ${e.message}\n${e.stack ?? ''}`))

await page.goto(`${base}/sign-in`)
if (persona && persona !== '-') {
  await page.getByRole('button', { name: new RegExp(persona) }).click()
  await page.waitForURL((u) => !u.pathname.includes('sign-in'))
}
for (const p of paths.length ? paths : ['/']) {
  problems.length = 0
  await page.goto(`${base}${p}`)
  await page.waitForTimeout(800)
  const crashed = await page.getByText('Something went wrong').count()
  console.log(`\n=== ${p} ${crashed ? '(CRASHED)' : '(ok)'} ===`)
  for (const x of problems) console.log(x.slice(0, 1500))
  if (crashed) {
    await page.getByRole('button', { name: 'Show Error' }).click().catch(() => {})
    await page.waitForTimeout(200)
    console.log((await page.locator('body').innerText()).slice(0, 2000))
  }
}
await browser.close()
await server.close()
