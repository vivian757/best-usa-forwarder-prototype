import { chromium } from 'playwright'
import fs from 'node:fs/promises'

const url = 'http://127.0.0.1:5177/'
const outputDir = '../../.impeccable/review/audit'
await fs.mkdir(outputDir, { recursive: true })

const browser = await chromium.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
})

async function inspect(page, label) {
  const result = await page.evaluate((snapshotLabel) => {
    const visible = (element) => {
      const style = getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0
    }
    const ids = [...document.querySelectorAll('[id]')].map((element) => element.id).filter(Boolean)
    const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))]
    const controls = [...document.querySelectorAll('button, a[href], input, select, textarea, [role="button"]')].filter((element) => visible(element) && element.getAttribute('aria-hidden') !== 'true')
    const unnamedControls = controls.filter((element) => {
      const label = element.id ? document.querySelector(`label[for="${CSS.escape(element.id)}"]`)?.textContent.trim() : ''
      const name = element.getAttribute('aria-label') || element.getAttribute('title') || label || element.textContent.trim()
      return !name
    }).map((element) => element.outerHTML.slice(0, 180))
    const undersizedControls = controls.filter((element) => {
      if (element.closest('.MuiDataGrid-root') || element.classList.contains('table-link')) return false
      const rect = element.matches('input,select,textarea') && element.closest('.MuiInputBase-root')
        ? element.closest('.MuiInputBase-root').getBoundingClientRect()
        : element.getBoundingClientRect()
      return rect.width < 40 || rect.height < 40
    }).map((element) => {
      const rect = element.getBoundingClientRect()
      return { name: element.getAttribute('aria-label') || element.textContent.trim().slice(0, 60), width: Math.round(rect.width), height: Math.round(rect.height), className: element.className?.toString().slice(0, 100) }
    })
    const smallText = [...document.querySelectorAll('body *')].filter((element) => {
      if (!visible(element) || element.children.length || element.closest('legend')) return false
      return Number.parseFloat(getComputedStyle(element).fontSize) < 11
    }).map((element) => ({ text: element.textContent.trim().slice(0, 80), size: getComputedStyle(element).fontSize, className: element.className?.toString().slice(0, 100) }))
    const viewport = { width: innerWidth, height: innerHeight }
    const regions = ['.mobile-app-bar', '.sidebar', '.main-area', '.page-header', '.content-area', '.detail-page', '.detail-action-bar']
      .map((selector) => {
        const element = document.querySelector(selector)
        if (!element || !visible(element)) return null
        const rect = element.getBoundingClientRect()
        return { selector, left: Math.round(rect.left), top: Math.round(rect.top), right: Math.round(rect.right), bottom: Math.round(rect.bottom), width: Math.round(rect.width), height: Math.round(rect.height) }
      }).filter(Boolean)
    return {
      label: snapshotLabel,
      viewport,
      document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
      duplicateIds,
      unnamedControls,
      undersizedControls,
      smallText,
      regions,
      headings: [...document.querySelectorAll('h1,h2,h3')].filter(visible).map((heading) => `${heading.tagName}:${heading.textContent.trim()}`),
    }
  }, label)
  return result
}

async function capture(page, name) {
  await page.waitForTimeout(250)
  await page.screenshot({ path: `${outputDir}/${name}.png`, fullPage: false })
}

const results = []
try {
  const desktop = await browser.newContext({ viewport: { width: 1283, height: 904 }, reducedMotion: 'reduce', acceptDownloads: true })
  const page = await desktop.newPage()
  await page.goto(url, { waitUntil: 'networkidle' })
  results.push(await inspect(page, 'desktop-shipments'))
  await capture(page, 'desktop-shipments')

  await page.locator('.sidebar nav button').filter({ hasText: 'Quotations' }).click()
  results.push(await inspect(page, 'desktop-quotations'))
  await capture(page, 'desktop-quotations')
  await page.locator('.MuiDataGrid-row').first().click()
  results.push(await inspect(page, 'desktop-quotation-detail'))
  await capture(page, 'desktop-quotation-detail')

  await page.locator('.sidebar nav button').filter({ hasText: 'Billing' }).click()
  results.push(await inspect(page, 'desktop-billing'))
  await capture(page, 'desktop-billing')
  await page.locator('.MuiDataGrid-row').first().click()
  results.push(await inspect(page, 'desktop-billing-detail'))
  await capture(page, 'desktop-billing-detail')

  await page.locator('.sidebar nav button').filter({ hasText: 'Reports' }).click()
  results.push(await inspect(page, 'desktop-reports'))
  await capture(page, 'desktop-reports')

  await page.locator('.sidebar nav button').filter({ hasText: 'Shipments' }).click()
  await page.locator('.MuiDataGrid-row').first().click()
  results.push(await inspect(page, 'desktop-shipment-detail'))
  await capture(page, 'desktop-shipment-detail')
  await page.getByRole('button', { name: /^Sources/ }).click()
  await page.waitForTimeout(500)
  await page.locator('.source-disclosure-content').scrollIntoViewIfNeeded()
  results.push(await inspect(page, 'desktop-sources'))
  await capture(page, 'desktop-sources')
  await page.getByRole('button', { name: /^Sources/ }).click()
  await page.locator('#job-fields-section').scrollIntoViewIfNeeded()
  results.push(await inspect(page, 'desktop-fields'))
  await capture(page, 'desktop-fields')
  await page.locator('#review-section').scrollIntoViewIfNeeded()
  results.push(await inspect(page, 'desktop-review'))
  await capture(page, 'desktop-review')
  await desktop.close()

  for (const [name, viewport] of Object.entries({ tablet: { width: 768, height: 1024 }, mobile: { width: 390, height: 844 } })) {
    const context = await browser.newContext({ viewport, isMobile: name === 'mobile', hasTouch: name === 'mobile', reducedMotion: 'reduce' })
    const current = await context.newPage()
    await current.goto(url, { waitUntil: 'networkidle' })
    results.push(await inspect(current, `${name}-shipments`))
    await capture(current, `${name}-shipments`)
    await current.getByRole('button', { name: 'Open navigation' }).click()
    await current.waitForTimeout(250)
    results.push(await inspect(current, `${name}-navigation`))
    await capture(current, `${name}-navigation`)
    await current.locator('.MuiDrawer-root nav button').first().click()
    await current.locator('.MuiDataGrid-row').first().click()
    results.push(await inspect(current, `${name}-shipment-detail`))
    await capture(current, `${name}-shipment-detail`)
    await current.locator('#job-fields-section').scrollIntoViewIfNeeded()
    results.push(await inspect(current, `${name}-fields`))
    await capture(current, `${name}-fields`)
    await current.locator('#review-section').scrollIntoViewIfNeeded()
    results.push(await inspect(current, `${name}-review`))
    await capture(current, `${name}-review`)
    await context.close()
  }

  await fs.writeFile(`${outputDir}/audit.json`, JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
} catch (error) {
  await fs.writeFile(`${outputDir}/audit.json`, JSON.stringify(results, null, 2))
  await fs.writeFile(`${outputDir}/error.txt`, error.stack || String(error))
  console.error(error)
  process.exitCode = 1
} finally {
  await browser.close()
}
