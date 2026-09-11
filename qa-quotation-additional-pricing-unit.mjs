import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:5174/";
const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(10000);
  await page.goto(url, { waitUntil: "networkidle" });
  await page.locator('.best-sidebar-shell:visible nav [role="button"]').filter({ hasText: "Quotations" }).click();
  await page.locator('.MuiDataGrid-row[data-id="RATE-DEMO-001"] [data-field="name"]').click();
  await page.getByRole("heading", { name: "2026 Retail West LTL", exact: true }).waitFor();

  const baseTable = page.getByRole("table", { name: "Customer rate matrix" });
  assert.deepEqual(await baseTable.getByRole("columnheader").allTextContents(), ["Rule template", "Equipment Type", "Configuration", "Rate"]);
  assert.equal((await baseTable.getByRole("row").nth(1).getByRole("cell").nth(1).innerText()).trim(), "Van / Dry Van (V)");
  assert.equal(await baseTable.getByRole("row").nth(1).getByRole("cell").first().evaluate((element) => getComputedStyle(element).fontWeight), "400", "Base rule template uses regular weight");

  const table = page.getByRole("table", { name: "Surcharge rules" });
  assert.deepEqual(await table.getByRole("columnheader").allTextContents(), ["Fee item", "Rule template", "Unit", "Rate"]);
  assert.equal(await table.getByRole("columnheader", { name: "Applies when", exact: true }).count(), 0);
  assert.equal((await table.getByRole("row").nth(1).getByRole("cell").nth(1).innerText()).trim(), "Per unit");
  assert.equal(await table.getByRole("row").nth(1).getByRole("cell").nth(1).evaluate((element) => getComputedStyle(element).fontWeight), "400", "Additional rule template uses regular weight");
  assert.equal((await table.getByRole("row").nth(1).getByRole("cell").nth(2).innerText()).trim(), "Shipment");

  const scopeAlert = page.getByText("Applies to Trucking shipments for Demo Retail Distribution LLC", { exact: true });
  await scopeAlert.waitFor();
  const quoteStatus = page.getByRole("combobox", { name: "Quote plan status", exact: true });
  await quoteStatus.click();
  await page.getByRole("option", { name: "Draft", exact: true }).click();
  await scopeAlert.waitFor({ state: "hidden" });
  await page.getByRole("combobox", { name: "Quote plan status", exact: true }).click();
  await page.getByRole("option", { name: "Accepted", exact: true }).click();
  await scopeAlert.waitFor();

  await page.getByRole("button", { name: "Edit", exact: true }).click();
  assert.equal(await page.locator(".quotation-overview-card label").filter({ hasText: "Transport mode" }).count(), 1, "quotation scope keeps Transport mode");
  assert.equal(await page.locator(".quotation-overview-card label").filter({ hasText: "Service Type" }).count(), 0, "quotation scope does not add Service Type");
  const equipmentType = page.getByRole("combobox", { name: "Base rule 1 equipment type", exact: true });
  assert.equal((await equipmentType.innerText()).trim(), "Van / Dry Van (V)");
  await equipmentType.click();
  await page.getByRole("option", { name: "Reefer (R)", exact: true }).click();
  assert.equal((await equipmentType.innerText()).trim(), "Reefer (R)", "Equipment Type can be changed per base rule");
  await baseTable.screenshot({ path: "/tmp/quotation-equipment-type.png" });
  const baseConfiguration = page.getByRole("combobox", { name: "Base rule 1 configuration", exact: true });
  assert.equal((await baseConfiguration.innerText()).trim(), "0–2,500 lb", "Tiered base configuration shows only the weight range");
  assert.equal(await page.getByRole("combobox", { name: "Base rule 1 tier", exact: true }).count(), 0);
  assert.equal(await page.getByRole("combobox", { name: "Base rule 1 basis", exact: true }).count(), 0);
  const group = page.locator(".quotation-rule-group").filter({ has: page.getByRole("heading", { name: "Additional Pricing", exact: true }) });
  await group.getByRole("button", { name: "Add rule", exact: true }).click();
  assert.equal((await page.getByRole("combobox", { name: "Additional rule 3 rule template", exact: true }).innerText()).trim(), "Per unit");
  assert.equal((await page.getByRole("combobox", { name: "Additional rule 3 unit", exact: true }).innerText()).trim(), "Shipment");
  await page.screenshot({ path: "/tmp/quotation-additional-pricing-unit.png", fullPage: true });

  console.log(JSON.stringify({ baseHeaders: ["Rule template", "Equipment Type", "Configuration", "Rate"], equipmentType: "Reefer (R)", quotationScope: "Transport mode only", additionalHeaders: ["Fee item", "Rule template", "Unit", "Rate"], defaultTemplate: "Per unit", defaultUnit: "Shipment", simplifiedBaseConfiguration: true }));
} finally {
  await browser.close();
}
