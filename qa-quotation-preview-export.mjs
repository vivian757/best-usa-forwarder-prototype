import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:5175/";
const screenshotPath = process.argv[3];
const browser = await chromium.launch({ headless: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  await page.locator('nav [role="button"]:visible').filter({ hasText: /^Quotations$/ }).first().click();

  const quoteName = "2026 Home Supply Project Rate";
  await page.getByText(quoteName, { exact: true }).first().click();
  await page.getByRole("heading", { name: quoteName, exact: true }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Preview", exact: true }).count(), 0, "Quotation preview is not a primary header action");
  await page.getByRole("button", { name: "More quotation actions", exact: true }).click();
  const actionsMenu = page.getByRole("menu", { name: "Quotation actions", exact: true });
  const actionItems = actionsMenu.getByRole("menuitem");
  assert.equal(await actionItems.first().innerText(), "Export", "Export is the first quotation action");
  await actionsMenu.getByRole("menuitem", { name: "Export", exact: true }).click();

  const dialog = page.getByRole("dialog", { name: /^Quotation Preview/ });
  await dialog.waitFor();
  await dialog.getByText("QUOTE NO. RATE-DEMO-002", { exact: true }).waitFor();
  await dialog.getByText("Demo Home Supply Inc.", { exact: true }).waitFor();
  await dialog.getByRole("heading", { name: "Pricing Schedule", exact: true }).waitFor();
  assert.equal(await dialog.getByRole("button", { name: "Export PDF", exact: true }).count(), 1, "Quotation preview exposes one PDF export action");
  assert.equal(await dialog.getByText("Invoice", { exact: false }).count(), 0, "Quotation preview is not presented as an invoice");
  if (screenshotPath) {
    await page.waitForTimeout(400);
    await page.screenshot({ path: screenshotPath, fullPage: false });
  }

  console.log("Quotation preview and export QA passed.");
  await context.close();
} finally {
  await browser.close();
}
