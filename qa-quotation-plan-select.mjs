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

  await page.getByRole("button", { name: "2026 Retail West LTL · v2", exact: true }).waitFor();
  await page.getByRole("button", { name: "Pacific LTL Cost 2026 · v1", exact: true }).waitFor();
  await page.getByRole("button", { name: "Edit", exact: true }).click();

  const quotationPlan = page.getByRole("combobox", { name: "Applied customer quotation", exact: true });
  await quotationPlan.waitFor();
  assert.equal(await quotationPlan.textContent(), "2026 Retail West LTL · v2", "The matched quotation plan is preselected");

  await quotationPlan.click();
  const options = page.getByRole("listbox");
  await options.waitFor();
  assert.equal(await options.getByRole("option").count(), 2, "Only plans applicable to this customer and transport mode are offered");
  await options.getByRole("option", { name: "2026 Retail West LTL · v2", exact: true }).waitFor();
  await options.getByRole("option", { name: "Demo Retail Distribution LLC FTL 2026 · v1", exact: true }).waitFor();
  assert.equal(await options.getByText("2026 Home Supply Project Rate", { exact: false }).count(), 0, "Another customer's plan is excluded");
  await page.keyboard.press("Escape");

  const vendorRate = page.getByRole("combobox", { name: "Applied carrier rate", exact: true });
  await vendorRate.waitFor();
  assert.equal(await vendorRate.textContent(), "Pacific LTL Cost 2026", "The matched carrier rate is preselected");

  await vendorRate.click();
  const vendorOptions = page.getByRole("listbox");
  await vendorOptions.waitFor();
  assert.equal(await vendorOptions.getByRole("option").count(), 2, "The applied carrier rate and compatible FTL alternative are offered");
  await vendorOptions.getByRole("option", { name: "West Coast FTL Cost 2026 · v1 · West Coast Carrier Inc.", exact: true }).click();
  await page.getByRole("heading", { name: "Replace current Carrier Rate?", exact: true }).waitFor();
  await page.getByRole("button", { name: "Apply plan", exact: true }).click();
  assert.equal(await vendorRate.textContent(), "West Coast FTL Cost 2026", "A different compatible carrier rate can be applied");

  await page.getByRole("button", { name: "View quotation plan RATE-DEMO-001", exact: true }).click();
  await page.getByRole("heading", { name: "2026 Retail West LTL", exact: true }).waitFor();

  console.log("Quotation plan selector QA passed.");
} finally {
  await browser.close();
}
