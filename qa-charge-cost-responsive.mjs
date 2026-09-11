import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:5178/";
const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

const inspectViewport = async (width, screenshotPath, inspectEditing = false, collapseNavigation = false) => {
  const context = await browser.newContext({ viewport: { width, height: 814 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(`${url}?view=shipment&id=TRK-DEMO-001&module=shipments-trucking&tab=billing`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Customer Charge", exact: true }).waitFor();
  if (collapseNavigation) {
    await page.getByRole("button", { name: "Collapse navigation", exact: true }).click();
    await page.waitForFunction(() => document.querySelector(".mui-main-area")?.getBoundingClientRect().left <= 73);
  }

  const metrics = await page.evaluate(() => {
    const rect = (selector) => {
      const element = document.querySelector(selector);
      const box = element?.getBoundingClientRect();
      return box ? { left: box.left, right: box.right, width: box.width } : null;
    };

    const feeTable = document.querySelector(".fee-breakdown");
    const feeHeader = document.querySelector(".fee-breakdown-head");
    if (feeTable) feeTable.scrollLeft = 100;

    return {
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      main: rect(".mui-main-area"),
      body: rect(".detail-page-body"),
      workspace: rect(".shipment-single-page"),
      section: rect(".billing-page-section"),
      card: rect(".billing-ledger-block"),
      table: rect(".fee-breakdown"),
      planControl: rect(".ledger-rate-plan-control.is-view"),
      tableScrollWidth: feeTable?.scrollWidth || 0,
      tableClientWidth: feeTable?.clientWidth || 0,
      tableScrollLeft: feeTable?.scrollLeft || 0,
      tableHeaderDisplay: getComputedStyle(document.querySelector(".fee-breakdown-head")).display,
      tableHeaderWidth: feeHeader?.getBoundingClientRect().width || 0,
      tableHeaderScrollWidth: feeHeader?.scrollWidth || 0,
      tableHeaderGridColumns: feeHeader ? getComputedStyle(feeHeader).gridTemplateColumns : "",
    };
  });

  await page.evaluate(() => {
    document.querySelectorAll(".fee-breakdown").forEach((element) => { element.scrollLeft = 0; });
  });
  await page.screenshot({ path: screenshotPath, fullPage: false });
  if (width === 442) {
    await page.evaluate(() => {
      document.querySelectorAll(".fee-breakdown").forEach((element) => { element.scrollLeft = element.scrollWidth; });
    });
    await page.screenshot({ path: "/private/tmp/best-usa-charge-cost-442-right.png", fullPage: false });
  }

  let editMetrics = null;
  if (inspectEditing) {
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    const input = page.getByLabel("Customer Charge Base FTL freight unit price", { exact: true });
    await input.waitFor();
    editMetrics = await page.evaluate(() => {
      const element = document.querySelector('[aria-label="Customer Charge Base FTL freight unit price"]');
      const inputBox = element?.getBoundingClientRect();
      const planBox = document.querySelector(".ledger-rate-plan-control.is-editing")?.getBoundingClientRect();
      return {
        viewportWidth: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
        inputWidth: inputBox?.width || 0,
        planControlHeight: planBox?.height || 0,
      };
    });
    await page.screenshot({ path: "/private/tmp/best-usa-charge-cost-edit-948.png", fullPage: false });
  }

  await context.close();
  return { ...metrics, editMetrics };
};

try {
  const tablet = await inspectViewport(948, "/private/tmp/best-usa-charge-cost-948.png", true);
  const tabletCollapsed = await inspectViewport(948, "/private/tmp/best-usa-charge-cost-collapsed-948.png", false, true);
  const desktop = await inspectViewport(1440, "/private/tmp/best-usa-charge-cost-1440.png");
  const mobile = await inspectViewport(442, "/private/tmp/best-usa-charge-cost-442.png");
  console.log(JSON.stringify({ mobile, tablet, tabletCollapsed, desktop }, null, 2));

  for (const [label, metrics] of [["mobile", mobile], ["tablet", tablet], ["tablet-collapsed", tabletCollapsed], ["desktop", desktop]]) {
    assert.equal(metrics.documentWidth, metrics.viewportWidth, `${label} viewport must not have page-level horizontal overflow`);
    assert.ok(metrics.workspace.width <= metrics.body.width + 1, `${label} workspace must fit its detail body`);
    assert.ok(metrics.section.right <= metrics.body.right + 1, `${label} charge section must fit its detail body`);
    assert.ok(metrics.card.right <= metrics.section.right + 1, `${label} ledger card must fit the charge section`);
    assert.ok(metrics.table.right <= metrics.card.right + 1, `${label} fee table must fit the ledger card`);
    assert.ok(metrics.planControl.right <= metrics.card.right - 16, `${label} rate-plan reference must fit the ledger card`);
  }
  assert.equal(tablet.editMetrics.documentWidth, tablet.editMetrics.viewportWidth, "tablet edit state must not create page-level horizontal overflow");
  assert.ok(tablet.editMetrics.inputWidth >= 100, "tablet unit-price input must remain usable while editing");
  assert.ok(tablet.editMetrics.planControlHeight <= 60, "tablet rate-plan selector must not inherit an oversized vertical flex basis");
  assert.equal(mobile.tableHeaderDisplay, "grid", "mobile Charge & Cost must keep the table header visible");
  assert.ok(mobile.tableScrollWidth > mobile.tableClientWidth, "mobile Charge & Cost table must overflow inside its card");
  assert.ok(mobile.tableScrollLeft > 0, "mobile Charge & Cost table must accept horizontal scrolling");
  assert.equal(mobile.tableHeaderScrollWidth, mobile.tableHeaderWidth, "mobile table header background must cover the final column without trailing white space");

  console.log("Charge & Cost responsive width QA passed at 442px, 948px, and 1440px.");
} finally {
  await browser.close();
}
