import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";

const url = process.argv[2] || process.env.PROTOTYPE_URL || "http://127.0.0.1:5175/";
const outputDir = "../../.impeccable/review";
await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });

  await page.locator('.best-sidebar-shell:visible nav [role="button"]').filter({ hasText: "Partners" }).click();
  await page.getByRole("heading", { name: "Partners", exact: true }).waitFor();
  const customerTab = page.getByRole("tab", { name: "Customers", exact: true });
  const carrierTab = page.getByRole("tab", { name: "Carriers", exact: true });
  await customerTab.waitFor();
  assert.equal((await customerTab.textContent()).trim(), "Customers", "Customers tab has no count");
  assert.equal((await carrierTab.textContent()).trim(), "Carriers", "Carriers tab has no count");
  const headers = (await page.getByRole("columnheader").allTextContents()).map((label) => label.trim());
  assert.equal(headers.includes("Mobile"), true, "Partners list has a Mobile column");
  assert.equal(headers.includes("Phone"), true, "Partners list has a Phone column");

  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByRole("heading", { name: "Create customer", exact: true }).waitFor();
  await page.getByLabel("Customer name").fill("Demo Phone Contact LLC");
  await page.getByRole("textbox", { name: "Mobile", exact: true }).fill("(510) 555-3999");
  await page.getByRole("textbox", { name: "Office phone", exact: true }).fill("(510) 555-1999");
  await page.getByRole("button", { name: "Create customer", exact: true }).click();
  await page.getByText("Demo Phone Contact LLC", { exact: true }).waitFor();
  await page.getByText("(510) 555-3999", { exact: true }).waitFor();
  await page.getByText("(510) 555-1999", { exact: true }).waitFor();

  const headerCheckbox = page.locator('.MuiDataGrid-columnHeaderCheckbox input[type="checkbox"]');
  const rowCheckboxes = page.locator('.MuiDataGrid-cellCheckbox input[type="checkbox"]');
  assert.equal(await headerCheckbox.count(), 1, "Customers has a select-all checkbox");
  assert.equal(await rowCheckboxes.count(), 10, "Each visible customer row has a checkbox");

  await rowCheckboxes.first().check();
  await page.getByText("Selected 1", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Clear selection", exact: true }).click();
  assert.equal(await rowCheckboxes.first().isChecked(), false, "Clear selection resets row checkboxes");
  await page.screenshot({ path: `${outputDir}/partners-checkboxes-desktop.png`, fullPage: false });

  await carrierTab.click();
  assert.equal(await headerCheckbox.count(), 1, "Carriers has a select-all checkbox");
  assert.ok(await rowCheckboxes.count() > 0, "Each visible carrier row has a checkbox");

  console.log(JSON.stringify({ status: "passed", url, screenshot: `${outputDir}/partners-checkboxes-desktop.png` }, null, 2));
} finally {
  await browser.close();
}
