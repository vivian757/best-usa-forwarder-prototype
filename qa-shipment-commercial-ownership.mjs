import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:5178/";
const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  await page.goto(url, { waitUntil: "networkidle" });
  assert.equal(await page.title(), "BEST USA Forwarder — Demo Prototype");

  await page.getByRole("button", { name: "Ocean", exact: true }).click();
  await page.locator('.MuiDataGrid-row[data-id="OCN-DEMO-012"]').click();
  await page.getByRole("heading", { name: "OCN-DEMO-012", exact: true }).waitFor();

  const oceanOverview = page.locator("#mode-section-overview");
  const oceanCommercial = page.locator("#mode-section-commercial");
  const oceanHouse = page.locator("#mode-section-house");
  assert.equal(await oceanOverview.getByText("Bill To", { exact: true }).count(), 0, "Ocean Overview does not duplicate Bill To");
  await oceanCommercial.getByRole("heading", { name: "Commercial", exact: true }).waitFor();
  await oceanCommercial.getByText("Freight Terms", { exact: true }).waitFor();
  await oceanCommercial.getByText("Bill To", { exact: true }).waitFor();
  await oceanCommercial.getByText("Pacific Coast Imports", { exact: true }).waitFor();
  for (const duplicatedField of ["Billing Account", "Payment Terms", "Currency", "Incoterms"]) {
    assert.equal(await oceanCommercial.getByText(duplicatedField, { exact: true }).count(), 0, `${duplicatedField} is not duplicated in Shipment Commercial`);
  }
  assert.equal(await oceanHouse.getByText("Incoterms", { exact: true }).count(), 0, "Ocean House does not own Incoterms");

  await page.getByRole("button", { name: "Air", exact: true }).click();
  await page.locator('.MuiDataGrid-row[data-id="AIR-DEMO-002"]').click();
  await page.getByRole("heading", { name: "AIR-DEMO-002", exact: true }).waitFor();
  assert.equal(await page.locator("#mode-section-house").getByText("Incoterms", { exact: true }).count(), 0, "Air House does not own Incoterms");
  await page.locator("#mode-section-commercial").getByText("Bill To", { exact: true }).waitFor();

  await page.getByRole("button", { name: "Quotations", exact: true }).click();
  await page.locator('.MuiDataGrid-row[data-id="RATE-DEMO-005"]').click();
  await page.getByRole("heading", { name: "2026 Retail Pacific FCL", exact: true }).waitFor();
  await page.getByText("Incoterms", { exact: true }).waitFor();
  await page.getByText("FOB", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("combobox", { name: "Incoterms", exact: true }).waitFor();

  console.log("Shipment Commercial ownership QA passed: operational terms stay in Shipment, quotation terms are not duplicated.");
} finally {
  await browser.close();
}
