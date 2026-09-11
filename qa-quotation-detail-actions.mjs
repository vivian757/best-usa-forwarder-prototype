import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:5175/";
const browser = await chromium.launch({ headless: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  await page.locator('nav [role="button"]:visible').filter({ hasText: /^Quotations$/ }).first().click();

  const quoteName = "2026 Home Supply Project Rate";
  await page.getByText(quoteName, { exact: true }).first().click();
  await page.getByRole("heading", { name: quoteName, exact: true }).waitFor();

  const moreButton = page.getByRole("button", { name: "More quotation actions", exact: true });
  await moreButton.click();
  const deleteAction = page.getByRole("menuitem", { name: "Delete", exact: true });
  await deleteAction.waitFor();
  assert.match(await deleteAction.evaluate((element) => getComputedStyle(element).color), /rgb\(215, 71, 71\)/, "Delete quotation uses the error color contract");

  await deleteAction.click();
  const confirmDialog = page.getByRole("dialog", { name: "Delete Quotation?", exact: true });
  await confirmDialog.waitFor();
  await confirmDialog.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("heading", { name: "Quotations", exact: true }).waitFor();
  assert.equal(await page.getByText(quoteName, { exact: true }).count(), 0, "Deleted quotation is removed from the list for this demo session");

  console.log("Quotation detail actions QA passed.");
  await context.close();
} finally {
  await browser.close();
}
