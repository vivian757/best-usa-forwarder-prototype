import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:5177/";
const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(10000);
  await page.goto(url, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Quotations", exact: true }).click();
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByRole("menuitem", { name: "Carrier Rate", exact: true }).click();
  await page.getByRole("heading", { name: "Create Carrier Rate", exact: true }).waitFor();

  await page.locator(".rate-plan-edit-grid input[role='combobox']").first().fill("Pacific Linehaul LLC");
  await page.getByRole("option", { name: "Pacific Linehaul LLC", exact: true }).click();
  await page.getByLabel(/^Rate plan name/).fill("Pacific FTL Demo Alternative");
  assert.equal(await page.locator(".rate-plan-edit-grid label").filter({ hasText: "Operation Direction" }).count(), 0, "Carrier rate header does not duplicate rule-level applicability");
  assert.equal(await page.locator(".rate-plan-edit-grid label").filter({ hasText: "Load Type" }).count(), 0, "Carrier rate Load Type is configured per pricing rule");

  await page.getByRole("button", { name: "Add rule", exact: true }).first().click();
  await page.getByLabel("Carrier base rule 1 fee item", { exact: true }).fill("FTL alternative linehaul");
  await page.getByRole("combobox", { name: "Carrier base rule 1 rule type", exact: true }).click();
  await page.getByRole("option", { name: "Flat rate", exact: true }).click();
  assert.equal((await page.getByRole("combobox", { name: "Carrier base rule 1 unit", exact: true }).textContent()).trim(), "Shipment");
  const carrierEquipment = page.getByRole("combobox", { name: "Carrier base rule 1 equipment", exact: true });
  const carrierCondition = page.getByRole("combobox", { name: "Carrier base rule 1 condition", exact: true });
  assert.equal((await carrierCondition.textContent()).trim(), "All shipments");
  const [carrierEquipmentBox, carrierConditionBox] = await Promise.all([carrierEquipment.boundingBox(), carrierCondition.boundingBox()]);
  assert.ok(carrierEquipmentBox && carrierConditionBox && Math.abs(carrierEquipmentBox.y - carrierConditionBox.y) < 2 && carrierConditionBox.x < carrierEquipmentBox.x, "Carrier Rate shows shipment conditions before Equipment Type");
  await page.getByLabel("Carrier base rule 1 rate", { exact: true }).fill("1900");
  await page.screenshot({ path: "/private/tmp/best-usa-carrier-rate-service-type.png", fullPage: true });
  await page.getByRole("button", { name: "Create", exact: true }).click();

  const status = page.getByRole("combobox", { name: "Carrier rate status", exact: true });
  await status.click();
  await page.getByRole("option", { name: "Accepted", exact: true }).click();
  await page.getByText("Applies to Trucking shipments fulfilled by Pacific Linehaul LLC.", { exact: true }).waitFor();

  await page.getByRole("button", { name: "Trucking", exact: true }).click();
  await page.locator('.MuiDataGrid-row[data-id="TRK-DEMO-001"]').click();
  await page.getByRole("tab", { name: "Charge & Cost", exact: true }).click();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  const carrierRate = page.getByRole("combobox", { name: "Applied carrier rate", exact: true });
  await carrierRate.click();
  await page.getByRole("option", { name: /Pacific FTL Demo Alternative/ }).waitFor();
  assert.equal(await page.getByText("Golden Gate LTL Cost 2026", { exact: false }).count(), 0, "An LTL carrier rate is not offered to the FTL shipment");

  console.log("Carrier Rate pricing-rule applicability QA passed.");
} finally {
  await browser.close();
}
