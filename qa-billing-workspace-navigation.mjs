import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:5175/";
const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  await page.locator('.best-sidebar-shell:visible nav [role="button"]').filter({ hasText: "Billing" }).click();
  await page.getByRole("heading", { name: "Billing & Accounting", exact: true }).waitFor();

  const row = page.locator('.MuiDataGrid-row').first();
  const shipmentId = (await row.locator('[data-field="shipmentId"]').textContent()).trim();
  await row.locator('[data-field="counterparty"]').click();

  await page.getByRole("heading", { name: shipmentId, exact: true }).waitFor();
  const billingTab = page.getByRole("tab", { name: "Billing & Accounting", exact: true });
  assert.equal(await billingTab.getAttribute("aria-selected"), "true", "Billing list rows open the related Shipment billing workspace");
  assert.equal(await page.getByText(/^Bill-to:|^Pay-to:/).count(), 0, "The duplicate Billing detail page is not shown");

  console.log(`Billing workspace navigation QA passed for ${shipmentId}.`);
  await context.close();
} finally {
  await browser.close();
}
