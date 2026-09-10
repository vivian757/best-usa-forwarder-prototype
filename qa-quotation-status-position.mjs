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
  await page.getByRole("button", { name: "Quotations", exact: true }).click();
  await page.locator(".MuiDataGrid-row", { hasText: "RATE-DEMO-001" }).click();

  const status = page.getByRole("combobox", { name: "Quote plan status", exact: true });
  const edit = page.getByRole("button", { name: "Edit", exact: true });
  const actions = page.locator(".detail-header-actions");
  assert.equal(await actions.getByRole("combobox", { name: "Quote plan status", exact: true }).count(), 1, "Status is placed in the header action group");
  const [statusBox, editBox] = await Promise.all([status.boundingBox(), edit.boundingBox()]);
  assert.ok(statusBox && editBox && Math.abs(statusBox.y - editBox.y) < 4, "Status and Edit share one action row");
  assert.ok(statusBox.x < editBox.x, "Status is positioned to the left of Edit");

  console.log("Quotation status position QA passed.");
} finally {
  await browser.close();
}
