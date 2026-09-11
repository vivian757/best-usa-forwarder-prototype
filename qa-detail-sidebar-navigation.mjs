import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:5177/";
const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  const navigation = page.locator('.best-sidebar-shell:visible nav');

  await page.getByText("TRK-DEMO-001", { exact: true }).first().click();
  await page.getByRole("heading", { name: "TRK-DEMO-001", exact: true }).waitFor();
  await navigation.getByRole("button", { name: "Customers", exact: true }).click();
  await page.getByRole("heading", { name: "Customers", exact: true }).waitFor();
  assert.equal(await page.getByRole("heading", { name: "TRK-DEMO-001", exact: true }).count(), 0, "Shipment detail closes when navigating to Customers");

  await page.getByText("Demo Retail Distribution LLC", { exact: true }).first().click();
  await page.getByRole("heading", { name: "Edit Customer", exact: true }).waitFor();

  await navigation.getByRole("button", { name: "Quotations", exact: true }).click();
  await page.getByRole("heading", { name: "Quotations", exact: true }).waitFor();
  assert.equal(await page.getByRole("heading", { name: "Edit Customer", exact: true }).count(), 0, "Customer detail closes when navigating to Quotations");

  await page.getByText("2026 Retail California FTL", { exact: true }).first().click();
  await page.getByRole("heading", { name: "2026 Retail California FTL", exact: true }).waitFor();
  await navigation.getByRole("button", { name: "Billing & Accounting", exact: true }).click();
  await page.getByRole("heading", { name: "Billing & Accounting", exact: true }).waitFor();
  assert.equal(await page.getByRole("heading", { name: "2026 Retail California FTL", exact: true }).count(), 0, "Quotation detail closes when navigating to Billing");

  await navigation.getByRole("button", { name: "Carriers", exact: true }).click();
  await page.getByRole("heading", { name: "Carriers", exact: true }).waitFor();
  await page.getByText("Pacific Linehaul LLC", { exact: true }).first().click();
  await page.getByRole("heading", { name: "Edit Carrier", exact: true }).waitFor();
  await navigation.getByRole("button", { name: "Ocean", exact: true }).click();
  await page.getByRole("heading", { name: "Ocean", exact: true }).waitFor();
  assert.equal(await page.getByRole("heading", { name: "Edit Carrier", exact: true }).count(), 0, "Carrier detail closes when navigating to Ocean");

  console.log("Detail sidebar navigation QA passed.");
  await context.close();
} finally {
  await browser.close();
}
