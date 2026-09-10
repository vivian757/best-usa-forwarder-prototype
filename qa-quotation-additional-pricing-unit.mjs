import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:5174/";
const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(10000);
  await page.goto(url, { waitUntil: "networkidle" });
  await page.locator('.best-sidebar-shell:visible nav [role="button"]').filter({ hasText: "Quotations" }).click();
  await page.locator('.MuiDataGrid-row[data-id="RATE-DEMO-001"] [data-field="name"]').click();
  await page.getByRole("heading", { name: "2026 Retail West LTL", exact: true }).waitFor();

  const table = page.getByRole("table", { name: "Surcharge rules" });
  assert.deepEqual(await table.getByRole("columnheader").allTextContents(), ["Fee item", "Rule template", "Unit", "Unit price"]);
  assert.equal(await table.getByRole("columnheader", { name: "Applies when", exact: true }).count(), 0);
  assert.equal((await table.getByRole("row").nth(1).getByRole("cell").nth(1).innerText()).trim(), "Per unit");
  assert.equal((await table.getByRole("row").nth(1).getByRole("cell").nth(2).innerText()).trim(), "Shipment");

  await page.getByRole("button", { name: "Edit", exact: true }).click();
  const group = page.locator(".quotation-rule-group").filter({ has: page.getByRole("heading", { name: "Additional Pricing", exact: true }) });
  await group.getByRole("button", { name: "Add rule", exact: true }).click();
  assert.equal((await page.getByRole("combobox", { name: "Additional rule 3 rule template", exact: true }).innerText()).trim(), "Per unit");
  assert.equal((await page.getByRole("combobox", { name: "Additional rule 3 unit", exact: true }).innerText()).trim(), "Shipment");
  await page.screenshot({ path: "/tmp/quotation-additional-pricing-unit.png", fullPage: true });

  console.log(JSON.stringify({ headers: ["Fee item", "Rule template", "Unit", "Unit price"], defaultTemplate: "Per unit", defaultUnit: "Shipment" }));
} finally {
  await browser.close();
}
