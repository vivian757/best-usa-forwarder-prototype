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
  await page.getByRole("tab", { name: "Billing & Accounting", exact: true }).click();

  const quotationPlan = page.getByRole("combobox", { name: "Applied quotation plan", exact: true });
  await quotationPlan.waitFor();
  assert.equal(await quotationPlan.textContent(), "2026 Retail West LTL · v2", "The matched quotation plan is preselected");

  await quotationPlan.click();
  const options = page.getByRole("listbox");
  await options.waitFor();
  assert.equal(await options.getByRole("option").count(), 1, "Only plans applicable to this customer are offered");
  await options.getByRole("option", { name: "2026 Retail West LTL · v2", exact: true }).waitFor();
  assert.equal(await options.getByText("2026 Home Supply Project Rate", { exact: false }).count(), 0, "Another customer's plan is excluded");
  await page.keyboard.press("Escape");

  const vendorRate = page.getByRole("combobox", { name: "Applied vendor rate", exact: true });
  await vendorRate.waitFor();
  assert.equal(await vendorRate.textContent(), "Pacific LTL Cost 2026 · v1 · Pacific Linehaul LLC", "The matched vendor rate is preselected");

  await vendorRate.click();
  const vendorOptions = page.getByRole("listbox");
  await vendorOptions.waitFor();
  assert.equal(await vendorOptions.getByRole("option").count(), 3, "Only vendor rates applicable to LTL are offered");
  await vendorOptions.getByRole("option", { name: "Golden Gate LTL Cost 2026 · v2 · Golden Gate Freight", exact: true }).click();
  assert.equal(await vendorRate.textContent(), "Golden Gate LTL Cost 2026 · v2 · Golden Gate Freight", "A different applicable vendor rate can be selected");
  await page.getByText("$960", { exact: true }).waitFor();

  await page.getByRole("button", { name: "View quotation plan RATE-DEMO-001", exact: true }).click();
  await page.getByRole("heading", { name: "2026 Retail West LTL", exact: true }).waitFor();

  console.log("Quotation plan selector QA passed.");
} finally {
  await browser.close();
}
