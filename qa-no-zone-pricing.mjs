import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:5174/";
const browser = await chromium.launch({ headless: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });

  await page.locator('nav [role="button"]:visible').filter({ hasText: /^Quotations$/ }).first().click();
  await page.locator('.MuiDataGrid-row[data-id="RATE-DEMO-001"]').click();
  await page.getByRole("heading", { name: "2026 Retail California FTL", exact: true }).waitFor();
  assert.equal(await page.getByText(/Zone × tier matrix|Zone [A-Z]/).count(), 0, "Customer quote has no Zone pricing examples");
  assert.ok(await page.getByText("Flat rate", { exact: true }).count() > 0, "Customer quote uses Flat rate");

  await page.locator('nav [role="button"]:visible').filter({ hasText: /^Trucking$/ }).first().click();
  await page.locator('.MuiDataGrid-row[data-id="TRK-DEMO-001"]').click();
  await page.getByRole("tab", { name: "Charge & Cost", exact: true }).click();
  assert.equal(await page.getByText(/Zone × tier matrix|Zone [A-Z]/).count(), 0, "Shipment pricing has no Zone pricing examples");
  assert.ok(await page.getByText("Flat rate", { exact: true }).count() > 0, "Shipment pricing uses Flat rate");

  await page.getByRole("button", { name: /Pacific FTL Multi-stop Cost 2026/ }).click();
  await page.getByRole("heading", { name: "Pacific FTL Multi-stop Cost 2026", exact: true }).waitFor();
  assert.equal(await page.getByText(/Zone × tier matrix|Zone [A-Z]/).count(), 0, "Carrier rate has no Zone pricing examples");
  assert.ok(await page.getByText("Flat rate", { exact: true }).count() > 0, "Carrier rate uses Flat rate");

  console.log("No-Zone pricing QA passed.");
  await context.close();
} finally {
  await browser.close();
}
