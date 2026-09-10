import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const url = 'http://127.0.0.1:5177/'
const reviewDir = '../../.impeccable/review'
await fs.mkdir(reviewDir, { recursive: true })

const browser = await chromium.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
})

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  const page = await context.newPage()
  await page.goto(url, { waitUntil: 'networkidle' })

  assert.equal(await page.title(), 'BEST USA Forwarder — Demo Prototype')
  await page.getByRole('heading', { name: 'Shipments', exact: true }).waitFor()
  assert.equal(await page.locator('.MuiDataGrid-row').count(), 4)
  await page.locator('.summary-grid').waitFor()
  assert.equal(await page.locator('.summary-card').count(), 3)
  assert.equal(await page.getByRole('columnheader', { name: 'Billing' }).count(), 0, 'Shipment list does not expose Billing')
  assert.equal(await page.getByRole('button', { name: /^View quotation/ }).count(), 3, 'only generated quotations are linked')
  await page.getByRole('button', { name: 'Collapse navigation' }).click()
  await page.waitForTimeout(250)
  assert.ok((await page.locator('.sidebar').boundingBox()).width <= 73)
  assert.ok((await page.locator('.main-area').boundingBox()).x <= 73)
  await page.getByRole('button', { name: 'Expand navigation' }).click()
  await page.waitForTimeout(250)

  const desktopFit = await page.evaluate(() => {
    const selectors = ['.sidebar', '.main-area', '.page-header', '.content-area', '.detail-page']
    return {
      viewport: { width: innerWidth, height: innerHeight },
      document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
      regions: selectors.map((selector) => {
        const rect = document.querySelector(selector)?.getBoundingClientRect()
        return rect ? { selector, left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom } : null
      }).filter(Boolean),
    }
  })
  assert.ok(desktopFit.document.width <= desktopFit.viewport.width, `desktop horizontal overflow: ${JSON.stringify(desktopFit)}`)
  assert.ok(desktopFit.regions.every((rect) => rect.right <= desktopFit.viewport.width + 1), `desktop clipped region: ${JSON.stringify(desktopFit)}`)
  await page.screenshot({ path: `${reviewDir}/desktop.png`, fullPage: false })

  await page.locator('.MuiDataGrid-row').first().click()
  assert.equal(await page.locator('.workbook').count(), 0, 'detail does not use a Workbook overlay')
  assert.equal(await page.locator('.detail-page').count(), 1, 'detail uses a full-page flow')
  assert.equal(await page.locator('.journey-rail').count(), 0, 'sources, review, submit, quote and billing are not rendered as a linear journey')
  assert.equal(await page.getByRole('tab').count(), 0, 'shipment work stays on one page rather than separate tabs')
  await page.getByRole('button', { name: /^Sources/ }).click()
  await page.getByRole('heading', { name: 'Source set' }).waitFor()
  await page.waitForTimeout(500)
  await page.locator('.source-disclosure-content').scrollIntoViewIfNeeded()
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${reviewDir}/desktop-sources.png`, fullPage: false })
  await page.getByRole('button', { name: /^Sources/ }).click()
  await page.getByText('8 sections · 42 fields').waitFor()
  const baselineGroups = [
    ['Identifiers', 3],
    ['Shipper', 4],
    ['Consignee', 4],
    ['Cargo', 18],
    ['Services', 1],
    ['Instructions', 1],
    ['Assignment', 9],
    ['Commercial', 2],
  ]
  assert.equal(await page.locator('.field-index nav button').count(), baselineGroups.length)
  assert.equal(await page.locator('.field-form-section .field-control').count(), 42, 'all baseline fields render on one page')
  assert.equal(await page.locator('.fields-workspace code').count(), 0, 'no program field paths shown')
  assert.equal(await page.locator('.fields-workspace .field-scope').count(), 0, 'no Core or Conditional tags shown')
  for (const [label, expectedCount] of baselineGroups) {
    const section = page.locator(`#field-section-${label.toLowerCase()}`)
    assert.equal(await section.locator('.field-control').count(), expectedCount, `${label} baseline count`)
  }
  await page.locator('.field-index nav button').filter({ hasText: 'Cargo' }).click()
  await page.getByLabel('Handling Unit Type', { exact: true }).waitFor()
  await page.waitForTimeout(650)
  assert.ok((await page.locator('#field-section-cargo').boundingBox()).y >= 0, 'Cargo anchor scrolls section into view')
  assert.equal(await page.locator('.field-index nav button.active').getAttribute('aria-current'), 'location')
  assert.match(await page.locator('.field-index nav button.active').innerText(), /Cargo/)
  assert.equal(await page.getByLabel('Mode').count(), 1)
  assert.equal(await page.getByLabel('Equipment Type').count(), 1)
  await page.screenshot({ path: `${reviewDir}/desktop-fields.png`, fullPage: false })

  await page.locator('#review-section').scrollIntoViewIfNeeded()
  await page.getByRole('heading', { name: 'Source evidence', exact: true }).waitFor()
  assert.equal(await page.getByText('equipmentRequirements[0].type').count(), 0, 'raw field path is hidden from review cards')
  assert.equal(await page.locator('#review-section .issue-field-name', { hasText: 'Equipment Type' }).count(), 1, 'human-readable field name is shown')
  assert.equal(await page.locator('.review-summary strong').count(), 3)
  for (const value of await page.locator('.review-summary strong').all()) {
    assert.ok((await value.boundingBox()).height >= 18, 'review summary number remains visible')
  }
  await page.screenshot({ path: `${reviewDir}/desktop-review.png`, fullPage: false })

  await page.getByRole('button', { name: 'Save draft' }).click()
  await page.getByText('Draft saved for this demo session.').waitFor()
  await page.getByRole('button', { name: 'Submit shipment' }).click()
  const blockedToast = page.getByRole('alert')
  await blockedToast.getByText(/Submit blocked by 2 candidate issues/).waitFor()
  assert.equal(await page.locator('.MuiAlert-colorError').count(), 1)

  await page.getByRole('button', { name: 'Add demo value' }).click()
  await page.getByRole('button', { name: 'Use 10 pallets' }).click()
  await page.getByRole('button', { name: 'Submit shipment' }).click()
  await page.locator('#output-section').scrollIntoViewIfNeeded()
  await page.getByText('Shipment confirmed for this browser session').waitFor()
  assert.equal(await page.locator('.notice-green').evaluate((element) => getComputedStyle(element).color), 'rgb(22, 114, 85)')
  assert.equal(await page.locator('.related-reference-grid .linked-record').count(), 2)
  await page.screenshot({ path: `${reviewDir}/desktop-committed.png`, fullPage: false })

  await page.locator('.sidebar nav button').filter({ hasText: 'Quotations' }).click()
  await page.getByRole('heading', { name: 'Quotations', exact: true }).waitFor()
  assert.equal(await page.locator('.MuiDataGrid-row').count(), 4)
  await page.locator('.MuiDataGrid-row', { hasText: 'Q-DEMO-001' }).click()
  await page.getByText('Quotation overview').waitFor()

  await page.locator('.sidebar nav button').filter({ hasText: 'Billing' }).click()
  await page.getByRole('heading', { name: 'Billing / Invoicing' }).waitFor()
  await page.getByRole('button', { name: 'Export report' }).waitFor()
  assert.equal(await page.locator('.MuiDataGrid-row').count(), 3)
  await page.locator('.MuiDataGrid-row', { hasText: 'BILL-DEMO-001' }).click()
  await page.getByRole('heading', { name: 'Billing readiness', exact: true }).waitFor()

  await page.locator('.sidebar nav button').filter({ hasText: 'Reports' }).click()
  await page.getByRole('heading', { name: 'Connected data preview' }).waitFor()
  await page.getByText('Shipment profitability ledger').waitFor()

  await page.locator('.sidebar nav button').filter({ hasText: 'Shipments' }).click()
  const search = page.getByPlaceholder('Search shipment, customer, reference or route')
  await search.fill('Medical')
  assert.equal(await page.locator('.MuiDataGrid-row').count(), 1)
  await page.locator('.MuiDataGrid-row').first().click()
  await page.getByRole('button', { name: 'Back to list' }).click()
  await page.getByPlaceholder('Search shipment, customer, reference or route').waitFor()
  assert.equal(await search.inputValue(), 'Medical', 'search state remains after returning from detail')
  assert.ok((await page.evaluate(() => document.activeElement?.closest('[data-id]')?.getAttribute('data-id'))) === 'TRK-DEMO-003', 'focus returns to the triggering row')
  await search.fill('No matching shipment')
  await page.getByText('No matching records').waitFor()
  await page.getByRole('button', { name: 'Clear search' }).click()
  await page.getByRole('tab', { name: /Completed/ }).click()
  assert.equal(await page.locator('.MuiDataGrid-row').count(), 1)
  await page.getByRole('tab', { name: /All/ }).click()

  await page.getByRole('button', { name: 'Create shipment' }).click()
  await page.getByText('Document-assisted intake').waitFor()
  await page.getByRole('button', { name: /Prepare job draft/ }).click()
  await page.locator('.shipment-single-page').waitFor()
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
    viewportWidth: innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    appBar: document.querySelector('.mobile-app-bar')?.getBoundingClientRect().toJSON(),
    header: document.querySelector('.page-header')?.getBoundingClientRect().toJSON(),
    detailPage: document.querySelector('.detail-page')?.getBoundingClientRect().toJSON(),
  }))
  assert.ok(mobileFit.documentWidth <= mobileFit.viewportWidth, `mobile page overflow: ${JSON.stringify(mobileFit)}`)
  assert.ok(mobileFit.appBar.bottom > 0 && mobileFit.header.top >= mobileFit.appBar.bottom)
  await mobile.screenshot({ path: `${reviewDir}/mobile.png`, fullPage: false })
  await mobile.locator('.MuiDataGrid-row').first().click()
  await mobile.getByRole('button', { name: /^Sources/ }).click()
  await mobile.getByRole('heading', { name: 'Source set' }).waitFor()
  await mobile.waitForTimeout(500)
  await mobile.locator('.source-disclosure-content').scrollIntoViewIfNeeded()
  await mobile.waitForTimeout(200)
  await mobile.screenshot({ path: `${reviewDir}/mobile-sources.png`, fullPage: false })
  await mobile.getByRole('button', { name: /^Sources/ }).click()
  await mobile.locator('#job-fields-section').scrollIntoViewIfNeeded()
  await mobile.getByRole('heading', { name: 'Job fields', exact: true }).waitFor()
  assert.equal(await mobile.locator('.field-form-section .field-control').count(), 42)
  await mobile.locator('.field-index nav button').filter({ hasText: 'Cargo' }).click()
  await mobile.getByLabel('Handling Unit Type', { exact: true }).waitFor()
  await mobile.screenshot({ path: `${reviewDir}/mobile-fields.png`, fullPage: false })
  await mobileContext.close()

  console.log(JSON.stringify({
    functional: 'passed',
    desktopFit,
    mobileFit,
    screenshots: [
      `${reviewDir}/desktop.png`,
      `${reviewDir}/desktop-sources.png`,
      `${reviewDir}/desktop-fields.png`,
      `${reviewDir}/desktop-review.png`,
      `${reviewDir}/desktop-committed.png`,
      `${reviewDir}/mobile.png`,
      `${reviewDir}/mobile-sources.png`,
      `${reviewDir}/mobile-fields.png`,
    ],
  }, null, 2))
} finally {
  await browser.close()
}
