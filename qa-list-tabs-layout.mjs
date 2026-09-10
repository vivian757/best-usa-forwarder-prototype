import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:5175/";
const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

async function verifyDetachedTabs(page, ariaLabel) {
  const tablist = page.getByRole("tablist", { name: ariaLabel, exact: true });
  const bar = page.locator(".list-workspace-tabs-bar");
  const tableCard = page.locator(".management-table-card");
  assert.equal(await bar.locator("[role=tablist]").count(), 1, `${ariaLabel} tabs render inside the detached tab bar`);
  assert.equal(await tableCard.getByRole("tablist").count(), 0, `${ariaLabel} tabs are not nested inside the list card`);
  const [barBox, cardBox] = await Promise.all([bar.boundingBox(), tableCard.boundingBox()]);
  assert.ok(barBox && cardBox && barBox.y + barBox.height < cardBox.y, `${ariaLabel} tabs sit independently above the list card`);
  assert.notEqual(await bar.evaluate((element) => getComputedStyle(element).borderBottomStyle), "none", `${ariaLabel} tabs retain the divider line`);
}

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });

  await page.getByRole("button", { name: "Partners", exact: true }).click();
  await verifyDetachedTabs(page, "Partner type");
  await page.getByRole("tab", { name: "Carriers", exact: true }).click();
  await page.getByRole("columnheader", { name: "Carrier", exact: true }).waitFor();

  await page.getByRole("button", { name: "Billing & Accounting", exact: true }).click();
  await verifyDetachedTabs(page, "Billing type");
  const billingBar = page.locator(".list-workspace-tabs-bar");
  assert.equal(await billingBar.getByRole("button", { name: "Export", exact: true }).count(), 1, "Billing export stays in the detached tab row");
  await page.getByRole("tab", { name: "Bill-to (AR)", exact: true }).click();
  assert.equal(await page.locator(".MuiDataGrid-row").count(), 10, "Billing tabs continue filtering the list");

  console.log("Detached list tabs layout QA passed.");
} finally {
  await browser.close();
}
