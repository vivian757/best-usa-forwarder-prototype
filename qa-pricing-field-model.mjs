import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";
import { mergeCanonicalPricingRule } from "./src/data/pricingModel.js";

const url = process.argv[2] || "http://127.0.0.1:5178/";
const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

const rowText = async (table, index) => (await table.getByRole("row").nth(index).getByRole("cell").allTextContents()).map((value) => value.trim());
const appSource = readFileSync(new URL("./src/App.jsx", import.meta.url), "utf8");
assert.equal(appSource.includes('|| "Standard rule type"'), false, "Shipment pricing must not display a fabricated fallback Rule Type");
const migratedLegacyStop = mergeCanonicalPricingRule(
  { code: "MULTI_STOP", description: "Additional delivery stop", source: "Per additional stop", templateKey: "flat_rate", amount: 125 },
  { code: "MULTI_STOP", name: "Additional delivery stop", rateCategory: "additional", ruleType: "per_unit", ruleTypeLabel: "Per unit", billingUnit: "STOP", equipmentType: null, conditions: [{ field: "deliveryStopNumber", operator: "greaterThan", value: 1 }], rate: 125 },
);
assert.equal(migratedLegacyStop.ruleType, "per_unit", "Legacy Carrier Rate state adopts the canonical Rule Type");
assert.equal(migratedLegacyStop.billingUnit, "STOP", "Legacy Carrier Rate state adopts the canonical billing unit");
assert.equal("templateKey" in migratedLegacyStop, false, "Legacy templateKey does not leak back into the runtime pricing model");

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });

  await page.getByRole("button", { name: "Quotations", exact: true }).click();
  await page.locator('.MuiDataGrid-row[data-id="RATE-DEMO-001"]').click();
  const customerBase = page.getByRole("table", { name: "Customer base pricing rules" });
  const customerAdditional = page.getByRole("table", { name: "Customer additional pricing rules" });
  const sharedRuleHeaders = ["Fee item", "Applies to", "Rule Type", "Unit", "Rate"];
  assert.deepEqual(await customerBase.getByRole("columnheader").allTextContents(), sharedRuleHeaders);
  assert.deepEqual(await customerAdditional.getByRole("columnheader").allTextContents(), sharedRuleHeaders);
  assert.deepEqual(await rowText(customerBase, 1), ["Base FTL freight", "Van / Dry Van (V)FTL shipments", "Flat rate", "Truck", "$2,400"]);
  assert.deepEqual(await rowText(customerAdditional, 1), ["Additional delivery stop", "All equipmentEach delivery stop after the first", "Per unit", "Stop", "$150"]);
  assert.deepEqual(await rowText(customerAdditional, 2), ["Detention", "All equipmentAfter 30 free min", "Threshold + time", "30 min", "$200"]);
  await page.screenshot({ path: "/private/tmp/best-usa-customer-quote-pricing-model.png", fullPage: false });

  await page.getByRole("button", { name: "Quotations", exact: true }).click();
  await page.getByRole("tab", { name: "Carrier Rates", exact: true }).click();
  await page.locator('.MuiDataGrid-row[data-id="COST-DEMO-001"]').click();
  const carrierBase = page.getByRole("table", { name: "Carrier base pricing rules" });
  const carrierAdditional = page.getByRole("table", { name: "Carrier additional pricing rules" });
  assert.deepEqual(await carrierBase.getByRole("columnheader").allTextContents(), sharedRuleHeaders);
  assert.deepEqual(await carrierAdditional.getByRole("columnheader").allTextContents(), sharedRuleHeaders);
  assert.deepEqual(await rowText(carrierBase, 1), ["Carrier truck rate", "Van / Dry Van (V)FTL shipments", "Flat rate", "Truck", "$1,850"]);
  assert.deepEqual(await rowText(carrierAdditional, 1), ["Additional delivery stop", "All equipmentEach delivery stop after the first", "Per unit", "Stop", "$125"]);
  await page.screenshot({ path: "/private/tmp/best-usa-carrier-rate-pricing-model.png", fullPage: false });

  await page.goto(`${url}?view=shipment&id=TRK-DEMO-001&module=shipments-trucking&tab=billing`, { waitUntil: "networkidle" });
  const customerSnapshot = page.getByRole("table", { name: "customer fee breakdown" });
  const vendorSnapshot = page.getByRole("table", { name: "vendor fee breakdown" });
  assert.deepEqual(await customerSnapshot.getByRole("columnheader").allTextContents(), ["Fee item", "Details", "Rule Type", "Unit", "Unit price"]);
  assert.deepEqual(await rowText(customerSnapshot, 1), ["Base FTL freight", "Van / Dry Van (V)FTL shipments", "Flat rate", "Truck", "$2,400"]);
  assert.deepEqual(await rowText(customerSnapshot, 2), ["Additional delivery stop", "All equipmentEach delivery stop after the first", "Per unit", "Stop", "$150"]);
  assert.deepEqual(await rowText(vendorSnapshot, 1), ["Carrier truck rate", "Van / Dry Van (V)FTL shipments", "Flat rate", "Truck", "$1,850"]);
  assert.deepEqual(await rowText(vendorSnapshot, 2), ["Additional delivery stop", "All equipmentEach delivery stop after the first", "Per unit", "Stop", "$125"]);
  await page.screenshot({ path: "/private/tmp/best-usa-shipment-pricing-model.png", fullPage: false });

  await page.goto(`${url}?view=shipment&id=TRK-DEMO-004&module=shipments-trucking&tab=billing`, { waitUntil: "networkidle" });
  const manualAdjustmentTable = page.getByRole("table", { name: "customer fee breakdown" });
  assert.deepEqual(await manualAdjustmentTable.getByRole("columnheader").allTextContents(), ["Fee item", "Details", "Rule Type", "Unit", "Unit price"]);
  assert.deepEqual(
    await rowText(manualAdjustmentTable, 3),
    ["Detention", "Driver waited 45 minutes beyond free time.", "Manual adjustment", "30 min", "$175"],
    "Manual adjustments display their reason as Details and do not inherit applicability",
  );
  await manualAdjustmentTable.screenshot({ path: "/private/tmp/best-usa-manual-adjustment-details.png" });

  console.log("Canonical pricing field model QA passed across Customer Quote, Carrier Rate, and Shipment Charge & Cost.");
  await context.close();
} finally {
  await browser.close();
}
