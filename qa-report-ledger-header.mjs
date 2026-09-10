import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:5175/";
const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

try {
  const context = await browser.newContext({ viewport: { width: 1155, height: 814 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  await page.locator('.best-sidebar-shell:visible nav [role="button"]').filter({ hasText: "Reports" }).click();
  await page.getByRole("heading", { name: "Reports", exact: true }).waitFor();

  const ledger = page.locator(".report-ledger");
  await ledger.waitFor();
  assert.equal(await ledger.locator(":scope > header").count(), 0, "Ledger title block is removed");
  assert.equal(await page.getByText("Shipment profitability ledger", { exact: true }).count(), 0, "Visible ledger title is removed");
  assert.equal(await page.getByText("Connected data preview · synthetic values", { exact: true }).count(), 0, "Visible ledger subtitle is removed");
  assert.equal(await ledger.locator(":scope > .management-grid").count(), 1, "Data grid is the ledger's first content block");
  await ledger.getByRole("columnheader", { name: "Shipment No.", exact: true }).waitFor();

  console.log(JSON.stringify({ status: "passed", url }, null, 2));
  await context.close();
} finally {
  await browser.close();
}
