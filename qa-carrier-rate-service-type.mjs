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
  const serviceType = page.locator(".rate-plan-edit-grid [role='combobox']").nth(2);
  assert.equal((await serviceType.textContent()).trim(), "Select service type", "Service Type is required for a new Trucking carrier rate");
  await serviceType.click();
  await page.getByRole("option", { name: "FTL", exact: true }).click();

  await page.getByRole("button", { name: "Add rule", exact: true }).click();
  await page.getByLabel("Carrier rule 1 fee item", { exact: true }).fill("FTL alternative linehaul");
  await page.getByRole("combobox", { name: "Carrier rule 1 rule template", exact: true }).click();
  await page.getByRole("option", { name: "Flat rate", exact: true }).click();
  assert.equal((await page.getByRole("combobox", { name: "Carrier rule 1 applies when", exact: true }).textContent()).trim(), "FTL shipments");
  await page.getByLabel("Carrier rule 1 pricing", { exact: true }).fill("1900");
  await page.screenshot({ path: "/private/tmp/best-usa-carrier-rate-service-type.png", fullPage: true });
  await page.getByRole("button", { name: "Create", exact: true }).click();

  const status = page.getByRole("combobox", { name: "Carrier rate status", exact: true });
  await status.click();
  await page.getByRole("option", { name: "Accepted", exact: true }).click();
  await page.getByText("Applies to FTL Trucking shipments fulfilled by Pacific Linehaul LLC.", { exact: true }).waitFor();

  await page.getByRole("button", { name: "Trucking", exact: true }).click();
  await page.locator('.MuiDataGrid-row[data-id="TRK-DEMO-001"]').click();
  await page.getByRole("tab", { name: "Charge & Cost", exact: true }).click();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  const carrierRate = page.getByRole("combobox", { name: "Applied carrier rate", exact: true });
  await carrierRate.click();
  await page.getByRole("option", { name: /Pacific FTL Demo Alternative/ }).waitFor();
  assert.equal(await page.getByText("Golden Gate LTL Cost 2026", { exact: false }).count(), 0, "An LTL carrier rate is not offered to the FTL shipment");

  console.log("Carrier Rate Service Type QA passed.");
} finally {
  await browser.close();
}
