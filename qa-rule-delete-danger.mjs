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
  await page.getByRole("button", { name: "Edit", exact: true }).click();

  const deleteButtons = page.locator(".rule-delete-button");
  assert.ok(await deleteButtons.count() >= 1, "Quotation rule delete actions are available");
  for (const deleteButton of await deleteButtons.all()) {
    assert.match(await deleteButton.getAttribute("class"), /MuiIconButton-colorError/, "Every rendered rule deletion uses the MUI error color contract");
  }
  const firstDelete = page.getByRole("button", { name: "Delete base rule 1", exact: true });
  assert.match(await firstDelete.getAttribute("class"), /MuiIconButton-colorError/, "Rule deletion uses the MUI error color contract");
  assert.equal(await firstDelete.evaluate((element) => getComputedStyle(element).color), "rgb(215, 71, 71)", "Rule deletion is danger red by default");
  await firstDelete.hover();
  await page.waitForTimeout(200);
  assert.equal(await firstDelete.evaluate((element) => getComputedStyle(element).color), "rgb(183, 53, 53)", "Hover uses the darker danger tone");

  console.log("Rule delete danger QA passed.");
} finally {
  await browser.close();
}
