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
  await page.getByRole("button", { name: "Add rule", exact: true }).last().click();

  const ruleTemplate = page.getByRole("combobox", { name: "Additional rule 1 rule template", exact: true });
  assert.equal(await ruleTemplate.textContent(), "Per unit", "New additional rules default to Per unit");
  await ruleTemplate.click();
  const options = (await page.getByRole("option").allInnerTexts()).filter((option) => option !== "Select rule template");
  assert.deepEqual(options, ["Flat rate", "Per unit", "Percentage surcharge", "Threshold + time"], "Additional rule templates are restored");
  await page.getByRole("option", { name: "Percentage surcharge", exact: true }).click();
  await page.getByText("Percentage rate · %", { exact: true }).waitFor();

  console.log("Additional rule template options QA passed.");
  await context.close();
} finally {
  await browser.close();
}
