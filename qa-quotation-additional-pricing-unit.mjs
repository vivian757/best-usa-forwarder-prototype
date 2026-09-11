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
  await page.getByRole("heading", { name: "2026 Retail California FTL", exact: true }).waitFor();

  const baseTable = page.getByRole("table", { name: "Customer base pricing rules" });
  assert.deepEqual(await baseTable.getByRole("columnheader").allTextContents(), ["Fee item", "Applies to", "Rule Type", "Unit", "Rate"]);
  assert.equal(await baseTable.locator(".rate-rule-head > [role='columnheader']").count(), 5, "Pricing table has no empty action header column");
  assert.equal((await baseTable.getByRole("row").nth(1).getByRole("cell").first().innerText()).trim(), "Base FTL freight");
  assert.equal((await baseTable.getByRole("row").nth(1).getByRole("cell").nth(1).innerText()).trim(), "Van / Dry Van (V)\nFTL shipments");
  assert.equal(await baseTable.getByRole("row").nth(1).getByRole("cell").nth(2).evaluate((element) => getComputedStyle(element).fontWeight), "400", "Base rule type uses regular weight");

  const table = page.getByRole("table", { name: "Customer additional pricing rules" });
  assert.deepEqual(await table.getByRole("columnheader").allTextContents(), ["Fee item", "Applies to", "Rule Type", "Unit", "Rate"]);
  assert.equal((await table.getByRole("row").nth(1).getByRole("cell").nth(2).innerText()).trim(), "Per unit");
  assert.equal(await table.getByRole("row").nth(1).getByRole("cell").nth(2).evaluate((element) => getComputedStyle(element).fontWeight), "400", "Additional rule type uses regular weight");
  assert.equal((await table.getByRole("row").nth(1).getByRole("cell").nth(1).innerText()).trim(), "All equipment\nEach delivery stop after the first");
  assert.equal((await table.getByRole("row").nth(1).getByRole("cell").nth(3).innerText()).trim(), "Stop");
  assert.equal((await table.getByRole("row").nth(2).getByRole("cell").nth(2).innerText()).trim(), "Threshold + time");
  assert.equal((await table.getByRole("row").nth(2).getByRole("cell").nth(3).innerText()).trim(), "30 min");

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
  assert.equal(await baseTable.locator(".rate-rule-head > [role='columnheader']").count(), 5, "Editing keeps the header to its five data columns");
  assert.equal(await baseTable.getByRole("columnheader", { name: "Rule actions", exact: true }).count(), 0, "Delete is a row action, not a table header icon");
  const baseDeleteButton = page.getByRole("button", { name: "Delete base rule 1", exact: true });
  assert.equal(await baseDeleteButton.count(), 1, "Delete remains available inside the Rate cell for its rule");
  assert.equal(await page.getByLabel("Base rule 1 fee item", { exact: true }).inputValue(), "Base FTL freight");
  assert.equal(await page.locator(".quotation-overview-card label").filter({ hasText: "Transport mode" }).count(), 1, "quotation scope keeps Transport mode");
  assert.equal(await page.locator(".quotation-overview-card label").filter({ hasText: "Direction" }).count(), 0, "quotation scope does not duplicate rule-level applicability");
  assert.equal(await page.locator(".quotation-overview-card label").filter({ hasText: "Load Type" }).count(), 0, "Load Type is configured per pricing rule");
  const equipmentType = page.getByRole("combobox", { name: "Base rule 1 equipment", exact: true });
  assert.equal((await equipmentType.innerText()).trim(), "Van / Dry Van (V)");
  await equipmentType.click();
  await page.getByRole("option", { name: "Reefer (R)", exact: true }).click();
  assert.equal((await equipmentType.innerText()).trim(), "Reefer (R)", "Equipment Type can be changed per base rule");
  const conditionControl = page.getByRole("combobox", { name: "Base rule 1 condition", exact: true });
  const [equipmentBox, conditionBox] = await Promise.all([equipmentType.boundingBox(), conditionControl.boundingBox()]);
  assert.ok(equipmentBox && conditionBox && Math.abs(equipmentBox.y - conditionBox.y) < 2 && conditionBox.x < equipmentBox.x, "Shipment conditions appear before Equipment Type inside Applies to");
  await baseTable.screenshot({ path: "/tmp/quotation-equipment-type.png" });
  const baseUnit = page.getByRole("combobox", { name: "Base rule 1 unit", exact: true });
  assert.equal((await baseUnit.innerText()).trim(), "Truck", "FTL base rule uses an explicit Truck unit");
  assert.equal((await conditionControl.innerText()).trim(), "FTL shipments");
  const group = page.locator(".quotation-rule-group").filter({ has: page.getByRole("heading", { name: "Additional Pricing", exact: true }) });
  await group.getByRole("button", { name: "Add rule", exact: true }).click();
  assert.equal((await page.getByRole("combobox", { name: "Additional rule 3 rule type", exact: true }).innerText()).trim(), "Per unit");
  assert.equal((await page.getByRole("combobox", { name: "Additional rule 3 unit", exact: true }).innerText()).trim(), "Shipment");
  assert.equal((await page.getByRole("combobox", { name: "Additional rule 3 condition", exact: true }).innerText()).trim(), "All shipments");
  await page.screenshot({ path: "/tmp/quotation-additional-pricing-unit.png", fullPage: true });

  console.log(JSON.stringify({ sharedHeaders: ["Fee item", "Applies to", "Rule Type", "Unit", "Rate"], baseFeeItem: "Base FTL freight", equipmentType: "Reefer (R)", quotationScope: "Trucking", defaultRuleType: "Per unit", defaultUnit: "Shipment", structuredConditions: true }));
} finally {
  await browser.close();
}
