import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:5174/";
const browser = await chromium.launch({ headless: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  await page.locator('nav [role="button"]:visible').filter({ hasText: /^Quotations$/ }).first().click();
  await page.getByRole("tab", { name: "Carrier Rates", exact: true }).click();
  await page.locator('.MuiDataGrid-row[data-id="COST-DEMO-001"]').click();
  await page.getByRole("heading", { name: "Pacific LTL Cost 2026", exact: true }).waitFor();

  const moreButton = page.getByRole("button", { name: "More carrier rate actions", exact: true });
  await moreButton.click();
  const deleteAction = page.getByRole("menuitem", { name: "Delete", exact: true });
  await deleteAction.waitFor();
  assert.match(await deleteAction.evaluate((element) => getComputedStyle(element).color), /rgb\(215, 71, 71\)/, "Delete carrier rate uses the error color contract");

  await deleteAction.click();
  const confirmDialog = page.getByRole("dialog", { name: "Delete Carrier Rate?", exact: true });
  await confirmDialog.waitFor();
  await confirmDialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("heading", { name: "Pacific LTL Cost 2026", exact: true }).waitFor();

  console.log("Carrier rate detail actions QA passed.");
  await context.close();
} finally {
  await browser.close();
}
