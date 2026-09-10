import { chromium } from 'playwright'

const browser = await chromium.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
})
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('console', (message) => console.log('console:', message.type(), message.text()))
page.on('pageerror', (error) => console.log('pageerror:', error.message))
await page.goto('http://127.0.0.1:5177/', { waitUntil: 'networkidle' })
console.log('title:', await page.title())
console.log('table links:', await page.locator('.table-link').count())
console.log('body:', (await page.locator('body').innerText()).slice(0, 4000))
await page.screenshot({ path: '.impeccable/review/debug.png' })
await browser.close()
