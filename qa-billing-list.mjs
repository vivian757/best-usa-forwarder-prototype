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
  await page.locator('.best-sidebar-shell:visible nav [role="button"]').filter({ hasText: "Billing" }).click();
  await page.getByRole("heading", { name: "Billing & Accounting", exact: true }).waitFor();

  await page.getByRole("button", { name: "Search records", exact: true }).click();
  assert.equal(await page.getByLabel("Keyword", { exact: true }).count(), 0, "Billing Search does not overload a generic Keyword field");
  const counterpartyFilter = page.getByLabel("Counterparty", { exact: true });
  await counterpartyFilter.click();
  await counterpartyFilter.fill("Demo Home Supply Inc.");
  await page.getByRole("option", { name: "Demo Home Supply Inc.", exact: true }).click();
  await page.getByLabel("Transport mode", { exact: true }).click();
  await page.getByRole("option", { name: "Trucking", exact: true }).click();
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByText("Counterparty: Demo Home Supply Inc.", { exact: true }).waitFor();
  await page.getByText("Transport mode: Trucking", { exact: true }).waitFor();
  const filteredBillingGroups = page.locator(".billing-counterparty-group");
  assert.equal(await filteredBillingGroups.count(), 1, "Combined Counterparty and Transport mode filters return one billing party group");
  assert.equal((await filteredBillingGroups.first().innerText()).includes("Demo Home Supply Inc."), true, "Counterparty filter only returns the selected party");
  await page.getByRole("button", { name: "Search records", exact: true }).click();
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page.getByRole("button", { name: "Search", exact: true }).click();

  const exportActions = page.locator(".billing-export-header-actions");
  const exportButton = exportActions.getByRole("button", { name: "Export", exact: true });
  await exportButton.waitFor();
  assert.equal(await exportButton.locator("svg.lucide-download").count(), 1, "Billing Export button carries the download icon");
  assert.equal(await exportActions.getByRole("button", { name: "Export CSV", exact: true }).count(), 0, "CSV is integrated into the Billing Export menu");
  assert.equal(await exportActions.getByRole("button", { name: "Export PDF", exact: true }).count(), 0, "PDF is integrated into the Billing Export menu");
  assert.equal(await page.locator(".mui-page-header .billing-export-header-actions").count(), 1, "Export actions remain available in the Billing page header");
  assert.equal(await exportActions.count(), 1, "Export actions are grouped in the Billing page header");

  await exportButton.click();
  const exportMenu = page.getByRole("menu", { name: "Export billing report" });
  await exportMenu.waitFor();
  await exportMenu.getByRole("menuitem", { name: "Export CSV", exact: true }).waitFor();
  await exportMenu.getByRole("menuitem", { name: "Export PDF", exact: true }).waitFor();
  assert.equal(await exportMenu.locator("svg").count(), 0, "Billing export menu items use text only");
  await page.keyboard.press("Escape");

  const exportActionsBox = await exportActions.boundingBox();
  assert.ok(exportActionsBox, "Billing page export actions are visible");

  if (process.env.QA_SCREENSHOT) {
    await page.screenshot({ path: process.env.QA_SCREENSHOT, fullPage: false });
  }

  await page.getByRole("tab", { name: "Bill-to (AR)", exact: true }).click();
  const arGroups = page.locator('[aria-label="Bill-to (AR) billing shipments grouped by counterparty"]');
  await arGroups.waitFor();
  assert.equal(await arGroups.locator(".billing-counterparty-group").count() > 0, true, "AR view lists customer billing parties");
  assert.equal(await page.getByText("Demo Carrier West LLC", { exact: true }).count(), 0, "AR view excludes Pay-to records");

  await page.getByRole("tab", { name: "Pay-to (AP)", exact: true }).click();
  const apGroups = page.locator('[aria-label="Pay-to (AP) billing shipments grouped by counterparty"]');
  await apGroups.waitFor();
  assert.equal(await apGroups.locator(".billing-counterparty-group").count() > 0, true, "AP view lists carrier billing parties");
  const demoCarrierGroup = apGroups.locator(".billing-counterparty-group").filter({ hasText: "Demo Carrier West LLC" });
  await demoCarrierGroup.locator(".billing-counterparty-toggle").click();
  const taskTable = demoCarrierGroup.locator(".billing-task-table");
  await taskTable.waitFor();
  const taskHeaders = (await taskTable.getByRole("columnheader").allTextContents()).map((label) => label.trim());
  assert.deepEqual(taskHeaders, ["Shipment", "Transport mode", "Record No.", "Billing date", "Amount"], "Expanded billing party uses the canonical shipment accounting columns");
  assert.equal(await taskTable.getByText("Trucking", { exact: true }).count() > 0, true, "Billing transport mode is shown from the linked Shipment");

  console.log(JSON.stringify({ status: "passed", url, taskHeaders }, null, 2));
  await context.close();
} finally {
  await browser.close();
}
