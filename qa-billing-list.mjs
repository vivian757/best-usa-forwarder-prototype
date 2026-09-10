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

  const gridHeader = page.locator(".management-table-card .billing-grid-header");
  const exportActions = gridHeader.locator(".billing-export-header-actions");
  const exportButton = exportActions.getByRole("button", { name: "Export", exact: true });
  await exportButton.waitFor();
  assert.equal(await exportButton.locator("svg.lucide-download").count(), 1, "Billing Export button carries the download icon");
  assert.equal(await exportActions.getByRole("button", { name: "Export CSV", exact: true }).count(), 0, "CSV is integrated into the Billing Export menu");
  assert.equal(await exportActions.getByRole("button", { name: "Export PDF", exact: true }).count(), 0, "PDF is integrated into the Billing Export menu");
  assert.equal(await page.locator(".mui-page-header .billing-export-header-actions").count(), 0, "Export actions are removed from the page header");
  assert.equal(await exportActions.count(), 1, "Export actions are grouped in the billing data grid header");

  await exportButton.click();
  const exportMenu = page.getByRole("menu", { name: "Export billing report" });
  await exportMenu.waitFor();
  await exportMenu.getByRole("menuitem", { name: "Export CSV", exact: true }).waitFor();
  await exportMenu.getByRole("menuitem", { name: "Export PDF", exact: true }).waitFor();
  assert.equal(await exportMenu.locator("svg").count(), 0, "Billing export menu items use text only");
  await page.keyboard.press("Escape");

  const gridHeaderBox = await gridHeader.boundingBox();
  const exportActionsBox = await exportActions.boundingBox();
  assert.ok(gridHeaderBox && exportActionsBox, "Billing grid header and export actions are visible");
  assert.ok(exportActionsBox.x + exportActionsBox.width <= gridHeaderBox.x + gridHeaderBox.width, "Export actions fit inside the grid header");
  assert.ok(exportActionsBox.x > gridHeaderBox.x + gridHeaderBox.width / 2, "Export actions align to the grid header's right side");

  if (process.env.QA_SCREENSHOT) {
    await page.screenshot({ path: process.env.QA_SCREENSHOT, fullPage: false });
  }

  const getHeaders = async () => (await page.getByRole("columnheader").allTextContents()).map((label) => label.trim()).filter(Boolean);
  const allHeaders = await getHeaders();
  assert.equal(allHeaders.includes("Type"), true, "All billing records show the Type column");
  assert.equal(allHeaders.includes("Account ID"), true, "Billing account ID has its own column");
  assert.equal(allHeaders.includes("Missing Data"), false, "Billing list has no Missing Data column");
  assert.equal(await page.getByText("Missing cost", { exact: true }).count(), 0, "Billing list has no Missing cost status");
  const firstBillingRow = page.locator(".MuiDataGrid-row").first();
  assert.equal((await firstBillingRow.locator('[data-field="counterparty"]').textContent()).trim(), "Demo Home Supply Inc.", "Counterparty cell contains the company name only");
  assert.equal((await firstBillingRow.locator('[data-field="accountId"]').textContent()).trim(), "BILL-ACCT-001", "Account ID is displayed in its own cell");
  const typeHeaderBox = await page.getByRole("columnheader", { name: "Type", exact: true }).boundingBox();
  assert.ok(typeHeaderBox && typeHeaderBox.width <= 82, "Type uses a compact fixed-width column");
  const arTypeChip = page.locator('[data-field="billingType"]').filter({ hasText: /^AR$/ }).first().locator(".MuiChip-root");
  const apTypeChip = page.locator('[data-field="billingType"]').filter({ hasText: /^AP$/ }).first().locator(".MuiChip-root");
  await arTypeChip.waitFor();
  await apTypeChip.waitFor();
  assert.notEqual(await arTypeChip.evaluate((element) => getComputedStyle(element).backgroundColor), await apTypeChip.evaluate((element) => getComputedStyle(element).backgroundColor), "AR and AP tags use distinct semantic colors");
  const billingGrid = page.locator('.management-table-card .MuiDataGrid-root');
  const [billingGridBox, counterpartyHeaderBox, accountHeaderBox, shipmentHeaderBox] = await Promise.all([
    billingGrid.boundingBox(),
    page.getByRole("columnheader", { name: "Bill-to / Pay-to", exact: true }).boundingBox(),
    page.getByRole("columnheader", { name: "Account ID", exact: true }).boundingBox(),
    page.getByRole("columnheader", { name: "Shipment", exact: true }).boundingBox(),
  ]);
  assert.ok(billingGridBox && counterpartyHeaderBox && accountHeaderBox && shipmentHeaderBox, "Billing column widths can be measured");
  assert.ok(counterpartyHeaderBox.width + accountHeaderBox.width + shipmentHeaderBox.width < billingGridBox.width * .62, "Left billing columns leave sufficient space for the right-side fields");

  await page.getByRole("tab", { name: "Bill-to (AR)", exact: true }).click();
  await page.locator('[aria-label="Bill-to (AR) billing records"]').waitFor();
  const arHeaders = await getHeaders();
  assert.equal(arHeaders.includes("Bill-to customer"), true, "AR view labels the counterparty as Bill-to customer");
  assert.equal(arHeaders.includes("Account ID"), true, "AR view keeps the account ID column");
  assert.equal(arHeaders.includes("Type"), false, "AR view hides the redundant Type column");
  assert.equal(await page.getByText("Demo Carrier West LLC", { exact: true }).count(), 0, "AR view excludes Pay-to records");

  await page.getByRole("tab", { name: "Pay-to (AP)", exact: true }).click();
  await page.locator('[aria-label="Pay-to (AP) billing records"]').waitFor();
  const apHeaders = await getHeaders();
  assert.equal(apHeaders.includes("Pay-to vendor"), true, "AP view labels the counterparty as Pay-to vendor");
  assert.equal(apHeaders.includes("Account ID"), true, "AP view keeps the account ID column");
  assert.equal(apHeaders.includes("Type"), false, "AP view hides the redundant Type column");
  await page.getByText("Demo Carrier West LLC", { exact: true }).waitFor();

  const targetBillingRow = page.locator(".MuiDataGrid-row").filter({ hasText: "Demo Carrier West LLC" }).first();
  const targetShipmentId = (await targetBillingRow.locator('[data-field="shipmentId"]').textContent()).trim();
  await targetBillingRow.locator('[data-field="counterparty"]').click();
  await page.getByRole("heading", { name: targetShipmentId, exact: true }).waitFor();
  const billingTab = page.getByRole("tab", { name: "Billing & Accounting", exact: true });
  await billingTab.waitFor();
  assert.equal(await billingTab.getAttribute("aria-selected"), "true", "Billing rows open the related Shipment Billing & Accounting workspace");
  assert.equal(await page.getByRole("heading", { name: "Pay-to: Demo Carrier West LLC", exact: true }).count(), 0, "Billing rows no longer open a duplicate billing detail page");

  console.log(JSON.stringify({ status: "passed", url, allHeaders, arHeaders, apHeaders }, null, 2));
  await context.close();
} finally {
  await browser.close();
}
