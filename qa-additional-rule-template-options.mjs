import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:5174/";
const browser = await chromium.launch({ headless: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  await page.locator('nav [role="button"]:visible').filter({ hasText: /^Quotations$/ }).first().click();
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByRole("menuitem", { name: "Customer Quote", exact: true }).click();
  await page.getByRole("heading", { name: "Create Customer Quote", exact: true }).waitFor();
  await page.getByRole("table", { name: "Customer additional pricing rules", exact: true }).getByRole("columnheader", { name: "Rate", exact: true }).waitFor();
  await page.getByRole("button", { name: "Add rule", exact: true }).last().click();

  const ruleTypeControl = page.getByRole("combobox", { name: "Additional rule 1 rule type", exact: true });
  assert.equal(await ruleTypeControl.textContent(), "Per unit", "New additional rules default to Per unit");
  await ruleTypeControl.click();
  const options = (await page.getByRole("option").allInnerTexts()).filter((option) => option !== "Select rule type");
  assert.deepEqual(options, ["Flat rate", "Per unit", "Percentage surcharge", "Threshold + time"], "Additional rule types are restored");
  await page.getByRole("option", { name: "Percentage surcharge", exact: true }).click();
  await page.getByText("Percentage rate · %", { exact: true }).waitFor();
  const unit = page.getByRole("combobox", { name: "Additional rule 1 unit", exact: true });
  const condition = page.getByRole("combobox", { name: "Additional rule 1 condition", exact: true });
  assert.equal((await unit.textContent()).trim(), "Charge subtotal");
  await ruleTypeControl.click();
  await page.getByRole("option", { name: "Threshold + time", exact: true }).click();
  assert.equal((await unit.textContent()).trim(), "30 min");
  assert.equal((await condition.textContent()).trim(), "After 30 free min");
  await ruleTypeControl.click();
  await page.getByRole("option", { name: "Per unit", exact: true }).click();
  assert.equal((await unit.textContent()).trim(), "Shipment");
  assert.equal((await condition.textContent()).trim(), "All shipments");

  console.log("Additional rule type options QA passed.");
  await context.close();
} finally {
  await browser.close();
}
