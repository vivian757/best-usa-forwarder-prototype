import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:5174/";
const screenshotPath = "/tmp/shipment-pricing-unit-edit.png";
const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(10000);
  await page.goto(url, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Trucking", exact: true }).click();
  await page.getByRole("heading", { name: "Trucking", exact: true }).waitFor();
  await page.locator('.MuiDataGrid-row[data-id="TRK-DEMO-003"]').click();
  await page.getByRole("heading", { name: "TRK-DEMO-003", exact: true }).waitFor();
  await page.getByRole("tab", { name: "Charge & Cost", exact: true }).click();

  const pricingTable = page.getByRole("table", { name: "customer fee breakdown" });
  const headers = await pricingTable.getByRole("columnheader").allTextContents();
  assert.deepEqual(headers, ["Fee item", "Details", "Rule Type", "Unit", "Unit price"]);
  assert.equal(headers.includes("Amount"), false, "Shipment pricing does not expose an Amount column");
  assert.equal((await pricingTable.locator(".fee-line-unit").first().innerText()).trim(), "Truck", "Pricing units use sentence case");
  assert.equal(await pricingTable.locator(".fee-line-row small").count(), 2, "Customer pricing conditions remain visible");

  const vendorLedger = page.locator(".billing-ledger-block").filter({ has: page.getByRole("heading", { name: "Vendor Cost", exact: true }) });
  assert.equal(await vendorLedger.locator(".fee-line-row small").count(), 2, "Vendor pricing conditions remain visible without repeating the Unit");

  await page.getByRole("button", { name: "Edit", exact: true }).click();
  const customerUnitPrice = page.getByLabel("Customer Charge Base FTL freight unit price", { exact: true });
  const vendorUnitPrice = page.getByLabel("Vendor Cost Carrier truck rate unit price", { exact: true });
  assert.equal(await page.getByLabel("Customer Charge Base FTL freight unit", { exact: true }).count(), 0, "Unit remains a simple read-only value while editing");
  const unitPriceHeaderBox = await pricingTable.getByRole("columnheader", { name: "Unit price", exact: true }).boundingBox();
  const customerUnitPriceBox = await customerUnitPrice.boundingBox();
  assert.ok(unitPriceHeaderBox && customerUnitPriceBox && Math.abs(unitPriceHeaderBox.x - customerUnitPriceBox.x) <= 2, "Unit price header aligns with the input field");
  await customerUnitPrice.fill("1850");
  await vendorUnitPrice.fill("1750");

  const customerLedger = page.locator(".billing-ledger-block").filter({ has: page.getByRole("heading", { name: "Customer Charge", exact: true }) });
  await customerLedger.getByRole("button", { name: "Add item", exact: true }).click();
  await page.getByText("Add Customer Charge Adjustment", { exact: true }).waitFor();
  const dialog = page.locator(".MuiDialog-root").filter({ hasText: "Add Customer Charge Adjustment" });
  await dialog.getByLabel("Fee item", { exact: true }).fill("Manual handling");
  await dialog.getByLabel("Unit", { exact: true }).fill("PALLET");
  await dialog.getByLabel("Unit price (USD)", { exact: true }).fill("80");
  await dialog.getByLabel("Reason and note", { exact: true }).fill("Customer-approved handling exception.");
  await dialog.getByRole("button", { name: "Add item", exact: true }).click();
  await page.getByLabel("Manual handling unit price", { exact: true }).fill("75");
  await page.getByRole("button", { name: "Remove Manual handling", exact: true }).click();
  assert.equal(await page.getByText("Manual handling", { exact: true }).count(), 0, "Manual adjustments can be removed");

  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  assert.equal((await pricingTable.locator(".fee-line-unit").first().innerText()).trim(), "Truck", "Read-only unit remains visible after save");
  assert.equal(await customerUnitPrice.inputValue(), "1850", "Edited customer unit price persists after save");
  assert.equal(await vendorUnitPrice.inputValue(), "1750", "Edited vendor unit price persists after save");
  await page.getByRole("button", { name: "Delete Vendor Cost High-value handling", exact: true }).click();
  assert.equal(await vendorLedger.getByText("High-value handling", { exact: true }).count(), 0, "Existing vendor pricing lines can be deleted");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  assert.equal(await vendorLedger.getByText("High-value handling", { exact: true }).count(), 0, "Deleted vendor pricing lines remain removed after save");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.screenshot({ path: screenshotPath, fullPage: true });

  console.log(JSON.stringify({ headers, readOnlyUnit: true, editableCustomerUnitPrice: true, editableVendorUnitPrice: true, adjustmentAddDelete: true, existingLineDelete: true, screenshotPath }));
} finally {
  await browser.close();
}
