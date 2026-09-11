import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:5174/";
const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 814 } });
  page.setDefaultTimeout(10000);
  await page.goto(url, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Ocean", exact: true }).click();
  await page.locator('.MuiDataGrid-row[data-id="OCN-DEMO-011"]').click();
  await page.getByRole("heading", { name: "OCN-DEMO-011", exact: true }).waitFor();
  await page.getByRole("tab", { name: "Charge & Cost", exact: true }).click();
  await page.getByRole("button", { name: "Edit", exact: true }).click();

  const customerLedger = page.locator(".billing-ledger-block").filter({
    has: page.getByRole("heading", { name: "Customer Charge", exact: true }),
  });
  const deleteButtons = customerLedger.getByRole("button", { name: /^Delete Customer Charge / });
  while (await deleteButtons.count()) await deleteButtons.first().click();

  const emptyMessage = customerLedger.getByText("No charge items yet. Select Add item to create one.", { exact: true });
  await emptyMessage.waitFor();
  assert.equal(await emptyMessage.count(), 1, "An empty selected quote explains how to add the first charge item");
  assert.equal(await customerLedger.getByRole("button", { name: "Add item", exact: true }).count(), 1, "The empty-state action remains available");
  await page.screenshot({ path: "/private/tmp/best-usa-pricing-empty-state.png", fullPage: false });

  console.log(JSON.stringify({ emptyState: "passed", screenshotPath: "/private/tmp/best-usa-pricing-empty-state.png" }));
} finally {
  await browser.close();
}
