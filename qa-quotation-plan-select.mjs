import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:5175/";
const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  await page.getByText("TRK-DEMO-001", { exact: true }).first().click();
  await page.getByRole("tab", { name: "Charge & Cost", exact: true }).click();

  await page.getByRole("button", { name: "Open 2026 Retail California FTL version 3 in new tab", exact: true }).waitFor();
  await page.getByRole("button", { name: "Open Pacific FTL Multi-stop Cost 2026 in new tab", exact: true }).waitFor();
  await page.getByRole("button", { name: "Edit", exact: true }).click();

  const quotationPlan = page.getByRole("combobox", { name: "Applied customer quotation", exact: true });
  await quotationPlan.waitFor();
  assert.equal(await quotationPlan.textContent(), "2026 Retail California FTL · v3", "The matched quotation plan is preselected");

  await quotationPlan.click();
  const options = page.getByRole("listbox");
  await options.waitFor();
  await options.getByRole("option", { name: "2026 Retail California FTL · v3", exact: true }).waitFor();
  assert.equal(await options.getByText("2026 Home Supply Project Rate", { exact: false }).count(), 0, "Another customer's plan is excluded");
  await page.keyboard.press("Escape");

  const vendorRate = page.getByRole("combobox", { name: "Applied carrier rate", exact: true });
  await vendorRate.waitFor();
  assert.equal(await vendorRate.textContent(), "Pacific FTL Multi-stop Cost 2026", "The matched carrier rate is preselected");

  await vendorRate.click();
  const vendorOptions = page.getByRole("listbox");
  await vendorOptions.waitFor();
  await vendorOptions.getByRole("option", { name: "Pacific FTL Multi-stop Cost 2026 · v1 · Pacific Linehaul LLC", exact: true }).waitFor();
  assert.equal(await vendorOptions.getByText("Golden Gate LTL Cost 2026", { exact: false }).count(), 0, "An LTL carrier rate is not offered to the FTL shipment");
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.getByRole("button", { name: "Open 2026 Retail California FTL version 3 in new tab", exact: true }).waitFor();

  console.log("Quotation plan selector and Save changes QA passed.");
} finally {
  await browser.close();
}
