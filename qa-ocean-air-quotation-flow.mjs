import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:5177/";
const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

async function openShipmentPricing(page, mode, shipmentId) {
  await page.getByRole("button", { name: mode, exact: true }).click();
  await page.getByRole("heading", { name: mode, exact: true }).waitFor();
  await page.locator(`.MuiDataGrid-row[data-id="${shipmentId}"]`).click();
  await page.getByRole("heading", { name: shipmentId, exact: true }).waitFor();
  await page.getByRole("tab", { name: "Charge & Cost", exact: true }).click();
  await page.getByRole("heading", { name: "Customer Charge", exact: true }).waitFor();
}

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  assert.equal(await page.title(), "BEST USA Forwarder — Demo Prototype");

  await page.getByRole("button", { name: "Quotations", exact: true }).click();
  await page.getByRole("heading", { name: "Quotations", exact: true }).waitFor();
  await page.getByRole("tab", { name: "Customer Quotes", exact: true }).waitFor();

  const oceanQuoteRow = page.locator('.MuiDataGrid-row[data-id="RATE-DEMO-005"]');
  const airQuoteRow = page.locator('.MuiDataGrid-row[data-id="RATE-DEMO-006"]');
  await oceanQuoteRow.waitFor();
  await airQuoteRow.waitFor();
  await oceanQuoteRow.getByText("2026 Retail Pacific FCL", { exact: true }).waitFor();
  await oceanQuoteRow.getByText("Ocean", { exact: true }).waitFor();
  await airQuoteRow.getByText("2026 Home Supply Air Freight", { exact: true }).waitFor();
  await airQuoteRow.getByText("Air", { exact: true }).waitFor();
  await page.screenshot({ path: "/private/tmp/best-usa-ocean-air-quotation-list.png", fullPage: false });

  await oceanQuoteRow.click();
  await page.getByRole("heading", { name: "2026 Retail Pacific FCL", exact: true }).waitFor();
await page.getByText("Applies to Import · Ocean · FCL shipments for Demo Retail Distribution LLC", { exact: true }).waitFor();
  await page.getByRole("region", { name: "Retail Pacific FCL details" }).getByText("Ocean", { exact: true }).waitFor();
  assert.equal(await page.getByText("Shanghai, CN → Oakland, CA", { exact: true }).count(), 0, "Customer Quote is limited by transport mode, not route");
  await page.getByText("Ocean fuel surcharge", { exact: true }).waitFor();

  await openShipmentPricing(page, "Ocean", "OCN-DEMO-001");
  assert.equal(await page.getByText("No matching Customer Quote", { exact: true }).count(), 0, "Ocean pricing no longer uses the unmatched quote example");
  await page.getByRole("button", { name: "Open 2026 Retail Pacific FCL version 2 in new tab", exact: true }).waitFor();
  await page.getByRole("button", { name: "Open Demo Ocean Line FCL Cost 2026 in new tab", exact: true }).waitFor();
  await page.getByText("Base FCL freight", { exact: true }).waitFor();
  await page.getByText("Documentation fee", { exact: true }).waitFor();

  await openShipmentPricing(page, "Air", "AIR-DEMO-002");
  assert.equal(await page.getByText("No matching Customer Quote", { exact: true }).count(), 0, "Air pricing no longer uses the unmatched quote example");
  await page.getByRole("button", { name: "Open 2026 Home Supply Air Freight version 1 in new tab", exact: true }).waitFor();
  await page.getByRole("button", { name: "Open Demo Pacific Air Cargo Cost 2026 in new tab", exact: true }).waitFor();
  await page.getByText("Base Air Freight", { exact: true }).waitFor();
  await page.getByText("Security screening", { exact: true }).waitFor();

  await page.getByRole("button", { name: "Edit", exact: true }).click();
  assert.equal(await page.getByRole("button", { name: "Add item", exact: true }).count(), 2, "Air pricing keeps the same customer and vendor item controls as Trucking");
  await page.getByRole("heading", { name: "Customer Charge", exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: "/private/tmp/best-usa-air-applied-quotation.png", fullPage: false });

  console.log(JSON.stringify({
    status: "passed",
    url,
    checked: [
      "Ocean and Air quotes in Quotation list",
      "Ocean quote detail content",
      "Ocean shipment applied quote and carrier rate",
      "Air shipment applied quote and carrier rate",
      "Trucking-equivalent adjustment controls",
    ],
  }, null, 2));
  await context.close();
} finally {
  await browser.close();
}
