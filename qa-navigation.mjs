import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";

const url = process.argv[2] || process.env.PROTOTYPE_URL || "http://127.0.0.1:5175/";
const outputDir = "../../.impeccable/review/navigation";
await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await desktop.newPage();
  const runtimeErrors = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  assert.deepEqual(runtimeErrors, [], `runtime errors: ${runtimeErrors.join(" | ")}`);

  await page.getByRole("heading", { name: "Trucking", exact: true }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Shipments", exact: true }).getAttribute("aria-expanded"), "true");
  for (const item of ["Trucking", "Ocean", "Air"]) {
    assert.equal(await page.getByRole("button", { name: item, exact: true }).count(), 1, `${item} submenu renders once`);
  }
  assert.ok(await page.locator(".MuiDataGrid-row").count() > 0, "Trucking shows current synthetic records");

  await page.getByRole("button", { name: "Ocean", exact: true }).click();
  await page.getByRole("heading", { name: "Ocean", exact: true }).waitFor();
  await page.getByText("Ocean operations are outside this Trucking-first demo. This entry preserves the future module boundary.").waitFor();
  await page.getByRole("img", { name: "Ocean empty state illustration", exact: true }).waitFor();
  await page.getByText("No Ocean shipments are available in this demo yet.", { exact: true }).waitFor();
  assert.equal(await page.locator(".MuiDataGrid-row").count(), 0, "Ocean does not invent records outside the demo scope");
  await page.screenshot({ path: `${outputDir}/desktop-ocean-empty.png`, fullPage: false });

  await page.getByRole("button", { name: "Air", exact: true }).click();
  await page.getByRole("heading", { name: "Air", exact: true }).waitFor();
  await page.getByText("Air operations are outside this Trucking-first demo. This entry preserves the future module boundary.").waitFor();
  await page.getByRole("img", { name: "Air empty state illustration", exact: true }).waitFor();
  await page.getByText("No Air shipments are available in this demo yet.", { exact: true }).waitFor();
  assert.equal(await page.locator(".MuiDataGrid-row").count(), 0, "Air does not invent records outside the demo scope");
  await page.screenshot({ path: `${outputDir}/desktop-air-empty.png`, fullPage: false });

  await page.getByRole("button", { name: "Trucking", exact: true }).click();
  await page.getByRole("heading", { name: "Trucking", exact: true }).waitFor();
  await page.locator(".MuiDataGrid-row").first().waitFor();
  assert.ok(await page.locator(".MuiDataGrid-row").count() > 0, "Trucking shows current synthetic records");
  assert.equal(await page.getByRole("columnheader", { name: "Mode" }).count(), 1);
  assert.equal(await page.getByRole("columnheader", { name: "Service Type" }).count(), 1);
  await page.screenshot({ path: `${outputDir}/desktop-trucking-navigation.png`, fullPage: false });

  await page.locator(".MuiDataGrid-row").first().click();
  await page.getByRole("heading", { name: "TRK-DEMO-001", exact: true }).waitFor();
  assert.equal(await page.getByRole("button", { name: /^Rate plan ·/ }).count(), 0, "Rate plan is not duplicated in the detail header");
  assert.deepEqual(await page.getByRole("tab").allTextContents(), ["Details", "Billing & Accounting", "Documents"], "Billing & Accounting sits directly to the right of Details");
  assert.equal(await page.locator("#charges-section").count(), 0, "Commercial summary is removed from Details");
  await page.getByRole("button", { name: "3 sources", exact: true }).click();
  await page.getByRole("heading", { name: "Sources", exact: true }).waitFor();
  await page.getByText("Page 1 of 3", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Next source", exact: true }).click();
  await page.getByText("Page 2 of 3", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Close source panel", exact: true }).click();
  await page.getByRole("tab", { name: "Details", exact: true }).click();
  await page.getByRole("heading", { name: "Shipment details", exact: true }).waitFor();
  await page.getByRole("tab", { name: "Billing & Accounting", exact: true }).click();
  const commercialSection = page.locator("#charges-section");
  await commercialSection.getByRole("heading", { name: "Commercial summary", exact: true }).waitFor();
  for (const internalCode of ["BASE_LTL", "LIFTGATE", "flat_rate", "zone_tier_matrix"]) {
    assert.equal(await commercialSection.getByText(internalCode, { exact: true }).count(), 0, `${internalCode} is not exposed in Billing`);
  }
  assert.equal(await commercialSection.getByText(/LIFTGATE rule/).count(), 0, "Internal rule codes are replaced by readable source labels");
  assert.equal(await commercialSection.getByText("Estimated", { exact: true }).count(), 0, "Estimated status is removed from Commercial summary");
  assert.equal(await commercialSection.getByRole("button", { name: /Customer contract rate/ }).count(), 1, "Rate plan remains available in Commercial summary");
  assert.equal(await commercialSection.getByRole("tablist", { name: "Pricing side" }).count(), 0, "Customer and vendor ledgers no longer use inner tabs");
  assert.equal(await commercialSection.locator(".billing-ledger-block").count(), 2, "Customer charge and vendor cost render as separate blocks");
  await commercialSection.getByRole("heading", { name: "Customer charge", exact: true }).waitFor();
  await commercialSection.getByRole("heading", { name: "Vendor cost", exact: true }).waitFor();
  const adjustmentButtons = commercialSection.getByRole("button", { name: "Add item", exact: true });
  assert.equal(await adjustmentButtons.count(), 2, "Each ledger has its own adjustment action");
  await adjustmentButtons.nth(0).click();
  await page.getByRole("heading", { name: "Add customer charge adjustment", exact: true }).waitFor();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await adjustmentButtons.nth(1).click();
  await page.getByRole("heading", { name: "Add vendor cost adjustment", exact: true }).waitFor();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.screenshot({ path: `${outputDir}/desktop-commercial-summary-rate-plan.png`, fullPage: false });

  assert.equal(await page.getByRole("tab", { name: "Source", exact: true }).count(), 0, "Source is no longer a top-level shipment tab");
  await page.getByRole("tab", { name: "Documents", exact: true }).click();
  await page.getByRole("heading", { name: "Source documents", exact: true }).waitFor();
  await page.getByRole("heading", { name: "Output documents", exact: true }).waitFor();
  assert.equal(await page.locator(".document-group").count(), 2, "Source and output documents render as two separate blocks");
  assert.equal(await page.locator(".source-file-list").first().locator(":scope > div").count(), 3, "Documents keeps the three connected source inputs");
  await page.getByLabel("Add source documents").setInputFiles({ name: "Additional_Request.pdf", mimeType: "application/pdf", buffer: Buffer.from("Mock source document") });
  await page.getByText("Extracting…", { exact: true }).waitFor();
  await page.getByText("Needs review", { exact: true }).waitFor();
  await page.getByText("4 files", { exact: true }).waitFor();
  assert.equal(await page.locator(".source-file-list").first().locator(":scope > div").count(), 4, "An added source stays connected to this shipment session");
  await page.getByText("Bill of Lading", { exact: true }).waitFor();
  await page.getByText("Pending", { exact: true }).waitFor();
  await page.screenshot({ path: `${outputDir}/desktop-shipment-documents.png`, fullPage: false });
  await page.getByRole("button", { name: "Back to list" }).click();
  await page.getByRole("heading", { name: "Trucking", exact: true }).waitFor();

  await page.getByRole("button", { name: "Quotations", exact: true }).click();
  await page.getByRole("heading", { name: "Quotations", exact: true }).waitFor();
  assert.equal(await page.getByText(/^CTR-DEMO-/).count(), 0, "Customer contract IDs are hidden from the quotations list");
  assert.equal(await page.getByText(/^RATE-DEMO-/).count(), 4, "Rate plan IDs remain available in their own column");
  await page.screenshot({ path: `${outputDir}/desktop-quotations-without-contract-ids.png`, fullPage: false });

  await page.locator(".MuiDataGrid-row").first().click();
  await page.getByRole("button", { name: "Edit", exact: true }).waitFor();
  for (const internalCode of ["flat_rate", "threshold_time", "zone_tier_matrix", "LIFTGATE", "DETENTION"]) {
    assert.equal(await page.getByText(internalCode, { exact: true }).count(), 0, `${internalCode} is not exposed in rate-plan details`);
  }
  await page.screenshot({ path: `${outputDir}/desktop-quotation-details-clean.png`, fullPage: false });
  assert.equal(await page.getByRole("button", { name: "Add rule", exact: true }).count(), 0, "Read-only detail uses Edit as its primary action");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("button", { name: "Save changes", exact: true }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Cancel", exact: true }).count(), 1, "Edit mode provides Cancel");
  assert.equal(await page.getByRole("button", { name: "Add rule", exact: true }).count(), 1, "Add rule is scoped to the additional rules section");
  await page.screenshot({ path: `${outputDir}/desktop-quotation-edit.png`, fullPage: false });

  const ratePlanName = page.getByLabel("Rate plan name");
  await ratePlanName.fill("2026 Retail California FTL updated");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.getByText("Rate plan updated.").waitFor();
  await page.getByRole("button", { name: "Edit", exact: true }).waitFor();
  await page.getByRole("button", { name: "Back to list" }).click();
  await page.getByText("2026 Retail California FTL updated").waitFor();
  await desktop.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
  const mobilePage = await mobile.newPage();
  await mobilePage.goto(url, { waitUntil: "networkidle" });
  await mobilePage.getByRole("button", { name: "Open navigation" }).click();
  for (const item of ["Trucking", "Ocean", "Air"]) {
    assert.equal(await mobilePage.getByRole("button", { name: item, exact: true }).count(), 1, `${item} mobile submenu renders once`);
  }
  await mobilePage.screenshot({ path: `${outputDir}/mobile-shipment-navigation.png`, fullPage: false });
  await mobilePage.getByRole("button", { name: "Trucking", exact: true }).click();
  await mobilePage.getByRole("heading", { name: "Trucking", exact: true }).waitFor();
  await mobilePage.locator(".MuiDataGrid-row").first().click();
  await mobilePage.getByRole("heading", { name: "TRK-DEMO-001", exact: true }).waitFor();
  await mobilePage.getByRole("button", { name: "3 sources", exact: true }).click();
  await mobilePage.getByRole("heading", { name: "Sources", exact: true }).waitFor();
  await mobilePage.getByText("Page 1 of 3", { exact: true }).waitFor();
  await mobilePage.screenshot({ path: `${outputDir}/mobile-source-documents.png`, fullPage: false });
  await mobile.close();

  console.log(JSON.stringify({ status: "passed", url, screenshots: [
    `${outputDir}/desktop-ocean-empty.png`,
    `${outputDir}/desktop-air-empty.png`,
    `${outputDir}/desktop-trucking-navigation.png`,
    `${outputDir}/desktop-commercial-summary-rate-plan.png`,
    `${outputDir}/desktop-shipment-documents.png`,
    `${outputDir}/desktop-quotations-without-contract-ids.png`,
    `${outputDir}/desktop-quotation-details-clean.png`,
    `${outputDir}/desktop-quotation-edit.png`,
    `${outputDir}/mobile-shipment-navigation.png`,
    `${outputDir}/mobile-source-documents.png`,
  ] }, null, 2));
} finally {
  await browser.close();
}
