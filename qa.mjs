import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const url = 'http://127.0.0.1:5177/'
const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const reviewDir = '.impeccable/review'

await fs.mkdir(reviewDir, { recursive: true })

const browser = await chromium.launch({ headless: true, executablePath: chromePath })

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  const page = await context.newPage()
  await page.goto(url, { waitUntil: 'networkidle' })

  assert.equal(await page.title(), 'BEST USA Forwarder — Demo Prototype')
  await page.getByRole('heading', { name: 'Shipments', exact: true }).waitFor()
  await page.locator('.table-link', { hasText: 'TRK-DEMO-001' }).waitFor()

  const fit = await page.evaluate(() => {
    const selectors = ['.sidebar', '.page-header', '.record-chain', '.ledger-surface', '.detail-panel']
    return {
      viewport: { width: innerWidth, height: innerHeight },
      document: {
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
      },
      regions: selectors.map((selector) => {
        const rect = document.querySelector(selector)?.getBoundingClientRect()
        return rect ? { selector, x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom } : null
      }),
    }
  })
  assert.ok(fit.document.width <= fit.viewport.width, `desktop horizontal overflow: ${JSON.stringify(fit)}`)
  assert.ok(fit.regions.filter(Boolean).every((rect) => rect.right <= fit.viewport.width + 1), `desktop clipped region: ${JSON.stringify(fit)}`)

  const commitButton = page.getByRole('button', { name: 'Commit shipment' })
  assert.equal(await commitButton.isDisabled(), true)
  await page.screenshot({ path: `${reviewDir}/desktop.png`, fullPage: false })

  await page.getByRole('tab', { name: /Review/ }).click()
  await page.getByRole('button', { name: '補填設備需求' }).click()
  await page.getByRole('button', { name: '採用 XLS：10 pallets' }).click()
  assert.equal(await commitButton.isDisabled(), false)
  await commitButton.click()
  await page.getByText('BILL OF LADING', { exact: true }).waitFor()
  await page.screenshot({ path: `${reviewDir}/desktop-committed.png`, fullPage: false })

  await page.getByRole('button', { name: 'Quotations' }).click()
  await page.getByRole('heading', { name: 'Quotation management' }).waitFor()
  await page.getByRole('button', { name: 'Q-DEMO-001' }).click()
  await page.getByText('Quotation summary').waitFor()

  await page.getByRole('button', { name: 'Billing／請款' }).click()
  await page.getByRole('heading', { name: 'Operational billing' }).waitFor()
  await page.getByRole('button', { name: 'BILL-DEMO-001' }).click()
  await page.getByText('Handoff readiness').waitFor()

  await page.getByRole('button', { name: 'Reports' }).click()
  await page.getByRole('heading', { name: 'Connected data preview' }).waitFor()
  await page.getByText('Data readiness by shipment').waitFor()

  await page.getByRole('button', { name: 'Shipments' }).click()
  const search = page.getByPlaceholder('Search Shipments')
  await search.fill('Medical')
  assert.equal(await page.locator('tbody tr').count(), 1)
  await search.fill('No matching shipment')
  await page.getByText('找不到符合條件的資料').waitFor()
  await page.getByRole('button', { name: 'Clear search' }).click()
  await page.locator('.select-field select').selectOption('confirmed')
  assert.ok(await page.locator('tbody tr').count() >= 1)
  await page.locator('.select-field select').selectOption('all')

  await context.close()

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: 'reduce',
  })
  const mobile = await mobileContext.newPage()
  await mobile.goto(url, { waitUntil: 'networkidle' })
  const mobileFit = await mobile.evaluate(() => ({
    width: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    navBottom: document.querySelector('.sidebar')?.getBoundingClientRect().bottom,
    headerBottom: document.querySelector('.page-header')?.getBoundingClientRect().bottom,
  }))
  assert.ok(mobileFit.scrollWidth <= mobileFit.width, `mobile page overflow: ${JSON.stringify(mobileFit)}`)
  assert.ok(mobileFit.navBottom > 0 && mobileFit.headerBottom > mobileFit.navBottom)
  await mobile.screenshot({ path: `${reviewDir}/mobile.png`, fullPage: false })

  await mobile.getByRole('tab', { name: /Review/ }).click()
  await mobile.locator('.detail-panel').scrollIntoViewIfNeeded()
  await mobile.screenshot({ path: `${reviewDir}/mobile-review.png`, fullPage: false })
  await mobileContext.close()

  console.log(JSON.stringify({
    functional: 'passed',
    desktopFit: fit,
    mobileFit,
    screenshots: [
      `${reviewDir}/desktop.png`,
      `${reviewDir}/desktop-committed.png`,
      `${reviewDir}/mobile.png`,
      `${reviewDir}/mobile-review.png`,
    ],
  }, null, 2))
} finally {
  await browser.close()
}
