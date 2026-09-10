import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:5175/";
const browser = await chromium.launch({ headless: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });

async function openCarrierRates(page) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.locator('nav [role="button"]:visible').filter({ hasText: /^Quotations$/ }).first().click();
  await page.getByRole("tab", { name: "Carrier Rates", exact: true }).click();
}

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await openCarrierRates(page);

  await page.getByRole("button", { name: "COST-DEMO-001 actions", exact: true }).click();
  let menu = page.getByRole("menu", { name: "COST-DEMO-001 actions menu", exact: true });
  await menu.waitFor();
  assert.deepEqual(await menu.getByRole("menuitem").allInnerTexts(), ["Edit", "Delete"], "Carrier rate actions are Edit then Delete");
  await menu.getByRole("menuitem", { name: "Edit", exact: true }).click();
  await page.getByRole("heading", { name: "Pacific LTL Cost 2026", exact: true }).waitFor();
  await page.getByRole("button", { name: "Save changes", exact: true }).waitFor();

  await openCarrierRates(page);
  await page.getByRole("button", { name: "COST-DEMO-001 actions", exact: true }).click();
  menu = page.getByRole("menu", { name: "COST-DEMO-001 actions menu", exact: true });
  await menu.getByRole("menuitem", { name: "Delete", exact: true }).click();
  const confirmDialog = page.getByRole("dialog", { name: "Delete Carrier Rate?", exact: true });
  await confirmDialog.waitFor();
  await confirmDialog.getByRole("button", { name: "Delete", exact: true }).click();
  assert.equal(await page.getByText("COST-DEMO-001", { exact: true }).count(), 0, "Deleted carrier rate is removed from the list for this demo session");

  console.log("Carrier rate row actions QA passed.");
  await context.close();
} finally {
  await browser.close();
}
