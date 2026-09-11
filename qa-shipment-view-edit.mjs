import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:5175/";
const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });

  await page.locator(".MuiDataGrid-row").first().click();
  await page.getByRole("heading", { name: "TRK-DEMO-001", exact: true }).waitFor();
  await page.getByRole("button", { name: "Edit", exact: true }).waitFor();
  assert.equal(await page.locator("#job-fields-section input").count(), 0, "A regular shipment entry opens in View mode");
  assert.ok(await page.locator("#job-fields-section .field-control-view").count() > 0, "View mode uses readable values instead of disabled inputs");

  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("button", { name: "Save changes", exact: true }).waitFor();
  assert.ok(await page.locator("#job-fields-section input").count() > 0, "Edit enables the Details form");
  await page.getByText("Select an equipment type.", { exact: true }).waitFor();
  const handlingUnitCount = page.getByRole("region", { name: "Stop 1" }).getByLabel("Handling Unit Count", { exact: true });
  assert.equal(await handlingUnitCount.inputValue(), "8", "Extracted handling-unit count remains a normal value");
  assert.notEqual(await handlingUnitCount.getAttribute("aria-invalid"), "true", "Handling-unit count is not marked invalid");
  assert.equal(await page.getByText(/conflicting pallet counts/i).count(), 0, "The synthetic pallet-count conflict is not part of extraction examples");
  await handlingUnitCount.fill("9");
  await page.getByRole("tab", { name: "Charge & Cost", exact: true }).click();
  assert.equal(await page.getByText("Pricing needs recalculation", { exact: true }).count(), 0, "Editing shipment details does not show a recalculation alert");
  assert.equal(await page.getByRole("button", { name: "Recalculate", exact: true }).count(), 0, "Charge & Cost has no recalculation action");
  await page.getByRole("tab", { name: "Details", exact: true }).click();
  assert.equal(await page.getByText("Blocks submit", { exact: true }).count(), 0, "Blockers explain the reason and corrective action");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Edit", exact: true }).waitFor();
  assert.equal(await page.locator("#job-fields-section input").count(), 0, "Cancel returns to View mode");

  await page.getByRole("button", { name: "Trucking", exact: true }).click();
  await page.getByRole("heading", { name: "Trucking", exact: true }).waitFor();
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByRole("button", { name: "Start from scratch", exact: true }).click();
  await page.getByRole("button", { name: "Save changes", exact: true }).waitFor();
  assert.ok(await page.locator("#job-fields-section input").count() > 0, "A newly created draft opens directly in Edit mode");

  console.log("Shipment View/Edit QA passed.");
} finally {
  await browser.close();
}
