import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:5174/";
const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

try {
  const context = await browser.newContext({ viewport: { width: 803, height: 814 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  await page.locator('.MuiDataGrid-row[data-id="TRK-DEMO-001"]').click();
  await page.getByRole("heading", { name: "TRK-DEMO-001", exact: true }).waitFor();

  const titleBox = await page.locator(".detail-title-block").boundingBox();
  const actionBox = await page.locator(".detail-header-actions").boundingBox();
  const rowBox = await page.locator(".detail-header-row").boundingBox();
  assert.ok(titleBox && actionBox && rowBox, "Detail header elements are visible");
  assert.ok(Math.abs(titleBox.y - actionBox.y) < 20, `Actions stay on the title row: title=${titleBox.y}, actions=${actionBox.y}`);
  assert.ok(rowBox.x + rowBox.width - (actionBox.x + actionBox.width) < 2, "Actions remain aligned to the right edge");
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "Header does not create page overflow");
  await page.screenshot({ path: "/private/tmp/best-usa-detail-header-803.png", fullPage: false });

  console.log(JSON.stringify({ status: "passed", viewport: "803x814", titleY: titleBox.y, actionsY: actionBox.y }, null, 2));
  await context.close();
} finally {
  await browser.close();
}
