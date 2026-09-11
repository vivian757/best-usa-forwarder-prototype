import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.argv[2] || process.env.PROTOTYPE_URL || "http://127.0.0.1:5174/";
const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const runtimeErrors = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  await page.goto(url, { waitUntil: "networkidle" });

  await page.locator('.best-sidebar-shell:visible nav [role="button"]').filter({ hasText: "Quotations" }).click();
  await page.getByRole("heading", { name: "Quotations", exact: true }).waitFor();
  assert.equal(await page.locator('.MuiDataGrid-row[data-id="RATE-DEMO-005"]').count(), 0, "The separate warehouse quote is removed");

  const combinedRow = page.locator('.MuiDataGrid-row[data-id="RATE-DEMO-001"]');
  await combinedRow.waitFor();
  assert.match(await combinedRow.textContent(), /2026 Retail West Logistics/);
  assert.match(await combinedRow.textContent(), /LTL · California, Warehouse · California/);
  assert.doesNotMatch(await combinedRow.textContent(), /\+/);
  await combinedRow.click();

  await page.getByRole("heading", { name: "2026 Retail West Logistics", exact: true }).waitFor();
  await page.getByRole("table", { name: "Customer base pricing rules" }).waitFor();
  const warehouseTable = page.getByRole("table", { name: "Warehouse service items" });
  await warehouseTable.waitFor();
  assert.deepEqual(
    (await warehouseTable.getByRole("columnheader").allTextContents()).map((text) => text.trim()),
    ["Service item", "Qty", "Unit", "Unit rate", "Subtotal"],
  );
  assert.equal(await warehouseTable.getByRole("row").count(), 8);
  assert.match(await warehouseTable.textContent(), /Storage fee/);
  assert.match(await page.locator(".warehouse-service-total").textContent(), /\$74,299\.50/);
  assert.match(await page.locator(".warehouse-service-total").textContent(), /^Estimated total/);
  assert.doesNotMatch(await page.locator(".warehouse-service-total").textContent(), /warehouse/i);
  assert.equal(await page.locator(".warehouse-service-table > .warehouse-service-total").count(), 1, "Warehouse total uses the existing table total-row pattern");
  await page.getByText("Version 3", { exact: true }).waitFor();
  assert.equal(await page.getByRole("table", { name: "Customer base pricing rules" }).getByRole("columnheader", { name: "Rate", exact: true }).count(), 1);
  assert.equal(await page.getByRole("table", { name: "Customer additional pricing rules" }).getByRole("columnheader", { name: "Rate", exact: true }).count(), 1);
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  assert.equal(await page.locator(".rate-plan-edit-grid .MuiAutocomplete-tag").count(), 2, "Service scope renders as two selected options");
  const serviceScopeControl = page.locator(".rate-plan-edit-grid .best-form-control").filter({ hasText: "Service scope" });
  assert.equal(await serviceScopeControl.getByRole("combobox").count(), 1);
  await page.getByLabel("Additional rule 1 fixed amount").waitFor();
  await page.getByLabel("Additional rule 2 block rate").waitFor();
  await page.getByText("Fixed amount · USD", { exact: true }).waitFor();
  await page.getByText("Block rate · USD / 30 min", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.screenshot({ path: "/private/tmp/best-usa-combined-quotation.png", fullPage: true });

  await page.locator('.best-sidebar-shell:visible nav [role="button"]').filter({ hasText: "Trucking" }).click();
  await page.getByRole("heading", { name: "Trucking", exact: true }).waitFor();
  await page.locator('.MuiDataGrid-row[data-id="TRK-DEMO-001"]').click();
  await page.getByRole("heading", { name: "TRK-DEMO-001", exact: true }).waitFor();
  await page.getByRole("tab", { name: "Billing & Accounting", exact: true }).click();

  const customerLedger = page.getByRole("table", { name: "customer fee breakdown" });
  await customerLedger.waitFor();
  assert.match(await customerLedger.textContent(), /Base LTL freight/);
  assert.match(await customerLedger.textContent(), /Storage fee/);
  assert.match(await customerLedger.textContent(), /Warehouse/);
  assert.match(await customerLedger.textContent(), /\$74,899\.50/);
  await page.getByText("2026 Retail West Logistics · v3", { exact: true }).waitFor();
  assert.deepEqual(runtimeErrors, [], `runtime errors: ${runtimeErrors.join(" | ")}`);

  console.log(JSON.stringify({
    status: "passed",
    quoteId: "RATE-DEMO-001",
    quoteVersion: 3,
    services: ["Trucking", "Warehouse"],
    warehouseEstimate: "$74,299.50",
    shipmentCustomerCharge: "$74,899.50",
  }, null, 2));
  await context.close();
} finally {
  await browser.close();
}
