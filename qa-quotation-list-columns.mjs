import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.argv[2] || process.env.PROTOTYPE_URL || "http://127.0.0.1:5175/";
const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  await page.locator('.best-sidebar-shell:visible nav [role="button"]').filter({ hasText: "Quotations" }).click();
  await page.getByRole("heading", { name: "Quotations", exact: true }).waitFor();

  const headers = (await page.getByRole("columnheader").allTextContents()).map((label) => label.trim()).filter(Boolean);
  assert.deepEqual(headers.slice(0, 3), ["Quote Plan", "Quote No.", "Customer"]);
  assert.equal(headers.includes("Created"), true, "Created column uses the concise label");
  assert.equal(headers.includes("Created Date"), false, "Created Date label is removed");

  const firstRow = page.locator('.MuiDataGrid-row[data-id="RATE-DEMO-001"]');
  await firstRow.waitFor();
  assert.equal((await firstRow.locator('[data-field="name"]').textContent()).trim(), "2026 Retail West LTL", "Quote Plan contains the plan name only");
  assert.equal((await firstRow.locator('[data-field="quoteId"]').textContent()).trim(), "RATE-DEMO-001", "Quote No. is displayed in its own column");

  console.log(JSON.stringify({ status: "passed", url, headers }, null, 2));
  await context.close();
} finally {
  await browser.close();
}
